# 雙語名片上傳 - 修正版完整方案

## 🔴 關鍵修正

### 1. Schema 對齊
- ✅ 主鍵：`uuid`（不是 card_uuid）
- ✅ 圖片欄位：`original_image_url`（不是 image_url）
- ✅ 必填欄位：`full_name` NOT NULL（需提供占位值）

### 2. API 回傳修正
- ✅ `ReceivedCardsAPI.call()` 已回傳 JSON，不需二次解析

### 3. Binding 修正
- ✅ R2 Bucket：`PHYSICAL_CARDS`（不是 R2_BUCKET）
- ✅ OAuth：`middleware/oauth`（不是 utils/oauth）

### 4. 切換策略
- ✅ 保留舊 API（向後相容）
- ✅ 新增 `/upload-bilingual`（新功能）
- ✅ 不移除 temp_uploads（既有流程依賴）

---

## 📋 後端實作（修正版）

### 檔案：`workers/src/handlers/user/received-cards/upload-bilingual.ts`

```typescript
import { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';  // 修正路徑
import { jsonResponse, errorResponse } from '../../../utils/response';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 驗證圖片檔案（MIME + 魔術位元 + 大小）
 */
function validateImageFile(file: File, name: string): void {
  // 1. MIME 類型檢查
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`${name}: Invalid file type. Only JPEG, PNG, WebP are allowed.`);
  }
  
  // 2. 檔案大小檢查
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
  
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) return true;
  
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
      header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) return true;
  
  return false;
}

/**
 * 處理雙語名片上傳
 */
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

  // 4. 驗證檔案（原圖 + 縮圖）
  try {
    validateImageFile(front_image, 'front_image');
    validateImageFile(front_thumbnail, 'front_thumbnail');
    
    if (back_image) validateImageFile(back_image, 'back_image');
    if (back_thumbnail) validateImageFile(back_thumbnail, 'back_thumbnail');
    
    // 魔術位元檢查
    if (!await validateMagicBytes(front_image)) {
      throw new Error('front_image: Invalid image format');
    }
    if (back_image && !await validateMagicBytes(back_image)) {
      throw new Error('back_image: Invalid image format');
    }
  } catch (error) {
    return errorResponse('INVALID_FILE', error.message, 400);
  }

  // 5. 生成 UUID 和檔案路徑
  const uuid = crypto.randomUUID();  // 使用 uuid（不是 card_uuid）
  const timestamp = Date.now();
  
  const frontImageKey = `uploads/${user.email}/${uuid}-front`;
  const backImageKey = back_image ? `uploads/${user.email}/${uuid}-back` : null;
  const frontThumbnailKey = `thumbnails/${user.email}/${uuid}-front`;
  const backThumbnailKey = back_thumbnail ? `thumbnails/${user.email}/${uuid}-back` : null;

  try {
    // 6. 上傳到 R2（使用 PHYSICAL_CARDS binding）
    await env.PHYSICAL_CARDS.put(frontImageKey, front_image);
    await env.PHYSICAL_CARDS.put(frontThumbnailKey, front_thumbnail);
    
    if (back_image && backImageKey) {
      await env.PHYSICAL_CARDS.put(backImageKey, back_image);
    }
    if (back_thumbnail && backThumbnailKey) {
      await env.PHYSICAL_CARDS.put(backThumbnailKey, back_thumbnail);
    }

    // 7. 創建名片記錄（使用正確的欄位名）
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
      '(待補充)',  // full_name 占位值（NOT NULL 約束）
      frontImageKey, backImageKey,
      frontThumbnailKey, backThumbnailKey,
      timestamp, timestamp
    ).run();

    // 8. 回傳結果（使用 uuid）
    return jsonResponse({
      uuid,  // 不是 card_uuid
      front_image_url: frontImageKey,
      back_image_url: backImageKey,
      front_thumbnail_url: frontThumbnailKey,
      back_thumbnail_url: backThumbnailKey
    });

  } catch (error) {
    // 補償：清理已上傳的檔案
    await Promise.allSettled([
      env.PHYSICAL_CARDS.delete(frontImageKey),
      env.PHYSICAL_CARDS.delete(frontThumbnailKey),
      backImageKey ? env.PHYSICAL_CARDS.delete(backImageKey) : Promise.resolve(),
      backThumbnailKey ? env.PHYSICAL_CARDS.delete(backThumbnailKey) : Promise.resolve()
    ]);

    console.error('[UploadBilingual] Error:', error);
    return errorResponse('UPLOAD_FAILED', 'Failed to upload card', 500);
  }
}
```

