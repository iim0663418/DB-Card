# 實體名片孿生後台機能規劃 v2.0

## 雛形功能分析

### 前端已實作功能
1. 數位卡片 3D 翻轉（中英雙語）
2. 長按 5 秒啟動實體孿生模式
3. 實體名片雙面展示（正反面翻轉）
4. 手勢縮放（0.5x ~ 3x）
5. 旋轉控制（橫向/縱向）
6. 分享功能

### 前端數據需求
```javascript
const mockCardData = {
  // 數位卡片數據
  name_zh: "唐鳳",
  name_en: "Audrey Tang",
  title_zh: "數位發展部 部長",
  title_en: "Minister of Digital Affairs",
  email: "audrey@moda.gov.tw",
  phone: "+886 2 2737 7777",
  website: "https://moda.gov.tw",
  avatar: "https://...",
  
  // 實體孿生數據（新增）
  physical_card_front_url: "https://...",
  physical_card_back_url: "https://...",
  physical_card_orientation: "portrait" // or "landscape"
};
```

---

## 檔案上傳安全規範

### 檔案大小限制
**推薦**: 5 MB（單檔）
- 原因：實體名片照片通常 < 2 MB
- 緩衝：允許高解析度照片
- 參考：業界標準（YouTube 縮圖 2-50 MB）

### 檔案類型限制
**允許格式**: JPEG, PNG, WebP
```typescript
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
```

### 安全驗證層級（OWASP 標準）

#### Layer 1: 前端驗證（UX）
```typescript
// 檔案大小檢查
if (file.size > 5 * 1024 * 1024) {
  throw new Error('檔案大小不可超過 5 MB');
}

// 副檔名檢查
const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
if (!ALLOWED_EXTENSIONS.includes(ext)) {
  throw new Error('僅支援 JPG, PNG, WebP 格式');
}

// MIME type 檢查
if (!ALLOWED_MIME_TYPES.includes(file.type)) {
  throw new Error('不支援的檔案類型');
}
```

#### Layer 2: 後端驗證（安全）
```typescript
// 1. Content-Type 檢查
const contentType = request.headers.get('content-type');
if (!contentType?.includes('multipart/form-data')) {
  return new Response('Invalid content type', { status: 400 });
}

// 2. 檔案大小檢查（再次驗證）
if (file.size > 5 * 1024 * 1024) {
  return new Response('File too large', { status: 413 });
}

// 3. Magic Bytes 驗證（防止偽造）
const buffer = await file.arrayBuffer();
const bytes = new Uint8Array(buffer);

const MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46] // RIFF
};

function verifyMagicBytes(bytes: Uint8Array, type: string): boolean {
  const magic = MAGIC_BYTES[type];
  return magic.every((byte, i) => bytes[i] === byte);
}
```

#### Layer 3: 圖片內容驗證
```typescript
// 使用 Workers 驗證圖片可解析
try {
  const image = await fetch('https://workers.cloudflare.com/image-resizing', {
    method: 'POST',
    body: buffer,
    headers: { 'Content-Type': file.type }
  });
  
  if (!image.ok) {
    throw new Error('Invalid image file');
  }
} catch (error) {
  return new Response('Corrupted image file', { status: 400 });
}
```

### 檔案名稱安全化
```typescript
function sanitizeFilename(filename: string): string {
  // 移除路徑遍歷字元
  filename = filename.replace(/[\/\\]/g, '');
  
  // 移除特殊字元
  filename = filename.replace(/[^\w\s.-]/g, '');
  
  // 限制長度
  if (filename.length > 100) {
    const ext = filename.match(/\.[^.]+$/)?.[0] || '';
    filename = filename.substring(0, 100 - ext.length) + ext;
  }
  
  // 生成唯一檔名
  const uuid = crypto.randomUUID();
  const ext = filename.match(/\.[^.]+$/)?.[0] || '.jpg';
  return `${uuid}${ext}`;
}
```

---

## 後台機能優先級

### P0 - 核心機能（必須）

#### 1. 實體名片圖片管理
**API**: `POST /api/admin/cards/:uuid/physical-images`

**請求格式**:
```typescript
interface PhysicalImageUpload {
  front_image: File;      // 正面照片（必填）
  back_image: File;       // 背面照片（必填）
  orientation: 'portrait' | 'landscape';
}
```

**安全驗證流程**:
1. 檔案大小檢查（< 5 MB）
2. MIME type 驗證
3. Magic bytes 驗證
4. 圖片內容驗證
5. 檔名安全化
6. 壓縮與優化
7. 上傳至 R2
8. 更新資料庫

**回應格式**:
```typescript
interface UploadResponse {
  success: boolean;
  front_url: string;
  back_url: string;
  compressed_size: {
    front: number;  // bytes
    back: number;
  };
}
```

