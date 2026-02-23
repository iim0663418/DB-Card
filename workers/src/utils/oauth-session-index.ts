import type { Env } from '../types';

const SESSION_INDEX_TTL_SECONDS = 3600;
const MAX_TRACKED_SESSIONS_PER_USER = 32;

interface SessionIndexEntry {
  sessionId: string;
  createdAt: number;
}

function getIndexKey(email: string): string {
  return `oauth_user_sessions:${email.toLowerCase()}`;
}

async function getSessionEntries(env: Env, email: string): Promise<SessionIndexEntry[]> {
  const raw = await env.KV.get(getIndexKey(email));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SessionIndexEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) =>
      typeof entry?.sessionId === 'string' && typeof entry?.createdAt === 'number'
    );
  } catch {
    return [];
  }
}

async function saveSessionEntries(env: Env, email: string, entries: SessionIndexEntry[]): Promise<void> {
  await env.KV.put(getIndexKey(email), JSON.stringify(entries), {
    expirationTtl: SESSION_INDEX_TTL_SECONDS
  });
}

export async function addOAuthSessionForUser(env: Env, email: string, sessionId: string): Promise<void> {
  const now = Date.now();
  const entries = await getSessionEntries(env, email);

  const deduped = entries.filter((entry) => entry.sessionId !== sessionId);
  deduped.unshift({ sessionId, createdAt: now });

  await saveSessionEntries(env, email, deduped.slice(0, MAX_TRACKED_SESSIONS_PER_USER));
}

export async function removeOAuthSessionForUser(env: Env, email: string, sessionId: string): Promise<void> {
  const entries = await getSessionEntries(env, email);
  const filtered = entries.filter((entry) => entry.sessionId !== sessionId);

  if (filtered.length === 0) {
    await env.KV.delete(getIndexKey(email));
    return;
  }

  await saveSessionEntries(env, email, filtered);
}

export async function revokeOAuthSessionsForUser(env: Env, email: string): Promise<number> {
  const entries = await getSessionEntries(env, email);
  let revokedCount = 0;

  for (const entry of entries) {
    await env.KV.delete(`oauth_session:${entry.sessionId}`);
    await env.KV.delete(`csrf_token:${entry.sessionId}`);
    await env.KV.delete(`oauth_user_info:${entry.sessionId}`);
    revokedCount += 1;
  }

  await env.KV.delete(getIndexKey(email));
  return revokedCount;
}
