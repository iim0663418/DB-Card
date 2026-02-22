# BDD Spec: Export UI + QR Code (Week 2 Day 5)

## Feature: 匯出 UI + QR Code - 匯出名片為 vCard 和 QR Code

### Background
當前問題：
- 無法匯出名片
- 無法分享名片
- 無法生成 QR Code

目標：
- vCard 匯出按鈕
- QR Code 生成（vCard 格式）
- 下載功能
- 分享功能

---

## Scenario 1: 匯出按鈕 UI

### Given: 名片列表
### When: 顯示名片卡片
### Then: 顯示匯出按鈕

**UI 元素**：
```html
<button class="export-vcard-btn text-green-600 hover:text-green-800">
  <svg class="w-5 h-5"><!-- Download icon --></svg>
</button>
```

---

## Scenario 2: 匯出 vCard

### Given: 使用者點擊匯出按鈕
### When: 呼叫 vCard API
### Then: 下載 .vcf 檔案

**實作**：
```javascript
async function exportVCard(uuid) {
  try {
    // 1. 呼叫 vCard API
    const response = await fetch(`/api/user/received-cards/${uuid}/vcard`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to export vCard');
    }
    
    // 2. 取得檔案內容
    const blob = await response.blob();
    
    // 3. 取得檔名（從 Content-Disposition header）
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition 
      ? contentDisposition.split('filename=')[1].replace(/"/g, '')
      : 'contact.vcf';
    
    // 4. 下載檔案
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('vCard 已下載', 'success');
  } catch (error) {
    console.error('[ExportVCard] Error:', error);
    showToast('匯出失敗', 'error');
  }
}
```

---

## Scenario 3: QR Code Modal UI

### Given: 使用者點擊 QR Code 按鈕
### When: 開啟 QR Code Modal
### Then: 顯示 QR Code

**UI 元素**：
```html
<div id="qrCodeModal" class="fixed inset-0 bg-black bg-opacity-50 hidden">
  <div class="bg-white rounded-lg max-w-md mx-auto mt-20 p-6">
    <h2 class="text-xl font-semibold mb-4">名片 QR Code</h2>
    
    <!-- QR Code 容器 -->
    <div id="qrCodeContainer" class="flex justify-center mb-4">
      <!-- QR Code 將插入這裡 -->
    </div>
    
    <!-- 按鈕 -->
    <div class="flex justify-end gap-2">
      <button id="downloadQRCode" class="px-4 py-2 bg-blue-600 text-white rounded">
        下載 QR Code
      </button>
      <button id="closeQRCode" class="px-4 py-2 border rounded">
        關閉
      </button>
    </div>
  </div>
</div>
```

---

## Scenario 4: 生成 QR Code

### Given: 名片 vCard 資料
### When: 生成 QR Code
### Then: 顯示 QR Code 圖片

**實作**：
```javascript
async function showQRCode(uuid) {
  try {
    // 1. 取得 vCard 資料
    const response = await fetch(`/api/user/received-cards/${uuid}/vcard`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get vCard');
    }
    
    const vCardText = await response.text();
    
    // 2. 生成 QR Code（使用 qrcode.js）
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    qrCodeContainer.innerHTML = ''; // 清空
    
    const qrCode = new QRCode(qrCodeContainer, {
      text: vCardText,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
    
    // 3. 顯示 Modal
    document.getElementById('qrCodeModal').classList.remove('hidden');
    
  } catch (error) {
    console.error('[ShowQRCode] Error:', error);
    showToast('生成 QR Code 失敗', 'error');
  }
}
```

---

## Scenario 5: 下載 QR Code

### Given: QR Code 已生成
### When: 使用者點擊下載按鈕
### Then: 下載 QR Code 圖片

**實作**：
```javascript
function downloadQRCode() {
  try {
    // 1. 取得 QR Code canvas
    const canvas = document.querySelector('#qrCodeContainer canvas');
    if (!canvas) {
      throw new Error('QR Code not found');
    }
    
    // 2. 轉換為 PNG
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qrcode.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('QR Code 已下載', 'success');
    });
  } catch (error) {
    console.error('[DownloadQRCode] Error:', error);
    showToast('下載失敗', 'error');
  }
}
```

---

## Scenario 6: 關閉 QR Code Modal

