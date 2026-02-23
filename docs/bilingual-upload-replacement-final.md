# 雙語名片上傳 - 取代方案（最終版）

## 🎯 明確目標

**取代現有上傳流程**，不是並行運作：
- ❌ 移除：Base64 上傳 + temp_uploads 流程
- ✅ 新增：正反面 FormData 上傳 + 直接創建 received_cards
- ✅ 保留：OCR 能力（透過前端預填或後續 AI 補齊）

---

## 📋 現有流程分析

### 當前流程
```
1. 前端：選擇圖片 → Base64 編碼
2. POST /api/user/received-cards/upload (JSON: image_base64)
3. 後端：解碼 → 上傳 R2 → 創建 temp_uploads
4. 回傳：upload_id
5. 前端：顯示預覽（無 OCR）
6. 使用者：手動填寫資訊
7. POST /api/user/received-cards (JSON: 表單資料 + upload_id)
8. 後端：從 temp_uploads 移動到 received_cards
```

### 問題
- ❌ Base64 編碼浪費頻寬（+33%）
- ❌ temp_uploads 中間層無意義
- ❌ 無 OCR，使用者需手動填寫
- ❌ 不支援正反面

---

## 🔄 新流程設計

### 取代後流程
```
1. 前端：選擇正面圖片（必填）+ 反面圖片（可選）
2. 前端：生成縮圖（WebP）
3. POST /api/user/received-cards/upload (FormData: 原圖 + 縮圖)
4. 後端：驗證 → 上傳 R2 → 直接創建 received_cards
5. 回傳：uuid + 名片資料
6. 前端：立即顯示在列表（可後續編輯補齊）
```

### 優勢
- ✅ FormData 直接傳輸（無 Base64 開銷）
- ✅ 移除 temp_uploads 中間層
- ✅ 支援正反面
- ✅ 簡化流程（一次完成）

---

## 🗄️ 資料庫變更

### Migration 0029（已修正）
```sql
-- 新增雙語欄位和反面圖片
ALTER TABLE received_cards ADD COLUMN back_image_url TEXT;
ALTER TABLE received_cards ADD COLUMN back_thumbnail_url TEXT;
ALTER TABLE received_cards ADD COLUMN thumbnail_url TEXT;
ALTER TABLE received_cards ADD COLUMN name_zh TEXT;
ALTER TABLE received_cards ADD COLUMN name_en TEXT;
ALTER TABLE received_cards ADD COLUMN title_zh TEXT;
ALTER TABLE received_cards ADD COLUMN title_en TEXT;
ALTER TABLE received_cards ADD COLUMN organization_zh TEXT;
ALTER TABLE received_cards ADD COLUMN organization_en TEXT;
ALTER TABLE received_cards ADD COLUMN address_zh TEXT;
ALTER TABLE received_cards ADD COLUMN address_en TEXT;
ALTER TABLE received_cards ADD COLUMN ai_confidence REAL DEFAULT 0.0;
ALTER TABLE received_cards ADD COLUMN data_source TEXT DEFAULT 'manual';

-- Backfill 既有資料
UPDATE received_cards 
SET name_zh = full_name,
    organization_zh = organization,
    title_zh = title,
    address_zh = address,
    data_source = 'backfill'
WHERE full_name IS NOT NULL AND name_zh IS NULL AND deleted_at IS NULL;
```

---

## 🔧 後端實作（取代 upload.ts）

### 檔案：`workers/src/handlers/user/received-cards/upload.ts`（完全重寫）

```typescript
// Upload Handler for Received Cards (Bilingual Version)
// POST /api/user/received-cards/upload

import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { jsonResponse, errorResponse } from '../../../utils/response';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 驗證圖片檔案（MIME + 大小）
 */
function validateImageFile(file: File, name: string): void {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`${name}: Invalid file type. Only JPEG, PNG, WebP are allowed.`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${name}: File size exceeds 10MB limit.`);
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
 * Handle POST /api/user/received-cards/upload (取代舊版)
 */
