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
  organization_alias: string[] | null;
  organization_full: string | null;
  company_summary: string | null;
  personal_summary: string | null;
  sources: Array<{ uri: string; title: string }>;
  
  // TODO: ocr_raw_text field exists in DB but not populated by unified-extract
  // Reason: Gemini Structured Output doesn't return raw OCR text
  // Future use cases: full-text search, OCR accuracy validation, audit trail
  // Decision (2026-02-24): Keep DB field for backward compatibility, but not actively used
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
 * Retry function with exponential backoff and jitter
 * Retries on QUOTA_OR_LIMIT (429) and SERVICE_UNAVAILABLE (503) errors
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const shouldRetry = errorMessage.includes('QUOTA_OR_LIMIT') || errorMessage.includes('SERVICE_UNAVAILABLE');

      // Don't retry if not retriable error, or if this was the last attempt
      if (!shouldRetry || i === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const baseDelay = Math.pow(2, i) * 1000;
      // Add jitter: ±20%
      const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
      const delay = baseDelay + jitter;

      console.log(`[Gemini Retry ${i + 1}/${maxRetries}] Waiting ${Math.round(delay)}ms (Error: ${errorMessage.substring(0, 50)})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Retry exhausted');
}

/**
 * Upload extracted data to FileSearchStore
 */
async function uploadToFileSearchStore(
  data: UnifiedExtractResult,
  apiKey: string,
  storeName: string
): Promise<void> {
  // Debug logging
  console.log('[FileSearchStore] Starting upload...');
  console.log('[FileSearchStore] storeName:', storeName);
  console.log('[FileSearchStore] organization:', data.organization);

  // 組合文件內容
  const content = `
Organization: ${data.organization}${data.organization_en ? ` (${data.organization_en})` : ''}
${data.organization_alias?.length ? `Aliases: ${data.organization_alias.join(', ')}` : ''}

Company Summary:
${data.company_summary || ''}

${data.full_name && data.personal_summary ? `
Professional Staff:
- ${data.full_name}${data.department || data.title ? ` (${data.department || data.title})` : ''}: ${data.personal_summary}
` : ''}

Sources:
${data.sources?.map(s => `- ${s.title}: ${s.uri}`).join('\n') || ''}
  `.trim();

  // 準備 metadata
  const displayName = `${data.organization}_${new Date().toISOString().split('T')[0]}`;
  const metadata = {
    displayName,
    customMetadata: [
      {key: "organization", stringValue: data.organization},
      {key: "organization_en", stringValue: data.organization_en || ""}
    ]
  };

  // 上傳到 FileSearchStore
  const formData = new FormData();
  formData.append('metadata', JSON.stringify(metadata));
  formData.append('file', new Blob([content], {type: 'text/plain'}));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/${storeName}:uploadToFileSearchStore?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'multipart'
      },
      body: formData
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed (${response.status}): ${errorText}`);
  }

  // 成功日誌
  console.log(`[FileSearchStore] Uploaded: ${displayName} (${content.length} bytes)`);
}

/**
 * Unified OCR + Enrich with Gemini Vision + Google Search
 */
