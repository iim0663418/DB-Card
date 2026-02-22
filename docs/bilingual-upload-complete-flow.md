# 雙語名片上傳 - 完整流程重構

## 🎯 目標

將現有的「單張上傳」和「批次上傳」改為「正反面上傳」，支援雙語名片。

---

## 📋 現有流程分析

### 現有單張上傳流程
```
1. 使用者選擇圖片
2. 前端生成縮圖
3. POST /api/user/received-cards/upload (FormData)
4. 後端儲存到 temp_uploads
5. 回傳 upload_id
6. 前端顯示預覽
7. 使用者點擊「儲存」
8. POST /api/user/received-cards (JSON)
9. 後端從 temp_uploads 移動到 received_cards
```

### 現有批次上傳流程
```
1. 使用者選擇多張圖片（最多 20 張）
2. POST /api/user/received-cards/batch-upload (FormData)
3. 後端儲存到 temp_uploads（batch_id）
4. 前端輪詢 GET /api/user/received-cards/batch/:batch_id
5. 顯示進度
```

### 問題
- ❌ 無法配對正反面
- ❌ 批次上傳無實際意義（無 OCR）
- ❌ 不支援雙語

---

## 🔄 新流程設計

### 新流程：正反面上傳
```
1. 使用者選擇正面圖片（必填）
2. 使用者選擇反面圖片（可選）
3. 前端生成兩張縮圖
4. POST /api/user/received-cards/upload-bilingual (FormData)
   - front_image: File
   - back_image: File (optional)
   - front_thumbnail: Blob
   - back_thumbnail: Blob (optional)
5. 後端直接創建 received_cards（不使用 temp_uploads）
6. 回傳 card_uuid
7. 前端重新載入名片列表
```

### 優勢
- ✅ 一次上傳完整資訊
- ✅ 支援正反面配對
- ✅ 簡化流程（移除 temp_uploads）
- ✅ 為雙語 AI 做準備

---

## 🗄️ 資料庫變更

### Migration 0029
```sql
-- 1. 新增雙語欄位
ALTER TABLE received_cards ADD COLUMN back_image_url TEXT;
ALTER TABLE received_cards ADD COLUMN back_thumbnail_url TEXT;
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

-- 2. Backfill 既有資料
UPDATE received_cards 
SET name_zh = full_name,
    organization_zh = organization,
    title_zh = title,
    address_zh = address,
    data_source = 'backfill'
WHERE full_name IS NOT NULL 
  AND name_zh IS NULL
  AND deleted_at IS NULL;

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_received_cards_name_zh ON received_cards(name_zh) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_name_en ON received_cards(name_en) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_org_zh ON received_cards(organization_zh) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_org_en ON received_cards(organization_en) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_back_image ON received_cards(back_image_url) WHERE back_image_url IS NOT NULL;
```

---

## 🔧 後端實作

### 1. 新增 API 端點

**檔案**：`workers/src/handlers/user/received-cards/upload-bilingual.ts`

```typescript
import { Env } from '../../../types';
import { verifyOAuth } from '../../../utils/oauth';
import { jsonResponse, errorResponse } from '../../../utils/response';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function handleUploadBilingual(
  request: Request,
  env: Env
): Promise<Response> {
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
  const validateFile = (file: File, name: string) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`${name}: Invalid file type. Only JPEG, PNG, WebP are allowed.`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`${name}: File size exceeds 10MB limit.`);
    }
  };

  try {
    validateFile(front_image, 'front_image');
    if (back_image) validateFile(back_image, 'back_image');
  } catch (error) {
    return errorResponse('INVALID_FILE', error.message, 400);
  }

  // 5. 生成 UUID 和檔案路徑
  const card_uuid = crypto.randomUUID();
  const timestamp = Date.now();
  
  const frontImageKey = `uploads/${user.email}/${card_uuid}-front`;
  const backImageKey = back_image ? `uploads/${user.email}/${card_uuid}-back` : null;
  const frontThumbnailKey = `thumbnails/${user.email}/${card_uuid}-front`;
  const backThumbnailKey = back_thumbnail ? `thumbnails/${user.email}/${card_uuid}-back` : null;

  try {
    // 6. 上傳到 R2
    await env.R2_BUCKET.put(frontImageKey, front_image);
    await env.R2_BUCKET.put(frontThumbnailKey, front_thumbnail);
    
    if (back_image && backImageKey) {
      await env.R2_BUCKET.put(backImageKey, back_image);
    }
    if (back_thumbnail && backThumbnailKey) {
      await env.R2_BUCKET.put(backThumbnailKey, back_thumbnail);
    }

    // 7. 創建名片記錄
    await env.DB.prepare(`
      INSERT INTO received_cards (
        card_uuid, user_email, 
        image_url, back_image_url,
        thumbnail_url, back_thumbnail_url,
        data_source, ai_confidence,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'manual', 0.0, ?, ?)
    `).bind(
      card_uuid, user.email,
      frontImageKey, backImageKey,
      frontThumbnailKey, backThumbnailKey,
      timestamp, timestamp
    ).run();

    // 8. 回傳結果
    return jsonResponse({
      card_uuid,
      front_image_url: frontImageKey,
      back_image_url: backImageKey,
      front_thumbnail_url: frontThumbnailKey,
      back_thumbnail_url: backThumbnailKey
    });

  } catch (error) {
    // 補償：清理已上傳的檔案
    await Promise.allSettled([
      env.R2_BUCKET.delete(frontImageKey),
      env.R2_BUCKET.delete(frontThumbnailKey),
      backImageKey ? env.R2_BUCKET.delete(backImageKey) : Promise.resolve(),
      backThumbnailKey ? env.R2_BUCKET.delete(backThumbnailKey) : Promise.resolve()
    ]);

    console.error('[UploadBilingual] Error:', error);
    return errorResponse('UPLOAD_FAILED', 'Failed to upload card', 500);
  }
}
```

