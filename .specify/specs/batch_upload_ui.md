# BDD Spec: Batch Upload UI (Week 2 Day 1)

## Feature: 批次上傳 UI - 拖曳上傳 + 進度條

### Background
當前問題：
- 使用者無法批次上傳名片
- 需要手動點擊上傳按鈕

目標：
- 拖曳上傳（Drag & Drop）
- 批次選擇（最多 20 張）
- 即時進度顯示
- 錯誤處理

---

## Scenario 1: 拖曳區域 UI

### Given: 使用者進入「收到的名片」頁面
### When: 顯示拖曳上傳區域
### Then: 顯示友善的提示文字

**UI 元素**：
```html
<div id="dropZone" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
  <svg class="mx-auto h-12 w-12 text-gray-400"><!-- Upload icon --></svg>
  <p class="mt-2 text-sm text-gray-600">拖曳圖片到此處，或點擊選擇檔案</p>
  <p class="text-xs text-gray-500">最多 20 張，每張最大 10MB</p>
  <input type="file" id="fileInput" multiple accept="image/*" class="hidden">
</div>
```

---

## Scenario 2: 拖曳上傳互動

### Given: 使用者拖曳圖片到拖曳區域
### When: 滑鼠進入拖曳區域
### Then: 顯示視覺反饋（邊框變色）

**CSS 狀態**：
```css
.drop-zone-active {
  border-color: #3b82f6; /* blue-500 */
  background-color: #eff6ff; /* blue-50 */
}
```

**事件處理**：
```javascript
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drop-zone-active');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drop-zone-active');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drop-zone-active');
  const files = Array.from(e.dataTransfer.files);
  handleBatchUpload(files);
});
```

---

## Scenario 3: 點擊選擇檔案

### Given: 使用者點擊拖曳區域
### When: 觸發檔案選擇對話框
### Then: 允許多選圖片

**實作**：
```javascript
dropZone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  handleBatchUpload(files);
});
```

---

## Scenario 4: 檔案數量驗證

### Given: 使用者選擇超過 20 張圖片
### When: 開始上傳
### Then: 顯示錯誤訊息並拒絕上傳

**驗證邏輯**：
```javascript
if (files.length > 20) {
  showError('最多只能上傳 20 張圖片');
  return;
}
```

---

## Scenario 5: 檔案大小驗證

### Given: 單張圖片超過 10MB
### When: 開始上傳
### Then: 顯示錯誤訊息並拒絕上傳

**驗證邏輯**：
```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
for (const file of files) {
  if (file.size > MAX_FILE_SIZE) {
    showError(`檔案 ${file.name} 超過 10MB 限制`);
    return;
  }
}
```

---

## Scenario 6: 檔案類型驗證

### Given: 使用者選擇非圖片檔案
### When: 開始上傳
### Then: 顯示錯誤訊息並拒絕上傳

**驗證邏輯**：
```javascript
const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
for (const file of files) {
  if (!validTypes.includes(file.type)) {
    showError(`檔案 ${file.name} 不是有效的圖片格式`);
    return;
  }
}
```

---

## Scenario 7: 批次上傳 API 呼叫

### Given: 檔案驗證通過
### When: 呼叫批次上傳 API
### Then: 使用 FormData 傳送多個檔案

**實作**：
```javascript
async function handleBatchUpload(files) {
  // 驗證...
  
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });
  
  const response = await ReceivedCardsAPI.call('/api/user/received-cards/batch-upload', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  startProgressPolling(data.batch_id);
}
```

---

## Scenario 8: 進度條 UI

### Given: 批次上傳開始
### When: 顯示進度條
### Then: 顯示上傳進度和狀態

**UI 元素**：
```html
<div id="progressContainer" class="hidden mt-4">
  <div class="flex justify-between text-sm mb-2">
    <span>上傳進度</span>
    <span id="progressText">0 / 20</span>
  </div>
  <div class="w-full bg-gray-200 rounded-full h-2">
    <div id="progressBar" class="bg-blue-600 h-2 rounded-full" style="width: 0%"></div>
  </div>
  <div id="statusList" class="mt-4 space-y-2 max-h-64 overflow-y-auto">
    <!-- 動態插入狀態項目 -->
  </div>
</div>
```

---

## Scenario 9: 進度輪詢

### Given: 批次上傳已開始
### When: 每 2 秒輪詢進度
### Then: 更新進度條和狀態列表

**實作**：
```javascript
async function startProgressPolling(batch_id) {
  const interval = setInterval(async () => {
    const response = await ReceivedCardsAPI.call(`/api/user/received-cards/batch/${batch_id}`);
    const data = await response.json();
    
    updateProgress(data);
    
    // 全部完成或失敗時停止輪詢
    if (data.completed + data.failed === data.total) {
      clearInterval(interval);
      onBatchComplete(data);
    }
  }, 2000);
}
```

---

## Scenario 10: 進度更新

### Given: 收到進度資料
### When: 更新 UI
### Then: 顯示完成數、失敗數、處理中數

