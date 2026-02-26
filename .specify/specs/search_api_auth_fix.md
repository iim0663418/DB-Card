# BDD Spec: Search API Authentication Fix

## Context
- `/api/user/received-cards/search` 返回 401 Unauthorized
- 根因：index.ts 中手動解析 JWT 的邏輯不完整（未驗證簽名）
- 其他 user API（如 handleListCards）使用 `verifyOAuth(request, env)` 正確驗證

## Scenario: Search API Should Use Standard OAuth Verification

**Given**: 使用者已登入（有效的 session cookie）
**When**: 呼叫 `GET /api/user/received-cards/search?q=test`
**Then**: 
- 使用 `verifyOAuth(request, env)` 驗證身份
- 返回 200 OK 和搜尋結果
- 不應返回 401 Unauthorized

## Technical Requirements

### 1. Modify index.ts
- 移除手動 JWT 解析邏輯（line 378-391）
- 改用 `verifyOAuth(request, env)` 驗證
- 將 userEmail 傳遞給 searchCards()

### 2. Modify search.ts
- 修改 `searchCards()` 函數簽名
- 接受 `request: Request` 和 `env: Env` 參數
- 內部呼叫 `verifyOAuth()` 取得 userEmail
- 移除 SimpleContext 類型（不再需要）

### 3. Code Pattern (參考 crud.ts)
```typescript
// index.ts
if (url.pathname === '/api/user/received-cards/search' && request.method === 'GET') {
  return addMinimalSecurityHeaders(await searchCards(request, env));
}

// search.ts
export async function searchCards(request: Request, env: Env): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;
  
  const userEmail = user.email;
  // ... rest of logic
}
```

## Acceptance Criteria
1. ✅ TypeScript 編譯通過（零錯誤）
2. ✅ 手動測試：登入後搜尋返回 200 OK
3. ✅ 手動測試：未登入搜尋返回 401
4. ✅ Console 無 401 錯誤

## Files to Modify
- `/Users/shengfanwu/GitHub/DB-Card/workers/src/index.ts` (line 370-403)
- `/Users/shengfanwu/GitHub/DB-Card/workers/src/handlers/user/received-cards/search.ts` (line 1-50, 242-250)

## Estimated Time
- 實作: 10 分鐘
- 測試: 5 分鐘
