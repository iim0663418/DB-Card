# BDD Spec: CSRF 驗證除錯

## 問題分析
- OAuth 驗證成功
- 但建立名片時返回 403
- 可能是 CSRF token 驗證失敗

## Scenario: 添加 CSRF 驗證日誌

### Given
- 使用者嘗試 POST /api/user/cards

### When
- CSRF middleware 執行驗證

### Then
- 應該記錄每個步驟的狀態

### 實作要求

```typescript
export async function csrfMiddleware(request: Request, env: Env): Promise<Response | null> {
  const method = request.method;
  console.log('[CSRF] Method:', method);

  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    console.log('[CSRF] Safe method, skipping check');
    return null;
  }

  const csrfToken = request.headers.get('X-CSRF-Token');
  console.log('[CSRF] X-CSRF-Token header:', csrfToken ? 'present' : 'MISSING');

  if (!csrfToken) {
    console.error('[CSRF] FAIL: Token missing');
    return errorResponse('csrf_token_missing', 'CSRF token is required', 403, request);
  }

  const cookieHeader = request.headers.get('Cookie');
  console.log('[CSRF] Cookie header:', cookieHeader ? 'present' : 'missing');

  if (!cookieHeader) {
    console.log('[CSRF] No cookie, passing to auth middleware');
    return null;
  }

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const trimmed = cookie.trim();
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=');
    if (key) acc[key] = value || '';
    return acc;
  }, {} as Record<string, string>);

  const sessionToken = cookies['admin_token'] || cookies['auth_token'];
  console.log('[CSRF] Session token:', sessionToken ? 'found' : 'not found');

  if (!sessionToken) {
    console.log('[CSRF] No session token, passing to auth middleware');
    return null;
  }

  const storedToken = await env.KV.get(`csrf_token:${sessionToken}`);
  console.log('[CSRF] Stored token from KV:', storedToken ? 'found' : 'NOT FOUND');
  console.log('[CSRF] KV key:', `csrf_token:${sessionToken.substring(0, 8)}...`);

  if (!storedToken) {
    console.warn('[CSRF] No stored token, passing to auth middleware');
    return null;
  }

  console.log('[CSRF] Comparing tokens...');
  console.log('[CSRF] Received token (first 8):', csrfToken.substring(0, 8));
  console.log('[CSRF] Stored token (first 8):', storedToken.substring(0, 8));

  // Timing-safe comparison
  try {
    const encoder = new TextEncoder();
    const tokenBuffer = encoder.encode(csrfToken);
    const storedBuffer = encoder.encode(storedToken);

    if (tokenBuffer.length !== storedBuffer.length) {
      console.error('[CSRF] FAIL: Token length mismatch');
      return errorResponse('csrf_token_invalid', 'Invalid CSRF token', 403, request);
    }

    const isValid = await crypto.subtle.timingSafeEqual(tokenBuffer, storedBuffer);
    if (!isValid) {
      console.error('[CSRF] FAIL: Token mismatch');
      return errorResponse('csrf_token_invalid', 'Invalid CSRF token', 403, request);
    }
  } catch (error) {
    console.log('[CSRF] Fallback to constant-time comparison');
    if (!constantTimeEqual(csrfToken, storedToken)) {
      console.error('[CSRF] FAIL: Token mismatch (fallback)');
      return errorResponse('csrf_token_invalid', 'Invalid CSRF token', 403, request);
    }
  }

  console.log('[CSRF] SUCCESS: Token validated');
  return null;
}
```
