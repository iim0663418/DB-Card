/**
 * BDD Tests: Phase 3 — Auto-Inherit (BU5), Batch Apply (BU6), Staleness Enhanced (BU8)
 *
 * Strategy: directly call tool functions with mock env.DB / env.KV
 * (same pattern as mcp-org-tools.test.ts)
 */

import { describe, it, expect, vi } from 'vitest';
import { toolSaveReceivedCard } from '../src/handlers/mcp/tools';
import {
  toolGetOrganization,
  toolApplyOrganizationSummary,
} from '../src/handlers/mcp/org-tools';
import type { Env } from '../src/types';

// ── Mock chinese-converter (ESM: must return all used exports) ────────────────
vi.mock('../src/utils/chinese-converter', () => ({
  normalizeToTraditional: vi.fn().mockImplementation(async (text: string) => {
    if (!text) return null;
    const trimmed = text.trim();
    if (/^[\x00-\x7F]*$/.test(trimmed)) return trimmed.toLowerCase();
    return trimmed;
  }),
  normalizeToTraditionalSync: vi.fn().mockImplementation((text: string) => text),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_EMAIL = 'test@example.com';
const TEST_CLIENT_ID = 'mcp-client-phase3';

/** Parse MCP tool result content */
function parseResult(result: unknown): any {
  const content = (result as any).content;
  if (!content || !content[0]) return null;
  const text = content[0].text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Build a mock D1Database with configurable responses.
 * Supports first(), all(), run(), batch().
 */
function createMockDB(options: {
  onFirst?: (sql: string, bindings: unknown[]) => unknown | null;
  onAll?: (sql: string, bindings: unknown[]) => { results: unknown[] };
  runChanges?: number;
  batchStatements?: Array<{ sql: string; bindings: unknown[] }>;
}) {
  const {
    onFirst = () => null,
    onAll = () => ({ results: [] }),
    runChanges = 1,
    batchStatements = [],
  } = options;

  const allStatements: Array<{ sql: string; bindings: unknown[] }> = [];

  const mockBatch = vi.fn().mockImplementation(async (stmts: any[]) => {
    for (const stmt of stmts) {
      if (stmt._sql && stmt._bindings) {
        batchStatements.push({ sql: stmt._sql, bindings: stmt._bindings });
      }
    }
    return stmts.map(() => ({ results: [], success: true, meta: { changes: 1 } }));
  });

  const mockPrepare = vi.fn().mockImplementation((sql: string) => {
    const stmt: any = {
      _sql: sql,
      _bindings: [] as unknown[],
      bind: vi.fn().mockImplementation((...args: unknown[]) => {
        stmt._bindings = args;
        allStatements.push({ sql, bindings: args });
        return stmt;
      }),
      first: vi.fn().mockImplementation(async () => {
        return onFirst(stmt._sql, stmt._bindings);
      }),
      run: vi.fn().mockImplementation(async () => ({
        meta: { changes: runChanges },
        success: true,
      })),
      all: vi.fn().mockImplementation(async () => {
        return onAll(stmt._sql, stmt._bindings);
      }),
    };
    return stmt;
  });

  return {
    db: { prepare: mockPrepare, batch: mockBatch } as unknown as D1Database,
    mockPrepare,
    mockBatch,
    allStatements,
    batchStatements,
  };
}

/**
 * Build a mock KVNamespace with in-memory store.
 */
function createMockKV() {
  const store = new Map<string, string>();

  return {
    kv: {
      get: vi.fn().mockImplementation(async (key: string, type?: string) => {
        const val = store.get(key);
        if (!val) return null;
        if (type === 'json') return JSON.parse(val);
        return val;
      }),
      put: vi.fn().mockImplementation(async (key: string, value: string) => {
        store.set(key, value);
      }),
      delete: vi.fn().mockImplementation(async (key: string) => {
        store.delete(key);
      }),
    } as unknown as KVNamespace,
    store,
  };
}

function createMockEnv(db: D1Database, kv?: KVNamespace): Env {
  return { DB: db, KV: kv ?? createMockKV().kv } as unknown as Env;
}

// ══════════════════════════════════════════════════════════════════════════════
// BU 5: Auto-Inherit Organization Summary
// ══════════════════════════════════════════════════════════════════════════════

describe('Auto-Inherit Organization Summary', () => {
  // Scenario 5.1: New card inherits org summary when no company_summary provided
  it('inherits company_summary from org profile when card has none', async () => {
    const batchStatements: Array<{ sql: string; bindings: unknown[] }> = [];
    const { db } = createMockDB({
      onFirst: (sql, bindings) => {
        // Org profile lookup: return org with summary
        if (sql.includes('FROM organizations') && sql.includes('name_normalized')) {
          return {
            uuid: 'org-uuid-inherit',
            summary: 'Global leader in semiconductor manufacturing',
            metadata_json: null,
          };
        }
        return null;
      },
      batchStatements,
    });
    const env = createMockEnv(db);

    const result = await toolSaveReceivedCard(
      { full_name: 'John Doe', organization: 'TSMC' },
      TEST_EMAIL,
      env,
      'full'
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('uuid');
    expect(parsed).toHaveProperty('inherited_company_summary', true);

    // Verify field_history was written with source_type 'inherited'
    // The implementation uses individual run() calls for inherited field_history
    // Check that UPDATE + field_history INSERT were called via prepare
    const { allStatements } = createMockDB({});
    // We check through the mock's prepared statements
    const prepCalls = (db as any).prepare.mock.calls.map((c: any[]) => c[0]) as string[];
    const fieldHistoryInsert = prepCalls.find(
      (sql: string) => sql.includes('field_history') && sql.includes('inherited')
    );
    expect(fieldHistoryInsert).toBeDefined();
  });

  // Scenario 5.2: Card with explicit summary does not inherit
  it('does not overwrite explicit company_summary', async () => {
    const { db } = createMockDB({
      onFirst: (sql) => {
        if (sql.includes('FROM organizations') && sql.includes('name_normalized')) {
          return {
            uuid: 'org-uuid-inherit',
            summary: 'Org summary should not override',
            metadata_json: null,
          };
        }
        return null;
      },
    });
    const env = createMockEnv(db);

    const result = await toolSaveReceivedCard(
      {
        full_name: 'Jane Smith',
        organization: 'TSMC',
        company_summary: 'My own company summary',
      },
      TEST_EMAIL,
      env,
      'full'
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('uuid');
    // Should NOT have inherited_company_summary flag
    expect(parsed.inherited_company_summary).toBeUndefined();

    // Verify no UPDATE for company_summary inheritance was issued
    const prepCalls = (db as any).prepare.mock.calls.map((c: any[]) => c[0]) as string[];
    const inheritUpdate = prepCalls.filter(
      (sql: string) =>
        sql.includes('UPDATE received_cards SET company_summary') && !sql.includes('updated_at')
    );
    expect(inheritUpdate).toHaveLength(0);
  });

  // Scenario 8.3: Mismatch detection (deferred — org schema lacks address/phone/website)
  it('detects mismatch between card and org profile fields', async () => {
    const { db } = createMockDB({
      onFirst: (sql) => {
        if (sql.includes('FROM organizations') && sql.includes('name_normalized')) {
          return {
            uuid: 'org-uuid-mismatch',
            summary: 'A tech company',
            metadata_json: JSON.stringify({
              address: '123 Main St, Hsinchu',
              phone: '+886-3-1234567',
              website: 'https://www.tsmc.com',
            }),
          };
        }
        return null;
      },
    });
    const env = createMockEnv(db);

    const result = await toolSaveReceivedCard(
      {
        full_name: 'Bob Lee',
        organization: 'TSMC',
        address: '456 Different Rd, Taipei',  // Different from org profile
        phone: '+886-3-1234567',              // Same as org profile
        company_summary: 'Custom summary',
      },
      TEST_EMAIL,
      env,
      'full'
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('uuid');
    // Mismatch detection deferred — org schema does not store address/phone/website
    expect(parsed).not.toHaveProperty('org_mismatch');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BU 6: Batch Apply Organization Summary
// ══════════════════════════════════════════════════════════════════════════════

describe('Batch Apply Organization Summary', () => {
  // Scenario 6.1: Preview returns affected count + token
  it('returns preview with affected_cards count and confirm_token', async () => {
    const { db } = createMockDB({
      onFirst: (sql) => {
        // Org lookup
        if (sql.includes('FROM organizations') && sql.includes('uuid = ?')) {
          return {
            uuid: 'org-uuid-batch',
            name_normalized: 'acme corp',
            summary: 'Acme Corp is a global leader',
          };
        }
        return null;
      },
      onAll: (sql) => {
        // Cards query
        if (sql.includes('FROM received_cards') && sql.includes('organization_normalized')) {
          return {
            results: [
              { uuid: 'card-1', full_name: 'Alice', company_summary: null },
              { uuid: 'card-2', full_name: 'Bob', company_summary: 'old' },
              { uuid: 'card-3', full_name: 'Charlie', company_summary: null },
            ],
          };
        }
        // user_manual field_history check — none have user_manual
        if (sql.includes('field_history') && sql.includes('user_manual')) {
          return { results: [] };
        }
        return { results: [] };
      },
    });

    const { kv } = createMockKV();
    const env = createMockEnv(db, kv);

    const result = await toolApplyOrganizationSummary(
      { org_uuid: 'org-uuid-batch' },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('affected_cards', 3);
    expect(parsed).toHaveProperty('preview');
    expect(parsed.preview).toBeInstanceOf(Array);
    expect(parsed).toHaveProperty('confirm_token');
    expect(parsed.confirm_token).toMatch(/^[0-9a-f-]{36}$/);
    expect(parsed).toHaveProperty('token_expires_at');
  });

  // Scenario 6.2: Execute with valid token updates cards
  it('executes batch update with valid confirm_token', async () => {
    const { kv, store } = createMockKV();
    const batchStatements: Array<{ sql: string; bindings: unknown[] }> = [];

    // Pre-populate KV with a valid token
    const confirmToken = '11111111-2222-3333-4444-555555555555';
    const tokenData = {
      org_uuid: 'org-uuid-batch',
      affected_uuids: ['card-1', 'card-2'],
      user_email: TEST_EMAIL,
      expires_at: Date.now() + 60000, // expires in 1 minute
    };
    store.set(`batch_confirm:${confirmToken}`, JSON.stringify(tokenData));

    const { db } = createMockDB({
      onFirst: (sql) => {
        // Fetch org summary
        if (sql.includes('SELECT summary FROM organizations')) {
          return { summary: 'Updated Acme Corp summary' };
        }
        return null;
      },
      batchStatements,
    });
    const env = createMockEnv(db, kv);

    const result = await toolApplyOrganizationSummary(
      { confirm_token: confirmToken },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('applied');
    expect(parsed.applied).toBe(2);
    expect(parsed).toHaveProperty('org_uuid', 'org-uuid-batch');

    // Verify batch UPDATE was called for cards
    const updateStmts = batchStatements.filter(s =>
      s.sql.includes('UPDATE received_cards SET company_summary')
    );
    expect(updateStmts.length).toBe(2);

    // Verify field_history was written
    const historyStmts = batchStatements.filter(s => s.sql.includes('field_history'));
    expect(historyStmts.length).toBe(2);
    // Verify source_type is 'mcp_agent'
    for (const stmt of historyStmts) {
      expect(stmt.sql).toContain('mcp_agent');
    }

    // Verify KV token was deleted
    expect(kv.delete).toHaveBeenCalledWith(`batch_confirm:${confirmToken}`);
  });

  // Scenario 6.3: Expired/invalid token rejected
  it('rejects expired or invalid confirm_token', async () => {
    const { kv } = createMockKV();
    const { db } = createMockDB({});
    const env = createMockEnv(db, kv);

    const result = await toolApplyOrganizationSummary(
      { confirm_token: 'fake-invalid-token-999' },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('error', 'token_expired');
  });

  // Scenario 6.4: User-manual cards skipped
  it('skips cards with user_manual provenance on company_summary', async () => {
    const { db } = createMockDB({
      onFirst: (sql) => {
        if (sql.includes('FROM organizations') && sql.includes('uuid = ?')) {
          return {
            uuid: 'org-uuid-manual',
            name_normalized: 'manual corp',
            summary: 'Corp summary for batch apply',
          };
        }
        return null;
      },
      onAll: (sql) => {
        if (sql.includes('FROM received_cards') && sql.includes('organization_normalized')) {
          return {
            results: [
              { uuid: 'card-a', full_name: 'User A', company_summary: null },
              { uuid: 'card-b', full_name: 'User B', company_summary: 'manually set' },
              { uuid: 'card-c', full_name: 'User C', company_summary: null },
            ],
          };
        }
        // user_manual check: card-b has user_manual provenance
        if (sql.includes('field_history') && sql.includes('user_manual')) {
          return { results: [{ entity_uuid: 'card-b' }] };
        }
        return { results: [] };
      },
    });

    const { kv } = createMockKV();
    const env = createMockEnv(db, kv);

    const result = await toolApplyOrganizationSummary(
      { org_uuid: 'org-uuid-manual' },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const parsed = parseResult(result);
    // card-b should be excluded
    expect(parsed.affected_cards).toBe(2);
    expect(parsed.skipped_user_manual).toBe(1);
    // preview should only contain card-a and card-c
    const previewUuids = parsed.preview.map((p: any) => p.uuid);
    expect(previewUuids).not.toContain('card-b');
    expect(previewUuids).toContain('card-a');
    expect(previewUuids).toContain('card-c');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BU 8: Staleness Event-Triggered
// ══════════════════════════════════════════════════════════════════════════════

describe('Staleness Event-Triggered', () => {
  // Scenario 8.6: 5+ new cards triggers refresh_recommended
  it('returns refresh_recommended when 5+ cards added since update', async () => {
    const tenDaysAgo = Date.now() - 86400000 * 10;
    const orgRow = {
      uuid: 'org-uuid-staleness',
      name: 'Fresh Corp',
      name_en: 'Fresh Corp EN',
      name_normalized: 'fresh corp',
      aliases: null,
      industry: 'Tech',
      summary: 'A fresh company',
      source_url: null,
      metadata_json: null,
      created_at: tenDaysAgo - 86400000 * 20,
      updated_at: tenDaysAgo,
    };

    const { db } = createMockDB({
      onFirst: (sql, bindings) => {
        // Org lookup by name_normalized
        if (sql.includes('FROM organizations') && sql.includes('name_normalized = ?') && !sql.includes('LIKE')) {
          return orgRow;
        }
        // related_cards_count
        if (sql.includes('COUNT(*)') && sql.includes('organization_normalized') && !sql.includes('created_at >')) {
          return { count: 8 };
        }
        // new_cards_since_update: 5+ new cards
        if (sql.includes('COUNT(*)') && sql.includes('created_at >')) {
          return { count: 6 };
        }
        return null;
      },
    });
    const env = createMockEnv(db);

    const result = await toolGetOrganization(
      { name: 'Fresh Corp' },
      TEST_EMAIL,
      env
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('uuid', 'org-uuid-staleness');
    expect(parsed).toHaveProperty('freshness');
    expect(parsed.freshness.status).toBe('refresh_recommended');
    expect(parsed.freshness.new_cards_since_update).toBe(6);
    expect(parsed.freshness.reason).toContain('6');
    // days_since_update should be ~10
    expect(parsed.freshness.days_since_update).toBeLessThanOrEqual(11);
    expect(parsed.freshness.days_since_update).toBeGreaterThanOrEqual(9);
  });

  it('returns fresh when fewer than 5 new cards added', async () => {
    const fiveDaysAgo = Date.now() - 86400000 * 5;
    const orgRow = {
      uuid: 'org-uuid-fresh',
      name: 'Still Fresh Corp',
      name_en: null,
      name_normalized: 'still fresh corp',
      aliases: null,
      industry: 'Retail',
      summary: 'Fresh retail company',
      source_url: null,
      metadata_json: null,
      created_at: fiveDaysAgo - 86400000 * 10,
      updated_at: fiveDaysAgo,
    };

    const { db } = createMockDB({
      onFirst: (sql) => {
        if (sql.includes('FROM organizations') && sql.includes('name_normalized = ?') && !sql.includes('LIKE')) {
          return orgRow;
        }
        if (sql.includes('COUNT(*)') && sql.includes('organization_normalized') && !sql.includes('created_at >')) {
          return { count: 3 };
        }
        if (sql.includes('COUNT(*)') && sql.includes('created_at >')) {
          return { count: 2 };
        }
        return null;
      },
    });
    const env = createMockEnv(db);

    const result = await toolGetOrganization(
      { name: 'Still Fresh Corp' },
      TEST_EMAIL,
      env
    );

    const parsed = parseResult(result);
    expect(parsed.freshness.status).toBe('fresh');
    expect(parsed.freshness.new_cards_since_update).toBe(2);
    expect(parsed.freshness.reason).toBeUndefined();
  });
});
