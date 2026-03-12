/**
 * Smart Search API - Semantic + Keyword Search
 * GET /api/user/received-cards/search?q={query}&page=1&limit=20
 * 
 * Phase 1 Refactoring: HTTP Adapter pattern
 * - This handler is now a thin HTTP adapter (56 lines)
 * - Business logic moved to SearchAgent class
 */

import { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { SearchAgent } from '../../../agents/search/agent';

/**
 * Main search handler (HTTP Adapter)
 */
export async function searchCards(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  try {
    // 1. Auth
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) return userResult;
    const user = userResult;

    // 2. Parse HTTP request
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Query parameter "q" is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));

    // 3. Delegate to SearchAgent (business logic)
    const agent = new SearchAgent(env, ctx);
    const result = await agent.run({
      query,
      userEmail: user.email,
      pagination: { page, limit }
    });

    // 4. Format HTTP response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ error: 'Failed to search cards' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
