/**
 * Auto-tagging with Simple Extraction (No Normalization in AI)
 * AI 只負責抽取，標準化由後端處理
 */

import { Env } from '../types';
import { TagExtractionResult } from '../types/tags';
import { saveTags } from '../services/tag-service';

/**
 * Generate tags using Gemini (extraction only, no normalization)
 */
async function generateTagsBatch(env: Env, cards: any[]): Promise<Array<TagExtractionResult | null>> {
  if (!env.GEMINI_API_KEY) {
    return cards.map(() => null);
  }

  const cardPrompts = cards.map((card, index) => `
Card ${index + 1}:
- Name: ${card.full_name || 'N/A'}
- Organization: ${card.organization || 'N/A'}
- Title: ${card.title || 'N/A'}
- Company Summary: ${card.company_summary || 'N/A'}
- Personal Summary: ${card.personal_summary || 'N/A'}
`).join('\n');

  const prompt = `Extract tags from the following ${cards.length} business cards.

${cardPrompts}

For each card, extract:
1. industry: Industry/sector (be specific, e.g., "軟體與資訊服務業", "資訊安全")
2. location: Location (be specific, e.g., "台北市內湖區", "新北市")
3. expertise: Areas of expertise (max 3, e.g., ["雲端架構", "DevOps", "容器化"])
4. seniority: Job level (be specific, e.g., "資深副總經理", "技術經理")

Guidelines:
- Extract as-is from the card, don't normalize or categorize
- Use the same language as the original card
- If information is insufficient, return null
- Return array with card_index (1-based)`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  card_index: { type: 'number' },
                  industry: { type: 'string', nullable: true },
                  location: { type: 'string', nullable: true },
                  expertise: {
                    type: 'array',
                    items: { type: 'string' },
                    maxItems: 3,
                    nullable: true
                  },
                  seniority: { type: 'string', nullable: true }
                },
                required: ['card_index']
              }
            }
          }
        }),
        signal: AbortSignal.timeout(30000)
      }
    );

    if (!response.ok) {
      console.error('[AutoTag] Gemini batch error:', response.status);
      return cards.map(() => null);
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('[AutoTag] No response text from Gemini');
      return cards.map(() => null);
    }

    const results = JSON.parse(text) as TagExtractionResult[];
    
    const orderedResults: Array<TagExtractionResult | null> = cards.map((_, index) => {
      const result = results.find(r => r.card_index === index + 1);
      return result || null;
    });

    return orderedResults;

  } catch (error) {
    console.error('[AutoTag] Batch generation failed:', error);
    return cards.map(() => null);
  }
}

/**
 * Main auto-tagging function
 */
export async function autoTagCards(env: Env): Promise<{ tagged: number }> {
  console.log('[AutoTag] Starting auto-tagging...');

  let totalTagged = 0;

  while (true) {
    const { results: cards } = await env.DB.prepare(`
      SELECT uuid, full_name, organization, title, company_summary, personal_summary, user_email
      FROM received_cards
      WHERE deleted_at IS NULL
        AND merged_to IS NULL
        AND auto_tagged_at IS NULL
      ORDER BY created_at DESC
      LIMIT 20
    `).all();

    if (cards.length === 0) break;

    const batchResults = await generateTagsBatch(env, cards);
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const tags = batchResults[i];

      if (tags) {
        try {
          // 使用統一服務寫入（包含標準化）
          await saveTags(env, card.uuid as string, card.user_email as string, tags);
          
          await env.DB.prepare(`
            UPDATE received_cards SET auto_tagged_at = ? WHERE uuid = ?
          `).bind(Date.now(), card.uuid).run();

          totalTagged++;
        } catch (error) {
          console.error(`[AutoTag] Failed to save tags for card ${card.uuid}:`, error);
        }
      }
    }

    if (cards.length < 20) break;
  }

  console.log(`[AutoTag] Completed: ${totalTagged} cards tagged`);
  return { tagged: totalTagged };
}
