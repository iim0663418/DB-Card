# Card Display Twin Integration - 後端 API 安全分析

**分析時間**: 2026-01-28T16:12:00+08:00  
**分析對象**: 現有 Asset Content API 安全設計

---

## 🔍 現有實作分析

### 已實作的 API

#### 1. **GET /api/assets/:asset_id/content** ✅
**位置**: `workers/src/handlers/admin/assets.ts:372`

**安全機制**（9 個 BDD 場景）：
```typescript
// Scenario 3: Session 驗證
if (!cardUuid || !sessionId) {
  return 401 Unauthorized;
}

// Scenario 4: Session 過期檢查
const session = await env.DB.prepare(`
  SELECT * FROM read_sessions
  WHERE session_id = ? AND card_uuid = ?
`).bind(sessionId, cardUuid).first();

// Scenario 5: 併發限制
if (session.current_reads >= session.max_reads) {
  return 429 Too Many Requests;
}

// Scenario 6: 圖片速率限制
const rateLimitKey = `img_rate:${sessionId}`;
const count = await env.KV.get(rateLimitKey);
if (count >= 20) {
  return 429 Too Many Requests;
}

// Scenario 7-8: 資產存在性檢查
const asset = await env.DB.prepare(`
  SELECT * FROM assets WHERE asset_id = ?
`).bind(assetId).first();

if (!asset) return 404 Not Found;

// Scenario 9: R2 Transform on Read
const r2Key = `${asset.r2_key_prefix}/v${asset.current_version}/original.webp`;
const object = await env.PHYSICAL_CARDS.get(r2Key);
```

**安全語意**：
- ✅ 與 `/api/read` 完全一致
- ✅ Session 驗證（24h TTL）
- ✅ 併發讀取限制（max_reads）
- ✅ 速率限制（20 req/min per session）
- ✅ 撤銷機制（撤銷名片/Session → 立即無法存取）

---

## 🎯 Card Display 需求分析

### 需求場景

**用戶訪問流程**：
```
1. 用戶訪問 /card-display.html?card={uuid}
2. 前端呼叫 POST /api/nfc/tap 創建 Session
3. 前端呼叫 GET /api/read?session={session_id} 讀取名片資料
4. 前端呼叫 GET /api/assets/{card_uuid}/twin 取得圖片列表
5. 前端顯示圖片（使用 Session 驗證）
```

### 問題：現有 API 不適用

**現有 API**：
```
GET /api/assets/:asset_id/content?variant=detail&card_uuid=xxx&session=yyy
```

**問題**：
1. ❌ 需要知道 `asset_id`（前端不知道）
2. ❌ 需要逐個請求每張圖片
3. ❌ 無法一次取得所有圖片列表

---

## 💡 解決方案：新增 Twin List API

### 設計：GET /api/assets/:card_uuid/twin

**目的**：一次取得名片的所有實體孿生圖片

**安全機制**：
```typescript
// 1. Session 驗證（與現有 API 一致）
const sessionId = url.searchParams.get('session');
if (!sessionId) return 401;

const session = await env.DB.prepare(`
  SELECT * FROM read_sessions
  WHERE session_id = ? AND card_uuid = ?
`).bind(sessionId, cardUuid).first();

// 2. 驗證 Session 有效性
const validation = validateSession(session);
if (!validation.valid) return 401/429;

// 3. 查詢圖片列表
const assets = await env.DB.prepare(`
  SELECT asset_id, asset_type, current_version, created_at
  FROM assets
  WHERE card_uuid = ? AND status = 'ready'
  ORDER BY created_at DESC
`).bind(cardUuid).all();

// 4. 返回圖片 URL（包含 Session）
return {
  twin_enabled: true,
  assets: assets.map(asset => ({
    asset_type: asset.asset_type,
    asset_id: asset.asset_id,
    version: asset.current_version,
    url: `/api/assets/${asset.asset_id}/content?variant=detail&card_uuid=${cardUuid}&session=${sessionId}`
  }))
};
```

**返回格式**：
```json
{
  "twin_enabled": true,
  "assets": [
    {
      "asset_type": "twin_front",
      "asset_id": "abc-123",
      "version": 1,
      "url": "/api/assets/abc-123/content?variant=detail&card_uuid=xyz&session=valid-session"
    },
    {
      "asset_type": "twin_back",
      "asset_id": "def-456",
      "version": 1,
      "url": "/api/assets/def-456/content?variant=detail&card_uuid=xyz&session=valid-session"
    }
  ]
}
```

