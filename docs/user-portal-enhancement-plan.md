# User Portal 增強計畫 - 完整實施報告

版本: v1.0  
日期: 2026-02-22  
狀態: 待實施  
設計原則: 基於「實踐最佳產品設計」效用曲線理論

---

## 📋 執行摘要

### 戰略定位

**第一階段：核心領域（當前重點）**
- 上傳 → 辨識 → 歸檔
- 目標：讓名片「可用」
- 關鍵：流程順暢、資料完整

**第二階段：資料增值（未來規劃）**
- 基於公司資訊的智慧分析
- 目標：讓名片「有價值」
- 關鍵：Web Search 補充的公司資訊

### 核心問題
當前 User Portal 的 AI Card Capture 功能處於**第一階段未完成狀態**：
- ✅ 已有 Upload、OCR API
- ⚠️ Web Search (Enrich) 定位不明確
- ❌ 缺少完整的歸檔流程
- ❌ 使用者無法「不假思索」地完成核心任務

### 解決方案（聚焦第一階段）
投入 **27-32 小時**，完成第一階段核心功能：
1. **優化辨識流程**（OCR 結果呈現與編輯）
2. **完善歸檔機制**（vCard 匯出、標籤分類、名片縮圖）
3. **提升檢索效率**（搜尋與篩選）
4. **重新定位 Web Search**（可選的公司資訊補充，為第二階段鋪路）

#### Web Search 工具的使用場景

**核心定位**：補齊名片上沒有的資訊

**使用場景 1：事後使用者整理**
```
展會現場（快速歸檔）：
- 拍照上傳 → OCR 辨識 → 快速確認 → 儲存（跳過 AI）
- 目標：30 秒內完成歸檔

回家後（選擇性補齊）：
- 搜尋特定公司 → 查看卡片詳情
- 點擊「補齊名片資訊」→ 觸發 Web Search
- 補齊名片上沒有的欄位：
  * 公司網站（名片上沒印）
  * 完整公司名稱（名片只有簡稱）
  * 公司地址（名片上沒印）
  * 別名（英文名、暱稱）
- 目標：讓重要聯絡人的資料更完整
```

**使用場景 2：資料欄位補全**
```
OCR 辨識後（自動觸發或手動觸發）：
- OCR 只能識別名片上的文字（姓名、公司、職稱）
- Web Search 補齊名片上沒有的資訊：
  * 別名（英文名、暱稱）
  * 完整公司名稱（OCR 可能只有簡稱）
  * 標準化職稱（統一格式）
  * 公司網站（若名片上沒印）
  * 公司地址（若名片上沒印）
  * 公司摘要（背景資訊，非名片內容）
- 目標：讓名片資料更完整、更標準化
```

**價值主張**：
- 不阻塞核心流程（可選增強）
- 補齊名片上沒有的結構化資訊（網站、地址、別名）
- 為第二階段鋪路（累積公司摘要用於智慧分析）
- 提供使用者彈性（現場快速 vs 回家詳細）

### 預期成效
- 使用者能在 **30 秒內**完成「拍照 → 歸檔」
- 使用者能在 **5 秒內**找到特定名片
- 使用者能在 **3 秒內**匯出 vCard
- Web Search 成為「可選增強」，不阻塞核心流程

---

## 🎯 設計原則：效用曲線分析

### 核心問題：當前 User Portal 在哪個階段？

```
第一階段：上傳 → 辨識 → 歸檔（核心領域）
┌─────────────────────────────────────────┐
│ 高 │              ╱─────────────────────│ 可用門檻
│    │           ╱                        │
│ 價 │        ╱                           │
│ 值 │     ╱                              │
│    │  ╱                                 │
│ 低 │╱___________________________________│ 零值區域
│    └─────────────────────────────────────┤
│         投入努力 →                      │
└─────────────────────────────────────────┘
         ↑
      當前位置（未完成）

第二階段：資料增值（未來規劃）
┌─────────────────────────────────────────┐
│ 高 │                    ╱────────────── │ 高價值區
│    │                 ╱                  │
│ 價 │              ╱                     │
│ 值 │           ╱                        │
│    │        ╱                           │
│    │     ╱                              │
│ 低 │  ╱                                 │
│    │╱___________________________________│ 基礎價值
│    └─────────────────────────────────────┤
│         投入努力 →                      │
└─────────────────────────────────────────┘
         ↑
      Web Search 的價值（為此階段鋪路）
```

**診斷結果**：
- 位置：第一階段未完成
- 問題：核心流程不順暢
- 原因：Web Search 定位不明確，阻塞了核心流程

### 跨越可行性門檻的策略

#### 1. 核心任務分析（Don't Make Me Think）

**第一階段核心任務：數位化名片（上傳 → 辨識 → 歸檔）**

```
當前流程（需要思考 6 次）：
1. 上傳圖片 ✅
2. 等待 OCR... ✅
3. 看到 OCR 結果... ❓「資料正確嗎？」
4. 等待 Web Search... ⏳「要等多久？」
5. 看到公司摘要... ❓「這對我有用嗎？」
6. 編輯資料... ❓「哪些欄位是必填？」
7. 儲存... ❓「儲存後去哪裡找？」

問題診斷：
- Web Search 阻塞了核心流程（等待時間長）
- 公司摘要的價值不明確（使用者不知道有什麼用）
- 缺少「跳過 AI」選項（強制等待）

理想流程（0 次思考）：
1. 拖曳圖片 → 自動開始
2. 顯示 OCR 結果 → 一眼看出是否正確
3. 【可選】點擊「補齊名片資訊」→ 觸發 Web Search
4. 編輯資料 → 清楚標示必填欄位
5. 大按鈕「儲存到名片夾」→ 不假思索點擊
6. 自動跳轉到名片列表 → 立即看到成果

關鍵改進：
- Web Search 改為「可選增強」，不阻塞核心流程
- 預設流程：上傳 → OCR → 編輯 → 儲存（< 30 秒）
- 進階流程：上傳 → OCR → 補齊名片資訊 → 編輯 → 儲存（< 60 秒）
```

**第二階段任務：資料增值（基於公司資訊）**

```
未來規劃（不在本次範圍）：
1. 公司關係圖譜（同一公司的所有聯絡人）
2. 產業分析（某產業的所有公司）
3. 商機挖掘（基於公司摘要的智慧推薦）
4. 後續追蹤（基於公司資訊的行動建議）

前置條件：
- 需要累積足夠的公司資訊（Web Search 的價值）
- 需要完成第一階段的核心流程
```

**任務 2：找到聯絡人**
```
當前流程（需要思考 3 次）：
1. 點擊「收到的名片」✅
2. 看到列表... ❓「怎麼找到某人？」
3. 手動滾動... ❓「有沒有更快的方法？」

理想流程（0 次思考）：
1. 頂部有搜尋框 → 直接輸入名字
2. 即時過濾結果 → 立即看到
3. 點擊卡片 → 顯示完整資訊
```

**任務 3：匯出聯絡人**
```
當前流程（無法完成）：
1. 點擊「匯出」按鈕 ✅
2. 沒有反應... ❌

理想流程（0 次思考）：
1. 點擊「匯出」→ 立即下載 .vcf
2. 或顯示 QR Code → 手機掃描即可加入通訊錄
```

#### 2. 價值主張（Aha Moment）

**場景：在展會收到 50 張名片**

```
傳統做法：
- 回家後手動輸入到 Excel（2 小時）
- 或拍照存手機（找不到）
- 或直接丟掉（遺失商機）

DB-Card 做法（第一階段）：
現場（快速歸檔）：
- 拍照上傳（每張 5 秒）
- OCR 自動辨識（5-10 秒）
- 快速確認姓名、公司（5 秒）
- 點擊「儲存」（< 20 秒/張）
- 50 張名片：約 17 分鐘

回家後（補充資訊）：
- 搜尋「某公司」→ 立即找到
- 點擊「補齊名片資訊」→ 觸發 Web Search（10-30 秒）
- 查看公司摘要 → 決定是否追蹤
- 點擊「匯出」→ 加入手機通訊錄

價值：
- 現場節省時間：2 小時 - 17 分鐘 = 1.72 小時
- 回家後可選擇性補充：只對重要聯絡人執行 Web Search
- 避免名片遺失：100% 數位化
```

---

## 📊 實施計畫：完成第一階段核心功能

### 階段 1：核心領域完成（P0，27-32 小時）

**目標**：讓使用者能「不假思索」地完成「上傳 → 辨識 → 歸檔」

#### Week 1: 後端基礎（8-10h）

## 4. 實作計畫

### 技術棧說明

**前端架構**：Vanilla JavaScript + Tailwind CSS
- 不使用 Vue/React 等框架
- 所有互動使用原生 DOM API
- 事件綁定使用 `onclick` 或 `addEventListener`
- 動態內容使用 `innerHTML` 或 `textContent`

**範例**：
```javascript
// ✅ 正確：原生 JS
document.getElementById('card-name').textContent = card.full_name;
button.onclick = () => editCard(uuid);

// ❌ 錯誤：Vue 語法（本專案不使用）
// <div>{{ full_name }}</div>
// <button v-if="showButton">
```

---

### 4.1 Week 1: 後端基礎（11-13h）✨ 調整

##### 1. 重新定位 Web Search（2h）

**問題診斷**：
- 當前：Web Search 是必經流程，阻塞核心任務
- 改進：Web Search 改為「可選增強」

**實施方案**：
```javascript
// 修改 Enrich API 為可選
// 前端不再自動呼叫，改為使用者主動觸發

// 新增「跳過 AI」按鈕
const skipButton = document.createElement('button');
skipButton.className = 'btn-secondary';
skipButton.onclick = skipAI;
skipButton.innerHTML = '<span data-i18n="skip-ai">跳過 AI，直接儲存</span>';

// 新增「補齊名片資訊」按鈕（可選）
const enrichButton = document.createElement('button');
enrichButton.className = 'btn-tertiary';
enrichButton.onclick = enrichCardInfo;
enrichButton.innerHTML = `
  <i data-lucide="sparkles"></i>
  <span data-i18n="enrich-card">補齊名片資訊</span>
  <span class="text-xs text-slate-500">(可選)</span>
`;

// 流程調整
預設流程：Upload → OCR → 編輯 → 儲存（< 30 秒）
進階流程：Upload → OCR → 點擊「補齊名片資訊」→ Web Search → 編輯 → 儲存（< 60 秒）
```

