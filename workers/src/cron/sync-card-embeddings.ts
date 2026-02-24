import type { Env } from '../types';

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
      SELECT uuid, user_email, full_name, organization, title, department, email, phone
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

    // 批次生成 Embeddings（20 張一批）
    const batchSize = 20;
    for (let i = 0; i < cards.results.length; i += batchSize) {
      const batch = cards.results.slice(i, i + batchSize);
      
      // 並行生成 embeddings
      const embeddingPromises = batch.map(async (card: any) => {
        const text = `${card.full_name} ${card.organization} ${card.title} ${card.department || ''}`.trim();
        
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/models/${env.GEMINI_EMBEDDING_MODEL}:embedContent?key=${env.GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: { parts: [{ text }] }
              })
            }
          );

          if (!response.ok) {
            // Consume response body to prevent deadlock
            await response.text().catch(() => {});
            throw new Error(`Embedding API failed: ${response.status}`);
          }

          const data = await response.json() as { embedding: { values: number[] } };
          return {
            id: card.uuid,
            values: data.embedding.values,
            metadata: {
              user_email: card.user_email,
              card_uuid: card.uuid,
              full_name: card.full_name,
              organization: card.organization
            }
          };
        } catch (error) {
          console.error(`[Vectorize Sync] Failed to embed card ${card.uuid}:`, error);
          return null;
        }
      });

      const vectors = (await Promise.all(embeddingPromises)).filter(v => v !== null) as VectorizeVector[];

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
