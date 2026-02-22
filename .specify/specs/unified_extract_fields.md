# Unified Extract - 完整欄位規格

## 確認畫面欄位對應

### OCR 欄位（從名片圖片辨識）
```typescript
interface OCRFields {
  name_prefix: string | null;      // 稱謂（Dr./Prof./Mr./Mrs./Ms.）
  full_name: string;                // 姓名 * (必填)
  name_suffix: string | null;       // 後綴（Ph.D./Jr./Sr./M.D.）
  organization: string;             // 公司 * (必填)
  organization_en: string | null;   // 公司英文名稱
  department: string | null;        // 部門
  title: string | null;             // 職稱
  phone: string | null;             // 電話
  email: string | null;             // Email
  website: string | null;           // 網站
  address: string | null;           // 地址
}
```

### Enrich 欄位（從 Web Search 補全）
```typescript
interface EnrichFields {
  company_summary: string | null;      // 公司摘要（100-200字）
  organization_alias: string | null;   // 公司簡稱/品牌名
  organization_full: string | null;    // 公司完整正式名稱（工商登記）
  // 補全 OCR 缺失的欄位
  website: string | null;              // 若名片上沒有，從官網補
  address: string | null;              // 若名片上沒有，從官網補
  organization_en: string | null;      // 若名片上沒有，從官網補
  sources: Array<{uri: string, title: string}>;  // 資料來源
}
```

### 合併後的完整輸出
```typescript
interface UnifiedExtractResult {
  // OCR 基本欄位
  name_prefix: string | null;
  full_name: string;
  name_suffix: string | null;
  organization: string;
  department: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  
  // OCR + Enrich 混合欄位（優先 OCR，缺失時用 Enrich 補）
  organization_en: string | null;
  website: string | null;
  address: string | null;
  
  // Enrich 專屬欄位
  organization_alias: string | null;
  organization_full: string | null;
  company_summary: string | null;
  sources: Array<{uri: string, title: string}>;
}
```

## Unified Prompt（完整版）

```typescript
const UNIFIED_PROMPT = `你是專業的名片辨識與資訊補全系統。請完成以下兩個任務：

**任務 1：OCR 辨識**（依照 vCard RFC 6350 標準）
從名片圖片中精確辨識以下資訊：
- name_prefix: 稱謂前綴（Dr./Prof./Mr./Mrs./Ms.）
- full_name: 完整姓名（必填）
- name_suffix: 學位/頭銜後綴（Ph.D./Jr./Sr./M.D./Esq.）
- organization: 公司名稱（必填）
- organization_en: 公司英文名稱（名片上有印才填）
- department: 部門
- title: 職稱
- phone: 電話號碼（保留原格式含國碼，如：+886-2-1234-5678）
- email: 電子郵件
- website: 網站（完整 URL 含 https://）
- address: 地址（完整地址含郵遞區號）

**任務 2：公司資訊補全**（使用 Google Search）
搜尋公司「{organization}」的以下資訊：
- company_summary: 公司摘要（100-200字：產業、主要業務、成立年份、規模、營運狀況）
- organization_full: 公司完整正式名稱（工商登記全稱）
- organization_alias: 公司常用簡稱或品牌名
- 若名片上缺少以下欄位，請從官網補全：
  - organization_en: 公司英文正式名稱
  - website: 官方網站（完整 URL 含 https://）
  - address: 總部地址（完整地址含郵遞區號）

**回傳格式**（純 JSON，不要 markdown 標記）：
{
  "name_prefix": "...",
  "full_name": "...",
  "name_suffix": "...",
  "organization": "...",
  "organization_en": "...",
  "organization_alias": "...",
  "organization_full": "...",
  "department": "...",
  "title": "...",
  "phone": "...",
  "email": "...",
  "website": "...",
  "address": "...",
  "company_summary": "...",
  "sources": [
    {"uri": "https://...", "title": "..."}
  ]
}

**規則**：
1. 無法辨識的欄位填 null
2. 優先使用官方來源（公司官網、政府登記、證交所）
3. 使用近 2 年內資料
4. organization_full 必須是工商登記的正式全稱
5. 不要包含個人隱私資訊
6. phone 保留國碼和原始格式
7. website 和 address 優先使用名片上的資訊，缺失時才從 Web Search 補全`;
```

## API 實作

```typescript
async function unifiedExtract(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<UnifiedExtractResult> {
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

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const metadata = data.candidates?.[0]?.groundingMetadata;

  // Extract sources from grounding metadata
  const sources = metadata?.groundingChunks?.map((chunk: any) => ({
    uri: chunk.web?.uri || '',
    title: chunk.web?.title || ''
  })).filter((s: any) => s.uri) || [];

  // Parse JSON
  let cleanText = text.trim()
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/g, '');

  const result = JSON.parse(cleanText);
  
  return {
    ...result,
    sources: sources.length > 0 ? sources : (result.sources || [])
  };
}
```

## 前端填充邏輯

```javascript
// 填充確認畫面
function fillPreviewModal(data) {
  document.getElementById('preview-name-prefix').value = data.name_prefix || '';
  document.getElementById('preview-full-name').value = data.full_name || '';
  document.getElementById('preview-name-suffix').value = data.name_suffix || '';
  document.getElementById('preview-organization').value = data.organization || '';
  document.getElementById('preview-organization-en').value = data.organization_en || '';
  document.getElementById('preview-organization-alias').value = data.organization_alias || '';
  document.getElementById('preview-department').value = data.department || '';
  document.getElementById('preview-title').value = data.title || '';
  document.getElementById('preview-phone').value = data.phone || '';
  document.getElementById('preview-email').value = data.email || '';
  document.getElementById('preview-website').value = data.website || '';
  document.getElementById('preview-address').value = data.address || '';
  
  // AI 摘要區塊
  if (data.company_summary) {
    document.getElementById('preview-company-summary').textContent = data.company_summary;
    document.getElementById('ai-summary-section').classList.remove('hidden');
  } else {
    document.getElementById('ai-summary-section').classList.add('hidden');
  }
}
```

## 測試案例

### Case 1: 完整名片（所有欄位都有）
```
輸入：名片圖片（含姓名、公司、職稱、電話、Email、網站、地址）
預期：
- OCR 辨識所有欄位
- Web Search 補充 company_summary, organization_alias, organization_full
- 不覆蓋名片上已有的 website, address
```

### Case 2: 簡化名片（缺少網站和地址）
```
輸入：名片圖片（僅含姓名、公司、職稱、電話、Email）
預期：
- OCR 辨識有的欄位
- Web Search 補充 website, address, company_summary
```

### Case 3: 中英混合名片
```
輸入：名片圖片（中文公司名 + 英文公司名）
預期：
- organization: 中文名
- organization_en: 英文名（從名片辨識）
- organization_full: 完整工商登記名稱（從 Web Search）
```