### 2. 註冊路由

**檔案**：`workers/src/index.ts`

```typescript
import { handleUploadBilingual } from './handlers/user/received-cards/upload-bilingual';

// 在路由區塊新增
if (url.pathname === '/api/user/received-cards/upload-bilingual' && request.method === 'POST') {
  return addMinimalSecurityHeaders(await handleUploadBilingual(request, env));
}
```

---

## 🎨 前端實作

### 1. 修改上傳 UI

**檔案**：`workers/public/user-portal.html`

**移除**：
- 批次上傳拖曳區域
- 批次進度條

**新增**：
```html
<!-- 正反面上傳區域 -->
<div id="bilingual-upload-section" class="mb-6">
  <h3 class="text-lg font-semibold mb-4">上傳名片</h3>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- 正面 -->
    <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <div id="front-preview" class="hidden mb-4">
        <img id="front-preview-img" class="max-h-48 mx-auto rounded" />
      </div>
      <label for="front-image-input" class="cursor-pointer">
        <svg class="mx-auto h-12 w-12 text-gray-400 mb-2">
          <!-- Upload icon -->
          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="text-sm text-gray-600">正面 *（必填）</p>
        <p class="text-xs text-gray-500">點擊選擇圖片</p>
      </label>
      <input 
        type="file" 
        id="front-image-input" 
        accept="image/jpeg,image/jpg,image/png,image/webp"
        class="hidden"
      />
    </div>
    
    <!-- 反面 -->
    <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <div id="back-preview" class="hidden mb-4">
        <img id="back-preview-img" class="max-h-48 mx-auto rounded" />
      </div>
      <label for="back-image-input" class="cursor-pointer">
        <svg class="mx-auto h-12 w-12 text-gray-400 mb-2">
          <!-- Upload icon -->
          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="text-sm text-gray-600">反面（可選）</p>
        <p class="text-xs text-gray-500">點擊選擇圖片</p>
      </label>
      <input 
        type="file" 
        id="back-image-input" 
        accept="image/jpeg,image/jpg,image/png,image/webp"
        class="hidden"
      />
    </div>
  </div>
  
  <!-- 上傳按鈕 -->
  <div class="flex justify-end gap-2 mt-4">
    <button 
      id="cancel-upload-btn"
      class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
    >
      取消
    </button>
    <button 
      id="upload-bilingual-btn"
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      disabled
    >
      上傳名片
    </button>
  </div>
</div>
```

### 2. 修改 JavaScript

**檔案**：`workers/public/js/received-cards.js`

**移除**：
- `BatchUpload` 模組
- 批次上傳相關函式

