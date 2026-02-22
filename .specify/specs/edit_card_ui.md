# BDD Spec: Edit Card UI (Week 2 Day 4)

## Feature: 編輯名片 UI - 修改名片資訊

### Background
當前問題：
- 無法編輯已儲存的名片
- OCR 錯誤無法修正
- 資訊變更無法更新

目標：
- 編輯名片 Modal
- 表單驗證
- 即時更新列表
- 支援所有欄位編輯

---

## Scenario 1: 編輯按鈕

### Given: 名片列表
### When: 顯示名片卡片
### Then: 顯示編輯按鈕

**UI 元素**：
```html
<button class="edit-card-btn text-blue-600 hover:text-blue-800">
  <svg class="w-5 h-5"><!-- Edit icon --></svg>
</button>
```

---

## Scenario 2: 編輯 Modal UI

### Given: 使用者點擊編輯按鈕
### When: 開啟編輯 Modal
### Then: 顯示名片資訊表單

**UI 元素**：
```html
<div id="editCardModal" class="fixed inset-0 bg-black bg-opacity-50 hidden">
  <div class="bg-white rounded-lg max-w-2xl mx-auto mt-20 p-6">
    <h2 class="text-xl font-semibold mb-4">編輯名片</h2>
    
    <form id="editCardForm">
      <div class="grid grid-cols-2 gap-4">
        <!-- 姓名 -->
        <div>
          <label class="block text-sm font-medium mb-1">姓名 *</label>
          <input type="text" name="name" required class="w-full px-3 py-2 border rounded">
        </div>
        
        <!-- 職稱 -->
        <div>
          <label class="block text-sm font-medium mb-1">職稱</label>
          <input type="text" name="title" class="w-full px-3 py-2 border rounded">
        </div>
        
        <!-- 公司 -->
        <div class="col-span-2">
          <label class="block text-sm font-medium mb-1">公司</label>
          <input type="text" name="company" class="w-full px-3 py-2 border rounded">
        </div>
        
        <!-- Email -->
        <div>
          <label class="block text-sm font-medium mb-1">Email</label>
          <input type="email" name="email" class="w-full px-3 py-2 border rounded">
        </div>
        
        <!-- 電話 -->
        <div>
          <label class="block text-sm font-medium mb-1">電話</label>
          <input type="tel" name="phone" class="w-full px-3 py-2 border rounded">
        </div>
        
        <!-- 網站 -->
        <div>
          <label class="block text-sm font-medium mb-1">網站</label>
          <input type="url" name="website" class="w-full px-3 py-2 border rounded">
        </div>
        
        <!-- 地址 -->
        <div class="col-span-2">
          <label class="block text-sm font-medium mb-1">地址</label>
          <input type="text" name="address" class="w-full px-3 py-2 border rounded">
        </div>
        
        <!-- 備註 -->
        <div class="col-span-2">
          <label class="block text-sm font-medium mb-1">備註</label>
          <textarea name="notes" rows="3" class="w-full px-3 py-2 border rounded"></textarea>
        </div>
      </div>
      
      <!-- 按鈕 -->
      <div class="flex justify-end gap-2 mt-6">
        <button type="button" id="cancelEdit" class="px-4 py-2 border rounded">取消</button>
        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">儲存</button>
      </div>
    </form>
  </div>
</div>
```

---

## Scenario 3: 開啟編輯 Modal

### Given: 使用者點擊編輯按鈕
### When: 載入名片資訊
### Then: 填充表單欄位

**實作**：
```javascript
function openEditModal(cardUuid) {
  const card = allCards.find(c => c.card_uuid === cardUuid);
  if (!card) return;
  
  // 填充表單
  const form = document.getElementById('editCardForm');
  form.elements.name.value = card.full_name || '';
  form.elements.title.value = card.title || '';
  form.elements.company.value = card.organization || '';
  form.elements.email.value = card.email || '';
  form.elements.phone.value = card.phone || '';
  form.elements.website.value = card.website || '';
  form.elements.address.value = card.address || '';
  form.elements.notes.value = card.notes || '';
  
  // 儲存 card_uuid
  form.dataset.cardUuid = cardUuid;
  
  // 顯示 Modal
  document.getElementById('editCardModal').classList.remove('hidden');
}
```