**資料庫調整**：
```sql
-- Migration 0026_web_search_optional.sql（新增）

-- 1. 新增 ai_status 欄位到 received_cards 表
ALTER TABLE received_cards ADD COLUMN ai_status TEXT DEFAULT 'skipped';

-- 可能的值：
-- 'skipped': 使用者跳過 AI
-- 'pending': 等待 AI 處理（Phase 2）
-- 'completed': AI 已完成
-- 'failed': AI 失敗

-- 2. 新增 batch_id 和 filename 欄位到 temp_uploads 表（支援批次上傳）
ALTER TABLE temp_uploads ADD COLUMN batch_id TEXT;
ALTER TABLE temp_uploads ADD COLUMN filename TEXT;
ALTER TABLE temp_uploads ADD COLUMN ocr_status TEXT DEFAULT 'pending';
ALTER TABLE temp_uploads ADD COLUMN ocr_error TEXT;
ALTER TABLE temp_uploads ADD COLUMN thumbnail_url TEXT;

CREATE INDEX idx_temp_uploads_batch ON temp_uploads(batch_id);

-- 回滾方案（若需要）
-- ALTER TABLE received_cards DROP COLUMN ai_status;
-- ALTER TABLE temp_uploads DROP COLUMN batch_id;
-- ALTER TABLE temp_uploads DROP COLUMN filename;
-- ALTER TABLE temp_uploads DROP COLUMN ocr_status;
-- ALTER TABLE temp_uploads DROP COLUMN ocr_error;
-- ALTER TABLE temp_uploads DROP COLUMN thumbnail_url;
-- DROP INDEX idx_temp_uploads_batch;

-- 統計 AI 使用率
SELECT 
  ai_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM received_cards), 2) as percentage
FROM received_cards
GROUP BY ai_status;
```

##### 2. 名片縮圖系統（3h）

**問題定義**：
- 當前：卡片列表只顯示文字資訊
- 改進：加入名片原圖縮圖，提升視覺識別度

**技術方案**：
```typescript
// R2 儲存結構
uploads/{user_email}/{upload_id}           // 原圖（已存在）
uploads/{user_email}/{upload_id}_thumb     // 縮圖（新增）

// 縮圖規格
- 尺寸：300x200 px（保持比例）
- 格式：WebP（壓縮率高）
- 品質：80%
- 大小：< 20 KB
```

**Migration 0028_card_thumbnails.sql**：
```sql
-- 新增縮圖欄位到 received_cards 表
ALTER TABLE received_cards ADD COLUMN thumbnail_url TEXT;

-- 新增索引（加速查詢）
CREATE INDEX idx_received_cards_thumbnail ON received_cards(thumbnail_url);

-- 回滾方案
-- ALTER TABLE received_cards DROP COLUMN thumbnail_url;
-- DROP INDEX idx_received_cards_thumbnail;
```

**縮圖生成邏輯（前端生成，Workers 相容）**：
```typescript
// ⚠️ node-canvas 在 Cloudflare Workers 不可用（依賴原生二進位）
// 解決方案：在瀏覽器端生成縮圖後上傳

// 前端：生成縮圖
async function generateThumbnailClient(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // 計算縮圖尺寸（保持比例）
      const MAX_WIDTH = 300;
      const MAX_HEIGHT = 200;
      let width = img.width;
      let height = img.height;
      
      if (width > MAX_WIDTH) {
        height = (height * MAX_WIDTH) / width;
        width = MAX_WIDTH;
      }
      if (height > MAX_HEIGHT) {
        width = (width * MAX_HEIGHT) / height;
        height = MAX_HEIGHT;
      }
      
      // 繪製縮圖
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // 轉換為 WebP Blob
      canvas.toBlob(resolve, 'image/webp', 0.8);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// 前端：上傳原圖與縮圖
async function uploadWithThumbnail(file: File) {
  const formData = new FormData();
  formData.append('image', file);
  
  // 生成縮圖
  const thumbnail = await generateThumbnailClient(file);
  formData.append('thumbnail', thumbnail, 'thumbnail.webp');
  
  // 上傳
  const response = await fetch('/api/user/received-cards/upload', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
}

// 後端：接收並儲存縮圖
export async function handleUpload(request: Request, env: Env): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  const formData = await request.formData();
  const imageFile = formData.get('image') as File;
  const thumbnailFile = formData.get('thumbnail') as File;
  
  const upload_id = crypto.randomUUID();
  const imageKey = `uploads/${user.email}/${upload_id}`;
  const thumbnailKey = `${imageKey}_thumb`;
  
  // 上傳原圖
  await env.R2_BUCKET.put(imageKey, imageFile);
  
  // 上傳縮圖（若提供）
  if (thumbnailFile) {
    await env.R2_BUCKET.put(thumbnailKey, thumbnailFile, {
      httpMetadata: {
        contentType: 'image/webp'
      }
    });
  }
  
  // 記錄到資料庫
  const now = Date.now();
  await env.DB.prepare(`
    INSERT INTO temp_uploads 
      (upload_id, user_email, image_url, thumbnail_url, consumed, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    upload_id,
    user.email,
    imageKey,
    thumbnailFile ? thumbnailKey : null,
    0,
    now + (24 * 60 * 60 * 1000),
    now
  ).run();
  
  return jsonResponse({ upload_id, thumbnail_url: thumbnailFile ? thumbnailKey : null });
}
```

**前端顯示**：
```html
<!-- 卡片列表 -->
<div class="card-item">
  <img 
    src="/api/user/received-cards/{uuid}/thumbnail" 
    alt="名片縮圖"
    class="card-thumbnail"
    loading="lazy"
    onerror="this.style.display='none'"
  >
  <div class="card-info">
    <h3>{{ full_name }}</h3>
    <p>{{ organization }}</p>
  </div>
</div>

<style>
.card-thumbnail {
  width: 80px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 12px;
}
</style>
```

**縮圖 API**：
```typescript
// GET /api/user/received-cards/:uuid/thumbnail
// Authorization: OAuth (Cookie)

export async function handleGetThumbnail(request: Request, env: Env, uuid: string): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  // 查詢縮圖 URL（租戶隔離）
  const card = await env.DB.prepare(`
    SELECT thumbnail_url FROM received_cards 
    WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
  `).bind(uuid, user.email).first();
  
  if (!card || !card.thumbnail_url) {
    return new Response('Thumbnail not found', { status: 404 });
  }
  
  // 從 R2 讀取縮圖
  const object = await env.R2_BUCKET.get(card.thumbnail_url as string);
  
  if (!object) {
    return new Response('Thumbnail not found', { status: 404 });
  }
  
  return new Response(object.body, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000' // 1 年快取
    }
  });
}
```

**效能優化**：
```typescript
// 1. 延遲載入（Lazy Loading）
<img loading="lazy" src="..." />

// 2. 快取策略
Cache-Control: public, max-age=31536000

// 3. 錯誤處理（縮圖不存在時隱藏）
onerror="this.style.display='none'"

// 4. 批次預載（Intersection Observer）
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target as HTMLImageElement;
      img.src = img.dataset.src!;
      observer.unobserve(img);
    }
  });
});

document.querySelectorAll('.card-thumbnail').forEach(img => {
  observer.observe(img);
});
```

**相容性處理**：
```typescript
// 既有名片沒有縮圖（Migration 前上傳的）
// 方案 1：顯示預設圖示
<div class="card-thumbnail-placeholder">
  <i data-lucide="image"></i>
</div>

// 方案 2：背景任務生成（Phase 2）
// Cron Job 每日檢查並生成缺失的縮圖
```

##### 3. vCard 匯出 API（4-5h）

**批次上傳 API**（新增）：
```typescript
// POST /api/user/received-cards/batch-upload
// Authorization: OAuth (Cookie)
// CSRF: X-CSRF-Token header
// Content-Type: multipart/form-data

Request Body:
  images: File[]  // 最多 20 張

Response (Success):
  Status: 200
  Body: {
    batch_id: string,
    total: number,
    uploads: [
      { upload_id: string, filename: string, status: 'uploaded' }
    ]
  }

Response (Error):
  Status: 400 - Too many files (> 20)
  Status: 413 - File too large
  Status: 500 - Server error
```

**批次進度查詢 API**：
```typescript
// GET /api/user/received-cards/batch/:batch_id
// Authorization: OAuth (Cookie)

