/**
 * OAuth Initialization Handler
 *
 * Generates and stores state parameter, nonce, and PKCE parameters for OAuth flow
 * - BDD Scenario 1: Generate and store nonce
 * - RFC 7636: PKCE for OAuth Public Clients
 * - Google OAuth Policy: Block WebView browsers
 */

import type { Env } from '../types';
import { generateOAuthState, storeOAuthState } from '../utils/oauth-state';
import { generateOAuthNonce, storeOAuthNonce } from '../utils/oauth-nonce';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';
import { errorResponse } from '../utils/response';

/**
 * Detect if User-Agent is a WebView/In-App Browser
 * Google OAuth Policy: https://developers.google.com/identity/protocols/oauth2/policies#browsers
 */
function isWebView(userAgent: string): boolean {
  const patterns = [
    /Line\//i,           // LINE
    /FBAN|FBAV/i,        // Facebook
    /Instagram/i,        // Instagram
    /Twitter/i,          // Twitter (X)
    /MicroMessenger/i,   // WeChat
    /Snapchat/i,         // Snapchat
    /TikTok/i,           // TikTok
    /\bwv\)/i,           // Generic WebView marker
    /WebView/i,          // Explicit WebView
    /; wv\)/i            // Android WebView
  ];
  return patterns.some(pattern => pattern.test(userAgent));
}

export async function handleOAuthInit(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Check for WebView/In-App Browser (Google OAuth Policy)
    const userAgent = request.headers.get('User-Agent') || '';
    if (isWebView(userAgent)) {
      return errorResponse(
        'webview_not_allowed',
        'Google OAuth is not supported in in-app browsers. Please open this page in Safari, Chrome, or your default browser.',
        403,
        request
      );
    }

    // Generate state, nonce, and PKCE parameters
    const state = generateOAuthState();
    const nonce = generateOAuthNonce();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store state with associated PKCE code_verifier and nonce
    // Wait for both KV writes to complete before responding
    await Promise.all([
      storeOAuthState(state, env, {
        nonce,
        codeVerifier
      }),
      storeOAuthNonce(nonce, env)
    ]);

    // Add small delay to ensure KV propagation (eventual consistency)
    await new Promise(resolve => setTimeout(resolve, 100));

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
