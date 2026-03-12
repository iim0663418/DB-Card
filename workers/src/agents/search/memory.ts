/**
 * Remember Layer - Event-sourced, non-blocking query logging
 * Phase 2: Privacy-first (query hash), ctx.waitUntil for non-blocking
 *
 * Writes to query_events table for future personalization/analytics.
 * Also handles shadow-mode non-blocking intent analysis + agent_search_metrics.
 */

import type { Env } from '../../types';
import { analyzeIntent } from '../../handlers/user/received-cards/intent-analyzer';
import { logAgentMetrics, sha256Hex } from '../../utils/agent-metrics';
import { selectTools } from './planner';
import type { SenseContext, SearchPlan, ExecutionResult } from './types';

export class MemoryLayer {
  constructor(
    private env: Env,
    private ctx?: ExecutionContext,
  ) {}

  /**
   * Non-blocking: fire-and-forget event recording.
   * Dispatched via ctx.waitUntil so it never blocks the response.
   */
  record(context: SenseContext, plan: SearchPlan, result: ExecutionResult): void {
    const task = this.runRecord(context, plan, result).catch(err =>
      console.warn('[Memory] record failed:', err instanceof Error ? err.message : String(err)),
    );

    const effectiveCtx = this.ctx ?? this.env.ctx;
    if (effectiveCtx) {
      effectiveCtx.waitUntil(task);
    }
    // If no ctx, the promise is still in-flight but fire-and-forget
  }

  private async runRecord(
    context: SenseContext,
    plan: SearchPlan,
    result: ExecutionResult,
  ): Promise<void> {
    const { shadowMode, enableAgent } = context;

    if (shadowMode) {
      // Shadow mode: run intent analysis non-blocking, log to agent_search_metrics
      await this.recordShadow(context, result);
    } else if (enableAgent) {
      // Agent mode: log to agent_search_metrics (uses plan's intent data)
      await this.recordAgentMetrics(context, plan, result);
    }

    // Always write to query_events (event-sourced log)
    await this.writeQueryEvent(context, plan, result);
  }

  private async recordShadow(context: SenseContext, result: ExecutionResult): Promise<void> {
    try {
      const intentResult = await analyzeIntent(context.query, context.userEmail, this.env);

      console.log('[Shadow] intent analysis:', JSON.stringify({
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        cached: intentResult.cached,
        latency_ms: intentResult.latency_ms,
      }));

      const hash = await sha256Hex(context.query.trim().toLowerCase().replace(/\s+/g, ' '));
      await logAgentMetrics(this.env, {
        timestamp: context.timestamp,
        query_hash: hash,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        tools_used: selectTools(intentResult.intent, intentResult.confidence),
        result_count: result.results.length,
        latency_ms: intentResult.latency_ms,
        fallback_used: false,
        ai_timeout: intentResult.latency_ms > 2000,
      });
    } catch (err) {
      console.warn('[Shadow] failed:', err instanceof Error ? err.message : String(err));
    }
  }

  private async recordAgentMetrics(
    context: SenseContext,
    plan: SearchPlan,
    result: ExecutionResult,
  ): Promise<void> {
    try {
      const hash = await sha256Hex(context.query.trim().toLowerCase().replace(/\s+/g, ' '));
      const latency_ms = Object.values(result.execution.latencies).reduce((a, b) => a + b, 0);

      await logAgentMetrics(this.env, {
        timestamp: context.timestamp,
        query_hash: hash,
        intent: plan.intent ?? 'explore',
        confidence: plan.confidence ?? 0.5,
        tools_used: result.execution.toolsUsed,
        result_count: result.results.length,
        latency_ms,
        fallback_used: result.execution.fallbackTriggered,
        ai_timeout: (plan.intentLatency ?? 0) > 2000,
      });
    } catch (err) {
      console.warn('[Memory] agent metrics write failed:', err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Write to query_events table (event-sourced, privacy-first).
   * Raw query is never stored — only SHA-256(normalized_query).
   */
  private async writeQueryEvent(
    context: SenseContext,
    plan: SearchPlan,
    result: ExecutionResult,
  ): Promise<void> {
    try {
      const queryNormalized = context.query.trim().toLowerCase().replace(/\s+/g, ' ');
      const queryHash = await sha256Hex(queryNormalized);
      const eventId = `${context.timestamp}-${Math.random().toString(36).slice(2, 9)}`;
      const latency_ms = Object.values(result.execution.latencies).reduce((a, b) => a + b, 0);

      await this.env.DB.prepare(`
        INSERT INTO query_events
          (event_id, user_email, query_hash, normalized_query, query_type,
           plan_goal, tools_used, result_count, latency_ms, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        eventId,
        context.userEmail,
        queryHash,
        context.normalizedQuery,
        context.queryType,
        plan.goal,
        JSON.stringify(result.execution.toolsUsed),
        result.results.length,
        latency_ms,
        context.timestamp,
      ).run();
    } catch (err) {
      // query_events table may not exist yet — non-fatal
      console.warn('[Memory] query_events write failed:', err instanceof Error ? err.message : String(err));
    }
  }
}
