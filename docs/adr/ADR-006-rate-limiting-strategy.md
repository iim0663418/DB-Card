# ADR-006: Rate Limiting Strategy - Durable Objects vs. Official API

**Date**: 2026-03-04  
**Status**: Accepted  
**Decision Makers**: Architecture Team  
**Related**: v4.6.0 Idempotency Migration, KG: 260226|Idempotency|optimization|KV_To_Durable_Objects_Migration

---

## Context

Cloudflare 於 2026 年初推出官方 [Workers Rate Limiting API](https://developer.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)，提供原生的 rate limiting 支援。我們評估是否應從現有的 Durable Objects 自建方案遷移到官方 API。

### 現有實作

專案目前使用三層 rate limiting 架構：

1. **Durable Objects** (`rate-limiter.ts`)
   - 強一致性 sliding window counter
   - 支援任意時間窗口
   - 整合 idempotency key caching (v4.6.0+)
   - 延遲: ~5ms

2. **KV Middleware** (`rate-limit.ts`)
   - 錯誤響應 rate limiting (404/401/403)
   - 使用者操作 rate limiting (create/edit)
   - 時間窗口: 60s (errors), 3600s (user ops)

3. **DO Utility** (`rate-limit-do.ts`)
   - NFC tap rate limiting
   - 時間窗口: 86400000ms (24 hours)
   - 維度: card_uuid (500/day), ip (600/day)

### 官方 API 特性

```toml
[[ratelimits]]
name = "MY_RATE_LIMITER"
namespace_id = "1001"

  [ratelimits.simple]
  limit = 100
  period = 60  # 只能是 10 或 60
```

**優勢**:
- 簡單配置 (wrangler.toml)
- 本地快取，無網路請求
- 基於 rate limiting rules 基礎設施

**限制**:
- ❌ **period 僅支援 10 或 60 秒**
- ⚠️ 最終一致性 (per-location)
- ⚠️ 無 idempotency 支援

---

## Decision

**保持現有 Durable Objects 方案，不遷移到官方 API。**

---

## Rationale

### 1. 時間窗口需求不匹配

專案需要多種時間窗口：

| 場景 | 需求 | 官方 API 支援 |
|------|------|--------------|
| 錯誤響應 | 60s | ✅ 支援 |
| 使用者操作 | 3600s (1h) | ❌ **不支援** |
| NFC tap | 86400s (24h) | ❌ **不支援** |

官方 API 的 `period` 限制為 **10 或 60 秒**，無法滿足 1 小時和 24 小時的需求。

### 2. 現有方案已優化

v4.6.0 遷移後的效能指標：

```
KV writes:     500/day → 0/day (100% 減少)
延遲:          50ms → 5ms (90% 改善)
一致性:        最終一致 → 強一致
功能整合:      Rate Limiting + Idempotency (單一 DO)
```

### 3. 強一致性需求

NFC tap rate limiting 需要**強一致性**：
- 防止同一張卡片在短時間內被多次觸碰
- Durable Objects 提供 per-key 強一致性
- 官方 API 是 per-location 最終一致性

### 4. Idempotency 整合

v4.6.0 已將 idempotency key caching 整合到 `RateLimiterDO`：
- 單一 DO 處理兩種功能
- 減少 DO 實例數量
- 統一的 alarm() 清理機制

遷移到官方 API 會失去這個整合優勢。

---

## Consequences

### Positive

- ✅ 保持靈活的時間窗口支援 (1h, 24h)
- ✅ 維持強一致性保證
- ✅ 保留 idempotency 整合
- ✅ 避免遷移成本 (估計 8-12 小時)

### Negative

- ⚠️ 需要維護自建 Durable Objects 代碼
- ⚠️ 無法利用官方 API 的簡化配置

### Neutral

- 📊 延遲差異可忽略 (5ms vs. 本地快取)
- 📊 兩者都基於 Cloudflare 基礎設施

---

## Alternatives Considered

### Alternative 1: 混合方案

**方案**: 錯誤響應使用官方 API (60s)，其他使用 DO

**拒絕原因**:
- 增加架構複雜度
- 收益有限 (錯誤響應不是熱路徑)
- 維護兩套系統

### Alternative 2: 多層級 Rate Limiting

**方案**: 官方 API (60s) + DO (1h/24h) 雙層防護

**拒絕原因**:
- 過度設計
- 增加延遲
- 使用者體驗變差 (可能被兩次 rate limit)

---

## Implementation Notes

### 保持現狀的維護要點

1. **監控 DO 使用量**
   - 每月檢查 DO requests 和 storage
   - 確保在 Free Tier 範圍內

2. **定期評估官方 API**
   - 追蹤官方 API 更新
   - 若支援更長 period，重新評估

3. **文檔更新**
   - 在 README 中說明 rate limiting 架構
   - 記錄為何不使用官方 API

---

## References

- [Cloudflare Workers Rate Limiting API](https://developer.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [v4.6.0 Idempotency Migration](../../CHANGELOG.md#v460-2026-02-26)
- [KG: 260226|Idempotency|optimization|KV_To_Durable_Objects_Migration](../../.specify/memory/knowledge_graph.mem)
- [rate-limiter.ts](../../workers/src/durable-objects/rate-limiter.ts)
- [rate-limit-do.ts](../../workers/src/utils/rate-limit-do.ts)

---

## Review Schedule

- **Next Review**: 2026-Q3 (6 months)
- **Trigger**: 官方 API 支援更長 period
- **Owner**: Architecture Team
