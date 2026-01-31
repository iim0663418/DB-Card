# KV 資源調用深度分析與優化規劃
**分析日期**: 2026-01-30  
**當前狀態**: 已使用 50% 免費額度  
**免費額度**: 100,000 writes/day, 1,000,000 reads/day

---

## 📊 KV 操作全景掃描

### 1️⃣ **Rate Limiting** (最高消耗源)
**文件**: `utils/rate-limit.ts`, `handlers/tap.ts`

#### 操作模式
```typescript
// 每次 NFC Tap 執行 4 次 KV 操作
checkRateLimit(card_uuid, hour)  // 1 read
checkRateLimit(ip, hour)         // 1 read
incrementRateLimit(card_uuid)    // 1 write
incrementRateLimit(ip)           // 1 write
```

#### 當前配置
- **Window**: Hour-only (3600s)
- **Limits**: card_uuid=50/hour, ip=60/hour
- **TTL**: 7200s (2 hours)
- **Keys**: `ratelimit:card_uuid:{uuid}:hour`, `ratelimit:ip:{ip}:hour`

#### 消耗估算
| 場景 | 每日 Tap 次數 | KV Writes | KV Reads | 佔用比例 |
|------|--------------|-----------|----------|---------|
| 低流量 | 100 | 200 | 200 | 0.2% |
| 中流量 | 500 | 1,000 | 1,000 | 1% |
| **高流量** | **2,000** | **4,000** | **4,000** | **4%** |
| 極限 | 5,000 | 10,000 | 10,000 | 10% |

**結論**: 如果每日 Tap 超過 2,000 次，Rate Limiting 將成為主要消耗源。

---

### 2️⃣ **Session Budget** (中等消耗)
**文件**: `utils/session-budget.ts`, `handlers/tap.ts`

#### 操作模式
```typescript
// 每次 NFC Tap 執行 4 次 KV 操作
checkSessionBudget()
  ├─ KV.get(daily_key)    // 1 read
  └─ KV.get(monthly_key)  // 1 read

incrementSessionBudget()
  ├─ KV.put(daily_key)    // 1 write (TTL: 86400s)
  └─ KV.put(monthly_key)  // 1 write (TTL: 2678400s)
```

#### 當前配置
- **Keys**: `session:budget:{uuid}:daily:{YYYYMMDD}`, `session:budget:{uuid}:monthly:{YYYYMM}`
- **TTL**: daily=86400s (1 day), monthly=2678400s (31 days)

#### 消耗估算
| 場景 | 每日 Tap 次數 | KV Writes | KV Reads | 佔用比例 |
|------|--------------|-----------|----------|---------|
| 低流量 | 100 | 200 | 200 | 0.2% |
| 中流量 | 500 | 1,000 | 1,000 | 1% |
| **高流量** | **2,000** | **4,000** | **4,000** | **4%** |

**結論**: 與 Rate Limiting 相同量級，但 TTL 更長（daily 每日重置，monthly 每月重置）。

---

### 3️⃣ **Backend Mixed Cache** (中等消耗)
**文件**: `handlers/read.ts`

#### 操作模式
```typescript
// 每次 Read API 執行 1-2 次 KV 操作
getCachedCardData()
  ├─ KV.get(card_key)     // 1 read (cache hit → 0 decrypt)
  └─ KV.put(card_key)     // 1 write (cache miss → decrypt + cache)
```

#### 當前配置
- **Keys**: `card:{uuid}`
- **TTL**: 
  - sensitive: 0 (不快取)
  - personal: 60s
  - event: 60s

#### 消耗估算
| 場景 | 每日 Read 次數 | Cache Hit Rate | KV Writes | KV Reads | 佔用比例 |
|------|---------------|----------------|-----------|----------|---------|
| 低流量 | 500 | 80% | 100 | 500 | 0.6% |
| 中流量 | 2,000 | 80% | 400 | 2,000 | 2.4% |
| **高流量** | **5,000** | **80%** | **1,000** | **5,000** | **6%** |

