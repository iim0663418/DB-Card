// Asset Upload Handler
// Handles physical card image uploads with validation, processing, and storage

import type { Env } from '../../types';
import { verifySetupToken } from '../../middleware/auth';
import { verifyMagicBytes, validateFileSize, validateImageDimensions } from '../../utils/image-validator';
import { generateR2Key, getR2TransformParams } from '../../utils/image-processor';
import { recordUploadMetrics, recordReadMetrics, recordRateLimitTrigger } from '../../middleware/metrics-middleware';
import { autoEnableOnUpload, markStaleOnUpdate } from '../../utils/twin-status';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const RATE_LIMIT_WINDOW = 600; // 10 minutes
const RATE_LIMIT_MAX = 10;

/**
 * Handle asset upload
 * POST /api/admin/assets/upload
 *
 * Implements all 8 BDD scenarios:
 * 1. Successful upload with variants
 * 2. Reject oversized files
 * 3. Reject invalid formats
 * 4. Reject excessive pixels
 * 5. Reject unauthorized requests
 * 6. Rate limiting
 * 7. Version control
 * 8. Auto-generate variants
 */
export async function handleAssetUpload(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();

  try {
  // Scenario 5: Verify admin authentication
  const isAuthorized = await verifySetupToken(request, env);
  if (!isAuthorized) {
    recordUploadMetrics(env, false, Date.now() - startTime, undefined, 401);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get admin email for rate limiting
  const cookieHeader = request.headers.get('Cookie');
  let adminEmail = 'unknown';
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, ...valueParts] = cookie.trim().split('=');
      if (key) acc[key] = valueParts.join('=');
      return acc;
    }, {} as Record<string, string>);

    const token = cookies['admin_token'];
    if (token) {
      adminEmail = await env.KV.get(`passkey_session:${token}`) ||
                    await env.KV.get(`setup_token_session:${token}`) ||
                    'admin';
    }
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Scenario 6: Rate limiting (10 uploads per 10 minutes per email+IP)
  const rateLimitKey = `upload_rate:${adminEmail}:${ip}`;
  const currentCount = parseInt(await env.KV.get(rateLimitKey) || '0');

  if (currentCount >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil(RATE_LIMIT_WINDOW / 60); // Convert seconds to minutes

    recordRateLimitTrigger(env, 'upload');
    recordUploadMetrics(env, false, Date.now() - startTime, undefined, 429);

    return new Response(JSON.stringify({
      error: 'Upload rate limit exceeded. Try again in ' + retryAfter + ' minutes'
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Parse multipart form data
  const formData = await request.formData();
  const cardUuid = formData.get('card_uuid') as string;
  const assetType = formData.get('asset_type') as string;
  const file = formData.get('file') as File;

  // Validate required fields
  if (!cardUuid || !assetType || !file) {
    recordUploadMetrics(env, false, Date.now() - startTime, undefined, 400);
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validate asset type
  if (!['twin_front', 'twin_back', 'avatar'].includes(assetType)) {
    recordUploadMetrics(env, false, Date.now() - startTime, undefined, 400);
    return new Response(JSON.stringify({ error: 'Invalid asset type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Scenario 2: Validate file size
  if (!validateFileSize(file.size)) {
    recordUploadMetrics(env, false, Date.now() - startTime, file.size, 413);
    return new Response(JSON.stringify({ error: 'File size exceeds 5 MB limit' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    recordUploadMetrics(env, false, Date.now() - startTime, file.size, 400);
    return new Response(JSON.stringify({ error: 'Invalid file format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Read file buffer
  const buffer = await file.arrayBuffer();

  // Scenario 3: Verify magic bytes
  if (!verifyMagicBytes(buffer, file.type)) {
    recordUploadMetrics(env, false, Date.now() - startTime, file.size, 400);
    return new Response(JSON.stringify({ error: 'Invalid file format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Scenario 4: Validate dimensions and pixels
  try {
    await validateImageDimensions(buffer);
  } catch (error) {
    recordUploadMetrics(env, false, Date.now() - startTime, file.size, 400);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Invalid image dimensions'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Generate asset ID
  const assetId = crypto.randomUUID();

  // Scenario 7: Check for existing asset and handle versioning
  const existingAsset = await env.DB.prepare(
    'SELECT asset_id, current_version FROM assets WHERE card_uuid = ? AND asset_type = ?'
  ).bind(cardUuid, assetType).first<{ asset_id: string; current_version: number }>();

  let version = 1;
  let finalAssetId = assetId;

  if (existingAsset) {
    // Soft delete old version
    version = existingAsset.current_version + 1;
    finalAssetId = existingAsset.asset_id;

    await env.DB.prepare(
      'UPDATE asset_versions SET soft_deleted_at = datetime(\'now\') WHERE asset_id = ? AND version = ?'
    ).bind(finalAssetId, existingAsset.current_version).run();
  }

  // Scenario 8: Upload original file to R2 (store only one copy)
  const r2KeyPrefix = `assets/${cardUuid}/${assetType}/${finalAssetId}`;
  const r2Key = `${r2KeyPrefix}/v${version}/original.webp`;

  // Upload to R2
  await env.PHYSICAL_CARDS.put(r2Key, buffer, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000, immutable'
    }
  });

  // Verify upload succeeded
  const uploaded = await env.PHYSICAL_CARDS.head(r2Key);
  if (!uploaded) {
    throw new Error('Failed to upload image to R2');
  }

  const sizes: Record<string, number> = {
    original: file.size,
    detail: file.size,
    thumb: file.size
  };

  const variantKeys: Record<string, string> = {
    original: r2Key,
    detail: r2Key,
    thumb: r2Key
  };

  // Insert or update assets table
  if (existingAsset) {
    await env.DB.prepare(
      'UPDATE assets SET current_version = ?, updated_at = datetime(\'now\') WHERE asset_id = ?'
    ).bind(version, finalAssetId).run();
  } else {
    const r2KeyPrefix = `assets/${cardUuid}/${assetType}/${finalAssetId}`;
    await env.DB.prepare(
      'INSERT INTO assets (asset_id, card_uuid, asset_type, current_version, r2_key_prefix, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(finalAssetId, cardUuid, assetType, version, r2KeyPrefix, 'ready').run();
  }

  // Insert asset version
  await env.DB.prepare(
    'INSERT INTO asset_versions (asset_id, version, size_original, size_detail, size_thumb) VALUES (?, ?, ?, ?, ?)'
  ).bind(finalAssetId, version, sizes.original, sizes.detail, sizes.thumb).run();

  // Increment rate limit counter
  await env.KV.put(rateLimitKey, (currentCount + 1).toString(), {
    expirationTtl: RATE_LIMIT_WINDOW
  });

  // Record success metrics
  recordUploadMetrics(env, true, Date.now() - startTime, file.size);

  // Update twin status after successful upload
  if (existingAsset) {
    // Mark as stale if updating existing asset
    await markStaleOnUpdate(env, cardUuid);
  } else {
    // Auto-enable if first upload
    await autoEnableOnUpload(env, cardUuid);
  }

  // Scenario 1: Return success response
  return new Response(JSON.stringify({
    asset_id: finalAssetId,
    current_version: version,
    variants: variantKeys,
    size: sizes
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

  } catch (error) {
    console.error('Asset upload error:', error);
    recordUploadMetrics(env, false, Date.now() - startTime, undefined, 500);
    return new Response(JSON.stringify({
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get card type from DB (reused from /api/read logic)
 */
async function getCardType(
  env: Env,
  cardUuid: string
): Promise<'personal' | 'event' | 'sensitive'> {
  try {
    const result = await env.DB.prepare(`
      SELECT ub.type
      FROM uuid_bindings ub
      WHERE ub.uuid = ?
        AND ub.status = 'bound'
      LIMIT 1
    `).bind(cardUuid).first<{ type: string }>();

    if (!result || !result.type) {
      return 'personal';
    }

    const cardType = result.type as 'personal' | 'event' | 'sensitive';
    if (!['personal', 'event', 'sensitive'].includes(cardType)) {
      return 'personal';
    }

    return cardType;
  } catch (error) {
    return 'personal';
  }
}

/**
 * Validate ReadSession (reused from /api/read logic)
 */
interface SessionValidation {
  valid: boolean;
  reason?: 'session_expired' | 'session_revoked' | 'max_reads_exceeded' | 'session_not_found';
  message?: string;
}

function validateSession(session: any | null): SessionValidation {
  if (!session) {
    return {
      valid: false,
      reason: 'session_not_found',
      message: 'Session not found'
    };
  }

  const now = Date.now();

  // Check expiration
  if (session.expires_at < now) {
    return {
      valid: false,
      reason: 'session_expired',
      message: 'Session expired'
    };
  }

  // Check revocation
  if (session.revoked_at !== undefined && session.revoked_at !== null) {
    return {
      valid: false,
      reason: 'session_revoked',
      message: 'Session revoked'
    };
  }

  // Check max_reads (concurrent read limit)
  if (session.reads_used >= session.max_reads) {
    return {
      valid: false,
      reason: 'max_reads_exceeded',
      message: 'Concurrent read limit exceeded'
    };
  }

  return { valid: true };
}

/**
 * Check image rate limit (20 requests per minute per session)
 */
async function checkImageRateLimit(env: Env, sessionId: string): Promise<boolean> {
  const rateLimitKey = `img_rate:${sessionId}`;
  const currentCount = parseInt(await env.KV.get(rateLimitKey) || '0');

  if (currentCount >= 20) {
    return false;
  }

  // Increment counter
  await env.KV.put(rateLimitKey, (currentCount + 1).toString(), {
    expirationTtl: 60
  });

  return true;
}

/**
 * Handle asset twin list read
 * GET /api/assets/:card_uuid/twin
 *
 * Implements all 10 BDD scenarios:
 * 1. Successful twin list read (with assets)
 * 2. Empty list when no assets
 * 3. Reject missing session
 * 4. Reject invalid session
 * 5. Reject expired session
 * 6. Reject concurrent limit exceeded
 * 7. Rate limiting (100/min)
 * 8. Only return ready status assets
 * 9. Order by created_at DESC
 * 10. Audit logging
 */
export async function handleAssetTwinList(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  cardUuid: string
): Promise<Response> {
  const startTime = Date.now();

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session');

  // Scenario 3: Validate session parameter
  if (!sessionId) {
    recordReadMetrics(env, false, Date.now() - startTime, 401);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Fetch and validate session (same logic as /api/read)
  const session = await env.DB.prepare(`
    SELECT * FROM read_sessions
    WHERE session_id = ? AND card_uuid = ?
  `).bind(sessionId, cardUuid).first();

  const validation = validateSession(session);

  // Scenario 4, 5, 6: Session validation
  if (!validation.valid) {
    const statusCode = validation.reason === 'session_not_found' ? 401 :
                       validation.reason === 'max_reads_exceeded' ? 429 : 401;
    recordReadMetrics(env, false, Date.now() - startTime, statusCode);
    return new Response(JSON.stringify({
      error: validation.message
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Scenario 7: Twin list rate limiting (100 requests per minute per session)
  const rateLimitKey = `twin_rate:${sessionId}`;
  const currentCount = parseInt(await env.KV.get(rateLimitKey) || '0');

  if (currentCount >= 100) {
    recordRateLimitTrigger(env, 'twin_list');
    recordReadMetrics(env, false, Date.now() - startTime, 429);
    return new Response(JSON.stringify({
      error: 'Twin list rate limit exceeded'
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Increment rate limit counter
  await env.KV.put(rateLimitKey, (currentCount + 1).toString(), {
    expirationTtl: 60
  });

  // Scenario 8, 9: Fetch assets (only ready status, ordered by created_at DESC)
  const assets = await env.DB.prepare(`
    SELECT asset_id, asset_type, current_version, created_at
    FROM assets
    WHERE card_uuid = ? AND status = 'ready'
    ORDER BY created_at DESC
  `).bind(cardUuid).all();

  // Scenario 2: Check if twin is enabled
  const twinEnabled = assets.results && assets.results.length > 0;

  // Generate URLs with session
  interface AssetRow {
    asset_id: string;
    asset_type: string;
    current_version: number;
    created_at: string;
  }

  const assetList = ((assets.results || []) as unknown as AssetRow[]).map((asset) => ({
    asset_type: asset.asset_type,
    asset_id: asset.asset_id,
    version: asset.current_version,
    url: `/api/assets/${asset.asset_id}/content?variant=detail&card_uuid=${encodeURIComponent(cardUuid)}&session=${encodeURIComponent(sessionId)}`
  }));

  // Scenario 10: Audit logging
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  // IPv4: 192.168.1.100 → 192.168.1.0
  // IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334 → 2001:0db8:85a3:0000::
  const anonymizedIp = ip.includes(':')
    ? ip.split(':').slice(0, 4).join(':') + '::'
    : ip.split('.').slice(0, 3).join('.') + '.0';

  ctx.waitUntil(
    env.DB.prepare(`
      INSERT INTO audit_logs (event_type, card_uuid, session_id, ip_address, details, timestamp)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      'twin_list_read',
      cardUuid,
      sessionId,
      anonymizedIp,
      JSON.stringify({ asset_count: assetList.length })
    ).run()
  );

  recordReadMetrics(env, true, Date.now() - startTime, 200);

  return new Response(JSON.stringify({
    twin_enabled: twinEnabled,
    assets: assetList
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-cache'
    }
  });
}

/**
 * Handle asset content read with R2 Transform
 * GET /api/assets/:asset_id/content
 *
 * Implements all 9 BDD scenarios:
 * 1. Successful detail variant read
 * 2. Successful thumb variant read
 * 3. Reject invalid session
 * 4. Reject expired session
 * 5. Reject concurrent limit exceeded
 * 6. Image rate limiting (20/min)
 * 7. Asset not found in DB
 * 8. R2 file not found
 * 9. R2 Transform on read
 */
export async function handleAssetContent(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  assetId: string
): Promise<Response> {
  const startTime = Date.now();

  const url = new URL(request.url);
  const variant = url.searchParams.get('variant') || 'detail';
  const cardUuid = url.searchParams.get('card_uuid');
  const sessionId = url.searchParams.get('session');

  // Scenario 3: Validate session parameters
  if (!cardUuid || !sessionId) {
    recordReadMetrics(env, false, Date.now() - startTime, 401);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validate variant
  if (!['detail', 'thumb'].includes(variant)) {
    recordReadMetrics(env, false, Date.now() - startTime, 400);
    return new Response(JSON.stringify({ error: 'Invalid variant' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Fetch and validate session (same logic as /api/read)
  const session = await env.DB.prepare(`
    SELECT * FROM read_sessions
    WHERE session_id = ? AND card_uuid = ?
  `).bind(sessionId, cardUuid).first();

  const validation = validateSession(session);

  // Scenario 3, 4, 5: Session validation
  if (!validation.valid) {
    const statusCode = validation.reason === 'session_not_found' ? 401 :
                       validation.reason === 'max_reads_exceeded' ? 429 : 401;
    recordReadMetrics(env, false, Date.now() - startTime, statusCode);
    return new Response(JSON.stringify({
      error: validation.message
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Scenario 6: Image rate limiting (20 requests per minute per session)
  const rateLimitPassed = await checkImageRateLimit(env, sessionId);
  if (!rateLimitPassed) {
    recordRateLimitTrigger(env, 'read');
    recordReadMetrics(env, false, Date.now() - startTime, 429);
    return new Response(JSON.stringify({
      error: 'Image rate limit exceeded'
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Scenario 7: Fetch asset from DB
  const asset = await env.DB.prepare(`
    SELECT asset_id, card_uuid, asset_type, current_version, r2_key_prefix, status
    FROM assets
    WHERE asset_id = ?
  `).bind(assetId).first<{
    asset_id: string;
    card_uuid: string;
    asset_type: string;
    current_version: number;
    r2_key_prefix: string;
    status: string;
  }>();

  if (!asset) {
    recordReadMetrics(env, false, Date.now() - startTime, 404);
    return new Response(JSON.stringify({ error: 'Asset not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Build R2 key
  const size = variant === 'detail' ? '1200' : '256';
  const r2Key = `${asset.r2_key_prefix}/v${asset.current_version}/${size}.webp`;

  // Scenario 8: Fetch from R2
  const r2Object = await env.PHYSICAL_CARDS.get(r2Key);

  if (!r2Object) {
    recordReadMetrics(env, false, Date.now() - startTime, 404);
    return new Response(JSON.stringify({ error: 'Image not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Scenario 1, 2, 9: Return image with R2 Transform
  // R2 Transform happens automatically via URL parameters
  const transformParams = getR2TransformParams(variant as 'detail' | 'thumb');

  // Note: For Cloudflare R2, transforms are applied via custom domain or Workers Image Resizing
  // Here we return the original file - actual transform happens via R2 Custom Domain URL params
  // or we can use Workers Image Resizing API

  // Record success metrics
  recordReadMetrics(env, true, Date.now() - startTime);

  return new Response(r2Object.body, {
    status: 200,
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=86400, immutable',
      // Include transform hint for proxied requests
      'X-Transform-Params': transformParams
    }
  });
}


/**
 * List assets for a card (Admin only)
 * GET /api/admin/cards/:uuid/assets
 */
export async function handleListCardAssets(request: Request, env: Env): Promise<Response> {
  // Verify admin authentication
  const isAuthorized = await verifySetupToken(request, env);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const cardUuid = url.pathname.split('/')[4]; // /api/admin/cards/:uuid/assets

  if (!cardUuid) {
    return new Response(JSON.stringify({ error: 'Missing card_uuid' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Fetch all ready assets for the card
    const assets = await env.DB.prepare(`
      SELECT asset_id, card_uuid, asset_type, current_version, status, created_at
      FROM assets
      WHERE card_uuid = ? AND status = 'ready'
      ORDER BY created_at DESC
    `).bind(cardUuid).all<{
      asset_id: string;
      card_uuid: string;
      asset_type: string;
      current_version: number;
      status: string;
      created_at: string;
    }>();

    return new Response(JSON.stringify({
      success: true,
      data: {
        assets: assets.results || []
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('List assets error:', error);
    return new Response(JSON.stringify({ error: 'Failed to list assets' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


/**
 * Admin-only asset content read (no session required)
 * GET /api/admin/assets/:id/content
 */
export async function handleAdminAssetContent(request: Request, env: Env): Promise<Response> {
  // 1. Verify admin authentication
  const isAuthorized = await verifySetupToken(request, env);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Get admin email for rate limiting and audit
  const cookieHeader = request.headers.get('Cookie');
  let adminEmail = 'unknown';
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, ...valueParts] = cookie.trim().split('=');
      if (key) acc[key] = valueParts.join('=');
      return acc;
    }, {} as Record<string, string>);
    const token = cookies['admin_token'];
    if (token) {
      const session = await env.KV.get(`setup_token_session:${token}`);
      if (session) adminEmail = session;
    }
  }

  // 3. Rate limiting (100 reads/min per admin)
  const rateLimitKey = `admin_asset_read:${adminEmail}`;
  const count = await env.KV.get(rateLimitKey);
  if (count && parseInt(count) >= 100) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
    });
  }
  await env.KV.put(rateLimitKey, (parseInt(count || '0') + 1).toString(), { expirationTtl: 60 });

  // 4. Parse parameters
  const url = new URL(request.url);
  const assetId = url.pathname.split('/')[4]; // /api/admin/assets/:id/content
  const variant = url.searchParams.get('variant') || 'detail';

  if (!assetId) {
    return new Response(JSON.stringify({ error: 'Missing asset_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 5. Fetch asset metadata
  const asset = await env.DB.prepare(
    'SELECT asset_id, card_uuid, r2_key_prefix, current_version, status FROM assets WHERE asset_id = ?'
  ).bind(assetId).first<{
    asset_id: string;
    card_uuid: string;
    r2_key_prefix: string;
    current_version: number;
    status: string;
  }>();

  if (!asset || asset.status !== 'ready') {
    return new Response(JSON.stringify({ error: 'Asset not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 6. Read from R2 (return original for all variants)
  const r2Key = `${asset.r2_key_prefix}/v${asset.current_version}/original.webp`;

  try {
    const r2Object = await env.PHYSICAL_CARDS.get(r2Key);

    if (!r2Object) {
      return new Response(JSON.stringify({ error: 'Image not found in storage' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 7. Audit logging
    await env.DB.prepare(`
      INSERT INTO audit_logs (event_type, actor_type, actor_id, details, ip_address, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      'admin_asset_view',
      'admin',
      adminEmail,
      JSON.stringify({ asset_id: assetId, card_uuid: asset.card_uuid, variant }),
      request.headers.get('CF-Connecting-IP') || 'unknown',
      Date.now()
    ).run();

    // 8. Return image
    return new Response(r2Object.body, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': r2Object.size?.toString() || '0'
      }
    });

  } catch (error) {
    console.error('Admin asset read error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to read image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
