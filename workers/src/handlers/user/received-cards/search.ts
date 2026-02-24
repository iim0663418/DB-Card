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
 * Search using Vectorize for semantic matches
 */
async function semanticSearch(
  env: Env,
  userEmail: string,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  if (!env.VECTORIZE || !env.GEMINI_API_KEY) {
    return [];
  }

  try {
    // Generate embedding for query
    const embeddingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_EMBEDDING_MODEL}:embedContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          model: `models/${env.GEMINI_EMBEDDING_MODEL}`,
          content: { parts: [{ text: query }] },
        }),
        signal: AbortSignal.timeout(2000),
      }
    );

    if (!embeddingResponse.ok) {
      console.error('Embedding generation failed:', embeddingResponse.status);
      return [];
    }

    const embeddingData = await embeddingResponse.json() as {
      embedding?: { values?: number[] };
    };
    const queryVector = embeddingData.embedding?.values;

    if (!queryVector || queryVector.length !== 768) {
      console.error('Invalid embedding dimension');
      return [];
    }

    // Query Vectorize with multi-tenant filter
    const matches = await env.VECTORIZE.query(queryVector, {
      topK: limit,
      returnMetadata: 'all',
      filter: { user_email: userEmail },
    });

    const results: SearchResult[] = [];

    // Fetch card details for each match
    for (const match of matches.matches) {
      const cardUuid = match.id;

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
          score: match.score,
          match_reason: `semantic: score ${match.score.toFixed(3)}`,
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
