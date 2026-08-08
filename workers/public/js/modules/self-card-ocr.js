// SelfCardOCR Module — ES module conversion
// Converted from /js/self-card-ocr.js
/* global DOMPurify */

import {
    i18n, currentLang, applyTranslations, apiCall, getHeadersWithCSRF,
    fetchUserCards, showToast, showView, toggleLoading,
    state, stateManager, errorHandler, API_BASE,
    ADDRESS_PRESETS, CARD_TYPES, SocialParser, getCardTypeLabel
} from './core.js';

// Mutable state
let currentModalUuid = null;
let currentRevokeUuid = null;
let currentRevokeType = null;

// ==================== SelfCardOCR ====================
const PRESET_DEPARTMENTS_OCR = [
    '數位策略司', '數位政府司', '資源管理司', '韌性建設司',
    '數位國際司', '資料創新司', '秘書處', '人事處',
    '政風處', '主計處', '資訊處', '法制處',
    '部長室', '政務次長室', '常務次長室', '主任秘書室'
];

export const SelfCardOCR = {
    abortController: null,

    async scan() {
        document.getElementById('scan-file-input').value = '';
        document.getElementById('scan-file-input').click();
    },

    cancel() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this._resetUI();
    },

    _resetUI() {
        document.getElementById('scan-btn-area').classList.remove('hidden');
        document.getElementById('scan-processing-area').classList.add('hidden');
    },

    _showProcessing() {
        document.getElementById('scan-btn-area').classList.add('hidden');
        document.getElementById('scan-processing-area').classList.remove('hidden');
    },

    async _processFile(file) {
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        this._showProcessing();

        try {
            if (await isHEIC(file)) {
                showToast('不支援 HEIC 格式');
                this._resetUI();
                return;
            }

            if (signal.aborted) return;

            const compressed = await compressImageWithCancellation(file, signal);

            if (signal.aborted) return;

            const imageBase64 = await fileToBase64(compressed);
            const csrfToken = sessionStorage.getItem('csrfToken');
            const idempotencyKey = generateIdempotencyKey();

            const uploadResp = await fetch(`${API_BASE}/api/user/received-cards/upload`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': idempotencyKey,
                    'X-Upload-Flow': 'own_card',
                    ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                },
                body: JSON.stringify({ image_base64: imageBase64, filename: file.name }),
                signal
            });

            if (!uploadResp.ok) {
                const errData = await uploadResp.json().catch(() => ({}));
                const errMsg = (errData.error && typeof errData.error === 'object')
                    ? errData.error.message || errData.error.code || `Upload failed: ${uploadResp.status}`
                    : errData.error || `Upload failed: ${uploadResp.status}`;
                throw new Error(errMsg);
            }

            const uploadData = await uploadResp.json();
            const upload_id = (uploadData.data || uploadData).upload_id;

            if (signal.aborted) return;

            const extractResp = await fetch(`${API_BASE}/api/user/cards/extract-draft`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                },
                body: JSON.stringify({ upload_id }),
                signal
            });

            if (!extractResp.ok) {
                const errData = await extractResp.json().catch(() => ({}));
                const errMsg = (errData.error && typeof errData.error === 'object')
                    ? errData.error.message || errData.error.code || `Extract failed: ${extractResp.status}`
                    : errData.error || `Extract failed: ${extractResp.status}`;
                throw new Error(errMsg);
            }

            const extractData = await extractResp.json();
            const raw = extractData.data || extractData;
            const draft = raw.fields || raw;

            if (signal.aborted) return;

            this.fillForm(draft);

        } catch (err) {
            if (err.name === 'AbortError' || signal.aborted) return;
            showToast(err.message || '掃描失敗，請稍後再試');
        } finally {
            this.abortController = null;
            this._resetUI();
        }
    },

    fillForm(draft) {
        const fieldMap = {
            'name_zh': 'name_zh', 'name_en': 'name_en',
            'title_zh': 'title_zh', 'title_en': 'title_en',
            'email': 'email', 'phone': 'phone', 'mobile': 'mobile',
            'website': 'web', 'avatar_url': 'avatar_url',
            'greetings_zh': 'greetings_zh', 'greetings_en': 'greetings_en',
            'social_github': 'social_github', 'social_linkedin': 'social_linkedin',
            'social_facebook': 'social_facebook', 'social_instagram': 'social_instagram',
            'social_twitter': 'social_twitter', 'social_youtube': 'social_youtube',
            'social_line': 'social_line', 'social_signal': 'social_signal'
        };

        let hasSocialOrMobile = false;
        const socialFields = ['social_github', 'social_linkedin', 'social_facebook',
            'social_instagram', 'social_twitter', 'social_youtube', 'social_line', 'social_signal'];

        Object.entries(fieldMap).forEach(([draftKey, fieldId]) => {
            const fieldDraft = draft[draftKey];
            if (!fieldDraft || fieldDraft.value == null) return;

            const el = document.getElementById(fieldId);
            if (!el) return;

            el.value = fieldDraft.value;
            this.setBadge(fieldId, fieldDraft.provenance);

            if (socialFields.includes(draftKey) && fieldDraft.value) hasSocialOrMobile = true;
            if (draftKey === 'mobile' && fieldDraft.value) hasSocialOrMobile = true;
        });

        if (draft.department && draft.department.value != null) {
            const deptValue = draft.department.value;
            if (PRESET_DEPARTMENTS_OCR.includes(deptValue)) {
                document.getElementById('department-preset').value = deptValue;
                document.getElementById('custom-department-field').classList.add('hidden');
            } else {
                document.getElementById('department-preset').value = 'custom';
                document.getElementById('custom-department-field').classList.remove('hidden');
                document.getElementById('department-custom-zh').value = deptValue;
            }
            this.setBadge('department-preset', draft.department.provenance);
        }

        if ((draft.address_zh && draft.address_zh.value != null) ||
            (draft.address_en && draft.address_en.value != null)) {
            document.getElementById('address-preset').value = 'custom';
            document.getElementById('custom-address-fields').classList.remove('hidden');
            if (draft.address_zh && draft.address_zh.value != null) {
                document.getElementById('address_zh').value = draft.address_zh.value;
                this.setBadge('address_zh', draft.address_zh.provenance);
            }
            if (draft.address_en && draft.address_en.value != null) {
                document.getElementById('address_en').value = draft.address_en.value;
                this.setBadge('address_en', draft.address_en.provenance);
            }
        }

        if (hasSocialOrMobile) {
            const details = document.querySelector('#edit-form details');
            if (details) details.open = true;
        }

        updatePreview();
    },

    clearBadges() {
        document.querySelectorAll('.prov-badge').forEach(el => el.remove());
    },

    setBadge(fieldId, provenance) {
        if (!provenance) return;
        this.removeBadge(fieldId);

        const el = document.getElementById(fieldId);
        if (!el) return;

        let anchor = document.querySelector(`label[for="${fieldId}"]`);
        if (!anchor) {
            const parent = el.closest('.space-y-2, .flex');
            if (parent) {
                anchor = parent.querySelector('label, span[class*="text-"]');
            }
        }
        if (!anchor) {
            anchor = el.parentElement;
        }
        if (!anchor) return;

        const badge = document.createElement('span');
        badge.className = `prov-badge prov-${provenance}`;
        badge.dataset.fieldId = fieldId;
        badge.title = i18n[currentLang][`prov-${provenance}`] || provenance;

        if (anchor === el.parentElement) {
            anchor.insertBefore(badge, el);
        } else {
            anchor.appendChild(badge);
        }

        const handler = () => {
            this.removeBadge(fieldId);
            el.removeEventListener('input', handler);
        };
        el.addEventListener('input', handler);
    },

    removeBadge(fieldId) {
        document.querySelectorAll(`.prov-badge[data-field-id="${fieldId}"]`).forEach(el => el.remove());
    }
};

