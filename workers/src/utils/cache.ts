// Unified Cache Invalidation Utilities
import type { Env } from '../types';

/**
 * Invalidate all caches related to a card
 * Includes: card data, card type, session responses, last session, card metadata (Phase 2)
 */
export async function invalidateCardCaches(env: Env, uuid: string): Promise<void> {
  const invalidations = [
    env.KV.delete(`card:${uuid}`),
    env.KV.delete(`card_type:${uuid}`),
    env.KV.delete(`last_session:${uuid}`),
    env.KV.delete(`card:meta:${uuid}`) // Phase 2: Card metadata cache
  ];

  // Get all active sessions for this card
  const sessions = await env.DB.prepare(`
    SELECT session_id FROM read_sessions
    WHERE card_uuid = ? AND revoked_at IS NULL
  `).bind(uuid).all();

  // Add session response cache invalidations
  sessions.results.forEach((s: any) => {
    invalidations.push(env.KV.delete(`read:${uuid}:${s.session_id}`));
  });

  await Promise.all(invalidations);
}
