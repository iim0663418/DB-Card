// CSP Report Handler
import type { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';

interface CSPReport {
  'csp-report': {
    'document-uri': string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    'blocked-uri': string;
    'status-code': number;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
  };
}

export async function handleCSPReport(request: Request, env: Env): Promise<Response> {
  try {
    const report: CSPReport = await request.json();
    const cspReport = report['csp-report'];

    // Log to D1 for analysis
    await env.DB.prepare(`
      INSERT INTO csp_reports (
        document_uri,
        violated_directive,
        blocked_uri,
        source_file,
        line_number,
        timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      cspReport['document-uri'],
      cspReport['violated-directive'],
      cspReport['blocked-uri'],
      cspReport['source-file'] || null,
      cspReport['line-number'] || null,
      Date.now()
    ).run();

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('CSP Report Error:', error);
    return new Response(null, { status: 204 }); // Always return 204 to avoid retry
  }
}

export async function handleCSPReportStats(request: Request, env: Env): Promise<Response> {
  try {
    // Get stats for last 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    const stats = await env.DB.prepare(`
      SELECT
        violated_directive,
        blocked_uri,
        COUNT(*) as count
      FROM csp_reports
      WHERE timestamp > ?
      GROUP BY violated_directive, blocked_uri
      ORDER BY count DESC
      LIMIT 50
    `).bind(oneDayAgo).all();

    return jsonResponse(stats.results, 200, request);
  } catch (error) {
    return errorResponse('internal_error', '查詢失敗', 500, request);
  }
}
