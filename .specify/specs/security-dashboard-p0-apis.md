# BDD Specification: Security Dashboard P0 APIs

## Feature: Security Statistics API
**Endpoint**: `GET /api/admin/security/stats`  
**Priority**: P0  
**Purpose**: 提供 24 小時安全統計數據

### Scenario 1: 成功取得統計數據
- **Given**: 
  - Admin 已認證 (有效的 HttpOnly Cookie)
  - security_events 表有過去 24 小時的事件資料
- **When**: 
  - 發送 GET /api/admin/security/stats
- **Then**: 
  - 回傳 HTTP 200
  - 回傳 JSON 包含：
    ```json
    {
      "last24h": {
        "total_events": number,
        "blocked_attempts": number,
        "suspicious_ips": number,
        "rate_limit_hits": number
      },
      "top_ips": [
        {
          "ip": "string (anonymized)",
          "event_count": number,
          "last_seen": "ISO8601 timestamp"
        }
      ],
      "last_event": {
        "event_type": "string",
        "ip": "string (anonymized)",
        "created_at": "ISO8601 timestamp"
      }
    }
    ```

### Scenario 2: 未認證訪問
- **Given**: 
  - 請求沒有有效的 Admin Cookie
- **When**: 
  - 發送 GET /api/admin/security/stats
- **Then**: 
  - 回傳 HTTP 401
  - 回傳統一錯誤格式

### Scenario 3: 無事件資料
- **Given**: 
  - Admin 已認證
  - security_events 表為空
- **When**: 
  - 發送 GET /api/admin/security/stats
- **Then**: 
  - 回傳 HTTP 200
  - 所有計數為 0
  - top_ips 為空陣列
  - last_event 為 null

---

## Feature: Security Events List API
**Endpoint**: `GET /api/admin/security/events`  
**Priority**: P0  
**Purpose**: 提供可過濾、分頁的安全事件列表

### Scenario 1: 成功取得事件列表（無過濾）
- **Given**: 
  - Admin 已認證
  - security_events 表有 50 筆事件
- **When**: 
  - 發送 GET /api/admin/security/events
- **Then**: 
  - 回傳 HTTP 200
  - 回傳 JSON 包含：
    ```json
    {
      "events": [
        {
          "id": number,
          "event_type": "string",
          "ip": "string (anonymized)",
          "user_agent": "string",
          "endpoint": "string",
          "details": "string (JSON)",
          "created_at": "ISO8601 timestamp"
        }
      ],
      "pagination": {
        "total": number,
        "page": number,
        "limit": number,
        "has_more": boolean
      }
    }
    ```
  - 預設回傳最新 50 筆

### Scenario 2: 過濾特定事件類型
- **Given**: 
  - Admin 已認證
  - security_events 表有多種事件類型
- **When**: 
  - 發送 GET /api/admin/security/events?event_type=rate_limit_exceeded
- **Then**: 
  - 回傳 HTTP 200
  - events 陣列只包含 event_type = "rate_limit_exceeded" 的事件

### Scenario 3: 分頁查詢
- **Given**: 
  - Admin 已認證
  - security_events 表有 100 筆事件
- **When**: 
  - 發送 GET /api/admin/security/events?page=2&limit=20
- **Then**: 
  - 回傳 HTTP 200
  - events 陣列包含第 21-40 筆事件
  - pagination.page = 2
  - pagination.limit = 20
  - pagination.has_more = true

### Scenario 4: 時間範圍過濾
- **Given**: 
  - Admin 已認證
  - security_events 表有不同時間的事件
- **When**: 
  - 發送 GET /api/admin/security/events?start_time=2026-01-18T00:00:00Z&end_time=2026-01-18T23:59:59Z
- **Then**: 
  - 回傳 HTTP 200
  - events 陣列只包含指定時間範圍內的事件

### Scenario 5: 未認證訪問
- **Given**: 
  - 請求沒有有效的 Admin Cookie
- **When**: 
  - 發送 GET /api/admin/security/events
- **Then**: 
  - 回傳 HTTP 401
  - 回傳統一錯誤格式

---

## Technical Requirements

### Database Query
- 使用 `security_events` 表（已存在於 Phase 3）
- IP 匿名化：保留前 3 段（例如：192.168.1.xxx）
- 時間排序：created_at DESC（最新優先）
- 索引優化：使用 idx_security_events_created_at

### Authentication
- 使用現有 middleware/auth.ts 的 requireAdmin
- 支援 HttpOnly Cookie 認證

### Rate Limiting
- 繼承現有速率限制機制（60 req/min）

### Response Format
- 統一使用 utils/response.ts 的 jsonResponse
- 錯誤使用 errorResponse

### Performance
- stats API: 快取 30 秒
- events API: 無快取（即時資料）
- 單次查詢最多 50 筆（可調整 limit）

---

## Implementation Files

### New File
- `workers/src/handlers/admin/security.ts`
  - handleSecurityStats()
  - handleSecurityEvents()

### Modified Files
- `workers/src/index.ts`
  - 新增路由：GET /api/admin/security/stats
  - 新增路由：GET /api/admin/security/events

---

## Acceptance Criteria
- [ ] 所有 9 個 Scenario 通過測試
- [ ] IP 匿名化正確實作
- [ ] 分頁邏輯正確
- [ ] 過濾參數正確解析
- [ ] 認證機制正常運作
- [ ] 錯誤處理符合統一格式
- [ ] 本地測試通過
- [ ] 部署到 staging 成功
