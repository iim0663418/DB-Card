// CSRF Protection Middleware
// Validates CSRF tokens for state-changing requests (POST/PUT/DELETE)
// Note: This middleware runs BEFORE authentication (industry standard)

import type { Env } from '../types';
import { errorResponse } from '../utils/response';

/**
 * CSRF middleware that validates tokens for state-changing requests
 * @param request - The incoming request
 * @param env - Cloudflare environment bindings
 * @returns null if validation passes, Response if validation fails
 */
export async function csrfMiddleware(request: Request, env: Env): Promise<Response | null> {
  const method = request.method;

  // Skip CSRF check for GET requests (safe methods)
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null;
  }

  // Extract CSRF token from X-CSRF-Token header
  const csrfToken = request.headers.get('X-CSRF-Token');
  if (!csrfToken) {
    return errorResponse('csrf_token_missing', 'CSRF token is required', 403, request);
  }

  // Extract session token from cookie (for KV lookup only, not for auth)
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    // No cookie means no session, but we still need to check CSRF token exists
    // Let auth middleware handle the authentication failure
    return null;
  }

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const trimmed = cookie.trim();
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=');
    if (key) acc[key] = value || '';
    return acc;
  }, {} as Record<string, string>);

  const sessionToken = cookies['admin_token'];
  if (!sessionToken) {
    // No session token, let auth middleware handle it
    return null;
  }

  // Validate CSRF token against stored value
  const storedToken = await env.KV.get(`csrf_token:${sessionToken}`);
  if (!storedToken) {
    // No stored CSRF token, might be expired session
    // Let auth middleware handle session validation
    return null;
  }

  // Timing-safe comparison
  try {
    const encoder = new TextEncoder();
    const tokenBuffer = encoder.encode(csrfToken);
    const storedBuffer = encoder.encode(storedToken);

    if (tokenBuffer.length !== storedBuffer.length) {
      return errorResponse('csrf_token_invalid', 'Invalid CSRF token', 403, request);
    }

    const isValid = await crypto.subtle.timingSafeEqual(tokenBuffer, storedBuffer);
    if (!isValid) {
      return errorResponse('csrf_token_invalid', 'Invalid CSRF token', 403, request);
    }
  } catch (error) {
    // Fallback to constant-time comparison
    if (!constantTimeEqual(csrfToken, storedToken)) {
      return errorResponse('csrf_token_invalid', 'Invalid CSRF token', 403, request);
    }
  }

  // CSRF validation passed, continue to auth middleware
  return null;
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
