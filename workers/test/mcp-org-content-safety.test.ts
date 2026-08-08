/**
 * BDD Tests: Organization Content Safety (BU 7)
 * Covers review_flag logic — checkContentSafety heuristic + source_url validation
 *
 * Strategy: directly call tool functions with mock env.DB
 * (same pattern as mcp-org-tools.test.ts)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  toolSaveOrganization,
  toolGetOrganization,
  toolUpdateOrganization,
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

const TEST_EMAIL = 'safety-test@example.com';
const TEST_CLIENT_ID = 'mcp-client-safety';

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
  onFirst?: (sql: string, bindings: unknown[]) => unknown | null;
  onAll?: (sql: string, bindings: unknown[]) => { results: unknown[] };
  runChanges?: number;
  batchStatements?: Array<{ sql: string; bindings: unknown[] }>;
  /** Capture run() calls to inspect INSERT/UPDATE bindings */
  runCalls?: Array<{ sql: string; bindings: unknown[] }>;
}) {
  const {
    onFirst = () => null,
    onAll = () => ({ results: [] }),
    runChanges = 1,
    batchStatements = [],
    runCalls = [],
  } = options;

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
        return stmt;
      }),
      first: vi.fn().mockImplementation(async () => {
        return onFirst(stmt._sql, stmt._bindings);
      }),
      run: vi.fn().mockImplementation(async () => {
        runCalls.push({ sql: stmt._sql, bindings: [...stmt._bindings] });
        return { meta: { changes: runChanges }, success: true };
      }),
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
    batchStatements,
    runCalls,
  };
}

function createMockEnv(db: D1Database): Env {
  return { DB: db } as unknown as Env;
}

// ══════════════════════════════════════════════════════════════════════════════
// Organization Content Safety (BU 7)
// ══════════════════════════════════════════════════════════════════════════════

