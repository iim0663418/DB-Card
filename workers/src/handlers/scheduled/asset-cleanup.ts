// Asset Cleanup Scheduled Handler
// Implements BDD spec: .specify/specs/asset-cleanup-cron.md

import type { Env } from '../../types';

const RETENTION_DAYS = 30;
const BATCH_SIZE = 100;

/**
 * Delete R2 variants for a given asset version
 * BDD Scenario 1: Delete both detail and thumb variants
 */
async function deleteR2Variants(
  env: Env,
  r2KeyPrefix: string,
  version: number
): Promise<void> {
  const variants = ['1200.webp', '256.webp'];

  for (const variant of variants) {
    const key = `${r2KeyPrefix}/v${version}/${variant}`;
    try {
      await env.PHYSICAL_CARDS.delete(key);
    } catch (error) {
      console.error(`Failed to delete ${key}:`, error);
      // Record to audit log but continue
      await env.DB.prepare(`
        INSERT INTO audit_logs (event_type, actor_type, actor_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        'asset_cleanup_error',
        'system',
        'cron',
        JSON.stringify({ key, error: String(error) }),
        '127.0.0.1'
      ).run();
    }
  }
}

/**
 * Cleanup soft-deleted assets older than 30 days
 * BDD Scenarios 1-4: Batch processing with error handling
 */
export async function cleanupSoftDeletedAssets(env: Env): Promise<void> {
  const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  let totalDeleted = 0;

  try {
    // Scenario 1: Find soft-deleted versions older than 30 days
    const versions = await env.DB.prepare(`
      SELECT asset_id, version, r2_key_prefix
      FROM asset_versions av
      JOIN assets a ON av.asset_id = a.asset_id
      WHERE av.soft_deleted_at < ?
      ORDER BY av.soft_deleted_at ASC
      LIMIT ?
    `).bind(cutoffDate.toISOString(), BATCH_SIZE).all<{
      asset_id: string;
      version: number;
      r2_key_prefix: string;
    }>();

    if (!versions.results || versions.results.length === 0) {
      console.log('No soft-deleted assets to cleanup');
      return;
    }

    // Scenario 2 & 3: Delete R2 files (with error handling)
    for (const v of versions.results) {
      await deleteR2Variants(env, v.r2_key_prefix, v.version);
      totalDeleted++;
    }

    // Scenario 1: Delete database records
    await env.DB.prepare(`
      DELETE FROM asset_versions
      WHERE soft_deleted_at < ?
    `).bind(cutoffDate.toISOString()).run();

    // Scenario 2: Cleanup orphaned assets records
    await env.DB.prepare(`
      DELETE FROM assets
      WHERE asset_id NOT IN (
        SELECT DISTINCT asset_id FROM asset_versions
      )
    `).run();

    // Record success to audit log
    await env.DB.prepare(`
      INSERT INTO audit_logs (event_type, actor_type, actor_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      'asset_cleanup',
      'system',
      'cron',
      JSON.stringify({
        deleted_count: totalDeleted,
        cutoff_date: cutoffDate.toISOString()
      }),
      '127.0.0.1'
    ).run();

    console.log(`Asset cleanup completed: ${totalDeleted} versions deleted`);
  } catch (error) {
    console.error('Asset cleanup failed:', error);

    // Record failure to audit log
    await env.DB.prepare(`
      INSERT INTO audit_logs (event_type, actor_type, actor_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      'asset_cleanup_error',
      'system',
      'cron',
      JSON.stringify({ error: String(error) }),
      '127.0.0.1'
    ).run();
  }
}
