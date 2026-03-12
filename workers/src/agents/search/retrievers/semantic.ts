/**
 * Retriever: Semantic Search via Vectorize + Gemini embeddings
 * Extracted from SearchAgent (Phase 2 modularization)
 */

import type { Env } from '../../../types';
import type { SearchResult } from '../types';

const SCORE_THRESHOLD = 0.7;

/**
 * Semantic search using Vectorize ANN + Gemini text embeddings.
 * Returns an empty array if Vectorize or GEMINI_API_KEY is unavailable.
 */
export async function semanticSearch(
  env: Env,
  userEmail: string,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  if (!env.VECTORIZE || !env.GEMINI_API_KEY) {
    return [];
  }

  try {
    // Generate embedding
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
          outputDimensionality: 768,
        }),
        signal: AbortSignal.timeout(2000),
      },
    );

    if (!embeddingResponse.ok) {
      console.error('Embedding generation failed:', embeddingResponse.status);
      return [];
    }

    const embeddingData = await embeddingResponse.json() as { embedding?: { values?: number[] } };
    const queryVector = embeddingData.embedding?.values;

    if (!queryVector || queryVector.length !== 768) {
      console.error('Invalid embedding dimension');
      return [];
    }

    // Query Vectorize
    const desiredTopK = Math.min(100, limit);
    const useAllMetadata = desiredTopK <= 50;

    const matches = await env.VECTORIZE.query(queryVector, {
      topK: desiredTopK,
      returnMetadata: useAllMetadata ? 'all' : 'indexed',
      filter: { user_email: userEmail },
    });

    const results: SearchResult[] = [];

    for (const match of matches.matches) {
      const card = await env.DB.prepare(
        `SELECT uuid, full_name, organization, title, email, phone, thumbnail_url
         FROM received_cards
         WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL AND merged_to IS NULL`,
      ).bind(match.id, userEmail).first();

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

    return results.filter(r => r.score >= SCORE_THRESHOLD);
  } catch (error) {
    console.error('Semantic search failed:', error);
    return [];
  }
}
