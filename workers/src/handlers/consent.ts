// Consent Management Handlers (No-Email Version)
// 個資同意管理系統（去 Email 化版本）

import type { Env } from '../types';
import { verifyOAuth } from '../middleware/oauth';
import { jsonResponse, errorResponse } from '../utils/response';
import { anonymizeIP } from '../utils/audit';

/**
 * Consent management constants
 */
const WITHDRAWAL_GRACE_PERIOD_DAYS = 30;  // 撤回緩衝期
const DATA_RETENTION_DAYS = 90;            // 資料保存期限
const AUDIT_LOG_RETENTION_DAYS = 90;       // 審計日誌保存期限
const PRIVACY_POLICY_BASE_URL = 'https://db-card.moda.gov.tw/privacy-policy';

// Helper functions
const daysToMs = (days: number): number => days * 24 * 60 * 60 * 1000;
const msToSeconds = (ms: number): number => Math.floor(ms / 1000);

// Status constants
const CONSENT_STATUS = {
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
} as const;

const CONSENT_TYPE = {
  REQUIRED: 'required',
  OPTIONAL: 'optional'
} as const;

const CONSENT_CATEGORY = {
  SERVICE: 'service',
  ANALYTICS: 'analytics'
} as const;

/**
 * Log consent audit event
 */