describe('Organization Content Safety', () => {
  // ── Scenario 7.1: Summary with email + call-to-action is flagged ────────

  it('flags summary with email + call-to-action as review_needed', async () => {
    const runCalls: Array<{ sql: string; bindings: unknown[] }> = [];
    const { db } = createMockDB({
      onFirst: () => null, // no duplicate
      runCalls,
    });
    const env = createMockEnv(db);

    const result = await toolSaveOrganization(
      { name: 'Suspicious Corp', summary: '請聯繫 payment@evil.com 付款' },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    // Assert: org saved (not blocked) — returns uuid
    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('uuid');
    expect(parsed.uuid).toMatch(/^[0-9a-f-]{36}$/);

    // Assert: review_flag = 'review_needed' in the INSERT binding
    const insertCall = runCalls.find(c => c.sql.includes('INSERT INTO organizations'));
    expect(insertCall).toBeDefined();
    // review_flag is the 11th parameter (index 10)
    expect(insertCall!.bindings[10]).toBe('review_needed');
  });

  // ── Clean summary not flagged ──────────────────────────────────────────

  it('does not flag clean summary', async () => {
    const runCalls: Array<{ sql: string; bindings: unknown[] }> = [];
    const { db } = createMockDB({
      onFirst: () => null,
      runCalls,
    });
    const env = createMockEnv(db);

    const result = await toolSaveOrganization(
      { name: 'Clean Corp', summary: '這是一間優秀的科技公司，專注於半導體製造。' },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('uuid');

    // Assert: review_flag IS NULL
    const insertCall = runCalls.find(c => c.sql.includes('INSERT INTO organizations'));
    expect(insertCall).toBeDefined();
    expect(insertCall!.bindings[10]).toBeNull();
  });

  // ── Summary with payment keywords flagged ──────────────────────────────

  it('flags summary with payment keywords', async () => {
    const runCalls: Array<{ sql: string; bindings: unknown[] }> = [];
    const { db } = createMockDB({
      onFirst: () => null,
      runCalls,
    });
    const env = createMockEnv(db);

    const result = await toolSaveOrganization(
      { name: 'Payment Corp', summary: '請匯款至帳戶 1234-5678-9012' },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('uuid');

    // Assert: review_flag = 'review_needed'
    const insertCall = runCalls.find(c => c.sql.includes('INSERT INTO organizations'));
    expect(insertCall).toBeDefined();
    expect(insertCall!.bindings[10]).toBe('review_needed');
  });

  // ── Update summary re-checks content safety ────────────────────────────

  it('re-checks content safety on summary update', async () => {
    const runCalls: Array<{ sql: string; bindings: unknown[] }> = [];
    const existingOrg = {
      uuid: 'org-uuid-clean',
      name: 'Update Target Corp',
      name_en: null,
      name_normalized: 'update target corp',
      aliases: null,
      industry: 'Tech',
      summary: 'A normal clean company.',
      source_url: null,
      metadata_json: null,
      updated_at: Date.now() - 86400000,
    };

    const { db } = createMockDB({
      onFirst: (sql) => {
        if (sql.includes('SELECT') && sql.includes('uuid = ?')) {
          return existingOrg;
        }
        return null;
      },
      runCalls,
    });
    const env = createMockEnv(db);

    const result = await toolUpdateOrganization(
      { uuid: 'org-uuid-clean', summary: '請聯繫 scam@phishing.com 轉帳' },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('updated', true);

    // Assert: UPDATE includes review_flag = 'review_needed'
    const updateCall = runCalls.find(c => c.sql.includes('UPDATE organizations'));
    expect(updateCall).toBeDefined();
    // review_flag should be 'review_needed' in bindings
    expect(updateCall!.bindings).toContain('review_needed');
  });

  // ── Update to clean summary clears flag ────────────────────────────────

  it('clears review_flag when summary becomes clean', async () => {
    const runCalls: Array<{ sql: string; bindings: unknown[] }> = [];
    const existingOrg = {
      uuid: 'org-uuid-flagged',
      name: 'Flagged Corp',
      name_en: null,
      name_normalized: 'flagged corp',
      aliases: null,
      industry: 'Finance',
      summary: '請匯款至帳戶 9999-8888',
      source_url: null,
      metadata_json: null,
      updated_at: Date.now() - 86400000,
    };

    const { db } = createMockDB({
      onFirst: (sql) => {
        if (sql.includes('SELECT') && sql.includes('uuid = ?')) {
          return existingOrg;
        }
        return null;
      },
      runCalls,
    });
    const env = createMockEnv(db);

    const result = await toolUpdateOrganization(
      { uuid: 'org-uuid-flagged', summary: '一間正規金融服務公司' },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('updated', true);

    // Assert: UPDATE sets review_flag = null
    const updateCall = runCalls.find(c => c.sql.includes('UPDATE organizations'));
    expect(updateCall).toBeDefined();
    // The SQL should contain review_flag = ? and the bound value should be null
    expect(updateCall!.sql).toContain('review_flag');
    expect(updateCall!.bindings).toContain(null);
    // Should NOT contain 'review_needed'
    expect(updateCall!.bindings).not.toContain('review_needed');
  });

  // ── get_organization returns review_flag ────────────────────────────────

  it('get_organization returns review_flag field', async () => {
    const orgRow = {
      uuid: 'org-uuid-flagged-get',
      name: 'Flagged Get Corp',
      name_en: null,
      name_normalized: 'flagged get corp',
      aliases: null,
      industry: 'Finance',
      summary: '請匯款至帳戶 7777',
      source_url: null,
      metadata_json: null,
      review_flag: 'review_needed',
      created_at: Date.now() - 86400000 * 2,
      updated_at: null,
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
      { name: 'Flagged Get Corp' },
      TEST_EMAIL,
      env
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('review_flag', 'review_needed');
  });

  // ── Scenario 7.2: source_url validation ────────────────────────────────

  it('rejects data: scheme source_url', async () => {
    const { db } = createMockDB({
      onFirst: () => null,
    });
    const env = createMockEnv(db);

    const result = await toolSaveOrganization(
      { name: 'Data Scheme Corp', source_url: 'data:text/html,<script>alert(1)</script>' },
      TEST_EMAIL,
      env,
      TEST_CLIENT_ID
    );

    const text = parseResult(result);
    expect(text).toContain('source_url must use http:// or https:// scheme');
  });
});
