# Vectorize Sync Error Handling Enhancement

## Context
Cron job 執行時遇到 Embedding API 400 錯誤，但日誌未記錄導致錯誤的具體內容。

## BDD Specification

### Scenario 1: Empty or Invalid Text Detection
**Given**: 某張卡片的 `generateCardText()` 產生空字串或無效內容  
**When**: `syncCardEmbeddings()` 嘗試生成 embedding  
**Then**: 
- 應在呼叫 API 前驗證文本長度（至少 10 字元）
- 記錄警告並跳過該卡片
- 繼續處理其他卡片

### Scenario 2: API Error Detailed Logging
**Given**: Gemini Embedding API 回傳 400 錯誤  
**When**: `generateEmbedding()` 捕獲錯誤  
**Then**: 
- 記錄完整錯誤訊息（包含 response body）
- 記錄導致錯誤的文本內容（前 500 字元）
- 記錄卡片 UUID 和基本資訊（姓名、公司）

### Scenario 3: Graceful Degradation
**Given**: 批次中部分卡片失敗  
**When**: `syncCardEmbeddings()` 處理批次  
**Then**: 
- 成功的卡片應正常同步
- 失敗的卡片不更新 `embedding_synced_at`
- 下次 cron 會重試失敗的卡片

## Implementation Requirements

1. **Pre-validation in `generateCardText()`**:
   - 確保至少有姓名
   - 移除多餘空白行
   - 最小長度檢查

2. **Enhanced Error Logging in `generateEmbedding()`**:
   - 捕獲並記錄 response body
   - 記錄輸入文本（截斷至 500 字元）

3. **Robust Error Handling in `syncCardEmbeddings()`**:
   - 個別卡片失敗不影響批次
   - 記錄失敗卡片的詳細資訊

## Acceptance Criteria
- ✅ 空文本卡片被跳過並記錄警告
- ✅ API 400 錯誤記錄包含 response body 和輸入文本
- ✅ 批次處理不因單一卡片失敗而中斷
- ✅ TypeScript 編譯零錯誤
