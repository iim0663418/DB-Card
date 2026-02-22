# AI 摘要成本優化與價值創造 - 最終規劃文檔

版本: v3.1.1 (Production Pricing Update)  
日期: 2026-02-22  
狀態: 待實施  
變更: 修正 7 個技術缺陷 + 更新實際模型定價與 API 結構

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 📋 執行摘要

核心策略: 實測驅動 + 穩健設計 + 分層降級

預期成效: 
- 成本優化：依實測數據決定（預估 P50: 10-20%, P90: 40-50%）
- 品質保證：無降級（透過降級策略保護）
- 實施週期：7-9 週（含 2 週基線量測）

✨ v3.1.1 變更摘要:
- 修正匿名化與刪除衝突（雙層索引 + 軟刪除）
- 補充完整計費欄位（tokens, web_search_queries, cost）
- 增加 FTS 同步機制（Trigger + Reindex）
- 定義標籤系統 Schema（關聯表 + 索引）
- 快取鍵增加地區維度（country_code/locale）
- 補充留存計算管道（Cohort + Daily Job）
- 完善 TTL 強制失效機制（查詢過濾 + 定時清理）
- **更新實際模型定價**（Gemini 3 Flash Preview 官方定價）
- **修正 API 結構**（googleSearch tool 實際欄位）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 🎯 Phase 0: 基礎設施（Week 1, 10 小時）

### 1. 量測系統 (5 小時) ✨ +2h

#### 1.1 事件定義
```typescript
// 即時事件（匿名化）
interface MetricsEvent {
  event_id: string,                    // UUID
  user_id_hash: string,                // SHA256(user_email + daily_salt)
  user_deletion_key: string,           // ✨ SHA256(user_email + static_secret) - 永久不變
  deleted_at: number | null,           // ✨ 軟刪除時間戳
  timestamp: number
}

interface OCRCalledEvent extends MetricsEvent {
  type: 'ai.ocr.called',
  upload_id: string,
  duration_ms: number,
  
  // ✨ 計費欄位（實際 API 結構）
  model: 'gemini-3-flash-preview',
  input_tokens: number,
  output_tokens: number,
  thoughts_tokens: number,              // ✨ Thinking tokens（已包含在 total 中）
  web_search_queries: number,           // ✨ 實際搜尋次數（過濾空字串）
  estimated_cost_usd: number
}

interface EnrichCalledEvent extends MetricsEvent {
  type: 'ai.enrich.called',
  upload_id: string,
  organization_hash: string,           // SHA256(normalized_org)
  duration_ms: number,
  has_cache: boolean,
  
  // ✨ 計費欄位（實際 API 結構）
  model: 'gemini-3-flash-preview',
  input_tokens: number,
  output_tokens: number,
  thoughts_tokens: number,              // ✨ Thinking tokens
  web_search_queries: number,           // ✨ 實際搜尋次數
  estimated_cost_usd: number,          // 若 has_cache=true，則為 0
  cache_saved_usd: number              // ✨ 快取節省金額
}

interface CacheHitEvent extends MetricsEvent {
  type: 'ai.enrich.cache_hit',
  organization_hash: string
}

interface EnrichSkippedEvent extends MetricsEvent {
  type: 'ai.enrich.skipped',
  upload_id: string,
  reason: 'user' | 'timeout' | 'error' | 'circuit_breaker'
}

interface CardSavedEvent extends MetricsEvent {
  type: 'card.saved',
  upload_id: string,
  has_ai_summary: boolean,
  fields_count: number,
  time_to_save_ms: number,
  ocr_quality: 'high' | 'medium' | 'low'
}
```

#### 1.2 離線聚合指標（每日計算）
```typescript
interface DailyMetrics {
  date: string,
  
  // 成本指標（詳細）✨
  total_cards: number,
  ocr_calls: number,
  enrich_calls: number,
  cache_hit_rate: number,
  
  total_cost_usd: number,              // ✨ 總成本
  ocr_cost_usd: number,                // ✨ OCR 成本
  enrich_cost_usd: number,             // ✨ Enrich 成本
  cache_saved_usd: number,             // ✨ 快取節省
  avg_cost_per_card: number,           // ✨ 平均每張卡成本
  
  total_input_tokens: number,          // ✨ 總輸入 tokens
  total_output_tokens: number,         // ✨ 總輸出 tokens
  total_thoughts_tokens: number,       // ✨ 總 Thinking tokens
  total_web_search_queries: number,    // ✨ 總 Google Search 查詢
  
  // 品質指標
  avg_fields_per_card: number,
  ocr_quality_distribution: {
    high: number,
    medium: number,
    low: number
  },
  
  // 使用者行為
  total_users: number,
  avg_cards_per_user: number,
  ai_skip_rate: number,
  
  // 效能指標
  avg_ocr_duration_ms: number,
  avg_enrich_duration_ms: number,
  p95_time_to_save_ms: number
}
```

