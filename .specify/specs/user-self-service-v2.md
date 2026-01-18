# Feature: Self-Service Card Management System (No Invitation)
**Version**: 2.0.0  
**Date**: 2026-01-18  
**Status**: SPECIFICATION  
**Breaking Change**: Removed invitation/claim mechanism, switched to full self-service

## Background
Given the DB-Card v4.0 system with:
- Existing admin-managed card system
- Envelope encryption architecture
- Audit logging infrastructure
- Google OAuth integration

## Core Principles (v2.0)

### Entry Model
- **Unified Entry**: `/edit` page (OAuth required)
- **No Invitation Code**: Users create cards directly
- **Domain Allowlist**: Only authorized email domains (e.g., moda.gov.tw)

### UUID Generation
- **Timing**: Auto-generated on first card creation for each type
- **Lifecycle**: UUID = card_uuid, permanent binding
- **No Expiry**: UUIDs never expire, only revoked by admin

### Governance Strategy
- **Pre-Creation**: No blocking (OAuth + domain is sufficient)
- **Post-Creation**: Revocable, traceable, auditable
- **Binding Limit**: 1 Official + 1 Temporary + 1 Event per email

### State Machine (Simplified)
- **Bound**: Normal, active card
- **Revoked**: Admin-revoked, cannot be used
- **Quarantine**: Cooling period after unbinding (30 days)

---

## Scenario 1: OAuth Login & Card Selection Page

### 1.1 Valid OAuth Login
**Given** user visits `/edit`  
**When** user completes Google OAuth with email "john@moda.gov.tw"  
**Then**:
- Verify OAuth token with Google
- Extract email "john@moda.gov.tw"
- Check email domain against `email_allowlist` → PASS
- Query `uuid_bindings` for bound cards:
  ```sql
  SELECT uuid, type, updated_at 
  FROM uuid_bindings 
  WHERE bound_email = 'john@moda.gov.tw' 
    AND status = 'bound'
  ```
- Return card selection page with 3 slots:
  - **Official**: [Create] or [Edit] + last_updated
  - **Temporary**: [Create] or [Edit] + last_updated
  - **Event**: [Create] or [Edit] + last_updated
- Store OAuth token in session (HttpOnly cookie)

### 1.2 Invalid Email Domain
**Given** email allowlist only contains "moda.gov.tw"  
**When** user with "john@gmail.com" completes OAuth  
**Then**:
- Return 403:
```json
{
  "error": "unauthorized_domain",
  "message": "Your email domain is not authorized"
}
```
- Log security event: `invalid_email_domain`
- Clear OAuth session

### 1.3 Expired OAuth Token
**Given** user's OAuth token has expired  
**When** user accesses `/edit` or any card operation  
**Then**:
- Return 401:
```json
{
  "error": "token_expired",
  "message": "Please re-authenticate"
}
```
- Redirect to OAuth flow

---

## Scenario 2: Create First Card (Auto UUID Generation)

### 2.1 Create Official Card (First Time)
**Given**:
- User "john@moda.gov.tw" authenticated
- No existing Official card for this email

**When** POST /api/user/cards with:
```json
{
  "type": "official",
  "name_zh": "王小明",
  "name_en": "John Wang",
  "title_zh": "工程師",
  "title_en": "Engineer",
  "department_zh": "資訊處",
  "department_en": "IT Department",
  "phone": "+886-2-1234-5678",
  "email": "john@moda.gov.tw",
  "address_zh": "台北市...",
  "address_en": "Taipei City...",
  "photo_url": "https://drive.google.com/uc?export=view&id=..."
}
```

**Then**:
- Verify OAuth token → PASS
- Check binding limit for "john@moda.gov.tw" + "official":
  ```sql
  SELECT COUNT(*) FROM uuid_bindings 
  WHERE bound_email = 'john@moda.gov.tw' 
    AND type = 'official' 
    AND status = 'bound'
  ```
  → Result: 0 (< 1) → PASS
- Generate new UUID v4: "550e8400-e29b-41d4-a716-446655440000"
- Insert into `uuid_bindings`:
  ```sql
  INSERT INTO uuid_bindings (
    uuid, type, status, bound_email, bound_at, 
    created_ip, created_user_agent
  ) VALUES (
    '550e8400...', 'official', 'bound', 'john@moda.gov.tw', 
    unixepoch(), '203.0.113.1', 'Mozilla/5.0...'
  )
  ```
