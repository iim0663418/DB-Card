import type { Env } from '../types';

/**
 * 漏斗式名片去重（每日 02:00 UTC 執行）
 * 階段 1: Blocking → 階段 2: String Matching → 階段 3: Vectorize → 階段 4: Gemini LLM
 */
export async function deduplicateCards(env: Env): Promise<{ merged: number }> {
  let merged = 0;
  const processedPairs = new Set<string>();
  const mergedCards = new Set<string>();

  const users = await env.DB.prepare(`
    SELECT DISTINCT user_email 
    FROM received_cards 
    WHERE deleted_at IS NULL AND merged_to IS NULL
  `).all();

  for (const user of users.results) {
    const cards = await env.DB.prepare(`
      SELECT * FROM received_cards
      WHERE user_email = ? 
        AND deleted_at IS NULL 
        AND merged_to IS NULL
      ORDER BY created_at DESC
    `).bind((user as any).user_email).all();

    // 階段 1: Blocking
    const blocks = groupByBlocking(cards.results);

    for (const block of blocks) {
      if (block.length < 2) continue;

      const activeCards = block.filter(c => !mergedCards.has((c as any).uuid));

      for (let i = 0; i < activeCards.length; i++) {
        for (let j = i + 1; j < activeCards.length; j++) {
          const cardA = activeCards[i] as any;
          const cardB = activeCards[j] as any;

          const pairKey = [cardA.uuid, cardB.uuid].sort().join('|');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          // 階段 2: String Matching
          const stringSimilarity = calculateStringSimilarity(cardA, cardB);

          if (stringSimilarity.score > 90) {
            await mergeCards(env, cardA, cardB, stringSimilarity);
            mergedCards.add(cardB.uuid);
            merged++;
            continue;
          }

          if (stringSimilarity.score < 50) continue;

          // 階段 2.5: FileSearchStore 上下文增強（50-90 分數區間）
          if (stringSimilarity.score >= 50 && stringSimilarity.score <= 90) {
            // 1. 查詢公司關係
            const companyResult = await checkCompanyRelationship(
              env,
              cardA.organization || '',
              cardB.organization || ''
            );

            // 2. 查詢人名變體
            const personResult = await checkPersonIdentity(env, cardA, cardB);

            // 3. 綜合判斷
            if (companyResult.isSameCompany && personResult.isSamePerson) {
              // 同公司 + 同人 = 高信心度合併
              await mergeCards(env, cardA, cardB, {
                score: Math.max(95, personResult.confidence),
                reason: `FileSearchStore: same person, same company (${personResult.reason})`
              });
              mergedCards.add(cardB.uuid);
              merged++;
              continue;
            }

            if (personResult.isSamePerson && personResult.confidence > 85) {
              // 高信心度人名匹配（可能轉職）
              await mergeCards(env, cardA, cardB, {
                score: personResult.confidence,
                reason: `FileSearchStore: same person (${personResult.reason})`
              });
              mergedCards.add(cardB.uuid);
              merged++;
              continue;
            }

            if (companyResult.isSameCompany && stringSimilarity.score > 70) {
              // 同公司 + 中等字串相似度
              await mergeCards(env, cardA, cardB, {
                score: 90,
                reason: `FileSearchStore: same company + string match (${stringSimilarity.score})`
              });
              mergedCards.add(cardB.uuid);
              merged++;
              continue;
            }
          }

          // 階段 3: Vectorize Similarity
          const vectorSimilarity = await queryVectorizeSimilarity(
            env, 
            cardA.uuid, 
            cardB.uuid,
            cardA.user_email
          );

          if (vectorSimilarity.score > 0.85) {
            await mergeCards(env, cardA, cardB, vectorSimilarity);
            mergedCards.add(cardB.uuid);
            merged++;
            continue;
          }

          if (vectorSimilarity.score < 0.70) continue;

          // 階段 4: Gemini LLM（困難案例）
          const llmResult = await geminiDuplicateCheck(env, cardA, cardB);

          if (llmResult.isDuplicate && llmResult.confidence > 85) {
            await mergeCards(env, cardA, cardB, {
              score: llmResult.confidence,
              reason: llmResult.reason
            });
            mergedCards.add(cardB.uuid);
            merged++;
          }
        }
      }
    }
  }

  console.log(`[Deduplicate] Merged ${merged} cards`);
  return { merged };
}

