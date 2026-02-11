// Analytics Handler for Web Vitals
import type { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';

interface VitalsPayload {
  fcp?: number | null;
  lcp?: number | null;
  inp?: number | null;
  cls?: number | null;
  card_content_ready?: number | null;
  page: string;
  timestamp: number;
}

function clamp(value: number | null | undefined, min: number, max: number): number | null {
  if (value === null || value === undefined) return null;
  return value >= min && value <= max ? value : null;
}

export async function handleVitalsReport(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.text();
    const data: VitalsPayload = JSON.parse(body);

    // Validate required fields
    if (!data.page) {
      return new Response(null, { status: 400 });
    }

    // Validate and sanitize ranges
    const fcp = clamp(data.fcp, 0, 10000);
    const lcp = clamp(data.lcp, 0, 10000);
    const inp = clamp(data.inp, 0, 5000);
    const cls = clamp(data.cls, 0, 1);
    const cardContentReady = clamp(data.card_content_ready, 0, 10000);
    const timestamp = data.timestamp ?? Date.now();

    await env.DB.prepare(`
      INSERT INTO web_vitals (page, fcp, lcp, inp, cls, card_content_ready, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.page, fcp, lcp, inp, cls, cardContentReady, timestamp
    ).run();

    return new Response(null, { status: 204 });
  } catch (error) {
    return new Response(null, { status: 500 });
  }
}

export async function handleVitalsStats(request: Request, env: Env): Promise<Response> {
  try {
    // Get stats for last 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const stats = await env.DB.prepare(`
      SELECT
        AVG(fcp) as fcp,
        AVG(lcp) as lcp,
        AVG(inp) as inp,
        AVG(cls) as cls,
        AVG(card_content_ready) as card_content_ready,
        COUNT(*) as count
      FROM web_vitals
      WHERE timestamp > ? AND page = 'card-display'
    `).bind(sevenDaysAgo).first();

    return jsonResponse(stats, 200, request);
  } catch (error) {
    return errorResponse('internal_error', '查詢失敗', 500, request);
  }
}
