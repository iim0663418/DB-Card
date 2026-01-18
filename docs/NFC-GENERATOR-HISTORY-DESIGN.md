# NFC Generator - History Feature Design

**Version**: 1.0.0  
**Date**: 2026-01-18  
**Status**: DESIGN SPECIFICATION

---

## 1. 功能概述

### 1.1 目標
在 NFC 生成器頁面顯示最近創建的名片記錄，方便管理員快速查看和複製 URL。

### 1.2 資料來源
- **前端 localStorage**（後端無列表 API）
- 最多儲存 10 筆記錄
- 按創建時間倒序排列

---

## 2. UI 設計規格

### 2.1 位置
放置在頁面底部，表單區下方。

### 2.2 視覺設計

```
┌─────────────────────────────────────────────────┐
│  RECENT ISSUANCE RECORDS                        │
│  最近簽發記錄                                    │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐  │
│  │ 1. 王小明                                  │  │
│  │    550e8400-e29b-41d4-a716-446655440000   │  │
│  │    2026-01-18 15:30:45                    │  │
│  │    [複製 URL] [查看名片]                   │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ 2. John Smith                             │  │
│  │    ...                                    │  │
│  └───────────────────────────────────────────┘  │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

### 2.3 樣式規格

**容器**:
```css
.history-section {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 24px;
  padding: 32px;
  margin-top: 32px;
}
```

**標題**:
```css
.history-title {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 24px;
}
```

**記錄卡片**:
```css
.history-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.history-item:hover {
  background: #ffffff;
  border-color: #6868ac;
  box-shadow: 0 4px 12px rgba(104, 104, 172, 0.1);
}
```

---

## 3. 資料結構

### 3.1 localStorage Schema

```typescript
interface HistoryRecord {
  uuid: string;           // 名片 UUID
  name: string;           // 姓名（中文優先）
  createdAt: string;      // ISO 8601 時間戳
}

// localStorage key: 'card-history'
// 格式: HistoryRecord[]
// 最大長度: 10
```

### 3.2 顯示資料

```typescript
interface DisplayRecord extends HistoryRecord {
  url: string;            // 完整名片 URL
  formattedTime: string;  // 格式化時間（YYYY-MM-DD HH:mm:ss）
  index: number;          // 序號（1-10）
}
```

---

## 4. 功能規格

### 4.1 顯示邏輯

**初始載入**:
```javascript
function loadHistory() {
  const history = getHistory(); // 從 localStorage 讀取
  
  if (history.length === 0) {
    // 顯示空狀態
    showEmptyState();
    return;
  }
  
  // 渲染記錄列表
  renderHistoryList(history);
}
```

**空狀態**:
```html
<div class="empty-state">
  <i data-lucide="inbox" class="w-12 h-12 text-slate-300"></i>
  <p class="text-slate-400 text-sm mt-4">尚無簽發記錄</p>
</div>
```

### 4.2 複製 URL

```javascript
function copyCardUrl(uuid) {
  const url = `${window.location.origin}/card-display?uuid=${uuid}`;
  
  navigator.clipboard.writeText(url).then(() => {
    showToast('URL 已複製');
  }).catch(() => {
    // Fallback
    alert('URL 已複製');
  });
}
```

### 4.3 查看名片

```javascript
function viewCard(uuid) {
  const url = `${window.location.origin}/card-display?uuid=${uuid}`;
  window.open(url, '_blank');
}
```

### 4.4 自動更新

創建名片成功後自動刷新歷史記錄：

```javascript
// 在 submit-btn onclick 中
const result = await createCard(formData);
saveToHistory(result.uuid, formData.name_zh || formData.name_en);

// 刷新歷史記錄顯示
loadHistory();
```

---

## 5. HTML 結構

```html
<!-- 歷史記錄區塊 -->
<section id="history-section" class="app-surface p-8 mt-8">
  <div class="flex justify-between items-center mb-6">
    <div>
      <h2 class="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
        Recent Issuance Records
      </h2>
      <p class="text-xs text-slate-500 mt-1">最近簽發記錄（最多 10 筆）</p>
    </div>
    <button id="clear-history" class="text-xs text-red-500 hover:text-red-700">
      清空記錄
    </button>
  </div>
  
  <div id="history-list" class="space-y-3">
    <!-- 動態生成 -->
  </div>
  
  <!-- 空狀態 -->
  <div id="empty-state" class="hidden text-center py-12">
    <i data-lucide="inbox" class="w-12 h-12 text-slate-300 mx-auto"></i>
    <p class="text-slate-400 text-sm mt-4">尚無簽發記錄</p>
  </div>
