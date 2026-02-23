// GET /api/user/shared-cards
// List all shared cards (for logged-in users)

import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { jsonResponse, errorResponse } from '../../../utils/response';

export async function handleListSharedCards(request: Request, env: Env): Promise<Response> {
  try {
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) return userResult;

    const sharedCards = await env.DB.prepare(`
      SELECT
        rc.uuid,
        rc.name_prefix,
        rc.full_name,
        rc.first_name,
        rc.last_name,
        rc.name_suffix,
        rc.organization,
        rc.organization_en,
        rc.organization_alias,
        rc.department,
        rc.title,
        rc.phone,
        rc.email,
        rc.website,
        rc.address,
        rc.note,
        rc.company_summary,
        rc.personal_summary,
        rc.ai_sources_json,
        rc.ai_status,
        rc.original_image_url,
        rc.thumbnail_url,
        rc.created_at,
        rc.updated_at,
        sc.owner_email AS shared_by,
        sc.shared_at
      FROM shared_cards sc
      INNER JOIN received_cards rc ON sc.card_uuid = rc.uuid
      WHERE rc.deleted_at IS NULL
      ORDER BY sc.shared_at DESC
    `).all();

    // Parse ai_sources_json for each card
    const cardsWithSources = sharedCards.results.map((card: any) => ({
      ...card,
      sources: card.ai_sources_json ? JSON.parse(card.ai_sources_json) : []
    }));

    return jsonResponse(cardsWithSources);

  } catch (error) {
    console.error('List shared cards error:', error);
    return errorResponse('LIST_FAILED', 'Failed to list shared cards', 500);
  }
}