/**
 * Blocking: 按 Email domain 或 Phone 分組
 */
function groupByBlocking(cards: any[]): any[][] {
  const blocks = new Map<string, any[]>();

  for (const card of cards) {
    if (card.email) {
      const domain = card.email.split('@')[1];
      if (!blocks.has(domain)) blocks.set(domain, []);
      blocks.get(domain)!.push(card);
    }

    if (card.phone) {
      const normalized = card.phone.replace(/[-\s+]/g, '');
      if (!blocks.has(normalized)) blocks.set(normalized, []);
      blocks.get(normalized)!.push(card);
    }
  }

  return Array.from(blocks.values());
}

/**
 * String Similarity (簡化版 Levenshtein)
 */
function calculateStringSimilarity(cardA: any, cardB: any): { score: number; reason: string } {
  const emailMatch = cardA.email === cardB.email ? 100 : 0;
  const phoneMatch = cardA.phone === cardB.phone ? 100 : 0;
  
  // 簡化：使用字串包含判斷
  const nameSim = cardA.full_name === cardB.full_name ? 100 : 
                  cardA.full_name.includes(cardB.full_name) || cardB.full_name.includes(cardA.full_name) ? 70 : 0;
  const orgSim = cardA.organization === cardB.organization ? 100 :
                 cardA.organization.includes(cardB.organization) || cardB.organization.includes(cardA.organization) ? 70 : 0;

  const weighted = 
    emailMatch * 0.4 +
    nameSim * 0.3 +
    phoneMatch * 0.2 +
    orgSim * 0.1;

  return {
    score: weighted,
    reason: `String similarity: ${weighted.toFixed(1)}%`
  };
}

/**
 * 查詢 Vectorize 相似度（含 Multi-tenant 隔離）
 */
async function queryVectorizeSimilarity(
  env: Env, 
  uuidA: string,
  uuidB: string,
  userEmail: string
): Promise<{ score: number; reason: string }> {
  try {
    const matches = await env.VECTORIZE.query(await getCardEmbedding(env, uuidA), {
      topK: 10,
      returnMetadata: 'all',
      filter: { user_email: userEmail }
    });

    const match = matches.matches.find(m => m.id === uuidB);

    if (match) {
      return {
        score: match.score,  // Vectorize score 是 similarity (0-1)
        reason: `Vectorize cosine similarity: ${match.score.toFixed(3)}`
      };
    }

    return {
      score: 0,
      reason: 'Not in top-10 similar vectors'
    };
  } catch (error) {
    console.error('[Vectorize] Query failed:', error);
    return { score: 0, reason: 'Vectorize query error' };
  }
}

/**
 * 取得名片的 Embedding
 */
async function getCardEmbedding(env: Env, uuid: string): Promise<number[]> {
  const card = await env.DB.prepare(`
    SELECT full_name, organization, title, department
    FROM received_cards
    WHERE uuid = ?
  `).bind(uuid).first();

  if (!card) throw new Error(`Card ${uuid} not found`);

  const text = `${(card as any).full_name} ${(card as any).organization} ${(card as any).title} ${(card as any).department || ''}`.trim();
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_EMBEDDING_MODEL}:embedContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: 768
      })
    }
  );

  const data = await response.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}

/**
 * Gemini LLM 判斷重複
 */
