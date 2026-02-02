# BDD Spec: Log Rotation and Archival

## Feature
Implement automated log rotation to manage database size and comply with data retention policies.

## Background
- **audit_logs**: Retain 1 year (legal requirement)
- **security_events**: Retain 90 days (security analysis window)
- **deleted_cards**: Already handled by scheduled-cleanup.ts (90 days)

## Retention Policy

| Table | Retention Period | Reason |
|-------|------------------|--------|
| audit_logs | 365 days | Legal/compliance requirement |
| security_events | 90 days | Security analysis window |
| deleted_cards | 90 days | Already handled (scheduled-cleanup.ts) |

## Scenario 1: Rotate audit_logs (365 days)

**Given**:
- audit_logs table contains records older than 365 days
- Current timestamp is 2026-01-20 00:00:00 UTC
- Cutoff timestamp is 2025-01-20 00:00:00 UTC (365 days ago)

**When**:
- Cron job executes log rotation at 03:00 UTC daily

**Then**:
- Records with `timestamp < cutoff` are deleted
- Deletion count is logged
- No records newer than 365 days are affected

**SQL**:
```sql
DELETE FROM audit_logs WHERE timestamp < ?
-- ? = now - (365 * 24 * 60 * 60 * 1000)
```

## Scenario 2: Rotate security_events (90 days)

**Given**:
- security_events table contains records older than 90 days
- Current timestamp is 2026-01-20 00:00:00 UTC
- Cutoff timestamp is 2025-10-22 00:00:00 UTC (90 days ago)

**When**:
- Cron job executes log rotation at 03:00 UTC daily

**Then**:
- Records with `created_at < cutoff` are deleted
- Deletion count is logged
- No records newer than 90 days are affected

**SQL**:
```sql
DELETE FROM security_events WHERE created_at < ?
-- ? = datetime(now - 90 days)
```

## Scenario 3: No records to delete

**Given**:
- All audit_logs records are within 365 days
- All security_events records are within 90 days

**When**:
- Cron job executes log rotation

**Then**:
- No records are deleted
- Log message: "No records to rotate"
- Execution completes successfully

## Scenario 4: Large batch deletion (performance)

**Given**:
- audit_logs table has 100,000+ old records
- Deletion may take significant time

**When**:
- Cron job executes log rotation

**Then**:
- Deletion completes within 30 seconds
- Uses indexed timestamp columns for efficient deletion
- No impact on active read/write operations

## Technical Specification

### Cron Schedule
```toml
# wrangler.toml
[triggers]
crons = [
  "0 2 * * *",  # Existing: scheduled-cleanup.ts (02:00 UTC)
  "0 3 * * *"   # New: log-rotation.ts (03:00 UTC)
]
```

### Implementation File
- **Path**: `workers/src/scheduled-log-rotation.ts`
- **Export**: `handleScheduledLogRotation(env: Env): Promise<void>`

### Required Indexes
```sql
-- Optimize audit_logs deletion
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp 
ON audit_logs(timestamp);

-- Optimize security_events deletion
CREATE INDEX IF NOT EXISTS idx_security_events_created_at 
ON security_events(created_at);
```

### Error Handling
- Catch and log all errors
- Do not throw (prevent cron job failure)
- Report deletion counts for monitoring

### Monitoring Metrics
- `audit_logs_deleted`: Count of deleted audit records
- `security_events_deleted`: Count of deleted security events
- `rotation_duration_ms`: Execution time

## Acceptance Criteria

- [x] BDD spec created
- [ ] Migration 0012 created (indexes)
- [ ] scheduled-log-rotation.ts implemented
- [ ] Cron trigger added to wrangler.toml
- [ ] index.ts updated with scheduled handler
- [ ] Local testing passed
- [ ] Staging deployment verified
- [ ] Production deployment

## Notes

1. **Why separate cron job?**
   - Different schedule (03:00 vs 02:00)
   - Different retention policies
   - Easier to monitor and debug

2. **Why not archive to another table?**
   - D1 storage is cheap
   - Compliance only requires deletion after retention period
   - Simplifies implementation

3. **Performance considerations**:
   - Indexes on timestamp columns are critical
   - DELETE operations are atomic in SQLite
   - Cron runs during low-traffic hours (03:00 UTC)

4. **Future enhancements**:
   - Export to S3/R2 before deletion (if needed)
   - Configurable retention periods per environment
   - Metrics dashboard for rotation statistics
