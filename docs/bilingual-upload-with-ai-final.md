# 正反面上傳 + AI 辨識 - 完整遷移方案

## 🎯 目標

基於現有 Gemini Flash 3 實作，擴充為正反面上傳 + 雙語 AI 辨識。

---

## 📋 現有流程分析

### 當前流程（Base64 + temp_uploads）
```
1. POST /api/user/received-cards/upload (JSON: image_base64)
   → 創建 temp_uploads 記錄
   
2. POST /api/user/received-cards/ocr (JSON: upload_id)
   → 從 R2 讀取圖片
   → 呼叫 Gemini Vision API
   → 回傳 OCR 結果
   
3. POST /api/user/received-cards/enrich (JSON: upload_id + OCR 結果)
   → 呼叫 Gemini + Google Search
   → 補充公司資訊
   
4. POST /api/user/received-cards (JSON: 完整資料 + upload_id)
   → 從 temp_uploads 移動到 received_cards
   → 標記 consumed = 1
```

### 問題
- ❌ 不支援正反面
- ❌ 不支援雙語同時識別
- ❌ Base64 編碼浪費頻寬
- ❌ 多次 API 呼叫（4 次）

---

## 🔄 新流程設計

### 新流程（FormData + 一次完成）
```
POST /api/user/received-cards/upload-v2 (FormData: front_image + back_image)
  ↓
1. 上傳正反面圖片到 R2
  ↓
2. 並行呼叫 Gemini Vision API（正面 + 反面）
  ↓
3. 合併雙語結果
  ↓
4. 直接創建 received_cards
  ↓
5. 回傳完整名片資料
```

### 優勢
- ✅ 支援正反面
- ✅ 雙語同時識別
- ✅ FormData 直接傳輸
- ✅ 一次 API 完成（簡化流程）

---

## 🗄️ Migration 0029（修正版）

### 檔案：`workers/migrations/0029_bilingual_card_support.sql`

```sql
-- Migration 0029: Bilingual Card Support (修正版)
-- 避免與 0028 衝突

-- 1. 新增反面圖片欄位
ALTER TABLE received_cards ADD COLUMN back_image_url TEXT;
ALTER TABLE received_cards ADD COLUMN back_thumbnail_url TEXT;

-- 2. 新增雙語欄位
ALTER TABLE received_cards ADD COLUMN name_zh TEXT;
ALTER TABLE received_cards ADD COLUMN name_en TEXT;
ALTER TABLE received_cards ADD COLUMN title_zh TEXT;
ALTER TABLE received_cards ADD COLUMN title_en TEXT;
ALTER TABLE received_cards ADD COLUMN organization_zh TEXT;
ALTER TABLE received_cards ADD COLUMN organization_en TEXT;
ALTER TABLE received_cards ADD COLUMN address_zh TEXT;
ALTER TABLE received_cards ADD COLUMN address_en TEXT;

-- 3. AI 信心分數與來源追蹤
ALTER TABLE received_cards ADD COLUMN ai_confidence REAL DEFAULT 0.0;
ALTER TABLE received_cards ADD COLUMN data_source TEXT DEFAULT 'manual';

-- 4. Backfill 既有資料
UPDATE received_cards 
SET name_zh = full_name,
    organization_zh = organization,
    title_zh = title,
    address_zh = address,
    data_source = 'backfill'
WHERE full_name IS NOT NULL 
  AND name_zh IS NULL 
  AND deleted_at IS NULL;

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_received_cards_name_zh ON received_cards(name_zh) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_name_en ON received_cards(name_en) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_org_zh ON received_cards(organization_zh) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_org_en ON received_cards(organization_en) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_back_image ON received_cards(back_image_url) WHERE back_image_url IS NOT NULL;

-- 注意：thumbnail_url 已在 0028 新增，此處不重複
```

---

## 🔧 後端實作

### 1. 新增 AI 辨識函式（雙語版）

**檔案：`workers/src/utils/gemini-bilingual-ocr.ts`**

```typescript
import type { Env } from '../types';

export interface BilingualOCRResult {
  // 中文
  name_zh: string | null;
  title_zh: string | null;
  organization_zh: string | null;
  address_zh: string | null;
  
  // 英文
  name_en: string | null;
  title_en: string | null;
  organization_en: string | null;
  address_en: string | null;
  
  // 共用
  phone: string | null;
  email: string | null;
  website: string | null;
  
  // 元資料
  ai_confidence: number;
  ocr_raw_text: string;
}

/**
 * 呼叫 Gemini Vision API 進行雙語 OCR
 */
async function performBilingualOCR(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  side: 'front' | 'back'
): Promise<Partial<BilingualOCRResult>> {
  const prompt = `【任務: 雙語名片 OCR - ${side === 'front' ? '正面' : '反面'}】
