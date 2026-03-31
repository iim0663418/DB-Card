import type { Env } from '../types';

export async function retryLearningQueue(env: Env): Promise<void> {
  const now = Date.now();

  const { results } = await env.DB.prepare(
    `SELECT char, attempts FROM learning_queue
     WHERE status = 'pending' AND next_retry_at <= ?
     ORDER BY next_retry_at ASC LIMIT 20`
  ).bind(now).all<{ char: string; attempts: number }>();

  if (!results || results.length === 0) {
    console.log('[RetryQueue] No characters to retry');
    return;
  }

  console.log(`[RetryQueue] Retrying ${results.length} characters`);

  const chars = results.map(r => r.char);
  await env.DB.prepare(
    `UPDATE learning_queue SET status = 'processing'
     WHERE char IN (${chars.map(() => '?').join(',')})`
  ).bind(...chars).run();

  try {
    const systemInstruction = `你是簡繁體轉換專家。

要求：
1. 只轉換簡體字，繁體字保持不變
2. 返回 JSON 格式：{"简": "繁", ...}
3. 每個字元都要返回

範例：
輸入：["软", "件", "開"]
輸出：{"软": "軟", "件": "件", "開": "開"}`;

    const userQuery = `請將以下字元轉換為繁體字（如果已是繁體則保持不變）：\n\n字元：${chars.join(', ')}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_LITE_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [{
            parts: [{ text: userQuery }],
            role: 'user'
          }],
          generationConfig: {
            response_mime_type: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API ${response.status}`);
    }

    const data = await response.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
    const text = data.candidates[0].content.parts[0].text;
    const mappings: Record<string, string> = JSON.parse(text);

    const filtered = Object.entries(mappings).filter(([s, t]) => s !== t);
    if (filtered.length > 0) {
      const batch = filtered.map(([s, t]) =>
        env.DB.prepare(
          `INSERT INTO chinese_variants (simplified, traditional, learned_at, source)
           VALUES (?, ?, ?, 'gemini') ON CONFLICT DO NOTHING`
        ).bind(s, t, now)
      );

      await env.DB.batch(batch);

      const successChars = filtered.map(([s]) => s);
      await env.DB.prepare(
        `DELETE FROM learning_queue WHERE char IN (${successChars.map(() => '?').join(',')})`
      ).bind(...successChars).run();

      console.log(`[RetryQueue] Successfully learned ${filtered.length} characters`);

      // Update daily metrics
      const today = new Date().toISOString().split('T')[0];
      await env.DB.prepare(
        `INSERT INTO learning_metrics (date, learned_count, api_calls, success_count, updated_at)
         VALUES (?, ?, 1, 1, ?)
         ON CONFLICT(date) DO UPDATE SET
           learned_count = learned_count + ?,
           api_calls = api_calls + 1,
           success_count = success_count + 1,
           updated_at = ?`
      ).bind(today, filtered.length, now, filtered.length, now).run();
    }

    // Reset any remaining chars that were identical (s === t) back to pending or delete them
    const learnedChars = new Set(filtered.map(([s]) => s));
    const identicalChars = chars.filter(c => mappings[c] !== undefined && !learnedChars.has(c));
    if (identicalChars.length > 0) {
      await env.DB.prepare(
        `DELETE FROM learning_queue WHERE char IN (${identicalChars.map(() => '?').join(',')})`
      ).bind(...identicalChars).run();
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[RetryQueue] Failed:`, errorMsg);

    // Update daily metrics (failure)
    const today = new Date().toISOString().split('T')[0];
    await env.DB.prepare(
      `INSERT INTO learning_metrics (date, api_calls, failure_count, updated_at)
       VALUES (?, 1, 1, ?)
       ON CONFLICT(date) DO UPDATE SET
         api_calls = api_calls + 1,
         failure_count = failure_count + 1,
         updated_at = ?`
    ).bind(today, now, now).run();

    for (const { char, attempts } of results) {
      if (attempts >= 5) {
        await env.DB.prepare(
          `UPDATE learning_queue SET status = 'failed', last_error = ?, updated_at = ?
           WHERE char = ?`
        ).bind(errorMsg, now, char).run();
      } else {
        const backoffMinutes = 5 * Math.pow(2, attempts);
        const nextRetry = now + backoffMinutes * 60 * 1000;

        await env.DB.prepare(
          `UPDATE learning_queue
           SET attempts = ?, next_retry_at = ?, last_error = ?,
               status = 'pending', updated_at = ?
           WHERE char = ?`
        ).bind(attempts + 1, nextRetry, errorMsg, now, char).run();
      }
    }
  }
}
