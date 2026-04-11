import type { Env } from '../../types';

const SCOPES = ['received_cards:read', 'received_cards:write'];
const CACHE_CONTROL = 'public, max-age=3600';

/** Use the request's origin so metadata URLs match the domain the client connected to */
function getBaseUrl(request: Request, env: Env): string {
  const origin = new URL(request.url).origin;
  // Only allow known origins; fall back to WORKER_URL
  if (origin === env.WORKER_URL) return origin;
  if (env.ENVIRONMENT === 'staging' && origin === 'https://db-card.sfan-tech.com') return origin;
  return env.WORKER_URL;
}

function metadataResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': CACHE_CONTROL,
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    },
  });
}

export function handleProtectedResourceMetadata(request: Request, env: Env): Response {
  const base = getBaseUrl(request, env);
  return metadataResponse({
    resource: base,
    authorization_servers: [base],
    scopes_supported: SCOPES,
    bearer_methods_supported: ['header'],
  });
}

export function handleAuthorizationServerMetadata(request: Request, env: Env): Response {
  const base = getBaseUrl(request, env);
  return metadataResponse({
    issuer: base,
    authorization_endpoint: `${base}/mcp/authorize`,
    token_endpoint: `${base}/mcp/token`,
    registration_endpoint: `${base}/mcp/register`,
    scopes_supported: SCOPES,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    resource_indicators_supported: true,
  });
}

export function mcpUnauthorizedResponse(request: Request, env: Env): Response {
  const base = getBaseUrl(request, env);
  return new Response(JSON.stringify({ error: 'unauthorized' }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`,
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    },
  });
}
