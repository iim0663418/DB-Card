// OIDC ID Token Validator - Phase 1 Day 2
// Validates Google ID Tokens using JWKS public keys

import { jwtVerify, createLocalJWKSet } from 'jose';
import type { Env } from '../types';
import { getJWKS } from './jwks-manager';

const GOOGLE_ISSUER = 'https://accounts.google.com';
const CLOCK_SKEW_SECONDS = 60; // ±60 seconds tolerance

/**
 * Google ID Token Payload Structure
 * OpenID Connect Core 1.0 Section 2
 */
export interface GoogleIDTokenPayload {
  iss: string;              // 'https://accounts.google.com'
  aud: string;              // GOOGLE_CLIENT_ID
  sub: string;              // User unique ID (future primary key)
  email: string;            // User email
  email_verified: boolean;  // Email verification status
  name: string;             // User display name
  picture: string;          // User avatar URL
  iat: number;              // Issued at (Unix timestamp)
  exp: number;              // Expiration time (Unix timestamp)
}

/**
 * Scenario 1-5: Validate Google ID Token
 *
 * BDD Scenarios:
 * - Scenario 1: ✅ Verify issuer, audience, exp, iat, signature
 * - Scenario 2: ❌ Reject invalid issuer
 * - Scenario 3: ❌ Reject invalid audience
 * - Scenario 4: ❌ Reject expired token
 * - Scenario 5: ❌ Reject invalid signature
 *
 * @param idToken - JWT ID Token from Google OAuth
 * @param env - Cloudflare Workers environment
 * @returns Validated ID Token payload
 * @throws Error with specific message for each validation failure
 */
export async function validateIDToken(
  idToken: string,
  env: Env
): Promise<GoogleIDTokenPayload> {
  try {
    // Get JWKS from cache or fetch from Google
    const jwks = await getJWKS(env);

    // Create a local JWKS for jose verification
    const localJWKSet = createLocalJWKSet(jwks);

    // Verify JWT signature and claims
    const { payload } = await jwtVerify(idToken, localJWKSet, {
      issuer: GOOGLE_ISSUER,
      audience: env.GOOGLE_CLIENT_ID,
      clockTolerance: CLOCK_SKEW_SECONDS
    });

    // Scenario 2: Verify issuer (double-check, jwtVerify already validates)
    if (payload.iss !== GOOGLE_ISSUER) {
      throw new Error('Invalid issuer');
    }

    // Scenario 3: Verify audience (double-check, jwtVerify already validates)
    if (payload.aud !== env.GOOGLE_CLIENT_ID) {
      throw new Error('Invalid audience');
    }

    // Scenario 4: Verify expiration (jwtVerify already validates with clock tolerance)
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now - CLOCK_SKEW_SECONDS) {
      throw new Error('Token expired');
    }

    // Verify issued at (with clock skew)
    if (!payload.iat || payload.iat > now + CLOCK_SKEW_SECONDS) {
      throw new Error('Invalid issued at time');
    }

    // Extract and return claims
    return {
      iss: payload.iss as string,
      aud: payload.aud as string,
      sub: payload.sub as string,
      email: payload.email as string,
      email_verified: payload.email_verified as boolean,
      name: payload.name as string,
      picture: payload.picture as string,
      iat: payload.iat as number,
      exp: payload.exp as number
    };
  } catch (error) {
    // Scenario 5: Invalid signature (caught by jwtVerify)
    if (error instanceof Error) {
      // Map jose errors to our error messages
      if (error.message.includes('signature')) {
        throw new Error('Invalid signature');
      }
      if (error.message.includes('expired')) {
        throw new Error('Token expired');
      }
      if (error.message.includes('issuer')) {
        throw new Error('Invalid issuer');
      }
      if (error.message.includes('audience')) {
        throw new Error('Invalid audience');
      }
      // Re-throw our custom errors
      throw error;
    }
    throw new Error('ID Token validation failed');
  }
}
