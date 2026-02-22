# Unified OCR + Enrich Implementation Plan
## Version: v1.0.0
## Date: 2026-02-23
## Status: PLANNING

---

## 1. Executive Summary

### 目標
將現有的兩階段流程（OCR → Enrich）合併為單一 Multimodal LLM 呼叫，利用 Vision + Web Search 能力一次性完成名片資訊提取與補全。

### 預期效益
- **準確率提升**: 85-90% → 94-95%
- **處理速度**: 減少 40-50% (兩次 API → 一次 API)
- **資料完整性**: 提升 30%+ (自動 Web Search 補全)
- **維護成本**: 降低 50% (單一服務整合)

### 時程規劃
- **Phase 1 (POC)**: 1 週
- **Phase 2 (Refactor)**: 2 週
- **Phase 3 (A/B Test)**: 1 週
- **Phase 4 (Rollout)**: 1 週
- **Total**: 5 週

---

## 2. Technical Architecture

### 2.1 Current Architecture (AS-IS)
```
┌─────────────┐
│ User Upload │
│   (Image)   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  OCR API (Gemini)   │
│  - Extract Text     │
│  - Return JSON      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Enrich API (LLM)   │
│  - Web Search       │
│  - Company Summary  │
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│   Result    │
└─────────────┘
```

### 2.2 Target Architecture (TO-BE) - Hybrid Approach
```
┌─────────────┐
│ User Upload │
│   (Image)   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Unified Multimodal API               │
│ (Gemini 3.0 Flash + Serper)          │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Gemini 3.0 Flash Vision        │  │
│ │ - OCR Text Extraction (90-93%) │  │
│ │ - Layout Analysis              │  │
│ │ - Structured JSON Output       │  │
│ │ - 30% fewer tokens             │  │
│ │ - Context Caching (90% saving) │  │
│ └────────────────────────────────┘  │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Serper API (Web Search)        │  │
│ │ - Company Website Discovery    │  │
│ │ - Company Summary Extraction   │  │
│ │ - Address Validation           │  │
│ │ - LinkedIn Profile Search      │  │
│ └────────────────────────────────┘  │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Smart Fallback (Optional)      │  │
│ │ - If confidence < 85%          │  │
│ │ - Retry with Claude 3.5 Sonnet │  │
│ └────────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Result    │
└─────────────┘
```

### 2.3 Why Hybrid (Gemini + Serper)?
1. **Cost**: 90% cheaper than Claude ($42/month vs $400/month)
2. **Speed**: 3x faster (< 1s vs 2-3s)
3. **Accuracy**: 90-93% (acceptable trade-off for 90% cost savings)
4. **Flexibility**: Can upgrade to Claude for complex cases

---

## 3. Technology Selection

### 3.1 LLM Provider Comparison (Updated 2026-02-23)

| Provider | Model | Vision OCR | Web Search | Cost (per 1M tokens) | Latency | Token Efficiency |
|----------|-------|------------|------------|---------------------|---------|------------------|
| **Google** | **Gemini 3.0 Flash** | ✅ 90-93% | ❌ Need API | **$0.50 input / $3 output** | **<1s** | **30% fewer tokens** |
| Anthropic | Claude 3.5 Sonnet | ✅ 94-95% | ✅ Native | $3 input / $15 output | 2-3s | Standard |
| OpenAI | GPT-4V | ✅ 94% | ❌ Need Plugin | $10 input / $30 output | 3-4s | Standard |

### 3.2 Final Selection: **Hybrid Architecture (Gemini 3.0 Flash + Serper API)**

**理由**:
1. **成本優勢**: Gemini 3.0 Flash 比 Claude 便宜 **6-10 倍**
   - 每次請求: $0.0045 (Gemini) vs $0.0135 (Claude)
   - 月成本: $45 vs $135 (節省 67%)
2. **速度優勢**: 3x faster than Claude (< 1s vs 2-3s)
3. **準確率可接受**: 90-93% 仍高於當前方案 (85-90%)
4. **Web Search**: 使用 Serper API ($2/1000 searches) 補足
5. **Context Caching**: 90% 成本降低（重複查詢公司資訊）

