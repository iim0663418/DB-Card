# Admin Passkey Authentication

## Feature
As a system administrator  
I want to use Passkey for fast and secure login  
So that I don't need to enter SETUP_TOKEN every time

## Background
First-time login requires SETUP_TOKEN to verify authorization.  
After verification, admin can register a Passkey for future logins.  
Passkey uses FIDO2/WebAuthn standard with biometric authentication.

Admin whitelist is managed via `admin_users` table:
- `username` field stores email addresses
- `role` field defines permissions (admin/viewer)
- `is_active` field enables/disables access
- Passkey credentials stored in new columns

## Security Requirements
- First-time login requires SETUP_TOKEN (authorization check)
- Passkey registration requires active SETUP_TOKEN session
- **Once Passkey is registered, SETUP_TOKEN login is DISABLED for that admin**
- Passkey login uses WebAuthn signature verification
- HttpOnly cookies for session management
- Phishing-resistant (domain-bound credentials)
- **Passkey reset requires wrangler CLI access (database operation) or EMERGENCY_BYPASS secret**

---

## Scenario 1: First-time login with SETUP_TOKEN
**Given** admin has valid SETUP_TOKEN  
**And** admin has not registered Passkey  
**When** POST /api/admin/login with { "token": "valid-token" }  
**Then** return success and set HttpOnly cookie  
**And** return { "needsPasskey": true }

## Scenario 2: Register Passkey (start)
**Given** admin has active session (verified SETUP_TOKEN)  
**And** admin provides email in admin_users whitelist  
**When** POST /api/admin/passkey/register/start with { "email": "admin@example.com" }  
**Then** verify email exists in admin_users AND is_active = 1  
**And** generate WebAuthn challenge  
**And** return registration options

## Scenario 3: Register Passkey (finish)
**Given** admin completed WebAuthn ceremony  
**And** credential is valid  
**When** POST /api/admin/passkey/register/finish with credential  
**Then** verify attestation  
**And** store public key in admin_users  
**And** update passkey_created_at  
**And** return { "success": true }

## Scenario 4: Register Passkey with unauthorized email
**Given** admin has active session  
**And** email does NOT exist in admin_users  
**When** POST /api/admin/passkey/register/start with { "email": "unknown@example.com" }  
**Then** return 403 with { "error": "Email not in whitelist" }

## Scenario 5: Register Passkey with inactive admin
**Given** admin has active session  
**And** email exists in admin_users  
**And** is_active = 0  
**When** POST /api/admin/passkey/register/start with { "email": "inactive@example.com" }  
**Then** return 403 with { "error": "Account disabled" }

## Scenario 6: Login with Passkey (start)
**Given** admin has registered Passkey  
**When** POST /api/admin/passkey/login/start with { "email": "admin@example.com" }  
**Then** generate WebAuthn challenge  
**And** return authentication options with allowCredentials

## Scenario 7: Login with Passkey (finish - success)
**Given** admin completed WebAuthn authentication  
**And** signature is valid  
**And** counter is greater than stored counter  
**When** POST /api/admin/passkey/login/finish with assertion  
**Then** verify signature with stored public key  
**And** update passkey_counter  
**And** update passkey_last_used  
**And** update last_login_at  
**And** set HttpOnly cookie  
**And** return { "success": true, "role": "admin" }

## Scenario 8: Login with Passkey (invalid signature)
**Given** admin completed WebAuthn authentication  
**And** signature is INVALID  
**When** POST /api/admin/passkey/login/finish with assertion  
**Then** return 401 with { "error": "Invalid signature" }  
**And** do not set cookie

## Scenario 9: Login with Passkey (counter rollback attack)
**Given** admin completed WebAuthn authentication  
**And** counter is LESS than stored counter  
**When** POST /api/admin/passkey/login/finish with assertion  
**Then** return 401 with { "error": "Counter rollback detected" }  
**And** log security event  
**And** do not set cookie

