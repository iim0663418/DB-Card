# BDD Specification: User Portal Success Modal

## Feature: 名片創建成功 Modal

### Background
當使用者在 user-portal 創建新名片後，需要提供明確的成功反饋和後續操作選項。

### Scenario 1: 創建名片成功顯示 Modal
**Given** 使用者填寫完名片表單並提交
**When** API 返回成功（POST /api/user/cards）
**Then** 顯示成功 Modal，包含：
  - 成功圖示和標題「名片創建成功！」
  - 名片類型說明（個人名片/活動名片/敏感名片）
  - 分享連結（不帶 session）
  - 複製連結按鈕
  - 查看名片效果按鈕
  - 完成按鈕

### Scenario 2: 編輯名片不顯示 Modal
**Given** 使用者編輯現有名片並提交
**When** API 返回成功（PUT /api/user/cards/:uuid）
**Then** 使用 Toast 顯示「名片更新成功」
**And** 不顯示 Modal
**And** 返回選擇頁面

### Scenario 3: 複製分享連結
**Given** 成功 Modal 已顯示
**When** 使用者點擊「複製連結」按鈕
**Then** 連結複製到剪貼簿
**And** 按鈕文字變為「已複製」
**And** 按鈕顏色變為綠色
**And** 2 秒後恢復原狀

### Scenario 4: 查看名片效果
**Given** 成功 Modal 已顯示
**When** 使用者點擊「查看名片效果」按鈕
**Then** 在新視窗開啟 card-display.html?uuid=xxx（不帶 session）
**And** Modal 保持開啟

### Scenario 5: 完成並返回
**Given** 成功 Modal 已顯示
**When** 使用者點擊「完成」按鈕
**Then** 關閉 Modal
**And** 重新載入名片列表
**And** 返回選擇頁面

### Scenario 6: ESC 鍵關閉
**Given** 成功 Modal 已顯示
**When** 使用者按下 ESC 鍵
**Then** 關閉 Modal
**And** 返回選擇頁面

### Scenario 7: 點擊背景關閉
**Given** 成功 Modal 已顯示
**When** 使用者點擊 Modal 背景（backdrop）
**Then** 關閉 Modal
**And** 返回選擇頁面

## Technical Requirements

### HTML Structure
```html
<!-- Success Modal -->
<div id="success-modal" class="hidden fixed inset-0 z-[200] flex items-center justify-center">
  <!-- Backdrop -->
  <div class="modal-backdrop absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
  
  <!-- Modal Content -->
  <div class="modal-content relative bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8">
    <!-- Header -->
    <div class="text-center mb-6">
      <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <i data-lucide="check-circle" class="w-8 h-8 text-green-600"></i>
      </div>
      <h3 class="text-2xl font-black text-slate-900">名片創建成功！</h3>
      <p id="modal-card-type" class="text-sm text-slate-600 mt-2">您的個人名片已準備就緒</p>
    </div>
    
    <!-- Share Link -->
    <div class="mb-6">
      <label class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">分享連結</label>
      <div class="flex gap-2">
        <input id="modal-share-link" type="text" readonly class="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-700">
        <button id="modal-copy-btn" onclick="copyModalLink()" class="px-6 py-3 bg-moda text-white rounded-xl font-bold hover:bg-moda/90 transition-colors">
          複製
        </button>
      </div>
      <p class="text-xs text-slate-500 mt-2">💡 此連結可分享給他人查看您的名片</p>
    </div>
    
    <!-- Actions -->
    <div class="flex gap-3">
      <button id="modal-view-btn" onclick="viewModalCard()" class="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">
        👁 查看名片效果
      </button>
      <button onclick="closeSuccessModal()" class="flex-1 px-6 py-4 bg-moda text-white rounded-xl font-bold hover:bg-moda/90 transition-colors">
        完成
      </button>
    </div>
  </div>
</div>
```