// Wire up file input on DOMContentLoaded
export function initScanFileInput() {
    const fileInput = document.getElementById('scan-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) SelfCardOCR._processFile(file);
        });
    }
}

// ==================== Form & Selection ====================
export async function openEditForm(type) {
    const card = state.cards.find(c => c.type === type);

    if (card && card.status === 'revoked') {
        showToast(i18n[currentLang]['error-revoke-failed'] || '此名片已被撤銷，無法編輯');
        return;
    }

    const isEdit = card && card.status === 'bound';

    document.getElementById('edit-form').reset();
    document.getElementById('form-error-msg').classList.add('hidden');
    document.getElementById('form-type').value = type;

    SelfCardOCR.clearBadges();
    SelfCardOCR._resetUI();
    const scanUI = document.getElementById('scan-ui');
    if (scanUI) {
        if (isEdit) {
            scanUI.classList.add('hidden');
        } else {
            scanUI.classList.remove('hidden');
            applyTranslations(currentLang);
        }
    }

    if (isEdit && card.uuid) {
        try {
            toggleLoading(true);
            const response = await apiCall(`/api/user/cards/${card.uuid}`, { method: 'GET' });
            const fullCard = response.data || response;

            document.getElementById('form-uuid').value = card.uuid;

            ['name_zh', 'name_en', 'title_zh', 'title_en',
             'email', 'phone', 'mobile', 'web', 'avatar_url',
             'greetings_zh', 'greetings_en',
             'social_github', 'social_linkedin', 'social_facebook',
             'social_instagram', 'social_twitter', 'social_youtube',
             'social_line', 'social_signal'].forEach(key => {
                const el = document.getElementById(key);
                if (el && fullCard[key] !== undefined) el.value = fullCard[key];
            });

            const PRESET_DEPARTMENTS = [
                '數位策略司', '數位政府司', '資源管理司', '韌性建設司',
                '數位國際司', '資料創新司', '秘書處', '人事處',
                '政風處', '主計處', '資訊處', '法制處',
                '部長室', '政務次長室', '常務次長室', '主任秘書室'
            ];

            if (fullCard.department) {
                if (PRESET_DEPARTMENTS.includes(fullCard.department)) {
                    document.getElementById('department-preset').value = fullCard.department;
                    document.getElementById('custom-department-field').classList.add('hidden');
                } else {
                    document.getElementById('department-preset').value = 'custom';
                    document.getElementById('custom-department-field').classList.remove('hidden');

                    if (typeof fullCard.department === 'string') {
                        document.getElementById('department-custom-zh').value = fullCard.department;
                        document.getElementById('department-custom-en').value = '';
                    } else if (fullCard.department && typeof fullCard.department === 'object') {
                        document.getElementById('department-custom-zh').value = fullCard.department.zh || '';
                        document.getElementById('department-custom-en').value = fullCard.department.en || '';
                    }
                }
            }

            if (fullCard.address_zh || fullCard.address_en) {
                if (fullCard.address_zh === ADDRESS_PRESETS.yanping.zh) {
                    document.getElementById('address-preset').value = 'yanping';
                    document.getElementById('custom-address-fields').classList.add('hidden');
                } else if (fullCard.address_zh === ADDRESS_PRESETS.shinkong.zh) {
                    document.getElementById('address-preset').value = 'shinkong';
                    document.getElementById('custom-address-fields').classList.add('hidden');
                } else {
                    document.getElementById('address-preset').value = 'custom';
                    document.getElementById('address_zh').value = fullCard.address_zh || '';
                    document.getElementById('address_en').value = fullCard.address_en || '';
                    document.getElementById('custom-address-fields').classList.remove('hidden');
                }
            }

            document.getElementById('form-title').innerText = i18n[currentLang]['form-title'];
        } catch (_err) {
            showToast(i18n[currentLang]['error-save-failed'] || '載入名片資料失敗');
            return;
        } finally {
            toggleLoading(false);
        }
    } else {
        document.getElementById('form-uuid').value = '';
        document.getElementById('form-title').innerText = i18n[currentLang]['button-create'];
        prefillFormWithOIDC(state.currentUser);
    }

    updatePreview();
    showView('form');
}