請辨識圖片中的名片資訊，回傳 JSON（嚴禁任何開場白或結語）：
{
  "name_zh": "中文姓名",
  "name_en": "English Name",
  "title_zh": "中文職稱",
  "title_en": "English Title",
  "organization_zh": "中文公司名稱",
  "organization_en": "English Company Name",
  "address_zh": "中文地址",
  "address_en": "English Address",
  "phone": "電話（E.164 格式，如 +886912345678）",
  "email": "Email",
  "website": "網站（含 https://）"
}

注意：
- 同時提取中文和英文資訊
- 電話號碼統一為 +886... 格式
- 若無法辨識某欄位，回傳 null
- 不要包含任何解釋文字`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } }
          ]
        }]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini] API error:', errorText);
    throw new Error('Gemini API request failed');
  }

  const data = await response.json() as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No OCR result from Gemini');
  }

  // Parse JSON
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/```\n?/g, '');
  }

  try {
    const result = JSON.parse(cleanText);
    return {
      ...result,
      ocr_raw_text: text
    };
  } catch (error) {
    console.error('[Gemini] Failed to parse OCR result:', cleanText);
    throw new Error('Invalid OCR response format');
  }
}

/**
 * 合併正反面 OCR 結果
 */
function mergeOCRResults(
  frontResult: Partial<BilingualOCRResult>,
  backResult: Partial<BilingualOCRResult> | null
): BilingualOCRResult {
  // 優先使用正面資料，反面補充
  return {
    name_zh: frontResult.name_zh || backResult?.name_zh || null,
    name_en: frontResult.name_en || backResult?.name_en || null,
    title_zh: frontResult.title_zh || backResult?.title_zh || null,
    title_en: frontResult.title_en || backResult?.title_en || null,
    organization_zh: frontResult.organization_zh || backResult?.organization_zh || null,
    organization_en: frontResult.organization_en || backResult?.organization_en || null,
    address_zh: frontResult.address_zh || backResult?.address_zh || null,
    address_en: frontResult.address_en || backResult?.address_en || null,
    phone: frontResult.phone || backResult?.phone || null,
    email: frontResult.email || backResult?.email || null,
    website: frontResult.website || backResult?.website || null,
    ai_confidence: 0.85, // 預設信心分數
    ocr_raw_text: `Front: ${frontResult.ocr_raw_text}\n\nBack: ${backResult?.ocr_raw_text || 'N/A'}`
  };
}

/**
 * 處理正反面圖片的雙語 OCR
 */
export async function processBilingualOCR(
  frontImageBuffer: ArrayBuffer,
  backImageBuffer: ArrayBuffer | null,
  apiKey: string
): Promise<BilingualOCRResult> {
  // 轉換為 Base64
  const frontBase64 = arrayBufferToBase64(frontImageBuffer);
  const backBase64 = backImageBuffer ? arrayBufferToBase64(backImageBuffer) : null;
  
  // 並行處理正反面
  const [frontResult, backResult] = await Promise.all([
    performBilingualOCR(frontBase64, 'image/jpeg', apiKey, 'front'),
    backBase64 ? performBilingualOCR(backBase64, 'image/jpeg', apiKey, 'back') : Promise.resolve(null)
  ]);
  
  // 合併結果
  return mergeOCRResults(frontResult, backResult);
}

/**
 * ArrayBuffer 轉 Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binaryString = '';
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
    binaryString += String.fromCharCode(...chunk);
  }
  
  return btoa(binaryString);
}
```

### 2. 新增上傳 API（v2）

**檔案：`workers/src/handlers/user/received-cards/upload-v2.ts`**

```typescript
import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { jsonResponse, errorResponse } from '../../../utils/response';
import { processBilingualOCR } from '../../../utils/gemini-bilingual-ocr';
import { extractTagsFromOrganization, insertCardTags, updateTagStats } from '../../../utils/tags';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 驗證圖片檔案
 */
