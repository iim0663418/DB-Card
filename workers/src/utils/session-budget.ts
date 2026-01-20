/**
 * Session Budget Management
 * Implements total quantity limits based on industry best practices
 */

import type { Env, CardType, SessionBudgetResult } from '../types';
import { CARD_POLICIES } from '../types';

/**
 * Check if session creation is allowed based on budget limits
 */
export async function checkSessionBudget(
  env: Env,
  card_uuid: string,
  card_type: CardType
): Promise<SessionBudgetResult> {
  const policy = CARD_POLICIES[card_type];

  // 1. Query total sessions (D1)
  const card = await env.DB.prepare(
    'SELECT total_sessions FROM cards WHERE uuid = ?'
  ).bind(card_uuid).first<{ total_sessions: number }>();

  const total = card?.total_sessions || 0;

  // 2. Query daily sessions (KV)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const dailyKey = `session:budget:${card_uuid}:daily:${today}`;
  const daily = parseInt((await env.KV.get(dailyKey)) || '0');

  // 3. Query monthly sessions (KV)
  const month = new Date().toISOString().slice(0, 7).replace(/-/g, '');
  const monthlyKey = `session:budget:${card_uuid}:monthly:${month}`;
  const monthly = parseInt((await env.KV.get(monthlyKey)) || '0');

  // 4. Check limits (order: total > daily > monthly)
  if (total >= policy.max_total_sessions) {
    return {
      allowed: false,
      reason: 'total_limit_exceeded',
      details: {
        total_sessions: total,
        max_total_sessions: policy.max_total_sessions,
      },
    };
  }

  if (daily >= policy.max_sessions_per_day) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
      allowed: false,
      reason: 'daily_limit_exceeded',
      details: {
        daily_sessions: daily,
        max_sessions_per_day: policy.max_sessions_per_day,
        retry_after: tomorrow.toISOString(),
      },
    };
  }

  if (monthly >= policy.max_sessions_per_month) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    return {
      allowed: false,
      reason: 'monthly_limit_exceeded',
      details: {
        monthly_sessions: monthly,
        max_sessions_per_month: policy.max_sessions_per_month,
        retry_after: nextMonth.toISOString(),
      },
    };
  }

  // 5. Check warning threshold
  const warningThreshold = policy.warning_threshold || 0.9;
  const warning =
    total >= policy.max_total_sessions * warningThreshold
      ? {
          type: 'approaching_budget_limit' as const,
          message: '此名片即將達到使用上限',
          remaining: policy.max_total_sessions - total,
          max_total: policy.max_total_sessions,
        }
      : null;

  return {
    allowed: true,
    warning,
    remaining: policy.max_total_sessions - total,
    daily_remaining: policy.max_sessions_per_day - daily,
    monthly_remaining: policy.max_sessions_per_month - monthly,
  };
}

/**
 * Increment session budget counters
 */
export async function incrementSessionBudget(
  env: Env,
  card_uuid: string
): Promise<void> {
  // 1. Increment total sessions (D1)
  await env.DB.prepare(
    'UPDATE cards SET total_sessions = total_sessions + 1 WHERE uuid = ?'
  )
    .bind(card_uuid)
    .run();

  // 2. Increment daily counter (KV)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const dailyKey = `session:budget:${card_uuid}:daily:${today}`;
  const daily = parseInt((await env.KV.get(dailyKey)) || '0');
  await env.KV.put(dailyKey, String(daily + 1), { expirationTtl: 86400 });

  // 3. Increment monthly counter (KV)
  const month = new Date().toISOString().slice(0, 7).replace(/-/g, '');
  const monthlyKey = `session:budget:${card_uuid}:monthly:${month}`;
  const monthly = parseInt((await env.KV.get(monthlyKey)) || '0');
  await env.KV.put(monthlyKey, String(monthly + 1), { expirationTtl: 2678400 });
}