export function renderSelectionPage() {
    const container = document.getElementById('card-slots-container');
    container.innerHTML = DOMPurify.sanitize(CARD_TYPES.map(config => {
        const data = state.cards.find(c => c.type === config.id) || { status: 'empty' };
        const isBound = data.status === 'bound';
        const isRevoked = data.status === 'revoked';

        return `
            <div class="selection-card glass-panel p-8 rounded-[2.5rem] flex flex-col justify-between min-h-[380px] ${isRevoked ? 'revoked' : ''}">
                <div class="space-y-6">
                    <div class="flex justify-between items-start">
                        <div class="w-12 h-12 bg-${config.color}-50 rounded-2xl flex items-center justify-center text-${config.color}-600">
                            <i data-lucide="${config.icon}"></i>
                        </div>
                        <span class="badge bg-${config.color}-100 text-${config.color}-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            ${getCardTypeLabel(config.id)}
                        </span>
                    </div>
                    <div class="space-y-1">
                        <h3 class="text-xl font-black ${isBound || isRevoked ? 'text-slate-900' : 'text-slate-300'}">
                            ${isBound || isRevoked ? data.name_zh : '尚未建立'}
                        </h3>
                        <p class="text-xs ${isBound || isRevoked ? 'text-slate-500' : 'text-slate-400'} ${config.securityBadge && !isBound && !isRevoked ? 'font-black' : ''}">
                            ${isBound || isRevoked ? (data.name_en || '') : config.desc}
                        </p>
                        ${!isBound && !isRevoked && config.features ? `
                            <div class="mt-3 space-y-1.5">
                                ${config.features.map(feature => `
                                    <div class="flex items-start gap-2 text-[10px] text-slate-600">
                                        <i data-lucide="${config.id === 'sensitive' ? 'shield-check' : 'check'}" class="w-3 h-3 mt-0.5 text-${config.color}-500 flex-shrink-0"></i>
                                        <span class="${config.id === 'sensitive' && feature.includes('零快取') ? 'font-black text-red-600' : ''}">${feature}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${isBound || isRevoked ? `<p class="text-[9px] text-moda font-bold mt-4 uppercase tracking-tighter">Updated: ${data.updated_at ? new Date(data.updated_at).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}</p>` : ''}
                        ${isRevoked ? (data.revoked_at ? (() => {
                            const revokedTime = new Date(data.revoked_at * 1000);
                            const restoreDeadline = new Date(revokedTime.getTime() + 7 * 86400 * 1000);
                            const canRestore = Date.now() < restoreDeadline.getTime();
                            return `<p class="text-[10px] text-red-600 font-black mt-2 uppercase tracking-widest">已撤銷${canRestore ? ' (可恢復)' : ' (已過期)'}</p>
                                    <p class="text-[9px] text-red-500 mt-1">撤銷時間: ${revokedTime.toLocaleString('zh-TW')}</p>`;
                        })() : `<p class="text-[10px] text-red-600 font-black mt-2 uppercase tracking-widest">已被管理員撤銷</p>`) : ''}
                    </div>
                </div>
                ${isRevoked ? (data.revoked_at ? (() => {
                    const revokedTime = new Date(data.revoked_at * 1000);
                    const restoreDeadline = new Date(revokedTime.getTime() + 7 * 86400 * 1000);
                    const canRestore = Date.now() < restoreDeadline.getTime();
                    return canRestore ? `
                        <div class="space-y-3 mt-10">
                            <p class="text-xs text-amber-600 text-center font-medium">可在 ${restoreDeadline.toLocaleDateString('zh-TW')} 前自行恢復</p>
                            <button data-action="restore-card" data-uuid="${data.uuid}"
                                    class="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
                                恢復名片
                            </button>
                        </div>
                    ` : `
                        <div class="space-y-3 mt-10">
                            <p class="text-xs text-red-600 text-center font-medium">恢復期限已過（7 天），請聯繫管理員</p>
                            <button data-action="toast-admin-restore"
                                    class="w-full py-3 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed">
                                已過期
                            </button>
                        </div>
                    `;
                })() : `
                    <div class="space-y-3 mt-10">
                        <p class="text-xs text-red-600 text-center font-medium">此名片已被管理員撤銷，無法使用或編輯</p>
                        <button data-action="toast-admin-restore"
                                class="w-full py-3 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed">
                            已撤銷
                        </button>
                    </div>
                `) : (isBound ? `
                    <div class="space-y-3 mt-10">
                        <button data-action="view-card" data-uuid="${data.uuid}"
                                ${data._optimistic ? 'disabled' : ''}
                                class="w-full py-3 ${data._optimistic ? 'bg-slate-300 cursor-not-allowed' : 'bg-moda hover:scale-[1.02] shadow-moda'} text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
                            ${data._optimistic ? '同步中...' : '查看名片'}
                        </button>
                        <button data-action="create-qr-shortcut" data-uuid="${data.uuid}" data-card-name="${(data.name_zh || data.name_en || '').replace(/"/g, '&quot;')}" data-card-type="${data.type}"
                                ${data._optimistic ? 'disabled' : ''}
                                class="w-full py-3 ${data._optimistic ? 'bg-slate-200 cursor-not-allowed' : 'bg-white border-2 border-moda/30 text-moda hover:border-moda hover:bg-moda/5'} rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2">
                            <i data-lucide="qr-code" class="w-4 h-4"></i>
                            ${data._optimistic ? '同步中...' : '加到主畫面'}
                        </button>
                        <div class="grid grid-cols-3 gap-2">
                            <button data-action="edit" data-type="${config.id}"
                                    class="py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">
                                ${i18n[currentLang]['button-edit']}
                            </button>
                            <button data-action="copy-card-link" data-uuid="${data.uuid}"
                                    class="py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">
                                ${i18n[currentLang]['button-copy']}
                            </button>
                            <button data-action="show-revoke-modal" data-uuid="${data.uuid}" data-card-type="${config.id}"
                                    class="py-3 bg-white border border-red-200 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-50 transition-all">
                                ${i18n[currentLang]['button-revoke']}
                            </button>
                        </div>
                    </div>
                ` : `
                    <button data-action="edit" data-type="${config.id}"
                            class="w-full py-4 bg-moda text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] transition-all mt-10 shadow-moda shadow-lg">
                        ${i18n[currentLang]['button-create']}
                    </button>
                `)}
            </div>
        `;
    }).join(''), { ADD_ATTR: ['data-action', 'data-uuid', 'data-card-name', 'data-card-type', 'data-type'] });
    if (window.initIcons) window.initIcons();

    // Event delegation for card slot actions
    container.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        switch (action) {
            case 'edit':
                openEditForm(target.dataset.type);
                break;
            case 'view-card':
                viewCard(target.dataset.uuid);
                break;
            case 'copy-card-link':
                copyCardLink(target.dataset.uuid);
                break;
            case 'show-revoke-modal':
                showRevokeModal(target.dataset.uuid, target.dataset.cardType);
                break;
            case 'restore-card':
                handleRestoreCard(target.dataset.uuid);
                break;
            case 'toast-admin-restore':
                showToast('請聯繫管理員恢復名片');
                break;
            case 'create-qr-shortcut':
                window.createQRShortcut(target.dataset.uuid, target.dataset.cardName, target.dataset.cardType);
                break;
        }
    });
}