---

#### 2. 資料庫 Schema 擴充
**Migration**: `0013_physical_card_twin.sql`
```sql
-- 新增實體孿生欄位
ALTER TABLE cards ADD COLUMN physical_card_front_url TEXT;
ALTER TABLE cards ADD COLUMN physical_card_back_url TEXT;
ALTER TABLE cards ADD COLUMN physical_card_orientation TEXT DEFAULT 'portrait' 
  CHECK (physical_card_orientation IN ('portrait', 'landscape'));
ALTER TABLE cards ADD COLUMN physical_card_enabled BOOLEAN DEFAULT FALSE;

-- 新增檔案元數據（選配）
ALTER TABLE cards ADD COLUMN physical_card_front_size INTEGER;
ALTER TABLE cards ADD COLUMN physical_card_back_size INTEGER;
ALTER TABLE cards ADD COLUMN physical_card_uploaded_at TIMESTAMP;

-- 索引
CREATE INDEX idx_cards_physical_enabled ON cards(physical_card_enabled) 
  WHERE physical_card_enabled = TRUE;
```

---

#### 3. Admin Dashboard 整合
**新增 Tab**: 「實體孿生」

**UI 元件**:
```html
<div class="physical-twin-upload">
  <!-- 檔案大小提示 -->
  <div class="upload-hint">
    <i data-lucide="info"></i>
    <span>支援 JPG, PNG, WebP 格式，單檔最大 5 MB</span>
  </div>
  
  <!-- 拖放上傳區 -->
  <div class="dropzone" id="front-dropzone">
    <input type="file" accept=".jpg,.jpeg,.png,.webp" max-size="5242880">
    <p>拖放正面照片或點擊選擇</p>
    <p class="file-size">0 MB / 5 MB</p>
  </div>
  
  <div class="dropzone" id="back-dropzone">
    <input type="file" accept=".jpg,.jpeg,.png,.webp" max-size="5242880">
    <p>拖放背面照片或點擊選擇</p>
    <p class="file-size">0 MB / 5 MB</p>
  </div>
  
  <!-- 方向選擇 -->
  <div class="orientation-selector">
    <label>
      <input type="radio" name="orientation" value="portrait" checked>
      直向 (9:16)
    </label>
    <label>
      <input type="radio" name="orientation" value="landscape">
      橫向 (16:9)
    </label>
  </div>
  
  <!-- 預覽 -->
  <div class="preview-container">
    <div class="preview-card">
      <img id="front-preview" alt="正面預覽">
      <span class="preview-size"></span>
    </div>
    <div class="preview-card">
      <img id="back-preview" alt="背面預覽">
      <span class="preview-size"></span>
    </div>
  </div>
  
  <!-- 上傳按鈕 -->
  <button id="upload-btn" disabled>
    <i data-lucide="upload"></i>
    上傳實體名片
  </button>
</div>
```

**前端驗證邏輯**:
```javascript
async function validateAndUpload(frontFile, backFile) {
  // 1. 檔案大小檢查
  if (frontFile.size > 5 * 1024 * 1024 || backFile.size > 5 * 1024 * 1024) {
    showError('檔案大小不可超過 5 MB');
    return;
  }
  
  // 2. 檔案類型檢查
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(frontFile.type) || !allowedTypes.includes(backFile.type)) {
    showError('僅支援 JPG, PNG, WebP 格式');
    return;
  }
  
  // 3. 圖片尺寸檢查（建議）
  const frontDimensions = await getImageDimensions(frontFile);
  const backDimensions = await getImageDimensions(backFile);
  
  if (frontDimensions.width < 800 || frontDimensions.height < 800) {
    showWarning('建議上傳至少 800x800 像素的圖片以獲得最佳效果');
  }
  
  // 4. 上傳
  const formData = new FormData();
  formData.append('front_image', frontFile);
  formData.append('back_image', backFile);
  formData.append('orientation', orientation);
  
  const response = await fetch(`/api/admin/cards/${uuid}/physical-images`, {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json();
    showError(error.message);
    return;
  }
  
  const result = await response.json();
  showSuccess(`上傳成功！壓縮後大小：${formatBytes(result.compressed_size.front + result.compressed_size.back)}`);
}
```

---

### P1 - 增強機能（重要）

#### 4. 圖片處理服務（Workers）
**功能**:
- 自動壓縮（WebP 格式，85% 品質）
- 自動調整大小（最大 1200x1200）
- 生成縮圖（300x300）
- EXIF 資料清除（隱私保護）

