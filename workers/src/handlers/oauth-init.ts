/**
 * OAuth Initialization Handler
 *
 * Generates and stores state parameter and nonce for OAuth flow
 * BDD Scenario 1: Generate and store nonce
 */

import type { Env } from '../types';
import { generateOAuthState, storeOAuthState } from '../utils/oauth-state';
import { generateOAuthNonce, storeOAuthNonce } from '../utils/oauth-nonce';

export async function handleOAuthInit(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Generate state and nonce parameters
    const state = generateOAuthState();
    const nonce = generateOAuthNonce();

    // Store state and nonce in KV with 10-minute TTL
    await Promise.all([
      storeOAuthState(state, env),
      storeOAuthNonce(nonce, env)
    ]);

    return new Response(JSON.stringify({ state, nonce }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('OAuth init error:', error);
    return new Response(JSON.stringify({ error: 'Failed to initialize OAuth' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
