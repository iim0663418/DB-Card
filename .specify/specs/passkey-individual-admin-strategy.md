# BDD Spec: Passkey Individual Admin Strategy

## Feature
個別管理員 Passkey 策略 - SETUP_TOKEN 登入需要 Email

## Background
根據 Passkey 最佳實踐（SupportDevs, Tailscale），Passkey 應該是「附加」而非「替換」。
每個管理員應該能獨立決定是否啟用 Passkey，不影響其他管理員。

## Scenario 1: Admin with Passkey enabled cannot use SETUP_TOKEN
**Given**:
- Admin user exists with email "admin-with-passkey@example.com"
- passkey_enabled = 1 for this admin
- Valid SETUP_TOKEN

**When**:
- POST /api/admin/login
- Body: { "email": "admin-with-passkey@example.com", "token": "{SETUP_TOKEN}" }

**Then**:
- Response status: 403 Forbidden
- Response body: { "success": false, "error": "此管理員已啟用 Passkey，請使用 Passkey 登入" }
- Console log: "SETUP_TOKEN rejected: passkey_enabled=1 for admin-with-passkey@example.com"
- No cookie set

## Scenario 2: Admin without Passkey can use SETUP_TOKEN
**Given**:
- Admin user exists with email "admin-no-passkey@example.com"
- passkey_enabled = 0 for this admin
- Valid SETUP_TOKEN

**When**:
- POST /api/admin/login
- Body: { "email": "admin-no-passkey@example.com", "token": "{SETUP_TOKEN}" }

**Then**:
- Response status: 200 OK
- Response body: { "success": true, "data": { "authenticated": true } }
- HttpOnly cookie set: admin_token={SETUP_TOKEN}
- No console warning

## Scenario 3: Non-existent email with valid SETUP_TOKEN
**Given**:
- Email "nonexistent@example.com" does not exist in database
- Valid SETUP_TOKEN

**When**:
- POST /api/admin/login
- Body: { "email": "nonexistent@example.com", "token": "{SETUP_TOKEN}" }

**Then**:
- Response status: 403 Forbidden
- Response body: { "success": false, "error": "Invalid token" }
- No cookie set
- No information leak about email existence

## Scenario 4: Missing email field
**Given**:
- Valid SETUP_TOKEN

**When**:
- POST /api/admin/login
- Body: { "token": "{SETUP_TOKEN}" }

**Then**:
- Response status: 400 Bad Request
- Response body: { "success": false, "error": "Email is required" }
- No cookie set

## Scenario 5: Invalid SETUP_TOKEN with valid email
**Given**:
- Admin user exists with email "admin@example.com"
- Invalid SETUP_TOKEN

**When**:
- POST /api/admin/login
- Body: { "email": "admin@example.com", "token": "invalid-token" }

**Then**:
- Response status: 403 Forbidden
- Response body: { "success": false, "error": "Invalid token" }
- No cookie set

## Implementation Requirements

### Backend Changes

#### 1. Update types.ts
```typescript
export interface AdminLoginRequest {
  email: string;      // NEW: Required field
  token: string;
}
```

#### 2. Update handlers/admin/auth.ts - handleAdminLogin
```typescript
// 1. Validate request body
const { email, token } = await request.json();
if (!email || !token) {
  return adminErrorResponse('Email and token are required', 400, request);
}

// 2. Timing-safe comparison (unchanged)
const isValid = await timingSafeEqual(token, expectedToken);
if (!isValid) {
  return adminErrorResponse('Invalid token', 403, request);
}

// 3. Check if THIS admin has Passkey enabled
const admin = await env.DB.prepare(
  'SELECT passkey_enabled FROM admin_users WHERE username = ? AND is_active = 1'
).bind(email).first<{ passkey_enabled: number }>();

if (!admin) {
  // Don't leak email existence
  return adminErrorResponse('Invalid token', 403, request);
}

if (admin.passkey_enabled === 1) {
  console.warn(`SETUP_TOKEN rejected: passkey_enabled=1 for ${email}`);
  return adminErrorResponse('此管理員已啟用 Passkey，請使用 Passkey 登入', 403, request);
}

// 4. Set HttpOnly Cookie (unchanged)
```

### Frontend Changes

#### 1. Update admin-dashboard.html - Token Login Section
```html
<div id="token-login" class="flex flex-col gap-3 w-full lg:w-auto">
  <!-- NEW: Email input -->
  <input 
    id="admin-email" 
    type="email" 
    placeholder="管理員 Email"
    class="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
    required
  />
  
  <!-- Existing: SETUP_TOKEN input -->
  <input 
    id="setup-token" 
    type="password" 
    placeholder="輸入 SETUP_TOKEN"
    class="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
    required
  />
  
  <button id="verify-btn" onclick="verifyToken()">驗證權限</button>
</div>
```

#### 2. Update JavaScript - verifyToken function
```javascript
async function verifyToken() {
  const email = document.getElementById('admin-email').value.trim();
  const token = document.getElementById('setup-token').value.trim();
  
  if (!email || !token) {
    alert('請輸入 Email 和 SETUP_TOKEN');
    return;
  }
  
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, token })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Login success
      document.getElementById('token-section').classList.add('hidden');
      document.getElementById('auth-status').classList.remove('hidden');
      loadCards();
    } else {
      alert(data.error);
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('登入失敗，請稍後再試');
  }
}
```

## Testing Checklist

- [ ] Scenario 1: Admin with Passkey rejected
- [ ] Scenario 2: Admin without Passkey accepted
- [ ] Scenario 3: Non-existent email rejected (no leak)
- [ ] Scenario 4: Missing email returns 400
- [ ] Scenario 5: Invalid token rejected
- [ ] Frontend: Email input field visible
- [ ] Frontend: Form validation works
- [ ] Frontend: Error messages display correctly
- [ ] TypeScript compilation passes
- [ ] No breaking changes to existing functionality

## Rollout Plan

### Phase 1: Backend Implementation (30 min)
1. Update types.ts
2. Update handlers/admin/auth.ts
3. TypeScript compilation check

### Phase 2: Frontend Implementation (20 min)
1. Update admin-dashboard.html
2. Update JavaScript functions
3. Test UI/UX

### Phase 3: Testing & Verification (20 min)
1. Test all 5 scenarios
2. Verify error messages
3. Verify no regression

**Total Estimated Time**: 70 minutes

## Success Criteria

1. ✅ Admin A (Passkey enabled) cannot use SETUP_TOKEN
2. ✅ Admin B (Passkey disabled) can use SETUP_TOKEN
3. ✅ Non-existent email does not leak information
4. ✅ Missing email returns clear error
5. ✅ Frontend UI is intuitive and clear
6. ✅ No breaking changes to existing features
7. ✅ TypeScript compilation passes
8. ✅ All tests pass

## Documentation Updates

- [ ] Update README.md - Admin login section
- [ ] Update .specify/memory/progress.md
- [ ] Update .specify/memory/knowledge_graph.mem
- [ ] Create migration guide (if needed)
