# Batch API Migration - Phase 2 驗收測試

## 測試環境
- **Staging URL**: https://db-card-staging.csw30454.workers.dev
- **Version**: cbd1a480-285d-48c6-846d-6acac4faefd0
- **Migration**: 0038 已執行
- **部署時間**: 2026-03-06 20:03 UTC+8

---

## 自動化測試結果

### Test Suite: `/api/admin/test-batch-api`

```bash
curl "https://db-card-staging.csw30454.workers.dev/api/admin/test-batch-api" \
  -H "Authorization: Bearer $SETUP_TOKEN"
```

**預期結果**: 7/7 PASS

**實際結果**: 
- ✅ Enqueue entities (PASS)
- ✅ Prevent duplicate enqueue (PASS)
- ✅ Check backlog (PASS)
- ✅ Queue items created (PASS)
- ⚠️ Create batch job (需要真實 Gemini API Key)
- ⚠️ Batch jobs table (依賴上一步)
- ✅ Poll and process (PASS)

**狀態**: 基礎設施測試通過，Gemini API 整合待驗證

---

## 手動驗收測試

### Test 1: Database Schema 驗證

```bash
# 查詢 batch_job_queue 表
wrangler d1 execute DB --remote --command "SELECT * FROM batch_job_queue LIMIT 5"

# 查詢 batch_jobs 表
wrangler d1 execute DB --remote --command "SELECT * FROM batch_jobs LIMIT 5"

# 查詢 batch_job_errors 表
wrangler d1 execute DB --remote --command "SELECT * FROM batch_job_errors LIMIT 5"
```

**預期**: 3 張表存在，schema 正確

**結果**: ✅ PASS

---

### Test 2: 原子性入列測試

```bash
# 第一次入列
curl -X POST "https://db-card-staging.csw30454.workers.dev/api/admin/test-enqueue" \
  -H "Authorization: Bearer $SETUP_TOKEN" \
  -d '{"cards": ["card-1", "card-2", "card-3"]}'

# 第二次入列（應該失敗）
curl -X POST "https://db-card-staging.csw30454.workers.dev/api/admin/test-enqueue" \
  -H "Authorization: Bearer $SETUP_TOKEN" \
  -d '{"cards": ["card-1", "card-2", "card-3"]}'
```

**預期**: 
- 第一次: enqueued = 3
- 第二次: enqueued = 0 (UNIQUE constraint)

**結果**: ✅ PASS (自動化測試已驗證)

---

### Test 3: Cron Job 整合測試

```bash
# 手動觸發 Cron
curl -X POST "https://db-card-staging.csw30454.workers.dev/api/admin/trigger-cron" \
  -H "Authorization: Bearer $SETUP_TOKEN"

# 查詢 batch_jobs 狀態
wrangler d1 execute DB --remote --command "
  SELECT id, job_name, job_type, status, attempt, max_attempts, created_at
  FROM batch_jobs
  ORDER BY created_at DESC
  LIMIT 10
"
```

**預期**: 
- Cron 執行成功
- autoTagCardsBatch 被調用
- 若有未標籤卡片，創建 batch job

**結果**: ⏳ 待測試（需要真實未標籤卡片）

---

### Test 4: 重試鏈追蹤測試

**前置條件**: 創建一個會失敗的 batch job

```bash
# 查詢重試鏈
wrangler d1 execute DB --remote --command "
  SELECT id, job_name, root_job_id, parent_job_id, attempt, max_attempts, status
  FROM batch_jobs
  WHERE root_job_id IS NOT NULL
  ORDER BY attempt ASC
"
```

**預期**: 
- root_job_id 正確指向首次 job
- parent_job_id 正確指向上一次重試
- attempt 遞增 (1, 2, 3)
- 達到 max_attempts 後狀態為 'dead_letter'

**結果**: ⏳ 待測試（需要模擬失敗場景）

---

### Test 5: 併發保護測試

**測試方法**: 同時發送 2 個請求處理同一 job

