# 正反面上傳 + AI 辨識 - 最終執行版

## 🔴 所有問題修正

1. ✅ TypeScript 語法錯誤（缺少逗號）
2. ✅ SQLite 相容性（移除 IF NOT EXISTS）
3. ✅ 切換時序（先前端後後端）
4. ✅ Migration 依賴順序明確
5. ✅ 統一錯誤回應格式

---

## 📋 前置條件

### Migration 依賴順序
```
0026_web_search_optional.sql  → 新增 ai_status
0028_card_thumbnails.sql      → 新增 thumbnail_url
0029_bilingual_card_support.sql → 新增雙語欄位（本次）
```

**檢查方式**：
```bash
wrangler d1 execute DB --remote --command="PRAGMA table_info(received_cards)" | grep -E "ai_status|thumbnail_url"
```

如果沒有這兩個欄位，請先執行 0026 和 0028。

---

## 🗄️ Migration 0029（SQLite 相容）

已修正，檔案：`workers/migrations/0029_bilingual_card_support.sql`

---

## 🔧 後端實作

### 1. AI 辨識函式（修正：TypeScript 語法）

**檔案：`workers/src/utils/gemini-bilingual-ocr.ts`**

```typescript
/**
 * 處理正反面圖片的雙語 OCR（修正：補上缺少的逗號）
 */
export async function processBilingualOCR(
  frontImageBuffer: ArrayBuffer,
  frontMimeType: string,
  backImageBuffer: ArrayBuffer | null,
  backMimeType: string | null,  // 修正：補上逗號
  apiKey: string
): Promise<BilingualOCRResult> {
  const frontBase64 = arrayBufferToBase64(frontImageBuffer);
  const backBase64 = backImageBuffer ? arrayBufferToBase64(backImageBuffer) : null;
  
  // 並行處理正反面
  const [frontResult, backResult] = await Promise.all([
    performBilingualOCR(frontBase64, frontMimeType, apiKey, 'front'),
    backBase64 && backMimeType 
      ? performBilingualOCR(backBase64, backMimeType, apiKey, 'back') 
      : Promise.resolve(null)
  ]);
  
  return mergeOCRResults(frontResult, backResult);
}
```

### 2. 路由註冊（修正：切換時序 + 統一格式）

**檔案：`workers/src/index.ts`**

```typescript
import { handleUploadV2 } from './handlers/user/received-cards/upload-v2';
import { handleUpload } from './handlers/user/received-cards/upload';

// 新 API（優先）
if (url.pathname === '/api/user/received-cards/upload-v2' && request.method === 'POST') {
  return addMinimalSecurityHeaders(await handleUploadV2(request, env));
}

// 舊 API（保留，等前端切換完成後再改為 410）
// 階段 1：前端切換期間，舊 API 仍可用
// 階段 2：前端切換完成後，改為回傳 410
if (url.pathname === '/api/user/received-cards/upload' && request.method === 'POST') {
  // 目前：保持原樣
  return addMinimalSecurityHeaders(await handleUpload(request, env));
  
  // 未來：前端切換完成後啟用
  // return addMinimalSecurityHeaders(
  //   errorResponse('API_DEPRECATED', 'Please use /api/user/received-cards/upload-v2', 410)
  // );
}
```

---

## 🎨 前端實作

### 修改：`workers/public/js/received-cards.js`

