// Image Handler for Received Cards
// GET /api/user/received-cards/:uuid/image

import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { errorResponse } from '../../../utils/response';

/**
 * Handle GET /api/user/received-cards/:uuid/image
 */
export async function handleGetImage(
  request: Request,
  env: Env,
  uuid: string
): Promise<Response> {
  try {
    // 1. Verify OAuth
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) {
      return userResult;
    }
    const user = userResult;

    // 2. Fetch card from database (with tenant isolation)
    const card = await env.DB.prepare(`
      SELECT original_image_url
      FROM received_cards
      WHERE uuid = ? AND deleted_at IS NULL AND merged_to IS NULL
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
      return errorResponse('NOT_FOUND', 'Card not found', 404);
    }

    if (!card.original_image_url) {
      return errorResponse('NOT_FOUND', 'Image not available', 404);
    }

    // 3. Fetch image from R2
    const imageObj = await env.PHYSICAL_CARDS.get(card.original_image_url as string);

    if (!imageObj) {
      return errorResponse('NOT_FOUND', 'Image not found in storage', 404);
    }

    // 4. Return image with cache headers
    return new Response(imageObj.body, {
      status: 200,
      headers: {
        'Content-Type': imageObj.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Image] Error:', error);
    return errorResponse('IMAGE_FAILED', 'Failed to retrieve image', 500);
  }
}
