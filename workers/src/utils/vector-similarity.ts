import type { Env } from '../types';

/**
 * Computes cosine similarity between two equal-length numeric vectors.
 *
 * Returns a value in [-1, 1]:
 *  - 1.0 → identical direction
 *  - 0.0 → orthogonal
 *  - -1.0 → opposite direction
 *
 * Returns 0 when vectors are empty or have different lengths (graceful
 * fallback — avoids NaN propagation upstream).
 */
export function cosineSimilarity(vecA: ArrayLike<number>, vecB: ArrayLike<number>): number {
  if (vecA.length === 0 || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Fetches pre-stored vectors from Vectorize by their IDs.
 *
 * This is a zero-Gemini-API-call operation — it only reads existing vectors
 * that were written during the sync phase.
 *
 * Returns an empty array on error (graceful fallback).
 */
export async function getVectorsByIds(
  env: Env,
  ids: string[]
): Promise<VectorizeVector[]> {
  if (ids.length === 0) return [];

  try {
    return await env.VECTORIZE.getByIds(ids);
  } catch (error) {
    console.error('[VectorSimilarity] getByIds failed:', error);
    return [];
  }
}
