/**
 * Retriever: Keyword Search via SQL LIKE
 * Extracted from SearchAgent (Phase 2 modularization)
 *
 * Accepts a pre-normalized query (from SenseContext) to avoid
 * duplicate Chinese normalization.
 */

import type { Env } from '../../../types';
import type { SearchResult } from '../types';

/**
 * Full-text keyword search across all card fields.
 * @param normalizedQuery Already-normalized query (from SenseLayer)
 */
export async function keywordSearch(
  env: Env,
  userEmail: string,
  normalizedQuery: string,
  limit: number,
): Promise<SearchResult[]> {
  const pattern = `%${normalizedQuery}%`;

  const { results } = await env.DB.prepare(`
    SELECT uuid, full_name, organization, title, email, phone, thumbnail_url
    FROM received_cards
    WHERE user_email = ?
      AND deleted_at IS NULL
      AND merged_to IS NULL
      AND (
        full_name LIKE ? OR organization LIKE ? OR organization_normalized LIKE ? OR
        organization_en LIKE ? OR organization_alias LIKE ? OR title LIKE ? OR
        department LIKE ? OR company_summary LIKE ? OR personal_summary LIKE ? OR
        email LIKE ? OR phone LIKE ? OR address LIKE ? OR website LIKE ? OR note LIKE ?
      )
    ORDER BY updated_at DESC
    LIMIT ?
  `).bind(
    userEmail,
    pattern, pattern, pattern, pattern, pattern, pattern, pattern,
    pattern, pattern, pattern, pattern, pattern, pattern, pattern,
    limit,
  ).all();

  return results.map((card: any) => ({
    uuid: card.uuid,
    full_name: card.full_name,
    organization: card.organization,
    title: card.title,
    email: card.email,
    phone: card.phone,
    thumbnail_url: card.thumbnail_url,
    score: 1.0,
    match_reason: 'keyword match',
    result_source: 'keyword',
  }));
}
