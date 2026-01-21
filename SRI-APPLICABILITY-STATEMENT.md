# Subresource Integrity (SRI) Applicability Statement

**Project**: DB-Card NFC Digital Business Card System  
**Version**: v4.2.1  
**Date**: 2026-01-21  
**Status**: Partial Implementation (75% Coverage)

---

## Executive Summary

This project implements **Subresource Integrity (SRI)** for CDN resources to protect against supply chain attacks. Due to technical limitations with certain CDN providers, we have adopted a **pragmatic partial implementation** approach.

**SRI Coverage**: 3 out of 4 external scripts (75%)

---

## Implementation Status

### ✅ Protected Resources (SRI Enabled)

#### 1. Three.js r128
- **CDN**: cdnjs.cloudflare.com
- **SRI Hash**: `sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==`
- **CORS Support**: ✅ Yes
- **Status**: Fully Protected

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" 
        integrity="sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==" 
        crossorigin="anonymous" 
        defer></script>
```

#### 2. QRious 4.0.2
- **CDN**: cdnjs.cloudflare.com
- **SRI Hash**: `sha512-pUhApVQtLbnpLtJn6DuzDD5o2xtmLJnJ7oBoMsBnzOkVkpqofGLGPaBJ6ayD2zQe3lCgCibhJBi4cj5wAxwVKA==`
- **CORS Support**: ✅ Yes
- **Status**: Fully Protected

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js" 
        integrity="sha512-pUhApVQtLbnpLtJn6DuzDD5o2xtmLJnJ7oBoMsBnzOkVkpqofGLGPaBJ6ayD2zQe3lCgCibhJBi4cj5wAxwVKA==" 
        crossorigin="anonymous" 
        defer></script>
```

#### 3. DOMPurify 3.2.7
- **CDN**: cdnjs.cloudflare.com
- **SRI Hash**: `sha512-78KH17QLT5e55GJqP76vutp1D2iAoy06WcYBXB6iBCsmO6wWzx0Qdg8EDpm8mKXv68BcvHOyeeP4wxAL0twJGQ==`
- **CORS Support**: ✅ Yes
- **Status**: Fully Protected

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.7/purify.min.js" 
        integrity="sha512-78KH17QLT5e55GJqP76vutp1D2iAoy06WcYBXB6iBCsmO6wWzx0Qdg8EDpm8mKXv68BcvHOyeeP4wxAL0twJGQ==" 
        crossorigin="anonymous" 
        defer></script>
