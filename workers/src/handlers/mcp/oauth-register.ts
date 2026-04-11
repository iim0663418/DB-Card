import type { Env } from '../../types';

function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol === 'https:') return true;
    if (parsed.protocol === 'http:' && parsed.hostname === 'localhost') return true;
    return false;
  } catch {
    return false;
  }
}

function registerResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    },
  });
}

export async function handleMcpRegister(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return registerResponse({ error: 'invalid_client_metadata' }, 400);
  }

  const clientName = body['client_name'];
  const redirectUris = body['redirect_uris'];

  if (!clientName || !Array.isArray(redirectUris) || redirectUris.length === 0) {
    return registerResponse({ error: 'invalid_client_metadata' }, 400);
  }

  for (const uri of redirectUris) {
    if (typeof uri !== 'string' || !isValidRedirectUri(uri)) {
      return registerResponse({ error: 'invalid_redirect_uri' }, 400);
    }
  }

  const tokenEndpointAuthMethod = body['token_endpoint_auth_method'] ?? 'none';
  if (tokenEndpointAuthMethod !== 'none') {
    return registerResponse({ error: 'invalid_client_metadata' }, 400);
  }

  const grantTypes = Array.isArray(body['grant_types'])
    ? body['grant_types']
    : ['authorization_code', 'refresh_token'];

  const allowedGrants = new Set(['authorization_code', 'refresh_token']);
  if (!grantTypes.every((g: unknown) => typeof g === 'string' && allowedGrants.has(g))) {
    return registerResponse({ error: 'invalid_client_metadata' }, 400);
  }

  const clientId = crypto.randomUUID();
  const clientData = {
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: grantTypes,
    token_endpoint_auth_method: tokenEndpointAuthMethod,
  };

  await env.KV.put(`mcp_client:${clientId}`, JSON.stringify(clientData));

  return registerResponse(clientData, 201);
}
