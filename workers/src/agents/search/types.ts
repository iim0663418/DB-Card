/**
 * Agent Search Types
 */

export interface SearchRequest {
  query: string;
  userEmail: string;
  pagination: {
    page: number;
    limit: number;
  };
}

export interface SearchResult {
  uuid: string;
  full_name: string;
  organization: string;
  title: string;
  email: string;
  phone: string;
  thumbnail_url?: string;
  score: number;
  match_reason: string;
  // Enrichment data
  related_contacts?: number;
  tags?: Array<{ category: string; raw: string; normalized: string }>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  meta?: {
    // Phase 1 fields (preserved)
    intent?: string;
    confidence?: number;
    tools?: string[];
    cached?: boolean;
    latency_ms?: number;
    fallback?: boolean;
    // Phase 2 layer details (populated when ENABLE_AGENT_META=true)
    sense?: {
      queryType: string;
      normalizedQuery: string;
    };
    think?: {
      goal: string;
      reasoning: string;
    };
    act?: {
      toolsUsed: string[];
      latencies: Record<string, number>;
      fallbackTriggered: boolean;
    };
  };
}

// Phase 2: Four-layer architecture types

export interface SenseContext {
  query: string;
  normalizedQuery: string;
  queryType: 'person' | 'company' | 'mixed' | 'unknown';
  userEmail: string;
  budget: {
    maxLatency: number;
    maxApiCalls: number;
    retrievalLimit: number;  // Phase 0 fix preserved
  };
  timestamp: number;
  // Mode flags (from Env)
  shadowMode: boolean;
  enableAgent: boolean;
  enableMeta: boolean;
}

export interface SearchPlan {
  goal: 'exact_match' | 'explore' | 'relationship';
  toolChain: Array<{
    tool: 'semantic' | 'keyword' | 'hybrid';
    params: Record<string, unknown>;
    timeout: number;
  }>;
  rankingProfile: {
    algorithm: 'rrf' | 'score' | 'recency';
    diversify: boolean;
  };
  reasoning: string;  // Explainability
  // Intent analysis results (for meta + metrics)
  intent?: string;
  confidence?: number;
  tools?: string[];
  cached?: boolean;
  intentLatency?: number;
  fallback?: boolean;
}

export interface ExecutionResult {
  results: SearchResult[];
  execution: {
    toolsUsed: string[];
    latencies: Record<string, number>;
    fallbackTriggered: boolean;
  };
}
