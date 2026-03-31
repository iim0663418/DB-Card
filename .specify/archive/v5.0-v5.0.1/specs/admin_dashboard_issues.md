# Admin Dashboard Issues - Analysis Complete

## Problem 1: CSP Blocks Unsplash Images ✅ CONFIRMED

### Root Cause
**File**: `workers/public/admin-dashboard.html` line 618
```html
<img id="prev-avatar" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2">
```

**CSP**: `workers/src/index.ts` line 67 - does NOT include `images.unsplash.com`

### Solution: Replace with Google Avatar (Already in CSP)
```html
<img id="prev-avatar" src="https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png">
```

**Why this works**:
- `https://www.gstatic.com` already in CSP
- No external dependency added
- Google's official placeholder
- Better privacy & reliability

---

## Problem 2: /api/admin/cards Returns 401 ✅ NOT A BUG

### Analysis

**This is EXPECTED BEHAVIOR**:
```javascript
// admin-dashboard.js line 343
async function checkAuthStatus() {
    const resp = await fetch(`${API_BASE}/api/admin/cards`, {
        credentials: 'include'
    });

    if (resp.ok) {
        // Already logged in → show admin UI
        isVerified = true;
        // ...
    } else {
        // Not logged in → show login form (THIS IS CORRECT)
    }
}
```

**Purpose of checkAuthStatus()**:
1. Check if admin cookie exists and is valid
2. If yes → show admin UI
3. If no → show login form

**401 is the correct response when not logged in!**

### Authentication Flow (Verified Correct)

1. **Admin Login** (`/api/admin/login`):
   - Validates SETUP_TOKEN
   - Creates session in KV: `setup_token_session:{uuid}`
   - Sets HttpOnly cookie: `admin_token={uuid}`
   - Returns CSRF token

2. **Admin API Requests** (`/api/admin/cards`):
   - Reads `admin_token` cookie
   - Looks up session in KV
   - If valid → 200 OK
   - If invalid/missing → 401 Unauthorized

3. **verifySetupToken()** checks (in order):
   - ✅ Passkey session: `passkey_session:{token}`
   - ✅ SETUP_TOKEN session: `setup_token_session:{token}`
   - ✅ JWT token (OAuth user)
   - ✅ Direct SETUP_TOKEN match (backward compat)
   - ✅ Authorization header (backward compat)

### Conclusion

**No bug found**:
- ✅ `credentials: 'include'` is present
- ✅ Cookie authentication is implemented correctly
- ✅ 401 response is expected when not logged in
- ✅ checkAuthStatus() handles 401 correctly (shows login form)

**The 401 error you see is normal** - it's how the system checks if you're logged in!

---

## BDD Specifications

### Scenario 1: Admin Not Logged In (Current Behavior - Correct)
**Given**: Admin opens dashboard without logging in  
**When**: checkAuthStatus() calls /api/admin/cards  
**Then**: 
- Should return 401 Unauthorized
- Should show login form
- This is EXPECTED behavior

### Scenario 2: Admin Logged In
**Given**: Admin has valid admin_token cookie  
**When**: checkAuthStatus() calls /api/admin/cards  
**Then**:
- Should return 200 OK with card list
- Should show admin UI
- Should hide login form

### Scenario 3: Admin Session Expired
**Given**: Admin was logged in but cookie expired  
**When**: checkAuthStatus() calls /api/admin/cards  
**Then**:
- Should return 401 Unauthorized
- Should show login form
- User needs to re-login

---

## Implementation Required

### Only Fix: Replace Unsplash Image

**File**: `workers/public/admin-dashboard.html` line 618

**Before**:
```html
<img id="prev-avatar" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80" class="w-28 h-28 rounded-[2rem] object-cover shadow-lg border-2 border-slate-50">
```

**After**:
```html
<img id="prev-avatar" src="https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png" class="w-28 h-28 rounded-[2rem] object-cover shadow-lg border-2 border-slate-50">
```

---

## Testing Plan

### CSP Fix Testing
1. Open admin dashboard
2. Check browser console - no CSP violations
3. Verify avatar placeholder loads correctly
4. No external requests to unsplash.com

### Admin Auth Testing (Verify Current Behavior)
1. Open admin dashboard (not logged in)
2. Should see 401 in Network tab (EXPECTED)
3. Should see login form (CORRECT)
4. Enter valid SETUP_TOKEN
5. Should login successfully
6. Should see admin UI
7. Refresh page
8. Should stay logged in (cookie persists)

---

## Summary

**Issue 1 (CSP)**: ✅ Real issue - needs fix  
**Issue 2 (401)**: ❌ Not a bug - working as designed

**Files to Modify**: 1 file, 1 line
- `workers/public/admin-dashboard.html` line 618

**No backend changes needed** - authentication is working correctly!


### Current Behavior
- Admin dashboard uses Unsplash image: `https://images.unsplash.com/photo-1544005313-94ddf0286df2`
- CSP `img-src` directive does not include `images.unsplash.com`
- Browser blocks the image with CSP violation

