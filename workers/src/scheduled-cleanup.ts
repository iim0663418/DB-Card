// Scheduled cleanup for revoked cards
// Runs daily at 02:00 UTC

import type { Env } from './types';

export async function handleScheduledCleanup(env: Env): Promise<void> {
  const now = Date.now();
  const retentionPeriod = 90 * 24 * 60 * 60 * 1000; // 90 days
  const cutoffTime = now - retentionPeriod;

  try {
    // Step 1: Find revoked cards older than 90 days
    // Optimized with idx_uuid_bindings_revoked_cleanup (status, revoked_at)
    const revokedCards = await env.DB.prepare(`
      SELECT 
        b.uuid, b.type, b.bound_email, b.bound_at, b.revoked_at,
        c.encrypted_payload
      FROM uuid_bindings b
      LEFT JOIN cards c ON b.uuid = c.uuid
      WHERE b.status = 'revoked' 
      AND b.revoked_at < ?
    `).bind(cutoffTime).all();

    if (!revokedCards.results || revokedCards.results.length === 0) {
      console.log('[Cleanup] No revoked cards to clean up');
      return;
    }

    console.log(`[Cleanup] Found ${revokedCards.results.length} revoked cards to archive`);

    // Step 2: Archive to deleted_cards table
    for (const card of revokedCards.results as any[]) {
      await env.DB.prepare(`
        INSERT INTO deleted_cards (
          uuid, type, bound_email, bound_at, revoked_at, 
          deleted_at, deleted_reason, card_data_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        card.uuid,
        card.type,
        card.bound_email,
        card.bound_at,
        card.revoked_at,
        now,
        'auto_cleanup_90days',
        card.encrypted_payload || null
      ).run();
    }

    // Step 3: Delete from uuid_bindings
    const deleteResult = await env.DB.prepare(`
      DELETE FROM uuid_bindings
      WHERE status = 'revoked' AND revoked_at < ?
    `).bind(cutoffTime).run();

    // Step 4: Delete from cards (optional, keep encrypted data)
    // Uncomment if you want to delete card data too
    // await env.DB.prepare(`
    //   DELETE FROM cards
    //   WHERE uuid IN (SELECT uuid FROM deleted_cards WHERE deleted_at = ?)
    // `).bind(now).run();

    console.log(`[Cleanup] Archived and deleted ${deleteResult.meta.changes} revoked cards`);

  } catch (error) {
    console.error('[Cleanup] Error during scheduled cleanup:', error);
    throw error;
  }
}
