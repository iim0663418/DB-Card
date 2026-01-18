# BDD Specification: Security Dashboard P1 APIs

## Feature: Security Timeline API
**Endpoint**: `GET /api/admin/security/timeline`  
**Priority**: P1  
**Purpose**: 提供按小時分布的事件統計（圖表數據）

### Scenario 1: 成功取得 24 小時時間軸
- **Given**: 
  - Admin 已認證
  - security_events 表有過去 24 小時的事件
- **When**: 
  - 發送 GET /api/admin/security/timeline
- **Then**: 
  - 回傳 HTTP 200
  - 回傳 JSON 包含 24 個小時的數據點：
    ```json
    {
      "timeline": [
        {
          "hour": "2026-01-18T00:00:00Z",
          "total": number,
          "rate_limit": number,
          "suspicious": number
        }
      ]
    }
    ```

### Scenario 2: 自訂時間範圍
- **Given**: 
  - Admin 已認證
- **When**: 
  - 發送 GET /api/admin/security/timeline?hours=48
- **Then**: 
  - 回傳 HTTP 200
  - 回傳 48 個小時的數據點

### Scenario 3: 未認證訪問
- **Given**: 
  - 請求沒有有效的 Admin Cookie
- **When**: 
  - 發送 GET /api/admin/security/timeline
- **Then**: 
  - 回傳 HTTP 401

---

## Feature: IP Blocking API
**Endpoint**: `POST /api/admin/security/block`  
**Priority**: P1  
**Purpose**: 手動封鎖 IP 地址

### Scenario 1: 成功封鎖 IP
- **Given**: 
  - Admin 已認證
  - IP 地址尚未被封鎖
- **When**: 
  - 發送 POST /api/admin/security/block
  - Body: `{"ip": "192.168.1.100", "duration_hours": 24, "reason": "Manual block"}`
- **Then**: 
  - 回傳 HTTP 200
  - 在 blocked_ips 表新增記錄
  - 回傳封鎖詳情：
    ```json
    {
      "ip": "192.168.1.0",
      "blocked_until": "ISO8601",
      "reason": "Manual block"
    }
    ```

### Scenario 2: 永久封鎖
- **Given**: 
  - Admin 已認證
- **When**: 
  - 發送 POST /api/admin/security/block
  - Body: `{"ip": "10.0.0.50", "duration_hours": 0, "reason": "Permanent ban"}`
- **Then**: 
  - 回傳 HTTP 200
  - blocked_until 設為 NULL（永久）

### Scenario 3: IP 已被封鎖
- **Given**: 
  - Admin 已認證
  - IP 已在 blocked_ips 表中
- **When**: 
  - 發送 POST /api/admin/security/block
  - Body: `{"ip": "192.168.1.100", "duration_hours": 24}`
- **Then**: 
  - 回傳 HTTP 200
  - 更新現有記錄的 blocked_until 和 reason

### Scenario 4: 缺少必要參數
- **Given**: 
  - Admin 已認證
- **When**: 
  - 發送 POST /api/admin/security/block
  - Body: `{}`
- **Then**: 
  - 回傳 HTTP 400
  - 錯誤訊息：Missing required field: ip

### Scenario 5: 未認證訪問
- **Given**: 
  - 請求沒有有效的 Admin Cookie
- **When**: 
  - 發送 POST /api/admin/security/block
- **Then**: 
  - 回傳 HTTP 401

---

## Feature: IP Unblocking API
**Endpoint**: `DELETE /api/admin/security/block/:ip`  
**Priority**: P1  
**Purpose**: 解除 IP 封鎖

### Scenario 1: 成功解除封鎖
- **Given**: 
  - Admin 已認證
  - IP 在 blocked_ips 表中
- **When**: 
  - 發送 DELETE /api/admin/security/block/192.168.1.100
- **Then**: 
  - 回傳 HTTP 200
  - 從 blocked_ips 表刪除記錄
  - 回傳確認訊息：
    ```json
    {
      "ip": "192.168.1.0",
      "unblocked": true
    }
    ```

### Scenario 2: IP 未被封鎖
- **Given**: 
  - Admin 已認證
  - IP 不在 blocked_ips 表中
- **When**: 
  - 發送 DELETE /api/admin/security/block/10.0.0.99
- **Then**: 
  - 回傳 HTTP 404
  - 錯誤訊息：IP not found in block list

### Scenario 3: 未認證訪問
- **Given**: 
  - 請求沒有有效的 Admin Cookie
- **When**: 
  - 發送 DELETE /api/admin/security/block/192.168.1.100
- **Then**: 
  - 回傳 HTTP 401

---

## Technical Requirements

### Database Schema
需要確認 `blocked_ips` 表存在（應該在 Phase 3 已建立）：
```sql
CREATE TABLE IF NOT EXISTS blocked_ips (
  ip_address TEXT PRIMARY KEY,
  blocked_until TEXT,  -- NULL for permanent
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_until ON blocked_ips(blocked_until);
```

### Timeline API
- 查詢 security_events 表
- 按小時分組統計
- 預設 24 小時，最多 168 小時（7天）
- 快取 5 分鐘

### Block/Unblock APIs
- IP 匿名化顯示
- 記錄操作到 audit_logs
- Block API 支援 UPSERT 語義
- 驗證 IP 格式

### Authentication
- 所有 API 需要 Admin 認證
- 使用現有 middleware/auth.ts

### Response Format
- 統一使用 utils/response.ts
- IP 地址匿名化

---

## Implementation Files

### Modified File
- `workers/src/handlers/admin/security.ts`
  - handleSecurityTimeline()
  - handleBlockIP()
  - handleUnblockIP()

### Modified Files
- `workers/src/index.ts`
  - 新增路由：GET /api/admin/security/timeline
  - 新增路由：POST /api/admin/security/block
  - 新增路由：DELETE /api/admin/security/block/:ip

---

## Acceptance Criteria
- [ ] 所有 11 個 Scenario 通過測試
- [ ] Timeline 數據正確分組
- [ ] Block/Unblock 操作正確更新資料庫
- [ ] IP 匿名化正確實作
- [ ] 認證機制正常運作
- [ ] 錯誤處理符合統一格式
- [ ] 本地測試通過
