/**
 * Manual Cron Trigger (Admin Only)
 * Allows administrators to manually execute scheduled tasks
 */

import type { Env } from '../../types';

export async function handleTriggerCron(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    console.log('[Manual Cron] Starting manual execution...');

    // Execute all cron tasks (same as scheduled())
    const tasks = [
      { name: 'Sync Embeddings', fn: async () => {
        const { syncCardEmbeddings } = await import('../../cron/sync-card-embeddings');
        await syncCardEmbeddings(env);
      }},
      { name: 'Deduplicate Cards', fn: async () => {
        const { deduplicateCards } = await import('../../cron/deduplicate-cards');
        await deduplicateCards(env);
      }},
      { name: 'Auto-tag Cards', fn: async () => {
        const { autoTagCards } = await import('../../cron/auto-tag-cards');
        await autoTagCards(env);
      }},
      { name: 'Cleanup Sessions', fn: async () => {
        const { handleScheduledCleanup } = await import('../../scheduled-cleanup');
        await handleScheduledCleanup(env);
      }},
      { name: 'Log Rotation', fn: async () => {
        const { handleScheduledLogRotation } = await import('../../scheduled-log-rotation');
        await handleScheduledLogRotation(env);
      }},
      { name: 'KV Cleanup', fn: async () => {
        const { handleScheduledKVCleanup } = await import('../../scheduled-kv-cleanup');
        await handleScheduledKVCleanup(env);
      }},
      { name: 'Asset Cleanup', fn: async () => {
        const { cleanupSoftDeletedAssets } = await import('../scheduled/asset-cleanup');
        await cleanupSoftDeletedAssets(env);
      }},
      { name: 'Temp Uploads Cleanup', fn: async () => {
        const { cleanupTempUploads } = await import('../../cron/cleanup-temp-uploads');
        await cleanupTempUploads(env);
      }},
      { name: 'Received Cards Cleanup', fn: async () => {
        const { cleanupReceivedCards } = await import('../../cron/cleanup-received-cards');
        await cleanupReceivedCards(env);
      }},
      { name: 'FileSearchStore Cleanup', fn: async () => {
        const { cleanupFileSearchStore } = await import('../../cron/cleanup-filesearchstore');
        await cleanupFileSearchStore(env);
      }}
    ];

    const results = [];
    for (const task of tasks) {
      const startTime = Date.now();
      try {
        await task.fn();
        const duration = Date.now() - startTime;
        results.push({ task: task.name, status: 'success', duration });
        console.log(`[Manual Cron] ${task.name}: ✅ ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({ task: task.name, status: 'error', error: errorMsg, duration });
        console.error(`[Manual Cron] ${task.name}: ❌ ${errorMsg}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Manual Cron] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
