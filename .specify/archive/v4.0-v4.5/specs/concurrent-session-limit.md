# BDD Spec: Concurrent Session Limit

## Feature
限制單張名片同時存在的 active session 數量

## Background
- NFC 卡片只寫入 `uuid=XXX`
- 每個訪問者開啟時自動 tap 創建 session
- 需要限制同時存在的 active session 數量（而非累計讀取次數）

## Terminology Change
- `max_reads` → `max_concurrent_sessions`
- `reads_used` → 移除（不再需要）

## Policy Definition

```typescript
export const CARD_POLICIES: Record<CardType, CardPolicy> = {
  personal: {
    ttl: 24 * 60 * 60 * 1000,  // 24 hours
    max_concurrent_sessions: 20,  // 最多 20 個同時存在的 session
    scope: 'public'
  },
  event_booth: {
    ttl: 24 * 60 * 60 * 1000,
    max_concurrent_sessions: 50,
    scope: 'public'
  },
  sensitive: {
    ttl: 24 * 60 * 60 * 1000,
    max_concurrent_sessions: 5,
    scope: 'public'
  }
};
```

## Scenario 1: 創建 session 時檢查並發數量

**Given**: 
- Card `uuid-123` 類型為 `personal` (max_concurrent_sessions = 20)
- 當前有 19 個 active sessions (未過期、未撤銷)

**When**: 
- 使用者 A 訪問 `?uuid=uuid-123`
- 前端自動 `POST /api/nfc/tap`

**Then**:
- 查詢 active sessions 數量 = 19
- 19 < 20 → 允許創建
- 創建新 session_A
- 回傳 `{ session_id, expires_at, active_sessions: 20 }`

## Scenario 2: 達到並發上限時撤銷最舊的 session (FIFO)

**Given**: 
- Card `uuid-123` 類型為 `personal` (max_concurrent_sessions = 20)
- 當前有 20 個 active sessions (已滿)
- 最舊的 session 是 `session-old` (issued_at = 1小時前)

**When**: 
- 使用者 B 訪問 `?uuid=uuid-123`
- 前端自動 `POST /api/nfc/tap`

**Then**:
- 查詢 active sessions 數量 = 20
- 20 >= 20 → 達到上限
- 撤銷最舊的 `session-old` (revoked_reason = 'concurrent_limit')
- 創建新 session_B
- 回傳 `{ session_id, expires_at, active_sessions: 20, revoked_oldest: true }`

## Scenario 3: 被撤銷的 session 無法繼續讀取

**Given**: 
- `session-old` 已被撤銷 (revoked_reason = 'concurrent_limit')

**When**: 
- 使用者嘗試 `GET /api/read?uuid=uuid-123&session=session-old`

**Then**:
- 驗證 session 失敗
- 回傳 `403 session_revoked`
- 錯誤訊息：「此授權已失效（已達同時訪問上限），請重新整理頁面」

## Scenario 4: Session 過期自動釋放名額

**Given**: 
- Card `uuid-123` 有 20 個 active sessions
- 其中 5 個 session 已過期 (expires_at < now)

**When**: 
- 使用者訪問 `?uuid=uuid-123`
- 前端自動 `POST /api/nfc/tap`

**Then**:
- 查詢 active sessions 數量（排除已過期）= 15
- 15 < 20 → 允許創建
- 創建新 session
- 回傳 `{ session_id, expires_at, active_sessions: 16 }`

## Scenario 5: Sensitive 類型嚴格限制

**Given**: 
- Card `uuid-sensitive` 類型為 `sensitive` (max_concurrent_sessions = 5)
- 當前有 5 個 active sessions

**When**: 
- 使用者 F 訪問 `?uuid=uuid-sensitive`

**Then**:
- 查詢 active sessions 數量 = 5
- 5 >= 5 → 達到上限
- 撤銷最舊的 session
- 創建新 session_F
- 回傳 `{ session_id, expires_at, active_sessions: 5, revoked_oldest: true }`

## Implementation Changes

### 1. Database Schema (Migration)
```sql
-- 移除 reads_used 欄位（不再需要）
ALTER TABLE read_sessions DROP COLUMN reads_used;
ALTER TABLE read_sessions DROP COLUMN max_reads;

-- 添加索引優化查詢
CREATE INDEX IF NOT EXISTS idx_sessions_active 
ON read_sessions(card_uuid, expires_at, revoked_at);
```

