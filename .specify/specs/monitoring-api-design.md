# 監控與告警 API 設計規格

**設計目標**: 整合至 Admin Dashboard，提供即時系統健康監控  
**設計原則**: 最小可用集合（MVP）、易於整合、效能優先  
**設計日期**: 2026-01-28

---

## 🎯 設計目標

### 核心需求
1. **即時監控**: 顯示系統當前狀態
2. **歷史數據**: 查看過去 24 小時趨勢
3. **告警通知**: 關鍵指標異常時提示
4. **易於整合**: Admin Dashboard 可直接調用

### 非目標（暫不實作）
- ❌ 複雜的查詢語言
- ❌ 自訂告警規則
- ❌ 多維度分析
- ❌ 長期數據儲存（> 7 天）

---

## 📊 API 端點設計

### 1. GET /api/admin/monitoring/overview

**用途**: 系統總覽（儀表板首頁）

**回應**:
```typescript
interface MonitoringOverview {
  timestamp: string;
  period: '24h';
  
  // 上傳統計
  upload: {
    total: number;           // 總上傳次數
    success: number;         // 成功次數
    failed: number;          // 失敗次數
    success_rate: number;    // 成功率 (%)
    avg_size: number;        // 平均檔案大小 (bytes)
    avg_duration: number;    // 平均處理時間 (ms)
  };
  
  // 讀取統計
  read: {
    total: number;
    success: number;
    failed: number;
    success_rate: number;
    avg_duration: number;    // 平均讀取時間 (ms)
    cache_hit_rate: number;  // 快取命中率 (%)
  };
  
  // Rate Limiting
  rate_limit: {
    upload_triggered: number;    // 上傳限制觸發次數
    read_triggered: number;      // 讀取限制觸發次數
    trigger_rate: number;        // 觸發率 (%)
  };
  
  // 錯誤統計
  errors: {
    total: number;
    by_type: Record<string, number>;  // 錯誤類型分布
    top_errors: Array<{
      type: string;
      count: number;
      last_seen: string;
    }>;
  };
  
  // 告警狀態
  alerts: Array<{
    level: 'critical' | 'warning' | 'info';
    message: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: string;
  }>;
}
```

**範例回應**:
```json
{
  "timestamp": "2026-01-28T11:00:00Z",
  "period": "24h",
  "upload": {
    "total": 150,
    "success": 145,
    "failed": 5,
    "success_rate": 96.67,
    "avg_size": 1843200,
    "avg_duration": 2340
  },
  "read": {
    "total": 3420,
    "success": 3398,
    "failed": 22,
    "success_rate": 99.36,
    "avg_duration": 245,
    "cache_hit_rate": 87.5
  },
  "rate_limit": {
    "upload_triggered": 3,
    "read_triggered": 12,
    "trigger_rate": 0.44
  },
  "errors": {
    "total": 27,
    "by_type": {
      "file_too_large": 5,
      "invalid_format": 3,
      "session_expired": 15,
      "r2_error": 4
    },
    "top_errors": [
      {
        "type": "session_expired",
        "count": 15,
        "last_seen": "2026-01-28T10:45:00Z"
      }
    ]
  },
  "alerts": [
    {
      "level": "warning",
      "message": "Upload success rate below 95%",
      "metric": "upload_success_rate",
      "value": 96.67,
      "threshold": 95,
      "timestamp": "2026-01-28T10:30:00Z"
    }
  ]
}
```

**快取策略**: 60 秒 KV 快取

---

### 2. GET /api/admin/monitoring/timeline

**用途**: 時間序列數據（趨勢圖表）

**查詢參數**:
```typescript
interface TimelineQuery {
  metric: 'upload' | 'read' | 'errors' | 'rate_limit';
  period: '1h' | '6h' | '24h';  // 預設 24h
  interval: '5m' | '15m' | '1h'; // 預設自動選擇
}
```

**回應**:
```typescript
interface MonitoringTimeline {
  metric: string;
  period: string;
  interval: string;
  data_points: Array<{
    timestamp: string;
    value: number;
    success?: number;  // 成功次數（可選）
    failed?: number;   // 失敗次數（可選）
  }>;
}
```