---

## Scenario 4: 表單驗證

### Given: 使用者提交表單
### When: 驗證欄位
### Then: 姓名為必填，Email 格式驗證

**實作**：
```javascript
function validateEditForm(formData) {
  const errors = [];
  
  // 姓名必填
  if (!formData.name.trim()) {
    errors.push('姓名為必填欄位');
  }
  
  // Email 格式驗證
  if (formData.email && !isValidEmail(formData.email)) {
    errors.push('Email 格式不正確');
  }
  
  // 網站格式驗證
  if (formData.website && !isValidURL(formData.website)) {
    errors.push('網站格式不正確');
  }
  
  return errors;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

---

## Scenario 5: 更新名片 API

### Given: 表單驗證通過
### When: 提交更新
### Then: 呼叫 PATCH API

**API 呼叫**：
```javascript
async function updateCard(cardUuid, formData) {
  const response = await ReceivedCardsAPI.call(
    `/api/user/received-cards/${cardUuid}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: formData.name,
        title: formData.title,
        organization: formData.company,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        address: formData.address,
        notes: formData.notes
      })
    }
  );
  
  return response.json();
}
```

---

## Scenario 6: 提交表單

### Given: 使用者點擊儲存
### When: 提交表單
### Then: 驗證、更新、關閉 Modal

**實作**：
```javascript
document.getElementById('editCardForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const cardUuid = form.dataset.cardUuid;
  
  // 收集表單資料
  const formData = {
    name: form.elements.name.value.trim(),
    title: form.elements.title.value.trim(),
    company: form.elements.company.value.trim(),
    email: form.elements.email.value.trim(),
    phone: form.elements.phone.value.trim(),
    website: form.elements.website.value.trim(),
    address: form.elements.address.value.trim(),
    notes: form.elements.notes.value.trim()
  };
  
  // 驗證
  const errors = validateEditForm(formData);
  if (errors.length > 0) {
    showToast(errors.join('\n'), 'error');
    return;
  }
  
  try {
    // 更新名片
    await updateCard(cardUuid, formData);
    
    // 關閉 Modal
    closeEditModal();
    
    // 重新載入名片列表
    await loadReceivedCards();
    
    showToast('名片已更新', 'success');
  } catch (error) {
    console.error('[EditCard] Error:', error);
    showToast('更新失敗，請稍後再試', 'error');
  }
});
```

---

## Scenario 7: 關閉 Modal

### Given: 使用者點擊取消或背景
### When: 關閉 Modal
### Then: 隱藏 Modal 並重置表單

**實作**：
```javascript
function closeEditModal() {
  const modal = document.getElementById('editCardModal');
  modal.classList.add('hidden');
  
  // 重置表單
  document.getElementById('editCardForm').reset();
}

// 取消按鈕
document.getElementById('cancelEdit').addEventListener('click', closeEditModal);

// 點擊背景關閉
document.getElementById('editCardModal').addEventListener('click', (e) => {
  if (e.target.id === 'editCardModal') {
    closeEditModal();
  }
});
```

---

## Scenario 8: 即時更新列表

### Given: 名片更新成功
### When: 重新載入列表
### Then: 顯示更新後的資訊

**實作**：
```javascript
async function loadReceivedCards() {
  const response = await ReceivedCardsAPI.call('/api/user/received-cards');
  const data = await response.json();
  
  // 更新全域變數
  allCards = data.cards;
  
  // 重新套用當前篩選
  const keyword = document.getElementById('searchInput').value.toLowerCase().trim();
  filterCards(keyword, selectedTags);
}
```

---

## Scenario 9: 編輯按鈕綁定

### Given: 名片列表渲染
### When: 綁定編輯按鈕事件
### Then: 點擊時開啟編輯 Modal

**實作**：
```javascript
function bindEditButtons() {
  document.querySelectorAll('.edit-card-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // 防止觸發名片點擊
      const cardUuid = btn.dataset.cardUuid;
      openEditModal(cardUuid);
    });
  });
}

// 在 renderCards 後呼叫
function renderCards(cards) {
  // 渲染名片...
  bindEditButtons();
}
```

---

## Scenario 10: 後端 API 實作

### Given: PATCH /api/user/received-cards/:uuid
### When: 更新名片
### Then: 驗證、更新資料庫、回傳結果

**已存在**（需確認）：
```typescript
export async function handleUpdateCard(
  request: Request,
  env: Env,
  card_uuid: string
): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  const body = await request.json();
  
  // 更新名片
  await env.DB.prepare(`
    UPDATE received_cards 
    SET full_name = ?, title = ?, organization = ?, 
        email = ?, phone = ?, website = ?, address = ?, notes = ?,
        updated_at = ?
    WHERE card_uuid = ? AND user_email = ? AND deleted_at IS NULL
  `).bind(
    body.full_name, body.title, body.organization,
    body.email, body.phone, body.website, body.address, body.notes,
    Date.now(), card_uuid, user.email
  ).run();
  
  return jsonResponse({ success: true });
}
```

---

## Scenario 11: 欄位自動完成

### Given: 使用者輸入公司名稱
### When: 失去焦點
### Then: 自動提取標籤（可選）

**實作**（可選）：
```javascript
form.elements.company.addEventListener('blur', () => {
  const company = form.elements.company.value;
  // 可以顯示建議的標籤
});
```

---

## Scenario 12: 鍵盤快捷鍵

### Given: Modal 開啟
### When: 按下 Escape
### Then: 關閉 Modal

**實作**：
```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('editCardModal');
    if (!modal.classList.contains('hidden')) {
      closeEditModal();
    }
  }
});
```

---

## Acceptance Criteria

### 前端實作
- [ ] 編輯按鈕 UI
- [ ] 編輯 Modal UI
- [ ] 表單欄位（8 個）
- [ ] 開啟 Modal 邏輯
- [ ] 關閉 Modal 邏輯
- [ ] 表單驗證
- [ ] 提交表單
- [ ] 即時更新列表

### 後端實作
- [ ] PATCH API 端點（確認已存在）
- [ ] 租戶隔離驗證
- [ ] 更新資料庫

### UX 優化
- [ ] 鍵盤快捷鍵（Escape）
- [ ] 點擊背景關閉
- [ ] 載入狀態顯示
- [ ] 錯誤訊息顯示

---

## Implementation Details

### 檔案位置
- **修改**：`workers/public/user-portal.html`（編輯 Modal UI）
- **修改**：`workers/public/js/received-cards.js`（編輯邏輯）
- **確認**：`workers/src/handlers/user/received-cards/crud.ts`（PATCH API）

### 核心函式
```javascript
openEditModal(cardUuid)           // 開啟編輯 Modal
closeEditModal()                  // 關閉編輯 Modal
validateEditForm(formData)        // 表單驗證
updateCard(cardUuid, formData)    // 更新名片 API
bindEditButtons()                 // 綁定編輯按鈕
```

---

## Non-Goals (本階段不做)

- ❌ 批次編輯
- ❌ 編輯歷史記錄
- ❌ 欄位自動完成建議
- ❌ 圖片編輯

---

## Technical Notes

1. **表單驗證**：
   - 姓名必填
   - Email 格式驗證
   - URL 格式驗證

2. **API 呼叫**：
   - 使用 PATCH 方法
   - Content-Type: application/json
   - 租戶隔離驗證

3. **UX 優化**：
   - Escape 關閉 Modal
   - 點擊背景關閉
   - 即時更新列表

4. **錯誤處理**：
   - 驗證錯誤顯示 Toast
   - API 錯誤顯示 Toast
   - 網路錯誤處理

---

## Estimated Time: 3 hours

- UI 實作：1 小時
- 邏輯實作：1.5 小時
- 測試與優化：0.5 小時
