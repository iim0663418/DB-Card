# BDD Specification: Session Budget (Total Quantity Limits)

**Feature**: Session Budget Management  
**Version**: v4.2.0  
**Status**: Draft  
**Created**: 2026-01-20

## Background

基於外部研究（Dropbox, PayPal, K-Factor theory），實作業界主流的總量限制機制：
- ✅ 總量限制（max_total_sessions）
- ✅ 每日限制（max_sessions_per_day）
- ✅ 每月限制（max_sessions_per_month）
- ✅ 軟性警告機制（90% 閾值）
- ❌ 不實作傳遞深度限制（無業界先例）

## Policy Definition

```typescript
personal: {
  max_total_sessions: 1000,
  max_sessions_per_day: 10,
  max_sessions_per_month: 100,
  warning_threshold: 0.9  // 90%
}

event_booth: {
  max_total_sessions: 5000,
  max_sessions_per_day: 50,
  max_sessions_per_month: 500,
  warning_threshold: 0.9
}

sensitive: {
  max_total_sessions: 100,
  max_sessions_per_day: 3,
  max_sessions_per_month: 30,
  warning_threshold: 0.8  // 80%
}
```

---

## Scenario 1: Normal Session Creation (Under Budget)

**Given**:
- Card type: `personal`
- `total_sessions` = 50
- `daily_sessions` = 2
- `monthly_sessions` = 20
- Policy: max_total = 1000, max_daily = 10, max_monthly = 100

**When**:
- POST /api/nfc/tap with valid card_uuid

**Then**:
- HTTP 200 OK
- Response includes:
  ```json
  {
    "success": true,
    "data": {
      "session_id": "xxx",
      "expires_at": 1234567890,
      "max_reads": 20,
      "reads_used": 0,
      "reused": false
    }
  }
  ```
- `total_sessions` incremented to 51
- `daily_sessions` incremented to 3
- `monthly_sessions` incremented to 21
- No warning message

---

## Scenario 2: Approaching Total Budget (Soft Warning)

**Given**:
- Card type: `personal`
- `total_sessions` = 900
- Policy: max_total = 1000, warning_threshold = 0.9

**When**:
- POST /api/nfc/tap with valid card_uuid

**Then**:
- HTTP 200 OK
- Response includes:
  ```json
  {
    "success": true,
    "data": {
      "session_id": "xxx",
      "expires_at": 1234567890,
      "max_reads": 20,
      "reads_used": 0,
      "reused": false,
      "warning": {
        "type": "approaching_budget_limit",
        "message": "此名片即將達到使用上限",
        "remaining": 99,
        "max_total": 1000
      }
    }
  }
  ```
- `total_sessions` incremented to 901
- Session created successfully

---

## Scenario 3: Total Budget Exceeded (Hard Limit)

**Given**:
- Card type: `personal`
- `total_sessions` = 1000
- Policy: max_total = 1000

**When**:
- POST /api/nfc/tap with valid card_uuid

**Then**:
- HTTP 403 Forbidden
- Response:
  ```json
  {
    "success": false,
    "error": {
      "code": "session_budget_exceeded",
      "message": "此名片已達到使用上限，請聯絡管理員",
      "details": {
        "total_sessions": 1000,
        "max_total_sessions": 1000
      }
    }
  }
  ```
- `total_sessions` NOT incremented
- No session created

---

## Scenario 4: Daily Budget Exceeded

**Given**:
- Card type: `personal`
- `total_sessions` = 50
- `daily_sessions` = 10
- Policy: max_daily = 10

**When**:
- POST /api/nfc/tap with valid card_uuid

**Then**:
- HTTP 429 Too Many Requests
- Response:
  ```json
  {
    "success": false,
    "error": {
      "code": "daily_budget_exceeded",
      "message": "今日使用次數已達上限",
      "details": {
        "daily_sessions": 10,
        "max_sessions_per_day": 10,
        "retry_after": "2026-01-21T00:00:00Z"
      }
    }
  }
  ```
- `total_sessions` NOT incremented
- No session created

---

## Scenario 5: Monthly Budget Exceeded

**Given**:
- Card type: `personal`
- `total_sessions` = 50
- `daily_sessions` = 2
- `monthly_sessions` = 100
- Policy: max_monthly = 100

**When**:
- POST /api/nfc/tap with valid card_uuid

**Then**:
- HTTP 429 Too Many Requests
- Response:
  ```json
  {
    "success": false,
    "error": {
      "code": "monthly_budget_exceeded",
      "message": "本月使用次數已達上限",
      "details": {
        "monthly_sessions": 100,
        "max_sessions_per_month": 100,
        "retry_after": "2026-02-01T00:00:00Z"
      }
    }
  }
  ```
- `total_sessions` NOT incremented
- No session created

---

## Scenario 6: Dedup Bypasses Budget Check

**Given**:
- Card type: `personal`
- `total_sessions` = 1000 (at limit)
- Dedup key exists (within 60s)

**When**:
- POST /api/nfc/tap with same card_uuid (within 60s)

