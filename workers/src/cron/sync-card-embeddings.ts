import type { Env, ReceivedCardData, VectorMetadata } from '../types';
import { generateCardText, generateEmbedding } from '../utils/embedding';

/**
 * 同步名片到 Vectorize（每日 02:00 UTC）
 * 批次處理 + 分頁迴圈，避免積壓
 */
export async function syncCardEmbeddings(env: Env): Promise<{ synced: number }> {
  let totalSynced = 0;
  let hasMore = true;

  // 分頁迴圈處理
  while (hasMore) {
    const cards = await env.DB.prepare(`
      SELECT uuid, user_email, full_name, organization, organization_en, organization_alias,
             organization_normalized, title, department, company_summary, personal_summary,
             email, phone, website, address, note, created_at, updated_at
      FROM received_cards
      WHERE deleted_at IS NULL
        AND merged_to IS NULL
        AND (embedding_synced_at IS NULL OR updated_at > embedding_synced_at)
      ORDER BY created_at ASC
      LIMIT 100
    `).all();

    if (cards.results.length === 0) {
      hasMore = false;
      break;
    }

    // 批次生成 Embeddings（10 張一批，每張 1 subrequest：10 × 1 = 10，安全範圍）
    const batchSize = 10;
    for (let i = 0; i < cards.results.length; i += batchSize) {
      const batch = cards.results.slice(i, i + batchSize);

      // 並行生成 embeddings
      const embeddingPromises = batch.map(async (row: any) => {
        const card = row as ReceivedCardData;

        const text = generateCardText(card);

        try {
          const values = await generateEmbedding(env, text);

          // industry/location 暫時停用（節省 subrequests）
          const industry = undefined;
          const location = undefined;

          const metadata: VectorMetadata = {
            // Filter 層 (用於 pre-filtering)
            user_email: card.user_email!,
            organization_normalized: card.organization_normalized || card.organization || '',
            industry,
            location,

            // Display 層 (用於結果顯示)
            full_name: card.full_name,
            organization: card.organization || '',
            title: card.title || '',
            department: card.department || undefined,

            // Timestamp 層 (用於 recency filtering)
            created_at: card.created_at!,
            updated_at: card.updated_at!,
          };

          return {
            id: card.uuid!,
            values,
            metadata,
          };
        } catch (error) {
          console.error(`[Vectorize Sync] Failed to embed card:`, {
            uuid: card.uuid,
            full_name: card.full_name,
            organization: card.organization,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      });

      const vectors = (await Promise.all(embeddingPromises)).filter(v => v !== null) as unknown as VectorizeVector[];

      if (vectors.length > 0) {
        // 批次插入 Vectorize
        await env.VECTORIZE.upsert(vectors);

        // 批次更新同步時間
        const now = Date.now();
        const updatePromises = vectors.map(v =>
          env.DB.prepare(`
            UPDATE received_cards
            SET embedding_synced_at = ?
            WHERE uuid = ?
          `).bind(now, v.id).run()
        );
        await Promise.all(updatePromises);

        totalSynced += vectors.length;
      }
    }

    // 若本批次少於 100 張，表示已處理完畢
    if (cards.results.length < 100) {
      hasMore = false;
    }
  }

  console.log(`[Vectorize Sync] Synced ${totalSynced} cards`);
  return { synced: totalSynced };
}
