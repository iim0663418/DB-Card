// Monitoring API Handlers
// Provides system overview, health checks, and alerts

import type { Env, MonitoringOverview, HealthResponse, AlertItem } from '../../types';
import { verifySetupToken } from '../../middleware/auth';
import { METRICS_KEYS, METRICS_TTL, getCounters, getErrorKey } from '../../utils/metrics';

// Alert thresholds
const THRESHOLDS = {
  upload_success_rate: { critical: 90, warning: 95 },
  read_success_rate: { critical: 95, warning: 99 },
  error_rate: { critical: 5, warning: 1 },
};

/**
 * Handle monitoring overview
 * GET /api/admin/monitoring/overview
 * Scenarios: 1, 6
 */
export async function handleMonitoringOverview(
  request: Request,
  env: Env
): Promise<Response> {
  // Scenario 6: Verify admin authentication
  const isAuthorized = await verifySetupToken(request, env);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check cache (60 seconds)
  const cacheKey = 'metrics:cache:overview';
  const cached = await env.KV.get(cacheKey, 'json');
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Batch read all counters
  const keys = [
    METRICS_KEYS.UPLOAD_SUCCESS,
    METRICS_KEYS.UPLOAD_FAILED,
    METRICS_KEYS.READ_SUCCESS,
    METRICS_KEYS.READ_FAILED,
    METRICS_KEYS.RATE_LIMIT_UPLOAD,
    METRICS_KEYS.RATE_LIMIT_READ,
    // Error types
    getErrorKey('file_too_large'),
    getErrorKey('invalid_format'),
    getErrorKey('unauthorized'),
    getErrorKey('not_found'),
    getErrorKey('rate_limited'),
    getErrorKey('internal_error'),
  ];

  const counters = await getCounters(env, keys);

  // Calculate metrics
  const uploadSuccess = counters[METRICS_KEYS.UPLOAD_SUCCESS] || 0;
  const uploadFailed = counters[METRICS_KEYS.UPLOAD_FAILED] || 0;
  const uploadTotal = uploadSuccess + uploadFailed;

  const readSuccess = counters[METRICS_KEYS.READ_SUCCESS] || 0;
  const readFailed = counters[METRICS_KEYS.READ_FAILED] || 0;
  const readTotal = readSuccess + readFailed;

  const rateLimitUpload = counters[METRICS_KEYS.RATE_LIMIT_UPLOAD] || 0;
  const rateLimitRead = counters[METRICS_KEYS.RATE_LIMIT_READ] || 0;
  const rateLimitTotal = rateLimitUpload + rateLimitRead;
  const totalRequests = uploadTotal + readTotal;

  // Error breakdown
  const errorsByType: Record<string, number> = {
    file_too_large: counters[getErrorKey('file_too_large')] || 0,
    invalid_format: counters[getErrorKey('invalid_format')] || 0,
    unauthorized: counters[getErrorKey('unauthorized')] || 0,
    not_found: counters[getErrorKey('not_found')] || 0,
    rate_limited: counters[getErrorKey('rate_limited')] || 0,
    internal_error: counters[getErrorKey('internal_error')] || 0,
  };

  const totalErrors = uploadFailed + readFailed;

  // Calculate success rates first
  const uploadSuccessRate = uploadTotal > 0 ? parseFloat(((uploadSuccess / uploadTotal) * 100).toFixed(2)) : 100;
  const readSuccessRate = readTotal > 0 ? parseFloat(((readSuccess / readTotal) * 100).toFixed(2)) : 100;
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  // Build overview
  const overview: MonitoringOverview = {
    upload: {
      total: uploadTotal,
      success: uploadSuccess,
      failed: uploadFailed,
      success_rate: uploadSuccessRate,
    },
    read: {
      total: readTotal,
      success: readSuccess,
      failed: readFailed,
      success_rate: readSuccessRate,
    },
    rate_limit: {
      upload_triggered: rateLimitUpload,
      read_triggered: rateLimitRead,
      trigger_rate: totalRequests > 0 ? parseFloat(((rateLimitTotal / totalRequests) * 100).toFixed(2)) : 0,
    },
    errors: {
      total: totalErrors,
      by_type: errorsByType,
    },
    alerts: checkAlerts({
      upload_success_rate: uploadSuccessRate,
      read_success_rate: readSuccessRate,
      error_rate: errorRate,
      upload_total: uploadTotal,
      read_total: readTotal,
      total_errors: totalErrors,
      total_requests: totalRequests,
    }),
  };

  // Cache for 60 seconds
  await env.KV.put(cacheKey, JSON.stringify(overview), {
    expirationTtl: METRICS_TTL.CACHE
  });

  return new Response(JSON.stringify(overview), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle health check
 * GET /api/admin/monitoring/health
 * Scenarios: 4, 5, 6
 */
export async function handleMonitoringHealth(
  request: Request,
  env: Env
): Promise<Response> {
  // Scenario 6: Verify admin authentication
  const isAuthorized = await verifySetupToken(request, env);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check cache (30 seconds)
  const cacheKey = 'metrics:cache:health';
  const cached = await env.KV.get(cacheKey, 'json');
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Perform health checks
  const checks = await performHealthChecks(env);

  // Get metrics for alerts
  const keys = [
    METRICS_KEYS.UPLOAD_SUCCESS,
    METRICS_KEYS.UPLOAD_FAILED,
    METRICS_KEYS.READ_SUCCESS,
    METRICS_KEYS.READ_FAILED,
  ];
  const counters = await getCounters(env, keys);

  const uploadSuccess = counters[METRICS_KEYS.UPLOAD_SUCCESS] || 0;
  const uploadFailed = counters[METRICS_KEYS.UPLOAD_FAILED] || 0;
  const uploadTotal = uploadSuccess + uploadFailed;

  const readSuccess = counters[METRICS_KEYS.READ_SUCCESS] || 0;
  const readFailed = counters[METRICS_KEYS.READ_FAILED] || 0;
  const readTotal = readSuccess + readFailed;

  const totalErrors = uploadFailed + readFailed;
  const totalRequests = uploadTotal + readTotal;

  const uploadSuccessRate = uploadTotal > 0 ? (uploadSuccess / uploadTotal) * 100 : 100;
  const readSuccessRate = readTotal > 0 ? (readSuccess / readTotal) * 100 : 100;
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  // Check alerts
  const alerts = checkAlerts({
    upload_success_rate: uploadSuccessRate,
    read_success_rate: readSuccessRate,
    error_rate: errorRate,
    upload_total: uploadTotal,
    read_total: readTotal,
    total_errors: totalErrors,
    total_requests: totalRequests,
  });

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (checks.database.status === 'error' || checks.r2.status === 'error' || checks.kv.status === 'error') {
    status = 'unhealthy';
  } else if (alerts.some(alert => alert.level === 'critical')) {
    status = 'unhealthy';
  } else if (alerts.some(alert => alert.level === 'warning')) {
    status = 'degraded';
  }

  const health: HealthResponse = {
    status,
    checks,
    alerts,
    timestamp: Date.now(),
  };

  // Cache for 60 seconds (KV minimum TTL)
  await env.KV.put(cacheKey, JSON.stringify(health), {
    expirationTtl: METRICS_TTL.CACHE_HEALTH
  });

  return new Response(JSON.stringify(health), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Perform infrastructure health checks
 * Private function
 */
async function performHealthChecks(env: Env) {
  const checks = {
    database: { status: 'ok' as 'ok' | 'error', latency: 0, error: undefined as string | undefined },
    r2: { status: 'ok' as 'ok' | 'error', latency: 0, error: undefined as string | undefined },
    kv: { status: 'ok' as 'ok' | 'error', latency: 0, error: undefined as string | undefined },
  };

  // Database check
  try {
    const dbStart = Date.now();
    await env.DB.prepare('SELECT 1').first();
    checks.database.latency = Date.now() - dbStart;
  } catch (error) {
    checks.database.status = 'error';
    checks.database.error = 'Database connection failed';
  }

  // R2 check
  try {
    const r2Start = Date.now();
    // Skip R2 check if PHYSICAL_CARDS is not available (local dev)
    if (env.PHYSICAL_CARDS) {
      await env.PHYSICAL_CARDS.head('health-check');
      checks.r2.latency = Date.now() - r2Start;
    } else {
      // Mock success for local dev
      checks.r2.latency = 1;
    }
  } catch (error) {
    // 404 is expected, but connection should work
    const err = error as any;
    const r2End = Date.now();
    if (err.status === 404 || err.message?.includes('not found')) {
      checks.r2.latency = r2End;
    } else {
      checks.r2.status = 'error';
      checks.r2.error = 'R2 connection failed';
    }
  }

  // KV check
  try {
    const kvStart = Date.now();
    await env.KV.get('health-check');
    checks.kv.latency = Date.now() - kvStart;
  } catch (error) {
    checks.kv.status = 'error';
    checks.kv.error = 'KV connection failed';
  }

  return checks;
}

/**
 * Check alert rules
 * Private function
 */
function checkAlerts(metrics: {
  upload_success_rate: number;
  read_success_rate: number;
  error_rate: number;
  upload_total: number;
  read_total: number;
  total_errors: number;
  total_requests: number;
}): AlertItem[] {
  const alerts: AlertItem[] = [];

  // Only check if we have meaningful data
  const hasData = metrics.upload_total > 10 || metrics.read_total > 10;

  if (!hasData) {
    return alerts;
  }

  // Upload success rate
  if (metrics.upload_total > 0) {
    if (metrics.upload_success_rate < THRESHOLDS.upload_success_rate.critical) {
      alerts.push({
        level: 'critical',
        metric: 'upload_success_rate',
        message: `Upload success rate critically low: ${metrics.upload_success_rate.toFixed(2)}%`,
        value: metrics.upload_success_rate,
        threshold: THRESHOLDS.upload_success_rate.critical,
      });
    } else if (metrics.upload_success_rate < THRESHOLDS.upload_success_rate.warning) {
      alerts.push({
        level: 'warning',
        metric: 'upload_success_rate',
        message: `Upload success rate below target: ${metrics.upload_success_rate.toFixed(2)}%`,
        value: metrics.upload_success_rate,
        threshold: THRESHOLDS.upload_success_rate.warning,
      });
    }
  }

  // Read success rate
  if (metrics.read_total > 0) {
    if (metrics.read_success_rate < THRESHOLDS.read_success_rate.critical) {
      alerts.push({
        level: 'critical',
        metric: 'read_success_rate',
        message: `Read success rate critically low: ${metrics.read_success_rate.toFixed(2)}%`,
        value: metrics.read_success_rate,
        threshold: THRESHOLDS.read_success_rate.critical,
      });
    } else if (metrics.read_success_rate < THRESHOLDS.read_success_rate.warning) {
      alerts.push({
        level: 'warning',
        metric: 'read_success_rate',
        message: `Read success rate below target: ${metrics.read_success_rate.toFixed(2)}%`,
        value: metrics.read_success_rate,
        threshold: THRESHOLDS.read_success_rate.warning,
      });
    }
  }

  // Error rate
  if (metrics.total_requests > 0) {
    if (metrics.error_rate > THRESHOLDS.error_rate.critical) {
      alerts.push({
        level: 'critical',
        metric: 'error_rate',
        message: `Error rate critically high: ${metrics.error_rate.toFixed(2)}%`,
        value: metrics.error_rate,
        threshold: THRESHOLDS.error_rate.critical,
      });
    } else if (metrics.error_rate > THRESHOLDS.error_rate.warning) {
      alerts.push({
        level: 'warning',
        metric: 'error_rate',
        message: `Error rate above target: ${metrics.error_rate.toFixed(2)}%`,
        value: metrics.error_rate,
        threshold: THRESHOLDS.error_rate.warning,
      });
    }
  }

  return alerts;
}
