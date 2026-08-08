// DB-Card User Portal — ES Module Entry Point
// App entry: imports all modules, registers handlers, initializes app

import { initParticles } from './particles.js';
import {
    applyTranslations, currentLang, state, fetchUserCards,
    validateSessionAndConsent, showToast, showView, toggleLoading,
    ADDRESS_PRESETS, i18n, registerConsentHandlers, registerRenderSelectionPage
} from './core.js';
import {
    handleGoogleLogin, handleLogout, closeWebViewWarning,
    copyCurrentURL, initWebViewCheck
} from './auth-flow.js';
import {
    showConsentModal, showRestoreConsentModal, acceptConsent,
    toggleFullContent, showWithdrawConsentModal, closeWithdrawConsentModal,
    confirmWithdrawConsent, closeRestoreConsentModal, confirmRestoreConsent,
    showConsentHistoryModal, closeConsentHistoryModal, handleDataExport,
    checkConsentStatus
} from './consent.js';
import {
    SelfCardOCR, initScanFileInput, openEditForm, renderSelectionPage,
    showSuccessModal, closeSuccessModal, copyModalLink, viewModalCard,
    viewCard, copyCardLink, showRevokeModal, closeRevokeModal,
    confirmRevokeCard, handleRestoreCard, updatePreview,
    handleFormSubmit, updateUserDisplay, prefillFormWithOIDC
} from './self-card-ocr.js';

// ==================== Register cross-module handlers ====================
registerConsentHandlers(showConsentModal, showRestoreConsentModal);
registerRenderSelectionPage(renderSelectionPage);

// ==================== Window Exposure (classic scripts interop only) ====================
// These are needed by received-cards.js, feature-api.js (classic scripts)
window.showToast = showToast;
window.toggleLoading = toggleLoading;
window.showView = showView;
window.renderSelectionPage = renderSelectionPage;

// ==================== Event Delegation ====================
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const actions = {
        'google-login': () => handleGoogleLogin(),
        'logout': () => handleLogout(),
        'show-view': () => showView(target.dataset.view),
        'ocr-scan': () => SelfCardOCR.scan(),
        'ocr-cancel': () => SelfCardOCR.cancel(),
        'close-success-modal': () => closeSuccessModal(),
        'copy-modal-link': () => copyModalLink(),
        'view-modal-card': () => viewModalCard(),
        'close-webview-error': () => document.getElementById('webview-error-modal').classList.add('hidden'),
        'consent-history': () => showConsentHistoryModal(),
        'data-export': () => handleDataExport(),
        'consent-withdraw': () => showWithdrawConsentModal(),
        'toggle-full-content': () => toggleFullContent(),
        'accept-consent': () => acceptConsent(),
        'close-withdraw-modal': () => closeWithdrawConsentModal(),
        'confirm-withdraw': () => confirmWithdrawConsent(),
        'confirm-restore': () => confirmRestoreConsent(),
        'close-restore-modal': () => closeRestoreConsentModal(),
        'close-history-modal': () => closeConsentHistoryModal(),
        'close-revoke-modal': () => closeRevokeModal(),
        'confirm-revoke': () => confirmRevokeCard(),
        'copy-url': () => copyCurrentURL(),
        'close-webview-warning': () => closeWebViewWarning(),
        'show-received-cards': () => window.showReceivedCards(),
        'back-to-selection': () => window.backToSelection(),
        'retry-upload': () => window.ReceivedCards.retryUpload(),
        'upload-cancel': () => window.CardUploadStateMachine.setState('idle'),
        'upload-reset': () => window.CardUploadStateMachine.reset(),
    };

    if (actions[action]) {
        e.preventDefault();
        actions[action]();
    }
});

// ==================== Three.js Particles Init ====================
if (typeof THREE !== 'undefined') {
    setTimeout(() => initParticles(), 100);
} else {
    window.addEventListener('load', () => {
        if (typeof THREE !== 'undefined') initParticles();
    });
}

// ==================== WebView Check ====================
initWebViewCheck();

