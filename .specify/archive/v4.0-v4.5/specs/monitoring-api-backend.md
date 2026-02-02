# BDD Spec: Monitoring API (Backend)

## Feature: 監控與告警 API

作為系統管理員  
我需要監控系統運行狀態  
以便及時發現並解決問題

---

## Scenario 1: 獲取系統總覽

**Given** 系統在過去 24 小時內有以下活動：
- 上傳: 150 次（145 成功，5 失敗）
- 讀取: 3420 次（3398 成功，22 失敗）
- Rate Limiting: 15 次觸發

**When** 我 GET 到 `/api/admin/monitoring/overview`  
**Then** 應返回 200 OK  
**And** 回應包含：
```json
{
  "upload": {
    "total": 150,
    "success": 145,
    "failed": 5,
    "success_rate": 96.67
  },
  "read": {
    "total": 3420,
    "success": 3398,
    "failed": 22,
    "success_rate": 99.36
  },
  "rate_limit": {
    "upload_triggered": 3,
    "read_triggered": 12,
    "trigger_rate": 0.44
  },
  "errors": {
    "total": 27,
    "by_type": { ... }
  },
  "alerts": [ ... ]
}
```

---

## Scenario 2: 獲取時間序列數據

**Given** 系統有過去 24 小時的上傳數據  
**When** 我 GET 到 `/api/admin/monitoring/timeline?metric=upload&period=24h`  
**Then** 應返回 200 OK  
**And** 回應包含 24 個數據點（每小時 1 個）  
**And** 每個數據點包含 timestamp, value, success, failed

---

## Scenario 3: 獲取錯誤列表

**Given** 系統在過去 24 小時內有 27 個錯誤  
**When** 我 GET 到 `/api/admin/monitoring/errors?limit=10`  
**Then** 應返回 200 OK  
**And** 回應包含最近 10 個錯誤  
**And** 每個錯誤包含 type, message, endpoint, timestamp

---

## Scenario 4: 系統健康檢查

**Given** 系統正常運行  
**When** 我 GET 到 `/api/admin/monitoring/health`  
**Then** 應返回 200 OK  
**And** status 應為 "healthy"  
**And** 所有檢查項目（database, r2, kv）應為 "ok"

---

## Scenario 5: 系統健康檢查（降級）

**Given** 上傳成功率為 89%（低於 90% 閾值）  
**When** 我 GET 到 `/api/admin/monitoring/health`  
**Then** 應返回 200 OK  
**And** status 應為 "degraded"  
**And** 應包含告警訊息

---

## Scenario 6: 拒絕未授權請求

**Given** 我未登入為管理員  
**When** 我嘗試存取任何監控 API  
**Then** 應返回 401 Unauthorized

---

## Scenario 7: KV 計數器更新（上傳成功）

**Given** 當前上傳成功計數為 100  
**When** 上傳 API 成功處理一個請求  
**Then** 應遞增 `metrics:upload:success:count` 至 101  
**And** 應更新 `metrics:upload:duration:sum`  
**And** 應更新 `metrics:upload:size:sum`

---

## Scenario 8: KV 計數器更新（上傳失敗）

**Given** 當前上傳失敗計數為 5  
**When** 上傳 API 返回 413 錯誤  
**Then** 應遞增 `metrics:upload:failed:count` 至 6  
**And** 應遞增 `metrics:errors:file_too_large:count`

---

## Scenario 9: 時間序列數據記錄

**Given** 當前時間為 2026-01-28 11:00  
**When** 上傳 API 成功處理一個請求  
**Then** 應更新 `metrics:timeline:upload:1738051200` (hour timestamp)  
**And** 數據應包含 success 和 failed 計數

---

## Scenario 10: 告警檢查（成功率過低）

**Given** 上傳成功率為 89%  
**When** 系統檢查告警規則  
**Then** 應產生 critical 等級告警  
**And** 告警訊息為 "Upload success rate critically low: 89%"

---

## Acceptance Criteria

### API 端點
- [x] GET /api/admin/monitoring/overview
- [x] GET /api/admin/monitoring/timeline
- [x] GET /api/admin/monitoring/errors
- [x] GET /api/admin/monitoring/health

### 認證
- [x] 所有端點需要管理員認證
- [x] 使用 verifySetupToken() 中間件

### KV 計數器
- [x] 上傳成功/失敗計數
- [x] 讀取成功/失敗計數
- [x] Rate Limiting 觸發計數
- [x] 錯誤類型計數
- [x] 處理時間總和
- [x] 檔案大小總和

### 時間序列
- [x] 每小時數據點
- [x] 7 天保留期限
- [x] 自動過期（TTL）

### 告警規則
- [x] 上傳成功率 < 90% (critical)
- [x] 上傳成功率 < 95% (warning)
- [x] 讀取成功率 < 95% (critical)
- [x] 讀取成功率 < 99% (warning)
- [x] 錯誤率 > 5% (critical)
- [x] 錯誤率 > 1% (warning)

### 快取策略
- [x] overview: 60 秒 KV 快取
- [x] timeline: 300 秒 KV 快取
- [x] health: 30 秒 KV 快取
- [x] errors: 無快取（即時）

### 效能
- [x] API 回應時間 < 200ms
- [x] KV 寫入不阻塞主流程
- [x] 批次讀取 KV（減少請求次數）

---

## Technical Notes

### KV Key 命名規範
```
metrics:upload:success:count          // 計數器
metrics:upload:failed:count
metrics:upload:duration:sum           // 總和
metrics:upload:size:sum

metrics:read:success:count
metrics:read:failed:count
metrics:read:duration:sum

metrics:rate_limit:upload:count
metrics:rate_limit:read:count

metrics:errors:{error_type}:count     // 錯誤類型

metrics:timeline:{metric}:{hour}      // 時間序列
```

### TTL 設定
```typescript
const TTL = {
  COUNTER: 86400,      // 24 小時
  TIMELINE: 604800,    // 7 天
  CACHE: 60,           // 1 分鐘（overview）
  CACHE_TIMELINE: 300, // 5 分鐘（timeline）
  CACHE_HEALTH: 30     // 30 秒（health）
};
```

### 告警閾值
```typescript
const THRESHOLDS = {
  upload_success_rate: { critical: 90, warning: 95 },
  read_success_rate: { critical: 95, warning: 99 },
  error_rate: { critical: 5, warning: 1 },
  rate_limit_trigger_rate: { warning: 5 },
  upload_avg_duration: { warning: 5000 },
  read_avg_duration: { warning: 1000 }
};
```

### 錯誤類型映射
```typescript
const ERROR_TYPES = {
  413: 'file_too_large',
  400: 'invalid_format',
  401: 'unauthorized',
  404: 'not_found',
  429: 'rate_limited',
  500: 'internal_error'
};
```
