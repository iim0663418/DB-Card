# KV Cleanup Implementation

**實作時間**: 2026-01-20T20:45:00+08:00  
**Staging Version**: 68acec62-6d86-4dc0-933b-b6a18b67c175

---

## 📋 實作內容

### 新增檔案
- `workers/src/scheduled-kv-cleanup.ts` - KV 清理邏輯

### 修改檔案
- `workers/src/index.ts` - 整合到 scheduled cron

---

## 🎯 清理策略

### Daily Counters
**KV Key**: `session:budget:{uuid}:daily:{YYYYMMDD}`  
**保留期限**: 今日 + 昨日（2 天）  
**清理邏輯**: 刪除 2 天前的所有 daily counters

### Monthly Counters
**KV Key**: `session:budget:{uuid}:monthly:{YYYYMM}`  
**保留期限**: 本月 + 上月（2 個月）  
**清理邏輯**: 刪除 2 個月前的所有 monthly counters

---

## ⏰ 執行時間

**Cron Schedule**: 每日 02:00 UTC  
**執行順序**:
1. `handleScheduledCleanup()` - 清理 90 天前的 revoked cards
2. `handleScheduledLogRotation()` - 清理過期日誌
3. `handleScheduledKVCleanup()` - 清理過期 KV counters

---

## 🔧 技術細節

### 清理流程
```typescript
1. 查詢所有 active cards (bound + revoked)
2. 對每張卡片：
   a. 列出所有 daily keys (session:budget:{uuid}:daily:*)
   b. 刪除非今日/昨日的 keys
   c. 列出所有 monthly keys (session:budget:{uuid}:monthly:*)
   d. 刪除非本月/上月的 keys
3. 記錄刪除數量
```

### 效能考量
- 使用 `KV.list({ prefix })` 批量查詢
- 順序執行避免資源競爭
- 只保留必要的 counters（2 天/2 月）

---

## 📊 預期效果

### 假設場景
- **名片數量**: 100 張
- **每日產生**: 100 個 daily keys
- **每月產生**: 100 個 monthly keys

### 清理前（30 天後）
- Daily keys: 100 × 30 = 3,000 個
- Monthly keys: 100 × 2 = 200 個
- **總計**: 3,200 個 KV keys

### 清理後
- Daily keys: 100 × 2 = 200 個（保留今日+昨日）
- Monthly keys: 100 × 2 = 200 個（保留本月+上月）
- **總計**: 400 個 KV keys

### 節省空間
- **減少**: 2,800 個 KV keys（87.5%）

---

## ✅ 驗證方式

### 手動觸發測試
```bash
# 使用 wrangler 手動觸發 cron
npx wrangler dev --test-scheduled
```

### 檢查日誌
```bash
# 查看 staging 日誌
npx wrangler tail --env staging

# 預期輸出
[KV Cleanup] Deleted X daily counters and Y monthly counters
```

### 驗證 KV 數量
```bash
# 列出特定卡片的 KV keys
npx wrangler kv:key list --binding=KV --prefix="session:budget:{uuid}:daily:"
```

---

## 🐛 錯誤處理

### 錯誤情況
1. **DB 查詢失敗**: 拋出錯誤，中止清理
2. **KV.list() 失敗**: 拋出錯誤，記錄日誌
3. **KV.delete() 失敗**: 繼續處理下一個 key

### 日誌記錄
```typescript
console.log('[KV Cleanup] Deleted X daily counters and Y monthly counters');
console.error('[KV Cleanup] Error during scheduled KV cleanup:', error);
```

---

## 📝 維護建議

### 定期檢查
- 每週檢查 cron 執行日誌
- 監控 KV 使用量
- 確認清理數量合理

### 調整保留期限
如需調整保留期限，修改 `scheduled-kv-cleanup.ts`:
```typescript
// 保留 3 天（今日+昨日+前日）
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  .toISOString().slice(0, 10).replace(/-/g, '');

// 保留 3 個月
const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  .toISOString().slice(0, 7).replace(/-/g, '');
```

---

## 🎯 總結

### 完成項目
- ✅ 創建 `scheduled-kv-cleanup.ts`
- ✅ 整合到 `index.ts` scheduled cron
- ✅ 實作 daily/monthly counters 清理邏輯
- ✅ 部署到 staging

### 下一步
- 🔄 監控首次執行（明日 02:00 UTC）
- 🔄 驗證清理效果
- 🔄 調整保留期限（如需要）
