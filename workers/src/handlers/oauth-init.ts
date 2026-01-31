/**
 * OAuth Initialization Handler
 *
 * Generates and stores state parameter, nonce, and PKCE parameters for OAuth flow
 * - BDD Scenario 1: Generate and store nonce
 * - RFC 7636: PKCE for OAuth Public Clients
 */

import type { Env } from '../types';
import { generateOAuthState, storeOAuthState } from '../utils/oauth-state';
import { generateOAuthNonce, storeOAuthNonce } from '../utils/oauth-nonce';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';

export async function handleOAuthInit(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Generate state, nonce, and PKCE parameters
    const state = generateOAuthState();
    const nonce = generateOAuthNonce();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store state with associated PKCE code_verifier and nonce
    await Promise.all([
      storeOAuthState(state, env, {
        nonce,
        codeVerifier
      }),
      storeOAuthNonce(nonce, env)
    ]);

    return new Response(JSON.stringify({
      state,
      nonce,
      codeChallenge,
      codeChallengeMethod: 'S256'
    }), {
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
