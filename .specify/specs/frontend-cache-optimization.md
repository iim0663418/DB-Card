# BDD Spec: Frontend sessionStorage Cache for readCard()

## Feature: 前端 sessionStorage 快取優化

### Scenario 1: 快取命中 - 返回快取資料
**Given**: sessionStorage 中存在有效的名片快取（5分鐘內）  
**When**: 調用 readCard(uuid, sessionId)  
**Then**: 
- 直接從 sessionStorage 讀取資料
- 不發送 API 請求
- 返回快取的完整響應（包含 data 和 session_info）

### Scenario 2: 快取過期 - 重新請求
**Given**: sessionStorage 中的快取已超過 5 分鐘  
**When**: 調用 readCard(uuid, sessionId)  
**Then**: 
- 發送 API 請求到 /api/read
- 將新響應寫入 sessionStorage
- 返回新的響應資料

### Scenario 3: 無快取 - 首次請求
**Given**: sessionStorage 中沒有對應的快取  
**When**: 調用 readCard(uuid, sessionId)  
**Then**: 
- 發送 API 請求到 /api/read
- 將響應寫入 sessionStorage（含 timestamp）
- 返回響應資料

### Scenario 4: API 錯誤 - 不快取錯誤響應
**Given**: API 返回錯誤（非 200 狀態碼）  
**When**: 調用 readCard(uuid, sessionId)  
**Then**: 
- 不寫入 sessionStorage
- 拋出錯誤（保持原有行為）

## Implementation Requirements

### 修改文件
- `workers/public/js/api.js`

### 修改函數
- `readCard(uuid, sessionId)`

### 快取格式
```javascript
{
  data: {
    success: true,
    data: { /* CardData */ },
    session_info: { /* SessionInfo */ }
  },
  timestamp: 1737385200000
}
```

### 快取 Key
- Format: `card:${uuid}:${sessionId}`

### 快取 TTL
- 5 分鐘 (300000ms)

### 注意事項
1. 僅快取成功響應（HTTP 200）
2. 錯誤響應不快取
3. 保持原有的錯誤處理邏輯
4. 不修改函數簽名和返回值結構
