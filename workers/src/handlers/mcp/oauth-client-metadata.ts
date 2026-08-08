import type { Env } from '../../types';

export interface ClientMetadata {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  token_endpoint_auth_method: string;
}

/**
 * Validate CIMD URL to prevent SSRF.
 * Only allows HTTPS URLs with well-known MCP client metadata paths.
 */
function isValidCimdUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    // Must use well-known path or known MCP platform paths
    if (parsed.pathname === '/.well-known/mcp-client.json') return true;
    if (parsed.pathname.startsWith('/.well-known/')) return true;
    // Known MCP platforms that use non-standard CIMD paths
    const knownHosts = ['claude.ai', 'cursor.sh', 'openai.com'];
    if (knownHosts.includes(parsed.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Resolve client metadata via Client ID Metadata Document (CIMD).
 * 1. If client_id starts with 'https://' → validate URL + fetch CIMD document
 * 2. Otherwise → KV lookup (legacy DCR)
 *
 * @returns ClientMetadata or null if not found/invalid
 */
export async function resolveClientMetadata(
  clientId: string,
  env: Env
): Promise<ClientMetadata | null> {
  // Legacy DCR path
  if (!clientId.startsWith('https://')) {
    const raw = await env.KV.get(`mcp_client:${clientId}`);
    return raw ? JSON.parse(raw) as ClientMetadata : null;
  }

  // CIMD path — validate URL to prevent SSRF
  if (!isValidCimdUrl(clientId)) {
    // Not a valid CIMD URL — try KV fallback (previously registered via DCR)
    const fallback = await env.KV.get(`mcp_client:${clientId}`);
    return fallback ? JSON.parse(fallback) as ClientMetadata : null;
  }

  // Check cache first
  const cacheKey = `mcp_cimd:${await sha256(clientId)}`;
  const cached = await env.KV.get(cacheKey);
  if (cached) return JSON.parse(cached) as ClientMetadata;

  // Fetch CIMD document
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(clientId, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      // Fallback to KV (maybe previously registered via DCR with a URL-shaped id)
      const fallback = await env.KV.get(`mcp_client:${clientId}`);
      return fallback ? JSON.parse(fallback) as ClientMetadata : null;
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) return null;

    const doc = await response.json() as Record<string, unknown>;

    // Validate self-referential client_id
    if (doc['client_id'] !== clientId) return null;

    // Validate required fields
    const redirectUris = doc['redirect_uris'];
    if (!Array.isArray(redirectUris) || redirectUris.length === 0) return null;

    const metadata: ClientMetadata = {
      client_id: clientId,
      client_name: (doc['client_name'] as string) || 'Unknown',
      redirect_uris: redirectUris as string[],
      grant_types: Array.isArray(doc['grant_types'])
        ? doc['grant_types'] as string[]
        : ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method:
        (doc['token_endpoint_auth_method'] as string) || 'none',
    };

    // Cache for 1 hour
    await env.KV.put(cacheKey, JSON.stringify(metadata), { expirationTtl: 3600 });

    return metadata;
  } catch {
    // Fetch failed (timeout, network error) — fallback to KV
    const fallback = await env.KV.get(`mcp_client:${clientId}`);
    return fallback ? JSON.parse(fallback) as ClientMetadata : null;
  }
}

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
