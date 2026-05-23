/**
 * BDD Test: OAuth Handler Integration with ID Token Validation
 * Tests Scenario 10 & 11 from OIDC Phase 1 Day 3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleOAuthCallback } from '../src/handlers/oauth';
import type { Env } from '../src/types';

// Mock oidc-validator at module level (Vitest 4 requires this for ESM in Workers pool)
const mockValidateIDToken = vi.fn();
vi.mock('../src/utils/oidc-validator', () => ({
  validateIDToken: (...args: unknown[]) => mockValidateIDToken(...args),
}));

vi.mock('../src/utils/user-security', () => ({
  isUserDisabled: vi.fn().mockResolvedValue(false),
}));

vi.mock('../src/utils/oauth-session-index', () => ({
  addOAuthSessionForUser: vi.fn().mockResolvedValue(undefined),
}));

describe('Feature 3: OAuth Handler Integration', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockValidateIDToken.mockReset();
    mockEnv = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      JWT_SECRET: 'test-jwt-secret-32-chars-long!!!',
      WORKER_URL: 'https://db-card.moda.gov.tw',
      ENVIRONMENT: 'staging',
      KV: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
      } as any,
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ 1: 1 }),
            run: vi.fn().mockResolvedValue({}),
            all: vi.fn().mockResolvedValue({ results: [] }),
          }),
        }),
      } as any
    };

    // Mock validateAndConsumeOAuthState to return true
    vi.mock('../src/utils/oauth-state', () => ({
      validateAndConsumeOAuthState: vi.fn().mockResolvedValue(true),
      getAndConsumeOAuthState: vi.fn().mockResolvedValue({ nonce: 'test-nonce', codeVerifier: 'test-verifier' }),
      generateOAuthState: vi.fn().mockReturnValue('test-state'),
      storeOAuthState: vi.fn().mockResolvedValue(undefined),
    }));

    // Mock CSRF functions
    vi.mock('../src/utils/csrf', () => ({
      generateCsrfToken: vi.fn().mockReturnValue('test-csrf-token'),
      storeCsrfToken: vi.fn().mockResolvedValue(undefined)
    }));
  });

  /**
   * Scenario 10: 優先使用 ID Token，不呼叫 UserInfo API
   */
  describe('Scenario 10: Priority path - ID Token validation', () => {
    it('should validate ID Token and extract user info without calling UserInfo API', async () => {
      // Given: Token response includes id_token
      const mockIDTokenPayload = {
        iss: 'https://accounts.google.com',
        aud: 'test-client-id',
        sub: 'google-user-123',
        email: 'user@moda.gov.tw',
        email_verified: true,
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      // Mock validateIDToken to succeed
      mockValidateIDToken.mockResolvedValue(mockIDTokenPayload);

      // Mock token exchange response with id_token
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'mock-access-token',
            id_token: 'mock-id-token',
            expires_in: 3600
          })
        }) as any;

      const request = new Request(
        'https://db-card.moda.gov.tw/oauth/callback?code=test-code&state=valid-state'
      );

      // When: Handle OAuth callback
      const response = await handleOAuthCallback(request, mockEnv);

      // Then: ID Token should be validated
      expect(mockValidateIDToken).toHaveBeenCalledWith('mock-id-token', mockEnv);

      // Then: UserInfo API should NOT be called
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only token exchange, not UserInfo

      // Then: Response should be a redirect to user portal
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('login=success');
    });

    it('should log success message when ID Token validation succeeds', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const mockIDTokenPayload = {
        iss: 'https://accounts.google.com',
        aud: 'test-client-id',
        sub: 'google-user-123',
        email: 'user@moda.gov.tw',
        email_verified: true,
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockValidateIDToken.mockResolvedValue(mockIDTokenPayload);

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'mock-access-token',
            id_token: 'mock-id-token'
          })
        }) as any;

      const request = new Request(
        'https://db-card.moda.gov.tw/oauth/callback?code=test-code&state=valid-state'
      );

      await handleOAuthCallback(request, mockEnv);

      expect(consoleLogSpy).toHaveBeenCalledWith('ID Token validation successful');

      consoleLogSpy.mockRestore();
    });
  });

  /**
   * Scenario 11: ID Token 缺少時降級到 UserInfo API (向後相容)
   */
  describe('Scenario 11: Fallback to UserInfo API (backward compatibility)', () => {
    it('should log warning and use UserInfo API when id_token is missing', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock token exchange response WITHOUT id_token
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'mock-access-token',
            expires_in: 3600
            // No id_token field
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            email: 'user@moda.gov.tw',
            name: 'Test User',
            picture: 'https://example.com/photo.jpg'
          })
        }) as any;

      const request = new Request(
        'https://db-card.moda.gov.tw/oauth/callback?code=test-code&state=valid-state'
      );

      // When: Handle OAuth callback
      const response = await handleOAuthCallback(request, mockEnv);

      // Then: Warning should be logged
      expect(consoleWarnSpy).toHaveBeenCalledWith('ID Token not found, falling back to UserInfo API');

      // Then: UserInfo API should be called
      expect(global.fetch).toHaveBeenCalledTimes(2); // Token exchange + UserInfo

      // Then: Login should complete successfully (302 redirect)
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('login=success');

      consoleWarnSpy.mockRestore();
    });

    it('should fallback to UserInfo API when ID Token validation fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock validateIDToken to fail
      mockValidateIDToken.mockRejectedValue(new Error('Invalid signature'));

      // Mock token exchange with id_token (but validation will fail)
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'mock-access-token',
            id_token: 'invalid-id-token'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            email: 'user@moda.gov.tw',
            name: 'Test User',
            picture: 'https://example.com/photo.jpg'
          })
        }) as any;

      const request = new Request(
        'https://db-card.moda.gov.tw/oauth/callback?code=test-code&state=valid-state'
      );

      // When: Handle OAuth callback
      const response = await handleOAuthCallback(request, mockEnv);

      // Then: Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'ID Token validation failed, falling back to UserInfo API:',
        expect.any(Error)
      );

      // Then: UserInfo API should be called as fallback
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Then: Login should complete successfully using UserInfo API
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('login=success');

      consoleErrorSpy.mockRestore();
    });

    it('should maintain backward compatibility with existing flow', async () => {
      // Mock old-style token response (no id_token)
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'mock-access-token',
            token_type: 'Bearer',
            expires_in: 3600
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            email: 'user@moda.gov.tw',
            name: 'Legacy User',
            picture: 'https://example.com/legacy.jpg'
          })
        }) as any;

      const request = new Request(
        'https://db-card.moda.gov.tw/oauth/callback?code=legacy-code&state=valid-state'
      );

      // When: Handle OAuth callback with legacy response
      const response = await handleOAuthCallback(request, mockEnv);

      // Then: Should complete successfully without breaking (302 redirect)
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('login=success');
    });
  });
});
