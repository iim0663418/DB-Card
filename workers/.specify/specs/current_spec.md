# BDD Spec: Fix MCP audit logging reliability + coverage

## Problem
1. Audit log writes use `.run().catch(() => {})` — fire-and-forget without `ctx.waitUntil`. Workers may terminate before D1 write completes.
2. Callback has 3 unlogged failure paths: Google error, missing code, catch block.

## Impacted Files
- `src/index.ts` — pass `ctx` to MCP handlers
- `src/handlers/mcp/handler.ts` — accept `ctx`, use `ctx.waitUntil` for audit
- `src/handlers/mcp/oauth-register.ts` — accept `ctx`, use `ctx.waitUntil`
- `src/handlers/mcp/oauth-token.ts` — accept `ctx`, use `ctx.waitUntil`
- `src/handlers/mcp/oauth-authorize.ts` — accept `ctx`, use `ctx.waitUntil`, add 3 missing log paths

## Implementation

### Step 1: Pass ctx from index.ts
Change all 5 MCP handler calls to pass `ctx`:
```
handleMcpRegister(request, env, ctx)
handleMcpAuthorize(request, env)        // no change (GET, no audit on initiate)
handleMcpCallback(request, env, ctx)
handleMcpToken(request, env, ctx)
handleMcp(request, env, ctx)
```
Note: handleMcpAuthorize (initiate) doesn't need ctx — it has no audit writes. handleMcpCallback does.

### Step 2: Update handler signatures
Each handler adds `ctx: ExecutionContext` parameter.

### Step 3: Replace .run().catch() with ctx.waitUntil
All audit log writes change from:
```typescript
env.DB.prepare(...).bind(...).run().catch(() => {});
```
to:
```typescript
ctx.waitUntil(env.DB.prepare(...).bind(...).run().catch(() => {}));
```
This ensures the D1 write completes even after the response is sent.

### Step 4: Add 3 missing callback audit logs (oauth-authorize.ts)
In handleMcpCallback, log before redirect for:
1. Google returned error: `mcp_auth_failed` with `{ reason: 'google_error', error: <google error> }`
2. Missing google code: `mcp_auth_failed` with `{ reason: 'missing_code' }`
3. Catch block: `mcp_auth_failed` with `{ reason: 'server_error', error: <message> }`

## Validation
- `npx tsc --noEmit`
