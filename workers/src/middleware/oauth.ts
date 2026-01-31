import type { Env } from '../types';
import { jwtVerify } from 'jose';
import { publicErrorResponse, errorResponse } from '../utils/response';

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
    console.error('JWT verification failed:', error);
    return null;
  }
}

async function checkEmailAllowed(db: D1Database, email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain) return false;

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
    } else {
      console.warn('[OAuth] auth_token not found in cookie:', cookieHeader.substring(0, 100));
    }
  } else {
    console.warn('[OAuth] No Cookie header found');
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
    return errorResponse('unauthorized', 'Missing or invalid authorization', 401, request);
  }

  const email = await verifyOAuthToken(token, env);

  if (!email) {
    return errorResponse('unauthorized', 'Invalid or expired token', 401, request);
  }

  // Verify email allowlist (domain or individual email)
  const isAllowed = await checkEmailAllowed(env.DB, email);
  if (!isAllowed) {
    return publicErrorResponse(403, request);
  }

  return { email };
}
