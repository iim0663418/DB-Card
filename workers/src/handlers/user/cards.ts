// User Self-Service Card Handlers
// Implements BDD scenarios for user card management

import type { Env, UserCardCreateRequest, UserCardUpdateRequest, UserCardType } from '../../types';
import { verifyOAuth } from '../../middleware/oauth';
import { checkUserRateLimit } from '../../middleware/rate-limit';
import { EnvelopeEncryption } from '../../crypto/envelope';
import { jsonResponse, errorResponse } from '../../utils/response';
import { anonymizeIP } from '../../utils/audit';

/**
 * Log user audit event with actor information
 */
async function logUserEvent(
  db: D1Database,
  eventType: 'user_card_create' | 'user_card_update',
  email: string,
  uuid: string,
  request: Request,
  details?: Record<string, any>
): Promise<void> {
  try {
    const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    const userAgent = request.headers.get('User-Agent') || 'unknown';

    await db.prepare(`
      INSERT INTO audit_logs (
        event_type, card_uuid, user_agent, ip_address, timestamp, details
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      eventType,
      uuid,
      userAgent,
      anonymizeIP(ip),
      Date.now(),
      details ? JSON.stringify({ ...details, actor_type: 'user', actor_id: email }) : null
    ).run();
  } catch (error) {
    console.error('Failed to log user event:', error);
  }
}

/**
 * Validate user card data
 */
function validateUserCardData(data: any, isCreate: boolean): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid card data' };
  }

  if (isCreate) {
    // Create: all required fields
    if (!data.name_zh || !data.name_en) {
      return { valid: false, error: 'name_zh and name_en are required' };
    }
    if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
      return { valid: false, error: 'Valid email is required' };
    }
  } else {
    // Update: at least one field
    if (Object.keys(data).length === 0) {
      return { valid: false, error: 'At least one field required for update' };
    }
    // Validate email if provided
    if (data.email && (!data.email.includes('@'))) {
      return { valid: false, error: 'Invalid email format' };
    }
  }

  return { valid: true };
}

/**
 * Handle POST /api/user/cards
 * Scenario 2.1: Create first card (auto UUID generation)
 * Scenario 2.2: Binding limit exceeded
 */
export async function handleUserCreateCard(request: Request, env: Env): Promise<Response> {
  try {
    // OAuth verification (Scenario 1.1, 1.2)
    const authResult = await verifyOAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { email } = authResult;

    // Rate limiting (Scenario 6.1)
    const rateLimitResponse = await checkUserRateLimit(request, env, email, 'create');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse request body
    let body: UserCardCreateRequest;
    try {
      body = await request.json();
    } catch (error) {
      return errorResponse('invalid_request', 'Invalid JSON format', 400, request);
    }

    // Validate card type
    const validTypes: UserCardType[] = ['personal', 'event', 'sensitive'];
    if (!body.type || !validTypes.includes(body.type)) {
      return errorResponse('invalid_type', 'type must be personal, event, or sensitive', 400, request);
    }

    // Validate card data
    const validation = validateUserCardData(body, true);
    if (!validation.valid) {
      return errorResponse('invalid_data', validation.error!, 400, request);
    }

    // Check binding limit (Scenario 2.2)
    const existingBinding = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM uuid_bindings
      WHERE bound_email = ? AND type = ? AND status = 'bound'
    `).bind(email, body.type).first<{ count: number }>();

    if (existingBinding && existingBinding.count > 0) {
      // Get existing UUID for error message
      const existing = await env.DB.prepare(`
        SELECT uuid FROM uuid_bindings
        WHERE bound_email = ? AND type = ? AND status = 'bound'
        LIMIT 1
      `).bind(email, body.type).first<{ uuid: string }>();

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'binding_limit_exceeded',
            message: `You already have a ${body.type} card. Maximum 1 per account.`,
            existing_uuid: existing?.uuid
          }
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate UUID v4 (Scenario 2.1)
    const uuid = crypto.randomUUID();

    // Get client IP and user agent
    const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    const userAgent = request.headers.get('User-Agent') || 'unknown';

    // Prepare card data for encryption
    const cardData = {
      name: { zh: body.name_zh, en: body.name_en },
      title: body.title_zh && body.title_en ? { zh: body.title_zh, en: body.title_en } : undefined,
      department: body.department,
      email: body.email,
      phone: body.phone,
      mobile: body.mobile,
      address: body.address_zh && body.address_en ? { zh: body.address_zh, en: body.address_en } : undefined,
      avatar_url: body.avatar_url,
      greetings: body.greetings_zh && body.greetings_en ? { zh: body.greetings_zh, en: body.greetings_en } : undefined,
      social_github: body.social_github,
      social_linkedin: body.social_linkedin,
      social_facebook: body.social_facebook,
      social_instagram: body.social_instagram,
      social_twitter: body.social_twitter,
      social_youtube: body.social_youtube,
      social_line: body.social_line,
      social_signal: body.social_signal
    };

    // Encrypt card data (before DB operations)
    const encryption = new EnvelopeEncryption();
    await encryption.initialize(env);
    const { encrypted_payload, wrapped_dek } = await encryption.encryptCard(cardData);

    // Get KEK version
    const kekVersion = await env.DB.prepare(`
      SELECT version FROM kek_versions WHERE status = 'active' ORDER BY version DESC LIMIT 1
    `).first<{ version: number }>();

    const timestamp = Date.now();
    const timestampSeconds = Math.floor(timestamp / 1000);

    // Use transaction to ensure atomicity
    const results = await env.DB.batch([
      // Insert into uuid_bindings
      env.DB.prepare(`
        INSERT INTO uuid_bindings (
          uuid, type, status, bound_email, bound_at,
          created_ip, created_user_agent
        ) VALUES (?, ?, 'bound', ?, ?, ?, ?)
      `).bind(
        uuid,
        body.type,
        email,
        timestampSeconds,
        anonymizeIP(ip),
        userAgent
      ),
      // Insert into cards table
      env.DB.prepare(`
        INSERT INTO cards (
          uuid, encrypted_payload, wrapped_dek,
          key_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        uuid,
        encrypted_payload,
        wrapped_dek,
        kekVersion?.version || 1,
        timestamp,
        timestamp
      )
    ]);

    // Check if both inserts succeeded
    if (!results[0].success || !results[1].success) {
      throw new Error('Failed to insert card data');
    }

    // Log audit event
    await logUserEvent(env.DB, 'user_card_create', email, uuid, request, {
      type: body.type,
      created_ip: anonymizeIP(ip)
    });

    // Return success
    return jsonResponse(
      {
        success: true,
        uuid,
        type: body.type,
        message: 'Card created successfully'
      },
      201,
      request
    );
  } catch (error) {
    console.error('Error creating user card:', error);
    return errorResponse('internal_error', 'Failed to create card', 500, request);
  }
}

/**
 * Handle PUT /api/user/cards/:uuid
 * Scenario 3.1: Edit own card
 * Scenario 3.2: Attempt to edit others' card
 * Scenario 3.3: Edit revoked card
 */
export async function handleUserUpdateCard(
  request: Request,
  env: Env,
  uuid: string
): Promise<Response> {
  try {
    // OAuth verification
    const authResult = await verifyOAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { email } = authResult;

    // Rate limiting (Scenario 6.2)
    const rateLimitResponse = await checkUserRateLimit(request, env, email, 'edit');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse request body
    let body: UserCardUpdateRequest;
    try {
      body = await request.json();
    } catch (error) {
      return errorResponse('invalid_request', 'Invalid JSON format', 400, request);
    }

    // Validate card data
    const validation = validateUserCardData(body, false);
    if (!validation.valid) {
      return errorResponse('invalid_data', validation.error!, 400, request);
    }

    // Check ownership (Scenario 3.2)
    const binding = await env.DB.prepare(`
      SELECT uuid, status FROM uuid_bindings
      WHERE uuid = ? AND bound_email = ?
    `).bind(uuid, email).first<{ uuid: string; status: string }>();

    if (!binding) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'forbidden',
            message: 'You can only edit your own cards'
          }
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if revoked (Scenario 3.3)
    if (binding.status === 'revoked') {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'card_revoked',
            message: 'This card has been revoked by administrator'
          }
        }),
        {
          status: 410,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get existing card
    const card = await env.DB.prepare(`
      SELECT encrypted_payload, wrapped_dek FROM cards WHERE uuid = ?
    `).bind(uuid).first<{ encrypted_payload: string; wrapped_dek: string }>();

    if (!card) {
      return errorResponse('not_found', 'Card not found', 404, request);
    }

    // Decrypt existing card data
    const encryption = new EnvelopeEncryption();
    await encryption.initialize(env);
    const existingData: any = await encryption.decryptCard(card.encrypted_payload, card.wrapped_dek);

    // Merge updates
    const updatedData = {
      name: body.name_zh && body.name_en
        ? { zh: body.name_zh, en: body.name_en }
        : existingData.name,
      title: body.title_zh && body.title_en
        ? { zh: body.title_zh, en: body.title_en }
        : existingData.title,
      department: body.department !== undefined ? body.department : existingData.department,
      email: body.email || existingData.email,
      phone: body.phone !== undefined ? body.phone : existingData.phone,
      mobile: body.mobile !== undefined ? body.mobile : existingData.mobile,
      address: body.address_zh && body.address_en
        ? { zh: body.address_zh, en: body.address_en }
        : existingData.address,
      avatar_url: body.avatar_url !== undefined ? body.avatar_url : existingData.avatar_url,
      greetings: body.greetings_zh && body.greetings_en
        ? { zh: body.greetings_zh, en: body.greetings_en }
        : existingData.greetings,
      social_github: body.social_github !== undefined ? body.social_github : existingData.social_github,
      social_linkedin: body.social_linkedin !== undefined ? body.social_linkedin : existingData.social_linkedin,
      social_facebook: body.social_facebook !== undefined ? body.social_facebook : existingData.social_facebook,
      social_instagram: body.social_instagram !== undefined ? body.social_instagram : existingData.social_instagram,
      social_twitter: body.social_twitter !== undefined ? body.social_twitter : existingData.social_twitter,
      social_youtube: body.social_youtube !== undefined ? body.social_youtube : existingData.social_youtube,
      social_line: body.social_line !== undefined ? body.social_line : existingData.social_line,
      social_signal: body.social_signal !== undefined ? body.social_signal : existingData.social_signal
    };

    // Re-encrypt with same DEK (actually new DEK for simplicity)
    const { encrypted_payload, wrapped_dek } = await encryption.encryptCard(updatedData);

    // Get KEK version
    const kekVersion = await env.DB.prepare(`
      SELECT version FROM kek_versions WHERE status = 'active' ORDER BY version DESC LIMIT 1
    `).first<{ version: number }>();

    // Update cards table
    const timestamp = Date.now();
    await env.DB.prepare(`
      UPDATE cards
      SET encrypted_payload = ?, wrapped_dek = ?, key_version = ?, updated_at = ?
      WHERE uuid = ?
    `).bind(
      encrypted_payload,
      wrapped_dek,
      kekVersion?.version || 1,
      timestamp,
      uuid
    ).run();

    // Log audit event
    await logUserEvent(env.DB, 'user_card_update', email, uuid, request, {
      fields_updated: Object.keys(body)
    });

    // Return success
    return jsonResponse(
      {
        success: true,
        message: 'Card updated successfully'
      },
      200,
      request
    );
  } catch (error) {
    console.error('Error updating user card:', error);
    return errorResponse('internal_error', 'Failed to update card', 500, request);
  }
}

/**
 * Handle GET /api/user/cards
 * Scenario 1.1: List own cards for card selection page
 */
export async function handleUserListCards(request: Request, env: Env): Promise<Response> {
  try {
    // OAuth verification
    const authResult = await verifyOAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { email } = authResult;

    // Query all cards for this email (including revoked)
    const bindings = await env.DB.prepare(`
      SELECT uuid, type, status, bound_at
      FROM uuid_bindings
      WHERE bound_email = ? AND status IN ('bound', 'revoked')
      ORDER BY bound_at DESC
    `).bind(email).all();

    if (!bindings.results || bindings.results.length === 0) {
      return jsonResponse(
        {
          cards: []
        },
        200,
        request
      );
    }

    // Initialize encryption for decryption
    const encryption = new EnvelopeEncryption();
    await encryption.initialize(env);

    // Decrypt each card to get name fields
    const cards = await Promise.all(
      bindings.results.map(async (binding: any) => {
        const card = await env.DB.prepare(`
          SELECT encrypted_payload, wrapped_dek, updated_at
          FROM cards WHERE uuid = ?
        `).bind(binding.uuid).first<{
          encrypted_payload: string;
          wrapped_dek: string;
          updated_at: number;
        }>();

        if (!card) {
          return {
            uuid: binding.uuid,
            type: binding.type,
            status: binding.status,
            name_zh: '',
            name_en: '',
            updated_at: null
          };
        }

        // Decrypt to get name fields
        const cardData = await encryption.decryptCard(
          card.encrypted_payload,
          card.wrapped_dek
        ) as any;

        return {
          uuid: binding.uuid,
          type: binding.type,
          status: binding.status,
          name_zh: cardData.name?.zh || '',
          name_en: cardData.name?.en || '',
          updated_at: new Date(card.updated_at).toISOString()
        };
      })
    );

    return jsonResponse(
      {
        cards
      },
      200,
      request
    );
  } catch (error) {
    console.error('Error listing user cards:', error);
    return errorResponse('internal_error', 'Failed to list cards', 500, request);
  }
}

/**
 * Handle GET /api/user/cards/:uuid
 * Scenario F5: Get card details for editing
 */
export async function handleUserGetCard(
  request: Request,
  env: Env,
  uuid: string
): Promise<Response> {
  try {
    // OAuth verification
    const authResult = await verifyOAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { email } = authResult;

    // Check ownership
    const binding = await env.DB.prepare(`
      SELECT uuid, type, status FROM uuid_bindings
      WHERE uuid = ? AND bound_email = ?
    `).bind(uuid, email).first<{ uuid: string; type: string; status: string }>();

    if (!binding) {
      return errorResponse('forbidden', 'You can only view your own cards', 403, request);
    }

    // Query card data (allow both active and deleted status for revoked cards)
    const card = await env.DB.prepare(`
      SELECT uuid, encrypted_payload, wrapped_dek,
             key_version, created_at, updated_at
      FROM cards
      WHERE uuid = ?
    `).bind(uuid).first<{
      uuid: string;
      encrypted_payload: string;
      wrapped_dek: string;
      key_version: number;
      created_at: number;
      updated_at: number;
    }>();

    if (!card) {
      return errorResponse('not_found', '名片不存在', 404, request);
    }

    // Decrypt card data
    const encryption = new EnvelopeEncryption();
    await encryption.initialize(env);
    const cardData = await encryption.decryptCard(
      card.encrypted_payload,
      card.wrapped_dek
    ) as any;

    // Return flattened structure for form
    return jsonResponse({
      uuid: card.uuid,
      type: binding.type,
      name_zh: cardData.name?.zh || '',
      name_en: cardData.name?.en || '',
      title_zh: cardData.title?.zh || '',
      title_en: cardData.title?.en || '',
      department: cardData.department || '',
      email: cardData.email || '',
      phone: cardData.phone || '',
      mobile: cardData.mobile || '',
      address_zh: cardData.address?.zh || '',
      address_en: cardData.address?.en || '',
      avatar_url: cardData.avatar_url || '',
      greetings_zh: cardData.greetings?.zh || '',
      greetings_en: cardData.greetings?.en || '',
      social_github: cardData.social_github || '',
      social_linkedin: cardData.social_linkedin || '',
      social_facebook: cardData.social_facebook || '',
      social_instagram: cardData.social_instagram || '',
      social_twitter: cardData.social_twitter || '',
      social_youtube: cardData.social_youtube || '',
      updated_at: new Date(card.updated_at).toISOString()
    }, 200, request);
  } catch (error) {
    console.error('Failed to get user card:', error);
    return errorResponse('server_error', '無法取得名片資料', 500, request);
  }
}
