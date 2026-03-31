# 401 Authentication Error Diagnosis & Fix

## Problem Analysis

### Current Behavior
- User sees 401 errors when accessing protected APIs
- Possible causes:
  1. Requests missing authentication credentials
  2. Initialization order issue (API called before auth ready)
  3. Session expired but not properly handled
  4. Cross-domain cookie issues

### Code Review Findings

#### ✅ Good: API Client Layer
- `APIClient.fetch()` correctly uses `credentials: 'include'` (line 55)
- All fetch calls include cookies automatically
- CSRF token properly attached from sessionStorage

#### ✅ Good: Error Policy
- `ErrorPolicy.handle()` properly handles 401 (lines 35-41)
- Clears sessionStorage on 401
- Redirects to login page with message

#### ✅ Good: Legacy apiCall
- `user-portal-init.js:apiCall()` uses `credentials: 'include'` (line 702)
- Has 401 handler that clears session (lines 708-716)

#### ⚠️ Issue: Initialization Order
- `checkConsentStatus()` called immediately after OAuth callback (line 2488)
- `checkConsentStatus()` called immediately on session restore (line 2553)
- Both happen BEFORE verifying the session is actually valid
- If cookie expired, these calls will get 401

## Root Cause

**Initialization Race Condition**:
1. User has `auth_user` in sessionStorage (from previous session)
2. Page loads → restores state from sessionStorage
3. Immediately calls `checkConsentStatus()` → 401 (cookie expired)
4. Then calls `fetchUserCards()` → 401 (cookie expired)
5. Error handler clears session and redirects to login

**Why it happens**:
- sessionStorage persists longer than HttpOnly cookies
- No validation that the cookie is still valid before calling protected APIs

## BDD Specifications

### Scenario 1: Session Validation Before Protected APIs
**Given**: User has `auth_user` in sessionStorage  
**When**: Page initializes  
**Then**: 
- Should validate session with a lightweight API call first
- Should NOT call `checkConsentStatus()` until session validated
- Should NOT call `fetchUserCards()` until session validated
- If validation fails (401), should clear session and show login

**Implementation**: Add `/api/user/validate-session` endpoint or use existing `/api/consent/check` as validator

### Scenario 2: OAuth Callback Session Validation
**Given**: User completes OAuth callback  
**When**: Retrieving user info  
**Then**:
- Should verify the session cookie is set
- Should handle case where cookie setting failed
- Should NOT proceed to protected APIs if cookie missing

### Scenario 3: Graceful 401 Recovery
**Given**: Protected API returns 401  
**When**: Error is caught  
**Then**:
- Should clear sessionStorage (auth_user, csrfToken)
- Should clear any in-memory state
- Should show "登入已過期" message
- Should redirect to login page
- Should NOT show multiple error toasts

### Scenario 4: Prevent Initialization Loop
**Given**: Session is invalid (401)  
**When**: Error handler redirects to login  
**Then**:
- Should NOT trigger another protected API call
- Should NOT enter infinite redirect loop
- Should cleanly reset to login state

## Proposed Solution

### Option A: Add Session Validation Step (Recommended)
```javascript
// In user-portal-init.js initialization
if (userJson) {
  try {
    const user = JSON.parse(userJson);
    state.isLoggedIn = true;
    state.currentUser = user;
    updateUserDisplay(user.email, user.name, user.picture);
    
    document.getElementById('global-loading').classList.remove('hidden');
    
    try {
      // NEW: Validate session first with lightweight call
      await validateSession();
      
      // Only proceed if session is valid
      const consentOk = await checkConsentStatus();
      if (!consentOk) {
        document.getElementById('global-loading').classList.add('hidden');
        return;
      }
      
      await fetchUserCards();
      
      if (state.isLoggedIn) {
        showToast('自動登入成功');
        showView('selection');
      }
    } catch (err) {
      // Session invalid - silent logout
      console.error('Session validation failed:', err);
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
}
```

### Option B: Use checkConsentStatus as Validator
- `checkConsentStatus()` already calls a protected API
- If it returns 401, the error handler will clear session
- Current implementation already handles this correctly
- **Issue**: Error message might be confusing ("Failed to check consent")

### Option C: Add Retry Logic with Exponential Backoff
- Not recommended: 401 means session expired, retrying won't help
- Would waste API calls and delay user feedback

## Recommended Implementation

**Use Option A** with these changes:

1. **Add validateSession() function**:
```javascript
async function validateSession() {
  // Use existing checkConsentStatus as validator
  // It's a lightweight GET request
  return await checkConsentStatus();
}
```

2. **Update initialization order**:
- OAuth callback: user info → validate → consent → cards
- Session restore: restore → validate → consent → cards

3. **Improve error messages**:
- 401 during validation: "登入已過期，請重新登入" (current)
- 401 during consent check: Same message (already handled)
- 401 during card fetch: Same message (already handled)

## Testing Plan

1. **Test expired session**:
   - Login → wait for cookie to expire → refresh page
   - Expected: Clean redirect to login, no 401 errors in console

2. **Test OAuth callback**:
   - Complete OAuth flow → verify session cookie set
   - Expected: Successful login, no 401 errors

3. **Test concurrent requests**:
   - Login → trigger multiple API calls quickly
   - Expected: All requests include valid cookie

4. **Test cross-domain** (if applicable):
   - Access from different subdomain
   - Expected: Cookies properly sent with SameSite=Lax

## Acceptance Criteria

- ✅ No 401 errors during normal initialization
- ✅ Clean error message when session expires
- ✅ No infinite redirect loops
- ✅ No duplicate error toasts
- ✅ Session validation happens before protected APIs
- ✅ OAuth callback properly validates session before proceeding

## Notes

**Current implementation is mostly correct**:
- API calls include credentials ✅
- 401 error handling exists ✅
- Session clearing works ✅

**Main issue is timing**:
- Protected APIs called before validating session is still valid
- sessionStorage persists longer than HttpOnly cookies
- Need validation step before proceeding with initialization

**No code changes needed if**:
- Current error handling is acceptable
- Users don't mind seeing brief 401 errors before redirect
- Error messages are clear enough

**Code changes recommended if**:
- Want cleaner UX (no error flashes)
- Want explicit session validation
- Want better error messages
