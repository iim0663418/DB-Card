/**
 * SearchAgent - Four-Layer Orchestrator
 * Phase 2: Sense → Think → Act → Remember
 *
 * The agent coordinates four distinct layers and remains a thin orchestrator.
 * All business logic lives in the individual layer modules.
 */

import type { Env } from '../../types';
import { SenseLayer } from './sense';
import { Planner } from './planner';
import { Executor } from './executor';
import { MemoryLayer } from './memory';
import { enrichSearchResult } from './enrichers/contact-metadata';
import type { SearchRequest, SearchResponse, SearchResult } from './types';

export class SearchAgent {
  private sense: SenseLayer;
  private planner: Planner;
  private executor: Executor;
  private memory: MemoryLayer;

  constructor(
    private env: Env,
    private ctx?: ExecutionContext,
  ) {
    this.sense = new SenseLayer(env);
    this.planner = new Planner(env);
    this.executor = new Executor(env);
    this.memory = new MemoryLayer(env, ctx);
  }

  async run(request: SearchRequest): Promise<SearchResponse> {
    const { pagination } = request;
    const { page, limit } = pagination;

    // ── Layer 1: Sense ────────────────────────────────────────────────────────
    const context = await this.sense.perceive(request);

    // ── Layer 2: Think ────────────────────────────────────────────────────────
    const plan = await this.planner.plan(context);

    // ── Layer 3: Act ──────────────────────────────────────────────────────────
    const executionResult = await this.executor.execute(plan, context);

    // ── Pagination (preserved from Phase 0/1) ────────────────────────────────
    const total = executionResult.results.length;
    const start = (page - 1) * limit;
    const paginatedResults = executionResult.results.slice(start, start + limit);

    // ── Enrichment (after pagination, cap at 50) ──────────────────────────────
    const toEnrich = paginatedResults.slice(0, 50);
    const enrichedResults: SearchResult[] = [];
    for (const result of toEnrich) {
      enrichedResults.push(await enrichSearchResult(this.env, context.userEmail, result));
    }

    // ── Layer 4: Remember (non-blocking) ─────────────────────────────────────
    this.memory.record(context, plan, executionResult);

    // ── Build response ────────────────────────────────────────────────────────
    const response: SearchResponse = {
      results: enrichedResults,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };

    if (context.enableMeta && !context.shadowMode) {
      response.meta = {
        // Phase 1 fields (backward compat)
        intent: plan.intent,
        confidence: plan.confidence,
        tools: plan.tools,
        cached: plan.cached,
        latency_ms: Object.values(executionResult.execution.latencies).reduce((a, b) => a + b, 0),
        fallback: plan.fallback,
        // Phase 2 layer details
        sense: {
          queryType: context.queryType,
          normalizedQuery: context.normalizedQuery,
        },
        think: {
          goal: plan.goal,
          reasoning: plan.reasoning,
        },
        act: {
          toolsUsed: executionResult.execution.toolsUsed,
          latencies: executionResult.execution.latencies,
          fallbackTriggered: executionResult.execution.fallbackTriggered,
        },
      };
    }

    return response;
  }
}