// ==================== Success Modal ====================
export function showSuccessModal(uuid, type) {
    currentModalUuid = uuid;

    const subtitleText = i18n[currentLang]['modal-success-subtitle'];
    document.getElementById('modal-card-type').innerText = subtitleText;

    const shareLink = `${window.location.origin}/card-display.html?uuid=${uuid}`;
    document.getElementById('modal-share-link').value = shareLink;

    const copyBtn = document.getElementById('modal-copy-btn');
    const copyBtnText = document.getElementById('modal-copy-text');
    const copyBtnIcon = copyBtn.querySelector('i[data-lucide]');

    if (copyBtnText) copyBtnText.innerText = i18n[currentLang]['button-copy'];
    copyBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
    copyBtn.classList.add('bg-moda', 'hover:bg-moda/90');

    if (copyBtnIcon) {
        copyBtnIcon.setAttribute('data-lucide', 'copy');
    }

    document.getElementById('success-modal').classList.remove('hidden');

    if (window.initIcons) window.initIcons();
    document.addEventListener('keydown', handleModalEscape);
}

export function closeSuccessModal() {
    document.getElementById('success-modal').classList.add('hidden');
    document.removeEventListener('keydown', handleModalEscape);
    currentModalUuid = null;
    showView('selection');
}

function handleModalEscape(e) {
    if (e.key === 'Escape') {
        closeSuccessModal();
    }
}

