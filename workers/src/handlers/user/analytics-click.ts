/**
 * Click Tracking Handler - Phase 3.0
 * POST /api/user/analytics/click
 *
 * Privacy-first: stores only query_hash (SHA-256), result_uuid, and rank.
 * No raw query text, no result content, no IP address.
 * Non-blocking: D1 write dispatched via ctx.waitUntil.
 * Rate limited: 100 clicks/hour per user.
 */

import type { Env } from '../../types';
import { verifyOAuth } from '../../middleware/oauth';

const RATE_LIMIT_WINDOW = 3600;   // 1 hour in seconds
const RATE_LIMIT_MAX = 100;       // 100 clicks per hour per user

interface ClickPayload {
  query_hash: string;
  query_event_id?: string;  // Phase 3.0.5a: stable direct reference
  result_uuid: string;
  result_rank: number;
  result_source?: string;   // Phase 3.0.5a: semantic/keyword/hybrid
  timestamp: number;
}

/** Validate query_hash is a 64-char hex string (SHA-256). */
function isValidQueryHash(hash: unknown): hash is string {
  return typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash);
}

/** Validate result_uuid is a UUID v4 (hyphenated). */
function isValidUuid(uuid: unknown): uuid is string {
  return typeof uuid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

/** Generate a UUID v4 for event_id. */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Check if user has exceeded the click rate limit (100/hour).
 * Returns true if rate limited, false if allowed.
 * Increments the counter on each call.
 */
async function isRateLimited(env: Env, userEmail: string): Promise<boolean> {
  const key = `rate_limit:click:${userEmail}`;
  try {
    const countStr = await env.KV.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;

    if (count >= RATE_LIMIT_MAX) {
      return true;
    }

    await env.KV.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW });
    return false;
  } catch {
    // KV failure → fail open (don't block clicks)
    return false;
  }
}

/**
 * Write click event to D1 (called non-blocking via ctx.waitUntil).
 */
async function persistClickEvent(
  env: Env,
  userEmail: string,
  payload: ClickPayload,
): Promise<void> {
  const eventId = generateUUID();
  await env.DB.prepare(`
    INSERT INTO click_events (event_id, user_email, query_hash, result_uuid, result_rank, timestamp, query_event_id, result_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    eventId,
    userEmail,
    payload.query_hash,
    payload.result_uuid,
    payload.result_rank,
    payload.timestamp,
    payload.query_event_id || null,
    payload.result_source || null,
  ).run();

  // Phase 3.0.5a: Invalidate realtime signals cache
  await env.KV.delete(`realtime_signals:${userEmail}`).catch(() => {});

  console.log(`[Click] event_id=${eventId} user=${userEmail} rank=${payload.result_rank}`);
}

export async function handleAnalyticsClick(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  // 1. Optional auth — silently succeed if unauthenticated (fire-and-forget UX)
  const authResult = await verifyOAuth(request, env);
  if (authResult instanceof Response) {
    // Auth failed: return success silently (don't block UI)
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const { email: userEmail } = authResult;

  // 2. Rate limit: 100 clicks/hour per user
  const limited = await isRateLimited(env, userEmail);
  if (limited) {
    return new Response(JSON.stringify({ success: false, error: 'rate_limit_exceeded' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(RATE_LIMIT_WINDOW),
      },
    });
  }

  // 3. Parse and validate body
  let payload: ClickPayload;
  try {
    payload = await request.json() as ClickPayload;
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isValidQueryHash(payload.query_hash)) {
    return new Response(JSON.stringify({ success: false, error: 'invalid_query_hash' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isValidUuid(payload.result_uuid)) {
    return new Response(JSON.stringify({ success: false, error: 'invalid_result_uuid' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (typeof payload.result_rank !== 'number' || payload.result_rank < 1) {
    return new Response(JSON.stringify({ success: false, error: 'invalid_result_rank' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Clamp timestamp to reasonable range (use server time if missing/invalid)
  const timestamp = typeof payload.timestamp === 'number' && payload.timestamp > 0
    ? payload.timestamp
    : Date.now();

  // 4. Non-blocking D1 write
  ctx.waitUntil(
    persistClickEvent(env, userEmail, { ...payload, timestamp }).catch(err => {
      console.warn('[Click] persistClickEvent failed:', err instanceof Error ? err.message : String(err));
    }),
  );

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
