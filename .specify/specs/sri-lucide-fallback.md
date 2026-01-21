# SRI Lucide Fallback - Remove SRI for Lucide Only

## Issue: Lucide Not Available on CORS-Enabled CDNs

**Problem**:
- unpkg.com: No CORS support (blocks SRI)
- jsdelivr.net: Lucide path not found (404)
- cdnjs.com: Lucide not available (404)

**Conclusion**: Lucide is ONLY available on unpkg.com, which does NOT support CORS

---

## Solution: Remove SRI from Lucide, Keep for Three.js and QRCode.js

**Trade-off**:
- ✅ Keep SRI for Three.js (cdnjs.com - has CORS)
- ✅ Keep SRI for QRCode.js (cdnjs.com - has CORS)
- ❌ Remove SRI for Lucide (unpkg.com - no CORS)

**Security Impact**: MODERATE
- Lucide still from official unpkg.com
- Pin to specific version (0.263.1, not @latest)
- Three.js and QRCode.js still protected by SRI

---

## Implementation

### Change Required

**Remove `integrity` and `crossorigin` from Lucide only**:

```html
<!-- ✅ Correct: No SRI for Lucide (unpkg has no CORS) -->
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js" defer></script>

<!-- ✅ Keep SRI for Three.js (cdnjs has CORS) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" 
        integrity="sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==" 
        crossorigin="anonymous" 
        defer></script>

<!-- ✅ Keep SRI for QRCode.js (cdnjs has CORS) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" 
        integrity="sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSQX0FslNhTDadL4O5SAGapGt4FodqL8My0mA==" 
        crossorigin="anonymous" 
        defer></script>
```

---

## Files to Fix (4 files)

1. **admin-dashboard.html:23**
2. **user-portal.html:23**
3. **card-display.html:23**
4. **index.html:24**

---

## Security Posture

### Before (Attempted Full SRI)
- ❌ Lucide: SRI failed (CORS error)
- ✅ Three.js: SRI working
- ✅ QRCode.js: SRI working
- **Result**: Site broken

### After (Partial SRI)
- ⚠️ Lucide: No SRI (but pinned version)
- ✅ Three.js: SRI working
- ✅ QRCode.js: SRI working
- **Result**: Site working, 2/3 scripts protected

### Mitigation for Lucide
- ✅ Pin to specific version (0.263.1, not @latest)
- ✅ Use official unpkg.com (trusted source)
- ✅ Monitor for updates (manual review)
- ⚠️ No integrity verification (accept risk)

---

## Alternative: Self-Host Lucide (Future)

**Long-term solution**:
1. Download Lucide 0.263.1 to `/public/js/vendor/`
2. Serve from own domain (no CORS issue)
3. Add SRI hash for self-hosted file
4. Update CSP to allow 'self'

**Effort**: 1 hour
**Benefit**: Full SRI coverage
**Trade-off**: Need to manage updates manually
