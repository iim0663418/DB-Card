// Main Worker Entry Point

import type { Env } from './types';
import { handleHealth } from './handlers/health';
import { handleTap } from './handlers/tap';
import { handleRead } from './handlers/read';
import { handleCreateCard, handleUpdateCard, handleDeleteCard } from './handlers/admin/cards';
import { handleRevoke } from './handlers/admin/revoke';
import { handleKekRotate } from './handlers/admin/kek';
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
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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

    if (url.pathname === '/api/admin/cards' && request.method === 'POST') {
      return handleCreateCard(request, env);
    }

    // PUT /api/admin/cards/:uuid - Update a card
    const updateCardMatch = url.pathname.match(/^\/api\/admin\/cards\/([a-f0-9-]{36})$/);
    if (updateCardMatch && request.method === 'PUT') {
      const uuid = updateCardMatch[1];
      return handleUpdateCard(request, env, uuid);
    }

    // DELETE /api/admin/cards/:uuid - Delete a card
    const deleteCardMatch = url.pathname.match(/^\/api\/admin\/cards\/([a-f0-9-]{36})$/);
    if (deleteCardMatch && request.method === 'DELETE') {
      const uuid = deleteCardMatch[1];
      return handleDeleteCard(request, env, uuid);
    }

    // POST /api/admin/revoke - Emergency revocation
    if (url.pathname === '/api/admin/revoke' && request.method === 'POST') {
      return handleRevoke(request, env);
    }

    // POST /api/admin/kek/rotate - KEK rotation
    if (url.pathname === '/api/admin/kek/rotate' && request.method === 'POST') {
      return handleKekRotate(request, env);
    }

    // 404 for unknown routes
    return errorResponse('not_found', 'Endpoint not found', 404);
  }
};
