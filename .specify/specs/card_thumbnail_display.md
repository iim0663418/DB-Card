# BDD Spec: Card Thumbnail Display (Week 2 Day 2)

## Feature: 名片縮圖顯示 - 在列表中顯示名片預覽圖

### Background
當前問題：
- 名片列表只顯示文字資訊
- 無法快速識別名片
- 使用者體驗不佳

目標：
- 在名片列表顯示縮圖
- 縮圖載入失敗時顯示預設圖示
- Lazy loading 優化效能

---

## Scenario 1: 名片列表顯示縮圖

### Given: 名片有 thumbnail_url
### When: 顯示名片列表
### Then: 顯示縮圖圖片

**UI 元素**：
```html
<div class="card-item flex items-start gap-4">
  <!-- 縮圖 -->
  <div class="flex-shrink-0 w-24 h-16 bg-gray-100 rounded overflow-hidden">
    <img 
      src="/api/user/received-cards/{card_uuid}/thumbnail" 
      alt="名片縮圖"
      class="w-full h-full object-cover"
      loading="lazy"
    >
  </div>
  
  <!-- 名片資訊 -->
  <div class="flex-1">
    <h3 class="font-semibold">{name}</h3>
    <p class="text-sm text-gray-600">{title} @ {company}</p>
  </div>
</div>
```

---

## Scenario 2: 縮圖載入失敗顯示預設圖示

### Given: thumbnail_url 不存在或載入失敗
### When: 顯示名片列表
### Then: 顯示預設名片圖示

**實作**：
```javascript
function renderCardThumbnail(card) {
  const thumbnail = document.createElement('div');
  thumbnail.className = 'flex-shrink-0 w-24 h-16 bg-gray-100 rounded overflow-hidden flex items-center justify-center';
  
  if (card.thumbnail_url) {
    const img = document.createElement('img');
    img.src = `/api/user/received-cards/${card.card_uuid}/thumbnail`;
    img.alt = '名片縮圖';
    img.className = 'w-full h-full object-cover';
    img.loading = 'lazy';
    
    // 載入失敗時顯示預設圖示
    img.onerror = () => {
      thumbnail.innerHTML = `
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      `;
    };
    
    thumbnail.appendChild(img);
  } else {
    // 沒有縮圖時顯示預設圖示
    thumbnail.innerHTML = `
      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    `;
  }
  
  return thumbnail;
}
```

---

## Scenario 3: Lazy Loading 優化

### Given: 名片列表很長
### When: 滾動頁面
### Then: 只載入可見區域的縮圖

**實作**：
```html
<img 
  src="/api/user/received-cards/{card_uuid}/thumbnail" 
  loading="lazy"
  class="w-full h-full object-cover"
>
```

**說明**：
- `loading="lazy"` 是原生瀏覽器支援
- 只有當圖片進入 viewport 時才載入
- 無需額外 JavaScript

---

## Scenario 4: 縮圖點擊放大預覽

### Given: 使用者點擊縮圖
### When: 觸發點擊事件
### Then: 顯示原圖預覽

**實作**：
```javascript
thumbnail.addEventListener('click', (e) => {
  e.stopPropagation(); // 防止觸發名片點擊
  showImagePreview(card.card_uuid);
});

function showImagePreview(cardUuid) {
  // 創建 Modal
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
  modal.onclick = () => modal.remove();
  
  const img = document.createElement('img');
  img.src = `/api/user/received-cards/${cardUuid}/image`;
  img.className = 'max-w-full max-h-full object-contain';
  img.onclick = (e) => e.stopPropagation();
  
  modal.appendChild(img);
  document.body.appendChild(modal);
}
```

---

## Scenario 5: 縮圖 API 端點

### Given: 名片有 thumbnail_url
### When: GET /api/user/received-cards/:uuid/thumbnail
### Then: 回傳縮圖圖片

**已實作**（Week 1 Day 2）：
```typescript
export async function handleGetThumbnail(
  request: Request,
  env: Env,
  card_uuid: string
): Promise<Response> {
  // 驗證使用者
  // 查詢 thumbnail_url
  // 從 R2 讀取縮圖
  // 回傳 WebP 圖片
}
```

---

## Scenario 6: 原圖 API 端點

### Given: 名片有 image_url
### When: GET /api/user/received-cards/:uuid/image
### Then: 回傳原圖

