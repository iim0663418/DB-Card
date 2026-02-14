# BDD Spec: OAuth WebView Protection (Enhanced)
**Priority**: P0 (Blocking Google App Verification)
**Estimated Time**: 45 minutes (增加 OAuth error handling)

## Scenario 1: Detect Embedded User-Agent (Frontend)
- **Given**: User accesses user-portal.html from an embedded browser
- **When**: Page loads and checks navigator.userAgent
- **Then**: 
  * Detect WebView patterns (WebView, wv, WKWebView, FB_IAB, Instagram, Line, KAKAOTALK)
  * Display warning modal with instructions to open in system browser
  * Disable Google Sign-In button

## Scenario 2: Handle OAuth Error Response (Backend)
- **Given**: Google OAuth returns error=disallowed_useragent in callback
- **When**: GET /oauth/callback?error=disallowed_useragent&error_description=...
- **Then**: 
  * Detect error parameter
  * Redirect to user-portal.html?oauth_error=webview_blocked
  * Frontend displays same warning modal as Scenario 1

## Scenario 3: Allow System Browser
- **Given**: User accesses from Chrome/Safari/Firefox
- **When**: Page loads and checks navigator.userAgent
- **Then**: 
  * Pass WebView detection
  * Enable Google Sign-In button normally

## Technical Requirements

### 1. Frontend Detection (user-portal-init.js)
```javascript
function isEmbeddedBrowser() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const patterns = [
    /WebView/i, /\bwv\b/i, /WKWebView/i,
    /FB_IAB/i, /Instagram/i, /Line\//i, /KAKAOTALK/i
  ];
  return patterns.some(pattern => pattern.test(ua));
}

// On page load
if (isEmbeddedBrowser() || new URLSearchParams(location.search).get('oauth_error') === 'webview_blocked') {
  showWebViewWarning();
  disableGoogleSignIn();
}
```

### 2. Backend Error Handling (oauth.ts callback)
```typescript
// In handleOAuthCallback()
const error = url.searchParams.get('error');
if (error === 'disallowed_useragent') {
  return Response.redirect(
    `${origin}/user-portal.html?oauth_error=webview_blocked`,
    302
  );
}
```

### 3. Warning Modal (user-portal.html)
- Bilingual (zh-TW / en-US)
- Message: "此頁面不支援應用程式內建瀏覽器，請使用系統瀏覽器開啟"
- Copy URL button for convenience

## Acceptance Criteria
- [ ] Frontend UA detection works
- [ ] Backend catches disallowed_useragent error
- [ ] Warning modal displays in both scenarios
- [ ] Google Sign-In button disabled when WebView detected
- [ ] Normal flow works in Chrome/Safari/Firefox
- [ ] No console errors

## Files to Modify
- `workers/public/user-portal.html` (add warning modal)
- `workers/public/js/user-portal-init.js` (add detection + URL param check)
- `workers/src/handlers/oauth.ts` (add error handling in callback)
