/**
 * MCP Protocol 2026-07-28 Compatibility Tests
 * Unit tests for protocol detection and response helpers.
 */

import { describe, it, expect } from 'vitest';
import { getClientProtocol, rpcResultModern, SERVER_INFO, validateMcpHeaders } from '../src/handlers/mcp/handler';

describe('MCP Protocol Compatibility', () => {
  describe('getClientProtocol', () => {
    it('returns "2026-07-28" when _meta contains protocolVersion 2026-07-28', () => {
      const params = {
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientInfo': { name: 'claude-desktop', version: '4.0' },
        },
        name: 'list_received_cards',
        arguments: {},
      };
      expect(getClientProtocol(params)).toBe('2026-07-28');
    });

    it('returns "2025-06-18" when no _meta is present (legacy client)', () => {
      const params = { name: 'list_received_cards', arguments: {} };
      expect(getClientProtocol(params)).toBe('2025-06-18');
    });

    it('returns "2025-06-18" when _meta exists but no protocolVersion key', () => {
      const params = {
        _meta: {
          'io.modelcontextprotocol/clientInfo': { name: 'cursor', version: '1.0' },
        },
        name: 'list_received_cards',
      };
      expect(getClientProtocol(params)).toBe('2025-06-18');
    });

    it('returns null for unsupported protocol version', () => {
      const params = {
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2099-01-01',
        },
      };
      expect(getClientProtocol(params)).toBeNull();
    });

    it('returns "2025-06-18" when _meta explicitly declares 2025-06-18', () => {
      const params = {
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2025-06-18',
        },
      };
      expect(getClientProtocol(params)).toBe('2025-06-18');
    });
  });

  describe('rpcResultModern', () => {
    it('includes resultType "complete" in response', async () => {
      const response = rpcResultModern(1, { tools: [] });
      const json = await response.json() as Record<string, unknown>;
      const result = json['result'] as Record<string, unknown>;
      expect(result['resultType']).toBe('complete');
    });

    it('includes _meta with serverInfo', async () => {
      const response = rpcResultModern(42, { data: 'test' });
      const json = await response.json() as Record<string, unknown>;
      const result = json['result'] as Record<string, unknown>;
      const meta = result['_meta'] as Record<string, unknown>;
      expect(meta['io.modelcontextprotocol/serverInfo']).toEqual(SERVER_INFO);
    });

    it('preserves provided result fields', async () => {
      const response = rpcResultModern('req-1', { tools: ['a', 'b'], ttlMs: 3600000 });
      const json = await response.json() as Record<string, unknown>;
      const result = json['result'] as Record<string, unknown>;
      expect(result['tools']).toEqual(['a', 'b']);
      expect(result['ttlMs']).toBe(3600000);
    });

    it('sets correct Content-Type header', () => {
      const response = rpcResultModern(1, {});
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('uses JSON-RPC 2.0 envelope with correct id', async () => {
      const response = rpcResultModern('id-99', { foo: 'bar' });
      const json = await response.json() as Record<string, unknown>;
      expect(json['jsonrpc']).toBe('2.0');
      expect(json['id']).toBe('id-99');
    });
  });

  describe('SERVER_INFO', () => {
    it('has correct name and version', () => {
      expect(SERVER_INFO.name).toBe('db-card-mcp');
      expect(SERVER_INFO.version).toBe('5.2.0');
    });
  });
});

describe('MCP Header Validation', () => {
  describe('validateMcpHeaders', () => {
    it('returns valid when strict mode is disabled', () => {
      const result = validateMcpHeaders(null, null, 'tools/call', 'search_received_cards', '2026-07-28', false);
      expect(result).toEqual({ valid: true });
    });

    it('returns valid when protocol is not 2026-07-28', () => {
      const result = validateMcpHeaders(null, null, 'tools/call', 'search_received_cards', '2025-06-18', true);
      expect(result).toEqual({ valid: true });
    });

    it('returns invalid when Mcp-Method header is missing', () => {
      const result = validateMcpHeaders(null, null, 'tools/call', 'search_received_cards', '2026-07-28', true);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe('Missing required Mcp-Method header');
    });

    it('returns invalid when Mcp-Method does not match body method', () => {
      const result = validateMcpHeaders('tools/list', null, 'tools/call', 'search_received_cards', '2026-07-28', true);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe('Header mismatch: Mcp-Method does not match body method');
    });

    it('returns invalid when Mcp-Name does not match tool name for tools/call', () => {
      const result = validateMcpHeaders('tools/call', 'list_received_cards', 'tools/call', 'search_received_cards', '2026-07-28', true);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe('Header mismatch: Mcp-Name does not match tool name');
    });

    it('returns valid when Mcp-Name is absent for tools/call (not required if missing)', () => {
      const result = validateMcpHeaders('tools/call', null, 'tools/call', 'search_received_cards', '2026-07-28', true);
      expect(result).toEqual({ valid: true });
    });

    it('returns valid for tools/list without Mcp-Name header', () => {
      const result = validateMcpHeaders('tools/list', null, 'tools/list', undefined, '2026-07-28', true);
      expect(result).toEqual({ valid: true });
    });

    it('returns valid when all headers match correctly', () => {
      const result = validateMcpHeaders('tools/call', 'search_received_cards', 'tools/call', 'search_received_cards', '2026-07-28', true);
      expect(result).toEqual({ valid: true });
    });
  });
});