async function geminiDuplicateCheck(env: Env, cardA: any, cardB: any): Promise<{ isDuplicate: boolean; confidence: number; reason: string }> {
  const prompt = `判斷以下兩張名片是否為同一人：

名片 A (${new Date(cardA.created_at).toLocaleDateString()}):
- 姓名: ${cardA.full_name}
- 公司: ${cardA.organization}
- Email: ${cardA.email || 'N/A'}
- 職稱: ${cardA.title || 'N/A'}
- 電話: ${cardA.phone || 'N/A'}

名片 B (${new Date(cardB.created_at).toLocaleDateString()}):
- 姓名: ${cardB.full_name}
- 公司: ${cardB.organization}
- Email: ${cardB.email || 'N/A'}
- 職稱: ${cardB.title || 'N/A'}
- 電話: ${cardB.phone || 'N/A'}

判斷標準：
1. Email 相同 → 100% 同一人
2. 姓名 + 公司別名相同 → 95% 同一人
3. 電話相同 → 90% 同一人
4. 姓名相同 + Email domain 相同 → 85% 同一人`;

  const schema = {
    type: "object" as const,
    properties: {
      isDuplicate: { type: "boolean" as const },
      confidence: { type: "number" as const, minimum: 0, maximum: 100 },
      reason: { type: "string" as const }
    },
    required: ["isDuplicate", "confidence", "reason"]
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema
          }
        })
      }
    );

    const data = await response.json() as any;
    const text = data.candidates[0].content.parts[0].text;
    return JSON.parse(text);
  } catch (error) {
    console.error('[Gemini] Duplicate check failed:', error);
    return { isDuplicate: false, confidence: 0, reason: 'LLM error' };
  }
}

/**
 * 查詢 FileSearchStore 確認公司關係
 */
async function checkCompanyRelationship(
  env: Env,
  orgA: string,
  orgB: string
): Promise<{ isSameCompany: boolean; reason: string }> {
  if (!env.FILE_SEARCH_STORE_NAME || !env.GEMINI_API_KEY) {
    return { isSameCompany: false, reason: 'FileSearchStore not configured' };
  }

  if (!orgA || !orgB) {
    return { isSameCompany: false, reason: 'Missing organization name' };
  }

  try {
    const query = `${orgA} 和 ${orgB} 是否為同一家公司？請確認公司別名、英文名、簡稱。`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${env.FILE_SEARCH_STORE_NAME}:query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          query,
          pageSize: 3,
        }),
        signal: AbortSignal.timeout(2000), // 2s timeout
      }
    );

    if (!response.ok) {
      console.error('[Context] FileSearchStore error:', response.status);
      return { isSameCompany: false, reason: 'API error' };
    }

    const data = await response.json() as {
      relevantChunks?: Array<{
        text?: string;
        chunkRelevanceScore?: { score?: number };
      }>;
    };

    // 檢查是否有高相關性的結果
    const topChunk = data.relevantChunks?.[0];
    if (!topChunk || !topChunk.chunkRelevanceScore?.score) {
      return { isSameCompany: false, reason: 'No relevant context' };
    }

    const score = topChunk.chunkRelevanceScore.score;
    const text = topChunk.text || '';

    // 檢查文本是否同時包含兩個組織名（表示它們在同一文件中）
    const containsBoth = text.includes(orgA) || text.includes(orgB);
    const hasAlias = text.toLowerCase().includes('alias') || text.includes('別名');

    if (score > 0.8 && (containsBoth || hasAlias)) {
      return {
        isSameCompany: true,
        reason: `FileSearchStore confirmed (score: ${score.toFixed(2)})`
      };
    }

    return { isSameCompany: false, reason: 'Low confidence' };
  } catch (error) {
    console.error('[Context] FileSearchStore query failed:', error);
    return { isSameCompany: false, reason: 'Query error' };
  }
}

/**
 * 查詢 FileSearchStore 確認人名變體
 */