### JavaScript Functions
```javascript
// 全局變數
let currentModalUuid = null;

// 顯示成功 Modal
function showSuccessModal(uuid, type) {
  currentModalUuid = uuid;
  
  // 設定名片類型文字
  const typeText = {
    'personal': '個人名片',
    'event': '活動名片',
    'sensitive': '敏感名片'
  }[type] || '名片';
  document.getElementById('modal-card-type').innerText = `您的${typeText}已準備就緒`;
  
  // 設定分享連結
  const shareLink = `${window.location.origin}/card-display.html?uuid=${uuid}`;
  document.getElementById('modal-share-link').value = shareLink;
  
  // 重置複製按鈕
  const copyBtn = document.getElementById('modal-copy-btn');
  copyBtn.innerText = '複製';
  copyBtn.classList.remove('bg-green-600');
  copyBtn.classList.add('bg-moda');
  
  // 顯示 Modal
  document.getElementById('success-modal').classList.remove('hidden');
  
  // 綁定 ESC 鍵
  document.addEventListener('keydown', handleModalEscape);
}

// 關閉 Modal
function closeSuccessModal() {
  document.getElementById('success-modal').classList.add('hidden');
  document.removeEventListener('keydown', handleModalEscape);
  currentModalUuid = null;
  
  // 返回選擇頁面
  showView('selection');
}

// ESC 鍵處理
function handleModalEscape(e) {
  if (e.key === 'Escape') {
    closeSuccessModal();
  }
}

// 複製連結
async function copyModalLink() {
  const link = document.getElementById('modal-share-link').value;
  const btn = document.getElementById('modal-copy-btn');
  
  try {
    await navigator.clipboard.writeText(link);
    
    // 視覺反饋
    btn.innerText = '已複製';
    btn.classList.remove('bg-moda');
    btn.classList.add('bg-green-600');
    
    // 2 秒後恢復
    setTimeout(() => {
      btn.innerText = '複製';
      btn.classList.remove('bg-green-600');
      btn.classList.add('bg-moda');
    }, 2000);
  } catch (err) {
    showToast('複製失敗，請手動複製');
  }
}

// 查看名片
function viewModalCard() {
  if (currentModalUuid) {
    window.open(`/card-display.html?uuid=${currentModalUuid}`, '_blank');
  }
}

// 點擊背景關閉
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    closeSuccessModal();
  }
});
```

### CSS Styles
```css
/* Modal 動畫 */
#success-modal {
  animation: fadeIn 0.2s ease-out;
}

#success-modal .modal-content {
  animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { 
    opacity: 0;
    transform: scale(0.9);
  }
  to { 
    opacity: 1;
    transform: scale(1);
  }
}

/* MODA 主色 */
.bg-moda {
  background-color: #6868ac;
}

.bg-moda\/90 {
  background-color: rgba(104, 104, 172, 0.9);
}
```

### Integration Points

#### 修改 handleFormSubmit 函數
```javascript
async function handleFormSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {};
  
  // ... 收集表單資料 ...
  
  const uuid = formData.get('form-uuid');
  const type = formData.get('form-type');
  
  try {
    if (uuid) {
      // 編輯：使用 Toast
      await apiCall(`/api/user/cards/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showToast('名片更新成功');
      await fetchUserCards();
      showView('selection');
    } else {
      // 創建：使用 Modal
      const response = await apiCall('/api/user/cards', {
        method: 'POST',
        body: JSON.stringify({ ...data, type })
      });
      
      const newUuid = response.data?.uuid;
      if (newUuid) {
        // 更新 state
        const card = state.cards.find(c => c.type === type);
        if (card) card.uuid = newUuid;
        
        // 重新載入
        await fetchUserCards();
        
        // 顯示成功 Modal
        showSuccessModal(newUuid, type);
      }
    }
  } catch (err) {
    handleError(err);
  }
}
```

#### 修復錯誤訊息顯示
```javascript
// 在 viewCard 函數的 catch 區塊
catch (error) {
  toggleLoading(false);
  const errorMsg = error?.message || error?.error || JSON.stringify(error) || '未知錯誤';
  showToast('查看失敗: ' + errorMsg);
}
```

## Acceptance Criteria
- [ ] 創建名片後顯示 Modal
- [ ] 編輯名片使用 Toast
- [ ] 複製連結功能正常
- [ ] 複製成功有視覺反饋
- [ ] 查看名片在新視窗開啟
- [ ] 完成按鈕關閉 Modal
- [ ] ESC 鍵可關閉 Modal
- [ ] 點擊背景可關閉 Modal
- [ ] Modal 有淡入動畫
- [ ] 響應式設計（手機/桌面）
- [ ] 錯誤訊息不再顯示 [object Object]

## Code Size Estimate
- HTML: ~60 行
- JavaScript: ~100 行
- CSS: ~30 行
- Total: ~190 行

## Implementation Time
約 1 小時
