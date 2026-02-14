import { createLocalJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Env } from '../types';
import { errorResponse, jsonResponse } from '../utils/response';
import { getJWKS } from '../utils/jwks-manager';
import { revokeOAuthSessionsForUser } from '../utils/oauth-session-index';
import { setUserDisabled } from '../utils/user-security';
import { anonymizeIP } from '../utils/audit';

const RISC_EVENT_ACCOUNT_DISABLED = 'https://schemas.openid.net/secevent/risc/event-type/account-disabled';
const RISC_EVENT_SESSIONS_REVOKED = 'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked';
const SUPPORTED_EVENT_TYPES = new Set([
  RISC_EVENT_ACCOUNT_DISABLED,
  RISC_EVENT_SESSIONS_REVOKED
]);

const ALLOWED_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const CLOCK_TOLERANCE_SECONDS = 60;

interface SecurityEventPayload extends JWTPayload {
  events?: Record<string, unknown>;
}

function parseAudience(aud: JWTPayload['aud']): string[] {
  if (typeof aud === 'string') {
    return [aud];
  }
  if (Array.isArray(aud)) {
    return aud.filter((value): value is string => typeof value === 'string');
  }
  return [];
}

function extractSubjectEmail(payload: SecurityEventPayload, details: unknown): string | null {
  const candidates: unknown[] = [
    payload.email,
    payload.sub,
    (details as any)?.email,
    (details as any)?.sub,
    (details as any)?.subject?.email,
    (details as any)?.subject?.sub,
    (details as any)?.account?.email
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.includes('@')) {
      return candidate.toLowerCase();
    }
  }

  return null;
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function logRiscAudit(
  env: Env,
  request: Request,
  eventType: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    const userAgent = request.headers.get('User-Agent') || 'unknown';

    await env.DB.prepare(`
      INSERT INTO audit_logs (event_type, user_agent, ip_address, timestamp, details)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      eventType,
      userAgent,
      anonymizeIP(ip),
      Date.now(),
      JSON.stringify(details)
    ).run();
  } catch (error) {
    console.error('Failed to write RISC audit log:', error);
  }
}

function parseIncomingToken(body: string, authorizationHeader: string | null): string | null {
  const authToken = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (authToken) {
    return authToken;
  }

  const text = body.trim();
  if (!text) {
    return null;
  }

  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const token = parsed.jwt || parsed.token || parsed.securityEventToken;
      if (typeof token === 'string' && token.trim()) {
        return token.trim();
      }
    } catch {
      return null;
    }
  }

  return text;
}

export async function handleRISCEvent(request: Request, env: Env): Promise<Response> {
  const bodyText = await request.text();
  const token = parseIncomingToken(bodyText, request.headers.get('Authorization'));

  if (!token) {
    await logRiscAudit(env, request, 'risc_event_rejected', {
      reason: 'missing_token'
    });
    return errorResponse('unauthorized', 'Missing security event token', 401, request);
  }

  let payload: SecurityEventPayload;
  try {
    const jwks = await getJWKS(env);
    const localJWKSet = createLocalJWKSet(jwks);

    const verified = await jwtVerify(token, localJWKSet, {
      issuer: ALLOWED_ISSUERS,
      clockTolerance: CLOCK_TOLERANCE_SECONDS
    });

    payload = verified.payload as SecurityEventPayload;

    const allowedAudiences = [
      env.GOOGLE_CLIENT_ID,
      new URL(request.url).origin + '/api/risc/events'
    ];
    const audiences = parseAudience(payload.aud);

    if (audiences.length === 0 || !audiences.some((aud) => allowedAudiences.includes(aud))) {
      throw new Error('Invalid audience');
    }
  } catch (error) {
    await logRiscAudit(env, request, 'risc_event_rejected', {
      reason: 'jwt_verification_failed',
      error: error instanceof Error ? error.message : String(error)
    });
    return errorResponse('unauthorized', 'Invalid security event token', 401, request);
  }

  const events = payload.events && typeof payload.events === 'object'
    ? payload.events as Record<string, unknown>
    : {};
  const receivedAt = Date.now();
  const tokenHash = await hashToken(token);
  const eventId = typeof payload.jti === 'string' ? payload.jti : null;
  const issuer = typeof payload.iss === 'string' ? payload.iss : 'unknown';
  const audience = parseAudience(payload.aud).join(',');

  const eventTypes = Object.keys(events).filter((eventType) => SUPPORTED_EVENT_TYPES.has(eventType));

  if (eventTypes.length === 0) {
    await env.DB.prepare(`
      INSERT INTO risc_events (
        event_id, event_type, subject, issuer, audience,
        received_at, processed_at, status, error_message, raw_token_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      eventId,
      'unsupported',
      'unknown',
      issuer,
      audience,
      receivedAt,
      Date.now(),
      'failed',
      'No supported event type found',
      tokenHash
    ).run();

    await logRiscAudit(env, request, 'risc_event_ignored', {
      reason: 'unsupported_event_type',
      event_types: Object.keys(events)
    });

    return jsonResponse({ accepted: true, processed: 0 }, 202, request);
  }

  let processedCount = 0;

  for (const eventType of eventTypes) {
    const details = events[eventType];
    const subjectEmail = extractSubjectEmail(payload, details);
    let status: 'processed' | 'failed' = 'processed';
    let errorMessage: string | null = null;

    try {
      if (!subjectEmail) {
        throw new Error('Unable to resolve subject email');
      }

      if (eventType === RISC_EVENT_ACCOUNT_DISABLED) {
        await setUserDisabled(env.DB, subjectEmail, true, 'risc_account_disabled', Date.now());
      }

      const revokedSessions = await revokeOAuthSessionsForUser(env, subjectEmail);

      await logRiscAudit(env, request, 'risc_event_processed', {
        event_type: eventType,
        subject: subjectEmail,
        sessions_revoked: revokedSessions,
        event_id: eventId
      });

      processedCount += 1;
    } catch (error) {
      status = 'failed';
      errorMessage = error instanceof Error ? error.message : String(error);

      await logRiscAudit(env, request, 'risc_event_failed', {
        event_type: eventType,
        subject: subjectEmail,
        error: errorMessage,
        event_id: eventId
      });
    }

    await env.DB.prepare(`
      INSERT INTO risc_events (
        event_id, event_type, subject, issuer, audience,
        received_at, processed_at, status, error_message, raw_token_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      eventId,
      eventType,
      subjectEmail || 'unknown',
      issuer,
      audience,
      receivedAt,
      Date.now(),
      status,
      errorMessage,
      tokenHash
    ).run();
  }

  return jsonResponse({ accepted: true, processed: processedCount }, 202, request);
}
