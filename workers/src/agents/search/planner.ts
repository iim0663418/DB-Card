/**
 * Think Layer (Planner) - Intent analysis and SearchPlan generation
 * Phase 2: Reuses existing intent-analyzer, outputs structured plan
 * Phase 3.0.5b: Apply realtime hints (conservative)
 */

import { Env } from '../../types';
import { analyzeIntent, IntentAnalysisResult } from '../../handlers/user/received-cards/intent-analyzer';
import type { SenseContext, SearchPlan, RealtimeHints } from './types';

export class Planner {
  constructor(private env: Env) {}

  async plan(context: SenseContext): Promise<SearchPlan> {
    if (!context.enableAgent || context.shadowMode) {
      // Shadow/baseline: default hybrid plan, no intent analysis
      return this.buildDefaultPlan('Shadow or baseline mode: using hybrid search', context);
    }

    try {
      const intentResult = await analyzeIntent(context.query, context.userEmail, this.env);
      let tools = selectTools(intentResult.intent, intentResult.confidence);
      
      // Phase 3.0.5b: Apply realtime hints (conservative)
      tools = this.applyRealtimeHints(tools, intentResult.intent, context.realtimeHints);
      
      return this.buildPlanFromIntent(intentResult, tools, context);
    } catch (err) {
      console.warn('[Planner] intent analysis failed, using default plan:', err instanceof Error ? err.message : String(err));
      return this.buildDefaultPlan('Intent analysis failed', context, true);
    }
  }

  /**
   * Apply realtime hints to tool selection (conservative).
   * - Respects exact_match (no override)
   * - Only applies to explore/low confidence
   */
  private applyRealtimeHints(
    baseTools: string[],
    intent: string,
    hints: RealtimeHints | null
  ): string[] {
    if (!hints) return baseTools;

    // Hint 1: Force hybrid for diverse users (only if not exact_match)
    if (hints.forceHybrid && intent !== 'exact_match') {
      return ['semantic', 'keyword'];
    }

    return baseTools;
  }

  private buildDefaultPlan(reasoning: string, context: SenseContext, fallback = false): SearchPlan {
    return {
      goal: 'explore',
      toolChain: [{ tool: 'hybrid', params: {}, timeout: 5000 }],
      rankingProfile: { algorithm: 'rrf', diversify: false },
      reasoning,
      intent: 'explore',
      confidence: 0.5,
      tools: ['semantic', 'keyword'],
      cached: false,
      intentLatency: 0,
      fallback,
    };
  }

  private buildPlanFromIntent(
    intentResult: IntentAnalysisResult,
    tools: string[],
    context: SenseContext
  ): SearchPlan {
    const goal = (intentResult.intent === 'invalid' ? 'explore' : intentResult.intent) as SearchPlan['goal'];

    const toolChain = tools.map(tool => ({
      tool: tool as 'semantic' | 'keyword' | 'hybrid',
      params: {},
      timeout: 5000,
    }));

    // Apply retrievalLimitMultiplier hint
    const hints = context.realtimeHints;
    const adjustedRetrievalLimit = hints?.retrievalLimitMultiplier
      ? Math.floor(context.budget.retrievalLimit * hints.retrievalLimitMultiplier)
      : context.budget.retrievalLimit;

    return {
      goal,
      toolChain,
      rankingProfile: {
        algorithm: tools.length > 1 ? 'rrf' : 'score',
        diversify: false,
      },
      reasoning: hints
        ? `Intent: ${intentResult.intent}, confidence: ${intentResult.confidence}, hints: ${JSON.stringify(hints)}`
        : `Intent: ${intentResult.intent}, confidence: ${intentResult.confidence}`,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      tools,
      cached: intentResult.cached,
      intentLatency: intentResult.latency_ms,
      fallback: false,
    };
  }
}

/**
 * Tool selection logic (exported for reuse in shadow mode metrics)
 */
export function selectTools(intent: string, confidence: number): string[] {
  if (confidence < 0.7) {
    return ['semantic', 'keyword'];
  }

  const toolMap: Record<string, string[]> = {
    exact_match: ['keyword'],
    explore: ['semantic', 'keyword'],
    relationship: ['keyword', 'semantic'],
  };

  return toolMap[intent] || ['semantic', 'keyword'];
}