### Root Cause
**File**: `workers/public/admin-dashboard.html` line 618
```html
<img id="prev-avatar" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80">
```

**CSP Policy**: `workers/src/index.ts` line 67
```typescript
"img-src 'self' data: https://cdn.jsdelivr.net ... https://*.googleusercontent.com https://*.r2.cloudflarestorage.com ..."
```

### Solution Options

#### Option A: Use Local Placeholder (Recommended)
- Replace with data URI or local asset
- No external dependency
- Better privacy & reliability
- No CSP changes needed

#### Option B: Add Unsplash to CSP
- Add `https://images.unsplash.com` to img-src
- Keeps external dependency
- Privacy concern (Unsplash tracking)
- Availability risk

### Recommended: Option A

**Replace with data URI placeholder**:
```html
<img id="prev-avatar" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23e2e8f0' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%2394a3b8'%3E預覽圖片%3C/text%3E%3C/svg%3E">
```

Or use Google user avatar (already in CSP):
```html
<img id="prev-avatar" src="https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png">
```

---

## Problem 2: /api/admin/cards Returns 401

### Current Behavior
- `checkAuthStatus()` calls `/api/admin/cards` on page load
- Returns 401 Unauthorized
- Admin dashboard shows login form

### Root Cause Analysis

**Admin API Authentication** (`workers/src/handlers/admin/cards.ts` line 670-685):
```typescript
export async function handleListCards(request: Request, env: Env): Promise<Response> {
  // Verify authorization
  const isAuthorized = await verifySetupToken(request, env);

  if (!isAuthorized) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return adminErrorResponse('Authentication required', 401, request);
    } else {
      return adminErrorResponse('Invalid token', 403, request);
    }
  }
  // ...
}
```

**Admin uses SETUP_TOKEN, not OAuth cookies**:
- Admin APIs require `Authorization: Bearer <SETUP_TOKEN>` header
- User portal uses HttpOnly cookies (OAuth)
- These are **different authentication systems**

### Diagnosis

**Check 1: Is request sending Authorization header?**
```javascript
// admin-dashboard.js line 344
const resp = await fetch(`${API_BASE}/api/admin/cards`, {
    credentials: 'include'  // ✅ Correct
});
```

**Issue**: No `Authorization` header is being sent!

**Check 2: Where is SETUP_TOKEN stored?**
```javascript
// admin-dashboard.js - need to find where token is stored after login
```

Let me check the admin login flow...

### Expected Flow

1. Admin enters SETUP_TOKEN
2. Token is validated
3. Token is stored (localStorage/sessionStorage)
4. All subsequent requests include `Authorization: Bearer <token>` header

### BDD Specifications

#### Scenario 1: Admin Login with Valid Token
**Given**: Admin has valid SETUP_TOKEN  
**When**: Admin enters token and clicks login  
**Then**: 
- Token should be validated against env.SETUP_TOKEN
- Token should be stored in sessionStorage
- All API requests should include Authorization header
- Dashboard should show admin UI

#### Scenario 2: Admin API Request with Token
**Given**: Admin is logged in (token in sessionStorage)  
**When**: Making API request to /api/admin/cards  
**Then**:
- Request should include `Authorization: Bearer <token>` header
- Request should include `credentials: 'include'`
- Should return 200 OK with card list

#### Scenario 3: Admin API Request without Token
**Given**: No token in sessionStorage  
**When**: Making API request to /api/admin/cards  
**Then**:
- Should return 401 Unauthorized
- Should show login form

#### Scenario 4: Admin Session Persistence
**Given**: Admin logged in successfully  
**When**: Page refreshes  
**Then**:
- Should restore token from sessionStorage
- Should validate token with backend
- Should show admin UI if token valid
- Should show login form if token invalid

### Implementation Required

1. **Find admin login handler** - where token is stored
2. **Add Authorization header** - to all admin API calls
3. **Add token validation** - on page load (checkAuthStatus)

### Files to Check

- `workers/public/js/admin-dashboard.js` - login handler, API calls
- `workers/src/handlers/admin/cards.ts` - authentication logic
- `workers/src/middleware/auth.ts` - verifySetupToken implementation

---

## Testing Plan

### CSP Fix Testing
1. Open admin dashboard
2. Check browser console for CSP violations
3. Verify avatar image loads correctly
4. No external requests to unsplash.com

### Admin Auth Testing
1. Open admin dashboard (not logged in)
2. Should see login form
3. Enter valid SETUP_TOKEN
4. Should see admin UI
5. Refresh page
6. Should stay logged in (token persisted)
7. Check Network tab: all /api/admin/* requests have Authorization header

---

## Priority

1. **P0**: Fix admin authentication (blocking admin functionality)
2. **P1**: Fix CSP image (cosmetic, but security warning)

## Next Steps

1. Examine admin login handler code
2. Identify where SETUP_TOKEN is stored
3. Add Authorization header to all admin API calls
4. Replace Unsplash image with local placeholder
