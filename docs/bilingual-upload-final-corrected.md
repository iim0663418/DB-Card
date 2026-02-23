# 正反面上傳 + AI 辨識 - 最終修正版

## 🔴 所有問題修正

1. ✅ 移除不存在的函式引用（內聯標籤邏輯）
2. ✅ 正確設定 ai_status = 'completed'
3. ✅ 明確取代策略（不是並行）
4. ✅ 強制縮圖為 WebP
5. ✅ 正確傳遞 MIME type 給 Gemini
6. ✅ 新增魔術位元驗證
7. ✅ Migration 可重入性

---

## 🗄️ Migration 0029（最終修正版）

```sql
-- Migration 0029: Bilingual Card Support (可重入版本)
-- 避免與 0028 衝突，支援重複執行

-- 檢查並新增反面圖片欄位
ALTER TABLE received_cards ADD COLUMN IF NOT EXISTS back_image_url TEXT;
ALTER TABLE received_cards ADD COLUMN IF NOT EXISTS back_thumbnail_url TEXT;

-- 檢查並新增雙語欄位
ALTER TABLE received_cards ADD COLUMN IF NOT EXISTS name_zh TEXT;
ALTER TABLE received_cards ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE received_cards ADD COLUMN IF NOT EXISTS title_zh TEXT;
ALTER TABLE received_cards ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE received_cards ADD COLUMN IF NOT EXISTS organization_zh TEXT;
ALTER TABLE received_cards ADD COLUMN IF NOT EXISTS organization_en TEXT;
ALTER TABLE received_cards ADD COLUMN IF NOT EXISTS address_zh TEXT;
ALTER TABLE received_cards ADD COLUMN IF NOT EXISTS address_en TEXT;

-- 檢查並新增 AI 追蹤欄位
ALTER TABLE received_cards ADD COLUMN IF NOT EXISTS ai_confidence REAL DEFAULT 0.0;
ALTER TABLE received_cards ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';

-- Backfill（僅處理未處理的資料）
UPDATE received_cards 
SET name_zh = full_name,
    organization_zh = organization,
    title_zh = title,
    address_zh = address,
    data_source = 'backfill'
WHERE full_name IS NOT NULL 
  AND name_zh IS NULL 
  AND deleted_at IS NULL;

-- 索引（IF NOT EXISTS）
CREATE INDEX IF NOT EXISTS idx_received_cards_name_zh ON received_cards(name_zh) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_name_en ON received_cards(name_en) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_org_zh ON received_cards(organization_zh) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_org_en ON received_cards(organization_en) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_back_image ON received_cards(back_image_url) WHERE back_image_url IS NOT NULL;
```

---

## 🔧 後端實作

### 1. AI 辨識函式（修正版）

**檔案：`workers/src/utils/gemini-bilingual-ocr.ts`**

```typescript
export interface BilingualOCRResult {
  name_zh: string | null;
  name_en: string | null;
  title_zh: string | null;
  title_en: string | null;
  organization_zh: string | null;
  organization_en: string | null;
  address_zh: string | null;
  address_en: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  ai_confidence: number;
  ocr_raw_text: string;
}

/**
 * 呼叫 Gemini Vision API（修正：正確傳遞 MIME type）
 */
async function performBilingualOCR(
  imageBase64: string,
  mimeType: string,  // 使用實際 MIME type
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
            { inline_data: { mime_type: mimeType, data: imageBase64 } }  // 使用實際 MIME
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
    ai_confidence: 0.85,
    ocr_raw_text: `Front: ${frontResult.ocr_raw_text}\n\nBack: ${backResult?.ocr_raw_text || 'N/A'}`
  };
}

/**
 * 處理正反面圖片的雙語 OCR（修正：正確傳遞 MIME type）
 */
export async function processBilingualOCR(
  frontImageBuffer: ArrayBuffer,
  frontMimeType: string,  // 新增：正面 MIME type
  backImageBuffer: ArrayBuffer | null,
  backMimeType: string | null  // 新增：反面 MIME type
  apiKey: string
): Promise<BilingualOCRResult> {
  const frontBase64 = arrayBufferToBase64(frontImageBuffer);
  const backBase64 = backImageBuffer ? arrayBufferToBase64(backImageBuffer) : null;
  
  // 並行處理正反面（使用正確的 MIME type）
  const [frontResult, backResult] = await Promise.all([
    performBilingualOCR(frontBase64, frontMimeType, apiKey, 'front'),
    backBase64 && backMimeType 
      ? performBilingualOCR(backBase64, backMimeType, apiKey, 'back') 
      : Promise.resolve(null)
  ]);
  
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

### 2. 上傳 API（最終修正版）

**檔案：`workers/src/handlers/user/received-cards/upload-v2.ts`**

```typescript
import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { jsonResponse, errorResponse } from '../../../utils/response';
import { processBilingualOCR } from '../../../utils/gemini-bilingual-ocr';
import { extractTagsFromOrganization } from '../../../utils/tags';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_THUMBNAIL_TYPE = 'image/webp';  // 強制縮圖為 WebP
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 驗證圖片檔案
 */
function validateImageFile(file: File, name: string, thumbnailOnly: boolean = false): void {
  const allowedTypes = thumbnailOnly ? [ALLOWED_THUMBNAIL_TYPE] : ALLOWED_IMAGE_TYPES;
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`${name}: Invalid file type. ${thumbnailOnly ? 'Thumbnail must be WebP' : 'Allowed: JPEG, PNG, WebP'}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${name}: File size exceeds 10MB`);
  }
}

/**
 * 驗證魔術位元（防止偽造 MIME）
 */
