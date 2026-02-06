// Analytics Handler for Web Vitals
import type { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleVitalsReport(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.text();
    const data = JSON.parse(body);

    // Validate data
    if (!data.fcp || !data.lcp || !data.page) {
      return new Response(null, { status: 400 });
    }

    // Store in D1 (async, non-blocking)
    await env.DB.prepare(`
      INSERT INTO web_vitals (metric_name, metric_value, page, timestamp)
      VALUES ('fcp', ?, ?, ?), ('lcp', ?, ?, ?), ('tti', ?, ?, ?)
    `).bind(
      data.fcp, data.page, data.timestamp,
      data.lcp, data.page, data.timestamp,
      data.tti || 0, data.page, data.timestamp
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
        metric_name,
        AVG(metric_value) as avg,
        MIN(metric_value) as min,
        MAX(metric_value) as max,
        COUNT(*) as count
      FROM web_vitals
      WHERE timestamp > ? AND page = 'card-display'
      GROUP BY metric_name
    `).bind(sevenDaysAgo).all();

    return jsonResponse(stats.results, 200, request);
  } catch (error) {
    return errorResponse('internal_error', '查詢失敗', 500, request);
  }
}
