import type { Env } from '../types';
import { jwtVerify } from 'jose';
import { publicErrorResponse, errorResponse } from '../utils/response';

async function verifyOAuthToken(token: string, env: Env): Promise<string | null> {
  try {
    console.log('[JWT] Verifying token:', token.substring(0, 8) + '...');
    const secret = new TextEncoder().encode(env.JWT_SECRET);

    const { payload } = await jwtVerify(token, secret, {
      issuer: 'db-card-api',
      algorithms: ['HS256']
    });

    console.log('[JWT] Token verified successfully, email:', payload.email);
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
  console.log('[EmailCheck] Checking email:', email);
  const domain = email.split('@')[1];
  if (!domain) {
    console.error('[EmailCheck] Invalid email format - no domain found');
    return false;
  }

  console.log('[EmailCheck] Extracted domain:', domain);
  // BDD: Support both domain-based and individual email validation
  // Scenario 1: Domain whitelist (e.g., 'moda.gov.tw')
  // Scenario 2: Individual email whitelist (e.g., 'chingw@acs.gov.tw')
  const result = await db.prepare(`
    SELECT 1 FROM email_allowlist
    WHERE (type = 'domain' AND domain = ?)
       OR (type = 'email' AND domain = ?)
    LIMIT 1
  `).bind(domain, email).first<{ 1: number }>();

  console.log('[EmailCheck] Query result:', result !== null ? 'ALLOWED' : 'DENIED');
  console.log('[EmailCheck] Query parameters - domain:', domain, 'email:', email);
  return result !== null;
}

export async function verifyOAuth(
  request: Request,
  env: Env
): Promise<{ email: string } | Response> {
  console.log('[OAuth] Starting verification process');

  // Priority 1: Check HttpOnly Cookie
  const cookieHeader = request.headers.get('Cookie');
  let sessionId: string | null = null;

  console.log('[OAuth] Cookie header present:', !!cookieHeader);
  if (cookieHeader) {
    const match = cookieHeader.match(/auth_token=([^;]+)/);
    if (match) {
      sessionId = match[1];
      console.log('[OAuth] Session ID extracted:', sessionId.substring(0, 8) + '...');
    } else {
      console.warn('[OAuth] auth_token not found in cookie:', cookieHeader.substring(0, 100));
    }
  } else {
    console.warn('[OAuth] No Cookie header found');
  }

  let token: string | null = null;

  // If we have a session ID, retrieve JWT from KV
  if (sessionId) {
    console.log('[OAuth] Attempting to retrieve JWT from KV with key: oauth_session:' + sessionId.substring(0, 8) + '...');
    token = await env.KV.get(`oauth_session:${sessionId}`);
    console.log('[OAuth] JWT retrieved from KV:', token ? 'SUCCESS (token: ' + token.substring(0, 8) + '...)' : 'FAILED (null)');
  }

  // Priority 2: Fallback to Authorization header (backward compatibility)
  if (!token) {
    console.log('[OAuth] No token from KV, checking Authorization header');
    const authHeader = request.headers.get('Authorization');
    console.log('[OAuth] Authorization header present:', !!authHeader);
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('[OAuth] Token extracted from Authorization header:', token.substring(0, 8) + '...');
    }
  }

  if (!token) {
    console.error('[OAuth] FAILED: No token available from Cookie or Authorization header');
    return errorResponse('unauthorized', 'Missing or invalid authorization', 401, request);
  }

  console.log('[OAuth] Token available, proceeding to verification');
  const email = await verifyOAuthToken(token, env);

  if (!email) {
    console.error('[OAuth] FAILED: Token verification returned null');
    return errorResponse('unauthorized', 'Invalid or expired token', 401, request);
  }

  console.log('[OAuth] Email extracted from token:', email);
  // Verify email allowlist (domain or individual email)
  const isAllowed = await checkEmailAllowed(env.DB, email);
  if (!isAllowed) {
    console.error('[OAuth] FAILED: Email not in allowlist:', email);
    return publicErrorResponse(403, request);
  }

  console.log('[OAuth] SUCCESS: Verification complete for email:', email);
  return { email };
}