async function performUnifiedExtract(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<UnifiedExtractResult> {
  // JSON Schema for structured output (multilingual support)
  const responseSchema = {
    type: "object",
    properties: {
      name_prefix: {
        type: ["string", "null"],
        description: "Name prefix (Dr./Prof./Mr./Mrs./Ms.), null if not present"
      },
      full_name: {
        type: "string",
        description: "Full name (required, preserve original language)"
      },
      name_suffix: {
        type: ["string", "null"],
        description: "Name suffix (Ph.D./Jr./Sr./M.D./Esq.), null if not present"
      },
      organization: {
        type: "string",
        description: "Company/organization name (required, preserve original language)"
      },
      organization_en: {
        type: ["string", "null"],
        description: "English name of organization (from card if printed, otherwise from official website)"
      },
      organization_alias: {
        type: ["array", "null"],
        items: { type: "string" },
        description: "Common abbreviations or brand names (e.g., [\"TSMC\", \"台積電\"])"
      },
      organization_full: {
        type: ["string", "null"],
        description: "Full official name of organization (business registration name)"
      },
      department: {
        type: ["string", "null"],
        description: "Department name (preserve original language)"
      },
      title: {
        type: ["string", "null"],
        description: "Job title (preserve original language)"
      },
      phone: {
        type: ["string", "null"],
        description: "Phone number (preserve original format with country code, e.g., +886-2-1234-5678)"
      },
      email: {
        type: ["string", "null"],
        description: "Email address"
      },
      website: {
        type: ["string", "null"],
        description: "Website (full URL with https://, prioritize card information)"
      },
      address: {
        type: ["string", "null"],
        description: "Address (full address with postal code, prioritize card information, preserve original language)"
      },
      company_summary: {
        type: ["string", "null"],
        description: "Organization summary (100-200 chars: industry, main business, founding year, scale, operational status. If department exists, explain its function)"
      },
      personal_summary: {
        type: ["string", "null"],
        description: "Personal summary (strictly 30-50 chars: one sentence summarizing expertise or achievements)"
      }
    },
    required: ["full_name", "organization"]
  };

  const prompt = `You are a professional business card OCR and information enrichment system. Complete the following tasks:

**Task 1: OCR Recognition**
Extract all visible information from the business card image (name, company, department, title, contact details, etc.).
**IMPORTANT**: Preserve the original language of the card (Chinese/Japanese/Korean/English).

**Task 2: Information Enrichment**
Use Google Search to enrich the following information:
- Organization's full name, English name, common abbreviations
- Organization summary (100-200 chars: industry, main business, founding year, scale, operational status)
- If department name exists, explain the department's function within the organization
- Personal summary (**strictly 30-50 chars**: one sentence summarizing this person's expertise or representative achievements)
- If the card lacks official website or address, supplement from official sources

**Search Strategy**:
- Can use "name + organization/department" as search keywords
- company_summary describes only the organization and department
- personal_summary must be concise, one sentence is sufficient
- Prioritize official sources (organization website, government registration, professional profiles)

**Language Handling**:
- Keep all card text in its original language (names, titles, addresses)
- company_summary and personal_summary can be in the same language as the card or English
- For mixed-language cards, preserve each field in its original language`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
        tools: [{ googleSearch: {} }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: responseSchema
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);

    // Handle 412 FAILED_PRECONDITION (safety filters or image quality issues)
    if (response.status === 412) {
      throw new Error('Content blocked by safety filters or image quality too low');
    }

    throw new Error('Gemini API request failed');
  }

  const data = await response.json() as any;
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  const metadata = candidate?.groundingMetadata;

  // Diagnose 412 errors: Check promptFeedback for block reasons
  if (!text) {
    const promptFeedback = data.promptFeedback;

    // Log full response for diagnosis
    console.error('[Gemini 412 Diagnosis] Full response:', JSON.stringify({
      promptFeedback,
      candidates: data.candidates,
      usageMetadata: data.usageMetadata
    }, null, 2));

    // Analyze blockReason
    if (promptFeedback?.blockReason) {
      const blockReason = promptFeedback.blockReason;
      console.error(`[Gemini 412 Diagnosis] Block reason: ${blockReason}`);

      // Map block reasons to specific errors
      if (blockReason === 'SAFETY') {
        throw new Error('SAFETY_FILTER: Content blocked by safety filters');
      } else if (blockReason === 'OTHER') {
        const safetyRatings = promptFeedback.safetyRatings || [];
        console.error('[Gemini 412 Diagnosis] Safety ratings:', JSON.stringify(safetyRatings, null, 2));
        throw new Error('QUOTA_OR_LIMIT: Request blocked due to API quota, rate limit, or image quality issues');
      } else {
        throw new Error(`UNKNOWN_BLOCK: Request blocked with reason: ${blockReason}`);
      }
    }

    throw new Error('No result from Gemini');
  }

  // Extract sources from grounding metadata
  const sources = metadata?.groundingChunks?.map((chunk: any) => ({
    uri: chunk.web?.uri || '',
    title: chunk.web?.title || ''
  })).filter((s: any) => s.uri) || [];

  // Parse JSON (Structured Output with robust error handling)
  try {
    let jsonString = text.trim();

    // Step 1: Remove markdown code blocks (```json ... ```)
    const fencedMatch = jsonString.match(/```(?:json)?\s*\r?\n([\s\S]*?)\r?\n?```/);
    if (fencedMatch) {
      jsonString = fencedMatch[1].trim();
    }

    // Step 2: Escape unescaped control characters in strings
    // Replace unescaped newlines, tabs, etc. (common AI output issue)
    jsonString = jsonString.replace(/([^\\])(\\n|\\t|\\r)/g, '$1\\\\$2');

    // Step 3: Fix invalid backslash sequences (e.g., \' → ')
    jsonString = jsonString.replace(/\\'/g, "'");

    // Step 4: Remove trailing commas (before } or ])
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

    // Step 5: Extract valid JSON by brace balancing (handles trailing garbage)
    const firstBraceIndex = jsonString.indexOf('{');
    if (firstBraceIndex !== -1) {
      let braceDepth = 0;
      let inString = false;
      let stringQuote = '';
      let isEscaped = false;
      let endIndex = firstBraceIndex;

      for (; endIndex < jsonString.length; endIndex++) {
        const ch = jsonString[endIndex];
        
        if (inString) {
          if (isEscaped) {
            isEscaped = false;
          } else if (ch === '\\') {
            isEscaped = true;
          } else if (ch === stringQuote) {
            inString = false;
          }
        } else {
          if (ch === '"' || ch === "'") {
            inString = true;
            stringQuote = ch;
          } else if (ch === '{') {
            braceDepth++;
          } else if (ch === '}') {
            braceDepth--;
            if (braceDepth === 0) {
              endIndex++;
              break;
            }
          }
        }
      }
      
      jsonString = jsonString.slice(firstBraceIndex, endIndex).trim();
    }

    // Step 6: Parse JSON
    const result = JSON.parse(jsonString);
    return { ...result, sources };
  } catch (error) {
    console.error('[UnifiedExtract] JSON parse failed:', error);
    console.error('[UnifiedExtract] Text sample:', text.substring(0, 300));
    throw new Error('Invalid response format');
  }
}

/**
 * Handle POST /api/user/received-cards/unified-extract
 */
export async function handleUnifiedExtract(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
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

    // 7. Perform unified extract (OCR + Enrich) with retry on 429
    const result = await retryWithBackoff(() =>
      performUnifiedExtract(imageBase64, mimeType, env.GEMINI_API_KEY, env.GEMINI_MODEL)
    );

    // 8. Update OCR status to completed
    await env.DB.prepare(`
      UPDATE temp_uploads
      SET ocr_status = 'completed'
      WHERE upload_id = ? AND user_email = ?
    `).bind(body.upload_id, user.email).run();

    // 9. Background upload to FileSearchStore (non-blocking)
    if (env.FILE_SEARCH_STORE_NAME && result.organization) {
      ctx.waitUntil(
        uploadToFileSearchStore(result, env.GEMINI_API_KEY, env.FILE_SEARCH_STORE_NAME)
          .catch(error => {
            console.error('[FileSearchStore] Upload failed:', error instanceof Error ? error.message : String(error));
          })
      );
    }

    // 10. Return result
    return jsonResponse(result);

  } catch (error) {
    console.error('Unified extract error:', error);
    const message = error instanceof Error ? error.message : 'Failed to extract card data';

    // Parse specific error types from enhanced diagnosis
    let errorCode = 'EXTRACT_FAILED';
    let statusCode = 500;
    let userMessage = message;

    if (message.startsWith('SAFETY_FILTER:')) {
      errorCode = 'SAFETY_FILTER';
      statusCode = 422;
      userMessage = '圖片內容被安全過濾器阻擋 / Image content blocked by safety filters';
    } else if (message.startsWith('QUOTA_OR_LIMIT:')) {
      errorCode = 'QUOTA_EXCEEDED';
      statusCode = 429;
      userMessage = 'API 配額已達上限或圖片解析度異常，請稍後再試 / API quota exceeded or image resolution issue. Please try again later.';
    } else if (message.startsWith('UNKNOWN_BLOCK:')) {
      errorCode = 'CONTENT_BLOCKED';
      statusCode = 422;
      userMessage = '圖片無法處理，原因未知 / Image cannot be processed due to unknown reason';
    } else if (message.includes('Content blocked by safety filters or image quality too low')) {
      // Fallback for legacy 412 errors
      errorCode = 'CONTENT_BLOCKED';
      statusCode = 422;
      userMessage = '圖片內容無法辨識，請確認圖片清晰且不包含敏感內容 / Image content cannot be recognized. Please ensure the image is clear and does not contain sensitive content.';
    }

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

    return errorResponse(errorCode, userMessage, statusCode);
  }
}
