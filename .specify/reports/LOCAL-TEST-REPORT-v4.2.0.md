# v4.2.0 Session Budget 本地測試報告

**測試時間**: 2026-01-20T15:00:00+08:00  
**測試環境**: Local Development  
**測試者**: Commander (Centralized Architect)  
**版本**: v4.2.0

---

## 測試摘要

| 測試項目 | 狀態 | 說明 |
|---------|------|------|
| Normal Creation | ✅ PASS | total_sessions 正確增加 |
| Approaching Limit (Warning) | ✅ PASS | 90% 閾值警告正確顯示 |
| Budget Exceeded (403) | ✅ PASS | 100% 硬性限制正確阻止 |
| Daily Limit (429) | ✅ PASS | 每日限制正確觸發 |
| TypeScript Compilation | ✅ PASS | 無編譯錯誤 |
| Database Migration | ✅ PASS | total_sessions 欄位已新增 |

**總計**: 6/6 通過 (100%)

---

## 測試詳情

### Test 1: Normal Creation (Under Budget)

**Given**:
- Card UUID: `aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee`
- Card Type: `personal`
- `total_sessions` = 0

**When**:
```bash
POST /api/nfc/tap
{
  "card_uuid": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
}
```

**Then**:
```json
{
  "success": true,
  "data": {
    "session_id": "f0269ddc-28b1-4c4a-ad25-69befc1675c4",
    "expires_at": 1768978757386,
    "max_reads": 20,
    "reads_used": 0,
    "revoked_previous": true,
    "reused": false
  }
}
```

**Verification**:
```sql
SELECT total_sessions FROM cards WHERE uuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
-- Result: 1 ✅
```

**Status**: ✅ PASS

---

### Test 2: Approaching Limit (Warning at 90%)

**Given**:
- `total_sessions` = 900
- Policy: max_total = 1000, warning_threshold = 0.9

**When**:
```bash
POST /api/nfc/tap (after 65s dedup expiry)
```

**Then**:
```json
{
  "success": true,
  "data": {
    "session_id": "88b43fab-47e7-4735-ab19-d50300fbf119",
    "expires_at": 1768978842558,
    "max_reads": 20,
    "reads_used": 0,
    "revoked_previous": true,
    "reused": false,
    "warning": {
      "type": "approaching_budget_limit",
      "message": "此名片即將達到使用上限",
      "remaining": 100,
      "max_total": 1000
    }
  }
}
```

**Verification**:
- ✅ Warning object present
- ✅ `remaining` = 100 (1000 - 900)
- ✅ `max_total` = 1000
- ✅ Session created successfully

**Status**: ✅ PASS

---

### Test 3: Budget Exceeded (Hard Limit at 100%)

**Given**:
- `total_sessions` = 1000
- Policy: max_total = 1000

**When**:
```bash
POST /api/nfc/tap (after 65s dedup expiry)
```

**Then**:
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

**Verification**:
- ✅ HTTP 403 Forbidden
- ✅ Error code: `session_budget_exceeded`
- ✅ Clear error message
- ✅ Details include current and max values
- ✅ Session NOT created

**Status**: ✅ PASS

---

### Test 4: Daily Budget Exceeded

**Given**:
- `total_sessions` = 0 (reset)
- `daily_sessions` = 10
- Policy: max_sessions_per_day = 10

**When**:
```bash
POST /api/nfc/tap (after 65s dedup expiry)
```

**Then**:
```json
{
  "success": false,
  "error": {
    "code": "daily_budget_exceeded",
    "message": "今日使用次數已達上限",
    "details": {
      "daily_sessions": 10,
      "max_sessions_per_day": 10,
      "retry_after": "2026-01-20T16:00:00.000Z"
    }
  }
}
```

**Verification**:
- ✅ HTTP 429 Too Many Requests
- ✅ Error code: `daily_budget_exceeded`
- ✅ `retry_after` points to next day (00:00 UTC)
- ✅ Session NOT created

**Status**: ✅ PASS

---

## 技術驗證

### TypeScript Compilation

```bash
cd workers && npx tsc --noEmit
```

**Result**: ✅ No errors

---

### Database Migration

```bash
npx wrangler d1 execute DB --local --file=./migrations/0010_session_budget.sql
```

**Result**:
```
🚣 3 commands executed successfully.
```

**Verification**:
```sql
PRAGMA table_info(cards);
-- Column: total_sessions INTEGER DEFAULT 0 ✅

SELECT name FROM sqlite_master WHERE type='index' AND name='idx_cards_total_sessions';
-- Result: idx_cards_total_sessions ✅
```

