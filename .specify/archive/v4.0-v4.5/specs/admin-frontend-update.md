# BDD Spec: Admin Dashboard 前端更新 - 使用真實 API

## Scenario 1: 移除 Mock 資料並使用真實 API

### Given: 後端已實作 GET /api/admin/cards
### When: 用戶切換到列表 Tab
### Then: 應呼叫真實 API 並顯示名片列表

**實作要求：**
1. 移除 `MOCK_CARDS` 常數
2. 更新 `loadCards()` 函數：
   ```javascript
   async function loadCards() {
       const token = localStorage.getItem('setup_token');
       
       try {
           const response = await fetch(`${API_BASE}/api/admin/cards`, {
               headers: { 'Authorization': `Bearer ${token}` }
           });
           
           if (!response.ok) throw new Error('載入失敗');
           
           const result = await response.json();
           const cards = result.data.cards;
           
           // 渲染名片列表
           renderCardsList(cards);
           
       } catch (error) {
           showNotification('載入名片失敗: ' + error.message, 'error');
       }
   }
   ```

3. 新增 `renderCardsList(cards)` 函數（從原本的 innerHTML 邏輯分離）

---

## Scenario 2: 實作編輯名片功能

### Given: 後端已實作 GET /api/admin/cards/:uuid
### When: 用戶點擊「編輯」按鈕
### Then: 應載入名片資料並預填到表單

**實作要求：**

### 2.1 載入名片資料
```javascript
async function editCard(uuid) {
    const token = localStorage.getItem('setup_token');
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/cards/${uuid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('載入失敗');
        
        const result = await response.json();
        const card = result.data;
        
        // 預填表單
        fillFormWithCardData(card);
        
        // 切換到創建 Tab（實際上是編輯模式）
        switchTab('create');
        
        // 儲存編輯狀態
        window.editingCardUuid = uuid;
        
    } catch (error) {
        showNotification('載入名片失敗: ' + error.message, 'error');
    }
}
```

### 2.2 預填表單
```javascript
function fillFormWithCardData(card) {
    const data = card.data;
    
    // 基本資訊
    document.getElementById('name_zh').value = data.name?.zh || '';
    document.getElementById('name_en').value = data.name?.en || '';
    document.getElementById('title_zh').value = data.title?.zh || '';
    document.getElementById('title_en').value = data.title?.en || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('department').value = data.department || '';
    
    // 聯絡資訊
    document.getElementById('phone').value = data.phone || '';
    
    // 地址處理
    if (data.address) {
        // 檢查是否為預設地址
        if (data.address.zh === ADDRESS_PRESETS.yanping.zh) {
            document.getElementById('address-preset').value = 'yanping';
        } else if (data.address.zh === ADDRESS_PRESETS.shinkong.zh) {
            document.getElementById('address-preset').value = 'shinkong';
        } else {
            // 自訂地址
            document.getElementById('address-preset').value = 'custom';
            document.getElementById('address_zh').value = data.address.zh || '';
            document.getElementById('address_en').value = data.address.en || '';
            document.getElementById('custom-address-fields').classList.remove('hidden');
        }
    }
    
    // 進階資訊
    document.getElementById('mobile').value = data.mobile || '';
    document.getElementById('avatar_url').value = data.avatar_url || '';
    document.getElementById('greetings_zh').value = data.greetings?.zh || '';
    document.getElementById('greetings_en').value = data.greetings?.en || '';
    document.getElementById('social_note').value = data.socialLinks?.socialNote || '';
    
    // 名片類型
    document.getElementById('card_type').value = card.card_type;
    
    // 更新預覽
    updatePreview();
}
```

### 2.3 修改提交邏輯
```javascript
async function handleCreateCard(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('setup_token');
    const isEditing = !!window.editingCardUuid;
    
    // 收集表單資料（現有邏輯）
    const cardData = buildCardData(formData);
    
    try {
        const url = isEditing 
            ? `${API_BASE}/api/admin/cards/${window.editingCardUuid}`
            : `${API_BASE}/api/admin/cards`;
        
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cardType: cardType,
                cardData: cardData
            })
        });
        
        if (!response.ok) throw new Error('操作失敗');
        
        const result = await response.json();
        
        showNotification(
            isEditing ? '名片已更新' : '名片已創建', 
            'success'
        );
        
        // 清除編輯狀態
        window.editingCardUuid = null;
        
        // 重置表單
        document.getElementById('card-form').reset();
        
        // 切換到列表
        switchTab('list');
        
    } catch (error) {
        showNotification('操作失敗: ' + error.message, 'error');
    }
}
```

