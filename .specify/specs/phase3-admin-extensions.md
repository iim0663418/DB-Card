# Phase 3: Admin Extensions - User Management & Revocation

**Version**: 1.0.0  
**Date**: 2026-01-19  
**Status**: DESIGN  
**Dependencies**: Phase 1 (Backend APIs), Phase 2 (User Portal)

---

## Overview

Phase 3 擴充管理後台功能，提供使用者管理與卡片撤銷/解綁機制。

### Core Features
1. **Card Revocation** - 撤銷單一或批次卡片
2. **UUID Unbinding** - 解綁 UUID 進入隔離期
3. **User Management** - 查看所有使用者及其卡片狀態

---

## API Specifications

### 1. POST /api/admin/revoke

**Purpose**: 撤銷單一卡片

**Authentication**: Admin (SETUP_TOKEN)

**Request Body**:
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "User left organization"
}
```

**Database Operations**:
```sql
-- 1. Update uuid_bindings
UPDATE uuid_bindings 
SET status = 'revoked', 
    revoked_at = unixepoch(),
    revoke_reason = ?
WHERE uuid = ? AND status = 'bound';

-- 2. Revoke all ReadSessions
UPDATE read_sessions 
SET revoked = 1 
WHERE card_uuid = ? AND revoked = 0;
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Card revoked successfully"
}
```

**Error Responses**:
- `404`: UUID not found
- `400`: Card already revoked
- `401/403`: Authentication failed

**Audit Log**: `admin_card_revoke`

**Rate Limit**: 20 requests/hour

---

### 2. POST /api/admin/revoke-email

**Purpose**: 撤銷某個 email 的所有卡片（批次操作）

**Authentication**: Admin (SETUP_TOKEN)

**Request Body**:
```json
{
  "email": "john@moda.gov.tw",
  "reason": "Account compromised"
}
```

**Database Operations** (Transaction Required):
```sql
-- 1. Find all bound cards
SELECT uuid FROM uuid_bindings 
WHERE bound_email = ? AND status = 'bound';

-- 2. Batch update
UPDATE uuid_bindings 
SET status = 'revoked', 
    revoked_at = unixepoch(),
    revoke_reason = ?
WHERE bound_email = ? AND status = 'bound';

-- 3. Revoke all ReadSessions
UPDATE read_sessions 
SET revoked = 1 
WHERE card_uuid IN (...) AND revoked = 0;
```

**Response (200)**:
```json
{
  "success": true,
  "revoked_count": 3,
  "uuids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001",
    "770e8400-e29b-41d4-a716-446655440002"
  ]
}
```

**Error Responses**:
- `404`: Email has no cards
- `400`: All cards already revoked

**Audit Log**: `admin_email_revoke`

**Rate Limit**: 10 requests/hour

**Note**: Requires transaction to ensure atomicity

---

### 3. POST /api/admin/unbind

**Purpose**: 解綁 UUID，進入 30 天隔離期

**Authentication**: Admin (SETUP_TOKEN)

**Precondition**: UUID must be in `revoked` status

**Request Body**:
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "Reassign to new employee"
}
```

**State Machine Validation**:
```
bound → revoked → quarantine
  ❌      ✅         ✅
```

**Database Operations**:
```sql
-- 1. Check current status
SELECT status FROM uuid_bindings WHERE uuid = ?;

-- 2. Update to quarantine
UPDATE uuid_bindings 
SET status = 'quarantine',
    quarantine_until = unixepoch() + (30 * 86400),
    bound_email = NULL,
    bound_at = NULL,
    unbind_reason = ?
WHERE uuid = ? AND status = 'revoked';
```

**Response (200)**:
```json
{
  "success": true,
  "quarantine_until": "2026-02-18T02:07:00Z"
}
```

**Error Responses**:
- `400`: UUID is not in revoked status
- `404`: UUID not found

**Audit Log**: `admin_card_unbind`

**Rate Limit**: 20 requests/hour

---

### 4. GET /api/admin/users

**Purpose**: 列出所有使用者及卡片統計

