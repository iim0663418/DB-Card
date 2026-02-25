// Scheduled log rotation for audit_logs and security_events
// Runs daily at 02:00 Taiwan Time (18:00 UTC)
// Retention: audit_logs (12 months), security_events (6 months)
// Compliance: GDPR data minimization + ISO 27001 security logging

import type { Env } from './types';

export async function handleScheduledLogRotation(env: Env): Promise<void> {
  const now = Date.now();
  
  // Retention periods (GDPR + ISO 27001 compliance)
  // Security logs: 12-24 months (industry best practice)
  // Access logs: 6-12 months (GDPR data minimization)
  const auditLogsRetention = 12 * 30 * 24 * 60 * 60 * 1000; // 12 months
  const securityEventsRetention = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months
  
  const auditLogsCutoff = now - auditLogsRetention;
  const securityEventsCutoff = now - securityEventsRetention;

  try {
    // Rotate audit_logs (12 months)
    const auditResult = await env.DB.prepare(`
      DELETE FROM audit_logs WHERE timestamp < ?
    `).bind(auditLogsCutoff).run();

    const auditDeleted = auditResult.meta.changes || 0;
    console.log(`[LogRotation] Deleted ${auditDeleted} audit_logs records older than 12 months`);

    // Rotate security_events (6 months)
    const securityResult = await env.DB.prepare(`
      DELETE FROM security_events WHERE datetime(created_at) < datetime(?, 'unixepoch')
    `).bind(Math.floor(securityEventsCutoff / 1000)).run();

    const securityDeleted = securityResult.meta.changes || 0;
    console.log(`[LogRotation] Deleted ${securityDeleted} security_events records older than 6 months`);

    if (auditDeleted === 0 && securityDeleted === 0) {
      console.log('[LogRotation] No records to rotate');
    }

  } catch (error) {
    console.error('[LogRotation] Error during log rotation:', error);
    // Don't throw - prevent cron job failure
  }
}
