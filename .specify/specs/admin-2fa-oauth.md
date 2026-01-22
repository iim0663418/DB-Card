# Admin Two-Factor Authentication (2FA) with Google OAuth

## Feature
As a system administrator  
I want to use two-factor authentication (Google OAuth first, then SETUP_TOKEN)  
So that admin access is more secure and user-friendly

## Background
New admin authentication flow:
1. **First factor**: Google OAuth (verify identity and whitelist)
2. **Second factor**: SETUP_TOKEN (verify authorization)

This order is more intuitive and filters out non-whitelisted users early.

Admin whitelist is managed via `admin_users` table:
- `username` field stores email addresses
- `role` field defines permissions (admin/viewer)
- `is_active` field enables/disables access
- `oauth_provider` field indicates OAuth method

## Security Requirements
- Two-factor authentication required for all admin operations
- JWT includes `verified` flag to track authentication state
- HttpOnly cookies to prevent XSS
- SETUP_TOKEN never appears in URLs
- Email whitelist controlled by admin_users table

---

## Scenario 1: Google OAuth login (first factor)
**Given** admin clicks "Login with Google"  
**When** GET /api/admin/oauth/google is called  
**Then** redirect to Google OAuth  
**And** include redirect_uri for callback

## Scenario 2: OAuth callback with whitelisted email
**Given** admin completed Google OAuth  
**And** email exists in admin_users table  
**And** is_active = 1  
**When** GET /api/admin/oauth/callback?code=xxx  
**Then** exchange code for user info  
**And** query admin_users WHERE username = email AND is_active = 1  
**And** generate JWT with verified: false  
**And** set HttpOnly cookie  
**And** update last_login_at  
**And** return postMessage with { type: 'oauth_success', needsToken: true }

## Scenario 3: OAuth callback with non-whitelisted email
**Given** admin completed Google OAuth  
**And** email does NOT exist in admin_users table  
**When** GET /api/admin/oauth/callback?code=xxx  
**Then** return postMessage with { type: 'oauth_error', error: 'unauthorized' }  
**And** do not set cookie

## Scenario 4: OAuth callback with inactive admin
**Given** admin completed Google OAuth  
**And** email exists in admin_users table  
**And** is_active = 0  
**When** GET /api/admin/oauth/callback?code=xxx  
**Then** return postMessage with { type: 'oauth_error', error: 'account_disabled' }  
**And** do not set cookie

## Scenario 5: Verify SETUP_TOKEN (second factor)
**Given** admin completed OAuth (verified: false)  
**And** admin has valid cookie  
**When** POST /api/admin/auth/verify with { "token": "valid-token" }  
**Then** verify cookie exists and verified === false  
**And** verify token === env.SETUP_TOKEN  
**And** generate new JWT with verified: true  
**And** update HttpOnly cookie  
**And** return { "success": true }

## Scenario 6: Verify with invalid SETUP_TOKEN
**Given** admin completed OAuth (verified: false)  
**When** POST /api/admin/auth/verify with { "token": "wrong-token" }  
**Then** return 401 with { "error": "Invalid token" }  
**And** do not update cookie

## Scenario 7: Verify without OAuth first
**Given** admin has no cookie  
**When** POST /api/admin/auth/verify with { "token": "valid-token" }  
**Then** return 401 with { "error": "OAuth required first" }

## Scenario 8: Verify when already verified
**Given** admin has cookie with verified: true  
**When** POST /api/admin/auth/verify with { "token": "valid-token" }  
**Then** return 400 with { "error": "Already verified" }

## Scenario 9: Access admin API without second factor
**Given** admin has cookie with verified: false  
**When** admin calls any admin API (e.g., GET /api/admin/cards)  
**Then** return 403 with { "error": "Second factor required" }

## Scenario 10: Access admin API with full authentication
**Given** admin has cookie with verified: true  
**When** admin calls any admin API  
**Then** verify JWT from cookie  
**And** check verified === true  
**And** allow access based on role

## Scenario 11: Backward compatibility - SETUP_TOKEN only
**Given** admin uses old authentication method  
**When** admin provides SETUP_TOKEN in Authorization header  
**Then** verifySetupToken() still works  
**And** admin can access protected endpoints

---

## Database Schema

### admin_users table (existing, modified)
```sql
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,        -- Email address
  password_hash TEXT,                   -- NULL for OAuth users
  role TEXT DEFAULT 'viewer',           -- 'admin' or 'viewer'
  oauth_provider TEXT,                  -- 'google' or NULL
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  is_active INTEGER DEFAULT 1           -- 1 = active, 0 = disabled
);
```

### Migration 0013
```sql
-- Add oauth_provider column
ALTER TABLE admin_users ADD COLUMN oauth_provider TEXT;
```

---

## Implementation Notes

### JWT Payload (Two Stages)

**Stage 1 - After OAuth (verified: false)**:
```json
{
  "sub": "admin@example.com",
  "email": "admin@example.com",
  "name": "Admin Name",
  "picture": "https://...",
  "role": "admin",
  "admin_id": 1,
  "verified": false,
  "iss": "db-card-api",
  "iat": 1737450000,
  "exp": 1737453600
}
```

**Stage 2 - After SETUP_TOKEN (verified: true)**:
```json
{
  "sub": "admin@example.com",
  "email": "admin@example.com",
  "name": "Admin Name",
  "picture": "https://...",
  "role": "admin",
  "admin_id": 1,
  "verified": true,
  "iss": "db-card-api",
  "iat": 1737450000,
  "exp": 1737453600
}
```

### Frontend Flow
1. User clicks "Login with Google"
2. Open OAuth popup: /api/admin/oauth/google
3. Receive postMessage: { type: 'oauth_success', needsToken: true }
4. Show SETUP_TOKEN input field
5. User enters SETUP_TOKEN
6. Call POST /api/admin/auth/verify { token }
7. Receive { success: true }
8. Login complete, redirect to dashboard

### API Endpoints
1. **GET /api/admin/oauth/google** - Initiate OAuth
2. **GET /api/admin/oauth/callback** - Handle OAuth callback
3. **POST /api/admin/auth/verify** - Verify SETUP_TOKEN (second factor)

### Security Considerations
- OAuth must complete before SETUP_TOKEN verification
- JWT `verified` flag prevents bypassing second factor
- Cookie has HttpOnly, Secure, SameSite=Lax flags
- SETUP_TOKEN never appears in URL
- All admin APIs check `verified === true`
- Backward compatibility with Authorization header maintained

---

## Acceptance Criteria
- ✅ Google OAuth works as first factor
- ✅ Email whitelist validation works (admin_users table)
- ✅ JWT includes verified: false after OAuth
- ✅ SETUP_TOKEN verification works as second factor
- ✅ JWT updates to verified: true after SETUP_TOKEN
- ✅ Admin APIs reject requests with verified: false
- ✅ Admin APIs allow requests with verified: true
- ✅ HttpOnly cookie is set correctly
- ✅ Backward compatibility maintained
- ✅ Inactive admins are rejected
- ✅ Non-whitelisted emails are rejected
- ✅ last_login_at is updated on successful OAuth
- ✅ Role-based access control works
