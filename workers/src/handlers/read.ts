// Read Handler: GET /api/read
// BDD Specification: Phase 2 Task 2.2
// Implements secure card data reading with session validation

import type { Env, ReadSession, Card, CardData } from '../types';
import { EnvelopeEncryption } from '../crypto/envelope';
import { logEvent } from '../utils/audit';
import { jsonResponse, errorResponse } from '../utils/response';

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
 * Checks: expires_at, revoked_at, reads_used vs max_reads
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

  // Check max_reads
  if (session.reads_used >= session.max_reads) {
    return {
      valid: false,
      reason: 'max_reads_exceeded',
      message: '已達讀取次數上限'
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
export async function handleRead(request: Request, env: Env): Promise<Response> {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const card_uuid = url.searchParams.get('uuid');
    const session_id = url.searchParams.get('session');

    // Validate required parameters
    if (!card_uuid || !session_id) {
      await logEvent(env, 'read', request, card_uuid || undefined, session_id || undefined, {
        error: 'missing_parameters'
      });
      return errorResponse('invalid_request', '缺少必要參數 uuid 或 session', 400);
    }

    // Fetch session from database
    const session = await env.DB.prepare(`
      SELECT * FROM read_sessions
      WHERE session_id = ? AND card_uuid = ?
    `).bind(session_id, card_uuid).first<ReadSession>();

    // Validate session
    const validation = validateSession(session);
    if (!validation.valid) {
      await logEvent(env, 'read', request, card_uuid, session_id, {
        error: validation.reason
      });

      const statusCode = validation.reason === 'session_not_found' ? 404 : 403;
      return errorResponse(validation.reason!, validation.message!, statusCode);
    }

    // Fetch card data
    const card = await env.DB.prepare(`
      SELECT * FROM cards
      WHERE uuid = ? AND status = 'active'
    `).bind(card_uuid).first<Card>();

    if (!card) {
      await logEvent(env, 'read', request, card_uuid, session_id, {
        error: 'card_not_found'
      });
      return errorResponse('card_not_found', '名片不存在或已刪除', 404);
    }

    // Decrypt card data
    const crypto = new EnvelopeEncryption();
    await crypto.initialize(env);

    let cardData: CardData;
    try {
      cardData = await crypto.decryptCard(
        card.encrypted_payload,
        card.wrapped_dek
      ) as CardData;
    } catch (error) {
      await logEvent(env, 'read', request, card_uuid, session_id, {
        error: 'decryption_failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      return errorResponse('internal_error', '解密失敗', 500);
    }

    // Update reads_used
    await env.DB.prepare(`
      UPDATE read_sessions
      SET reads_used = reads_used + 1
      WHERE session_id = ?
    `).bind(session_id).run();

    // Calculate remaining reads
    const reads_remaining = session!.max_reads - (session!.reads_used + 1);

    // Log successful read
    await logEvent(env, 'read', request, card_uuid, session_id, {
      reads_used: session!.reads_used + 1,
      reads_remaining
    });

    // Return decrypted card data with session info
    return jsonResponse({
      data: cardData,
      session_info: {
        reads_remaining,
        expires_at: session!.expires_at
      }
    });

  } catch (error) {
    console.error('Read handler error:', error);
    await logEvent(env, 'read', request, undefined, undefined, {
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return errorResponse('internal_error', '伺服器錯誤', 500);
  }
}
