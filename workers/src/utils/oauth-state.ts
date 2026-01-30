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
 * OAuth state data structure
 */
export interface OAuthStateData {
  nonce?: string;
  codeVerifier?: string;
  createdAt: number;
}

/**
 * Store state parameter in KV with TTL
 * @param state - The state UUID
 * @param env - Worker environment
 * @param data - Optional additional data (nonce, codeVerifier)
 */
export async function storeOAuthState(
  state: string,
  env: Env,
  data?: Partial<OAuthStateData>
): Promise<void> {
  const key = `${STATE_PREFIX}${state}`;

  const stateData: OAuthStateData = {
    createdAt: Date.now(),
    ...data
  };

  await env.KV.put(key, JSON.stringify(stateData), { expirationTtl: STATE_TTL });
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
  const storedData = await env.KV.get(key);

  if (!storedData) {
    // State not found or expired
    return false;
  }

  // Delete immediately (one-time use)
  await env.KV.delete(key);

  return true;
}

/**
 * Get and consume state data (one-time use)
 * @param state - The state UUID
 * @param env - Worker environment
 * @returns State data if valid, null otherwise
 */
export async function getAndConsumeOAuthState(
  state: string,
  env: Env
): Promise<OAuthStateData | null> {
  if (!state) {
    return null;
  }

  const key = `${STATE_PREFIX}${state}`;
  const storedData = await env.KV.get(key);

  if (!storedData) {
    return null;
  }

  // Delete immediately (one-time use)
  await env.KV.delete(key);

  try {
    return JSON.parse(storedData);
  } catch {
    return null;
  }
}
