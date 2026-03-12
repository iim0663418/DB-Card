/**
 * Cron: cleanup-click-events
 * Phase 3.0: Delete click_events older than 7 days.
 * Runs as part of the daily cron at 02:00 Taiwan time (18:00 UTC).
 */

import type { Env } from '../types';

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export async function cleanupClickEvents(env: Env): Promise<void> {
  const cutoff = Date.now() - RETENTION_MS;

  try {
    const result = await env.DB.prepare(`
      DELETE FROM click_events
      WHERE timestamp < ?
    `).bind(cutoff).run();

    console.log(`[Cron] Cleaned up ${result.meta.changes} old click events`);
  } catch (err) {
    console.error('[Cron] cleanupClickEvents failed:', err instanceof Error ? err.message : String(err));
  }
}
