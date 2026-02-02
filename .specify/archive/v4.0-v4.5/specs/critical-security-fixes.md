# Critical Security Fixes - BDD Specification

## Feature: Fix Critical OWASP Top 10 Vulnerabilities
**Purpose**: Implement Subresource Integrity (SRI) for all CDN resources to prevent supply chain attacks

---

## Priority: 🔴 CRITICAL

**Risk**: CDN compromise → malicious code injection → full site compromise  
**Impact**: CRITICAL - If CDN is hacked, attackers can inject arbitrary JavaScript  
**Effort**: 1 hour  
**Files**: 4 HTML files

---

## Scenario 1: Add SRI to Three.js

- **Given**: Three.js is loaded from cdnjs.cloudflare.com without integrity check
- **When**: HTML is rendered
- **Then**:
  - Script tag includes `integrity` attribute with SHA-512 hash
  - Script tag includes `crossorigin="anonymous"` attribute
  - Browser verifies script integrity before execution
  - If hash mismatch, script is blocked

**Current**:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" defer></script>
```

**Expected**:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" 
        integrity="sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==" 
        crossorigin="anonymous" 
        defer></script>
```

---

## Scenario 2: Add SRI to QRCode.js

- **Given**: QRCode.js is loaded from cdnjs.cloudflare.com without integrity check
- **When**: HTML is rendered
- **Then**:
  - Script tag includes `integrity` attribute with SHA-512 hash
  - Script tag includes `crossorigin="anonymous"` attribute
  - Browser verifies script integrity before execution

**Current**:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" defer></script>
```

**Expected**:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" 
        integrity="sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSQX0FslNhTDadL4O5SAGapGt4FodqL8My0mA==" 
        crossorigin="anonymous" 
        defer></script>
```

---

## Scenario 3: Pin Lucide to Specific Version with SRI

- **Given**: Lucide is loaded from unpkg.com with `@latest` (unpredictable version)
- **When**: HTML is rendered
- **Then**:
  - Script uses specific version (e.g., `@0.263.1`)
  - Script tag includes `integrity` attribute with SHA-512 hash
  - Script tag includes `crossorigin="anonymous"` attribute
  - Version is predictable and verifiable

**Current**:
```html
<script src="https://unpkg.com/lucide@latest" defer></script>
```

**Expected**:
```html
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js" 
        integrity="sha512-[HASH_TO_BE_GENERATED]" 
        crossorigin="anonymous" 
        defer></script>
```

---

## Scenario 4: Verify SRI Hashes are Correct

- **Given**: SRI hashes are added to script tags
- **When**: Browser loads the scripts
- **Then**:
  - All scripts load successfully (hashes match)
  - No console errors about integrity mismatch
  - All frontend functionality works (Three.js, Lucide, QRCode)

---

## Implementation Requirements

### Files to Modify

1. **workers/public/admin-dashboard.html**
   - Line ~23: Lucide script
   - Line ~24: Three.js script

2. **workers/public/user-portal.html**
   - Line ~23: Lucide script
   - Line ~24: Three.js script

3. **workers/public/card-display.html**
   - Line ~23: Lucide script
   - Line ~24: Three.js script
   - Line ~25: QRCode.js script

4. **workers/public/index.html**
   - Line ~24: Lucide script
   - Line ~25: Three.js script

---

## SRI Hash Generation

### Method 1: Use SRI Hash Generator (Recommended)
```bash
# Visit: https://www.srihash.org/
# Enter CDN URL
# Copy generated integrity attribute
```

### Method 2: Command Line
```bash
# Download script
curl -s https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js > three.min.js

# Generate SHA-512 hash
cat three.min.js | openssl dgst -sha512 -binary | openssl base64 -A

# Result format: sha512-[BASE64_HASH]
```

### Method 3: Use cdnjs.com Directly
```
# Visit: https://cdnjs.com/libraries/three.js/r128
# Copy "SRI Hash" from library page
```

---

## Known SRI Hashes (Pre-Generated)

### Three.js r128
```
integrity="sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ=="
```

### QRCode.js 1.0.0
```
integrity="sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSQX0FslNhTDadL4O5SAGapGt4FodqL8My0mA=="
```

### Lucide 0.263.1
```
# Need to generate (unpkg doesn't provide SRI hashes)
# Use Method 2 (command line) to generate
```

---

## Testing Requirements

### Manual Testing
- [ ] Load admin-dashboard.html → Three.js and Lucide load successfully
- [ ] Load user-portal.html → Three.js and Lucide load successfully
- [ ] Load card-display.html → Three.js, Lucide, and QRCode load successfully
- [ ] Load index.html → Three.js and Lucide load successfully
- [ ] Check browser console → No integrity errors
- [ ] Test Three.js functionality → Background animation works
- [ ] Test Lucide functionality → Icons render correctly
- [ ] Test QRCode functionality → QR codes generate correctly

### Security Testing
- [ ] Modify script content → Browser blocks execution
- [ ] Remove integrity attribute → Script loads (fallback)
- [ ] Wrong hash → Browser blocks execution
- [ ] Check CSP headers → Scripts allowed from CDN domains

---

## Acceptance Criteria

- ✅ All CDN scripts have `integrity` attribute
- ✅ All CDN scripts have `crossorigin="anonymous"` attribute
- ✅ Lucide uses specific version (not `@latest`)
- ✅ All scripts load successfully in browser
- ✅ No console errors about integrity mismatch
- ✅ All frontend functionality works correctly
- ✅ Security audit shows SRI implemented

---

## Rollback Plan

If SRI causes issues:
1. Remove `integrity` attribute (keep `crossorigin`)
2. Revert to previous version
3. Investigate hash mismatch
4. Regenerate correct hash

---

## Future Improvements

1. **Automate SRI Hash Updates**:
   - Use build tool to generate hashes
   - Update hashes when upgrading dependencies

2. **Add SRI to Tailwind CSS**:
   - Currently uses runtime CDN (no SRI possible)
   - Consider self-hosting or using specific version

3. **Monitor CDN Availability**:
   - Add fallback to local copies
   - Implement CDN failover

---

## References

- [W3C Subresource Integrity](https://www.w3.org/TR/SRI/)
- [MDN: Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [SRI Hash Generator](https://www.srihash.org/)
- [OWASP: Software and Data Integrity Failures](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/)
