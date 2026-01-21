// Main Worker Entry Point

import type { Env } from './types';
import { handleHealth } from './handlers/health';
import { handleTap } from './handlers/tap';
import { handleRead } from './handlers/read';
import { handleCreateCard, handleUpdateCard, handleDeleteCard, handleRestoreCard, handleListCards, handleGetCard, handleResetBudget } from './handlers/admin/cards';
import { handleRevoke } from './handlers/admin/revoke';
import { handleKekRotate } from './handlers/admin/kek';
import { handleAdminLogin, handleAdminLogout } from './handlers/admin/auth';
import { handleSecurityStats, handleSecurityEvents, handleSecurityTimeline, handleBlockIP, handleUnblockIP, handleIPDetail, handleSecurityExport } from './handlers/admin/security';
import { handleUserCreateCard, handleUserUpdateCard, handleUserListCards, handleUserGetCard, handleUserRevokeCard, handleUserRestoreCard } from './handlers/user/cards';
import { handleRevocationHistory } from './handlers/user/history';
import { handleUserLogout } from './handlers/user/logout';
import { handleOAuthCallback } from './handlers/oauth';
import { errorResponse, publicErrorResponse } from './utils/response';
import { checkRateLimit } from './middleware/rate-limit';

/**
 * Generate cryptographic nonce for CSP
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Add security headers to HTML responses
 * Includes CSP, X-Content-Type-Options, X-Frame-Options, etc.
 */
