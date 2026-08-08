/**
 * BDD Tests: MCP Organization CRUD Tools
 * Covers Behavioral Unit 1 — 5 scenarios + 3 extra validations
 *
 * Strategy: directly call tool functions with mock env.DB
 * (same pattern as mcp-field-scope.test.ts)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  toolSaveOrganization,
  toolGetOrganization,
  toolUpdateOrganization,
} from '../src/handlers/mcp/org-tools';
import type { Env } from '../src/types';

// ── Mock chinese-converter (ESM: must return all used exports) ────────────────
vi.mock('../src/utils/chinese-converter', () => ({
  normalizeToTraditional: vi.fn().mockImplementation(async (text: string) => {
    // Simple mock: trim + lowercase for ASCII, identity for CJK
    if (!text) return null;
    const trimmed = text.trim();
    if (/^[\x00-\x7F]*$/.test(trimmed)) return trimmed.toLowerCase();
    return trimmed;
  }),
  normalizeToTraditionalSync: vi.fn().mockImplementation((text: string) => text),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_EMAIL = 'test@example.com';
const TEST_CLIENT_ID = 'mcp-client-001';

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
 * Build a mock D1Database that tracks SQL calls.
 * Supports configurable responses via a handler function.
 */
function createMockDB(options: {
  /** Handler for SELECT .first() — receives (sql, bindings), return row or null */
  onFirst?: (sql: string, bindings: unknown[]) => unknown | null;
  /** Handler for SELECT .all() — receives (sql, bindings), return { results: [] } */
  onAll?: (sql: string, bindings: unknown[]) => { results: unknown[] };
  /** Number of changes for run() */
  runChanges?: number;
  /** Collected batch statements for verification */
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
    return stmts.map(() => ({ results: [], success: true }));
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

function createMockEnv(db: D1Database): Env {
  return { DB: db } as unknown as Env;
}

// ══════════════════════════════════════════════════════════════════════════════
// MCP Organization Tools
// ══════════════════════════════════════════════════════════════════════════════

describe('MCP Organization Tools', () => {
  // ── Scenario 1.1: Save new organization ─────────────────────────────────

  it('saves a new organization and returns uuid', async () => {
    const batchStatements: Array<{ sql: string; bindings: unknown[] }> = [];
    const { db } = createMockDB({
      // No existing org with same normalized name
      onFirst: () => null,
      batchStatements,
    });
    const env = createMockEnv(db);

    const result = await toolSaveOrganization(
      { name: 'Acme Corp', industry: 'Technology', summary: 'A tech company' },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('uuid');
    expect(parsed.uuid).toMatch(/^[0-9a-f-]{36}$/);

    // Verify field_history was written
    const historyInserts = batchStatements.filter(s => s.sql.includes('field_history'));
    expect(historyInserts.length).toBeGreaterThan(0);
    // Should have entries for name, industry, summary
    const fieldNames = historyInserts.map(s => s.bindings[1]);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('industry');
    expect(fieldNames).toContain('summary');
  });

  // ── Scenario 1.2: Reject duplicate normalized name ──────────────────────

  it('rejects duplicate organization by normalized name', async () => {
    const existingUuid = 'existing-org-uuid-001';
    const { db } = createMockDB({
      onFirst: (sql) => {
        // SELECT uuid FROM organizations WHERE user_email = ? AND name_normalized = ?
        if (sql.includes('SELECT uuid FROM organizations')) {
          return { uuid: existingUuid };
        }
        return null;
      },
    });
    const env = createMockEnv(db);

    const result = await toolSaveOrganization(
      { name: 'Acme Corp' },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('error', 'organization_exists');
    expect(parsed).toHaveProperty('existing_uuid', existingUuid);
  });

  // ── Scenario 1.3: Get organization by name with related_cards_count ─────

  it('gets organization by name with related_cards_count', async () => {
    const orgRow = {
      uuid: 'org-uuid-001',
      name: '台積電',
      name_en: 'TSMC',
      name_normalized: '台積電',
      aliases: null,
      industry: 'Semiconductor',
      summary: 'World leading foundry',
      source_url: 'https://www.tsmc.com',
      metadata_json: null,
      created_at: Date.now() - 86400000 * 5, // 5 days ago
      updated_at: null,
    };

    const { db } = createMockDB({
      onFirst: (sql, bindings) => {
        // name_normalized exact match
        if (sql.includes('name_normalized = ?') && !sql.includes('LIKE')) {
          return orgRow;
        }
        // related_cards_count
        if (sql.includes('COUNT(*)')) {
          return { count: 3 };
        }
        return null;
      },
    });
    const env = createMockEnv(db);

    const result = await toolGetOrganization(
      { name: '台積電' },
      TEST_EMAIL,
      env
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('uuid', 'org-uuid-001');
    expect(parsed).toHaveProperty('name', '台積電');
    expect(parsed).toHaveProperty('related_cards_count', 3);
    expect(parsed).toHaveProperty('freshness');
    expect(parsed.freshness.status).toBe('fresh');
  });

  // ── Scenario 1.4: Update organization and preserve version history ──────

  it('updates organization and preserves version history', async () => {
    const batchStatements: Array<{ sql: string; bindings: unknown[] }> = [];
    const existingOrg = {
      uuid: 'org-uuid-002',
      name: 'Alpha Corp',
      name_en: null,
      name_normalized: 'alpha corp',
      aliases: null,
      industry: 'Finance',
      summary: 'Old summary text',
      source_url: null,
      metadata_json: null,
      updated_at: Date.now() - 86400000,
    };

    const { db } = createMockDB({
      onFirst: (sql) => {
        // Ownership check
        if (sql.includes('SELECT') && sql.includes('organizations') && sql.includes('uuid = ?')) {
          return existingOrg;
        }
        return null;
      },
      batchStatements,
    });
    const env = createMockEnv(db);

    const result = await toolUpdateOrganization(
      { uuid: 'org-uuid-002', summary: 'New updated summary' },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('uuid', 'org-uuid-002');
    expect(parsed).toHaveProperty('updated', true);

    // Verify field_history records old value
    const historyInserts = batchStatements.filter(s => s.sql.includes('field_history'));
    expect(historyInserts.length).toBe(1);

    const summaryHistory = historyInserts[0];
    expect(summaryHistory.bindings).toContain('summary'); // field_name
    expect(summaryHistory.bindings).toContain('Old summary text'); // old_value
    expect(summaryHistory.bindings).toContain('New updated summary'); // new_value
    expect(summaryHistory.bindings).toContain(TEST_CLIENT_ID); // client_id
  });

  // ── Scenario 1.5: Get non-existent returns null ─────────────────────────

  it('returns null for non-existent organization', async () => {
    const { db } = createMockDB({
      onFirst: () => null,
    });
    const env = createMockEnv(db);

    const result = await toolGetOrganization(
      { name: 'NonExistentCorp' },
      TEST_EMAIL,
      env
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('result', null);
  });

  // ── Extra: source_url validation ────────────────────────────────────────

  it('rejects javascript: source_url', async () => {
    const { db } = createMockDB({
      onFirst: () => null, // no duplicate
    });
    const env = createMockEnv(db);

    const result = await toolSaveOrganization(
      { name: 'Evil Corp', source_url: 'javascript:alert(1)' },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const text = parseResult(result);
    expect(text).toContain('source_url must use http:// or https:// scheme');
  });

  // ── Extra: summary length validation ────────────────────────────────────

  it('rejects summary exceeding 5000 chars', async () => {
    const { db } = createMockDB({});
    const env = createMockEnv(db);

    const longSummary = 'a'.repeat(5001);
    const result = await toolSaveOrganization(
      { name: 'Verbose Corp', summary: longSummary },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const text = parseResult(result);
    expect(text).toContain('exceeds maximum length of 5000');
  });

  // ── Extra: freshness status (stale) ─────────────────────────────────────

  it('returns stale freshness when org is older than 30 days', async () => {
    const thirtyOneDaysAgo = Date.now() - 86400000 * 31;
    const orgRow = {
      uuid: 'org-uuid-stale',
      name: 'Stale Corp',
      name_en: null,
      name_normalized: 'stale corp',
      aliases: null,
      industry: 'Retail',
      summary: 'Outdated info',
      source_url: null,
      metadata_json: null,
      created_at: thirtyOneDaysAgo,
      updated_at: thirtyOneDaysAgo,
    };

    const { db } = createMockDB({
      onFirst: (sql) => {
        if (sql.includes('name_normalized = ?') && !sql.includes('LIKE')) {
          return orgRow;
        }
        if (sql.includes('COUNT(*)')) {
          return { count: 0 };
        }
        return null;
      },
    });
    const env = createMockEnv(db);

    const result = await toolGetOrganization(
      { name: 'Stale Corp' },
      TEST_EMAIL,
      env
    );

    const parsed = parseResult(result);
    expect(parsed.freshness.status).toBe('stale');
    expect(parsed.freshness.days_since_update).toBeGreaterThanOrEqual(31);
    expect(parsed.freshness.refresh_hint).toContain('over 30 days old');
  });
});