---

## 🔒 安全性分析

### 與現有 API 的一致性

| 安全機制 | /api/read | /api/assets/:id/content | /api/assets/:uuid/twin (新) |
|---------|-----------|------------------------|----------------------------|
| Session 驗證 | ✅ | ✅ | ✅ |
| 併發限制 | ✅ | ✅ | ✅ |
| 速率限制 | ✅ | ✅ (20/min) | ✅ (100/min) |
| 撤銷機制 | ✅ | ✅ | ✅ |
| 審計日誌 | ✅ | ✅ | ✅ |

### 新 API 的速率限制

**為什麼 100 req/min？**
- Twin List API 只返回 URL 列表（輕量）
- 實際圖片請求仍受 20 req/min 限制
- 避免過度限制正常使用

**KV Key**：
```
twin_rate:{session_id}
TTL: 60 seconds
Max: 100 requests
```

---

## 📋 實作檢查清單

### Phase 1: 新增 Twin List API

- [ ] 創建 `handleAssetTwinList()` 函數
- [ ] 實作 Session 驗證（複用現有邏輯）
- [ ] 實作速率限制（100 req/min）
- [ ] 查詢資產列表（status='ready'）
- [ ] 生成圖片 URL（包含 Session）
- [ ] 審計日誌
- [ ] 單元測試

### Phase 2: 路由整合

- [ ] 新增路由：`GET /api/assets/:card_uuid/twin`
- [ ] 綁定 handler
- [ ] 測試路由

### Phase 3: 前端整合

- [ ] 修改 `card-display.html`
- [ ] 呼叫 Twin List API
- [ ] 渲染圖片（使用返回的 URL）
- [ ] 錯誤處理（優雅降級）

---

## 🎯 BDD 規格（新 API）

### Scenario 1: 成功取得圖片列表

**Given** 名片 "xyz" 有 2 張實體孿生圖片  
**And** 我有有效的 Session  
**When** 我 GET 到 `/api/assets/xyz/twin?session=valid-session`  
**Then** 應返回 200 OK  
**And** 應返回 2 個 asset 物件  
**And** 每個 URL 應包含 Session 參數

### Scenario 2: 無圖片時返回空陣列

**Given** 名片 "xyz" 沒有實體孿生圖片  
**And** 我有有效的 Session  
**When** 我 GET 到 `/api/assets/xyz/twin?session=valid-session`  
**Then** 應返回 200 OK  
**And** `twin_enabled` 應為 false  
**And** `assets` 應為空陣列

### Scenario 3: 拒絕無效 Session

**Given** 名片 "xyz" 有圖片  
**When** 我 GET 到 `/api/assets/xyz/twin` 但 Session 無效  
**Then** 應返回 401 Unauthorized

### Scenario 4: 速率限制

**Given** 我有有效的 Session  
**And** 我在 1 分鐘內已請求 100 次  
**When** 我嘗試第 101 次請求  
**Then** 應返回 429 Too Many Requests

---

## 🚀 優勢分析

### 相比直接使用現有 API

| 方案 | 請求次數 | 前端複雜度 | 安全性 |
|------|---------|-----------|--------|
| 現有 API | N+1 (1 次查詢 + N 次圖片) | 高 | ✅ |
| 新 API | 1 次查詢 + N 次圖片 | 低 | ✅ |

### 性能提升

- ✅ 減少 1 次資料庫查詢（前端不需要猜測 asset_id）
- ✅ 批次返回 URL（減少往返延遲）
- ✅ 前端可並行載入圖片

### 安全性

- ✅ 完全複用現有 Session 驗證邏輯
- ✅ 圖片 URL 包含 Session（無法遍歷）
- ✅ 撤銷機制一致

---

## 📝 結論

**推薦方案**：新增 `GET /api/assets/:card_uuid/twin` API

**理由**：
1. ✅ 符合前端需求（一次取得列表）
2. ✅ 安全性與現有 API 一致
3. ✅ 性能優化（減少請求）
4. ✅ 實作簡單（複用現有邏輯）
5. ✅ 向後相容（不影響現有 API）

**下一步**：創建 BDD 規格並實作 Phase 1