**結論**: Read API 頻率通常高於 Tap API（一次 Tap 可能產生多次 Read），但 Cache Hit Rate 高可降低消耗。

---

### 4️⃣ **Retap Cache** (低消耗)
**文件**: `utils/session.ts`, `handlers/tap.ts`

#### 操作模式
```typescript
// 每次 NFC Tap 執行 1-2 次 KV 操作
getRecentSession()
  └─ KV.get(last_session_key)  // 1 read

// 僅在創建新 session 時寫入
createSession()
  └─ KV.put(last_session_key)  // 1 write (TTL: 3600s)
```

#### 當前配置
- **Keys**: `last_session:{card_uuid}`
- **TTL**: 3600s (1 hour)

#### 消耗估算
| 場景 | 每日 Tap 次數 | KV Writes | KV Reads | 佔用比例 |
|------|--------------|-----------|----------|---------|
| 低流量 | 100 | 100 | 100 | 0.2% |
| 中流量 | 500 | 500 | 500 | 1% |
| **高流量** | **2,000** | **2,000** | **2,000** | **4%** |

**結論**: 消耗量與 Tap 次數成正比，但相對較低。

---

### 5️⃣ **CardType Cache** (極低消耗)
**文件**: `handlers/tap.ts`

#### 操作模式
```typescript
// 每次 NFC Tap 執行 1 次 KV 操作（cache miss 時）
getCardType()
  └─ KV.get(card_type_key)  // 1 read (cache hit → 0 DB query)
```

#### 當前配置
- **Keys**: `card_type:{card_uuid}`
- **TTL**: 86400s (24 hours)

#### 消耗估算
| 場景 | 每日 Tap 次數 | Cache Hit Rate | KV Reads | 佔用比例 |
|------|--------------|----------------|----------|---------|
| 低流量 | 100 | 95% | 5 | 0.005% |
| 中流量 | 500 | 95% | 25 | 0.025% |
| **高流量** | **2,000** | **95%** | **100** | **0.1%** |

**結論**: 幾乎可忽略，TTL 長且 Cache Hit Rate 極高。

---

### 6️⃣ **JWKS Cache** (極低消耗)
**文件**: `utils/jwks-manager.ts`

#### 操作模式
```typescript
// 每次 OAuth Login 執行 1 次 KV 操作（cache miss 時）
getJWKS()
  ├─ KV.get(jwks_key)  // 1 read
  └─ KV.put(jwks_key)  // 1 write (cache miss)
```

#### 當前配置
- **Keys**: `jwks:google`
- **TTL**: 3600s (1 hour)

#### 消耗估算
| 場景 | 每日 Login 次數 | Cache Hit Rate | KV Writes | KV Reads | 佔用比例 |
|------|----------------|----------------|-----------|----------|---------|
| 低流量 | 10 | 99% | 0.24 | 10 | 0.01% |
| 中流量 | 50 | 99% | 1.2 | 50 | 0.05% |
| **高流量** | **100** | **99%** | **2.4** | **100** | **0.1%** |

**結論**: 幾乎可忽略，Login 頻率遠低於 Tap/Read。

---

### 7️⃣ **Discovery Cache** (極低消耗)
**文件**: `utils/oidc-discovery.ts`

#### 操作模式
```typescript
// 每次 OAuth Login 執行 1 次 KV 操作（cache miss 時）
getDiscoveryConfig()
  ├─ KV.get(discovery_key)  // 1 read
  └─ KV.put(discovery_key)  // 1 write (cache miss)
```

#### 當前配置
- **Keys**: `oidc_discovery:google`
- **TTL**: 86400s (24 hours)

#### 消耗估算
| 場景 | 每日 Login 次數 | Cache Hit Rate | KV Writes | KV Reads | 佔用比例 |
|------|----------------|----------------|-----------|----------|---------|
| 低流量 | 10 | 99.9% | 0.01 | 10 | 0.01% |
| 中流量 | 50 | 99.9% | 0.05 | 50 | 0.05% |
| **高流量** | **100** | **99.9%** | **0.1** | **100** | **0.1%** |

