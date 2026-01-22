// CSRF Token Protection Utilities
// Implements P1 security fix for CSRF attacks

import type { Env } from '../types';

/**
 * Generate a cryptographically secure CSRF token
 * @returns 32-byte random token in base64url format
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  // Convert to base64url
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Store CSRF token in KV with session token as key
 * @param sessionToken - The session token from cookie
 * @param csrfToken - The generated CSRF token
 * @param env - Cloudflare environment bindings
 */
export async function storeCsrfToken(
  sessionToken: string,
  csrfToken: string,
  env: Env
): Promise<void> {
  // Store with 1 hour TTL (same as session)
  await env.KV.put(`csrf_token:${sessionToken}`, csrfToken, { expirationTtl: 3600 });
}

/**
 * Validate CSRF token against stored value
 * @param sessionToken - The session token from cookie
 * @param csrfToken - The CSRF token from request header
 * @param env - Cloudflare environment bindings
 * @returns true if valid, false otherwise
 */
export async function validateCsrfToken(
  sessionToken: string,
  csrfToken: string,
  env: Env
): Promise<boolean> {
  const storedToken = await env.KV.get(`csrf_token:${sessionToken}`);

  if (!storedToken) {
    return false;
  }

  // Timing-safe comparison
  try {
    const encoder = new TextEncoder();
    const tokenBuffer = encoder.encode(csrfToken);
    const storedBuffer = encoder.encode(storedToken);

    // Early length check
    if (tokenBuffer.length !== storedBuffer.length) {
      return false;
    }

    return crypto.subtle.timingSafeEqual(tokenBuffer, storedBuffer);
  } catch (error) {
    console.warn('crypto.subtle.timingSafeEqual not available, using fallback');
    return constantTimeEqual(csrfToken, storedToken);
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