**範例回應**:
```json
{
  "metric": "upload",
  "period": "24h",
  "interval": "1h",
  "data_points": [
    {
      "timestamp": "2026-01-27T11:00:00Z",
      "value": 12,
      "success": 11,
      "failed": 1
    },
    {
      "timestamp": "2026-01-27T12:00:00Z",
      "value": 8,
      "success": 8,
      "failed": 0
    }
    // ... 24 個數據點
  ]
}
```

**快取策略**: 300 秒 KV 快取

---

### 3. GET /api/admin/monitoring/errors

**用途**: 錯誤詳情列表

**查詢參數**:
```typescript
interface ErrorsQuery {
  type?: string;           // 錯誤類型過濾
  period?: '1h' | '24h';   // 預設 24h
  limit?: number;          // 預設 50，最大 100
}
```

**回應**:
```typescript
interface ErrorsList {
  total: number;
  errors: Array<{
    id: string;
    type: string;
    message: string;
    endpoint: string;
    method: string;
    status_code: number;
    timestamp: string;
    metadata?: {
      card_uuid?: string;
      asset_id?: string;
      file_size?: number;
      ip?: string;  // 匿名化
    };
  }>;
}
```

**範例回應**:
```json
{
  "total": 27,
  "errors": [
    {
      "id": "err_abc123",
      "type": "file_too_large",
      "message": "File size exceeds 5 MB limit",
      "endpoint": "/api/admin/assets/upload",
      "method": "POST",
      "status_code": 413,
      "timestamp": "2026-01-28T10:45:23Z",
      "metadata": {
        "file_size": 6291456,
        "ip": "203.145.xxx.xxx"
      }
    }
  ]
}
```

**快取策略**: 無快取（即時數據）

---

### 4. GET /api/admin/monitoring/health

**用途**: 系統健康檢查（輕量級）

**回應**:
```typescript
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      latency: number;  // ms
    };
    r2: {
      status: 'ok' | 'error';
      latency: number;
    };
    kv: {
      status: 'ok' | 'error';
      latency: number;
    };
  };
  metrics: {
    upload_success_rate: number;
    read_success_rate: number;
    error_rate: number;
  };
}
```

**範例回應**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-28T11:00:00Z",
  "checks": {
    "database": {
      "status": "ok",
      "latency": 12
    },
    "r2": {
      "status": "ok",
      "latency": 45
    },
    "kv": {
      "status": "ok",
      "latency": 3
    }
  },
  "metrics": {
    "upload_success_rate": 96.67,
    "read_success_rate": 99.36,
    "error_rate": 0.79
  }
}
```

**快取策略**: 30 秒 KV 快取

---

## 📈 資料收集設計

### 方案 A: KV 計數器（推薦）

**優勢**:
- ✅ 實作簡單
- ✅ 即時更新
- ✅ 無額外成本
- ✅ 適合 MVP

**實作方式**:
```typescript
// 上傳成功
await env.KV.put('metrics:upload:success:count', count + 1, { expirationTtl: 86400 });
await env.KV.put('metrics:upload:success:last', Date.now(), { expirationTtl: 86400 });

// 上傳失敗
await env.KV.put('metrics:upload:failed:count', count + 1, { expirationTtl: 86400 });
await env.KV.put('metrics:upload:failed:last_error', errorType, { expirationTtl: 86400 });

// 時間序列（每小時）
const hourKey = `metrics:upload:${Math.floor(Date.now() / 3600000)}`;
await env.KV.put(hourKey, JSON.stringify({ success, failed }), { expirationTtl: 604800 });
```

**KV Key 設計**:
```
metrics:upload:success:count          // 24h 總成功次數
metrics:upload:failed:count           // 24h 總失敗次數
metrics:upload:duration:sum           // 24h 總處理時間
metrics:upload:size:sum               // 24h 總檔案大小

metrics:read:success:count
metrics:read:failed:count
metrics:read:duration:sum

metrics:rate_limit:upload:count
metrics:rate_limit:read:count

metrics:errors:{type}:count           // 各類型錯誤計數