// ==================== DOMContentLoaded ====================
document.addEventListener('DOMContentLoaded', async () => {
    applyTranslations(currentLang);

    if (window.initIcons) window.initIcons();

    document.getElementById('edit-form').onsubmit = handleFormSubmit;

    // Initialize scan file input
    initScanFileInput();

    // Check if just completed OAuth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const loginStatus = urlParams.get('login');

    if (loginStatus === 'success') {
        window.history.replaceState({}, '', '/user-portal.html');

        const sessionId = urlParams.get('session');

        if (sessionId) {
            try {
                document.getElementById('global-loading').classList.remove('hidden');

                const response = await fetch(`/api/user/oauth-user-info?session=${sessionId}`, {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    const { email, name, picture, csrfToken } = data.data;

                    if (csrfToken) {
                        sessionStorage.removeItem('csrfToken');
                        sessionStorage.setItem('csrfToken', csrfToken);
                    }

                    const user = { email, name, picture };
                    sessionStorage.setItem('auth_user', JSON.stringify(user));

                    state.isLoggedIn = true;
                    state.currentUser = user;
                    window.__sessionExpired = false;

                    updateUserDisplay(email, name, picture);

                    const { valid: sessionValid, consentOk } = await validateSessionAndConsent();
                    if (!sessionValid) {
                        document.getElementById('global-loading').classList.add('hidden');
                        return;
                    }

                    if (!consentOk) {
                        document.getElementById('global-loading').classList.add('hidden');
                        return;
                    }

                    await fetchUserCards();

                    showToast('登入成功');
                    showView('selection');
                } else {
                    throw new Error('Failed to retrieve user info');
                }
            } catch (error) {
                console.error('OAuth redirect error:', error);
                showToast('登入失敗，請重試');
                showView('login');
            } finally {
                document.getElementById('global-loading').classList.add('hidden');
            }
            return;
        }
    } else if (loginStatus === 'error') {
        window.history.replaceState({}, '', '/user-portal.html');

        const error = urlParams.get('error');
        const errorBox = document.getElementById('login-error-box');

        if (error === 'unauthorized_domain') {
            errorBox.innerText = i18n[currentLang]['error-unauthorized'] || '登入失敗：您的 Email 尚未授權';
        } else {
            errorBox.innerText = i18n[currentLang]['error-login-failed'] || '登入失敗，請重試';
        }

        errorBox.classList.remove('hidden');
        showView('login');
        return;
    }

    // Check for stored user info (token in HttpOnly cookie)
    const userJson = sessionStorage.getItem('auth_user');

    if (userJson) {
        try {
            const user = JSON.parse(userJson);

            state.isLoggedIn = true;
            state.authToken = null;
            state.currentUser = user;

            updateUserDisplay(user.email, user.name, user.picture);

            document.getElementById('global-loading').classList.remove('hidden');

            try {
                const { valid: sessionValid, consentOk } = await validateSessionAndConsent();
                if (!sessionValid) {
                    document.getElementById('global-loading').classList.add('hidden');
                    return;
                }

                if (!consentOk) {
                    document.getElementById('global-loading').classList.add('hidden');
                    return;
                }

                await fetchUserCards();
                if (state.isLoggedIn) {
                    window.__sessionExpired = false;
                    showToast('自動登入成功');
                    showView('selection');
                }
            } catch (err) {
                console.error('Failed to load cards:', err);
                sessionStorage.removeItem('auth_user');
                state.isLoggedIn = false;
                state.currentUser = null;
                showView('login');
            } finally {
                document.getElementById('global-loading').classList.add('hidden');
            }
        } catch (err) {
            console.error('Auto-login failed:', err);
            sessionStorage.removeItem('auth_user');
            showView('login');
        }
    } else {
        showView('login');
    }

    // Bind preview listeners
    document.querySelectorAll('input, textarea, select').forEach(el => el.addEventListener('input', updatePreview));
    document.querySelectorAll('input, textarea, select').forEach(el => el.addEventListener('change', updatePreview));

    // Preview language switch
    document.querySelectorAll('#preview-lang-switch button').forEach(btn => {
        btn.onclick = () => {
            window.previewLang = btn.dataset.lang;
            document.querySelectorAll('#preview-lang-switch button').forEach(b => {
                b.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
                b.classList.add('text-slate-500');
            });
            btn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
            btn.classList.remove('text-slate-500');
            updatePreview();
        };
    });

    // Initialize preview language button state
    document.querySelectorAll('#preview-lang-switch button').forEach(btn => {
        if (btn.dataset.lang === window.previewLang) {
            btn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
            btn.classList.remove('text-slate-500');
        } else {
            btn.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
            btn.classList.add('text-slate-500');
        }
    });

    // Address preset listener
    document.getElementById('address-preset').addEventListener('change', (e) => {
        const value = e.target.value;
        const customFields = document.getElementById('custom-address-fields');

        if (value === 'custom') {
            customFields.classList.remove('hidden');
        } else if (value && ADDRESS_PRESETS[value]) {
            customFields.classList.add('hidden');
            document.getElementById('address_zh').value = ADDRESS_PRESETS[value].zh;
            document.getElementById('address_en').value = ADDRESS_PRESETS[value].en;
        } else {
            customFields.classList.add('hidden');
            document.getElementById('address_zh').value = '';
            document.getElementById('address_en').value = '';
        }
        updatePreview();
    });

    // Department preset listener
    document.getElementById('department-preset').addEventListener('change', (e) => {
        const value = e.target.value;
        const customField = document.getElementById('custom-department-field');

        if (value === 'custom') {
            customField.classList.remove('hidden');
            document.getElementById('department-custom-zh').focus();
        } else {
            customField.classList.add('hidden');
            document.getElementById('department-custom-zh').value = '';
            document.getElementById('department-custom-en').value = '';
        }
        updatePreview();
    });

    // Modal backdrop close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) {
            closeSuccessModal();
        }
    });
});
