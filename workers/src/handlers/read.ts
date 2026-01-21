// Read Handler: GET /api/read
// BDD Specification: Phase 2 Task 2.2
// Implements secure card data reading with session validation

import type { Env, ReadSession, Card, CardData } from '../types';
import { EnvelopeEncryption } from '../crypto/envelope';
import { logEvent } from '../utils/audit';
import { errorResponse } from '../utils/response';

/**
 * Get card type from uuid_bindings table
 * @returns 'personal' | 'event' | 'sensitive'
 * @default 'personal' if query fails (conservative fallback)
 */
async function getCardType(
  env: Env,
  cardUuid: string
): Promise<'personal' | 'event' | 'sensitive'> {
  try {
    const result = await env.DB.prepare(`
      SELECT ub.card_type
      FROM uuid_bindings ub
      WHERE ub.uuid = ?
        AND ub.status = 'bound'
      LIMIT 1
    `).bind(cardUuid).first<{ card_type: string }>();

    if (!result || !result.card_type) {
      console.warn(`[getCardType] No card_type found for ${cardUuid}, defaulting to 'personal'`);
      return 'personal';
    }

    const cardType = result.card_type as 'personal' | 'event' | 'sensitive';
    if (!['personal', 'event', 'sensitive'].includes(cardType)) {
      console.warn(`[getCardType] Invalid card_type '${cardType}', defaulting to 'personal'`);
      return 'personal';
    }

    return cardType;
  } catch (error) {
    console.error('[getCardType] Query failed:', error);
    return 'personal'; // Conservative fallback
  }
}

/**
 * Get cached card data with optional TTL
 * @param ttl - Cache expiration time in seconds (default: 300)
 * @param ttl=0 - No caching (returns decrypted data immediately)
 */
async function getCachedCardData(
  env: Env,
  uuid: string,
  encryptedPayload: string,
  wrappedDek: string,
  ttl: number = 300
): Promise<CardData> {
  const cacheKey = `card:${uuid}`;

  // If ttl is 0, skip cache entirely (for sensitive cards)
  if (ttl > 0) {
    const cached = await env.KV.get(cacheKey, {
      type: 'json',
      cacheTtl: ttl
    });

    if (cached) return cached as CardData;
  }

  const crypto = new EnvelopeEncryption();
  await crypto.initialize(env);
  const cardData = await crypto.decryptCard(encryptedPayload, wrappedDek) as CardData;

  // Only cache if ttl > 0
  if (ttl > 0) {
    await env.KV.put(cacheKey, JSON.stringify(cardData), {
      expirationTtl: ttl
    });
  }

  return cardData;
}

// CORS allowed origins whitelist
const ALLOWED_ORIGINS = [
  'http://localhost:8788',
  'http://localhost:8787',
  'https://db-card-staging.csw30454.workers.dev',
  'https://db-card.moda.gov.tw'
];

function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    };
  }
  return {};
}

/**
 * Session validation result
 */
interface SessionValidation {
  valid: boolean;
  reason?: 'session_expired' | 'session_revoked' | 'max_reads_exceeded' | 'session_not_found';
  message?: string;
}

/**
 * Validate ReadSession
 * Checks: expires_at, revoked_at, reads_used vs max_reads (concurrent limit)
 */
function validateSession(session: ReadSession | null): SessionValidation {
  if (!session) {
    return {
      valid: false,
      reason: 'session_not_found',
      message: 'Session 不存在'
    };
  }

  const now = Date.now();

  // Check expiration
  if (session.expires_at < now) {
    return {
      valid: false,
      reason: 'session_expired',
      message: '請再次碰卡以重新取得授權'
    };
  }

  // Check revocation
  if (session.revoked_at !== undefined && session.revoked_at !== null) {
    return {
      valid: false,
      reason: 'session_revoked',
      message: '此授權已被撤銷'
    };
  }

  // Check max_reads (concurrent read limit)
  if (session.reads_used >= session.max_reads) {
    return {
      valid: false,
      reason: 'max_reads_exceeded',
      message: '已達同時讀取數上限'
    };
  }

  return { valid: true };
}