---

## 🎨 前端實作（修正版）

### 檔案：`workers/public/js/received-cards.js`

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
    
    if (!frontInput || !backInput || !uploadBtn || !cancelBtn) return;
    
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
      const img = document.getElementById(imgId);
      const container = document.getElementById(containerId);
      if (img && container) {
        img.src = e.target.result;
        container.classList.remove('hidden');
      }
    };
    reader.readAsDataURL(file);
  },
  
  updateUploadButton() {
    const uploadBtn = document.getElementById('upload-bilingual-btn');
    if (uploadBtn) {
      uploadBtn.disabled = !this.frontImage;
    }
  },
  
  async upload() {
    if (!this.frontImage) {
      showToast('請選擇正面圖片', 'error');
      return;
    }
    
    const uploadBtn = document.getElementById('upload-bilingual-btn');
    if (!uploadBtn) return;
    
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
      
      // 3. 上傳（ReceivedCardsAPI.call 已回傳 JSON，不需二次解析）
      const data = await ReceivedCardsAPI.call('/api/user/received-cards/upload-bilingual', {
        method: 'POST',
        body: formData
      });
      
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
    
    const frontInput = document.getElementById('front-image-input');
    const backInput = document.getElementById('back-image-input');
    const frontPreview = document.getElementById('front-preview');
    const backPreview = document.getElementById('back-preview');
    
    if (frontInput) frontInput.value = '';
    if (backInput) backInput.value = '';
    if (frontPreview) frontPreview.classList.add('hidden');
    if (backPreview) backPreview.classList.add('hidden');
    
    this.updateUploadButton();
  }
};

// 修改顯示邏輯（雙語優先，向後相容）
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

function getDisplayOrganization(card) {
  const userLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
  
  if (userLang === 'zh' && card.organization_zh) return card.organization_zh;
  if (userLang === 'en' && card.organization_en) return card.organization_en;
  
  if (card.organization_zh) return card.organization_zh;
  if (card.organization_en) return card.organization_en;
  
  return card.organization || '';
}

function getDisplayTitle(card) {
  const userLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
  
  if (userLang === 'zh' && card.title_zh) return card.title_zh;
  if (userLang === 'en' && card.title_en) return card.title_en;
  
  if (card.title_zh) return card.title_zh;
  if (card.title_en) return card.title_en;
  
  return card.title || '';
}

// 修改搜尋邏輯（包含雙語欄位）
function filterCards(keyword, tags) {
  const lowerKeyword = keyword.toLowerCase();
  
  const filtered = allCards.filter(card => {
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
  
  renderCards(filtered);
}
```

---

## 📝 切換方案（Cutover Plan）

### Phase 1: 準備階段（本週）
- [x] Migration 0029 部署
- [ ] 後端 API 實作
- [ ] 前端 UI 實作
- [ ] 測試

### Phase 2: 並行運作（1-2 週）
- 保留舊 API：`/upload` + temp_uploads 流程
- 新增新 API：`/upload-bilingual`
- 使用者可選擇使用哪個流程

### Phase 3: 切換（未來）
- 評估使用情況
- 如果新流程穩定，可考慮移除舊流程
- 但不強制，保持向後相容

### 回滾方案
- 新 API 獨立，不影響舊流程
- 如有問題，直接停用新 API 路由
- 資料庫欄位保留（不回滾）

---

## ✅ 測試矩陣

### API 測試
- [ ] front 必填驗證
- [ ] back 選填驗證
- [ ] MIME 類型驗證
- [ ] 魔術位元驗證
- [ ] 檔案大小驗證（10MB）
- [ ] 縮圖驗證（同級檢查）
- [ ] 租戶隔離（跨使用者存取）

### E2E 測試
- [ ] 上傳成功後立即出現在列表
- [ ] 可編輯（雙語欄位）
- [ ] 可刪除
- [ ] 可匯出 vCard（包含雙語）
- [ ] 搜尋包含雙語欄位

### 相容性測試
- [ ] 舊資料（僅 full_name）正常顯示
- [ ] 舊資料可搜尋
- [ ] 舊資料可編輯
- [ ] 混合資料（新舊）正常運作

---

## 📊 實作時程

- Migration 0029：30 分鐘 ✅
- 後端 API：2 小時
- 前端 UI：2 小時
- 測試：1 小時
- **總計：5.5 小時**

---

**所有阻斷級問題已修正，準備好開始實作了嗎？** 🚀