metrics:timeline:{metric}:{hour}      // 時間序列數據
```

**TTL 策略**:
- 計數器: 86400 秒（24 小時）
- 時間序列: 604800 秒（7 天）
- 錯誤詳情: 86400 秒（24 小時）

---

### 方案 B: D1 資料庫（備選）

**優勢**:
- ✅ 結構化查詢
- ✅ 長期儲存
- ✅ 複雜分析

**劣勢**:
- ❌ 寫入延遲較高
- ❌ 實作複雜
- ❌ 查詢成本較高

**建議**: Phase 2 考慮（當需要長期數據分析時）

---

## 🔔 告警規則設計

### 關鍵指標閾值

```typescript
const ALERT_THRESHOLDS = {
  // 上傳
  upload_success_rate: {
    critical: 90,  // < 90% 嚴重告警
    warning: 95    // < 95% 警告
  },
  
  // 讀取
  read_success_rate: {
    critical: 95,
    warning: 99
  },
  
  // 錯誤率
  error_rate: {
    critical: 5,   // > 5% 嚴重告警
    warning: 1     // > 1% 警告
  },
  
  // Rate Limiting 觸發率
  rate_limit_trigger_rate: {
    warning: 5     // > 5% 警告
  },
  
  // 系統延遲
  upload_avg_duration: {
    warning: 5000  // > 5s 警告
  },
  
  read_avg_duration: {
    warning: 1000  // > 1s 警告
  }
};
```

### 告警檢查邏輯

```typescript
async function checkAlerts(metrics: MonitoringOverview): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  // 檢查上傳成功率
  if (metrics.upload.success_rate < ALERT_THRESHOLDS.upload_success_rate.critical) {
    alerts.push({
      level: 'critical',
      message: `Upload success rate critically low: ${metrics.upload.success_rate}%`,
      metric: 'upload_success_rate',
      value: metrics.upload.success_rate,
      threshold: ALERT_THRESHOLDS.upload_success_rate.critical,
      timestamp: new Date().toISOString()
    });
  } else if (metrics.upload.success_rate < ALERT_THRESHOLDS.upload_success_rate.warning) {
    alerts.push({
      level: 'warning',
      message: `Upload success rate below target: ${metrics.upload.success_rate}%`,
      metric: 'upload_success_rate',
      value: metrics.upload.success_rate,
      threshold: ALERT_THRESHOLDS.upload_success_rate.warning,
      timestamp: new Date().toISOString()
    });
  }
  
  // 檢查讀取成功率
  if (metrics.read.success_rate < ALERT_THRESHOLDS.read_success_rate.critical) {
    alerts.push({
      level: 'critical',
      message: `Read success rate critically low: ${metrics.read.success_rate}%`,
      metric: 'read_success_rate',
      value: metrics.read.success_rate,
      threshold: ALERT_THRESHOLDS.read_success_rate.critical,
      timestamp: new Date().toISOString()
    });
  }
  
  // 檢查錯誤率
  const errorRate = (metrics.errors.total / (metrics.upload.total + metrics.read.total)) * 100;
  if (errorRate > ALERT_THRESHOLDS.error_rate.critical) {
    alerts.push({
      level: 'critical',
      message: `Error rate critically high: ${errorRate.toFixed(2)}%`,
      metric: 'error_rate',
      value: errorRate,
      threshold: ALERT_THRESHOLDS.error_rate.critical,
      timestamp: new Date().toISOString()
    });
  }
  
  return alerts;
}
```

---

## 🎨 Admin Dashboard 整合

### UI 組件設計

#### 1. 監控總覽卡片
```html
<div class="monitoring-overview">
  <!-- 上傳統計 -->
  <div class="metric-card">
    <h3>上傳統計</h3>
    <div class="metric-value">
      <span class="large">145</span>
      <span class="label">成功</span>
    </div>
    <div class="metric-detail">
      成功率: <span class="success-rate">96.67%</span>
      <span class="trend up">↑ 2.3%</span>
    </div>
  </div>
  
  <!-- 讀取統計 -->
  <div class="metric-card">
    <h3>讀取統計</h3>
    <div class="metric-value">
      <span class="large">3398</span>
      <span class="label">成功</span>
    </div>
    <div class="metric-detail">
      成功率: <span class="success-rate">99.36%</span>
    </div>
  </div>
  
  <!-- 錯誤統計 -->
  <div class="metric-card alert">
    <h3>錯誤統計</h3>
    <div class="metric-value">
      <span class="large">27</span>
      <span class="label">錯誤</span>
    </div>
    <div class="metric-detail">
      錯誤率: <span class="error-rate">0.79%</span>
    </div>
  </div>
