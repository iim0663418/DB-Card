import type { Env } from '../../types';
import { jwtVerify } from 'jose';
import { removeOAuthSessionForUser } from '../../utils/oauth-session-index';

export async function handleUserLogout(
  request: Request,
  env: Env
): Promise<Response> {
  const cookieHeader = request.headers.get('Cookie');
  const sessionId = cookieHeader?.match(/auth_token=([^;]+)/)?.[1] || null;

  if (sessionId) {
    const jwtToken = await env.KV.get(`oauth_session:${sessionId}`);

    await Promise.all([
      env.KV.delete(`oauth_session:${sessionId}`),
      env.KV.delete(`csrf_token:${sessionId}`),
      env.KV.delete(`oauth_user_info:${sessionId}`)
    ]);

    if (jwtToken) {
      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET);
        const { payload } = await jwtVerify(jwtToken, secret, {
          issuer: 'db-card-api',
          algorithms: ['HS256']
        });
        const email = payload.email as string | undefined;
        if (email) {
          await removeOAuthSessionForUser(env, email, sessionId);
        }
      } catch {
        // Best effort cleanup only
      }
    }
  }

  // Create response
  const response = new Response(
    JSON.stringify({ success: true, message: 'Logged out successfully' }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );

  // Clear the HttpOnly cookie by setting Max-Age=0
  response.headers.set('Set-Cookie',
    `auth_token=; HttpOnly; ${request.url.includes('localhost') ? '' : 'Secure; '}SameSite=Lax; Max-Age=0; Path=/`
  );

  return response;
}
