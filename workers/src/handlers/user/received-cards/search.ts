/**
 * Smart Search API - Semantic + Keyword Search
 * GET /api/user/received-cards/search?q={query}&page=1&limit=20
 */

import { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';

interface SearchResult {
  uuid: string;
  full_name: string;
  organization: string;
  title: string;
  email: string;
  phone: string;
  thumbnail_url?: string;
  score: number;
  match_reason: string;
  // Enrichment data
  related_contacts?: number;
  tags?: string[];
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Enrich search result with related contacts and tags
 */
async function enrichSearchResult(
  env: Env,
  userEmail: string,
  result: SearchResult
): Promise<SearchResult> {
  // 1. Count related contacts in same organization
  let relatedContacts = 0;
  if (result.organization) {
    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM received_cards
      WHERE user_email = ?
        AND organization = ?
        AND deleted_at IS NULL
        AND uuid != ?
    `).bind(userEmail, result.organization, result.uuid).first<{ count: number }>();
    
    relatedContacts = countResult?.count || 0;
  }

  // 2. Get auto-generated tags (industry, location)
  const { results: tagRows } = await env.DB.prepare(`
    SELECT tag FROM card_tags
    WHERE card_uuid = ?
      AND tag_source LIKE 'auto%'
      AND (tag LIKE 'industry:%' OR tag LIKE 'location:%')
    LIMIT 3
  `).bind(result.uuid).all();
  
  const tags = tagRows.map(t => (t.tag as string).split(':')[1]).filter(Boolean);

  return {
    ...result,
    related_contacts: relatedContacts > 0 ? relatedContacts : undefined,
    tags: tags.length > 0 ? tags : undefined,
  };
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
          outputDimensionality: 768
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
    // Dynamic strategy based on limit:
    // - returnMetadata='all' supports topK up to 50
    // - returnMetadata='indexed' supports topK up to 100
    const desiredTopK = Math.min(100, limit);
    const useAllMetadata = desiredTopK <= 50;
    
    const matches = await env.VECTORIZE.query(queryVector, {
      topK: desiredTopK,
      returnMetadata: useAllMetadata ? 'all' : 'indexed',
      filter: { user_email: userEmail },
    });

    const results: SearchResult[] = [];

    // Fetch card details for each match
    for (const match of matches.matches) {
      const cardUuid = match.id;

      const card = await env.DB.prepare(
        `SELECT uuid, full_name, organization, title, email, phone, thumbnail_url
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
          thumbnail_url: card.thumbnail_url as string | undefined,
          score: match.score,
          match_reason: `semantic: score ${match.score.toFixed(3)}`,
        });
      }
    }

    // Filter low-relevance results (score < 0.7)
    const SCORE_THRESHOLD = 0.7;
    const filteredResults = results.filter(r => r.score >= SCORE_THRESHOLD);

    return filteredResults;
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
    `SELECT uuid, full_name, organization, title, email, phone, thumbnail_url
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
      thumbnail_url: card.thumbnail_url as string | undefined,
      score: 0.5, // Default score for keyword match
      match_reason: 'keyword',
    })),
    total,
  };
}

/**
 * Main search handler
 */
export async function searchCards(request: Request, env: Env): Promise<Response> {
  try {
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) return userResult;
    const user = userResult;

    const userEmail = user.email;

    // Parse query parameters
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

    // Try semantic search first with 2x limit for better recall
    // Vectorize supports topK up to 100 with returnMetadata='indexed'
    let results = await semanticSearch(env, userEmail, query, Math.min(100, limit * 2));

    // Fallback to keyword search if semantic fails
    if (results.length === 0) {
      const keywordResults = await keywordSearch(env, userEmail, query, page, limit);

      // Enrich keyword search results
      const enrichedKeywordResults = await Promise.all(
        keywordResults.results.map(result => enrichSearchResult(env, userEmail, result))
      );

      return new Response(JSON.stringify({
        results: enrichedKeywordResults,
        total: keywordResults.total,
        page,
        limit,
        hasMore: keywordResults.total > page * limit,
      } as SearchResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Paginate semantic results
    const total = results.length;
    const start = (page - 1) * limit;
    const paginatedResults = results.slice(start, start + limit);

    // Enrich semantic search results
    const enrichedResults = await Promise.all(
      paginatedResults.map(result => enrichSearchResult(env, userEmail, result))
    );

    return new Response(JSON.stringify({
      results: enrichedResults,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    } as SearchResponse), {
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