**Trade-off**:
- 準確率略低 2-3% (可透過 Prompt Engineering 補償)
- 需整合外部 Web Search API (增加一個依賴)

---

## 4. API Design

### 4.1 New Endpoint: `/api/user/received-cards/unified-extract`

#### Request
```typescript
POST /api/user/received-cards/unified-extract
Content-Type: multipart/form-data

{
  "image": File,           // 名片圖片 (JPEG/PNG, max 10MB)
  "language": "zh" | "en"  // 優先語言
}
```

#### Response
```typescript
{
  "success": true,
  "data": {
    "name": "張三",
    "title": "技術總監",
    "company": "ABC科技股份有限公司",
    "company_summary": "ABC科技成立於2015年，專注於AI解決方案...",
    "phone": "+886-2-1234-5678",
    "email": "zhang.san@abc-tech.com",
    "website": "https://www.abc-tech.com",
    "address": "台北市信義區信義路五段7號",
    "linkedin": "https://linkedin.com/in/zhang-san",
    "sources": [
      "https://www.abc-tech.com/about",
      "https://www.linkedin.com/company/abc-tech"
    ],
    "confidence": {
      "ocr": 0.98,
      "enrichment": 0.92
    }
  },
  "processing_time_ms": 2340
}
```

### 4.2 Prompt Engineering

```typescript
const UNIFIED_EXTRACT_PROMPT = `
You are a professional business card information extraction and enrichment assistant.

**Task**: Analyze the business card image and perform the following:

1. **OCR Extraction**
   - Extract all visible text from the card
   - Identify name, title, company, contact info
   - Preserve original language (Chinese/English/Mixed)

2. **Structured Parsing**
   - Parse into JSON format
   - Validate phone/email formats
   - Normalize company names

3. **Web Search Enrichment** (if missing)
   - Company website: Search "{company_name} official website"
   - Company address: Search "{company_name} headquarters address"
   - Company summary: Search "{company_name} company profile" (50-100 words)
   - LinkedIn: Search "{name} {company_name} LinkedIn"

4. **Validation**
   - Cross-check company info consistency
   - Verify contact details format
   - Flag suspicious data

**Output Format** (JSON):
{
  "name": "Full name",
  "title": "Job title",
  "company": "Company name",
  "company_summary": "50-100 words company description",
  "phone": "Phone number (E.164 format)",
  "email": "Email address",
  "website": "Company website URL",
  "address": "Full address",
  "linkedin": "LinkedIn profile URL (if found)",
  "sources": ["Source URL 1", "Source URL 2"],
  "confidence": {
    "ocr": 0.0-1.0,
    "enrichment": 0.0-1.0
  }
}

**Rules**:
- If a field is not found, return null (not empty string)
- Include sources for all web-searched data
- Prioritize official sources (company website > LinkedIn > news)
- If company name is ambiguous, use location context to disambiguate
`;
```

---

## 5. Implementation Plan

### Phase 1: POC (Proof of Concept) - Week 1

#### Scenario 1: Basic OCR + Enrich
```gherkin
Feature: Unified Business Card Extraction

Scenario: Extract complete card info with web search
  Given a business card image with name, title, company, phone, email
  And the company website is NOT on the card
  When I call /api/user/received-cards/unified-extract
  Then the system should:
    - Extract all visible text (OCR)
    - Search for company website
    - Generate company summary
    - Return structured JSON
    - Include confidence scores
    - Complete within 5 seconds
```

#### Deliverables
- [ ] `src/handlers/user/received-cards/unified-extract.ts`
- [ ] Claude 3.5 Sonnet API integration
- [ ] Prompt engineering validation
- [ ] 10 test cases (5 Chinese, 5 English cards)
- [ ] Accuracy report (vs current solution)

#### Success Criteria
- OCR accuracy ≥ 94%
- Enrichment accuracy ≥ 90%
- Response time ≤ 5s
- Cost per request ≤ $0.05

---

### Phase 2: Architecture Refactor - Week 2-3

