// Thumbnail Handler for Received Cards
// GET /api/user/received-cards/:uuid/thumbnail

import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { errorResponse } from '../../../utils/response';

/**
 * Handle GET /api/user/received-cards/:uuid/thumbnail
 */
export async function handleGetThumbnail(
  request: Request,
  env: Env,
  uuid: string
): Promise<Response> {
  const DEBUG = env.ENVIRONMENT === 'staging';
  try {
    if (DEBUG) console.log('[Thumbnail] Request for card:', uuid);

    // 1. Verify OAuth
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) {
      if (DEBUG) console.log('[Thumbnail] OAuth verification failed');
      return userResult;
    }
    const user = userResult;

    // 2. Fetch card from database (with tenant isolation)
    const card = await env.DB.prepare(`
      SELECT thumbnail_url
      FROM received_cards
      WHERE uuid = ? AND deleted_at IS NULL
        AND (
          user_email = ?
          OR EXISTS (
            SELECT 1 FROM shared_cards WHERE card_uuid = ?
          )
        )
    `)
      .bind(uuid, user.email, uuid)
      .first();

    if (!card) {
      if (DEBUG) console.log('[Thumbnail] Card not found or access denied');
      return errorResponse('NOT_FOUND', 'Card not found', 404);
    }

    if (!card.thumbnail_url) {
      if (DEBUG) console.log('[Thumbnail] No thumbnail available');
      return errorResponse('NOT_FOUND', 'Thumbnail not available', 404);
    }

    // 3. Fetch thumbnail from R2
    const thumbnailObj = await env.PHYSICAL_CARDS.get(card.thumbnail_url as string);

    if (!thumbnailObj) {
      if (DEBUG) console.log('[Thumbnail] Thumbnail not found in R2');
      return errorResponse('NOT_FOUND', 'Thumbnail not found in storage', 404);
    }

    // 4. Return thumbnail with cache headers
    return new Response(thumbnailObj.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Thumbnail] Error:', error);
    return errorResponse('THUMBNAIL_FAILED', 'Failed to retrieve thumbnail', 500);
  }
}
