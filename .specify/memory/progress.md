# Cron Subrequest 限制修復

## Status: ✅ 優先與背景任務分離

### 問題診斷
- **錯誤**: "Too many API requests by single Worker invocation"
- **原因**: 12 個任務同步執行，超過 50 subrequest 限制
- **影響**: 後半段任務全部失敗

### 解決方案

#### 優先任務（阻塞執行）
1. Auto-tag Cards
2. Find Cross-User Candidates
3. Sync Embeddings
4. Deduplicate Cards

#### 背景任務（ctx.waitUntil）
1. Cleanup Sessions
2. Log Rotation
3. KV Cleanup
4. Asset Cleanup
5. Temp Uploads Cleanup
6. Received Cards Cleanup
7. FileSearchStore Cleanup
8. Backfill Organization Normalized

### 部署狀態
- Version: v5.0.0
- Bundle: 1059.26 KiB / gzip: 198.63 KiB
- Startup: 12ms
- Health: ✅ OK

### 效益
- 優先任務：立即回應，不超過 subrequest 限制
- 背景任務：非阻塞執行，不影響回應時間
- 總任務數：12 個（4 優先 + 8 背景）

### 測試
- 重新觸發 Admin Cron
- 預期：優先任務成功，背景任務排程執行
