/**
 * Smart Chinese Traditional/Simplified Converter with Auto-Learning
 * Purpose: Normalize organization names for search
 * Features:
 * - Memory cache for fast lookup (<0.1ms)
 * - Auto-learning via Gemini AI for unknown characters
 * - D1 persistence for learned mappings
 */

import type { Env } from '../types';

/**
 * Global memory cache for character mappings
 * Loaded from D1 on first request
 */
let VARIANTS_CACHE: Record<string, string> | null = null;

/**
 * Load character mappings from D1 into memory cache
 */
async function ensureCacheLoaded(env: Env): Promise<void> {
  if (VARIANTS_CACHE) return;
  
  const { results } = await env.DB.prepare(
    'SELECT simplified, traditional FROM chinese_variants'
  ).all<{ simplified: string; traditional: string }>();
  
  VARIANTS_CACHE = Object.fromEntries(
    results.map(r => [r.simplified, r.traditional])
  );
  
  console.log(`[ChineseConverter] Loaded ${results.length} character mappings`);
}

/**
 * Find unknown simplified characters in text
 */
function findUnknownChars(text: string): string[] {
  if (!VARIANTS_CACHE) return [];
  
  const unknown = new Set<string>();
  for (const char of text) {
    // Skip ASCII, punctuation, numbers
    if (char.charCodeAt(0) < 0x4E00 || char.charCodeAt(0) > 0x9FFF) continue;
    
    // Check if unknown
    if (!VARIANTS_CACHE[char]) {
      unknown.add(char);
    }
  }
  
  return Array.from(unknown);
}

/**
 * Add failed character to learning queue with exponential backoff
 */
async function addToLearningQueue(
  char: string,
  error: string,
  env: Env
): Promise<void> {
  const now = Date.now();

  const existing = await env.DB.prepare(
    `SELECT attempts FROM learning_queue WHERE char = ?`
  ).bind(char).first<{ attempts: number }>();

  if (existing) {
    const attempts = existing.attempts + 1;
    const backoffMinutes = 5 * Math.pow(2, attempts - 1);
    const nextRetry = now + backoffMinutes * 60 * 1000;

    await env.DB.prepare(
      `UPDATE learning_queue
       SET attempts = ?, next_retry_at = ?, last_error = ?,
           status = 'pending', updated_at = ?
       WHERE char = ?`
    ).bind(attempts, nextRetry, error, now, char).run();
  } else {
    const nextRetry = now + 5 * 60 * 1000;

    await env.DB.prepare(
      `INSERT INTO learning_queue
       (char, attempts, next_retry_at, last_error, status, created_at, updated_at)
       VALUES (?, 1, ?, ?, 'pending', ?, ?)`
    ).bind(char, nextRetry, error, now, now).run();
  }
}

/**
 * Learn new character mappings via Gemini AI (single attempt, fast-fail)
 * Failures are added to learning_queue for cron retry
 */
async function learnNewChars(
  chars: string[],
  env: Env
): Promise<void> {
  if (!await checkDailyLimit(env)) {
    console.log('[ChineseConverter] Daily learning limit reached');
    return;
  }

  const systemInstruction = `你是簡繁體轉換專家。

要求：
1. 只轉換簡體字，繁體字保持不變
2. 返回 JSON 格式：{"简": "繁", ...}
3. 每個字元都要返回

範例：
輸入：["软", "件", "開"]
輸出：{"软": "軟", "件": "件", "開": "開"}`;

  const userQuery = `請將以下字元轉換為繁體字（如果已是繁體則保持不變）：\n\n字元：${chars.join(', ')}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
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
      const error = `Gemini API ${response.status}`;
      console.error(`[ChineseConverter] ${error}`);
      for (const char of chars) {
        await addToLearningQueue(char, error, env);
      }
      return;
    }

    const data = await response.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
    const text = data.candidates[0].content.parts[0].text;
    const mappings: Record<string, string> = JSON.parse(text);

    await saveMappings(mappings, env);
    Object.assign(VARIANTS_CACHE!, mappings);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ChineseConverter] Failed:`, errorMsg);
    for (const char of chars) {
      await addToLearningQueue(char, errorMsg, env);
    }
  }
}

/**
 * Save learned mappings to D1
 */
async function saveMappings(
  mappings: Record<string, string>,
  env: Env
): Promise<void> {
  // Filter out identical mappings (e.g., 碁 → 碁)
  const filtered = Object.fromEntries(
    Object.entries(mappings).filter(([s, t]) => s !== t)
  );
  
  if (Object.keys(filtered).length === 0) {
    console.log('[ChineseConverter] No new mappings to save (all identical)');
    return;
  }
  
  const now = Date.now();

  const stmt = env.DB.prepare(`
    INSERT INTO chinese_variants (simplified, traditional, learned_at, source)
    VALUES (?, ?, ?, 'gemini')
    ON CONFLICT (simplified) DO NOTHING
  `);

  const batch = Object.entries(filtered).map(([s, t]) =>
    stmt.bind(s, t, now)
  );

  await env.DB.batch(batch);
  
  console.log(`[ChineseConverter] Learned ${Object.keys(filtered).length} new characters`);
}

/**
 * Check daily learning limit using Durable Object atomic counter
 */
async function checkDailyLimit(env: Env): Promise<boolean> {
  try {
    const id = env.LEARNING_COUNTER.idFromName('global');
    const counter = env.LEARNING_COUNTER.get(id);
    
    const response = await counter.fetch(new Request('http://internal/increment'));
    const data = await response.json() as { allowed: boolean; count: number };
    
    if (!data.allowed) {
      console.warn(`[ChineseConverter] Daily learning limit reached: ${data.count}/1000`);
    }
    
    return data.allowed;
  } catch (error) {
    console.error('[ChineseConverter] Failed to check daily limit:', error);
    // Fail open: allow learning if counter is unavailable
    return true;
  }
}

/**
 * Normalize Chinese text to Traditional characters (Smart Version)
 * @param text - Input text (may contain simplified Chinese)
 * @param env - Cloudflare Worker environment (optional, for auto-learning)
 * @returns Text with simplified characters converted to traditional
 * 
 * @example
 * await normalizeToTraditional("奥義智慧科技", env) // "奧義智慧科技"
 * await normalizeToTraditional("软件开发", env) // "軟件開發" (auto-learns "软", "开", "发")
 */
export async function normalizeToTraditional(
  text: string | null | undefined,
  env?: Env
): Promise<string | null> {
  if (!text) return text ?? null;
  
  // Load cache if not loaded
  if (env) {
    await ensureCacheLoaded(env);
  }
  
  // Fast path: use memory cache
  if (VARIANTS_CACHE) {
    const result = text
      .split('')
      .map(char => VARIANTS_CACHE![char] || char)
      .join('');
    
    // Check for unknown characters and trigger background learning
    if (env) {
      const unknown = findUnknownChars(text);

      if (unknown.length > 0) {
        // Auto-learn in background (non-blocking, fast-fail with queue)
        env.ctx?.waitUntil(learnNewChars(unknown, env));
      }
    }
    
    return result;
  }
  
  // Fallback: return as-is
  return text;
}

/**
 * Synchronous version (no auto-learning)
 * Use when env is not available
 */
export function normalizeToTraditionalSync(text: string | null | undefined): string | null {
  if (!text || !VARIANTS_CACHE) return text ?? null;
  
  return text
    .split('')
    .map(char => VARIANTS_CACHE![char] || char)
    .join('');
}
