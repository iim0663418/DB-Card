import { Env } from '../types';

/**
 * Cleanup expired temp uploads (Cron Job)
 * Runs daily at 2 AM UTC
 */
export async function cleanupTempUploads(env: Env): Promise<{ deleted: number }> {
  const now = Date.now();
  
  // 1. Query expired uploads
  const expired = await env.DB.prepare(`
    SELECT upload_id, image_url, thumbnail_url
    FROM temp_uploads 
    WHERE expires_at < ?
    LIMIT 100
  `).bind(now).all();

  if (!expired.results || expired.results.length === 0) {
    return { deleted: 0 };
  }

  // 2. Delete from R2 (batch) - image + thumbnail
  const deletePromises = expired.results.flatMap((row: any) => {
    const promises = [env.PHYSICAL_CARDS.delete(row.image_url).catch(() => {})];
    if (row.thumbnail_url) {
      promises.push(env.PHYSICAL_CARDS.delete(row.thumbnail_url).catch(() => {}));
    }
    return promises;
  });
  await Promise.all(deletePromises);

  // 3. Delete from DB
  const uploadIds = expired.results.map((row: any) => row.upload_id);
  await env.DB.prepare(`
    DELETE FROM temp_uploads 
    WHERE upload_id IN (${uploadIds.map(() => '?').join(',')})
  `).bind(...uploadIds).run();

  return { deleted: expired.results.length };
}
