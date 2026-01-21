                    // Extract error details (support nested error object)
                    const errorDetails = error.error || error;
                    throw { 
                        status: res.status, 
                        code: errorDetails.code,
                        message: errorDetails.message || error.message || 'Request failed',
                        existing_uuid: errorDetails.existing_uuid
                    };
                }

                return res.json();
            } catch (err) {
                if (err.status) throw err;
                throw { status: 0, message: '網路連線失敗' };
            }
        }

        async function handleGoogleLogin() {
            const errorBox = document.getElementById('login-error-box');
            errorBox.classList.add('hidden');

            const clientId = '675226781448-akeqtr5d603ad0bcb3tve5hl4a8c164u.apps.googleusercontent.com';
            const redirectUri = window.location.origin + '/oauth/callback';
            const scope = 'openid email profile';

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
                client_id: clientId,
                redirect_uri: redirectUri,
                response_type: 'code',
                scope: scope,
                access_type: 'online',
                prompt: 'select_account'
            });

            // Open popup
            const popup = window.open(authUrl, 'Google Login', 'width=500,height=600');

            // Listen for message from popup
            window.addEventListener('message', async (event) => {
                if (event.data.type === 'oauth_success') {
                    const { email, name, picture } = event.data;

                    // Check domain whitelist
                    const allowedDomains = ['@moda.gov.tw', '@nics.nat.gov.tw'];
                    const isAllowed = allowedDomains.some(domain => email.endsWith(domain));

                    if (!isAllowed) {
                        errorBox.innerText = '您的 Email 網域未授權（僅限 @moda.gov.tw 或 @nics.nat.gov.tw）';
                        errorBox.classList.remove('hidden');
                        return;
                    }

                    // 立即設定登入狀態（token 已存在 HttpOnly cookie）
                    state.isLoggedIn = true;
                    state.authToken = null; // No longer needed in memory
                    state.currentUser = { email, name, picture };
                    document.getElementById('user-email-display').innerText = email;

                    // 只存儲使用者資訊（不存儲 token）
                    sessionStorage.setItem('auth_user', JSON.stringify({ email, name, picture }));

                    // 立即切換視圖（使用者看到反應）
                    showView('selection');
                    
                    // 顯示載入中
                    document.getElementById('global-loading').classList.remove('hidden');

                    // 背景載入卡片資料
                    try {
                        await fetchUserCards();
                        showToast('登入成功');
                    } catch (err) {
                        handleError(err);
                    } finally {
                        // 隱藏載入中
                        document.getElementById('global-loading').classList.add('hidden');
                    }
                } else if (event.data.type === 'oauth_error') {
                    errorBox.innerText = '登入失敗：' + event.data.error;
                    errorBox.classList.remove('hidden');
                }
            }, { once: true });
        }

        async function handleLogout() {
            try {
                // 呼叫後端清除 HttpOnly cookie
                await fetch('/api/user/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (err) {
                console.error('Logout API call failed:', err);
                // Continue with frontend cleanup even if API call fails
            }

            state.isLoggedIn = false;
            state.authToken = null;
            state.currentUser = null;
            state.cards = [];

            // 清除使用者資訊
            sessionStorage.removeItem('auth_user');

            showView('login');
        }

        // Scenario F3: GET /api/user/cards
        async function fetchUserCards() {
            try {
                const response = await apiCall('/api/user/cards', { method: 'GET' });
                const cards = response.data?.cards || [];

                // 使用後端返回的 status，並保留 revoked_at
                state.cards = ['personal', 'event', 'sensitive'].map(type => {
                    const card = cards.find(c => c.type === type);
                    if (card) {
                        return {
                            ...card,
                            status: card.status || 'bound',
                            revoked_at: card.revoked_at || null
                        };
                    }
                    return { type, status: 'empty' };
                });

                // 初始化狀態管理器
                stateManager.initialize(state.cards);

                renderSelectionPage();
            } catch (err) {
                handleError(err);
            }
        }

        // Scenario F4 (POST/PUT): Create/Edit Card
        async function handleFormSubmit(e) {
            e.preventDefault();
            
            // 顯示 loading 狀態
            const submitBtn = document.getElementById('submit-btn');
            const submitBtnText = document.getElementById('submit-btn-text');
            const submitBtnLoading = document.getElementById('submit-btn-loading');
            
            submitBtn.disabled = true;
            submitBtnText.classList.add('hidden');
            submitBtnLoading.classList.remove('hidden');
            lucide.createIcons();
            
            const formData = new FormData(e.target);
            const data = {};

            // 收集表單資料（允許空字串以支援清空欄位）
            ['type', 'name_zh', 'name_en', 'title_zh', 'title_en',
             'email', 'phone', 'address_zh', 'address_en',
             'mobile', 'avatar_url', 'greetings_zh', 'greetings_en',
             'social_github', 'social_linkedin', 'social_facebook',
             'social_instagram', 'social_twitter', 'social_youtube',
             'social_line', 'social_signal'].forEach(key => {
                const val = formData.get(key);
                if (val !== null && val !== undefined) data[key] = val;
            });

            // 處理部門欄位
            const departmentPreset = document.getElementById('department-preset').value;
            if (departmentPreset === 'custom') {
                const zh = document.getElementById('department-custom-zh').value.trim();
                const en = document.getElementById('department-custom-en').value.trim();

                if (zh && en) {
                    data.department = { zh, en };
                } else if (zh) {
                    data.department = zh;
                } else if (en) {
                    data.department = en;
                } else {
                    data.department = '';
                }
            } else {
                data.department = departmentPreset;
            }

            const uuid = formData.get('form-uuid');
            const type = formData.get('form-type');

            try {
                if (uuid) {
                    // 編輯：使用 Toast
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
                    // 創建：使用樂觀更新
                    submitBtnText.textContent = '驗證中...';
                    submitBtnText.classList.remove('hidden');
                    submitBtnLoading.classList.add('hidden');

                    // 1. 樂觀更新（立即反應）
                    const tempId = stateManager.optimisticCreate(type, data);
                    state.cards = stateManager.getState().cards;
                    renderSelectionPage();

                    // 2. API 請求
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

                    // 3. 確認更新
                    stateManager.confirmCreate(tempId, realUuid, {
                        name_zh: data.name_zh,
                        name_en: data.name_en,
                        updated_at: new Date().toISOString()
                    });
                    state.cards = stateManager.getState().cards;

                    // 4. 顯示 Modal
                    showSuccessModal(realUuid, type);

                    // 5. 背景同步
                    stateManager.queueSync(async () => {
                        await fetchUserCards();
                    });
                }
            } catch (err) {
                // 6. 失敗回滾
                if (!uuid) {
                    const rolled = stateManager.rollback();
                    if (rolled) {
                        state.cards = stateManager.getState().cards;
                        renderSelectionPage();
                    }
                }

                // 7. 統一錯誤處理
                const errorMsg = errorHandler.handle(err);
                const errEl = document.getElementById('form-error-msg');
                errEl.innerText = errorMsg;
                errEl.classList.remove('hidden');
            } finally {
                // 8. 恢復按鈕狀態
                submitBtn.disabled = false;
                submitBtnText.textContent = uuid ? '儲存變更' : '建立名片';
                submitBtnText.classList.remove('hidden');
                submitBtnLoading.classList.add('hidden');
            }
        }

        // Scenario F5: GET /api/user/cards/:uuid (編輯模式)
        async function openEditForm(type) {
            const card = state.cards.find(c => c.type === type);
            
            // 阻擋 revoked 卡片
            if (card && card.status === 'revoked') {
                showToast('此名片已被撤銷，無法編輯');
                return;
            }
            
            const isEdit = card && card.status === 'bound';

            document.getElementById('edit-form').reset();
            document.getElementById('form-error-msg').classList.add('hidden');
            document.getElementById('form-type').value = type;

            if (isEdit && card.uuid) {
                try {
                    toggleLoading(true);
                    const response = await apiCall(`/api/user/cards/${card.uuid}`, { method: 'GET' });
                    const fullCard = response.data || response;

                    document.getElementById('form-uuid').value = card.uuid;

                    // 預填所有欄位（扁平結構）
                    ['name_zh', 'name_en', 'title_zh', 'title_en',
                     'email', 'phone', 'mobile', 'avatar_url',
                     'greetings_zh', 'greetings_en',
                     'social_github', 'social_linkedin', 'social_facebook',
                     'social_instagram', 'social_twitter', 'social_youtube',
                     'social_line', 'social_signal'].forEach(key => {
                        const el = document.getElementById(key);
                        if (el && fullCard[key] !== undefined) el.value = fullCard[key];
                    });

                    // 處理部門預設選項
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
                            // 自訂部門
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

                    // 處理地址預設選項
                    if (fullCard.address_zh || fullCard.address_en) {
                        // 檢查是否為預設地址
                        if (fullCard.address_zh === ADDRESS_PRESETS.yanping.zh) {
                            document.getElementById('address-preset').value = 'yanping';
                            document.getElementById('custom-address-fields').classList.add('hidden');
                        } else if (fullCard.address_zh === ADDRESS_PRESETS.shinkong.zh) {
                            document.getElementById('address-preset').value = 'shinkong';
                            document.getElementById('custom-address-fields').classList.add('hidden');
                        } else {
                            // 自訂地址
                            document.getElementById('address-preset').value = 'custom';
                            document.getElementById('address_zh').value = fullCard.address_zh || '';
                            document.getElementById('address_en').value = fullCard.address_en || '';
                            document.getElementById('custom-address-fields').classList.remove('hidden');
                        }
                    }

                    document.getElementById('form-title').innerText = '編輯數位名片';
                } catch (err) {
                    showToast('載入名片資料失敗');
                    return;
                } finally {
                    toggleLoading(false);
                }
            } else {
                document.getElementById('form-uuid').value = '';
                document.getElementById('email').value = state.currentUser?.email || '';
                document.getElementById('form-title').innerText = '建立新名片';
            }

            updatePreview();
            showView('form');
        }


        function renderSelectionPage() {
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
                                    ${config.label}
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
                                    return `<p class="text-[10px] text-red-600 font-black mt-2 uppercase tracking-widest">⚠️ 已撤銷${canRestore ? ' (可恢復)' : ' (已過期)'}</p>
                                            <p class="text-[9px] text-red-500 mt-1">撤銷時間: ${revokedTime.toLocaleString('zh-TW')}</p>`;
                                })() : `<p class="text-[10px] text-red-600 font-black mt-2 uppercase tracking-widest">⚠️ 已被管理員撤銷</p>`) : ''}
                            </div>
                        </div>
                        ${isRevoked ? (data.revoked_at ? (() => {
                            const revokedTime = new Date(data.revoked_at * 1000);
                            const restoreDeadline = new Date(revokedTime.getTime() + 7 * 86400 * 1000);
                            const canRestore = Date.now() < restoreDeadline.getTime();
                            return canRestore ? `
                                <div class="space-y-3 mt-10">
                                    <p class="text-xs text-amber-600 text-center font-medium">可在 ${restoreDeadline.toLocaleDateString('zh-TW')} 前自行恢復</p>
                                    <button onclick="handleRestoreCard('${data.uuid}')"
                                            class="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
                                        恢復名片
                                    </button>
                                </div>
                            ` : `
                                <div class="space-y-3 mt-10">
                                    <p class="text-xs text-red-600 text-center font-medium">恢復期限已過（7 天），請聯繫管理員</p>
                                    <button onclick="showToast('請聯繫管理員恢復名片')"
                                            class="w-full py-3 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed">
                                        已過期
                                    </button>
                                </div>
                            `;
                        })() : `
                            <div class="space-y-3 mt-10">
                                <p class="text-xs text-red-600 text-center font-medium">此名片已被管理員撤銷，無法使用或編輯</p>
                                <button onclick="showToast('請聯繫管理員恢復名片')"
                                        class="w-full py-3 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed">
                                    已撤銷
                                </button>
                            </div>
                        `) : (isBound ? `
                            <div class="space-y-3 mt-10">
                                <button onclick="viewCard('${data.uuid}')"
                                        ${data._optimistic ? 'disabled' : ''}
                                        class="w-full py-3 ${data._optimistic ? 'bg-slate-300 cursor-not-allowed' : 'bg-moda hover:scale-[1.02] shadow-moda'} text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
                                    ${data._optimistic ? '同步中...' : '查看名片'}
                                </button>
                                <div class="grid grid-cols-3 gap-2">
                                    <button data-action="edit" data-type="${config.id}"
                                            class="py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">
                                        編輯
                                    </button>
                                    <button onclick="copyCardLink('${data.uuid}')"
                                            class="py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">
                                        複製
                                    </button>
                                    <button onclick="showRevokeModal('${data.uuid}', '${config.id}')"
                                            class="py-3 bg-white border border-red-200 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-50 transition-all">
                                        撤銷
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <button data-action="edit" data-type="${config.id}"
                                    class="w-full py-4 bg-moda text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] transition-all mt-10 shadow-moda shadow-lg">
                                建立名片
                            </button>
                        `)}
                    </div>
                `;
            }).join(''), { ADD_ATTR: ['onclick'] });
            lucide.createIcons();

            // Event delegation for edit buttons
            container.addEventListener('click', (e) => {
                const button = e.target.closest('[data-action="edit"]');
                if (button) {
                    const type = button.dataset.type;
                    openEditForm(type);
                }
            });
        }


        // 顯示成功 Modal
        function showSuccessModal(uuid, type) {
            currentModalUuid = uuid;

            // 設定名片類型文字
            const typeText = {
                'personal': '個人名片',
                'event': '活動名片',
                'sensitive': '敏感名片'
            }[type] || '名片';
            document.getElementById('modal-card-type').innerText = `您的${typeText}已準備就緒`;

            // 設定分享連結（不帶 session）
            const shareLink = `${window.location.origin}/card-display.html?uuid=${uuid}`;
            document.getElementById('modal-share-link').value = shareLink;

            // 重置複製按鈕
            const copyBtn = document.getElementById('modal-copy-btn');
            const copyBtnText = document.getElementById('modal-copy-text');
            const copyBtnIcon = copyBtn.querySelector('i[data-lucide]');

            if (copyBtnText) copyBtnText.innerText = '複製';
            copyBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            copyBtn.classList.add('bg-moda', 'hover:bg-moda/90');

            if (copyBtnIcon) {
                copyBtnIcon.setAttribute('data-lucide', 'copy');
            }

            // 顯示 Modal
            document.getElementById('success-modal').classList.remove('hidden');

            // 初始化 lucide icons（確保 check-circle 顯示）
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // 綁定 ESC 鍵
            document.addEventListener('keydown', handleModalEscape);
        }

        // 關閉 Modal
        function closeSuccessModal() {
            document.getElementById('success-modal').classList.add('hidden');
            document.removeEventListener('keydown', handleModalEscape);
            currentModalUuid = null;

            // 返回選擇頁面
            showView('selection');