## Scenario 10: SETUP_TOKEN login disabled after Passkey registration
**Given** admin has registered Passkey  
**And** passkey_enabled = 1  
**When** admin tries to login with SETUP_TOKEN  
**Then** return 403 with { "code": "PASSKEY_ENABLED", "error": "Passkey is enabled, use Passkey login" }  
**And** do not set cookie

## Scenario 11: Reset Passkey (database operation)
**Given** admin has Passkey enabled  
**And** admin lost device  
**When** system admin executes wrangler d1 command to reset Passkey  
**Then** passkey_enabled is set to 0  
**And** all Passkey fields are cleared  
**And** admin can login with SETUP_TOKEN again

## Scenario 12: Emergency bypass mode
**Given** EMERGENCY_BYPASS secret is set to 'true'  
**And** admin has Passkey enabled  
**When** admin tries to login with SETUP_TOKEN  
**Then** Passkey check is bypassed  
**And** SETUP_TOKEN login succeeds  
**And** warning is logged

## Scenario 13: Fallback to SETUP_TOKEN (only if Passkey not enabled)
**Given** admin has NOT registered Passkey  
**And** passkey_enabled = 0  
**When** admin uses SETUP_TOKEN login  
**Then** POST /api/admin/login works  
**And** admin can register Passkey

---

## Database Schema

### admin_users table (modified)
```sql
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,        -- Email address
  password_hash TEXT,                   -- NULL for Passkey-only users
  role TEXT DEFAULT 'viewer',           -- 'admin' or 'viewer'
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  is_active INTEGER DEFAULT 1,
  
  -- Passkey fields (new)
  passkey_credential_id TEXT,           -- Base64url encoded
  passkey_public_key TEXT,              -- Base64url encoded
  passkey_counter INTEGER DEFAULT 0,    -- Signature counter
  passkey_device_type TEXT,             -- 'platform' or 'cross-platform'
  passkey_backed_up INTEGER DEFAULT 0,  -- 0 or 1
  passkey_created_at INTEGER,
  passkey_last_used INTEGER
);

CREATE INDEX idx_admin_passkey_credential ON admin_users(passkey_credential_id);
```

---

## Implementation Notes

### WebAuthn Configuration
```typescript
const rpName = 'DB-Card Admin';
const rpID = 'db-card.moda.gov.tw'; // or localhost for dev
const origin = `https://${rpID}`;

const registrationOptions = {
  rpName,
  rpID,
  userID: email,
  userName: email,
  attestationType: 'none',
  authenticatorSelection: {
    residentKey: 'preferred',
    userVerification: 'preferred',
    authenticatorAttachment: 'platform', // Prefer Touch ID, Face ID
  },
};
```

### Frontend Flow
```javascript
// 1. Check if Passkey is available
if (await checkPasskeyRegistered()) {
  showPasskeyLogin();
} else {
  showTokenLogin();
}

// 2. Register Passkey
const { startRegistration } = SimpleWebAuthnBrowser;
const credential = await startRegistration(options);

// 3. Login with Passkey
const { startAuthentication } = SimpleWebAuthnBrowser;
const assertion = await startAuthentication(options);
```

### Security Considerations
- Passkey registration requires active SETUP_TOKEN session
- Counter must always increase (prevent cloning attacks)
- Signature verification uses stored public key
- Domain-bound credentials (phishing-resistant)
- HttpOnly cookies prevent XSS
- Rate limiting on authentication endpoints

---

## Acceptance Criteria
- ✅ First-time login with SETUP_TOKEN works
- ✅ Passkey registration requires active session
- ✅ Email whitelist validation works
- ✅ WebAuthn registration ceremony completes
- ✅ Public key stored correctly
- ✅ Passkey login works without SETUP_TOKEN
- ✅ Signature verification works
- ✅ Counter rollback detection works
- ✅ HttpOnly cookie is set
- ✅ Fallback to SETUP_TOKEN works
- ✅ Inactive admins are rejected
- ✅ Role-based access control works
