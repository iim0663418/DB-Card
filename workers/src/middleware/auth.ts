// Authentication Middleware
// Provides timing-safe token verification for admin endpoints

import type { Env } from '../types';

/**
 * Verify SETUP_TOKEN from Cookie (preferred) or Authorization header (fallback)
 * Supports backward compatibility by checking both authentication methods
 *
 * BDD Scenarios:
 * - Scenario 1: Valid Cookie -> return true
 * - Scenario 2: Valid Authorization header -> return true
 * - Scenario 3: Missing both -> return false
 * - Scenario 4: Invalid token -> return false
 *
 * @param request - Incoming HTTP request
 * @param env - Worker environment bindings
 * @returns Promise<boolean> - true if token is valid
 */
export async function verifySetupToken(request: Request, env: Env): Promise<boolean> {
  const expectedToken = env.SETUP_TOKEN;

  if (!expectedToken) {
    console.error('SETUP_TOKEN not configured in environment');
    return false;
  }

  // Priority 1: Check HttpOnly Cookie (Phase 2)
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const tokenFromCookie = cookies['admin_token'];

    if (tokenFromCookie) {
      const isValid = timingSafeEqual(tokenFromCookie, expectedToken);
      if (isValid) {
        return true;
      }
    }
  }

  // Priority 2: Fallback to Authorization header (backward compatibility)
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const providedToken = parts[1];
      return timingSafeEqual(providedToken, expectedToken);
    }
  }

  // No valid authentication found
  return false;
}

/**
 * Parse Cookie header into key-value pairs
 *
 * @param cookieHeader - Cookie header string
 * @returns Record of cookie name-value pairs
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const trimmed = cookie.trim();
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('='); // Handle cookies with = in value
    if (key) {
      acc[key] = value || '';
    }
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Timing-safe string comparison using crypto.subtle.timingSafeEqual
 * Falls back to constant-time comparison if not available
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns boolean - true if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  // Early length check (length is not secret)
  if (a.length !== b.length) {
    return false;
  }

  try {
    // Use Web Crypto API's timing-safe comparison
    const encoder = new TextEncoder();
    const aBuffer = encoder.encode(a);
    const bBuffer = encoder.encode(b);

    // crypto.subtle.timingSafeEqual is available in Cloudflare Workers
    return crypto.subtle.timingSafeEqual(aBuffer, bBuffer);
  } catch (error) {
    // Fallback to constant-time comparison if crypto.subtle.timingSafeEqual is not available
    console.warn('crypto.subtle.timingSafeEqual not available, using fallback');
    return constantTimeEqual(a, b);
  }
}

/**
 * Fallback constant-time string comparison
 * Ensures comparison takes the same time regardless of where strings differ
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns boolean - true if strings are equal
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
