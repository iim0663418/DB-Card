import type { Env } from '../../types';
import { generateCodeVerifier, generateCodeChallenge } from '../../utils/pkce';
import { generateOAuthNonce, storeOAuthNonce } from '../../utils/oauth-nonce';
import { validateIDToken } from '../../utils/oidc-validator';
import { isUserDisabled } from '../../utils/user-security';

const MCP_AUTH_STATE_PREFIX = 'mcp_auth_state:';
const MCP_AUTH_CODE_PREFIX = 'mcp_auth_code:';
const MCP_AUTH_STATE_TTL = 600; // 10 minutes
const MCP_AUTH_CODE_TTL = 600;  // 10 minutes
const ALLOWED_SCOPES = new Set(['received_cards:read', 'received_cards:write']);

interface McpAuthState {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
  resource: string;
  client_state: string;
  google_code_verifier: string;
  nonce: string;
}

interface McpClientData {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  token_endpoint_auth_method: string;
}

function authorizeError(error: string, description?: string, status = 400): Response {
  const body: Record<string, string> = { error };
  if (description) body['error_description'] = description;
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Scenario 1: Initiate MCP authorization, delegate to Google OIDC
export async function handleMcpAuthorize(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const p = url.searchParams;

  const clientId = p.get('client_id');
  const redirectUri = p.get('redirect_uri');
  const codeChallenge = p.get('code_challenge');
  const codeChallengeMethod = p.get('code_challenge_method');
  const scope = p.get('scope') ?? '';
  const clientState = p.get('state') ?? '';
  // Validate resource — must match this server's URL
  const resource = p.get('resource') ?? '';
  const allowedOrigins = [env.WORKER_URL];
  if (env.ENVIRONMENT === 'staging') allowedOrigins.push('https://db-card.sfan-tech.com');

  if (resource) {
    // Accept resource as origin or origin+path (e.g. https://host/mcp)
    let resourceOrigin: string;
    try { resourceOrigin = new URL(resource).origin; } catch { return authorizeError('invalid_target', 'invalid resource URL'); }
    if (!allowedOrigins.includes(resourceOrigin)) {
      return authorizeError('invalid_target', 'resource must match this server URL');
    }
  }
  const validatedResource = resource || new URL(request.url).origin;

  // Scenario 4: PKCE required
  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    return authorizeError('invalid_request', 'PKCE S256 required');
  }

  // Validate scope — only allow known scopes
  const requestedScopes = scope ? scope.split(' ').filter(Boolean) : [];
  const invalidScopes = requestedScopes.filter(s => !ALLOWED_SCOPES.has(s));
  if (invalidScopes.length > 0) {
    return authorizeError('invalid_scope', `Unknown scope: ${invalidScopes.join(', ')}`);
  }
  const validatedScope = requestedScopes.length > 0
    ? requestedScopes.join(' ')
    : [...ALLOWED_SCOPES].join(' ');  // default to all if none specified

  // Scenario 2: client_id must exist
  if (!clientId) {
    return authorizeError('invalid_client');
  }

  const clientRaw = await env.KV.get(`mcp_client:${clientId}`);
  if (!clientRaw) {
    return authorizeError('invalid_client');
  }

  const client = JSON.parse(clientRaw) as McpClientData;

  // Scenario 3: redirect_uri must match exactly
  if (!redirectUri || !client.redirect_uris.includes(redirectUri)) {
    return authorizeError('invalid_redirect_uri');
  }

  // Generate two-layer PKCE and state for Google leg
  const googleState = crypto.randomUUID();
  const googleCodeVerifier = generateCodeVerifier();
  const googleCodeChallenge = await generateCodeChallenge(googleCodeVerifier);
  const nonce = generateOAuthNonce();

  const mcpAuthState: McpAuthState = {
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    scope: validatedScope,
    resource: validatedResource,
    client_state: clientState,
    google_code_verifier: googleCodeVerifier,
    nonce,
  };

  await Promise.all([
    env.KV.put(
      `${MCP_AUTH_STATE_PREFIX}${googleState}`,
      JSON.stringify(mcpAuthState),
      { expirationTtl: MCP_AUTH_STATE_TTL }
    ),
    storeOAuthNonce(nonce, env),
  ]);

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set('redirect_uri', `${env.WORKER_URL}/mcp/callback`);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', googleState);
  googleAuthUrl.searchParams.set('code_challenge', googleCodeChallenge);
  googleAuthUrl.searchParams.set('code_challenge_method', 'S256');
  googleAuthUrl.searchParams.set('nonce', nonce);

  return Response.redirect(googleAuthUrl.toString(), 302);
}

