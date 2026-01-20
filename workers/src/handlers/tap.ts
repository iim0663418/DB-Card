// NFC Tap Handler
// POST /api/nfc/tap - Issue ReadSession on NFC card tap
// Implements BDD Spec: Multi-Layer Defense (Dedup + Rate Limit)

import type { Env, Card, CardType } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { createSession, getRecentSession, revokeSession, shouldRevoke } from '../utils/session';
import { logEvent } from '../utils/audit';
import { getClientIP } from '../utils/ip';
import { checkRateLimit, incrementRateLimit } from '../utils/rate-limit';

/**
 * Validate UUID v4 format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Handle NFC tap request
 * Execution order (BDD Spec):
 * Step 0: Basic validation (method, params, UUID format)
 * Step 1: Dedup check → if hit, return existing session
 * Step 2: Rate limit (4 checks: card minute/hour, IP minute/hour)
 * Step 3: Validate card (existence, revoked status)
 * Step 4: Retap revocation (existing logic)
 * Step 5: Create session + store dedup + increment counters
 */
export async function handleTap(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    // ============================================================
    // STEP 0: Basic Validation
    // ============================================================

    // Parse request body
    const body = await request.json() as { card_uuid?: string };
    const { card_uuid } = body;

    // Validate card_uuid presence
    if (!card_uuid) {
      ctx.waitUntil(logEvent(env, 'tap', request, undefined, undefined, {
        error: 'missing_card_uuid'
      }));
      return errorResponse('invalid_request', '缺少必要參數 card_uuid', 400, request);
    }

    // Validate UUID format
    if (!isValidUUID(card_uuid)) {
      ctx.waitUntil(logEvent(env, 'tap', request, card_uuid, undefined, {
        error: 'invalid_uuid_format'
      }));
      return errorResponse('invalid_request', '無效的 UUID 格式', 400, request);
    }

    // ============================================================
    // STEP 1: Dedup Check (BDD Scenario 2, 9)
    // ============================================================

    const dedupKey = `tap:dedup:${card_uuid}`;
    const existingSessionId = await env.KV.get(dedupKey);

    if (existingSessionId) {
      // Dedup hit - return existing session without creating new one
      // This applies to ALL requests (including admin portal - no bypass)

      // Fetch session details to return
      const sessionResult = await env.DB.prepare(`
        SELECT session_id, card_uuid, issued_at, expires_at, max_reads, reads_used, revoked_at
        FROM read_sessions
        WHERE session_id = ?
      `).bind(existingSessionId).first();

      if (sessionResult) {
        ctx.waitUntil(logEvent(env, 'tap', request, card_uuid, existingSessionId, {
          dedup_hit: true,
          reused: true
        }));

        return jsonResponse({
          session_id: sessionResult.session_id,
          expires_at: sessionResult.expires_at,
          max_reads: sessionResult.max_reads,
          reads_used: sessionResult.reads_used,
          reused: true  // Scenario 2 requirement
        }, 200, request);
      }

      // If session not found (expired/deleted), fall through to create new one
    }

    // ============================================================
    // STEP 2: Rate Limit Check (BDD Scenario 3, 4, 11)
    // ============================================================

    const clientIP = getClientIP(request);

    // Check all 4 rate limit dimensions
    const rateLimitChecks = await Promise.all([
      checkRateLimit(env.KV, 'card_uuid', card_uuid, 'minute'),
      checkRateLimit(env.KV, 'card_uuid', card_uuid, 'hour'),
      checkRateLimit(env.KV, 'ip', clientIP, 'minute'),
      checkRateLimit(env.KV, 'ip', clientIP, 'hour')
    ]);

    // Find first failed rate limit check
    const failedCheck = rateLimitChecks.find(result => !result.allowed);

    if (failedCheck) {
      // Rate limit exceeded (Scenario 3, 4)
      ctx.waitUntil(logEvent(env, 'tap', request, card_uuid, undefined, {
        error: 'rate_limited',
        limit_scope: failedCheck.dimension,
        window: failedCheck.window,
        current: failedCheck.current,
        limit: failedCheck.limit
      }));

      return new Response(JSON.stringify({
        error: 'rate_limited',
        message: '請求過於頻繁,請稍後再試',
        retry_after: failedCheck.retry_after,
        limit_scope: failedCheck.dimension,
        window: failedCheck.window,
        limit: failedCheck.limit,
        current: failedCheck.current
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(failedCheck.retry_after)
        }
      });
    }

    // ============================================================
    // STEP 3: Validate Card (BDD Scenario 6, 7)
    // ============================================================

    // Use D1 batch to split queries (avoid JOIN overhead)
    const [cardResult, bindingResult] = await env.DB.batch([
      env.DB.prepare(`
        SELECT uuid, encrypted_payload, wrapped_dek, key_version, created_at, updated_at
        FROM cards WHERE uuid = ?
      `).bind(card_uuid),

      env.DB.prepare(`
        SELECT type, status FROM uuid_bindings WHERE uuid = ?
      `).bind(card_uuid)
    ]);

    const card = cardResult.results[0] as {
      uuid: string;
      encrypted_payload: string;
      wrapped_dek: string;
      key_version: number;
      created_at: number;
      updated_at: number;
    } | undefined;

    const binding = bindingResult.results[0] as {
      type: string;
      status: string;
    } | undefined;

    // Reconstruct result object
    const result = card ? {
      ...card,
      card_type: binding?.type || null,
      binding_status: binding?.status || null
    } : null;

    // Scenario 6: Card not found
    if (!result) {
      ctx.waitUntil(logEvent(env, 'tap', request, card_uuid, undefined, {
        error: 'card_not_found'
      }));
      return errorResponse('card_not_found', '名片不存在', 404, request);
    }

    // Scenario 7: Card revoked
    if (result.binding_status === 'revoked') {
      ctx.waitUntil(logEvent(env, 'tap', request, card_uuid, undefined, {
        error: 'card_revoked',
        status: result.binding_status
      }));
      return errorResponse('card_revoked', '名片已撤銷', 403, request);
    }

    // ============================================================
    // STEP 4: Retap Revocation (BDD Scenario 8)
    // Preserve existing logic
    // ============================================================

    let revoked_previous = false;
    const recentSession = await getRecentSession(env, card_uuid);

    if (recentSession && shouldRevoke(recentSession)) {
      await revokeSession(env, recentSession.session_id, 'retap');
      revoked_previous = true;

      ctx.waitUntil(logEvent(env, 'revoke', request, card_uuid, recentSession.session_id, {
        reason: 'retap',
        revoked_session: recentSession.session_id
      }));
    }

    // ============================================================
    // STEP 5: Create Session + Store Dedup + Increment Counters
    // (BDD Scenario 1, 5, 8)
    // ============================================================

    // Map user card type to CardType
    let cardType: CardType = 'personal';
    if (result.card_type === 'event') {
      cardType = 'event_booth';
    } else if (result.card_type === 'sensitive') {
      cardType = 'sensitive';
    }

    const newSession = await createSession(env, card_uuid, cardType);

    // Store dedup entry (TTL: 60s)
    await env.KV.put(dedupKey, newSession.session_id, { expirationTtl: 60 });

    // Increment rate limit counters (all 4 dimensions)
    await Promise.all([
      incrementRateLimit(env.KV, 'card_uuid', card_uuid, 'minute'),
      incrementRateLimit(env.KV, 'card_uuid', card_uuid, 'hour'),
      incrementRateLimit(env.KV, 'ip', clientIP, 'minute'),
      incrementRateLimit(env.KV, 'ip', clientIP, 'hour')
    ]);

    ctx.waitUntil(logEvent(env, 'tap', request, card_uuid, newSession.session_id, {
      card_type: result.card_type,
      revoked_previous,
      reused: false  // Scenario 1 requirement
    }));

    // Return successful response (Scenario 1)
    return jsonResponse({
      session_id: newSession.session_id,
      expires_at: newSession.expires_at,
      max_reads: newSession.max_reads,
      reads_used: newSession.reads_used,
      revoked_previous,
      reused: false  // NEW: explicitly indicate this is a new session
    }, 200, request);

  } catch (error) {
    ctx.waitUntil(logEvent(env, 'tap', request, undefined, undefined, {
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));

    return errorResponse(
      'internal_error',
      '伺服器內部錯誤',
      500,
      request
    );
  }
}
