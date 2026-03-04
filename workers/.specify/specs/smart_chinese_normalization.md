# BDD Spec: Smart Chinese Normalization with Auto-Learning

## Feature
As a system,
I want to automatically learn new simplified-traditional character mappings,
So that the conversion coverage grows without manual maintenance.

## Scenario 1: Initial Bootstrap
**Given** the system starts with 50 common character mappings
**When** a card with "软件开发" is processed
**Then** "件" should be converted using cache (known)
**And** "软", "开", "发" should trigger Gemini AI learning
**And** new mappings should be saved to D1
**And** memory cache should be updated

## Scenario 2: Auto-Learning Flow
**Given** unknown simplified characters ["软", "开", "发"]
**When** Gemini AI is called
**Then** it should return {"软": "軟", "开": "開", "发": "發"}
**And** mappings should be inserted into chinese_variants table
**And** VARIANTS_CACHE should be updated in-memory
**And** subsequent requests should use cached mappings

## Scenario 3: Idempotent Learning
**Given** a character "软" already exists in D1
**When** the same character is learned again
**Then** INSERT should use ON CONFLICT DO NOTHING
**And** no duplicate entries should be created

## Scenario 4: Performance Optimization
**Given** 1000 cards processed
**When** coverage reaches 95%
**Then** 95% of requests should hit memory cache (<0.1ms)
**And** only 5% should trigger Gemini AI (~200ms)
**And** learned mappings should persist across Worker restarts

## Technical Implementation

### Migration 0035: Chinese Variants Table
```sql
CREATE TABLE chinese_variants (
  simplified TEXT PRIMARY KEY,
  traditional TEXT NOT NULL,
  learned_at INTEGER NOT NULL,
  source TEXT DEFAULT 'bootstrap' -- 'bootstrap' | 'gemini'
);

CREATE INDEX idx_learned_at ON chinese_variants(learned_at DESC);
```

### Memory Cache Pattern
```typescript
let VARIANTS_CACHE: Record<string, string> | null = null;

async function ensureCacheLoaded(env: Env): Promise<void> {
  if (VARIANTS_CACHE) return;
  const { results } = await env.DB.prepare(
    "SELECT simplified, traditional FROM chinese_variants"
  ).all();
  VARIANTS_CACHE = Object.fromEntries(
    results.map(r => [r.simplified, r.traditional])
  );
}
```

### Gemini AI Learning
```typescript
async function learnNewChars(
  chars: string[], 
  env: Env
): Promise<Record<string, string>> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Convert these simplified Chinese characters to traditional: ${chars.join(', ')}. Return JSON: {"简":"繁",...}`
          }]
        }],
        generationConfig: {
          response_mime_type: 'application/json'
        }
      })
    }
  );
  
  const data = await response.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}
```

## Acceptance Criteria
1. ✅ Migration 0035 creates chinese_variants table
2. ✅ Bootstrap with 50 common characters
3. ✅ Memory cache loads on first request
4. ✅ Unknown chars trigger Gemini AI
5. ✅ Learned mappings saved to D1
6. ✅ Cache updated in-memory
7. ✅ Idempotent INSERT (ON CONFLICT)
8. ✅ Coverage grows automatically
9. ✅ Admin API shows learning stats
10. ✅ TypeScript: zero errors
