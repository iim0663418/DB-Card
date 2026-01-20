// User Revocation History Handler
// GET /api/user/revocation-history

import type { Env } from '../../types';
import { verifyOAuth } from '../../middleware/oauth';
import { jsonResponse, errorResponse } from '../../utils/response';
import { EnvelopeEncryption } from '../../crypto/envelope';

/**
 * Handle GET /api/user/revocation-history
 * Scenario 3.1: Query revocation/restore history (30 days)
 */
export async function handleRevocationHistory(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // OAuth verification
    const authResult = await verifyOAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { email } = authResult;

    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    // Query audit logs for revoke/restore events in last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 86400 * 1000);

    const logs = await env.DB.prepare(`
      SELECT
        event_type,
        card_uuid,
        timestamp,
        details
      FROM audit_logs
      WHERE event_type IN ('user_card_revoke', 'user_card_restore')
        AND timestamp >= ?
        AND json_extract(details, '$.actor_id') = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).bind(thirtyDaysAgo, email, limit).all();

    if (!logs.results || logs.results.length === 0) {
      return jsonResponse(
        {
          history: [],
          total: 0,
          limit
        },
        200,
        request
      );
    }

    // Initialize encryption for card name decryption
    const encryption = new EnvelopeEncryption();
    await encryption.initialize(env);

    // Build history entries
    const history = await Promise.all(
      logs.results.map(async (log: any) => {
        const cardUuid = log.card_uuid;
        let cardName = 'Unknown Card';

        // Get card data to extract name
        try {
          const card = await env.DB.prepare(`
            SELECT encrypted_payload, wrapped_dek FROM cards WHERE uuid = ?
          `).bind(cardUuid).first<{ encrypted_payload: string; wrapped_dek: string }>();

          if (card) {
            const cardData = await encryption.decryptCard(
              card.encrypted_payload,
              card.wrapped_dek
            ) as any;

            // Construct bilingual name
            const nameZh = cardData.name?.zh || '';
            const nameEn = cardData.name?.en || '';
            const titleZh = cardData.title?.zh || '';
            const titleEn = cardData.title?.en || '';

            cardName = `${nameZh} / ${nameEn}`;
            if (titleZh || titleEn) {
              cardName += ` - ${titleZh || titleEn}`;
            }
          }
        } catch (error) {
          console.error('Failed to decrypt card name:', error);
        }

        // Parse details
        let details: any = {};
        try {
          details = log.details ? JSON.parse(log.details) : {};
        } catch (error) {
          // Ignore parse errors
        }

        return {
          card_uuid: cardUuid,
          card_name: cardName,
          action: log.event_type === 'user_card_revoke' ? 'revoke' : 'restore',
          reason: details.reason || null,
          timestamp: new Date(log.timestamp).toISOString(),
          sessions_affected: details.sessions_revoked || 0
        };
      })
    );

    return jsonResponse(
      {
        history,
        total: history.length,
        limit
      },
      200,
      request
    );
  } catch (error) {
    console.error('Error fetching revocation history:', error);
    return errorResponse('internal_error', 'Failed to fetch history', 500, request);
  }
}
