/**
 * Realtime Hints - Phase 3.0.5b
 * Load user click patterns and provide planning hints to Think layer.
 * 
 * Design principles:
 * - Only affects Think (planning), not Act (ranking)
 * - Conservative: respects exact_match intent
 * - Capped EMA: stable signals (20 clicks)
 * - KV cached: 5 min TTL
 */

import type { Env } from '../../types';

export interface RealtimeHints {
  forceHybrid?: boolean;              // clickDiversity > 0.6
  retrievalLimitMultiplier?: number;  // 1.0 ~ 2.0 (avgClickRank high)
}

/**
 * Load realtime hints from recent click patterns.
 * Returns null if insufficient data (<5 clicks).
 */
export async function loadRealtimeHints(
  env: Env,
  userEmail: string
): Promise<RealtimeHints | null> {
  // Check KV cache (5 min TTL)
  const cacheKey = `realtime_signals:${userEmail}`;
  const cached = await env.KV.get(cacheKey, 'json');
  if (cached) return cached as RealtimeHints;

  // Query last 20 clicks (more stable than 10)
  const { results } = await env.DB.prepare(`
    SELECT 
      ce.result_rank,
      ce.result_source,
      rc.organization
    FROM click_events ce
    JOIN received_cards rc ON ce.result_uuid = rc.uuid
    WHERE ce.user_email = ?
      AND ce.query_event_id IS NOT NULL
    ORDER BY ce.timestamp DESC
    LIMIT 20
  `).bind(userEmail).all();

  if (results.length < 5) return null;  // Insufficient data

  // Calculate signals
  const avgClickRank = calculateCappedEMA(
    results.map((r: any) => r.result_rank),
    0.3  // decay factor
  );

  const uniqueOrgs = new Set(results.map((r: any) => r.organization)).size;
  const clickDiversity = uniqueOrgs / results.length;

  // Generate hints
  const hints: RealtimeHints = {};

  if (clickDiversity > 0.6) {
    hints.forceHybrid = true;
  }

  if (avgClickRank > 5.0) {
    hints.retrievalLimitMultiplier = 1.5;
  }

  // Cache for 5 minutes
  await env.KV.put(cacheKey, JSON.stringify(hints), { expirationTtl: 300 });

  return hints;
}

/**
 * Capped Exponential Moving Average
 * More stable than simple average, less sensitive to outliers.
 */
function calculateCappedEMA(values: number[], decayFactor: number): number {
  if (values.length === 0) return 0;
  
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = decayFactor * values[i] + (1 - decayFactor) * ema;
  }
  
  return ema;
}
