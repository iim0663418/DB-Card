// Admin Cards Handler
// POST /api/admin/cards - Create a new business card

import type { Env, CardData, CardType } from '../../types';
import { CARD_POLICIES } from '../../types';
import { verifySetupToken } from '../../middleware/auth';
import { EnvelopeEncryption } from '../../crypto/envelope';
import { logEvent } from '../../utils/audit';
import { jsonResponse, errorResponse, adminErrorResponse } from '../../utils/response';
import { validateSocialLink } from '../../utils/social-link-validation';
import { invalidateCardCaches } from '../../utils/cache';

/**
 * Validate email format using RFC 5322 simplified regex
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate BilingualString format
 */
function validateBilingualString(value: any): boolean {
  // Single language (string)
  if (typeof value === 'string') return true;
  
  // Bilingual (object with zh and en)
  if (typeof value === 'object' && value !== null) {
    return typeof value.zh === 'string' && typeof value.en === 'string';
  }
  
  return false;
}

/**
 * Validate BilingualStringArray format
 */
function validateBilingualStringArray(value: any): boolean {
  // Single language (string array)
  if (Array.isArray(value)) {
    return value.every(item => typeof item === 'string');
  }
  
  // Bilingual (object with zh and en arrays)
  if (typeof value === 'object' && value !== null) {
    return Array.isArray(value.zh) && Array.isArray(value.en) &&
           value.zh.every((item: any) => typeof item === 'string') &&
           value.en.every((item: any) => typeof item === 'string');
  }
  
  return false;
}

/**
 * Validate cardData according to BDD spec
 *
 * Required fields:
 * - name: BilingualString (1-100 characters)
 * - email: valid email format
 *
 * Optional fields:
 * - title, phone, department, organization, etc.
 */
function validateCardData(cardData: any): { valid: boolean; error?: string } {
  // Check if cardData exists
  if (!cardData || typeof cardData !== 'object') {
    return { valid: false, error: '缺少 cardData' };
  }

  // Validate name (required, supports bilingual)
  if (!cardData.name) {
    return { valid: false, error: '缺少必要欄位: name' };
  }

  if (!validateBilingualString(cardData.name)) {
    return { valid: false, error: 'name 格式無效（必須為字串或 {zh, en} 物件）' };
  }

  // Validate name length
  if (typeof cardData.name === 'string') {
    if (cardData.name.length < 1 || cardData.name.length > 100) {
      return { valid: false, error: 'name 必須為 1-100 字元' };
    }
  } else if (typeof cardData.name === 'object') {
    if (cardData.name.zh.length < 1 || cardData.name.zh.length > 100) {
      return { valid: false, error: 'name.zh 必須為 1-100 字元' };
    }
    if (cardData.name.en.length < 1 || cardData.name.en.length > 100) {
      return { valid: false, error: 'name.en 必須為 1-100 字元' };
    }
  }

  // Validate email (required)
  if (!cardData.email) {
    return { valid: false, error: '缺少必要欄位: email' };
  }

  if (typeof cardData.email !== 'string' || !isValidEmail(cardData.email)) {
    return { valid: false, error: 'email 格式無效' };
  }

  // Validate title if provided (supports bilingual)
  if (cardData.title !== undefined && !validateBilingualString(cardData.title)) {
    return { valid: false, error: 'title 格式無效（必須為字串或 {zh, en} 物件）' };
  }

  // Validate department if provided (supports bilingual)
  if (cardData.department !== undefined && !validateBilingualString(cardData.department)) {
    return { valid: false, error: 'department 格式無效（必須為字串或 {zh, en} 物件）' };
  }

  // Validate organization if provided (supports bilingual)
  if (cardData.organization !== undefined && !validateBilingualString(cardData.organization)) {
    return { valid: false, error: 'organization 格式無效（必須為字串或 {zh, en} 物件）' };
  }

  // Validate greetings if provided (supports bilingual)
  if (cardData.greetings !== undefined && !validateBilingualStringArray(cardData.greetings)) {
    return { valid: false, error: 'greetings 格式無效（必須為字串陣列或 {zh: [], en: []} 物件）' };
  }


  // Validate social links if provided
  const socialFields = ["social_github", "social_linkedin", "social_facebook", "social_instagram", "social_twitter", "social_youtube"];
  for (const field of socialFields) {
    if (cardData[field] !== undefined && cardData[field] !== null && cardData[field] !== "") {
      if (!validateSocialLink(cardData[field])) {
        return { valid: false, error: `${field} URL 格式無效或包含不安全內容` };
      }
    }
  }

  return { valid: true };
}

