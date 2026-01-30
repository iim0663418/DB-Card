// Rate Limiting Utility using Durable Objects
// Based on BDD Spec: Rate Limiting Migration to Durable Objects
// Provides strong consistency with <5ms latency

import type { Env, RateLimitDimension, RateLimitResult } from '../types';
import type { RateLimiterDO } from '../durable-objects/rate-limiter';

/**
 * Rate limit configuration
 */
const RATE_LIMITS = {
  card_uuid: { limit: 500, window: 86400000 }, // 500/day (24 hours)
  ip: { limit: 600, window: 86400000 }         // 600/day (24 hours)
};

/**
 * Check rate limit using Durable Objects
 *
 * @param env - Worker environment
 * @param dimension - Rate limit dimension (card_uuid or ip)
 * @param identifier - The identifier value (uuid or ip address)
 * @returns Rate limit result with allowed status and retryAfter if blocked
 */
export async function checkRateLimitDO(
  env: Env,
  dimension: RateLimitDimension,
  identifier: string
): Promise<RateLimitResult> {
  try {
    const config = RATE_LIMITS[dimension];

    // Get DO instance using idFromName (ensures same instance for same identifier)
    const id = env.RATE_LIMITER.idFromName(identifier);
    const stub = env.RATE_LIMITER.get(id) as DurableObjectStub<RateLimiterDO>;

    // Call checkAndIncrement with window and limit
    const result = await stub.checkAndIncrement(
      dimension,
      identifier,
      config.window,
      config.limit
    );

    if (!result.allowed) {
      return {
        allowed: false,
        retry_after: result.retryAfter,
        dimension,
        window: 'day',
        limit: config.limit
      };
    }

    return { allowed: true };
  } catch (error) {
    // On error, fail open to avoid blocking legitimate users
    console.error(`Rate limit DO error for ${dimension}:${identifier}:`, error);
    return { allowed: true };
  }
}
