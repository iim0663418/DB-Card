import type { Env } from '../types';
import { SignJWT } from 'jose';
import { generateCsrfToken, storeCsrfToken } from '../utils/csrf';
import { validateAndConsumeOAuthState } from '../utils/oauth-state';
import { validateIDToken } from '../utils/oidc-validator';

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

  const isStateValid = await validateAndConsumeOAuthState(state, env);
  if (!isStateValid) {
    return new Response('Invalid or expired state parameter', { status: 403 });
  }

  // ✅ BDD Scenario 1, 2, 3: Redirect URI Validation (Open Redirector Prevention)
  // RFC 6749 Section 10.6
  const redirectUri = `${url.origin}/oauth/callback`;
  if (!ALLOWED_REDIRECT_URIS.includes(redirectUri)) {
    return new Response('Invalid redirect_uri', { status: 400 });
  }

  if (error) {
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Login Failed</title>
      </head>
      <body>
        <script>
          window.opener.postMessage({ type: 'oauth_error', error: '${error}' }, '*');
          window.close();
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${url.origin}/oauth/callback`,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
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

    // ⚠️ SECURITY: Validate email domain whitelist
    const allowedDomains = ['@moda.gov.tw'];
    const allowedEmails = ['chingw@acs.gov.tw'];
    const isAllowedDomain = allowedDomains.some(domain => userInfo.email?.endsWith(domain)) ||
                           allowedEmails.includes(userInfo.email);

    if (!isAllowedDomain) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Login Failed</title>
        </head>
        <body>
          <script>
            window.opener.postMessage({ 
              type: 'oauth_error', 
              error: 'unauthorized_domain' 
            }, '*');
            window.close();
          </script>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
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

    // Generate CSRF token for user session
    const csrfToken = generateCsrfToken();
    await storeCsrfToken(sessionId, csrfToken, env);

    // Set HttpOnly cookie and return user info (no token in response body)
    const response = new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Login Success</title>
      </head>
      <body>
        <script>
          window.opener.postMessage({
            type: 'oauth_success',
            email: '${userInfo.email}',
            name: '${userInfo.name}',
            picture: '${userInfo.picture || ''}',
            csrfToken: '${csrfToken}'
          }, '*');
          window.close();
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

    // Set HttpOnly cookie with security flags
    response.headers.set('Set-Cookie',
      `auth_token=${sessionId}; HttpOnly; ${request.url.includes('localhost') ? '' : 'Secure; '}SameSite=Lax; Max-Age=3600; Path=/`
    );

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Login Failed</title>
      </head>
      <body>
        <script>
          window.opener.postMessage({ type: 'oauth_error', error: 'authentication_failed' }, '*');
          window.close();
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}