#### 1.3 資料保留政策 ✨
```typescript
// 保留期限
const RETENTION_POLICY = {
  raw_events: 90 * 24 * 60 * 60 * 1000,        // 90 天
  aggregated_metrics: 2 * 365 * 24 * 60 * 60 * 1000,  // 2 年
  soft_delete_grace: 30 * 24 * 60 * 60 * 1000  // ✨ 軟刪除緩衝期 30 天
};

// 匿名化策略
function generateUserHash(email: string, date: string): string {
  const dailySalt = sha256(date + DAILY_SALT_SECRET);
  return sha256(email + dailySalt);
}

function generateDeletionKey(email: string): string {
  return sha256(email + STATIC_DELETION_SECRET);  // ✨ 永久不變
}

// ✨ 刪除流程
async function deleteUserData(userEmail: string, db: D1Database) {
  const deletionKey = generateDeletionKey(userEmail);
  const now = Date.now();
  
  // 1. 軟刪除事件
  await db.prepare(`
    UPDATE metrics_events 
    SET deleted_at = ?, user_id_hash = 'DELETED'
    WHERE user_deletion_key = ? AND deleted_at IS NULL
  `).bind(now, deletionKey).run();
  
  // 2. 標記聚合表需重算
  await db.prepare(`
    UPDATE daily_metrics 
    SET recalculation_needed = 1
    WHERE date >= (
      SELECT MIN(DATE(timestamp/1000, 'unixepoch')) 
      FROM metrics_events 
      WHERE user_deletion_key = ?
    )
  `).bind(deletionKey).run();
  
  // 3. 刪除快取
  await db.prepare(`
    DELETE FROM company_summary_cache 
    WHERE user_email = ?
  `).bind(userEmail).run();
  
  // 4. 刪除別名
  await db.prepare(`
    DELETE FROM organization_aliases 
    WHERE user_email = ?
  `).bind(userEmail).run();
}

// ✨ 定時物理刪除（Cron Job 每日執行）
async function purgeDeletedEvents(db: D1Database) {
  const cutoff = Date.now() - RETENTION_POLICY.soft_delete_grace;
  
  await db.prepare(`
    DELETE FROM metrics_events 
    WHERE deleted_at < ? AND deleted_at IS NOT NULL
  `).bind(cutoff).run();
}
```

#### 1.4 成本計算函式 ✨
```typescript
// Gemini 3 Flash Preview Pricing (2026-02-22 官方定價)
const PRICING = {
  'gemini-3-flash-preview': {
    input_per_1m: 0.50,          // $0.50 per 1M tokens
    output_per_1m: 3.00,         // $3.00 per 1M tokens
    search_per_query: 0.014,     // $14 per 1,000 queries = $0.014 per query
    free_searches_per_month: 5000  // 前 5,000 次免費
  }
};

function calculateCost(
  model: string, 
  inputTokens: number, 
  outputTokens: number, 
  webSearchQueries: number,
  monthlySearchCount: number = 0  // 當月累計搜尋次數
): number {
  const price = PRICING[model];
  if (!price) throw new Error(`Unknown model: ${model}`);
  
  // Token 成本
  const tokenCost = (
    (inputTokens / 1_000_000) * price.input_per_1m +
    (outputTokens / 1_000_000) * price.output_per_1m
  );
  
  // Search 成本（扣除免費額度）
  const billableSearches = Math.max(
    0, 
    monthlySearchCount + webSearchQueries - price.free_searches_per_month
  );
  const searchCost = billableSearches * price.search_per_query;
  
  return tokenCost + searchCost;
}

// 從 API Response 提取計費資訊
function extractBillingInfo(response: GeminiResponse): BillingInfo {
  const { usageMetadata, groundingMetadata } = response;
  
  // 過濾空字串，計算實際搜尋次數
  const webSearchQueries = groundingMetadata?.webSearchQueries
    ?.filter(q => q && q.trim().length > 0)
    ?.length || 0;
  
  return {
    input_tokens: usageMetadata.promptTokenCount,
    output_tokens: usageMetadata.candidatesTokenCount,
    thoughts_tokens: usageMetadata.thoughtsTokenCount || 0,
    web_search_queries: webSearchQueries,
    total_tokens: usageMetadata.totalTokenCount
  };
}

// 事件記錄範例
async function logOCREvent(
  userEmail: string,
  uploadId: string,
  response: GeminiResponse,
  duration: number,
  monthlySearchCount: number,
  db: D1Database
) {
  const billing = extractBillingInfo(response);
  const cost = calculateCost(
    'gemini-3-flash-preview',
    billing.input_tokens,
    billing.output_tokens,
    billing.web_search_queries,
    monthlySearchCount
  );
  
  await db.prepare(`
    INSERT INTO metrics_events (
      event_id, type, user_id_hash, user_deletion_key,
      upload_id, duration_ms, model, input_tokens, output_tokens,
      thoughts_tokens, web_search_queries, estimated_cost_usd, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    'ai.ocr.called',
    generateUserHash(userEmail, new Date().toISOString().split('T')[0]),
    generateDeletionKey(userEmail),
    uploadId,
    duration,
    'gemini-3-flash-preview',
    billing.input_tokens,
    billing.output_tokens,
    billing.thoughts_tokens,
    billing.web_search_queries,
    cost,
    Date.now()
  ).run();
}

// API Response 型別定義
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>,
      role: string
    },
    finishReason: string,
    groundingMetadata?: {
      webSearchQueries: string[],      // ✨ 實際欄位名稱
      groundingChunks: Array<{
        web: { uri: string, title: string }
      }>,
      groundingSupports: Array<{
        segment: { text: string, endIndex: number },
        groundingChunkIndices: number[]
      }>
    }
  }>,
  usageMetadata: {
    promptTokenCount: number,
    candidatesTokenCount: number,
    totalTokenCount: number,
    thoughtsTokenCount?: number        // ✨ Thinking tokens
  }
}

