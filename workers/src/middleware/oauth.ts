import type { Env } from '../types';
import { jwtVerify } from 'jose';
import { publicErrorResponse, errorResponse } from '../utils/response';
import { isUserDisabled } from '../utils/user-security';
import { removeOAuthSessionForUser } from '../utils/oauth-session-index';

async function verifyOAuthToken(token: string, env: Env): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);

    const { payload } = await jwtVerify(token, secret, {
      issuer: 'db-card-api',
      algorithms: ['HS256']
    });

    // JWT verification automatically checks expiration
    return payload.email as string;
  } catch (error) {
    console.error('[JWT] Verification failed:', error);
    console.error('[JWT] Token prefix:', token.substring(0, 8) + '...');
    if (error instanceof Error) {
      console.error('[JWT] Error details:', error.message);
    }
    return null;
  }
}

async function checkEmailAllowed(db: D1Database, email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain) {
    console.error('[EmailCheck] Invalid email format - no domain found');
    return false;
  }

  // BDD: Support both domain-based and individual email validation
  // Scenario 1: Domain whitelist (e.g., 'moda.gov.tw')
  // Scenario 2: Individual email whitelist (e.g., 'chingw@acs.gov.tw')
  const result = await db.prepare(`
    SELECT 1 FROM email_allowlist
    WHERE (type = 'domain' AND domain = ?)
       OR (type = 'email' AND domain = ?)
    LIMIT 1
  `).bind(domain, email).first<{ 1: number }>();

  return result !== null;
}

export async function verifyOAuth(
  request: Request,
  env: Env
): Promise<{ email: string } | Response> {
  // Priority 1: Check HttpOnly Cookie
  const cookieHeader = request.headers.get('Cookie');
  let sessionId: string | null = null;

  if (cookieHeader) {
    const match = cookieHeader.match(/auth_token=([^;]+)/);
    if (match) {
      sessionId = match[1];
    }
  }

  let token: string | null = null;

  // If we have a session ID, retrieve JWT from KV
  if (sessionId) {
    token = await env.KV.get(`oauth_session:${sessionId}`);
  }

  // Priority 2: Fallback to Authorization header (backward compatibility)
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    console.warn('[OAuth] No token available from Cookie or Authorization header');
    return errorResponse('unauthorized', 'Missing or invalid authorization', 401, request);
  }

  const email = await verifyOAuthToken(token, env);

  if (!email) {
    console.warn('[OAuth] Token verification failed - invalid or expired token');
    return errorResponse('unauthorized', 'Invalid or expired token', 401, request);
  }

  // Security status check (RISC account disabled)
  if (await isUserDisabled(env.DB, email)) {
    if (sessionId) {
      await Promise.all([
        env.KV.delete(`oauth_session:${sessionId}`),
        env.KV.delete(`csrf_token:${sessionId}`),
        env.KV.delete(`oauth_user_info:${sessionId}`),
        removeOAuthSessionForUser(env, email, sessionId)
      ]);
    }
    return errorResponse('account_disabled', 'Account disabled for security reasons', 403, request);
  }

  // Verify email allowlist (domain or individual email)
  const isAllowed = await checkEmailAllowed(env.DB, email);
  if (!isAllowed) {
    console.error('[OAuth] FAILED: Email not in allowlist:', email);
    return publicErrorResponse(403, request);
  }

  return { email };
}
