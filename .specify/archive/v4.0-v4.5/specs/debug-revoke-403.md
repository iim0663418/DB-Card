# Debug Spec: Why User Cannot Revoke Own Card

## Problem
User receives 403 when trying to revoke card UUID: c2e3cf65-6d0f-4a0a-8d12-cc425213b91b

## Root Cause Analysis
Backend query fails: `WHERE uuid = ? AND bound_email = ?`

Possible reasons:
1. OAuth email doesn't match bound_email in database
2. Email case sensitivity issue (e.g., "User@example.com" vs "user@example.com")
3. UUID doesn't exist in uuid_bindings table
4. Card was created by admin, not bound to user

## Debug Requirements
Add console.log in handleUserRevokeCard (line ~655):
```javascript
console.log('[DEBUG] Revoke attempt:', {
  uuid,
  oauth_email: email,
  binding_found: !!binding,
  binding_email: binding?.bound_email || 'N/A'
});
```

This will help identify the mismatch.
