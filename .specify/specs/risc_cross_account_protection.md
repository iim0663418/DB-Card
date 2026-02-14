# BDD Spec: RISC Cross-Account Protection (Architecture Fixed)
**Priority**: P2 (Compliance Requirement)
**Estimated Time**: 5 hours (增加 middleware 整合)

## Architecture Context
- **Current**: Sessions stored in KV (oauth_session:*), user info in D1
- **Challenge**: is_disabled in DB won't block active KV sessions
- **Solution**: Auth middleware checks DB is_disabled on every request

## Scenario 1: Receive Security Event Token
- **Given**: Google sends RISC security event (account_disabled)
- **When**: POST /api/risc/events with JWT in request body
- **Then**: 
  * Verify JWT signature using Google JWKS
  * Validate iss, aud, iat, exp claims
  * Extract subject (user email) and event type
  * Return 202 Accepted

## Scenario 2: Handle Account Disabled Event
- **Given**: Valid security event token with type "account_disabled"
- **When**: Event is processed
- **Then**: 
  1. Find user by email in D1
  2. Set is_disabled = 1
  3. Delete all KV sessions (oauth_session:{email}:*)
  4. Log event to risc_events table
  5. Return 202 Accepted

## Scenario 3: Middleware Blocks Disabled User
- **Given**: User with is_disabled = 1 has valid JWT cookie
- **When**: Any authenticated API request (e.g., GET /api/user/cards)
- **Then**: 
  1. Auth middleware validates JWT
  2. Extracts email from JWT
  3. Queries D1: SELECT is_disabled FROM users WHERE email = ?
  4. If is_disabled = 1: return 403 Forbidden + clear cookie
  5. If is_disabled = 0: proceed normally

## Scenario 4: Handle Sessions Revoked Event
- **Given**: Valid security event token with type "sessions_revoked"
- **When**: Event is processed
- **Then**: 
  1. Find user by email
  2. Delete all KV sessions (oauth_session:{email}:*)
  3. Log event to risc_events table
  4. Return 202 Accepted (do NOT set is_disabled)

## Scenario 5: Reject Invalid Token
- **Given**: POST /api/risc/events with invalid/expired JWT
- **When**: Token verification fails
- **Then**: 
  * Return 401 Unauthorized
  * Log failed attempt with IP address

## Technical Requirements

### 1. Migration (0022_risc_events.sql)
```sql
CREATE TABLE risc_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  issuer TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  processed_at INTEGER,
  status TEXT DEFAULT 'pending'
);
CREATE INDEX idx_risc_subject ON risc_events(subject);

ALTER TABLE users ADD COLUMN is_disabled INTEGER DEFAULT 0;
CREATE INDEX idx_users_email_disabled ON users(email, is_disabled);
```

### 2. Auth Middleware Enhancement (auth.ts)
```typescript
export async function requireAuth(request: Request, env: Env): Promise<User | Response> {
  // Existing JWT validation...
  const user = verifyJWT(token, env.JWT_SECRET);
  
  // NEW: Check is_disabled in DB
  const dbUser = await env.DB.prepare(
    'SELECT is_disabled FROM users WHERE email = ?'
  ).bind(user.email).first();
  
  if (dbUser?.is_disabled === 1) {
    return new Response('Account disabled', {
      status: 403,
      headers: {
        'Set-Cookie': 'session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax'
      }
    });
  }
  
  return user;
}
```

### 3. RISC Handler (risc.ts)
```typescript
export async function handleRISCEvent(request: Request, env: Env): Promise<Response> {
  const token = await request.text();
  const payload = await verifySecurityEventToken(token, env);
  
  const eventType = Object.keys(payload.events)[0];
  const subject = payload.sub; // user email
  
  if (eventType.includes('account-disabled')) {
    await env.DB.prepare('UPDATE users SET is_disabled = 1 WHERE email = ?')
      .bind(subject).run();
    await deleteAllUserSessions(env.CACHE, subject);
  } else if (eventType.includes('sessions-revoked')) {
    await deleteAllUserSessions(env.CACHE, subject);
  }
  
  await logRISCEvent(env.DB, eventType, subject, payload.iss);
  return new Response(null, { status: 202 });
}

async function deleteAllUserSessions(kv: KVNamespace, email: string) {
  const list = await kv.list({ prefix: `oauth_session:${email}:` });
  await Promise.all(list.keys.map(k => kv.delete(k.name)));
}
```

### 4. Event Types to Support
- `https://schemas.openid.net/secevent/risc/event-type/account-disabled`
- `https://schemas.openid.net/secevent/risc/event-type/sessions-revoked`

## Acceptance Criteria
- [ ] Migration 0022 creates risc_events table + is_disabled column + indexes
- [ ] POST /api/risc/events endpoint accepts JWT
- [ ] JWT signature verification works (reuse oauth.ts JWKS logic)
- [ ] account_disabled event sets is_disabled=1 + deletes KV sessions
- [ ] sessions_revoked event deletes KV sessions only
- [ ] Auth middleware checks is_disabled on every request
- [ ] Disabled users get 403 + cookie cleared
- [ ] Invalid tokens return 401
- [ ] Events logged to risc_events table
- [ ] TypeScript compiles without errors

## Files to Create/Modify
- `workers/migrations/0022_risc_events.sql` (new)
- `workers/src/handlers/risc.ts` (new)
- `workers/src/middleware/auth.ts` (enhance requireAuth)
- `workers/src/index.ts` (add /api/risc/events route)

## Google Cloud Configuration (Manual Steps)
After implementation:
1. Enable RISC API in Google Cloud Console
2. Create service account for RISC
3. Register endpoint: `https://your-domain/api/risc/events`
4. Configure event types: account_disabled, sessions_revoked
5. Test with Google's RISC simulator

## References
- RISC Spec: https://openid.net/specs/openid-risc-profile-1_0.html
- Google RISC: https://developers.google.com/identity/protocols/risc
- Security Event Token: https://datatracker.ietf.org/doc/html/rfc8417
