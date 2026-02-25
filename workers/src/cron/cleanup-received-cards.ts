import { Env } from '../types';

/**
 * Cleanup soft-deleted received cards older than 30 days (Cron Job)
 * Implements GDPR Right to be Forgotten
 * Runs daily at 2 AM UTC
 */
export async function cleanupReceivedCards(env: Env): Promise<{ deleted: number }> {
  const threshold = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
  
  // 1. Query soft-deleted cards older than 30 days
  const softDeleted = await env.DB.prepare(`
    SELECT uuid, user_email, original_image_url, thumbnail_url
    FROM received_cards 
    WHERE deleted_at IS NOT NULL AND deleted_at < ?
    LIMIT 100
  `).bind(threshold.toString()).all();

  if (!softDeleted.results || softDeleted.results.length === 0) {
    return { deleted: 0 };
  }

  const uuids = softDeleted.results.map((row: any) => row.uuid);
  const affectedUsers = [...new Set(softDeleted.results.map((r: any) => r.user_email))];

  // 2. Delete from R2 (batch) - original image + thumbnail
  const deletePromises = softDeleted.results.flatMap((row: any) => {
    const promises = [];
    if (row.original_image_url) {
      promises.push(env.PHYSICAL_CARDS.delete(row.original_image_url).catch(() => {}));
    }
    if (row.thumbnail_url) {
      promises.push(env.PHYSICAL_CARDS.delete(row.thumbnail_url).catch(() => {}));
    }
    return promises;
  });
  await Promise.all(deletePromises);

  // 3. Delete from Vectorize (non-blocking)
  try {
    await env.VECTORIZE.deleteByIds(uuids);
    console.log(`[Cleanup] Deleted ${uuids.length} embeddings from Vectorize`);
  } catch (error) {
    console.error('[Cleanup] Vectorize delete failed:', error);
    // Continue with DB cleanup even if Vectorize fails
  }

  // 4. Hard delete from DB (card_tags will CASCADE automatically)
  await env.DB.prepare(`
    DELETE FROM received_cards 
    WHERE uuid IN (${uuids.map(() => '?').join(',')})
  `).bind(...uuids).run();

  // 5. Recalculate tag_stats for affected users
  const now = Date.now();
  for (const userEmail of affectedUsers) {
    // Update counts based on actual card_tags
    await env.DB.prepare(`
      UPDATE tag_stats
      SET count = (
        SELECT COUNT(*)
        FROM card_tags ct
        JOIN received_cards rc ON ct.card_uuid = rc.uuid
        WHERE ct.tag = tag_stats.tag
          AND rc.user_email = tag_stats.user_email
          AND rc.deleted_at IS NULL
      ),
      last_updated = ?
      WHERE user_email = ?
    `).bind(now, userEmail).run();
    
    // Delete zero-count tags
    await env.DB.prepare(`
      DELETE FROM tag_stats
      WHERE user_email = ? AND count = 0
    `).bind(userEmail).run();
  }

  console.log(`[Cleanup] Hard deleted ${uuids.length} received cards (30+ days old)`);
  return { deleted: uuids.length };
}