**實作**:
```typescript
async function processImage(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  // 使用 Cloudflare Image Resizing API
  const response = await fetch('https://workers.cloudflare.com/image-resizing', {
    method: 'POST',
    body: buffer,
    headers: {
      'CF-Image-Resize': JSON.stringify({
        width: 1200,
        height: 1200,
        fit: 'inside',
        format: 'webp',
        quality: 85,
        metadata: 'none' // 移除 EXIF
      })
    }
  });
  
  return await response.arrayBuffer();
}
```

---

#### 5. 前端 API 整合
**API**: `GET /api/read?session={session_id}`

**回應擴充**:
```json
{
  "card_data": {
    "name_zh": "唐鳳",
    "name_en": "Audrey Tang",
    "physical_twin": {
      "enabled": true,
      "front_url": "https://r2.example.com/abc123-front.webp",
      "back_url": "https://r2.example.com/abc123-back.webp",
      "orientation": "portrait",
      "uploaded_at": "2026-01-28T09:00:00Z"
    }
  }
}
```

---

### P2 - 進階機能（可選）

#### 6. 批次上傳
- 一次上傳多張名片的實體照片
- CSV 匯入對應關係

#### 7. 圖片編輯器
- 線上裁切工具
- 亮度/對比度調整
- 旋轉與翻轉

#### 8. 使用統計
- 實體孿生模式開啟次數
- 平均停留時間
- 縮放/旋轉互動次數

---

## 技術選型：Cloudflare R2

### 為什麼選擇 R2
1. **完全免費**（100 張名片場景）
   - 免費額度：10 GB 儲存 + 100 萬次寫入 + 1000 萬次讀取
   - **零 Egress 費用**（最大優勢）

2. **Workers 原生整合**
   - 無需額外配置
   - 邊緣運算處理

3. **S3 API 相容**
   - 成熟的生態系統
   - 易於遷移

### R2 配置
```typescript
// wrangler.toml
[[r2_buckets]]
binding = "PHYSICAL_CARDS"
bucket_name = "db-card-physical-images"
preview_bucket_name = "db-card-physical-images-preview"
```

### 上傳至 R2
```typescript
async function uploadToR2(
  env: Env,
  key: string,
  buffer: ArrayBuffer,
  contentType: string
): Promise<string> {
  await env.PHYSICAL_CARDS.put(key, buffer, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable'
    }
  });
  
  // 返回公開 URL
  return `https://r2.example.com/${key}`;
}
```

---

## 實作順序建議

### Week 1: P0 核心機能
1. **Day 1**: 資料庫 Migration + Schema 設計
2. **Day 2**: 後端安全驗證邏輯（Magic Bytes + 檔案檢查）
3. **Day 3**: R2 整合 + 圖片上傳 API
4. **Day 4**: Admin Dashboard UI（拖放上傳 + 預覽）
5. **Day 5**: 測試與安全審查

### Week 2: P1 增強機能
1. **Day 1-2**: 圖片處理服務（壓縮、優化、EXIF 清除）
2. **Day 3-4**: 前端 API 整合 + card-display.html 修改
3. **Day 5**: 效能測試與優化

### Week 3: P2 進階機能（選配）
- 依需求選擇性實作

---

## 安全檢查清單（OWASP）

### 上傳階段
- [ ] 檔案大小限制（5 MB）
- [ ] 副檔名白名單（.jpg, .png, .webp）
- [ ] MIME type 驗證
- [ ] Magic bytes 驗證
- [ ] 圖片內容驗證（可解析）
- [ ] 檔名安全化（移除特殊字元）
- [ ] 路徑遍歷防護（../, \\）

### 儲存階段
- [ ] 唯一檔名生成（UUID）
- [ ] 分離儲存目錄（R2 bucket）
- [ ] 禁止執行權限
- [ ] EXIF 資料清除

### 存取階段
- [ ] 公開 URL 無法列舉
- [ ] CDN 快取設定
- [ ] CORS 白名單
- [ ] Rate limiting

---

## 驗收標準

### P0 核心機能
- [ ] 可上傳實體名片正反面照片（< 5 MB）
- [ ] 所有安全驗證層級通過
- [ ] 照片正確儲存至 R2
- [ ] Admin Dashboard 可預覽實體孿生效果
- [ ] 前端 API 回傳實體孿生數據
- [ ] card-display.html 正確顯示實體名片

### P1 增強機能
- [ ] 圖片自動壓縮至 < 500 KB
- [ ] 支援 WebP 格式
- [ ] 圖片載入速度 < 1s
- [ ] EXIF 資料已清除

### 安全性
- [ ] 通過 OWASP 檔案上傳檢查清單
- [ ] 無法上傳惡意檔案（.php, .exe, .sh）
- [ ] Magic bytes 偽造攻擊防護
- [ ] 路徑遍歷攻擊防護