/**
 * GET /api/read?uuid=card-123&session=sess-valid
 *
 * BDD Scenarios:
 * 1. Valid session -> 200 + decrypted card data
 * 2. Expired session -> 403 session_expired
 * 3. Revoked session -> 403 session_revoked
 * 4. Max reads exceeded -> 403 max_reads_exceeded
 * 5. Session not found -> 404 session_not_found
 */
export async function handleRead(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const url = new URL(request.url);
    const card_uuid = url.searchParams.get('uuid');
    const session_id = url.searchParams.get('session');

    if (!card_uuid || !session_id) {
      ctx.waitUntil(logEvent(env, 'read', request, card_uuid || undefined, session_id || undefined, {
        error: 'missing_parameters'
      }));
      return errorResponse('invalid_request', '缺少必要參數 uuid 或 session', 400, request);
    }

    const responseCacheKey = `read:${card_uuid}:${session_id}`;
    const cachedResponse = await env.KV.get(responseCacheKey, {
      type: 'json',
      cacheTtl: 60
    });

    if (cachedResponse) {
      return new Response(JSON.stringify({
        success: true,
        ...cachedResponse
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...(request ? getCorsHeaders(request) : {})
        }
      });
    }

    const session = await env.DB.prepare(`
      SELECT * FROM read_sessions
      WHERE session_id = ? AND card_uuid = ?
    `).bind(session_id, card_uuid).first<ReadSession>();

    const validation = validateSession(session);
    if (!validation.valid) {
      ctx.waitUntil(logEvent(env, 'read', request, card_uuid, session_id, {
        error: validation.reason
      }));
      const statusCode = validation.reason === 'session_not_found' ? 404 : 403;
      return errorResponse(validation.reason!, validation.message!, statusCode, request);
    }

    const card = await env.DB.prepare(`
      SELECT uuid, encrypted_payload, wrapped_dek, key_version
      FROM cards
      WHERE uuid = ?
    `).bind(card_uuid).first<{
      uuid: string;
      encrypted_payload: string;
      wrapped_dek: string;
      key_version: number;
    }>();

    if (!card) {
      ctx.waitUntil(logEvent(env, 'read', request, card_uuid, session_id, {
        error: 'card_not_found'
      }));
      return errorResponse('card_not_found', '名片不存在或已刪除', 404, request);
    }

    // BDD: Mixed Cache Strategy by Card Type
    // Get card type to determine caching strategy
    const cardType = await getCardType(env, card_uuid);

    let cardData: CardData;
    try {
      if (cardType === 'sensitive') {
        // Scenario 1: sensitive cards - no caching (ttl=0)
        // Decrypt every time, do not write to KV cache
        cardData = await getCachedCardData(
          env,
          card_uuid,
          card.encrypted_payload,
          card.wrapped_dek,
          0 // ttl=0 disables caching
        );
      } else {
        // Scenario 2-4: personal/event cards - cache 60s
        cardData = await getCachedCardData(
          env,
          card_uuid,
          card.encrypted_payload,
          card.wrapped_dek,
          60 // Cache for 60 seconds
        );
      }
    } catch (error) {
      ctx.waitUntil(logEvent(env, 'read', request, card_uuid, session_id, {
        error: 'decryption_failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }));
      return errorResponse('internal_error', '解密失敗', 500, request);
    }

    ctx.waitUntil(
      env.DB.prepare(`
        UPDATE read_sessions
        SET reads_used = reads_used + 1
        WHERE session_id = ?
      `).bind(session_id).run()
    );

    const reads_remaining = session!.max_reads - (session!.reads_used + 1);

    ctx.waitUntil(logEvent(env, 'read', request, card_uuid, session_id, {
      reads_used: session!.reads_used + 1,
      reads_remaining
    }));

    const responseData = {
      data: cardData,
      session_info: {
        reads_remaining,
        expires_at: session!.expires_at
      }
    };

    ctx.waitUntil(
      env.KV.put(responseCacheKey, JSON.stringify(responseData), {
        expirationTtl: 60
      })
    );

    return new Response(JSON.stringify({
      success: true,
      ...responseData
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...(request ? getCorsHeaders(request) : {})
      }
    });

  } catch (error) {
    console.error('Read handler error:', error);
    ctx.waitUntil(logEvent(env, 'read', request, undefined, undefined, {
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));
    return errorResponse('internal_error', '伺服器錯誤', 500, request);
  }
}
