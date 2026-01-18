// Admin Cards Handler
// POST /api/admin/cards - Create a new business card

import type { Env, CardData, CardType } from '../../types';
import { verifySetupToken } from '../../middleware/auth';
import { EnvelopeEncryption } from '../../crypto/envelope';
import { logEvent } from '../../utils/audit';
import { jsonResponse, errorResponse } from '../../utils/response';

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
        // Scenario 2: Missing token
        return errorResponse('unauthorized', '缺少授權 Token', 401, request);
      } else {
        // Scenario 3: Invalid token
        return errorResponse('forbidden', '無效的授權 Token', 403, request);
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
    const status = 'active';

    await env.DB.prepare(`
      INSERT INTO cards (
        uuid, card_type, encrypted_payload, wrapped_dek,
        key_version, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      uuid,
      cardType,
      encrypted_payload,
      wrapped_dek,
      keyVersion,
      status,
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
        status,
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
  reason: 'card_updated' | 'card_deleted'
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
    // Scenario 4: Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      // Check if Authorization header exists
      const authHeader = request.headers.get('Authorization');

      if (!authHeader) {
        // Scenario 4: Missing token
        return errorResponse('unauthorized', '缺少授權 Token', 401, request);
      } else {
        // Invalid token
        return errorResponse('forbidden', '無效的授權 Token', 403, request);
      }
    }

    // Scenario 2 & 3: Check if card exists
    const card = await env.DB.prepare(`
      SELECT uuid, status
      FROM cards
      WHERE uuid = ?
    `).bind(uuid).first<{
      uuid: string;
      status: string;
    }>();

    if (!card) {
      // Scenario 2: Card not found
      return errorResponse('card_not_found', '名片不存在', 404, request);
    }

    // Scenario 3: Card already deleted (idempotent)
    if (card.status === 'deleted') {
      return jsonResponse(
        {
          uuid,
          deleted_at: Date.now(),
          sessions_revoked: 0,
          message: '名片已刪除'
        },
        200,
        request
      );
    }

    // Scenario 1: Success path - Soft delete the card
    const timestamp = Date.now();

    await env.DB.prepare(`
      UPDATE cards
      SET status = 'deleted',
          updated_at = ?
      WHERE uuid = ?
    `).bind(timestamp, uuid).run();

    // Revoke all associated ReadSessions
    const sessionsRevoked = await revokeAllCardSessions(env, uuid, 'card_deleted');

    // Log audit event (card_delete)
    await logEvent(
      env,
      'card_delete',
      request,
      uuid,
      undefined,
      {
        sessions_revoked: sessionsRevoked
      }
    );

    // Return success response (200 OK)
    return jsonResponse(
      {
        uuid,
        deleted_at: timestamp,
        sessions_revoked: sessionsRevoked
      },
      200,
      request
    );
  } catch (error) {
    console.error('Error deleting card:', error);

    // Return generic error
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
        return errorResponse('unauthorized', '缺少授權 Token', 401, request);
      } else {
        // Invalid token
        return errorResponse('forbidden', '無效的授權 Token', 403, request);
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

    // Scenario 2 & 3: Check if card exists and is active
    const card = await env.DB.prepare(`
      SELECT uuid, status, encrypted_payload, wrapped_dek, card_type, key_version
      FROM cards
      WHERE uuid = ?
    `).bind(uuid).first<{
      uuid: string;
      status: string;
      encrypted_payload: string;
      wrapped_dek: string;
      card_type: string;
      key_version: number;
    }>();

    if (!card) {
      // Scenario 2: Card not found
      return errorResponse('card_not_found', '名片不存在', 404, request);
    }

    if (card.status === 'deleted') {
      // Scenario 3: Card deleted
      return errorResponse('card_deleted', '無法更新已刪除的名片', 403, request);
    }

    // Scenario 1: Success path
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
        return errorResponse('unauthorized', '缺少授權 Token', 401, request);
      } else {
        return errorResponse('forbidden', '無效的授權 Token', 403, request);
      }
    }

    // Query all non-deleted cards, ordered by created_at DESC
    const cards = await env.DB.prepare(`
      SELECT uuid, card_type, encrypted_payload, wrapped_dek,
             key_version, status, created_at, updated_at
      FROM cards
      WHERE status != 'deleted'
      ORDER BY created_at DESC
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

    // Decrypt each card's data
    const decryptedCards = await Promise.all(
      cards.results.map(async (card: any) => {
        try {
          const cardData = await encryption.decryptCard(
            card.encrypted_payload,
            card.wrapped_dek
          );

          return {
            uuid: card.uuid,
            card_type: card.card_type,
            status: card.status,
            data: cardData,
            created_at: new Date(card.created_at).toISOString(),
            updated_at: new Date(card.updated_at).toISOString()
          };
        } catch (error) {
          console.error(`Error decrypting card ${card.uuid}:`, error);
          // Skip cards that fail to decrypt
          return null;
        }
      })
    );

    // Filter out null values (cards that failed to decrypt)
    const validCards = decryptedCards.filter(card => card !== null);

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
        return errorResponse('unauthorized', '缺少授權 Token', 401, request);
      } else {
        return errorResponse('forbidden', '無效的授權 Token', 403, request);
      }
    }

    // Query card by UUID (exclude deleted)
    const card = await env.DB.prepare(`
      SELECT uuid, card_type, encrypted_payload, wrapped_dek,
             key_version, status, created_at, updated_at
      FROM cards
      WHERE uuid = ? AND status != 'deleted'
    `).bind(uuid).first<{
      uuid: string;
      card_type: string;
      encrypted_payload: string;
      wrapped_dek: string;
      key_version: number;
      status: string;
      created_at: number;
      updated_at: number;
    }>();

    if (!card) {
      return errorResponse('not_found', '名片不存在', 404, request);
    }

    // Initialize encryption for decryption
    const encryption = new EnvelopeEncryption();
    await encryption.initialize(env);

    // Decrypt card data
    const cardData = await encryption.decryptCard(
      card.encrypted_payload,
      card.wrapped_dek
    );

    // Return success response
    return jsonResponse({
      uuid: card.uuid,
      card_type: card.card_type,
      status: card.status,
      data: cardData,
      created_at: new Date(card.created_at).toISOString(),
      updated_at: new Date(card.updated_at).toISOString()
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
