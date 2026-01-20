// Revocation Rate Limiting Utilities
// Implements rate limiting for user self-revoke feature
// Limits: 3/hour, 10/day

import type { Env } from '../types';

const HOURLY_LIMIT = 3;
const DAILY_LIMIT = 10;

interface RateLimitStatus {
  allowed: boolean;
  hourly: { limit: number; remaining: number; reset_at: number };
  daily: { limit: number; remaining: number; reset_at: number };
}

/**
 * Check revocation rate limit for a user
 * Returns null if allowed, Response object if rate limited
 */
export async function checkRevocationRateLimit(
  db: D1Database,
  userId: string
): Promise<{ allowed: true; status: RateLimitStatus } | { allowed: false; status: RateLimitStatus; retryAfter: number }> {
  const now = Math.floor(Date.now() / 1000);

  // Calculate window starts
  const hourStart = Math.floor(now / 3600) * 3600;
  const dayStart = Math.floor(now / 86400) * 86400;

  // Get current counts
  const hourlyResult = await db.prepare(`
    SELECT revocation_count FROM revocation_rate_limits
    WHERE user_id = ? AND window_type = 'hourly' AND window_start = ?
  `).bind(userId, hourStart).first<{ revocation_count: number }>();

  const dailyResult = await db.prepare(`
    SELECT revocation_count FROM revocation_rate_limits
    WHERE user_id = ? AND window_type = 'daily' AND window_start = ?
  `).bind(userId, dayStart).first<{ revocation_count: number }>();

  const hourlyCount = hourlyResult?.revocation_count || 0;
  const dailyCount = dailyResult?.revocation_count || 0;

  const hourlyRemaining = Math.max(0, HOURLY_LIMIT - hourlyCount);
  const dailyRemaining = Math.max(0, DAILY_LIMIT - dailyCount);

  const hourlyResetAt = hourStart + 3600;
  const dailyResetAt = dayStart + 86400;

  const status: RateLimitStatus = {
    allowed: hourlyCount < HOURLY_LIMIT && dailyCount < DAILY_LIMIT,
    hourly: { limit: HOURLY_LIMIT, remaining: hourlyRemaining, reset_at: hourlyResetAt },
    daily: { limit: DAILY_LIMIT, remaining: dailyRemaining, reset_at: dailyResetAt }
  };

  // Check limits
  if (hourlyCount >= HOURLY_LIMIT) {
    return {
      allowed: false,
      status,
      retryAfter: hourlyResetAt - now
    };
  }

  if (dailyCount >= DAILY_LIMIT) {
    return {
      allowed: false,
      status,
      retryAfter: dailyResetAt - now
    };
  }

  return { allowed: true, status };
}

/**
 * Increment revocation count for a user
 */
export async function incrementRevocationCount(
  db: D1Database,
  userId: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const hourStart = Math.floor(now / 3600) * 3600;
  const dayStart = Math.floor(now / 86400) * 86400;

  // Upsert hourly count
  await db.prepare(`
    INSERT INTO revocation_rate_limits (user_id, window_type, window_start, revocation_count, updated_at)
    VALUES (?, 'hourly', ?, 1, ?)
    ON CONFLICT(user_id, window_type, window_start) DO UPDATE SET
      revocation_count = revocation_count + 1,
      updated_at = ?
  `).bind(userId, hourStart, now, now).run();

  // Upsert daily count
  await db.prepare(`
    INSERT INTO revocation_rate_limits (user_id, window_type, window_start, revocation_count, updated_at)
    VALUES (?, 'daily', ?, 1, ?)
    ON CONFLICT(user_id, window_type, window_start) DO UPDATE SET
      revocation_count = revocation_count + 1,
      updated_at = ?
  `).bind(userId, dayStart, now, now).run();
}

/**
 * Cleanup old rate limit records (called by scheduled task)
 */
export async function cleanupOldRateLimits(db: D1Database): Promise<void> {
  const cutoff = Math.floor(Date.now() / 1000) - (48 * 3600); // 48 hours ago

  await db.prepare(`
    DELETE FROM revocation_rate_limits WHERE window_start < ?
  `).bind(cutoff).run();
}
