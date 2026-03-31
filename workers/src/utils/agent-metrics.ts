/**
 * Agent Search Metrics (Phase 4)
 * Non-blocking telemetry for intent analysis observability.
 * Raw queries are never stored — only SHA256(normalized_query).
 */

import type { Env } from '../types';

export interface AgentMetrics {
  timestamp: number;
  query_hash: string;
  intent: string;
  confidence: number;
  tools_used: string[];
  result_count: number;
  latency_ms: number;
  fallback_used: boolean;
  ai_timeout: boolean;
}

export async function sha256Hex(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function logAgentMetrics(
  env: Env,
  metrics: AgentMetrics
): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(`
    INSERT INTO agent_search_metrics
      (timestamp, query_hash, intent, confidence, tools_used,
       result_count, latency_ms, fallback_used, ai_timeout, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    metrics.timestamp,
    metrics.query_hash,
    metrics.intent,
    metrics.confidence,
    JSON.stringify(metrics.tools_used),
    metrics.result_count,
    metrics.latency_ms,
    metrics.fallback_used ? 1 : 0,
    metrics.ai_timeout ? 1 : 0,
    now
  ).run();
}
