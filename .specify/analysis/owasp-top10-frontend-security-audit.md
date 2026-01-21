# OWASP Top 10 Frontend Security Audit Report
**Project**: DB-Card NFC Digital Business Card System  
**Audit Date**: 2026-01-21  
**Scope**: Frontend Security (HTML/CSS/JavaScript)  
**Reference**: OWASP Top 10 2021, OWASP Client-Side Top 10

---

## Executive Summary

**Overall Security Level**: 🟡 MODERATE (6/10 issues require attention)

**Critical Issues**: 2  
**High Priority**: 3  
**Medium Priority**: 1  
**Low Priority**: 0

**Key Findings**:
- ✅ Backend has CSP headers implemented
- ❌ No Subresource Integrity (SRI) for CDN resources
- ⚠️ Some innerHTML usage (potential XSS risk)
- ⚠️ Sensitive tokens in localStorage (should use HttpOnly cookies)
- ✅ Good use of textContent for user data
- ❌ No input sanitization library (DOMPurify)

---

## OWASP Top 10 2021 Analysis

### A01:2021 – Broken Access Control ✅ PASS

**Status**: Well Implemented

**Backend Protection**:
- ✅ ReadSession mechanism with 24h TTL
- ✅ Concurrent read limits by card type
- ✅ Rate limiting (50/hour per card, 60/hour per IP)
- ✅ HttpOnly cookies for admin authentication
- ✅ Token version increment for emergency revocation

**Frontend Protection**:
- ✅ Admin dashboard requires authentication
- ✅ User portal requires OAuth login
- ✅ No sensitive operations exposed to client

**Recommendation**: No changes needed

---

### A02:2021 – Cryptographic Failures ⚠️ NEEDS IMPROVEMENT

**Status**: Partially Secure

**Issues Found**:

#### 🔴 CRITICAL: User Tokens in localStorage
**File**: `user-portal.html:1006-1008`
```javascript
localStorage.setItem('auth_token', token);
localStorage.setItem('auth_user', JSON.stringify({ email, name, picture }));
localStorage.setItem('auth_expires', Date.now() + 24 * 60 * 60 * 1000);
```

**Risk**: 
- localStorage is accessible to JavaScript (XSS vulnerability)
- Tokens can be stolen via XSS attacks
- No HttpOnly protection

**Impact**: HIGH - Token theft leads to account takeover

**Recommendation**:
```javascript
// ❌ Remove localStorage usage
// ✅ Use HttpOnly cookies (backend already supports this)

// Backend should set cookie on OAuth callback:
response.headers.set('Set-Cookie', 
  `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
);

// Frontend: Remove localStorage, use credentials: 'include'
fetch('/api/user/cards', {
  credentials: 'include'  // Send HttpOnly cookie
});
```

#### 🟡 MEDIUM: Admin Token in sessionStorage
**File**: `admin-dashboard.html:948`
```javascript
sessionStorage.setItem('setup_token', token);
```

**Risk**: 
- sessionStorage is accessible to JavaScript (XSS vulnerability)
- Better than localStorage (cleared on tab close)
- Still vulnerable to XSS

**Impact**: MEDIUM - Admin token theft

**Recommendation**:
- Backend already uses HttpOnly cookies for admin
- Remove sessionStorage usage
- Use only HttpOnly cookies

---

### A03:2021 – Injection (XSS) ⚠️ NEEDS IMPROVEMENT

**Status**: Partially Protected

**Good Practices Found** ✅:
```javascript
// main.js: Using textContent (safe)
document.getElementById('user-name').textContent = name;
document.getElementById('user-title').textContent = title;
document.getElementById('user-department-text').textContent = deptText;
```

**Issues Found**:

#### 🟡 HIGH: innerHTML Usage Without Sanitization
**Files**: 
- `admin-dashboard.html`: 21 instances
- `user-portal.html`: 5 instances
- `main.js`: 2 instances

**Examples**:
```javascript
// admin-dashboard.html:1050 - Skeleton loading
skeletonCard.innerHTML = `<div class="skeleton-card">...</div>`;

// admin-dashboard.html:1069 - Empty state
grid.innerHTML = `<div class="empty-state">...</div>`;

// main.js:168 - Error display
errorContainer.innerHTML = `<div class="error-message">...</div>`;

