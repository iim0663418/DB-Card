# BDD Spec: Admin Dashboard 查看名片功能修復

## 問題分析
當前「查看」按鈕直接打開 `card-display.html?uuid=xxx`，但該頁面需要 `session` 參數（ReadSession 機制）。Admin 沒有 session，導致 403 錯誤。

## Scenario: Admin 查看名片時自動獲取 Session

### Given: Admin 點擊「查看」按鈕
### When: 系統需要顯示名片
### Then: 應先呼叫 tap API 獲取 session，然後打開名片頁面

**實作要求：**

### 修改 admin-dashboard.html

```javascript
// 替換原本的 onclick="window.open('./card-display?uuid=${c.uuid}')"
// 改為呼叫新函數

async function viewCard(uuid) {
    try {
        // 先 tap 獲取 session
        const response = await fetch(`${API_BASE}/api/nfc/tap`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ card_uuid: uuid })
        });
        
        if (!response.ok) {
            throw new Error('無法獲取查看授權');
        }
        
        const result = await response.json();
        const sessionId = result.data.session_id;
        
        // 打開名片頁面（帶 session）
        window.open(`./card-display?uuid=${uuid}&session=${sessionId}`, '_blank');
        
    } catch (error) {
        showNotification('查看失敗: ' + error.message, 'error');
    }
}
```

### 更新按鈕 HTML

```html
<button onclick="viewCard('${c.uuid}')" class="...">查看</button>
```

## 測試檢查點
- [ ] 點擊「查看」按鈕
- [ ] 自動呼叫 POST /api/nfc/tap
- [ ] 獲取 session_id
- [ ] 打開新分頁顯示名片
- [ ] 名片正確載入（無 403 錯誤）
- [ ] 錯誤處理正確（顯示通知）
