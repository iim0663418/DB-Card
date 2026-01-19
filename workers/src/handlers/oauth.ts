import type { Env } from '../types';
import { SignJWT } from 'jose';

export async function handleOAuthCallback(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

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

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userInfo = await userInfoResponse.json() as any;

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

    // Return JWT token to frontend
    return new Response(`
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
            token: '${jwtToken}',
            email: '${userInfo.email}',
            name: '${userInfo.name}',
            picture: '${userInfo.picture}'
          }, '*');
          window.close();
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
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
