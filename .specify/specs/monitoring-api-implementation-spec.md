# 監控 API 後端實作規格

**版本**: v1.0  
**日期**: 2026-01-28  
**目標**: 實作最小可用監控系統（Phase 1）

---

## 📁 檔案結構

```
workers/src/
├── handlers/admin/
│   └── monitoring.ts          # 新增：監控 API handlers
├── utils/
│   └── metrics.ts             # 新增：KV 計數器工具
├── middleware/
│   └── metrics-middleware.ts  # 新增：自動記錄中間件
└── types.ts                   # 更新：新增監控相關類型
```

---

## 🔧 實作細節

### 1. `utils/metrics.ts` - KV 計數器工具

**職責**: 提供 KV 計數器的讀寫操作

```typescript
// KV Key 常數
export const METRICS_KEYS = {
  UPLOAD_SUCCESS: 'metrics:upload:success:count',
  UPLOAD_FAILED: 'metrics:upload:failed:count',
  UPLOAD_DURATION: 'metrics:upload:duration:sum',
  UPLOAD_SIZE: 'metrics:upload:size:sum',
  
  READ_SUCCESS: 'metrics:read:success:count',
  READ_FAILED: 'metrics:read:failed:count',
  READ_DURATION: 'metrics:read:duration:sum',
  
  RATE_LIMIT_UPLOAD: 'metrics:rate_limit:upload:count',
  RATE_LIMIT_READ: 'metrics:rate_limit:read:count',
  
  ERROR_PREFIX: 'metrics:errors:',
  TIMELINE_PREFIX: 'metrics:timeline:'
};

// TTL 常數
export const METRICS_TTL = {
  COUNTER: 86400,      // 24 小時
  TIMELINE: 604800     // 7 天
};

/**
 * 遞增計數器
 */
export async function incrementCounter(
  env: Env,
  key: string,
  increment: number = 1
): Promise<void> {
  const current = parseInt(await env.KV.get(key) || '0');
  await env.KV.put(key, String(current + increment), {
    expirationTtl: METRICS_TTL.COUNTER
  });
}

/**
 * 累加數值（用於 duration, size）
 */
export async function addToSum(
  env: Env,
  key: string,
  value: number
): Promise<void> {
  const current = parseFloat(await env.KV.get(key) || '0');
  await env.KV.put(key, String(current + value), {
    expirationTtl: METRICS_TTL.COUNTER
  });
}

/**
 * 記錄時間序列數據
 */
export async function recordTimeline(
  env: Env,
  metric: string,
  success: number,
  failed: number
): Promise<void> {
  const hour = Math.floor(Date.now() / 3600000);
  const key = `${METRICS_KEYS.TIMELINE_PREFIX}${metric}:${hour}`;
  
  // 讀取現有數據
  const existing = await env.KV.get(key);
  const data = existing ? JSON.parse(existing) : { success: 0, failed: 0 };
  
  // 累加
  data.success += success;
  data.failed += failed;
  
  await env.KV.put(key, JSON.stringify(data), {
    expirationTtl: METRICS_TTL.TIMELINE
  });
}

/**
 * 批次讀取計數器
 */
export async function getCounters(
  env: Env,
  keys: string[]
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  
  // 並行讀取
  const values = await Promise.all(
    keys.map(key => env.KV.get(key))
  );
  
  keys.forEach((key, index) => {
    results[key] = parseInt(values[index] || '0');
  });
  
  return results;
}
```

---

### 2. `middleware/metrics-middleware.ts` - 自動記錄中間件

**職責**: 在 API 處理前後自動記錄指標