**Authentication**: Admin (SETUP_TOKEN)

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 50, max: 100)
- `search` (optional: email search)

**Database Query**:
```sql
SELECT 
  bound_email,
  COUNT(*) as total_cards,
  SUM(CASE WHEN status='bound' THEN 1 ELSE 0 END) as active_cards,
  SUM(CASE WHEN status='revoked' THEN 1 ELSE 0 END) as revoked_cards,
  MAX(updated_at) as last_activity
FROM uuid_bindings
WHERE bound_email IS NOT NULL
  AND (? = '' OR bound_email LIKE ?)
GROUP BY bound_email
ORDER BY last_activity DESC
LIMIT ? OFFSET ?;
```

**Response (200)**:
```json
{
  "users": [
    {
      "email": "john@moda.gov.tw",
      "total_cards": 3,
      "active_cards": 2,
      "revoked_cards": 1,
      "last_activity": "2026-01-19T01:00:00Z"
    },
    {
      "email": "jane@moda.gov.tw",
      "total_cards": 2,
      "active_cards": 2,
      "revoked_cards": 0,
      "last_activity": "2026-01-18T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "has_more": true
  }
}
```

**Performance Considerations**:
- Index on `bound_email`
- Index on `updated_at`
- Consider caching for large datasets

**Rate Limit**: 60 requests/hour

---

### 5. GET /api/admin/users/:email/cards

**Purpose**: 查看特定使用者的所有卡片詳情

**Authentication**: Admin (SETUP_TOKEN)

**Path Parameters**:
- `email` (URL encoded)

**Database Query**:
```sql
SELECT 
  ub.uuid,
  ub.type,
  ub.status,
  ub.bound_at,
  ub.updated_at,
  ub.revoked_at,
  ub.revoke_reason,
  c.name_zh,
  c.name_en
FROM uuid_bindings ub
LEFT JOIN cards c ON ub.uuid = c.card_uuid
WHERE ub.bound_email = ?
ORDER BY 
  CASE ub.type 
    WHEN 'official' THEN 1 
    WHEN 'temporary' THEN 2 
    WHEN 'event' THEN 3 
  END,
  ub.updated_at DESC;
```

**Response (200)**:
```json
{
  "email": "john@moda.gov.tw",
  "cards": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "official",
      "status": "bound",
      "name_zh": "王小明",
      "name_en": "John Wang",
      "bound_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-01-19T01:00:00Z"
    },
    {
      "uuid": "660e8400-e29b-41d4-a716-446655440001",
      "type": "temporary",
      "status": "revoked",
      "name_zh": "王小明（臨時）",
      "name_en": "John Wang (Temp)",
      "bound_at": "2026-01-10T09:00:00Z",
      "revoked_at": "2026-01-18T15:00:00Z",
      "revoke_reason": "Expired"
    },
    {
      "uuid": "770e8400-e29b-41d4-a716-446655440002",
      "type": "event",
      "status": "bound",
      "name_zh": "王小明（活動）",
      "name_en": "John Wang (Event)",
      "bound_at": "2026-01-12T14:00:00Z",
      "updated_at": "2026-01-17T11:00:00Z"
    }
  ]
}
```

**Error Responses**:
- `404`: Email not found or has no cards

**Rate Limit**: 60 requests/hour

---

## File Structure

```
workers/src/
├── handlers/admin/
│   ├── cards.ts          # Existing
│   ├── revoke.ts         # Existing, needs extension ⚠️
│   ├── users.ts          # New ✨
│   ├── auth.ts           # Existing
│   ├── kek.ts            # Existing
│   └── security.ts       # Existing
├── index.ts              # Route integration ⚠️
└── types.ts              # Type definitions ⚠️
```

### New Types (types.ts)

```typescript
// User management
export interface UserSummary {
  email: string;
  total_cards: number;
  active_cards: number;
  revoked_cards: number;
  last_activity: string;
}

export interface UserCard {
  uuid: string;
  type: 'official' | 'temporary' | 'event';
  status: 'bound' | 'revoked' | 'quarantine';
  name_zh?: string;
  name_en?: string;
  bound_at: string;
  updated_at: string;
  revoked_at?: string;
  revoke_reason?: string;
}

// Revocation requests
export interface RevokeCardRequest {
  uuid: string;
  reason: string;
}

export interface RevokeEmailRequest {
  email: string;
  reason: string;
}

export interface UnbindCardRequest {
  uuid: string;
  reason: string;
}
```

