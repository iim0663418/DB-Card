import type { Env } from '../types';

const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_SECONDS = 900; // 15 minutes

export interface LoginRateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export async function checkLoginRateLimit(email: string, env: Env): Promise<LoginRateLimitResult> {
  const key = `login_attempts:${email}`;
  const data = await env.KV.get(key);

  if (!data) {
    return { allowed: true };
  }

  const attemptData = JSON.parse(data);
  const attempts = attemptData.count || 0;
  const firstAttempt = attemptData.timestamp || Date.now();

  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    const elapsed = Date.now() - firstAttempt;
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_SECONDS * 1000 - elapsed) / 1000);

    if (retryAfter > 0) {
      return {
        allowed: false,
        retryAfter
      };
    }

    await env.KV.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

export async function incrementLoginAttempts(email: string, env: Env): Promise<void> {
  const key = `login_attempts:${email}`;
  const data = await env.KV.get(key);

  let attempts = 1;
  let timestamp = Date.now();

  if (data) {
    const attemptData = JSON.parse(data);
    attempts = (attemptData.count || 0) + 1;
    timestamp = attemptData.timestamp || timestamp;
  }

  await env.KV.put(
    key,
    JSON.stringify({ count: attempts, timestamp }),
    { expirationTtl: RATE_LIMIT_WINDOW_SECONDS }
  );
}

export async function resetLoginAttempts(email: string, env: Env): Promise<void> {
  const key = `login_attempts:${email}`;
  await env.KV.delete(key);
}
