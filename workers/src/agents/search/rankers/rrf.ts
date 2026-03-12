/**
 * Ranker: Reciprocal Rank Fusion (RRF)
 * Extracted from SearchAgent (Phase 2 modularization)
 */

import type { SearchResult } from '../types';

/**
 * Merge semantic and keyword results using RRF scoring.
 * Cards appearing in both lists get a score bonus.
 */
export function mergeAndRerank(
  semanticResults: SearchResult[],
  keywordResults: SearchResult[],
  k: number = 60,
): SearchResult[] {
  const rrfScores = new Map<string, { result: SearchResult; score: number }>();

  semanticResults.forEach((result, index) => {
    const rank = index + 1;
    const rrfScore = 1 / (k + rank);
    rrfScores.set(result.uuid, {
      result: { ...result, match_reason: 'semantic' },
      score: rrfScore,
    });
  });

  keywordResults.forEach((result, index) => {
    const rank = index + 1;
    const rrfScore = 1 / (k + rank);
    const existing = rrfScores.get(result.uuid);
    if (existing) {
      existing.score += rrfScore;
      existing.result.match_reason = 'semantic + keyword';
    } else {
      rrfScores.set(result.uuid, {
        result: { ...result, match_reason: 'keyword match' },
        score: rrfScore,
      });
    }
  });

  return Array.from(rrfScores.values())
    .sort((a, b) => b.score - a.score)
    .map(item => ({ ...item.result, score: item.score }));
}