/**
 * Validate cardData for update (partial fields allowed)
 *
 * At least one field must be provided:
 * - name: BilingualString (optional)
 * - email: valid email format (optional)
 *
 * Other optional fields:
 * - title, phone, department, organization, etc.
 */
function validateUpdateCardData(cardData: any): { valid: boolean; error?: string } {
  // Check if cardData exists
  if (!cardData || typeof cardData !== 'object') {
    return { valid: false, error: '缺少 cardData' };
  }

  // At least one field must be provided
  const hasFields = Object.keys(cardData).length > 0;
  if (!hasFields) {
    return { valid: false, error: 'cardData 至少包含一個欄位' };
  }

  // Validate name if provided (supports bilingual)
  if (cardData.name !== undefined) {
    if (!validateBilingualString(cardData.name)) {
      return { valid: false, error: 'name 格式無效（必須為字串或 {zh, en} 物件）' };
    }
    if (typeof cardData.name === 'string') {
      if (cardData.name.length < 1 || cardData.name.length > 100) {
        return { valid: false, error: 'name 必須為 1-100 字元' };
      }
    } else if (typeof cardData.name === 'object') {
      if (cardData.name.zh.length < 1 || cardData.name.zh.length > 100) {
        return { valid: false, error: 'name.zh 必須為 1-100 字元' };
      }
      if (cardData.name.en.length < 1 || cardData.name.en.length > 100) {
        return { valid: false, error: 'name.en 必須為 1-100 字元' };
      }
    }
  }

  // Validate email if provided
  if (cardData.email !== undefined) {
    if (typeof cardData.email !== 'string' || !isValidEmail(cardData.email)) {
      return { valid: false, error: 'Email 格式無效' };
    }
  }

  // Validate title if provided (supports bilingual)
  if (cardData.title !== undefined && !validateBilingualString(cardData.title)) {
    return { valid: false, error: 'title 格式無效（必須為字串或 {zh, en} 物件）' };
  }

  // Validate department if provided (supports bilingual)
  if (cardData.department !== undefined && !validateBilingualString(cardData.department)) {
    return { valid: false, error: 'department 格式無效（必須為字串或 {zh, en} 物件）' };
  }

  // Validate greetings if provided (supports bilingual)
  if (cardData.greetings !== undefined && !validateBilingualStringArray(cardData.greetings)) {
    return { valid: false, error: 'greetings 格式無效（必須為字串陣列或 {zh: [], en: []} 物件）' };
  }


  // Validate social links if provided
  const socialFields = ["social_github", "social_linkedin", "social_facebook", "social_instagram", "social_twitter", "social_youtube"];
  for (const field of socialFields) {
    if (cardData[field] !== undefined && cardData[field] !== null && cardData[field] !== "") {
      if (!validateSocialLink(cardData[field])) {
        return { valid: false, error: `${field} URL 格式無效或包含不安全內容` };
      }
    }
  }

  return { valid: true };
}

/**
 * Validate cardType according to BDD spec
 */
function validateCardType(cardType: any): { valid: boolean; error?: string } {
  const validTypes: CardType[] = ['personal', 'event_booth', 'sensitive'];

  if (!cardType) {
    return { valid: false, error: '缺少 cardType' };
  }

  if (!validTypes.includes(cardType)) {
    return {
      valid: false,
      error: 'cardType 必須為 personal, event_booth 或 sensitive'
    };
  }

  return { valid: true };
}

/**
 * Get the latest KEK version from kek_versions table
 */
async function getLatestKekVersion(env: Env): Promise<number> {
  try {
    const result = await env.DB.prepare(`
      SELECT version FROM kek_versions
      WHERE status = 'active'
      ORDER BY version DESC
      LIMIT 1
    `).first<{ version: number }>();

    if (!result) {
      // If no KEK version exists, default to version 1
      console.warn('No active KEK version found, using default version 1');
      return 1;
    }

    return result.version;
  } catch (error) {
    console.error('Error fetching KEK version:', error);
    // Fallback to version 1 on error
    return 1;
  }
}