```bash
# Terminal 1
curl "https://db-card-staging.csw30454.workers.dev/api/admin/process-job?job_id=1" &

# Terminal 2 (立即執行)
curl "https://db-card-staging.csw30454.workers.dev/api/admin/process-job?job_id=1" &
```

**預期**: 
- 只有一個請求獲得 lease lock
- 另一個請求跳過處理
- leased_until 正確設置和釋放

**結果**: ⏳ 待測試（需要實作 process-job 端點）

---

### Test 6: 部分失敗處理測試

**前置條件**: 創建一個 batch job，其中部分請求會失敗

```bash
# 查詢錯誤記錄
wrangler d1 execute DB --remote --command "
  SELECT * FROM batch_job_errors
  WHERE batch_job_id = 1
"

# 查詢 job 統計
wrangler d1 execute DB --remote --command "
  SELECT id, status, total_requests, succeeded_requests, failed_requests
  FROM batch_jobs
  WHERE id = 1
"
```

**預期**: 
- batch_job_errors 記錄所有失敗請求
- succeeded_requests + failed_requests = total_requests
- status = 'partial_failed' (若有失敗)

**結果**: ⏳ 待測試（需要真實 Gemini 回應）

---

## 效能測試

### Test 7: Backlog 控制測試

```bash
# 創建 4 個 batch jobs（超過 MAX_IN_FLIGHT=3）
for i in {1..4}; do
  curl -X POST "https://db-card-staging.csw30454.workers.dev/api/admin/create-batch-job" \
    -H "Authorization: Bearer $SETUP_TOKEN"
done

# 查詢 in-flight 數量
wrangler d1 execute DB --remote --command "
  SELECT COUNT(*) as count FROM batch_jobs
  WHERE status IN ('queued', 'submitted', 'running', 'processing_results')
"
```

**預期**: 
- 最多 3 個 in-flight jobs
- 第 4 個請求被拒絕或排隊

**結果**: ⏳ 待測試

---

## 成本驗證

### Test 8: 成本節省驗證

**測試數據**: 
- 100 張卡片自動標籤
- 每張卡片 ~1000 input tokens, ~500 output tokens

**計算**:
```
標準 API:
- Input: 100 × 1000 × $0.075/1M = $0.0075
- Output: 100 × 500 × $0.30/1M = $0.015
- 總計: $0.0225

Batch API:
- Input: 100 × 1000 × $0.0375/1M = $0.00375
- Output: 100 × 500 × $0.15/1M = $0.0075
- 總計: $0.01125

節省: $0.01125 (50%)
```

**驗證方法**: 查看 Gemini API 帳單

**結果**: ⏳ 待驗證（需要真實 API 使用）

---

## 驗收標準

### Phase 2 完成條件

- [x] Migration 0038 已執行 (Staging)
- [x] TypeScript 零錯誤
- [x] 基礎設施測試通過 (5/7)
- [ ] Gemini API 整合測試通過
- [ ] 重試鏈追蹤驗證
- [ ] 併發保護驗證
- [ ] 部分失敗處理驗證
- [ ] Cron Job 整合驗證
- [ ] 成本節省驗證

### 已知限制

1. **Gemini API Key**: 測試環境需要有效的 API Key
2. **真實數據**: 需要未標籤的卡片進行完整測試
3. **24h SLO**: 無法在測試環境驗證完整流程（需等待 Gemini 處理）

---

## 下一步

### Phase 3: Production 部署前檢查清單

- [ ] 所有驗收測試通過
- [ ] Staging 環境運行 7 天無錯誤
- [ ] 監控 Dashboard 實作
- [ ] 告警機制設置
- [ ] Rollback 計畫準備
- [ ] Production Migration 執行
- [ ] Production 部署
- [ ] 灰度發布（10% → 50% → 100%）

---

## 聯絡資訊

- **測試執行者**: Kiro AI
- **測試日期**: 2026-03-06
- **測試環境**: Staging
- **文檔版本**: v1.0
