// POST /api/user/received-cards/:uuid/share
// Share a received card with other users (toggle on)

import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { jsonResponse, errorResponse } from '../../../utils/response';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function handleShareCard(request: Request, env: Env): Promise<Response> {
  try {
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) return userResult;
    const user = userResult;

    const url = new URL(request.url);
    const uuidMatch = url.pathname.match(/^\/api\/user\/received-cards\/([^/]+)\/share$/);
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
      WHERE uuid = ? AND deleted_at IS NULL AND merged_to IS NULL
    `).bind(uuid).first<{ uuid: string; user_email: string }>();

    if (!card) {
      return errorResponse('CARD_NOT_FOUND', 'Card not found', 404);
    }

    // Check ownership
    if (card.user_email !== user.email) {
      return errorResponse('FORBIDDEN', 'You do not own this card', 403);
    }

    // Check if already shared
    const existingShare = await env.DB.prepare(`
      SELECT id FROM shared_cards
      WHERE card_uuid = ? AND owner_email = ?
    `).bind(uuid, user.email).first<{ id: number }>();

    if (existingShare) {
      return errorResponse('ALREADY_SHARED', 'Card is already shared with other users', 409);
    }

    // Insert share record (share with other users)
    await env.DB.prepare(`
      INSERT INTO shared_cards (card_uuid, owner_email, shared_at)
      VALUES (?, ?, ?)
    `).bind(uuid, user.email, Date.now()).run();

    return jsonResponse({ message: 'Card shared with other users' });

  } catch (error) {
    console.error('Share card error:', error);
    return errorResponse('SHARE_FAILED', 'Failed to share card', 500);
  }
}
