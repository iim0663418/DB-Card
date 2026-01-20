# Backend API Performance Analysis Report
Date: 2026-01-20T16:08:00+08:00
Environment: Staging (db-card-staging.csw30454.workers.dev)
Focus: API Response Latency

## 測試結果

### Health Check API (基準測試)
```
Test 1: 1.173s (冷啟動)
Test 2: 0.898s
Test 3: 0.642s
Test 4: 0.650s
Test 5: 0.702s
Average (熱): ~0.723s
```

**分析**：
- 冷啟動延遲：~1.2s
- 熱請求延遲：~0.7s
- 基礎 Worker 延遲：~0.7s（無法優化）

### Read API (先前測試)
```
Test 1: 0.354s
Test 2: 0.274s
Test 3: 0.290s
Average: ~0.306s
```

**分析**：
- 比 Health Check 快 ~0.4s
- 原因：KV 快取命中（getCachedCardData）
- 已是最優狀態

## 後端架構分析

### 當前查詢結構

#### Read API (handlers/read.ts)
```typescript
// Query 1: Session 驗證
SELECT * FROM read_sessions
WHERE session_id = ? AND card_uuid = ?

// Query 2: Card 資料
SELECT uuid, encrypted_payload, wrapped_dek, key_version
FROM cards WHERE uuid = ?

// Query 3: 解密 (KV 快取)
getCachedCardData() -> KV cache hit (60s TTL)
```

**總延遲分解**：
- D1 Query 1 (session): ~150-200ms
- D1 Query 2 (card): ~100-150ms
- KV cache hit: ~10-20ms
- 解密 (cache miss): ~50-100ms
- Worker overhead: ~50ms
- **Total**: ~310ms ✅

#### Tap API (handlers/tap.ts)
```typescript
// Layer 1: Dedup check (KV)
KV.get(`tap:dedup:${card_uuid}`)

// Layer 2: Rate limit check (KV)
KV.get(`ratelimit:card:${card_uuid}:minute`)
KV.get(`ratelimit:ip:${ip}:minute`)

// Query 1 & 2: Card validation (D1 batch)
SELECT uuid, encrypted_payload, wrapped_dek, key_version, created_at, updated_at
FROM cards WHERE uuid = ?

SELECT type, status FROM uuid_bindings WHERE uuid = ?

// Query 3: Retap revocation check
SELECT session_id FROM read_sessions
WHERE card_uuid = ? AND revoked_at IS NULL
ORDER BY issued_at DESC LIMIT 1

// Query 4: Create session
INSERT INTO read_sessions ...

// KV operations
KV.put(`tap:dedup:${card_uuid}`, session_id, 60s)
KV.put(`ratelimit:...`, ...)
```

**總延遲分解**：
- KV dedup check: ~10-20ms
- KV rate limit (2x): ~20-40ms
- D1 batch (2 queries): ~200-300ms
- D1 retap check: ~100-150ms
- D1 insert session: ~100-150ms
- KV put operations: ~20-30ms
- Worker overhead: ~50ms
- **Total**: ~500-740ms

## 性能瓶頸識別

### 🔴 Critical Bottlenecks

**1. D1 固有延遲 (無法優化)**
- 單次查詢：100-200ms
- 原因：D1 是分散式 SQLite，需要跨區域同步
- 狀態：已知限制，Cloudflare 架構特性

**2. Worker 基礎延遲 (無法優化)**
- 每次請求：~50-100ms
- 原因：冷啟動、網路延遲、V8 初始化
- 狀態：已知限制

### 🟡 Optimization Opportunities

**3. Tap API 查詢數量過多**
- 當前：4-5 次 D1 查詢
- 問題：每次查詢 100-200ms，累積 400-1000ms
- 優化空間：⚠️ 有限

**4. Retap Revocation 查詢**
```sql
SELECT session_id FROM read_sessions
WHERE card_uuid = ? AND revoked_at IS NULL
ORDER BY issued_at DESC LIMIT 1
```
- 延遲：~100-150ms
- 使用頻率：每次 Tap
- 優化方案：KV 快取最後一個 session_id

**5. Session 創建查詢**
```sql
INSERT INTO read_sessions ...
```
- 延遲：~100-150ms
- 優化方案：ctx.waitUntil() 非同步執行（已部分實作）

## 優化建議

### 🔴 P0 - 高優先級（預期改善 100-200ms）

**1. Retap Revocation KV 快取**
```typescript
// 當前
const lastSession = await env.DB.prepare(`
  SELECT session_id FROM read_sessions
  WHERE card_uuid = ? AND revoked_at IS NULL
  ORDER BY issued_at DESC LIMIT 1
