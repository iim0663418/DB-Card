# R2 Lifecycle Rules Setup Guide
## Bucket: db-card-physical-images-staging

### Purpose
Automatically delete temporary uploaded images after 1 hour to save storage costs.

---

## Lifecycle Rule Configuration

**Rule Name**: `cleanup-temp-uploads`

**Settings**:
- **Prefix**: `received/temp/`
- **Action**: Delete objects
- **Days after upload**: 0 (same day)
- **Expiration**: 1 hour (3600 seconds)

---

## Setup Instructions

### Option 1: Cloudflare Dashboard (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → **db-card-physical-images-staging**
3. Click **Settings** tab
4. Scroll to **Lifecycle Rules**
5. Click **Add Rule**
6. Configure:
   ```
   Rule name: cleanup-temp-uploads
   Prefix: received/temp/
   Delete objects after: 1 day
   ```
   ⚠️ Note: Cloudflare R2 currently supports minimum 1 day expiration via Dashboard.
   For 1-hour expiration, use Cron Job (see below).

### Option 2: Wrangler CLI (Future)

```bash
# Not yet supported in wrangler 4.60.0
# Will be available in future versions
wrangler r2 bucket lifecycle put db-card-physical-images-staging \
  --rule '{"id":"cleanup-temp-uploads","prefix":"received/temp/","expiration":{"days":1}}'
```

### Option 3: Cron Job (Implemented in Phase 8)

Since R2 Lifecycle Rules have minimum 1-day granularity, we implement a Cron Job for 1-hour cleanup:

```typescript
// workers/src/cron/cleanup-temp-uploads.ts
export async function cleanupTempUploads(env: Env) {
  const now = Date.now();
  const oneHourAgo = now - 3600000; // 1 hour in milliseconds
  
  // Query expired uploads
  const expired = await env.DB.prepare(`
    SELECT upload_id, image_url 
    FROM temp_uploads 
    WHERE expires_at < ?
  `).bind(oneHourAgo).all();
  
  // Delete from R2
  for (const record of expired.results) {
    const key = record.image_url.split('/').slice(-3).join('/'); // Extract "received/temp/xxx.jpg"
    await env.PHYSICAL_CARDS.delete(key);
  }
  
  // Delete from DB
  await env.DB.prepare(`
    DELETE FROM temp_uploads 
    WHERE expires_at < ?
  `).bind(oneHourAgo).run();
}
```

---

## Verification

### Test Upload
```bash
cd workers
echo "test" > test.txt
npx wrangler r2 object put db-card-physical-images-staging/received/temp/test.txt --file=test.txt
```

### Test Read
```bash
npx wrangler r2 object get db-card-physical-images-staging/received/temp/test.txt
```

### Test Delete
```bash
npx wrangler r2 object delete db-card-physical-images-staging/received/temp/test.txt
```

---

## Directory Structure

```
db-card-physical-images-staging/
├── physical/              # Existing: Physical card images
├── received/
│   ├── temp/             # NEW: Temporary uploads (1 hour TTL)
│   │   └── {upload_id}.jpg
│   └── permanent/        # NEW: Saved card images
│       └── {card_uuid}.jpg
```

---

## Cost Estimation

**Assumptions**:
- Average image size: 2 MB
- Uploads per day: 100
- Retention: 1 hour average

**Storage Cost**:
- Temporary: 100 images × 2 MB × 1 hour = 0.2 GB-hours/day
- Permanent: 100 images × 2 MB = 200 MB/day = 6 GB/month
- R2 Storage: $0.015/GB/month
- **Monthly Cost**: ~$0.09 (negligible)

**Operations Cost**:
- Class A (PUT): 100/day × 30 = 3,000/month = $0.0135
- Class B (GET): 200/day × 30 = 6,000/month = $0.0006
- **Monthly Cost**: ~$0.014

**Total**: ~$0.10/month

---

## Rollback

If needed to disable:
1. Remove Lifecycle Rule from Dashboard
2. Comment out Cron Job in Phase 8
3. Manually delete `received/` directory:
   ```bash
   # Not supported via CLI, use Dashboard
   ```
