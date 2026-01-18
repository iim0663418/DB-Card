# BDD Spec: Admin Dashboard 安全性修正 Phase 1 & 2

## Phase 1: 立即改進（最小改動）

### Scenario 1: 改用 sessionStorage

**Given**: 當前使用 localStorage 儲存 token
**When**: 用戶關閉分頁
**Then**: Token 應自動清除

**實作要求：**
```javascript
// 替換所有 localStorage 為 sessionStorage
// admin-dashboard.html

// 儲存
sessionStorage.setItem('setup_token', token);

// 讀取
const token = sessionStorage.getItem('setup_token');

// 移除
sessionStorage.removeItem('setup_token');

// 頁面載入時自動填入
const savedToken = sessionStorage.getItem('setup_token');
if (savedToken) {
    document.getElementById('setup-token').value = savedToken;
}
```

**影響範圍：**
- verifyToken()
- handleCreateCard()
- handleDeleteCard()
- handleRevokeCard()
- editCard()
- viewCard()
- 頁面載入邏輯

---

### Scenario 2: 新增 CSP Header

**Given**: 當前無 Content Security Policy
**When**: 回傳 HTML 頁面
**Then**: 應包含嚴格的 CSP Header

**實作要求：**
```typescript
// workers/src/index.ts

// 新增 CSP middleware
function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' cdn.tailwindcss.com unpkg.com cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.tailwindcss.com; " +
    "font-src 'self' fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://db-card-api-staging.csw30454.workers.dev https://api.db-card.moda.gov.tw"
  );
  
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// 應用到所有 HTML 回應
if (response.headers.get('content-type')?.includes('text/html')) {
  response = addSecurityHeaders(response);
}
```

---

### Scenario 3: 限制 CORS

**Given**: 當前 CORS 設定為 `*`
**When**: API 請求來自不同 origin
**Then**: 應只允許特定 domain

**實作要求：**
```typescript
// workers/src/utils/response.ts

const ALLOWED_ORIGINS = [
  'http://localhost:8788',
  'http://localhost:8787',
  'https://db-card-staging.csw30454.workers.dev',
  'https://db-card.moda.gov.tw'
];

function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin');
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    };
  }
  
  // 不在白名單中，不設定 CORS headers
  return {};
}

// 更新所有 response 函數使用新的 CORS 邏輯
export function successResponse(data: any, request: Request): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request)
    }
  });
}
```

---

## Phase 2: 中期改進（架構調整）

### Scenario 4: 實作 HttpOnly Cookies

**Given**: 需要更安全的 token 儲存方式
**When**: 用戶驗證成功
**Then**: 應設定 HttpOnly Cookie

**實作要求：**

#### 4.1 後端設定 Cookie
```typescript
// workers/src/handlers/admin/auth.ts (新檔案)

export async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  const { token } = await request.json();
  
  // 驗證 token
  const expectedToken = env.SETUP_TOKEN;
  if (!timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
    return errorResponse('forbidden', '無效的授權 Token', 403);
  }
  
  // 設定 HttpOnly Cookie
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Set-Cookie': `admin_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/`
  });
  
  return new Response(
    JSON.stringify({ success: true, data: { authenticated: true } }),
    { headers }
  );
}

export async function handleAdminLogout(request: Request, env: Env): Promise<Response> {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Set-Cookie': `admin_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`
  });
  
  return new Response(
    JSON.stringify({ success: true, data: { message: '已登出' } }),
    { headers }
  );
}
```

#### 4.2 更新 Auth Middleware
```typescript
// workers/src/middleware/auth.ts

export async function verifySetupToken(request: Request, env: Env): Promise<string | null> {
  // 優先從 Cookie 讀取
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const tokenFromCookie = cookies['admin_token'];
    
    if (tokenFromCookie) {
      const expectedToken = env.SETUP_TOKEN;
      if (timingSafeEqual(Buffer.from(tokenFromCookie), Buffer.from(expectedToken))) {
        return tokenFromCookie;
      }
    }
  }
  
  // 降級支援：從 Authorization header 讀取（向下相容）
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const expectedToken = env.SETUP_TOKEN;
    if (timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
      return token;
    }
  }
  
  return null;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}
```

#### 4.3 前端更新
```javascript
// admin-dashboard.html

async function verifyToken() {
    const token = document.getElementById('setup-token').value;
    
    if (!token) {
        showNotification('請輸入 SETUP_TOKEN', 'error');
        return;
    }
    
    try {
        // 呼叫新的 login API
        const response = await fetch(`${API_BASE}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // 重要：允許 Cookie
            body: JSON.stringify({ token })
        });
        
        if (!response.ok) {
            throw new Error('驗證失敗');
        }
        
        // 不再儲存到 sessionStorage
        // Cookie 會自動管理
        
        isVerified = true;
        // 更新 UI...
        
    } catch (error) {
        showNotification('驗證失敗: ' + error.message, 'error');
    }
}

