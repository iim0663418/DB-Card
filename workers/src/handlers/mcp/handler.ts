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

// ── Constants ─────────────────────────────────────────────────────────────────

/** @internal */
export const SERVER_INFO = { name: 'db-card-mcp', version: '5.2.0' } as const;

const SUPPORTED_PROTOCOLS = ['2026-07-28', '2025-06-18'] as const;
type SupportedProtocol = (typeof SUPPORTED_PROTOCOLS)[number];

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

/** @internal */
export function rpcResultModern(id: unknown, result: Record<string, unknown>): Response {
  return new Response(JSON.stringify({
    jsonrpc: '2.0',
    id,
    result: {
      resultType: 'complete',
      ...result,
      _meta: { 'io.modelcontextprotocol/serverInfo': SERVER_INFO },
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json', 'MCP-Protocol-Version': '2026-07-28' } });
}

// ── Protocol version detection ────────────────────────────────────────────────

/** @internal */
export function getClientProtocol(params: Record<string, unknown>): SupportedProtocol | null {
  const meta = params['_meta'] as Record<string, unknown> | undefined;
  if (!meta) return '2025-06-18';

  const version = meta['io.modelcontextprotocol/protocolVersion'];
  if (version === undefined) return '2025-06-18';

  if (version === '2026-07-28') return '2026-07-28';
  if (version === '2025-06-18') return '2025-06-18';

  return null;
}

// ── Header validation (MCP 2026-07-28 strict mode) ───────────────────────────

/** @internal */
export function validateMcpHeaders(
  mcpMethodHeader: string | null,
  mcpNameHeader: string | null,
  bodyMethod: string | undefined,
  bodyToolName: string | undefined,
  protocol: string | null,
  strictMode: boolean
): { valid: boolean; errorMessage?: string } {
  if (!strictMode) return { valid: true };
  if (protocol !== '2026-07-28') return { valid: true };

  if (!mcpMethodHeader) {
    return { valid: false, errorMessage: 'Missing required Mcp-Method header' };
  }
  if (mcpMethodHeader !== bodyMethod) {
    return { valid: false, errorMessage: 'Header mismatch: Mcp-Method does not match body method' };
  }
  if (bodyMethod === 'tools/call' && mcpNameHeader && bodyToolName && mcpNameHeader !== bodyToolName) {
    return { valid: false, errorMessage: 'Header mismatch: Mcp-Name does not match tool name' };
  }
  return { valid: true };
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

  const { id, method, params = {} } = body;

  // Validate token (resource URI derived from request origin)
  const tokenPayload = await validateToken(authHeader, request, env);
  if (!tokenPayload) {
    return mcpUnauthorizedResponse(request, env);
  }

  const { email, scope } = tokenPayload;

  // ── Notification handling (JSON-RPC notification has no id) ────────────────
  if (id === undefined || id === null) {
    return new Response(null, { status: 204 });
  }

  // ── Header validation (MCP 2026-07-28 strict mode) ────────────────────────
  const headerCheck = validateMcpHeaders(
    request.headers.get('Mcp-Method'),
    request.headers.get('Mcp-Name'),
    method,
    params['name'] as string | undefined,
    getClientProtocol(params),
    !!env.MCP_STRICT_HEADERS
  );
  if (!headerCheck.valid) {
    return rpcError(id, -32020, headerCheck.errorMessage!);
  }

  // ── Method dispatch ───────────────────────────────────────────────────────

  if (method === 'server/discover') {
    return rpcResultModern(id, {
      supportedVersions: ['2026-07-28', '2025-06-18'],
      capabilities: { tools: {} },
      instructions: 'DB-Card MCP server: manage received business cards — list, search, get, save, update, delete, and export as vCard.',
    });
  }

  if (method === 'initialize') {
    return rpcResultModern(id, {
      protocolVersion: '2026-07-28',
      capabilities: { tools: {} },
    });
  }

  if (method === 'tools/list') {
    const protocol = getClientProtocol(params);
    if (protocol === null) return rpcError(id, -32022, 'Unsupported protocol version');
    if (protocol === '2026-07-28') {
      return rpcResultModern(id, { tools: TOOL_DEFINITIONS, ttlMs: 3600000, cacheScope: 'public' });
    }
    return rpcResult(id, { tools: TOOL_DEFINITIONS });
  }

  if (method === 'tools/call') {
    const protocol = getClientProtocol(params);
    if (protocol === null) return rpcError(id, -32022, 'Unsupported protocol version');

    const toolName = params['name'] as string | undefined;
    const args = (params['arguments'] ?? {}) as Record<string, unknown>;

    if (!toolName) {
      return rpcError(id, -32602, 'Invalid params: missing name');
    }

    const hasReadScope = scope.split(' ').includes('received_cards:read');
    const hasWriteScope = scope.split(' ').includes('received_cards:write');

    const ip = anonymizeIP(request.headers.get('CF-Connecting-IP') || '0.0.0.0');
    const mcpMethod = request.headers.get('Mcp-Method') || undefined;
    const mcpName = request.headers.get('Mcp-Name') || undefined;
    const logToolCall = (tool: string, success: boolean, reason?: string) => {
      ctx.waitUntil(env.DB.prepare(`
        INSERT INTO audit_logs (event_type, user_agent, ip_address, timestamp, details)
        VALUES ('mcp_tool_call', ?, ?, ?, ?)
      `).bind(
        request.headers.get('User-Agent') || 'mcp-client',
        ip, Date.now(),
        JSON.stringify({ tool, email, success, mcpMethod, mcpName, ...(reason && { reason }) })
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

      if (protocol === '2026-07-28') {
        return rpcResultModern(id, result as Record<string, unknown>);
      }
      return rpcResult(id, result);
    } catch (err) {
      console.error('[MCP tools/call error]', err);
      logToolCall(toolName, false);
      return rpcError(id, -32603, 'Internal error');
    }
  }

  return rpcError(id, -32601, 'Method not found');
}
