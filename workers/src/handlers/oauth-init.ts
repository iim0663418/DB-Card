/**
 * OAuth Initialization Handler
 *
 * Generates and stores state parameter for OAuth flow
 */

import type { Env } from '../types';
import { generateOAuthState, storeOAuthState } from '../utils/oauth-state';

export async function handleOAuthInit(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Generate state parameter
    const state = generateOAuthState();

    // Store state in KV with 10-minute TTL
    await storeOAuthState(state, env);

    return new Response(JSON.stringify({ state }), {
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
