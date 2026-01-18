// Admin Authentication Handlers
// Provides login/logout endpoints with HttpOnly cookie support

import type { Env } from '../../types';
import { jsonResponse, errorResponse } from '../../utils/response';

/**
 * Handle admin login - sets HttpOnly cookie
 * POST /api/admin/login
 *
 * Request body: { token: string }
 * Response: Sets admin_token cookie and returns success
 */
export async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { token: string };
    const { token } = body;

    if (!token) {
      return errorResponse('invalid_request', '缺少 token 參數', 400, request);
    }

    // Verify token using timing-safe comparison
    const expectedToken = env.SETUP_TOKEN;
    if (!expectedToken) {
      console.error('SETUP_TOKEN not configured in environment');
      return errorResponse('server_error', '伺服器設定錯誤', 500, request);
    }

    // Timing-safe comparison
    const isValid = await timingSafeEqual(token, expectedToken);
    if (!isValid) {
      return errorResponse('forbidden', '無效的授權 Token', 403, request);
    }

    // Set HttpOnly Cookie
    const cookieOptions = [
      `admin_token=${token}`,
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Max-Age=3600', // 1 hour
      'Path=/'
    ].join('; ');

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': cookieOptions
    });

    // Add CORS headers
    const origin = request.headers.get('Origin');
    const ALLOWED_ORIGINS = [
      'http://localhost:8788',
      'http://localhost:8787',
      'https://db-card-staging.csw30454.workers.dev',
      'https://db-card.moda.gov.tw'
    ];

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return new Response(
      JSON.stringify({ success: true, data: { authenticated: true } }),
      { headers }
    );

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('server_error', '登入失敗', 500, request);
  }
}

/**
 * Handle admin logout - clears HttpOnly cookie
 * POST /api/admin/logout
 *
 * Response: Clears admin_token cookie and returns success
 */
export async function handleAdminLogout(request: Request, env: Env): Promise<Response> {
  try {
    // Clear cookie by setting Max-Age=0
    const cookieOptions = [
      'admin_token=',
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Max-Age=0',
      'Path=/'
    ].join('; ');

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': cookieOptions
    });

    // Add CORS headers
    const origin = request.headers.get('Origin');
    const ALLOWED_ORIGINS = [
      'http://localhost:8788',
      'http://localhost:8787',
      'https://db-card-staging.csw30454.workers.dev',
      'https://db-card.moda.gov.tw'
    ];

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return new Response(
      JSON.stringify({ success: true, data: { message: '已登出' } }),
      { headers }
    );

  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse('server_error', '登出失敗', 500, request);
  }
}

/**
 * Timing-safe string comparison
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  // Early length check (length is not secret)
  if (a.length !== b.length) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const aBuffer = encoder.encode(a);
    const bBuffer = encoder.encode(b);

    return crypto.subtle.timingSafeEqual(aBuffer, bBuffer);
  } catch (error) {
    console.warn('crypto.subtle.timingSafeEqual not available, using fallback');
    return constantTimeEqual(a, b);
  }
}

/**
 * Fallback constant-time comparison
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
