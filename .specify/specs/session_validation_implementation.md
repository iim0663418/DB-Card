# Session Validation Before Protected APIs

## Implementation: Option A - Minimal Changes

### Changes Required

#### 1. Add validateSession() function
**Location**: `user-portal-init.js` (after apiCall function, ~line 740)

```javascript
/**
 * Validate session before calling protected APIs
 * Uses checkConsentStatus as lightweight validator
 * @returns {Promise<boolean>} - true if session valid
 */
async function validateSession() {
    try {
        // checkConsentStatus is a protected API that validates session
        // If it succeeds, session is valid
        // If it returns 401, apiCall will handle cleanup
        await apiCall('/api/consent/check', { method: 'GET' });
        return true;
    } catch (error) {
        // 401 already handled by apiCall (clears session, redirects)
        // Other errors: treat as invalid session
        console.error('Session validation failed:', error);
        return false;
    }
}
```

#### 2. Update OAuth Callback Flow
**Location**: `user-portal-init.js` line ~2488

**Before**:
```javascript
// Check consent status (blocking if needed)
const consentOk = await checkConsentStatus();
```

**After**:
```javascript
// Validate session first
const sessionValid = await validateSession();
if (!sessionValid) {
    // Session invalid - cleanup already done by apiCall
    document.getElementById('global-loading').classList.add('hidden');
    return;
}

// Session valid - check consent status
const consentOk = await checkConsentStatus();
```

#### 3. Update Session Restore Flow
**Location**: `user-portal-init.js` line ~2553

**Before**:
```javascript
try {
    // Check consent status first
    const consentOk = await checkConsentStatus();
```

**After**:
```javascript
try {
    // Validate session first
    const sessionValid = await validateSession();
    if (!sessionValid) {
        // Session invalid - cleanup already done by apiCall
        document.getElementById('global-loading').classList.add('hidden');
        return;
    }
    
    // Session valid - check consent status
    const consentOk = await checkConsentStatus();
```

## BDD Specifications

### Scenario 1: Session Restore with Valid Session
**Given**: User has auth_user in sessionStorage AND valid cookie  
**When**: Page loads  
**Then**: 
- validateSession() returns true
- checkConsentStatus() is called
- fetchUserCards() is called
- User sees selection view

### Scenario 2: Session Restore with Expired Session
**Given**: User has auth_user in sessionStorage BUT expired cookie  
**When**: Page loads  
**Then**:
- validateSession() returns false (401 handled by apiCall)
- checkConsentStatus() is NOT called
- fetchUserCards() is NOT called
- User sees login view
- No 401 errors visible to user

### Scenario 3: OAuth Callback with Valid Session
**Given**: OAuth callback completes successfully  
**When**: User info retrieved  
**Then**:
- validateSession() returns true
- checkConsentStatus() is called
- fetchUserCards() is called
- User sees selection view

### Scenario 4: OAuth Callback with Failed Session
**Given**: OAuth callback completes BUT session cookie not set  
**When**: User info retrieved  
**Then**:
- validateSession() returns false
- checkConsentStatus() is NOT called
- User sees login view with error

## Implementation Notes

### Why This Works
1. **Minimal Changes**: Only 3 small additions
2. **Reuses Existing Logic**: validateSession() uses existing apiCall + checkConsentStatus endpoint
3. **No Backend Changes**: Uses existing protected API as validator
4. **Error Handling Preserved**: apiCall's 401 handler still works
5. **Clean UX**: No 401 flashes, clean redirect

### Why Not Create New Endpoint
- `/api/consent/check` is already lightweight (just checks DB)
- Creating `/api/auth/validate-session` would be redundant
- Minimal changes = lower risk

### Error Flow
```
validateSession() 
  → apiCall('/api/consent/check')
    → 401 response
      → apiCall's error handler
        → Clear sessionStorage
        → Redirect to login
        → Return false
```

## Testing Plan

1. **Test expired session**:
   - Login → manually delete cookie → refresh
   - Expected: Clean redirect, no 401 in console

2. **Test valid session**:
   - Login → refresh immediately
   - Expected: Auto-login success, no errors

3. **Test OAuth callback**:
   - Complete OAuth flow
   - Expected: Successful login, no 401

4. **Test concurrent initialization**:
   - Multiple tabs with expired session
   - Expected: All redirect cleanly

## Acceptance Criteria

- ✅ validateSession() called before checkConsentStatus()
- ✅ validateSession() called before fetchUserCards()
- ✅ No 401 errors during normal initialization
- ✅ Clean redirect when session expired
- ✅ No duplicate error toasts
- ✅ OAuth callback validates session before proceeding

## Files to Modify

- `workers/public/js/user-portal-init.js` (3 changes)
  1. Add validateSession() function (~line 740)
  2. Update OAuth callback flow (~line 2488)
  3. Update session restore flow (~line 2553)
