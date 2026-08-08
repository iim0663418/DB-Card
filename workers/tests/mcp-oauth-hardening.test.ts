/**
 * MCP OAuth 2026-07-28 Hardening Tests
 * Unit tests for CIMD resolver and sha256 helper.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveClientMetadata, sha256 } from '../src/handlers/mcp/oauth-client-metadata';

function createMockKV(store: Record<string, string> = {}): KVNamespace {
  return {
    get: vi.fn(async (key: string) => store[key] ?? null),
    put: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    list: vi.fn(async () => ({ keys: [], list_complete: true, cacheStatus: null })),
    getWithMetadata: vi.fn(async () => ({ value: null, metadata: null, cacheStatus: null })),
  } as unknown as KVNamespace;
}

function createMockEnv(kvStore: Record<string, string> = {}) {
  return { KV: createMockKV(kvStore) } as unknown as { KV: KVNamespace } & Record<string, unknown>;
}

describe('MCP OAuth Hardening — CIMD Resolver', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('resolveClientMetadata — legacy DCR path', () => {
    it('returns client data from KV for non-URL client_id', async () => {
      const clientData = {
        client_id: 'abc-123',
        client_name: 'Test Client',
        redirect_uris: ['http://localhost:3000/cb'],
        grant_types: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_method: 'none',
      };
      const env = createMockEnv({ 'mcp_client:abc-123': JSON.stringify(clientData) });

      const result = await resolveClientMetadata('abc-123', env as any);

      expect(result).toEqual(clientData);
      expect(env.KV.get).toHaveBeenCalledWith('mcp_client:abc-123');
    });

    it('returns null from KV when client not found', async () => {
      const env = createMockEnv({});

      const result = await resolveClientMetadata('nonexistent-id', env as any);

      expect(result).toBeNull();
    });
  });

  describe('resolveClientMetadata — CIMD URL fetch', () => {
    it('fetches CIMD document and returns metadata', async () => {
      const cimdDoc = {
        client_id: 'https://claude.ai/.well-known/mcp-client.json',
        client_name: 'Claude',
        redirect_uris: ['https://claude.ai/oauth/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_method: 'none',
      };

      globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(cimdDoc), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const env = createMockEnv({});
      const result = await resolveClientMetadata(
        'https://claude.ai/.well-known/mcp-client.json',
        env as any
      );

      expect(result).toEqual(cimdDoc);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://claude.ai/.well-known/mcp-client.json',
        expect.objectContaining({ headers: { 'Accept': 'application/json' } })
      );
      // Should cache result
      expect(env.KV.put).toHaveBeenCalledWith(
        expect.stringContaining('mcp_cimd:'),
        JSON.stringify(cimdDoc),
        { expirationTtl: 3600 }
      );
    });

    it('returns cached CIMD from KV if available', async () => {
      const cimdDoc = {
        client_id: 'https://example.com/.well-known/mcp-client.json',
        client_name: 'Cached Client',
        redirect_uris: ['https://example.com/cb'],
        grant_types: ['authorization_code'],
        token_endpoint_auth_method: 'none',
      };

      const clientId = 'https://example.com/.well-known/mcp-client.json';
      const hash = await sha256(clientId);
      const env = createMockEnv({ [`mcp_cimd:${hash}`]: JSON.stringify(cimdDoc) });

      globalThis.fetch = vi.fn();

      const result = await resolveClientMetadata(clientId, env as any);

      expect(result).toEqual(cimdDoc);
      // Should NOT fetch since cached
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe('resolveClientMetadata — CIMD self-referential validation', () => {
    it('returns null when client_id in document does not match', async () => {
      const cimdDoc = {
        client_id: 'https://WRONG.example.com/.well-known/mcp-client.json',
        client_name: 'Fake',
        redirect_uris: ['https://evil.com/cb'],
      };

      globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(cimdDoc), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const env = createMockEnv({});
      const result = await resolveClientMetadata(
        'https://real.example.com/.well-known/mcp-client.json',
        env as any
      );

      expect(result).toBeNull();
    });
  });

  describe('resolveClientMetadata — CIMD fetch failure fallback', () => {
    it('falls back to KV when fetch returns non-200', async () => {
      const kvData = {
        client_id: 'https://example.com/.well-known/mcp-client.json',
        client_name: 'KV Fallback Client',
        redirect_uris: ['https://example.com/cb'],
        grant_types: ['authorization_code'],
        token_endpoint_auth_method: 'none',
      };

      globalThis.fetch = vi.fn(async () => new Response('Not Found', { status: 404 }));

      const clientId = 'https://example.com/.well-known/mcp-client.json';
      const env = createMockEnv({
        [`mcp_client:${clientId}`]: JSON.stringify(kvData),
      });

      const result = await resolveClientMetadata(clientId, env as any);

      expect(result).toEqual(kvData);
    });

    it('falls back to KV when fetch throws (network error)', async () => {
      const kvData = {
        client_id: 'https://timeout.example.com/.well-known/mcp-client.json',
        client_name: 'Timeout Fallback',
        redirect_uris: ['https://timeout.example.com/cb'],
        grant_types: ['authorization_code'],
        token_endpoint_auth_method: 'none',
      };

      globalThis.fetch = vi.fn(async () => { throw new Error('AbortError'); });

      const clientId = 'https://timeout.example.com/.well-known/mcp-client.json';
      const env = createMockEnv({
        [`mcp_client:${clientId}`]: JSON.stringify(kvData),
      });

      const result = await resolveClientMetadata(clientId, env as any);

      expect(result).toEqual(kvData);
    });

    it('returns null when both fetch and KV fallback fail', async () => {
      globalThis.fetch = vi.fn(async () => { throw new Error('network'); });

      const env = createMockEnv({});
      const result = await resolveClientMetadata(
        'https://nowhere.example.com/.well-known/mcp-client.json',
        env as any
      );

      expect(result).toBeNull();
    });
  });
});

describe('MCP OAuth Hardening — sha256 helper', () => {
  it('produces stable hex output for known input', async () => {
    const result = await sha256('hello');
    expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('produces different hashes for different inputs', async () => {
    const a = await sha256('https://claude.ai/.well-known/mcp-client.json');
    const b = await sha256('https://cursor.com/.well-known/mcp-client.json');
    expect(a).not.toBe(b);
  });

  it('produces 64-char hex string', async () => {
    const result = await sha256('test');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });
});
