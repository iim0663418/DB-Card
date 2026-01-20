# BDD Spec: NFC Tap API - Deduplication & Rate Limiting

## Feature: Multi-Layer Defense for NFC Tap API

### Background
- System: DB-Card NFC Digital Business Card
- Endpoint: POST /api/nfc/tap
- Purpose: Prevent crawler/bot abuse while maintaining UX for legitimate sharing

### Design Principles
- Multi-layer defense (dedup → rate limit → validation)
- Dedup does NOT bypass for admin/portal
- Tolerate minor inaccuracy in Phase 1 (KV-based counting)
- 60s dedup window (both anti-crawler burst AND accidental retap)

---

## Scenario 1: First Tap - Success Path
**Given:**
- Valid card_uuid exists in database
- Card is not revoked
- No existing dedup entry in KV
- Rate limits not exceeded

**When:**
- Client sends POST /api/nfc/tap with card_uuid

**Then:**
- System creates new ReadSession
- System stores dedup entry (TTL: 60s)
- System increments rate limit counters (card + IP)
- Response: 200 OK with session_id and reused: false

---

## Scenario 2: Duplicate Tap Within 60s - Dedup Hit
**Given:**
- Valid card_uuid with existing dedup entry (session_123)
- Dedup entry created 30 seconds ago
- Original session still valid

**When:**
- Client sends POST /api/nfc/tap with same card_uuid

**Then:**
- System retrieves existing session_id from dedup KV
- System does NOT create new session
- System does NOT increment rate limit counters
- Response: 200 OK with session_id: session_123 and reused: true

---

## Scenario 3: Rate Limit Exceeded - Card UUID Dimension (Minute)
**Given:**
- Valid card_uuid
- Card UUID has been tapped 10 times in last 60 seconds
- No dedup entry (or expired)

**When:**
- Client sends POST /api/nfc/tap with same card_uuid (11th request)

**Then:**
- System checks rate limit before creating session
- Response: 429 Too Many Requests
- Error body includes:
  - error: "rate_limited"
  - message: "請求過於頻繁，請稍後再試"
  - retry_after: <seconds until window reset>
  - limit_scope: "card_uuid"
  - window: "minute"
  - limit: 10
  - current: 11

---

## Scenario 4: Rate Limit Exceeded - IP Dimension (Hour)
**Given:**
- Valid card_uuid
- Client IP has made 50 tap requests in last hour
- No dedup entry

**When:**
- Client sends POST /api/nfc/tap (51st request from this IP)

**Then:**
- System checks IP rate limit
- Response: 429 Too Many Requests
- Error body includes:
  - limit_scope: "ip"
  - window: "hour"
  - limit: 50
  - current: 51

---

## Scenario 5: Dedup Expired - New Session Created
**Given:**
- Valid card_uuid
- Dedup entry existed but expired (>60s ago)
- Rate limits not exceeded

**When:**
- Client sends POST /api/nfc/tap

**Then:**
- System finds no dedup entry (expired)
- System creates NEW session
- System stores new dedup entry
- System increments rate limit counters
- Response: 200 OK with new session_id and reused: false

---

## Scenario 6: Invalid Card UUID - Validation Failure
**Given:**
- card_uuid does not exist in database
- No dedup entry
- Rate limits not exceeded

**When:**
- Client sends POST /api/nfc/tap with invalid card_uuid

**Then:**
- System passes dedup check (no entry)
- System passes rate limit check
- System fails at card validation
- Response: 404 Not Found
- Error: "card_not_found"

---

## Scenario 7: Revoked Card - Access Denied
**Given:**
- Valid card_uuid exists
- Card is revoked (uuid_bindings.revoked_at IS NOT NULL)
- No dedup entry

**When:**
- Client sends POST /api/nfc/tap

**Then:**
- System passes dedup and rate limit checks
- System fails at card validation (revoked status)
- Response: 403 Forbidden
- Error: "card_revoked"

---

## Scenario 8: Retap Revocation - Old Session Revoked
**Given:**
- Valid card_uuid
- Existing session created 5 minutes ago with reads_used = 1
- No dedup entry (expired)
- Rate limits not exceeded

**When:**
- Client sends POST /api/nfc/tap (retap)