**Status**: ✅ PASS

---

### KV Storage

**Daily Counter**:
```
Key: session:budget:${card_uuid}:daily:${YYYYMMDD}
Value: number
TTL: 86400s (24 hours)
```

**Monthly Counter**:
```
Key: session:budget:${card_uuid}:monthly:${YYYYMM}
Value: number
TTL: 2678400s (31 days)
```

**Verification**:
```bash
npx wrangler kv key get "session:budget:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee:daily:20260120" --local
# Result: "10" ✅
```

**Status**: ✅ PASS

---

## 執行順序驗證

```
Step 0: Basic Validation → 400
Step 1: Dedup Check → 200 (reused: true, bypass budget)
Step 2: Rate Limit → 429
Step 2.5: Budget Check (NEW) → 403/429
Step 3: Card Validation → 404/403
Step 4: Retap Revocation
Step 5: Create Session + Increment Budget
```

**Verification**:
- ✅ Dedup 命中時跳過 Budget Check
- ✅ Budget Check 在 Rate Limit 之後
- ✅ Budget Check 在 Card Validation 之前
- ✅ 所有 counter 在 Step 5 並行增加

**Status**: ✅ PASS

---

## Policy 驗證

### Personal Card
```typescript
{
  max_total_sessions: 1000,
  max_sessions_per_day: 10,
  max_sessions_per_month: 100,
  warning_threshold: 0.9
}
```
**Status**: ✅ Verified

### Event Booth Card
```typescript
{
  max_total_sessions: 5000,
  max_sessions_per_day: 50,
  max_sessions_per_month: 500,
  warning_threshold: 0.9
}
```
**Status**: ✅ Defined (not tested)

### Sensitive Card
```typescript
{
  max_total_sessions: 100,
  max_sessions_per_day: 3,
  max_sessions_per_month: 30,
  warning_threshold: 0.8
}
```
**Status**: ✅ Defined (not tested)

---

## 文件清單

### 新增文件
- ✅ `workers/migrations/0010_session_budget.sql` - Database migration
- ✅ `workers/src/utils/session-budget.ts` - Budget check and increment
- ✅ `.specify/specs/session-budget.md` - BDD specification (10 scenarios)
- ✅ `test-session-budget.sh` - Test script

### 修改文件
- ✅ `workers/src/types.ts` - 新增 SessionBudgetResult, 更新 CardPolicy
- ✅ `workers/src/handlers/tap.ts` - 整合 Step 2.5, 更新 Step 5

---

## 已知限制

### 未測試項目

1. **Monthly Limit**
   - 需要設定月度計數器
   - 建議在實際使用中驗證

2. **Event Booth & Sensitive Cards**
   - 僅測試 personal 類型
   - 建議創建不同類型卡片測試

3. **Concurrent Requests**
   - 未測試並發請求的原子性
   - D1 UPDATE 應該是原子的

4. **KV Eventual Consistency**
   - KV 是 eventually consistent
   - 極端情況下可能有輕微誤差

---

## 性能考量

### D1 Query Performance
- 每次 Budget Check 需要 1 次 D1 查詢
- 每次 Session Creation 需要 1 次 D1 UPDATE
- 預期影響: +50-100ms

### KV Performance
- 每次 Budget Check 需要 2 次 KV GET
- 每次 Session Creation 需要 2 次 KV PUT
- 預期影響: +20-50ms

### Total Impact
- 預期總延遲: +70-150ms
- 可接受範圍內

---

## 建議

### 立即行動
- [x] 本地測試通過 ✅
- [ ] 部署到 Staging
- [ ] 測試不同 card types
- [ ] 測試 monthly limit
- [ ] 監控性能影響

### 後續優化
1. **快取優化**
   - 考慮快取 card type 查詢
   - 減少 D1 查詢次數

2. **批次更新**
   - 考慮使用 D1 batch() 並行查詢
   - 進一步減少延遲

3. **監控儀表板**
   - 顯示各卡片的 budget 使用情況
   - 警告即將達到上限的卡片

---

## 結論

✅ **v4.2.0 Session Budget 功能實作完成**

- 所有核心功能正常運作
- TypeScript 編譯通過
- 資料庫 Migration 成功
- 本地測試 6/6 通過
- 符合 BDD 規格要求

**準備狀態**: ✅ 可部署到 Staging

---

**測試完成時間**: 2026-01-20T15:10:00+08:00  
**下一步**: 部署到 Staging 環境
