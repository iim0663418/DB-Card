# BDD Spec: Core Web Vitals Monitoring

## Priority: P2 (Monitoring Feature)

## Scenario 1: 前端收集 Web Vitals 數據

**Given**: 
- 使用者訪問 card-display.html
- 瀏覽器支援 Performance API

**When**: 
- 頁面載入完成
- FCP, LCP, TTI 事件觸發

**Then**: 
- 收集效能指標
- 發送到後端 API
- 不影響使用者體驗

**Implementation**:
- File: `workers/public/js/web-vitals.js`
- 使用 web-vitals 庫或原生 Performance API
- 非阻塞發送

---

## Scenario 2: 後端接收並儲存數據

**Given**: 
- 前端發送 Web Vitals 數據

**When**: 
- POST /api/analytics/vitals

**Then**: 
- 驗證數據格式
- 儲存到 D1 Database
- 回傳 204 No Content

**Implementation**:
- File: `workers/src/handlers/analytics.ts`
- Table: `web_vitals` (metric, value, timestamp, page)

---

## Scenario 3: 管理介面顯示統計

**Given**: 
- 管理員登入後台

**When**: 
- 訪問監控面板

**Then**: 
- 顯示 FCP, LCP, TTI 平均值
- 顯示 P75, P95 百分位數
- 顯示趨勢圖表

**Implementation**:
- File: `workers/public/admin-dashboard.html`
- API: GET /api/admin/analytics/vitals
- 顯示最近 7 天數據

---

## Acceptance Criteria

1. ✅ 前端收集 FCP, LCP, TTI
2. ✅ 數據發送不阻塞頁面
3. ✅ 後端 API 正確儲存
4. ✅ 管理介面顯示統計
5. ✅ 符合 Core Web Vitals 標準
