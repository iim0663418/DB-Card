# localStorage to HttpOnly Cookies Migration - BDD Specification

## Feature: Migrate User Authentication from localStorage to HttpOnly Cookies
**Purpose**: Prevent XSS attacks from stealing user authentication tokens

---

## Priority: 🔴 CRITICAL

**Risk**: XSS attack → Token theft → Account takeover  
**Impact**: HIGH - User accounts vulnerable to XSS  
**Effort**: 2 hours  
**Files**: 2 files (backend + frontend)

---

## Current Implementation (Vulnerable)

### Frontend (user-portal.html)
```javascript
// ❌ Vulnerable: Token in localStorage
localStorage.setItem('auth_token', token);
localStorage.setItem('auth_user', JSON.stringify({ email, name, picture }));

// ❌ Vulnerable: Token sent in Authorization header
const token = localStorage.getItem('auth_token');
fetch('/api/user/cards', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Backend (oauth.ts)
```typescript
// ❌ Returns token to frontend
return jsonResponse({ 
  success: true, 
  token,  // Exposed to JavaScript
  user: { email, name, picture }
});
```

---

## Target Implementation (Secure)

### Backend (oauth.ts)
```typescript
// ✅ Set HttpOnly cookie
const response = new Response(
  JSON.stringify({ 
    success: true, 
    user: { email, name, picture }
    // No token in response body
  }),
  { headers: { 'Content-Type': 'application/json' } }
);

response.headers.set('Set-Cookie', 
  `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`
);

return response;
```

### Frontend (user-portal.html)
```javascript
// ✅ No localStorage usage
// Token automatically sent via cookie

// ✅ Use credentials: 'include'
fetch('/api/user/cards', {
  credentials: 'include'  // Sends HttpOnly cookie
});
```

---

## Scenario 1: OAuth Login Flow

- **Given**: User completes Google OAuth
- **When**: OAuth callback is processed
- **Then**:
  - Backend sets HttpOnly cookie with auth_token
  - Cookie has Secure, SameSite=Strict, Max-Age=86400
  - Response body does NOT contain token
  - Frontend receives user info only
  - No localStorage.setItem() called

---

## Scenario 2: API Request with Cookie

- **Given**: User has valid HttpOnly cookie
- **When**: Frontend makes API request
- **Then**:
  - Request includes credentials: 'include'
  - Browser automatically sends cookie
  - Backend validates cookie (existing middleware)
  - No Authorization header needed

---

## Scenario 3: Logout

- **Given**: User clicks logout
- **When**: Logout is processed
- **Then**:
  - Backend clears cookie (Max-Age=0)
  - Frontend redirects to login
  - No localStorage.removeItem() needed

---

## Scenario 4: XSS Attack Prevention

- **Given**: Malicious script injected via XSS
- **When**: Script tries to steal token
- **Then**:
  - localStorage.getItem('auth_token') returns null
  - document.cookie does NOT contain auth_token (HttpOnly)
  - Token cannot be stolen
  - Attack fails

---

## Implementation Requirements

### Backend Changes (workers/src/handlers/oauth.ts)

**File**: `workers/src/handlers/oauth.ts`

**Current Code** (approximate line numbers):
```typescript
// Line ~80-100: OAuth callback handler
return jsonResponse({
  success: true,
  token,  // ❌ Remove this
  user: { email, name, picture }
});
```

**Required Changes**:
```typescript
// 1. Create response with user info only
const responseData = {
  success: true,
  user: { email, name, picture }
  // No token
};

const response = new Response(
  JSON.stringify(responseData),
  { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  }
);

// 2. Set HttpOnly cookie
response.headers.set('Set-Cookie', 
  `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`
);

// 3. Add CORS headers (if needed)
response.headers.set('Access-Control-Allow-Credentials', 'true');

return response;
```

---

### Frontend Changes (workers/public/user-portal.html)

**File**: `workers/public/user-portal.html`

**Locations to Change**:

#### 1. OAuth Callback Handler (Line ~1000-1010)
```javascript
// ❌ Remove
localStorage.setItem('auth_token', token);
localStorage.setItem('auth_user', JSON.stringify({ email, name, picture }));
localStorage.setItem('auth_expires', Date.now() + 24 * 60 * 60 * 1000);

// ✅ Replace with
sessionStorage.setItem('auth_user', JSON.stringify({ email, name, picture }));
// No token storage needed
```

#### 2. All API Calls (Multiple locations)
```javascript
// ❌ Remove
const token = localStorage.getItem('auth_token');
headers: { 'Authorization': `Bearer ${token}` }

