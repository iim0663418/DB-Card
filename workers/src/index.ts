// Main Worker Entry Point

import type { Env } from './types';
import { handleHealth } from './handlers/health';
import { handleTap } from './handlers/tap';
import { handleRead } from './handlers/read';
import { handleCreateCard, handleUpdateCard, handleDeleteCard, handleListCards, handleGetCard } from './handlers/admin/cards';
import { handleRevoke } from './handlers/admin/revoke';
import { handleKekRotate } from './handlers/admin/kek';
import { handleAdminLogin, handleAdminLogout } from './handlers/admin/auth';
import { errorResponse, publicErrorResponse } from './utils/response';

/**
 * Add security headers to HTML responses
 * Includes CSP, X-Content-Type-Options, X-Frame-Options, etc.
 */
function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  // Content Security Policy
  headers.set('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' cdn.tailwindcss.com unpkg.com cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.tailwindcss.com; " +
    "font-src 'self' fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://db-card-api-staging.csw30454.workers.dev https://api.db-card.moda.gov.tw"
  );

  // Additional security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// CORS allowed origins whitelist (duplicated from response.ts for OPTIONS handling)
const ALLOWED_ORIGINS = [
  'http://localhost:8788',
  'http://localhost:8787',
  'https://db-card-staging.csw30454.workers.dev',
  'https://db-card.moda.gov.tw'
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight with whitelist
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin');
      const headers: HeadersInit = {};

      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        headers['Access-Control-Allow-Credentials'] = 'true';
      }

      return new Response(null, { headers });
    }

    // Router

    // Admin authentication endpoints
    if (url.pathname === '/api/admin/login' && request.method === 'POST') {
      return handleAdminLogin(request, env);
    }

    if (url.pathname === '/api/admin/logout' && request.method === 'POST') {
      return handleAdminLogout(request, env);
    }

    // Health check
    if (url.pathname === '/health') {
      return handleHealth(request, env);
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

    // GET /api/admin/cards - List all cards
    if (url.pathname === '/api/admin/cards' && request.method === 'GET') {
      return handleListCards(request, env);
    }

    // GET /api/admin/cards/:uuid - Get single card
    const getCardMatch = url.pathname.match(/^\/api\/admin\/cards\/([a-f0-9-]{36})$/);
    if (getCardMatch && request.method === 'GET') {
      const uuid = getCardMatch[1];
      return handleGetCard(request, env, uuid);
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

    // 404 for unknown routes - use public error response to prevent information disclosure
    let response = publicErrorResponse(404, request);

    // Apply security headers to HTML responses
    if (response.headers.get('content-type')?.includes('text/html')) {
      response = addSecurityHeaders(response);
    }

    return response;
  }
};