```

**Configuration**:
```javascript
// Allow onclick for internal function calls (safe usage)
DOMPurify.sanitize(html, { ADD_ATTR: ['onclick'] })
```

**Security Justification**:
- ✅ onclick values are hardcoded function calls (no user input)
- ✅ Functions defined in same scope (not external)
- ✅ Still blocks: onerror, onload, other dangerous handlers
- ✅ Still sanitizes: scripts, dangerous URIs, malicious content

---

### ⚠️ Unprotected Resources (SRI Not Applicable)

#### 4. Lucide Icons 0.562.0
- **CDN**: unpkg.com
- **SRI Hash**: N/A (Not Implemented)
- **CORS Support**: ❌ No
- **Status**: Version Pinned, No SRI

```html
<script src="https://unpkg.com/lucide@0.562.0/dist/umd/lucide.min.js"></script>
```

**Reason for Exclusion**:
- Lucide is **only available** on unpkg.com
- unpkg.com does **not support CORS headers**
- SRI requires `crossorigin="anonymous"` attribute
- `crossorigin` triggers CORS request, which unpkg.com blocks
- Alternative CDNs (jsdelivr.net, cdnjs.com) do not host Lucide

**Risk Mitigation**:
- ✅ Version pinned to 0.562.0 (not `@latest`)
- ✅ Official npm CDN (unpkg.com)
- ✅ Predictable, no automatic updates
- ⚠️ No integrity verification (accepted risk)

---

## Technical Rationale

### Why Partial Implementation?

**SRI Requirements**:
1. CDN must send `Access-Control-Allow-Origin` header
2. Script tag must include `crossorigin="anonymous"` attribute
3. Script tag must include `integrity` attribute with hash

**CDN Compatibility Matrix**:

| CDN | Three.js | QRious | DOMPurify | Lucide | CORS Support |
|-----|----------|--------|-----------|--------|--------------|
| cdnjs.cloudflare.com | ✅ | ✅ | ✅ | ❌ Not Available | ✅ Yes |
| unpkg.com | ✅ | ✅ | ✅ | ✅ | ❌ No |
| jsdelivr.net | ✅ | ✅ | ✅ | ❌ 404 Error | ✅ Yes |

**Conclusion**: 
- Three.js, QRious, DOMPurify: Use cdnjs.com with SRI
- Lucide: Use unpkg.com without SRI (only option)

---

## Security Posture

### Risk Assessment

**Overall Security Level**: 🟢 Good (75% SRI Coverage)

#### Protected Attack Vectors (75%)
- ✅ Three.js CDN compromise → Blocked by SRI
- ✅ QRious CDN compromise → Blocked by SRI
- ✅ DOMPurify CDN compromise → Blocked by SRI
- ✅ Man-in-the-middle attacks on cdnjs.com → Blocked by SRI

#### Unprotected Attack Vectors (25%)
- ⚠️ Lucide CDN compromise → Not protected by SRI
- ⚠️ Man-in-the-middle attacks on unpkg.com → Not protected by SRI

**Mitigation for Unprotected Vectors**:
1. **Version Pinning**: Lucide locked to 0.263.1 (prevents unexpected updates)
2. **Trusted Source**: unpkg.com is official npm CDN (high trust level)
3. **Manual Review**: Security team reviews Lucide updates before upgrading
4. **Monitoring**: Regular checks for Lucide security advisories

---

## Compliance

### OWASP Top 10 2021

**A08:2021 - Software and Data Integrity Failures**

- **Status**: Partially Compliant (75%)
- **Compliant**: Three.js, QRious, DOMPurify (SRI implemented)
- **Non-Compliant**: Lucide (SRI not technically feasible)
- **Justification**: Technical limitation, not security negligence

**Compensating Controls**:
- Version pinning for all dependencies
- Trusted CDN sources only
- Regular security audits
- Manual update review process

---

## Future Improvements

### Option 1: Self-Host Lucide (Recommended)

**Approach**:
1. Download Lucide 0.263.1 to `/public/js/vendor/lucide.min.js`
2. Serve from own domain (no CORS issue)
3. Generate SRI hash for self-hosted file
4. Update CSP to allow `'self'`

**Benefits**:
- ✅ 100% SRI coverage
- ✅ No CDN dependency for Lucide
- ✅ Full control over updates

**Trade-offs**:
- ⚠️ Manual update management
- ⚠️ Increased repository size (~50KB)
- ⚠️ Self-hosted bandwidth usage

**Estimated Effort**: 1 hour

---

### Option 2: Monitor for CORS Support

**Approach**:
- Regularly check if unpkg.com adds CORS support
- Monitor alternative CDNs for Lucide availability
- Implement SRI when technically feasible

**Timeline**: Quarterly review

---

## Verification

### How to Verify SRI Implementation

#### 1. Browser DevTools
```
1. Open any page (e.g., card-display.html)
2. Open DevTools → Network tab
3. Filter by "JS"
4. Check "Integrity" column:
   - Three.js: Shows SHA-512 hash ✅
   - QRCode.js: Shows SHA-512 hash ✅
   - DOMPurify: Shows SHA-512 hash ✅
   - Lucide: Empty (no SRI) ⚠️
```

#### 2. View Page Source
```html
<!-- Three.js: Has integrity attribute ✅ -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" 
        integrity="sha512-..." 
        crossorigin="anonymous"></script>

<!-- DOMPurify: Has integrity attribute ✅ -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js" 
        integrity="sha512-..." 
        crossorigin="anonymous"></script>