```typescript
import { incrementCounter, addToSum, recordTimeline } from '../utils/metrics';

/**
 * 記錄上傳指標
 */
export async function recordUploadMetrics(
  env: Env,
  success: boolean,
  duration: number,
  fileSize?: number,
  errorType?: string
): Promise<void> {
  if (success) {
    await Promise.all([
      incrementCounter(env, METRICS_KEYS.UPLOAD_SUCCESS),
      addToSum(env, METRICS_KEYS.UPLOAD_DURATION, duration),
      fileSize ? addToSum(env, METRICS_KEYS.UPLOAD_SIZE, fileSize) : Promise.resolve(),
      recordTimeline(env, 'upload', 1, 0)
    ]);
  } else {
    await Promise.all([
      incrementCounter(env, METRICS_KEYS.UPLOAD_FAILED),
      errorType ? incrementCounter(env, `${METRICS_KEYS.ERROR_PREFIX}${errorType}`) : Promise.resolve(),
      recordTimeline(env, 'upload', 0, 1)
    ]);
  }
}

/**
 * 記錄讀取指標
 */
export async function recordReadMetrics(
  env: Env,
  success: boolean,
  duration: number,
  errorType?: string
): Promise<void> {
  if (success) {
    await Promise.all([
      incrementCounter(env, METRICS_KEYS.READ_SUCCESS),
      addToSum(env, METRICS_KEYS.READ_DURATION, duration),
      recordTimeline(env, 'read', 1, 0)
    ]);
  } else {
    await Promise.all([
      incrementCounter(env, METRICS_KEYS.READ_FAILED),
      errorType ? incrementCounter(env, `${METRICS_KEYS.ERROR_PREFIX}${errorType}`) : Promise.resolve(),
      recordTimeline(env, 'read', 0, 1)
    ]);
  }
}

/**
 * 記錄 Rate Limiting 觸發
 */
export async function recordRateLimitTrigger(
  env: Env,
  type: 'upload' | 'read'
): Promise<void> {
  const key = type === 'upload' 
    ? METRICS_KEYS.RATE_LIMIT_UPLOAD 
    : METRICS_KEYS.RATE_LIMIT_READ;
  
  await incrementCounter(env, key);
}
```

---

### 3. `handlers/admin/monitoring.ts` - 監控 API

**職責**: 實作 4 個監控 API 端點

