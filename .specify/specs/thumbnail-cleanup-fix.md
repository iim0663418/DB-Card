# BDD Spec: Thumbnail Cleanup Fix

## Scenario 1: Temp Uploads Cleanup (P0 + P1)
**Given**: 
- temp_uploads 表有過期記錄 (expires_at < now)
- 記錄包含 image_url 和 thumbnail_url

**When**: 
- Cron Job 每日 02:00 UTC 執行

**Then**:
- 從 R2 刪除 image_url (原圖)
- 從 R2 刪除 thumbnail_url (縮圖，如存在)
- 從 DB 刪除 temp_uploads 記錄
- 回傳 { deleted: number }

## Scenario 2: Permanent Cards Hard Delete (P2)
**Given**:
- received_cards 表有軟刪除記錄 (deleted_at IS NOT NULL)
- 軟刪除時間超過 30 天 (deleted_at < now - 30 days)

**When**:
- Cron Job 每日 02:00 UTC 執行

**Then**:
- 從 R2 刪除 original_image_url
- 從 R2 刪除 thumbnail_url (如存在)
- 從 DB 硬刪除 received_cards 記錄
- 回傳 { deleted: number }

## Technical Requirements
- 使用 Promise.all() 並行刪除 R2 檔案
- R2 刪除失敗不影響 DB 清理 (best-effort)
- 限制單次處理 100 筆記錄 (避免超時)
- 記錄清理數量到日誌

## Files to Modify
1. `src/cron/cleanup-temp-uploads.ts` - 修復欄位名 + 新增縮圖清理
2. `src/cron/cleanup-received-cards.ts` - 新增硬刪除邏輯 (新檔案)
3. `src/index.ts` - 註冊新 Cron Job
