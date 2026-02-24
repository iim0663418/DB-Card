/**
 * Auto-tagging Cron Job
 * Generates tags for received cards using FileSearchStore + Gemini
 */

import { Env } from '../types';

interface TagResult {
  industry?: string;
  location?: string;
  expertise?: string[];
  seniority?: string;
}

/**
 * Main auto-tagging function
 */
export async function autoTagCards(env: Env): Promise<{ tagged: number }> {
  console.log('[AutoTag] Starting auto-tagging...');

  // 查詢未標籤的名片（批次 20 張）
  const { results: cards } = await env.DB.prepare(`
    SELECT uuid, full_name, organization, title, company_summary, personal_summary, user_email
    FROM received_cards
    WHERE deleted_at IS NULL
      AND merged_to IS NULL
      AND (auto_tagged_at IS NULL OR auto_tagged_at < ?)
    ORDER BY created_at DESC
    LIMIT 20
  `).bind(Date.now() - 7 * 24 * 60 * 60 * 1000).all(); // 7 天前標籤的重新標籤

  if (cards.length === 0) {
    console.log('[AutoTag] No cards to tag');
    return { tagged: 0 };
  }

  let tagged = 0;

  for (const card of cards) {
    try {
      const tags = await generateTags(env, card);

      if (tags) {
        await saveTags(env, card.uuid as string, tags);
        
        // 更新 auto_tagged_at
        await env.DB.prepare(`
          UPDATE received_cards
          SET auto_tagged_at = ?
          WHERE uuid = ?
        `).bind(Date.now(), card.uuid).run();

        tagged++;
      }
    } catch (error) {
      console.error(`[AutoTag] Failed for card ${card.uuid}:`, error);
    }
  }

  console.log(`[AutoTag] Tagged ${tagged} cards`);
  return { tagged };
}

/**
 * Generate tags using Gemini Structured Output
 */
async function generateTags(env: Env, card: any): Promise<TagResult | null> {
  if (!env.GEMINI_API_KEY) return null;

  const prompt = `根據以下名片資訊，生成標籤：

姓名：${card.full_name || 'N/A'}
組織：${card.organization || 'N/A'}
職稱：${card.title || 'N/A'}
公司摘要：${card.company_summary || 'N/A'}
個人摘要：${card.personal_summary || 'N/A'}

請生成以下標籤（使用繁體中文）：
1. industry: 產業分類（單一標籤，例如：會計師事務所、科技業、金融業）
2. location: 地區（單一標籤，例如：台北、新竹、台中）
3. expertise: 專長領域（最多 3 個，例如：稅務諮詢、審計、雲端架構）
4. seniority: 職級（單一標籤，例如：高階主管、中階主管、專業人員）

注意：
- 如果資訊不足，該欄位回傳 null
- expertise 是陣列，其他是字串
- 使用繁體中文`;

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
              type: 'object',
              properties: {
                industry: { type: 'string', nullable: true },
                location: { type: 'string', nullable: true },
                expertise: {
                  type: 'array',
                  items: { type: 'string' },
                  nullable: true,
                },
                seniority: { type: 'string', nullable: true },
              },
            },
          },
        }),
        signal: AbortSignal.timeout(10000), // 10s timeout
      }
    );

    if (!response.ok) {
      console.error('[AutoTag] Gemini error:', response.status);
      return null;
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    return JSON.parse(text) as TagResult;
  } catch (error) {
    console.error('[AutoTag] Generate tags failed:', error);
    return null;
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
