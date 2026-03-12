/**
 * Think Layer (Planner) - Intent analysis and SearchPlan generation
 * Phase 2: Reuses existing intent-analyzer, outputs structured plan
 */

import { Env } from '../../types';
import { analyzeIntent, IntentAnalysisResult } from '../../handlers/user/received-cards/intent-analyzer';
import type { SenseContext, SearchPlan } from './types';

export class Planner {
  constructor(private env: Env) {}

  async plan(context: SenseContext): Promise<SearchPlan> {
    if (!context.enableAgent || context.shadowMode) {
      // Shadow/baseline: default hybrid plan, no intent analysis
      return this.buildDefaultPlan('Shadow or baseline mode: using hybrid search');
    }

    try {
      const intentResult = await analyzeIntent(context.query, context.userEmail, this.env);
      const tools = selectTools(intentResult.intent, intentResult.confidence);
      return this.buildPlanFromIntent(intentResult, tools);
    } catch (err) {
      console.warn('[Planner] intent analysis failed, using default plan:', err instanceof Error ? err.message : String(err));
      return this.buildDefaultPlan('Intent analysis failed', true);
    }
  }

  private buildDefaultPlan(reasoning: string, fallback = false): SearchPlan {
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

  private buildPlanFromIntent(intentResult: IntentAnalysisResult, tools: string[]): SearchPlan {
    const goal = (intentResult.intent === 'invalid' ? 'explore' : intentResult.intent) as SearchPlan['goal'];

    const toolChain = tools.map(tool => ({
      tool: tool as 'semantic' | 'keyword' | 'hybrid',
      params: {},
      timeout: 5000,
    }));

    return {
      goal,
      toolChain,
      rankingProfile: {
        algorithm: tools.length > 1 ? 'rrf' : 'score',
        diversify: false,
      },
      reasoning: `Intent: ${intentResult.intent}, confidence: ${intentResult.confidence}`,
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
