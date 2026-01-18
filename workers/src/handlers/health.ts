// Health Check Handler
// Verifies D1 Database connection

import type { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleHealth(request: Request, env: Env): Promise<Response> {
  try {
    // Test D1 connection
    const result = await env.DB.prepare('SELECT 1 as test').first<{ test: number }>();

    if (result?.test !== 1) {
      throw new Error('Database query returned unexpected result');
    }

    // Test KEK availability
    const hasKek = !!env.KEK;

    // Get KEK version (latest version from kek_versions table)
    let kekVersion: number | string = 'N/A';
    try {
      const kekResult = await env.DB.prepare(
        'SELECT version FROM kek_versions ORDER BY version DESC LIMIT 1'
      ).first<{ version: number }>();

      if (kekResult?.version) {
        kekVersion = kekResult.version;
      }
    } catch (error) {
      console.error('Failed to query KEK version:', error);
      // Continue execution, kekVersion will remain 'N/A'
    }

    // Get active cards count
    let activeCards: number | string = 'N/A';
    try {
      const cardsResult = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM cards WHERE status = ?'
      ).bind('active').first<{ count: number }>();

      if (typeof cardsResult?.count === 'number') {
        activeCards = cardsResult.count;
      }
    } catch (error) {
      console.error('Failed to query active cards:', error);
      // Continue execution, activeCards will remain 'N/A'
    }

    return jsonResponse({
      status: 'ok',
      database: 'connected',
      kek: hasKek ? 'configured' : 'missing',
      kek_version: kekVersion,
      active_cards: activeCards,
      environment: env.ENVIRONMENT,
      timestamp: Date.now()
    }, 200, request);
  } catch (error) {
    return errorResponse(
      'health_check_failed',
      error instanceof Error ? error.message : 'Unknown error',
      500,
      request
    );
  }
}