interface BillingInfo {
  input_tokens: number,
  output_tokens: number,
  thoughts_tokens: number,
  web_search_queries: number,
  total_tokens: number
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


### 2. 失敗處理系統 (5 小時) ✨ +1h

#### 2.1 分層熔斷機制
```typescript
// 三層熔斷
interface CircuitBreaker {
  level: 'model' | 'region' | 'tenant',
  key: string,
  state: 'closed' | 'open' | 'half-open',
  error_count: number,
  success_count: number,
  last_failure_time: number,
  config: {
    error_threshold: number,
    request_threshold: number,
    timeout_ms: number,
    half_open_max_calls: number
  }
}

// 熔斷條件
const CIRCUIT_BREAKER_CONFIG = {
  model: {
    key_pattern: 'gemini-ocr' | 'gemini-enrich',
    error_threshold: 0.8,
    request_threshold: 500,
    timeout_ms: 60000,
    half_open_max_calls: 5
  },
  region: {
    key_pattern: 'gemini-ocr:asia' | 'gemini-enrich:us',
    error_threshold: 0.6,
    request_threshold: 200,
    timeout_ms: 30000,
    half_open_max_calls: 3
  },
  tenant: {
    key_pattern: 'gemini-ocr:user_hash',
    error_threshold: 0.5,
    request_threshold: 10,
    timeout_ms: 15000,
    half_open_max_calls: 2
  }
};
```

#### 2.2 降級策略
```typescript
// API 超時
if (timeout) {
  return {
    company_summary: null,
    personal_summary: null,
    error: 'AI_TIMEOUT',
    fallback: 'ocr_only',
    retry_after: 60
  };
}

// 熔斷開啟
if (circuitBreaker.isOpen()) {
  return {
    company_summary: null,
    personal_summary: null,
    error: 'SERVICE_DEGRADED',
    fallback: 'ocr_only',
    retry_after: circuitBreaker.getRetryAfter()
  };
}

// 配額耗盡
if (quotaExceeded) {
  return {
    company_summary: null,
    personal_summary: null,
    error: 'AI_QUOTA_EXCEEDED',
    fallback: 'basic_info_only',
    retry_after: null  // 無法重試
  };
}
```

#### 2.3 動態告警門檻
```typescript
interface AlertConfig {
  metric: string,
  baseline_window_days: 7,
  deviation_threshold: number,
  min_sample_size: number,
  warmup_period_hours: number
}

// 告警配置
const ALERTS: AlertConfig[] = [
  {
    metric: 'cache_hit_rate',
    baseline_window_days: 7,
    deviation_threshold: -0.3,  // -30% 相對下降
    min_sample_size: 100,
    warmup_period_hours: 24
  },
  {
    metric: 'cost_per_card',
    baseline_window_days: 7,
    deviation_threshold: 0.5,   // +50% 相對上升
    min_sample_size: 50,
    warmup_period_hours: 48
  },
  {
    metric: 'ai_error_rate',
    baseline_window_days: 7,
    deviation_threshold: 1.0,   // +100% 相對上升
    min_sample_size: 20,
    warmup_period_hours: 12
  },
  {
    metric: 'p95_latency',
    baseline_window_days: 7,
    deviation_threshold: 0.5,   // +50% 相對上升
    min_sample_size: 100,
    warmup_period_hours: 24
  }
];
```

#### 2.4 TTL 強制失效機制 ✨
```typescript
// 查詢時過濾過期
async function getCachedSummary(key: CacheKey, kv: KVNamespace): Promise<CacheValue | null> {
  const cached = await kv.get<CacheValue>(buildCacheKey(key));
  
  if (!cached) return null;
  
  // 檢查 TTL
  const now = Date.now();
  if (now - cached.created_at > cached.ttl) {
    // 過期，異步刪除
    kv.delete(buildCacheKey(key));  // 不等待
    return null;
  }
  
  return cached;
}

// Cron Job: 每日清理過期快取
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (event.cron === '0 4 * * *') {  // 每日 4:00 AM UTC
      await cleanExpiredCache(env.CACHE);
    }
  }
};

async function cleanExpiredCache(kv: KVNamespace) {
  const cursor = kv.list({ prefix: 'cache:company:' });
  const now = Date.now();
  let deletedCount = 0;
  
  for await (const key of cursor.keys) {
    const value = await kv.get<CacheValue>(key.name);
    if (value && now - value.created_at > value.ttl) {
      await kv.delete(key.name);
      deletedCount++;
    }
  }
  
  console.log(`[Cache Cleanup] Deleted ${deletedCount} expired entries`);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 📊 Phase 1: 基線量測（Week 2-3, 0 小時開發）

### 目標
收集 2 週實際使用數據，建立可靠基線

### 量測指標

#### 成本指標 ✨
- 每張名片平均成本（含 token 與 grounding 細分）
- OCR vs Enrich 成本比例
- 每日總成本
- 快取節省金額（若已有快取）

#### 使用者行為
- 公司重複率分佈（P50/P75/P90/P95）
- AI 跳過率
- 平均處理時間
- 地區分佈（若可推斷）✨

#### 品質指標
- OCR 品質分佈
- 欄位完整度
- 使用者編輯率

### 決策點
基於量測結果決定：
1. 是否實施快取（若重複率 < 20%，ROI 不足）
2. 快取策略參數（TTL、正規化規則、地區維度）✨
3. 成本優化目標（分層設定：P50/P90）
4. 是否需要地區隔離（若跨國使用率 > 10%）✨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 🚀 Phase 2: 成本優化（Week 4-5, 11 小時）✨ +2h

### 3. 公司摘要快取 (6 小時) ✨ +1h

#### 3.1 保守正規化
```typescript
function normalizeOrganization(org: string): string {
  return org
    .trim()
    .replace(/\s+/g, ' ')           // 多空格 → 單空格
    .replace(/[　]/g, ' ')          // 全形空格 → 半形
    .toLowerCase();
  // 保留特殊字元、標點符號
}
```

#### 3.2 快取鍵設計 ✨
```typescript
interface CacheKey {
  user_email: string,              // 租戶隔離
  normalized_org: string,          // 正規化公司名
  model_version: string,           // 'gemini-3-flash-preview'
  summary_type: 'company',         // 只快取 company_summary
  
