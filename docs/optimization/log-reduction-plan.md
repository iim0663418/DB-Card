# DB-Card 日誌減量計劃

## 📊 當前日誌分佈統計

**總計**: 272 個 console 調用，分佈於 56 個檔案

---

## 🔝 Top 10 日誌密集檔案

| 排名 | 檔案 | 日誌數 | 類型 |
|-----|------|--------|------|
| 1 | `middleware/oauth.ts` | 26 | Middleware |
| 2 | `handlers/user/received-cards/unified-extract.ts` | 26 | Handler |
| 3 | `handlers/user/received-cards/upload.ts` | 12 | Handler |
| 4 | `middleware/csrf.ts` | 11 | Middleware |
| 5 | `handlers/admin/cards.ts` | 11 | Handler |
| 6 | `handlers/user/received-cards/ocr.ts` | 11 | Handler |
| 7 | `cron/auto-tag-cards.ts` | 10 | Cron |
| 8 | `handlers/consent.ts` | 8 | Handler |
| 9 | `handlers/user/cards.ts` | 8 | Handler |
| 10 | `handlers/admin/passkey.ts` | 7 | Handler |

---

## 📂 按類型分類

### **1. DEBUG 日誌** (可移除)

**特徵**: `if (DEBUG) console.log(...)`

**檔案**:
- `middleware/oauth.ts` (5 個)
- `middleware/csrf.ts` (11 個)
- `handlers/user/received-cards/upload.ts` (12 個)
- `handlers/user/received-cards/ocr.ts` (5 個)
- `handlers/user/received-cards/image.ts` (6 個)
- `handlers/user/received-cards/thumbnail.ts` (6 個)

**建議**: ✅ **全部移除** (已有環境變數控制，生產環境不需要)

**預期減少**: ~45 個日誌

---

### **2. FileSearchStore 日誌** (已停用功能)

**特徵**: `[FileSearchStore]`

**檔案**:
- `handlers/user/received-cards/unified-extract.ts` (5 個)
- `cron/cleanup-filesearchstore.ts` (5 個)

**建議**: ✅ **全部移除** (功能已停用，日誌無意義)

**預期減少**: ~10 個日誌

---

### **3. 錯誤日誌** (保留)

**特徵**: `console.error(...)`

**用途**: 生產環境錯誤追蹤

**建議**: ✅ **保留** (關鍵錯誤資訊)

**數量**: ~150 個

---

### **4. Cron Job 進度日誌** (簡化)

**特徵**: `[AutoTag]`, `[Deduplicate]`, `[Cleanup]`, `[Vectorize Sync]`

**檔案**:
- `cron/auto-tag-cards.ts` (10 個)
- `cron/deduplicate-cards.ts` (7 個)
- `cron/sync-card-embeddings.ts` (2 個)
- `cron/cleanup-*.ts` (多個)

**建議**: ⚠️ **簡化** (只保留開始/結束/錯誤)

**預期減少**: ~20 個日誌

---

### **5. 安全警告日誌** (保留)

**特徵**: `console.warn(...)`

**用途**: 安全事件、降級處理

**建議**: ✅ **保留** (安全監控必要)

**數量**: ~15 個

---

### **6. 開發除錯日誌** (移除)

**特徵**: `[SHARE DEBUG]`, `[Upload]`, `[Gemini Retry]`

**檔案**:
- `handlers/user/received-cards/share.ts` (3 個 DEBUG)
- `handlers/user/received-cards/unified-extract.ts` (重試日誌)

**建議**: ✅ **移除** (開發階段遺留)

**預期減少**: ~10 個日誌

---

## 🎯 減量目標

### **Phase 1: 快速清理** (預計減少 85 個，31%)

1. ✅ 移除所有 `if (DEBUG)` 日誌 (~45 個)
2. ✅ 移除 FileSearchStore 日誌 (~10 個)
3. ✅ 移除開發除錯日誌 (~10 個)
4. ✅ 簡化 Cron Job 進度日誌 (~20 個)

**目標**: 272 → 187 個日誌

---

### **Phase 2: 結構化日誌** (未來優化)

1. 引入結構化日誌庫 (如 `pino`)
2. 統一日誌格式 (JSON)
3. 日誌等級控制 (ERROR, WARN, INFO, DEBUG)
4. 集中日誌管理

**目標**: 可觀測性提升，日誌可查詢

---

## 📋 詳細清理清單

### **A. 移除 DEBUG 日誌**

#### `middleware/oauth.ts` (5 個)
```typescript
// 移除
if (DEBUG) console.log('[JWT] Verifying token:', ...);
if (DEBUG) console.log('[JWT] Token verified successfully, email:', ...);
```

#### `middleware/csrf.ts` (11 個)
```typescript
// 移除所有
if (DEBUG) console.log('[CSRF] HTTP method:', ...);
if (DEBUG) console.log('[CSRF] X-CSRF-Token header exists:', ...);
// ... 等 11 個
```

#### `handlers/user/received-cards/upload.ts` (12 個)
```typescript
// 移除所有
if (DEBUG) console.log('[Upload] Request received');
if (DEBUG) console.log('[Upload] OAuth verification failed');
// ... 等 12 個
```

#### `handlers/user/received-cards/ocr.ts` (5 個)
```typescript
// 移除所有
if (DEBUG) console.log('[OCR] Request received');
if (DEBUG) console.log('[OCR] OAuth verification failed');
// ... 等 5 個
```

#### `handlers/user/received-cards/image.ts` (6 個)
```typescript
// 移除所有
if (DEBUG) console.log('[Image] Request for card:', ...);
// ... 等 6 個
```

