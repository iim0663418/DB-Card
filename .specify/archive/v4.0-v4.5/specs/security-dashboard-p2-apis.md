# BDD Specification: Security Dashboard P2 APIs

## Feature: IP Detail Analysis API
**Endpoint**: `GET /api/admin/security/ip/:ip`  
**Priority**: P2  
**Purpose**: 提供特定 IP 的詳細分析

### Scenario 1: 成功取得 IP 詳情
- **Given**: 
  - Admin 已認證
  - security_events 表有該 IP 的事件記錄
- **When**: 
  - 發送 GET /api/admin/security/ip/192.168.1.100
- **Then**: 
  - 回傳 HTTP 200
  - 回傳 JSON 包含：
    ```json
    {
      "ip": "192.168.1.0",
      "is_blocked": boolean,
      "block_info": {
        "blocked_until": "ISO8601 or null",
        "reason": "string"
      },
      "statistics": {
        "total_events": number,
        "first_seen": "ISO8601",
        "last_seen": "ISO8601",
        "event_types": {
          "rate_limit_exceeded": number,
          "suspicious_pattern": number
        }
      },
      "recent_events": [
        {
          "event_type": "string",
          "endpoint": "string",
          "created_at": "ISO8601"
        }
      ]
    }
    ```

### Scenario 2: IP 無事件記錄
- **Given**: 
  - Admin 已認證
  - security_events 表沒有該 IP 的記錄
- **When**: 
  - 發送 GET /api/admin/security/ip/1.1.1.1
- **Then**: 
  - 回傳 HTTP 200
  - statistics.total_events = 0
  - recent_events = []

### Scenario 3: 未認證訪問
- **Given**: 
  - 請求沒有有效的 Admin Cookie
- **When**: 
  - 發送 GET /api/admin/security/ip/192.168.1.100
- **Then**: 
  - 回傳 HTTP 401

---

## Feature: Security Events Export API
**Endpoint**: `GET /api/admin/security/export`  
**Priority**: P2  
**Purpose**: 匯出安全事件為 CSV 格式

### Scenario 1: 成功匯出 CSV
- **Given**: 
  - Admin 已認證
  - security_events 表有事件資料
- **When**: 
  - 發送 GET /api/admin/security/export
- **Then**: 
  - 回傳 HTTP 200
  - Content-Type: text/csv
  - 回傳 CSV 格式：
    ```csv
    id,event_type,ip,endpoint,user_agent,created_at
    1,rate_limit_exceeded,192.168.1.0,/api/nfc/tap,Mozilla/5.0,2026-01-18T10:00:00Z
    ```

### Scenario 2: 過濾匯出
- **Given**: 
  - Admin 已認證
- **When**: 
  - 發送 GET /api/admin/security/export?event_type=rate_limit_exceeded&start_time=2026-01-18T00:00:00Z
- **Then**: 
  - 回傳 HTTP 200
  - 只包含符合過濾條件的事件

### Scenario 3: 限制匯出數量
- **Given**: 
  - Admin 已認證
  - security_events 表有 1000 筆事件
- **When**: 
  - 發送 GET /api/admin/security/export
- **Then**: 
  - 回傳 HTTP 200
  - 最多匯出 1000 筆（防止過載）

### Scenario 4: 未認證訪問
- **Given**: 
  - 請求沒有有效的 Admin Cookie
- **When**: 
  - 發送 GET /api/admin/security/export
- **Then**: 
  - 回傳 HTTP 401

---

## Technical Requirements

### IP Detail API
- 查詢 security_events 和 blocked_ips 表
- 統計事件類型分布
- 回傳最近 10 筆事件
- IP 匿名化顯示

### Export API
- 支援與 events API 相同的過濾參數
- 最多匯出 1000 筆
- CSV 格式標準化
- IP 匿名化
- 設定正確的 Content-Disposition header

### Authentication
- 所有 API 需要 Admin 認證

### Response Format
- IP Detail: JSON 格式
- Export: CSV 格式

---

## Implementation Files

### Modified File
- `workers/src/handlers/admin/security.ts`
  - handleIPDetail()
  - handleSecurityExport()

### Modified Files
- `workers/src/index.ts`
  - 新增路由：GET /api/admin/security/ip/:ip
  - 新增路由：GET /api/admin/security/export

---

## Acceptance Criteria
- [ ] 所有 7 個 Scenario 通過測試
- [ ] IP Detail 統計正確
- [ ] CSV 格式正確
- [ ] 過濾參數正常運作
- [ ] IP 匿名化正確實作
- [ ] 認證機制正常運作
- [ ] 本地測試通過