</section>
```

### 5.1 記錄項目模板

```html
<div class="history-item">
  <div class="flex justify-between items-start">
    <div class="flex-1">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs font-black text-slate-400">#1</span>
        <h3 class="text-sm font-bold text-slate-900">王小明</h3>
      </div>
      <p class="text-xs font-mono text-slate-500 mb-1">
        550e8400-e29b-41d4-a716-446655440000
      </p>
      <p class="text-[10px] text-slate-400">
        <i data-lucide="clock" class="w-3 h-3 inline"></i>
        2026-01-18 15:30:45
      </p>
    </div>
    <div class="flex gap-2">
      <button class="btn-copy" data-uuid="...">
        <i data-lucide="copy" class="w-4 h-4"></i>
      </button>
      <button class="btn-view" data-uuid="...">
        <i data-lucide="external-link" class="w-4 h-4"></i>
      </button>
    </div>
  </div>
</div>
```

---

## 6. JavaScript 實作

### 6.1 渲染函數

```javascript
function renderHistoryList(history) {
  const container = document.getElementById('history-list');
  const emptyState = document.getElementById('empty-state');
  
  if (history.length === 0) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }
  
  container.classList.remove('hidden');
  emptyState.classList.add('hidden');
  container.innerHTML = '';
  
  history.forEach((record, index) => {
    const item = createHistoryItem(record, index + 1);
    container.appendChild(item);
  });
  
  lucide.createIcons();
}

function createHistoryItem(record, index) {
  const div = document.createElement('div');
  div.className = 'history-item';
  
  const time = new Date(record.createdAt).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  div.innerHTML = `
    <div class="flex justify-between items-start">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-black text-slate-400">#${index}</span>
          <h3 class="text-sm font-bold text-slate-900">${escapeHtml(record.name)}</h3>
        </div>
        <p class="text-xs font-mono text-slate-500 mb-1">${record.uuid}</p>
        <p class="text-[10px] text-slate-400">
          <i data-lucide="clock" class="w-3 h-3 inline"></i>
          ${time}
        </p>
      </div>
      <div class="flex gap-2">
        <button class="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                onclick="copyCardUrl('${record.uuid}')">
          <i data-lucide="copy" class="w-4 h-4"></i>
        </button>
        <button class="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" 
                onclick="viewCard('${record.uuid}')">
          <i data-lucide="external-link" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `;
  
  return div;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### 6.2 工具函數

```javascript
function copyCardUrl(uuid) {
  const url = `${window.location.origin}/card-display?uuid=${uuid}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('URL 已複製到剪貼簿');
  });
}

function viewCard(uuid) {
  const url = `${window.location.origin}/card-display?uuid=${uuid}`;
  window.open(url, '_blank');
}

function clearHistory() {
  if (confirm('確定要清空所有記錄？此操作無法復原。')) {
    localStorage.removeItem('card-history');
    loadHistory();
  }
}

function showToast(message) {
  // 簡單的 toast 提示
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg z-[200]';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 2000);
}
```

### 6.3 初始化

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // ... 現有初始化邏輯 ...
  
  // 載入歷史記錄
  loadHistory();
  
  // 清空按鈕
  document.getElementById('clear-history').onclick = clearHistory;
});
```

---

## 7. 響應式設計

### 7.1 手機版 (<768px)

```css
@media (max-width: 768px) {
  .history-item {
    padding: 16px;
  }
  
  .history-item .flex {
    flex-direction: column;
    gap: 12px;
  }
  
  .history-item .flex > div:last-child {
    align-self: flex-end;
  }
}
```

---

## 8. 安全性考量

### 8.1 XSS 防護
- 使用 `escapeHtml()` 處理使用者輸入的姓名
- 避免使用 `innerHTML` 直接插入未處理的資料

### 8.2 資料驗證
```javascript
function validateHistoryRecord(record) {
  return (
    record &&
    typeof record.uuid === 'string' &&
    typeof record.name === 'string' &&
    typeof record.createdAt === 'string' &&
    /^[a-f0-9-]{36}$/.test(record.uuid)
  );
}
```

---

## 9. 測試需求

### 9.1 功能測試
- [ ] 創建名片後自動顯示在歷史記錄
- [ ] 複製 URL 功能正常
- [ ] 查看名片在新分頁開啟
- [ ] 清空記錄功能正常
- [ ] 空狀態正確顯示
- [ ] 最多顯示 10 筆記錄

### 9.2 UI 測試
- [ ] 響應式設計（手機/平板/桌面）
- [ ] Hover 效果正常
- [ ] 圖示正確顯示
- [ ] 時間格式正確

---

## 10. 實作優先順序

### Phase 1: 基礎功能
1. HTML 結構
2. 基礎樣式
3. 渲染邏輯
4. 複製/查看功能

### Phase 2: 進階功能
1. 清空記錄
2. Toast 提示
3. 空狀態
4. 響應式優化

---

**END OF DESIGN SPECIFICATION**
