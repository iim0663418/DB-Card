# DOMPurify XSS Protection - BDD Specification

## Feature: Add DOMPurify to Sanitize HTML Injection
**Purpose**: Prevent XSS attacks by sanitizing all innerHTML usage

---

## Priority: 🟡 HIGH

**Risk**: XSS attack via innerHTML injection  
**Impact**: HIGH - Malicious scripts can be injected  
**Effort**: 2 hours  
**Files**: 5 files (4 HTML + 1 JS)

---

## Current Vulnerabilities

### innerHTML Usage Without Sanitization

**admin-dashboard.html**: 21 instances
- Skeleton loading cards
- Empty state messages
- Error displays
- Social icon rendering

**user-portal.html**: 5 instances
- Card type selection
- Social icon rendering
- Error displays

**main.js**: 2 instances
- Error container
- Notification display

---

## Solution: Add DOMPurify Library

### Step 1: Add DOMPurify CDN (4 HTML files)

**SRI Hash** (verified 2026-01-21):
```
sha512-H+rglffZ6f5gF7UJgvH4Naa+fGCgjrHKMgoFOGmcPTRwR6oILo5R+gtzNrpDp7iMV3udbymBVjkeZGNz1Em4rQ==
```

**Add to all HTML files**:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js" 
        integrity="sha512-H+rglffZ6f5gF7UJgvH4Naa+fGCgjrHKMgoFOGmcPTRwR6oILo5R+gtzNrpDp7iMV3udbymBVjkeZGNz1Em4rQ==" 
        crossorigin="anonymous" 
        defer></script>
```

**Files**:
1. workers/public/admin-dashboard.html
2. workers/public/user-portal.html
3. workers/public/card-display.html
4. workers/public/index.html

---

### Step 2: Sanitize innerHTML Usage

**Pattern**:
```javascript
// ❌ Before (vulnerable)
element.innerHTML = `<div>${content}</div>`;

// ✅ After (sanitized)
element.innerHTML = DOMPurify.sanitize(`<div>${content}</div>`);
```

**Note**: Static HTML (no variables) is safe, but we sanitize for consistency

---

### Step 3: Add URL Validation for Social Links

**Add validation function**:
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

**Apply to social link inputs** (admin-dashboard.html, user-portal.html)

---

## Implementation Locations

### admin-dashboard.html

**Add DOMPurify script** (after other scripts):
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js" 
        integrity="sha512-H+rglffZ6f5gF7UJgvH4Naa+fGCgjrHKMgoFOGmcPTRwR6oILo5R+gtzNrpDp7iMV3udbymBVjkeZGNz1Em4rQ==" 
        crossorigin="anonymous" 
        defer></script>
```

**Sanitize innerHTML** (21 locations):
- Line ~1044: `grid.innerHTML = '';` (safe, empty string)
- Line ~1050: `skeletonCard.innerHTML = ...` (static HTML, but sanitize)
- Line ~1069: `grid.innerHTML = ...` (static HTML, but sanitize)
- Line ~2175: Social icon rendering (sanitize)
- etc.

---

### user-portal.html

**Add DOMPurify script** (after other scripts)

**Sanitize innerHTML** (5 locations):
- Line ~1305: Card type selection (static HTML, but sanitize)
- Line ~1722: `cluster.innerHTML = '';` (safe, empty string)
- Line ~1729-1733: Social icon rendering (sanitize)

---

### card-display.html

**Add DOMPurify script** (after other scripts)

**No innerHTML usage** (already safe with textContent)

---

### index.html

**Add DOMPurify script** (after other scripts)

**No innerHTML usage** (static page)

---

### main.js

**Sanitize innerHTML** (2 locations):
- Line ~168: `errorContainer.innerHTML = ...` (sanitize)
- Line ~197: `notification.innerHTML = ...` (sanitize)

---

## Testing Requirements

### Functional Testing
- [ ] Load all 4 pages → DOMPurify loads successfully
- [ ] Check console → No DOMPurify errors
- [ ] All innerHTML still renders correctly
- [ ] Social icons display correctly

### Security Testing
- [ ] Inject XSS payload: `<img src=x onerror=alert(1)>`
- [ ] Verify DOMPurify sanitizes it
- [ ] Test javascript: URI in social links
- [ ] Verify dangerous URLs blocked

### XSS Test Cases
```javascript
// Test 1: Script tag
const xss1 = '<script>alert("XSS")</script>';
DOMPurify.sanitize(xss1); // → '' (removed)

// Test 2: Event handler
const xss2 = '<img src=x onerror=alert(1)>';
DOMPurify.sanitize(xss2); // → '<img src="x">' (sanitized)

// Test 3: javascript: URI
const xss3 = '<a href="javascript:alert(1)">Click</a>';
DOMPurify.sanitize(xss3); // → '<a>Click</a>' (href removed)
```

---

## Acceptance Criteria

- ✅ DOMPurify loaded on all 4 HTML pages
- ✅ DOMPurify has SRI hash for integrity
- ✅ All innerHTML calls wrapped with DOMPurify.sanitize()
- ✅ Social link URL validation implemented
- ✅ XSS payloads are sanitized
- ✅ javascript: URIs are blocked
- ✅ All functionality works as before
- ✅ No console errors

---

## Security Benefits

**Before**:
- ❌ innerHTML vulnerable to XSS
- ❌ No input sanitization
- ❌ javascript: URIs not blocked

**After**:
- ✅ All HTML sanitized by DOMPurify
- ✅ XSS payloads removed
- ✅ Dangerous URLs blocked
- ✅ Defense in depth

---

## Performance Impact

**DOMPurify Library**:
- Size: ~45KB (minified)
- Load time: ~50ms
- Sanitization: <1ms per call
- Impact: Negligible

---

## References

- [DOMPurify GitHub](https://github.com/cure53/DOMPurify)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: innerHTML Security](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML#security_considerations)