Response:
{
  batch_id: string,
  total: 20,
  completed: 15,
  failed: 2,
  processing: 3,
  results: [
    {
      upload_id: string,
      filename: string,
      status: 'completed' | 'processing' | 'failed',
      card?: ReceivedCard,  // 若 completed
      error?: string        // 若 failed
    }
  ]
}
```

**實作要點**：
```typescript
export async function handleBatchUpload(request: Request, env: Env): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  const formData = await request.formData();
  const files = formData.getAll('images') as File[];
  
  // 驗證數量
  if (files.length > 20) {
    return errorResponse('TOO_MANY_FILES', 'Maximum 20 files allowed', 400);
  }
  
  // 驗證單檔大小（10MB）
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('FILE_TOO_LARGE', `File ${file.name} exceeds 10MB limit`, 413);
    }
  }
  
  const batch_id = crypto.randomUUID();
  const uploads = [];
  const now = Date.now();
  const expiresAt = now + (24 * 60 * 60 * 1000); // 24 小時後過期
  
  // 逐一上傳到 R2
  for (const file of files) {
    const upload_id = crypto.randomUUID();
    const key = `uploads/${user.email}/${upload_id}`;
    
    await env.R2_BUCKET.put(key, file);
    
    // 使用內部路徑（非公開 URL）
    const image_url = key;
    
    // 記錄到資料庫（補齊所有必填欄位）
    await env.DB.prepare(`
      INSERT INTO temp_uploads 
        (upload_id, user_email, image_url, batch_id, filename, ocr_status, consumed, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      upload_id, 
      user.email, 
      image_url, 
      batch_id, 
      file.name, 
      'pending',
      0,
      expiresAt,  // ✅ 整數
      now         // ✅ 整數
    ).run();
    
    uploads.push({
      upload_id,
      filename: file.name,
      status: 'uploaded'
    });
  }
  
  return jsonResponse({
    batch_id,
    total: files.length,
    uploads
  });
}

export async function handleBatchProgress(request: Request, env: Env, batch_id: string): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  // 查詢批次進度（使用 consumed 判斷完成狀態）
  const results = await env.DB.prepare(`
    SELECT 
      tu.upload_id,
      tu.filename,
      tu.ocr_status,
      tu.ocr_error,
      tu.consumed
    FROM temp_uploads tu
    WHERE tu.batch_id = ? AND tu.user_email = ?
    ORDER BY tu.created_at
  `).bind(batch_id, user.email).all();
  
  const total = results.results.length;
  const completed = results.results.filter(r => r.consumed === 1).length;
  const failed = results.results.filter(r => r.ocr_status === 'failed').length;
  const processing = total - completed - failed;
  
  return jsonResponse({
    batch_id,
    total,
    completed,
    failed,
    processing,
    results: results.results.map(r => ({
      upload_id: r.upload_id,
      filename: r.filename,
      status: r.consumed === 1 ? 'completed' : (r.ocr_status === 'failed' ? 'failed' : 'processing'),
      error: r.ocr_error
    }))
  });
}
```

**卡片資料契約**（含標籤）：
```typescript
interface ReceivedCard {
  uuid: string;
  full_name: string;
  organization?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  note?: string;
  company_summary?: string;
  personal_summary?: string;
  ai_status: 'skipped' | 'completed' | 'pending' | 'failed';
  tags: string[];  // 從 card_tags JOIN 聚合
  created_at: number;
  updated_at?: number;
}

// GET /api/user/received-cards 回應格式
{
  "cards": ReceivedCard[]
}

// 前端使用
const response = await fetch('/api/user/received-cards');
const data = await response.json();
const cards = data.cards;  // 陣列
```

**編輯名片 API**：
```typescript
// PUT /api/user/received-cards/:uuid
// Authorization: OAuth (Cookie)
// CSRF: X-CSRF-Token header

Request Body:
{
  full_name: string;        // 必填
  organization?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  note?: string;
}

Response (Success):
  Status: 200
  Body: { "message": "Card updated" }

Response (Error):
  Status: 404 - Card not found or not authorized (租戶隔離)
  Status: 400 - Invalid data
  Status: 500 - Server error
```

**實作要點**：
```typescript
export async function handleUpdateCard(request: Request, env: Env, uuid: string): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  const body = await request.json();
  
  // 驗證必填欄位
  if (!body.full_name) {
    return errorResponse('INVALID_REQUEST', 'full_name is required', 400);
  }
  
  // 更新名片（租戶隔離 + 軟刪除）
  const result = await env.DB.prepare(`
    UPDATE received_cards 
    SET full_name = ?, organization = ?, title = ?, phone = ?, 
        email = ?, website = ?, address = ?, note = ?, updated_at = ?
    WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
  `).bind(
    body.full_name,
    body.organization || null,
    body.title || null,
    body.phone || null,
    body.email || null,
    body.website || null,
    body.address || null,
    body.note || null,
    Date.now().toString(),
    uuid,
    user.email
  ).run();
  
  if (result.meta.changes === 0) {
    return errorResponse('CARD_NOT_FOUND', 'Card not found or already deleted', 404);
  }
  
  return jsonResponse({ message: 'Card updated' });
}
```

**vCard 匯出 API**：
```typescript
// GET /api/user/received-cards/:uuid/vcard
// Authorization: OAuth (Cookie)
// CSRF: X-CSRF-Token header

Response (Success):
  Status: 200
  Content-Type: text/vcard; charset=utf-8
  Content-Disposition: attachment; filename="{full_name}.vcf"
  Body: vCard 3.0 格式

Response (Error):
  Status: 404 - Card not found or not authorized (租戶隔離)
  Status: 500 - Server error
  Content-Type: application/json
  Body: { "error": "ERROR_CODE", "message": "..." }
```

**vCard 欄位映射**：
```
FN: full_name (必填)
N: last_name;first_name;;; (缺值用空字串)
ORG: organization (缺值省略此行)
TITLE: title (缺值省略此行)
TEL;TYPE=CELL: phone (缺值省略此行)
EMAIL: email (缺值省略此行)
URL: website (缺值省略此行)
ADR: ;;address;;;; (缺值省略此行)
NOTE: note (缺值省略此行)
  ⚠️ 第一階段：只包含 note 欄位
  ⚠️ 第二階段：可選包含 company_summary 和 personal_summary

編碼規則：
- UTF-8 with BOM
- 換行符：\r\n (CRLF，符合 RFC 2426)
- 特殊字元轉義：, ; \
```

**相容性測試矩陣**：
```
測試平台：
- iPhone iOS 17 (聯絡人 App)
- Android 14 (Google 聯絡人)
- Windows 11 (Outlook)
- macOS (聯絡人 App)

測試項目：
- 中文姓名顯示
- 特殊字元（, ; \）轉義
- 多行備註換行
- 缺值欄位處理
- UTF-8 BOM 識別
```

##### 4. 標籤系統 Schema（2h）

**Migration 0027_tags_system.sql**：
```sql
-- 1. 標籤關聯表
CREATE TABLE card_tags (
  card_uuid TEXT NOT NULL,
  tag TEXT NOT NULL,
  tag_source TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'auto_keyword' | 'auto_ai'
  created_at INTEGER NOT NULL,
  PRIMARY KEY (card_uuid, tag),
  FOREIGN KEY (card_uuid) REFERENCES received_cards(uuid) ON DELETE CASCADE
);

CREATE INDEX idx_card_tags_tag ON card_tags(tag);
CREATE INDEX idx_card_tags_card ON card_tags(card_uuid);
CREATE INDEX idx_card_tags_source ON card_tags(tag_source);

-- 2. 標籤統計表（快取）
CREATE TABLE tag_stats (
  user_email TEXT NOT NULL,
  tag TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_updated INTEGER NOT NULL,
  PRIMARY KEY (user_email, tag)
);

CREATE INDEX idx_tag_stats_user ON tag_stats(user_email);
CREATE INDEX idx_tag_stats_count ON tag_stats(user_email, count DESC);
```

**標籤來源說明**：
- `manual`: 使用者手動新增（第一階段）
- `auto_keyword`: 關鍵字自動提取（第一階段，基於 organization 欄位）
- `auto_ai`: AI 自動提取（第二階段，基於 company_summary）

##### 4. 標籤提取邏輯（2-3h）

**第一階段：基於 organization 的關鍵字匹配**：
```typescript
// 簡化版本：只從 organization 欄位提取
function extractTagsFromOrganization(organization: string): string[] {
  if (!organization) return [];
  
  const COMPANY_TYPE_KEYWORDS = {
    government: ['政府', '部會', '機關', '局', '署', '處'],
    listed: ['股份有限公司', '有限公司', 'Co., Ltd.', 'Inc.'],
    startup: ['新創', '創業', 'Startup'],
    ngo: ['基金會', '協會', '學會', '公會']
  };
  
  const tags = new Set<string>();
  const lowerOrg = organization.toLowerCase();
  
  for (const [type, keywords] of Object.entries(COMPANY_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerOrg.includes(keyword.toLowerCase())) {
        tags.add(type);
        break; // 每個類型只加一次
      }
    }
  }
  
  return Array.from(tags);
}

// 儲存時自動提取（基於 organization）
async function handleSaveCard(request: Request, env: Env): Promise<Response> {
  // ... 儲存卡片 ...
  
  // 自動提取標籤（基於 organization，非 company_summary）
  if (body.organization) {
    const tags = extractTagsFromOrganization(body.organization);
    
    const statements = [];
    for (const tag of tags) {
      statements.push(
        env.DB.prepare(`
          INSERT OR IGNORE INTO card_tags (card_uuid, tag, tag_source, created_at)
          VALUES (?, ?, 'auto_keyword', ?)
        `).bind(cardUuid, tag, Date.now())
      );
    }
    
    if (statements.length > 0) {
      await env.DB.batch(statements);
      
      // 更新統計（使用 UPSERT，租戶隔離）
      for (const tag of tags) {
        await env.DB.prepare(`
          INSERT INTO tag_stats (user_email, tag, count, last_updated)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(user_email, tag) DO UPDATE SET
            count = (
              SELECT COUNT(*) 
              FROM card_tags ct
              JOIN received_cards rc ON ct.card_uuid = rc.uuid
              WHERE ct.tag = excluded.tag AND rc.user_email = excluded.user_email AND rc.deleted_at IS NULL
            ),
            last_updated = excluded.last_updated
        `).bind(user.email, tag, Date.now()).run();
      }
    }
  }
  
  return jsonResponse({ uuid: cardUuid });
}
```

**第二階段：基於 company_summary 的 AI 提取（未來規劃）**：
```typescript
// 當 company_summary 存在時，使用 AI 提取更精準的標籤
async function extractTagsWithAI(summary: string, env: Env): Promise<string[]> {
  const prompt = `從以下公司摘要提取 3-5 個關鍵標籤（產業、技術、規模）：\n${summary}\n\n只回傳標籤，用逗號分隔。`;
  
  // 呼叫 Gemini API
  // 標籤來源：'auto_ai'
}
```

**API 端點**：
```typescript
// GET /api/user/received-cards/tags
// 列出所有標籤（含統計，租戶隔離）
Response: [
  { tag: 'government', count: 15, last_updated: 1234567890 },
  { tag: 'listed', count: 8, last_updated: 1234567890 }
]

// 實作（租戶隔離）
export async function handleListTags(request: Request, env: Env): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  // 租戶隔離：只統計該使用者的標籤
  const tags = await env.DB.prepare(`
    SELECT 
      ct.tag,
      COUNT(*) as count,
      MAX(ct.created_at) as last_updated
    FROM card_tags ct
    JOIN received_cards rc ON ct.card_uuid = rc.uuid
    WHERE rc.user_email = ? AND rc.deleted_at IS NULL
    GROUP BY ct.tag
    ORDER BY count DESC
  `).bind(user.email).all();

  return jsonResponse(tags.results);
}

// POST /api/user/received-cards/:uuid/tags
// 手動新增標籤
Body: { tag: 'government' }
Response: { message: 'Tag added' }

// DELETE /api/user/received-cards/:uuid/tags/:tag
// 刪除標籤
Response: { message: 'Tag deleted' }

// GET /api/user/received-cards/:uuid/tags
// 取得卡片標籤
Response: [
  { tag: 'government', tag_source: 'auto_keyword', created_at: 1234567890 }
]
```

---

#### Week 2: 前端整合（10-12h）

##### 5. 批次上傳 UI（4h）

**拖曳上傳區域**：
```html
<div 
  id="batch-upload-zone" 
  class="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center"
  ondrop="handleDrop(event)"
  ondragover="handleDragOver(event)"
>
  <i data-lucide="upload-cloud" class="w-12 h-12 mx-auto text-slate-400"></i>
  <p class="mt-4 text-slate-600">拖曳照片到此處，或點擊選擇</p>
  <p class="text-sm text-slate-500">最多 20 張，每張最大 10MB</p>
  <input 
    type="file" 
    id="batch-file-input" 
    multiple 
    accept="image/*" 
    class="hidden"
    onchange="handleFileSelect(event)"
  >
  <button onclick="document.getElementById('batch-file-input').click()" class="btn-primary mt-4">
    選擇照片
  </button>
</div>
```

**批次上傳流程**：
```typescript
async function handleFileSelect(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files || []);
  
  if (files.length > 20) {
    showErrorToast('最多只能上傳 20 張照片');
    return;
  }
  
  // 顯示預覽
  showBatchPreview(files);
  
  // 開始上傳
  await uploadBatch(files);
}

async function uploadBatch(files: File[]) {
  const formData = new FormData();
  files.forEach(file => formData.append('images', file));
  
  try {
    showLoading('上傳中...');
    
    const response = await ReceivedCardsAPI.call('/api/user/received-cards/batch-upload', {
      method: 'POST',
      body: formData
    });
    
    hideLoading();
    
    // 開始輪詢進度
    pollBatchProgress(response.batch_id);
    
  } catch (error) {
    hideLoading();
    showErrorToast('上傳失敗');
  }
}

async function pollBatchProgress(batch_id: string) {
  const progressModal = showModal('batch-progress-modal');
  
  const interval = setInterval(async () => {
    try {
      const progress = await ReceivedCardsAPI.call(`/api/user/received-cards/batch/${batch_id}`);
      
      // 更新進度條
      updateProgressBar(progress.completed, progress.total);
      updateProgressList(progress.results);
      
      // 全部完成
      if (progress.completed + progress.failed === progress.total) {
        clearInterval(interval);
        showBatchComplete(progress);
      }
      
    } catch (error) {
      clearInterval(interval);
      showErrorToast('查詢進度失敗');
    }
  }, 2000); // 每 2 秒查詢一次
}
```

**進度顯示 UI**：
```html
<div id="batch-progress-modal" class="modal">
  <div class="modal-content">
    <h3>批次辨識中...</h3>
    
    <!-- 進度條 -->
    <div class="progress-bar">
      <div id="progress-fill" class="progress-fill" style="width: 0%"></div>
    </div>
    <p id="progress-text" class="text-center mt-2">已完成 0/20 張</p>
    
    <!-- 詳細列表 -->
    <div id="progress-list" class="mt-4 max-h-64 overflow-y-auto">
      <!-- 動態插入 -->
    </div>
    
    <!-- 失敗項目 -->
    <div id="failed-items" class="mt-4 text-red-600" style="display: none;">
      <p class="font-bold">辨識失敗的照片：</p>
      <ul id="failed-list" class="list-disc pl-5"></ul>
    </div>
    
    <button onclick="closeModal('batch-progress-modal')" class="btn-primary mt-4">
      關閉
    </button>
  </div>
</div>
```

**進度項目顯示**：
```typescript
function updateProgressList(results: any[]) {
  const list = document.getElementById('progress-list');
  list.innerHTML = results.map(r => `
    <div class="flex items-center justify-between py-2 border-b">
      <span class="text-sm">${r.filename}</span>
      <span class="badge ${getStatusBadgeClass(r.status)}">
        ${getStatusText(r.status)}
      </span>
    </div>
  `).join('');
  
  // 顯示失敗項目
  const failed = results.filter(r => r.status === 'failed');
  if (failed.length > 0) {
    document.getElementById('failed-items').style.display = 'block';
    document.getElementById('failed-list').innerHTML = failed.map(r => `
      <li>${r.filename}: ${r.error}</li>
    `).join('');
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'completed': return 'badge-green';
    case 'processing': return 'badge-blue';
    case 'failed': return 'badge-red';
    default: return 'badge-gray';
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'completed': return '✓ 完成';
    case 'processing': return '⏳ 處理中';
    case 'failed': return '✗ 失敗';
    default: return '等待中';
  }
}
```

##### 6. 搜尋 + 標籤篩選（4-5h）

**搜尋策略**：
```typescript
// 前端搜尋（預設，名片數 <= 200）
const MAX_CARDS_FOR_CLIENT_SEARCH = 200;

async function loadCards() {
  const response = await fetch('/api/user/received-cards');
  const data = await response.json();
  const cards = data.cards;  // ✅ 正確讀取
  
  if (cards.length > MAX_CARDS_FOR_CLIENT_SEARCH) {
    showWarning('名片數量較多，建議使用進階搜尋');
    enableServerSearch();
  } else {
    enableClientSearch(cards);
  }
}

// 客戶端搜尋（即時過濾，300ms debounce）
function enableClientSearch(cards) {
  searchInput.oninput = debounce((e) => {
    const query = e.target.value.toLowerCase();
    const filtered = cards.filter(card => 
      card.full_name.toLowerCase().includes(query) ||
      card.organization?.toLowerCase().includes(query) ||
      card.title?.toLowerCase().includes(query) ||
      card.note?.toLowerCase().includes(query)  // ✅ 搜尋筆記
    );
    renderCards(filtered);
  }, 300);
}
```

**卡片列表顯示筆記**：
```html
<div class="card">
  <h3 id="card-name"></h3>
  <p class="text-slate-600" id="card-org"></p>
  
  <!-- 筆記預覽（最多 50 字）-->
  <p class="note-preview text-sm text-slate-500" id="note-preview" style="display: none;">
    <i data-lucide="sticky-note" class="w-3 h-3"></i>
    <span id="note-text"></span>
  </p>
  
  <!-- 標籤 -->
  <div class="tags" id="card-tags"></div>
</div>

<script>
function renderCard(card) {
  document.getElementById('card-name').textContent = card.full_name;
  document.getElementById('card-org').textContent = card.organization || '';
  
  // 筆記預覽
  if (card.note) {
    const notePreview = document.getElementById('note-preview');
    const noteText = card.note.length > 50 ? card.note.substring(0, 50) + '...' : card.note;
    document.getElementById('note-text').textContent = noteText;
    notePreview.style.display = 'block';
  }
  
  // 標籤
  const tagsContainer = document.getElementById('card-tags');
  tagsContainer.innerHTML = card.tags.map(tag => 
    `<span class="tag" onclick="filterByTag('${tag}')">${tag}</span>`
  ).join('');
}
</script>
```

**標籤篩選**：
```typescript
// 標籤雲 UI
<div id="tag-cloud" class="flex flex-wrap gap-2">
  <button class="tag-chip" onclick="toggleTag('AI')">
    AI <span class="tag-count">15</span>
  </button>
  <button class="tag-chip" onclick="toggleTag('金融科技')">
    金融科技 <span class="tag-count">8</span>
  </button>
</div>

// 組合篩選（搜尋 + 標籤）
function filterCards() {
  const searchQuery = document.getElementById('search-input').value.toLowerCase();
  
  const filtered = allCards.filter(card => {
    // 文字搜尋（含筆記）
    const matchesSearch = !searchQuery || 
      card.full_name.toLowerCase().includes(searchQuery) ||
      card.organization?.toLowerCase().includes(searchQuery) ||
      card.note?.toLowerCase().includes(searchQuery);
    
    // 標籤篩選
    const matchesTags = selectedTags.size === 0 || 
      card.tags?.some(t => selectedTags.has(t));
    
    return matchesSearch && matchesTags;
  });
  
  renderCardList(filtered);
}
```

##### 6. 編輯名片 UI（2h）

**卡片列表加入編輯按鈕**：
```html
<div class="card-actions">
  <button onclick="quickNote(uuid)" class="btn-icon" title="快速筆記">
    <i data-lucide="sticky-note"></i>
  </button>
  <button onclick="editCard(uuid)" class="btn-icon" title="編輯">
    <i data-lucide="edit"></i>
  </button>
  <button onclick="downloadVCard(uuid)" class="btn-icon" title="下載">
    <i data-lucide="download"></i>
  </button>
  <button onclick="deleteCard(uuid)" class="btn-icon" title="刪除">
    <i data-lucide="trash-2"></i>
  </button>
</div>
```

**快速筆記功能**：
```typescript
async function quickNote(uuid: string) {
  try {
    // 載入當前筆記
    const card = await ReceivedCardsAPI.call(`/api/user/received-cards/${uuid}`);
    
    // 顯示筆記輸入框
    const note = prompt('筆記內容：', card.note || '');
    if (note === null) return; // 使用者取消
    
    // 更新筆記（PATCH）
    await ReceivedCardsAPI.call(`/api/user/received-cards/${uuid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    });
    
    showSuccessToast('筆記已儲存');
    loadCards(); // 重新載入列表
    
  } catch (error) {
    showErrorToast('儲存失敗');
  }
}
```

**編輯表單（複用上傳流程的表單）**：
```typescript
async function editCard(uuid: string) {
  try {
    // 載入卡片資料
    const card = await ReceivedCardsAPI.call(`/api/user/received-cards/${uuid}`);
    
    // 填入表單
    document.getElementById('edit-uuid').value = uuid;
    document.getElementById('edit-full-name').value = card.full_name;
    document.getElementById('edit-organization').value = card.organization || '';
    document.getElementById('edit-title').value = card.title || '';
    document.getElementById('edit-phone').value = card.phone || '';
    document.getElementById('edit-email').value = card.email || '';
    document.getElementById('edit-website').value = card.website || '';
    document.getElementById('edit-address').value = card.address || '';
    document.getElementById('edit-note').value = card.note || '';
    
    // 顯示編輯 Modal
    showModal('edit-card-modal');
    
  } catch (error) {
    showErrorToast('載入失敗');
  }
}