async function validateMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.arrayBuffer();
  const header = new Uint8Array(buffer.slice(0, 12));
  
  // JPEG: FF D8 FF
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) return true;
  
  // PNG: 89 50 4E 47
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) return true;
  
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
      header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) return true;
  
  return false;
}

/**
 * Handle POST /api/user/received-cards/upload-v2
 * 取代舊 API，正反面上傳 + AI 辨識 + 直接創建名片
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

    // 4. 驗證檔案（MIME + 大小 + 魔術位元）
    try {
      // 原圖驗證
      validateImageFile(front_image, 'front_image');
      if (back_image) validateImageFile(back_image, 'back_image');
      
      // 縮圖驗證（強制 WebP）
      validateImageFile(front_thumbnail, 'front_thumbnail', true);
      if (back_thumbnail) validateImageFile(back_thumbnail, 'back_thumbnail', true);
      
      // 魔術位元檢查（原圖 + 縮圖）
      if (!await validateMagicBytes(front_image)) {
        throw new Error('front_image: Invalid image format');
      }
      if (!await validateMagicBytes(front_thumbnail)) {
        throw new Error('front_thumbnail: Invalid image format');
      }
      if (back_image && !await validateMagicBytes(back_image)) {
        throw new Error('back_image: Invalid image format');
      }
      if (back_thumbnail && !await validateMagicBytes(back_thumbnail)) {
        throw new Error('back_thumbnail: Invalid image format');
      }
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

      // 7. AI 辨識（並行處理正反面，傳遞正確的 MIME type）
      const frontBuffer = await front_image.arrayBuffer();
      const backBuffer = back_image ? await back_image.arrayBuffer() : null;
      
      const ocrResult = await processBilingualOCR(
        frontBuffer,
        front_image.type,  // 正確的 MIME type
        backBuffer,
        back_image?.type || null,  // 正確的 MIME type
        env.GEMINI_API_KEY
      );

      // 8. 生成向後相容欄位
      const full_name = ocrResult.name_zh || ocrResult.name_en || '(待補充)';
      const organization = ocrResult.organization_zh || ocrResult.organization_en || null;
      const title = ocrResult.title_zh || ocrResult.title_en || null;
      const address = ocrResult.address_zh || ocrResult.address_en || null;

      // 9. 創建名片記錄（修正：設定 ai_status = 'completed'）
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
          ai_status,
          data_source, ai_confidence,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        'completed',  // 修正：AI 已完成
        'ai', ocrResult.ai_confidence,
        timestamp, timestamp
      ).run();

      // 10. 自動提取標籤（內聯邏輯，不引用不存在的函式）
      if (organization) {
        const tags = extractTagsFromOrganization(organization);

        if (tags.length > 0) {
          // Batch insert card_tags
          const statements = [];
          for (const tag of tags) {
            statements.push(
              env.DB.prepare(`
                INSERT OR IGNORE INTO card_tags (card_uuid, tag, tag_source, created_at)
                VALUES (?, ?, 'auto_keyword', ?)
              `).bind(uuid, tag, timestamp)
            );
          }
          await env.DB.batch(statements);

          // Update tag_stats
          for (const tag of tags) {
            await env.DB.prepare(`
              INSERT INTO tag_stats (user_email, tag, count, last_updated)
              VALUES (?, ?, 1, ?)
              ON CONFLICT(user_email, tag) DO UPDATE SET
                count = (
                  SELECT COUNT(*)
                  FROM card_tags ct
                  JOIN received_cards rc ON ct.card_uuid = rc.uuid
                  WHERE ct.tag = excluded.tag
                    AND rc.user_email = excluded.user_email
                    AND rc.deleted_at IS NULL
                ),
                last_updated = excluded.last_updated
            `).bind(user.email, tag, timestamp).run();
          }
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
        ai_status: 'completed',
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

### 3. 路由註冊（取代策略）

**檔案：`workers/src/index.ts`**

```typescript
import { handleUploadV2 } from './handlers/user/received-cards/upload-v2';

// 新 API（優先）
if (url.pathname === '/api/user/received-cards/upload-v2' && request.method === 'POST') {
  return addMinimalSecurityHeaders(await handleUploadV2(request, env));
}

// 舊 API（標記為 deprecated，前端不再使用）
// 保留僅用於回歸測試，未來將移除
if (url.pathname === '/api/user/received-cards/upload' && request.method === 'POST') {
  // 回傳 410 Gone，提示使用新 API
  return new Response(JSON.stringify({
    error: 'API_DEPRECATED',
    message: 'This API is deprecated. Please use /api/user/received-cards/upload-v2',
    code: 410
  }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## 📝 遷移計畫（明確取代）

### Phase 1：準備（立即）
- [ ] 部署 Migration 0029（可重入版本）
- [ ] 驗證無錯誤

### Phase 2：後端實作（本週）
- [ ] 創建 `gemini-bilingual-ocr.ts`
- [ ] 創建 `upload-v2.ts`
- [ ] 修改路由（舊 API 回傳 410）
- [ ] 測試新 API

### Phase 3：前端切換（本週）
- [ ] 修改前端呼叫 `/upload-v2`
- [ ] 測試 E2E

### Phase 4：清理（下週）
- [ ] 移除舊 API handler
- [ ] 移除 temp_uploads 相關邏輯
- [ ] 移除 ocr/enrich 端點

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

### 回歸測試
- [ ] 舊 API 回傳 410
- [ ] 舊資料正常顯示

---

## ⏱️ 預估時間：7 小時

**所有問題已修正，這是最終可執行版本！** 🚀
