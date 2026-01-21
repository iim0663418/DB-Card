# SRI Implementation Test Plan

## Verified SRI Hashes (Generated 2026-01-21)

### Three.js r128
```
URL: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
Hash: sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==
```

### QRCode.js 1.0.0
```
URL: https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js
Hash: sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSQX0FslNhTDadL4O5SAGapGt4FodqL8My0mA==
```

### Lucide 0.263.1
```
URL: https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js
Hash: sha512-VhtMfJ1Aaq57sAvnJxADAsTQHqaKtS10sPkmJmMd728qoXpmufke0U0NndWPvMERJ1f48WYvFi+b6kHNmpFuGg==
```

---

## Implementation Changes

### 1. admin-dashboard.html (Line ~23-24)

**Before**:
```html
<script src="https://unpkg.com/lucide@latest" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" defer></script>
```

**After**:
```html
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js" 
        integrity="sha512-VhtMfJ1Aaq57sAvnJxADAsTQHqaKtS10sPkmJmMd728qoXpmufke0U0NndWPvMERJ1f48WYvFi+b6kHNmpFuGg==" 
        crossorigin="anonymous" 
        defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" 
        integrity="sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==" 
        crossorigin="anonymous" 
        defer></script>
```

---

### 2. user-portal.html (Line ~23-24)

**Before**:
```html
<script src="https://unpkg.com/lucide@latest" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" defer></script>
```

**After**:
```html
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js" 
        integrity="sha512-VhtMfJ1Aaq57sAvnJxADAsTQHqaKtS10sPkmJmMd728qoXpmufke0U0NndWPvMERJ1f48WYvFi+b6kHNmpFuGg==" 
        crossorigin="anonymous" 
        defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" 
        integrity="sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==" 
        crossorigin="anonymous" 
        defer></script>
```

---

### 3. card-display.html (Line ~23-25)

**Before**:
```html
<script src="https://unpkg.com/lucide@latest" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" defer></script>
```

**After**:
```html
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js" 
        integrity="sha512-VhtMfJ1Aaq57sAvnJxADAsTQHqaKtS10sPkmJmMd728qoXpmufke0U0NndWPvMERJ1f48WYvFi+b6kHNmpFuGg==" 
        crossorigin="anonymous" 
        defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" 
        integrity="sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==" 
        crossorigin="anonymous" 
        defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" 
        integrity="sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSQX0FslNhTDadL4O5SAGapGt4FodqL8My0mA==" 
        crossorigin="anonymous" 
        defer></script>
```

---

### 4. index.html (Line ~24-25)

**Before**:
```html
<script src="https://unpkg.com/lucide@latest"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
```

**After**:
```html
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js" 
        integrity="sha512-VhtMfJ1Aaq57sAvnJxADAsTQHqaKtS10sPkmJmMd728qoXpmufke0U0NndWPvMERJ1f48WYvFi+b6kHNmpFuGg==" 
        crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" 
        integrity="sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==" 
        crossorigin="anonymous"></script>
```

---

## Testing Checklist

### Pre-Implementation Testing
- [x] Generate SRI hashes for all CDN resources
- [x] Verify hashes are correct (SHA-512)
- [x] Document all changes needed

### Post-Implementation Testing

#### Functional Testing
- [ ] **admin-dashboard.html**
  - [ ] Page loads without errors
  - [ ] Three.js background animation works
  - [ ] Lucide icons render correctly
  - [ ] No console errors about integrity

- [ ] **user-portal.html**
  - [ ] Page loads without errors
  - [ ] Three.js background animation works
  - [ ] Lucide icons render correctly
  - [ ] No console errors about integrity

- [ ] **card-display.html**
  - [ ] Page loads without errors
  - [ ] Three.js background animation works
  - [ ] Lucide icons render correctly
  - [ ] QR code generation works
  - [ ] No console errors about integrity

- [ ] **index.html**
  - [ ] Page loads without errors
  - [ ] Three.js background animation works
  - [ ] Lucide icons render correctly
  - [ ] No console errors about integrity

#### Security Testing
- [ ] **Integrity Verification**
  - [ ] Open browser DevTools → Network tab
  - [ ] Verify all scripts load with status 200
  - [ ] Check "Integrity" column shows hash
  - [ ] No "Failed to find a valid digest" errors

- [ ] **Tamper Detection** (Manual Test)
  - [ ] Modify script content on CDN (simulate attack)
  - [ ] Browser should block execution
  - [ ] Console should show integrity error

- [ ] **Fallback Behavior**
  - [ ] Remove integrity attribute temporarily
  - [ ] Script should still load (no SRI check)
  - [ ] Restore integrity attribute

#### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Expected Console Output

### Success (No Errors)
```
✅ All scripts loaded successfully
✅ No integrity errors
✅ Three.js initialized
✅ Lucide icons rendered
✅ QRCode library loaded (card-display only)
```

### Failure (Integrity Mismatch)
```
❌ Failed to find a valid digest in the 'integrity' attribute for resource 'https://...' with computed SHA-512 integrity '...'. The resource has been blocked.
```

---

## Rollback Plan

If SRI causes issues:

1. **Immediate Rollback**:
```bash
git revert HEAD
git push origin develop
```

2. **Partial Rollback** (Remove integrity only):
```html
<!-- Keep crossorigin, remove integrity -->
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js" 
        crossorigin="anonymous" 
        defer></script>
```

3. **Debug Steps**:
   - Check browser console for specific error
   - Verify hash matches downloaded file
   - Regenerate hash if needed
   - Test in different browsers

---

## Success Criteria

- ✅ All 4 HTML files updated with SRI
- ✅ All scripts load successfully in browser
- ✅ No console errors about integrity
- ✅ All frontend functionality works
- ✅ Three.js animations work
- ✅ Lucide icons render
- ✅ QR codes generate (card-display)
- ✅ Security audit shows SRI implemented

---

## Next Steps After SRI

1. **Monitor for 24 hours**
   - Check error logs
   - Monitor user reports
   - Verify no CDN issues

2. **Proceed to High Priority Fixes**
   - Add DOMPurify for XSS protection
   - Migrate user tokens to HttpOnly cookies
   - Remove 'unsafe-inline' from CSP

3. **Document in Security Audit**
   - Update OWASP audit report
   - Mark A08 (Software Integrity) as FIXED
   - Update security posture to HIGH
