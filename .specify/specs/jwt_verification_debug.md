# BDD Spec: JWT 驗證深度除錯

## 問題分析

### 症狀
- 使用者 email 在 allowlist 中
- POST /api/user/cards 返回 403 Forbidden
- 需要追蹤完整的驗證流程

### 可能原因
1. Cookie 未正確發送
2. JWT 未儲存在 KV 或已過期
3. JWT 解析失敗
4. Email 提取失敗
5. email_allowlist 查詢失敗

---

## Scenario 1: 添加詳細日誌到 verifyOAuth

### Given
- 使用者嘗試呼叫需要認證的 API

### When
- verifyOAuth 執行驗證

### Then
- 應該記錄每個步驟的狀態
- 應該記錄失敗的具體原因

### 實作要求

```typescript
export async function verifyOAuth(
  request: Request,
  env: Env
): Promise<{ email: string } | Response> {
  console.log('[OAuth] Starting verification');
  
  // Step 1: Check Cookie
  const cookieHeader = request.headers.get('Cookie');
  console.log('[OAuth] Cookie header:', cookieHeader ? 'present' : 'missing');
  
  let sessionId: string | null = null;
  if (cookieHeader) {
    const match = cookieHeader.match(/auth_token=([^;]+)/);
    if (match) {
      sessionId = match[1];
      console.log('[OAuth] Session ID extracted:', sessionId.substring(0, 8) + '...');
    } else {
      console.warn('[OAuth] auth_token not found in cookie');
    }
  }

  // Step 2: Retrieve JWT from KV
  let token: string | null = null;
  if (sessionId) {
    token = await env.KV.get(`oauth_session:${sessionId}`);
    console.log('[OAuth] JWT from KV:', token ? 'found' : 'not found');
  }

  // Step 3: Fallback to Authorization header
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('[OAuth] Using Authorization header fallback');
    }
  }

  if (!token) {
    console.error('[OAuth] No token found');
    return errorResponse('unauthorized', 'Missing or invalid authorization', 401, request);
  }

  // Step 4: Verify JWT
  const email = await verifyOAuthToken(token, env);
  console.log('[OAuth] Email from JWT:', email || 'null');

  if (!email) {
    console.error('[OAuth] JWT verification failed');
    return errorResponse('unauthorized', 'Invalid or expired token', 401, request);
  }

  // Step 5: Check email allowlist
  const isAllowed = await checkEmailAllowed(env.DB, email);
  console.log('[OAuth] Email allowlist check:', isAllowed ? 'PASS' : 'FAIL');
  console.log('[OAuth] Email domain:', email.split('@')[1]);

  if (!isAllowed) {
    console.error('[OAuth] Email not in allowlist:', email);
    return publicErrorResponse(403, request);
  }

  console.log('[OAuth] Verification successful for:', email);
  return { email };
}
```

---

## Scenario 2: 添加日誌到 checkEmailAllowed

### Given
- 需要驗證 email 是否在 allowlist

### When
- checkEmailAllowed 執行查詢

### Then
- 應該記錄查詢參數和結果

### 實作要求

```typescript
async function checkEmailAllowed(db: D1Database, email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  console.log('[EmailCheck] Checking email:', email);
  console.log('[EmailCheck] Domain:', domain);
  
  if (!domain) {
    console.error('[EmailCheck] Invalid email format');
    return false;
  }

  const result = await db.prepare(`
    SELECT 1 FROM email_allowlist
    WHERE (type = 'domain' AND domain = ?)
       OR (type = 'email' AND domain = ?)
    LIMIT 1
  `).bind(domain, email).first<{ 1: number }>();

  console.log('[EmailCheck] Query result:', result ? 'MATCH' : 'NO MATCH');
  
  return result !== null;
}
```

---

## Scenario 3: 添加日誌到 verifyOAuthToken

### Given
- 需要驗證 JWT token

### When
- verifyOAuthToken 執行驗證

### Then
- 應該記錄驗證過程和錯誤

### 實作要求

```typescript
async function verifyOAuthToken(token: string, env: Env): Promise<string | null> {
  try {
    console.log('[JWT] Verifying token (length:', token.length, ')');
    const secret = new TextEncoder().encode(env.JWT_SECRET);

    const { payload } = await jwtVerify(token, secret, {
      issuer: 'db-card-api',
      algorithms: ['HS256']
    });

    console.log('[JWT] Token verified successfully');
    console.log('[JWT] Payload email:', payload.email);
    console.log('[JWT] Payload exp:', payload.exp);
    
    return payload.email as string;
  } catch (error) {
    console.error('[JWT] Verification failed:', error);
    if (error instanceof Error) {
      console.error('[JWT] Error message:', error.message);
      console.error('[JWT] Error name:', error.name);
    }
    return null;
  }
}
```

---

## Scenario 4: 前端添加錯誤詳情顯示

### Given
- API 返回 403 錯誤

### When
- 前端接收錯誤

### Then
- 應該顯示詳細的錯誤資訊

### 實作要求

```javascript
// 在 apiCall 函數中
if (res.status === 403) {
    console.error('[API] 403 Forbidden');
    console.error('[API] Endpoint:', endpoint);
    console.error('[API] Response:', error);
    
    // 檢查 Cookie
    console.log('[API] Cookies:', document.cookie);
}
```

---

## 驗收標準

### 日誌完整性
- ✅ 記錄 Cookie 是否存在
- ✅ 記錄 Session ID 提取結果
- ✅ 記錄 JWT 從 KV 取得結果
- ✅ 記錄 JWT 驗證結果
- ✅ 記錄 Email 提取結果
- ✅ 記錄 Email allowlist 查詢結果

### 錯誤追蹤
- ✅ 每個失敗點都有明確的錯誤訊息
- ✅ 包含足夠的上下文資訊
- ✅ 不洩漏敏感資訊（token 只顯示前 8 字元）

---

## 技術要求

- 使用 console.log 和 console.error
- 添加 [OAuth], [JWT], [EmailCheck] 前綴便於過濾
- 部署後使用 `wrangler tail` 查看即時日誌
- 生產環境可以移除或使用環境變數控制
