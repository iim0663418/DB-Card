// Audit Logging Utilities
// Handles secure audit log recording with IP anonymization

import type { Env, AuditLog } from '../types';

/**
 * Anonymize IP address by keeping only first 3 octets for IPv4
 * or first 3 segments for IPv6
 */
export function anonymizeIP(ip: string): string {
  if (!ip) return '0.0.0.0';

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }

  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 3) {
      return `${parts[0]}:${parts[1]}:${parts[2]}::`;
    }
  }

  return '0.0.0.0';
}

/**
 * Log an audit event to the database
 */
export async function logEvent(
  env: Env,
  event_type: AuditLog['event_type'],
  request: Request,
  card_uuid?: string,
  session_id?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const ip = request.headers.get('CF-Connecting-IP') ||
               request.headers.get('X-Forwarded-For') ||
               '0.0.0.0';
    const user_agent = request.headers.get('User-Agent') || 'unknown';

    await env.DB.prepare(`
      INSERT INTO audit_logs (
        event_type, card_uuid, session_id,
        user_agent, ip_address, timestamp, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      event_type,
      card_uuid || null,
      session_id || null,
      user_agent,
      anonymizeIP(ip),
      Date.now(),
      details ? JSON.stringify(details) : null
    ).run();
  } catch (error) {
    // Silent fail for audit logs - don't block the main request
    console.error('Failed to log audit event:', error);
  }
}