### 2. Types (types.ts)
```typescript
export interface ReadSession {
  session_id: string;
  card_uuid: string;
  issued_at: number;
  expires_at: number;
  revoked_at?: number;
  revoked_reason?: 'retap' | 'admin' | 'emergency' | 'card_updated' | 'card_deleted' | 'concurrent_limit';
  policy_version?: string;
  token_version: number;
}

export interface CardPolicy {
  ttl: number;
  max_concurrent_sessions: number;  // 改名
  scope: 'public' | 'private';
}
```

### 3. Session Utils (utils/session.ts)
```typescript
/**
 * Get count of active sessions for a card
 */
export async function getActiveSessionCount(
  env: Env,
  card_uuid: string
): Promise<number> {
  const now = Date.now();
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM read_sessions
    WHERE card_uuid = ?
      AND expires_at > ?
      AND revoked_at IS NULL
  `).bind(card_uuid, now).first<{ count: number }>();

  return result?.count || 0;
}

/**
 * Revoke oldest session for a card
 */
export async function revokeOldestSession(
  env: Env,
  card_uuid: string
): Promise<string | null> {
  const now = Date.now();
  
  // Find oldest active session
  const oldest = await env.DB.prepare(`
    SELECT session_id
    FROM read_sessions
    WHERE card_uuid = ?
      AND expires_at > ?
      AND revoked_at IS NULL
    ORDER BY issued_at ASC
    LIMIT 1
  `).bind(card_uuid, now).first<{ session_id: string }>();

  if (!oldest) return null;

  // Revoke it
  await revokeSession(env, oldest.session_id, 'concurrent_limit');
  
  return oldest.session_id;
}
```

### 4. Tap Handler (handlers/tap.ts)
```typescript
// After card validation, before creating session:

const policy = getPolicy(cardType);
const activeCount = await getActiveSessionCount(env, card_uuid);

let revoked_oldest = false;
let revoked_session_id: string | null = null;

if (activeCount >= policy.max_concurrent_sessions) {
  revoked_session_id = await revokeOldestSession(env, card_uuid);
  revoked_oldest = true;
  
  ctx.waitUntil(logEvent(env, 'revoke', request, card_uuid, revoked_session_id || undefined, {
    reason: 'concurrent_limit',
    active_count: activeCount
  }));
}

const newSession = await createSession(env, card_uuid, cardType);

return jsonResponse({
  session_id: newSession.session_id,
  expires_at: newSession.expires_at,
  active_sessions: activeCount >= policy.max_concurrent_sessions ? activeCount : activeCount + 1,
  revoked_oldest
}, 200, request);
```

### 5. Read Handler (handlers/read.ts)
```typescript
// Remove reads_used validation
// Only check: expires_at, revoked_at

function validateSession(session: ReadSession | null): SessionValidation {
  if (!session) {
    return {
      valid: false,
      reason: 'session_not_found',
      message: 'Session 不存在'
    };
  }

  const now = Date.now();

  // Check expiration
  if (session.expires_at <= now) {
    return {
      valid: false,
      reason: 'session_expired',
      message: '授權已過期（24 小時）'
    };
  }

  // Check revocation
  if (session.revoked_at) {
    const message = session.revoked_reason === 'concurrent_limit'
      ? '此授權已失效（已達同時訪問上限），請重新整理頁面'
      : '此授權已被撤銷';
    
    return {
      valid: false,
      reason: 'session_revoked',
      message
    };
  }

  return { valid: true };
}

// Remove reads_used increment
// Remove reads_remaining calculation
```

### 6. Frontend (main.js)
```javascript
// Remove ATTEMPTS_REMAINING display
// Update error message for concurrent_limit

if (errorMsg.includes('concurrent_limit') || errorMsg.includes('同時訪問上限')) {
    showError('已達同時訪問人數上限，請重新整理頁面取得新授權');
}
```

## Benefits

✅ **符合實際使用情境**：分享 `?uuid=XXX` 時自動限制並發數
✅ **FIFO 策略**：最舊的訪問者被踢出，最新的訪問者可進入
✅ **自動釋放**：過期 session 自動釋放名額
✅ **語意清晰**：「最多 20 人同時查看」比「最多讀取 20 次」更直觀

## Trade-offs

⚠️ **最舊訪問者會被踢出**：當達到上限時，FIFO 策略會撤銷最舊的 session
⚠️ **需要額外查詢**：每次 tap 需要 COUNT 查詢 + 可能的 revoke 操作
⚠️ **Breaking Change**：需要 migration 移除 reads_used 欄位

## Alternative: LRU Strategy

如果希望「最少使用的被踢出」而非「最舊的被踢出」：
- 需要追蹤每個 session 的 `last_read_at`
- 撤銷 `last_read_at` 最舊的 session
- 更複雜但更公平
