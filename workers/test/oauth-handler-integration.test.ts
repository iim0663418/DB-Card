/**
 * BDD Test: OAuth Handler Integration with ID Token Validation
 * Tests Scenario 10 & 11 from OIDC Phase 1 Day 3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleOAuthCallback } from '../src/handlers/oauth';
import type { Env } from '../src/types';
import * as oidcValidator from '../src/utils/oidc-validator';

describe('Feature 3: OAuth Handler Integration', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      JWT_SECRET: 'test-jwt-secret-32-chars-long!!!',
      KV: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
      } as any
    };

    // Mock validateAndConsumeOAuthState to return true
    vi.mock('../src/utils/oauth-state', () => ({
      validateAndConsumeOAuthState: vi.fn().mockResolvedValue(true)
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
      vi.spyOn(oidcValidator, 'validateIDToken').mockResolvedValue(mockIDTokenPayload);

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
      expect(oidcValidator.validateIDToken).toHaveBeenCalledWith('mock-id-token', mockEnv);

      // Then: UserInfo API should NOT be called
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only token exchange, not UserInfo

      // Then: Response should contain user info from ID Token
      const html = await response.text();
      expect(html).toContain('user@moda.gov.tw');
      expect(html).toContain('Test User');
      expect(html).toContain('https://example.com/photo.jpg');
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

      vi.spyOn(oidcValidator, 'validateIDToken').mockResolvedValue(mockIDTokenPayload);

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

      // Then: Login should complete successfully
      const html = await response.text();
      expect(html).toContain('user@moda.gov.tw');
      expect(html).toContain('Test User');

      consoleWarnSpy.mockRestore();
    });

    it('should fallback to UserInfo API when ID Token validation fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock validateIDToken to fail
      vi.spyOn(oidcValidator, 'validateIDToken').mockRejectedValue(new Error('Invalid signature'));

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
      const html = await response.text();
      expect(html).toContain('user@moda.gov.tw');

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

      // Then: Should complete successfully without breaking
      expect(response.status).toBe(200);

      const html = await response.text();
      expect(html).toContain('user@moda.gov.tw');
      expect(html).toContain('Legacy User');
    });
  });
});