// user-portal.html:1729-1733 - Social icons
node.innerHTML = `<svg>...</svg>`;
node.innerHTML = `<i data-lucide="${icon}"></i>`;
```

**Risk**:
- If `icon` variable contains user input → XSS
- Static HTML is safe, but pattern is risky
- No sanitization library in place

**Impact**: HIGH - Potential XSS if user input reaches innerHTML

**Recommendation**:

1. **Add DOMPurify Library**:
```html
<!-- Add to all HTML files -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js" 
        integrity="sha512-..." 
        crossorigin="anonymous" 
        defer></script>
```

2. **Sanitize All innerHTML**:
```javascript
// ❌ Before
errorContainer.innerHTML = `<div>${message}</div>`;

// ✅ After
errorContainer.innerHTML = DOMPurify.sanitize(`<div>${message}</div>`);
```

3. **Prefer DOM API**:
```javascript
// ✅ Best practice
const div = document.createElement('div');
div.className = 'error-message';
div.textContent = message;  // Auto-escaped
errorContainer.appendChild(div);
```

#### 🟡 HIGH: No Input Validation on Social Links
**File**: `admin-dashboard.html`, `user-portal.html`

**Risk**:
- Social links accept arbitrary URLs
- No validation for javascript: or data: URIs
- Potential XSS via href injection

**Recommendation**:
```javascript
function validateSocialLink(url) {
  if (!url) return '';
  
  // Block dangerous protocols
  const dangerous = /^(javascript|data|vbscript):/i;
  if (dangerous.test(url)) {
    console.warn('Blocked dangerous URL:', url);
    return '';
  }
  
  // Ensure https:// or http://
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  
  return url;
}
```

---

### A04:2021 – Insecure Design ✅ PASS

**Status**: Well Designed

**Good Practices**:
- ✅ Envelope encryption (DEK per card, KEK rotation)
- ✅ ReadSession authorization model
- ✅ Rate limiting at multiple layers
- ✅ Audit logging with IP anonymization
- ✅ Separation of admin/user portals

**Recommendation**: No changes needed

---

### A05:2021 – Security Misconfiguration ⚠️ NEEDS IMPROVEMENT

**Status**: Partially Configured

**Good Practices** ✅:
```javascript
// index.ts: Security headers implemented
headers.set('Content-Security-Policy', '...');
headers.set('X-Content-Type-Options', 'nosniff');
headers.set('X-Frame-Options', 'DENY');
headers.set('X-XSS-Protection', '1; mode=block');
headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
```

**Issues Found**:

#### 🔴 CRITICAL: No Subresource Integrity (SRI)
**Files**: All HTML files

**Current**:
```html
<!-- ❌ No integrity check -->
<script src="https://unpkg.com/lucide@latest" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" defer></script>
```

**Risk**:
- CDN compromise → malicious code injection
- No verification of script integrity
- Supply chain attack vector

**Impact**: CRITICAL - Full site compromise if CDN is hacked

**Recommendation**:
```html
<!-- ✅ Add SRI hashes -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" 
        integrity="sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==" 
        crossorigin="anonymous" 
        defer></script>

<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" 
        integrity="sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSQX0FslNhTDadL4O5SAGapGt4FodqL8My0mA==" 
        crossorigin="anonymous" 
        defer></script>

<!-- Lucide: Use specific version instead of @latest -->
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js" 
        integrity="sha512-..." 
        crossorigin="anonymous" 
        defer></script>
```

**How to Generate SRI Hashes**:
```bash
# Method 1: Online tool
https://www.srihash.org/

# Method 2: Command line
curl -s https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js | \
  openssl dgst -sha512 -binary | \
  openssl base64 -A
```

#### 🟡 HIGH: CSP Allows 'unsafe-inline'
**File**: `index.ts:28-29`
```javascript
"script-src 'self' 'unsafe-inline' cdn.tailwindcss.com unpkg.com ...";
"style-src 'self' 'unsafe-inline' fonts.googleapis.com ...";
```

**Risk**:
- 'unsafe-inline' allows inline scripts/styles
- Weakens XSS protection
- Defeats purpose of CSP

**Impact**: HIGH - Reduced XSS protection

**Recommendation**:
```javascript
// Option 1: Use nonce-based CSP (recommended)
const nonce = crypto.randomUUID();
headers.set('Content-Security-Policy',
  `script-src 'self' 'nonce-${nonce}' cdn.tailwindcss.com unpkg.com ...`
);

// In HTML:
<script nonce="${nonce}">
  // Inline script
</script>