**Then**:
- HTTP 200 OK
- Response includes:
  ```json
  {
    "success": true,
    "data": {
      "session_id": "xxx",
      "expires_at": 1234567890,
      "max_reads": 20,
      "reads_used": 0,
      "reused": true
    }
  }
  ```
- `total_sessions` NOT incremented (dedup hit)
- Returns existing session

**Rationale**: Dedup 在 Budget Check 之前執行，避免重複計數

---

## Scenario 7: Sensitive Card (Lower Limits)

**Given**:
- Card type: `sensitive`
- `total_sessions` = 80
- Policy: max_total = 100, warning_threshold = 0.8

**When**:
- POST /api/nfc/tap with valid card_uuid

**Then**:
- HTTP 200 OK
- Response includes warning (80% threshold):
  ```json
  {
    "success": true,
    "data": {
      "session_id": "xxx",
      "warning": {
        "type": "approaching_budget_limit",
        "message": "此名片即將達到使用上限",
        "remaining": 19,
        "max_total": 100
      }
    }
  }
  ```
- Warning appears earlier (80% vs 90%)

---

## Scenario 8: Event Booth Card (Higher Limits)

**Given**:
- Card type: `event_booth`
- `total_sessions` = 4500
- Policy: max_total = 5000, warning_threshold = 0.9

**When**:
- POST /api/nfc/tap with valid card_uuid

**Then**:
- HTTP 200 OK
- Response includes warning (90% threshold):
  ```json
  {
    "success": true,
    "data": {
      "session_id": "xxx",
      "warning": {
        "type": "approaching_budget_limit",
        "message": "此名片即將達到使用上限",
        "remaining": 499,
        "max_total": 5000
      }
    }
  }
  ```
- Higher limits for event scenarios

---

## Scenario 9: Budget Check After Rate Limit

**Given**:
- Card type: `personal`
- `total_sessions` = 1000 (at limit)
- Rate limit NOT exceeded

**When**:
- POST /api/nfc/tap with valid card_uuid

**Then**:
- HTTP 403 Forbidden (Budget Check fails)
- Rate limit check passed but budget check failed
- Execution order:
  1. Step 0: Basic Validation ✅
  2. Step 1: Dedup Check ✅
  3. Step 2: Rate Limit Check ✅
  4. **Step 2.5: Budget Check ❌ (403)**
  5. Step 3-5: Not executed

---

## Scenario 10: Admin Reset Budget (Future)

**Given**:
- Card type: `personal`
- `total_sessions` = 1000 (at limit)

**When**:
- Admin calls POST /api/admin/cards/:uuid/reset-budget

**Then**:
- HTTP 200 OK
- `total_sessions` reset to 0
- Daily/monthly counters cleared
- Response:
  ```json
  {
    "success": true,
    "data": {
      "card_uuid": "xxx",
      "total_sessions": 0,
      "reset_at": "2026-01-20T14:50:00Z"
    }
  }
  ```

**Note**: 此功能為 v4.2.1 規劃，v4.2.0 不實作

---

## Technical Implementation

### Execution Order (Updated)

```
Step 0: Basic Validation → 400
Step 1: Dedup Check → 200 (reused: true, bypass budget)
Step 2: Rate Limit Check → 429
Step 2.5: Budget Check (NEW) → 403/429
Step 3: Card Validation → 404/403
Step 4: Retap Revocation
Step 5: Create Session + Increment Budget
```

### Database Schema

```sql
-- Migration 0010
ALTER TABLE cards ADD COLUMN total_sessions INTEGER DEFAULT 0;
CREATE INDEX idx_cards_total_sessions ON cards(total_sessions);
```

### KV Keys

```typescript
// Daily counter
session:budget:${card_uuid}:daily:${YYYYMMDD} → number (TTL: 86400s)

// Monthly counter
session:budget:${card_uuid}:monthly:${YYYYMM} → number (TTL: 2678400s)
```

### New Files

- `workers/src/utils/session-budget.ts` - Budget check and increment
- `workers/migrations/0010_session_budget.sql` - Database migration

### Modified Files

- `workers/src/handlers/tap.ts` - Add Step 2.5
- `workers/src/utils/policy.ts` - Add budget limits
- `workers/src/types.ts` - Add budget types

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `session_budget_exceeded` | 403 | Total budget reached |
| `daily_budget_exceeded` | 429 | Daily limit reached |
| `monthly_budget_exceeded` | 429 | Monthly limit reached |

## Warning Types

| Type | Threshold | Description |
|------|-----------|-------------|
| `approaching_budget_limit` | 90% (personal/event) | Near total limit |
| `approaching_budget_limit` | 80% (sensitive) | Near total limit |

---

## Acceptance Criteria

- [ ] All 10 scenarios pass
- [ ] TypeScript compilation passes
- [ ] Database migration applied
- [ ] KV counters work correctly
- [ ] Warning messages display correctly
- [ ] Budget increments are atomic
- [ ] Dedup bypasses budget check
- [ ] Rate limit checked before budget
- [ ] Different policies for card types
- [ ] Error messages are user-friendly

---

**Total Scenarios**: 10  
**Priority**: P0  
**Estimated Effort**: 4-6 hours
