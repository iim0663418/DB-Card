/**
 * OAuth Nonce Management (Anti-Replay Protection)
 *
 * BDD Scenarios:
 * 1. Generate and store nonce with 600s TTL
 * 2. Validate and consume nonce (one-time use)
 * 3. Reject invalid/missing nonce
 * 4. Auto-cleanup expired nonce via KV TTL
 */

const NONCE_PREFIX = 'oauth_nonce:';
const NONCE_TTL = 600; // 10 minutes

/**
 * Generate random nonce
 * Scenario 1: Generate nonce using crypto.randomUUID
 */
export function generateOAuthNonce(): string {
  return crypto.randomUUID();
}

/**
 * Store nonce in KV with TTL
 * Scenario 1: Store nonce with 600s expiration
 * Scenario 5: Auto-cleanup via KV TTL
 */
export async function storeOAuthNonce(nonce: string, env: { KV: KVNamespace }): Promise<void> {
  const key = `${NONCE_PREFIX}${nonce}`;
  const timestamp = Date.now().toString();

  await env.KV.put(key, timestamp, {
    expirationTtl: NONCE_TTL,
  });
}

/**
 * Validate and consume nonce (one-time use)
 * Scenario 2: Validate valid nonce and delete after use
 * Scenario 3: Reject invalid nonce
 */
export async function validateAndConsumeOAuthNonce(
  nonce: string | undefined,
  env: { KV: KVNamespace }
): Promise<void> {
  if (!nonce) {
    throw new Error('Missing nonce');
  }

  const key = `${NONCE_PREFIX}${nonce}`;
  const stored = await env.KV.get(key);

  if (!stored) {
    throw new Error('Invalid nonce');
  }

  // Delete immediately after validation (one-time use)
  await env.KV.delete(key);
}