**結論**: 幾乎可忽略，TTL 最長且 Login 頻率低。

---

### 8️⃣ **其他 KV 操作** (低消耗)
**文件**: `handlers/admin/*.ts`, `utils/metrics.ts`

#### 包含模組
- **Admin Auth**: `setup_token_session`, `passkey_session`, `csrf_token` (TTL: 3600s)
- **Passkey Challenge**: `passkey_challenge`, `passkey_auth_challenge` (TTL: 300s)
- **Security Stats Cache**: `security:stats`, `security:timeline` (TTL: 60-300s)
- **Metrics**: `metrics:*` (TTL: 86400s)

#### 消耗估算
| 模組 | 每日操作次數 | KV Writes | KV Reads | 佔用比例 |
|------|-------------|-----------|----------|---------|
| Admin Auth | 20 | 20 | 40 | 0.06% |
| Passkey | 10 | 20 | 20 | 0.04% |
| Security Stats | 100 | 10 | 100 | 0.11% |
| Metrics | 50 | 50 | 50 | 0.1% |
| **總計** | **180** | **100** | **210** | **0.31%** |

**結論**: 管理功能使用頻率低，幾乎可忽略。

---

## 🎯 總消耗估算（高流量場景）

假設每日流量：
- **NFC Tap**: 2,000 次
- **Read API**: 5,000 次 (Cache Hit Rate: 80%)
- **OAuth Login**: 100 次

| 模組 | KV Writes | KV Reads | Write % | Read % |
|------|-----------|----------|---------|--------|
| **Rate Limiting** | 4,000 | 4,000 | 4% | 0.4% |
| **Session Budget** | 4,000 | 4,000 | 4% | 0.4% |
| **Backend Cache** | 1,000 | 5,000 | 1% | 0.5% |
| **Retap Cache** | 2,000 | 2,000 | 2% | 0.2% |
| CardType Cache | 0 | 100 | 0% | 0.01% |
| JWKS Cache | 2.4 | 100 | 0.002% | 0.01% |
| Discovery Cache | 0.1 | 100 | 0.0001% | 0.01% |
| 其他 | 100 | 210 | 0.1% | 0.02% |
| **總計** | **11,102** | **15,510** | **11.1%** | **1.55%** |

**結論**: 
- **Writes 是瓶頸**（11.1% vs 1.55%）
- **前 4 名消耗源**佔 99%：Rate Limiting (36%), Session Budget (36%), Retap Cache (18%), Backend Cache (9%)

---

## 🚀 優化方案（按優先級）

### **P0: Rate Limiting 遷移到 Durable Objects** ⚡
**目標**: 完全移除 Rate Limiting 的 KV 依賴

#### 方案 A: 遷移到 Durable Objects
```typescript
// 優點：
// - DO 免費額度 1M requests/day（遠高於 KV 100K writes/day）
// - 強一致性（KV 是最終一致性）
// - 更精確的 Sliding Window 算法

// 缺點：
// - 需要重構代碼（約 2-3 小時）
// - DO 有冷啟動延遲（首次請求 ~100ms）
```

**效果**: 
- KV Writes: -4,000/day (-36%)
- KV Reads: -4,000/day (-26%)

#### 方案 B: 延長 Rate Limiting 窗口
```typescript
// 從 1 hour 延長到 24 hours
export const RATE_LIMITS: RateLimitConfig = {
  card_uuid: { hour: 50 },  // 改為 day: 500
  ip: { hour: 60 }           // 改為 day: 600
};

// 優點：
// - 實作簡單（10 分鐘）
// - 減少 KV 寫入頻率（每日重置而非每小時）

// 缺點：
// - 限制變寬鬆（可能影響安全性）
// - KV Ops 總量不變（只是分散到 24 小時）
```

**效果**: 
- KV Writes: -3,000/day (-27%)（寫入頻率降低 75%）
- KV Reads: 不變

---

### **P1: Session Budget 優化** 📦
**目標**: 減少 KV 寫入頻率

