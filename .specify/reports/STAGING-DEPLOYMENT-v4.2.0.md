# v4.2.0 Staging 部署報告

## 部署資訊

**部署時間**: 2026-01-20T15:08:00+08:00  
**版本**: v4.2.0  
**環境**: Staging  
**部署 ID**: 5a37218c-d286-4bb4-abc5-a89106a198ac  
**URL**: https://db-card-staging.csw30454.workers.dev  
**Git Commit**: 714dc9d

---

## 部署內容

### 新增功能
- ✅ Session Budget (總量限制)
  - Total limit: personal 1000, event_booth 5000, sensitive 100
  - Daily limit: personal 10, event_booth 50, sensitive 3
  - Monthly limit: personal 100, event_booth 500, sensitive 30
- ✅ 軟性警告機制 (90%/80% 閾值)
- ✅ Step 2.5 Budget Check
- ✅ Migration 0010: total_sessions 欄位

### 新增文件
- `workers/src/utils/session-budget.ts` - Budget check and increment
- `workers/migrations/0010_session_budget.sql` - Database migration

### 修改文件
- `workers/src/handlers/tap.ts` - 整合 Step 2.5 Budget Check
- `workers/src/types.ts` - 新增 SessionBudgetResult interface
- `workers/package.json` - 版本更新至 4.2.0

---

## 部署驗證

### 1. Health Check ✅

**請求**:
```bash
curl https://db-card-staging.csw30454.workers.dev/health
```

**回應**:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "kek": "configured",
    "kek_version": 4,
    "active_cards": 5,
    "environment": "staging",
    "timestamp": 1768892885212
  }
}
```

**驗證**: ✅ 服務正常運行

---

### 2. Database Migration ✅

**執行**:
```bash
npx wrangler d1 execute DB --env staging --remote --file=./migrations/0010_session_budget.sql
```

**結果**:
```
🚣 Executed 3 queries in 4.37ms (52 rows read, 7 rows written)
```

**驗證**:
```sql
SELECT uuid, total_sessions FROM cards LIMIT 1;
-- Result: total_sessions column exists ✅
```

**狀態**: ✅ Migration 成功應用

---

### 3. Normal Creation (Under Budget) ✅

**Given**:
- Card UUID: `77bbaa61-57be-4fd9-aea1-f222a73ee7c1`
- `total_sessions` = 0

**When**:
```bash
POST /api/nfc/tap
{
  "card_uuid": "77bbaa61-57be-4fd9-aea1-f222a73ee7c1"
}
```

**Then**:
```json
{
  "success": true,
  "data": {
    "session_id": "c4694ab2-5992-4754-83c1-0ee496284f79",
    "expires_at": 1768979298434,
    "max_reads": 20,
    "reads_used": 0,
    "revoked_previous": true,
    "reused": false
  }
}
```

**Verification**:
```sql
SELECT total_sessions FROM cards WHERE uuid = '77bbaa61-57be-4fd9-aea1-f222a73ee7c1';
-- Result: 1 ✅
```

**狀態**: ✅ PASS

---

### 4. Approaching Limit (Warning at 90%) ✅

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
    "session_id": "c883ea0c-8db6-4945-8b85-be47f2854040",
    "expires_at": 1768979377855,
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
- ✅ `remaining` = 100
- ✅ `max_total` = 1000
- ✅ Session created successfully

**狀態**: ✅ PASS

---

### 5. Budget Exceeded (Hard Limit at 100%) ✅

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

**狀態**: ✅ PASS

---

## 功能驗證總結

| 測試項目 | 狀態 | 說明 |
|---------|------|------|
| Health Check | ✅ PASS | 服務正常運行 |
| Database Migration | ✅ PASS | total_sessions 欄位已新增 |
| Normal Creation | ✅ PASS | total_sessions 正確增加 |
| Approaching Limit (Warning) | ✅ PASS | 90% 閾值警告正確顯示 |
| Budget Exceeded (403) | ✅ PASS | 100% 硬性限制正確阻止 |

**總計**: 5/5 通過 (100%)

---

## 環境資訊

### Staging 環境配置

```toml
[env.staging]
name = "db-card-staging"
vars = { 
  ENVIRONMENT = "staging",
  GOOGLE_CLIENT_ID = "675226781448-akeqtr5d603ad0bcb3tve5hl4a8c164u.apps.googleusercontent.com"
}

