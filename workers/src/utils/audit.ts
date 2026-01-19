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
 * Log security event for monitoring and analysis
 * Records endpoint enumeration, rate limiting, and suspicious patterns
 */
export async function logSecurityEvent(
  db: D1Database,
  eventType: 'endpoint_enumeration' | 'rate_limit_exceeded' | 'suspicious_pattern',
  ip: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const anonymizedIP = anonymizeIP(ip);
    const detailsJson = details ? JSON.stringify(details) : null;

    await db.prepare(`
      INSERT INTO security_events (event_type, ip_address, details, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(eventType, anonymizedIP, detailsJson).run();
  } catch (error) {
    // Log error but don't throw - security logging should not break main flow
    console.error('Failed to log security event:', error);
  }
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

/**
 * Log user event with actor information (for Phase 1 user self-service)
 * Extended audit logging with actor_type and actor_id
 */
export async function logUserEvent(
  env: Env,
  event_type: 'user_card_create' | 'user_card_update',
  actor_email: string,
  target_uuid: string,
  request: Request,
  details?: Record<string, any>
): Promise<void> {
  try {
    const ip = request.headers.get('CF-Connecting-IP') ||
               request.headers.get('X-Forwarded-For') ||
               '0.0.0.0';
    const user_agent = request.headers.get('User-Agent') || 'unknown';

    const extendedDetails = {
      ...details,
      actor_type: 'user',
      actor_id: actor_email,
      target_uuid
    };

    await env.DB.prepare(`
      INSERT INTO audit_logs (
        event_type, card_uuid, user_agent, ip_address, timestamp, details
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      event_type,
      target_uuid,
      user_agent,
      anonymizeIP(ip),
      Date.now(),
      JSON.stringify(extendedDetails)
    ).run();
  } catch (error) {
    console.error('Failed to log user event:', error);
  }
}
