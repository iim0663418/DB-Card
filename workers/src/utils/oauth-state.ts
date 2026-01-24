/**
 * OAuth State Parameter Management
 *
 * Implements CSRF protection for OAuth2 flow via state parameter
 * - RFC 6749 Section 10.12 (CSRF Protection)
 * - OWASP OAuth2 Cheat Sheet
 */

import type { Env } from '../types';

const STATE_TTL = 600; // 10 minutes
const STATE_PREFIX = 'oauth_state:';

/**
 * Generate a cryptographically secure state parameter
 * @returns UUID v4 state string
 */
export function generateOAuthState(): string {
  return crypto.randomUUID();
}

/**
 * Store state parameter in KV with TTL
 * @param state - The state UUID
 * @param env - Worker environment
 */
export async function storeOAuthState(state: string, env: Env): Promise<void> {
  const key = `${STATE_PREFIX}${state}`;
  const timestamp = Date.now().toString();

  await env.KV.put(key, timestamp, { expirationTtl: STATE_TTL });
}

/**
 * Validate and consume state parameter (one-time use)
 * @param state - The state UUID to validate
 * @param env - Worker environment
 * @returns true if valid, false otherwise
 */
export async function validateAndConsumeOAuthState(state: string, env: Env): Promise<boolean> {
  if (!state) {
    return false;
  }

  const key = `${STATE_PREFIX}${state}`;
  const storedTimestamp = await env.KV.get(key);

  if (!storedTimestamp) {
    // State not found or expired
    return false;
  }

  // Delete immediately (one-time use)
  await env.KV.delete(key);

  return true;
}
