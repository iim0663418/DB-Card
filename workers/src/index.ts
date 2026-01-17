// Main Worker Entry Point

import type { Env } from './types';
import { handleHealth } from './handlers/health';
import { errorResponse } from './utils/response';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // Router
    if (url.pathname === '/health') {
      return handleHealth(env);
    }

    // 404 for unknown routes
    return errorResponse('not_found', 'Endpoint not found', 404);
  }
};