async function checkPersonIdentity(
  env: Env,
  cardA: any,
  cardB: any
): Promise<{ isSamePerson: boolean; reason: string; confidence: number }> {
  if (!env.FILE_SEARCH_STORE_NAME || !env.GEMINI_API_KEY) {
    return { isSamePerson: false, reason: 'Not configured', confidence: 0 };
  }

  if (!cardA.full_name || !cardB.full_name) {
    return { isSamePerson: false, reason: 'Missing name', confidence: 0 };
  }

  try {
    const query = `
      ${cardA.full_name} 和 ${cardB.full_name} 是否為同一人？
      背景資訊：
      - A: ${cardA.organization || 'N/A'} ${cardA.title || 'N/A'}
      - B: ${cardB.organization || 'N/A'} ${cardB.title || 'N/A'}
      
      考慮：中英文名對應、姓名變體、職位變動、公司轉職
    `.trim();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${env.FILE_SEARCH_STORE_NAME}:query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          query,
          pageSize: 5,
        }),
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!response.ok) {
      return { isSamePerson: false, reason: 'API error', confidence: 0 };
    }

    const data = await response.json() as {
      relevantChunks?: Array<{
        text?: string;
        chunkRelevanceScore?: { score?: number };
      }>;
    };

    // 分析結果
    const chunks = data.relevantChunks || [];
    let maxScore = 0;

    for (const chunk of chunks) {
      const score = chunk.chunkRelevanceScore?.score || 0;
      const text = chunk.text || '';

      // 檢查是否同時提到兩個名字或組織
      const mentionsNameA = text.includes(cardA.full_name);
      const mentionsNameB = text.includes(cardB.full_name);
      const mentionsOrgA = cardA.organization && text.includes(cardA.organization);
      const mentionsOrgB = cardB.organization && text.includes(cardB.organization);

      const hasEvidence = (mentionsNameA || mentionsNameB) && (mentionsOrgA || mentionsOrgB);

      if (hasEvidence && score > maxScore) {
        maxScore = score;
      }
    }

    // 判斷邏輯
    const confidence = Math.round(maxScore * 100);

    if (maxScore > 0.85) {
      return {
        isSamePerson: true,
        reason: `High confidence (${maxScore.toFixed(2)})`,
        confidence
      };
    }

    if (maxScore > 0.70) {
      return {
        isSamePerson: true,
        reason: `Probable match (${maxScore.toFixed(2)})`,
        confidence
      };
    }

    return {
      isSamePerson: false,
      reason: 'Insufficient evidence',
      confidence
    };
  } catch (error) {
    console.error('[Context] Person identity check failed:', error);
    return { isSamePerson: false, reason: 'Query error', confidence: 0 };
  }
}

/**
 * 合併名片（保留職位歷史）
 */
async function mergeCardsWithHistory(
  env: Env, 
  cardA: any, 
  cardB: any, 
  result: { score: number; reason: string }
) {
  const [newer, older] = cardA.created_at > cardB.created_at ? [cardA, cardB] : [cardB, cardA];

  // 判斷變動類型
  let changeType: 'promotion' | 'transfer' | 'duplicate' = 'duplicate';
  
  if (newer.organization === older.organization && newer.title !== older.title) {
    changeType = 'promotion'; // 同公司職位變動
  } else if (newer.organization !== older.organization) {
    changeType = 'transfer'; // 公司轉職
  }

  // 解析現有職位歷史
  let jobHistory: Array<{
    organization: string;
    title: string;
    department?: string;
    date: number;
    type: string;
  }> = [];

  try {
    if (newer.job_history) {
      jobHistory = JSON.parse(newer.job_history);
    }
  } catch (error) {
    console.error('[Merge] Failed to parse job_history:', error);
  }

  // 添加舊名片的職位記錄
  jobHistory.push({
    organization: older.organization || '',
    title: older.title || '',
    department: older.department || undefined,
    date: older.created_at,
    type: changeType
  });

  // 按時間排序（最新的在前）
  jobHistory.sort((a, b) => b.date - a.date);

  // 補充舊名片的資訊到新名片
  const updates: Record<string, any> = {
    job_history: JSON.stringify(jobHistory)
  };

  for (const field of ['phone', 'email', 'website', 'address']) {
    if (!newer[field] && older[field]) {
      updates[field] = older[field];
    }
  }

  // 更新新名片
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  await env.DB.prepare(`
    UPDATE received_cards 
    SET ${setClause}, updated_at = ?
    WHERE uuid = ?
  `).bind(...values, Date.now(), newer.uuid).run();

  // 標記舊名片為已合併
  await env.DB.prepare(`
    UPDATE received_cards
    SET merged_to = ?, merge_reason = ?, merge_confidence = ?, updated_at = ?
    WHERE uuid = ?
  `).bind(
    newer.uuid,
    result.reason,
    Math.round(result.score),
    Date.now(),
    older.uuid
  ).run();

  console.log(`[Merge] ${older.uuid} → ${newer.uuid} (${changeType}, confidence: ${result.score})`);
}

/**
 * 合併名片（舊版，向後相容）
 */
async function mergeCards(
  env: Env, 
  cardA: any, 
  cardB: any, 
  result: { score: number; reason: string }
) {
  // 直接調用新版函數
  return mergeCardsWithHistory(env, cardA, cardB, result);
}