**新增**：
```javascript
// ==================== Bilingual Upload Module ====================

const BilingualUpload = {
  frontImage: null,
  backImage: null,
  
  init() {
    const frontInput = document.getElementById('front-image-input');
    const backInput = document.getElementById('back-image-input');
    const uploadBtn = document.getElementById('upload-bilingual-btn');
    const cancelBtn = document.getElementById('cancel-upload-btn');
    
    // 正面圖片選擇
    frontInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.frontImage = file;
        this.showPreview(file, 'front-preview', 'front-preview-img');
        this.updateUploadButton();
      }
    });
    
    // 反面圖片選擇
    backInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.backImage = file;
        this.showPreview(file, 'back-preview', 'back-preview-img');
      }
    });
    
    // 上傳按鈕
    uploadBtn.addEventListener('click', () => this.upload());
    
    // 取消按鈕
    cancelBtn.addEventListener('click', () => this.reset());
  },
  
  showPreview(file, containerId, imgId) {
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById(imgId).src = e.target.result;
      document.getElementById(containerId).classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  },
  
  updateUploadButton() {
    const uploadBtn = document.getElementById('upload-bilingual-btn');
    uploadBtn.disabled = !this.frontImage;
  },
  
  async upload() {
    if (!this.frontImage) {
      showToast('請選擇正面圖片', 'error');
      return;
    }
    
    const uploadBtn = document.getElementById('upload-bilingual-btn');
    uploadBtn.disabled = true;
    uploadBtn.textContent = '上傳中...';
    
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
      
      // 3. 上傳
      const response = await ReceivedCardsAPI.call('/api/user/received-cards/upload-bilingual', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      // 4. 成功
      showToast('名片上傳成功！', 'success');
      this.reset();
      
      // 5. 重新載入列表
      await loadReceivedCards();
      
    } catch (error) {
      console.error('[BilingualUpload] Error:', error);
      showToast('上傳失敗，請稍後再試', 'error');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = '上傳名片';
    }
  },
  
  reset() {
    this.frontImage = null;
    this.backImage = null;
    
    document.getElementById('front-image-input').value = '';
    document.getElementById('back-image-input').value = '';
    document.getElementById('front-preview').classList.add('hidden');
    document.getElementById('back-preview').classList.add('hidden');
    
    this.updateUploadButton();
  }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  BilingualUpload.init();
});
```

### 3. 修改顯示邏輯

**檔案**：`workers/public/js/received-cards.js`

```javascript
// 顯示名稱（優先雙語）
function getDisplayName(card) {
  const userLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
  
  // 優先使用者語言
  if (userLang === 'zh' && card.name_zh) return card.name_zh;
  if (userLang === 'en' && card.name_en) return card.name_en;
  
  // 備用語言
  if (card.name_zh) return card.name_zh;
  if (card.name_en) return card.name_en;
  
  // 向後相容
  return card.full_name || '(無名稱)';
}

// 顯示公司（優先雙語）
function getDisplayOrganization(card) {
  const userLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
  
  if (userLang === 'zh' && card.organization_zh) return card.organization_zh;
  if (userLang === 'en' && card.organization_en) return card.organization_en;
  
  if (card.organization_zh) return card.organization_zh;
  if (card.organization_en) return card.organization_en;
  
  return card.organization || '';
}

// 修改 renderCardHTML
function renderCardHTML(card) {
  const displayName = getDisplayName(card);
  const displayOrg = getDisplayOrganization(card);
  const displayTitle = card.title_zh || card.title_en || card.title || '';
  
  return `
    <div class="card-item" data-card-uuid="${card.card_uuid}">
      <!-- 縮圖 -->
      <div class="card-thumbnail">
        <img src="/api/user/received-cards/${card.card_uuid}/thumbnail" 
             alt="名片縮圖" 
             loading="lazy" />
      </div>
      
      <!-- 資訊 -->
      <div class="card-info">
        <h3>${displayName}</h3>
        <p>${displayTitle} @ ${displayOrg}</p>
      </div>
      
      <!-- 操作按鈕 -->
      <div class="card-actions">
        <button class="edit-card-btn" data-card-uuid="${card.card_uuid}">
          編輯
        </button>
      </div>
    </div>
  `;
}
```

---

## 📝 修改清單

### 後端
- [x] 創建 Migration 0029
- [x] 創建 `upload-bilingual.ts`
- [x] 註冊路由到 `index.ts`
- [ ] 部署 Migration
- [ ] 部署 Worker

### 前端
- [ ] 移除批次上傳 UI
- [ ] 新增正反面上傳 UI
- [ ] 移除 `BatchUpload` 模組
- [ ] 新增 `BilingualUpload` 模組
- [ ] 修改顯示邏輯（雙語優先）
- [ ] 修改搜尋邏輯（包含雙語欄位）

### 測試
- [ ] Migration 測試
- [ ] 上傳 API 測試
- [ ] 前端 UI 測試
- [ ] 雙語顯示測試

---

## ⏱️ 預估時間

- Migration 0029：30 分鐘
- 後端 API：1.5 小時
- 前端 UI：2 小時
- 測試：1 小時
- **總計：5 小時**

---

**準備好開始實作了嗎？** 🚀