async function saveEditedCard() {
  const uuid = document.getElementById('edit-uuid').value;
  const formData = {
    full_name: document.getElementById('edit-full-name').value,
    organization: document.getElementById('edit-organization').value,
    title: document.getElementById('edit-title').value,
    phone: document.getElementById('edit-phone').value,
    email: document.getElementById('edit-email').value,
    website: document.getElementById('edit-website').value,
    address: document.getElementById('edit-address').value,
    note: document.getElementById('edit-note').value
  };
  
  try {
    await ReceivedCardsAPI.call(`/api/user/received-cards/${uuid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    hideModal('edit-card-modal');
    showSuccessToast('名片已更新');
    loadCards(); // 重新載入列表
    
  } catch (error) {
    showErrorToast('更新失敗');
  }
}
```

##### 7. 匯出 UI（2h）

**下載按鈕**：
```html
<button onclick="downloadVCard(uuid)" class="btn-primary">
  <i data-lucide="download"></i>
  <span data-i18n="export-vcard">下載到通訊錄</span>
</button>
```

**QR Code 顯示**：
```html
<button onclick="showVCardQR(uuid)" class="btn-secondary">
  <i data-lucide="qr-code"></i>
  <span data-i18n="show-qr">顯示 QR Code</span>
</button>

<!-- QR Code Modal -->
<div id="qr-modal" class="modal">
  <div class="modal-content">
    <h3 data-i18n="scan-to-add">掃描加入通訊錄</h3>
    <div id="qr-code"></div>
    <p class="text-sm text-slate-600" data-i18n="qr-hint">
      使用手機相機掃描即可加入聯絡人
    </p>
  </div>
</div>
```

##### 8. 標籤顯示與管理（2-3h）

**卡片上顯示標籤**：
```html
<div class="card">
  <h3>{{ full_name }}</h3>
  <p>{{ organization }}</p>
  
  <!-- 標籤（最多 3 個）-->
  <div class="tags">
    <span class="tag" onclick="filterByTag('AI')">AI</span>
    <span class="tag" onclick="filterByTag('金融科技')">金融科技</span>
    <span class="tag-more" onclick="showAllTags(uuid)">+2</span>
  </div>
</div>
```

**標籤管理 UI**：
```html
<!-- 卡片詳情頁 -->
<div class="tag-management">
  <h4 data-i18n="tags">標籤</h4>
  <div class="tag-list">
    <span class="tag">
      AI
      <button onclick="deleteTag(uuid, 'AI')">×</button>
    </span>
  </div>
  
  <div class="add-tag">
    <input type="text" id="new-tag" placeholder="新增標籤...">
    <button onclick="addTag(uuid)">
      <i data-lucide="plus"></i>
    </button>
  </div>
</div>
```

##### 8. 流程優化（2h）

**進度回饋**：
```html
<div class="progress-bar">
  <div class="step completed">
    <i data-lucide="upload"></i>
    <span data-i18n="upload-image">上傳圖片</span>
  </div>
  <div class="step active">
    <i data-lucide="scan"></i>
    <span data-i18n="ocr-processing">辨識文字</span>
  </div>
  <div class="step">
    <i data-lucide="sparkles"></i>
    <span data-i18n="ai-analyzing">AI 分析中</span>
  </div>
  <div class="step">
    <i data-lucide="check"></i>
    <span data-i18n="completed">完成</span>
  </div>
</div>
```

**成功提示 + 自動導頁**：
```typescript
async function saveCard(data) {
  await ReceivedCardsAPI.saveCard(data);
  
  // 成功提示（1 秒後消失）
  showSuccessToast('名片已儲存');
  
  // 自動跳轉到列表（1 秒後）
  setTimeout(() => {
    showReceivedCardsList();
  }, 1000);
}
```

##### 9. 整合測試（1-2h）

**測試清單**：
```
□ vCard 匯出（4 個平台）
□ 搜尋功能（中英文、特殊字元）
□ 標籤篩選（單選、多選、清除）
□ 組合篩選（搜尋 + 標籤）
□ 標籤管理（新增、刪除）
□ 進度回饋（各階段顯示）
□ 成功提示（顯示與消失）
□ 自動導頁（跳轉正確）
□ i18n（中英文切換）
□ 響應式（手機、平板、桌面）
```

---

## 📊 成功指標

### 量測方案

**埋點事件**：
```typescript
interface MetricsEvent {
  'card.upload.start': { timestamp: number },
  'card.upload.complete': { timestamp: number, upload_id: string },
  'card.ocr.start': { timestamp: number, upload_id: string },
  'card.ocr.complete': { timestamp: number, upload_id: string, duration_ms: number },
  'card.enrich.start': { timestamp: number, upload_id: string },
  'card.enrich.complete': { timestamp: number, upload_id: string, duration_ms: number },
  'card.enrich.skip': { timestamp: number, upload_id: string },
  'card.save.click': { timestamp: number, upload_id: string },
  'card.save.complete': { timestamp: number, upload_id: string, total_duration_ms: number },
  'card.export.click': { timestamp: number, card_uuid: string },
  'card.export.complete': { timestamp: number, card_uuid: string, duration_ms: number },
  'card.search.query': { timestamp: number, query: string, results_count: number },
  'card.tag.filter': { timestamp: number, tag: string, results_count: number }
}
```

### 目標指標

**P50/P90/P95 延遲**：
```
upload_to_save_duration (含 AI):
  P50: < 15 秒
  P90: < 30 秒
  P95: < 45 秒

upload_to_save_duration_skip_ai (不含 AI):
  P50: < 5 秒
  P90: < 10 秒
  P95: < 15 秒

export_duration:
  P50: < 1 秒
  P90: < 2 秒
  P95: < 3 秒

search_duration:
  P50: < 100ms
  P90: < 300ms
  P95: < 500ms
```

**使用率指標**：
```
vcard_export_rate: 匯出 vCard 的使用者比例
  目標: > 30%

search_usage_rate: 使用搜尋功能的使用者比例
  目標: > 50%

tag_filter_rate: 使用標籤篩選的使用者比例
  目標: > 20%

tag_management_rate: 手動管理標籤的使用者比例
  目標: > 10%
```

---

## ⚠️ 風險與緩解

### 風險 1: vCard 相容性問題
**風險等級**: High  
**影響**: 使用者無法匯入聯絡人  
**緩解**: 
- 4 個平台完整測試
- UTF-8 BOM 確保編碼正確
- 特殊字元轉義規則嚴格遵守

### 風險 2: 搜尋效能退化
**風險等級**: Medium  
**影響**: 名片數量多時搜尋變慢  
**緩解**:
- 設定 200 張上限
- 超過上限顯示警告
- Phase 2 實施後端搜尋

### 風險 3: 標籤提取不準確
**風險等級**: Low  
**影響**: 自動標籤不符合預期  
**緩解**:
- 關鍵字庫持續優化
- 使用者可手動修正
- Phase 2 加入 AI 提取

### 風險 4: 工時超支
**風險等級**: Medium  
**影響**: 無法在 2.5 週內完成  
**緩解**:
- 每日 standup 追蹤進度
- 優先完成 P0 功能
- Phase 2 功能可延後

---

## 📅 時間表

### Week 1: 後端基礎（14-16h）✨ 調整
| 日期 | 任務 | 工時 | 負責人 |
|------|------|------|--------|
| 2/24 | 重新定位 Web Search（可選增強）| 2h | - |
| 2/25 | 名片縮圖系統（生成 + API）| 3h | - |
| 2/26 | vCard API 實作 | 4h | - |
| 2/27 | vCard 相容性測試 | 2h | - |
| 2/28 | 標籤 Schema + Migration | 2h | - |
| 3/1 | 標籤提取邏輯（基於 organization）| 2h | - |
| 3/2 | 批次上傳 API（多檔案 + 進度查詢）| 3h | - |

### Week 2: 前端整合（16-19h）✨ 調整
| 日期 | 任務 | 工時 | 負責人 |
|------|------|------|--------|
| 3/3 | 批次上傳 UI（拖曳 + 進度條）| 4h | - |
| 3/4 | 名片縮圖顯示（列表 + 詳情）| 2h | - |
| 3/5 | 搜尋功能（前端過濾）| 2h | - |
| 3/6 | 標籤篩選 UI | 2h | - |
| 3/7 | 編輯名片 UI（表單 + Modal）| 2h | - |
| 3/8 | 匯出 UI + QR Code | 2h | - |
| 3/9 | 「回家後補齊」功能（PATCH API + UI）| 2h | - |
| 3/10 | 流程優化（跳過 AI、進度回饋）| 2h | - |
| 3/11 | 整合測試 | 2h | - |

**總工時**: 30-35 小時（+名片縮圖 5h）  
**總週期**: 2.5 週

---

## 💰 成本效益分析

### 投入成本
- 開發工時：30-35 小時（含批次辨識 + 名片縮圖）
- 測試工時：已包含在內
- 基礎設施：無額外成本（使用現有 D1 + R2）

### 預期效益

**第一階段：核心領域完成**
```
場景：展會收到 50 張名片

傳統做法成本：
- 手動輸入 Excel：2 小時 × $50/hr = $100
- 遺失商機：無法量化

DB-Card 節省（第一階段）：
- 拍照上傳：50 × 10秒 = 8.3 分鐘
- OCR 辨識：自動完成
- 編輯確認：50 × 20秒 = 16.7 分鐘
- 總時間：25 分鐘
- 節省時間：2 小時 - 25 分鐘 = 1.58 小時
- 節省成本：$79

ROI（第一階段）：
- 若 10 個使用者使用：$790 價值
- 若 100 個使用者使用：$7,900 價值
```

**第二階段：資料增值（未來規劃）**
```
場景：基於公司資訊的智慧分析

潛在價值：
- 公司關係圖譜：快速找到同公司的所有聯絡人
- 產業分析：識別某產業的所有潛在客戶
- 商機挖掘：基於公司摘要的智慧推薦
- 後續追蹤：基於公司資訊的行動建議

前置條件：
- 需要累積足夠的公司資訊（Web Search 的價值）
- 需要完成第一階段的核心流程

預估價值：
- 商機轉換率提升：10-20%
- 客戶關係管理效率：提升 30-50%
```

**質化效益**：
- 提升使用者滿意度（核心流程順暢）
- 降低名片遺失率（數位化歸檔）
- 為第二階段鋪路（累積公司資訊）
- 建立產品差異化（AI 可選增強）

---

## 🎯 下一步行動

### 立即行動（本週）
1. ✅ 確認實施計畫
2. ✅ 建立 GitHub Issue
3. ✅ 撰寫 BDD 規格
4. ⏳ 開始 Week 1 開發

### Week 1 檢查點（2026-03-02）
- [ ] Web Search 改為可選增強
- [ ] 名片縮圖系統完成（生成 + API）
- [ ] vCard API 完成
- [ ] 4 個平台測試通過
- [ ] 標籤系統 Schema 部署
- [ ] 標籤提取邏輯完成（基於 organization）
- [ ] 批次上傳 API 完成

### Week 2 檢查點（2026-03-11）
- [ ] 批次上傳 UI 完成
- [ ] 名片縮圖顯示完成（列表 + 詳情）
- [ ] 搜尋功能完成（前端過濾）
- [ ] 標籤篩選完成
- [ ] 匯出 UI 完成
- [ ] 「回家後補齊」功能完成
- [ ] 流程優化完成（跳過 AI、進度回饋）
- [ ] 整合測試通過

### 驗收標準（2026-03-11）
- [ ] 使用者能在 30 秒內完成「拍照 → 歸檔」（不含 Web Search）
- [ ] 使用者能在 60 秒內完成「拍照 → 補齊名片資訊 → 歸檔」（含 Web Search）
- [ ] 使用者能在 5 秒內找到特定名片
- [ ] 使用者能在 3 秒內匯出 vCard
- [ ] 名片列表顯示縮圖（< 20 KB，WebP 格式）
- [ ] 所有測試案例通過
- [ ] i18n 完整支援中英文
- [ ] Web Search 使用率統計埋點完成

---

## 📞 聯絡資訊

- **專案**: DB-Card NFC Digital Business Card System
- **版本**: v4.6.0 → v4.7.0 (User Portal Enhancement)
- **文檔版本**: v1.0
- **最後更新**: 2026-02-22

---

**審查狀態**: ⏳ 待確認  
**實施狀態**: ⏳ 待開始  
**預期完成**: 2026-03-10（2.5 週）


---

## 附錄 A：技術規格詳細說明

### A.1 vCard 3.0 格式規範

**完整範例**：
```
BEGIN:VCARD
VERSION:3.0
FN:吳勝繙
N:吳;勝繙;;;
ORG:數位發展部
TITLE:資訊處共用系統科科長
TEL;TYPE=CELL:+886-912-345-678
EMAIL:user@example.com
URL:https://moda.gov.tw
ADR:;;台北市中正區寶慶路3號;;台北市;100;台灣
NOTE:展會交換的名片
END:VCARD
```

**說明**：
- 第一階段 NOTE 欄位只包含 `note`
- `company_summary` 和 `personal_summary` 不放入 vCard（Phase 2 才考慮）

**vCard 欄位對應表**：
| vCard 欄位 | received_cards 欄位 | 必填 | 缺值處理 |
|-----------|-------------------|------|---------|
| FN | full_name | ✅ | N/A |
| N | last_name;first_name | ❌ | 用空字串 |
| ORG | organization | ❌ | 省略此行 |
| TITLE | title | ❌ | 省略此行 |
| TEL | phone | ❌ | 省略此行 |
| EMAIL | email | ❌ | 省略此行 |
| URL | website | ❌ | 省略此行 |
| ADR | address | ❌ | 省略此行 |
| NOTE | note | ❌ | 省略此行 |

**特殊字元轉義規則**：
```typescript
function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')    // \ → \\
    .replace(/,/g, '\\,')      // , → \,
    .replace(/;/g, '\\;')      // ; → \;
    .replace(/\r\n/g, '\\n')   // CRLF → \n
    .replace(/\n/g, '\\n');    // LF → \n
}
```

**換行符規範**：
- vCard 行結尾：CRLF (\r\n)，符合 RFC 2426
- NOTE 欄位內換行：轉義為 \n

### A.2 標籤系統資料流程

**自動標籤提取流程**：
```
1. 使用者儲存名片
   ↓
2. 檢查是否有 organization 欄位
   ↓ (有)
3. 呼叫 extractTagsFromOrganization()
   ↓
4. 關鍵字匹配（0-4 個標籤：government/listed/startup/ngo）
   ↓
5. 批次插入 card_tags 表（tag_source='auto_keyword'）
   ↓
6. 更新 tag_stats 統計（使用 COUNT 重算）
   ↓
7. 回傳成功
```

**手動標籤管理流程**：
```
新增標籤：
1. 使用者輸入標籤名稱
   ↓
2. 驗證卡片所有權
   ↓
3. INSERT OR IGNORE INTO card_tags (tag_source='manual')
   ↓
4. 更新 tag_stats（使用 COUNT 重算）
   ↓
5. 回傳成功

刪除標籤：
1. 使用者點擊刪除按鈕
   ↓
2. 驗證卡片所有權
   ↓
3. DELETE FROM card_tags
   ↓
4. 更新 tag_stats（使用 COUNT 重算）
   ↓
5. 回傳成功
```

### A.3 搜尋與篩選演算法

**前端搜尋（Client-side）**：
```typescript
// 時間複雜度：O(n)，n = 名片數量
// 空間複雜度：O(n)

function filterCards(cards: Card[], query: string, selectedTags: Set<string>): Card[] {
  const lowerQuery = query.toLowerCase();
  
  return cards.filter(card => {
    // 文字搜尋（OR 邏輯）
    const matchesSearch = !query || 
      card.full_name.toLowerCase().includes(lowerQuery) ||
      card.organization?.toLowerCase().includes(lowerQuery) ||
      card.title?.toLowerCase().includes(lowerQuery) ||
      card.email?.toLowerCase().includes(lowerQuery) ||
      card.phone?.includes(query);
    
    // 標籤篩選（OR 邏輯：卡片有任一選中的標籤即符合）
    const matchesTags = selectedTags.size === 0 || 
      card.tags?.some(t => selectedTags.has(t));
    
    return matchesSearch && matchesTags;
  });
}

// 效能分析：
// - 200 張名片：< 10ms
// - 500 張名片：< 50ms（開始變慢）
// - 1000 張名片：> 100ms（需要後端搜尋）
```

**後端搜尋（Server-side，Phase 2）**：
```sql
-- 使用 FTS5 全文搜尋（若實施）
SELECT c.* 
FROM received_cards c
JOIN received_cards_fts fts ON c.rowid = fts.rowid
WHERE received_cards_fts MATCH ?
  AND c.user_email = ?
  AND c.deleted_at IS NULL
ORDER BY rank
LIMIT 20;

-- 或使用 LIKE 查詢（簡單版本）
SELECT * FROM received_cards
WHERE user_email = ?
  AND deleted_at IS NULL
  AND (
    full_name LIKE ? OR
    organization LIKE ? OR
    title LIKE ?
  )
ORDER BY created_at DESC
LIMIT 20;
```

### A.4 效能優化策略

**前端優化**：
```typescript
// 1. Debounce 搜尋輸入（300ms）
const debouncedSearch = debounce((query) => {
  filterCards(allCards, query, selectedTags);
}, 300);

// 2. 虛擬滾動（若名片數 > 100）
import VirtualScroller from 'virtual-scroller';

const scroller = new VirtualScroller({
  items: filteredCards,
  itemHeight: 120,
  renderItem: (card) => renderCardHTML(card)
});

// 3. 快取搜尋結果（LRU Cache）
const searchCache = new Map(); // 最多 50 個查詢

function cachedSearch(query: string) {
  if (searchCache.has(query)) {
    return searchCache.get(query);
  }
  
  const results = filterCards(allCards, query, selectedTags);
  
  if (searchCache.size >= 50) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  
  searchCache.set(query, results);
  return results;
}
```

**後端優化**：
```typescript
// 1. 索引優化
CREATE INDEX idx_received_cards_search ON received_cards(
  user_email, deleted_at, full_name, organization, title
);

// 2. 查詢快取（KV）
const cacheKey = `search:${userEmail}:${query}`;
const cached = await env.CACHE.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const results = await db.query(...);
await env.CACHE.put(cacheKey, JSON.stringify(results), { expirationTtl: 300 });

// 3. 分頁查詢
SELECT * FROM received_cards
WHERE ...
ORDER BY created_at DESC
LIMIT 20 OFFSET ?;
```

---

## 附錄 B：測試計畫

### B.1 單元測試

**編輯名片測試**：
```typescript
describe('Edit Card', () => {
  test('PUT /api/user/received-cards/:uuid - success', async () => {
    const response = await fetch('/api/user/received-cards/test-uuid', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        full_name: '王小明（已修改）',
        organization: '數位發展部',
        phone: '+886-912-999-999'
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Card updated');
  });
  
  test('PUT /api/user/received-cards/:uuid - missing full_name', async () => {
    const response = await fetch('/api/user/received-cards/test-uuid', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        organization: '數位發展部'
      })
    });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('INVALID_REQUEST');
  });
  
  test('PUT /api/user/received-cards/:uuid - not found', async () => {
    const response = await fetch('/api/user/received-cards/non-existent', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        full_name: '測試'
      })
    });
    
    expect(response.status).toBe(404);
  });
  
  test('PUT /api/user/received-cards/:uuid - cross-tenant isolation', async () => {
    // 使用者 A 嘗試修改使用者 B 的名片
    const response = await fetch('/api/user/received-cards/user-b-card', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        full_name: '惡意修改'
      })
    });
    
    // 租戶隔離：回傳 404（資源隱匿，不洩漏存在性）
    expect(response.status).toBe(404);
  });
});
```

**vCard 生成測試**：
```typescript
describe('vCard Generation', () => {
  test('should generate valid vCard with all fields', () => {
    const card = {
      full_name: '吳勝繙',
      first_name: '勝繙',
      last_name: '吳',
      organization: '數位發展部',
      title: '科長',
      phone: '+886-912-345-678',
      email: 'user@example.com',
      website: 'https://moda.gov.tw',
      address: '台北市中正區寶慶路3號',
      note: '測試備註',
      company_summary: '公司摘要',
      personal_summary: '個人摘要'
    };
    
    const vcard = generateVCard(card);
    
    expect(vcard).toContain('BEGIN:VCARD');
    expect(vcard).toContain('VERSION:3.0');
    expect(vcard).toContain('FN:吳勝繙');
    expect(vcard).toContain('N:吳;勝繙;;;');
    expect(vcard).toContain('ORG:數位發展部');
    expect(vcard).toContain('END:VCARD');
  });
  
  test('should handle missing fields', () => {
    const card = {
      full_name: '吳勝繙'
    };
    
    const vcard = generateVCard(card);
    
    expect(vcard).toContain('FN:吳勝繙');
    expect(vcard).not.toContain('ORG:');
    expect(vcard).not.toContain('TITLE:');
  });
  
  test('should escape special characters', () => {
    const card = {
      full_name: 'Test, User; Name\\Test'
    };
    
    const vcard = generateVCard(card);
    
    expect(vcard).toContain('FN:Test\\, User\\; Name\\\\Test');
  });
});
```

**標籤提取測試**：
```typescript
describe('Tag Extraction', () => {
  test('should extract tags from summary', () => {
    const summary = '數位發展部是推動AI與區塊鏈技術的政府機關';
    const tags = extractTagsFromSummary(summary);
    
    expect(tags).toContain('AI');
    expect(tags).toContain('區塊鏈');
  });
  
  test('should limit to 5 tags', () => {
    const summary = 'AI 機器學習 深度學習 區塊鏈 IoT 物聯網 金融科技';
    const tags = extractTagsFromSummary(summary);
    
    expect(tags.length).toBeLessThanOrEqual(5);
  });
  
  test('should handle empty summary', () => {
    const tags = extractTagsFromSummary('');
    
    expect(tags).toEqual([]);
  });
});
```

**搜尋測試**：
```typescript
describe('Card Search', () => {
  const cards = [
    { full_name: '吳勝繙', organization: '數位發展部', tags: ['AI'] },
    { full_name: '張三', organization: 'ABC公司', tags: ['金融科技'] },
    { full_name: '李四', organization: 'XYZ企業', tags: ['AI', '區塊鏈'] }
  ];
  
  test('should filter by name', () => {
    const results = filterCards(cards, '吳勝繙', new Set());
    
    expect(results).toHaveLength(1);
    expect(results[0].full_name).toBe('吳勝繙');
  });
  
  test('should filter by organization', () => {
    const results = filterCards(cards, '數位發展部', new Set());
    
    expect(results).toHaveLength(1);
    expect(results[0].organization).toBe('數位發展部');
  });
  
  test('should filter by tag', () => {
    const results = filterCards(cards, '', new Set(['AI']));
    
    expect(results).toHaveLength(2);
  });
  
  test('should combine search and tag filter', () => {
    const results = filterCards(cards, '李四', new Set(['AI']));
    
    expect(results).toHaveLength(1);
    expect(results[0].full_name).toBe('李四');
  });
});
```

### B.2 整合測試

**API 測試**：
```typescript
describe('vCard Export API', () => {
  test('GET /api/user/received-cards/:uuid/vcard', async () => {
    const response = await fetch('/api/user/received-cards/test-uuid/vcard', {
      headers: {
        'Cookie': 'session=...',
        'X-CSRF-Token': '...'
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/vcard; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    
    const vcard = await response.text();
    expect(vcard).toContain('BEGIN:VCARD');
    expect(vcard).toContain('END:VCARD');
  });
  
  test('should return 404 for non-existent card', async () => {
    const response = await fetch('/api/user/received-cards/invalid-uuid/vcard');
    
    expect(response.status).toBe(404);
  });
  
  test('should return 404 for unauthorized access', async () => {
    const response = await fetch('/api/user/received-cards/other-user-uuid/vcard', {
      headers: {
        'Cookie': 'session=...',
        'X-CSRF-Token': '...'
      }
    });
    
    // 租戶隔離：回傳 404（資源隱匿，不洩漏存在性）
    expect(response.status).toBe(404);
  });
});

describe('Tag API', () => {
  test('GET /api/user/received-cards/tags', async () => {
    const response = await fetch('/api/user/received-cards/tags');
    const tags = await response.json();
    
    expect(Array.isArray(tags)).toBe(true);
    expect(tags[0]).toHaveProperty('tag');
    expect(tags[0]).toHaveProperty('count');
  });
  
  test('POST /api/user/received-cards/:uuid/tags', async () => {
    const response = await fetch('/api/user/received-cards/test-uuid/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': '...'
      },
      body: JSON.stringify({ tag: 'AI' })
    });
    
    expect(response.status).toBe(200);
  });
});
```

### B.3 E2E 測試

**使用者流程測試**：
```typescript
describe('User Flow: Card Capture (Skip AI)', () => {
  test('should complete flow without AI', async () => {
    // 1. 上傳圖片
    await uploadImage('test-card.jpg');
    await waitFor(() => expect(screen.getByText('辨識文字')).toBeVisible());
    
    // 2. OCR 完成
    await waitFor(() => expect(screen.getByText('完成')).toBeVisible());
    
    // 3. 檢查自動填入
    expect(screen.getByLabelText('全名')).toHaveValue('吳勝繙');
    expect(screen.getByLabelText('組織')).toHaveValue('數位發展部');
    
    // 4. 跳過 AI，直接儲存
    await userEvent.click(screen.getByText('儲存到名片夾'));
    
    // 5. 檢查成功提示
    await waitFor(() => expect(screen.getByText('名片已儲存')).toBeVisible());
    
    // 6. 檢查自動導頁
    await waitFor(() => expect(screen.getByText('收到的名片')).toBeVisible());
    
    // 7. 驗證 ai_status
    const card = await fetchCard(cardUuid);
    expect(card.ai_status).toBe('skipped');
  });
});

describe('User Flow: Card Capture with AI (Optional)', () => {
  test('should complete flow with AI enrichment', async () => {
    // 1. 上傳圖片
    await uploadImage('test-card.jpg');
    await waitFor(() => expect(screen.getByText('辨識文字')).toBeVisible());
    
    // 2. OCR 完成
    await waitFor(() => expect(screen.getByText('完成')).toBeVisible());
    
    // 3. 點擊「補齊名片資訊」（可選）
    await userEvent.click(screen.getByText('補齊名片資訊'));
    
    // 4. 等待 AI 分析
    await waitFor(() => expect(screen.getByText('AI 分析中')).toBeVisible());
    await waitFor(() => expect(screen.getByText('AI 分析完成')).toBeVisible(), { timeout: 30000 });
    
    // 5. 檢查公司摘要
    expect(screen.getByText('公司摘要')).toBeVisible();
    
    // 6. 儲存
    await userEvent.click(screen.getByText('儲存到名片夾'));
    
    // 7. 驗證 ai_status
    const card = await fetchCard(cardUuid);
    expect(card.ai_status).toBe('completed');
  });
});

describe('User Flow: Post-Enrichment', () => {
  test('should enrich card after saving', async () => {
    // 1. 搜尋名片
    await userEvent.type(screen.getByPlaceholderText('搜尋姓名、公司...'), '吳勝繙');
    await waitFor(() => expect(screen.getAllByText('吳勝繙')).toHaveLength(1));
    
    // 2. 點擊卡片查看詳情
    await userEvent.click(screen.getByText('吳勝繙'));
    
    // 3. 檢查 AI 狀態
    expect(screen.getByText('未使用 AI 分析')).toBeVisible();
    
    // 4. 點擊「補齊名片資訊」
    await userEvent.click(screen.getByText('補齊名片資訊'));
    
    // 5. 等待完成
    await waitFor(() => expect(screen.getByText('名片資訊已補齊')).toBeVisible(), { timeout: 30000 });
    
    // 6. 驗證 ai_status 更新
    const card = await fetchCard(cardUuid);
    expect(card.ai_status).toBe('completed');
  });
});
```

---

## 附錄 C：部署檢查清單

### C.1 資料庫遷移

```bash
# Staging 環境
cd workers
wrangler d1 execute DB --remote --file=./migrations/0026_web_search_optional.sql
wrangler d1 execute DB --remote --file=./migrations/0027_tags_system.sql
wrangler d1 execute DB --remote --file=./migrations/0028_card_thumbnails.sql

# 驗證
wrangler d1 execute DB --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='card_tags'"

# Production 環境（Staging 驗證通過後）
wrangler d1 execute DB --remote --env production --file=./migrations/0026_web_search_optional.sql
wrangler d1 execute DB --remote --env production --file=./migrations/0027_tags_system.sql
wrangler d1 execute DB --remote --env production --file=./migrations/0028_card_thumbnails.sql
```

### C.2 環境變數檢查

```bash
# 確認必要的環境變數
□ GEMINI_API_KEY (若使用 AI 標籤提取)
□ ENVIRONMENT (staging/production)
□ KEK (加密金鑰)
□ JWT_SECRET (JWT 簽名)
```

### C.3 部署步驟

```bash
# 1. 執行 Migration（3 個檔案）
wrangler d1 execute DB --remote --file=./migrations/0026_web_search_optional.sql
wrangler d1 execute DB --remote --file=./migrations/0027_tags_system.sql
wrangler d1 execute DB --remote --file=./migrations/0028_card_thumbnails.sql

# 2. 部署到 Staging
wrangler deploy

# 3. 驗證 Staging
curl https://db-card-staging.csw30454.workers.dev/health

# 4. 執行 E2E 測試
npm run test:e2e

# 5. 部署到 Production
wrangler deploy --env production

# 6. 驗證 Production
curl https://db-card.csw30454.workers.dev/health

# 7. 監控錯誤
wrangler tail --env production
```

### C.4 回滾計畫

```bash
# 若發現問題，立即回滾

# 1. 回滾 Worker
wrangler rollback --env production

# 2. 回滾資料庫（若需要，依序執行）
# 回滾 0028_card_thumbnails.sql
wrangler d1 execute DB --remote --env production --command="
  ALTER TABLE received_cards DROP COLUMN thumbnail_url;
  DROP INDEX IF EXISTS idx_received_cards_thumbnail;
"

# 回滾 0027_tags_system.sql
wrangler d1 execute DB --remote --env production --command="
  DROP TABLE IF EXISTS card_tags;
  DROP TABLE IF EXISTS tag_stats;
"

# 回滾 0026_web_search_optional.sql
wrangler d1 execute DB --remote --env production --command="
  ALTER TABLE received_cards DROP COLUMN ai_status;
  ALTER TABLE temp_uploads DROP COLUMN batch_id;
  ALTER TABLE temp_uploads DROP COLUMN filename;
  ALTER TABLE temp_uploads DROP COLUMN ocr_status;
  ALTER TABLE temp_uploads DROP COLUMN ocr_error;
  ALTER TABLE temp_uploads DROP COLUMN thumbnail_url;
  DROP INDEX IF EXISTS idx_temp_uploads_batch;
"

# 3. 驗證回滾
curl https://db-card.csw30454.workers.dev/health
```

---

## 附錄 F：安全與技術最佳實踐

### F.1 XSS 防護

**問題**：直接使用 `innerHTML` 插入外部來源內容
```typescript
// ❌ 不安全
sourcesList.innerHTML = sources.map(s => 
  `<li><a href="${s.uri}">${s.title}</a></li>`
).join('');
```

**解決方案**：使用 `createElement` + `textContent`
```typescript
// ✅ 安全
sources.forEach(s => {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = s.uri; // 瀏覽器自動驗證 URL
  a.textContent = s.title; // 自動轉義
  a.target = '_blank';
  a.rel = 'noopener noreferrer'; // 防止 window.opener 攻擊
  li.appendChild(a);
  sourcesList.appendChild(li);
});
```

**額外防護**：驗證 URL scheme
```typescript
try {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') {
    url = '#'; // 只允許 HTTPS
  }
} catch {
  url = '#'; // 無效 URL
}
```

### F.2 Cloudflare Workers 相容性

**問題**：使用 node-canvas（依賴原生二進位）
```typescript
// ❌ Workers 不支援
import { createCanvas, loadImage } from 'canvas';
```

**解決方案**：前端生成縮圖
```typescript
// ✅ 瀏覽器原生 API
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0, width, height);
canvas.toBlob(callback, 'image/webp', 0.8);
```

**替代方案**：
1. Cloudflare Images（推薦，自動生成縮圖）
2. 外部圖片服務（imgix、Cloudinary）
3. WASM 影像處理（複雜度高）

### F.3 Migration 管理

**問題**：同一編號定義兩種不同內容
```sql
-- ❌ 衝突
-- 0026_tags_system.sql 定義 ai_status
-- 0026_tags_system.sql 定義 card_tags（同一檔案，不同內容）
```

**解決方案**：拆分獨立 Migration
```sql
-- ✅ 清晰
-- 0026_web_search_optional.sql - ai_status + batch_id + thumbnail_url
-- 0027_tags_system.sql - card_tags + tag_stats
-- 0028_card_thumbnails.sql - received_cards.thumbnail_url
```

**最佳實踐**：
- 一個 Migration 只做一件事
- 檔名清楚描述用途
- 提供回滾方案（註解）

### F.4 租戶隔離策略

**問題**：跨租戶存取回傳 403 或 404？
```typescript
// ❌ 不一致
// 某些 API 回傳 403
// 某些 API 回傳 404
```

**解決方案**：統一回傳 404（資源隱匿）
```typescript
// ✅ 一致
// 所有跨租戶存取回傳 404
// 不洩漏資源存在性
WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
// 若找不到：404 Not Found
```

**理由**：
- 403 表示「資源存在但無權限」→ 洩漏資訊
- 404 表示「資源不存在」→ 隱匿資訊
- 多租戶 SaaS 應使用 404

### F.5 測試策略

**問題**：測試假設 AI 是必經流程
```typescript
// ❌ 與新設計矛盾
await waitFor(() => expect(screen.getByText('AI 分析中')).toBeVisible());
```

**解決方案**：拆分兩條測試路徑
```typescript
// ✅ 符合設計
describe('Skip AI (Default)', () => {
  // 測試預設流程：上傳 → OCR → 儲存
});

describe('With AI (Optional)', () => {
  // 測試可選流程：上傳 → OCR → 補充公司資訊 → 儲存
});
```

**覆蓋率目標**：
- 預設流程（Skip AI）：100%
- 可選流程（With AI）：100%
- 回家後補充：100%

---

## 附錄 D：參考資料

### D.1 設計原則
- [Don't Make Me Think](https://sensible.com/dont-make-me-think/) - Steve Krug
- [The Owner's Illusion](https://medium.com/@stewart/the-owners-illusion-8f0e0e0e0e0e) - Stewart Butterfield
- [Utility Curve Theory](https://www.nngroup.com/articles/utility-curve/) - Nielsen Norman Group

### D.2 技術規範
- [vCard 3.0 RFC 2426](https://datatracker.ietf.org/doc/html/rfc2426)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

### D.3 相關專案
- [名片快手](https://mfhsieh.pythonanywhere.com/ncs/) - 參考實作
- [DB-Card v4.6.0](https://github.com/iim0663418/DB-Card) - 當前版本

---

**文檔結束**


---

## 附錄 E：「回家後補齊」功能設計

### E.1 問題定義

**使用者痛點**：
```
展會現場：
- 時間緊迫，不想等 Web Search（10-30 秒）
- 只想快速歸檔名片（< 20 秒/張）

回家後：
- 有時間了，想補齊重要聯絡人的名片資訊
- 當前實作：儲存後無法觸發 Web Search
```

### E.2 解決方案

**核心設計**：在卡片詳情頁加入「補齊名片資訊」按鈕

#### 前端 UI

```html
<!-- 卡片詳情頁 -->
<div class="card-detail">
  <h2 id="card-name"></h2>
  <p id="card-org"></p>
  
  <!-- AI 狀態顯示 -->
  <div class="ai-status" id="ai-status-container">
    <!-- 動態插入 badge -->
  </div>
  
  <!-- 補齊名片資訊按鈕 -->
  <button 
    id="enrich-btn"
    onclick="enrichCardInfo(uuid)" 
    class="btn-secondary mt-4"
    style="display: none;"
  >
    <i data-lucide="sparkles"></i>
    <span data-i18n="enrich-card-info">補齊名片資訊</span>
    <span class="text-xs text-slate-500">(約需 10-30 秒)</span>
  </button>
  
  <!-- 公司摘要 -->
  <div id="company-summary-container" class="company-summary mt-6" style="display: none;">
    <h3 class="font-bold" data-i18n="company-summary">公司摘要</h3>
    <p class="text-slate-700" id="company-summary-text"></p>
    
    <!-- 參考來源 -->
    <div id="sources-container" class="sources mt-2" style="display: none;">
      <p class="text-xs text-slate-500" data-i18n="sources">參考來源：</p>
      <ul class="text-xs" id="sources-list"></ul>
    </div>
  </div>
</div>

<script>
// 渲染卡片詳情
function renderCardDetail(card) {
  document.getElementById('card-name').textContent = card.full_name;
  document.getElementById('card-org').textContent = card.organization || '';
  
  // AI 狀態
  const statusContainer = document.getElementById('ai-status-container');
  if (card.ai_status === 'skipped') {
    statusContainer.innerHTML = `
      <span class="badge badge-gray">
        <i data-lucide="info"></i>
        <span data-i18n="ai-skipped">未使用 AI 分析</span>
      </span>
    `;
  } else if (card.ai_status === 'completed') {
    statusContainer.innerHTML = `
      <span class="badge badge-green">
        <i data-lucide="check"></i>
        <span data-i18n="ai-completed">AI 分析完成</span>
      </span>
    `;
  }
  
  // 補充按鈕
  const enrichBtn = document.getElementById('enrich-btn');
  if (card.ai_status !== 'completed') {
    enrichBtn.style.display = 'block';
  }
  
  // 公司摘要
  if (card.company_summary) {
    document.getElementById('company-summary-container').style.display = 'block';
    document.getElementById('company-summary-text').textContent = card.company_summary;
    
    // 參考來源（安全渲染）
    if (card.sources && card.sources.length > 0) {
      const sourcesList = document.getElementById('sources-list');
      sourcesList.innerHTML = ''; // 清空
      
      card.sources.forEach(s => {
        // 驗證 URL scheme（只允許 https）
        let url = s.uri;
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== 'https:') {
            url = '#'; // 不安全的 URL 改為 #
          }
        } catch {
          url = '#'; // 無效 URL 改為 #
        }
        
        // 使用 createElement 避免 XSS
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer'; // 安全屬性
        a.textContent = s.title; // textContent 自動轉義
        li.appendChild(a);
        sourcesList.appendChild(li);
      });
      
      document.getElementById('sources-container').style.display = 'block';
    }
  }
  
  // 初始化 Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
</script>
```

#### 前端邏輯

```typescript
// 補齊名片資訊（回家後觸發）
async function enrichCardInfo(uuid: string) {
  try {
    // 顯示載入狀態
    showLoading('正在補齊名片資訊...');
    
    // 取得卡片資料
    const card = await ReceivedCardsAPI.call(`/api/user/received-cards/${uuid}`);
    
    // 呼叫 Enrich API
    const enrichResult = await ReceivedCardsAPI.call('/api/user/received-cards/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_uuid: uuid,  // 新增：支援已儲存的卡片
        organization: card.organization,
        full_name: card.full_name,
        title: card.title
      })
    });
    
    // 更新卡片（PATCH）
    await ReceivedCardsAPI.call(`/api/user/received-cards/${uuid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_summary: enrichResult.company_summary,
        personal_summary: enrichResult.personal_summary,
        ai_sources_json: JSON.stringify(enrichResult.sources),
        ai_status: 'completed'
      })
    });
    
    hideLoading();
    showSuccessToast('名片資訊已補齊');
    
    // 重新載入卡片詳情
    loadCardDetail(uuid);
    
  } catch (error) {
    hideLoading();
    showErrorToast('補齊失敗，請稍後再試');
  }
}
```

#### 後端 API 調整

##### 1. 修改 Enrich API

```typescript
// POST /api/user/received-cards/enrich
interface EnrichRequest {
  upload_id?: string;      // 原有：上傳流程
  card_uuid?: string;      // 新增：回家後補充
  organization: string;
  full_name: string;
  title?: string;
}

export async function handleEnrich(request: Request, env: Env): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  const body = await request.json() as EnrichRequest;
  
  // 驗證：upload_id 或 card_uuid 必須提供其一
  if (!body.upload_id && !body.card_uuid) {
    return errorResponse('INVALID_REQUEST', 'upload_id or card_uuid is required', 400);
  }
  
  // 若提供 card_uuid，驗證所有權（含軟刪除）
  if (body.card_uuid) {
    const card = await env.DB.prepare(`
      SELECT uuid FROM received_cards 
      WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
    `).bind(body.card_uuid, user.email).first();
    
    if (!card) {
      return errorResponse('CARD_NOT_FOUND', 'Card not found', 404);
    }
  }
  
  // 若提供 upload_id，驗證（原有邏輯）
  if (body.upload_id) {
    const upload = await env.DB.prepare(`
      SELECT upload_id FROM temp_uploads 
      WHERE upload_id = ? AND user_email = ?
    `).bind(body.upload_id, user.email).first();
    
    if (!upload) {
      return errorResponse('UPLOAD_NOT_FOUND', 'Upload not found', 404);
    }
  }
  
  // 呼叫 Gemini Web Search
  const enrichResult = await callGeminiWebSearch(body, env);
  
  return jsonResponse(enrichResult);
}
```

##### 2. 新增 PATCH API

```typescript
// PATCH /api/user/received-cards/:uuid
// 支援部分更新（用於補充公司資訊）

export async function handlePatchCard(request: Request, env: Env, uuid: string): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  const body = await request.json();
  
  // 驗證所有權（含軟刪除條件）
  const card = await env.DB.prepare(`
    SELECT uuid FROM received_cards 
    WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
  `).bind(uuid, user.email).first();
  
  if (!card) {
    return errorResponse('CARD_NOT_FOUND', 'Card not found', 404);
  }
  
  // 動態構建 UPDATE 語句
  const updates = [];
  const values = [];
  
  if (body.company_summary !== undefined) {
    updates.push('company_summary = ?');
    values.push(body.company_summary);
  }
  if (body.personal_summary !== undefined) {
    updates.push('personal_summary = ?');
    values.push(body.personal_summary);
  }
  if (body.ai_sources_json !== undefined) {
    updates.push('ai_sources_json = ?');
    values.push(body.ai_sources_json);
  }
  if (body.ai_status !== undefined) {
    updates.push('ai_status = ?');
    values.push(body.ai_status);
  }
  
  updates.push('updated_at = ?');
  values.push(Date.now().toString());
  
  // 租戶隔離與軟刪除條件
  values.push(uuid);
  values.push(user.email);
  
  const result = await env.DB.prepare(`
    UPDATE received_cards 
    SET ${updates.join(', ')}
    WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
  `).bind(...values).run();
  
  if (result.meta.changes === 0) {
    return errorResponse('CARD_NOT_FOUND', 'Card not found or already deleted', 404);
  }
  
  return jsonResponse({ message: 'Card updated' });
}
```

##### 3. 路由註冊

```typescript
// src/index.ts
if (url.pathname.startsWith('/api/user/received-cards/')) {
  const match = url.pathname.match(/^\/api\/user\/received-cards\/([^\/]+)$/);
  if (match) {
    const uuid = match[1];
    
    if (request.method === 'GET') {
      return handleGetCard(request, env, uuid);
    }
    if (request.method === 'PATCH') {  // 新增
      return handlePatchCard(request, env, uuid);
    }
    if (request.method === 'DELETE') {
      return handleDeleteCard(request, env, uuid);
    }
  }
}
```

### E.3 使用者流程

```
展會現場（快速歸檔）：
1. 拍照上傳
2. OCR 辨識
3. 快速確認姓名、公司
4. 點擊「儲存」（跳過 AI）
5. ai_status = 'skipped'

回家後（選擇性補齊）：
1. 搜尋「某公司」
2. 點擊卡片查看詳情
3. 看到「未使用 AI 分析」提示
4. 點擊「補齊名片資訊」
5. 等待 10-30 秒
6. 查看補齊的欄位（網站、地址、公司摘要）
7. ai_status = 'completed'
```

### E.4 工時調整

```
原估算：Week 2 前端整合 8-10h

調整後：
- 搜尋 + 標籤篩選：3h
- 匯出 UI：2h
- 「回家後補齊」功能：2h（新增）
- 流程優化：2h
- 整合測試：2h

總計：11-13h（+2h）
```

### E.5 測試案例

```typescript
describe('回家後補齊功能', () => {
  test('應該顯示「補齊名片資訊」按鈕', async () => {
    const card = { uuid: 'test', ai_status: 'skipped' };
    render(<CardDetail card={card} />);
    
    expect(screen.getByText('補齊名片資訊')).toBeVisible();
  });
  
  test('AI 完成後不應顯示按鈕', async () => {
    const card = { uuid: 'test', ai_status: 'completed' };
    render(<CardDetail card={card} />);
    
    expect(screen.queryByText('補齊名片資訊')).toBeNull();
  });
  
  test('應該成功補齊名片資訊', async () => {
    const card = { uuid: 'test', organization: '數位發展部' };
    
    await enrichCardInfo('test');
    
    expect(mockPatch).toHaveBeenCalledWith('/api/user/received-cards/test', {
      company_summary: expect.any(String),
      ai_status: 'completed'
    });
  });
});
```

---

**文檔更新完成**