**Then:**
- System creates new session
- System revokes old session (shouldRevoke returns true)
- System stores new dedup entry
- Response: 200 OK with new session_id

---

## Scenario 9: Admin Portal "查看" - No Bypass
**Given:**
- Admin user in portal clicks "查看" button
- Portal calls POST /api/nfc/tap with card_uuid
- Dedup entry exists from 30s ago

**When:**
- Portal sends tap request

**Then:**
- System treats it as normal tap (no bypass)
- System returns existing session from dedup
- Response: 200 OK with reused: true
- Portal opens card-display.html?uuid=XXX&session=YYY

---

## Scenario 10: Share URL Without Session - Auto Tap
**Given:**
- User shares URL: card-display.html?uuid=XXX (no session param)
- Recipient opens URL in browser
- No dedup entry for this card_uuid

**When:**
- Frontend detects missing session param
- Frontend auto-calls tapCard() API

**Then:**
- System creates new session
- System stores dedup entry
- Frontend receives session_id
- Frontend updates URL to include session param

---

## Scenario 11: IP Extraction Priority
**Given:**
- Request with multiple IP headers:
  - CF-Connecting-IP: 1.2.3.4
  - X-Forwarded-For: 5.6.7.8, 9.10.11.12

**When:**
- System extracts client IP for rate limiting

**Then:**
- System uses CF-Connecting-IP (1.2.3.4) as priority
- If CF-Connecting-IP missing, use first IP from X-Forwarded-For
- If both missing, use "unknown"

---

## Technical Specifications

### KV Key Structures

```typescript
// Dedup
Key: `tap:dedup:${card_uuid}`
Value: session_id (string)
TTL: 60 seconds

// Rate Limit - Card UUID
Key: `ratelimit:card:${card_uuid}:minute`
Value: { count: number, first_seen_at: number }
TTL: 120 seconds (2x window for safety)

Key: `ratelimit:card:${card_uuid}:hour`
Value: { count: number, first_seen_at: number }
TTL: 7200 seconds (2x window)

// Rate Limit - IP
Key: `ratelimit:ip:${ip}:minute`
Value: { count: number, first_seen_at: number }
TTL: 120 seconds

Key: `ratelimit:ip:${ip}:hour`
Value: { count: number, first_seen_at: number }
TTL: 7200 seconds
```

### Rate Limit Configuration

```typescript
const RATE_LIMITS = {
  card_uuid: {
    minute: 10,
    hour: 50
  },
  ip: {
    minute: 10,
    hour: 50
  }
};
```

### Error Response Format

```typescript
{
  error: "rate_limited",
  message: "請求過於頻繁，請稍後再試",
  retry_after: 37,        // seconds
  limit_scope: "card_uuid" | "ip",
  window: "minute" | "hour",
  limit: 10,
  current: 11
}
```

### Execution Order

```
Step 0: Basic validation (method, params, UUID format) → 400
Step 1: Dedup check → if hit, return existing session (skip all below)
Step 2: Rate limit (4 checks: card minute/hour, IP minute/hour) → 429
Step 3: Validate card (existence, revoked status) → 404/403
Step 4: Retap revocation (existing logic)
Step 5: Create session + store dedup + increment counters → 200
```

---

## Acceptance Criteria

### Functional Requirements
- ✅ Dedup prevents duplicate sessions within 60s
- ✅ Rate limit enforces 10/min, 50/hour per card_uuid
- ✅ Rate limit enforces 10/min, 50/hour per IP
- ✅ Admin/portal does NOT bypass dedup
- ✅ Retap revocation still works
- ✅ Max reads validation preserved

### Non-Functional Requirements
- ✅ Response time: <500ms (P95)
- ✅ KV operations: atomic per key
- ✅ Error messages: user-friendly with retry guidance
- ✅ IP extraction: CF-Connecting-IP priority

### Security Requirements
- ✅ IP anonymization in audit logs (first 3 octets)
- ✅ Rate limit counters cannot be bypassed
- ✅ Dedup keys expire automatically (TTL)

---

## Out of Scope (Phase 2 - P1)
- ❌ Layer 4: 24h Session Budget
- ❌ Layer 5: Active Session Cap
- ❌ Force New mechanism (`?mode=force_new`)
- ❌ Dynamic rate limits by card_type
- ❌ Frontend sessionStorage caching
