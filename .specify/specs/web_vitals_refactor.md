# BDD Spec: Web Vitals Monitoring Refactor (P0)

## Scenario 1: Remove TTI and Add INP
**Given**: 當前系統使用不準確的 TTI 量測（load + 1s 估算）  
**When**: 重構 web-vitals-minimal.js  
**Then**:
- 移除 `measureTTI()` 函式
- 新增 `measureINP()` 使用 PerformanceObserver 監聽 'event' 類型
- INP 計算方式：取所有互動事件的 p98 延遲（duration）
- 若瀏覽器不支援 Event Timing API，回傳 null

## Scenario 2: Add CardContentReady Custom Metric
**Given**: 名片內容在 #main-container 顯示時才算真正可用  
**When**: main.js 移除 loading 並顯示內容  
**Then**:
- 在 `#main-container` 從 `hidden` 變為可見時，記錄 `performance.now()`
- 透過 `reportWebVitals()` 發送自訂指標：`{ name: 'CardContentReady', value: timestamp }`
- 此指標應在 LCP 之後、INP 之前觸發

## Scenario 3: Update Database Schema
**Given**: 資料庫目前儲存 FCP, LCP, TTI  
**When**: 執行 migration 0021  
**Then**:
- 新增欄位：`inp REAL`, `card_content_ready REAL`
- 移除欄位：`tti` (保留歷史資料，但不再寫入)
- 新增索引：`idx_web_vitals_inp`, `idx_web_vitals_card_content_ready`

## Scenario 4: Update API Handler
**Given**: analytics.ts 接收並儲存 vitals 資料  
**When**: 處理新的指標格式  
**Then**:
- 接受 `inp`, `card_content_ready` 欄位
- 忽略 `tti` 欄位（向後相容）
- INSERT 語句包含新欄位
- 驗證：INP 範圍 0-5000ms, CardContentReady 範圍 0-10000ms

## Scenario 5: Update Admin Dashboard
**Given**: Admin Dashboard 顯示過時的 CWV 定義  
**When**: 更新 admin-dashboard.html  
**Then**:
- 標題改為「Core Web Vitals (2024)」
- 顯示指標：LCP, INP, CLS
- 輔助指標：FCP, CardContentReady
- 移除 TTI 顯示
- 門檻值：
  - LCP: Good < 2.5s, Needs Improvement < 4s
  - INP: Good < 200ms, Needs Improvement < 500ms
  - CLS: Good < 0.1, Needs Improvement < 0.25
  - FCP: Good < 1.8s (輔助)
  - CardContentReady: Good < 1.5s (自訂)

## Acceptance Criteria
- [ ] TypeScript 編譯零錯誤
- [ ] Migration 0021 可成功執行
- [ ] web-vitals-minimal.js 不再包含 TTI 相關程式碼
- [ ] main.js 在顯示內容時發送 CardContentReady
- [ ] Admin Dashboard 正確顯示新指標
- [ ] 向後相容：舊資料仍可查詢（TTI 欄位保留）
