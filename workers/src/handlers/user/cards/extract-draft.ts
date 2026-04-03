// Self-Card Extract Draft Handler
// POST /api/user/cards/extract-draft

import type { Env, UserCardExtractDraft } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { jsonResponse, errorResponse } from '../../../utils/response';
import { arrayBufferToBase64Chunked, retryWithBackoff, parseGeminiJSON } from '../../../utils/ocr-helpers';

const SCHEMA_VERSION = '1.0';

// Gemini JSON schema for self-card draft (each field has { value, provenance })
function makeDraftFieldSchema(description: string) {
  return {
    type: 'object',
    properties: {
      value: { type: 'string', description },
      provenance: { type: 'string', enum: ['observed', 'translated', 'inferred'] }
    },
    required: ['value', 'provenance']
  };
}

function makeNullableDraftFieldSchema(description: string) {
  return { oneOf: [makeDraftFieldSchema(description), { type: 'null' }] };
}

const responseSchema = {
  type: 'object',
  properties: {
    name_zh: makeDraftFieldSchema('Chinese name (observed if on card, translated if derived from English)'),
    name_en: makeDraftFieldSchema('English name (observed if on card, translated if derived from Chinese)'),
    title_zh: makeNullableDraftFieldSchema('Chinese job title, null if not present'),
    title_en: makeNullableDraftFieldSchema('English job title, null if not present'),
    department: makeNullableDraftFieldSchema('Department name, null if not present'),
    email: makeNullableDraftFieldSchema('Email address, null if not present'),
    phone: makeNullableDraftFieldSchema('Office phone number, null if not present'),
    mobile: makeNullableDraftFieldSchema('Mobile phone number, null if not present'),
    address_zh: makeNullableDraftFieldSchema('Chinese address, null if not present'),
    address_en: makeNullableDraftFieldSchema('English address, null if not present'),
    social_linkedin: makeNullableDraftFieldSchema('LinkedIn URL (full https://), null if not visible on card'),
    social_line: makeNullableDraftFieldSchema('LINE ID or URL, null if not visible on card'),
    social_facebook: makeNullableDraftFieldSchema('Facebook URL, null if not visible on card'),
    social_instagram: makeNullableDraftFieldSchema('Instagram handle or URL, null if not visible on card'),
    social_twitter: makeNullableDraftFieldSchema('Twitter/X handle or URL, null if not visible on card'),
    social_youtube: makeNullableDraftFieldSchema('YouTube channel URL, null if not visible on card'),
    social_github: makeNullableDraftFieldSchema('GitHub username or URL, null if not visible on card'),
    social_signal: makeNullableDraftFieldSchema('Signal handle, null if not visible on card'),
    website: makeNullableDraftFieldSchema('Personal or company website URL (full https://), null if not present'),
    organization: makeNullableDraftFieldSchema('Company or organization name, null if not present')
  },
  required: ['name_zh', 'name_en']
};

const EXTRACT_PROMPT = `Extract business card information to produce an editable draft.

**OCR Task**: Extract all visible text. Preserve original language.

**Provenance rules**:
- "observed": field value is directly visible on the card in that language
- "translated": field value is derived by translating from the other language (not printed on card)
- "inferred": field value is logically inferred but not explicitly stated

**Bilingual names/titles**:
- If both Chinese and English appear on card → both provenance = "observed"
- If only Chinese → name_zh.provenance = "observed", name_en.provenance = "translated"
- If only English → name_en.provenance = "observed", name_zh.provenance = "translated"

**Social links**: Only include if the link/handle is visibly printed on the card. Do NOT search the web.

**Important**: Return null for any field not present or not visible on the card.`;

async function performSelfCardExtract(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<UserCardExtractDraft['fields']> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: EXTRACT_PROMPT },
            { inline_data: { mime_type: mimeType, data: imageBase64 } }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: responseSchema,
          maxOutputTokens: 4096
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      })
    }
  );

  if (!response.ok) {
    if (response.status === 412) throw new Error('Content blocked by safety filters or image quality too low');
    throw new Error('Gemini API request failed');
  }

  const data = await response.json() as any;
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  const finishReason = candidate?.finishReason;

  if (finishReason === 'MAX_TOKENS') {
    throw new Error('Response truncated due to token limit');
  }

  if (!text) {
    const blockReason = data.promptFeedback?.blockReason;
    if (blockReason === 'SAFETY') throw new Error('SAFETY_FILTER: Content blocked by safety filters');
    if (blockReason === 'OTHER') throw new Error('QUOTA_OR_LIMIT: Request blocked due to API quota or rate limit');
    throw new Error('No result from Gemini');
  }

  return parseGeminiJSON(text) as UserCardExtractDraft['fields'];
}