**需要新增**：
```typescript
export async function handleGetImage(
  request: Request,
  env: Env,
  card_uuid: string
): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  // 查詢名片（租戶隔離）
  const card = await env.DB.prepare(`
    SELECT image_url FROM received_cards 
    WHERE card_uuid = ? AND user_email = ? AND deleted_at IS NULL
  `).bind(card_uuid, user.email).first();

  if (!card) {
    return new Response('Card not found', { status: 404 });
  }

  // 從 R2 讀取原圖
  const imageObject = await env.R2_BUCKET.get(card.image_url);
  if (!imageObject) {
    return new Response('Image not found', { status: 404 });
  }

  return new Response(imageObject.body, {
    headers: {
      'Content-Type': imageObject.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000' // 1 年
    }
  });
}
```

---

## Scenario 7: 響應式設計

### Given: 不同螢幕尺寸
### When: 顯示名片列表
### Then: 縮圖大小自適應

**CSS**：
```css
/* 桌面版：較大縮圖 */
@media (min-width: 768px) {
  .card-thumbnail {
    width: 120px;
    height: 80px;
  }
}

/* 手機版：較小縮圖 */
@media (max-width: 767px) {
  .card-thumbnail {
    width: 80px;
    height: 53px;
  }
}
```

---

## Scenario 8: 縮圖生成時機

### Given: 使用者上傳名片
### When: 儲存名片
### Then: 自動生成縮圖

**已實作**（Week 1 Day 2）：
```javascript
// 在 handleUpload 中
const thumbnail = await generateThumbnailClient(file);
const thumbnailFormData = new FormData();
thumbnailFormData.append('thumbnail', thumbnail);

await ReceivedCardsAPI.call(`/api/user/received-cards/${cardUuid}/thumbnail`, {
  method: 'POST',
  body: thumbnailFormData
});
```

---

## Scenario 9: 縮圖快取策略

### Given: 縮圖 API 回應
### When: 設定 Cache-Control
### Then: 瀏覽器快取 1 年

**已實作**（Week 1 Day 2）：
```typescript
return new Response(thumbnailObject.body, {
  headers: {
    'Content-Type': 'image/webp',
    'Cache-Control': 'public, max-age=31536000' // 1 年
  }
});
```

---

## Scenario 10: 無縮圖時的處理

### Given: 舊名片沒有 thumbnail_url
### When: 顯示名片列表
### Then: 顯示預設圖示，不嘗試載入

**實作**：
```javascript
if (card.thumbnail_url) {
  // 顯示縮圖
} else {
  // 顯示預設圖示（不發送 HTTP 請求）
  thumbnail.innerHTML = `<svg>...</svg>`;
}
```

---

## Acceptance Criteria

### 前端實作
- [ ] 名片列表顯示縮圖
- [ ] 縮圖載入失敗顯示預設圖示
- [ ] Lazy loading 優化
- [ ] 縮圖點擊放大預覽
- [ ] 響應式設計

### 後端實作
- [ ] 原圖 API 端點（GET /api/user/received-cards/:uuid/image）
- [ ] 租戶隔離驗證
- [ ] Cache-Control 設定

### 測試
- [ ] TypeScript 編譯通過
- [ ] 縮圖顯示測試通過
- [ ] 原圖預覽測試通過

---

## Implementation Details

### 檔案位置
- **修改**：`workers/public/js/received-cards.js`（縮圖顯示邏輯）
- **新增**：`workers/src/handlers/user/received-cards/image.ts`（原圖 API）
- **修改**：`workers/src/index.ts`（註冊原圖路由）

### 依賴
- 現有的 `handleGetThumbnail()` 函式
- 現有的名片列表渲染邏輯

---

## Non-Goals (本階段不做)

- ❌ 縮圖編輯功能
- ❌ 批次縮圖重新生成
- ❌ 縮圖壓縮優化

---

## Technical Notes

1. **Lazy Loading**：
   - 使用原生 `loading="lazy"` 屬性
   - 瀏覽器自動處理，無需 JavaScript

2. **錯誤處理**：
   - `img.onerror` 捕捉載入失敗
   - 顯示預設 SVG 圖示

3. **效能優化**：
   - Cache-Control: 1 年快取
   - Lazy loading 減少初始載入

4. **響應式設計**：
   - 桌面版：120x80px
   - 手機版：80x53px

---

## Estimated Time: 2 hours

- 前端實作：1 小時
- 後端實作：30 分鐘
- 測試與優化：30 分鐘
