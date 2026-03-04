/**
 * Cleanup FileSearchStore documents older than 2 years (Cron Job)
 *
 * @deprecated Since 2026-03-05 - Disabled
 * @reason FileSearchStore upload disabled due to Gemini API limitation
 * @alternative Vectorize cleanup (see src/cron/cleanup-received-cards.ts)
 * @todo Re-enable when FileSearchStore is re-activated
 */

import type { Env } from '../types';

/**
 * Cleanup FileSearchStore documents older than 2 years (Cron Job)
 * Runs daily at 02:00 UTC
 */
export async function cleanupFileSearchStore(env: Env): Promise<{ deleted: number }> {
  if (!env.FILE_SEARCH_STORE_NAME) {
    console.log('[FileSearchStore Cleanup] Skipped: FILE_SEARCH_STORE_NAME not configured');
    return { deleted: 0 };
  }

  const twoYearsAgo = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000);
  let deleted = 0;

  try {
    // List all documents
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/${env.FILE_SEARCH_STORE_NAME}/documents?key=${env.GEMINI_API_KEY}`;
    const listResponse = await fetch(listUrl);

    if (!listResponse.ok) {
      throw new Error(`List failed (${listResponse.status})`);
    }

    const data = await listResponse.json() as { documents?: Array<{ name: string; createTime: string }> };
    const documents = data.documents || [];

    // Filter documents older than 2 years
    const oldDocuments = documents.filter(doc => {
      const createTime = new Date(doc.createTime).getTime();
      return createTime < twoYearsAgo;
    });

    if (oldDocuments.length === 0) {
      console.log('[FileSearchStore Cleanup] No documents older than 2 years');
      return { deleted: 0 };
    }

    // Delete old documents
    for (const doc of oldDocuments) {
      const deleteUrl = `https://generativelanguage.googleapis.com/v1beta/${doc.name}?force=true&key=${env.GEMINI_API_KEY}`;
      const deleteResponse = await fetch(deleteUrl, { method: 'DELETE' });

      if (deleteResponse.ok) {
        deleted++;
      } else {
        console.error(`[FileSearchStore Cleanup] Failed to delete ${doc.name}: ${deleteResponse.status}`);
      }
    }

    console.log(`[FileSearchStore Cleanup] Deleted ${deleted}/${oldDocuments.length} documents`);
    return { deleted };
  } catch (error) {
    console.error('[FileSearchStore Cleanup] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { deleted };
  }
}