// 所有 API 請求都需要加上 credentials: 'include'
async function loadCards() {
    const response = await fetch(`${API_BASE}/api/admin/cards`, {
        credentials: 'include' // Cookie 自動附加
    });
    // ...
}
```

#### 4.4 註冊新路由
```typescript
// workers/src/index.ts

import { handleAdminLogin, handleAdminLogout } from './handlers/admin/auth';

// 新增路由
if (url.pathname === '/api/admin/login' && request.method === 'POST') {
  return handleAdminLogin(request, env);
}

if (url.pathname === '/api/admin/logout' && request.method === 'POST') {
  return handleAdminLogout(request, env);
}
```

---

### Scenario 5: Token 過期機制

**Given**: Cookie 設定 Max-Age=3600（1 小時）
**When**: Token 過期
**Then**: 前端應自動導向登入

**實作要求：**
```javascript
// admin-dashboard.html

// 統一錯誤處理
async function handleApiError(response) {
    if (response.status === 401 || response.status === 403) {
        showNotification('授權已過期，請重新登入', 'error');
        
        // 清除驗證狀態
        isVerified = false;
        
        // 顯示登入區
        document.getElementById('token-section').classList.remove('hidden');
        document.getElementById('auth-status').classList.add('hidden');
        document.getElementById('admin-nav').classList.add('hidden');
        document.getElementById('content-area').classList.add('hidden');
        
        return true; // 已處理
    }
    return false; // 未處理
}

// 在所有 API 呼叫中使用
async function loadCards() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/cards`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (await handleApiError(response)) return;
            throw new Error('載入失敗');
        }
        // ...
    } catch (error) {
        showNotification('載入失敗: ' + error.message, 'error');
    }
}
```

---

### Scenario 6: XSS 防護

**Given**: 需要防止 XSS 攻擊
**When**: 渲染用戶輸入的資料
**Then**: 應清理所有動態內容

**實作要求：**

#### 6.1 新增 DOMPurify（CDN）
```html
<!-- admin-dashboard.html -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.8/purify.min.js"></script>
```

#### 6.2 清理所有動態內容
```javascript
// admin-dashboard.html

// 安全的 HTML 渲染函數
function sanitizeHTML(html) {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
        ALLOWED_ATTR: []
    });
}

// 使用 textContent 而非 innerHTML
function renderCardsList(cards) {
    const grid = document.getElementById('cards-grid');
    
    // 使用 DOM API 而非 innerHTML
    grid.innerHTML = ''; // 清空
    
    cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'glass-surface p-6 rounded-2xl...';
        
        // 使用 textContent（自動轉義）
        const nameEl = document.createElement('h3');
        nameEl.textContent = `${card.data.name.zh} ${card.data.name.en}`;
        
        cardEl.appendChild(nameEl);
        // ...
        
        grid.appendChild(cardEl);
    });
}
```

---

## Implementation Checklist

### Phase 1
- [ ] 替換所有 localStorage 為 sessionStorage
- [ ] 新增 addSecurityHeaders() 函數
- [ ] 更新 CORS 邏輯（getCorsHeaders）
- [ ] 更新所有 response 函數使用新 CORS

### Phase 2
- [ ] 創建 handlers/admin/auth.ts
- [ ] 實作 handleAdminLogin()
- [ ] 實作 handleAdminLogout()
- [ ] 更新 verifySetupToken() 支援 Cookie
- [ ] 註冊 /api/admin/login 和 /api/admin/logout 路由
- [ ] 前端更新：verifyToken() 呼叫 login API
- [ ] 前端更新：所有 API 加上 credentials: 'include'
- [ ] 前端更新：handleApiError() 統一錯誤處理
- [ ] 新增 DOMPurify CDN
- [ ] 更新 renderCardsList() 使用安全渲染

---

## Testing Checklist

### Phase 1
- [ ] sessionStorage 正確儲存/讀取
- [ ] 關閉分頁後 token 清除
- [ ] CSP Header 正確設定
- [ ] 不允許的 origin 無法存取 API
- [ ] 允許的 origin 可正常存取

### Phase 2
- [ ] Login API 正確設定 Cookie
- [ ] Cookie 包含 HttpOnly, Secure, SameSite flags
- [ ] Cookie 1 小時後過期
- [ ] 過期後前端自動導向登入
- [ ] Logout API 正確清除 Cookie
- [ ] XSS 攻擊被 DOMPurify 阻擋
- [ ] 所有動態內容正確轉義

---

## Notes
- 保持向下相容（同時支援 Cookie 和 Authorization header）
- 逐步遷移（先實作後端，再更新前端）
- 完整測試後再部署到 production
- 更新 CSP 時注意 CDN 白名單
