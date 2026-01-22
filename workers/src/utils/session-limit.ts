// Session Limit Management
// Implements P1 security fix for concurrent session limits

import type { Env } from '../types';

/**
 * Session data structure
 */
interface SessionData {
  token: string;
  createdAt: number;
}

/**
 * Add a new session for a user
 * @param email - User email
 * @param sessionToken - The session token
 * @param env - Cloudflare environment bindings
 */
export async function addSession(
  email: string,
  sessionToken: string,
  env: Env
): Promise<void> {
  const key = `active_sessions:${email}`;
  const existingData = await env.KV.get(key);

  let sessions: SessionData[] = [];
  if (existingData) {
    try {
      sessions = JSON.parse(existingData);
    } catch (error) {
      console.error('Failed to parse existing sessions:', error);
      sessions = [];
    }
  }

  // Add new session
  sessions.push({
    token: sessionToken,
    createdAt: Date.now()
  });

  // Store with no expiration (we manage cleanup manually)
  await env.KV.put(key, JSON.stringify(sessions));
}

/**
 * Remove a session for a user
 * @param email - User email
 * @param sessionToken - The session token to remove
 * @param env - Cloudflare environment bindings
 */
export async function removeSession(
  email: string,
  sessionToken: string,
  env: Env
): Promise<void> {
  const key = `active_sessions:${email}`;
  const existingData = await env.KV.get(key);

  if (!existingData) {
    return;
  }

  let sessions: SessionData[] = [];
  try {
    sessions = JSON.parse(existingData);
  } catch (error) {
    console.error('Failed to parse existing sessions:', error);
    return;
  }

  // Filter out the session to remove
  sessions = sessions.filter(s => s.token !== sessionToken);

  if (sessions.length === 0) {
    // Delete key if no sessions left
    await env.KV.delete(key);
  } else {
    await env.KV.put(key, JSON.stringify(sessions));
  }
}

/**
 * Enforce session limit by removing oldest sessions
 * @param email - User email
 * @param env - Cloudflare environment bindings
 * @param maxSessions - Maximum number of concurrent sessions allowed (default: 3)
 */
export async function enforceSessionLimit(
  email: string,
  env: Env,
  maxSessions: number = 3
): Promise<void> {
  const key = `active_sessions:${email}`;
  const existingData = await env.KV.get(key);

  if (!existingData) {
    return;
  }

  let sessions: SessionData[] = [];
  try {
    sessions = JSON.parse(existingData);
  } catch (error) {
    console.error('Failed to parse existing sessions:', error);
    return;
  }

  // If within limit, no action needed
  if (sessions.length <= maxSessions) {
    return;
  }

  // Sort by createdAt (oldest first)
  sessions.sort((a, b) => a.createdAt - b.createdAt);

  // Keep only the newest maxSessions sessions
  const sessionsToKeep = sessions.slice(-maxSessions);
  const sessionsToRevoke = sessions.slice(0, -maxSessions);

  // Revoke old sessions by deleting their KV entries
  for (const session of sessionsToRevoke) {
    // Delete passkey session
    await env.KV.delete(`passkey_session:${session.token}`);
    // Delete setup token session
    await env.KV.delete(`setup_token_session:${session.token}`);
    // Delete CSRF token
    await env.KV.delete(`csrf_token:${session.token}`);

    console.log(`Revoked old session for ${email}: ${session.token.substring(0, 8)}...`);
  }

  // Update stored sessions list
  await env.KV.put(key, JSON.stringify(sessionsToKeep));
}