function addSecurityHeaders(response: Response, nonce: string): Response {
  const headers = new Headers(response.headers);

  // Content Security Policy (with nonce, no unsafe-inline for scripts)
  headers.set('Content-Security-Policy',
    "default-src 'self'; " +
    `script-src 'self' 'nonce-${nonce}' cdn.tailwindcss.com unpkg.com cdnjs.cloudflare.com cdn.jsdelivr.net; ` +
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.tailwindcss.com; " +
    "font-src 'self' fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' cdn.jsdelivr.net https://api.db-card.moda.gov.tw https://oauth2.googleapis.com https://www.googleapis.com accounts.google.com"
  );

  // Additional security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return new Response(response.clone().body, {
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
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Generate nonce for this request
    const nonce = generateNonce();

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

    // OAuth callback
    if (url.pathname === '/oauth/callback' && request.method === 'GET') {
      return handleOAuthCallback(request, env);
    }

    // User logout
    if (url.pathname === '/api/user/logout' && request.method === 'POST') {
      return handleUserLogout(request, env);
    }

    // Health check
    if (url.pathname === '/health') {
      return handleHealth(request, env);
    }

    if (url.pathname === '/api/nfc/tap' && request.method === 'POST') {
      return handleTap(request, env, ctx);
    }

    if (url.pathname === '/api/read' && request.method === 'GET') {
      return handleRead(request, env, ctx);
    }

    // User Self-Service APIs (OAuth required)
    if (url.pathname === '/api/user/cards' && request.method === 'POST') {
      return handleUserCreateCard(request, env);
    }

    if (url.pathname === '/api/user/cards' && request.method === 'GET') {
      return handleUserListCards(request, env);
    }

    // PUT /api/user/cards/:uuid - Update user's own card
    const updateUserCardMatch = url.pathname.match(/^\/api\/user\/cards\/([a-f0-9-]{36})$/);
    if (updateUserCardMatch && request.method === 'PUT') {
      const uuid = updateUserCardMatch[1];
      return handleUserUpdateCard(request, env, uuid);
    }

    // GET /api/user/cards/:uuid - Get user's own card details
    const getUserCardMatch = url.pathname.match(/^\/api\/user\/cards\/([a-f0-9-]{36})$/);
    if (getUserCardMatch && request.method === 'GET') {
      const uuid = getUserCardMatch[1];
      return handleUserGetCard(request, env, uuid);
    }

    // POST /api/user/cards/:uuid/revoke - User self-revoke card
    const revokeUserCardMatch = url.pathname.match(/^\/api\/user\/cards\/([a-f0-9-]{36})\/revoke$/);
    if (revokeUserCardMatch && request.method === 'POST') {
      const uuid = revokeUserCardMatch[1];
      return handleUserRevokeCard(request, env, uuid);
    }

    // POST /api/user/cards/:uuid/restore - User self-restore card
    const restoreUserCardMatch = url.pathname.match(/^\/api\/user\/cards\/([a-f0-9-]{36})\/restore$/);
    if (restoreUserCardMatch && request.method === 'POST') {
      const uuid = restoreUserCardMatch[1];
      return handleUserRestoreCard(request, env, uuid);
    }

    // GET /api/user/revocation-history - Query revocation history
    if (url.pathname === '/api/user/revocation-history' && request.method === 'GET') {
      return handleRevocationHistory(request, env);
    }

    // Admin APIs
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

    // DELETE /api/admin/cards/:uuid - Revoke a card
    const deleteCardMatch = url.pathname.match(/^\/api\/admin\/cards\/([a-f0-9-]{36})$/);
    if (deleteCardMatch && request.method === 'DELETE') {
      const uuid = deleteCardMatch[1];
      return handleDeleteCard(request, env, uuid);
    }

    // POST /api/admin/cards/:uuid/restore - Restore a revoked card
    const restoreCardMatch = url.pathname.match(/^\/api\/admin\/cards\/([a-f0-9-]{36})\/restore$/);
    if (restoreCardMatch && request.method === 'POST') {
      const uuid = restoreCardMatch[1];
      return handleRestoreCard(request, env, uuid);
    }

    // POST /api/admin/cards/:uuid/reset-budget - Reset session budget
    const resetBudgetMatch = url.pathname.match(/^\/api\/admin\/cards\/([a-f0-9-]{36})\/reset-budget$/);
    if (resetBudgetMatch && request.method === 'POST') {
      const uuid = resetBudgetMatch[1];
      return handleResetBudget(request, env, ctx, uuid);
    }

    // POST /api/admin/revoke - Emergency revocation
    if (url.pathname === '/api/admin/revoke' && request.method === 'POST') {
      return handleRevoke(request, env);
    }

    // POST /api/admin/kek/rotate - KEK rotation
    if (url.pathname === '/api/admin/kek/rotate' && request.method === 'POST') {
      return handleKekRotate(request, env);
    }

    // GET /api/admin/security/stats - Security statistics
    if (url.pathname === '/api/admin/security/stats' && request.method === 'GET') {
      return handleSecurityStats(request, env);
    }

    // GET /api/admin/security/events - Security events list
    if (url.pathname === '/api/admin/security/events' && request.method === 'GET') {
      return handleSecurityEvents(request, env);
    }

    // GET /api/admin/security/timeline - Security timeline
    if (url.pathname === '/api/admin/security/timeline' && request.method === 'GET') {
      return handleSecurityTimeline(request, env);
    }

    // POST /api/admin/security/block - Block IP
    if (url.pathname === '/api/admin/security/block' && request.method === 'POST') {
      return handleBlockIP(request, env);
    }

    // DELETE /api/admin/security/block/:ip - Unblock IP
    const unblockMatch = url.pathname.match(/^\/api\/admin\/security\/block\/(.+)$/);
    if (unblockMatch && request.method === 'DELETE') {
      const ip = decodeURIComponent(unblockMatch[1]);
      return handleUnblockIP(request, env, ip);
    }

    // GET /api/admin/security/ip/:ip - IP detail analysis
    const ipDetailMatch = url.pathname.match(/^\/api\/admin\/security\/ip\/(.+)$/);
    if (ipDetailMatch && request.method === 'GET') {
      const ip = decodeURIComponent(ipDetailMatch[1]);
      return handleIPDetail(request, env, ip);
    }

    // GET /api/admin/security/export - Export security events as CSV
    if (url.pathname === '/api/admin/security/export' && request.method === 'GET') {
      return handleSecurityExport(request, env);
    }

    // Serve static assets (admin-dashboard.html, etc.)
    // This handles requests for static files before falling through to 404
    if (env.ASSETS) {
      try {
        let asset = await env.ASSETS.fetch(request);
        if (asset.status !== 404) {
          // Inject nonce into HTML responses
          const contentType = asset.headers.get('content-type');
          if (contentType?.includes('text/html')) {
            let html = await asset.text();
            // Add nonce to all script tags
            html = html.replace(/<script/g, `<script nonce="${nonce}"`);
            asset = new Response(html, {
              status: asset.status,
              statusText: asset.statusText,
              headers: asset.headers
            });
            return addSecurityHeaders(asset, nonce);
          }
          return asset;
        }
      } catch (e) {
        // If ASSETS fetch fails, continue to 404 handling
        console.error('Failed to fetch asset:', e);
      }
    }

    // 404 for unknown routes - use public error response to prevent information disclosure
    // Check rate limit for 404 errors
    const rateLimitResponse = await checkRateLimit(request, env, '404');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    let response = await publicErrorResponse(404, request);

    // Apply security headers to HTML responses
    if (response.headers.get('content-type')?.includes('text/html')) {
      response = await addSecurityHeaders(response, nonce);
    }

    return response;
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Run all cleanup tasks at 02:00 UTC
    const { handleScheduledCleanup } = await import('./scheduled-cleanup');
    const { handleScheduledLogRotation } = await import('./scheduled-log-rotation');
    const { handleScheduledKVCleanup } = await import('./scheduled-kv-cleanup');
    
    // Run sequentially to avoid resource contention
    await handleScheduledCleanup(env);
    await handleScheduledLogRotation(env);
    await handleScheduledKVCleanup(env);
  }
};
