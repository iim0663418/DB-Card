// Enrich Handler for Received Cards
// POST /api/user/received-cards/enrich

import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { jsonResponse, errorResponse } from '../../../utils/response';

interface EnrichRequest {
  upload_id?: string;      // Optional: for upload flow
  card_uuid?: string;      // Optional: for post-enrichment
  organization: string;
  full_name: string;
  title?: string;
}

interface EnrichResult {
  // 摘要資訊
  company_summary: string | null;
  sources: Array<{ uri: string; title: string }>;
  // 公司欄位補全
  organization_full: string | null;  // 公司全稱
  organization_en: string | null;    // 公司英文名
  organization_alias: string | null; // 公司別名
  website: string | null;            // 公司網站
  address: string | null;            // 公司地址
}

/**
 * Call Gemini API with Google Search Grounding
 */
async function performEnrichment(
  organization: string,
  fullName: string,
  title: string | undefined,
  env: Env
): Promise<EnrichResult> {
  const prompt = `請搜尋以下公司的詳細資訊：
公司：${organization}
聯絡人：${fullName}（${title || '職稱未知'}）

請用繁體中文回答，並回傳純 JSON 格式（不要 markdown 標記）：
{
  "company_summary": "公司摘要（100-200字：產業、主要業務、成立年份、規模、營運狀況）",
  "organization_full": "公司完整正式名稱（工商登記全稱）",
  "organization_en": "公司英文正式名稱",
  "organization_alias": "公司常用簡稱或品牌名",
  "website": "官方網站（完整 URL 含 https://）",
  "address": "總部地址（完整地址含郵遞區號）"
}

要求：
- 優先使用官方來源（公司官網、政府登記、證交所）
- 使用近 2 年內資料
- 無法確認的欄位填 null
- organization_full 必須是工商登記的正式全稱
- 不要包含個人隱私
- 不要添加解釋文字`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini Grounding API error:', errorText);
    throw new Error('Gemini Grounding API request failed');
  }

  const data = await response.json() as any;
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  const metadata = candidate?.groundingMetadata;

  // Extract sources
  const sources = metadata?.groundingChunks?.map((chunk: any) => ({
    uri: chunk.web?.uri || '',
    title: chunk.web?.title || ''
  })).filter((s: any) => s.uri) || [];

  if (!text) {
    return {
      company_summary: null,
      
      sources,
      organization_full: null,
      organization_en: null,
      organization_alias: null,
      website: null,
      address: null
    };
  }

  // Parse JSON (handle markdown code blocks)
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/```\n?/g, '');
  }

  try {
    const result = JSON.parse(cleanText);
    return {
      company_summary: result.company_summary || null,
      
      sources,
      organization_full: result.organization_full || null,
      organization_en: result.organization_en || null,
      organization_alias: result.organization_alias || null,
      website: result.website || null,
      address: result.address || null
    };
  } catch (_error) {
    console.error('Failed to parse enrichment result:', cleanText);
    // Return partial result with sources
    return {
      company_summary: null,
      
      sources,
      organization_full: null,
      organization_en: null,
      organization_alias: null,
      website: null,
      address: null
    };
  }
}

/**
 * Handle POST /api/user/received-cards/enrich
 */
export async function handleEnrich(request: Request, env: Env): Promise<Response> {
  try {
    // 1. Verify OAuth
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) {
      return userResult;
    }
    const user = userResult;

    // 2. Parse request body
    const body = await request.json() as EnrichRequest;
    
    // Validate: either upload_id or card_uuid must be provided
    if (!body.upload_id && !body.card_uuid) {
      return errorResponse('INVALID_REQUEST', 'upload_id or card_uuid is required', 400);
    }
    
    if (!body.organization || !body.full_name) {
      return errorResponse('INVALID_REQUEST', 'organization and full_name are required', 400);
    }

    // 3. Verify ownership
    if (body.card_uuid) {
      // Post-enrichment: verify card ownership
      const card = await env.DB.prepare(`
        SELECT uuid FROM received_cards 
        WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
      `).bind(body.card_uuid, user.email).first();
      
      if (!card) {
        return errorResponse('CARD_NOT_FOUND', 'Card not found', 404);
      }
    } else if (body.upload_id) {
      // Upload flow: verify upload_id exists and not consumed
      const upload = await env.DB.prepare(`
        SELECT upload_id, user_email, consumed, expires_at
        FROM temp_uploads
        WHERE upload_id = ? AND user_email = ? AND consumed = 0
      `).bind(body.upload_id, user.email).first();

      if (!upload) {
        return errorResponse('INVALID_UPLOAD_ID', 'Upload not found or already consumed', 404);
      }

      // Check expiration
      const now = Date.now();
      const expiresAt = parseInt(upload.expires_at as string);
      if (expiresAt < now) {
        return errorResponse('UPLOAD_EXPIRED', 'Upload has expired', 410);
      }
    }

    // 4. Perform enrichment (best-effort, don't fail on error)
    let enrichResult: EnrichResult;
    try {
      enrichResult = await performEnrichment(
        body.organization,
        body.full_name,
        body.title,
        env
      );
    } catch (error) {
      console.error('Enrichment error (non-fatal):', error);
      // Return empty result on error (best-effort)
      enrichResult = {
        company_summary: null,
        
        sources: [],
        organization_full: null,
        organization_en: null,
        organization_alias: null,
        website: null,
        address: null
      };
    }

    // 5. Return result
    return jsonResponse(enrichResult);

  } catch (error) {
    console.error('Enrich handler error:', error);
    const message = error instanceof Error ? error.message : 'Failed to enrich card data';
    return errorResponse('ENRICH_FAILED', message, 500);
  }
}
