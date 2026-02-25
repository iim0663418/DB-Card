# BDD Spec: Phase 1 - Session Durable Object

## Objective
Move session management from D1 to Durable Objects for 80× performance improvement

## Current Performance
```
Session operations in tap.ts:
1. Create session: INSERT INTO read_sessions RETURNING * (~400ms)
2. Increment reads: UPDATE read_sessions SET reads_used = reads_used + 1 (~400ms)

Total: 400-800ms per operation
```

## Target Performance
```
Session operations with DO:
1. Create session: In-memory Map.set() (~5ms)
2. Increment reads: In-memory counter++ (~5ms)
3. Async persist to D1: ctx.waitUntil() (non-blocking)

Total: 5-10ms (80× faster)
```

## Architecture

### Session Durable Object
```typescript
export class SessionManager {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Map<string, SessionData> = new Map();
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    if (path === '/create') {
      return this.createSession(request);
    } else if (path === '/increment') {
      return this.incrementReads(request);
    } else if (path === '/get') {
      return this.getSession(request);
    }
    
    return new Response('Not Found', { status: 404 });
  }
  
  private async createSession(request: Request) {
    const { card_uuid, max_reads } = await request.json();
    
    const session = {
      session_id: crypto.randomUUID(),
      card_uuid,
      issued_at: Date.now(),
      expires_at: Date.now() + 86400000,
      max_reads,
      reads_used: 0
    };
    
    // Store in memory (5ms)
    this.sessions.set(session.session_id, session);
    
    // Async persist to D1 (non-blocking)
    this.state.waitUntil(this.persistToD1(session));
    
    return Response.json({ success: true, data: session });
  }
  
  private async incrementReads(request: Request) {
    const { session_id } = await request.json();
    
    let session = this.sessions.get(session_id);
    
    if (!session) {
      // Fallback: Load from D1
      session = await this.loadFromD1(session_id);
      if (session) {
        this.sessions.set(session_id, session);
      }
    }
    
    if (!session) {
      return Response.json({ error: 'session_not_found' }, { status: 404 });
    }
    
    // Increment in memory (5ms)
    session.reads_used++;
    
    // Async persist
    this.state.waitUntil(this.persistToD1(session));
    
    return Response.json({ success: true, data: session });
  }
  
  private async persistToD1(session: SessionData) {
    await this.env.DB.prepare(`
      INSERT INTO read_sessions (...)
      VALUES (...)
      ON CONFLICT(session_id) DO UPDATE SET reads_used = ?
    `).bind(...).run();
  }
  
  private async loadFromD1(session_id: string) {
    const result = await this.env.DB.prepare(`
      SELECT * FROM read_sessions WHERE session_id = ?
    `).bind(session_id).first();
    
    return result as SessionData | null;
  }
}
```

## Implementation Plan

### Step 1: Create SessionManager DO
- File: `workers/src/durable-objects/session-manager.ts`
- Methods: createSession, incrementReads, getSession
- In-memory Map for fast access
- Async D1 persistence

### Step 2: Register DO in wrangler.toml
```toml
[[durable_objects.bindings]]
name = "SESSION_MANAGER"
class_name = "SessionManager"
script_name = "db-card-staging"
```

### Step 3: Update tap.ts
```typescript
// Before: Direct D1 insert
const newSession = await env.DB.prepare(`
  INSERT INTO read_sessions (...)
  RETURNING *
`).bind(...).first();

// After: Use SessionManager DO
const sessionId = env.SESSION_MANAGER.idFromName(card_uuid);
const sessionStub = env.SESSION_MANAGER.get(sessionId);

const response = await sessionStub.fetch('https://do/create', {
  method: 'POST',
  body: JSON.stringify({ card_uuid, max_reads })
});

const { data: newSession } = await response.json();
```

### Step 4: Update read.ts
```typescript
// Before: Direct D1 query + update
const session = await env.DB.prepare(`
  SELECT * FROM read_sessions WHERE session_id = ?
`).first();

await env.DB.prepare(`
  UPDATE read_sessions SET reads_used = reads_used + 1
  WHERE session_id = ?
`).run();

// After: Use SessionManager DO
const sessionId = env.SESSION_MANAGER.idFromName(session_id);
const sessionStub = env.SESSION_MANAGER.get(sessionId);

const response = await sessionStub.fetch('https://do/increment', {
  method: 'POST',
  body: JSON.stringify({ session_id })
});

const { data: session } = await response.json();
```

## Acceptance Criteria
- ✅ Session creation: < 10ms
- ✅ Read increment: < 10ms
- ✅ D1 persistence: Async, non-blocking
- ✅ Fallback to D1 if DO unavailable
- ✅ No data loss (D1 is source of truth)
- ✅ TypeScript zero errors
- ✅ Backward compatible

## Testing
1. Create session via DO: < 10ms
2. Increment reads via DO: < 10ms
3. Verify D1 persistence: Check DB after 1 second
4. DO restart: Load from D1 successfully
5. Concurrent requests: No race conditions

## Rollback Plan
- Revert to direct D1 queries
- DO data is already in D1
- Zero data loss

## Migration Strategy
- Phase 1a: Deploy DO code (no usage yet)
- Phase 1b: Enable for 10% of traffic
- Phase 1c: Monitor for 24 hours
- Phase 1d: Gradually increase to 100%

## Risks & Mitigation
- **Risk**: DO cold start latency
  - **Mitigation**: Use idFromName() for consistent routing
  
- **Risk**: DO memory limits
  - **Mitigation**: Expire old sessions from memory after 1 hour
  
- **Risk**: D1 sync lag
  - **Mitigation**: Always read from DO first, fallback to D1

## Performance Impact
- Session create: 400ms → 5ms (80× faster)
- Read increment: 400ms → 5ms (80× faster)
- Total tap latency: 1.26s → 0.86s (-32%)
- Combined with Phase 2: 1.8s → 0.86s (-52%)
