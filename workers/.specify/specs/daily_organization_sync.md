# BDD Spec: Daily Organization Normalization Sync

## Feature
As a system administrator,
I want to automatically normalize organization names daily,
So that all cards have consistent searchable organization data.

## Background
- Some cards may have NULL organization_normalized (legacy data, failed writes)
- Need to ensure all cards are searchable via normalized names
- Should run automatically without manual intervention

## Scenario 1: Cron Job Registration
**Given** the Worker has cron triggers configured
**When** the system reaches 02:00 UTC daily
**Then** the normalization sync job should execute
**And** the job should process all cards with NULL organization_normalized

## Scenario 2: Batch Normalization
**Given** 100 cards exist with organization but NULL organization_normalized
**When** the daily sync job runs
**Then** all 100 cards should have organization_normalized populated
**And** the normalization should use the chinese-converter utility
**And** the job should complete within 60 seconds

## Scenario 3: Idempotent Execution
**Given** the sync job runs multiple times
**When** a card already has organization_normalized
**Then** the card should be skipped (no update)
**And** no unnecessary database writes should occur

## Scenario 4: Error Handling
**Given** the sync job encounters an error
**When** processing a batch of cards
**Then** the error should be logged
**And** the job should continue processing remaining cards
**And** failed cards should be retried in the next run

## Scenario 5: Performance Optimization
**Given** 10,000 cards need normalization
**When** the sync job runs
**Then** cards should be processed in batches of 100
**And** each batch should use a single transaction
**And** total execution time should be < 5 minutes

## Technical Implementation

### Cron Trigger Configuration (wrangler.toml)
```toml
[triggers]
crons = ["0 2 * * *"]  # Daily at 02:00 UTC
```

### SQL Query
```sql
UPDATE received_cards
SET organization_normalized = ?,
    updated_at = ?
WHERE uuid = ?
  AND organization IS NOT NULL
  AND organization_normalized IS NULL
```

### Batch Processing
- Fetch 100 cards at a time
- Normalize in memory using chinese-converter
- Bulk update via transaction
- Repeat until no more cards

## Acceptance Criteria
1. ✅ Cron job registered in wrangler.toml
2. ✅ Cron handler in src/cron/index.ts
3. ✅ Batch processing (100 cards per batch)
4. ✅ Idempotent (skip already normalized)
5. ✅ Error logging and retry mechanism
6. ✅ Execution time < 5 minutes for 10k cards
7. ✅ Zero breaking changes to existing API
8. ✅ TypeScript: zero errors
