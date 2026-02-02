# 安全監控儀表板 API 需求盤點

## 完整整合方案 - API 清單

---

## 📡 必要 API（Phase 1 - 核心功能）

### 1. GET /api/admin/security/stats
**用途**: 取得安全統計資料（24 小時）

#### 請求
```http
GET /api/admin/security/stats HTTP/1.1
Cookie: admin_token=xxx
```

#### 回應
```json
{
  "success": true,
  "data": {
    "last_24h": {
      "total_events": 124,
      "rate_limit_exceeded": 42,
      "endpoint_enumeration": 78,
      "suspicious_pattern": 4
    },
    "top_ips": [
      {
        "ip": "39.1.101.0",
        "count": 56,
        "last_seen": "2026-01-18T10:59:44.000Z"
      },
      {
        "ip": "192.168.1.0",
        "count": 32,
        "last_seen": "2026-01-18T10:45:20.000Z"
      }
    ],
    "last_event_time": "2026-01-18T10:59:44.000Z"
  }
}
```

#### 實作需求
- 查詢 `security_events` 表
- WHERE `created_at >= datetime('now', '-24 hours')`
- GROUP BY `event_type` 統計
- GROUP BY `ip_address` 取 TOP 5
- ORDER BY `created_at DESC` 取最後事件時間

#### SQL 查詢
```sql
-- 統計各類型事件
SELECT 
  event_type,
  COUNT(*) as count
FROM security_events
WHERE created_at >= datetime('now', '-24 hours')
GROUP BY event_type;

-- Top 5 攻擊 IP
SELECT 
  ip_address,
  COUNT(*) as count,
  MAX(created_at) as last_seen
FROM security_events
WHERE created_at >= datetime('now', '-24 hours')
GROUP BY ip_address
ORDER BY count DESC
LIMIT 5;

-- 最後事件時間
SELECT MAX(created_at) as last_event_time
FROM security_events;
```

---

### 2. GET /api/admin/security/events
**用途**: 取得安全事件列表

#### 請求
```http
GET /api/admin/security/events?limit=10&type=rate_limit_exceeded&hours=24 HTTP/1.1
Cookie: admin_token=xxx
```

#### 查詢參數
- `limit` (optional): 返回筆數，預設 10，最大 50
- `type` (optional): 事件類型篩選
  - `rate_limit_exceeded`
  - `endpoint_enumeration`
  - `suspicious_pattern`
- `hours` (optional): 時間範圍（小時），預設 24

#### 回應
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": 1,
        "event_type": "rate_limit_exceeded",
        "ip_address": "39.1.101.0",
        "details": {
          "error_type": "404",
          "count": 20,
          "path": "/api/test"
        },
        "created_at": "2026-01-18T10:59:44.000Z"
      }
    ],
    "total": 124,
    "filtered": 42
  }
}
```

#### 實作需求
- 支援分頁（limit）
- 支援類型篩選（type）
- 支援時間範圍（hours）
- details 欄位需解析 JSON

#### SQL 查詢
```sql
SELECT 
  id,
  event_type,
  ip_address,
  details,
  created_at
FROM security_events
WHERE created_at >= datetime('now', '-' || ? || ' hours')
  AND (? IS NULL OR event_type = ?)
ORDER BY created_at DESC
LIMIT ?;
```

---

## 🔧 進階 API（Phase 2 - 增強功能）

### 3. GET /api/admin/security/timeline
**用途**: 取得事件時間軸數據（用於圖表）

#### 請求
```http
GET /api/admin/security/timeline?hours=24&interval=1 HTTP/1.1
Cookie: admin_token=xxx
```

#### 查詢參數
- `hours` (optional): 時間範圍，預設 24
- `interval` (optional): 時間間隔（小時），預設 1

#### 回應
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "timestamp": "2026-01-18T10:00:00.000Z",
        "rate_limit_exceeded": 5,
        "endpoint_enumeration": 8,
        "suspicious_pattern": 0,
        "total": 13
      },
      {
        "timestamp": "2026-01-18T11:00:00.000Z",
        "rate_limit_exceeded": 3,
        "endpoint_enumeration": 2,
        "suspicious_pattern": 1,
        "total": 6
      }
    ],
    "summary": {
      "peak_hour": "2026-01-18T10:00:00.000Z",
      "peak_count": 13
    }
  }
}
```

#### 實作需求
- 按小時分組統計
- 計算每個時間段的事件數
- 找出峰值時段

#### SQL 查詢
```sql
SELECT 
  strftime('%Y-%m-%dT%H:00:00.000Z', created_at) as timestamp,
  SUM(CASE WHEN event_type = 'rate_limit_exceeded' THEN 1 ELSE 0 END) as rate_limit_exceeded,
  SUM(CASE WHEN event_type = 'endpoint_enumeration' THEN 1 ELSE 0 END) as endpoint_enumeration,
  SUM(CASE WHEN event_type = 'suspicious_pattern' THEN 1 ELSE 0 END) as suspicious_pattern,
  COUNT(*) as total
FROM security_events
WHERE created_at >= datetime('now', '-24 hours')
GROUP BY strftime('%Y-%m-%dT%H:00:00.000Z', created_at)
ORDER BY timestamp ASC;
```

---

### 4. GET /api/admin/security/ip/:ip
**用途**: 取得特定 IP 的詳細資訊

#### 請求
```http
GET /api/admin/security/ip/39.1.101.0 HTTP/1.1
Cookie: admin_token=xxx
```

