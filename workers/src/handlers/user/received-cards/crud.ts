// CRUD Handlers for Received Cards
// POST /api/user/received-cards - Save card
// GET /api/user/received-cards - List cards
// PUT /api/user/received-cards/:uuid - Update card
// DELETE /api/user/received-cards/:uuid - Soft delete card

import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { jsonResponse, errorResponse } from '../../../utils/response';
import { extractTagsFromOrganization } from '../../../utils/tags';
import { normalizeToTraditional } from '../../../utils/chinese-converter';
import { normalizeOrganizationAlias } from '../../../utils/search-helpers';

interface SaveCardRequest {
  upload_id?: string;  // Optional for manual add
  name_prefix?: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  name_suffix?: string;
  organization?: string;
  organization_en?: string;
  organization_alias?: string | string[];  // Support both string and array
  department?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  note?: string;
  company_summary?: string;
  personal_summary?: string;
  sources?: Array<{ uri: string; title: string }>;
  ai_status?: string;
  ocr_raw_text?: string;  // NOTE: Not populated by unified-extract (see unified-extract.ts)
}

interface UpdateCardRequest {
  name_prefix?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  name_suffix?: string;
  organization?: string;
  organization_en?: string;
  organization_alias?: string;
  department?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  note?: string;
  company_summary?: string;
  personal_summary?: string;
}

interface PatchCardRequest extends UpdateCardRequest {
  ai_sources_json?: string;
  ai_status?: string;
}

/**
 * Handle POST /api/user/received-cards - Save card
 * Supports both AI flow (with upload_id) and manual add (without upload_id)
 */