</div>
```

#### 2. 趨勢圖表（Chart.js）
```javascript
async function renderTimelineChart() {
  const response = await fetch('/api/admin/monitoring/timeline?metric=upload&period=24h');
  const data = await response.json();
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.data_points.map(p => new Date(p.timestamp).toLocaleTimeString()),
      datasets: [{
        label: '成功',
        data: data.data_points.map(p => p.success),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)'
      }, {
        label: '失敗',
        data: data.data_points.map(p => p.failed),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)'
      }]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false }
    }
  });
}
```

#### 3. 告警通知
```html
<div class="alerts-container">
  <!-- 嚴重告警 -->
  <div class="alert critical">
    <i data-lucide="alert-circle"></i>
    <div class="alert-content">
      <strong>嚴重告警</strong>
      <p>上傳成功率過低: 89.5% (閾值: 90%)</p>
      <span class="timestamp">2 分鐘前</span>
    </div>
  </div>
  
  <!-- 警告 -->
  <div class="alert warning">
    <i data-lucide="alert-triangle"></i>
    <div class="alert-content">
      <strong>警告</strong>
      <p>讀取平均延遲過高: 1.2s (閾值: 1s)</p>
      <span class="timestamp">15 分鐘前</span>
    </div>
  </div>
</div>
```

#### 4. 錯誤列表
```html
<div class="errors-list">
  <table>
    <thead>
      <tr>
        <th>時間</th>
        <th>類型</th>
        <th>訊息</th>
        <th>端點</th>
        <th>狀態碼</th>
      </tr>
    </thead>
    <tbody id="errors-tbody">
      <!-- 動態載入 -->
    </tbody>
  </table>
</div>
```

---

## 🔧 實作優先級

### Phase 1: 核心監控（必要）
```
✅ GET /api/admin/monitoring/overview
✅ GET /api/admin/monitoring/health
✅ KV 計數器實作
✅ 基本告警規則
✅ Admin Dashboard 總覽卡片

預計時間: 2-3 小時
```

### Phase 2: 趨勢分析（重要）
```
⏳ GET /api/admin/monitoring/timeline
⏳ 時間序列數據收集
⏳ Chart.js 圖表整合

預計時間: 1-2 小時
```

### Phase 3: 錯誤追蹤（可選）
```
⏳ GET /api/admin/monitoring/errors
⏳ 錯誤詳情儲存
⏳ 錯誤列表 UI

預計時間: 1 小時
```

---

## 📝 實作檢查清單

### 後端實作
- [ ] 創建 `handlers/admin/monitoring.ts`
- [ ] 實作 4 個 API 端點
- [ ] 實作 KV 計數器邏輯
- [ ] 實作告警檢查函數
- [ ] 整合至現有 API（上傳、讀取）
- [ ] 更新 `index.ts` 路由

### 前端實作
- [ ] 創建「監控」Tab
- [ ] 實作總覽卡片
- [ ] 整合 Chart.js
- [ ] 實作告警通知
- [ ] 實作自動刷新（60 秒）
- [ ] 實作錯誤列表

### 測試
- [ ] API 端點測試
- [ ] KV 計數器測試
- [ ] 告警規則測試
- [ ] UI 整合測試

---

## 🎯 成功指標

### 技術指標
- ✅ API 回應時間 < 200ms
- ✅ KV 寫入成功率 > 99%
- ✅ 資料準確度 > 95%

### 業務指標
- ✅ 問題發現時間 < 5 分鐘
- ✅ 問題定位時間 < 30 分鐘
- ✅ 管理員滿意度 > 4/5

---

**設計版本**: v1.0  
**設計人**: Amazon Q Dev CLI  
**設計日期**: 2026-01-28
