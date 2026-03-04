/**
 * Auto-tagging Cron Job
 * Generates tags for received cards using Gemini (Batch Processing)
 */

import { Env } from '../types';

interface TagResult {
  card_index: number;
  industry?: string;
  location?: string;
  expertise?: string[];
  seniority?: string;
}

/**
 * Main auto-tagging function (Process ALL untagged cards)
 */
export async function autoTagCards(env: Env): Promise<{ tagged: number }> {
  console.log('[AutoTag] Starting auto-tagging...');

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  console.log(`[AutoTag] Looking for cards with auto_tagged_at < ${new Date(sevenDaysAgo).toISOString()}`);

  let totalTagged = 0;
  let batchCount = 0;

  // 循環處理，每次 20 張，直到全部完成
  while (true) {
    batchCount++;
    
    // 查詢未標籤的名片（批次 20 張）
    const { results: cards } = await env.DB.prepare(`
      SELECT uuid, full_name, organization, title, company_summary, personal_summary, user_email
      FROM received_cards
      WHERE deleted_at IS NULL
        AND merged_to IS NULL
        AND (auto_tagged_at IS NULL OR auto_tagged_at < ?)
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(sevenDaysAgo).all();

    console.log(`[AutoTag] Batch ${batchCount}: Found ${cards.length} cards to process`);

    if (cards.length === 0) {
      console.log('[AutoTag] No more cards to tag');
      break;
    }

    // 批次處理：單次 Gemini 調用
    const batchResults = await generateTagsBatch(env, cards);
    
    let tagged = 0;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const tags = batchResults[i];

      if (tags) {
        try {
          await saveTags(env, card.uuid as string, tags);
          
          // 更新 auto_tagged_at
          await env.DB.prepare(`
            UPDATE received_cards
            SET auto_tagged_at = ?
            WHERE uuid = ?
          `).bind(Date.now(), card.uuid).run();

          tagged++;
        } catch (error) {
          console.error(`[AutoTag] Failed to save tags for card ${card.uuid}:`, error);
        }
      }
    }

    totalTagged += tagged;
    console.log(`[AutoTag] Batch ${batchCount}: Tagged ${tagged}/${cards.length} cards`);
    
    // 如果這批少於 20 張，表示已經處理完所有卡片
    if (cards.length < 20) {
      break;
    }
  }

  console.log(`[AutoTag] Completed: ${totalTagged} cards tagged in ${batchCount} batches`);
  return { tagged: totalTagged };
}

/**
 * Generate tags using Gemini Structured Output (Batch Processing)
 */
async function generateTagsBatch(env: Env, cards: any[]): Promise<Array<TagResult | null>> {
  if (!env.GEMINI_API_KEY) {
    return cards.map(() => null);
  }

  // 構建批次 prompt
  const cardPrompts = cards.map((card, index) => `
Card ${index + 1}:
- Name: ${card.full_name || 'N/A'}
- Organization: ${card.organization || 'N/A'}
- Title: ${card.title || 'N/A'}
- Company Summary: ${card.company_summary || 'N/A'}
- Personal Summary: ${card.personal_summary || 'N/A'}
`).join('\n');

  const prompt = `Generate tags for the following ${cards.length} business cards.

${cardPrompts}

For each card, generate:
1. industry: Industry classification (single tag, e.g., accounting firm, technology, finance)
2. location: Location (single tag, e.g., city or region name)
3. expertise: Areas of expertise (max 3, e.g., tax consulting, auditing, cloud architecture)
4. seniority: Job level (single tag, e.g., executive, manager, specialist)

Notes:
- If information is insufficient, return null for that field
- expertise is an array, others are strings
- Use the same language as the original card content
- Return array with card_index matching the card number (1-based)`;

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
                    nullable: true,
                  },
                  seniority: { type: 'string', nullable: true },
                },
                required: ['card_index'],
              },
            },
          },
        }),
        signal: AbortSignal.timeout(30000), // 30s timeout for batch
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

    const results = JSON.parse(text) as TagResult[];
    
    // 將結果映射回原始順序（card_index 是 1-based）
    const orderedResults: Array<TagResult | null> = cards.map((_, index) => {
      const result = results.find(r => r.card_index === index + 1);
      return result || null;
    });

    console.log(`[AutoTag] Batch processed ${results.length}/${cards.length} cards`);
    return orderedResults;

  } catch (error) {
    console.error('[AutoTag] Batch generation failed:', error);
    return cards.map(() => null);
  }
}

/**
 * Save tags to database
 */
async function saveTags(env: Env, cardUuid: string, tags: TagResult): Promise<void> {
  const now = Date.now();
  const tagEntries: Array<{ tag: string; source: string }> = [];

  // Industry (高信心度)
  if (tags.industry) {
    tagEntries.push({ tag: `industry:${tags.industry}`, source: 'auto' });
  }

  // Location (高信心度)
  if (tags.location) {
    tagEntries.push({ tag: `location:${tags.location}`, source: 'auto' });
  }

  // Expertise (低信心度)
  if (tags.expertise && tags.expertise.length > 0) {
    for (const exp of tags.expertise.slice(0, 3)) {
      tagEntries.push({ tag: `expertise:${exp}`, source: 'auto-low-confidence' });
    }
  }

  // Seniority (低信心度)
  if (tags.seniority) {
    tagEntries.push({ tag: `seniority:${tags.seniority}`, source: 'auto-low-confidence' });
  }

  // 批次插入（使用 INSERT OR IGNORE 避免重複）
  for (const entry of tagEntries) {
    await env.DB.prepare(`
      INSERT OR IGNORE INTO card_tags (card_uuid, tag, tag_source, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(cardUuid, entry.tag, entry.source, now).run();
  }

  // 更新 tag_stats（快取）
  const card = await env.DB.prepare(`
    SELECT user_email FROM received_cards WHERE uuid = ?
  `).bind(cardUuid).first<{ user_email: string }>();

  if (card) {
    for (const entry of tagEntries) {
      await env.DB.prepare(`
        INSERT INTO tag_stats (user_email, tag, count, last_updated)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(user_email, tag) DO UPDATE SET
          count = count + 1,
          last_updated = ?
      `).bind(card.user_email, entry.tag, now, now).run();
    }
  }
}
