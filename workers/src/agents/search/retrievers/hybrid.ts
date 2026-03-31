/**
 * Retriever: Hybrid Search (semantic + keyword + RRF)
 * Extracted from SearchAgent (Phase 2 modularization)
 */

import type { Env } from '../../../types';
import type { SearchResult } from '../types';
import { semanticSearch } from './semantic';
import { keywordSearch } from './keyword';
import { mergeAndRerank } from '../rankers/rrf';

/**
 * Parallel semantic + keyword retrieval, fused via RRF.
 * @param query     Raw query for semantic embedding
 * @param normalizedQuery Pre-normalized query for keyword LIKE
 */
export async function hybridSearch(
  env: Env,
  userEmail: string,
  query: string,
  normalizedQuery: string,
  limit: number,
): Promise<SearchResult[]> {
  const [semanticResults, keywordResults] = await Promise.all([
    semanticSearch(env, userEmail, query, 50).catch(() => [] as SearchResult[]),
    keywordSearch(env, userEmail, normalizedQuery, 50).catch(() => [] as SearchResult[]),
  ]);

  return mergeAndRerank(semanticResults, keywordResults).slice(0, limit);
}
