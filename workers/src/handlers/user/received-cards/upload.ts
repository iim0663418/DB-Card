// Upload Handler for Received Cards
// POST /api/user/received-cards/upload

import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { jsonResponse, errorResponse } from '../../../utils/response';

interface UploadRequest {
  image_base64: string;
  thumbnail_base64?: string;
  filename: string;
}

/**
 * Decode Base64 in chunks to avoid stack overflow on large images
 */
function decodeBase64Chunked(base64: string): Uint8Array {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, '');
  
  // Decode using atob (browser-compatible)
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  // Process in 8KB chunks
  const chunkSize = 8192;
  for (let i = 0; i < binaryString.length; i += chunkSize) {
    const chunk = binaryString.slice(i, Math.min(i + chunkSize, binaryString.length));
    for (let j = 0; j < chunk.length; j++) {
      bytes[i + j] = chunk.charCodeAt(j);
    }
  }
  
  return bytes;
}

/**
 * Generate unique upload ID
 */
function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Detect image MIME type from Base64 header
 */
function detectMimeType(base64: string): string {
  if (base64.startsWith('data:image/jpeg') || base64.startsWith('/9j/')) {
    return 'image/jpeg';
  }
  if (base64.startsWith('data:image/png') || base64.startsWith('iVBORw0KGgo')) {
    return 'image/png';
  }
  return 'image/jpeg'; // Default
}

/**
 * Handle POST /api/user/received-cards/upload
 */
export async function handleUpload(request: Request, env: Env): Promise<Response> {
  const DEBUG = env.ENVIRONMENT === 'staging';
  try {
    if (DEBUG) console.log('[Upload] Request received');
    
    // 1. Verify OAuth
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) {
      if (DEBUG) console.log('[Upload] OAuth verification failed');
      return userResult;
    }
    const user = userResult;
    if (DEBUG) console.log('[Upload] OAuth verified for user:', user.email);

    // 2. Parse request body
    const body = await request.json() as UploadRequest;
    if (DEBUG) console.log('[Upload] Body parsed, filename:', body.filename);
    
    if (!body.image_base64 || !body.filename) {
      if (DEBUG) console.error('[Upload] Missing required fields');
      return errorResponse('INVALID_REQUEST', 'image_base64 and filename are required', 400);
    }

    // 3. Validate file size (max 5MB in Base64 ≈ 6.67MB encoded)
    if (body.image_base64.length > 7 * 1024 * 1024) {
      return errorResponse('FILE_TOO_LARGE', 'Image too large (max 5MB)', 400);
    }

    // 4. Validate file type
    const mimeType = detectMimeType(body.image_base64);
    if (!['image/jpeg', 'image/png'].includes(mimeType)) {
      return errorResponse('INVALID_FILE_TYPE', 'Only JPG and PNG images are supported', 400);
    }

    // 5. Decode Base64 (chunked)
    let imageBytes: Uint8Array;
    try {
      imageBytes = decodeBase64Chunked(body.image_base64);
    } catch (_error) {
      return errorResponse('INVALID_BASE64', 'Invalid Base64 image data', 400);
    }

    // 6. Validate decoded size (max 5MB)
    if (imageBytes.length > 5 * 1024 * 1024) {
      return errorResponse('FILE_TOO_LARGE', 'Image too large (max 5MB)', 400);
    }

    // 7. Generate upload ID and R2 key
    const uploadId = generateUploadId();
    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    const r2Key = `received/temp/${uploadId}.${extension}`;

    // 8. Upload to R2
    await env.PHYSICAL_CARDS.put(r2Key, imageBytes, {
      httpMetadata: {
        contentType: mimeType,
      },
    });

    // 8.1. Upload thumbnail to R2 (if provided)
    let thumbnailUrl: string | null = null;
    if (body.thumbnail_base64) {
      try {
        const thumbnailBytes = decodeBase64Chunked(body.thumbnail_base64);
        const thumbnailKey = `received/temp/${uploadId}_thumb.webp`;

        await env.PHYSICAL_CARDS.put(thumbnailKey, thumbnailBytes, {
          httpMetadata: {
            contentType: 'image/webp',
          },
        });

        thumbnailUrl = thumbnailKey;
        if (DEBUG) console.log('[Upload] Thumbnail uploaded:', thumbnailKey);
      } catch (error) {
        console.warn('[Upload] Failed to upload thumbnail:', error);
        // Continue without thumbnail
      }
    }

    // 9. Create temp_uploads record
    const now = Date.now();
    const expiresAt = now + 3600000; // 1 hour

    await env.DB.prepare(`
      INSERT INTO temp_uploads (
        upload_id, user_email, image_url, thumbnail_url, consumed, expires_at, created_at
      ) VALUES (?, ?, ?, ?, 0, ?, ?)
    `).bind(
      uploadId,
      user.email,
      r2Key,
      thumbnailUrl,
      expiresAt.toString(),
      now.toString()
    ).run();

    if (DEBUG) console.log('[Upload] temp_uploads created:', {
      upload_id: uploadId,
      user_email: user.email,
      image_url: r2Key,
      ocr_status: 'pending'
    });

    // 10. Return response
    const response = {
      upload_id: uploadId,
      image_url: r2Key,
      thumbnail_url: thumbnailUrl,
      expires_at: expiresAt,
    };
    if (DEBUG) console.log('[Upload] Success, returning:', response);
    return jsonResponse(response);

  } catch (error) {
    console.error('[Upload] Error:', error);
    return errorResponse('UPLOAD_FAILED', 'Failed to upload image', 500);
  }
}