  // ✨ 新增可選維度
  country_code?: string,           // ISO 3166-1 alpha-2 (e.g., 'TW', 'US')
  locale?: string                  // BCP 47 (e.g., 'zh-TW', 'en-US')
}

interface CacheValue {
  company_summary: string,
  ai_sources_json: string,
  created_at: number,
  ttl: number                      // 30 * 24 * 60 * 60 * 1000 (30 天)
}

// ✨ 從 OCR 結果推斷地區
function inferCountry(ocr: OCRData): string | undefined {
  // 電話號碼前綴
  if (ocr.phone?.startsWith('+886')) return 'TW';
  if (ocr.phone?.startsWith('+1')) return 'US';
  if (ocr.phone?.startsWith('+86')) return 'CN';
  if (ocr.phone?.startsWith('+81')) return 'JP';
  
  // 地址關鍵字
  if (ocr.address?.includes('台灣') || ocr.address?.includes('Taiwan')) return 'TW';
  if (ocr.address?.includes('中国') || ocr.address?.includes('China')) return 'CN';
  
  return undefined;
}

// ✨ 快取查詢邏輯（含地區 Fallback）
async function getCachedSummary(key: CacheKey, kv: KVNamespace): Promise<CacheValue | null> {
  // 1. 精確匹配（含地區）
  if (key.country_code) {
    const exact = await getCachedSummaryInternal({ ...key }, kv);
    if (exact) return exact;
  }
  
  // 2. Fallback 到無地區版本
  const fallback = await getCachedSummaryInternal(
    { ...key, country_code: undefined, locale: undefined }, 
    kv
  );
  return fallback;
}

function buildCacheKey(key: CacheKey): string {
  const parts = [
    'cache:company',
    key.user_email,
    key.normalized_org,
    key.model_version
  ];
  
  if (key.country_code) parts.push(key.country_code);
  if (key.locale) parts.push(key.locale);
  
  return parts.join(':');
}
```

#### 3.3 別名表機制
```typescript
// 使用者確認流程
if (cacheNotFound && similarOrgExists) {
  showConfirmDialog({
    message: `是否與「${similarOrg}」為同一公司？`,
    onConfirm: () => {
      createAlias(currentOrg, similarOrg);
      reuseCache(similarOrg);
    },
    onReject: () => {
      callAPI();
    }
  });
}

// 別名表結構
interface OrganizationAlias {
  user_email: string,
  canonical: string,      // 標準名稱
  aliases: string[],      // 別名列表
  created_at: number
}
```

#### 3.4 監控指標
- 快取命中率（整體 + 分層）
- 快取大小
- 別名表使用率
- 成本節省金額
- 地區分佈命中率 ✨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


### 4. 智慧跳過優化 (5 小時) ✨ +1h

#### 4.1 OCR 品質評估（無 confidence 降級版）
```typescript
function assessOCRQuality(ocr: OCRData): 'high' | 'medium' | 'low' {
  // 必填欄位檢查
  const hasName = ocr.full_name && ocr.full_name.length > 1;
  const hasOrg = ocr.organization && ocr.organization.length > 2;
  const hasContact = ocr.email || ocr.phone;
  
  // 格式驗證
  const emailValid = ocr.email ? 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ocr.email) : false;
  const phoneValid = ocr.phone ? 
    /^[\d\s\-\+\(\)]{8,}$/.test(ocr.phone) : false;
  const urlValid = ocr.website ? 
    /^https?:\/\/.+\..+/.test(ocr.website) : false;
  
  // 品質判斷
  if (hasName && hasOrg && hasContact && (emailValid || phoneValid)) {
    return 'high';
  } else if (hasName && hasOrg) {
    return 'medium';
  } else {
    return 'low';
  }
}
```

#### 4.2 跳過按鈕顯示策略
```typescript
const quality = assessOCRQuality(ocrResult);

if (quality === 'high') {
  showSkipButton({
    delay: 5000,
    message: '資訊完整，可直接儲存',
    confidence: 'high'
  });
} else if (quality === 'medium') {
  showSkipButton({
    delay: 10000,
    message: '建議等待 AI 補充公司資訊',
    confidence: 'medium'
  });
} else {
  showSkipButton({
    delay: 15000,
    message: '資訊不完整，強烈建議等待 AI',
    confidence: 'low'
  });
}
```

#### 4.3 A/B 測試設計
```typescript
// 實驗組：智慧跳過
// Group A (50%):
//   - 使用品質評估邏輯
//   - 動態調整延遲時間

// 對照組：固定跳過
// Group B (50%):
//   - 固定 8 秒顯示跳過按鈕
//   - 無品質提示

