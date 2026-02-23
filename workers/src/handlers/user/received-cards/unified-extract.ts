// Unified Extract Handler for Received Cards
// POST /api/user/received-cards/unified-extract
// Combines OCR + Enrich in one Gemini Vision + Google Search call

import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { jsonResponse, errorResponse } from '../../../utils/response';

interface UnifiedExtractRequest {
  upload_id: string;
}

interface UnifiedExtractResult {
  // OCR fields
  name_prefix: string | null;
  full_name: string | null;
  name_suffix: string | null;
  organization: string | null;
  organization_en: string | null;
  department: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  
  // Enrich fields
  organization_alias: string | null;
  organization_full: string | null;
  company_summary: string | null;
  sources: Array<{ uri: string; title: string }>;
}

/**
 * Convert ArrayBuffer to Base64 in chunks
 */
function arrayBufferToBase64Chunked(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binaryString = '';
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
    binaryString += String.fromCharCode(...chunk);
  }
  
  return btoa(binaryString);
}

/**
 * Unified OCR + Enrich with Gemini Vision + Google Search
 */
async function performUnifiedExtract(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<UnifiedExtractResult> {
  const prompt = `你是專業的名片辨識與資訊補全系統。請完成以下兩個任務：

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
搜尋公司的以下資訊：
- company_summary: 公司摘要（100-200字：產業、主要業務、成立年份、規模、營運狀況。如果名片中有部門名稱，額外查找該部門在公司中的職能與職責，並整合到摘要中）
- organization_full: 公司完整正式名稱（工商登記全稱）
- organization_alias: 公司常用簡稱或品牌名（陣列格式，例如：["台積電", "TSMC"]）
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
  "organization_alias": ["簡稱1", "簡稱2"],
  "organization_full": "...",
  "department": "...",
  "title": "...",
  "phone": "...",
  "email": "...",
  "website": "...",
  "address": "...",
  "company_summary": "..."
}

**規則**：
1. 無法辨識的欄位填 null
2. 優先使用官方來源（公司官網、政府登記、證交所）
3. 使用近 2 年內資料
4. organization_full 必須是工商登記的正式全稱
5. 不要包含個人隱私資訊
6. phone 保留國碼和原始格式
7. website 和 address 優先使用名片上的資訊，缺失時才從 Web Search 補全`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } }
          ]
        }],
        tools: [{ googleSearch: {} }]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error('Gemini API request failed');
  }

  const data = await response.json() as any;
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  const metadata = candidate?.groundingMetadata;

  if (!text) {
    throw new Error('No result from Gemini');
  }

  // Extract sources from grounding metadata
  const sources = metadata?.groundingChunks?.map((chunk: any) => ({
    uri: chunk.web?.uri || '',
    title: chunk.web?.title || ''
  })).filter((s: any) => s.uri) || [];

  // Parse JSON (handle markdown code blocks)
  let cleanText = text.trim();
  cleanText = cleanText.replace(/^```(?:json)?\s*\n?/i, '');
  cleanText = cleanText.replace(/\n?```\s*$/g, '');
  cleanText = cleanText.trim();

  try {
    const result = JSON.parse(cleanText);
    return {
      ...result,
      sources
    };
  } catch (_error) {
    console.error('Failed to parse unified extract result:', cleanText.substring(0, 200));
    throw new Error('Invalid response format');
  }
}

/**
 * Handle POST /api/user/received-cards/unified-extract
 */
export async function handleUnifiedExtract(request: Request, env: Env): Promise<Response> {
  const DEBUG = env.ENVIRONMENT === 'staging';
  try {
    if (DEBUG) console.log('[UnifiedExtract] Request received');
    
    // 1. Verify OAuth
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) {
      if (DEBUG) console.log('[UnifiedExtract] OAuth verification failed');
      return userResult;
    }
    const user = userResult;
    if (DEBUG) console.log('[UnifiedExtract] OAuth verified for user:', user.email);

    // 2. Parse request body
    let body: UnifiedExtractRequest;
    try {
      const rawBody = await request.text();
      if (DEBUG) console.log('[UnifiedExtract] Raw body:', rawBody);
      body = JSON.parse(rawBody) as UnifiedExtractRequest;
      if (DEBUG) console.log('[UnifiedExtract] Parsed body:', body);
    } catch (error) {
      if (DEBUG) console.error('[UnifiedExtract] JSON parse error:', error);
      return errorResponse('INVALID_JSON', 'Invalid JSON in request body', 400);
    }
    
    if (!body.upload_id) {
      if (DEBUG) console.error('[UnifiedExtract] Missing upload_id');
      return errorResponse('INVALID_REQUEST', 'upload_id is required', 400);
    }

    // 3. Verify upload_id exists and not consumed
    const upload = await env.DB.prepare(`
      SELECT upload_id, user_email, image_url, consumed
      FROM temp_uploads
      WHERE upload_id = ? AND user_email = ? AND consumed = 0
    `).bind(body.upload_id, user.email).first();

    if (!upload) {
      return errorResponse('INVALID_UPLOAD_ID', 'Upload not found or already consumed', 404);
    }

    // 4. Read image from R2
    const imageObject = await env.PHYSICAL_CARDS.get(upload.image_url as string);
    if (!imageObject) {
      return errorResponse('IMAGE_NOT_FOUND', 'Image not found in storage', 404);
    }

    const imageBuffer = await imageObject.arrayBuffer();

    // 5. Convert to Base64
    const imageBase64 = arrayBufferToBase64Chunked(imageBuffer);

    // 6. Detect MIME type
    const mimeType = (upload.image_url as string).endsWith('.png') ? 'image/png' : 'image/jpeg';

    // 7. Perform unified extract (OCR + Enrich)
    const result = await performUnifiedExtract(imageBase64, mimeType, env.GEMINI_API_KEY);

    // 8. Update OCR status to completed
    await env.DB.prepare(`
      UPDATE temp_uploads 
      SET ocr_status = 'completed'
      WHERE upload_id = ? AND user_email = ?
    `).bind(body.upload_id, user.email).run();

    // 9. Return result
    return jsonResponse(result);

  } catch (error) {
    console.error('Unified extract error:', error);
    const message = error instanceof Error ? error.message : 'Failed to extract card data';
    
    // Update OCR status to failed
    try {
      const userResult = await verifyOAuth(request, env);
      if (!(userResult instanceof Response)) {
        const body = await request.clone().json() as UnifiedExtractRequest;
        if (body.upload_id) {
          await env.DB.prepare(`
            UPDATE temp_uploads 
            SET ocr_status = 'failed', ocr_error = ?
            WHERE upload_id = ? AND user_email = ?
          `).bind(message.substring(0, 500), body.upload_id, userResult.email).run();
        }
      }
    } catch (updateError) {
      console.error('Failed to update OCR status:', updateError);
    }
    
    return errorResponse('EXTRACT_FAILED', message, 500);
  }
}
