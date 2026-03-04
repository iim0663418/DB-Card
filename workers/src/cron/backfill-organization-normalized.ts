/**
 * Backfill organization_normalized for existing cards
 * Run once to normalize all cards without organization_normalized
 */

import type { Env } from '../types';
import { normalizeToTraditional } from '../utils/chinese-converter';

export async function backfillOrganizationNormalized(env: Env): Promise<{ updated: number }> {
  console.log('[Backfill] Starting organization_normalized backfill...');

  let totalUpdated = 0;
  let batchCount = 0;

  // Process in batches of 20
  while (true) {
    batchCount++;

    // Find cards without organization_normalized
    const { results: cards } = await env.DB.prepare(`
      SELECT uuid, organization
      FROM received_cards
      WHERE organization IS NOT NULL
        AND organization_normalized IS NULL
        AND deleted_at IS NULL
      LIMIT 20
    `).all();

    if (cards.length === 0) {
      break;
    }

    // Normalize each card
    for (const card of cards) {
      try {
        const normalized = await normalizeToTraditional(
          card.organization as string,
          { ...env }
        );

        await env.DB.prepare(`
          UPDATE received_cards
          SET organization_normalized = ?
          WHERE uuid = ?
        `).bind(normalized, card.uuid).run();

        totalUpdated++;
      } catch (error) {
        console.error(`[Backfill] Failed to normalize card ${card.uuid}:`, error);
      }
    }

    // If less than 20, we're done
    if (cards.length < 20) {
      break;
    }
  }

  console.log(`[Backfill] Completed: ${totalUpdated} cards normalized in ${batchCount} batches`);
  return { updated: totalUpdated };
}