// 量測指標
interface ABTestMetrics {
  group: 'A' | 'B',
  ai_skip_rate: number,
  avg_fields_per_card: number,
  user_edit_rate: number,
  satisfaction_score?: number
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 📈 Phase 3: 價值創造（Week 6-8, 18 小時）✨ +5h

### 5. AI 摘要全文搜尋 (9 小時) ✨ +2h

#### 5.1 搜尋範圍
- 姓名（full_name, first_name, last_name）
- 公司（organization）
- 職稱（title）
- AI 摘要（company_summary, personal_summary）
- 備註（note）

#### 5.2 實作方案 ✨
```sql
-- Migration 0025_fts_sync.sql

-- 1. 建立 FTS 表
CREATE VIRTUAL TABLE received_cards_fts USING fts5(
  uuid UNINDEXED,
  full_name,
  organization,
  title,
  company_summary,
  personal_summary,
  note,
  content='received_cards',
  content_rowid='rowid'
);

-- 2. INSERT Trigger
CREATE TRIGGER received_cards_fts_insert AFTER INSERT ON received_cards BEGIN
  INSERT INTO received_cards_fts(
    rowid, uuid, full_name, organization, title, 
    company_summary, personal_summary, note
  )
  VALUES (
    new.rowid, new.uuid, new.full_name, new.organization, new.title,
    new.company_summary, new.personal_summary, new.note
  );
END;

-- 3. UPDATE Trigger
CREATE TRIGGER received_cards_fts_update AFTER UPDATE ON received_cards BEGIN
  UPDATE received_cards_fts 
  SET 
    full_name = new.full_name,
    organization = new.organization,
    title = new.title,
    company_summary = new.company_summary,
    personal_summary = new.personal_summary,
    note = new.note
  WHERE rowid = new.rowid;
END;

-- 4. DELETE Trigger
CREATE TRIGGER received_cards_fts_delete AFTER DELETE ON received_cards BEGIN
  DELETE FROM received_cards_fts WHERE rowid = old.rowid;
END;

-- 5. 初始回填
INSERT INTO received_cards_fts(rowid, uuid, full_name, organization, title, company_summary, personal_summary, note)
SELECT rowid, uuid, full_name, organization, title, company_summary, personal_summary, note
FROM received_cards;
```

#### 5.3 Reindex 作業 ✨
```typescript
// Cron Job: 每週日 5:00 AM UTC 重建索引
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (event.cron === '0 5 * * 0') {  // 每週日
      await rebuildFTS(env.DB);
    }
  }
};

async function rebuildFTS(db: D1Database) {
  console.log('[FTS Reindex] Starting...');
  
  await db.batch([
    db.prepare('DELETE FROM received_cards_fts'),
    db.prepare(`
      INSERT INTO received_cards_fts(rowid, uuid, full_name, organization, title, company_summary, personal_summary, note)
      SELECT rowid, uuid, full_name, organization, title, company_summary, personal_summary, note
      FROM received_cards
    `)
  ]);
  
  console.log('[FTS Reindex] Completed');
}
```

#### 5.4 前端 UI
```typescript
// 搜尋 API
async function searchCards(query: string, db: D1Database): Promise<Card[]> {
  const results = await db.prepare(`
    SELECT c.* 
    FROM received_cards c
    JOIN received_cards_fts fts ON c.rowid = fts.rowid
    WHERE received_cards_fts MATCH ?
    ORDER BY rank
    LIMIT 20
  `).bind(query).all();
  
  return results.results as Card[];
}

// 前端實作
interface SearchUIConfig {
  debounce_ms: 300,
  min_query_length: 2,
  max_results: 20,
  highlight_enabled: true
}

// 搜尋框（即時搜尋，300ms debounce）
// 結果高亮（匹配關鍵字）
// 篩選器（依公司、職稱）
// 排序（相關度、時間）
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


### 6. 公司標籤系統 (9 小時) ✨ +3h

#### 6.1 Schema 定義 ✨
```sql
-- Migration 0026_tags_system.sql

-- 1. 標籤關聯表
CREATE TABLE card_tags (
  card_uuid TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (card_uuid, tag),
  FOREIGN KEY (card_uuid) REFERENCES received_cards(uuid) ON DELETE CASCADE
);

CREATE INDEX idx_card_tags_tag ON card_tags(tag);
CREATE INDEX idx_card_tags_card ON card_tags(card_uuid);

-- 2. 標籤統計表（快取）
CREATE TABLE tag_stats (
  tag TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  last_updated INTEGER NOT NULL
);

CREATE INDEX idx_tag_stats_count ON tag_stats(count DESC);
```

#### 6.2 標籤提取
```typescript
// 簡單版本：關鍵字匹配
function extractTags(summary: string): string[] {
  const keywords = [
    '金融科技', 'AI', '區塊鏈', '永續發展',
    '半導體', '生技', '電商', '教育科技',
    'SaaS', 'B2B', 'B2C', '製造業',
    '新創', '上市公司', '跨國企業'
  ];
  
  return keywords.filter(k => summary.includes(k));
}

// 進階版本：使用 Gemini API（可選）
async function extractTagsAI(summary: string): Promise<string[]> {
  const prompt = `從以下公司摘要提取 3-5 個關鍵標籤（產業、技術、規模）：\n${summary}`;
  
  const response = await callGemini({
    model: 'gemini-2.0-flash-exp',
    prompt,
    max_tokens: 50
  });
  
  return response.text.split(',').map(t => t.trim());
}
```

#### 6.3 回填策略 ✨
```typescript
// Cron Job: 每日 6:00 AM UTC 回填標籤
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (event.cron === '0 6 * * *') {
      await backfillTags(env.DB);
    }
  }
};

async function backfillTags(db: D1Database) {
  const BATCH_SIZE = 100;
  let offset = 0;
  let totalProcessed = 0;
  
  console.log('[Tag Backfill] Starting...');
  
  while (true) {
    const cards = await db.prepare(`
      SELECT uuid, company_summary 
      FROM received_cards 
      WHERE company_summary IS NOT NULL 
      AND uuid NOT IN (SELECT DISTINCT card_uuid FROM card_tags)
      LIMIT ? OFFSET ?
    `).bind(BATCH_SIZE, offset).all();
    
    if (cards.results.length === 0) break;
    
    const statements = [];
    for (const card of cards.results) {
      const tags = extractTags(card.company_summary);
      for (const tag of tags) {
        statements.push(
          db.prepare('INSERT OR IGNORE INTO card_tags (card_uuid, tag, created_at) VALUES (?, ?, ?)')
            .bind(card.uuid, tag, Date.now())
        );
      }
    }
    
    if (statements.length > 0) {
      await db.batch(statements);
    }
    
    totalProcessed += cards.results.length;
    offset += BATCH_SIZE;
  }
  
  // 更新統計
  await db.prepare(`
    INSERT OR REPLACE INTO tag_stats (tag, count, last_updated)
    SELECT tag, COUNT(*), ? FROM card_tags GROUP BY tag
  `).bind(Date.now()).run();
  
  console.log(`[Tag Backfill] Completed. Processed ${totalProcessed} cards`);
}
```

#### 6.4 標籤顯示
- 卡片上顯示標籤（最多 3 個）
- 點擊標籤篩選相同標籤的名片
- 標籤雲（顯示所有標籤及數量）
- 標籤管理（使用者可手動新增/刪除）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


### 7. 留存率計算管道 (新增) ✨

#### 7.1 Schema 定義
```sql
-- Migration 0027_retention_cohorts.sql

