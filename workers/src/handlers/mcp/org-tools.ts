// MCP Organization Tools
// 3 tools: save_organization, get_organization, update_organization

import type { Env } from '../../types';
import { normalizeToTraditional } from '../../utils/chinese-converter';
import { textResult, jsonResult } from './tools';

// ── Helpers ───────────────────────────────────────────────────────────────────

const NAME_MAX = 500;
const SUMMARY_MAX = 5000;

/** Check if a string is ASCII-only (all English / numbers / symbols) */
function isAsciiOnly(text: string): boolean {
  return /^[\x00-\x7F]*$/.test(text);
}

/** Normalize organization name: simplified→traditional for CJK, lowercase for ASCII-only */
async function normalizeName(name: string, env: Env): Promise<string> {
  const trimmed = name.trim();
  if (isAsciiOnly(trimmed)) {
    return trimmed.toLowerCase();
  }
  const converted = await normalizeToTraditional(trimmed, env);
  return converted ?? trimmed;
}

/** Validate source_url scheme — only http:// and https:// are accepted */
function isValidSourceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check summary content for suspicious patterns.
 * Returns 'review_needed' if flagged, null if clean.
 * Does NOT block — just flags.
 */
function checkContentSafety(summary: string): 'review_needed' | null {
  // Suspicious patterns:
  // 1. Email addresses in summary (could be social engineering)
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  // 2. Phone-like patterns with "call" or "聯繫" context (social engineering)
  const callToAction = /(請聯繫|請撥打|請匯款|please\s+(?:contact|call|wire|transfer))/i;
  // 3. URL patterns that don't match the org's likely domain
  const suspiciousUrl = /https?:\/\/[a-zA-Z0-9.-]+\.(?:tk|ml|ga|cf|gq|xyz|top|buzz|click|link|info)\/[^ ]*/i;
  // 4. Payment/banking instructions
  const paymentKeywords = /(帳戶|帳號|匯款|轉帳|bank\s*account|wire\s*transfer|IBAN|SWIFT)/i;

  if (emailPattern.test(summary) && callToAction.test(summary)) return 'review_needed';
  if (paymentKeywords.test(summary)) return 'review_needed';
  if (suspiciousUrl.test(summary)) return 'review_needed';

  return null;
}

// ── save_organization ─────────────────────────────────────────────────────────

interface SaveOrganizationArgs {
  name: string;
  name_en?: string;
  industry?: string;
  summary?: string;
  source_url?: string;
  aliases?: string;
  metadata_json?: string;
}