#### 方案 A: 延長 Daily/Monthly TTL
```typescript
// 當前：daily=86400s (1 day), monthly=2678400s (31 days)
// 優化：daily=172800s (2 days), monthly=5356800s (62 days)

// 優點：
// - 減少過期後的重新寫入
// - 實作簡單（5 分鐘）

// 缺點：
// - 佔用 KV 空間稍微增加
```

**效果**: 
- KV Writes: -500/day (-4.5%)（減少過期重寫）

#### 方案 B: 批次寫入（每 10 次 Tap 寫入一次）
```typescript
// 使用 D1 作為主要計數器，KV 僅作為快取

// 優點：
// - 大幅減少 KV 寫入（90%）

// 缺點：
// - 複雜度高（需要重構）
// - 可能遺失部分計數（Worker 重啟時）
```

**效果**: 
- KV Writes: -3,600/day (-32%)

---

### **P2: Backend Cache TTL 延長** 🚀
**目標**: 提高 Cache Hit Rate，減少 Read API 調用

#### 方案
```typescript
// 當前：personal=60s, event=60s, sensitive=0
// 優化：personal=300s, event=600s, sensitive=0

const CACHE_CONFIG = {
  sensitive: 0,      // 不變（安全優先）
  personal: 300,     // 60s → 300s (5 min)
  event: 600,        // 60s → 600s (10 min)
};
```

**效果**: 
- KV Writes: -400/day (-3.6%)（Cache Miss 減少）
- KV Reads: -1,000/day (-6.5%)（Cache Hit Rate 提升）

---

### **P3: Frontend Cache TTL 延長** 🌐
**目標**: 減少 Backend Read API 調用

#### 方案
```javascript
// 當前：300s (5 min)
// 優化：3600s (1 hour)

const CACHE_TTL = 3600; // 與 ReadSession TTL 對齊
```

**效果**: 
- 間接減少 Backend Read API 調用 → 減少 KV Reads
- KV Reads: -2,000/day (-13%)（估算）

---

## 📋 實施計劃

### Phase 1: 快速優化（1 小時內完成）
1. ✅ **P2: Backend Cache TTL 延長**（5 分鐘）
2. ✅ **P3: Frontend Cache TTL 延長**（5 分鐘）
3. ✅ **P1-A: Session Budget TTL 延長**（5 分鐘）

**預期效果**: 
- KV Writes: -900/day (-8%)
- KV Reads: -3,000/day (-19%)
- **總節省**: 3,900 KV Ops/day

---

### Phase 2: 中期優化（1 週內完成）
1. ✅ **P0-B: Rate Limiting 窗口延長**（10 分鐘）

**預期效果**: 
- KV Writes: -3,000/day (-27%)
- **總節省**: 3,000 KV Ops/day

---

### Phase 3: 長期優化（2 週內完成）
1. ✅ **P0-A: Rate Limiting 遷移到 DO**（2-3 小時）

**預期效果**: 
- KV Writes: -4,000/day (-36%)
- KV Reads: -4,000/day (-26%)
- **總節省**: 8,000 KV Ops/day

---

## 🎯 最終目標

| 階段 | KV Writes | KV Reads | Write % | Read % |
|------|-----------|----------|---------|--------|
| **當前** | 11,102 | 15,510 | 11.1% | 1.55% |
| Phase 1 | 10,202 | 12,510 | 10.2% | 1.25% |
| Phase 2 | 7,202 | 12,510 | 7.2% | 1.25% |
| **Phase 3** | **3,202** | **8,510** | **3.2%** | **0.85%** |

**最終節省**: 
- KV Writes: -71% (11,102 → 3,202)
- KV Reads: -45% (15,510 → 8,510)
- **安全邊際**: 從 11.1% 降至 3.2%（可承受 3x 流量增長）

---

## ✅ 建議行動

**立即執行 Phase 1**（1 小時內完成，無風險）：
1. Backend Cache TTL: 60s → 300s/600s
2. Frontend Cache TTL: 300s → 3600s
3. Session Budget TTL: 延長 2x

**預期效果**: 節省 ~35% KV Ops，將當前使用量從 50% 降至 ~33%。

**是否開始實施？**
