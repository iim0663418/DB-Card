# Rate Limiting 策略評估報告

**日期**: 2026-03-04  
**評估對象**: Cloudflare Workers Rate Limiting API  
**決策**: 不遷移，保持現有 Durable Objects 方案

---

## 📊 執行摘要

經過完整的技術評估，我們決定**不遷移**到 Cloudflare 官方 Rate Limiting API，原因是其 `period` 限制（僅 10s/60s）無法滿足專案的 1 小時和 24 小時時間窗口需求。

---

## 🔍 評估過程

### 1. 官方 API 調研

**文檔來源**: https://developer.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

**核心發現**:
```toml
[[ratelimits]]
name = "MY_RATE_LIMITER"
namespace_id = "1001"

  [ratelimits.simple]
  limit = 100
  period = 60  # ❌ 只能是 10 或 60
```

### 2. 現有實作分析

**三層架構**:
1. `rate-limiter.ts` (Durable Objects) - 強一致性，任意 window
2. `rate-limit.ts` (KV Middleware) - 錯誤響應 + 使用者操作
3. `rate-limit-do.ts` (DO Utility) - NFC tap (24h window)

**效能指標** (v4.6.0 優化後):
- 延遲: 5ms
- KV writes: 0/day (100% 減少)
- 一致性: 強一致性
- 功能: Rate Limiting + Idempotency 整合

---

## ❌ 不遷移的原因

### 1. 時間窗口需求不匹配 (P0)

| 場景 | 需求 | 官方 API |
|------|------|---------|
| 錯誤響應 | 60s | ✅ 支援 |
| 使用者操作 | **3600s (1h)** | ❌ **不支援** |
| NFC tap | **86400s (24h)** | ❌ **不支援** |

### 2. 現有方案已優化 (P1)

```
v4.6.0 優化成果:
- KV writes: 500/day → 0/day
- 延遲: 50ms → 5ms
- 整合: Rate Limiting + Idempotency (單一 DO)
```

### 3. 強一致性需求 (P1)

- NFC tap 需要 per-key 強一致性
- 官方 API 是 per-location 最終一致性
- Durable Objects 提供更強保證

### 4. Idempotency 整合 (P2)

- v4.6.0 已整合到 `RateLimiterDO`
- 遷移會失去這個優勢
- 需要額外維護 idempotency 系統

---

## 📝 決策記錄

**ADR-006**: Rate Limiting Strategy - Durable Objects vs. Official API

**位置**: `docs/adr/ADR-006-rate-limiting-strategy.md`

**關鍵決策**:
1. 保持現有 Durable Objects 方案
2. 不遷移到官方 API
3. 2026-Q3 重新評估（若官方 API 支援更長 period）

---

## 🔄 替代方案評估

### Alternative 1: 混合方案
- **方案**: 錯誤響應用官方 API，其他用 DO
- **拒絕**: 架構複雜度增加，收益有限

### Alternative 2: 雙層防護
- **方案**: 官方 API (60s) + DO (1h/24h)
- **拒絕**: 過度設計，使用者體驗變差

---

## ✅ 後續行動

### 短期 (2026-Q1)
- [x] 撰寫 ADR-006
- [x] 更新 Knowledge Graph
- [x] 更新 progress.md

### 中期 (2026-Q2)
- [ ] 在 README 中說明 rate limiting 架構
- [ ] 記錄為何不使用官方 API

### 長期 (2026-Q3)
- [ ] 追蹤官方 API 更新
- [ ] 若支援更長 period，重新評估

---

## 📚 參考資料

1. [Cloudflare Workers Rate Limiting API](https://developer.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
2. [v4.6.0 Idempotency Migration](../CHANGELOG.md#v460-2026-02-26)
3. [KG: 260226|Idempotency|optimization](../.specify/memory/knowledge_graph.mem)
4. [rate-limiter.ts](../workers/src/durable-objects/rate-limiter.ts)
5. [rate-limit-do.ts](../workers/src/utils/rate-limit-do.ts)

---

## 🎯 結論

**保持現有 Durable Objects 方案是正確的技術決策**，因為：

1. ✅ 滿足所有時間窗口需求 (60s, 1h, 24h)
2. ✅ 已優化至最佳效能 (5ms 延遲)
3. ✅ 提供強一致性保證
4. ✅ 整合 idempotency 功能
5. ✅ 避免不必要的遷移成本

官方 API 的 `period` 限制是無法妥協的硬性約束，直到官方支援更長的時間窗口之前，現有方案仍是最佳選擇。

---

**評估完成時間**: 2026-03-04 23:55  
**下次評估**: 2026-Q3 (6 個月後)
