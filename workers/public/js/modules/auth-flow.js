// Auth Flow Module — WebView detection + OAuth functions
// Converted to ES module from /js/auth-flow.js

import { i18n, currentLang, state, getHeadersWithCSRF, showView } from './core.js';

export function isEmbeddedBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const patterns = [
        /WebView/i, /\bwv\b/i, /WKWebView/i,
        /FB_IAB/i, /Instagram/i, /Line\//i, /KAKAOTALK/i
    ];
    return patterns.some(pattern => pattern.test(ua));
}

export function showWebViewWarning() {
    const modal = document.getElementById('webview-warning-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

export function closeWebViewWarning() {
    const modal = document.getElementById('webview-warning-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

export function copyCurrentURL() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        alert(i18n[currentLang]['url_copied'] || 'URL copied!');
    });
}

export function initWebViewCheck() {
    const urlParams = new URLSearchParams(window.location.search);
    if (isEmbeddedBrowser() || urlParams.get('oauth_error') === 'webview_blocked') {
        showWebViewWarning();
        const signInBtn = document.getElementById('google-signin-btn');
        if (signInBtn) {
            signInBtn.disabled = true;
            signInBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

async function getOAuthConfig() {
    const cached = sessionStorage.getItem('oauth_config');
    if (cached) {
        const { clientId, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 3600000) {
            return { clientId };
        }
    }

    const res = await fetch('/api/oauth/config');
    if (!res.ok) throw new Error('Failed to fetch OAuth config');
    const config = await res.json();

    sessionStorage.setItem('oauth_config', JSON.stringify({
        ...config,
        timestamp: Date.now()
    }));
    return config;
}

function showWebViewError() {
    const modal = document.getElementById('webview-error-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

export async function handleGoogleLogin() {
    const errorBox = document.getElementById('login-error-box');
    errorBox.classList.add('hidden');

    try {
        const stateResponse = await fetch('/api/oauth/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!stateResponse.ok) {
            if (stateResponse.status === 403) {
                const errorData = await stateResponse.json();
                if (errorData.error === 'webview_not_allowed') {
                    showWebViewError();
                    return;
                }
            }
            throw new Error('Failed to initialize OAuth');
        }

        const { state: oauthState, nonce, codeChallenge, codeChallengeMethod } = await stateResponse.json();

        const { clientId } = await getOAuthConfig();
        const redirectUri = window.location.origin + '/oauth/callback';
        const scope = 'openid email profile';

        const authParams = {
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scope,
            access_type: 'online',
            prompt: 'select_account',
            state: oauthState,
            nonce: nonce
        };

        if (codeChallenge) {
            authParams.code_challenge = codeChallenge;
            authParams.code_challenge_method = codeChallengeMethod || 'S256';
        }

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams(authParams);
        window.location.href = authUrl;
    } catch (error) {
        console.error('OAuth init error:', error);
        errorBox.innerText = i18n[currentLang]['error-login-failed'] || '登入初始化失敗，請重試';
        errorBox.classList.remove('hidden');
    }
}

export async function handleLogout() {
    try {
        await fetch('/api/user/logout', {
            method: 'POST',
            credentials: 'include',
            headers: getHeadersWithCSRF()
        });
    } catch (err) {
        console.error('Logout API call failed:', err);
    }

    sessionStorage.removeItem('csrfToken');

    state.isLoggedIn = false;
    state.authToken = null;
    state.currentUser = null;
    state.cards = [];

    sessionStorage.removeItem('auth_user');

    document.getElementById('app-header').classList.add('hidden');

    showView('login');
}