#### `handlers/user/received-cards/thumbnail.ts` (6 個)
```typescript
// 移除所有
if (DEBUG) console.log('[Thumbnail] Request for card:', ...);
// ... 等 6 個
```

---

### **B. 移除 FileSearchStore 日誌**

#### `handlers/user/received-cards/unified-extract.ts` (5 個)
```typescript
// 移除（功能已停用）
console.log('[FileSearchStore] Starting upload...');
console.log('[FileSearchStore] storeName:', ...);
console.log('[FileSearchStore] organization:', ...);
console.log(`[FileSearchStore] Uploaded: ${displayName} ...`);
```

#### `cron/cleanup-filesearchstore.ts` (5 個)
```typescript
// 移除（功能已停用）
console.log('[FileSearchStore Cleanup] Skipped: ...');
console.log('[FileSearchStore Cleanup] No documents older than 2 years');
console.log(`[FileSearchStore Cleanup] Deleted ${deleted}/${oldDocuments.length} documents`);
```

---

### **C. 移除開發除錯日誌**

#### `handlers/user/received-cards/share.ts` (3 個)
```typescript
// 移除
console.log('[SHARE DEBUG] Card owner:', ...);
console.log('[SHARE DEBUG] Current user:', ...);
console.log('[SHARE DEBUG] Match:', ...);
```

#### `handlers/user/received-cards/unified-extract.ts` (重試日誌)
```typescript
// 移除（過於詳細）
console.log(`[Gemini Retry ${i + 1}/${maxRetries}] Waiting ${Math.round(delay)}ms ...`);
```

---

### **D. 簡化 Cron Job 日誌**

#### `cron/auto-tag-cards.ts`
```typescript
// 保留
console.log('[AutoTag] Starting auto-tagging (one-time only)...');
console.log(`[AutoTag] Completed: ${totalTagged} cards tagged in ${batchCount} batches`);

// 移除（過於詳細）
console.log(`[AutoTag] Batch ${batchCount}: Found ${cards.length} cards to process`);
console.log('[AutoTag] No more cards to tag');
console.log(`[AutoTag] Batch ${batchCount}: Tagged ${tagged}/${cards.length} cards`);
```

#### `cron/deduplicate-cards.ts`
```typescript
// 保留
console.log(`[Deduplicate] Merged ${merged} cards`);

// 移除（錯誤日誌已足夠）
// 無需額外進度日誌
```

#### `cron/sync-card-embeddings.ts`
```typescript
// 保留
console.log(`[Vectorize Sync] Synced ${totalSynced} cards`);

// 移除（錯誤日誌已足夠）
// 無需詳細進度
```

---

## 🔍 保留的日誌類型

### **1. 錯誤日誌** (console.error)
- 所有 API 錯誤
- 資料庫錯誤
- 外部服務錯誤 (Gemini, Google)
- 安全事件錯誤

### **2. 安全警告** (console.warn)
- Passkey 重放攻擊
- SETUP_TOKEN 拒絕
- 降級處理 (JWKS, Discovery)
- 加密降級

### **3. Cron Job 摘要**
- 開始時間
- 完成時間
- 處理數量
- 錯誤摘要

---

## 📊 預期效果

### **Phase 1 完成後**

| 指標 | Before | After | 改善 |
|-----|--------|-------|------|
| **總日誌數** | 272 | 187 | 31% ⬇️ |
| **DEBUG 日誌** | 45 | 0 | 100% ⬇️ |
| **廢棄功能日誌** | 10 | 0 | 100% ⬇️ |
| **開發除錯日誌** | 10 | 0 | 100% ⬇️ |
| **Cron 進度日誌** | 30 | 10 | 67% ⬇️ |

### **日誌品質提升**

- ✅ 生產環境無 DEBUG 日誌
- ✅ 無廢棄功能日誌
- ✅ Cron Job 日誌簡潔
- ✅ 錯誤日誌完整保留

---

## 🚀 實作計畫

### **Step 1: 自動化清理腳本**

```bash
# 移除 DEBUG 日誌
grep -rl "if (DEBUG) console\." src/ | xargs sed -i '' '/if (DEBUG) console\./d'

# 移除 FileSearchStore 日誌
grep -rl "\[FileSearchStore\]" src/ | xargs sed -i '' '/console.*\[FileSearchStore\]/d'

# 移除 SHARE DEBUG 日誌
sed -i '' '/console.*\[SHARE DEBUG\]/d' src/handlers/user/received-cards/share.ts
```

### **Step 2: 手動審查**

- 檢查 Cron Job 日誌簡化
- 確認錯誤日誌完整
- 驗證安全警告保留

### **Step 3: 測試驗證**

```bash
npm run typecheck
npm run build
```

### **Step 4: 部署驗證**

- Staging 環境測試
- 監控錯誤日誌
- 確認 Cron Job 正常

---

## 📝 後續優化建議

### **Option 1: 結構化日誌**

```typescript
import { Logger } from 'pino';

const logger = new Logger({
  level: env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  }
});

// 使用
logger.info({ cardUuid, action: 'create' }, 'Card created');
logger.error({ error, cardUuid }, 'Failed to create card');
```

### **Option 2: 日誌聚合**

- 整合 Cloudflare Logpush
- 發送到 Elasticsearch / Datadog
- 建立 Dashboard 監控

### **Option 3: 效能追蹤**

- 使用 OpenTelemetry
- 追蹤 API 延遲
- 監控 Cron Job 執行時間

---

**最後更新**: 2026-03-05  
**當前狀態**: 分析完成，等待實作