### Given: QR Code Modal 已開啟
### When: 使用者點擊關閉或背景
### Then: 關閉 Modal

**實作**：
```javascript
function closeQRCodeModal() {
  const modal = document.getElementById('qrCodeModal');
  modal.classList.add('hidden');
  
  // 清空 QR Code
  document.getElementById('qrCodeContainer').innerHTML = '';
}

// 關閉按鈕
document.getElementById('closeQRCode').addEventListener('click', closeQRCodeModal);

// 點擊背景關閉
document.getElementById('qrCodeModal').addEventListener('click', (e) => {
  if (e.target.id === 'qrCodeModal') {
    closeQRCodeModal();
  }
});

// ESC 鍵關閉
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('qrCodeModal');
    if (!modal.classList.contains('hidden')) {
      closeQRCodeModal();
    }
  }
});
```

---

## Scenario 7: 匯出按鈕綁定

### Given: 名片列表渲染
### When: 綁定匯出按鈕事件
### Then: 點擊時匯出 vCard

**實作**：
```javascript
function bindExportButtons() {
  document.querySelectorAll('.export-vcard-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const uuid = btn.dataset.uuid;
      exportVCard(uuid);
    });
  });
}

// 在 renderCards 後呼叫
function renderCards(cards) {
  // 渲染名片...
  bindExportButtons();
}
```

---

## Scenario 8: QR Code 按鈕綁定

### Given: 名片列表渲染
### When: 綁定 QR Code 按鈕事件
### Then: 點擊時顯示 QR Code

**實作**：
```javascript
function bindQRCodeButtons() {
  document.querySelectorAll('.qrcode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const uuid = btn.dataset.uuid;
      showQRCode(uuid);
    });
  });
}

// 在 renderCards 後呼叫
function renderCards(cards) {
  // 渲染名片...
  bindExportButtons();
  bindQRCodeButtons();
}
```

---

## Scenario 9: vCard API 端點

### Given: 名片 UUID
### When: GET /api/user/received-cards/:uuid/vcard
### Then: 回傳 vCard 檔案

**已實作**（Week 1 Day 3）：
```typescript
export async function handleGetVCard(
  request: Request,
  env: Env,
  uuid: string
): Promise<Response> {
  // 驗證使用者
  // 查詢名片
  // 生成 vCard
  // 回傳檔案
}
```

---

## Scenario 10: 載入 QR Code 函式庫

### Given: 需要生成 QR Code
### When: 載入頁面
### Then: 載入 qrcode.js

**HTML**：
```html
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
```

---

## Acceptance Criteria

### 前端實作
- [ ] 匯出按鈕 UI
- [ ] QR Code 按鈕 UI
- [ ] QR Code Modal UI
- [ ] 匯出 vCard 邏輯
- [ ] 生成 QR Code 邏輯
- [ ] 下載 QR Code 邏輯
- [ ] 關閉 Modal 邏輯

### 後端實作
- [ ] vCard API 端點（已存在）

### UX 優化
- [ ] ESC 鍵關閉 Modal
- [ ] 點擊背景關閉 Modal
- [ ] 成功/錯誤 Toast 訊息
- [ ] 檔名包含姓名

---

## Implementation Details

### 檔案位置
- **修改**：`workers/public/user-portal.html`（QR Code Modal UI）
- **修改**：`workers/public/js/received-cards.js`（匯出邏輯）

### 依賴
- qrcode.js（CDN）
- 現有的 vCard API

---

## Non-Goals (本階段不做)

- ❌ 分享到社群媒體
- ❌ 批次匯出
- ❌ 自訂 QR Code 樣式

---

## Technical Notes

1. **vCard API**：
   - 已在 Week 1 Day 3 實作
   - 回傳 text/vcard 格式
   - Content-Disposition 包含檔名

2. **QR Code**：
   - 使用 qrcode.js 函式庫
   - 錯誤修正等級：H（高）
   - 尺寸：256x256

3. **下載**：
   - 使用 Blob + URL.createObjectURL
   - 自動清理 URL

4. **檔名**：
   - vCard：`{姓名}.vcf`
   - QR Code：`qrcode.png`

---

## Estimated Time: 2 hours

- UI 實作：1 小時
- 邏輯實作：0.5 小時
- 測試與優化：0.5 小時
