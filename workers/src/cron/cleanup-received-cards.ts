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
    SELECT uuid, original_image_url, thumbnail_url
    FROM received_cards 
    WHERE deleted_at IS NOT NULL AND deleted_at < ?
    LIMIT 100
  `).bind(threshold.toString()).all();

  if (!softDeleted.results || softDeleted.results.length === 0) {
    return { deleted: 0 };
  }

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

  // 3. Hard delete from DB
  const uuids = softDeleted.results.map((row: any) => row.uuid);
  await env.DB.prepare(`
    DELETE FROM received_cards 
    WHERE uuid IN (${uuids.map(() => '?').join(',')})
  `).bind(...uuids).run();

  console.log(`[Cleanup] Hard deleted ${uuids.length} received cards (30+ days old)`);
  return { deleted: uuids.length };
}
