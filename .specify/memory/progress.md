# Batch API 止血完成

## Status: ✅ 統一路徑 + 標記 Deprecated

### 執行內容

1. **Migration 0041**: 清理卡住的 Batch Jobs
   - 標記超過 48 小時的 job 為 `dead_letter`
   - 釋放卡住的 queue entries
   - 保留審計記錄（不刪除）

2. **統一 Cron 路徑**: 
   - `scheduled()` 改用簡單版 `autoTagCards()`
   - `trigger-cron` 已經是簡單版
   - 行為一致性恢復

3. **標記 Deprecated**:
   - `auto-tag-cards-batch.ts` 加入 @deprecated
   - 決策文件：`docs/decisions/batch-api-decision.md`
   - 評估日期：2026-03-21（2 週後）

### 部署狀態
- Version: v5.0.0
- Bundle: 1059.06 KiB / gzip: 198.70 KiB
- Startup: 25ms
- Health: ✅ OK

### 監控指標（2 週）
- Auto-tag 成功率
- 處理卡片數量
- Gemini API 配額使用

### 決策點（2026-03-21）
- 如果簡單版滿足需求 → 移除 Batch API
- 如果需要更大規模 → 修復 Batch API

### 技術債務
- 保留：batch_jobs 表（審計）
- 待移除：auto-tag-cards-batch.ts, batch-manager.ts