function validateImageFile(file: File, name: string): void {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`${name}: Invalid file type`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${name}: File size exceeds 10MB`);
  }
}

/**
 * Handle POST /api/user/received-cards/upload-v2
 * 正反面上傳 + AI 辨識 + 直接創建名片
 */
export async function handleUploadV2(request: Request, env: Env): Promise<Response> {
  const DEBUG = env.ENVIRONMENT === 'staging';
  
  try {
    if (DEBUG) console.log('[UploadV2] Request received');
    
    // 1. OAuth 驗證
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) return userResult;
    const user = userResult;

    // 2. 解析 FormData
    const formData = await request.formData();
    const front_image = formData.get('front_image') as File;
    const back_image = formData.get('back_image') as File | null;
    const front_thumbnail = formData.get('front_thumbnail') as File;
    const back_thumbnail = formData.get('back_thumbnail') as File | null;

    // 3. 驗證必填欄位
    if (!front_image || !front_thumbnail) {
      return errorResponse('MISSING_REQUIRED_FIELDS', 'front_image and front_thumbnail are required', 400);
    }

    // 4. 驗證檔案
    try {
      validateImageFile(front_image, 'front_image');
      validateImageFile(front_thumbnail, 'front_thumbnail');
      if (back_image) validateImageFile(back_image, 'back_image');
      if (back_thumbnail) validateImageFile(back_thumbnail, 'back_thumbnail');
    } catch (error) {
      return errorResponse('INVALID_FILE', error.message, 400);
    }

    // 5. 生成 UUID 和檔案路徑
    const uuid = crypto.randomUUID();
    const timestamp = Date.now();
    
    const frontImageKey = `received/${user.email}/${uuid}-front`;
    const backImageKey = back_image ? `received/${user.email}/${uuid}-back` : null;
    const frontThumbnailKey = `received/${user.email}/${uuid}-front-thumb`;
    const backThumbnailKey = back_thumbnail ? `received/${user.email}/${uuid}-back-thumb` : null;

    try {
      // 6. 上傳到 R2
      await env.PHYSICAL_CARDS.put(frontImageKey, front_image);
      await env.PHYSICAL_CARDS.put(frontThumbnailKey, front_thumbnail);
      
      if (back_image && backImageKey) {
        await env.PHYSICAL_CARDS.put(backImageKey, back_image);
      }
      if (back_thumbnail && backThumbnailKey) {
        await env.PHYSICAL_CARDS.put(backThumbnailKey, back_thumbnail);
      }

      // 7. AI 辨識（並行處理正反面）
      const frontBuffer = await front_image.arrayBuffer();
      const backBuffer = back_image ? await back_image.arrayBuffer() : null;
      
      const ocrResult = await processBilingualOCR(
        frontBuffer,
        backBuffer,
        env.GEMINI_API_KEY
      );

      // 8. 生成 full_name（向後相容）
      const full_name = ocrResult.name_zh || ocrResult.name_en || '(待補充)';
      const organization = ocrResult.organization_zh || ocrResult.organization_en || null;
      const title = ocrResult.title_zh || ocrResult.title_en || null;
      const address = ocrResult.address_zh || ocrResult.address_en || null;

      // 9. 創建名片記錄
      await env.DB.prepare(`
        INSERT INTO received_cards (
          uuid, user_email, 
          full_name, organization, title, phone, email, website, address,
          name_zh, name_en,
          title_zh, title_en,
          organization_zh, organization_en,
          address_zh, address_en,
          original_image_url, back_image_url,
          thumbnail_url, back_thumbnail_url,
          ocr_raw_text,
          data_source, ai_confidence,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        uuid, user.email,
        full_name, organization, title, ocrResult.phone, ocrResult.email, ocrResult.website, address,
        ocrResult.name_zh, ocrResult.name_en,
        ocrResult.title_zh, ocrResult.title_en,
        ocrResult.organization_zh, ocrResult.organization_en,
        ocrResult.address_zh, ocrResult.address_en,
        frontImageKey, backImageKey,
        frontThumbnailKey, backThumbnailKey,
        ocrResult.ocr_raw_text,
        'ai', ocrResult.ai_confidence,
        timestamp, timestamp
      ).run();

      // 10. 自動提取標籤
      if (organization) {
        const tags = extractTagsFromOrganization(organization);
        if (tags.length > 0) {
          await insertCardTags(env, uuid, tags, 'auto_keyword');
          await updateTagStats(env, user.email, tags);
        }
      }

      // 11. 回傳結果
      const response = {
        uuid,
        full_name,
        name_zh: ocrResult.name_zh,
        name_en: ocrResult.name_en,
        title_zh: ocrResult.title_zh,
        title_en: ocrResult.title_en,
        organization_zh: ocrResult.organization_zh,
        organization_en: ocrResult.organization_en,
        phone: ocrResult.phone,
        email: ocrResult.email,
        website: ocrResult.website,
        address_zh: ocrResult.address_zh,
        address_en: ocrResult.address_en,
        original_image_url: frontImageKey,
        back_image_url: backImageKey,
        thumbnail_url: frontThumbnailKey,
        back_thumbnail_url: backThumbnailKey,
        ai_confidence: ocrResult.ai_confidence,
        created_at: timestamp
      };
      
      if (DEBUG) console.log('[UploadV2] Success:', response);
      return jsonResponse(response);

    } catch (error) {
      // 補償：清理已上傳的檔案
      await Promise.allSettled([
        env.PHYSICAL_CARDS.delete(frontImageKey),
        env.PHYSICAL_CARDS.delete(frontThumbnailKey),
        backImageKey ? env.PHYSICAL_CARDS.delete(backImageKey) : Promise.resolve(),
        backThumbnailKey ? env.PHYSICAL_CARDS.delete(backThumbnailKey) : Promise.resolve()
      ]);

      console.error('[UploadV2] Error:', error);
      return errorResponse('UPLOAD_FAILED', 'Failed to upload card', 500);
    }

  } catch (error) {
    console.error('[UploadV2] Error:', error);
    return errorResponse('UPLOAD_FAILED', 'Failed to process upload', 500);
  }
}
```

### 3. 註冊路由

**檔案：`workers/src/index.ts`**

```typescript
import { handleUploadV2 } from './handlers/user/received-cards/upload-v2';

