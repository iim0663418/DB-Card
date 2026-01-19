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

async function checkEmailDomain(db: D1Database, email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain) return false;

  const result = await db.prepare(`
    SELECT domain FROM email_allowlist WHERE domain = ?
  `).bind(domain).first<{ domain: string }>();

  return result !== null;
}

export async function verifyOAuth(
  request: Request,
  env: Env
): Promise<{ email: string } | Response> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('unauthorized', 'Missing or invalid authorization', 401, request);
  }

  const token = authHeader.substring(7);
  const email = await verifyOAuthToken(token, env);

  if (!email) {
    return errorResponse('unauthorized', 'Invalid or expired token', 401, request);
  }

  // Verify email domain
  const isAllowed = await checkEmailDomain(env.DB, email);
  if (!isAllowed) {
    return publicErrorResponse(403, request);
  }

  return { email };
}