export async function handleUpload(request: Request, env: Env): Promise<Response> {
  const DEBUG = env.ENVIRONMENT === 'staging';
  
  try {
    if (DEBUG) console.log('[Upload] Bilingual upload request received');
    
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

    // 4. 驗證檔案（原圖 + 縮圖，同級檢查）
    try {
      validateImageFile(front_image, 'front_image');
      validateImageFile(front_thumbnail, 'front_thumbnail');
      
      if (back_image) validateImageFile(back_image, 'back_image');
      if (back_thumbnail) validateImageFile(back_thumbnail, 'back_thumbnail');
      
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

      // 7. 創建名片記錄（直接創建，不使用 temp_uploads）
      await env.DB.prepare(`
        INSERT INTO received_cards (
          uuid, user_email, 
          full_name,
          original_image_url, back_image_url,
          thumbnail_url, back_thumbnail_url,
          data_source, ai_confidence,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', 0.0, ?, ?)
      `).bind(
        uuid, user.email,
        '(待補充)',  // full_name 占位值
        frontImageKey, backImageKey,
        frontThumbnailKey, backThumbnailKey,
        timestamp, timestamp
      ).run();

      // 8. 回傳結果
      const response = {
        uuid,
        original_image_url: frontImageKey,
        back_image_url: backImageKey,
        thumbnail_url: frontThumbnailKey,
        back_thumbnail_url: backThumbnailKey,
        full_name: '(待補充)',
        created_at: timestamp
      };
      
      if (DEBUG) console.log('[Upload] Success:', response);
      return jsonResponse(response);

    } catch (error) {
      // 補償：清理已上傳的檔案
      await Promise.allSettled([
        env.PHYSICAL_CARDS.delete(frontImageKey),
        env.PHYSICAL_CARDS.delete(frontThumbnailKey),
        backImageKey ? env.PHYSICAL_CARDS.delete(backImageKey) : Promise.resolve(),
        backThumbnailKey ? env.PHYSICAL_CARDS.delete(backThumbnailKey) : Promise.resolve()
      ]);

      console.error('[Upload] Error:', error);
      return errorResponse('UPLOAD_FAILED', 'Failed to upload card', 500);
    }

  } catch (error) {
    console.error('[Upload] Error:', error);
    return errorResponse('UPLOAD_FAILED', 'Failed to process upload', 500);
  }
}
```

### 路由註冊：`workers/src/index.ts`

```typescript
// 找到現有的上傳路由，確認已經存在
// 如果是 POST /api/user/received-cards/upload，不需要修改路由
// 只需要替換 handler 實作即可
```

---

## 🎨 前端實作（修改 received-cards.js）

### 檔案：`workers/public/js/received-cards.js`

**修改策略**：
1. 保留 `ReceivedCards` 物件結構
2. 修改上傳方法（Base64 → FormData）
3. 新增正反面選擇 UI
4. 修改顯示邏輯（雙語優先）

```javascript
// ==================== 修改 ReceivedCards 物件 ====================