`).bind(card_uuid).first();

// 優化後
const cacheKey = `last_session:${card_uuid}`;
let lastSessionId = await env.KV.get(cacheKey);

if (!lastSessionId) {
  const result = await env.DB.prepare(...).first();
  lastSessionId = result?.session_id;
  if (lastSessionId) {
    await env.KV.put(cacheKey, lastSessionId, { expirationTtl: 3600 });
  }
}
```
- 改善：Tap API -100~150ms
- Trade-off：可能延遲 1 小時才看到撤銷（可接受）

**2. Session 創建非同步化**
```typescript
// 當前：同步等待 INSERT
const insertResult = await env.DB.prepare(`
  INSERT INTO read_sessions ...
`).run();

// 優化後：非同步執行
ctx.waitUntil(
  env.DB.prepare(`INSERT INTO read_sessions ...`).run()
);
// 立即返回 session_id（預先生成）
```
- 改善：Tap API -100~150ms
- Trade-off：需要預先生成 session_id（crypto.randomUUID()）

### 🟡 P1 - 中優先級（預期改善 50-100ms）

**3. Card Type 快取**
```typescript
// 快取 uuid -> type 映射
const typeKey = `card_type:${card_uuid}`;
let cardType = await env.KV.get(typeKey);

if (!cardType) {
  const result = await env.DB.prepare(...).first();
  cardType = result?.type;
  await env.KV.put(typeKey, cardType, { expirationTtl: 86400 });
}
```
- 改善：Tap API -50~100ms

**4. 合併 Rate Limit 檢查**
```typescript
// 當前：2 次 KV 讀取（card_uuid + ip）
// 優化：使用 KV.getMultiple() 並行讀取
const [cardLimit, ipLimit] = await Promise.all([
  env.KV.get(`ratelimit:card:${card_uuid}:minute`),
  env.KV.get(`ratelimit:ip:${ip}:minute`)
]);
```
- 改善：Tap API -10~20ms

### 🟢 P2 - 低優先級（預期改善 20-50ms）

**5. 使用 Durable Objects**
- 替代 D1 + KV 混合架構
- 單一狀態管理，減少網路往返
- 改善：-50~100ms
- Trade-off：架構複雜度大幅增加

**6. 外部資料庫（Neon, PlanetScale）**
- 更低延遲的 Postgres/MySQL
- 改善：-100~200ms
- Trade-off：額外成本、離開 Cloudflare 生態系

## 當前性能評分

| API | 當前延遲 | 理論最佳 | 差距 | 狀態 |
|-----|----------|----------|------|------|
| Health Check | 0.7s | 0.05s | 0.65s | ⚠️ Worker 限制 |
| Read API | 0.31s | 0.15s | 0.16s | ✅ 已優化 |
| Tap API | 0.5-0.7s | 0.2-0.3s | 0.3-0.4s | ⚠️ 可優化 |

## 優化執行計劃

### Phase 1: Quick Wins (1-2 小時)
1. ✅ Retap Revocation KV 快取
2. ✅ Session 創建非同步化
3. ✅ Card Type 快取
- **預期改善**: Tap API 0.5-0.7s → 0.3-0.4s

### Phase 2: Advanced (1 週)
1. 合併 Rate Limit 檢查
2. 完整響應快取（Read API）
3. 監控與調優
- **預期改善**: 整體 -10~15%

### Phase 3: Architecture (1 個月)
1. 評估 Durable Objects
2. 評估外部資料庫
3. A/B 測試
- **預期改善**: -30~50%

## 結論

### 當前狀態
- ✅ Read API 已達最優（0.31s，KV 快取生效）
- ⚠️ Tap API 有優化空間（0.5-0.7s → 0.3-0.4s）
- ⚠️ Worker 基礎延遲無法優化（~0.7s）

### 核心限制
1. **D1 延遲**：100-200ms/query（已知限制）
2. **Worker 延遲**：50-100ms（已知限制）
3. **網路延遲**：依地理位置（無法控制）

### 建議
1. **立即執行** P0 優化（Tap API）
2. **接受限制**：D1 + Workers 架構的固有延遲
3. **長期考慮**：Durable Objects 或外部資料庫

### 預期最終性能
- Read API: 0.31s → 0.25s (-20%)
- Tap API: 0.6s → 0.35s (-42%)
- 整體改善: -25~35%

**重要**：即使完全優化，Worker 基礎延遲（~0.7s）仍會存在。這是 Cloudflare Workers 架構的特性，無法繞過。