// Scenario 5, 6, 7: Handle Google callback
export async function handleMcpCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const googleState = url.searchParams.get('state');
  const googleCode = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (!googleState) {
    return new Response('Missing state', { status: 400 });
  }

  // Consume the MCP auth state (one-time use)
  const stateRaw = await env.KV.get(`${MCP_AUTH_STATE_PREFIX}${googleState}`);
  if (!stateRaw) {
    return new Response('Invalid or expired state', { status: 400 });
  }
  await env.KV.delete(`${MCP_AUTH_STATE_PREFIX}${googleState}`);

  const state = JSON.parse(stateRaw) as McpAuthState;
  const { redirect_uri, client_state } = state;

  // Scenario 6: Google returned an error
  if (error) {
    const dest = new URL(redirect_uri);
    dest.searchParams.set('error', error);
    if (client_state) dest.searchParams.set('state', client_state);
    return Response.redirect(dest.toString(), 302);
  }

  if (!googleCode) {
    const dest = new URL(redirect_uri);
    dest.searchParams.set('error', 'server_error');
    if (client_state) dest.searchParams.set('state', client_state);
    return Response.redirect(dest.toString(), 302);
  }

  try {
    // Exchange Google code for tokens (reuse oauth.ts pattern)
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: googleCode,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${env.WORKER_URL}/mcp/callback`,
        grant_type: 'authorization_code',
        code_verifier: state.google_code_verifier,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed');
    }

    const tokens = await tokenResponse.json() as any;

    // Validate Google ID Token (reuse oidc-validator.ts)
    const idTokenPayload = await validateIDToken(tokens.id_token, env);
    const email = idTokenPayload.email;

    // Check email allowlist (reuse oauth.ts SQL pattern)
    const domain = email.split('@')[1];
    const allowlistResult = await env.DB.prepare(`
      SELECT 1 FROM email_allowlist
      WHERE (type = 'domain' AND domain = ?)
         OR (type = 'email' AND domain = ?)
      LIMIT 1
    `).bind(domain, email).first<{ 1: number }>();

    // Scenario 7: email not in allowlist
    if (!allowlistResult) {
      const dest = new URL(redirect_uri);
      dest.searchParams.set('error', 'access_denied');
      if (client_state) dest.searchParams.set('state', client_state);
      return Response.redirect(dest.toString(), 302);
    }

    // Block disabled accounts (RISC events, etc.)
    if (await isUserDisabled(env.DB, email)) {
      const dest = new URL(redirect_uri);
      dest.searchParams.set('error', 'access_denied');
      if (client_state) dest.searchParams.set('state', client_state);
      return Response.redirect(dest.toString(), 302);
    }

    // Upsert user (reuse oauth.ts pattern)
    const now = Date.now();
    await env.DB.prepare(`
      INSERT INTO users (email, name, picture, created_at, last_login)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        picture = excluded.picture,
        last_login = excluded.last_login
    `).bind(
      email,
      idTokenPayload.name || null,
      idTokenPayload.picture || null,
      now,
      now
    ).run();

    // Generate MCP auth code and store in KV
    const mcpCode = crypto.randomUUID();
    await env.KV.put(`${MCP_AUTH_CODE_PREFIX}${mcpCode}`, JSON.stringify({
      client_id: state.client_id,
      email,
      scope: state.scope,
      code_challenge: state.code_challenge,
      redirect_uri: state.redirect_uri,
      resource: state.resource,
    }), { expirationTtl: MCP_AUTH_CODE_TTL });

    // Scenario 5: Redirect to MCP client with code
    const dest = new URL(redirect_uri);
    dest.searchParams.set('code', mcpCode);
    if (client_state) dest.searchParams.set('state', client_state);
    return Response.redirect(dest.toString(), 302);

  } catch (err) {
    console.error('[MCP Callback Error]', err instanceof Error ? err.message : String(err));
    const dest = new URL(redirect_uri);
    dest.searchParams.set('error', 'server_error');
    if (client_state) dest.searchParams.set('state', client_state);
    return Response.redirect(dest.toString(), 302);
  }
}
