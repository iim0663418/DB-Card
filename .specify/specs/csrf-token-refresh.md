# BDD Spec: CSRF Token Auto-Refresh

## Problem
CSRF token expires after 1 hour, causing 403 errors on user actions.

## Solution
When receiving "Invalid CSRF token" error:
1. Attempt to refresh CSRF token via GET /api/user/cards (safe endpoint)
2. Extract new CSRF token from response header
3. Retry the original request

## Implementation
**File**: `workers/public/js/user-portal-init.js`

**Location**: confirmRevokeCard error handling (line ~1320)

**Logic**:
```javascript
if (response.status === 403 && data.error === 'csrf_token_invalid') {
    // Refresh CSRF token by calling a safe endpoint
    await fetchUserCards(); // This will refresh the token
    // Retry the revoke request
    return confirmRevokeCard();
}
```

## Alternative (Simpler)
Show user-friendly message: "Session expired, please refresh the page"
