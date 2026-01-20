# BDD Spec: Scheduled Cleanup Query Optimization

## Feature
Optimize the scheduled cleanup query performance by adding a composite index on uuid_bindings table.

## Background
- Current query: `SELECT * FROM uuid_bindings WHERE status = 'revoked' AND revoked_at < ?`
- Without index: Full table scan on every cron execution
- With index: Index seek on (status, revoked_at)

## Scenario: Add composite index for revoked cleanup query

**Given**: 
- uuid_bindings table exists
- Scheduled cleanup runs daily at 02:00 UTC
- Query filters by status='revoked' AND revoked_at < cutoff_time

**When**: 
- Migration 0010 creates index `idx_uuid_bindings_revoked_cleanup`
- Index columns: (status, revoked_at)
- Index type: Partial index with WHERE status = 'revoked'

**Then**:
- Query execution uses the index
- Performance improves for large datasets
- Cron job completes faster
- No functional changes to cleanup logic

## Technical Specification

### Index Definition
```sql
CREATE INDEX idx_uuid_bindings_revoked_cleanup 
ON uuid_bindings(status, revoked_at) 
WHERE status = 'revoked';
```

### Benefits
- Reduces query time from O(n) to O(log n)
- Partial index saves storage space
- Only indexes revoked records
- Supports both equality (status) and range (revoked_at) filters

### Acceptance Criteria
- [x] Migration file created
- [x] Index created successfully
- [x] Query plan shows index usage
- [x] No breaking changes to existing logic