const ReceivedCards = {
  // ... 保留現有屬性 ...
  
  frontImage: null,
  backImage: null,
  
  // 修改初始化
  init() {
    // ... 保留現有初始化 ...
    
    // 新增正反面上傳事件
    this.initBilingualUpload();
  },
  
  // 新增：初始化正反面上傳
  initBilingualUpload() {
    const frontInput = document.getElementById('front-image-input');
    const backInput = document.getElementById('back-image-input');
    const uploadBtn = document.getElementById('upload-card-btn');
    
    if (!frontInput || !uploadBtn) return;
    
    frontInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.frontImage = file;
        this.showImagePreview(file, 'front-preview');
        this.updateUploadButton();
      }
    });
    
    if (backInput) {
      backInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.backImage = file;
          this.showImagePreview(file, 'back-preview');
        }
      });
    }
    
    uploadBtn.addEventListener('click', () => this.uploadCard());
  },
  
  // 新增：顯示圖片預覽
  showImagePreview(file, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = container.querySelector('img');
      if (img) {
        img.src = e.target.result;
        container.classList.remove('hidden');
      }
    };
    reader.readAsDataURL(file);
  },
  
  // 新增：更新上傳按鈕狀態
  updateUploadButton() {
    const uploadBtn = document.getElementById('upload-card-btn');
    if (uploadBtn) {
      uploadBtn.disabled = !this.frontImage;
    }
  },
  
  // 修改：上傳名片（FormData 取代 Base64）
  async uploadCard() {
    if (!this.frontImage) {
      showToast('請選擇正面圖片', 'error');
      return;
    }
    
    const uploadBtn = document.getElementById('upload-card-btn');
    if (!uploadBtn) return;
    
    uploadBtn.disabled = true;
    uploadBtn.textContent = '上傳中...';
    
    try {
      // 1. 生成縮圖
      const frontThumbnail = await generateThumbnailClient(this.frontImage);
      const backThumbnail = this.backImage ? await generateThumbnailClient(this.backImage) : null;
      
      // 2. 準備 FormData（取代 Base64）
      const formData = new FormData();
      formData.append('front_image', this.frontImage);
      formData.append('front_thumbnail', frontThumbnail);
      
      if (this.backImage && backThumbnail) {
        formData.append('back_image', this.backImage);
        formData.append('back_thumbnail', backThumbnail);
      }
      
      // 3. 上傳（ReceivedCardsAPI.call 已回傳 JSON）
      const data = await ReceivedCardsAPI.call('/api/user/received-cards/upload', {
        method: 'POST',
        body: formData
      });
      
      // 4. 成功
      showToast('名片上傳成功！', 'success');
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
  },
  
  // 新增：重置上傳
  resetUpload() {
    this.frontImage = null;
    this.backImage = null;
    
    const frontInput = document.getElementById('front-image-input');
    const backInput = document.getElementById('back-image-input');
    const frontPreview = document.getElementById('front-preview');
    const backPreview = document.getElementById('back-preview');
    
    if (frontInput) frontInput.value = '';
    if (backInput) backInput.value = '';
    if (frontPreview) frontPreview.classList.add('hidden');
    if (backPreview) backPreview.classList.add('hidden');
    
    this.updateUploadButton();
  },
  
  // 修改：顯示名稱（雙語優先）
  getDisplayName(card) {
    const userLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
    
    if (userLang === 'zh' && card.name_zh) return card.name_zh;
    if (userLang === 'en' && card.name_en) return card.name_en;
    
    if (card.name_zh) return card.name_zh;
    if (card.name_en) return card.name_en;
    
    return card.full_name || '(待補充)';
  },
  
  // 修改：顯示公司（雙語優先）
  getDisplayOrganization(card) {
    const userLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
    
    if (userLang === 'zh' && card.organization_zh) return card.organization_zh;
    if (userLang === 'en' && card.organization_en) return card.organization_en;
    
    if (card.organization_zh) return card.organization_zh;
    if (card.organization_en) return card.organization_en;
    
    return card.organization || '';
  },
  
  // 修改：搜尋過濾（包含雙語欄位）
  filterCards(keyword, tags) {
    const lowerKeyword = keyword.toLowerCase();
    
    const filtered = this.allCards.filter(card => {
      // 搜尋過濾（包含所有語言欄位）
      const matchKeyword = !keyword || 
        card.full_name?.toLowerCase().includes(lowerKeyword) ||
        card.name_zh?.toLowerCase().includes(lowerKeyword) ||
        card.name_en?.toLowerCase().includes(lowerKeyword) ||
        card.organization?.toLowerCase().includes(lowerKeyword) ||
        card.organization_zh?.toLowerCase().includes(lowerKeyword) ||
        card.organization_en?.toLowerCase().includes(lowerKeyword) ||
        card.title?.toLowerCase().includes(lowerKeyword) ||
        card.title_zh?.toLowerCase().includes(lowerKeyword) ||
        card.title_en?.toLowerCase().includes(lowerKeyword) ||
        card.email?.toLowerCase().includes(lowerKeyword);
      
      // 標籤過濾
      const matchTags = tags.length === 0 || 
        tags.some(tag => card.tags?.includes(tag));
      
      return matchKeyword && matchTags;
    });
    
    this.renderCards(filtered);
  }
};
```

---

## 📝 修改清單

### 後端
- [x] Migration 0029（已修正）
- [ ] 完全重寫 `upload.ts`（取代 Base64 邏輯）
- [ ] 確認路由已存在（不需修改 index.ts）
- [ ] 移除 temp_uploads 依賴（或標記為 deprecated）

### 前端
- [ ] 修改 `received-cards.js`（保留物件結構）
- [ ] 新增正反面上傳 UI（HTML）
- [ ] 修改顯示邏輯（雙語優先）
- [ ] 修改搜尋邏輯（包含雙語欄位）
- [ ] 移除 Base64 編碼邏輯

### 測試
- [ ] API 測試（FormData 上傳）
- [ ] 檔案驗證測試（原圖 + 縮圖）
- [ ] E2E 測試（上傳 → 列表 → 編輯）
- [ ] 相容性測試（舊資料顯示）

---

## ⏱️ 預估時間

- Migration 0029：30 分鐘 ✅
- 後端重寫：2 小時
- 前端修改：2.5 小時
- 測試：1 小時
- **總計：6 小時**

---

## ⚠️ 關鍵決策

1. **取代而非並行**：完全重寫 upload.ts，移除 Base64 邏輯
2. **保留物件結構**：修改 ReceivedCards 物件方法，不破壞現有架構
3. **路由不變**：仍使用 `/api/user/received-cards/upload`，只改 handler
4. **占位值策略**：full_name 使用 '(待補充)'，使用者可後續編輯或 AI 補齊
5. **temp_uploads**：標記為 deprecated，但不立即移除（避免其他依賴）

---

**這是真正的取代方案，準備好開始實作了嗎？** 🚀