CREATE TABLE user_cohorts (
  user_email TEXT NOT NULL,
  cohort_date TEXT NOT NULL,        -- YYYY-MM-DD (首次使用日)
  first_card_at INTEGER NOT NULL,
  PRIMARY KEY (user_email, cohort_date)
);

CREATE TABLE retention_metrics (
  cohort_date TEXT NOT NULL,
  day_offset INTEGER NOT NULL,      -- 0, 1, 7, 30
  retained_users INTEGER NOT NULL,
  total_cohort_users INTEGER NOT NULL,
  retention_rate REAL NOT NULL,
  calculated_at INTEGER NOT NULL,
  PRIMARY KEY (cohort_date, day_offset)
);

CREATE INDEX idx_cohorts_date ON user_cohorts(cohort_date);
CREATE INDEX idx_retention_date ON retention_metrics(cohort_date);
```

#### 7.2 Cohort 建立
```typescript
// 當使用者首次儲存名片時
async function recordFirstCard(userEmail: string, db: D1Database) {
  const today = new Date().toISOString().split('T')[0];
  
  await db.prepare(`
    INSERT OR IGNORE INTO user_cohorts (user_email, cohort_date, first_card_at)
    VALUES (?, ?, ?)
  `).bind(userEmail, today, Date.now()).run();
}
```

#### 7.3 留存計算 Cron Job
```typescript
// Cron: 每日 3:00 AM UTC
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (event.cron === '0 3 * * *') {
      await calculateRetention(env.DB);
    }
  }
};