```typescript
import { verifySetupToken } from '../../middleware/auth';
import { getCounters, METRICS_KEYS } from '../../utils/metrics';

/**
 * GET /api/admin/monitoring/overview
 */
export async function handleMonitoringOverview(
  request: Request,
  env: Env
): Promise<Response> {
  // 驗證管理員
  const isAuthorized = await verifySetupToken(request, env);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 檢查快取
  const cacheKey = 'cache:monitoring:overview';
  const cached = await env.KV.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 批次讀取所有計數器
  const counters = await getCounters(env, [
    METRICS_KEYS.UPLOAD_SUCCESS,
    METRICS_KEYS.UPLOAD_FAILED,
    METRICS_KEYS.UPLOAD_DURATION,
    METRICS_KEYS.UPLOAD_SIZE,
    METRICS_KEYS.READ_SUCCESS,
    METRICS_KEYS.READ_FAILED,
    METRICS_KEYS.READ_DURATION,
    METRICS_KEYS.RATE_LIMIT_UPLOAD,
    METRICS_KEYS.RATE_LIMIT_READ
  ]);
  
  // 計算統計數據
  const uploadTotal = counters[METRICS_KEYS.UPLOAD_SUCCESS] + counters[METRICS_KEYS.UPLOAD_FAILED];
  const uploadSuccessRate = uploadTotal > 0 
    ? (counters[METRICS_KEYS.UPLOAD_SUCCESS] / uploadTotal) * 100 
    : 100;
  
  const readTotal = counters[METRICS_KEYS.READ_SUCCESS] + counters[METRICS_KEYS.READ_FAILED];
  const readSuccessRate = readTotal > 0 
    ? (counters[METRICS_KEYS.READ_SUCCESS] / readTotal) * 100 
    : 100;
  
  const avgUploadDuration = uploadTotal > 0 
    ? counters[METRICS_KEYS.UPLOAD_DURATION] / uploadTotal 
    : 0;
  
  const avgUploadSize = counters[METRICS_KEYS.UPLOAD_SUCCESS] > 0 
    ? counters[METRICS_KEYS.UPLOAD_SIZE] / counters[METRICS_KEYS.UPLOAD_SUCCESS] 
    : 0;
  
  const avgReadDuration = readTotal > 0 
    ? counters[METRICS_KEYS.READ_DURATION] / readTotal 
    : 0;
  
  const rateLimitTotal = counters[METRICS_KEYS.RATE_LIMIT_UPLOAD] + counters[METRICS_KEYS.RATE_LIMIT_READ];
  const rateLimitTriggerRate = (uploadTotal + readTotal) > 0 
    ? (rateLimitTotal / (uploadTotal + readTotal)) * 100 
    : 0;
  
  // 檢查告警
  const alerts = checkAlerts({
    uploadSuccessRate,
    readSuccessRate,
    avgUploadDuration,
    avgReadDuration
  });
  
  // 構建回應
  const response = {
    timestamp: new Date().toISOString(),
    period: '24h',
    upload: {
      total: uploadTotal,
      success: counters[METRICS_KEYS.UPLOAD_SUCCESS],
      failed: counters[METRICS_KEYS.UPLOAD_FAILED],
      success_rate: parseFloat(uploadSuccessRate.toFixed(2)),
      avg_size: Math.round(avgUploadSize),
      avg_duration: Math.round(avgUploadDuration)
    },
    read: {
      total: readTotal,
      success: counters[METRICS_KEYS.READ_SUCCESS],
      failed: counters[METRICS_KEYS.READ_FAILED],
      success_rate: parseFloat(readSuccessRate.toFixed(2)),
      avg_duration: Math.round(avgReadDuration)
    },
    rate_limit: {
      upload_triggered: counters[METRICS_KEYS.RATE_LIMIT_UPLOAD],
      read_triggered: counters[METRICS_KEYS.RATE_LIMIT_READ],
      trigger_rate: parseFloat(rateLimitTriggerRate.toFixed(2))
    },
    alerts
  };
  
  const responseBody = JSON.stringify(response);
  
  // 快取 60 秒
  await env.KV.put(cacheKey, responseBody, { expirationTtl: 60 });
  
  return new Response(responseBody, {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * GET /api/admin/monitoring/health
 */
export async function handleMonitoringHealth(
  request: Request,
  env: Env
): Promise<Response> {
  // 驗證管理員
  const isAuthorized = await verifySetupToken(request, env);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 檢查快取
  const cacheKey = 'cache:monitoring:health';
  const cached = await env.KV.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 健康檢查
  const checks = await performHealthChecks(env);
  
  // 讀取關鍵指標
  const counters = await getCounters(env, [
    METRICS_KEYS.UPLOAD_SUCCESS,
    METRICS_KEYS.UPLOAD_FAILED,
    METRICS_KEYS.READ_SUCCESS,
    METRICS_KEYS.READ_FAILED
  ]);
  
  const uploadTotal = counters[METRICS_KEYS.UPLOAD_SUCCESS] + counters[METRICS_KEYS.UPLOAD_FAILED];
  const uploadSuccessRate = uploadTotal > 0 
    ? (counters[METRICS_KEYS.UPLOAD_SUCCESS] / uploadTotal) * 100 
    : 100;
  
  const readTotal = counters[METRICS_KEYS.READ_SUCCESS] + counters[METRICS_KEYS.READ_FAILED];
  const readSuccessRate = readTotal > 0 
    ? (counters[METRICS_KEYS.READ_SUCCESS] / readTotal) * 100 
    : 100;
  
  const errorRate = (uploadTotal + readTotal) > 0 
    ? ((counters[METRICS_KEYS.UPLOAD_FAILED] + counters[METRICS_KEYS.READ_FAILED]) / (uploadTotal + readTotal)) * 100 
    : 0;
  
  // 判斷整體狀態
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (checks.database.status === 'error' || checks.r2.status === 'error' || checks.kv.status === 'error') {
    status = 'unhealthy';
  } else if (uploadSuccessRate < 90 || readSuccessRate < 95 || errorRate > 5) {
    status = 'degraded';
  }
  
  const response = {
    status,
    timestamp: new Date().toISOString(),
    checks,
    metrics: {
      upload_success_rate: parseFloat(uploadSuccessRate.toFixed(2)),
      read_success_rate: parseFloat(readSuccessRate.toFixed(2)),
      error_rate: parseFloat(errorRate.toFixed(2))
    }
  };
  
  const responseBody = JSON.stringify(response);
  
  // 快取 30 秒
  await env.KV.put(cacheKey, responseBody, { expirationTtl: 30 });
  
  return new Response(responseBody, {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
    });
}

/**
 * 執行健康檢查
 */
async function performHealthChecks(env: Env) {
  const checks = {
    database: { status: 'ok' as 'ok' | 'error', latency: 0 },
    r2: { status: 'ok' as 'ok' | 'error', latency: 0 },
    kv: { status: 'ok' as 'ok' | 'error', latency: 0 }
  };
  
  // Database check
  try {
    const start = Date.now();
    await env.DB.prepare('SELECT 1').first();
    checks.database.latency = Date.now() - start;
  } catch (error) {
    checks.database.status = 'error';
  }
  
  // R2 check (list operation)
  try {
    const start = Date.now();
    await env.PHYSICAL_CARDS.list({ limit: 1 });
    checks.r2.latency = Date.now() - start;
  } catch (error) {
    checks.r2.status = 'error';
  }
  
  // KV check
  try {
    const start = Date.now();
    await env.KV.get('health_check');
    checks.kv.latency = Date.now() - start;
  } catch (error) {
    checks.kv.status = 'error';
  }
  
  return checks;
}

/**
 * 檢查告警規則
 */
function checkAlerts(metrics: {
  uploadSuccessRate: number;
  readSuccessRate: number;
  avgUploadDuration: number;
  avgReadDuration: number;
}): Array<any> {
  const alerts = [];
  
  // 上傳成功率
  if (metrics.uploadSuccessRate < 90) {
    alerts.push({
      level: 'critical',
      message: `Upload success rate critically low: ${metrics.uploadSuccessRate.toFixed(2)}%`,
      metric: 'upload_success_rate',
      value: metrics.uploadSuccessRate,
      threshold: 90,
      timestamp: new Date().toISOString()
    });
  } else if (metrics.uploadSuccessRate < 95) {
    alerts.push({
      level: 'warning',
      message: `Upload success rate below target: ${metrics.uploadSuccessRate.toFixed(2)}%`,
      metric: 'upload_success_rate',
      value: metrics.uploadSuccessRate,
      threshold: 95,
      timestamp: new Date().toISOString()
    });
  }
  
  // 讀取成功率
  if (metrics.readSuccessRate < 95) {
    alerts.push({
      level: 'critical',
      message: `Read success rate critically low: ${metrics.readSuccessRate.toFixed(2)}%`,
      metric: 'read_success_rate',
      value: metrics.readSuccessRate,
      threshold: 95,
      timestamp: new Date().toISOString()
    });
  } else if (metrics.readSuccessRate < 99) {
    alerts.push({
      level: 'warning',
      message: `Read success rate below target: ${metrics.readSuccessRate.toFixed(2)}%`,
      metric: 'read_success_rate',
      value: metrics.readSuccessRate,
      threshold: 99,
      timestamp: new Date().toISOString()
    });
  }
  
  // 上傳延遲
  if (metrics.avgUploadDuration > 5000) {
    alerts.push({
      level: 'warning',
      message: `Upload average duration too high: ${Math.round(metrics.avgUploadDuration)}ms`,
      metric: 'upload_avg_duration',
      value: metrics.avgUploadDuration,
      threshold: 5000,
      timestamp: new Date().toISOString()
    });
  }
  
  // 讀取延遲
  if (metrics.avgReadDuration > 1000) {
    alerts.push({
      level: 'warning',
      message: `Read average duration too high: ${Math.round(metrics.avgReadDuration)}ms`,
      metric: 'read_avg_duration',
      value: metrics.avgReadDuration,
      threshold: 1000,
      timestamp: new Date().toISOString()
    });
  }
  
  return alerts;
}
```