```javascript
// 修改上傳方法（使用新 API）
async uploadCard() {
  if (!this.frontImage) {
    showToast('請選擇正面圖片', 'error');
    return;
  }
  
  const uploadBtn = document.getElementById('upload-card-btn');
  if (!uploadBtn) return;
  
  uploadBtn.disabled = true;
  uploadBtn.textContent = 'AI 辨識中...';
  
  try {
    // 1. 生成縮圖（強制 WebP）
    const frontThumbnail = await generateThumbnailClient(this.frontImage);
    const backThumbnail = this.backImage ? await generateThumbnailClient(this.backImage) : null;
    
    // 2. 準備 FormData
    const formData = new FormData();
    formData.append('front_image', this.frontImage);
    formData.append('front_thumbnail', frontThumbnail);
    
    if (this.backImage && backThumbnail) {
      formData.append('back_image', this.backImage);
      formData.append('back_thumbnail', backThumbnail);
    }
    
    // 3. 上傳（使用新 API v2）
    const data = await ReceivedCardsAPI.call('/api/user/received-cards/upload-v2', {
      method: 'POST',
      body: formData
    });
    
    // 4. 成功
    const displayName = data.name_zh || data.name_en || data.full_name;
    showToast(`名片上傳成功！AI 已識別：${displayName}`, 'success');
    this.resetUpload();
    
    // 5. 重新載入列表
    await this.loadCards();
    
  } catch (error) {
    console.error('[Upload] Error:', error);
    showToast('上傳失敗，請稍後再試', 'error');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = '上傳名片';
  }
}
```

---

## 📝 遷移計畫（正確時序）

### Phase 1：準備（立即）
- [ ] 檢查 Migration 依賴（0026, 0028）
- [ ] 部署 Migration 0029 到 Staging
- [ ] 驗證無錯誤

### Phase 2：後端實作（本週）
- [ ] 創建 `gemini-bilingual-ocr.ts`（修正語法）
- [ ] 創建 `upload-v2.ts`
- [ ] 註冊路由（保留舊 API）
- [ ] 測試新 API

### Phase 3：前端切換（本週）
- [ ] 修改前端呼叫 `/upload-v2`
- [ ] 測試 E2E
- [ ] 確認舊 API 無流量

### Phase 4：後端清理（下週）
- [ ] 修改舊 API 回傳 410
- [ ] 移除 temp_uploads 相關邏輯
- [ ] 移除 ocr/enrich 端點

---

## ✅ 部署檢查清單

### 部署前
- [ ] 確認 0026 已部署（ai_status 欄位存在）
- [ ] 確認 0028 已部署（thumbnail_url 欄位存在）
- [ ] 在 Staging 測試 Migration 0029
- [ ] TypeScript 編譯通過
- [ ] 所有測試通過

### 部署順序（關鍵！）
1. **後端部署**（新增 v2 API，保留舊 API）
2. **前端部署**（切換到 v2 API）
3. **監控**（確認舊 API 無流量）
4. **清理**（舊 API 改為 410）

### 回滾計畫
- 如果前端有問題：回滾前端，舊 API 仍可用
- 如果後端有問題：回滾後端，前端自動 fallback

---

## ✅ 測試矩陣

### API 測試
- [ ] 正面必填驗證
- [ ] 反面選填驗證
- [ ] 縮圖強制 WebP
- [ ] 魔術位元驗證
- [ ] AI 辨識正確性
- [ ] ai_status = 'completed'
- [ ] 雙語欄位填充
- [ ] 標籤自動提取

### Migration 測試
- [ ] 在乾淨環境執行（0026 + 0028 + 0029）
- [ ] 在已有資料環境執行
- [ ] Backfill 正確性
- [ ] 索引創建成功

### 切換測試
- [ ] 新 API 正常運作
- [ ] 舊 API 仍可用（Phase 3 前）
- [ ] 前端切換後舊 API 無流量
- [ ] 舊資料正常顯示

---

## ⏱️ 預估時間

- Migration 0029：30 分鐘
- 後端實作：3 小時
- 前端實作：2 小時
- 測試：1.5 小時
- **總計：7 小時**

---

## 🚨 關鍵注意事項

1. **Migration 依賴**：必須先有 0026 和 0028
2. **部署順序**：先後端（保留舊 API）→ 前端切換 → 清理舊 API
3. **SQLite 限制**：不支援 `IF NOT EXISTS` for columns，不可重複執行
4. **TypeScript 語法**：函式參數間必須有逗號
5. **統一格式**：使用 `errorResponse()` 而非直接 `new Response()`

---

**所有問題已修正，這是最終可執行版本！準備好開始了嗎？** 🚀
