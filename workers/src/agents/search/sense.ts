/**
 * Sense Layer - Deterministic input perception
 * Phase 2: No extra LLM calls, pure heuristics
 * Phase 3.0.5b: Load realtime hints
 */

import { Env } from '../../types';
import { normalizeToTraditional } from '../../utils/chinese-converter';
import { loadRealtimeHints } from './realtime-hints';
import type { SearchRequest, SenseContext } from './types';

export class SenseLayer {
  constructor(private env: Env) {}

  async perceive(request: SearchRequest): Promise<SenseContext> {
    const { query, userEmail, pagination } = request;
    const { page, limit } = pagination;

    const normalizedQuery = (await normalizeToTraditional(query, this.env)) ?? query;
    const queryType = this.detectQueryType(query);
    // Phase 0 fix: retrieve enough results for the requested page
    const retrievalLimit = Math.min(100, limit * page);

    // Phase 3.0.5b: Load realtime hints (non-blocking if fails)
    const realtimeHints = await loadRealtimeHints(this.env, userEmail)
      .catch(() => null);

    return {
      query,
      normalizedQuery,
      queryType,
      userEmail,
      budget: {
        maxLatency: 5000,
        maxApiCalls: 3,
        retrievalLimit,
      },
      timestamp: Date.now(),
      shadowMode: this.env.AGENT_SHADOW_MODE === 'true',
      enableAgent: this.env.ENABLE_AGENT_SEARCH === 'true',
      enableMeta: this.env.ENABLE_AGENT_META === 'true',
      realtimeHints,
    };
  }

  private detectQueryType(query: string): SenseContext['queryType'] {
    const companyKeywords = /公司|股份|有限|集團|企業|Corp|Inc\.|Ltd|Co\.|LLC|GmbH/i;
    const hasCompany = companyKeywords.test(query);
    // Short queries without company keywords likely refer to person names
    const looksLikePerson = query.trim().length <= 6;

    if (hasCompany && looksLikePerson) return 'mixed';
    if (hasCompany) return 'company';
    if (looksLikePerson && !hasCompany) return 'person';
    return 'unknown';
  }
}
