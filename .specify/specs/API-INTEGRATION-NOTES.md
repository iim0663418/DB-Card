# Admin Dashboard - API Integration Notes

## 🔌 API Endpoints Integration Status

### ✅ Integrated in Phase 1

#### 1. Health Check
```http
GET /health
```

**Purpose**: Token verification and API connectivity test

**Used in**:
- `verifyToken()` function (admin-dashboard.html:371)

**Implementation**:
```javascript
const res = await fetch(`${API_BASE}/health`);
if (res.ok) {
    // Token valid, API reachable
}
```

**Note**: 此端點不需要 Authorization header，用於測試 API 連線狀態。

---

#### 2. Create Card
```http
POST /api/admin/cards
Authorization: Bearer {SETUP_TOKEN}
Content-Type: application/json
```

**Request Body**:
```json
{
  "cardType": "personal" | "event_booth" | "sensitive",
  "cardData": {
    "name": {
      "zh": "王大明",
      "en": "David Wang"
    },
    "email": "david.wang@moda.gov.tw",
    "department": "數位策略司",
    "title": {
      "zh": "司長",
      "en": "Director General"
    },
    "socialLinks": {
      "email": "mailto:david.wang@moda.gov.tw",
      "socialNote": "LinkedIn: david-wang"
    }
  }
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "card_type": "personal",
    "created_at": "2026-01-18T10:30:00Z"
  }
}
```

**Response** (Error):
```json
{
  "error": {
    "message": "Invalid email format",
    "code": "VALIDATION_ERROR"
  }
}
```

**Used in**:
- `handleCreateCard()` function (admin-dashboard.html:449)

**Form Mapping**:
```javascript
{
  name_zh → cardData.name.zh
  name_en → cardData.name.en
  email → cardData.email
  department → cardData.department
  title_zh → cardData.title.zh (optional)
  title_en → cardData.title.en (optional)
  social_note → cardData.socialLinks.socialNote (optional)
  card_type → cardType
}
```

---

#### 3. Delete Card
```http
DELETE /api/admin/cards/{uuid}
Authorization: Bearer {SETUP_TOKEN}
```

**Path Parameters**:
- `uuid`: Card UUID to delete

**Response** (Success):
```json
{
  "success": true,
  "message": "Card deleted successfully"
}
```

**Response** (Error):
```json
{
  "error": {
    "message": "Card not found",
    "code": "NOT_FOUND"
  }
}
```

**Used in**:
- `handleDeleteCard(uuid)` function (admin-dashboard.html:520)

**Flow**:
1. User clicks "刪除" button → `confirmAction('delete', uuid)`
2. Confirmation Modal appears
3. User confirms → `handleDeleteCard(uuid)`
4. API call → Success notification → Refresh list

---

#### 4. Revoke Sessions
```http
POST /api/admin/revoke
Authorization: Bearer {SETUP_TOKEN}
Content-Type: application/json
```

**Request Body**:
```json
{
  "card_uuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response** (Success):
```json
{
  "success": true,
  "sessions_revoked": 5,
  "message": "Sessions revoked successfully"
}
```

**Alternative Response Structure**:
```json
{
  "success": true,
  "data": {
    "sessions_revoked": 5
  }
}
```

**Used in**:
- `handleRevokeCard(uuid)` function (admin-dashboard.html:550)

**Session Count Extraction**:
```javascript
const count = result.sessions_revoked || result.data?.sessions_revoked || 0;
showNotification(`已撤銷 ${count} 個 Session`, 'success');
```

**Note**: 處理兩種可能的 response 結構，確保兼容性。

---

## ❌ Not Yet Integrated (Phase 2)

#### 5. Get Card List
```http
GET /api/admin/cards
Authorization: Bearer {SETUP_TOKEN}
```

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `type`: Filter by card type (optional)
- `search`: Search query (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "card_type": "personal",
        "status": "active",
        "data": {
          "name": { "zh": "王大明", "en": "David Wang" },
          "email": "david.wang@moda.gov.tw"
        },
        "created_at": "2026-01-18T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "pages": 5
    }
  }
}
```

**Will be used in**:
- `loadCards()` function - 目前使用 MOCK_CARDS

---

#### 6. Get Single Card
```http
GET /api/admin/cards/{uuid}
Authorization: Bearer {SETUP_TOKEN}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "card_type": "personal",
    "status": "active",
    "data": {
      "name": { "zh": "王大明", "en": "David Wang" },
      "title": { "zh": "司長", "en": "Director General" },
      "email": "david.wang@moda.gov.tw",
      "department": "數位策略司",
      "socialLinks": {
        "socialNote": "LinkedIn: david-wang"
      }
    },
    "created_at": "2026-01-18T10:30:00Z",
    "updated_at": "2026-01-18T10:30:00Z"
  }
}
```

