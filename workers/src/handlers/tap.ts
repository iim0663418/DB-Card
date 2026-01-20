// NFC Tap Handler
// POST /api/nfc/tap - Issue ReadSession on NFC card tap
// Implements BDD Spec: Multi-Layer Defense (Rate Limit + Budget)

import type { Env, Card, CardType } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { createSession, getRecentSession, revokeSession, shouldRevoke } from '../utils/session';
import { logEvent } from '../utils/audit';
import { getClientIP } from '../utils/ip';
import { checkRateLimit, incrementRateLimit } from '../utils/rate-limit';
import { checkSessionBudget, incrementSessionBudget } from '../utils/session-budget';

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
 * Step 1: Rate limit (2 checks: card hour, IP hour)
 * Step 1.5: Budget check (total/daily/monthly limits)
 * Step 2: Validate card (existence, revoked status)
 * Step 3: Retap revocation (existing logic)
 * Step 4: Create session + increment counters + increment budget
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
    // STEP 1: Rate Limit Check (Hour-Only Window)
    // ============================================================

    const clientIP = getClientIP(request);

    // Check 2 rate limit dimensions (hour-only window)
    const rateLimitChecks = await Promise.all([
      checkRateLimit(env.KV, 'card_uuid', card_uuid, 'hour'),
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
    // STEP 1.5: Budget Check
    // ============================================================

    // Map user card type to CardType (preview for budget check)
    // Use KV cache for performance (TTL: 24 hours)
    const cardTypeCacheKey = `card_type:${card_uuid}`;
    let cachedType = await env.KV.get(cardTypeCacheKey);

    let cardTypePreview: { type: string } | null = null;
    if (cachedType) {
      cardTypePreview = { type: cachedType };
    } else {
      cardTypePreview = await env.DB.prepare(`
        SELECT type FROM uuid_bindings WHERE uuid = ?
      `).bind(card_uuid).first<{ type: string }>();

      // Cache the type if found
      if (cardTypePreview?.type) {
        await env.KV.put(cardTypeCacheKey, cardTypePreview.type, { expirationTtl: 86400 });
      }
    }

    let cardTypeBudget: CardType = 'personal';
    if (cardTypePreview?.type === 'event') {
      cardTypeBudget = 'event_booth';
    } else if (cardTypePreview?.type === 'sensitive') {
      cardTypeBudget = 'sensitive';
    }

    const budgetResult = await checkSessionBudget(env, card_uuid, cardTypeBudget);

    if (!budgetResult.allowed) {
      if (budgetResult.reason === 'total_limit_exceeded') {
        ctx.waitUntil(logEvent(env, 'tap', request, card_uuid, undefined, {
          error: 'session_budget_exceeded',
          details: budgetResult.details
        }));

        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'session_budget_exceeded',
            message: '此名片已達到使用上限，請聯絡管理員',
            details: budgetResult.details,
          }
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (budgetResult.reason === 'daily_limit_exceeded') {
        ctx.waitUntil(logEvent(env, 'tap', request, card_uuid, undefined, {
          error: 'daily_budget_exceeded',
          details: budgetResult.details
        }));

        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'daily_budget_exceeded',
            message: '今日使用次數已達上限',
            details: budgetResult.details,
          }
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': budgetResult.details?.retry_after || ''
          }
        });
      }

      if (budgetResult.reason === 'monthly_limit_exceeded') {
        ctx.waitUntil(logEvent(env, 'tap', request, card_uuid, undefined, {
          error: 'monthly_budget_exceeded',
          details: budgetResult.details
        }));

        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'monthly_budget_exceeded',
            message: '本月使用次數已達上限',
            details: budgetResult.details,
          }
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': budgetResult.details?.retry_after || ''
          }
        });
      }
    }

    // ============================================================
    // STEP 2: Validate Card (BDD Scenario 6, 7)
    // ============================================================

    // Use D1 batch to split queries (avoid JOIN overhead)
    // If we have cached type, only fetch status; otherwise fetch both
    const [cardResult, bindingResult] = await env.DB.batch([
      env.DB.prepare(`
        SELECT uuid, encrypted_payload, wrapped_dek, key_version, created_at, updated_at
        FROM cards WHERE uuid = ?
      `).bind(card_uuid),

      cachedType
        ? env.DB.prepare(`SELECT status FROM uuid_bindings WHERE uuid = ?`).bind(card_uuid)
        : env.DB.prepare(`SELECT type, status FROM uuid_bindings WHERE uuid = ?`).bind(card_uuid)
    ]);

    const card = cardResult.results[0] as {
      uuid: string;
      encrypted_payload: string;
      wrapped_dek: string;
      key_version: number;
      created_at: number;
      updated_at: number;
    } | undefined;

    const bindingData = bindingResult.results[0] as
      | { type?: string; status: string }
      | undefined;

    const binding = cachedType
      ? { type: cachedType, status: bindingData?.status || 'active' }
      : (bindingData as { type: string; status: string } | undefined);

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
    // STEP 3: Retap Revocation (BDD Scenario 8)
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
    // STEP 4: Create Session + Increment Counters
    // (BDD Scenario 1, 5, 8)
    // ============================================================

    // Map user card type to CardType
    let cardType: CardType = 'personal';
    if (result.card_type === 'event') {
      cardType = 'event_booth';
    } else if (result.card_type === 'sensitive') {
      cardType = 'sensitive';
    }

    // Pass ctx to enable async session insert + cache update
    const newSession = await createSession(env, card_uuid, cardType, ctx);

    // Increment rate limit counters + session budget (all in parallel)
    await Promise.all([
      incrementRateLimit(env.KV, 'card_uuid', card_uuid, 'hour'),
      incrementRateLimit(env.KV, 'ip', clientIP, 'hour'),
      incrementSessionBudget(env, card_uuid)
    ]);

    ctx.waitUntil(logEvent(env, 'tap', request, card_uuid, newSession.session_id, {
      card_type: result.card_type,
      revoked_previous
    }));

    // Return successful response (Scenario 1)
    return jsonResponse({
      session_id: newSession.session_id,
      expires_at: newSession.expires_at,
      max_reads: newSession.max_reads,
      reads_used: newSession.reads_used,
      revoked_previous,
      ...(budgetResult.warning && { warning: budgetResult.warning })
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