---

## Implementation Phases

### Phase 3.1: Revocation (Priority: P0) 🔴

**Scope**:
- POST /api/admin/revoke
- POST /api/admin/revoke-email

**Files**:
- Extend `handlers/admin/revoke.ts`
- Update `index.ts` routes
- Add types to `types.ts`

**Estimated Time**: 1.5 hours

**Testing**:
- Single card revocation
- Batch email revocation
- Error handling (404, 400)
- Audit logging verification

---

### Phase 3.2: Unbinding (Priority: P1) 🟡

**Scope**:
- POST /api/admin/unbind

**Files**:
- Add to `handlers/admin/revoke.ts`
- Update routes

**Estimated Time**: 1 hour

**Testing**:
- State machine validation
- Quarantine period calculation
- Error handling

---

### Phase 3.3: User Management (Priority: P1) 🟡

**Scope**:
- GET /api/admin/users
- GET /api/admin/users/:email/cards

**Files**:
- Create `handlers/admin/users.ts`
- Update routes

**Estimated Time**: 1.5 hours

**Testing**:
- Pagination
- Search functionality
- JOIN query performance

---

## Security Considerations

1. **Authentication**: All endpoints require admin SETUP_TOKEN
2. **Rate Limiting**: Prevent abuse of batch operations
3. **Audit Logging**: All operations must be logged
4. **Transaction Safety**: Batch operations must be atomic
5. **Input Validation**: Validate UUID format, email format, reason length

---

## Database Indexes

Required indexes for performance:

```sql
-- For user listing
CREATE INDEX IF NOT EXISTS idx_uuid_bindings_email_updated 
ON uuid_bindings(bound_email, updated_at DESC);

-- For status filtering
CREATE INDEX IF NOT EXISTS idx_uuid_bindings_status 
ON uuid_bindings(status);

-- For card lookup
CREATE INDEX IF NOT EXISTS idx_uuid_bindings_uuid 
ON uuid_bindings(uuid);
```

---

## Audit Events

New audit event types:

| Event Type | Description | Actor | Target |
|------------|-------------|-------|--------|
| `admin_card_revoke` | Single card revoked | Admin | UUID |
| `admin_email_revoke` | All cards revoked for email | Admin | Email |
| `admin_card_unbind` | UUID unbound (quarantine) | Admin | UUID |
| `admin_user_view` | Admin viewed user cards | Admin | Email |

---

## Frontend Integration (Future)

### User Management Tab

**Components**:
1. User List Table
   - Email
   - Total/Active/Revoked cards
   - Last activity
   - Actions (View, Revoke All)

2. User Detail Modal
   - 3 card slots (Official, Temporary, Event)
   - Card status badges
   - Revoke/Unbind buttons

3. Confirmation Dialogs
   - Revoke single card
   - Revoke all cards
   - Unbind card

**Estimated Time**: 2-3 hours

---

## Total Effort Estimate

| Phase | Backend | Frontend | Testing | Total |
|-------|---------|----------|---------|-------|
| 3.1 Revocation | 1.5h | - | 0.5h | 2h |
| 3.2 Unbinding | 1h | - | 0.5h | 1.5h |
| 3.3 User Mgmt | 1.5h | 2.5h | 1h | 5h |
| **Total** | **4h** | **2.5h** | **2h** | **8.5h** |

---

## Next Steps

1. ✅ Design documentation complete
2. ⏳ Implement Phase 3.1 (Revocation APIs)
3. ⏳ Implement Phase 3.2 (Unbinding API)
4. ⏳ Implement Phase 3.3 (User Management APIs)
5. ⏳ Frontend integration
6. ⏳ End-to-end testing

---

**Status**: Ready for implementation  
**Start Date**: 2026-01-19  
**Target Completion**: 2026-01-20