/**
 * Handle POST /api/admin/cards
 *
 * BDD Scenarios:
 * - Scenario 1: Success - Create card with valid data
 * - Scenario 2: 401 - Missing Authorization header
 * - Scenario 3: 403 - Invalid token
 * - Scenario 4: 400 - Missing required field
 * - Scenario 5: 400 - Invalid cardType
 */
export async function handleCreateCard(request: Request, env: Env): Promise<Response> {
  try {
    // Scenario 2 & 3: Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      // Check if Authorization header exists
      const authHeader = request.headers.get('Authorization');

      if (!authHeader) {
        // Scenario 2: Missing token - use admin error response
        return adminErrorResponse('Authentication required', 401, request);
      } else {
        // Scenario 3: Invalid token - use admin error response
        return adminErrorResponse('Invalid token', 403, request);
      }
    }

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return errorResponse('invalid_request', '無效的 JSON 格式', 400, request);
    }

    const { cardData, cardType } = body;

    // Scenario 4: Validate cardData
    const cardDataValidation = validateCardData(cardData);
    if (!cardDataValidation.valid) {
      return errorResponse('invalid_request', cardDataValidation.error!, 400, request);
    }

    // Scenario 5: Validate cardType
    const cardTypeValidation = validateCardType(cardType);
    if (!cardTypeValidation.valid) {
      return errorResponse('invalid_card_type', cardTypeValidation.error!, 400, request);
    }

    // Scenario 1: Success path
    // Generate UUID v4
    const uuid = crypto.randomUUID();

    // Initialize encryption
    const encryption = new EnvelopeEncryption();
    await encryption.initialize(env);

    // Encrypt card data
    const { encrypted_payload, wrapped_dek } = await encryption.encryptCard(cardData);

    // Get latest KEK version
    const keyVersion = await getLatestKekVersion(env);

    // Insert into cards table
    const timestamp = Date.now();

    await env.DB.prepare(`
      INSERT INTO cards (
        uuid, encrypted_payload, wrapped_dek,
        key_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      uuid,
      encrypted_payload,
      wrapped_dek,
      keyVersion,
      timestamp,
      timestamp
    ).run();

    // Log audit event (card_create)
    await logEvent(
      env,
      'card_create',
      request,
      uuid,
      undefined,
      {
        card_type: cardType,
        key_version: keyVersion
      }
    );

    // Return success response (201 Created)
    return jsonResponse(
      {
        uuid,
        card_type: cardType,
        created_at: timestamp
      },
      201,
      request
    );
  } catch (error) {
    console.error('Error creating card:', error);

    // Return generic error
    return errorResponse(
      'internal_error',
      '創建名片時發生錯誤',
      500,
      request
    );
  }
}

/**
 * Revoke all active ReadSessions for a card
 * Returns the number of sessions revoked
 */
async function revokeAllCardSessions(
  env: Env,
  card_uuid: string,
  reason: 'card_updated' | 'card_deleted' | 'admin_revoke' | 'permanent_delete'
): Promise<number> {
  try {
    // Update all non-revoked sessions for this card
    const result = await env.DB.prepare(`
      UPDATE read_sessions
      SET revoked_at = ?, revoked_reason = ?
      WHERE card_uuid = ? AND revoked_at IS NULL
    `).bind(Date.now(), reason, card_uuid).run();

    // Return the number of rows affected
    return result.meta.changes || 0;
  } catch (error) {
    console.error('Error revoking card sessions:', error);
    return 0;
  }
}

/**
 * Handle DELETE /api/admin/cards/:uuid
 *
 * BDD Scenarios:
 * - Scenario 1: Success - Delete card (soft delete)
 * - Scenario 2: 404 - Card not found
 * - Scenario 3: 200 - Card already deleted (idempotent)
 * - Scenario 4: 401 - Unauthorized (missing token)
 */
export async function handleDeleteCard(
  request: Request,
  env: Env,
  uuid: string
): Promise<Response> {
  try {
    // Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return adminErrorResponse('Authentication required', 401, request);
      } else {
        return adminErrorResponse('Invalid token', 403, request);
      }
    }

    // Check for permanent delete flag
    const url = new URL(request.url);
    const permanent = url.searchParams.get('permanent') === 'true';

    // Check if card exists
    const card = await env.DB.prepare(`
      SELECT uuid FROM cards WHERE uuid = ?
    `).bind(uuid).first<{ uuid: string }>();

    if (!card) {
      return errorResponse('card_not_found', '名片不存在', 404, request);
    }

    // Check uuid_bindings status
    const binding = await env.DB.prepare(`
      SELECT status FROM uuid_bindings WHERE uuid = ?
    `).bind(uuid).first<{ status: string }>();

    if (!binding) {
      return errorResponse('binding_not_found', '綁定不存在', 404, request);
    }

    // Permanent delete
    if (permanent) {
      // Only allow permanent delete for revoked cards
      if (binding.status !== 'revoked') {
        return errorResponse('must_revoke_first', '請先撤銷名片再執行永久刪除', 400, request);
      }

      // Revoke all sessions first
      await revokeAllCardSessions(env, uuid, 'permanent_delete');

      // Delete from database
      await env.DB.batch([
        env.DB.prepare('DELETE FROM cards WHERE uuid = ?').bind(uuid),
        env.DB.prepare('DELETE FROM uuid_bindings WHERE uuid = ?').bind(uuid)
      ]);

      // Clear KV cache
      await env.KV.delete(`card:${uuid}`);

      // Invalidate all related caches
      await invalidateCardCaches(env, uuid);

      // Log audit event
      await logEvent(env, 'card_permanent_delete', request, uuid, undefined, {
        action: 'permanent_delete'
      });

      return jsonResponse({
        uuid,
        status: 'deleted',
        message: '名片已永久刪除'
      }, 200, request);
    }

    // Regular revoke (existing logic)
    // Idempotent: already revoked
    if (binding.status === 'revoked') {
      return jsonResponse({
        uuid,
        status: 'revoked',
        message: '名片已撤銷'
      }, 200, request);
    }

    // Revoke the card (update uuid_bindings)
    await env.DB.prepare(`
      UPDATE uuid_bindings
      SET status = 'revoked'
      WHERE uuid = ?
    `).bind(uuid).run();

    // Revoke all associated ReadSessions
    const sessionsRevoked = await revokeAllCardSessions(env, uuid, 'admin_revoke');

    // Log audit event
    await logEvent(env, 'card_revoke', request, uuid, undefined, {
      sessions_revoked: sessionsRevoked
    });

    return jsonResponse({
      uuid,
      status: 'revoked',
      sessions_revoked: sessionsRevoked
    }, 200, request);
  } catch (error) {
    console.error('Error revoking card:', error);
    return errorResponse(
      'internal_error',
      '刪除名片時發生錯誤',
      500,
      request
    );
  }
}

/**
 * Handle PUT /api/admin/cards/:uuid
 *
 * BDD Scenarios:
 * - Scenario 1: Success - Update card with valid data
 * - Scenario 2: 404 - Card not found
 * - Scenario 3: 403 - Card already deleted
 * - Scenario 4: 401 - Unauthorized (missing token)
 * - Scenario 5: 400 - Invalid update data
 */
export async function handleUpdateCard(
  request: Request,
  env: Env,
  uuid: string
): Promise<Response> {
  try {
    // Scenario 4: Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      // Check if Authorization header exists
      const authHeader = request.headers.get('Authorization');

      if (!authHeader) {
        // Scenario 4: Missing token
        return adminErrorResponse('Authentication required', 401, request);
      } else {
        // Invalid token
        return adminErrorResponse('Invalid token', 403, request);
      }
    }

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return errorResponse('invalid_request', '無效的 JSON 格式', 400, request);
    }

    const { cardData } = body;

    // Scenario 5: Validate cardData
    const cardDataValidation = validateUpdateCardData(cardData);
    if (!cardDataValidation.valid) {
      return errorResponse('invalid_request', cardDataValidation.error!, 400, request);
    }

    // Check if card exists
    const card = await env.DB.prepare(`
      SELECT uuid, encrypted_payload, wrapped_dek, key_version
      FROM cards
      WHERE uuid = ?
    `).bind(uuid).first<{
      uuid: string;
      encrypted_payload: string;
      wrapped_dek: string;
      key_version: number;
    }>();

    if (!card) {
      return errorResponse('card_not_found', '名片不存在', 404, request);
    }

    // Initialize encryption
    const encryption = new EnvelopeEncryption();
    await encryption.initialize(env);

    // Encrypt new card data with a new DEK
    const { encrypted_payload, wrapped_dek } = await encryption.encryptCard(cardData);

    // Get latest KEK version
    const keyVersion = await getLatestKekVersion(env);

    // Update cards table with new encrypted data
    const timestamp = Date.now();

    await env.DB.prepare(`
      UPDATE cards
      SET encrypted_payload = ?,
          wrapped_dek = ?,
          key_version = ?,
          updated_at = ?
      WHERE uuid = ?
    `).bind(
      encrypted_payload,
      wrapped_dek,
      keyVersion,
      timestamp,
      uuid
    ).run();

    await env.KV.delete(`card:${uuid}`);

    // Invalidate all related caches
    await invalidateCardCaches(env, uuid);

    // Revoke all associated ReadSessions
    const sessionsRevoked = await revokeAllCardSessions(env, uuid, 'card_updated');

    // Log audit event (card_update)
    await logEvent(
      env,
      'card_update',
      request,
      uuid,
      undefined,
      {
        key_version: keyVersion,
        sessions_revoked: sessionsRevoked
      }
    );

    // Return success response (200 OK)
    return jsonResponse(
      {
        uuid,
        updated_at: timestamp,
        sessions_revoked: sessionsRevoked
      },
      200,
      request
    );
  } catch (error) {
    console.error('Error updating card:', error);

    // Return generic error
    return errorResponse(
      'internal_error',
      '更新名片時發生錯誤',
      500,
      request
    );
  }
}

/**
 * Handle GET /api/admin/cards - List all cards
 *
 * BDD Scenarios:
 * - Scenario 1: Success - Return all non-deleted cards
 * - Scenario 2: 401 - Unauthorized (missing token)
 */
export async function handleListCards(request: Request, env: Env): Promise<Response> {
  try {
    // Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      // Check if Authorization header exists
      const authHeader = request.headers.get('Authorization');

      if (!authHeader) {
        return adminErrorResponse('Authentication required', 401, request);
      } else {
        return adminErrorResponse('Invalid token', 403, request);
      }
    }

    // Query all cards with binding status
    const cards = await env.DB.prepare(`
      SELECT
        c.uuid, c.encrypted_payload, c.wrapped_dek,
        c.key_version, c.created_at, c.updated_at,
        c.total_sessions,
        b.type as card_type,
        b.status as card_status
      FROM cards c
      INNER JOIN uuid_bindings b ON c.uuid = b.uuid
      WHERE b.status IN ('bound', 'revoked')
      ORDER BY c.created_at DESC
    `).all();

    if (!cards.results) {
      return jsonResponse({
        cards: [],
        total: 0
      }, 200, request);
    }

    // Initialize encryption for decryption
    const encryption = new EnvelopeEncryption();
    await encryption.initialize(env);

    // Generate date keys for KV queries
    const now = new Date();
    const today = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const thisMonth = now.toISOString().slice(0, 7).replace(/-/g, ''); // YYYYMM

    // Batch query all KV counters for all cards
    const kvKeys = cards.results.flatMap((card: any) => [
      `session:budget:${card.uuid}:daily:${today}`,
      `session:budget:${card.uuid}:monthly:${thisMonth}`
    ]);

    const kvResults = await Promise.all(
      kvKeys.map(key => env.KV.get(key))
    );

    // Build a map for quick lookup
    const kvMap = new Map<string, number>();
    kvKeys.forEach((key, idx) => {
      const value = kvResults[idx];
      kvMap.set(key, value ? parseInt(value, 10) : 0);
    });

    // Decrypt each card's data
    const decryptedCards = await Promise.all(
      cards.results.map(async (card: any) => {
        try {
          const cardData = await encryption.decryptCard(
            card.encrypted_payload,
            card.wrapped_dek
          );

          // Get limits for this card type
          const limits = CARD_POLICIES[card.card_type as CardType];

          // Get usage from all three dimensions
          const dailyUsed = kvMap.get(`session:budget:${card.uuid}:daily:${today}`) ?? 0;
          const monthlyUsed = kvMap.get(`session:budget:${card.uuid}:monthly:${thisMonth}`) ?? 0;
          const totalUsed = card.total_sessions ?? 0;

          // Calculate percentages for all three dimensions
          const dailyPercentage = Math.round((dailyUsed / limits.max_sessions_per_day) * 100);
          const monthlyPercentage = Math.round((monthlyUsed / limits.max_sessions_per_month) * 100);
          const totalPercentage = Math.round((totalUsed / limits.max_total_sessions) * 100);

          // Determine overall status based on highest percentage
          const maxPercentage = Math.max(dailyPercentage, monthlyPercentage, totalPercentage);
          let budgetStatus: 'normal' | 'warning' | 'critical' = 'normal';
          if (maxPercentage >= 95) budgetStatus = 'critical';
          else if (maxPercentage >= 80) budgetStatus = 'warning';

          return {
            uuid: card.uuid,
            card_type: card.card_type,
            status: card.card_status,
            data: cardData,
            budget: {
              daily_used: dailyUsed,
              daily_limit: limits.max_sessions_per_day,
              monthly_used: monthlyUsed,
              monthly_limit: limits.max_sessions_per_month,
              total_used: totalUsed,
              total_limit: limits.max_total_sessions,
              status: budgetStatus,
              percentage: maxPercentage
            },
            created_at: new Date(card.created_at).toISOString(),
            updated_at: new Date(card.updated_at).toISOString()
          };
        } catch (error) {
          console.error(`Error decrypting card ${card.uuid}:`, error);
          // Return error card for debugging
          return {
            uuid: card.uuid,
            card_type: card.card_type,
            status: card.binding_status || card.card_status,
            data: { name: { zh: '解密失敗', en: 'Decryption Failed' }, email: 'error@example.com' },
            budget: {
              daily_used: 0,
              daily_limit: 10,
              monthly_used: 0,
              monthly_limit: 100,
              total_used: 0,
              total_limit: 1000,
              status: 'normal',
              percentage: 0
            },
            created_at: new Date(card.created_at).toISOString(),
            updated_at: new Date(card.updated_at).toISOString(),
            error: String(error)
          };
        }
      })
    );

    // Return all cards (including errors for debugging)
    const validCards = decryptedCards;

    // Return success response
    return jsonResponse({
      cards: validCards,
      total: validCards.length
    }, 200, request);
  } catch (error) {
    console.error('Error listing cards:', error);

    return errorResponse(
      'internal_error',
      '列出名片時發生錯誤',
      500,
      request
    );
  }
}

/**
 * Handle GET /api/admin/cards/:uuid - Get single card
 *
 * BDD Scenarios:
 * - Scenario 1: Success - Return single card with decrypted data
 * - Scenario 2: 404 - Card not found
 * - Scenario 3: 404 - Card deleted
 * - Scenario 4: 401 - Unauthorized (missing token)
 */
export async function handleGetCard(
  request: Request,
  env: Env,
  uuid: string
): Promise<Response> {
  try {
    // Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      // Check if Authorization header exists
      const authHeader = request.headers.get('Authorization');

      if (!authHeader) {
        return adminErrorResponse('Authentication required', 401, request);
      } else {
        return adminErrorResponse('Invalid token', 403, request);
      }
    }

    // Query card with binding info
    const result = await env.DB.prepare(`
      SELECT 
        c.uuid, c.encrypted_payload, c.wrapped_dek,
        c.key_version, c.created_at, c.updated_at,
        b.type as card_type,
        b.status as card_status
      FROM cards c
      INNER JOIN uuid_bindings b ON c.uuid = b.uuid
      WHERE c.uuid = ?
    `).bind(uuid).first<{
      uuid: string;
      encrypted_payload: string;
      wrapped_dek: string;
      key_version: number;
      created_at: number;
      updated_at: number;
      card_type: string;
      card_status: string;
    }>();

    if (!result) {
      return errorResponse('not_found', '名片不存在', 404, request);
    }

    // Initialize encryption for decryption
    const encryption = new EnvelopeEncryption();
    await encryption.initialize(env);

    // Decrypt card data
    const cardData = await encryption.decryptCard(
      result.encrypted_payload,
      result.wrapped_dek
    );

    // Return success response
    return jsonResponse({
      uuid: result.uuid,
      card_type: result.card_type,
      status: result.card_status,
      data: cardData,
      created_at: new Date(result.created_at).toISOString(),
      updated_at: new Date(result.updated_at).toISOString()
    }, 200, request);
  } catch (error) {
    console.error('Error getting card:', error);

    return errorResponse(
      'internal_error',
      '取得名片時發生錯誤',
      500,
      request
    );
  }
}

/**
 * Handle POST /api/admin/cards/:uuid/restore
 * Restore a revoked card
 */
export async function handleRestoreCard(
  request: Request,
  env: Env,
  uuid: string
): Promise<Response> {
  try {
    // Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return adminErrorResponse('Authentication required', 401, request);
      } else {
        return adminErrorResponse('Invalid token', 403, request);
      }
    }

    // Check if card exists
    const card = await env.DB.prepare(`
      SELECT uuid FROM cards WHERE uuid = ?
    `).bind(uuid).first<{ uuid: string }>();

    if (!card) {
      return errorResponse('card_not_found', '名片不存在', 404, request);
    }

    // Check uuid_bindings status
    const binding = await env.DB.prepare(`
      SELECT status FROM uuid_bindings WHERE uuid = ?
    `).bind(uuid).first<{ status: string }>();

    if (!binding) {
      return errorResponse('binding_not_found', '綁定不存在', 404, request);
    }

    // Can only restore revoked cards
    if (binding.status !== 'revoked') {
      return errorResponse('invalid_status', `無法恢復狀態為 ${binding.status} 的名片`, 400, request);
    }

    // Restore the card
    await env.DB.prepare(`
      UPDATE uuid_bindings
      SET status = 'bound'
      WHERE uuid = ?
    `).bind(uuid).run();

    // Log audit event
    await logEvent(env, 'card_restore', request, uuid, undefined, {
      previous_status: 'revoked'
    });

    return jsonResponse({
      uuid,
      status: 'bound',
      message: '名片已恢復'
    }, 200, request);
  } catch (error) {
    console.error('Error restoring card:', error);
    return errorResponse('internal_error', '恢復名片時發生錯誤', 500, request);
  }
}

/**
 * Reset session budget for a card
 * POST /api/admin/cards/:uuid/reset-budget
 */
export async function handleResetBudget(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  card_uuid: string
): Promise<Response> {
  try {
    // Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return adminErrorResponse('Authentication required', 401, request);
      } else {
        return adminErrorResponse('Invalid token', 403, request);
      }
    }

    // 1. Verify card exists
    const card = await env.DB.prepare('SELECT uuid FROM cards WHERE uuid = ?').bind(card_uuid).first();
    if (!card) {
      return errorResponse('card_not_found', '名片不存在', 404, request);
    }

    // 2. Reset total_sessions
    await env.DB.prepare('UPDATE cards SET total_sessions = 0 WHERE uuid = ?').bind(card_uuid).run();

    // 3. Clear KV counters
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const month = new Date().toISOString().slice(0, 7).replace(/-/g, '');
    await env.KV.delete(`session:budget:${card_uuid}:daily:${today}`);
    await env.KV.delete(`session:budget:${card_uuid}:monthly:${month}`);

    // 4. Audit log
    ctx.waitUntil(
      env.DB.prepare('INSERT INTO audit_logs (event_type, actor_type, target_uuid, ip_address, details, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(
        'card_budget_reset',
        'admin',
        card_uuid,
        request.headers.get('CF-Connecting-IP')?.split('.').slice(0, 3).join('.') || 'unknown',
        JSON.stringify({ reset_at: Date.now() }),
        Date.now()
      ).run()
    );

    return jsonResponse({ card_uuid, total_sessions: 0, reset_at: new Date().toISOString() }, 200, request);
  } catch (error) {
    console.error('Error resetting budget:', error);
    return errorResponse('internal_error', '重置使用次數時發生錯誤', 500, request);
  }
}
