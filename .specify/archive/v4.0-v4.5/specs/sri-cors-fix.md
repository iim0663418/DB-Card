# SRI CORS Fix - Emergency Hotfix

## Issue: unpkg.com CORS Error with SRI

**Error**:
```
Access to script at 'https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js' 
from origin 'https://db-card-staging.csw30454.workers.dev' 
has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Root Cause**:
- unpkg.com does NOT send CORS headers for crossorigin requests
- SRI requires `crossorigin="anonymous"` attribute
- When crossorigin is set, browser makes CORS request
- unpkg.com blocks CORS requests → script fails to load

**Impact**: CRITICAL - All pages broken (Lucide icons not loading)

---

## Solution: Use cdnjs.com for Lucide (has CORS support)

### Option A: Switch to cdnjs.com (Recommended) ✅

**Reason**: cdnjs.com supports CORS and provides SRI hashes

**Change**:
```html
<!-- ❌ Before (unpkg.com - no CORS) -->
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js" 
        integrity="sha512-..." 
        crossorigin="anonymous" 
        defer></script>

<!-- ✅ After (cdnjs.com - has CORS) -->
<script src="https://cdn.jsdelivr.net/npm/lucide@0.263.1/dist/umd/lucide.min.js" 
        integrity="sha512-VhtMfJ1Aaq57sAvnJxADAsTQHqaKtS10sPkmJmMd728qoXpmufke0U0NndWPvMERJ1f48WYvFi+b6kHNmpFuGg==" 
        crossorigin="anonymous" 
        defer></script>
```

**Note**: jsdelivr.net mirrors npm packages and supports CORS

---

## Implementation

### Files to Fix (4 files)

1. **admin-dashboard.html:23**
2. **user-portal.html:23**
3. **card-display.html:23**
4. **index.html:24**

### Change Required

**Replace**:
```
https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js
```

**With**:
```
https://cdn.jsdelivr.net/npm/lucide@0.263.1/dist/umd/lucide.min.js
```

**Keep**:
- Same integrity hash (file content is identical)
- Same crossorigin="anonymous"
- Same defer attribute

---

## Verification

### Test jsdelivr.net CORS Support
```bash
curl -I https://cdn.jsdelivr.net/npm/lucide@0.263.1/dist/umd/lucide.min.js
```

**Expected Headers**:
```
Access-Control-Allow-Origin: *
Access-Control-Expose-Headers: *
```

### Verify Hash Matches
```bash
curl -s https://cdn.jsdelivr.net/npm/lucide@0.263.1/dist/umd/lucide.min.js | \
  openssl dgst -sha512 -binary | openssl base64 -A
```

**Expected**: Same hash as unpkg.com (VhtMfJ1Aaq57sAvnJxADAsTQHqaKtS10sPkmJmMd728qoXpmufke0U0NndWPvMERJ1f48WYvFi+b6kHNmpFuGg==)

---

## Testing Checklist

- [ ] Load card-display.html → Lucide icons render
- [ ] Load admin-dashboard.html → Lucide icons render
- [ ] Load user-portal.html → Lucide icons render
- [ ] Load index.html → Lucide icons render
- [ ] Check console → No CORS errors
- [ ] Check Network tab → Script loads with 200 status
- [ ] Verify SRI → No integrity errors

---

## Rollback Plan

If jsdelivr.net also fails:

**Option B: Remove SRI from Lucide only**
```html
<!-- Remove integrity and crossorigin -->
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js" defer></script>
```

**Trade-off**: Lose SRI protection for Lucide, but keep for Three.js and QRCode.js
