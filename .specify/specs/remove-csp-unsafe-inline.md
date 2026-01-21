# Remove CSP 'unsafe-inline' - BDD Specification

## Objective
Remove 'unsafe-inline' from Content Security Policy to strengthen XSS protection

## Current State
- CSP allows 'unsafe-inline' for scripts and styles
- Inline scripts exist in HTML files
- Weakens XSS protection

## Target State
- All inline scripts extracted to external files
- CSP uses nonce-based approach
- No 'unsafe-inline' in CSP headers

## Implementation Plan

### Phase 1: Extract Inline Scripts (2 hours)
**Files to modify**:
- index.html: 2 inline scripts
- user-portal.html: Check inline scripts
- admin-dashboard.html: Check inline scripts
- card-display.html: Check inline scripts

**New files to create**:
- workers/public/js/tailwind-suppress.js (console.warn override)
- workers/public/js/three-init.js (Three.js initialization)

### Phase 2: Implement Nonce-based CSP (1 hour)
**Backend changes**:
- workers/src/index.ts: Generate nonce per request
- Add nonce to response headers
- Inject nonce into HTML

**Frontend changes**:
- Add nonce attribute to external script tags
- Remove inline scripts

### Phase 3: Update CSP Headers (1 hour)
**Changes**:
```typescript
// Before
"script-src 'self' 'unsafe-inline' cdn.tailwindcss.com ..."

// After
"script-src 'self' 'nonce-{NONCE}' cdn.tailwindcss.com ..."
```

## Acceptance Criteria

### Scenario 1: No Inline Scripts
**Given**: All HTML files loaded
**When**: View page source
**Then**: No `<script>` tags without `src` attribute

### Scenario 2: CSP Without unsafe-inline
**Given**: Any page loaded
**When**: Check response headers
**Then**: CSP header does NOT contain 'unsafe-inline'

### Scenario 3: Scripts Still Work
**Given**: All pages loaded
**When**: Test functionality
**Then**: All features work normally

### Scenario 4: XSS Protection Enhanced
**Given**: Attacker injects `<script>alert(1)</script>`
**When**: Content rendered
**Then**: Script blocked by CSP (no nonce)

## Estimated Time
- Phase 1: 2 hours
- Phase 2: 1 hour
- Phase 3: 1 hour
- **Total**: 4 hours
