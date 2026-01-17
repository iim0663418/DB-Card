// Session Management Utilities

import type { Env, ReadSession, CardType } from '../types';
import { getPolicy } from './policy';

/**
 * Create a new ReadSession for a card
 */
export async function createSession(
  env: Env,
  card_uuid: string,
  card_type: CardType
): Promise<ReadSession> {
  const policy = getPolicy(card_type);
  const now = Date.now();
  const session_id = crypto.randomUUID();
  const expires_at = now + policy.ttl;

  const session: ReadSession = {
    session_id,
    card_uuid,
    issued_at: now,
    expires_at,
    max_reads: policy.max_reads,
    reads_used: 0,
    token_version: 1
  };

  await env.DB.prepare(`
    INSERT INTO read_sessions (
      session_id, card_uuid, issued_at, expires_at,
      max_reads, reads_used, token_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    session.session_id,
    session.card_uuid,
    session.issued_at,
    session.expires_at,
    session.max_reads,
    session.reads_used,
    session.token_version
  ).run();

  return session;
}

/**
 * Get the most recent non-revoked session for a card
 */
export async function getRecentSession(
  env: Env,
  card_uuid: string
): Promise<ReadSession | null> {
  const result = await env.DB.prepare(`
    SELECT * FROM read_sessions
    WHERE card_uuid = ? AND revoked_at IS NULL
    ORDER BY issued_at DESC
    LIMIT 1
  `).bind(card_uuid).first<ReadSession>();

  return result || null;
}

/**
 * Revoke a session
 */
export async function revokeSession(
  env: Env,
  session_id: string,
  reason: ReadSession['revoked_reason']
): Promise<void> {
  await env.DB.prepare(`
    UPDATE read_sessions
    SET revoked_at = ?, revoked_reason = ?
    WHERE session_id = ?
  `).bind(Date.now(), reason, session_id).run();
}

/**
 * Determine if a session should be revoked based on retap conditions
 * Revoke if:
 * - Session was issued within last 10 minutes OR
 * - Session has been used 2 times or less
 */
export function shouldRevoke(session: ReadSession): boolean {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  const timeSinceIssued = now - session.issued_at;

  return (
    timeSinceIssued <= tenMinutes ||
    session.reads_used <= 2
  );
}
