/**
 * Rate Limiter Durable Object
 * Implements strong consistency rate limiting at the edge
 * Based on Sliding Window Counter algorithm
 * 
 * Also handles idempotency key caching (v4.6.0+)
 */

import { DurableObject } from 'cloudflare:workers';

interface RateLimitState {
  requests: number[];  // Array of timestamps
}

interface IdempotencyCache {
  response: string;
  expiry: number;
}

export class RateLimiterDO extends DurableObject {
  /**
   * Fetch handler for RPC calls
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Idempotency GET
    if (url.pathname === '/idempotency/get' && request.method === 'POST') {
      const { key } = await request.json<{ key: string }>();
      const cached = await this.getIdempotency(key);
      
      if (cached) {
        return new Response(cached, { status: 200 });
      }
      return new Response(null, { status: 404 });
    }
    
    // Idempotency SET
    if (url.pathname === '/idempotency/set' && request.method === 'POST') {
      const { key, response, ttl } = await request.json<{ key: string; response: string; ttl: number }>();
      await this.setIdempotency(key, response, ttl);
      return new Response('OK', { status: 200 });
    }
    
    return new Response('Not Found', { status: 404 });
  }

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

  /**
   * Get idempotency cached response (RPC method)
   */
  async getIdempotency(key: string): Promise<string | null> {
    const cacheKey = `idempotency:${key}`;
    const cached = await this.ctx.storage.get<IdempotencyCache>(cacheKey);
    
    if (!cached) return null;
    
    // Check expiry
    if (cached.expiry < Date.now()) {
      await this.ctx.storage.delete(cacheKey);
      return null;
    }
    
    return cached.response;
  }

  /**
   * Set idempotency cached response (RPC method)
   */
  async setIdempotency(key: string, response: string, ttlSeconds: number): Promise<void> {
    const cacheKey = `idempotency:${key}`;
    const expiry = Date.now() + ttlSeconds * 1000;
    
    await this.ctx.storage.put(cacheKey, {
      response,
      expiry
    });
  }

  /**
   * Alarm handler for cleanup (optional)
   */
  async alarm(): Promise<void> {
    const now = Date.now();
    const allKeys = await this.ctx.storage.list<IdempotencyCache>();
    
    for (const [key, value] of allKeys) {
      if (key.startsWith('idempotency:') && value.expiry < now) {
        await this.ctx.storage.delete(key);
      }
    }
    
    // Schedule next cleanup in 1 hour
    await this.ctx.storage.setAlarm(Date.now() + 3600000);
  }
}
