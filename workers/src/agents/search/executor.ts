/**
 * Act Layer (Executor) - Retrieval → Fusion pipeline
 * Phase 2: Orchestrates retrievers and rankers
 *
 * Note: Enrichment (related_contacts, tags) happens AFTER pagination
 * in agent.ts to avoid enriching results that won't be shown.
 */

import type { Env } from '../../types';
import type { SenseContext, SearchPlan, ExecutionResult, SearchResult } from './types';
import { semanticSearch } from './retrievers/semantic';
import { keywordSearch } from './retrievers/keyword';
import { mergeAndRerank } from './rankers/rrf';

export class Executor {
  constructor(private env: Env) {}

  async execute(plan: SearchPlan, context: SenseContext): Promise<ExecutionResult> {
    const { userEmail, query, normalizedQuery, budget } = context;
    const limit = budget.retrievalLimit;
    const tools = plan.tools ?? ['semantic', 'keyword'];

    const toolsUsed: string[] = [];
    const latencies: Record<string, number> = {};
    let results: SearchResult[];

    if (tools.includes('semantic') && tools.includes('keyword')) {
      // Hybrid: parallel retrieval + RRF fusion
      const t0 = Date.now();
      const [semResults, kwResults] = await Promise.all([
        semanticSearch(this.env, userEmail, query, 50).catch(() => [] as SearchResult[]),
        keywordSearch(this.env, userEmail, normalizedQuery, 50).catch(() => [] as SearchResult[]),
      ]);
      const elapsed = Date.now() - t0;
      latencies['semantic'] = elapsed;
      latencies['keyword'] = elapsed;
      toolsUsed.push('semantic', 'keyword');
      results = mergeAndRerank(semResults, kwResults).slice(0, limit);
    } else if (tools.includes('semantic')) {
      const t0 = Date.now();
      results = await semanticSearch(this.env, userEmail, query, limit).catch(() => [] as SearchResult[]);
      latencies['semantic'] = Date.now() - t0;
      toolsUsed.push('semantic');
    } else {
      const t0 = Date.now();
      results = await keywordSearch(this.env, userEmail, normalizedQuery, limit).catch(() => [] as SearchResult[]);
      latencies['keyword'] = Date.now() - t0;
      toolsUsed.push('keyword');
    }

    return {
      results,
      execution: {
        toolsUsed,
        latencies,
        fallbackTriggered: plan.fallback ?? false,
      },
    };
  }
}