export async function toolSaveOrganization(
  args: SaveOrganizationArgs,
  userEmail: string,
  env: Env,
  clientId: string | null
): Promise<unknown> {
  // Validate required field
  if (!args.name || typeof args.name !== 'string' || args.name.trim().length === 0) {
    return textResult('name is required');
  }

  // Validate name length
  if (args.name.length > NAME_MAX) {
    return textResult(`Field 'name' exceeds maximum length of ${NAME_MAX}`);
  }

  // Validate summary length
  if (args.summary && args.summary.length > SUMMARY_MAX) {
    return textResult(`Field 'summary' exceeds maximum length of ${SUMMARY_MAX}`);
  }

  // Validate source_url scheme
  if (args.source_url && !isValidSourceUrl(args.source_url)) {
    return textResult('source_url must use http:// or https:// scheme');
  }

  // Normalize name
  const nameNormalized = await normalizeName(args.name, env);

  // Check UNIQUE constraint (user_email + name_normalized)
  const existing = await env.DB.prepare(
    `SELECT uuid FROM organizations WHERE user_email = ? AND name_normalized = ?`
  ).bind(userEmail, nameNormalized).first<{ uuid: string }>();

  if (existing) {
    return jsonResult({ error: 'organization_exists', existing_uuid: existing.uuid });
  }

  // Validate aliases JSON if provided
  if (args.aliases) {
    try {
      const parsed = JSON.parse(args.aliases);
      if (!Array.isArray(parsed)) {
        return textResult('aliases must be a JSON array of strings');
      }
    } catch {
      return textResult('aliases must be a valid JSON array');
    }
  }

  // INSERT
  const uuid = crypto.randomUUID();
  const now = Date.now();

  // Content safety check (flag but don't block)
  let reviewFlag: string | null = null;
  if (args.summary) {
    reviewFlag = checkContentSafety(args.summary);
  }

  await env.DB.prepare(`
    INSERT INTO organizations (
      uuid, user_email, name, name_en, name_normalized, aliases,
      industry, summary, source_url, metadata_json, review_flag, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    uuid, userEmail, args.name.trim(), args.name_en ?? null, nameNormalized,
    args.aliases ?? null, args.industry ?? null, args.summary ?? null,
    args.source_url ?? null, args.metadata_json ?? null, reviewFlag, now
  ).run();

  // Write field_history (non-blocking)
  try {
    const fields: { field: string; value: string | null }[] = [
      { field: 'name', value: args.name.trim() },
    ];
    if (args.name_en) fields.push({ field: 'name_en', value: args.name_en });
    if (args.industry) fields.push({ field: 'industry', value: args.industry });
    if (args.summary) fields.push({ field: 'summary', value: args.summary });
    if (args.source_url) fields.push({ field: 'source_url', value: args.source_url });
    if (args.aliases) fields.push({ field: 'aliases', value: args.aliases });
    if (args.metadata_json) fields.push({ field: 'metadata_json', value: args.metadata_json });

    const historyStatements = fields.map(f =>
      env.DB.prepare(`
        INSERT INTO field_history (entity_type, entity_uuid, field_name, old_value, new_value, source_type, client_id, user_email, changed_at)
        VALUES ('organization', ?, ?, NULL, ?, 'mcp_agent', ?, ?, ?)
      `).bind(uuid, f.field, f.value, clientId, userEmail, now)
    );

    if (historyStatements.length > 0) {
      await env.DB.batch(historyStatements);
    }
  } catch {
    // field_history write failure must not block the main operation
  }

  return jsonResult({ uuid });
}

// ── get_organization ──────────────────────────────────────────────────────────

interface GetOrganizationArgs {
  name?: string;
  uuid?: string;
}

export async function toolGetOrganization(
  args: GetOrganizationArgs,
  userEmail: string,
  env: Env
): Promise<unknown> {
  if (!args.uuid && !args.name) {
    return textResult('Either name or uuid is required');
  }

  let org: Record<string, unknown> | null = null;

  if (args.uuid) {
    // Exact match by UUID
    org = await env.DB.prepare(`
      SELECT uuid, name, name_en, name_normalized, aliases, industry, summary,
             source_url, metadata_json, review_flag, created_at, updated_at
      FROM organizations
      WHERE uuid = ? AND user_email = ?
    `).bind(args.uuid, userEmail).first<Record<string, unknown>>();
  } else if (args.name) {
    // Step 1: Exact match by name_normalized
    const nameNormalized = await normalizeName(args.name, env);
    org = await env.DB.prepare(`
      SELECT uuid, name, name_en, name_normalized, aliases, industry, summary,
             source_url, metadata_json, review_flag, created_at, updated_at
      FROM organizations
      WHERE user_email = ? AND name_normalized = ?
    `).bind(userEmail, nameNormalized).first<Record<string, unknown>>();

    // Step 2: Fuzzy search on name / name_en / aliases
    if (!org) {
      const likePattern = `%${args.name}%`;
      org = await env.DB.prepare(`
        SELECT uuid, name, name_en, name_normalized, aliases, industry, summary,
               source_url, metadata_json, review_flag, created_at, updated_at
        FROM organizations
        WHERE user_email = ? AND (
          name LIKE ? OR name_en LIKE ? OR aliases LIKE ?
        )
        LIMIT 1
      `).bind(userEmail, likePattern, likePattern, likePattern).first<Record<string, unknown>>();
    }
  }

  if (!org) {
    return jsonResult({ result: null });
  }

  // Query related_cards_count
  const countRow = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM received_cards
    WHERE user_email = ? AND organization_normalized = ? AND deleted_at IS NULL
  `).bind(userEmail, org.name_normalized as string).first<{ count: number }>();

  const relatedCardsCount = countRow?.count ?? 0;

  // Calculate freshness
  const updatedAt = (org.updated_at ?? org.created_at) as number;
  const daysSinceUpdate = (Date.now() - updatedAt) / 86400000;

  // Event-triggered: count new cards since last org update
  const newCardsSinceUpdate = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM received_cards
    WHERE user_email = ? AND organization_normalized = ?
    AND deleted_at IS NULL AND created_at > ?
  `).bind(userEmail, org.name_normalized as string, updatedAt).first<{ count: number }>();

  const newCardsCount = newCardsSinceUpdate?.count ?? 0;

  let freshnessStatus: string;
  let refreshHint: string | null = null;
  let freshnessReason: string | null = null;

  if (daysSinceUpdate > 30) {
    freshnessStatus = 'stale';
    refreshHint = 'Summary is over 30 days old. Consider re-researching.';
  } else if (newCardsCount >= 5) {
    freshnessStatus = 'refresh_recommended';
    freshnessReason = `${newCardsCount} new cards added since last update`;
    refreshHint = `${newCardsCount} new cards with this organization have been added. Consider reviewing and updating the profile.`;
  } else {
    freshnessStatus = 'fresh';
  }

  const result = {
    ...org,
    review_flag: (org.review_flag as string | null) ?? null,
    related_cards_count: relatedCardsCount,
    freshness: {
      days_since_update: Math.floor(daysSinceUpdate),
      status: freshnessStatus,
      refresh_hint: refreshHint,
      new_cards_since_update: newCardsCount,
      ...(freshnessReason && { reason: freshnessReason }),
    },
  };

  return jsonResult(result);
}

// ── update_organization ───────────────────────────────────────────────────────

interface UpdateOrganizationArgs {
  uuid: string;
  name?: string;
  name_en?: string;
  industry?: string;
  summary?: string;
  source_url?: string;
  aliases?: string;
  metadata_json?: string;
}

export async function toolUpdateOrganization(
  args: UpdateOrganizationArgs,
  userEmail: string,
  env: Env,
  clientId: string | null
): Promise<unknown> {
  if (!args.uuid) {
    return textResult('uuid is required');
  }

  // Validate ownership
  const existing = await env.DB.prepare(`
    SELECT uuid, name, name_en, name_normalized, aliases, industry, summary,
           source_url, metadata_json, updated_at
    FROM organizations
    WHERE uuid = ? AND user_email = ?
  `).bind(args.uuid, userEmail).first<Record<string, unknown>>();

  if (!existing) {
    return textResult('Organization not found or not authorized');
  }

  // Validate name length
  if (args.name && args.name.length > NAME_MAX) {
    return textResult(`Field 'name' exceeds maximum length of ${NAME_MAX}`);
  }

  // Validate summary length
  if (args.summary && args.summary.length > SUMMARY_MAX) {
    return textResult(`Field 'summary' exceeds maximum length of ${SUMMARY_MAX}`);
  }

  // Validate source_url scheme
  if (args.source_url && !isValidSourceUrl(args.source_url)) {
    return textResult('source_url must use http:// or https:// scheme');
  }

  // Validate aliases JSON if provided
  if (args.aliases) {
    try {
      const parsed = JSON.parse(args.aliases);
      if (!Array.isArray(parsed)) {
        return textResult('aliases must be a JSON array of strings');
      }
    } catch {
      return textResult('aliases must be a valid JSON array');
    }
  }

  // If updating name, re-normalize + check UNIQUE
  let newNameNormalized: string | null = null;
  if (args.name) {
    newNameNormalized = await normalizeName(args.name, env);
    // Check uniqueness only if normalized name changed
    if (newNameNormalized !== existing.name_normalized) {
      const conflict = await env.DB.prepare(
        `SELECT uuid FROM organizations WHERE user_email = ? AND name_normalized = ? AND uuid != ?`
      ).bind(userEmail, newNameNormalized, args.uuid).first<{ uuid: string }>();

      if (conflict) {
        return jsonResult({ error: 'organization_exists', existing_uuid: conflict.uuid });
      }
    }
  }

  // Build SET clauses
  const setClauses: string[] = [];
  const bindings: unknown[] = [];
  const fieldsToUpdate: { field: string; newValue: string | null }[] = [];

  const updatableFields = ['name', 'name_en', 'industry', 'summary', 'source_url', 'aliases', 'metadata_json'] as const;

  for (const field of updatableFields) {
    if (args[field] !== undefined) {
      const value = args[field] ?? null;
      setClauses.push(`${field} = ?`);
      bindings.push(value);
      fieldsToUpdate.push({ field, newValue: value });
    }
  }

  // Re-check content safety if summary changes
  if (args.summary !== undefined) {
    const newReviewFlag = args.summary ? checkContentSafety(args.summary) : null;
    setClauses.push('review_flag = ?');
    bindings.push(newReviewFlag);
  }

  // Update name_normalized if name was changed
  if (newNameNormalized !== null) {
    setClauses.push('name_normalized = ?');
    bindings.push(newNameNormalized);
  }

  if (setClauses.length === 0) {
    return textResult('No fields to update');
  }

  // Determine if summary actually changed (avoid fake freshness)
  const summaryChanged = args.summary !== undefined && args.summary !== existing.summary;
  const hasNonSummaryChanges = fieldsToUpdate.some(f => f.field !== 'summary');
  const shouldUpdateTimestamp = summaryChanged || hasNonSummaryChanges;

  const now = Date.now();
  if (shouldUpdateTimestamp) {
    setClauses.push('updated_at = ?');
    bindings.push(now);
  }

  bindings.push(args.uuid, userEmail);

  await env.DB.prepare(`
    UPDATE organizations
    SET ${setClauses.join(', ')}
    WHERE uuid = ? AND user_email = ?
  `).bind(...bindings).run();

  // Write field_history (non-blocking)
  try {
    const historyStatements = fieldsToUpdate
      .filter(f => {
        const oldVal = existing[f.field];
        const oldStr = oldVal == null ? null : String(oldVal);
        return oldStr !== f.newValue;
      })
      .map(f => {
        const oldVal = existing[f.field];
        const oldStr = oldVal == null ? null : String(oldVal);
        return env.DB.prepare(`
          INSERT INTO field_history (entity_type, entity_uuid, field_name, old_value, new_value, source_type, client_id, user_email, changed_at)
          VALUES ('organization', ?, ?, ?, ?, 'mcp_agent', ?, ?, ?)
        `).bind(args.uuid, f.field, oldStr, f.newValue, clientId, userEmail, now);
      });

    if (historyStatements.length > 0) {
      await env.DB.batch(historyStatements);
    }
  } catch {
    // field_history write failure must not block the main operation
  }

  return jsonResult({ uuid: args.uuid, updated: true });
}

// ── apply_organization_summary ─────────────────────────────────────────────

interface ApplyOrgSummaryArgs {
  org_uuid?: string;
  confirm_token?: string;
}

interface BatchConfirmData {
  org_uuid: string;
  affected_uuids: string[];
  user_email: string;
  expires_at: number;
}

export async function toolApplyOrganizationSummary(
  args: ApplyOrgSummaryArgs,
  userEmail: string,
  env: Env,
  clientId: string | null
): Promise<unknown> {
  // ── Execute mode: confirm_token provided ──────────────────────────────────
  if (args.confirm_token) {
    const kvKey = `batch_confirm:${args.confirm_token}`;
    const stored = await env.KV.get(kvKey, 'json') as BatchConfirmData | null;

    if (!stored || stored.expires_at < Date.now()) {
      return jsonResult({ error: 'token_expired' });
    }

    if (stored.user_email !== userEmail) {
      return jsonResult({ error: 'token_expired' });
    }

    // Fetch org summary
    const org = await env.DB.prepare(`
      SELECT summary FROM organizations WHERE uuid = ? AND user_email = ?
    `).bind(stored.org_uuid, userEmail).first<{ summary: string | null }>();

    if (!org || !org.summary) {
      return jsonResult({ error: 'organization_has_no_summary' });
    }

    const now = Date.now();
    const nowStr = now.toString();

    // Batch update in chunks of 100
    const uuids = stored.affected_uuids;
    const CHUNK_SIZE = 100;
    let applied = 0;

    for (let i = 0; i < uuids.length; i += CHUNK_SIZE) {
      const chunk = uuids.slice(i, i + CHUNK_SIZE);
      const updateStatements = chunk.map(uuid =>
        env.DB.prepare(`
          UPDATE received_cards SET company_summary = ?, updated_at = ? WHERE uuid = ? AND user_email = ?
        `).bind(org.summary, nowStr, uuid, userEmail)
      );
      const results = await env.DB.batch(updateStatements);
      for (const r of results) {
        applied += r.meta.changes;
      }
    }

    // Write field_history for each card (non-blocking, chunked)
    try {
      for (let i = 0; i < uuids.length; i += CHUNK_SIZE) {
        const chunk = uuids.slice(i, i + CHUNK_SIZE);
        const historyStatements = chunk.map(uuid =>
          env.DB.prepare(`
            INSERT INTO field_history (entity_type, entity_uuid, field_name, old_value, new_value, source_type, client_id, user_email, changed_at)
            VALUES ('card', ?, 'company_summary', NULL, ?, 'mcp_agent', ?, ?, ?)
          `).bind(uuid, org.summary, clientId, userEmail, now)
        );
        await env.DB.batch(historyStatements);
      }
    } catch { /* field_history failure must not block main operation */ }

    // Delete KV token (one-time use)
    await env.KV.delete(kvKey);

    // Write audit_log
    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (event_type, timestamp, details)
        VALUES ('mcp_tool_call', ?, ?)
      `).bind(now, JSON.stringify({
        tool: 'apply_organization_summary',
        email: userEmail,
        org_uuid: stored.org_uuid,
        applied,
        batch: true,
      })).run();
    } catch { /* audit failure must not block */ }

    return jsonResult({ applied, org_uuid: stored.org_uuid });
  }

  // ── Preview mode: no confirm_token ────────────────────────────────────────
  if (!args.org_uuid) {
    return textResult('org_uuid is required for preview');
  }

  // Verify org exists and belongs to user
  const org = await env.DB.prepare(`
    SELECT uuid, name_normalized, summary FROM organizations
    WHERE uuid = ? AND user_email = ?
  `).bind(args.org_uuid, userEmail).first<{ uuid: string; name_normalized: string; summary: string | null }>();

  if (!org) {
    return textResult('Organization not found or not authorized');
  }

  if (!org.summary) {
    return jsonResult({ error: 'organization_has_no_summary' });
  }

  // Find cards of the same org (by organization_normalized)
  const cards = await env.DB.prepare(`
    SELECT uuid, full_name, company_summary
    FROM received_cards
    WHERE user_email = ? AND organization_normalized = ? AND deleted_at IS NULL
  `).bind(userEmail, org.name_normalized).all<{ uuid: string; full_name: string; company_summary: string | null }>();

  const allUuids = (cards.results ?? []).map(c => c.uuid);

  // Find cards with user_manual company_summary (to skip)
  let userManualUuids: Set<string> = new Set();
  if (allUuids.length > 0) {
    // Query in chunks to avoid SQL parameter limits
    const PARAM_CHUNK = 50;
    for (let i = 0; i < allUuids.length; i += PARAM_CHUNK) {
      const chunk = allUuids.slice(i, i + PARAM_CHUNK);
      const placeholders = chunk.map(() => '?').join(',');
      const manualRows = await env.DB.prepare(`
        SELECT DISTINCT entity_uuid FROM field_history
        WHERE entity_type = 'card' AND field_name = 'company_summary' AND source_type = 'user_manual'
        AND entity_uuid IN (${placeholders})
      `).bind(...chunk).all<{ entity_uuid: string }>();
      for (const row of manualRows.results ?? []) {
        userManualUuids.add(row.entity_uuid);
      }
    }
  }

  const affectedCards = (cards.results ?? []).filter(c => !userManualUuids.has(c.uuid));
  const affectedUuids = affectedCards.map(c => c.uuid);
  const skippedCount = allUuids.length - affectedUuids.length;

  // Generate confirm token
  const confirmToken = crypto.randomUUID();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Store in KV
  const tokenData: BatchConfirmData = {
    org_uuid: args.org_uuid,
    affected_uuids: affectedUuids,
    user_email: userEmail,
    expires_at: expiresAt,
  };
  await env.KV.put(`batch_confirm:${confirmToken}`, JSON.stringify(tokenData), { expirationTtl: 300 });

  // Preview list (max 20)
  const previewList = affectedCards.slice(0, 20).map(c => ({
    uuid: c.uuid,
    full_name: c.full_name,
    current_summary: c.company_summary,
  }));

  return jsonResult({
    affected_cards: affectedUuids.length,
    skipped_user_manual: skippedCount,
    preview: previewList,
    confirm_token: confirmToken,
    token_expires_at: expiresAt,
  });
}