- Encrypt card data with new DEK (envelope encryption)
- Insert into `cards`:
  ```sql
  INSERT INTO cards (
    card_uuid, encrypted_dek, ciphertext, 
    card_type, created_at, updated_at
  ) VALUES (
    '550e8400...', '<encrypted_dek>', '<ciphertext>', 
    'official', unixepoch(), unixepoch()
  )
  ```
- Return 201:
```json
{
  "success": true,
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "type": "official",
  "message": "Card created successfully"
}
```
- Log audit event: `user_card_create` with:
  - `actor_type`: "user"
  - `actor_id`: "john@moda.gov.tw"
  - `target_uuid`: "550e8400..."
  - `details`: JSON of card data (anonymized)

### 2.2 Binding Limit Exceeded
**Given** "john@moda.gov.tw" already has 1 Official card bound  
**When** POST /api/user/cards with type "official"  
**Then**:
- Return 409:
```json
{
  "error": "binding_limit_exceeded",
  "message": "You already have an Official card. Maximum 1 per account.",
  "existing_uuid": "550e8400..."
}
```
- Log security event: `duplicate_bind_attempt`

### 2.3 Create Multiple Types
**Given** user has no cards  
**When** user creates Official, then Temporary, then Event  
**Then**:
- Each creation generates a unique UUID
- All 3 cards bound to same email
- UNIQUE constraint on (bound_email, type) enforced at DB level

---

## Scenario 3: Edit Existing Card

### 3.1 Edit Own Card
**Given**:
- User "john@moda.gov.tw" authenticated
- User owns UUID "550e8400..." (Official card)

**When** PUT /api/user/cards/550e8400-e29b-41d4-a716-446655440000 with:
```json
{
  "name_zh": "王大明",
  "phone": "+886-2-9999-8888",
  ...
}
```

**Then**:
- Verify OAuth token → PASS
- Check ownership:
  ```sql
  SELECT 1 FROM uuid_bindings 
  WHERE uuid = '550e8400...' 
    AND bound_email = 'john@moda.gov.tw' 
    AND status = 'bound'
  ```
  → PASS
- Decrypt existing card data with DEK
- Merge updates
- Re-encrypt with same DEK
- Update `cards.ciphertext` and `cards.updated_at`
- Return 200:
```json
{
  "success": true,
  "message": "Card updated successfully"
}
```
- Log audit event: `user_card_update` with field-level diff

### 3.2 Attempt to Edit Others' Card
**Given** user "john@moda.gov.tw" authenticated  
**When** PUT /api/user/cards/{another_user_uuid}  
**Then**:
- Ownership check fails
- Return 403:
```json
{
  "error": "forbidden",
  "message": "You can only edit your own cards"
}
```

### 3.3 Edit Revoked Card
**Given** UUID "550e8400..." has status "revoked"  
**When** user attempts to edit  
**Then**:
- Return 410:
```json
{
  "error": "card_revoked",
  "message": "This card has been revoked by administrator"
}
```

---

## Scenario 4: Admin Revocation & Quarantine

