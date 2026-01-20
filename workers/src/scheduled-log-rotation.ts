// Scheduled log rotation for audit_logs and security_events
// Runs daily at 03:00 UTC

import type { Env } from './types';

export async function handleScheduledLogRotation(env: Env): Promise<void> {
  const now = Date.now();
  
  // Retention periods
  const auditLogsRetention = 365 * 24 * 60 * 60 * 1000; // 365 days
  const securityEventsRetention = 90 * 24 * 60 * 60 * 1000; // 90 days
  
  const auditLogsCutoff = now - auditLogsRetention;
  const securityEventsCutoff = now - securityEventsRetention;

  try {
    // Rotate audit_logs (365 days)
    const auditResult = await env.DB.prepare(`
      DELETE FROM audit_logs WHERE timestamp < ?
    `).bind(auditLogsCutoff).run();

    const auditDeleted = auditResult.meta.changes || 0;
    console.log(`[LogRotation] Deleted ${auditDeleted} audit_logs records older than 365 days`);

    // Rotate security_events (90 days)
    const securityResult = await env.DB.prepare(`
      DELETE FROM security_events WHERE datetime(created_at) < datetime(?, 'unixepoch')
    `).bind(Math.floor(securityEventsCutoff / 1000)).run();

    const securityDeleted = securityResult.meta.changes || 0;
    console.log(`[LogRotation] Deleted ${securityDeleted} security_events records older than 90 days`);

    if (auditDeleted === 0 && securityDeleted === 0) {
      console.log('[LogRotation] No records to rotate');
    }

  } catch (error) {
    console.error('[LogRotation] Error during log rotation:', error);
    // Don't throw - prevent cron job failure
  }
}