export async function copyModalLink() {
    const link = document.getElementById('modal-share-link').value;
    const btn = document.getElementById('modal-copy-btn');
    const btnText = document.getElementById('modal-copy-text');
    const btnIcon = btn.querySelector('i[data-lucide]');

    try {
        await navigator.clipboard.writeText(link);

        btnText.innerText = i18n[currentLang]['modal-copied'];
        btn.classList.remove('bg-moda', 'hover:bg-moda/90');
        btn.classList.add('bg-green-600', 'hover:bg-green-700');

        if (btnIcon) {
            btnIcon.setAttribute('data-lucide', 'check');
            if (window.initIcons) window.initIcons();
        }

        setTimeout(() => {
            btnText.innerText = i18n[currentLang]['button-copy'];
            btn.classList.remove('bg-green-600', 'hover:bg-green-700');
            btn.classList.add('bg-moda', 'hover:bg-moda/90');

            if (btnIcon) {
                btnIcon.setAttribute('data-lucide', 'copy');
                if (window.initIcons) window.initIcons();
            }
        }, 2000);
    } catch (_err) {
        showToast(i18n[currentLang]['modal-copy-failed']);
    }
}

export function viewModalCard() {
    if (currentModalUuid) {
        window.open(`/card-display.html?uuid=${currentModalUuid}`, '_blank');
    }
}

