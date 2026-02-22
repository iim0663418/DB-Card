# Unified Extract: OCR + Enrich in One Call

## Goal
合併 `ocr.ts` 和 `enrich.ts` 的 prompt，用 Gemini 3.0 Flash Vision + Google Search 一次完成。

## BDD Spec

```gherkin
Scenario: 上傳名片一次取得完整資訊
  Given 用戶上傳名片圖片
  When 呼叫 /api/user/received-cards/unified-extract
  Then 系統應該：
    - 辨識名片文字（OCR）
    - 搜尋公司資訊（Web Search）
    - 回傳完整結構化資料
    - 包含資料來源
```

## Implementation

### 1. Merged Prompt
```typescript
const UNIFIED_PROMPT = `你是專業的名片辨識與資訊補全系統。

**任務 1：OCR 辨識**（依照 vCard RFC 6350 標準）
- name_prefix, full_name, first_name, last_name, name_suffix
- organization, organization_en, department, title
- phone, email, website, address

**任務 2：公司資訊補全**（使用 Google Search）
- company_summary（100-200字：產業、業務、規模）
- organization_full（工商登記全稱）
- organization_alias（常用簡稱）
- 補全 website, address（若名片上沒有）

回傳純 JSON：
{
  // OCR 欄位
  "name_prefix": "...",
  "full_name": "...",
  // ... 其他 OCR 欄位
  
  // Enrich 欄位
  "company_summary": "...",
  "organization_full": "...",
  "organization_alias": "...",
  "sources": [{"uri": "...", "title": "..."}]
}

規則：
- 無法辨識填 null
- 優先使用官方來源
- 不包含個人隱私`;
```

### 2. API Call
```typescript
// Gemini 3.0 Flash with Vision + Google Search
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: UNIFIED_PROMPT },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ]
      }],
      tools: [{ googleSearch: {} }]  // Enable web search
    })
  }
);
```

### 3. Files to Create/Modify
- `src/handlers/user/received-cards/unified-extract.ts` (NEW)
- `src/handlers/user/received-cards/index.ts` (ADD route)

## Success Criteria
- ✅ 一次 API 呼叫完成 OCR + Enrich
- ✅ 回傳格式與現有相容
- ✅ 成本 < $0.01 per request
- ✅ 延遲 < 3s
