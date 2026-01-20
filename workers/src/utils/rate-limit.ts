// Rate Limiting Utility
// Based on BDD Spec: Multi-Layer Defense for NFC Tap API
// Implements Sliding Window Counter algorithm using KV

import type {
  RateLimitDimension,
  RateLimitWindow,
  RateLimitData,
  RateLimitResult,
  RateLimitConfig
} from '../types';

/**
 * Rate limit configuration (Phase 1 - P0)
 */
export const RATE_LIMITS: RateLimitConfig = {
  card_uuid: {
    minute: 10,
    hour: 50
  },
  ip: {
    minute: 10,
    hour: 50
  }
};

/**
 * Get window duration in seconds
 */
function getWindowDuration(window: RateLimitWindow): number {
  return window === 'minute' ? 60 : 3600;
}

/**
 * Get TTL for KV storage (2x window for safety)
 */
function getKVTTL(window: RateLimitWindow): number {
  return window === 'minute' ? 120 : 7200;
}

/**
 * Check if rate limit is exceeded for given dimension
 *
 * @param kv - KV namespace
 * @param dimension - Rate limit dimension (card_uuid or ip)
 * @param identifier - The identifier value (uuid or ip address)
 * @param window - Time window (minute or hour)
 * @returns Rate limit result
 */
export async function checkRateLimit(
  kv: KVNamespace,
  dimension: RateLimitDimension,
  identifier: string,
  window: RateLimitWindow
): Promise<RateLimitResult> {
  const limit = RATE_LIMITS[dimension][window];
  const windowDuration = getWindowDuration(window);
  const now = Date.now();

  const key = `ratelimit:${dimension}:${identifier}:${window}`;
  const dataStr = await kv.get(key);

  if (!dataStr) {
    // No existing data, allow request
    return { allowed: true };
  }

  const data: RateLimitData = JSON.parse(dataStr);
  const windowStart = data.first_seen_at;
  const windowEnd = windowStart + (windowDuration * 1000);

  // Check if current time is still within the window
  if (now >= windowEnd) {
    // Window expired, allow request
    return { allowed: true };
  }

  // Check if limit exceeded
  if (data.count >= limit) {
    const retryAfter = Math.ceil((windowEnd - now) / 1000);
    return {
      allowed: false,
      current: data.count + 1,  // Include current request in count
      limit,
      retry_after: retryAfter,
      dimension,
      window
    };
  }

  return { allowed: true };
}

/**
 * Increment rate limit counter
 *
 * @param kv - KV namespace
 * @param dimension - Rate limit dimension (card_uuid or ip)
 * @param identifier - The identifier value (uuid or ip address)
 * @param window - Time window (minute or hour)
 */
export async function incrementRateLimit(
  kv: KVNamespace,
  dimension: RateLimitDimension,
  identifier: string,
  window: RateLimitWindow
): Promise<void> {
  const key = `ratelimit:${dimension}:${identifier}:${window}`;
  const ttl = getKVTTL(window);
  const now = Date.now();

  const dataStr = await kv.get(key);

  if (!dataStr) {
    // First request in this window
    const newData: RateLimitData = {
      count: 1,
      first_seen_at: now
    };
    await kv.put(key, JSON.stringify(newData), { expirationTtl: ttl });
  } else {
    // Increment existing counter
    const data: RateLimitData = JSON.parse(dataStr);
    const windowDuration = getWindowDuration(window);
    const windowEnd = data.first_seen_at + (windowDuration * 1000);

    if (now >= windowEnd) {
      // Window expired, start new window
      const newData: RateLimitData = {
        count: 1,
        first_seen_at: now
      };
      await kv.put(key, JSON.stringify(newData), { expirationTtl: ttl });
    } else {
      // Increment counter in current window
      data.count += 1;
      await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
    }
  }
}
