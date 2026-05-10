/**
 * Keyword Search API
 * GET /api/user/received-cards/search?q={query}&page=1&limit=20
 *
 * v5.3: Downgraded from semantic (Gemini) to pure SQL LIKE keyword search.
 * For semantic search, users should connect via MCP client.
 */

import { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';

export async function searchCards(request: Request, env: Env, _ctx?: ExecutionContext): Promise<Response> {
  try {
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) return userResult;
    const user = userResult;

    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Query parameter "q" is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));

    const normalized = query.trim();
    const pattern = `%${normalized}%`;

    const { results } = await env.DB.prepare(`
      SELECT uuid, full_name, organization, organization_en, organization_alias,
             department, title, email, phone, website, address, note,
             company_summary, personal_summary, thumbnail_url,
             COALESCE(updated_at, created_at) AS sort_ts
      FROM received_cards
      WHERE user_email = ?
        AND deleted_at IS NULL
        AND merged_to IS NULL
        AND (
          full_name LIKE ? OR organization LIKE ? OR
          organization_en LIKE ? OR organization_alias LIKE ? OR
          title LIKE ? OR department LIKE ? OR
          email LIKE ? OR phone LIKE ? OR
          address LIKE ? OR website LIKE ? OR note LIKE ? OR
          company_summary LIKE ? OR personal_summary LIKE ?
        )
      ORDER BY sort_ts DESC
      LIMIT ? OFFSET ?
    `).bind(
      user.email,
      pattern, pattern, pattern, pattern, pattern, pattern,
      pattern, pattern, pattern, pattern, pattern, pattern, pattern,
      limit, (page - 1) * limit,
    ).all();

    // Fetch tags for results
    const cards = results as any[];
    if (cards.length > 0) {
      const uuids = cards.map(c => c.uuid);
      const placeholders = uuids.map(() => '?').join(',');
      const tagResults = await env.DB.prepare(`
        SELECT card_uuid, category, raw_value, normalized_value
        FROM card_tags WHERE card_uuid IN (${placeholders})
        ORDER BY created_at ASC
      `).bind(...uuids).all();

      const tagsByCard = new Map<string, any[]>();
      for (const row of tagResults.results as any[]) {
        if (!tagsByCard.has(row.card_uuid)) tagsByCard.set(row.card_uuid, []);
        tagsByCard.get(row.card_uuid)!.push({ category: row.category, raw: row.raw_value, normalized: row.normalized_value });
      }
      for (const card of cards) {
        card.tags = tagsByCard.get(card.uuid) || [];
      }
    }

    return new Response(JSON.stringify({
      results: cards,
      total: cards.length,
      page,
      limit,
      hasMore: cards.length === limit,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ error: 'Failed to search cards' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
