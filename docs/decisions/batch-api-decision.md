# Batch API 架構決策

## 現況分析（2026-03-07）

### 發現的問題

1. **雙軌運行**：
   - `scheduled()`: 使用 `autoTagCardsBatch()` (Batch API 版)
   - `trigger-cron`: 使用 `autoTagCards()` (簡單版)
   - **行為不一致**

2. **Batch API 卡住**：
   - Job ID 3 (昨天 18:00 創建)
   - Status: `submitted`
   - 原因：`pollAndProcess()` 只撈 48 小時內，但 Gemini Batch API 可能需要更長時間

3. **Backlog 計算問題**：
   - `checkBacklog()` 計算所有 `submitted/running`
   - 卡住的 job 會持續佔名額
   - 導致新 job 無法創建

4. **Queue 永久卡住**：
   - 查詢未處理卡片時排除 `processing` 狀態
   - 如果 job 失敗，這些卡片永遠不會重新入列

### 止血措施（已執行）

**Migration 0041**: 清理超過 48 小時的卡住 job
- ✅ 標記為 `dead_letter`（保留審計）
- ✅ 釋放 queue entries
- ✅ 可安全重複執行

---

## 架構決策選項

### 選項 A: 完全移除 Batch API（推薦）

**理由**：
1. **簡單版本已足夠**：
   - `generateTagsBatch()`: 20 張/批，單次 API 呼叫
   - 95% API 呼叫減少已達成
   - 不需要複雜的 job queue

2. **維護成本高**：
   - Batch API 需要 polling、retry、error handling
   - 狀態機複雜（7 種狀態）
   - 需要持續監控

3. **Gemini Batch API 不穩定**：
   - 可能需要企業帳號
   - 處理時間不可預測
   - 文檔不完整

**實作步驟**：
1. 統一 Cron 路徑（使用簡單版）
2. 標記 Batch API 代碼為 deprecated
3. 保留資料表（審計用）
4. 2 週後移除代碼

**工時**: 2 小時

---

### 選項 B: 修復 Batch API

**需要修復的問題**：
1. **Stale Reaper**: 自動清理卡住的 job
2. **Backlog 計算**: 只計算近 48 小時的 job
3. **Queue 重試**: 失敗的 queue entry 自動重新入列
4. **Polling 窗口**: 擴大到 7 天（Gemini Batch API 可能需要）
5. **統一路徑**: scheduled 和 manual 使用同一實作

**實作步驟**：
1. 新增 `reapStaleJobs()` 函式
2. 修改 `checkBacklog()` 加入時間過濾
3. 新增 `retryFailedQueue()` 函式
4. 擴大 `pollAndProcess()` 窗口
5. 統一 Cron 路徑

**工時**: 8-12 小時

**風險**：
- Gemini Batch API 行為未知
- 可能需要企業帳號
- 投資報酬率低

---

## 建議方案

### 短期（今天）：止血 + 統一路徑

1. ✅ **Migration 0041 已執行**
2. **統一 Cron 路徑**：scheduled 改用簡單版
3. **監控 2 週**：觀察簡單版是否滿足需求

### 中期（2 週後）：架構決策

**決策點**：
- 如果簡單版滿足需求 → **選項 A**（移除 Batch API）
- 如果需要更大規模處理 → **選項 B**（修復 Batch API）

**判斷標準**：
- 每日處理卡片數 < 100 → 簡單版足夠
- 每日處理卡片數 > 500 → 考慮 Batch API
- Gemini API 配額是否足夠

---

## 立即行動

### 1. 統一 Cron 路徑（優先）

**修改 `index.ts`**：
```typescript
async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
  // 統一使用簡單版
  console.log('[Cron] Phase 1: Auto-tag Cards');
  const { autoTagCards } = await import('./cron/auto-tag-cards');
  await autoTagCards(env);

  console.log('[Cron] Phase 2: Vectorize & Sync');
  const { syncCardEmbeddings } = await import('./cron/sync-card-embeddings');
  await syncCardEmbeddings(env);

  const { deduplicateCards } = await import('./cron/deduplicate-cards');
  await deduplicateCards(env);
  
  const { findCrossUserCandidates } = await import('./cron/find-candidates');
  await findCrossUserCandidates(env);
}
```

### 2. 標記 Batch API 為 Deprecated

**在 `auto-tag-cards-batch.ts` 頂部加入**：
```typescript
/**
 * @deprecated This Batch API version is currently not in use.
 * Use auto-tag-cards.ts (simple version) instead.
 * 
 * Reason: Gemini Batch API is unstable and requires enterprise account.
 * Simple version with generateTagsBatch() is sufficient for current scale.
 * 
 * Decision date: 2026-03-07
 * Review date: 2026-03-21 (2 weeks)
 */
```

### 3. 監控指標

**每日檢查**：
- Auto-tag 成功率
- 處理卡片數量
- Gemini API 配額使用

**2 週後評估**：
- 如果一切正常 → 移除 Batch API
- 如果有問題 → 考慮修復

---

## 技術債務

### 保留（審計用）
- `batch_jobs` 表
- `batch_job_queue` 表
- `batch_job_errors` 表
- Migration 0041

### 待移除（2 週後）
- `auto-tag-cards-batch.ts`
- `batch-manager.ts`
- `test-batch-api.ts`

---

**決策者**: 系統架構師  
**決策日期**: 2026-03-07  
**評估日期**: 2026-03-21  
**優先級**: P0（影響 Cron 穩定性）
