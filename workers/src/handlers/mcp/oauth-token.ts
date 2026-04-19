import { SignJWT } from 'jose';
import type { Env } from '../../types';
import { anonymizeIP } from '../../utils/audit';
import { generateCodeChallenge } from '../../utils/pkce';
import { isUserDisabled } from '../../utils/user-security';

const MCP_AUTH_CODE_PREFIX = 'mcp_auth_code:';
const MCP_REFRESH_PREFIX = 'mcp_refresh:';
const REFRESH_TOKEN_TTL = 2592000; // 30 days
const TOKEN_RL_WINDOW = 60_000; // 60 seconds in ms
const TOKEN_RL_LIMIT = 10;

interface AuthCodeData {
  client_id: string;
  email: string;
  scope: string;
  code_challenge: string;
  redirect_uri: string;
  resource: string;
}

interface RefreshTokenData {
  client_id: string;
  email: string;
  scope: string;
  resource: string;
}

function tokenError(error: string, description?: string): Response {
  const body: Record<string, string> = { error };
  if (description) body['error_description'] = description;
  return new Response(JSON.stringify(body), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function issueAccessToken(email: string, resource: string, scope: string, env: Env): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  // Use origin only (strip path) for issuer/audience consistency
  let aud: string;
  try { aud = new URL(resource).origin; } catch { aud = resource; }
  return new SignJWT({ sub: email, email, scope })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(aud)
    .setAudience(aud)
    .setExpirationTime('1h')
    .sign(secret);
}

async function issueRefreshToken(data: RefreshTokenData, env: Env): Promise<string> {
  const token = crypto.randomUUID();
  await env.KV.put(`${MCP_REFRESH_PREFIX}${token}`, JSON.stringify(data), {
    expirationTtl: REFRESH_TOKEN_TTL,
  });
  return token;
}

async function parseBody(request: Request): Promise<URLSearchParams> {
  const ct = request.headers.get('Content-Type') ?? '';
  if (ct.includes('application/json')) {
    const json = await request.json() as Record<string, string>;
    return new URLSearchParams(json);
  }
  const text = await request.text();
  return new URLSearchParams(text);
}

export async function handleMcpToken(request: Request, env: Env): Promise<Response> {
  // Atomic rate limit via Durable Objects
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  try {
    const doId = env.RATE_LIMITER.idFromName(`mcp_token:${ip}`);
    const stub = env.RATE_LIMITER.get(doId);
    const rl = await (stub as any).checkAndIncrement('mcp_token', ip, TOKEN_RL_WINDOW, TOKEN_RL_LIMIT);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'rate_limit_exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter ?? 60) },
      });
    }
  } catch (e) {
    console.error('[MCP token rate limit error]', e);
    // Fail open — don't block on DO failure
  }

  const params = await parseBody(request);
  const grantType = params.get('grant_type');

  const ua = request.headers.get('User-Agent') || '';
  const anonIp = anonymizeIP(ip);
  const failToken = (error: string, description?: string): Response => {
    env.DB.prepare(`INSERT INTO audit_logs (event_type, user_agent, ip_address, timestamp, details) VALUES (?, ?, ?, ?, ?)`)
      .bind('mcp_token_failed', ua, anonIp, Date.now(), JSON.stringify({ error, grant_type: grantType ?? 'unknown' })).run().catch(() => {});
    return tokenError(error, description);
  };

  if (grantType === 'authorization_code') {
    const code = params.get('code');
    const clientId = params.get('client_id');
    const redirectUri = params.get('redirect_uri');
    const codeVerifier = params.get('code_verifier');
    const resource = params.get('resource') || '';

    if (!code) return failToken('invalid_grant');
    if (!resource) return failToken('invalid_request', 'resource parameter is required');

    const raw = await env.KV.get(`${MCP_AUTH_CODE_PREFIX}${code}`);
    if (!raw) return failToken('invalid_grant');
    await env.KV.delete(`${MCP_AUTH_CODE_PREFIX}${code}`);

    const data = JSON.parse(raw) as AuthCodeData;

    if (data.client_id !== clientId) return failToken('invalid_grant');
    if (data.redirect_uri !== redirectUri) return failToken('invalid_grant');
    if (data.resource !== resource) return failToken('invalid_grant');

    const expectedChallenge = await generateCodeChallenge(codeVerifier ?? '');
    if (expectedChallenge !== data.code_challenge) return failToken('invalid_grant');

    const accessToken = await issueAccessToken(data.email, data.resource, data.scope, env);
    const refreshToken = await issueRefreshToken({
      client_id: data.client_id,
      email: data.email,
      scope: data.scope,
      resource: data.resource,
    }, env);

    env.DB.prepare(`INSERT INTO audit_logs (event_type, user_agent, ip_address, timestamp, details) VALUES (?, ?, ?, ?, ?)`)
      .bind('mcp_token_issued', ua, anonIp, Date.now(), JSON.stringify({ email: data.email, grant_type: 'authorization_code' })).run().catch(() => {});

    return new Response(JSON.stringify({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: data.scope,
    }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  if (grantType === 'refresh_token') {
    const refreshToken = params.get('refresh_token');
    const clientId = params.get('client_id');
    const resource = params.get('resource') ?? '';

    if (!refreshToken) return failToken('invalid_grant');

    const raw = await env.KV.get(`${MCP_REFRESH_PREFIX}${refreshToken}`);
    if (!raw) return failToken('invalid_grant');

    const data = JSON.parse(raw) as RefreshTokenData;

    // Validate before consuming — don't burn the token on a fixable client error
    if (data.client_id !== clientId) return failToken('invalid_grant');
    if (resource && resource !== data.resource) return failToken('invalid_target', 'resource mismatch');

    // Consume refresh token (one-time use, rotate)
    await env.KV.delete(`${MCP_REFRESH_PREFIX}${refreshToken}`);

    // Block disabled accounts on refresh
    if (await isUserDisabled(env.DB, data.email)) return failToken('invalid_grant');

    const accessToken = await issueAccessToken(data.email, data.resource, data.scope, env);
    const newRefreshToken = await issueRefreshToken({
      client_id: data.client_id,
      email: data.email,
      scope: data.scope,
      resource: data.resource,
    }, env);

    env.DB.prepare(`INSERT INTO audit_logs (event_type, user_agent, ip_address, timestamp, details) VALUES (?, ?, ?, ?, ?)`)
      .bind('mcp_token_refreshed', ua, anonIp, Date.now(), JSON.stringify({ email: data.email, grant_type: 'refresh_token' })).run().catch(() => {});

    return new Response(JSON.stringify({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: newRefreshToken,
      scope: data.scope,
    }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  return failToken('unsupported_grant_type');
}
