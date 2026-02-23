// OCR Handler for Received Cards
// POST /api/user/received-cards/ocr

import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { jsonResponse, errorResponse } from '../../../utils/response';

interface OCRRequest {
  upload_id: string;
}

interface OCRResult {
  name_prefix: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  name_suffix: string | null;
  organization: string | null;
  organization_en: string | null;
  department: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  ocr_raw_text?: string;
}

/**
 * Convert ArrayBuffer to Base64 in chunks
 */
function arrayBufferToBase64Chunked(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  const chunkSize = 8192; // 8KB chunks
  let binaryString = '';
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
    binaryString += String.fromCharCode(...chunk);
  }
  
  return btoa(binaryString);
}

/**
 * Call Gemini Vision API for OCR
 */
async function performOCR(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<OCRResult> {
  const prompt = `你是專業的名片 OCR 辨識系統。請依照 vCard (RFC 6350) 標準精確辨識名片資訊。

回傳格式：純 JSON（不要 markdown 標記）
{
  "name_prefix": "稱謂前綴（Dr./Prof./Mr./Mrs./Ms.）或 null",
  "full_name": "完整顯示名稱（FN 格式，如：王小明、John Smith）",
  "first_name": "名（Given Name）",
  "last_name": "姓（Family Name）",
  "name_suffix": "學位/頭銜後綴（Ph.D./Jr./Sr./M.D./Esq.）或 null",
  "organization": "組織名稱（ORG 格式，公司正式名稱）",
  "organization_en": "組織英文名稱（名片上有印才填）或 null",
  "title": "職稱（TITLE 格式，如：總經理、Software Engineer）",
  "phone": "電話號碼（TEL 格式，保留原格式含國碼，如：+886-2-1234-5678）",
  "email": "電子郵件（EMAIL 格式，完整地址）",
  "website": "網站（URL 格式，完整 URL 含 https://）或 null",
  "address": "地址（ADR 格式，完整地址：街道、城市、郵遞區號、國家）"
}

vCard 標準辨識規則：
1. full_name (FN)：完整顯示名稱，保留名片原始格式
2. last_name + first_name (N)：姓名結構化拆分
3. organization (ORG)：公司正式全稱（不要辨識簡稱或別名）
4. organization_en：僅辨識名片上明確印刷的英文名稱
5. title (TITLE)：職稱/職位
6. phone (TEL)：保留國碼和原始格式（+886-2-xxxx-xxxx）
7. email (EMAIL)：完整電子郵件地址
8. website (URL)：完整 URL（必須含 https:// 或 http://）
9. address (ADR)：完整地址含郵遞區號
9. 無法辨識的欄位填 null
10. 不要添加解釋文字或 markdown 標記`;

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
        }]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error('Gemini API request failed');
  }

  const data = await response.json() as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No OCR result from Gemini');
  }

  // Parse JSON (handle markdown code blocks)
  let cleanText = text.trim();
  
  // Remove markdown code blocks (more robust)
  cleanText = cleanText.replace(/^```(?:json)?\s*\n?/i, '');  // Remove opening ```json or ```
  cleanText = cleanText.replace(/\n?```\s*$/g, '');           // Remove closing ```
  cleanText = cleanText.trim();

  try {
    const result = JSON.parse(cleanText);
    return {
      ...result,
      ocr_raw_text: text
    };
  } catch (_error) {
    console.error('Failed to parse OCR result:', cleanText.substring(0, 200));
    throw new Error('Invalid OCR response format');
  }
}

/**
 * Handle POST /api/user/received-cards/ocr
 */
export async function handleOCR(request: Request, env: Env): Promise<Response> {
  const DEBUG = env.ENVIRONMENT === 'staging';
  try {
    if (DEBUG) console.log('[OCR] Request received');
    
    // 1. Verify OAuth
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) {
      if (DEBUG) console.log('[OCR] OAuth verification failed');
      return userResult;
    }
    const user = userResult;
    if (DEBUG) console.log('[OCR] OAuth verified for user:', user.email);

    // 2. Parse request body
    let body: OCRRequest;
    try {
      const rawBody = await request.text();
      if (DEBUG) console.log('[OCR] Raw body:', rawBody);
      body = JSON.parse(rawBody) as OCRRequest;
      if (DEBUG) console.log('[OCR] Parsed body:', body);
    } catch (error) {
      if (DEBUG) console.error('[OCR] JSON parse error:', error);
      return errorResponse('INVALID_JSON', 'Invalid JSON in request body', 400);
    }
    
    if (!body.upload_id) {
      if (DEBUG) console.error('[OCR] Missing upload_id');
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

    // 7. Perform OCR
    const ocrResult = await performOCR(imageBase64, mimeType, env.GEMINI_API_KEY);

    // 8. Update OCR status to completed
    await env.DB.prepare(`
      UPDATE temp_uploads 
      SET ocr_status = 'completed'
      WHERE upload_id = ? AND user_email = ?
    `).bind(body.upload_id, user.email).run();

    // 9. Return result
    return jsonResponse(ocrResult);

  } catch (error) {
    console.error('OCR error:', error);
    const message = error instanceof Error ? error.message : 'Failed to perform OCR';
    
    // Update OCR status to failed
    try {
      const userResult = await verifyOAuth(request, env);
      if (!(userResult instanceof Response)) {
        const body = await request.clone().json() as OCRRequest;
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
    
    return errorResponse('OCR_FAILED', message, 500);
  }
}
