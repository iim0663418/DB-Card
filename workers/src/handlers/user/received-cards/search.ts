/**
 * Smart Search API - Semantic + Keyword Search
 * GET /api/user/received-cards/search?q={query}&page=1&limit=20
 */

import { Env } from '../../../types';

interface SearchResult {
  uuid: string;
  full_name: string;
  organization: string;
  title: string;
  email: string;
  phone: string;
  score: number;
  match_reason: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface SimpleContext {
  req: { query: (key: string) => string | undefined };
  env: Env;
  get: (key: string) => string | null;
  json: (data: unknown, status?: number) => Response;
}

/**
 * Search FileSearchStore for semantic matches
 */
async function semanticSearch(
  env: Env,
  userEmail: string,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  if (!env.FILE_SEARCH_STORE_NAME || !env.GEMINI_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${env.FILE_SEARCH_STORE_NAME}:query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          query,
          pageSize: limit,
        }),
        signal: AbortSignal.timeout(2000), // 2s timeout
      }
    );

    if (!response.ok) {
      console.error('FileSearchStore error:', response.status);
      return [];
    }

    const data = await response.json() as {
      relevantChunks?: Array<{
        text?: string;
        chunkRelevanceScore?: {
          score?: number;
          metadata?: {
            user_email?: string;
            card_uuid?: string;
          };
        };
      }>;
    };
    const results: SearchResult[] = [];

    // Extract card UUIDs from metadata
    for (const chunk of data.relevantChunks || []) {
      const metadata = chunk.chunkRelevanceScore?.metadata || {};
      
      // Multi-tenant filter
      if (metadata.user_email !== userEmail) continue;

      const cardUuid = metadata.card_uuid;
      if (!cardUuid) continue;

      // Fetch card details from D1
      const card = await env.DB.prepare(
        `SELECT uuid, full_name, organization, title, email, phone
         FROM received_cards
         WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL`
      )
        .bind(cardUuid, userEmail)
        .first();

      if (card) {
        results.push({
          uuid: card.uuid as string,
          full_name: card.full_name as string,
          organization: card.organization as string,
          title: card.title as string,
          email: card.email as string,
          phone: card.phone as string,
          score: chunk.chunkRelevanceScore?.score || 0.8,
          match_reason: `semantic: ${chunk.text?.substring(0, 50)}...`,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Semantic search failed:', error);
    return [];
  }
}

/**
 * Keyword search fallback (D1 LIKE)
 */
async function keywordSearch(
  env: Env,
  userEmail: string,
  query: string,
  page: number,
  limit: number
): Promise<{ results: SearchResult[]; total: number }> {
  const offset = (page - 1) * limit;
  const searchPattern = `%${query}%`;

  // Count total matches
  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as total
     FROM received_cards
     WHERE user_email = ?
       AND deleted_at IS NULL
       AND (
         full_name LIKE ? OR
         organization LIKE ? OR
         title LIKE ? OR
         company_summary LIKE ?
       )`
  )
    .bind(userEmail, searchPattern, searchPattern, searchPattern, searchPattern)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Fetch paginated results
  const { results } = await env.DB.prepare(
    `SELECT uuid, full_name, organization, title, email, phone
     FROM received_cards
     WHERE user_email = ?
       AND deleted_at IS NULL
       AND (
         full_name LIKE ? OR
         organization LIKE ? OR
         title LIKE ? OR
         company_summary LIKE ?
       )
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(
      userEmail,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      limit,
      offset
    )
    .all();

  return {
    results: results.map((card) => ({
      uuid: card.uuid as string,
      full_name: card.full_name as string,
      organization: card.organization as string,
      title: card.title as string,
      email: card.email as string,
      phone: card.phone as string,
      score: 0.5, // Default score for keyword match
      match_reason: 'keyword',
    })),
    total,
  };
}

/**
 * Main search handler
 */
export async function searchCards(c: SimpleContext): Promise<Response> {
  const userEmail = c.get('userEmail');
  if (!userEmail) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Parse query parameters
  const query = c.req.query('q');
  if (!query || query.trim().length === 0) {
    return c.json({ error: 'Query parameter "q" is required' }, 400);
  }

  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));

  // Try semantic search first
  let results = await semanticSearch(c.env, userEmail, query, limit * 2);

  // Fallback to keyword search if semantic fails
  if (results.length === 0) {
    const keywordResults = await keywordSearch(c.env, userEmail, query, page, limit);
    
    return c.json({
      results: keywordResults.results,
      total: keywordResults.total,
      page,
      limit,
      hasMore: keywordResults.total > page * limit,
    } as SearchResponse);
  }

  // Paginate semantic results
  const total = results.length;
  const start = (page - 1) * limit;
  const paginatedResults = results.slice(start, start + limit);

  return c.json({
    results: paginatedResults,
    total,
    page,
    limit,
    hasMore: total > page * limit,
  } as SearchResponse);
}