export async function handleSaveCard(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) return userResult;
    const user = userResult;

    const body = await request.json() as SaveCardRequest;
    
    if (!body.full_name) {
      return errorResponse('INVALID_REQUEST', 'full_name is required', 400);
    }

    const cardUuid = crypto.randomUUID();
    let permanentUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    // AI Flow: Process upload_id
    if (body.upload_id) {
      // Validate upload_id existence first
      const upload = await env.DB.prepare(`
        SELECT upload_id, consumed, expires_at, ocr_status
        FROM temp_uploads 
        WHERE upload_id = ? AND user_email = ?
      `).bind(body.upload_id, user.email).first();
      
      if (!upload) {
        return errorResponse('UPLOAD_NOT_FOUND', 
          'Upload record not found. Please re-upload the image.', 404);
      }
      
      const now = Date.now();
      if (Number(upload.expires_at) < now) {
        return errorResponse('UPLOAD_EXPIRED', 
          'Upload has expired. Please re-upload the image.', 410);
      }
      
      if (upload.consumed === 1) {
        return errorResponse('UPLOAD_CONSUMED', 
          'Upload has already been used.', 409);
      }

      // Atomic mark upload as consumed
      const markResult = await env.DB.prepare(`
        UPDATE temp_uploads
        SET consumed = 1
        WHERE upload_id = ? AND user_email = ? AND consumed = 0 AND expires_at > ?
      `).bind(body.upload_id, user.email, now.toString()).run();

      if (markResult.meta.changes === 0) {
        return errorResponse('INVALID_UPLOAD', 'Upload not found, expired, or already consumed', 404);
      }

      // Get upload info (including thumbnail_url)
      const uploadInfo = await env.DB.prepare(`
        SELECT upload_id, image_url, thumbnail_url FROM temp_uploads
        WHERE upload_id = ? AND user_email = ?
      `).bind(body.upload_id, user.email).first();

      if (!uploadInfo) {
        // Rollback consumed flag
        await env.DB.prepare(`
          UPDATE temp_uploads SET consumed = 0
          WHERE upload_id = ? AND user_email = ?
        `).bind(body.upload_id, user.email).run();

        return errorResponse('UPLOAD_NOT_FOUND', 'Upload record not found after marking. Please retry.', 500);
      }

      const fileExtension = (uploadInfo.image_url as string).endsWith('.png') ? 'png' : 'jpg';
      permanentUrl = `received/permanent/${cardUuid}.${fileExtension}`;

      try {
        // Move image to permanent location
        const tempImage = await env.PHYSICAL_CARDS.get(uploadInfo.image_url as string);
        if (tempImage) {
          await env.PHYSICAL_CARDS.put(permanentUrl, tempImage.body);
        }

        // Delete temp file (best-effort)
        await env.PHYSICAL_CARDS.delete(uploadInfo.image_url as string).catch(() => {});

        // Move thumbnail to permanent location (if exists)
        if (uploadInfo.thumbnail_url) {
          const permanentThumbnailUrl = `received/permanent/${cardUuid}_thumb.webp`;
          const tempThumbnail = await env.PHYSICAL_CARDS.get(uploadInfo.thumbnail_url as string);
          if (tempThumbnail) {
            await env.PHYSICAL_CARDS.put(permanentThumbnailUrl, tempThumbnail.body);
            thumbnailUrl = permanentThumbnailUrl;
          }
          // Delete temp thumbnail (best-effort)
          await env.PHYSICAL_CARDS.delete(uploadInfo.thumbnail_url as string).catch(() => {});
        }

      } catch (error) {
        // Rollback on R2 failure
        await env.DB.prepare(`
          UPDATE temp_uploads SET consumed = 0
          WHERE upload_id = ? AND user_email = ?
        `).bind(body.upload_id, user.email).run();

        if (permanentUrl) {
          await env.PHYSICAL_CARDS.delete(permanentUrl).catch(() => {});
        }
        if (thumbnailUrl) {
          await env.PHYSICAL_CARDS.delete(thumbnailUrl).catch(() => {});
        }

        throw error;
      }
    }

    // Insert card (both AI and manual flow)
    try {
      const aiSourcesJson = (body.sources && body.sources.length > 0) 
        ? JSON.stringify(body.sources) 
        : null;
      const aiStatus = body.ai_status || null;
      
      // Handle organization_alias: normalize any format to JSON array string
      let organizationAlias: string | null = null;
      if (body.organization_alias != null) {
        const normalized = normalizeOrganizationAlias(body.organization_alias);
        // Warn if input was not already a JSON array (needed conversion)
        if (
          typeof body.organization_alias === 'string' &&
          !body.organization_alias.trim().startsWith('[')
        ) {
          console.warn('[handleSaveCard] organization_alias normalized from non-JSON', {
            original: String(body.organization_alias).slice(0, 200),
            normalized,
          });
        }
        organizationAlias = normalized !== '[]' ? normalized : null;
      }
      
      // Normalize organization to traditional Chinese for search
      const organizationNormalized = body.organization 
        ? await normalizeToTraditional(body.organization, { ...env, ctx })
        : null;
      
      const now = Date.now();

      await env.DB.prepare(`
        INSERT INTO received_cards (
          uuid, user_email, name_prefix, full_name, first_name, last_name, name_suffix,
          organization, organization_en, organization_alias, organization_normalized, department, title, 
          phone, email, website, address, note,
          company_summary, personal_summary, ai_sources_json, ai_status,
          original_image_url, thumbnail_url, ocr_raw_text, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        cardUuid, user.email, body.name_prefix || null, body.full_name, body.first_name || null, body.last_name || null, body.name_suffix || null,
        body.organization || null, body.organization_en || null, organizationAlias, organizationNormalized, body.department || null, body.title || null,
        body.phone || null, body.email || null, body.website || null, body.address || null, body.note || null,
        body.company_summary || null, body.personal_summary || null, aiSourcesJson, aiStatus,
        permanentUrl, thumbnailUrl, body.ocr_raw_text || null, now.toString()
      ).run();

      // Auto-extract tags based on organization field
      if (body.organization) {
        const tags = extractTagsFromOrganization(body.organization);

        if (tags.length > 0) {
          // Batch insert card_tags
          const statements = [];
          for (const tag of tags) {
            statements.push(
              env.DB.prepare(`
                INSERT OR IGNORE INTO card_tags (card_uuid, tag, tag_source, created_at)
                VALUES (?, ?, 'auto_keyword', ?)
              `).bind(cardUuid, tag, now)
            );
          }
          await env.DB.batch(statements);

          // Update tag_stats using COUNT for accuracy
          for (const tag of tags) {
            await env.DB.prepare(`
              INSERT INTO tag_stats (user_email, tag, count, last_updated)
              VALUES (?, ?, 1, ?)
              ON CONFLICT(user_email, tag) DO UPDATE SET
                count = (
                  SELECT COUNT(*)
                  FROM card_tags ct
                  JOIN received_cards rc ON ct.card_uuid = rc.uuid
                  WHERE ct.tag = excluded.tag
                    AND rc.user_email = excluded.user_email
                    AND rc.deleted_at IS NULL
                ),
                last_updated = excluded.last_updated
            `).bind(user.email, tag, now).run();
          }
        }
      }

      return jsonResponse({ uuid: cardUuid, message: 'Card saved successfully' });

    } catch (error) {
      // Rollback on DB failure
      if (body.upload_id) {
        await env.DB.prepare(`
          UPDATE temp_uploads SET consumed = 0
          WHERE upload_id = ? AND user_email = ?
        `).bind(body.upload_id, user.email).run();
      }

      if (permanentUrl) {
        await env.PHYSICAL_CARDS.delete(permanentUrl).catch(() => {});
      }
      if (thumbnailUrl) {
        await env.PHYSICAL_CARDS.delete(thumbnailUrl).catch(() => {});
      }

      throw error;
    }

  } catch (error) {
    console.error('Save card error:', error);
    return errorResponse('SAVE_FAILED', 'Failed to save card', 500);
  }
}

/**
 * Handle GET /api/user/received-cards - List cards (own + shared)
 * BDD: Merged Display - Own + Shared Cards
 */
export async function handleListCards(request: Request, env: Env): Promise<Response> {
  try {
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) return userResult;
    const user = userResult;

    const cards = await env.DB.prepare(`
      SELECT
        uuid, name_prefix, full_name, first_name, last_name, name_suffix,
        organization, organization_en, organization_alias, department, title,
        phone, email, website, address, note,
        company_summary, personal_summary, ai_sources_json, ai_status,
        original_image_url, thumbnail_url, created_at, updated_at,
        'own' as source,
        NULL as shared_by,
        COALESCE(updated_at, created_at) AS sort_ts
      FROM received_cards
      WHERE user_email = ? AND deleted_at IS NULL AND merged_to IS NULL

      UNION ALL

      SELECT
        rc.uuid, rc.name_prefix, rc.full_name, rc.first_name, rc.last_name, rc.name_suffix,
        rc.organization, rc.organization_en, rc.organization_alias, rc.department, rc.title,
        rc.phone, rc.email, rc.website, rc.address, rc.note,
        rc.company_summary, rc.personal_summary, rc.ai_sources_json, rc.ai_status,
        rc.original_image_url, rc.thumbnail_url, rc.created_at, rc.updated_at,
        'shared' as source,
        sc.owner_email as shared_by,
        COALESCE(rc.updated_at, rc.created_at) AS sort_ts
      FROM shared_cards sc
      INNER JOIN received_cards rc ON sc.card_uuid = rc.uuid
      WHERE rc.deleted_at IS NULL AND rc.merged_to IS NULL
        AND rc.user_email != ?

      ORDER BY sort_ts DESC
    `).bind(user.email, user.email).all();

    // Parse ai_sources_json for each card
    const cardsWithSources = cards.results.map((card: any) => ({
      ...card,
      sources: card.ai_sources_json ? JSON.parse(card.ai_sources_json) : []
    }));

    // Fetch tags for all cards
    if (cardsWithSources.length > 0) {
      const cardUuids = cardsWithSources.map((c: any) => c.uuid);
      const placeholders = cardUuids.map(() => '?').join(',');
      
      const tagsResult = await env.DB.prepare(`
        SELECT card_uuid, category, raw_value, normalized_value, tag_source
        FROM card_tags
        WHERE card_uuid IN (${placeholders})
        ORDER BY created_at ASC
      `).bind(...cardUuids).all();

      // Group tags by card_uuid (new format with objects)
      const tagsByCard = new Map<string, Array<{ category: string; raw: string; normalized: string }>>();
      for (const row of tagsResult.results) {
        const r = row as any;
        if (!tagsByCard.has(r.card_uuid)) {
          tagsByCard.set(r.card_uuid, []);
        }
        tagsByCard.get(r.card_uuid)!.push({
          category: r.category,
          raw: r.raw_value,
          normalized: r.normalized_value
        });
      }

      // Add tags to cards
      for (const card of cardsWithSources) {
        card.tags = tagsByCard.get(card.uuid) || [];
      }
    }

    return jsonResponse(cardsWithSources);

  } catch (error) {
    console.error('List cards error:', error);
    return errorResponse('LIST_FAILED', 'Failed to list cards', 500);
  }
}

/**
 * Handle PUT /api/user/received-cards/:uuid - Update card
 */
export async function handleUpdateCard(request: Request, env: Env, uuid: string): Promise<Response> {
  try {
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) return userResult;
    const user = userResult;

    const body = await request.json() as UpdateCardRequest;

    // Build dynamic UPDATE query
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name_prefix !== undefined) { updates.push('name_prefix = ?'); values.push(body.name_prefix); }
    if (body.full_name !== undefined) { updates.push('full_name = ?'); values.push(body.full_name); }
    if (body.first_name !== undefined) { updates.push('first_name = ?'); values.push(body.first_name); }
    if (body.last_name !== undefined) { updates.push('last_name = ?'); values.push(body.last_name); }
    if (body.name_suffix !== undefined) { updates.push('name_suffix = ?'); values.push(body.name_suffix); }
    if (body.organization !== undefined) { updates.push('organization = ?'); values.push(body.organization); }
    if (body.organization_en !== undefined) { updates.push('organization_en = ?'); values.push(body.organization_en); }
    if (body.organization_alias !== undefined) { updates.push('organization_alias = ?'); values.push(body.organization_alias); }
    if (body.department !== undefined) { updates.push('department = ?'); values.push(body.department); }
    if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
    if (body.phone !== undefined) { updates.push('phone = ?'); values.push(body.phone); }
    if (body.email !== undefined) { updates.push('email = ?'); values.push(body.email); }
    if (body.website !== undefined) { updates.push('website = ?'); values.push(body.website); }
    if (body.address !== undefined) { updates.push('address = ?'); values.push(body.address); }
    if (body.note !== undefined) { updates.push('note = ?'); values.push(body.note); }
    if (body.company_summary !== undefined) { updates.push('company_summary = ?'); values.push(body.company_summary); }
    if (body.personal_summary !== undefined) { updates.push('personal_summary = ?'); values.push(body.personal_summary); }

    if (updates.length === 0) {
      return errorResponse('NO_UPDATES', 'No fields to update', 400);
    }

    updates.push('updated_at = ?');
    values.push(Date.now().toString());
    values.push(uuid);
    values.push(user.email);

    const result = await env.DB.prepare(`
      UPDATE received_cards 
      SET ${updates.join(', ')}
      WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
    `).bind(...values).run();

    if (result.meta.changes === 0) {
      return errorResponse('CARD_NOT_FOUND', 'Card not found', 404);
    }

    return jsonResponse({ message: 'Card updated successfully' });

  } catch (error) {
    console.error('Update card error:', error);
    return errorResponse('UPDATE_FAILED', 'Failed to update card', 500);
  }
}

/**
 * Handle DELETE /api/user/received-cards/:uuid - Soft delete card
 */
export async function handleDeleteCard(request: Request, env: Env, uuid: string): Promise<Response> {
  try {
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) return userResult;
    const user = userResult;

    const result = await env.DB.prepare(`
      UPDATE received_cards 
      SET deleted_at = ?
      WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
    `).bind(Date.now().toString(), uuid, user.email).run();

    if (result.meta.changes === 0) {
      return errorResponse('CARD_NOT_FOUND', 'Card not found', 404);
    }

    return new Response(null, { status: 204 });

  } catch (error) {
    console.error('Delete card error:', error);
    return errorResponse('DELETE_FAILED', 'Failed to delete card', 500);
  }
}

/**
 * Handle PATCH /api/user/received-cards/:uuid - Partial update card
 * Supports updating AI fields (company_summary, personal_summary, ai_status)
 */
export async function handlePatchCard(request: Request, env: Env, uuid: string): Promise<Response> {
  try {
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) return userResult;
    const user = userResult;

    const body = await request.json() as PatchCardRequest;

    // Verify card ownership
    const card = await env.DB.prepare(`
      SELECT uuid FROM received_cards 
      WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
    `).bind(uuid, user.email).first();
    
    if (!card) {
      return errorResponse('CARD_NOT_FOUND', 'Card not found', 404);
    }

    // Build dynamic UPDATE query
    const updates: string[] = [];
    const values: any[] = [];

    // Basic fields
    if (body.full_name !== undefined) { updates.push('full_name = ?'); values.push(body.full_name); }
    if (body.first_name !== undefined) { updates.push('first_name = ?'); values.push(body.first_name); }
    if (body.last_name !== undefined) { updates.push('last_name = ?'); values.push(body.last_name); }
    if (body.organization !== undefined) { updates.push('organization = ?'); values.push(body.organization); }
    if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
    if (body.phone !== undefined) { updates.push('phone = ?'); values.push(body.phone); }
    if (body.email !== undefined) { updates.push('email = ?'); values.push(body.email); }
    if (body.website !== undefined) { updates.push('website = ?'); values.push(body.website); }
    if (body.address !== undefined) { updates.push('address = ?'); values.push(body.address); }
    if (body.note !== undefined) { updates.push('note = ?'); values.push(body.note); }

    // AI fields
    if (body.company_summary !== undefined) { updates.push('company_summary = ?'); values.push(body.company_summary); }
    if (body.personal_summary !== undefined) { updates.push('personal_summary = ?'); values.push(body.personal_summary); }
    if (body.ai_sources_json !== undefined) { updates.push('ai_sources_json = ?'); values.push(body.ai_sources_json); }
    if (body.ai_status !== undefined) { updates.push('ai_status = ?'); values.push(body.ai_status); }

    if (updates.length === 0) {
      return errorResponse('NO_UPDATES', 'No fields to update', 400);
    }

    updates.push('updated_at = ?');
    values.push(Date.now().toString());
    values.push(uuid);
    values.push(user.email);

    const result = await env.DB.prepare(`
      UPDATE received_cards 
      SET ${updates.join(', ')}
      WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
    `).bind(...values).run();

    if (result.meta.changes === 0) {
      return errorResponse('CARD_NOT_FOUND', 'Card not found or already deleted', 404);
    }

    return jsonResponse({ message: 'Card updated successfully' });

  } catch (error) {
    console.error('Patch card error:', error);
    return errorResponse('PATCH_FAILED', 'Failed to patch card', 500);
  }
}
