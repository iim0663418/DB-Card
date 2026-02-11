# P0-2 Inline Handlers 重構清單

## 34 個 inline handlers 對應表

| Line | 原始 onclick | 新 data-action | 參數 |
|:---|:---|:---|:---|
| 267 | `onclick="retryLoadCards()"` | `data-action="retryLoadCards"` | - |
| 300 | `onclick="loginWithPasskey()"` | `data-action="loginWithPasskey"` | - |
| 316 | `onclick="switchTab('list')"` | `data-action="switchTab" data-tab="list"` | tab |
| 319 | `onclick="switchTab('create')"` | `data-action="switchTab" data-tab="create"` | tab |
| 322 | `onclick="switchTab('twin')"` | `data-action="switchTab" data-tab="twin"` | tab |
| 325 | `onclick="switchTab('security')"` | `data-action="switchTab" data-tab="security"` | tab |
| 328 | `onclick="switchTab('tools')"` | `data-action="switchTab" data-tab="tools"` | tab |
| 331 | `onclick="registerPasskey()"` | `data-action="registerPasskey"` | - |
| 334 | `onclick="handleLogout()"` | `data-action="handleLogout"` | - |
| 356 | `onclick="loadCards()"` | `data-action="loadCards"` | - |
| 588 | `onclick="cancelEdit()"` | `data-action="cancelEdit"` | - |
| 713 | `onclick="clearPreview()"` | `data-action="clearPreview"` | - |
| 721 | `onclick="uploadAsset()"` | `data-action="uploadAsset"` | - |
| 724 | `onclick="clearPreview()"` | `data-action="clearPreview"` | - |
| 922 | `onclick="exportSecurityEvents()"` | `data-action="exportSecurityEvents"` | - |
| 945 | `onclick="loadSecurityEvents(currentEventPage - 1)"` | `data-action="loadSecurityEvents" data-page="-1"` | page |
| 947 | `onclick="loadSecurityEvents(currentEventPage + 1)"` | `data-action="loadSecurityEvents" data-page="+1"` | page |
| 985 | `onclick="showRotationGuide()"` | `data-action="showRotationGuide"` | - |
| 1016 | `onclick="checkCDNHealth()"` | `data-action="checkCDNHealth"` | - |
| 1043 | `onclick="closeModal()"` | `data-action="closeModal"` | - |
| 1061 | `onclick="closeRotationGuide()"` | `data-action="closeRotationGuide"` | - |
| 1086 | `onclick="navigator.clipboard.writeText(...)"` | `data-action="copyToClipboard" data-text="..."` | text |
| 1105 | `onclick="navigator.clipboard.writeText(...)"` | `data-action="copyToClipboard" data-text="..."` | text |
| 1122 | `onclick="navigator.clipboard.writeText(...)"` | `data-action="copyToClipboard" data-text="..."` | text |
| 1141 | `onclick="navigator.clipboard.writeText(...)"` | `data-action="copyToClipboard" data-text="..."` | text |
| 1159 | `onclick="navigator.clipboard.writeText(...)"` | `data-action="copyToClipboard" data-text="..."` | text |
| 1179 | `onclick="closeRotationGuide()"` | `data-action="closeRotationGuide"` | - |
| 1189 | `onclick="closeIPDetailModal()"` | `data-action="closeIPDetailModal"` | - |
| 1221 | `onclick="handleUnblockIP()"` | `data-action="handleUnblockIP"` | - |
| 3568 | `onclick="loadIPDetail('${event.ip}')"` | `data-action="loadIPDetail" data-ip="${event.ip}"` | ip |

## 事件委派處理器（新增到 <script> 末尾）

```javascript
// Event Delegation for all click actions
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  
  const action = btn.dataset.action;
  
  // Action handlers mapping
  const handlers = {
    'retryLoadCards': retryLoadCards,
    'loginWithPasskey': loginWithPasskey,
    'switchTab': () => switchTab(btn.dataset.tab),
    'registerPasskey': registerPasskey,
    'handleLogout': handleLogout,
    'loadCards': loadCards,
    'cancelEdit': cancelEdit,
    'clearPreview': clearPreview,
    'uploadAsset': uploadAsset,
    'exportSecurityEvents': exportSecurityEvents,
    'loadSecurityEvents': () => {
      const page = btn.dataset.page;
      if (page === '+1') loadSecurityEvents(currentEventPage + 1);
      else if (page === '-1') loadSecurityEvents(currentEventPage - 1);
    },
    'showRotationGuide': showRotationGuide,
    'checkCDNHealth': checkCDNHealth,
    'closeModal': closeModal,
    'closeRotationGuide': closeRotationGuide,
    'copyToClipboard': () => navigator.clipboard.writeText(btn.dataset.text),
    'closeIPDetailModal': closeIPDetailModal,
    'handleUnblockIP': handleUnblockIP,
    'loadIPDetail': () => loadIPDetail(btn.dataset.ip)
  };
  
  if (handlers[action]) {
    e.preventDefault();
    handlers[action](e, btn);
  }
});
```