**實作**：
```javascript
function updateProgress(data) {
  const { total, completed, failed, processing } = data;
  const percentage = Math.round((completed + failed) / total * 100);
  
  document.getElementById('progressBar').style.width = `${percentage}%`;
  document.getElementById('progressText').textContent = `${completed + failed} / ${total}`;
  
  // 更新狀態列表
  const statusList = document.getElementById('statusList');
  statusList.innerHTML = data.results.map(result => `
    <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
      <span class="text-sm truncate">${result.filename}</span>
      <span class="text-xs ${getStatusColor(result.status)}">${getStatusText(result.status)}</span>
    </div>
  `).join('');
}

function getStatusColor(status) {
  switch (status) {
    case 'completed': return 'text-green-600';
    case 'failed': return 'text-red-600';
    case 'processing': return 'text-blue-600';
    default: return 'text-gray-600';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'completed': return '✓ 完成';
    case 'failed': return '✗ 失敗';
    case 'processing': return '⏳ 處理中';
    default: return '等待中';
  }
}
```

---

## Scenario 11: 批次完成處理

### Given: 批次上傳全部完成
### When: 顯示完成訊息
### Then: 刷新名片列表

**實作**：
```javascript
function onBatchComplete(data) {
  const { total, completed, failed } = data;
  
  if (failed === 0) {
    showSuccess(`成功上傳 ${completed} 張名片！`);
  } else {
    showWarning(`上傳完成：${completed} 成功，${failed} 失敗`);
  }
  
  // 刷新名片列表
  loadReceivedCards();
  
  // 重置 UI
  setTimeout(() => {
    document.getElementById('progressContainer').classList.add('hidden');
    document.getElementById('dropZone').classList.remove('hidden');
  }, 3000);
}
```

---

## Scenario 12: 錯誤處理

### Given: API 呼叫失敗
### When: 顯示錯誤訊息
### Then: 允許重試

**實作**：
```javascript
async function handleBatchUpload(files) {
  try {
    // 驗證和上傳...
  } catch (error) {
    console.error('[BatchUpload] Error:', error);
    showError('上傳失敗，請稍後再試');
    
    // 重置 UI
    document.getElementById('progressContainer').classList.add('hidden');
    document.getElementById('dropZone').classList.remove('hidden');
  }
}
```

---

## Scenario 13: 取消上傳

### Given: 批次上傳進行中
### When: 使用者點擊取消按鈕
### Then: 停止輪詢並重置 UI

**UI 元素**：
```html
<button id="cancelUpload" class="mt-2 text-sm text-red-600 hover:text-red-800">
  取消上傳
</button>
```

**實作**：
```javascript
let currentInterval = null;

function startProgressPolling(batch_id) {
  currentInterval = setInterval(async () => {
    // 輪詢邏輯...
  }, 2000);
}

document.getElementById('cancelUpload').addEventListener('click', () => {
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }
  
  // 重置 UI
  document.getElementById('progressContainer').classList.add('hidden');
  document.getElementById('dropZone').classList.remove('hidden');
  
  showInfo('已取消上傳');
});
```

---

## Acceptance Criteria

### UI 實作
- [ ] 拖曳區域已實作
- [ ] 拖曳互動（dragover, dragleave, drop）
- [ ] 點擊選擇檔案
- [ ] 進度條 UI
- [ ] 狀態列表 UI
- [ ] 取消按鈕

### 驗證邏輯
- [ ] 檔案數量限制（20 張）
- [ ] 檔案大小限制（10MB）
- [ ] 檔案類型驗證（image/*）

### API 整合
- [ ] 批次上傳 API 呼叫
- [ ] 進度輪詢（2 秒間隔）
- [ ] 錯誤處理

### UX 優化
- [ ] 視覺反饋（拖曳時邊框變色）
- [ ] 進度百分比顯示
- [ ] 完成/失敗訊息
- [ ] 自動刷新名片列表

---

## Implementation Details

### 檔案位置
- **修改**：`workers/public/user-portal.html`（新增拖曳區域和進度條）
- **修改**：`workers/public/js/received-cards.js`（新增批次上傳邏輯）

### 依賴
- 現有的 `ReceivedCardsAPI.call()` 函式
- 現有的 `showError()`, `showSuccess()`, `showWarning()` 函式
- 現有的 `loadReceivedCards()` 函式

---

## Non-Goals (本階段不做)

- ❌ 批次 OCR 處理（使用現有單張邏輯）
- ❌ WebSocket 即時進度（使用輪詢）
- ❌ 斷點續傳
- ❌ 圖片預覽

---

## Technical Notes

1. **FormData 多檔案上傳**：
   - 使用 `formData.append('images', file)` 多次呼叫
   - 後端會收到 `File[]` 陣列

2. **輪詢策略**：
   - 2 秒間隔（避免過度請求）
   - 完成後自動停止
   - 支援手動取消

3. **UI 狀態管理**：
   - 上傳中：隱藏拖曳區域，顯示進度條
   - 完成後：3 秒後自動重置

4. **錯誤處理**：
   - 前端驗證（數量、大小、類型）
   - API 錯誤處理
   - 使用者友善的錯誤訊息

---

## Estimated Time: 3 hours

- UI 實作：1.5 小時
- 邏輯實作：1 小時
- 測試與優化：0.5 小時
