// Scheduled KV cleanup for expired session budget counters
// Runs daily at 02:00 UTC

import type { Env } from './types';

export async function handleScheduledKVCleanup(env: Env): Promise<void> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const thisMonth = now.toISOString().slice(0, 7).replace(/-/g, ''); // YYYYMM

  try {
    // Get all active cards (bound + revoked)
    const cards = await env.DB.prepare(`
      SELECT uuid FROM uuid_bindings
      WHERE status IN ('bound', 'revoked')
    `).all();

    if (!cards.results || cards.results.length === 0) {
      console.log('[KV Cleanup] No cards to process');
      return;
    }

    let deletedDaily = 0;
    let deletedMonthly = 0;

    // Clean up old daily counters (keep only today and yesterday)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10).replace(/-/g, '');

    for (const card of cards.results as any[]) {
      const uuid = card.uuid;

      // List all daily keys for this card
      const dailyPrefix = `session:budget:${uuid}:daily:`;
      const dailyKeys = await env.KV.list({ prefix: dailyPrefix });

      for (const key of dailyKeys.keys) {
        const dateStr = key.name.split(':').pop();
        // Delete if not today or yesterday
        if (dateStr !== today && dateStr !== yesterday) {
          await env.KV.delete(key.name);
          deletedDaily++;
        }
      }

      // List all monthly keys for this card
      const monthlyPrefix = `session:budget:${uuid}:monthly:`;
      const monthlyKeys = await env.KV.list({ prefix: monthlyPrefix });

      // Keep only current month and last month
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString().slice(0, 7).replace(/-/g, '');

      for (const key of monthlyKeys.keys) {
        const monthStr = key.name.split(':').pop();
        // Delete if not this month or last month
        if (monthStr !== thisMonth && monthStr !== lastMonth) {
          await env.KV.delete(key.name);
          deletedMonthly++;
        }
      }
    }

    console.log(`[KV Cleanup] Deleted ${deletedDaily} daily counters and ${deletedMonthly} monthly counters`);

  } catch (error) {
    console.error('[KV Cleanup] Error during scheduled KV cleanup:', error);
    throw error;
  }
}