// ✅ Replace with
credentials: 'include'
// No Authorization header needed
```

**Affected Functions**:
- `loadCards()` - Line ~1100
- `loadCardDetail()` - Line ~1200
- `handleCreateCard()` - Line ~1300
- `handleUpdateCard()` - Line ~1400
- `handleRevokeCard()` - Line ~1500
- `handleRestoreCard()` - Line ~1600
- `loadRevocationHistory()` - Line ~1700

#### 3. Logout Handler (Line ~1050)
```javascript
// ❌ Remove
localStorage.removeItem('auth_token');
localStorage.removeItem('auth_user');
localStorage.removeItem('auth_expires');

// ✅ Replace with
sessionStorage.removeItem('auth_user');
// Cookie cleared by backend
```

#### 4. Auth Check (Line ~900)
```javascript
// ❌ Remove
const token = localStorage.getItem('auth_token');
if (!token) { /* redirect */ }

// ✅ Replace with
// Check if user info exists (cookie validated by backend)
const userInfo = sessionStorage.getItem('auth_user');
if (!userInfo) {
  // Try to validate session with backend
  fetch('/api/user/cards', { credentials: 'include' })
    .then(r => r.ok ? null : redirectToLogin())
    .catch(redirectToLogin);
}
```

---

## Backend Middleware (No Changes Needed)

**File**: `workers/src/middleware/auth.ts`

**Current Implementation** (already supports cookies):
```typescript
// Already checks both cookie and Authorization header
const token = request.headers.get('Cookie')?.match(/auth_token=([^;]+)/)?.[1]
  || request.headers.get('Authorization')?.replace('Bearer ', '');
```

**Status**: ✅ No changes needed (backward compatible)

---

## Testing Requirements

### Manual Testing

#### 1. OAuth Login Flow
- [ ] Complete Google OAuth
- [ ] Check browser DevTools → Application → Cookies
- [ ] Verify auth_token cookie exists
- [ ] Verify cookie has HttpOnly flag
- [ ] Verify cookie has Secure flag
- [ ] Verify cookie has SameSite=Strict
- [ ] Check localStorage → No auth_token

#### 2. API Requests
- [ ] Load user cards → Success
- [ ] Create new card → Success
- [ ] Update card → Success
- [ ] Revoke card → Success
- [ ] Check Network tab → Cookie sent automatically
- [ ] Check Network tab → No Authorization header

#### 3. Logout
- [ ] Click logout
- [ ] Check cookies → auth_token removed
- [ ] Try to access protected page → Redirected to login

#### 4. XSS Protection
- [ ] Open console
- [ ] Run: `localStorage.getItem('auth_token')` → null
- [ ] Run: `document.cookie` → Does NOT contain auth_token
- [ ] Verify token cannot be accessed by JavaScript

### Security Testing

- [ ] Attempt XSS attack → Token not accessible
- [ ] Check cookie flags in DevTools
- [ ] Verify SameSite prevents CSRF
- [ ] Test cross-origin requests blocked

---

## Rollback Plan

If issues occur:

1. **Immediate Rollback**:
```bash
git revert HEAD
git push origin develop
```

2. **Partial Rollback** (Backend only):
- Revert backend to return token in response
- Keep frontend changes (backward compatible)

3. **Gradual Migration**:
- Support both localStorage and cookies temporarily
- Migrate users gradually

---

## Acceptance Criteria

- ✅ Backend sets HttpOnly cookie on OAuth success
- ✅ Frontend does NOT store token in localStorage
- ✅ All API calls use credentials: 'include'
- ✅ Cookies have correct flags (HttpOnly, Secure, SameSite)
- ✅ XSS cannot access token
- ✅ Logout clears cookie
- ✅ All functionality works as before
- ✅ No breaking changes for existing users

---

## Security Benefits

**Before**:
- ❌ Token in localStorage (XSS vulnerable)
- ❌ Token accessible to JavaScript
- ❌ Token can be stolen via XSS

**After**:
- ✅ Token in HttpOnly cookie (XSS protected)
- ✅ Token NOT accessible to JavaScript
- ✅ Token cannot be stolen via XSS
- ✅ SameSite=Strict prevents CSRF

---

## References

- [OWASP: HttpOnly Cookie](https://owasp.org/www-community/HttpOnly)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [OWASP Top 10 A07: Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)
