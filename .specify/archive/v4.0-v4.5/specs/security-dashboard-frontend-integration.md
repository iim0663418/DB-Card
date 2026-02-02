# BDD Specification: Security Dashboard Frontend Integration

## Feature: Security Dashboard Frontend
**File**: `workers/public/admin-dashboard.html`  
**Priority**: P0  
**Purpose**: 整合 7 個安全監控 API 到現有 Admin Dashboard

## Requirements

### 1. Tab System Integration
- 在現有 Admin Dashboard 新增「安全監控」Tab
- 保持現有「名片管理」Tab 功能不變
- Tab 切換時載入對應內容

### 2. Statistics Display (使用 GET /api/admin/security/stats)
- 顯示 4 個統計卡片：
  - 總事件數 (Total Events)
  - 封鎖次數 (Blocked Attempts)
  - 可疑 IP 數 (Suspicious IPs)
  - 速率限制觸發 (Rate Limit Hits)
- 顯示 Top 5 IPs 列表
- 顯示最後一筆事件
- 每 60 秒自動刷新

### 3. Timeline Chart (使用 GET /api/admin/security/timeline)
- 使用 Chart.js 繪製折線圖
- 顯示 24 小時事件分布
- 3 條線：Total, Rate Limit, Suspicious
- 支援切換時間範圍（24h, 48h, 168h）

### 4. Events Table (使用 GET /api/admin/security/events)
- 顯示事件列表（表格格式）
- 支援過濾：event_type 下拉選單
- 支援分頁：上一頁/下一頁按鈕
- 顯示欄位：ID, Type, IP, Endpoint, User Agent, Time
- 點擊 IP 可查看詳情

### 5. IP Blocking (使用 POST /api/admin/security/block)
- 封鎖表單：IP 輸入框、Duration 選擇、Reason 輸入
- Duration 選項：1h, 24h, 7d, Permanent
- 提交後刷新統計和事件列表

### 6. IP Unblocking (使用 DELETE /api/admin/security/block/:ip)
- 在 IP 詳情頁顯示「解除封鎖」按鈕
- 確認對話框
- 解除後刷新統計

### 7. IP Detail Modal (使用 GET /api/admin/security/ip/:ip)
- 點擊 IP 開啟 Modal
- 顯示：
  - IP 地址（匿名化）
  - 封鎖狀態
  - 事件統計（總數、首次/最近出現）
  - 事件類型分布（圓餅圖）
  - 最近 10 筆事件
- 如果已封鎖，顯示解除封鎖按鈕

### 8. CSV Export (使用 GET /api/admin/security/export)
- 「匯出 CSV」按鈕
- 支援過濾參數（與事件列表同步）
- 下載檔案名稱：security-events-YYYYMMDD.csv

## Technical Requirements

### API Integration
- 使用現有 `js/api.js` 的 API 客戶端模式
- 所有請求包含 credentials: 'include' (HttpOnly Cookie)
- 統一錯誤處理（401 自動跳轉登入）

### UI Framework
- 保持現有 Tailwind CSS + Glassmorphism 設計
- 使用 Chart.js 繪製圖表
- 響應式設計（支援手機/平板）

### Performance
- 統計數據每 60 秒自動刷新
- 時間軸圖表快取 5 分鐘
- 事件列表即時載入（無快取）

### Error Handling
- API 錯誤顯示 Toast 通知
- 網路錯誤重試機制
- Loading 狀態指示器

## Implementation Strategy

### Phase 1: Tab System
1. 在 admin-dashboard.html 新增「安全監控」Tab
2. 實作 Tab 切換邏輯

### Phase 2: Statistics & Timeline
1. 實作 loadSecurityStats() 函數
2. 實作 loadSecurityTimeline() 函數
3. 使用 Chart.js 繪製時間軸圖表

### Phase 3: Events Table
1. 實作 loadSecurityEvents() 函數
2. 實作分頁邏輯
3. 實作過濾邏輯

### Phase 4: IP Management
1. 實作 blockIP() 函數
2. 實作 unblockIP() 函數
3. 實作 loadIPDetail() 函數
4. 實作 IP 詳情 Modal

### Phase 5: Export
1. 實作 exportSecurityEvents() 函數
2. 處理 CSV 下載

## Acceptance Criteria

### Functional Requirements
- [ ] 安全監控 Tab 正常顯示
- [ ] 統計卡片顯示正確數據
- [ ] 時間軸圖表正確繪製
- [ ] 事件列表正確顯示
- [ ] 分頁功能正常
- [ ] 過濾功能正常
- [ ] IP 封鎖功能正常
- [ ] IP 解封功能正常
- [ ] IP 詳情 Modal 正常顯示
- [ ] CSV 匯出功能正常

### Non-Functional Requirements
- [ ] 自動刷新機制正常
- [ ] 錯誤處理正確
- [ ] Loading 狀態顯示
- [ ] 響應式設計正常
- [ ] 與現有名片管理功能不衝突

## Files to Modify

1. **workers/public/admin-dashboard.html**
   - 新增安全監控 Tab HTML 結構
   - 新增 Chart.js CDN
   - 新增安全監控相關 JavaScript

2. **workers/public/js/api.js** (如需要)
   - 新增安全監控 API 函數

## Testing Checklist

- [ ] 本地測試所有功能
- [ ] 測試 API 錯誤處理
- [ ] 測試自動刷新
- [ ] 測試分頁和過濾
- [ ] 測試 IP 封鎖/解封
- [ ] 測試 CSV 匯出
- [ ] 測試響應式設計
