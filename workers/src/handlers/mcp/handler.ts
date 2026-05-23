// MCP JSON-RPC 2.0 Handler
// POST /mcp — token validation + method dispatch

import { jwtVerify } from 'jose';
import type { Env } from '../../types';
import { mcpUnauthorizedResponse } from './oauth-metadata';
import { isUserDisabled } from '../../utils/user-security';
import { anonymizeIP } from '../../utils/audit';
import {
  TOOL_DEFINITIONS,
  toolListReceivedCards,
  toolSearchReceivedCards,
  toolGetReceivedCard,
  toolSaveReceivedCard,
  toolUpdateReceivedCard,
  toolDeleteReceivedCard,
  toolExportVCard,
} from './tools';

// ── JSON-RPC helpers ──────────────────────────────────────────────────────────

function rpcResult(id: unknown, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function rpcError(id: unknown, code: number, message: string): Response {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

// ── Token validation ──────────────────────────────────────────────────────────

interface TokenPayload {
  email: string;
  scope: string;
}

async function validateToken(
  authHeader: string,
  request: Request,
  env: Env
): Promise<TokenPayload | null> {
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const resourceUri = new URL(request.url).origin;
    const { payload } = await jwtVerify(token, secret, {
      issuer: resourceUri,
      audience: resourceUri,
      algorithms: ['HS256'],
    });

    const email = payload['email'] as string | undefined;
    const scope = payload['scope'] as string | undefined;
    if (!email || !scope) return null;

    // Check email allowlist
    const domain = email.split('@')[1];
    const allowed = await env.DB.prepare(`
      SELECT 1 FROM email_allowlist
      WHERE (type = 'domain' AND domain = ?)
         OR (type = 'email' AND domain = ?)
      LIMIT 1
    `).bind(domain, email).first();

    if (!allowed) return null;

    // Check disabled accounts (RISC events, etc.)
    if (await isUserDisabled(env.DB, email)) return null;

    return { email, scope };
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function handleMcp(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  // Require Authorization header
  const authHeader = request.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return mcpUnauthorizedResponse(request, env);
  }

  // Parse JSON-RPC body
  let body: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return rpcError(null, -32700, 'Parse error');
  }

  const { id = null, method, params = {} } = body;

  // Validate token (resource URI derived from request origin)
  const tokenPayload = await validateToken(authHeader, request, env);
  if (!tokenPayload) {
    return mcpUnauthorizedResponse(request, env);
  }

  const { email, scope } = tokenPayload;

  // ── Method dispatch ───────────────────────────────────────────────────────

  if (method === 'initialize') {
    return rpcResult(id, {
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'db-card-mcp', version: '0.1.0' },
    });
  }

  if (method === 'tools/list') {
    return rpcResult(id, { tools: TOOL_DEFINITIONS });
  }

  if (method === 'tools/call') {
    const toolName = params['name'] as string | undefined;
    const args = (params['arguments'] ?? {}) as Record<string, unknown>;

    if (!toolName) {
      return rpcError(id, -32602, 'Invalid params: missing name');
    }

    const hasReadScope = scope.split(' ').includes('received_cards:read');
    const hasWriteScope = scope.split(' ').includes('received_cards:write');

    const ip = anonymizeIP(request.headers.get('CF-Connecting-IP') || '0.0.0.0');
    const logToolCall = (tool: string, success: boolean, reason?: string) => {
      ctx.waitUntil(env.DB.prepare(`
        INSERT INTO audit_logs (event_type, user_agent, ip_address, timestamp, details)
        VALUES ('mcp_tool_call', ?, ?, ?, ?)
      `).bind(
        request.headers.get('User-Agent') || 'mcp-client',
        ip, Date.now(),
        JSON.stringify({ tool, email, success, ...(reason && { reason }) })
      ).run().catch(() => {}));
    };

    const needsRead = ['list_received_cards', 'search_received_cards', 'get_received_card', 'export_vcard'];
    const needsWrite = ['save_received_card', 'update_received_card', 'delete_received_card'];

    if (needsRead.includes(toolName) && !hasReadScope) {
      logToolCall(toolName, false, 'insufficient_scope');
      return rpcError(id, -32600, 'Insufficient scope');
    }
    if (needsWrite.includes(toolName) && !hasWriteScope) {
      logToolCall(toolName, false, 'insufficient_scope');
      return rpcError(id, -32600, 'Insufficient scope');
    }

    try {
      let result: unknown;
      switch (toolName) {
        case 'list_received_cards':
          result = await toolListReceivedCards(args as Parameters<typeof toolListReceivedCards>[0], email, env);
          break;
        case 'search_received_cards':
          result = await toolSearchReceivedCards(args as Parameters<typeof toolSearchReceivedCards>[0], email, env);
          break;
        case 'get_received_card':
          result = await toolGetReceivedCard(args as Parameters<typeof toolGetReceivedCard>[0], email, env);
          break;
        case 'save_received_card':
          result = await toolSaveReceivedCard(args as Parameters<typeof toolSaveReceivedCard>[0], email, env);
          break;
        case 'update_received_card':
          result = await toolUpdateReceivedCard(args as Parameters<typeof toolUpdateReceivedCard>[0], email, env);
          break;
        case 'delete_received_card':
          result = await toolDeleteReceivedCard(args as Parameters<typeof toolDeleteReceivedCard>[0], email, env);
          break;
        case 'export_vcard':
          result = await toolExportVCard(args as Parameters<typeof toolExportVCard>[0], email, env);
          break;
        default:
          logToolCall(toolName, false, 'unknown_tool');
          return rpcError(id, -32602, `Unknown tool: ${toolName}`);
      }
      logToolCall(toolName, true);
      return rpcResult(id, result);
    } catch (err) {
      console.error('[MCP tools/call error]', err);
      logToolCall(toolName, false);
      return rpcError(id, -32603, 'Internal error');
    }
  }

  return rpcError(id, -32601, 'Method not found');
}