---

### 4. 整合至現有 API

**修改 `handlers/admin/assets.ts`**:

```typescript
import { recordUploadMetrics, recordRateLimitTrigger } from '../../middleware/metrics-middleware';

export async function handleAssetUpload(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();
  
  try {
    // ... 現有邏輯
    
    // Rate Limiting 觸發
    if (currentCount >= RATE_LIMIT_MAX) {
      await recordRateLimitTrigger(env, 'upload');
      return new Response(...);
    }
    
    // ... 上傳處理
    
    // 成功
    const duration = Date.now() - startTime;
    await recordUploadMetrics(env, true, duration, file.size);
    
    return new Response(...);
    
  } catch (error) {
    // 失敗
    const duration = Date.now() - startTime;
    const errorType = getErrorType(error);
    await recordUploadMetrics(env, false, duration, undefined, errorType);
    
    throw error;
  }
}
```

---

## 📝 實作檢查清單

### Phase 1: 核心功能
- [ ] 創建 `utils/metrics.ts`
- [ ] 創建 `middleware/metrics-middleware.ts`
- [ ] 創建 `handlers/admin/monitoring.ts`
- [ ] 實作 `handleMonitoringOverview()`
- [ ] 實作 `handleMonitoringHealth()`
- [ ] 整合至 `handleAssetUpload()`
- [ ] 整合至 `handleAssetContent()`
- [ ] 更新 `index.ts` 路由
- [ ] TypeScript 編譯測試

### Phase 2: 測試
- [ ] 單元測試（metrics 工具）
- [ ] 整合測試（API 端點）
- [ ] 負載測試（KV 寫入效能）

---

## 🎯 驗收標準

- [ ] API 回應時間 < 200ms
- [ ] KV 寫入不阻塞主流程
- [ ] 所有 BDD scenarios 通過
- [ ] TypeScript 編譯無錯誤
- [ ] 快取策略正確實作

---

**規格版本**: v1.0  
**預計時間**: 2-3 小時  
**優先級**: 🔴 高
