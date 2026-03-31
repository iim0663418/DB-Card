# DB-Card 待辦事項清單
## 更新時間: 2026-03-12T14:45:00+08:00

## ✅ 已完成

### Phase 0: Pagination Fix
- ✅ 修復分頁邏輯（retrievalLimit 計算）
- ✅ 豐富化在分頁後執行

### Phase 1: HTTP Adapter Pattern
- ✅ 提取 SearchAgent 類別
- ✅ 56 行 HTTP handler

### Phase 2: Four-Layer Agent Architecture
- ✅ Sense → Think → Act → Remember
- ✅ 模組化結構（retrievers, rankers, enrichers）
- ✅ 11 個檔案創建
- ✅ Bug fix: organization_normalized 加入 keyword search

### Phase 3.0: Click Tracking Foundation
- ✅ click_events 表（3 個索引）
- ✅ POST /api/user/analytics/click
- ✅ 前端追蹤（fire-and-forget）
- ✅ 7 天保留期

### Phase 3.0.5a: Data Pipeline Fix
- ✅ query_event_id 追蹤（穩定連結）
- ✅ result_source 追蹤（工具成功率）
- ✅ 即時快取失效（<1s）

### Phase 3.0.5b: Realtime Hints
- ✅ RealtimeHints 介面
- ✅ Capped EMA（20 次點擊）
- ✅ Think layer 整合（保守策略）
- ✅ KV 快取（5 分鐘 TTL）

---

## 🔄 進行中

### 數據收集期（1 週）
- ⏳ 收集 100+ click_events
- ⏳ 監控 realtime hints 應用頻率
- ⏳ 驗證使用者體驗改善

---

## 📋 待辦事項

### Phase 3.1: Learn Layer（離線聚合）
**優先級**: P1  
**預估時間**: 12 小時（3 週）

**目標**: 離線聚合 user_profile，提供更穩定的個人化

**任務**:
1. Migration 0049: user_profile 表
2. Migration 0050: recent_context 表
3. Cron job: 每日聚合（03:00 UTC）
4. Learn layer: loadProfile() with KV cache
5. Sense integration: 注入 profile
6. Think integration: 使用 profile（不是 realtime hints）

**Gate**: Phase 3.0.5b 運行 1 週，100+ clicks

---

### Phase 3.2: Canary Rollout
**優先級**: P1  
**預估時間**: 4 小時

**目標**: 10% 使用者測試個人化效果

**任務**:
1. Feature flag: ENABLE_PERSONALIZATION
2. A/B test: 個人化 vs baseline
3. Metrics: CTR, latency, user satisfaction
4. User feedback: 10 位使用者調查

**Gate**: Phase 3.1 完成，無效能退化

---

### Phase 3.3: Soft Rerank（選用）
**優先級**: P2  
**預估時間**: 8 小時

**目標**: 在 Act layer 應用輕量級排序調整

**任務**:
1. Normalize rank space（所有分數 → 0-1）
2. Soft rerank: `final = base * 0.9 + pref * 0.1`
3. A/B test: 測量 CTR 改善
4. 迭代權重

**Gate**: Phase 3.2 證明 Think layer hints 有效

---

### 自動化測試（高價值）
**優先級**: P1  
**預估時間**: 3-4 小時

**目標**: E2E 測試套件防止回歸

**任務**:
1. 搜尋 API 測試
2. 點擊追蹤測試
3. Realtime hints 測試
4. CI/CD 整合

---

### 效能優化（中價值）
**優先級**: P2  
**預估時間**: 1-2 小時

**目標**: 減少延遲，優化快取

**任務**:
1. 分析瓶頸（D1 查詢、Vectorize）
2. 優化快取策略
3. 減少不必要的查詢

---

### Observability Dashboard（中價值）
**優先級**: P2  
**預估時間**: 2-3 小時

**目標**: Admin 儀表板顯示搜尋指標

**任務**:
1. CTR 圖表
2. 延遲分佈
3. Hints 應用頻率
4. 錯誤率監控

---

## 🐛 已知問題

### 無關鍵問題
- 所有高/中風險問題已修復

---

## 📊 系統狀態

### 健康指標
- ✅ TypeScript: 零錯誤
- ✅ Bundle: 1096.77 KiB / gzip: 208.78 KiB
- ✅ Worker startup: 24ms
- ✅ 搜尋功能: 100% 正常
- ✅ Click tracking: 已上線

### 部署版本
- **Staging**: `e2f00615-d4fc-4cc7-95fa-772076538e16`
- **Production**: (待部署)

### 資料庫
- **Tables**: 43 個
- **Size**: 3.64 MB
- **Migrations**: 0001-0048 (已執行)

---

## 🎯 近期目標（2 週內）

1. **監控 Phase 3.0.5b** - 收集數據，驗證效果
2. **自動化測試** - 防止回歸
3. **Phase 3.1 規劃** - 離線聚合設計

---

## 📝 備註

- Phase 3.0.5 採用保守策略，只影響 Think layer
- 所有變更都有 BDD spec 和完整測試
- 架構邊界清晰，易於 rollback
- 下一步需要等待數據累積（100+ clicks）
