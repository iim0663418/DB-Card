// Auth flow: WebView detection + OAuth functions
// Extracted from user-portal-init.js (Wave 3 refactor)
// Dependencies: window.i18n, window.currentLang, window.state,
//   window.getHeadersWithCSRF, window.showView (from self-card-ocr.js)

function isEmbeddedBrowser() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const patterns = [
    /WebView/i, /\bwv\b/i, /WKWebView/i,
    /FB_IAB/i, /Instagram/i, /Line\//i, /KAKAOTALK/i
  ];
  return patterns.some(pattern => pattern.test(ua));
}

function showWebViewWarning() {
  const modal = document.getElementById('webview-warning-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

// eslint-disable-next-line no-unused-vars -- Called from HTML onclick
function closeWebViewWarning() {
  const modal = document.getElementById('webview-warning-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// eslint-disable-next-line no-unused-vars -- Called from HTML onclick
function copyCurrentURL() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    alert(window.i18n[window.currentLang]['url_copied'] || 'URL copied!');
  });
}

// Check for WebView or OAuth error
const urlParams = new URLSearchParams(window.location.search);
if (isEmbeddedBrowser() || urlParams.get('oauth_error') === 'webview_blocked') {
  showWebViewWarning();
  // Disable Google Sign-In button
  const signInBtn = document.getElementById('google-signin-btn');
  if (signInBtn) {
    signInBtn.disabled = true;
    signInBtn.classList.add('opacity-50', 'cursor-not-allowed');
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

// eslint-disable-next-line no-unused-vars -- Called from HTML onclick
async function handleGoogleLogin() {
  const errorBox = document.getElementById('login-error-box');
  errorBox.classList.add('hidden');

  try {
    // BDD Scenario 1: Generate OAuth state and nonce (CSRF + Replay Protection)
    const stateResponse = await fetch('/api/oauth/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!stateResponse.ok) {
      // Check for WebView blocking (403)
      if (stateResponse.status === 403) {
        const errorData = await stateResponse.json();
        if (errorData.error === 'webview_not_allowed') {
          showWebViewError();
          return;
        }
      }
      throw new Error('Failed to initialize OAuth');
    }

    const { state, nonce, codeChallenge, codeChallengeMethod } = await stateResponse.json();

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
      state: state, // CSRF protection
      nonce: nonce  // Replay protection (Phase 2)
    };

    // Add PKCE parameters (RFC 7636)
    if (codeChallenge) {
      authParams.code_challenge = codeChallenge;
      authParams.code_challenge_method = codeChallengeMethod || 'S256';
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams(authParams);

    // Direct redirect (no popup)
    window.location.href = authUrl;
  } catch (error) {
    console.error('OAuth init error:', error);
    errorBox.innerText = window.i18n[window.currentLang]['error-login-failed'] || '登入初始化失敗，請重試';
    errorBox.classList.remove('hidden');
  }
}

function showWebViewError() {
  const modal = document.getElementById('webview-error-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

async function handleLogout() {
  try {
    // 呼叫後端清除 HttpOnly cookie
    await fetch('/api/user/logout', {
      method: 'POST',
      credentials: 'include',
      headers: window.getHeadersWithCSRF()
    });
  } catch (err) {
    console.error('Logout API call failed:', err);
    // Continue with frontend cleanup even if API call fails
  }

  // Clear CSRF token from sessionStorage
  sessionStorage.removeItem('csrfToken');

  window.state.isLoggedIn = false;
  window.state.authToken = null;
  window.state.currentUser = null;
  window.state.cards = [];

  // 清除使用者資訊
  sessionStorage.removeItem('auth_user');

  // 隱藏導航欄
  document.getElementById('app-header').classList.add('hidden');

  showView('login');
}
