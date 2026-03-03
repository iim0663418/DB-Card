# BDD Spec: WebView OAuth Detection and Blocking

## Background
Google OAuth 2.0 政策禁止在 WebView 中執行 OAuth 流程。
參考: https://developers.google.com/identity/protocols/oauth2/policies#browsers

## Scenario 1: Detect LINE In-App Browser
- **Given**: User opens the app in LINE's in-app browser
- **When**: User attempts to login with Google OAuth
- **Then**: System detects WebView and returns error
- **And**: Error message provides instructions to open in system browser

## Scenario 2: Detect Facebook In-App Browser
- **Given**: User opens the app in Facebook's in-app browser
- **When**: User attempts to login with Google OAuth
- **Then**: System detects WebView and returns error

## Scenario 3: Allow System Browser (Safari/Chrome)
- **Given**: User opens the app in Safari or Chrome
- **When**: User attempts to login with Google OAuth
- **Then**: OAuth flow proceeds normally

## Technical Requirements

### WebView Detection Patterns
```javascript
const WEBVIEW_PATTERNS = [
  /Line\//i,           // LINE
  /FBAN|FBAV/i,        // Facebook
  /Instagram/i,        // Instagram
  /Twitter/i,          // Twitter
  /MicroMessenger/i,   // WeChat
  /\bwv\)/i,           // Generic WebView
  /; wv\)/i            // Android WebView
];
```

### Backend Implementation
**File**: `workers/src/handlers/oauth-init.ts`

Add WebView detection before generating OAuth state:

```typescript
function isWebView(userAgent: string): boolean {
  const patterns = [
    /Line\//i,
    /FBAN|FBAV/i,
    /Instagram/i,
    /Twitter/i,
    /MicroMessenger/i,
    /\bwv\)/i,
    /; wv\)/i
  ];
  return patterns.some(pattern => pattern.test(userAgent));
}

// In handleOAuthInit():
const userAgent = request.headers.get('User-Agent') || '';
if (isWebView(userAgent)) {
  return errorResponse(
    'webview_not_supported',
    'Google OAuth is not supported in in-app browsers. Please open in Safari, Chrome, or your default browser.',
    403,
    request
  );
}
```

### Frontend Implementation
**File**: `workers/public/js/user-portal-init.js`

Handle webview_not_supported error and show modal:

```javascript
// In handleGoogleLogin():
if (data.error === 'webview_not_supported') {
  showWebViewError(data.message);
  return;
}

function showWebViewError(message) {
  // Show modal with instructions
  const modal = document.getElementById('webview-error-modal');
  const messageEl = document.getElementById('webview-error-message');
  messageEl.textContent = message;
  modal.classList.remove('hidden');
}
```

### HTML Modal
**File**: `workers/public/user-portal.html`

Add error modal:

```html
<!-- WebView Error Modal -->
<div id="webview-error-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-white rounded-lg p-6 max-w-md mx-4">
    <h3 class="text-lg font-bold mb-4">無法使用應用程式內建瀏覽器登入</h3>
    <p id="webview-error-message" class="mb-4"></p>
    <p class="text-sm text-gray-600 mb-4">
      請點擊右上角選單，選擇「在瀏覽器中開啟」或「在 Safari 中開啟」
    </p>
    <button onclick="document.getElementById('webview-error-modal').classList.add('hidden')" 
            class="w-full bg-blue-500 text-white py-2 rounded">
      我知道了
    </button>
  </div>
</div>
```

## Acceptance Criteria
1. ✅ LINE in-app browser returns 403 error
2. ✅ Facebook in-app browser returns 403 error
3. ✅ Safari/Chrome works normally
4. ✅ Error message is user-friendly
5. ✅ Frontend shows modal with instructions

## Files to Modify
1. `workers/src/handlers/oauth-init.ts` - Add isWebView() detection
2. `workers/public/js/user-portal-init.js` - Handle error and show modal
3. `workers/public/user-portal.html` - Add error modal HTML
