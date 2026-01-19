# Feature: User Self-Service Card Management System
**Version**: 1.0.0  
**Date**: 2026-01-18  
**Status**: SPECIFICATION

## Background
Given the DB-Card v4.0 system with:
- Existing admin-managed card system
- Envelope encryption architecture
- Audit logging infrastructure
- Google OAuth integration capability

## Core Requirements Summary

### UUID Lifecycle
- **Pending**: 7 days to claim, expires to **Expired** (terminal)
- **Bound**: Long-term valid until admin revokes
- **Quarantine**: Cooling period after unbinding before reissue
- **Expired**: Terminal state, cannot be extended

### Binding Rules
- Max 3 UUIDs per email: Official=1, Temporary=1, Event=1
- Enforced by UNIQUE constraint on (bound_email, type)
- UUID = card_uuid (no separate card_uuid generation)

### Permissions
- Users: Cannot delete cards, only edit
- Admins: Can view/edit all cards, all actions logged

### Security
- Email allowlist (configurable, multi-domain)
- Rate limiting: uuid+IP (claim), email+IP (edit)
- No CAPTCHA in Phase 1

---

## Scenario 1: UUID Generation by Admin

### 1.1 Generate Single UUID
**Given** an authenticated admin  
**When** POST /api/admin/uuids with:
```json
{
  "type": "official",
  "note": "For John Doe - Engineering"
}
```
**Then**:
- Generate a new UUID v4
- Insert into `uuid_bindings` table:
  - `uuid`: generated UUID
  - `type`: "official"
  - `status`: "pending"
  - `created_at`: current timestamp
  - `expires_at`: created_at + 7 days
  - `admin_note`: "For John Doe - Engineering"
  - `bound_email`: NULL
  - `bound_at`: NULL
- Return 201 with:
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "type": "official",
  "status": "pending",
  "expires_at": "2026-01-25T23:38:00Z",
  "claim_url": "https://db-card.example.com/claim?uuid=550e8400...",
  "qr_code_data": "https://db-card.example.com/claim?uuid=550e8400..."
}
```
- Log audit event: `uuid_generate`

### 1.2 Batch Generate UUIDs
**Given** an authenticated admin  
**When** POST /api/admin/uuids/batch with:
```json
{
  "count": 10,
  "type": "event",
  "note": "Tech Conference 2026"
}
```
**Then**:
- Generate 10 UUIDs
- Insert all with status "pending"
- Return 201 with array of UUID objects
- Log single audit event: `uuid_batch_generate` with count

---

## Scenario 2: UUID Claiming with Email Validation

### 2.1 Valid Claim
**Given**:
- A pending UUID "550e8400-e29b-41d4-a716-446655440000"
- Email allowlist contains "moda.gov.tw"
- User completes Google OAuth with email "john@moda.gov.tw"

**When** POST /api/user/claim with:
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "oauth_token": "ya29.a0AfH6..."
}
```
**Then**:
- Verify OAuth token with Google
- Extract email "john@moda.gov.tw"
- Check email domain against allowlist → PASS
- Check binding limit for "john@moda.gov.tw" + "official" → PASS (0 < 1)
- Update `uuid_bindings`:
  - `status`: "pending" → "bound"
  - `bound_email`: "john@moda.gov.tw"
  - `bound_at`: current timestamp
  - `expires_at`: NULL
- Create initial card in `cards` table:
  - `card_uuid`: "550e8400-e29b-41d4-a716-446655440000"
  - `encrypted_dek`: (envelope encryption)
  - `ciphertext`: (empty card template)
  - `card_type`: "official"
- Return 200 with:
```json
{
  "success": true,
  "redirect_url": "/user-portal.html?uuid=550e8400..."
}
```
- Log audit event: `user_bind_uuid`

### 2.2 Invalid Email Domain
**Given** email allowlist only contains "moda.gov.tw"  
**When** user with "john@gmail.com" attempts to claim  
**Then**:
- Return 403:
```json
{
  "error": "invalid_email_domain",
  "message": "Email domain not authorized"
}
```
- Log security event: `invalid_email_domain`
- Apply rate limit: increment counter for IP

### 2.3 Binding Limit Exceeded
**Given** "john@moda.gov.tw" already has 1 official UUID bound  
**When** attempting to claim another official UUID  
**Then**:
- Return 409:
```json
{
  "error": "binding_limit_exceeded",
  "message": "Maximum 1 official UUID per account"
}
```
- Log security event: `duplicate_bind_attempt`

### 2.4 Expired UUID
**Given** a UUID with `expires_at` < current time and status "pending"  
**When** user attempts to claim  
**Then**:
- Return 410:
```json
{
  "error": "uuid_expired",
  "message": "This invitation has expired"
}
```
- Update status to "expired" (if not already)

---

## Scenario 3: User Card Editing

