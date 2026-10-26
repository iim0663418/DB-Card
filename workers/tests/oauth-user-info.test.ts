/**
 * OAuth User Info Handler Tests (RA-003)
 * Verifies sessionId is read ONLY from the HttpOnly auth_token cookie,
 * with the legacy ?session= URL fallback fully removed.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleGetOAuthUserInfo } from '../src/handlers/user/oauth-user-info';

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

describe('handleGetOAuthUserInfo — RA-003 cookie-only auth', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns user info when auth_token cookie is present', async () => {
    const userInfo = {
      email: 'user@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.png',
      csrfToken: 'csrf-123',
    };
    const env = createMockEnv({
      'oauth_user_info:sess-abc': JSON.stringify(userInfo),
    });
    const request = new Request('https://db-card.example.com/api/user/oauth-user-info', {
      headers: { Cookie: 'auth_token=sess-abc' },
    });

    const response = await handleGetOAuthUserInfo(request, env as any);
    expect(response.status).toBe(200);

    const body = await response.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual(userInfo);
    // One-time use: key deleted after retrieval
    expect(env.KV.delete).toHaveBeenCalledWith('oauth_user_info:sess-abc');
  });

  it('returns 401 when only ?session= query is present (no cookie)', async () => {
    const env = createMockEnv({
      'oauth_user_info:sess-query': JSON.stringify({ email: 'x@example.com' }),
    });
    const request = new Request(
      'https://db-card.example.com/api/user/oauth-user-info?session=sess-query'
    );

    const response = await handleGetOAuthUserInfo(request, env as any);
    expect(response.status).toBe(401);

    const body = await response.json() as any;
    expect(body.error).toBe('Missing authentication cookie');
    // Fallback removed → KV never consulted
    expect(env.KV.get).not.toHaveBeenCalled();
  });

  it('uses cookie and ignores query when both are present', async () => {
    const cookieUser = {
      email: 'cookie@example.com',
      name: 'Cookie User',
      picture: '',
      csrfToken: 'csrf-cookie',
    };
    const env = createMockEnv({
      'oauth_user_info:sess-cookie': JSON.stringify(cookieUser),
      'oauth_user_info:sess-query': JSON.stringify({ email: 'query@example.com' }),
    });
    const request = new Request(
      'https://db-card.example.com/api/user/oauth-user-info?session=sess-query',
      { headers: { Cookie: 'auth_token=sess-cookie' } }
    );

    const response = await handleGetOAuthUserInfo(request, env as any);
    expect(response.status).toBe(200);

    const body = await response.json() as any;
    expect(body.data.email).toBe('cookie@example.com');
    // Only the cookie-derived key is looked up / deleted
    expect(env.KV.get).toHaveBeenCalledWith('oauth_user_info:sess-cookie');
    expect(env.KV.get).not.toHaveBeenCalledWith('oauth_user_info:sess-query');
    expect(env.KV.delete).toHaveBeenCalledWith('oauth_user_info:sess-cookie');
  });

  it('returns 401 when neither cookie nor query is present', async () => {
    const env = createMockEnv({});
    const request = new Request('https://db-card.example.com/api/user/oauth-user-info');

    const response = await handleGetOAuthUserInfo(request, env as any);
    expect(response.status).toBe(401);

    const body = await response.json() as any;
    expect(body.error).toBe('Missing authentication cookie');
    expect(env.KV.get).not.toHaveBeenCalled();
  });
});