async function logConsentEvent(
  db: D1Database,
  eventType: 'consent_accept' | 'consent_withdraw' | 'consent_restore' | 'data_export',
  email: string,
  request: Request,
  details?: Record<string, any>
): Promise<void> {
  try {
    const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    const userAgent = request.headers.get('User-Agent') || 'unknown';

    await db.prepare(`
      INSERT INTO audit_logs (
        event_type, user_agent, ip_address, timestamp, details
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      eventType,
      userAgent,
      anonymizeIP(ip),
      Date.now(),
      details ? JSON.stringify({ ...details, actor_type: 'user', actor_id: email }) : null
    ).run();
  } catch (error) {
    console.error('Failed to log consent event:', error);
  }
}

/**
 * GET /api/consent/check
 * Check if user needs to consent or update consent
 */
export async function handleConsentCheck(request: Request, env: Env): Promise<Response> {
  try {
    // OAuth verification
    const authResult = await verifyOAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { email } = authResult;

    // Get current privacy policy version
    const currentPolicy = await env.DB.prepare(`
      SELECT version, effective_date, summary_zh, summary_en, content_zh, content_en, purposes
      FROM privacy_policy_versions
      WHERE is_active = 1
      ORDER BY version DESC
      LIMIT 1
    `).first<{
      version: string;
      effective_date: number;
      summary_zh: string;
      summary_en: string;
      content_zh: string;
      content_en: string;
      purposes: string;
    }>();

    if (!currentPolicy) {
      return errorResponse('no_policy', 'No active privacy policy found', 500, request);
    }

    // Check user's latest consent record
    const latestConsent = await env.DB.prepare(`
      SELECT consent_version, consent_status, consented_at, withdrawn_at, deletion_scheduled_at, restored_at
      FROM consent_records
      WHERE user_email = ? AND consent_type = 'required' AND consent_category = 'service'
      ORDER BY consented_at DESC
      LIMIT 1
    `).bind(email).first<{
      consent_version: string;
      consent_status: string;
      consented_at: number;
      withdrawn_at: number | null;
      deletion_scheduled_at: number | null;
      restored_at: number | null;
    }>();

    // Case 1: No consent record - needs consent (first login or existing user)
    if (!latestConsent) {
      return jsonResponse({
        needs_consent: true,
        reason: 'first_login',
        current_policy: {
          version: currentPolicy.version,
          effective_date: currentPolicy.effective_date,
          summary_zh: currentPolicy.summary_zh,
          summary_en: currentPolicy.summary_en,
          content_zh: currentPolicy.content_zh,
          content_en: currentPolicy.content_en,
          purposes: JSON.parse(currentPolicy.purposes)
        }
      }, 200, request);
    }

    // Case 2: Consent withdrawn - show restore option
    if (latestConsent.consent_status === 'withdrawn' && latestConsent.deletion_scheduled_at) {
      const now = Date.now();
      const daysRemaining = Math.ceil((latestConsent.deletion_scheduled_at - now) / (1000 * 60 * 60 * 24));

      return jsonResponse({
        needs_consent: false,
        is_withdrawn: true,
        withdrawn_at: latestConsent.withdrawn_at,
        deletion_scheduled_at: latestConsent.deletion_scheduled_at,
        days_remaining: daysRemaining,
        can_restore: daysRemaining > 0
      }, 200, request);
    }

    // Case 3: Consent accepted but version outdated - needs update
    if (latestConsent.consent_status === 'accepted' && latestConsent.consent_version !== currentPolicy.version) {
      return jsonResponse({
        needs_consent: true,
        reason: 'version_update',
        current_version: latestConsent.consent_version,
        new_version: currentPolicy.version,
        current_policy: {
          version: currentPolicy.version,
          effective_date: currentPolicy.effective_date,
          summary_zh: currentPolicy.summary_zh,
          summary_en: currentPolicy.summary_en,
          content_zh: currentPolicy.content_zh,
          content_en: currentPolicy.content_en,
          purposes: JSON.parse(currentPolicy.purposes)
        }
      }, 200, request);
    }

    // Case 4: All good - no consent needed
    return jsonResponse({
      needs_consent: false,
      is_withdrawn: false,
      current_consent: {
        version: latestConsent.consent_version,
        consented_at: latestConsent.consented_at
      }
    }, 200, request);

  } catch (error) {
    console.error('Error checking consent:', error);
    return errorResponse('internal_error', 'Failed to check consent', 500, request);
  }
}

/**
 * POST /api/consent/accept
 * Record user consent (required + optional analytics)
 */
export async function handleConsentAccept(request: Request, env: Env): Promise<Response> {
  try {
    // OAuth verification
    const authResult = await verifyOAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { email } = authResult;

    // Parse request body
    let body: {
      consent_analytics?: boolean; // 匿名統計同意（選擇性）
    };
    try {
      body = await request.json();
    } catch (error) {
      body = {};
    }

    // Get current policy version
    const currentPolicy = await env.DB.prepare(`
      SELECT version FROM privacy_policy_versions
      WHERE is_active = 1
      ORDER BY version DESC
      LIMIT 1
    `).first<{ version: string }>();

    if (!currentPolicy) {
      return errorResponse('no_policy', 'No active privacy policy found', 500, request);
    }

    const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    const userAgent = request.headers.get('User-Agent') || 'unknown';
    const now = Date.now();
    const privacyPolicyUrl = `${PRIVACY_POLICY_BASE_URL}/${currentPolicy.version}`;

    // Insert required consent record
    await env.DB.prepare(`
      INSERT INTO consent_records (
        user_email, consent_version, consent_type, consent_category,
        consent_status, consented_at, ip_address, user_agent, privacy_policy_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      email,
      currentPolicy.version,
      CONSENT_TYPE.REQUIRED,
      CONSENT_CATEGORY.SERVICE,
      CONSENT_STATUS.ACCEPTED,
      now,
      anonymizeIP(ip),
      userAgent,
      privacyPolicyUrl
    ).run();

    // Insert optional analytics consent if provided
    if (body.consent_analytics !== undefined) {
      await env.DB.prepare(`
        INSERT INTO consent_records (
          user_email, consent_version, consent_type, consent_category,
          consent_status, consented_at, ip_address, user_agent, privacy_policy_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        email,
        currentPolicy.version,
        CONSENT_TYPE.OPTIONAL,
        CONSENT_CATEGORY.ANALYTICS,
        body.consent_analytics ? CONSENT_STATUS.ACCEPTED : CONSENT_STATUS.REJECTED,
        now,
        anonymizeIP(ip),
        userAgent,
        privacyPolicyUrl
      ).run();
    }

    // Log audit event
    await logConsentEvent(env.DB, 'consent_accept', email, request, {
      version: currentPolicy.version,
      consent_analytics: body.consent_analytics
    });

    return jsonResponse({
      success: true,
      message: 'Consent recorded successfully',
      consented_at: now,
      version: currentPolicy.version
    }, 201, request);

  } catch (error) {
    console.error('Error accepting consent:', error);
    return errorResponse('internal_error', 'Failed to record consent', 500, request);
  }
}

/**
 * POST /api/consent/withdraw
 * Withdraw consent - mark for deletion in 30 days
 */
export async function handleConsentWithdraw(request: Request, env: Env): Promise<Response> {
  try {
    // OAuth verification
    const authResult = await verifyOAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { email } = authResult;

    // Check current consent status (or create implicit consent for existing users)
    const latestConsent = await env.DB.prepare(`
      SELECT consent_status, withdrawn_at
      FROM consent_records
      WHERE user_email = ? AND consent_type = 'required'
      ORDER BY consented_at DESC
      LIMIT 1
    `).bind(email).first<{ consent_status: string; withdrawn_at: number | null }>();

    // For existing users without consent record, create implicit consent first
    if (!latestConsent) {
      const currentPolicy = await env.DB.prepare(`
        SELECT version FROM privacy_policy_versions
        WHERE is_active = 1
        ORDER BY version DESC
        LIMIT 1
      `).first<{ version: string }>();

      if (currentPolicy) {
        const now = Date.now();
        const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
        const userAgent = request.headers.get('User-Agent') || 'unknown';
        const privacyPolicyUrl = `${PRIVACY_POLICY_BASE_URL}/${currentPolicy.version}`;

        await env.DB.prepare(`
          INSERT INTO consent_records (
            user_email, consent_version, consent_type, consent_category,
            consent_status, consented_at, ip_address, user_agent, privacy_policy_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          email,
          currentPolicy.version,
          CONSENT_TYPE.REQUIRED,
          CONSENT_CATEGORY.SERVICE,
          CONSENT_STATUS.ACCEPTED,
          now,
          anonymizeIP(ip),
          userAgent,
          privacyPolicyUrl
        ).run();
      }
    }

    // Re-check after implicit consent creation
    const consent = await env.DB.prepare(`
      SELECT consent_status, withdrawn_at
      FROM consent_records
      WHERE user_email = ? AND consent_type = 'required'
      ORDER BY consented_at DESC
      LIMIT 1
    `).bind(email).first<{ consent_status: string; withdrawn_at: number | null }>();

    if (!consent) {
      return errorResponse('no_consent', 'No consent record found', 404, request);
    }

    if (consent.consent_status === 'withdrawn') {
      return errorResponse('already_withdrawn', 'Consent already withdrawn', 400, request);
    }

    const now = Date.now();
    const deletionScheduled = now + daysToMs(WITHDRAWAL_GRACE_PERIOD_DAYS);

    // Use batch() for atomic transaction
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE consent_records
        SET consent_status = ?,
            withdrawn_at = ?,
            deletion_scheduled_at = ?
        WHERE user_email = ?
      `).bind(CONSENT_STATUS.WITHDRAWN, now, deletionScheduled, email),

      env.DB.prepare(`
        UPDATE uuid_bindings
        SET status = 'revoked', revoked_at = ?
        WHERE bound_email = ? AND status = 'bound'
      `).bind(msToSeconds(now), email),

      env.DB.prepare(`
        UPDATE read_sessions
        SET revoked_at = ?, revoked_reason = 'admin'
        WHERE card_uuid IN (
          SELECT uuid FROM uuid_bindings WHERE bound_email = ?
        ) AND revoked_at IS NULL
      `).bind(now, email)
    ]);

    // Log audit event
    await logConsentEvent(env.DB, 'consent_withdraw', email, request, {
      deletion_scheduled_at: deletionScheduled
    });

    return jsonResponse({
      success: true,
      message: 'Consent withdrawn successfully',
      withdrawn_at: now,
      deletion_scheduled_at: deletionScheduled,
      days_until_deletion: 30
    }, 200, request);

  } catch (error) {
    console.error('Error withdrawing consent:', error);
    return errorResponse('internal_error', 'Failed to withdraw consent', 500, request);
  }
}

/**
 * POST /api/consent/restore
 * Restore withdrawn consent within 30 days
 */
export async function handleConsentRestore(request: Request, env: Env): Promise<Response> {
  try {
    // OAuth verification
    const authResult = await verifyOAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { email } = authResult;

    // Check current consent status
    const latestConsent = await env.DB.prepare(`
      SELECT consent_status, withdrawn_at, deletion_scheduled_at
      FROM consent_records
      WHERE user_email = ? AND consent_type = 'required'
      ORDER BY consented_at DESC
      LIMIT 1
    `).bind(email).first<{
      consent_status: string;
      withdrawn_at: number | null;
      deletion_scheduled_at: number | null;
    }>();

    if (!latestConsent) {
      return errorResponse('no_consent', 'No consent record found', 404, request);
    }

    if (latestConsent.consent_status !== 'withdrawn') {
      return errorResponse('not_withdrawn', 'Consent is not withdrawn', 400, request);
    }

    // Check if still within 30-day window
    const now = Date.now();
    if (latestConsent.deletion_scheduled_at && now >= latestConsent.deletion_scheduled_at) {
      return errorResponse('restore_expired', 'Restore window expired, data has been deleted', 403, request);
    }

    // Use batch() for atomic transaction
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE consent_records
        SET consent_status = ?,
            withdrawn_at = NULL,
            deletion_scheduled_at = NULL,
            restored_at = ?
        WHERE user_email = ?
      `).bind(CONSENT_STATUS.ACCEPTED, now, email),

      env.DB.prepare(`
        UPDATE uuid_bindings
        SET status = 'bound', revoked_at = NULL
        WHERE bound_email = ? AND status = 'revoked'
      `).bind(email)
    ]);

    // Log audit event
    await logConsentEvent(env.DB, 'consent_restore', email, request);

    return jsonResponse({
      success: true,
      message: 'Consent restored successfully',
      restored_at: now
    }, 200, request);

  } catch (error) {
    console.error('Error restoring consent:', error);
    return errorResponse('internal_error', 'Failed to restore consent', 500, request);
  }
}

