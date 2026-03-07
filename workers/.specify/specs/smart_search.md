# BDD Spec: Smart Search API

## Feature: Semantic Search for Received Cards
**As a** user with multiple business cards  
**I want to** search cards using natural language queries  
**So that** I can quickly find relevant contacts by industry, role, or expertise

---

## Scenario 1: Basic Keyword Search (D1 Fallback)
**Given** user has 10 cards in database  
**And** FileSearchStore is unavailable  
**When** user queries `GET /api/user/received-cards/search?q=會計師`  
**Then** system performs SQL LIKE search on:
  - `full_name`
  - `organization`
  - `title`
  - `company_summary`
**And** returns matching cards with `match_reason: "keyword"`  
**And** response includes `score: 0.5` (default for keyword match)

---

## Scenario 2: Semantic Search (FileSearchStore)
**Given** user has 10 cards with FileSearchStore documents  
**And** FileSearchStore contains company knowledge  
**When** user queries `GET /api/user/received-cards/search?q=稅務專家`  
**Then** system queries FileSearchStore with:
  - `query: "稅務專家 會計 審計"`
  - `filter: { user_email: "user@example.com" }`
  - `topK: 20`
**And** returns cards sorted by relevance score (0.0-1.0)  
**And** response includes `match_reason: "semantic: 稅務諮詢專長"`

---

## Scenario 3: Multi-Tenant Isolation
**Given** user A has card "EY 陳志明"  
**And** user B has card "Deloitte 王小明"  
**When** user A queries `q=會計師`  
**Then** response only includes user A's cards  
**And** user B's cards are NOT visible

---

## Scenario 4: Pagination
**Given** search returns 50 matching cards  
**When** user queries `?q=會計師&page=1&limit=10`  
**Then** response includes:
  - `results: [10 cards]`
  - `total: 50`
  - `page: 1`
  - `limit: 10`
  - `hasMore: true`

---

## Scenario 5: Empty Results
**Given** user has no matching cards  
**When** user queries `q=律師`  
**Then** response returns:
  - `results: []`
  - `total: 0`
  - `message: "No cards found"`

---

## Technical Requirements

### API Endpoint
```
GET /api/user/received-cards/search
```

### Query Parameters
- `q` (required): Search query string
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Results per page

### Response Schema
```typescript
{
  results: Array<{
    uuid: string;
    full_name: string;
    organization: string;
    title: string;
    email: string;
    phone: string;
    score: number;           // 0.0-1.0
    match_reason: string;    // "keyword" | "semantic: {context}"
  }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

### Multi-Tenant Filter
- All queries MUST include `user_email` filter
- FileSearchStore metadata: `{ user_email: string }`
- D1 query: `WHERE user_email = ? AND deleted_at IS NULL`

### Error Handling
- FileSearchStore timeout (>2s): Fallback to D1 keyword search
- FileSearchStore error: Log + fallback to D1
- Invalid query: HTTP 400 with error message

### Performance Targets
- P50 latency: <500ms (keyword search)
- P95 latency: <2s (semantic search)
- Timeout: 3s (fail-open to keyword search)

---

## Acceptance Criteria
1. ✅ Multi-tenant isolation enforced
2. ✅ Keyword search works without FileSearchStore
3. ✅ Semantic search returns relevant results
4. ✅ Pagination works correctly
5. ✅ Response includes score + match_reason
6. ✅ Error handling with graceful degradation
7. ✅ TypeScript zero errors
8. ✅ Manual test: "會計師" finds EY/Deloitte cards
