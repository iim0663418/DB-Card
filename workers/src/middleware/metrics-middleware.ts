// Metrics Middleware
// Records metrics for upload/read operations and rate limiting

import type { Env } from '../types';
import {
  METRICS_KEYS,
  incrementCounter,
  addToSum,
  recordTimeline,
  getErrorKey,
} from '../utils/metrics';

// Error type mapping
const ERROR_TYPES: Record<number, string> = {
  413: 'file_too_large',
  400: 'invalid_format',
  401: 'unauthorized',
  404: 'not_found',
  429: 'rate_limited',
  500: 'internal_error',
};

/**
 * Record upload metrics
 * Non-blocking: Metrics updates run in background
 */
export async function recordUploadMetrics(
  env: Env,
  success: boolean,
  duration: number,
  fileSize?: number,
  errorType?: number
): Promise<void> {
  const updates: Promise<void>[] = [];

  if (success) {
    updates.push(incrementCounter(env, METRICS_KEYS.UPLOAD_SUCCESS));
    updates.push(addToSum(env, METRICS_KEYS.UPLOAD_DURATION, duration));
    if (fileSize) {
      updates.push(addToSum(env, METRICS_KEYS.UPLOAD_SIZE, fileSize));
    }
    updates.push(recordTimeline(env, 'upload', 1, 0));
  } else {
    updates.push(incrementCounter(env, METRICS_KEYS.UPLOAD_FAILED));
    updates.push(recordTimeline(env, 'upload', 0, 1));

    if (errorType && ERROR_TYPES[errorType]) {
      const errorKey = getErrorKey(ERROR_TYPES[errorType]);
      updates.push(incrementCounter(env, errorKey));
    }
  }

  // Non-blocking: Fire and forget
  Promise.all(updates).catch(err => {
    console.error('[Metrics] Failed to record upload metrics:', err);
  });
}

/**
 * Record read metrics
 * Non-blocking: Metrics updates run in background
 */
export async function recordReadMetrics(
  env: Env,
  success: boolean,
  duration: number,
  errorType?: number
): Promise<void> {
  const updates: Promise<void>[] = [];

  if (success) {
    updates.push(incrementCounter(env, METRICS_KEYS.READ_SUCCESS));
    updates.push(addToSum(env, METRICS_KEYS.READ_DURATION, duration));
    updates.push(recordTimeline(env, 'read', 1, 0));
  } else {
    updates.push(incrementCounter(env, METRICS_KEYS.READ_FAILED));
    updates.push(recordTimeline(env, 'read', 0, 1));

    if (errorType && ERROR_TYPES[errorType]) {
      const errorKey = getErrorKey(ERROR_TYPES[errorType]);
      updates.push(incrementCounter(env, errorKey));
    }
  }

  // Non-blocking: Fire and forget
  Promise.all(updates).catch(err => {
    console.error('[Metrics] Failed to record read metrics:', err);
  });
}

/**
 * Record rate limit trigger
 * Non-blocking: Metrics updates run in background
 */
export async function recordRateLimitTrigger(
  env: Env,
  type: 'upload' | 'read' | 'twin_list'
): Promise<void> {
  const key = type === 'upload' ? METRICS_KEYS.RATE_LIMIT_UPLOAD : METRICS_KEYS.RATE_LIMIT_READ;

  incrementCounter(env, key).catch(err => {
    console.error(`[Metrics] Failed to record rate limit for ${type}:`, err);
  });
}
