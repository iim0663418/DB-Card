// Health Check Handler
// Verifies D1 Database connection

import type { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleHealth(env: Env): Promise<Response> {
  try {
    // Test D1 connection
    const result = await env.DB.prepare('SELECT 1 as test').first<{ test: number }>();
    
    if (result?.test !== 1) {
      throw new Error('Database query returned unexpected result');
    }

    // Test KEK availability
    const hasKek = !!env.KEK;

    return jsonResponse({
      status: 'ok',
      database: 'connected',
      kek: hasKek ? 'configured' : 'missing',
      environment: env.ENVIRONMENT,
      timestamp: Date.now()
    });
  } catch (error) {
    return errorResponse(
      'health_check_failed',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
