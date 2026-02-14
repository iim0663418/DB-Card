# BDD Spec: OAuth Client ID Unification (Enhanced)
**Priority**: P1 (Configuration Consistency)
**Estimated Time**: 1.5 hours (增加文檔更新)

## Scenario 1: Backend Provides Client ID
- **Given**: Frontend needs Google Client ID for OAuth init
- **When**: GET /api/oauth/config
- **Then**: 
  * Return `{ clientId: env.GOOGLE_CLIENT_ID }`
  * Cache response with Cache-Control: public, max-age=3600
  * No hardcoded clientId in frontend

## Scenario 2: Frontend Fetches Config Before OAuth
- **Given**: User clicks "Sign in with Google"
- **When**: initGoogleOAuth() is called
- **Then**: 
  1. Fetch /api/oauth/config (if not cached in sessionStorage)
  2. Use returned clientId for OAuth init
  3. Proceed with existing state + nonce + PKCE flow

## Scenario 3: Documentation Updated
- **Given**: New API endpoint /api/oauth/config added
- **When**: Developer reads README.md
- **Then**: 
  * API endpoint listed in "API 端點" section
  * Environment variable GOOGLE_CLIENT_ID documented
  * No references to hardcoded clientId

## Technical Requirements

### 1. New API Endpoint (index.ts)
```typescript
if (url.pathname === '/api/oauth/config' && request.method === 'GET') {
  return new Response(JSON.stringify({
    clientId: env.GOOGLE_CLIENT_ID
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
```

### 2. Frontend Config Fetch (user-portal-init.js)
```javascript
async function getOAuthConfig() {
  const cached = sessionStorage.getItem('oauth_config');
  if (cached) {
    const { clientId, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < 3600000) return { clientId };
  }
  
  const res = await fetch('/api/oauth/config');
  const config = await res.json();
  sessionStorage.setItem('oauth_config', JSON.stringify({
    ...config,
    timestamp: Date.now()
  }));
  return config;
}

// Replace line 642
const { clientId } = await getOAuthConfig();
```

### 3. Documentation Update (README.md)
Add to "API 端點" section:
```markdown
### 公開 API
- `GET /api/oauth/config` - 取得 OAuth 配置（clientId）
```

## Acceptance Criteria
- [ ] /api/oauth/config endpoint returns clientId
- [ ] Frontend fetches config before OAuth init
- [ ] sessionStorage caching works (1 hour TTL)
- [ ] No hardcoded clientId in user-portal-init.js line 642
- [ ] README.md API section updated
- [ ] Existing OAuth flow still works
- [ ] TypeScript compiles without errors

## Files to Modify
- `workers/src/index.ts` (add /api/oauth/config route)
- `workers/public/js/user-portal-init.js` (fetch config, remove hardcode line 642)
- `README.md` (add API endpoint documentation)
