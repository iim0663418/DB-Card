# Nonce-based CSP Implementation - BDD Specification

## Objective
Implement nonce-based Content Security Policy to remove 'unsafe-inline'

## Current State
- CSP allows 'unsafe-inline' for scripts
- All inline scripts extracted to external files
- Ready for nonce implementation

## Target State
- Each request generates unique nonce
- Nonce injected into HTML responses
- CSP uses nonce instead of 'unsafe-inline'
- All external scripts have nonce attribute

## Implementation Steps

### Step 1: Generate Nonce (Backend)
**File**: workers/src/index.ts

**Add nonce generation function**:
```typescript
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}
```

**Generate nonce per request**:
```typescript
const nonce = generateNonce();
```

### Step 2: Update CSP Header
**File**: workers/src/index.ts

**Before**:
```typescript
"script-src 'self' 'unsafe-inline' cdn.tailwindcss.com ..."
```

**After**:
```typescript
"script-src 'self' 'nonce-${nonce}' cdn.tailwindcss.com ..."
```

### Step 3: Inject Nonce into HTML
**File**: workers/src/index.ts

**For HTML responses**:
```typescript
if (contentType?.includes('text/html')) {
  let html = await response.text();
  html = html.replace(/<script/g, `<script nonce="${nonce}"`);
  return new Response(html, { headers });
}
```

## Acceptance Criteria

### Scenario 1: Nonce Generated Per Request
**Given**: Multiple requests to same page
**When**: Check response headers
**Then**: Each request has different nonce in CSP

### Scenario 2: Scripts Have Nonce
**Given**: HTML page loaded
**When**: View page source
**Then**: All `<script>` tags have nonce attribute

### Scenario 3: CSP Without unsafe-inline
**Given**: Any page loaded
**When**: Check CSP header
**Then**: No 'unsafe-inline' in script-src

### Scenario 4: Scripts Execute Normally
**Given**: All pages loaded
**When**: Test functionality
**Then**: All features work (scripts execute)

### Scenario 5: Inline Scripts Blocked
**Given**: Attacker injects `<script>alert(1)</script>`
**When**: Content rendered
**Then**: Script blocked (no nonce)

## Security Benefits
- ✅ Blocks all inline scripts without nonce
- ✅ Unique nonce per request (no replay)
- ✅ Maintains functionality (external scripts work)
- ✅ Strengthens XSS protection

## Estimated Time
- Step 1: 20 minutes
- Step 2: 10 minutes
- Step 3: 30 minutes
- **Total**: 1 hour
