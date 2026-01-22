// Admin Authentication Handlers
// Provides login/logout endpoints with HttpOnly cookie support

import type { Env, AdminLoginRequest } from '../../types';
import { jsonResponse, errorResponse, adminErrorResponse } from '../../utils/response';
import { validateEmail } from '../../utils/validation';
import { checkLoginRateLimit, incrementLoginAttempts, resetLoginAttempts } from '../../utils/login-rate-limit';

/**
 * Handle admin login - sets HttpOnly cookie
 * POST /api/admin/login
 *
 * Request body: { token: string }
 * Response: Sets admin_token cookie and returns success
 */
export async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  try {
    // 1. Validate request body
    const { email, token } = await request.json() as AdminLoginRequest;
    if (!email || !token) {
      return adminErrorResponse('Email and token are required', 400, request);
    }

    // 2. Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return adminErrorResponse(emailValidation.error || 'Invalid email format', 400, request);
    }

    // 3. Check rate limit
    const rateLimit = await checkLoginRateLimit(email, env);
    if (!rateLimit.allowed) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (rateLimit.retryAfter) {
        headers.set('Retry-After', rateLimit.retryAfter.toString());
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'rate_limit_exceeded',
            message: 'Too many login attempts. Please try again later.',
            retryAfter: rateLimit.retryAfter
          }
        }),
        { status: 429, headers }
      );
    }

    // 4. Timing-safe comparison
    const expectedToken = env.SETUP_TOKEN;
    if (!expectedToken) {
      await incrementLoginAttempts(email, env);
      return adminErrorResponse('Server configuration error', 500, request);
    }

    const isValid = await timingSafeEqual(token, expectedToken);
    if (!isValid) {
      await incrementLoginAttempts(email, env);
      return adminErrorResponse('Invalid token', 403, request);
    }

    // 5. Check if THIS admin has Passkey enabled
    const admin = await env.DB.prepare(
      'SELECT passkey_enabled FROM admin_users WHERE username = ? AND is_active = 1'
    ).bind(email).first<{ passkey_enabled: number }>();

    if (!admin) {
      // Don't leak email existence
      await incrementLoginAttempts(email, env);
      return adminErrorResponse('Invalid token', 403, request);
    }

    if (admin.passkey_enabled === 1) {
      console.warn(`SETUP_TOKEN rejected: passkey_enabled=1 for ${email}`);
      await incrementLoginAttempts(email, env);
      return adminErrorResponse('此管理員已啟用 Passkey，請使用 Passkey 登入', 403, request);
    }

    // 6. Reset login attempts on successful login
    await resetLoginAttempts(email, env);

    // 7. Set HttpOnly Cookie and store email in KV
    const isLocalhost = new URL(request.url).hostname === 'localhost';
    const cookieFlags = [
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=3600',
      'Path=/',
      ...(isLocalhost ? [] : ['Secure'])
    ];

    // Store email in KV for session identification (same as Passkey)
    await env.KV.put(`setup_token_session:${token}`, email, { expirationTtl: 3600 });

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': `admin_token=${token}; ${cookieFlags.join('; ')}`
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
    return adminErrorResponse('Internal server error', 500, request);
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
    const isLocalhost = new URL(request.url).hostname === 'localhost';
    const cookieOptions = [
      'admin_token=',
      'HttpOnly',
      ...(isLocalhost ? [] : ['Secure']),
      'SameSite=Lax',
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