// 在路由區塊新增（保留舊 API）
if (url.pathname === '/api/user/received-cards/upload-v2' && request.method === 'POST') {
  return addMinimalSecurityHeaders(await handleUploadV2(request, env));
}

// 舊 API 保留（向後相容）
if (url.pathname === '/api/user/received-cards/upload' && request.method === 'POST') {
  return addMinimalSecurityHeaders(await handleUpload(request, env));
}
```

---

## 🎨 前端實作

### 修改：`workers/public/js/received-cards.js`

```javascript
// 修改上傳方法
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
    // 1. 生成縮圖
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
    
    // 3. 上傳（使用新 API）
    const data = await ReceivedCardsAPI.call('/api/user/received-cards/upload-v2', {
      method: 'POST',
      body: formData
    });
    
    // 4. 成功
    showToast(`名片上傳成功！AI 已識別：${data.full_name}`, 'success');
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

## 📝 遷移計畫

### Phase 1：準備（立即）
- [x] Migration 0029（修正版，避免衝突）
- [ ] 部署 Migration 到 Staging
- [ ] 驗證無錯誤

### Phase 2：後端實作（本週）
- [ ] 創建 `gemini-bilingual-ocr.ts`
- [ ] 創建 `upload-v2.ts`
- [ ] 註冊路由
- [ ] 測試 API

### Phase 3：前端切換（本週）
- [ ] 修改上傳 UI（正反面）
- [ ] 修改上傳邏輯（呼叫 v2 API）
- [ ] 修改顯示邏輯（雙語優先）
- [ ] 測試 E2E

### Phase 4：監控與清理（未來）
- [ ] 監控舊 API 使用情況
- [ ] 逐步移除舊流程（upload → ocr → enrich → save）
- [ ] 移除 temp_uploads 依賴

---

## ✅ 測試矩陣

### API 測試
- [ ] 正面必填驗證
- [ ] 反面選填驗證
- [ ] 檔案類型驗證
- [ ] 檔案大小驗證
- [ ] AI 辨識正確性
- [ ] 雙語欄位填充
- [ ] 租戶隔離

### 回歸測試
- [ ] 舊 API 仍可用（向後相容）
- [ ] 舊資料正常顯示
- [ ] 舊資料可搜尋
- [ ] 舊資料可編輯

### E2E 測試
- [ ] 上傳成功後立即顯示
- [ ] AI 識別結果正確
- [ ] 可編輯補齊資訊
- [ ] 可匯出 vCard（雙語）

---

## ⏱️ 預估時間

- Migration 0029：30 分鐘 ✅
- 後端實作：3 小時
- 前端實作：2 小時
- 測試：1.5 小時
- **總計：7 小時**

---

**這是基於現有 Gemini 實作的完整方案，準備好開始了嗎？** 🚀
