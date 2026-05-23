import type { Env } from '../../types';
import { anonymizeIP } from '../../utils/audit';

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

const REGISTER_RL_WINDOW = 3_600_000; // 1 hour in ms
const REGISTER_RL_LIMIT = 5;

export async function handleMcpRegister(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const ua = request.headers.get('User-Agent') || '';
  const anonIp = anonymizeIP(ip);
  try {
    const doId = env.RATE_LIMITER.idFromName(`mcp_register:${ip}`);
    const stub = env.RATE_LIMITER.get(doId);
    const rl = await (stub as any).checkAndIncrement('mcp_register', ip, REGISTER_RL_WINDOW, REGISTER_RL_LIMIT);
    if (!rl.allowed) {
      ctx.waitUntil(env.DB.prepare(`INSERT INTO audit_logs (event_type, user_agent, ip_address, timestamp, details) VALUES (?, ?, ?, ?, ?)`)
        .bind('mcp_register_rate_limited', ua, anonIp, Date.now(), JSON.stringify({})).run().catch(() => {}));
      return registerResponse({ error: 'rate_limit_exceeded' }, 429);
    }
  } catch (e) {
    console.error('[MCP register rate limit error]', e);
  }

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

  ctx.waitUntil(env.DB.prepare(`INSERT INTO audit_logs (event_type, user_agent, ip_address, timestamp, details) VALUES (?, ?, ?, ?, ?)`)
    .bind('mcp_client_registered', ua, anonIp, Date.now(), JSON.stringify({ client_id: clientId, client_name: clientName })).run().catch(() => {}));

  return registerResponse(clientData, 201);
}
