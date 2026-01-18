// Admin Revoke Handler
// POST /api/admin/revoke - Emergency revocation API

import type { Env } from '../../types';
import { verifySetupToken } from '../../middleware/auth';
import { logEvent } from '../../utils/audit';
import { jsonResponse, errorResponse, adminErrorResponse } from '../../utils/response';

/**
 * Handle POST /api/admin/revoke
 *
 * BDD Scenarios:
 * - Scenario 1: Revoke all ReadSessions for a specific card
 * - Scenario 2: Global emergency revocation (token_version++)
 * - Scenario 3: Card not found (404)
 * - Scenario 4: Unauthorized (401)
 * - Scenario 5: Missing required parameters (400)
 */
export async function handleRevoke(request: Request, env: Env): Promise<Response> {
  try {
    // Scenario 4: Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      // Check if Authorization header exists
      const authHeader = request.headers.get('Authorization');

      if (!authHeader) {
        // Scenario 4: Missing token
        return adminErrorResponse('Authentication required', 401, request);
      } else {
        // Invalid token
        return adminErrorResponse('Invalid token', 403, request);
      }
    }

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return errorResponse('invalid_request', '無效的 JSON 格式', 400, request);
    }

    const { card_uuid, global } = body;

    // Scenario 5: Validate parameters - must provide either card_uuid or global
    if (!card_uuid && !global) {
      return errorResponse('invalid_request', '必須提供 card_uuid 或 global 參數', 400, request);
    }

    // Scenario 2: Global emergency revocation
    if (global) {
      return await handleGlobalRevocation(request, env);
    }

    // Scenario 1 & 3: Revoke sessions for specific card
    if (card_uuid) {
      return await handleCardRevocation(request, env, card_uuid);
    }

    // Should not reach here due to validation above
    return errorResponse('invalid_request', '無效的請求參數', 400, request);
  } catch (error) {
    console.error('Error in handleRevoke:', error);

    // Return generic error
    return errorResponse(
      'internal_error',
      '撤銷操作時發生錯誤',
      500,
      request
    );
  }
}

/**
 * Handle card-specific revocation
 * Revokes all active ReadSessions for a specific card
 */
async function handleCardRevocation(
  request: Request,
  env: Env,
  card_uuid: string
): Promise<Response> {
  try {
    // Scenario 3: Check if card exists
    const card = await env.DB.prepare(`
      SELECT uuid FROM cards WHERE uuid = ?
    `).bind(card_uuid).first<{ uuid: string }>();

    if (!card) {
      // Scenario 3: Card not found
      return errorResponse('card_not_found', '名片不存在', 404, request);
    }

    // Scenario 1: Revoke all active ReadSessions for this card
    const revokedAt = Date.now();

    const result = await env.DB.prepare(`
      UPDATE read_sessions
      SET revoked_at = ?, revoked_reason = 'admin'
      WHERE card_uuid = ? AND revoked_at IS NULL
    `).bind(revokedAt, card_uuid).run();

    const sessionsRevoked = result.meta.changes || 0;

    // Update uuid_bindings status to 'revoked'
    await env.DB.prepare(`
      UPDATE uuid_bindings
      SET status = 'revoked'
      WHERE uuid = ?
    `).bind(card_uuid).run();

    // Log audit event (admin_revoke)
    await logEvent(
      env,
      'admin_revoke',
      request,
      card_uuid,
      undefined,
      {
        sessions_revoked: sessionsRevoked,
        revoked_at: revokedAt
      }
    );

    // Return success response
    return jsonResponse(
      {
        card_uuid,
        sessions_revoked: sessionsRevoked,
        revoked_at: revokedAt
      },
      200,
      request
    );
  } catch (error) {
    console.error('Error in handleCardRevocation:', error);
    throw error;
  }
}

/**
 * Handle global emergency revocation
 * Increments token_version to invalidate all active ReadSessions
 */
async function handleGlobalRevocation(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Query current token_version
    const currentVersion = await env.DB.prepare(`
      SELECT version FROM kek_versions
      WHERE status = 'active'
      ORDER BY version DESC
      LIMIT 1
    `).first<{ version: number }>();

    const oldTokenVersion = currentVersion?.version || 1;
    const newTokenVersion = oldTokenVersion + 1;
    const revokedAt = Date.now();

    // Insert new kek_versions record (version++, status = 'active')
    await env.DB.prepare(`
      INSERT INTO kek_versions (version, status, created_at)
      VALUES (?, 'active', ?)
    `).bind(newTokenVersion, revokedAt).run();

    // Update old record (status = 'inactive')
    await env.DB.prepare(`
      UPDATE kek_versions
      SET status = 'inactive'
      WHERE version = ?
    `).bind(oldTokenVersion).run();

    // Log audit event (emergency_revoke)
    await logEvent(
      env,
      'emergency_revoke',
      request,
      undefined,
      undefined,
      {
        old_token_version: oldTokenVersion,
        new_token_version: newTokenVersion,
        revoked_at: revokedAt
      }
    );

    // Return success response
    return jsonResponse(
      {
        global: true,
        old_token_version: oldTokenVersion,
        new_token_version: newTokenVersion,
        revoked_at: revokedAt
      },
      200,
      request
    );
  } catch (error) {
    console.error('Error in handleGlobalRevocation:', error);
    throw error;
  }
}
