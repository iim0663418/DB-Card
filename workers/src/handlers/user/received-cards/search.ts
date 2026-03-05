/**
 * Smart Search API - Semantic + Keyword Search
 * GET /api/user/received-cards/search?q={query}&page=1&limit=20
 */

import { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { normalizeToTraditional } from '../../../utils/chinese-converter';

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
  // 1. Count related contacts in same organization (use normalized + alias)
  let relatedContacts = 0;
  if (result.organization) {
    // Get normalized organization name and aliases for the current card
    const cardInfo = await env.DB.prepare(`
      SELECT organization_normalized, organization_alias FROM received_cards WHERE uuid = ?
    `).bind(result.uuid).first<{ organization_normalized: string | null; organization_alias: string | null }>();

    if (cardInfo?.organization_normalized) {
      // Parse aliases (stored as plain text string, e.g., "零曜科技, Zeroflare")
      const aliases: string[] = cardInfo.organization_alias 
        ? cardInfo.organization_alias.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      
      // Build search terms: normalized name + all aliases
      const searchTerms = [cardInfo.organization_normalized, ...aliases];
      
      // Build OR conditions: each search term matches organization_normalized OR in organization_alias
      const conditions: string[] = [];
      const params = [userEmail];
      
      for (const term of searchTerms) {
        // Match organization_normalized
        conditions.push('organization_normalized = ?');
        params.push(term);
        // Match in organization_alias JSON array
        conditions.push('organization_alias LIKE ?');
        params.push(`%"${term}"%`);
      }
      
      const countResult = await env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM received_cards
        WHERE user_email = ?
          AND (${conditions.join(' OR ')})
          AND deleted_at IS NULL
          AND merged_to IS NULL
          AND uuid != ?
      `).bind(...params, result.uuid).first<{ count: number }>();
      
      relatedContacts = countResult?.count || 0;
    }
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
         WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL AND merged_to IS NULL`
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
 * Merge and re-rank results using Reciprocal Rank Fusion (RRF)
 * RRF formula: score = Σ(1 / (k + rank)), k = 60 (standard constant)
 * Reference: ACM SIGIR 2009 - "Reciprocal Rank Fusion outperforms Condorcet and individual systems"
 */
function mergeAndRerank(
  semanticResults: SearchResult[],
  keywordResults: SearchResult[],
  k: number = 60
): SearchResult[] {
  const rrfScores = new Map<string, { result: SearchResult; score: number }>();

  // Process semantic results
  semanticResults.forEach((result, index) => {
    const rank = index + 1;
    const rrfScore = 1 / (k + rank);

    rrfScores.set(result.uuid, {
      result: { ...result, match_reason: 'semantic' },
      score: rrfScore
    });
  });

  // Process keyword results
  keywordResults.forEach((result, index) => {
    const rank = index + 1;
    const rrfScore = 1 / (k + rank);

    const existing = rrfScores.get(result.uuid);
    if (existing) {
      // Accumulate RRF scores for documents in both lists
      existing.score += rrfScore;
      existing.result.match_reason = 'semantic + keyword';
    } else {
      rrfScores.set(result.uuid, {
        result: { ...result, match_reason: 'keyword match' },
        score: rrfScore
      });
    }
  });

  // Sort by RRF score and return
  return Array.from(rrfScores.values())
    .sort((a, b) => b.score - a.score)
    .map(item => ({ ...item.result, score: item.score }));
}

/**
 * Keyword search - FTS5 does not support Chinese tokenization,
 * so we delegate directly to the LIKE-based fallback.
 */
async function keywordSearch(
  env: Env,
  userEmail: string,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  // FTS5 default tokenizer does not support Chinese; use LIKE fallback instead.
  // Original FTS5 implementation commented out below.
  //
  // const normalizedQuery = (await normalizeToTraditional(query, env)) ?? query;
  // const ftsQuery = normalizedQuery.trim().replace(/\s+/g, ' OR ');
  // const { results } = await env.DB.prepare(`
  //   SELECT rc.uuid, rc.full_name, rc.organization, rc.title,
  //          rc.email, rc.phone, rc.thumbnail_url, fts.rank
  //   FROM received_cards_fts fts
  //   JOIN received_cards rc ON fts.uuid = rc.uuid
  //   WHERE fts.received_cards_fts MATCH ?
  //     AND rc.user_email = ?
  //     AND rc.deleted_at IS NULL
  //     AND rc.merged_to IS NULL
  //   ORDER BY fts.rank
  //   LIMIT ?
  // `).bind(ftsQuery, userEmail, limit).all();
  return keywordSearchFallback(env, userEmail, query, limit);
}

/**
 * Fallback keyword search using LIKE (if FTS fails)
 */
async function keywordSearchFallback(
  env: Env,
  userEmail: string,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  const normalizedQuery = (await normalizeToTraditional(query, env)) ?? query;
  const pattern = `%${normalizedQuery}%`;

  const { results } = await env.DB.prepare(`
    SELECT uuid, full_name, organization, title, email, phone, thumbnail_url
    FROM received_cards
    WHERE user_email = ?
      AND deleted_at IS NULL
      AND merged_to IS NULL
      AND (
        full_name LIKE ? OR
        organization LIKE ? OR
        organization_en LIKE ? OR
        organization_alias LIKE ? OR
        title LIKE ? OR
        department LIKE ? OR
        company_summary LIKE ? OR
        personal_summary LIKE ? OR
        email LIKE ? OR
        phone LIKE ? OR
        address LIKE ? OR
        website LIKE ? OR
        note LIKE ?
      )
    ORDER BY updated_at DESC
    LIMIT ?
  `).bind(userEmail, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, limit).all();

  return results.map((card: any) => ({
    uuid: card.uuid as string,
    full_name: card.full_name as string,
    organization: card.organization as string,
    title: card.title as string,
    email: card.email as string,
    phone: card.phone as string,
    thumbnail_url: card.thumbnail_url as string | undefined,
    score: 1.0,
    match_reason: 'keyword match',
  }));
}

/**
 * Hybrid Search: Semantic (Vectorize) + Keyword (D1) with RRF Re-ranking
 */
async function hybridSearch(
  env: Env,
  userEmail: string,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  // Run both searches in parallel; errors in either do not block the other
  const [semanticResults, keywordResults] = await Promise.all([
    semanticSearch(env, userEmail, query, 50).catch(() => [] as SearchResult[]),
    keywordSearch(env, userEmail, query, 50).catch(() => [] as SearchResult[]),
  ]);

  const merged = mergeAndRerank(semanticResults, keywordResults);
  return merged.slice(0, limit);
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

    // Hybrid Search: Semantic + Keyword with RRF Re-ranking
    const merged = await hybridSearch(env, userEmail, query, limit);

    // Paginate
    const total = merged.length;
    const start = (page - 1) * limit;
    const paginatedResults = merged.slice(start, start + limit);

    // Enrich results
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