**Will be used in**:
- `editCard(uuid)` function - 目前顯示警告通知

---

#### 7. Update Card
```http
PUT /api/admin/cards/{uuid}
Authorization: Bearer {SETUP_TOKEN}
Content-Type: application/json
```

**Request Body**: (Same as Create Card)

**Will be used in**:
- Edit form submission (Phase 2)

---

#### 8. Global Revoke All
```http
POST /api/admin/revoke-all
Authorization: Bearer {SETUP_TOKEN}
```

**Response**:
```json
{
  "success": true,
  "sessions_revoked": 150,
  "cards_affected": 45
}
```

**Will be used in**:
- "緊急撤銷" in 系統工具 Tab

---

## 🔐 Authentication

### Token Storage
```javascript
// Save token
localStorage.setItem('setup_token', token);

// Retrieve token
const token = localStorage.getItem('setup_token');

// Use in API calls
headers: {
  'Authorization': `Bearer ${token}`
}
```

### Token Verification Flow
```
User Input → verifyToken()
  ↓
GET /health
  ↓
Success → Save to localStorage → Show UI
  ↓
Fail → Show error notification
```

---

## 📊 Error Handling Strategy

### API Error Response Formats

#### Format 1: Nested Error Object
```json
{
  "error": {
    "message": "Invalid email format",
    "code": "VALIDATION_ERROR"
  }
}
```

#### Format 2: Direct Error
```json
{
  "message": "Invalid email format",
  "error": "VALIDATION_ERROR"
}
```

### Error Extraction Logic
```javascript
if (!response.ok) {
    const error = await response.json();
    throw new Error(
        error.error?.message ||
        error.message ||
        '創建失敗'
    );
}
```

### Error Display
```javascript
try {
    // API call
} catch (error) {
    console.error('Create card error:', error);
    showNotification('創建失敗: ' + error.message, 'error');
}
```

---

## 🌐 CORS & Security

### Expected CORS Headers
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
```

### Security Considerations
1. **Token in LocalStorage**:
   - ⚠️ 受 XSS 攻擊影響
   - ✅ Phase 1 acceptable for admin tool
   - 🔄 Phase 2: Consider HttpOnly cookies

2. **No Token Expiry Check**:
   - 目前依賴 API 回應 401/403
   - Phase 2: Implement token refresh

3. **No Rate Limiting**:
   - 依賴 API 端實作

---

## 🧪 API Mock Data (Development)

### Current Mock Cards
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

**Purpose**:
- 顯示列表 UI
- 測試刪除/撤銷功能
- Phase 2 將被 GET API 替換

---

## 🔄 API Response Processing

### Create Card
```javascript
const result = await response.json();
// result.data contains: { uuid, card_type, created_at }

showNotification('名片創建成功！', 'success');
switchTab('list'); // Auto switch to list
```

### Delete Card
```javascript
// No response body processing needed
showNotification('名片已刪除', 'success');
loadCards(); // Refresh list (currently shows mock data)
```

### Revoke Sessions
```javascript
const result = await response.json();
const count = result.sessions_revoked || result.data?.sessions_revoked || 0;
showNotification(`已撤銷 ${count} 個 Session`, 'success');
```

---

## 📈 Future API Enhancements (Phase 3+)

1. **WebSocket for Real-time Updates**
   - Live card status changes
   - Session revocation notifications

2. **Batch Operations**
   - Multi-select delete
   - Bulk revoke

3. **Analytics API**
   - Card usage statistics
   - Session analytics
   - Access patterns

4. **Audit Log API**
   - Admin action history
   - Card lifecycle tracking

---

## 🛠️ Development Tools

### Testing API with curl

#### Create Card
```bash
curl -X POST https://db-card-api-staging.csw30454.workers.dev/api/admin/cards \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cardType": "personal",
    "cardData": {
      "name": {"zh": "測試", "en": "Test"},
      "email": "test@moda.gov.tw",
      "department": "數位策略司"
    }
  }'
```

#### Delete Card
```bash
curl -X DELETE https://db-card-api-staging.csw30454.workers.dev/api/admin/cards/UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Revoke Sessions
```bash
curl -X POST https://db-card-api-staging.csw30454.workers.dev/api/admin/revoke \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"card_uuid": "UUID"}'
```

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-18
**Relates to**: Admin Dashboard Phase 1
