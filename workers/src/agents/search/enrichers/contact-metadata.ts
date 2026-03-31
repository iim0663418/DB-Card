/**
 * Enricher: Contact Metadata (related contacts + tags)
 * Extracted from SearchAgent (Phase 2 modularization)
 */

import type { Env } from '../../../types';
import { escapeLike, parseOrganizationAlias } from '../../../utils/search-helpers';
import type { SearchResult } from '../types';

/**
 * Enrich a search result with:
 * - related_contacts: count of colleagues in the same org
 * - tags: auto-generated industry/location tags
 */
export async function enrichSearchResult(
  env: Env,
  userEmail: string,
  result: SearchResult,
): Promise<SearchResult> {
  try {
    // 1. Count related contacts
    let relatedContacts = 0;
    if (result.organization) {
      const cardInfo = await env.DB.prepare(`
        SELECT organization_normalized, organization_alias FROM received_cards WHERE uuid = ?
      `).bind(result.uuid).first<{ organization_normalized: string | null; organization_alias: string | null }>();

      if (cardInfo?.organization_normalized) {
        const aliases = parseOrganizationAlias(cardInfo.organization_alias);
        const searchTerms = [cardInfo.organization_normalized, ...aliases];
        const termPlaceholders = searchTerms.map(() => '?').join(', ');
        const likeConditions = searchTerms.map(() => `organization_alias LIKE ? ESCAPE '\\'`).join(' OR ');
        const likeParams = searchTerms.map(t => `%${escapeLike(t)}%`);

        const countResult = await env.DB.prepare(`
          SELECT COUNT(*) as count
          FROM received_cards
          WHERE user_email = ?
            AND deleted_at IS NULL
            AND merged_to IS NULL
            AND uuid != ?
            AND (
              organization_normalized IN (${termPlaceholders})
              OR EXISTS (
                SELECT 1 FROM json_each(organization_alias) je
                WHERE je.value IN (${termPlaceholders})
              )
              OR (${likeConditions})
            )
        `).bind(userEmail, result.uuid, ...searchTerms, ...searchTerms, ...likeParams).first<{ count: number }>();

        relatedContacts = countResult?.count || 0;
      }
    }

    // 2. Get tags
    const { results: tagRows } = await env.DB.prepare(`
      SELECT category, raw_value, normalized_value
      FROM card_tags
      WHERE card_uuid = ?
        AND tag_source LIKE 'auto%'
        AND category IN ('industry', 'location')
      LIMIT 3
    `).bind(result.uuid).all();

    const tags = tagRows.map(t => ({
      category: (t as any).category,
      raw: (t as any).raw_value,
      normalized: (t as any).normalized_value,
    }));

    return {
      ...result,
      related_contacts: relatedContacts > 0 ? relatedContacts : undefined,
      tags: tags.length > 0 ? tags : undefined,
    };
  } catch (error) {
    console.error('[enrichSearchResult] failed', {
      card_uuid: result.uuid,
      error: String(error),
    });
    return { ...result, related_contacts: 0, tags: [] };
  }
}