### 3.1 Edit Own Card
**Given**:
- User "john@moda.gov.tw" is authenticated (valid OAuth token)
- User owns UUID "550e8400..."

**When** PUT /api/user/cards/550e8400-e29b-41d4-a716-446655440000 with:
```json
{
  "name_zh": "王小明",
  "name_en": "John Wang",
  "title_zh": "工程師",
  "title_en": "Engineer",
  ...
}
```
**Then**:
- Verify OAuth token
- Check `uuid_bindings.bound_email` = "john@moda.gov.tw" → PASS
- Encrypt card data with existing DEK
- Update `cards.ciphertext`
- Update `cards.updated_at`
- Return 200 with success message
- Log audit event: `user_card_update`

### 3.2 Attempt to Edit Others' Card
**Given** user "john@moda.gov.tw" authenticated  
**When** PUT /api/user/cards/{another_user_uuid}  
**Then**:
- Return 403:
```json
{
  "error": "forbidden",
  "message": "You can only edit your own cards"
}
```

### 3.3 Expired OAuth Token
**Given** user's OAuth token has expired  
**When** any PUT /api/user/cards/* request  
**Then**:
- Return 401:
```json
{
  "error": "token_expired",
  "message": "Please re-authenticate"
}
```
- Frontend redirects to OAuth flow

---

## Scenario 4: Admin Override & Audit

### 4.1 Admin Edit User Card
**Given** admin authenticated with admin token  
**When** PUT /api/admin/cards/550e8400-e29b-41d4-a716-446655440000 with card data  
**Then**:
- Update card (same as user edit)
- Log audit event: `admin_card_update` with:
  - `actor_type`: "admin"
  - `actor_id`: admin email
  - `target_uuid`: "550e8400..."
  - `details`: JSON diff of changes

### 4.2 Admin View All Cards
**Given** admin authenticated  
**When** GET /api/admin/cards?bound_email=john@moda.gov.tw  
**Then**:
- Return all cards for that email
- Include UUID binding status
- Log audit event: `admin_view_cards`

---

## Scenario 5: Unbinding & Quarantine

### 5.1 Admin Unbind UUID
**Given** UUID "550e8400..." is bound to "john@moda.gov.tw"  
**When** POST /api/admin/uuids/550e8400.../unbind with:
```json
{
  "reason": "User left organization"
}
```
**Then**:
- Update `uuid_bindings`:
  - `status`: "bound" → "quarantine"
  - `quarantine_until`: current timestamp + 30 days
  - `unbind_reason`: "User left organization"
- Revoke all active ReadSessions for this card_uuid
- Keep card data (do not delete)
- Return 200
- Log audit event: `uuid_unbind`

### 5.2 Quarantine Period Check
**Given** UUID in quarantine with `quarantine_until` > current time  
**When** admin attempts to reissue (change status to pending)  
**Then**:
- Return 409:
```json
{
  "error": "quarantine_active",
  "message": "UUID in cooling period until 2026-02-17",
  "quarantine_until": "2026-02-17T23:38:00Z"
}
```

### 5.3 Reissue After Quarantine
**Given** UUID in quarantine with `quarantine_until` < current time  
**When** POST /api/admin/uuids/550e8400.../reissue  
**Then**:
- Update `uuid_bindings`:
  - `status`: "quarantine" → "pending"
  - `bound_email`: NULL
  - `bound_at`: NULL
  - `expires_at`: current timestamp + 7 days
  - `quarantine_until`: NULL
- Return 200 with new claim URL
- Log audit event: `uuid_reissue`

---

## Scenario 6: Rate Limiting

### 6.1 Claim Rate Limit (UUID + IP)
**Given** IP "203.0.113.1" has attempted 5 claims in 1 hour  
**When** 6th claim attempt from same IP  
**Then**:
- Return 429:
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many claim attempts",
  "retry_after": 3600
}
```
- Log security event: `rate_limit_claim`

### 6.2 Edit Rate Limit (Email + IP)
**Given** "john@moda.gov.tw" from IP "203.0.113.1" has made 20 edits in 1 hour  
**When** 21st edit attempt  
**Then**:
- Return 429 with retry_after
- Log security event: `rate_limit_edit`

---

## Database Schema

### New Table: uuid_bindings
```sql
CREATE TABLE uuid_bindings (
  uuid TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('official', 'temporary', 'event')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'bound', 'expired', 'quarantine')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER,  -- NULL if bound
  bound_email TEXT,
  bound_at INTEGER,
  quarantine_until INTEGER,
  admin_note TEXT,
  unbind_reason TEXT
);

CREATE UNIQUE INDEX idx_uuid_bindings_email_type 
  ON uuid_bindings(bound_email, type) 
  WHERE status = 'bound';

CREATE INDEX idx_uuid_bindings_status ON uuid_bindings(status);
CREATE INDEX idx_uuid_bindings_expires ON uuid_bindings(expires_at);
```

### New Table: email_allowlist
```sql
CREATE TABLE email_allowlist (
  domain TEXT PRIMARY KEY,
  added_at INTEGER NOT NULL,
  added_by TEXT NOT NULL
);

INSERT INTO email_allowlist VALUES 
  ('moda.gov.tw', unixepoch(), 'system'),
  ('contractor.moda.gov.tw', unixepoch(), 'system');
```

### Modified Table: cards
- `card_uuid` now references `uuid_bindings.uuid` (FK constraint)
- No changes to encryption structure

### Modified Table: audit_logs
- Add `actor_type` TEXT ('admin' | 'user' | 'system')
- Add `actor_id` TEXT (email or admin identifier)
- Add `target_uuid` TEXT (for UUID-related operations)

---

## API Endpoints

### Admin APIs (require admin auth)
1. `POST /api/admin/uuids` - Generate single UUID
2. `POST /api/admin/uuids/batch` - Batch generate
3. `GET /api/admin/uuids` - List all UUIDs (with filters)
4. `GET /api/admin/uuids/:uuid` - Get UUID details
5. `POST /api/admin/uuids/:uuid/unbind` - Unbind UUID
6. `POST /api/admin/uuids/:uuid/reissue` - Reissue after quarantine
7. `GET /api/admin/cards?bound_email=...` - List user cards (existing, add filter)
8. `PUT /api/admin/cards/:uuid` - Edit user card (existing, add audit)

### User APIs (require OAuth token)
9. `POST /api/user/claim` - Claim UUID with OAuth
10. `GET /api/user/cards` - List own cards
11. `GET /api/user/cards/:uuid` - Get own card details
12. `PUT /api/user/cards/:uuid` - Edit own card

### Public APIs
13. `GET /api/user/allowlist` - Check if email domain is allowed (for frontend validation)

---

## Rate Limiting Rules

### Claim Endpoint
- Key: `claim:${uuid}:${ip}`
- Limit: 5 attempts per hour per UUID+IP
- Storage: KV with TTL 3600s

### Edit Endpoint
- Key: `edit:${email}:${ip}`
- Limit: 20 requests per hour per email+IP
- Storage: KV with TTL 3600s

---

## Audit Events (New)

| Event Type | Actor Type | Description |
|------------|-----------|-------------|
| `uuid_generate` | admin | Single UUID generated |
| `uuid_batch_generate` | admin | Batch UUIDs generated |
| `uuid_unbind` | admin | UUID unbound from user |
| `uuid_reissue` | admin | UUID reissued after quarantine |
| `user_bind_uuid` | user | User claimed UUID |
| `user_card_update` | user | User edited own card |
| `admin_card_update` | admin | Admin edited user card |
| `admin_view_cards` | admin | Admin viewed user cards |

## Security Events (New)

| Event Type | Description |
|------------|-------------|
| `invalid_email_domain` | Non-allowlisted email attempted claim |
| `duplicate_bind_attempt` | Binding limit exceeded |
| `rate_limit_claim` | Claim rate limit hit |
| `rate_limit_edit` | Edit rate limit hit |

---

## Frontend Components

### New: user-portal.html
- OAuth login button
- Card editor (reuse admin-dashboard form)
- View own cards list
- No delete button (only edit)

### New: claim.html
- UUID claim page
- Google OAuth integration
- Email domain validation feedback
- Redirect to user-portal after success

### Modified: admin-dashboard.html
- Add "UUID Management" tab
- Generate UUID form (single/batch)
- UUID list with status badges
- Unbind/Reissue actions
- QR code generation for claim URLs

---

## Implementation Phases

### Phase 1: Database & Core APIs (P0)
- Migration: 0004_uuid_bindings.sql
- Admin UUID generation APIs (1, 2, 3, 4)
- User claim API (9)
- Email allowlist validation

### Phase 2: User Portal (P0)
- OAuth integration
- claim.html frontend
- user-portal.html frontend
- User edit API (12)

### Phase 3: Admin Extensions (P1)
- Unbind/Reissue APIs (5, 6)
- Admin UUID management UI
- QR code generation

### Phase 4: Rate Limiting & Security (P1)
- Rate limiting middleware
- Security event logging
- Monitoring dashboard integration

---

## Success Criteria

- [ ] Admin can generate UUIDs with 7-day expiry
- [ ] Users can claim UUIDs with valid @moda.gov.tw email
- [ ] Binding limit enforced (max 3 per email, 1 per type)
- [ ] Users can edit own cards, cannot delete
- [ ] Admins can edit all cards with audit trail
- [ ] Unbind → Quarantine → Reissue flow works
- [ ] Rate limiting prevents abuse
- [ ] All operations logged to audit_logs
- [ ] OAuth token expiry handled gracefully

---

**End of Specification**
