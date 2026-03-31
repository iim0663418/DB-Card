/**
 * Intent Analyzer for Agent Search (Phase 1)
 * Classifies user query into intent types and extracts entities via Gemini.
 */

import type { Env } from '../../../types';

export interface IntentAnalysisResult {
  intent: 'exact_match' | 'explore' | 'relationship' | 'invalid';
  entities: {
    person?: string;
    organization?: string;
    title?: string;
    location?: string;
  };
  confidence: number;
  cached: boolean;
  latency_ms: number;
  // For invalid intent
  reason?: 'negation_not_supported' | 'ambiguous' | 'empty';
  message?: string;
  suggested_queries?: string[];
}

const CACHE_TTL = 600; // 10 minutes
const TIMEOUT_MS = 2000;

const FALLBACK: Omit<IntentAnalysisResult, 'cached' | 'latency_ms'> = {
  intent: 'explore',
  entities: {},
  confidence: 0.5,
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: ['exact_match', 'explore', 'relationship', 'invalid'],
    },
    entities: {
      type: 'object',
      properties: {
        person: { type: 'string' },
        organization: { type: 'string' },
        title: { type: 'string' },
        location: { type: 'string' },
      },
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    reason: {
      type: 'string',
      enum: ['negation_not_supported', 'ambiguous', 'empty'],
    },
    message: {
      type: 'string',
    },
    suggested_queries: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['intent', 'entities', 'confidence'],
};

const PROMPT = `Classify search query intent and extract entities.

Intent Types:
- exact_match: Searching for a specific person by name
- relationship: Finding connections within a company/organization
- explore: Broad search by job title, location, or service type
- invalid: Query contains unsupported patterns (negations, ambiguous terms)

Entity Types:
- person: Full name of a specific individual
- organization: Exact company/organization name (not descriptions)
- title: Job title, role, or service type
- location: Geographic location (positive only)

Negation Handling:
If query contains negation words (非, 不是, 除了, 不在, etc.), return:
- intent: "invalid"
- reason: "negation_not_supported"
- message: "目前不支援否定條件（例如：非台北）"
- suggested_queries: [alternative positive queries based on context]

Examples:
Query: "吳勝繙"
{"intent": "exact_match", "entities": {"person": "吳勝繙"}, "confidence": 0.95}

Query: "數位發展部"
{"intent": "relationship", "entities": {"organization": "數位發展部"}, "confidence": 0.9}

Query: "數位發展部的同事"
{"intent": "relationship", "entities": {"organization": "數位發展部"}, "confidence": 0.9}

Query: "國家資通安全研究院的主任"
{"intent": "relationship", "entities": {"organization": "國家資通安全研究院", "title": "主任"}, "confidence": 0.85}

Query: "在台北的科長"
{"intent": "explore", "entities": {"title": "科長", "location": "台北"}, "confidence": 0.85}

Query: "非台北的廠商"
{"intent": "invalid", "entities": {}, "confidence": 0.0, "reason": "negation_not_supported", "message": "目前不支援否定條件（例如：非台北）", "suggested_queries": ["新北的廠商", "桃園的廠商", "台中的廠商"]}

Query: "資訊處共用系統科科長"
{"intent": "explore", "entities": {"title": "資訊處共用系統科科長"}, "confidence": 0.9}

Now classify this query:
Query: `;

async function sha256Hex(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function callGemini(
  query: string,
  model: string,
  apiKey: string
): Promise<Omit<IntentAnalysisResult, 'cached' | 'latency_ms'>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT + query }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: RESPONSE_SCHEMA,
            maxOutputTokens: 512,  // Increased for thinking tokens
            thinkingConfig: {
              thinkingLevel: 'MINIMAL'  // Minimal thinking for fast intent classification
            }
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini error: ${response.status}`);
    }

    const data = await response.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty Gemini response');

    const parsed = JSON.parse(text);
    return {
      intent: parsed.intent ?? FALLBACK.intent,
      entities: parsed.entities ?? {},
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : FALLBACK.confidence,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function analyzeIntent(
  query: string,
  userEmail: string,
  env: Env
): Promise<IntentAnalysisResult> {
  const start = Date.now();
  const normalized = normalizeQuery(query);

  // KV cache lookup
  let cacheKey: string | null = null;
  try {
    const hash = await sha256Hex(normalized);
    cacheKey = `intent_cache:${userEmail}:${hash}`;
    const cached = await env.KV.get(cacheKey, 'json') as Omit<IntentAnalysisResult, 'cached' | 'latency_ms'> | null;
    if (cached) {
      console.log(`[IntentAnalyzer] cache_hit key=${cacheKey}`);
      return {
        ...cached,
        cached: true,
        latency_ms: Date.now() - start,
      };
    }
  } catch (err) {
    console.warn('[IntentAnalyzer] KV lookup failed:', err instanceof Error ? err.message : String(err));
  }

  // Call Gemini
  try {
    const result = await callGemini(normalized, env.GEMINI_MODEL, env.GEMINI_API_KEY);
    const latency_ms = Date.now() - start;
    console.log(`[IntentAnalyzer] gemini intent=${result.intent} confidence=${result.confidence} latency=${latency_ms}ms`);

    // Store in cache (best-effort)
    if (cacheKey) {
      env.KV.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL }).catch(err => {
        console.warn('[IntentAnalyzer] KV put failed:', err instanceof Error ? err.message : String(err));
      });
    }

    return { ...result, cached: false, latency_ms };
  } catch (err) {
    const latency_ms = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    console.warn(
      `[IntentAnalyzer] ${isTimeout ? 'timeout' : 'error'} latency=${latency_ms}ms:`,
      err instanceof Error ? err.message : String(err)
    );
    return { ...FALLBACK, cached: false, latency_ms };
  }
}