// ==================== View Card ====================
export async function viewCard(uuid) {
    try {
        toggleLoading(true);

        const tapResponse = await fetch(`${API_BASE}/api/nfc/tap`, {
            method: 'POST',
            headers: getHeadersWithCSRF({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({ card_uuid: uuid })
        });

        if (!tapResponse.ok) {
            const error = await tapResponse.json();
            if (error.error?.code === 'rate_limited') {
                showToast('名片預覽功能暫時無法使用（請求過於頻繁）', 'warning');
                toggleLoading(false);
                return;
            }
            throw error;
        }

        const response = await tapResponse.json();
        const sessionId = response.session_id || response.data?.session_id;

        if (!sessionId) {
            throw { code: 'SESSION_ERROR', message: '無法獲取查看授權' };
        }

        const url = `${window.location.origin}/card-display.html?uuid=${uuid}&session=${sessionId}`;
        window.open(url, '_blank');

        toggleLoading(false);
    } catch (error) {
        toggleLoading(false);
        const errorMsg = errorHandler.handle(error.error || error);
        showToast(errorMsg, 'error');
    }
}

export function copyCardLink(uuid) {
    const url = `${window.location.origin}/card-display.html?uuid=${uuid}`;
    navigator.clipboard.writeText(url).then(() => {
        showToast('連結已複製到剪貼簿');
    }).catch(() => {
        showToast('複製失敗，請手動複製');
    });
}

// ==================== Revoke / Restore ====================
export function showRevokeModal(uuid, type) {
    currentRevokeUuid = uuid;
    currentRevokeType = type;
    document.getElementById('revoke-modal').classList.remove('hidden');
    document.getElementById('revoke-reason').value = '';
    document.getElementById('rate-limit-warning').classList.add('hidden');
    if (window.initIcons) window.initIcons();
}

export function closeRevokeModal() {
    document.getElementById('revoke-modal').classList.add('hidden');
    currentRevokeUuid = null;
    currentRevokeType = null;

    const confirmBtn = document.getElementById('confirm-revoke-btn');
    confirmBtn.disabled = false;
    confirmBtn.textContent = '確認撤銷';

    document.getElementById('revoke-reason').value = '';
}

export async function confirmRevokeCard() {
    if (!currentRevokeUuid) return;

    const reason = document.getElementById('revoke-reason').value || undefined;
    const confirmBtn = document.getElementById('confirm-revoke-btn');

    confirmBtn.disabled = true;
    confirmBtn.textContent = '撤銷中...';

    try {
        const response = await fetch(`/api/user/cards/${currentRevokeUuid}/revoke`, {
            method: 'POST',
            credentials: 'include',
            headers: getHeadersWithCSRF({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(reason ? { reason } : {})
        });

        const data = await response.json();

        if (response.status === 429) {
            showRateLimitError(data);
            confirmBtn.disabled = false;
            confirmBtn.textContent = '確認撤銷';
            return;
        }

        if (!response.ok) {
            const errorMsg = data.message
                || (typeof data.error === 'string' ? data.error : data.error?.message)
                || 'Revoke failed';

            if (data.error?.code === 'csrf_token_invalid' || data.error?.code === 'csrf_token_missing') {
                showToast('登入已過期，請重新整理頁面後再試');
                confirmBtn.disabled = false;
                confirmBtn.textContent = '確認撤銷';
                return;
            }

            throw new Error(errorMsg);
        }

        closeRevokeModal();

        const restoreDate = data.restore_deadline
            ? new Date(data.restore_deadline).toLocaleDateString('zh-TW', {
                year: 'numeric', month: '2-digit', day: '2-digit'
            })
            : '7 天內';

        showToast(`名片已撤銷，可在 ${restoreDate} 前恢復`);

        await fetchUserCards();
        renderSelectionPage();
    } catch (error) {
        console.error('Revoke error:', error);
        showToast(errorHandler.handle(error));
        confirmBtn.disabled = false;
        confirmBtn.textContent = '確認撤銷';
    }
}

export async function handleRestoreCard(uuid) {
    if (!confirm('確定要恢復此名片嗎？恢復後所有分享連結將重新生效。')) {
        return;
    }

    document.getElementById('global-loading').classList.remove('hidden');

    try {
        const response = await fetch(`/api/user/cards/${uuid}/restore`, {
            method: 'POST',
            credentials: 'include',
            headers: getHeadersWithCSRF()
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.error === 'RESTORE_WINDOW_EXPIRED') {
                showToast('恢復期限已過（7 天），請聯繫管理員');
            } else {
                throw new Error(data.message || data.error || 'Restore failed');
            }
            return;
        }

        showToast('名片已成功恢復');
        await fetchUserCards();
        renderSelectionPage();
    } catch (error) {
        console.error('Restore error:', error);
        showToast(errorHandler.handle(error));
    } finally {
        document.getElementById('global-loading').classList.add('hidden');
    }
}

function showRateLimitError(data) {
    const banner = document.getElementById('rate-limit-banner');
    const message = document.getElementById('rate-limit-message');
    const retry = document.getElementById('rate-limit-retry');

    message.textContent = data.message;

    const retryMinutes = Math.ceil(data.retry_after / 60);
    retry.textContent = `請在 ${retryMinutes} 分鐘後重試`;

    banner.classList.remove('hidden');
    if (window.initIcons) window.initIcons();

    setTimeout(() => banner.classList.add('hidden'), 10000);
}

// ==================== Preview ====================
const ORG_DEPT_MAPPING = {
    departments: {
        '數位策略司': 'Department of Digital Strategy',
        '數位政府司': 'Department of Digital Service',
        '資源管理司': 'Department of Resource Management',
        '韌性建設司': 'Department of Communications and Cyber Resilience',
        '數位國際司': 'Department of International Cooperation',
        '資料創新司': 'Department of Data Innovation',
        '秘書處': 'Secretariat',
        '人事處': 'Department of Personnel',
        '政風處': 'Department of Civil Service Ethics',
        '主計處': 'Department of Budget, Accounting and Statistics',
        '資訊處': 'Department of Information Management',
        '法制處': 'Department of Legal Affairs',
        '部長室': "Minister's Office",
        '政務次長室': "Deputy Minister's Office",
        '常務次長室': "Administrative Deputy Minister's Office",
        '主任秘書室': "Secretary-General's Office"
    }
};

export function updatePreview() {
    const isEn = window.previewLang === 'en';
    const name = isEn ? document.getElementById('name_en').value || '---' : document.getElementById('name_zh').value || '---';
    const title = isEn ? document.getElementById('title_en').value || '---' : document.getElementById('title_zh').value || '---';

    const greetingInput = isEn ? document.getElementById('greetings_en').value : document.getElementById('greetings_zh').value;
    const greet = greetingInput ? greetingInput.split('\n').filter(g => g.trim())[0] || '' : '';

    const email = document.getElementById('email').value || '---';
    const phone = document.getElementById('phone').value || '---';

    const preset = document.getElementById('address-preset').value;
    let addressZh = '', addressEn = '';
    if (preset === 'yanping') {
        addressZh = ADDRESS_PRESETS.yanping.zh;
        addressEn = ADDRESS_PRESETS.yanping.en;
    } else if (preset === 'shinkong') {
        addressZh = ADDRESS_PRESETS.shinkong.zh;
        addressEn = ADDRESS_PRESETS.shinkong.en;
    } else {
        addressZh = document.getElementById('address_zh').value || '';
        addressEn = document.getElementById('address_en').value || '';
    }
    const addressText = isEn ? (addressEn || '---') : (addressZh || '---');

    document.getElementById('prev-name').innerText = name;

    const titleElement = document.getElementById('prev-title');
    const titleZh = document.getElementById('title_zh').value;
    const titleEn = document.getElementById('title_en').value;
    if (title && title !== '---') {
        titleElement.style.display = 'block';
        titleElement.innerText = title;
    } else if (!titleZh && !titleEn) {
        titleElement.style.display = 'none';
    } else {
        titleElement.style.display = 'block';
        titleElement.innerText = title;
    }

    const departmentPreset = document.getElementById('department-preset').value;
    let deptValue;

    if (departmentPreset === 'custom') {
        const zh = document.getElementById('department-custom-zh').value.trim();
        const en = document.getElementById('department-custom-en').value.trim();
        if (zh && en) { deptValue = { zh, en }; }
        else if (zh) { deptValue = zh; }
        else if (en) { deptValue = en; }
    } else if (departmentPreset) {
        deptValue = departmentPreset;
    }

    const deptElement = document.getElementById('prev-department');
    if (deptValue) {
        let deptText;
        if (typeof deptValue === 'object' && deptValue !== null) {
            deptText = isEn ? (deptValue.en || deptValue.zh || '') : (deptValue.zh || deptValue.en || '');
        } else if (typeof deptValue === 'string') {
            if (isEn && ORG_DEPT_MAPPING.departments[deptValue]) {
                deptText = ORG_DEPT_MAPPING.departments[deptValue];
            } else {
                deptText = deptValue;
            }
        }

        if (deptText) {
            deptElement.style.display = 'flex';
            document.getElementById('prev-department-text').innerText = deptText;
        } else {
            deptElement.style.display = 'none';
        }
    } else {
        deptElement.style.display = 'none';
    }

    document.getElementById('prev-email').innerText = email;
    document.getElementById('prev-phone').innerText = phone;

    const web = document.getElementById('web')?.value || '';
    const webContainer = document.getElementById('prev-web-container');
    if (web && web.trim()) {
        webContainer.style.display = 'flex';
        document.getElementById('prev-web').innerText = web;
    } else {
        webContainer.style.display = 'none';
    }

    const mobile = document.getElementById('mobile')?.value || '';
    const mobileContainer = document.getElementById('prev-mobile-container');
    if (mobile && mobile.trim()) {
        mobileContainer.style.display = 'flex';
        document.getElementById('prev-mobile').innerText = mobile;
    } else {
        mobileContainer.style.display = 'none';
    }

    document.getElementById('prev-address').innerText = addressText;

    const greetingSection = document.getElementById('prev-greeting-section');
    if (greet) {
        greetingSection.classList.remove('hidden');
        document.getElementById('prev-greeting').innerText = greet;
    } else {
        greetingSection.classList.add('hidden');
    }

    const prevAvatar = document.getElementById('prev-avatar');
    const avatarUrl = document.getElementById('avatar_url').value;
    if (avatarUrl && avatarUrl.trim()) {
        prevAvatar.classList.remove('hidden');
        prevAvatar.src = avatarUrl;
    } else {
        prevAvatar.classList.add('hidden');
    }
    prevAvatar.onerror = function() {
        this.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
    };

    const icons = SocialParser.collectFromInputs();
    const cluster = document.getElementById('prev-social-cluster');
    cluster.innerHTML = '';
    icons.forEach(icon => {
        const node = document.createElement('div');
        node.className = 'social-chip-prev';

        if (icon === 'line') {
            node.innerHTML = DOMPurify.sanitize(`<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>`);
        } else if (icon === 'signal') {
            node.innerHTML = DOMPurify.sanitize(`<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0q-.934 0-1.83.139l.17 1.111a11 11 0 0 1 3.32 0l.172-1.111A12 12 0 0 0 12 0M9.152.34A12 12 0 0 0 5.77 1.742l.584.961a10.8 10.8 0 0 1 3.066-1.27zm5.696 0-.268 1.094a10.8 10.8 0 0 1 3.066 1.27l.584-.962A12 12 0 0 0 14.848.34"/></svg>`);
        } else {
            node.innerHTML = DOMPurify.sanitize(`<i data-lucide="${icon}" class="w-4 h-4"></i>`);
        }

        cluster.appendChild(node);
    });
    if (window.initIcons) window.initIcons();
}

// ==================== Form Helpers ====================
function detectNameLanguage(name) {
    const hasChinese = /[\u4e00-\u9fa5]/.test(name);
    const hasEnglish = /[a-zA-Z]/.test(name);

    if (hasChinese && hasEnglish) {
        const parts = name.split(/\s+/);
        const zhPart = parts.filter(p => /[\u4e00-\u9fa5]/.test(p)).join(' ');
        const enPart = parts.filter(p => /[a-zA-Z]/.test(p)).join(' ');
        return { name_zh: zhPart, name_en: enPart };
    } else if (hasChinese) {
        return { name_zh: name, name_en: '' };
    } else {
        return { name_zh: '', name_en: name };
    }
}

export function prefillFormWithOIDC(userData) {
    if (!userData) return;

    if (userData.email) {
        document.getElementById('email').value = userData.email;
    }

    if (userData.picture && userData.picture !== 'undefined') {
        const avatarInput = document.getElementById('avatar_url');
        if (avatarInput) {
            avatarInput.value = userData.picture;
        }
    }

    if (userData.name) {
        const nameResult = detectNameLanguage(userData.name);
        if (nameResult.name_zh) {
            document.getElementById('name_zh').value = nameResult.name_zh;
        }
        if (nameResult.name_en) {
            document.getElementById('name_en').value = nameResult.name_en;
        }
    }

    updatePreview();
}

export function updateUserDisplay(email, name, picture) {
    document.getElementById('user-email-display').innerText = email || '---';

    if (name) {
        document.getElementById('user-name-display').innerText = name;
    }

    if (picture) {
        const avatarEl = document.getElementById('user-avatar-display');
        avatarEl.src = picture;
        avatarEl.classList.remove('hidden');
        avatarEl.onerror = function() {
            this.classList.add('hidden');
        };
    }
}

export async function handleFormSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const submitBtnText = document.getElementById('submit-btn-text');
    const submitBtnLoading = document.getElementById('submit-btn-loading');

    submitBtn.disabled = true;
    submitBtnText.classList.add('hidden');
    submitBtnLoading.classList.remove('hidden');
    if (window.initIcons) window.initIcons();

    const formData = new FormData(e.target);
    const data = {};

    ['type', 'name_zh', 'name_en', 'title_zh', 'title_en',
     'email', 'phone', 'mobile', 'web', 'avatar_url', 'greetings_zh', 'greetings_en',
     'social_github', 'social_linkedin', 'social_facebook',
     'social_instagram', 'social_twitter', 'social_youtube',
     'social_line', 'social_signal'].forEach(key => {
        const val = formData.get(key);
        if (val !== null && val !== undefined) data[key] = val;
    });

    const addressPreset = document.getElementById('address-preset').value;
    if (addressPreset === 'yanping') {
        data.address_zh = ADDRESS_PRESETS.yanping.zh;
        data.address_en = ADDRESS_PRESETS.yanping.en;
    } else if (addressPreset === 'shinkong') {
        data.address_zh = ADDRESS_PRESETS.shinkong.zh;
        data.address_en = ADDRESS_PRESETS.shinkong.en;
    } else {
        data.address_zh = formData.get('address_zh') || '';
        data.address_en = formData.get('address_en') || '';
    }

    const departmentPreset = document.getElementById('department-preset').value;
    if (departmentPreset === 'custom') {
        const zh = document.getElementById('department-custom-zh').value.trim();
        const en = document.getElementById('department-custom-en').value.trim();
        if (zh && en) { data.department = { zh, en }; }
        else if (zh) { data.department = zh; }
        else if (en) { data.department = en; }
        else { data.department = ''; }
    } else {
        data.department = departmentPreset;
    }

    const uuid = formData.get('form-uuid');
    const type = formData.get('form-type');

    try {
        if (uuid) {
            submitBtnText.textContent = '更新中...';
            submitBtnText.classList.remove('hidden');
            submitBtnLoading.classList.add('hidden');

            await apiCall(`/api/user/cards/${uuid}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('名片更新成功');
            await fetchUserCards();
            showView('selection');
        } else {
            submitBtnText.textContent = '驗證中...';
            submitBtnText.classList.remove('hidden');
            submitBtnLoading.classList.add('hidden');

            const tempId = stateManager.optimisticCreate(type, data);
            state.cards = stateManager.getState().cards;
            renderSelectionPage();

            submitBtnText.textContent = '加密中...';
            const response = await apiCall('/api/user/cards', {
                method: 'POST',
                body: JSON.stringify({ ...data, type })
            });

            const realUuid = response.data?.uuid;
            if (!realUuid) {
                throw new Error('API 未返回 UUID');
            }

            submitBtnText.textContent = '儲存中...';

            stateManager.confirmCreate(tempId, realUuid, {
                name_zh: data.name_zh,
                name_en: data.name_en,
                updated_at: new Date().toISOString()
            });
            state.cards = stateManager.getState().cards;

            showSuccessModal(realUuid, type);

            stateManager.queueSync(async () => {
                await fetchUserCards();
            });
        }
    } catch (err) {
        if (!uuid) {
            const rolled = stateManager.rollback();
            if (rolled) {
                state.cards = stateManager.getState().cards;
                renderSelectionPage();
            }
        }

        const errorMsg = errorHandler.handle(err);
        const errEl = document.getElementById('form-error-msg');
        errEl.innerText = errorMsg;
        errEl.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtnText.textContent = uuid ? '儲存變更' : '建立名片';
        submitBtnText.classList.remove('hidden');
        submitBtnLoading.classList.add('hidden');
    }
}
