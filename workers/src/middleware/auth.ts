// Authentication Middleware
// Provides timing-safe token verification for admin endpoints

import type { Env } from '../types';

/**
 * Verify SETUP_TOKEN from Authorization header using timing-safe comparison
 *
 * BDD Scenarios:
 * - Scenario 2: Missing Authorization header -> return false
 * - Scenario 3: Invalid token -> return false
 * - Scenario 1: Valid token -> return true
 *
 * @param request - Incoming HTTP request
 * @param env - Worker environment bindings
 * @returns Promise<boolean> - true if token is valid
 */
export async function verifySetupToken(request: Request, env: Env): Promise<boolean> {
  // Extract Authorization header
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return false;
  }

  // Check Bearer format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return false;
  }

  const providedToken = parts[1];

  // Get expected token from environment
  const expectedToken = env.SETUP_TOKEN;

  if (!expectedToken) {
    console.error('SETUP_TOKEN not configured in environment');
    return false;
  }

  // Timing-safe comparison to prevent timing attacks
  return timingSafeEqual(providedToken, expectedToken);
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
