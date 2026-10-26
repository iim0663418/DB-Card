import type { Env } from '../../types';

/**
 * GET /api/user/oauth-user-info
 * Retrieve user info after OAuth redirect (one-time use)
 */
export async function handleGetOAuthUserInfo(
  request: Request,
  env: Env
): Promise<Response> {
  // Read sessionId only from HttpOnly auth_token cookie
  const sessionId =
    request.headers.get('Cookie')?.match(/(?:^|;\s*)auth_token=([^;]+)/)?.[1] ?? null;

  if (!sessionId) {
    return Response.json({ error: 'Missing authentication cookie' }, { status: 401 });
  }

  // Retrieve user info from KV (one-time use)
  const userInfoKey = `oauth_user_info:${sessionId}`;
  const userInfoJson = await env.KV.get(userInfoKey);

  if (!userInfoJson) {
    return Response.json({ error: 'Session expired or invalid' }, { status: 404 });
  }

  // Delete the key after retrieval (one-time use)
  await env.KV.delete(userInfoKey);

  const userInfo = JSON.parse(userInfoJson);

  return Response.json({
    success: true,
    data: {
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      csrfToken: userInfo.csrfToken
    }
  });
}