[[env.staging.d1_databases]]
binding = "DB"
database_name = "db-card-staging"
database_id = "d31b5e42-d8bf-4044-9744-4aff5669de4b"

[[env.staging.kv_namespaces]]
binding = "KV"
id = "87221de061f049d3a4c976b7b5092dd9"
```

### 資料庫狀態
- **Database**: db-card-staging
- **Active Cards**: 5
- **KEK Version**: 4
- **Database Size**: 0.36 MB
- **Status**: Connected ✅

### Worker 資訊
- **Name**: db-card-staging
- **Region**: APAC (SIN)
- **Upload Size**: 168.08 KiB / gzip: 32.08 KiB
- **Deploy Time**: 7.17 sec

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
- ✅ total_sessions 正確增加

**狀態**: ✅ PASS

---

## 已知限制

### 未測試項目

1. **Daily Limit**
   - 需要設定 KV daily counter
   - 建議在實際使用中驗證

2. **Monthly Limit**
   - 需要設定 KV monthly counter
   - 建議在實際使用中驗證

3. **Event Booth & Sensitive Cards**
   - 僅測試 personal 類型
   - 建議創建不同類型卡片測試

4. **Concurrent Requests**
   - 未測試並發請求的原子性
   - D1 UPDATE 應該是原子的

---

## 性能影響

### 預期延遲
- Budget Check: +50-100ms (1 D1 query + 2 KV GET)
- Budget Increment: +20-50ms (1 D1 UPDATE + 2 KV PUT)
- **Total Impact**: +70-150ms

### 實際觀察
- 需要監控 P50, P95, P99 延遲
- 需要監控錯誤率
- 需要監控 Budget 觸發頻率

---

## 監控建議

### 關鍵指標

1. **Budget Hit Rate**
   - 監控 `session_budget_exceeded` 錯誤頻率
   - 預期: <1% (正常使用情況)

2. **Warning Rate**
   - 監控 warning 返回頻率
   - 預期: 5-10% (接近上限的卡片)

3. **Response Time**
   - 監控 P50, P95, P99
   - 預期: P95 <700ms (含 Budget Check)

4. **Error Rate**
   - 監控各類錯誤的比例
   - 預期: <5% (總錯誤率)

### 監控期建議
- 監控 24-48 小時
- 收集實際使用數據
- 根據數據調整限制值（如需要）

---

## 下一步行動

### 立即行動

- [x] 部署到 Staging ✅
- [x] 應用 Migration ✅
- [x] 基本功能驗證 ✅
- [ ] 監控 24-48 小時
- [ ] 收集實際使用數據

### 後續計劃

1. **監控期 (1-2 天)**
   - 觀察 Budget hit rate
   - 觀察 Warning rate
   - 收集性能指標
   - 收集錯誤日誌

2. **前端更新 (如需要)**
   - Admin Dashboard 顯示 budget 資訊
   - User Portal 顯示 budget 資訊
   - Card Display 處理 budget 錯誤

3. **文檔更新**
   - README.md 更新 v4.2.0 功能
   - docs/api/nfc-tap.md 更新 API 文檔

4. **Production 部署**
   - 確認 Staging 穩定後
   - 準備 Production 部署計劃
   - 執行 Production 部署

---

## 回滾計劃

如果發現嚴重問題，可以快速回滾：

```bash
# 查看部署歷史
npx wrangler deployments list --env staging

# 回滾到上一個版本 (v4.1.0)
npx wrangler rollback --env staging --version-id 10e097d2-024c-4f29-ac98-54aa7c54f404
```

**上一個版本**: 10e097d2-024c-4f29-ac98-54aa7c54f404 (v4.1.0)

---

## 聯絡資訊

**部署者**: Commander (Centralized Architect)  
**測試者**: Commander  
**審核者**: Commander  

**問題回報**: GitHub Issues  
**緊急聯絡**: 透過 Admin Dashboard

---

**部署狀態**: ✅ **成功**  
**驗證狀態**: ✅ **通過**  
**準備狀態**: ✅ **可開始監控**  
**下一階段**: 監控 24-48 小時 → 前端更新 → Production 部署
