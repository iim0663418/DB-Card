/**
 * LearningBatcher Durable Object
 * Purpose: Batch Chinese character learning to reduce Gemini API calls 50%+
 * Accumulates characters and processes them via Alarm (5s or 20 chars)
 */

import type { Env } from '../types';

export class LearningBatcher {
  private state: DurableObjectState;
  private env: Env;
  private pendingChars: Set<string> = new Set();
  private alarmScheduled: boolean = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    state.blockConcurrencyWhile(async () => {
      const stored = await state.storage.get<string[]>('pendingChars');
      if (stored) {
        this.pendingChars = new Set(stored);
      }
      const alarm = await state.storage.getAlarm();
      this.alarmScheduled = alarm !== null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/add') {
      const { char } = await request.json<{ char: string }>();
      await this.addChar(char);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }

  private async addChar(char: string): Promise<void> {
    this.pendingChars.add(char);
    await this.state.storage.put('pendingChars', Array.from(this.pendingChars));

    if (!this.alarmScheduled) {
      await this.state.storage.setAlarm(Date.now() + 5000);
      this.alarmScheduled = true;
    }

    if (this.pendingChars.size >= 20) {
      await this.processBatch();
    }
  }

  async alarm(): Promise<void> {
    this.alarmScheduled = false;
    await this.processBatch();
  }

  private async processBatch(): Promise<void> {
    if (this.pendingChars.size === 0) return;

    const chars = Array.from(this.pendingChars);
    this.pendingChars.clear();
    await this.state.storage.delete('pendingChars');

    // Check daily limit
    const id = this.env.LEARNING_COUNTER.idFromName('global');
    const counter = this.env.LEARNING_COUNTER.get(id);
    const limitResponse = await counter.fetch(new Request('http://internal/increment'));
    const limitData = await limitResponse.json() as { allowed: boolean };

    if (!limitData.allowed) {
      console.log('[LearningBatcher] Daily limit reached');
      return;
    }

    const prompt = `你是簡繁體轉換專家。只轉換簡體字，繁體字保持不變。返回 JSON 格式：{"简": "繁", ...}，每個字元都要返回。\n\n字元：${JSON.stringify(chars)}`;

    try {
      const apiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.env.GEMINI_MODEL}:generateContent?key=${this.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              response_mime_type: 'application/json'
            }
          })
        }
      );

      if (!apiResponse.ok) {
        throw new Error(`Gemini API ${apiResponse.status}`);
      }

      const data = await apiResponse.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const mappings: Record<string, string> = JSON.parse(text || '{}');

      const filtered = Object.entries(mappings).filter(([s, t]) => s !== t);
      if (filtered.length > 0) {
        const now = Date.now();
        const batch = filtered.map(([s, t]) =>
          this.env.DB.prepare(
            `INSERT INTO chinese_variants (simplified, traditional, learned_at, source)
             VALUES (?, ?, ?, 'gemini') ON CONFLICT DO NOTHING`
          ).bind(s, t, now)
        );
        await this.env.DB.batch(batch);

        const today = new Date().toISOString().split('T')[0];
        await this.env.DB.prepare(
          `INSERT INTO learning_metrics (date, learned_count, api_calls, success_count, updated_at)
           VALUES (?, ?, 1, 1, ?)
           ON CONFLICT(date) DO UPDATE SET
             learned_count = learned_count + ?,
             api_calls = api_calls + 1,
             success_count = success_count + 1,
             updated_at = ?`
        ).bind(today, filtered.length, now, filtered.length, now).run();
      } else {
        // Still record the API call even if no new mappings
        const today = new Date().toISOString().split('T')[0];
        const now = Date.now();
        await this.env.DB.prepare(
          `INSERT INTO learning_metrics (date, api_calls, success_count, updated_at)
           VALUES (?, 1, 1, ?)
           ON CONFLICT(date) DO UPDATE SET
             api_calls = api_calls + 1,
             success_count = success_count + 1,
             updated_at = ?`
        ).bind(today, now, now).run();
      }

      console.log(`[LearningBatcher] Batch processed ${chars.length} chars, learned ${filtered.length}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[LearningBatcher] Failed:', errorMsg);

      for (const char of chars) {
        await this.addToQueue(char, errorMsg);
      }

      const today = new Date().toISOString().split('T')[0];
      const now = Date.now();
      await this.env.DB.prepare(
        `INSERT INTO learning_metrics (date, api_calls, failure_count, updated_at)
         VALUES (?, 1, 1, ?)
         ON CONFLICT(date) DO UPDATE SET
           api_calls = api_calls + 1,
           failure_count = failure_count + 1,
           updated_at = ?`
      ).bind(today, now, now).run();
    }
  }

  private async addToQueue(char: string, error: string): Promise<void> {
    const now = Date.now();
    const nextRetry = now + 5 * 60 * 1000;

    await this.env.DB.prepare(
      `INSERT INTO learning_queue
       (char, attempts, next_retry_at, last_error, status, created_at, updated_at)
       VALUES (?, 1, ?, ?, 'pending', ?, ?)
       ON CONFLICT(char) DO UPDATE SET
         attempts = attempts + 1,
         next_retry_at = ?,
         last_error = ?,
         status = 'pending',
         updated_at = ?`
    ).bind(char, nextRetry, error, now, now, nextRetry, error, now).run();
  }
}
