# Admin Dashboard API 實作狀態檢查報告

## 已實作的 API ✅

### 1. Health Check
- **端點**: `GET /health`
- **狀態**: ✅ 已實作
- **用途**: Token 驗證、系統健康檢查
- **前端使用**: `verifyToken()`

### 2. 創建名片
- **端點**: `POST /api/admin/cards`
- **狀態**: ✅ 已實作
- **用途**: 創建新的數位名片
- **前端使用**: `handleCreateCard()`
- **Handler**: `workers/src/handlers/admin/cards.ts`

### 3. 刪除名片
- **端點**: `DELETE /api/admin/cards/:uuid`
- **狀態**: ✅ 已實作
- **用途**: 刪除指定名片（軟刪除）
- **前端使用**: `handleDeleteCard(uuid)`
- **Handler**: `workers/src/handlers/admin/cards.ts`

### 4. 撤銷 Session
- **端點**: `POST /api/admin/revoke`
- **狀態**: ✅ 已實作
- **用途**: 撤銷指定名片的所有 Session
- **前端使用**: `handleRevokeCard(uuid)`
- **Handler**: `workers/src/handlers/admin/revoke.ts`
- **Body**: `{ card_uuid: string }`

### 5. KEK 輪替
- **端點**: `POST /api/admin/kek/rotate`
- **狀態**: ✅ 已實作
- **用途**: 輪替系統主密鑰
- **前端使用**: 系統工具 Tab（尚未實作前端邏輯）
- **Handler**: `workers/src/handlers/admin/kek.ts`

### 6. NFC Tap
- **端點**: `POST /api/nfc/tap`
- **狀態**: ✅ 已實作
- **用途**: NFC 碰卡時創建 ReadSession
- **Handler**: `workers/src/handlers/tap.ts`

### 7. 讀取名片
- **端點**: `GET /api/read?uuid=xxx&session=xxx`
- **狀態**: ✅ 已實作
- **用途**: 使用 Session 讀取名片資料
- **Handler**: `workers/src/handlers/read.ts`

---

## 缺少的 API（使用 Mock 資料）❌

### 1. 列出所有名片
- **端點**: `GET /api/admin/cards`
- **狀態**: ❌ **未實作**
- **當前狀態**: 使用 `MOCK_CARDS` 陣列
- **前端使用**: `loadCards()`
- **需求**: 
  - 列出所有名片（包含 active 和 suspended）
  - 支援分頁、篩選、搜尋
  - 回傳格式：
    ```json
    {
      "success": true,
      "data": {
        "cards": [
          {
            "uuid": "...",
            "card_type": "personal",
            "status": "active",
            "data": { "name": {...}, "title": {...}, ... },
            "created_at": "2026-01-18T...",
            "updated_at": "2026-01-18T..."
          }
        ],
        "total": 100,
        "page": 1,
        "per_page": 20
      }
    }
    ```

### 2. 取得單一名片
- **端點**: `GET /api/admin/cards/:uuid`
- **狀態**: ❌ **未實作**
- **當前狀態**: 編輯功能顯示警告訊息
- **前端使用**: `editCard(uuid)`
- **需求**:
  - 取得指定 UUID 的完整名片資料
  - 用於編輯表單預填
  - 回傳格式：
    ```json
    {
      "success": true,
      "data": {
        "uuid": "...",
        "card_type": "personal",
        "status": "active",
        "data": {
          "name": { "zh": "...", "en": "..." },
          "title": { "zh": "...", "en": "..." },
          "email": "...",
          "phone": "...",
          "department": "...",
          "mobile": "...",
          "avatar_url": "...",
          "greetings": { "zh": "...", "en": "..." },
          "address": { "zh": "...", "en": "..." },
          "socialLinks": { ... }
        },
        "created_at": "...",
        "updated_at": "..."
      }
    }
    ```

### 3. 更新名片
- **端點**: `PUT /api/admin/cards/:uuid`
- **狀態**: ✅ 已實作（但前端未使用）
- **當前狀態**: 編輯功能需要先實作 GET API
- **前端使用**: 尚未實作
- **Handler**: `workers/src/handlers/admin/cards.ts`

---

## Mock 資料位置

### admin-dashboard.html
```javascript
const MOCK_CARDS = [
    { 
        uuid: "550e8400-e29b-41d4-a716-446655440000", 
        card_type: "personal", 
        status: "active", 
        data: { 
            name: { zh: "王小明", en: "John Smith" }, 
            title: { zh: "數位策略司 司長", en: "Director General" }, 
            email: "john@example.com" 
        }, 
        ts: "2026-01-18" 
    },
    { 
        uuid: "660e8400-e29b-41d4-a716-446655440001", 
        card_type: "event_booth", 
        status: "active", 
        data: { 
            name: { zh: "李小華", en: "Jane Lee" }, 
            title: { zh: "數位政府司 科長", en: "Section Chief" }, 
            email: "jane@example.com" 
        }, 
        ts: "2026-01-17" 
    }
];
```

---

## Phase 2 實作優先順序

### 高優先級（必須實作）
1. **GET /api/admin/cards** - 列出所有名片
   - 替換 `MOCK_CARDS`
   - 實作分頁功能
   - 實作搜尋功能

2. **GET /api/admin/cards/:uuid** - 取得單一名片
   - 啟用編輯功能
   - 實作表單預填邏輯

### 中優先級（增強功能）
3. **編輯名片前端邏輯**
   - 實作 `editCard(uuid)` 函數
   - 載入名片資料到表單
   - 切換到創建 Tab 並預填資料
   - 提交時使用 PUT 而非 POST

4. **全局撤銷功能**
   - 實作 `handleRevokeAll()` 函數
   - 可能需要新的 API 端點或使用現有 revoke API

5. **KEK 輪替前端邏輯**
   - 實作 `handleKekRotate()` 函數
   - 呼叫 `POST /api/admin/kek/rotate`

### 低優先級（優化功能）
6. **搜尋與篩選**
   - 名片列表搜尋框
   - 按 card_type 篩選
   - 按 status 篩選

7. **分頁功能**
   - 實作分頁 UI
   - 處理大量名片資料

---

## 總結

### 已實作 API: 7 個 ✅
- Health Check
- 創建名片
- 更新名片（後端已實作，前端未使用）
- 刪除名片
- 撤銷 Session
- KEK 輪替（後端已實作，前端未完整整合）
- NFC Tap
- 讀取名片

### 缺少 API: 2 個 ❌
- **GET /api/admin/cards** - 列出所有名片（使用 Mock）
- **GET /api/admin/cards/:uuid** - 取得單一名片（編輯功能受阻）

### 前端功能狀態
- ✅ Token 驗證
- ✅ 創建名片（完整實作）
- ✅ 刪除名片（完整實作）
- ✅ 撤銷 Session（完整實作）
- ⚠️ 列出名片（使用 Mock 資料）
- ❌ 編輯名片（需要 GET API）
- ⚠️ 全局撤銷（顯示警告訊息）
- ⚠️ KEK 輪替（顯示警告訊息）

### Phase 2 最小可行實作
1. 實作 `GET /api/admin/cards` 後端
2. 實作 `GET /api/admin/cards/:uuid` 後端
3. 更新前端 `loadCards()` 使用真實 API
4. 實作前端 `editCard()` 邏輯