// Option 2: Move all inline scripts to external files
// - Extract inline scripts to /js/admin.js, /js/user.js
// - Remove 'unsafe-inline' from CSP
```

---

### A06:2021 – Vulnerable and Outdated Components ⚠️ NEEDS REVIEW

**Status**: Needs Version Audit

**Current Dependencies**:
```html
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Lucide Icons -->
<script src="https://unpkg.com/lucide@latest"></script>  <!-- ❌ @latest is risky -->

<!-- Three.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

<!-- QRCode.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
```

**Issues**:
1. ❌ `lucide@latest` - unpredictable version
2. ⚠️ `three.js r128` - released 2021 (check for updates)
3. ⚠️ `qrcodejs 1.0.0` - last updated 2012 (very old)

**Recommendation**:
```html
<!-- ✅ Pin specific versions -->
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js"></script>

<!-- ✅ Update Three.js to latest stable -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.min.js"></script>

<!-- ✅ Consider modern QR library -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
```

---

### A07:2021 – Identification and Authentication Failures ✅ PASS

**Status**: Well Implemented

**Good Practices**:
- ✅ Google OAuth for user authentication
- ✅ HttpOnly cookies for admin (backend)
- ✅ Token expiration (24h)
- ✅ Session revocation mechanism
- ✅ Rate limiting on authentication endpoints

**Issue**: User tokens in localStorage (covered in A02)

---

### A08:2021 – Software and Data Integrity Failures 🔴 CRITICAL

**Status**: Not Implemented

**Issue**: No SRI (covered in A05)

**Additional Risk**: No CSP for script integrity

**Recommendation**: Implement SRI + strict CSP (see A05)

---

### A09:2021 – Security Logging and Monitoring Failures ✅ PASS

**Status**: Well Implemented

**Backend Logging**:
- ✅ Audit logs for all sensitive operations
- ✅ Security events table
- ✅ IP anonymization (first 3 octets)
- ✅ Security dashboard with real-time monitoring

**Frontend Logging**:
- ✅ Error handling with user-friendly messages
- ✅ No sensitive data in console logs

**Recommendation**: No changes needed

---

### A10:2021 – Server-Side Request Forgery (SSRF) ✅ N/A

**Status**: Not Applicable (Frontend-only audit)

**Note**: Backend should validate all external URLs (avatar URLs, social links)

---

## OWASP Client-Side Top 10 Analysis

### C01: Broken Client-Side Access Control ✅ PASS

**Status**: Well Implemented

- ✅ Admin dashboard requires authentication
- ✅ User portal requires OAuth
- ✅ No sensitive operations in client-side code
- ✅ Backend validates all requests

---

### C02: DOM-Based XSS ⚠️ NEEDS IMPROVEMENT

**Status**: Partially Protected

**Issues**: innerHTML usage (covered in A03)

**Additional Checks**:
```javascript
// ✅ Good: Using textContent
document.getElementById('user-name').textContent = cardData.name;

// ⚠️ Risk: Using innerHTML with template literals
errorContainer.innerHTML = `<div>${message}</div>`;

// ❌ High Risk: Using innerHTML with user input
element.innerHTML = userInput;  // Not found in current code
```

**Recommendation**: Add DOMPurify (see A03)

---

### C03: Sensitive Data Leakage ⚠️ NEEDS IMPROVEMENT

**Status**: Partially Secure

**Issues Found**:

1. **Tokens in localStorage** (covered in A02)
2. **Console Logs in Production**:
```javascript
// Check for console.log in production code
console.log('Card data:', cardData);  // May leak sensitive info
console.warn('Preview avatar failed to load:', avatarUrl);
```

**Recommendation**:
```javascript
// Add production check
const isDev = window.location.hostname === 'localhost';

function safeLog(...args) {
  if (isDev) {
    console.log(...args);
  }
}

