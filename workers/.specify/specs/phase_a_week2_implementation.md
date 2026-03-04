# Phase A Week 2: Validation API Implementation

## Objective
Implement admin APIs to manually validate candidate matches and calculate precision metrics.

## Files to Create

### 1. workers/src/handlers/admin/candidates.ts

```typescript
import type { Env } from '../../types';
import { successResponse, errorResponse } from '../../utils/response';

/**
 * Validate a candidate match (confirmed/rejected)
 * PUT /api/admin/candidates/:pairKey
 */
export async function handleValidateCandidate(
  request: Request,
  env: Env,
  pairKey: string
): Promise<Response> {
  
  const body = await request.json() as { status: 'confirmed' | 'rejected' };
  
  if (!body.status || !['confirmed', 'rejected'].includes(body.status)) {
    return errorResponse('Invalid status', 400);
  }
  
  const result = await env.DB.prepare(`
    UPDATE cross_user_match_candidates
    SET validation_status = ?,
        validated_at = ?
    WHERE person_pair_key = ?
  `).bind(body.status, Date.now(), pairKey).run();
  
  if (result.meta.changes === 0) {
    return errorResponse('Candidate not found', 404);
  }
  
  return successResponse({ 
    message: 'Candidate validated',
    pair_key: pairKey,
    status: body.status
  });
}

/**
 * Get precision statistics
 * GET /api/admin/candidates/precision
 */
export async function handleGetPrecision(env: Env): Promise<Response> {
  
  const stats = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN validation_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN validation_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN validation_status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM cross_user_match_candidates
  `).first();
  
  const total = (stats as any).total || 0;
  const pending = (stats as any).pending || 0;
  const confirmed = (stats as any).confirmed || 0;
  const rejected = (stats as any).rejected || 0;
  
  const validated = confirmed + rejected;
  const precision = validated > 0 ? (confirmed / validated) * 100 : 0;
  
  return successResponse({
    total,
    pending,
    confirmed,
    rejected,
    validated,
    precision: Math.round(precision * 100) / 100,
    meets_target: precision >= 90
  });
}

/**
 * List all candidates (with pagination)
 * GET /api/admin/candidates
 */
export async function handleListCandidates(
  request: Request,
  env: Env
): Promise<Response> {
  
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'pending';
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  
  const { results } = await env.DB.prepare(`
    SELECT 
      person_pair_key,
      person_a_uuid,
      person_b_uuid,
      match_confidence,
      match_method,
      match_evidence,
      validation_status,
      created_at,
      validated_at
    FROM cross_user_match_candidates
    WHERE validation_status = ?
    ORDER BY match_confidence DESC, created_at DESC
    LIMIT ? OFFSET ?
  `).bind(status, limit, offset).all();
  
  return successResponse({
    candidates: results,
    count: results.length,
    limit,
    offset
  });
}
```

## Integration

### 2. Modify workers/src/index.ts

Add routes:

```typescript
import { handleValidateCandidate, handleGetPrecision, handleListCandidates } from './handlers/admin/candidates';

// In fetch() handler, add:
if (pathname === '/api/admin/candidates/precision' && method === 'GET') {
  return await handleGetPrecision(env);
}

if (pathname === '/api/admin/candidates' && method === 'GET') {
  return await handleListCandidates(request, env);
}

if (pathname.startsWith('/api/admin/candidates/') && method === 'PUT') {
  const pairKey = pathname.split('/').pop();
  if (!pairKey) return errorResponse('Invalid pair key', 400);
  return await handleValidateCandidate(request, env, pairKey);
}
```

## Acceptance Criteria
- [ ] File `src/handlers/admin/candidates.ts` created
- [ ] `handleValidateCandidate()` implemented (PUT)
- [ ] `handleGetPrecision()` implemented (GET)
- [ ] `handleListCandidates()` implemented (GET)
- [ ] Integrated into `src/index.ts` routes
- [ ] TypeScript compiles with zero errors
- [ ] Precision calculation: confirmed / (confirmed + rejected)

## Testing
After implementation:
1. Run `npm run typecheck` - should pass
2. Deploy to staging
3. Manually validate 50+ candidates
4. Check precision >= 90%
5. If precision < 90%, adjust confidence threshold or matching logic

## Manual Validation Process
1. GET /api/admin/candidates?status=pending&limit=50
2. For each candidate:
   - Review person_a_uuid and person_b_uuid details
   - Decide: confirmed (same person) or rejected (different person)
   - PUT /api/admin/candidates/{pair_key} with status
3. GET /api/admin/candidates/precision
4. If precision >= 90%, proceed to Phase B