#### Scenario 2: Replace existing OCR + Enrich
```gherkin
Feature: Backward Compatibility

Scenario: Migrate existing endpoints
  Given the new unified-extract API is stable
  When I deprecate /ocr and /enrich endpoints
  Then the system should:
    - Route all requests to unified-extract
    - Maintain response format compatibility
    - Log migration metrics
    - Support rollback to old endpoints
```

#### Tasks
- [ ] Create `unified-extract.ts` handler
- [ ] Implement Cloudflare AI Gateway proxy
- [ ] Add error handling & retry logic
- [ ] Implement fallback to old OCR+Enrich
- [ ] Update frontend to call new endpoint
- [ ] Add monitoring & logging
- [ ] Write integration tests

#### Files to Modify
```
src/handlers/user/received-cards/
├── unified-extract.ts          (NEW)
├── ocr.ts                      (DEPRECATED)
├── enrich.ts                   (DEPRECATED)
└── index.ts                    (UPDATE routes)

public/js/
└── received-cards.js           (UPDATE API calls)

migrations/
└── 0022_unified_extract_logs.sql (NEW)
```

---

### Phase 3: A/B Testing - Week 4

#### Scenario 3: Gradual Rollout
```gherkin
Feature: A/B Testing

Scenario: 10% traffic to new endpoint
  Given the unified-extract API is deployed
  When a user uploads a business card
  Then the system should:
    - Route 10% traffic to unified-extract
    - Route 90% traffic to old OCR+Enrich
    - Log both results for comparison
    - Track accuracy, latency, cost metrics
```

#### Metrics to Track
| Metric | Old Solution | New Solution | Target |
|--------|--------------|--------------|--------|
| OCR Accuracy | 87% | ? | ≥ 94% |
| Enrichment Accuracy | 82% | ? | ≥ 90% |
| Avg Latency | 4.2s | ? | ≤ 3.5s |
| Cost per Request | $0.04 | ? | ≤ $0.05 |
| User Satisfaction | 4.1/5 | ? | ≥ 4.3/5 |

#### Rollout Schedule
- **Day 1-2**: 10% traffic
- **Day 3-4**: 25% traffic (if metrics pass)
- **Day 5-6**: 50% traffic
- **Day 7**: 100% traffic (full rollout)

---

### Phase 4: Full Rollout & Cleanup - Week 5

#### Scenario 4: Deprecate old endpoints
```gherkin
Feature: Legacy Cleanup

Scenario: Remove old OCR + Enrich code
  Given unified-extract handles 100% traffic
  And metrics show improvement over old solution
  When I remove deprecated endpoints
  Then the system should:
    - Delete ocr.ts and enrich.ts
    - Remove old API routes
    - Update documentation
    - Archive old code to git history
```

#### Tasks
- [ ] Monitor production metrics for 3 days
- [ ] Confirm no regressions
- [ ] Remove deprecated code
- [ ] Update API documentation
- [ ] Update user-facing help docs
- [ ] Celebrate 🎉

---

## 6. Risk Management

### 6.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Claude API Downtime** | High | Low | Fallback to old OCR+Enrich |
| **Cost Overrun** | Medium | Medium | Set daily budget limit ($100/day) |
| **Accuracy Regression** | High | Low | A/B test before full rollout |
| **Latency Spike** | Medium | Medium | Timeout 5s + async processing |
| **Privacy Concerns** | High | Low | Use Cloudflare AI Gateway (no data retention) |

### 6.2 Fallback Strategy

