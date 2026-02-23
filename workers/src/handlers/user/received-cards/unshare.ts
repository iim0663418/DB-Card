// DELETE /api/user/received-cards/:uuid/share
// Revoke sharing with other users (toggle off)

import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { errorResponse } from '../../../utils/response';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function handleUnshareCard(request: Request, env: Env): Promise<Response> {
  try {
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) return userResult;
    const user = userResult;

    const url = new URL(request.url);
    const uuidMatch = url.pathname.match(/^\/api\/user\/received-cards\/([^\/]+)\/share$/);
    if (!uuidMatch) {
      return errorResponse('INVALID_REQUEST', 'Invalid URL format', 400);
    }

    const uuid = uuidMatch[1];
    if (!UUID_PATTERN.test(uuid)) {
      return errorResponse('INVALID_UUID', 'Invalid UUID format', 400);
    }

    // Check if card exists and not deleted
    const card = await env.DB.prepare(`
      SELECT uuid, user_email FROM received_cards
      WHERE uuid = ? AND deleted_at IS NULL
    `).bind(uuid).first<{ uuid: string; user_email: string }>();

    if (!card) {
      return errorResponse('CARD_NOT_FOUND', 'Card not found', 404);
    }

    // Check ownership
    if (card.user_email !== user.email) {
      return errorResponse('FORBIDDEN', 'You do not own this card', 403);
    }

    // Delete share record
    const result = await env.DB.prepare(`
      DELETE FROM shared_cards
      WHERE card_uuid = ? AND owner_email = ?
    `).bind(uuid, user.email).run();

    if (result.meta.changes === 0) {
      return errorResponse('SHARE_NOT_FOUND', 'Share record not found', 404);
    }

    return new Response(null, { status: 204 });

  } catch (error) {
    console.error('Unshare card error:', error);
    return errorResponse('UNSHARE_FAILED', 'Failed to unshare card', 500);
  }
}