### 4.1 Revoke Single Card
**Given** admin authenticated  
**When** POST /api/admin/revoke with:
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "User left organization"
}
```

**Then**:
- Update `uuid_bindings`:
  ```sql
  UPDATE uuid_bindings 
  SET status = 'revoked', 
      revoked_at = unixepoch(),
      revoke_reason = 'User left organization'
  WHERE uuid = '550e8400...'
  ```
- Revoke all active ReadSessions for this card_uuid
- Keep card data (do not delete from `cards` table)
- Return 200:
```json
{
  "success": true,
  "message": "Card revoked successfully"
}
```
- Log audit event: `admin_card_revoke`

### 4.2 Revoke All Cards for Email
**Given** admin authenticated  
**When** POST /api/admin/revoke-email with:
```json
{
  "email": "john@moda.gov.tw",
  "reason": "Account compromised"
}
```

**Then**:
- Update all cards:
  ```sql
  UPDATE uuid_bindings 
  SET status = 'revoked', 
      revoked_at = unixepoch(),
      revoke_reason = 'Account compromised'
  WHERE bound_email = 'john@moda.gov.tw' 
    AND status = 'bound'
  ```
- Revoke all ReadSessions for affected card_uuids
- Return 200 with count of revoked cards
- Log audit event: `admin_email_revoke`

### 4.3 Unbind for Reassignment
**Given** UUID "550e8400..." is bound and revoked  
**When** POST /api/admin/unbind with:
```json
{
  "uuid": "550e8400...",
  "reason": "Reassign to new employee"
}
```

**Then**:
- Update `uuid_bindings`:
  ```sql
  UPDATE uuid_bindings 
  SET status = 'quarantine',
      quarantine_until = unixepoch() + (30 * 86400),
      bound_email = NULL,
      bound_at = NULL
  WHERE uuid = '550e8400...'
  ```
- Return 200:
```json
{
  "success": true,
  "quarantine_until": "2026-02-17T23:44:00Z"
}
```
- Log audit event: `admin_card_unbind`

### 4.4 Quarantine Period Enforcement
**Given** UUID in quarantine with `quarantine_until` > current time  
**When** user attempts to create card (UUID collision, should not happen)  
**Then**:
- System generates new UUID (no collision possible)
- Quarantine only affects manual reassignment by admin

---

## Scenario 5: Admin View & Edit

### 5.1 Admin View All Cards
**Given** admin authenticated  
**When** GET /api/admin/cards?email=john@moda.gov.tw  
**Then**:
- Return all cards for that email:
```json
{
  "cards": [
    {
      "uuid": "550e8400...",
      "type": "official",
      "status": "bound",
      "bound_email": "john@moda.gov.tw",
      "bound_at": "2026-01-18T15:30:00Z",
      "updated_at": "2026-01-18T23:00:00Z",
      "card_data": { ... }
    }
  ]
}
```
- Log audit event: `admin_view_cards`

### 5.2 Admin Edit User Card
**Given** admin authenticated  
**When** PUT /api/admin/cards/550e8400... with card data  
**Then**:
- Update card (same encryption flow as user edit)
- Log audit event: `admin_card_update` with:
  - `actor_type`: "admin"
  - `actor_id`: admin email
  - `target_uuid`: "550e8400..."
  - `details`: Field-level diff

---

## Scenario 6: Rate Limiting

### 6.1 Card Creation Rate Limit
**Given** "john@moda.gov.tw" has created 3 cards in 1 hour  
**When** attempting 4th creation (should not happen due to binding limit)  
**Then**:
- Binding limit (1+1+1) prevents this
- Rate limit acts as secondary defense

### 6.2 Card Edit Rate Limit
**Given** "john@moda.gov.tw" from IP "203.0.113.1" has made 20 edits in 1 hour  
**When** 21st edit attempt  
**Then**:
- Return 429:
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many edit requests",
  "retry_after": 3600
}
```
- Log security event: `rate_limit_edit`

### Rate Limit Rules
- **Creation**: 5 attempts per hour per email+IP
- **Edit**: 20 requests per hour per email+IP
- **Storage**: KV with TTL 3600s

---

## Database Schema

### Table: uuid_bindings (Simplified)
```sql
CREATE TABLE uuid_bindings (
  uuid TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('official', 'temporary', 'event')),
  status TEXT NOT NULL CHECK (status IN ('bound', 'revoked', 'quarantine')),
  bound_email TEXT,
  bound_at INTEGER,
  created_ip TEXT,
  created_user_agent TEXT,
  revoked_at INTEGER,
  revoke_reason TEXT,
  quarantine_until INTEGER
);

-- Enforce 1+1+1 binding limit
CREATE UNIQUE INDEX idx_uuid_bindings_email_type 
  ON uuid_bindings(bound_email, type) 
  WHERE status = 'bound';

CREATE INDEX idx_uuid_bindings_email ON uuid_bindings(bound_email);
CREATE INDEX idx_uuid_bindings_status ON uuid_bindings(status);
```

### Table: email_allowlist (Unchanged)
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

### Table: cards (Unchanged)
- `card_uuid` references `uuid_bindings.uuid`
- Encryption structure unchanged

