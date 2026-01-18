// NFC Tap Handler
// POST /api/nfc/tap - Issue ReadSession on NFC card tap

import type { Env, Card } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { createSession, getRecentSession, revokeSession, shouldRevoke } from '../utils/session';
import { logEvent } from '../utils/audit';

/**
 * Validate UUID v4 format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Check rate limiting using KV
 * Returns true if rate limit exceeded
 */
async function checkRateLimit(env: Env, card_uuid: string): Promise<boolean> {
  const now = Date.now();
  const minute = Math.floor(now / 60000); // Current minute bucket
  const key = `ratelimit:${card_uuid}:${minute}`;

  const count = await env.KV.get(key);
  const currentCount = count ? parseInt(count, 10) : 0;

  if (currentCount >= 10) {
    return true; // Rate limit exceeded
  }

  // Increment counter with 2 minute TTL
  await env.KV.put(key, String(currentCount + 1), { expirationTtl: 120 });
  return false;
}

/**
 * Handle NFC tap request
 */
export async function handleTap(request: Request, env: Env): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json() as { card_uuid?: string };
    const { card_uuid } = body;

    // Validate card_uuid presence
    if (!card_uuid) {
      await logEvent(env, 'tap', request, undefined, undefined, {
        error: 'missing_card_uuid'
      });
      return errorResponse('invalid_request', '缺少必要參數 card_uuid', 400, request);
    }

    // Validate UUID format
    if (!isValidUUID(card_uuid)) {
      await logEvent(env, 'tap', request, card_uuid, undefined, {
        error: 'invalid_uuid_format'
      });
      return errorResponse('invalid_request', '無效的 UUID 格式', 400, request);
    }

    // Check rate limiting
    const rateLimited = await checkRateLimit(env, card_uuid);
    if (rateLimited) {
      await logEvent(env, 'tap', request, card_uuid, undefined, {
        error: 'rate_limit_exceeded'
      });
      return errorResponse('rate_limit_exceeded', '請求過於頻繁,請稍後再試', 429, request);
    }

    // Fetch card from database
    const card = await env.DB.prepare(`
      SELECT * FROM cards WHERE uuid = ?
    `).bind(card_uuid).first<Card>();

    // Scenario 4: Card not found
    if (!card) {
      await logEvent(env, 'tap', request, card_uuid, undefined, {
        error: 'card_not_found'
      });
      return errorResponse('card_not_found', '名片不存在', 404, request);
    }

    // Scenario 5: Card inactive
    if (card.status !== 'active') {
      await logEvent(env, 'tap', request, card_uuid, undefined, {
        error: 'card_inactive',
        status: card.status
      });
      return errorResponse('card_inactive', '名片已停用', 403, request);
    }

    // Check for recent session (Scenario 2)
    let revoked_previous = false;
    const recentSession = await getRecentSession(env, card_uuid);

    if (recentSession && shouldRevoke(recentSession)) {
      await revokeSession(env, recentSession.session_id, 'retap');
      revoked_previous = true;

      await logEvent(env, 'revoke', request, card_uuid, recentSession.session_id, {
        reason: 'retap',
        revoked_session: recentSession.session_id
      });
    }

    // Create new session (Scenario 1 & 2)
    const newSession = await createSession(env, card_uuid, card.card_type);

    // Log tap event
    await logEvent(env, 'tap', request, card_uuid, newSession.session_id, {
      card_type: card.card_type,
      revoked_previous
    });

    // Return successful response
    return jsonResponse({
      session_id: newSession.session_id,
      expires_at: newSession.expires_at,
      max_reads: newSession.max_reads,
      reads_used: newSession.reads_used,
      revoked_previous
    }, 200, request);

  } catch (error) {
    // Log error
    await logEvent(env, 'tap', request, undefined, undefined, {
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });

    return errorResponse(
      'internal_error',
      '伺服器內部錯誤',
      500,
      request
    );
  }
}
