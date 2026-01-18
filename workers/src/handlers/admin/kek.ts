// Admin KEK Handler
// POST /api/admin/kek/rotate - Rotate KEK and rewrap all DEKs

import type { Env } from '../../types';
import { verifySetupToken } from '../../middleware/auth';
import { EnvelopeEncryption } from '../../crypto/envelope';
import { logEvent } from '../../utils/audit';
import { jsonResponse, errorResponse } from '../../utils/response';

/**
 * Import KEK from environment variable
 * Returns a CryptoKey suitable for AES-GCM operations
 */
async function importKek(kekBase64: string): Promise<CryptoKey> {
  const kekBytes = Uint8Array.from(atob(kekBase64), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw',
    kekBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Handle POST /api/admin/kek/rotate
 *
 * BDD Scenarios:
 * - Scenario 1: Success - Rotate KEK and rewrap all cards
 * - Scenario 2: Success - No cards to rewrap (cards_rewrapped = 0)
 * - Scenario 3: 401 - Unauthorized (missing Authorization header)
 * - Scenario 4: 500 - KEK not configured
 */
export async function handleKekRotate(request: Request, env: Env): Promise<Response> {
  try {
    // Scenario 3: Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      // Check if Authorization header exists
      const authHeader = request.headers.get('Authorization');

      if (!authHeader) {
        // Scenario 3: Missing token
        return errorResponse('unauthorized', '缺少授權 Token', 401, request);
      } else {
        // Invalid token
        return errorResponse('forbidden', '無效的授權 Token', 403, request);
      }
    }

    // Scenario 4: Check KEK configuration
    if (!env.KEK) {
      return errorResponse('kek_not_configured', 'KEK 未配置', 500, request);
    }

    // Get current active KEK version
    const currentVersionResult = await env.DB.prepare(`
      SELECT version FROM kek_versions
      WHERE status = 'active'
      ORDER BY version DESC
      LIMIT 1
    `).first<{ version: number }>();

    const oldVersion = currentVersionResult?.version || 1;
    const newVersion = oldVersion + 1;

    // Import KEK from environment
    // Note: In Phase 1, we use the same KEK. In production, this should fetch a new KEK from Secrets Manager
    const oldKek = await importKek(env.KEK);
    const newKek = await importKek(env.KEK); // Same KEK for Phase 1 demonstration

    // Initialize EnvelopeEncryption
    const encryption = new EnvelopeEncryption();
    await encryption.initialize(env);

    // Insert new KEK version (status = 'active')
    const rotatedAt = Date.now();
    await env.DB.prepare(`
      INSERT INTO kek_versions (version, status, created_at)
      VALUES (?, 'active', ?)
    `).bind(newVersion, rotatedAt).run();

    // Update old KEK version (status = 'inactive')
    if (currentVersionResult) {
      await env.DB.prepare(`
        UPDATE kek_versions
        SET status = 'inactive'
        WHERE version = ?
      `).bind(oldVersion).run();
    }

    // Query all active cards
    const cardsResult = await env.DB.prepare(`
      SELECT uuid, wrapped_dek
      FROM cards
      WHERE status = 'active'
    `).all<{ uuid: string; wrapped_dek: string }>();

    const cards = cardsResult.results || [];
    let cardsRewrapped = 0;

    // Scenario 2: No cards to rewrap
    // Scenario 1: Rewrap each card's DEK
    for (const card of cards) {
      try {
        // 1. Unwrap DEK with old KEK
        const dek = await encryption.unwrapDek(card.wrapped_dek, oldKek);

        // 2. Wrap DEK with new KEK
        const newWrappedDek = await encryption.wrapDek(dek, newKek);

        // 3. Update cards table
        await env.DB.prepare(`
          UPDATE cards
          SET wrapped_dek = ?,
              key_version = ?,
              updated_at = ?
          WHERE uuid = ?
        `).bind(newWrappedDek, newVersion, rotatedAt, card.uuid).run();

        cardsRewrapped++;
      } catch (error) {
        console.error(`Failed to rewrap card ${card.uuid}:`, error);
        // Continue with other cards instead of failing the entire operation
        // In production, you might want to implement retry logic or rollback
      }
    }

    // Log audit event (kek_rotation)
    await logEvent(
      env,
      'kek_rotation',
      request,
      undefined,
      undefined,
      {
        old_version: oldVersion,
        new_version: newVersion,
        cards_rewrapped: cardsRewrapped,
        rotated_at: rotatedAt
      }
    );

    // Return success response (200 OK)
    return jsonResponse(
      {
        old_version: oldVersion,
        new_version: newVersion,
        cards_rewrapped: cardsRewrapped,
        rotated_at: rotatedAt
      },
      200,
      request
    );
  } catch (error) {
    console.error('Error rotating KEK:', error);

    // Return generic error
    return errorResponse(
      'internal_error',
      'KEK 輪換時發生錯誤',
      500,
      request
    );
  }
}