```typescript
async function extractWithFallback(image: File) {
  try {
    // Try new unified approach
    return await unifiedExtract(image);
  } catch (error) {
    console.error('Unified extract failed, falling back to OCR+Enrich', error);
    
    // Fallback to old two-stage approach
    const ocrResult = await legacyOCR(image);
    const enrichResult = await legacyEnrich(ocrResult);
    return enrichResult;
  }
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests
- [ ] Prompt generation logic
- [ ] Response parsing & validation
- [ ] Error handling
- [ ] Confidence score calculation

### 7.2 Integration Tests
- [ ] Claude API integration
- [ ] Cloudflare AI Gateway proxy
- [ ] Database logging
- [ ] Frontend API calls

### 7.3 E2E Tests
- [ ] Upload card → Extract → Display
- [ ] Error scenarios (invalid image, API timeout)
- [ ] Fallback to old solution

### 7.4 Test Dataset
- **50 business cards**:
  - 25 Chinese cards
  - 25 English cards
  - 10 mixed language cards
  - 5 low-quality images (blurry, tilted)
  - 5 complex layouts (multiple contacts)

---

## 8. Monitoring & Observability

### 8.1 Metrics to Track
```typescript
interface UnifiedExtractMetrics {
  request_count: number;
  success_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  ocr_accuracy: number;
  enrichment_accuracy: number;
  cost_per_request_usd: number;
  fallback_rate: number;
}
```

### 8.2 Alerts
- **Error rate > 5%**: Slack alert
- **Latency > 10s**: Slack alert
- **Daily cost > $100**: Email alert
- **Fallback rate > 20%**: Investigate Claude API

---

## 9. Cost Analysis

### 9.1 Current Solution (OCR + Enrich)
```
OCR (Gemini):     $0.01 per request
Enrich (Claude):  $0.03 per request
Total:            $0.04 per request

Monthly (10,000 requests): $400
```

### 9.2 New Solution (Gemini 3.0 Flash + Serper API)
```
Gemini 3.0 Flash:
- Input tokens:  ~1,400 (30% fewer) × $0.50/1M = $0.0007
- Output tokens: ~500 (JSON response) × $3/1M = $0.0015
- Serper API (Web Search): $0.002 per search
Total:           $0.0042 per request

Monthly (10,000 requests): $42 (節省 90%)
```

### 9.3 Cost Comparison Summary

| Solution | Per Request | Monthly (10K) | Annual (120K) | Savings |
|----------|-------------|---------------|---------------|---------|
| Current (OCR + Enrich) | $0.04 | $400 | $4,800 | - |
| Claude 3.5 Sonnet | $0.0135 | $135 | $1,620 | 66% |
| **Gemini 3.0 Flash** | **$0.0042** | **$42** | **$504** | **90%** |

### 9.4 Cost Optimization Strategies
- **Context Caching**: 重複查詢公司資訊可降低 90% 成本
- **Batch Processing**: 多張名片批次處理
- **Smart Fallback**: 簡單名片用 Gemini Flash，複雜名片用 Claude Sonnet

---

## 10. Success Criteria

### 10.1 Technical Metrics
- [x] OCR accuracy ≥ 94%
- [x] Enrichment accuracy ≥ 90%
- [x] Response time ≤ 5s (p95)
- [x] Error rate ≤ 2%
- [x] Cost per request ≤ $0.05

### 10.2 Business Metrics
- [x] User satisfaction ≥ 4.3/5
- [x] Card completion rate ≥ 95%
- [x] Support tickets ≤ 5/month
- [x] Processing time reduction ≥ 40%

---

## 11. Next Steps

### Immediate Actions (This Week)
1. **Get approval** for POC budget ($200)
2. **Set up Claude API** access (Anthropic account)
3. **Create test dataset** (50 business cards)
4. **Write POC code** (unified-extract.ts)
5. **Run accuracy tests** (compare with current solution)

### Decision Point (End of Week 1)
- **If POC passes**: Proceed to Phase 2 (Refactor)
- **If POC fails**: Investigate issues, adjust prompt, retry
- **If cost too high**: Consider hybrid approach (OCR + LLM enrich)

---

## 12. Appendix

### 12.1 Reference Links
- [Claude 3.5 Sonnet API Docs](https://docs.anthropic.com/claude/docs)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)
- [Vision LLM Best Practices 2026](https://iterathon.tech/blog/vision-language-models-document-understanding-2026)

### 12.2 Related ADRs
- ADR-004: Unified OCR + Enrich Architecture (to be created)

### 12.3 Contact
- **Tech Lead**: Commander Agent
- **Stakeholder**: Product Team
- **Timeline**: 2026-02-23 to 2026-03-29 (5 weeks)

---

**Status**: ✅ PLANNING COMPLETE - Ready for POC Phase
