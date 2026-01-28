// Metrics Utilities for Monitoring API
// Provides KV-based counter, sum, and timeline tracking

import type { Env } from '../types';

// KV Key Constants
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
} as const;

// TTL Constants (seconds)
export const METRICS_TTL = {
  COUNTER: 86400,      // 24 hours
  TIMELINE: 604800,    // 7 days
  CACHE: 60,           // 1 minute (overview)
  CACHE_HEALTH: 60,    // 1 minute (health) - KV minimum is 60s
} as const;

/**
 * Increment a counter in KV
 * Non-blocking: Returns immediately, updates in background
 */
export async function incrementCounter(
  env: Env,
  key: string,
  increment: number = 1
): Promise<void> {
  try {
    const current = parseInt(await env.KV.get(key) || '0');
    await env.KV.put(key, (current + increment).toString(), {
      expirationTtl: METRICS_TTL.COUNTER
    });
  } catch (error) {
    console.error(`[Metrics] Failed to increment ${key}:`, error);
  }
}

/**
 * Add value to sum in KV
 * Non-blocking: Returns immediately, updates in background
 */
export async function addToSum(
  env: Env,
  key: string,
  value: number
): Promise<void> {
  try {
    const current = parseFloat(await env.KV.get(key) || '0');
    await env.KV.put(key, (current + value).toString(), {
      expirationTtl: METRICS_TTL.COUNTER
    });
  } catch (error) {
    console.error(`[Metrics] Failed to add to sum ${key}:`, error);
  }
}

/**
 * Record timeline data (hourly buckets)
 * Format: metrics:timeline:{metric}:{hourTimestamp}
 */
export async function recordTimeline(
  env: Env,
  metric: 'upload' | 'read',
  success: number,
  failed: number
): Promise<void> {
  try {
    const now = Date.now();
    const hourTimestamp = Math.floor(now / 3600000) * 3600; // Round to hour
    const key = `metrics:timeline:${metric}:${hourTimestamp}`;

    const existing = await env.KV.get(key, 'json') as { success: number; failed: number } | null;
    const data = {
      success: (existing?.success || 0) + success,
      failed: (existing?.failed || 0) + failed,
    };

    await env.KV.put(key, JSON.stringify(data), {
      expirationTtl: METRICS_TTL.TIMELINE
    });
  } catch (error) {
    console.error(`[Metrics] Failed to record timeline for ${metric}:`, error);
  }
}

/**
 * Batch read counters from KV
 * Reduces KV request count
 */
export async function getCounters(
  env: Env,
  keys: string[]
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  await Promise.all(
    keys.map(async (key) => {
      try {
        const value = await env.KV.get(key);
        results[key] = value ? parseFloat(value) : 0;
      } catch (error) {
        console.error(`[Metrics] Failed to get counter ${key}:`, error);
        results[key] = 0;
      }
    })
  );

  return results;
}

/**
 * Get error count for specific error type
 */
export function getErrorKey(errorType: string): string {
  return `metrics:errors:${errorType}:count`;
}
