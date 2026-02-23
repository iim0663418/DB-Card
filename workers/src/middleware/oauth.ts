import type { Env } from '../types';
import { jwtVerify } from 'jose';
import { publicErrorResponse, errorResponse } from '../utils/response';
import { isUserDisabled } from '../utils/user-security';
import { removeOAuthSessionForUser } from '../utils/oauth-session-index';

async function verifyOAuthToken(token: string, env: Env): Promise<string | null> {
  const DEBUG = env.ENVIRONMENT === 'staging';
  try {
    if (DEBUG) console.log('[JWT] Verifying token:', token.substring(0, 8) + '...');
    const secret = new TextEncoder().encode(env.JWT_SECRET);

    const { payload } = await jwtVerify(token, secret, {
      issuer: 'db-card-api',
      algorithms: ['HS256']
    });

    if (DEBUG) console.log('[JWT] Token verified successfully, email:', payload.email);
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

async function checkEmailAllowed(db: D1Database, email: string, env: Env): Promise<boolean> {
  const DEBUG = env.ENVIRONMENT === 'staging';
  if (DEBUG) console.log('[EmailCheck] Checking email:', email);
  const domain = email.split('@')[1];
  if (!domain) {
    console.error('[EmailCheck] Invalid email format - no domain found');
    return false;
  }

  if (DEBUG) console.log('[EmailCheck] Extracted domain:', domain);
  // BDD: Support both domain-based and individual email validation
  // Scenario 1: Domain whitelist (e.g., 'moda.gov.tw')
  // Scenario 2: Individual email whitelist (e.g., 'chingw@acs.gov.tw')
  const result = await db.prepare(`
    SELECT 1 FROM email_allowlist
    WHERE (type = 'domain' AND domain = ?)
       OR (type = 'email' AND domain = ?)
    LIMIT 1
  `).bind(domain, email).first<{ 1: number }>();

  if (DEBUG) console.log('[EmailCheck] Query result:', result !== null ? 'ALLOWED' : 'DENIED');
  if (DEBUG) console.log('[EmailCheck] Query parameters - domain:', domain, 'email:', email);
  return result !== null;
}

export async function verifyOAuth(
  request: Request,
  env: Env
): Promise<{ email: string } | Response> {
  const DEBUG = env.ENVIRONMENT === 'staging';
  if (DEBUG) console.log('[OAuth] Starting verification process');

  // Priority 1: Check HttpOnly Cookie
  const cookieHeader = request.headers.get('Cookie');
  let sessionId: string | null = null;

  if (DEBUG) console.log('[OAuth] Cookie header present:', !!cookieHeader);
  if (cookieHeader) {
    const match = cookieHeader.match(/auth_token=([^;]+)/);
    if (match) {
      sessionId = match[1];
      if (DEBUG) console.log('[OAuth] Session ID extracted:', sessionId.substring(0, 8) + '...');
    } else {
      if (DEBUG) console.warn('[OAuth] auth_token not found in cookie:', cookieHeader.substring(0, 100));
    }
  } else {
    if (DEBUG) console.warn('[OAuth] No Cookie header found');
  }

  let token: string | null = null;

  // If we have a session ID, retrieve JWT from KV
  if (sessionId) {
    if (DEBUG) console.log('[OAuth] Attempting to retrieve JWT from KV with key: oauth_session:' + sessionId.substring(0, 8) + '...');
    token = await env.KV.get(`oauth_session:${sessionId}`);
    if (DEBUG) console.log('[OAuth] JWT retrieved from KV:', token ? 'SUCCESS (token: ' + token.substring(0, 8) + '...)' : 'FAILED (null)');
  }

  // Priority 2: Fallback to Authorization header (backward compatibility)
  if (!token) {
    if (DEBUG) console.log('[OAuth] No token from KV, checking Authorization header');
    const authHeader = request.headers.get('Authorization');
    if (DEBUG) console.log('[OAuth] Authorization header present:', !!authHeader);
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      if (DEBUG) console.log('[OAuth] Token extracted from Authorization header:', token.substring(0, 8) + '...');
    }
  }

  if (!token) {
    console.error('[OAuth] FAILED: No token available from Cookie or Authorization header');
    return errorResponse('unauthorized', 'Missing or invalid authorization', 401, request);
  }

  if (DEBUG) console.log('[OAuth] Token available, proceeding to verification');
  const email = await verifyOAuthToken(token, env);

  if (!email) {
    console.error('[OAuth] FAILED: Token verification returned null');
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

  if (DEBUG) console.log('[OAuth] Email extracted from token:', email);
  // Verify email allowlist (domain or individual email)
  const isAllowed = await checkEmailAllowed(env.DB, email, env);
  if (!isAllowed) {
    console.error('[OAuth] FAILED: Email not in allowlist:', email);
    return publicErrorResponse(403, request);
  }

  if (DEBUG) console.log('[OAuth] SUCCESS: Verification complete for email:', email);
  return { email };
}
