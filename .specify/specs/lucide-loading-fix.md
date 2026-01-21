# Lucide Loading Fix - Remove defer Attribute

## Issue: lucide is not defined

**Error**:
```
Uncaught (in promise) ReferenceError: lucide is not defined
    at HTMLDocument.initApp (main.js:216:5)
```

**Root Cause**:
- Lucide script has `defer` attribute
- main.js executes on DOMContentLoaded
- With `defer`, Lucide may not be loaded yet when main.js runs
- `lucide.createIcons()` fails because `lucide` object doesn't exist

---

## Solution: Remove defer from Lucide

**Reason**:
- Lucide must be loaded BEFORE main.js executes
- Removing `defer` makes Lucide load synchronously
- Ensures `lucide` object is available when needed

**Change**:
```html
<!-- ❌ Before (with defer) -->
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js" defer></script>

<!-- ✅ After (without defer) -->
<script src="https://unpkg.com/lucide@0.263.1/dist/umd/lucide.min.js"></script>
```

---

## Files to Fix (4 files)

1. **admin-dashboard.html:23**
2. **user-portal.html:23**
3. **card-display.html:23**
4. **index.html:24**

---

## Implementation

**Remove `defer` attribute from Lucide script tag only**

Keep `defer` for:
- ✅ Three.js (not needed immediately)
- ✅ QRCode.js (not needed immediately)

Remove `defer` from:
- ❌ Lucide (needed for icon rendering)

---

## Testing

- [ ] Load card-display.html → Icons render immediately
- [ ] Check console → No "lucide is not defined" error
- [ ] Verify lucide.createIcons() works
- [ ] Test all 4 pages
