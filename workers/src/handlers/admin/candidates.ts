import type { Env } from '../../types';
import { jsonResponse, errorResponse } from '../../utils/response';

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
    return errorResponse('INVALID_STATUS', 'Invalid status', 400);
  }
  
  const result = await env.DB.prepare(`
    UPDATE cross_user_match_candidates
    SET validation_status = ?,
        validated_at = ?
    WHERE person_pair_key = ?
  `).bind(body.status, Date.now().toString(), pairKey).run();
  
  if (result.meta.changes === 0) {
    return errorResponse('NOT_FOUND', 'Candidate not found', 404);
  }
  
  return jsonResponse({ 
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
  
  return jsonResponse({
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
  
  return jsonResponse({
    candidates: results,
    count: results.length,
    limit,
    offset
  });
}
