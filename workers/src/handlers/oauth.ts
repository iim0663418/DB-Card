import type { Env } from '../types';
import { SignJWT } from 'jose';
import { generateCsrfToken, storeCsrfToken } from '../utils/csrf';
import { getAndConsumeOAuthState } from '../utils/oauth-state';
import { validateIDToken } from '../utils/oidc-validator';
import { isUserDisabled } from '../utils/user-security';
import { addOAuthSessionForUser } from '../utils/oauth-session-index';

/**
 * Allowed Redirect URIs for OAuth Callback
 * RFC 6749 Section 10.6 - Open Redirector Prevention
 */
const ALLOWED_REDIRECT_URIS = [
  'https://db-card.moda.gov.tw/oauth/callback',
  'https://db-card-staging.csw30454.workers.dev/oauth/callback',
  'http://localhost:8787/oauth/callback' // Development only
];

export async function handleOAuthCallback(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');

  // ✅ BDD Scenario 5, 6: OAuth State Parameter Validation (CSRF Protection)
  // RFC 6749 Section 10.12
  if (!state) {
    return new Response('Missing state parameter', { status: 403 });
  }

  const stateData = await getAndConsumeOAuthState(state, env);
  if (!stateData) {
    return new Response('Invalid or expired state parameter', { status: 403 });
  }

  // Extract code_verifier from state data for PKCE
  const codeVerifier = stateData.codeVerifier;

  // ✅ BDD Scenario 1, 2, 3: Redirect URI Validation (Open Redirector Prevention)
  // RFC 6749 Section 10.6
  const redirectUri = `${url.origin}/oauth/callback`;
  if (!ALLOWED_REDIRECT_URIS.includes(redirectUri)) {
    return new Response('Invalid redirect_uri', { status: 400 });
  }

  // Check for OAuth errors (e.g., disallowed_useragent)
  if (error === 'disallowed_useragent') {
    return Response.redirect(
      `${url.origin}/user-portal.html?oauth_error=webview_blocked`,
      302
    );
  }

  if (error) {
    // Redirect back to user portal with error parameter
    return Response.redirect(`${url.origin}/user-portal.html?login=error&error=${encodeURIComponent(error)}`, 302);
  }

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  try {
    // Exchange code for tokens with PKCE code_verifier
    const tokenParams: Record<string, string> = {
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/oauth/callback`,
      grant_type: 'authorization_code'
    };

    // Add PKCE code_verifier if present (RFC 7636)
    if (codeVerifier) {
      tokenParams.code_verifier = codeVerifier;
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams)
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('[Token Exchange Failed]', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorBody
      });
      throw new Error('Token exchange failed');
    }

    const tokens = await tokenResponse.json() as any;

    // ✅ BDD Scenario 10, 11: ID Token Validation with UserInfo API Fallback
    let userInfo: any;

    if (tokens.id_token) {
      // ✅ Scenario 10: Priority path - Use ID Token validation
      try {
        const idTokenPayload = await validateIDToken(tokens.id_token, env);
        userInfo = {
          email: idTokenPayload.email,
          name: idTokenPayload.name,
          picture: idTokenPayload.picture
        };
        console.log('ID Token validation successful');
      } catch (error) {
        console.error('ID Token validation failed, falling back to UserInfo API:', error);
        // Fall through to UserInfo API
        userInfo = null;
      }
    } else {
      // ⚠️ Scenario 11: Backward compatibility - ID Token not found
      console.warn('ID Token not found, falling back to UserInfo API');
    }

    // Fallback to UserInfo API if ID Token validation failed or not present
    if (!userInfo) {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info');
      }

      userInfo = await userInfoResponse.json() as any;
    }

    // ⚠️ SECURITY: Validate email allowlist (database-driven, no hardcoded values)
    // BDD: Unified validation using checkEmailAllowed from middleware
    const email = userInfo.email;
    if (!email) {
      return Response.redirect(`${url.origin}/user-portal.html?login=error&error=missing_email`, 302);
    }

    const domain = email.split('@')[1];
    if (!domain) {
      return Response.redirect(`${url.origin}/user-portal.html?login=error&error=invalid_email`, 302);
    }

    // Check email_allowlist for both domain and individual email entries
    const allowlistResult = await env.DB.prepare(`
      SELECT 1 FROM email_allowlist
      WHERE (type = 'domain' AND domain = ?)
         OR (type = 'email' AND domain = ?)
      LIMIT 1
    `).bind(domain, email).first<{ 1: number }>();

    if (!allowlistResult) {
      return Response.redirect(`${url.origin}/user-portal.html?login=error&error=unauthorized_domain`, 302);
    }

    // Block sign-in for users disabled by security events (RISC)
    if (await isUserDisabled(env.DB, email)) {
      return Response.redirect(`${url.origin}/user-portal.html?login=error&error=account_disabled`, 302);
    }

    // Generate our JWT token
    const secret = new TextEncoder().encode(env.JWT_SECRET);

    const jwtToken = await new SignJWT({
      sub: userInfo.email,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('db-card-api')
      .setExpirationTime('1h')
      .sign(secret);

    // Generate a short session ID for cookie and KV key
    const sessionId = crypto.randomUUID();

    // Store JWT token in KV with session ID as key
    await env.KV.put(`oauth_session:${sessionId}`, jwtToken, { expirationTtl: 3600 });
    await addOAuthSessionForUser(env, email, sessionId);

    // Generate CSRF token for user session
    const csrfToken = generateCsrfToken();
    await storeCsrfToken(sessionId, csrfToken, env);

    // Store user info in KV for redirect flow (expires in 60 seconds, one-time use)
    const userInfoKey = `oauth_user_info:${sessionId}`;
    await env.KV.put(userInfoKey, JSON.stringify({
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      csrfToken
    }), { expirationTtl: 60 });

    // Create redirect response with cookie header
    const redirectUrl = `${url.origin}/user-portal.html?login=success&session=${sessionId}`;
    const response = new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
        'Set-Cookie': `auth_token=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=3600; Path=/`
      }
    });

    return response;
  } catch (error) {
    console.error('[OAuth Callback Error]', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code: code?.substring(0, 20) + '...',
      state: state?.substring(0, 20) + '...',
      hasCodeVerifier: !!codeVerifier
    });

    return Response.redirect(`${url.origin}/user-portal.html?login=error&error=authentication_failed`, 302);
  }
}
