// JWKS Manager - OIDC Phase 1 Day 1
// Handles Google JWKS fetching and caching for ID Token validation

import type { JWK } from 'jose';
import type { Env } from '../types';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const JWKS_CACHE_KEY = 'jwks:google';
const JWKS_CACHE_TTL = 3600; // 1 hour in seconds

export interface JWKS {
  keys: JWK[];
}

/**
 * Scenario 6: Fetch JWKS from Google
 * @returns JWKS from Google's public endpoint
 * @throws Error if fetch fails
 */
export async function fetchGoogleJWKS(): Promise<JWKS> {
  const response = await fetch(GOOGLE_JWKS_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Scenario 7: Get cached JWKS from KV
 * @param env - Cloudflare Workers environment
 * @returns Cached JWKS or null if not found/expired
 */
export async function getCachedJWKS(env: Env): Promise<JWKS | null> {
  const cached = await env.KV.get(JWKS_CACHE_KEY);

  if (!cached) {
    return null;
  }

  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

/**
 * Scenario 6: Store JWKS in KV cache
 * @param jwks - JWKS to cache
 * @param env - Cloudflare Workers environment
 */
export async function setCachedJWKS(jwks: JWKS, env: Env): Promise<void> {
  await env.KV.put(
    JWKS_CACHE_KEY,
    JSON.stringify(jwks),
    { expirationTtl: JWKS_CACHE_TTL }
  );
}

/**
 * Scenario 6-9: Main JWKS getter with cache logic and fallback
 *
 * Flow:
 * 1. Try to get from cache (Scenario 7)
 * 2. If cache hit, return cached JWKS
 * 3. If cache miss, fetch from Google (Scenario 6)
 * 4. Cache the fetched JWKS (Scenario 8)
 * 5. If fetch fails, use stale cache as fallback (Scenario 9)
 *
 * @param env - Cloudflare Workers environment
 * @returns JWKS for ID Token validation
 * @throws Error if JWKS unavailable and no cache exists
 */
export async function getJWKS(env: Env): Promise<JWKS> {
  // Scenario 7: Try cache first
  const cached = await getCachedJWKS(env);
  if (cached) {
    return cached;
  }

  // Scenario 6 & 8: Cache miss - fetch and cache
  try {
    const jwks = await fetchGoogleJWKS();
    await setCachedJWKS(jwks, env);
    return jwks;
  } catch (error) {
    // Scenario 9: Fetch failed - try stale cache without TTL check
    console.error('JWKS fetch failed, attempting stale cache fallback:', error);

    const staleCache = await env.KV.get(JWKS_CACHE_KEY);
    if (staleCache) {
      try {
        console.warn('Using stale JWKS cache due to fetch failure');
        return JSON.parse(staleCache);
      } catch {
        // Stale cache corrupted
      }
    }

    throw new Error('JWKS unavailable');
  }
}