#### 回應
```json
{
  "success": true,
  "data": {
    "ip_address": "39.1.101.0",
    "total_events": 56,
    "first_seen": "2026-01-17T15:30:00.000Z",
    "last_seen": "2026-01-18T10:59:44.000Z",
    "event_breakdown": {
      "rate_limit_exceeded": 40,
      "endpoint_enumeration": 16,
      "suspicious_pattern": 0
    },
    "recent_events": [
      {
        "event_type": "rate_limit_exceeded",
        "details": { "path": "/api/test", "count": 20 },
        "created_at": "2026-01-18T10:59:44.000Z"
      }
    ],
    "is_blocked": false
  }
}
```

#### 實作需求
- 查詢特定 IP 的所有事件
- 統計事件類型分布
- 顯示最近事件
- 檢查是否被封鎖

---

### 5. POST /api/admin/security/block
**用途**: 手動封鎖 IP 地址

#### 請求
```http
POST /api/admin/security/block HTTP/1.1
Cookie: admin_token=xxx
Content-Type: application/json

{
  "ip_address": "39.1.101.0",
  "duration": 3600,
  "reason": "Excessive rate limit violations"
}
```

#### 回應
```json
{
  "success": true,
  "data": {
    "ip_address": "39.1.101.0",
    "blocked_until": "2026-01-18T12:00:00.000Z",
    "reason": "Excessive rate limit violations"
  }
}
```

#### 實作需求
- 將 IP 加入封鎖清單（KV 或 D1）
- 設定過期時間
- 記錄封鎖原因
- 整合到速率限制中介層

---

### 6. DELETE /api/admin/security/block/:ip
**用途**: 解除 IP 封鎖

#### 請求
```http
DELETE /api/admin/security/block/39.1.101.0 HTTP/1.1
Cookie: admin_token=xxx
```

#### 回應
```json
{
  "success": true,
  "message": "IP unblocked successfully"
}
```

---

### 7. GET /api/admin/security/export
**用途**: 匯出安全事件為 CSV

#### 請求
```http
GET /api/admin/security/export?hours=24&type=rate_limit_exceeded HTTP/1.1
Cookie: admin_token=xxx
```

#### 回應
```csv
timestamp,event_type,ip_address,path,count
2026-01-18T10:59:44.000Z,rate_limit_exceeded,39.1.101.0,/api/test,20
2026-01-18T10:45:20.000Z,endpoint_enumeration,192.168.1.0,/api/admin,15
```

#### 實作需求
- 查詢事件並格式化為 CSV
- 設定 Content-Type: text/csv
- 設定 Content-Disposition: attachment

---

## 📊 WebSocket API（Phase 3 - 即時更新）

### 8. WebSocket /api/admin/security/live
**用途**: 即時推送安全事件

#### 連接
```javascript
const ws = new WebSocket('wss://your-domain/api/admin/security/live');
```

#### 訊息格式
```json
{
  "type": "security_event",
  "data": {
    "event_type": "rate_limit_exceeded",
    "ip_address": "39.1.101.0",
    "details": { "path": "/api/test", "count": 20 },
    "created_at": "2026-01-18T10:59:44.000Z"
  }
}
```

#### 實作需求
- 使用 Cloudflare Durable Objects
- 當新事件記錄時推送
- 支援訂閱特定事件類型

---

## 🗄️ 資料庫需求

### 新增資料表（如需要）

#### blocked_ips 表
```sql
CREATE TABLE IF NOT EXISTS blocked_ips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL UNIQUE,
  blocked_until TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

CREATE INDEX idx_blocked_ips_until ON blocked_ips(blocked_until);
```

---

## 📋 實作優先級

### P0 - 立即實作（核心功能）
1. ✅ GET /api/admin/security/stats
2. ✅ GET /api/admin/security/events

### P1 - 短期實作（1 週內）
3. ⏳ GET /api/admin/security/timeline
4. ⏳ POST /api/admin/security/block
5. ⏳ DELETE /api/admin/security/block/:ip

### P2 - 中期實作（2 週內）
6. ⏳ GET /api/admin/security/ip/:ip
7. ⏳ GET /api/admin/security/export

### P3 - 長期實作（1 個月內）
8. ⏳ WebSocket /api/admin/security/live

---

## 🔐 安全考量

### 認證要求
- 所有 API 需要管理員認證
- 使用 HttpOnly Cookie 或 Authorization header
- 實作速率限制（每分鐘 60 次）

### 資料保護
- IP 地址已匿名化
- 不記錄個人識別資訊
- 日誌保留期限：30 天

### CORS 設定
- 僅允許白名單 origin
- 使用 credentials: 'include'

---

## 📈 效能優化

### 快取策略
- stats API: 快取 30 秒
- timeline API: 快取 5 分鐘
- events API: 不快取（即時性）

### 查詢優化
- 使用索引（created_at, event_type, ip_address）
- 限制查詢範圍（最多 7 天）
- 分頁限制（最多 50 筆）

---

## 🧪 測試需求

### 單元測試
- [ ] 統計查詢正確性
- [ ] 時間範圍篩選
- [ ] 事件類型篩選
- [ ] 分頁功能

### 整合測試
- [ ] API 端點回應格式
- [ ] 認證檢查
- [ ] 錯誤處理
- [ ] CORS 設定

### 效能測試
- [ ] 大量事件查詢效能
- [ ] 並發請求處理
- [ ] 快取效果驗證

---

## 📝 API 文檔

完整 API 文檔將更新至：
- `docs/api/security-monitoring.md`

---

**總結**: 完整整合需要實作 8 個 API 端點，優先實作 P0 的 2 個核心 API，再逐步擴展功能。

