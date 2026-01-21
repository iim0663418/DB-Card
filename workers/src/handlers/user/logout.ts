import type { Env } from '../../types';

export async function handleUserLogout(
  request: Request,
  env: Env
): Promise<Response> {
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
    'auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
  );

  return response;
}