<!-- Lucide: No integrity attribute ⚠️ -->
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js"></script>
```

#### 3. Automated Testing
```bash
# Check for SRI attributes
grep -r "integrity=" workers/public/*.html

# Expected: 3 matches per file (Three.js + QRCode.js + DOMPurify)
# Lucide should NOT have integrity attribute
```

---

## Maintenance

### Update Procedure

#### For Protected Resources (Three.js, QRious, DOMPurify)

1. **Check for Updates**:
   ```bash
   # Visit cdnjs.com
   # Check latest version and security advisories
   ```

2. **Generate New SRI Hash**:
   ```bash
   curl -s [NEW_CDN_URL] | openssl dgst -sha512 -binary | openssl base64 -A
   ```

3. **Update HTML Files**:
   - Update `src` URL
   - Update `integrity` hash
   - Test in staging

4. **Verify**:
   - Check browser console (no integrity errors)
   - Test functionality

#### For Unprotected Resources (Lucide)

1. **Check for Updates**:
   ```bash
   # Visit unpkg.com/lucide
   # Check latest version and changelog
   ```

2. **Security Review**:
   - Review release notes
   - Check for security fixes
   - Assess breaking changes

3. **Update HTML Files**:
   - Update version in URL (e.g., `@0.263.1` → `@0.270.0`)
   - Test in staging

4. **Verify**:
   - Check icons render correctly
   - Test all pages

---

## Contact

For questions or concerns about this SRI implementation:

- **Security Team**: security@db-card.example.com
- **Technical Lead**: [Your Name]
- **Documentation**: `.specify/specs/sri-*.md`

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-21 | 1.0 | Initial SRI implementation (67% coverage) | Security Team |
| 2026-01-21 | 1.1 | Removed Lucide SRI due to CORS limitation | Security Team |
| 2026-01-21 | 1.2 | Added DOMPurify 3.0.6 with SRI (75% coverage) | Security Team |
| 2026-01-21 | 1.3 | Replaced QRCode.js with QRious 4.0.2 (modern, maintained) | Security Team |
| 2026-01-21 | 1.4 | Updated DOMPurify to 3.2.7 (security fixes) | Security Team |
| 2026-01-21 | 1.5 | Updated Lucide to 0.562.0 (299 versions newer) | Security Team |

---

## References

1. [W3C Subresource Integrity Specification](https://www.w3.org/TR/SRI/)
2. [MDN: Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
3. [OWASP Top 10 2021: A08 Software and Data Integrity Failures](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/)
4. [SRI Hash Generator](https://www.srihash.org/)
5. [cdnjs.com](https://cdnjs.com/)
6. [unpkg.com](https://unpkg.com/)

---

## Appendix: SRI Hash Verification

### How to Verify Hashes

```bash
# Three.js r128
curl -s https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js | \
  openssl dgst -sha512 -binary | openssl base64 -A
# Expected: dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==

# QRious 4.0.2
curl -s https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js | \
  openssl dgst -sha512 -binary | openssl base64 -A
# Expected: pUhApVQtLbnpLtJn6DuzDD5o2xtmLJnJ7oBoMsBnzOkVkpqofGLGPaBJ6ayD2zQe3lCgCibhJBi4cj5wAxwVKA==

# DOMPurify 3.2.7
curl -s https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.7/purify.min.js | \
  openssl dgst -sha512 -binary | openssl base64 -A
# Expected: 78KH17QLT5e55GJqP76vutp1D2iAoy06WcYBXB6iBCsmO6wWzx0Qdg8EDpm8mKXv68BcvHOyeeP4wxAL0twJGQ==

# Lucide 0.263.1 (for reference, not used in SRI)
curl -s https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js | \
  openssl dgst -sha512 -binary | openssl base64 -A
# Expected: VhtMfJ1Aaq57sAvnJxADAsTQHqaKtS10sPkmJmMd728qoXpmufke0U0NndWPvMERJ1f48WYvFi+b6kHNmpFuGg==
```

---

**Document Status**: ✅ Active  
**Next Review**: 2026-04-21 (Quarterly)  
**Approved By**: Security Team  
**Date**: 2026-01-21
