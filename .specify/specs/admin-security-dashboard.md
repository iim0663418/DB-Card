# BDD Spec: Admin Dashboard 安全告警功能

**Feature**: 安全告警與監控儀表板
**Priority**: Medium
**Status**: Design Phase

## 背景 (Context)

當前 Admin Dashboard 缺乏安全事件的可視化，管理員無法即時了解系統安全狀態。需要新增安全告警區塊，顯示：
- 最近 24 小時安全事件統計
- 攻擊來源 IP 排名
- 最近安全事件列表

## API 需求

### Scenario 1: 取得安全統計資料

**Given**: 管理員已登入 Admin Dashboard
**When**: 請求安全統計 API
**Then**: 
- 返回最近 24 小時事件統計
- 包含事件類型分組計數
- 包含 Top 5 攻擊來源 IP

#### API 規格
```typescript
GET /api/admin/security/stats

Response: {
  success: true,
  data: {
    last_24h: {
      total_events: 15,
      rate_limit_exceeded: 8,
      endpoint_enumeration: 7,
      suspicious_pattern: 0
    },
    top_ips: [
      { ip: "39.1.101.0", count: 8 },
      { ip: "192.168.1.0", count: 3 }
    ],
    last_event_time: "2026-01-18T10:59:44.000Z"
  }
}
```

### Scenario 2: 查詢安全事件列表

**Given**: 管理員已登入 Admin Dashboard
**When**: 請求安全事件列表
**Then**: 
- 返回最近 N 筆事件
- 支援事件類型篩選
- 支援時間範圍篩選

#### API 規格
```typescript
GET /api/admin/security/events?limit=10&type=rate_limit_exceeded&hours=24

Response: {
  success: true,
  data: {
    events: [
      {
        id: 1,
        event_type: "rate_limit_exceeded",
        ip_address: "39.1.101.0",
        details: {
          error_type: "404",
          count: 20,
          path: "/api/test"
        },
        created_at: "2026-01-18T10:59:44.000Z"
      }
    ],
    total: 15
  }
}
```

## 前端 UI 需求

### 安全儀表板區塊（新增到 Admin Dashboard）

#### 1. 統計卡片區
```html
<div class="security-dashboard">
  <!-- 統計卡片 -->
  <div class="stats-cards">
    <div class="stat-card">
      <div class="stat-icon">⚠️</div>
      <div class="stat-value" id="total-events">0</div>
      <div class="stat-label">Total Events (24h)</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">🚫</div>
      <div class="stat-value" id="rate-limit-events">0</div>
      <div class="stat-label">Rate Limit Exceeded</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">🔍</div>
      <div class="stat-value" id="enumeration-events">0</div>
      <div class="stat-label">Endpoint Enumeration</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">✅</div>
      <div class="stat-value" id="critical-threats">0</div>
      <div class="stat-label">Critical Threats</div>
    </div>
  </div>
</div>
```

#### 2. Top 攻擊 IP 列表
```html
<div class="top-ips-section">
  <h3>🎯 Top Attacking IPs</h3>
  <div class="ip-list" id="top-ips-list">
    <!-- 動態生成 -->
    <div class="ip-item">
      <span class="ip-address">39.1.101.0</span>
      <div class="ip-bar" style="width: 80%"></div>
      <span class="ip-count">8 events</span>
    </div>
  </div>
</div>
```

#### 3. 最近事件列表
```html
<div class="recent-events-section">
  <h3>📋 Recent Security Events</h3>
  <div class="events-table" id="events-table">
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Type</th>
          <th>IP Address</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody id="events-tbody">
        <!-- 動態生成 -->
      </tbody>
    </table>
  </div>
</div>
```

### JavaScript 函數需求

#### 1. 載入安全統計
```javascript
async function loadSecurityStats() {
  const response = await fetch('/api/admin/security/stats', {
    credentials: 'include'
  });
  const data = await response.json();
  
  if (data.success) {
    updateStatsCards(data.data);
    updateTopIPs(data.data.top_ips);
  }
}
```

#### 2. 載入安全事件
```javascript
async function loadSecurityEvents(limit = 10) {
  const response = await fetch(`/api/admin/security/events?limit=${limit}`, {
    credentials: 'include'
  });
  const data = await response.json();
  
  if (data.success) {
    updateEventsTable(data.data.events);
  }
}
```

#### 3. 自動刷新
```javascript
// 每 30 秒自動刷新
setInterval(() => {
  loadSecurityStats();
  loadSecurityEvents();
}, 30000);
```

### CSS 樣式需求

```css
/* 統計卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

/* Top IPs */
.ip-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.ip-address {
  min-width: 120px;
  font-family: monospace;
}

.ip-bar {
  height: 8px;
  background: #ef4444;
  border-radius: 4px;
  flex-grow: 1;
}

.ip-count {
  min-width: 80px;
  text-align: right;
  color: #6b7280;
}

/* 事件表格 */
.events-table {
  overflow-x: auto;
}

.events-table table {
  width: 100%;
  border-collapse: collapse;
}

.events-table th {
  background: #f9fafb;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #e5e7eb;
}

.events-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.event-type-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.event-type-rate-limit {
  background: #fee2e2;
  color: #991b1b;
}

.event-type-enumeration {
  background: #fef3c7;
  color: #92400e;
}
```

## 實作檢查清單

### 後端 API
- [ ] 創建 `/api/admin/security/stats` 端點
- [ ] 創建 `/api/admin/security/events` 端點
- [ ] 實作 24 小時統計查詢
- [ ] 實作 Top IPs 查詢
- [ ] 實作事件列表查詢（支援篩選）
- [ ] 加入認證檢查

### 前端整合
- [ ] 在 admin-dashboard.html 新增安全儀表板區塊
- [ ] 實作 loadSecurityStats() 函數
- [ ] 實作 loadSecurityEvents() 函數
- [ ] 實作 updateStatsCards() 函數
- [ ] 實作 updateTopIPs() 函數
- [ ] 實作 updateEventsTable() 函數
- [ ] 加入自動刷新機制（30 秒）
- [ ] 加入 CSS 樣式

### 測試
- [ ] API 端點測試
- [ ] 前端顯示測試
- [ ] 自動刷新測試
- [ ] 認證檢查測試

## 效能考量

- 統計查詢使用 WHERE created_at >= datetime('now', '-24 hours')
- 限制 Top IPs 為 5 筆
- 事件列表預設 10 筆，最多 50 筆
- 自動刷新間隔 30 秒（避免過度查詢）

## 安全考量

- 所有 API 需要管理員認證
- IP 地址已匿名化
- 不洩露系統內部資訊
- 使用 adminErrorResponse 處理錯誤

## 相關文檔
- error-response-security-hardening.md
- SECURITY-HARDENING-ROADMAP.md
- ADR-001: 隱私優先設計原則