/**
 * GET /api/consent/history
 * Get user's consent history
 */
export async function handleConsentHistory(request: Request, env: Env): Promise<Response> {
  try {
    // OAuth verification
    const authResult = await verifyOAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { email } = authResult;

    // Get all consent records for user
    const records = await env.DB.prepare(`
      SELECT
        consent_version,
        consent_type,
        consent_category,
        consent_status,
        consented_at,
        withdrawn_at,
        restored_at,
        privacy_policy_url
      FROM consent_records
      WHERE user_email = ?
      ORDER BY consented_at DESC
    `).bind(email).all();

    const history = records.results.map((record: any) => ({
      version: record.consent_version,
      type: record.consent_type,
      category: record.consent_category,
      status: record.consent_status,
      consented_at: record.consented_at,
      withdrawn_at: record.withdrawn_at,
      restored_at: record.restored_at,
      policy_url: record.privacy_policy_url
    }));

    return jsonResponse({
      history,
      total: history.length
    }, 200, request);

  } catch (error) {
    console.error('Error fetching consent history:', error);
    return errorResponse('internal_error', 'Failed to fetch consent history', 500, request);
  }
}

/**
 * POST /api/data/export
 * Export user data (instant browser download, no email)
 */
export async function handleDataExport(request: Request, env: Env): Promise<Response> {
  try {
    // OAuth verification
    const authResult = await verifyOAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { email } = authResult;

    // Collect all user data

    // 1. User info
    const userInfo = {
      email,
      exported_at: new Date().toISOString()
    };

    // 2. Consent records
    const consentRecords = await env.DB.prepare(`
      SELECT * FROM consent_records
      WHERE user_email = ?
      ORDER BY consented_at DESC
    `).bind(email).all();

    // 3. Cards
    const cards = await env.DB.prepare(`
      SELECT b.uuid, b.type, b.status, b.bound_at, b.revoked_at, b.created_ip
      FROM uuid_bindings b
      WHERE b.bound_email = ?
    `).bind(email).all();

    // 4. Audit logs (last 90 days)
    const retentionCutoff = Date.now() - daysToMs(AUDIT_LOG_RETENTION_DAYS);
    const auditLogs = await env.DB.prepare(`
      SELECT event_type, card_uuid, timestamp, details
      FROM audit_logs
      WHERE timestamp > ? AND details LIKE ?
      ORDER BY timestamp DESC
    `).bind(retentionCutoff, `%${email}%`).all();

    // 5. Read sessions
    const sessions = await env.DB.prepare(`
      SELECT s.session_id, s.card_uuid, s.issued_at, s.expires_at, s.reads_used, s.revoked_at
      FROM read_sessions s
      JOIN uuid_bindings b ON s.card_uuid = b.uuid
      WHERE b.bound_email = ?
      ORDER BY s.issued_at DESC
    `).bind(email).all();

    // Compile export data
    const exportData = {
      user_info: userInfo,
      consent_records: consentRecords.results,
      cards: cards.results,
      audit_logs: auditLogs.results,
      read_sessions: sessions.results,
      export_metadata: {
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        data_retention_policy: '帳號存續期間 + 刪除後 90 天'
      }
    };

    // Log audit event
    await logConsentEvent(env.DB, 'data_export', email, request);

    // Return JSON for immediate download
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="db-card-data-export-${email}-${Date.now()}.json"`
      }
    });

  } catch (error) {
    console.error('Error exporting data:', error);
    return errorResponse('internal_error', 'Failed to export data', 500, request);
  }
}

/**
 * GET /api/privacy-policy/current
 * Get current privacy policy
 */
export async function handlePrivacyPolicyCurrent(request: Request, env: Env): Promise<Response> {
  try {
    const currentPolicy = await env.DB.prepare(`
      SELECT
        version,
        effective_date,
        content_zh,
        content_en,
        summary_zh,
        summary_en,
        purposes,
        changes_summary_zh,
        changes_summary_en
      FROM privacy_policy_versions
      WHERE is_active = 1
      ORDER BY version DESC
      LIMIT 1
    `).first<{
      version: string;
      effective_date: number;
      content_zh: string;
      content_en: string;
      summary_zh: string;
      summary_en: string;
      purposes: string;
      changes_summary_zh: string | null;
      changes_summary_en: string | null;
    }>();

    if (!currentPolicy) {
      return errorResponse('no_policy', 'No active privacy policy found', 404, request);
    }

    return jsonResponse({
      version: currentPolicy.version,
      effective_date: currentPolicy.effective_date,
      content_zh: currentPolicy.content_zh,
      content_en: currentPolicy.content_en,
      summary_zh: currentPolicy.summary_zh,
      summary_en: currentPolicy.summary_en,
      purposes: JSON.parse(currentPolicy.purposes),
      changes_summary_zh: currentPolicy.changes_summary_zh,
      changes_summary_en: currentPolicy.changes_summary_en
    }, 200, request);

  } catch (error) {
    console.error('Error fetching privacy policy:', error);
    return errorResponse('internal_error', 'Failed to fetch privacy policy', 500, request);
  }
}