// Or use build-time removal
// Vite/Webpack: Remove console.log in production
```

---

### C04: Vulnerable and Outdated Components ⚠️ NEEDS REVIEW

**Status**: Covered in A06

---

### C05: Client-Side Injection ⚠️ NEEDS IMPROVEMENT

**Status**: Covered in A03 (XSS)

---

## Priority Action Items

### 🔴 CRITICAL (Fix Immediately)

1. **Add Subresource Integrity (SRI)**
   - **Effort**: 1 hour
   - **Impact**: Prevents CDN compromise attacks
   - **Files**: All 4 HTML files
   - **Action**: Add integrity + crossorigin attributes

2. **Move User Tokens to HttpOnly Cookies**
   - **Effort**: 2 hours
   - **Impact**: Prevents token theft via XSS
   - **Files**: `user-portal.html`, backend OAuth handler
   - **Action**: Remove localStorage, use HttpOnly cookies

### 🟡 HIGH (Fix This Sprint)

3. **Add DOMPurify for XSS Protection**
   - **Effort**: 2 hours
   - **Impact**: Sanitizes all HTML injection
   - **Files**: All HTML files, `main.js`
   - **Action**: Add library + sanitize innerHTML calls

4. **Remove 'unsafe-inline' from CSP**
   - **Effort**: 4 hours
   - **Impact**: Strengthens XSS protection
   - **Files**: `index.ts`, all HTML files
   - **Action**: Extract inline scripts, use nonce-based CSP

5. **Validate Social Link URLs**
   - **Effort**: 1 hour
   - **Impact**: Prevents javascript: URI injection
   - **Files**: `admin-dashboard.html`, `user-portal.html`
   - **Action**: Add URL validation function

### 🟢 MEDIUM (Fix Next Sprint)

6. **Update Outdated Dependencies**
   - **Effort**: 2 hours
   - **Impact**: Reduces vulnerability surface
   - **Files**: All HTML files
   - **Action**: Update Three.js, replace QRCode.js, pin Lucide version

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)
- [ ] Add SRI to all CDN resources
- [ ] Migrate user tokens to HttpOnly cookies
- [ ] Test authentication flow

### Phase 2: High Priority (Week 2)
- [ ] Add DOMPurify library
- [ ] Sanitize all innerHTML calls
- [ ] Add URL validation for social links
- [ ] Test XSS protection

### Phase 3: CSP Hardening (Week 3)
- [ ] Extract inline scripts to external files
- [ ] Implement nonce-based CSP
- [ ] Test CSP in staging
- [ ] Deploy to production

### Phase 4: Dependency Updates (Week 4)
- [ ] Update Three.js to latest
- [ ] Replace QRCode.js with modern library
- [ ] Pin Lucide to specific version
- [ ] Test all frontend functionality

---

## Testing Checklist

### XSS Testing
- [ ] Test innerHTML with malicious input: `<img src=x onerror=alert(1)>`
- [ ] Test social links with javascript: URI
- [ ] Test department field with script tags
- [ ] Verify DOMPurify sanitization

### Authentication Testing
- [ ] Verify HttpOnly cookies are set
- [ ] Verify tokens not in localStorage
- [ ] Test XSS cannot steal tokens
- [ ] Test session expiration

### CSP Testing
- [ ] Verify inline scripts blocked (after removing 'unsafe-inline')
- [ ] Verify CDN scripts load correctly
- [ ] Test nonce-based inline scripts
- [ ] Check browser console for CSP violations

### SRI Testing
- [ ] Verify scripts load with integrity check
- [ ] Test with modified script (should fail)
- [ ] Verify crossorigin attribute present
- [ ] Test fallback if CDN fails

---

## Security Monitoring

### Ongoing Monitoring
1. **CSP Violation Reports**:
```javascript
// Add CSP report-uri
headers.set('Content-Security-Policy',
  "... report-uri /api/csp-report"
);
```

2. **Dependency Scanning**:
```bash
# Use Snyk or Dependabot
npm audit
```

3. **Regular Security Audits**:
- Quarterly OWASP Top 10 review
- Annual penetration testing
- Continuous vulnerability scanning

---

## References

1. [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
2. [OWASP Client-Side Top 10](https://owasp.org/www-project-top-ten-client-side-security-risks/)
3. [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
4. [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
5. [Subresource Integrity (SRI)](https://www.w3.org/TR/SRI/)
6. [DOMPurify Documentation](https://github.com/cure53/DOMPurify)

---

## Conclusion

**Current Security Posture**: 🟡 MODERATE

**Strengths**:
- ✅ Strong backend security architecture
- ✅ Good authentication mechanisms
- ✅ Comprehensive audit logging
- ✅ Rate limiting and access control

**Weaknesses**:
- 🔴 No SRI for CDN resources (critical)
- 🔴 User tokens in localStorage (critical)
- 🟡 innerHTML usage without sanitization (high)
- 🟡 CSP allows 'unsafe-inline' (high)

**Estimated Effort**: 12 hours total
- Critical fixes: 3 hours
- High priority: 7 hours
- Medium priority: 2 hours

**Recommended Timeline**: 4 weeks (phased approach)

**Post-Implementation Security Level**: 🟢 HIGH (9/10)
