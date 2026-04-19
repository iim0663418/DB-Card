# BDD Spec: Session Expired Circuit Breaker

## Goal
When a user's auth token expires, the frontend should detect the first 401 response, immediately suppress all further API calls, show ONE clear user-facing message, and transition to the login view — instead of the current behavior where multiple concurrent 401s each trigger independent cleanup, toasts, and redirects.

## Behavioral Unit
**Session Expired Circuit Breaker** — a global flag that short-circuits all API paths on first 401.

## Problem Context
Two independent API call paths exist:
1. `apiCall()` in user-portal-init.js (internal fetch wrapper)
2. `APIClient.fetch()` → `ErrorPolicy.handle()` in api-client.js / error-policy.js (feature layer)

Both handle 401 independently. Image loads via `<img src="/api/user/received-cards/.../thumbnail">` bypass both entirely. When token expires, concurrent requests create a 401 storm: multiple toasts, duplicate sessionStorage clears, and ErrorPolicy redirects to the same page causing reload loops.

Production logs show: consent/check + multiple received-cards/image requests all hitting 401 within seconds.

## Impacted Modules
- `workers/public/js/error-policy.js` — 401 handler
- `workers/public/js/api-client.js` — fetch wrapper
- `workers/public/js/user-portal-init.js` — internal apiCall() 401 handler

## Scenarios

### Scenario 1: First 401 triggers circuit breaker
```gherkin
Given a user is logged in on user-portal
When any API call returns HTTP 401
Then a global session-expired flag is set (window.__sessionExpired = true)
And sessionStorage is cleared (auth_user, csrfToken)
And ONE toast is shown: "登入已過期，請重新登入" (info type, 3s)
And the view transitions to login (showView('login'))
And no page redirect/reload occurs
```

### Scenario 2: Subsequent 401s are suppressed
```gherkin
Given the session-expired flag is already set
When another API call would be made (apiCall or APIClient.fetch)
Then the call short-circuits immediately without making a network request
And no additional toast or redirect is triggered
And the caller receives a structured 401 error (for proper error propagation)
```

### Scenario 3: ErrorPolicy 401 respects circuit breaker
```gherkin
Given the session-expired flag is already set
When ErrorPolicy.handle() is called with status 401
Then it returns { action: 'none' } without clearing sessionStorage again or redirecting
```

### Scenario 4: Login resets circuit breaker
```gherkin
Given the session-expired flag is set
When the user successfully logs in again
Then the flag is reset to false
And API calls proceed normally
```

## Implementation Constraints

1. **Shared flag**: Use `window.__sessionExpired` (boolean) — accessible from all JS modules without import.

2. **api-client.js changes**: At the TOP of `APIClient.fetch()`, check `window.__sessionExpired`. If true, return immediately:
   ```js
   if (window.__sessionExpired) {
     return { ok: false, status: 401, error: { code: 'SESSION_EXPIRED', message: '登入已過期', retryable: false } };
   }
   ```

3. **error-policy.js changes**: In the 401 handler, check `window.__sessionExpired`:
   - If already set → return `{ action: 'none' }` (no-op)
   - If not set → set `window.__sessionExpired = true`, then return existing redirect action BUT change the action to 'none' for user-portal context (let apiCall handle the view transition instead of page redirect)

4. **user-portal-init.js changes**: In `apiCall()` 401 handler:
   - Check `window.__sessionExpired` first — if already set, just throw without re-doing cleanup
   - If not set → set `window.__sessionExpired = true`, do cleanup, show toast ONCE, showView('login')
   - At the TOP of `apiCall()`: if `window.__sessionExpired`, throw immediately without fetch

5. **Login success path**: After successful Google OAuth callback, set `window.__sessionExpired = false`.

6. **FeatureAPI.executeAction**: Handle `action: 'none'` case — return false (no retry).

7. **Do NOT change**: Image onerror handlers (already gracefully degrade to SVG icons), api-retry.js (separate concern), backend code.

## Validation Target
- After token expiry, only ONE toast appears regardless of how many concurrent API calls are in flight
- No page reload/redirect loop
- Backend logs show at most 1-2 401s (the ones already in flight), not a continuous stream
- Login view is shown cleanly
- After re-login, all functionality works normally

## Expected Outcome
Users see a clean "session expired, please re-login" message once, land on the login screen, and can log back in. No confusion about system being broken.
