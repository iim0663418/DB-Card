/**
 * Auto-tagging Cron Job (Batch API Version)
 * 
 * Flow:
 * 1. Poll and process existing batch jobs (priority)
 * 2. Check backlog (max 3 in-flight jobs)
 * 3. Query untagged cards (exclude already enqueued)
 * 4. Enqueue atomically (UNIQUE constraint)
 * 5. Create batch job (non-blocking)
 */

import { Env } from '../types';
import { BatchJobManager } from '../utils/batch-manager';

export async function autoTagCardsBatch(env: Env): Promise<{ processed: number; enqueued: number }> {
  const manager = new BatchJobManager(env);

  // Phase 1: Poll and process existing jobs (priority)
  console.log('[AutoTag] Polling existing batch jobs...');
  await manager.pollAndProcess();

  // Phase 2: Check backlog
  const inFlight = await manager.checkBacklog('auto_tag');
  const MAX_IN_FLIGHT = 3;

  if (inFlight >= MAX_IN_FLIGHT) {
    console.log(`[AutoTag] In-flight limit reached (${inFlight}/${MAX_IN_FLIGHT}), skipping new job creation`);
    return { processed: 0, enqueued: 0 };
  }

  // Phase 3: Query untagged cards (exclude already enqueued)
  const { results: cards } = await env.DB.prepare(`
    SELECT uuid, full_name, organization, title, company_summary, personal_summary
    FROM received_cards
    WHERE deleted_at IS NULL
      AND merged_to IS NULL
      AND auto_tagged_at IS NULL
      AND uuid NOT IN (
        SELECT entity_id FROM batch_job_queue
        WHERE entity_type = 'card'
          AND job_type = 'auto_tag'
          AND status IN ('queued', 'processing')
      )
    ORDER BY created_at DESC
    LIMIT 100
  `).all();

  if (cards.length === 0) {
    console.log('[AutoTag] No cards to process');
    return { processed: 0, enqueued: 0 };
  }

  // Phase 4: Enqueue atomically
  const entityIds = cards.map(c => (c as any).uuid);
  const enqueued = await manager.enqueueEntities('card', entityIds, 'auto_tag');

  if (enqueued === 0) {
    console.log('[AutoTag] All cards already enqueued');
    return { processed: 0, enqueued: 0 };
  }

  // Phase 5: Create batch job
  const entities = cards.map(card => ({
    id: (card as any).uuid,
    data: card
  }));

  const jobName = await manager.createJob({
    jobType: 'auto_tag',
    entities,
    maxAttempts: 3
  });

  console.log(`[AutoTag] Created batch job ${jobName} with ${enqueued} cards`);
  return { processed: 0, enqueued };
}
