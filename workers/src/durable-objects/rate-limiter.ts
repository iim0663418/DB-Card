/**
 * Rate Limiter Durable Object
 * Implements strong consistency rate limiting at the edge
 * Based on Sliding Window Counter algorithm
 */

import { DurableObject } from 'cloudflare:workers';

interface RateLimitState {
  requests: number[];  // Array of timestamps
}

export class RateLimiterDO extends DurableObject {
  /**
   * Check rate limit and increment counter (RPC method)
   */
  async checkAndIncrement(
    dimension: string,
    identifier: string,
    windowMs: number,
    limit: number
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = `${dimension}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get current state
    const state = await this.ctx.storage.get<RateLimitState>(key);
    const requests = state?.requests || [];

    // Filter out expired requests (sliding window)
    const validRequests = requests.filter(t => t > windowStart);

    // Check limit
    if (validRequests.length >= limit) {
      const oldestRequest = validRequests[0];
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Add current request
    validRequests.push(now);

    // Store updated state
    await this.ctx.storage.put(key, { requests: validRequests });

    return { allowed: true };
  }
}
