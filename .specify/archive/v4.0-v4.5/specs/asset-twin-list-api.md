# BDD Spec: Asset Twin List API

## Feature: GET /api/assets/:card_uuid/twin

作為 Card Display 頁面使用者  
我需要一次取得名片的所有實體孿生圖片  
以便顯示實體名片的正反面

---

## Scenario 1: 成功取得圖片列表（有圖片）

**Given** 名片 "xyz-123" 有 2 張實體孿生圖片（twin_front, twin_back）  
**And** 我有有效的 Session "valid-session"  
**When** 我 GET 到 `/api/assets/xyz-123/twin?session=valid-session`  
**Then** 應返回 200 OK  
**And** `twin_enabled` 應為 true  
**And** `assets` 應包含 2 個物件  
**And** 每個物件應包含 `asset_type`, `asset_id`, `version`, `url`  
**And** URL 應包含 Session 參數  
**And** URL 格式應為 `/api/assets/{asset_id}/content?variant=detail&card_uuid=xyz-123&session=valid-session`

---

## Scenario 2: 無圖片時返回空陣列

**Given** 名片 "xyz-123" 沒有實體孿生圖片  
**And** 我有有效的 Session  
**When** 我 GET 到 `/api/assets/xyz-123/twin?session=valid-session`  
**Then** 應返回 200 OK  
**And** `twin_enabled` 應為 false  
**And** `assets` 應為空陣列 []

---

## Scenario 3: 拒絕缺少 Session

**Given** 名片 "xyz-123" 有圖片  
**When** 我 GET 到 `/api/assets/xyz-123/twin` 但沒有 Session 參數  
**Then** 應返回 401 Unauthorized  
**And** 錯誤訊息為 "Unauthorized"

---

## Scenario 4: 拒絕無效 Session

**Given** 名片 "xyz-123" 有圖片  
**When** 我 GET 到 `/api/assets/xyz-123/twin?session=invalid-session`  
**Then** 應返回 401 Unauthorized  
**And** 錯誤訊息為 "Session not found"

---

## Scenario 5: 拒絕過期 Session

**Given** 名片 "xyz-123" 有圖片  
**And** Session 已過期（> 24h）  
**When** 我嘗試取得圖片列表  
**Then** 應返回 401 Unauthorized  
**And** 錯誤訊息為 "Session expired"

---

## Scenario 6: 拒絕超過併發限制

**Given** 名片 "xyz-123" 有圖片  
**And** Session 已達到 max_reads 限制  
**When** 我嘗試取得圖片列表  
**Then** 應返回 429 Too Many Requests  
**And** 錯誤訊息為 "Concurrent read limit exceeded"

---

## Scenario 7: 速率限制（100 req/min per session）

**Given** 我有有效的 Session  
**And** 我在 1 分鐘內已請求 100 次  
**When** 我嘗試第 101 次請求  
**Then** 應返回 429 Too Many Requests  
**And** 錯誤訊息為 "Twin list rate limit exceeded"  
**And** 應記錄 rate limit trigger

---

## Scenario 8: 只返回 ready 狀態的圖片

**Given** 名片 "xyz-123" 有 3 張圖片  
**And** 1 張狀態為 "ready"  
**And** 1 張狀態為 "stale"  
**And** 1 張狀態為 "error"  
**When** 我取得圖片列表  
**Then** 應只返回 1 張圖片（status='ready'）

---

## Scenario 9: 按創建時間降序排列

**Given** 名片 "xyz-123" 有 3 張圖片  
**And** 圖片 A 創建於 2026-01-28 10:00  
**And** 圖片 B 創建於 2026-01-28 12:00  
**And** 圖片 C 創建於 2026-01-28 11:00  
**When** 我取得圖片列表  
**Then** 應按順序返回：B, C, A（最新的在前）

---

## Scenario 10: 審計日誌記錄

**Given** 我有有效的 Session  
**When** 我成功取得圖片列表  
**Then** 應記錄 audit log  
**And** event_type 應為 "twin_list_read"  
**And** 應記錄 card_uuid, session_id, asset_count

---

## Acceptance Criteria

### Session 驗證
- [x] 驗證 Session 參數存在
- [x] 驗證 Session 存在於資料庫
- [x] 驗證 card_uuid 匹配
- [x] 驗證 Session 未過期（< 24h）
- [x] 驗證併發讀取限制（current_reads < max_reads）

### 速率限制
- [x] 每 Session 每分鐘最多 100 次請求
- [x] 使用 KV 儲存計數器
- [x] KV Key: `twin_rate:{session_id}`
- [x] TTL: 60 秒
- [x] 記錄 rate limit trigger

### 資料查詢
- [x] 查詢 assets 表
- [x] 過濾條件：card_uuid = ? AND status = 'ready'
- [x] 排序：created_at DESC
- [x] 返回欄位：asset_id, asset_type, current_version, created_at

### URL 生成
- [x] 格式：`/api/assets/{asset_id}/content?variant=detail&card_uuid={card_uuid}&session={session_id}`
- [x] 包含所有必要參數
- [x] URL encode 處理

### 審計日誌
- [x] event_type: "twin_list_read"
- [x] 記錄 card_uuid
- [x] 記錄 session_id
- [x] 記錄 asset_count
- [x] 記錄 IP（匿名化）

### 錯誤處理
- [x] 401: 缺少/無效/過期 Session
- [x] 429: 速率限制/併發限制
- [x] 500: 資料庫錯誤

### 性能
- [x] 單次查詢取得所有圖片
- [x] 不查詢 R2（只返回 URL）
- [x] 響應時間 < 200ms

---

## Technical Notes

### Rate Limiting Key
```
twin_rate:{session_id}
TTL: 60 seconds
Max: 100 requests
```

### SQL Query
```sql
SELECT asset_id, asset_type, current_version, created_at
FROM assets
WHERE card_uuid = ? AND status = 'ready'
ORDER BY created_at DESC
```

### Response Format
```json
{
  "twin_enabled": true,
  "assets": [
    {
      "asset_type": "twin_front",
      "asset_id": "abc-123",
      "version": 1,
      "url": "/api/assets/abc-123/content?variant=detail&card_uuid=xyz&session=sess"
    }
  ]
}
```

### Security
- 完全複用 `/api/read` 的 Session 驗證邏輯
- 圖片 URL 包含 Session（無法遍歷）
- 撤銷名片/Session → 圖片立即無法存取
