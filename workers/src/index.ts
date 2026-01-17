// Main Worker Entry Point

import type { Env } from './types';
import { handleHealth } from './handlers/health';
import { handleTap } from './handlers/tap';
import { handleRead } from './handlers/read';
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

    if (url.pathname === '/api/nfc/tap' && request.method === 'POST') {
      return handleTap(request, env);
    }

    if (url.pathname === '/api/read' && request.method === 'GET') {
      return handleRead(request, env);
    }

    // 404 for unknown routes
    return errorResponse('not_found', 'Endpoint not found', 404);
  }
};