async function calculateRetention(db: D1Database) {
  const today = new Date().toISOString().split('T')[0];
  
  console.log('[Retention] Calculating D1, D7, D30...');
  
  // 計算 D1, D7, D30 留存
  for (const dayOffset of [1, 7, 30]) {
    const cohortDate = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    
    const result = await db.prepare(`
      WITH cohort AS (
        SELECT user_email FROM user_cohorts WHERE cohort_date = ?
      ),
      retained AS (
        SELECT DISTINCT user_id_hash 
        FROM metrics_events 
        WHERE DATE(timestamp/1000, 'unixepoch') = ?
        AND user_deletion_key IN (
          SELECT SHA256(user_email || ?) FROM cohort
        )
        AND deleted_at IS NULL
      )
      SELECT 
        (SELECT COUNT(*) FROM cohort) as total,
        (SELECT COUNT(*) FROM retained) as retained
    `).bind(cohortDate, today, STATIC_DELETION_SECRET).first();
    
    if (result.total > 0) {
      await db.prepare(`
        INSERT OR REPLACE INTO retention_metrics 
        (cohort_date, day_offset, retained_users, total_cohort_users, retention_rate, calculated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        cohortDate,
        dayOffset,
        result.retained,
        result.total,
        result.retained / result.total,
        Date.now()
      ).run();
      
      console.log(`[Retention] D${dayOffset} for ${cohortDate}: ${(result.retained / result.total * 100).toFixed(1)}%`);
    }
  }
}
```

#### 7.4 Admin Dashboard 顯示
```typescript
// API: GET /api/admin/analytics/retention
async function getRetentionMetrics(db: D1Database): Promise<RetentionData[]> {
  const results = await db.prepare(`
    SELECT 
      cohort_date,
      MAX(CASE WHEN day_offset = 1 THEN retention_rate END) as d1,
      MAX(CASE WHEN day_offset = 7 THEN retention_rate END) as d7,
      MAX(CASE WHEN day_offset = 30 THEN retention_rate END) as d30,
      MAX(total_cohort_users) as cohort_size
    FROM retention_metrics
    WHERE cohort_date >= DATE('now', '-90 days')
    GROUP BY cohort_date
    ORDER BY cohort_date DESC
  `).all();
  
  return results.results;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 📊 成功指標

### Phase 0-1 (基礎設施 + 基線)
- ✅ 所有事件正確埋點（含計費欄位）✨
- ✅ 聚合指標每日更新
- ✅ 告警系統運作正常
- ✅ 收集 2 週完整數據
- ✅ 軟刪除機制驗證通過 ✨
- ✅ TTL 清理 Job 正常運作 ✨

### Phase 2 (成本優化)
- 快取命中率 > 基線重複率的 80%
- 成本降低達到預測目標（P50/P90）
- 品質指標無降級（編輯率不上升）
- AI 跳過率提升 20-30%
- 地區隔離命中率 > 90%（若啟用）✨

### Phase 3 (價值創造)
- 搜尋使用率 > 30%（活躍使用者）
- 標籤點擊率 > 20%
- D7 留存率提升 10-15%
- 使用者回饋正面
- FTS 同步延遲 < 1 秒 ✨
- 標籤回填完成率 100% ✨
- 留存計算準確率 100% ✨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## ⚠️ 風險與緩解

### 風險 1: 快取命中率低於預期
緩解: 基線量測後再決定是否實施

### 風險 2: 正規化規則誤合併公司
緩解: 保守正規化 + 別名表 + 使用者確認

### 風險 3: OCR 品質評估不準確
緩解: A/B 測試驗證 + 持續調整門檻

### 風險 4: 搜尋效能問題
緩解: FTS 索引 + 分頁 + 快取熱門查詢

### 風險 5: 標籤提取品質差
緩解: 關鍵字匹配 → AI 提取（漸進式）

### 風險 6: 軟刪除導致資料膨脹 ✨
緩解: 30 天自動物理刪除 + 定時清理 Job

### 風險 7: FTS Trigger 失效導致搜尋漂移 ✨
緩解: 每週自動 Reindex + 監控同步延遲

### 風險 8: 地區推斷錯誤導致快取誤命中 ✨
緩解: Fallback 機制 + 使用者可手動指定地區

### 風險 9: 留存計算效能問題 ✨
緩解: 增量計算 + 索引優化 + 非高峰時段執行

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 📅 時間表 ✨

| 週次 | 階段 | 工作內容 | 工時 | 變更 |
|------|------|----------|------|------|
| Week 1 | Phase 0 | 量測系統 + 失敗處理 + TTL 機制 | 10h | +3h |
| Week 2-3 | Phase 1 | 基線量測（無開發） | 0h | - |
| Week 4 | 決策點 | 評估數據，決定實施策略 | 2h | - |
| Week 4-5 | Phase 2 | 快取（含地區）+ 智慧跳過 | 11h | +2h |
| Week 6-8 | Phase 3 | 搜尋（含 Trigger）+ 標籤（含 Schema）+ 留存 | 18h | +5h |

**總工時**: 41 小時（原 31 小時，+10 小時）  
**總週期**: 7-9 週（原 8 週，因複雜度增加可能延長）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 📦 Migration 清單 ✨

### Phase 0
- `0024_metrics_deletion_key.sql` - 新增 user_deletion_key 與 deleted_at 欄位
- `0024_metrics_cost_fields.sql` - 新增計費欄位（tokens, grounding, cost）

### Phase 2
- `0025_company_summary_cache.sql` - 快取表（含地區維度）
- `0025_organization_aliases.sql` - 別名表

### Phase 3
- `0026_fts_sync.sql` - FTS 表 + 3 個 Trigger
- `0027_tags_system.sql` - 標籤關聯表 + 統計表
- `0028_retention_cohorts.sql` - Cohort 表 + 留存指標表

**總計**: 7 個 Migration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 🔧 Cron Job 清單 ✨

| 時間 | 任務 | 頻率 | 用途 |
|------|------|------|------|
| 02:00 UTC | 聚合指標計算 | 每日 | 計算 daily_metrics |
| 03:00 UTC | 留存率計算 | 每日 | 計算 D1/D7/D30 留存 |
| 04:00 UTC | 快取清理 | 每日 | 刪除過期快取 |
| 05:00 UTC | FTS Reindex | 每週日 | 重建全文搜尋索引 |
| 06:00 UTC | 標籤回填 | 每日 | 為新名片生成標籤 |
| 07:00 UTC | 軟刪除清理 | 每日 | 物理刪除 30 天前的軟刪除記錄 |

**總計**: 6 個 Cron Job

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 📝 v3.1 變更日誌

### 修正項目

#### High Priority (3 項)
1. **匿名化與刪除衝突** - 新增 `user_deletion_key` 雙層索引 + 軟刪除機制
2. **成本指標資料不足** - 補充 tokens、grounding、cost 欄位 + 計算函式
3. **FTS 同步機制缺失** - 新增 3 個 Trigger + 每週 Reindex Job
4. **標籤系統 Schema 未定義** - 新增 Migration 0027 + 關聯表設計

#### Medium Priority (2 項)
5. **快取鍵缺少地區維度** - 新增 country_code/locale + Fallback 邏輯
6. **留存計算管道未定義** - 新增 Cohort Schema + Daily Job

#### Low Priority (2 項)
7. **TTL 強制失效機制** - 新增查詢過濾 + 定時清理 Job

### 工時調整
- Phase 0: 7h → 10h (+3h)
- Phase 2: 9h → 11h (+2h)
- Phase 3: 13h → 18h (+5h)
- **總計**: 31h → 41h (+10h)

### 新增內容
- 7 個 Migration 腳本
- 6 個 Cron Job
- 完整的刪除流程設計
- 地區推斷邏輯
- FTS 同步機制
- 留存率計算管道

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## ✅ 實施檢查清單

### Phase 0 準備
- [ ] 建立 `metrics_events` 表（含 deletion_key）
- [ ] 建立 `daily_metrics` 表（含成本欄位）
- [ ] 實作事件埋點（OCR/Enrich/Cache/Skip/Save）
- [ ] 實作成本計算函式
- [ ] 實作軟刪除流程
- [ ] 設定 6 個 Cron Job
- [ ] 部署到 Staging 驗證

### Phase 1 量測
- [ ] 收集 2 週數據
- [ ] 分析公司重複率
- [ ] 分析地區分佈
- [ ] 決策會議（Go/No-Go）

### Phase 2 優化
- [ ] 執行 Migration 0025（快取 + 別名）
- [ ] 實作快取邏輯（含地區 Fallback）
- [ ] 實作智慧跳過（含 A/B 測試）
- [ ] 部署到 Staging 驗證
- [ ] 監控 1 週，確認成本下降

### Phase 3 價值
- [ ] 執行 Migration 0026-0028（FTS + 標籤 + 留存）
- [ ] 實作搜尋 API + UI
- [ ] 實作標籤系統 + 回填 Job
- [ ] 實作留存計算 Job
- [ ] 部署到 Staging 驗證
- [ ] 監控 2 週，確認留存提升

### Production 部署
- [ ] 所有 Migration 執行完成
- [ ] 所有 Cron Job 正常運作
- [ ] 監控告警設定完成
- [ ] 回滾計畫準備完成
- [ ] 部署到 Production
- [ ] 監控 4 週，確認穩定

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 📞 聯絡資訊

- **專案**: DB-Card NFC Digital Business Card System
- **版本**: v4.6.0 → v4.7.0 (AI Cost Optimization)
- **文檔版本**: v3.1 (Technical Review Patch)
- **最後更新**: 2026-02-22

---

**審查狀態**: ✅ 已通過技術審查（7 個缺陷已修正）  
**實施狀態**: ⏳ 待開始（需先完成 Phase 10 E2E Testing）  
**預期完成**: 2026-04 ~ 2026-05（7-9 週）


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 📝 v3.1.1 變更日誌

### 修正項目（v3.1）

#### High Priority (4 項)
1. **匿名化與刪除衝突** - 新增 `user_deletion_key` 雙層索引 + 軟刪除機制
2. **成本指標資料不足** - 補充 tokens、web_search_queries、cost 欄位 + 計算函式
3. **FTS 同步機制缺失** - 新增 3 個 Trigger + 每週 Reindex Job
4. **標籤系統 Schema 未定義** - 新增 Migration 0027 + 關聯表設計

#### Medium Priority (2 項)
5. **快取鍵缺少地區維度** - 新增 country_code/locale + Fallback 邏輯
6. **留存計算管道未定義** - 新增 Cohort Schema + Daily Job

#### Low Priority (1 項)
7. **TTL 強制失效機制** - 新增查詢過濾 + 定時清理 Job

### Production Update (v3.1.1)

#### 8. 模型定價更新 ✨
**Gemini 3 Flash Preview 官方定價（2026-02-22）**

| 項目 | v3.0 假設 | v3.1.1 實際 | 差異 |
|------|----------|------------|------|
| Input | $0.01875 per 1K | $0.50 per 1M ($0.0005 per 1K) | -97.3% |
| Output | $0.075 per 1K | $3.00 per 1M ($0.003 per 1K) | -96.0% |
| Search | $0.035 per query | $0.014 per query | -60.0% |
| Free Tier | 無 | 5,000 searches/month | 新增 |

**成本影響**：
- 單張名片成本（假設 500 input + 300 output + 3 searches）：
  - v3.0: $0.009375 + $0.0225 + $0.105 = **$0.137**
  - v3.1.1: $0.00025 + $0.0009 + $0.042 = **$0.043** (-68.6%)
- 實際成本更低（因為有免費額度）

#### 9. API 結構修正 ✨
**實際 googleSearch tool 欄位**

```typescript
// ❌ v3.0 錯誤假設
groundingMetadata: {
  groundingChunks: [...],  // 錯誤：這不是計費依據
  groundingQueries: number  // 錯誤：此欄位不存在
}

// ✅ v3.1.1 實際結構
groundingMetadata: {
  webSearchQueries: string[],  // 實際欄位（含空字串）
  groundingChunks: [...],      // 搜尋結果（不是計費依據）
  groundingSupports: [...]
}

// 計費邏輯
const actualQueries = webSearchQueries.filter(q => q && q.trim().length > 0).length;
```

**新增欄位**：
- `usageMetadata.thoughtsTokenCount` - Thinking tokens（Gemini 3 新功能）
- 免費額度追蹤邏輯

### 工時調整
- Phase 0: 7h → 10h (+3h)
- Phase 2: 9h → 11h (+2h)
- Phase 3: 13h → 18h (+5h)
- **總計**: 31h → 41h (+10h)

### 新增內容
- 7 個 Migration 腳本
- 6 個 Cron Job
- 完整的刪除流程設計
- 地區推斷邏輯
- FTS 同步機制
- 留存率計算管道
- **實際 API Response 型別定義** ✨
- **免費額度追蹤邏輯** ✨
- **Thinking tokens 支援** ✨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## ✅ 實施檢查清單

### Phase 0 準備
- [ ] 建立 `metrics_events` 表（含 deletion_key + web_search_queries）
- [ ] 建立 `daily_metrics` 表（含成本欄位 + thoughts_tokens）
- [ ] 實作事件埋點（OCR/Enrich/Cache/Skip/Save）
- [ ] 實作成本計算函式（含免費額度追蹤）
- [ ] 實作軟刪除流程
- [ ] 設定 6 個 Cron Job
- [ ] 部署到 Staging 驗證

### Phase 1 量測
- [ ] 收集 2 週數據
- [ ] 分析公司重複率
- [ ] 分析地區分佈
- [ ] 分析免費額度使用率
- [ ] 決策會議（Go/No-Go）

### Phase 2 優化
- [ ] 執行 Migration 0025（快取 + 別名）
- [ ] 實作快取邏輯（含地區 Fallback）
- [ ] 實作智慧跳過（含 A/B 測試）
- [ ] 部署到 Staging 驗證
- [ ] 監控 1 週，確認成本下降

### Phase 3 價值
- [ ] 執行 Migration 0026-0028（FTS + 標籤 + 留存）
- [ ] 實作搜尋 API + UI
- [ ] 實作標籤系統 + 回填 Job
- [ ] 實作留存計算 Job
- [ ] 部署到 Staging 驗證
- [ ] 監控 2 週，確認留存提升

### Production 部署
- [ ] 所有 Migration 執行完成
- [ ] 所有 Cron Job 正常運作
- [ ] 監控告警設定完成
- [ ] 回滾計畫準備完成
- [ ] 部署到 Production
- [ ] 監控 4 週，確認穩定

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## 📞 聯絡資訊

- **專案**: DB-Card NFC Digital Business Card System
- **版本**: v4.6.0 → v4.7.0 (AI Cost Optimization)
- **文檔版本**: v3.1.1 (Production Pricing Update)
- **最後更新**: 2026-02-22

---

**審查狀態**: ✅ 已通過技術審查（7 個缺陷已修正）+ 實際定價更新  
**實施狀態**: ⏳ 待開始（需先完成 Phase 10 E2E Testing）  
**預期完成**: 2026-04 ~ 2026-05（7-9 週）

**成本預估**（基於實際定價）：
- 單張名片平均成本：$0.043（含 3 次搜尋）
- 月處理 1,000 張：$43（扣除免費額度後約 $30）
- 快取命中率 30% 後：$21/月（-51%）
