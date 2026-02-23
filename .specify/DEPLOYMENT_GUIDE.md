# Mobile Upload Optimization - Deployment Guide

## Pre-Deployment Checklist

- [x] Migration 0032 created
- [x] Backend upload.ts modified (TypeScript ✓)
- [x] Frontend received-cards.js modified
- [x] browser-image-compression CDN added
- [ ] Migration executed on staging
- [ ] Deployed to staging
- [ ] Manual testing completed
- [ ] Deployed to production

## Deployment Steps

### 1. Execute Migration (Staging)

```bash
cd /Users/shengfanwu/GitHub/DB-Card/workers
wrangler d1 execute DB --remote --file=./migrations/0032_idempotency_key.sql
```

**Expected Output:**
```
🌀 Executing on remote database DB (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx):
🌀 To execute on your local development database, pass the --local flag to 'wrangler d1 execute'
🚣 Executed 2 commands in 0.123s
```

### 2. Deploy to Staging

```bash
cd /Users/shengfanwu/GitHub/DB-Card/workers
wrangler deploy
```

**Expected Output:**
```
Total Upload: xx.xx KiB / gzip: xx.xx KiB
Uploaded db-card (x.xx sec)
Published db-card (x.xx sec)
  https://db-card-staging.csw30454.workers.dev
```

### 3. Manual Testing

#### Test 1: HEIC Detection
1. Open https://db-card-staging.csw30454.workers.dev/user-portal.html
2. Navigate to "收到的名片" tab
3. Try to upload a .heic file
4. **Expected**: Error message with iPhone settings guide

#### Test 2: Image Compression
1. Upload a 5MB JPG image
2. Open browser DevTools > Network tab
3. Check request payload size
4. **Expected**: Payload ~1MB (80% reduction)

#### Test 3: Idempotency
1. Upload an image
2. During upload, disconnect network (DevTools > Network > Offline)
3. Reconnect network
4. **Expected**: Auto-retry succeeds, no duplicate records

#### Test 4: Cancellation
1. Upload a large image (3-5MB)
2. Click "取消" button during compression/upload
3. **Expected**: Upload cancelled, no error toast

#### Test 5: Retry on 503
1. Mock 503 error (requires backend modification for testing)
2. Upload an image
3. **Expected**: Auto-retry 3 times with exponential backoff

### 4. Verify Database

```bash
# Check idempotency_key column exists
wrangler d1 execute DB --remote --command "PRAGMA table_info(temp_uploads)"

# Check for duplicate uploads (should be 0)
wrangler d1 execute DB --remote --command "
  SELECT idempotency_key, COUNT(*) as count 
  FROM temp_uploads 
  WHERE idempotency_key IS NOT NULL 
  GROUP BY idempotency_key 
  HAVING count > 1
"
```

### 5. Deploy to Production

```bash
# Execute migration
wrangler d1 execute DB --remote --env production --file=./migrations/0032_idempotency_key.sql

# Deploy
wrangler deploy --env production
```

## Rollback Plan

If issues occur:

### 1. Revert Frontend (Quick)
```bash
git revert HEAD
wrangler deploy
```

### 2. Revert Migration (If Needed)
```sql
-- Remove idempotency_key column
ALTER TABLE temp_uploads DROP COLUMN idempotency_key;
DROP INDEX IF EXISTS idx_temp_uploads_idempotency;
```

## Monitoring

### Key Metrics to Watch

1. **Upload Success Rate**
   - Before: ~70%
   - Target: ~95%

2. **Average Upload Time**
   - Before: 15s (5MB)
   - Target: 3s (1MB)

3. **HEIC Upload Attempts**
   - Target: 0 (all blocked at frontend)

4. **Duplicate Uploads**
   - Target: 0 (idempotency working)

### Logs to Monitor

```bash
# Watch staging logs
wrangler tail

# Filter upload errors
wrangler tail | grep "\[Upload\]"
```

## Success Criteria

- [ ] No TypeScript errors
- [ ] HEIC files blocked with friendly message
- [ ] 5MB images compressed to ~1MB
- [ ] Network failures auto-retry successfully
- [ ] Upload cancellation works
- [ ] No duplicate uploads in database
- [ ] Upload success rate > 90%

## Known Issues

1. **browser-image-compression CDN**
   - Size: ~50KB gzipped
   - Fallback: If CDN fails, show error message

2. **HEIC Magic Bytes**
   - Some HEIC variants may not be detected
   - Fallback: Backend strict validation will catch them

3. **Compression Time**
   - Large images (>8MB) may take 3-5 seconds
   - User sees "壓縮中..." message

## Contact

If deployment issues occur:
- Check logs: `wrangler tail`
- Rollback: See "Rollback Plan" above
- Report: Create GitHub issue with logs