### 2.4 UI 更新
- 編輯模式時，按鈕文字改為「更新名片」
- 編輯模式時，顯示「取消編輯」按鈕
- 取消編輯時清除 `window.editingCardUuid` 並重置表單

---

## Scenario 3: 載入狀態處理

### Given: API 請求需要時間
### When: 載入名片列表或單一名片
### Then: 應顯示載入狀態

**實作要求：**
```javascript
function showLoadingState() {
    const grid = document.getElementById('cards-grid');
    grid.innerHTML = `
        <div class="col-span-full text-center py-12">
            <i data-lucide="loader-2" class="w-12 h-12 text-slate-300 mx-auto mb-4 animate-spin"></i>
            <p class="text-slate-400">載入中...</p>
        </div>
    `;
    lucide.createIcons();
}

function showEmptyState() {
    const grid = document.getElementById('cards-grid');
    grid.innerHTML = `
        <div class="col-span-full text-center py-12">
            <i data-lucide="inbox" class="w-12 h-12 text-slate-300 mx-auto mb-4"></i>
            <p class="text-slate-400">尚無名片</p>
        </div>
    `;
    lucide.createIcons();
}
```

---

## Scenario 4: 錯誤處理

### Given: API 可能回傳錯誤
### When: 請求失敗
### Then: 應顯示友善的錯誤訊息

**錯誤類型：**
- 401: Token 過期，提示重新驗證
- 404: 名片不存在
- 500: 伺服器錯誤

```javascript
function handleApiError(response, defaultMessage) {
    if (response.status === 401) {
        showNotification('授權已過期，請重新驗證', 'error');
        // 可選：自動登出
        localStorage.removeItem('setup_token');
        window.location.reload();
    } else if (response.status === 404) {
        showNotification('名片不存在或已刪除', 'error');
    } else {
        showNotification(defaultMessage, 'error');
    }
}
```

---

## Implementation Checklist

### 必須實作
- [ ] 移除 `MOCK_CARDS` 常數
- [ ] 更新 `loadCards()` 使用真實 API
- [ ] 新增 `renderCardsList(cards)` 函數
- [ ] 實作 `editCard(uuid)` 函數
- [ ] 實作 `fillFormWithCardData(card)` 函數
- [ ] 修改 `handleCreateCard()` 支援編輯模式
- [ ] 新增 `showLoadingState()` 函數
- [ ] 新增 `showEmptyState()` 函數
- [ ] 新增編輯狀態管理（`window.editingCardUuid`）

### UI 增強
- [ ] 編輯模式時按鈕文字改為「更新名片」
- [ ] 新增「取消編輯」按鈕
- [ ] 載入狀態顯示
- [ ] 空狀態顯示

### 錯誤處理
- [ ] API 錯誤處理
- [ ] 401 自動登出
- [ ] 404 友善提示

---

## Testing Checklist

### 列表功能
- [ ] 切換到列表 Tab 自動載入
- [ ] 顯示所有名片
- [ ] 載入狀態正確顯示
- [ ] 空狀態正確顯示
- [ ] 錯誤處理正確

### 編輯功能
- [ ] 點擊編輯按鈕載入名片
- [ ] 表單正確預填所有欄位
- [ ] 地址預設選項正確識別
- [ ] 自訂地址正確顯示
- [ ] 預覽即時更新
- [ ] 提交時使用 PUT 方法
- [ ] 更新成功後切換到列表
- [ ] 取消編輯正確重置

### 整合測試
- [ ] 創建 → 列表顯示
- [ ] 編輯 → 更新 → 列表更新
- [ ] 刪除 → 列表移除
- [ ] 撤銷 → 功能正常

---

## Notes
- 保留所有現有功能（創建、刪除、撤銷）
- 保留所有樣式和 Three.js 背景
- 保留預覽功能
- 編輯和創建共用同一個表單
- 使用 `window.editingCardUuid` 區分模式