/**
 * Handle POST /api/user/cards/extract-draft
 */
export async function handleExtractDraft(request: Request, env: Env): Promise<Response> {
  let uploadId: string | null = null;
  let userEmail: string | null = null;

  try {
    // 1. Verify OAuth
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) return userResult;
    userEmail = userResult.email;

    // 2. Parse request body
    let body: { upload_id?: string };
    try {
      body = await request.json() as { upload_id?: string };
    } catch {
      return errorResponse('INVALID_JSON', 'Invalid JSON in request body', 400);
    }

    if (!body.upload_id) {
      return errorResponse('INVALID_REQUEST', 'upload_id is required', 400);
    }
    uploadId = body.upload_id;

    // 3. Verify upload exists, belongs to user, not consumed
    const upload = await env.DB.prepare(`
      SELECT upload_id, image_url, flow, consumed
      FROM temp_uploads
      WHERE upload_id = ? AND user_email = ? AND consumed = 0
    `).bind(uploadId, userEmail).first();

    if (!upload) {
      return errorResponse('INVALID_UPLOAD_ID', 'Upload not found or already consumed', 404);
    }

    // 4. Validate flow
    if (upload.flow !== 'own_card') {
      return errorResponse(
        'FLOW_MISMATCH',
        `This upload was created for the "${upload.flow}" flow. Use a upload with flow=own_card.`,
        400
      );
    }

    // 5. Read image from R2
    const imageObject = await env.PHYSICAL_CARDS.get(upload.image_url as string);
    if (!imageObject) {
      return errorResponse('IMAGE_NOT_FOUND', 'Image not found in storage', 404);
    }

    const imageBuffer = await imageObject.arrayBuffer();
    const imageBase64 = arrayBufferToBase64Chunked(imageBuffer);
    const mimeType = (upload.image_url as string).endsWith('.png') ? 'image/png' : 'image/jpeg';

    // 6. Call Gemini (no google_search)
    const fields = await retryWithBackoff(() =>
      performSelfCardExtract(imageBase64, mimeType, env.GEMINI_API_KEY, env.GEMINI_MODEL)
    );

    // 7. Update OCR status
    await env.DB.prepare(`
      UPDATE temp_uploads SET ocr_status = 'completed', extract_schema_version = ?
      WHERE upload_id = ? AND user_email = ?
    `).bind(SCHEMA_VERSION, uploadId, userEmail).run();

    // 8. Return draft
    const draft: UserCardExtractDraft = { schema_version: SCHEMA_VERSION, fields };
    return jsonResponse(draft);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to extract card data';

    let errorCode = 'EXTRACT_FAILED';
    let statusCode = 500;
    let userMessage = message;

    if (message.startsWith('SAFETY_FILTER:')) {
      errorCode = 'SAFETY_FILTER';
      statusCode = 422;
      userMessage = 'Image content blocked by safety filters';
    } else if (message.startsWith('QUOTA_OR_LIMIT:')) {
      errorCode = 'QUOTA_EXCEEDED';
      statusCode = 429;
      userMessage = 'API quota exceeded or rate limit hit. Please try again later.';
    } else if (message.includes('Content blocked by safety filters')) {
      errorCode = 'SAFETY_FILTER';
      statusCode = 422;
      userMessage = 'Image content blocked by safety filters';
    }

    if (uploadId && userEmail) {
      try {
        await env.DB.prepare(`
          UPDATE temp_uploads SET ocr_status = 'failed', ocr_error = ?
          WHERE upload_id = ? AND user_email = ?
        `).bind(message.substring(0, 500), uploadId, userEmail).run();
      } catch { /* ignore update failure */ }
    }

    return errorResponse(errorCode, userMessage, statusCode);
  }
}