### Table: audit_logs (Extended)
- Add `actor_type` TEXT ('admin' | 'user' | 'system')
- Add `actor_id` TEXT (email)
- Add `target_uuid` TEXT

---

## API Endpoints

### User APIs (OAuth required)
1. `GET /api/user/cards` - List own cards (for selection page)
2. `POST /api/user/cards` - Create new card (auto-generate UUID)
3. `GET /api/user/cards/:uuid` - Get own card details
4. `PUT /api/user/cards/:uuid` - Edit own card

### Admin APIs (Admin auth required)
5. `GET /api/admin/cards` - List all cards (with filters)
6. `GET /api/admin/cards/:uuid` - Get any card details
7. `PUT /api/admin/cards/:uuid` - Edit any card
8. `POST /api/admin/revoke` - Revoke single card
9. `POST /api/admin/revoke-email` - Revoke all cards for email
10. `POST /api/admin/unbind` - Unbind card (enter quarantine)

### Public APIs
11. `GET /health` - System health (existing)

---

## Audit Events

| Event Type | Actor Type | Description |
|------------|-----------|-------------|
| `user_card_create` | user | User created new card |
| `user_card_update` | user | User edited own card |
| `admin_card_update` | admin | Admin edited user card |
| `admin_card_revoke` | admin | Admin revoked single card |
| `admin_email_revoke` | admin | Admin revoked all cards for email |
| `admin_card_unbind` | admin | Admin unbound card |
| `admin_view_cards` | admin | Admin viewed user cards |

## Security Events

| Event Type | Description |
|------------|-------------|
| `invalid_email_domain` | Non-allowlisted email attempted login |
| `duplicate_bind_attempt` | Binding limit exceeded |
| `rate_limit_create` | Creation rate limit hit |
| `rate_limit_edit` | Edit rate limit hit |

---

## Frontend Components

### New: /edit (Card Selection & Editor)
- OAuth login button
- Card selection page (3 slots):
  - Show type, display name, last updated
  - [Create] or [Edit] button
  - **Do not show UUID** (minimal disclosure)
- Card editor form (reuse admin-dashboard form)
- No delete button (only edit)

### Modified: admin-dashboard.html
- Add "User Cards" tab
- List all users' cards
- Revoke/Unbind actions
- View/Edit any card

### Removed: claim.html
- No longer needed (no invitation mechanism)

---

## Implementation Phases

### Phase 1: Database & Core User APIs (P0)
- Migration: 0004_uuid_bindings_v2.sql
- User card creation API (auto UUID)
- User card edit API
- OAuth integration

### Phase 2: User Frontend (P0)
- /edit page (OAuth + card selection)
- Card editor UI
- Binding limit feedback

### Phase 3: Admin Extensions (P1)
- Revoke/Unbind APIs
- Admin card management UI
- Audit log viewer

### Phase 4: Rate Limiting & Monitoring (P1)
- Rate limiting middleware
- Security event dashboard
- Anomaly detection (future)

---

## Success Criteria

- [ ] Any @moda.gov.tw user can login via OAuth
- [ ] Users can create up to 3 cards (1+1+1)
- [ ] UUID auto-generated on first creation
- [ ] Users can edit own cards, cannot delete
- [ ] Admins can revoke any card instantly
- [ ] All operations logged to audit_logs
- [ ] Rate limiting prevents abuse
- [ ] OAuth token expiry handled gracefully
- [ ] Card selection page shows minimal info (no UUID)

---

## Migration from v1.0 Spec

### Removed Features
- ❌ Admin UUID generation APIs
- ❌ User claim/invitation flow
- ❌ Pending/Expired states
- ❌ 7-day expiry mechanism
- ❌ Batch UUID generation
- ❌ QR code for claim URLs

### Simplified Features
- ✅ UUID lifecycle: 3 states instead of 4
- ✅ API endpoints: 11 instead of 13
- ✅ Database tables: Simpler uuid_bindings schema
- ✅ User flow: Direct creation instead of claim

### Enhanced Features
- ✅ Full self-service (no admin pre-approval)
- ✅ Stronger audit logging (creation IP/UA)
- ✅ Instant revocation (no grace period)

---

**End of Specification v2.0**
