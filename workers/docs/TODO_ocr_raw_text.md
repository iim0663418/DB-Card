# TODO: ocr_raw_text Field

## Current Status (2026-02-24)
- **Database**: Field exists in `received_cards` table
- **Populated by**: Legacy OCR flow only (6/15 records)
- **Not populated by**: Unified-extract flow (current default)

## Reason
Gemini Structured Output API doesn't return raw OCR text alongside structured JSON.

## Future Use Cases

### 1. Full-Text Search (Priority: Medium)
- Enable searching across all OCR text
- Use SQLite FTS5 for efficient full-text indexing
- Example: Search "台北市" to find all cards with that address

### 2. OCR Accuracy Validation (Priority: Low)
- Compare structured output with raw OCR text
- Identify extraction errors or missed fields
- Useful for model fine-tuning

### 3. Audit Trail (Priority: Low)
- Keep original OCR output for compliance
- Verify data integrity over time
- Support dispute resolution

## Implementation Options

### Option A: Add separate OCR call (Cost: +$0.001/card)
```typescript
// 1. Call Gemini Vision for raw OCR
const rawText = await performBasicOCR(imageBase64);

// 2. Call Gemini with Structured Output
const structuredData = await performUnifiedExtract(imageBase64);

// 3. Combine results
return { ...structuredData, ocr_raw_text: rawText };
```

### Option B: Use Gemini's text field (Free, but unreliable)
```typescript
// Gemini returns both text and structured output
const response = await geminiAPI.generateContent({
  contents: [...],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {...}
  }
});

// response.text might contain raw OCR before JSON
const rawText = extractRawTextFromResponse(response);
```

### Option C: Keep as-is (Recommended for now)
- Field remains NULL for new cards
- No additional cost
- Re-evaluate when use case becomes critical

## Decision Log
- **2026-02-24**: Keep field but don't populate (backward compatibility)
- **Next Review**: 2026-Q2 (after 1000+ cards collected)

## Related Files
- `src/handlers/user/received-cards/unified-extract.ts`
- `src/handlers/user/received-cards/crud.ts`
- `migrations/0024_received_cards.sql`
