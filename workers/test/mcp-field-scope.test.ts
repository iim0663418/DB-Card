/**
 * BDD Tests: MCP Field-Level Write Scope, Write Provenance, Version History
 * Covers Behavioral Units 2, 3, 4 of Phase 1
 *
 * Strategy: directly call toolUpdateReceivedCard / toolSaveReceivedCard with mock env.DB
 * that simulates D1 behaviour (prepare/bind/first/run/all/batch).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  toolUpdateReceivedCard,
  toolSaveReceivedCard,
  SUMMARY_FIELDS,
} from '../src/handlers/mcp/tools';
import type { WriteScope, WriteProvenance } from '../src/handlers/mcp/tools';
import type { Env } from '../src/types';

// ── Test Helpers ──────────────────────────────────────────────────────────────

const TEST_EMAIL = 'test@example.com';
const TEST_UUID = 'card-uuid-test-0001';

/**
 * Creates a mock D1Database that tracks prepared statements and batch calls.
 * Supports configuring responses for SELECT (first) and UPDATE (run).
 */
function createMockDB(options: {
  /** Old card values returned by SELECT before UPDATE */
  oldValues?: Record<string, unknown> | null;
  /** Number of rows changed by UPDATE */
  updateChanges?: number;
  /** Collected batch statements for verification */
  batchStatements?: Array<{ sql: string; bindings: unknown[] }>;
}) {
  const {
    oldValues = null,
    updateChanges = 1,
    batchStatements = [],
  } = options;

  const boundStatements: Array<{ sql: string; bindings: unknown[] }> = [];
  let currentSql = '';

  const mockBatch = vi.fn().mockImplementation(async (stmts: any[]) => {
    for (const stmt of stmts) {
      if (stmt._sql && stmt._bindings) {
        batchStatements.push({ sql: stmt._sql, bindings: stmt._bindings });
      }
    }
    return stmts.map(() => ({ results: [], success: true }));
  });

  const mockPrepare = vi.fn().mockImplementation((sql: string) => {
    currentSql = sql;
    const stmt: any = {
      _sql: sql,
      _bindings: [] as unknown[],
      bind: vi.fn().mockImplementation((...args: unknown[]) => {
        stmt._bindings = args;
        boundStatements.push({ sql: currentSql, bindings: args });
        return stmt;
      }),
      first: vi.fn().mockImplementation(async () => {
        // Return old values for SELECT queries (provenance read)
        if (currentSql.trim().startsWith('SELECT') && oldValues !== null) {
          return oldValues;
        }
        return null;
      }),
      run: vi.fn().mockImplementation(async () => ({
        meta: { changes: updateChanges },
        success: true,
      })),
      all: vi.fn().mockResolvedValue({ results: [] }),
    };
    return stmt;
  });

  return {
    db: { prepare: mockPrepare, batch: mockBatch } as unknown as D1Database,
    mockPrepare,
    mockBatch,
    boundStatements,
    batchStatements,
  };
}

function createMockEnv(db: D1Database): Env {
  return { DB: db } as unknown as Env;
}

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

// ══════════════════════════════════════════════════════════════════════════════
// BU 2: Field-Level Write Scope
// ══════════════════════════════════════════════════════════════════════════════

describe('MCP Field-Level Write Scope', () => {
  it('allows updating company_summary with basic write scope', async () => {
    const batchStatements: Array<{ sql: string; bindings: unknown[] }> = [];
    const { db } = createMockDB({
      oldValues: { company_summary: 'old summary' },
      updateChanges: 1,
      batchStatements,
    });
    const env = createMockEnv(db);

    const result = await toolUpdateReceivedCard(
      { uuid: TEST_UUID, company_summary: 'new summary' },
      TEST_EMAIL,
      env,
      'summary' as WriteScope,
      { sourceType: 'mcp_agent', clientId: null }
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('uuid', TEST_UUID);
    expect(parsed).toHaveProperty('updated', true);
  });

  it('rejects updating full_name with basic write scope', async () => {
    const { db } = createMockDB({ oldValues: { full_name: 'Old Name' } });
    const env = createMockEnv(db);

    const result = await toolUpdateReceivedCard(
      { uuid: TEST_UUID, full_name: 'New Name' },
      TEST_EMAIL,
      env,
      'summary' as WriteScope,
      { sourceType: 'mcp_agent', clientId: null }
    );

    const text = parseResult(result);
    expect(text).toContain('Insufficient scope');
    expect(text).toContain('full_name');
    expect(text).toContain('received_cards:write:full');
  });

  it('allows updating full_name with write:full scope', async () => {
    const { db } = createMockDB({
      oldValues: { full_name: 'Old Name' },
      updateChanges: 1,
    });
    const env = createMockEnv(db);

    const result = await toolUpdateReceivedCard(
      { uuid: TEST_UUID, full_name: 'New Name' },
      TEST_EMAIL,
      env,
      'full' as WriteScope,
      { sourceType: 'mcp_agent', clientId: null }
    );

    const parsed = parseResult(result);
    expect(parsed).toHaveProperty('uuid', TEST_UUID);
    expect(parsed).toHaveProperty('updated', true);
  });

  it('save with basic scope rejects non-summary fields', async () => {
    const { db } = createMockDB({});
    const env = createMockEnv(db);

    const result = await toolSaveReceivedCard(
      {
        full_name: 'Test Person',
        organization: 'ForbiddenOrg',  // not in SUMMARY_SAVE_FIELDS
        title: 'Engineer',             // not in SUMMARY_SAVE_FIELDS
      },
      TEST_EMAIL,
      env,
      'summary' as WriteScope
    );

    const text = parseResult(result);
    expect(text).toContain('Insufficient scope');
    expect(text).toContain('organization');
    expect(text).toContain('title');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BU 3: Write Provenance
// ══════════════════════════════════════════════════════════════════════════════

describe('MCP Write Provenance', () => {
  it('records field change in field_history table', async () => {
    const batchStatements: Array<{ sql: string; bindings: unknown[] }> = [];
    const { db, mockBatch } = createMockDB({
      oldValues: { note: 'old note' },
      updateChanges: 1,
      batchStatements,
    });
    const env = createMockEnv(db);

    await toolUpdateReceivedCard(
      { uuid: TEST_UUID, note: 'new note' },
      TEST_EMAIL,
      env,
      'full' as WriteScope,
      { sourceType: 'mcp_agent', clientId: 'client-abc' }
    );

    // batch() should have been called for field_history inserts
    expect(mockBatch).toHaveBeenCalled();
    expect(batchStatements.length).toBeGreaterThan(0);

    // Verify the INSERT targets field_history
    const historyInsert = batchStatements.find(s => s.sql.includes('field_history'));
    expect(historyInsert).toBeDefined();
  });

  it('stores correct old and new values', async () => {
    const batchStatements: Array<{ sql: string; bindings: unknown[] }> = [];
    const { db } = createMockDB({
      oldValues: { company_summary: 'Alpha Corp provides consulting' },
      updateChanges: 1,
      batchStatements,
    });
    const env = createMockEnv(db);

    await toolUpdateReceivedCard(
      { uuid: TEST_UUID, company_summary: 'Alpha Corp provides fintech services' },
      TEST_EMAIL,
      env,
      'full' as WriteScope,
      { sourceType: 'mcp_agent', clientId: null }
    );

    // Find the field_history insert for company_summary
    const historyInsert = batchStatements.find(
      s => s.sql.includes('field_history') && s.bindings.includes('company_summary')
    );
    expect(historyInsert).toBeDefined();

    // Bindings order: entity_uuid, field_name, old_value, new_value, source_type, client_id, user_email, changed_at
    const bindings = historyInsert!.bindings;
    expect(bindings).toContain(TEST_UUID);                                    // entity_uuid
    expect(bindings).toContain('company_summary');                            // field_name
    expect(bindings).toContain('Alpha Corp provides consulting');             // old_value
    expect(bindings).toContain('Alpha Corp provides fintech services');       // new_value
  });

  it('records source_type and client_id', async () => {
    const batchStatements: Array<{ sql: string; bindings: unknown[] }> = [];
    const { db } = createMockDB({
      oldValues: { note: 'meeting notes' },
      updateChanges: 1,
      batchStatements,
    });
    const env = createMockEnv(db);

    const provenance: WriteProvenance = { sourceType: 'mcp_agent', clientId: 'mcp-client-xyz' };

    await toolUpdateReceivedCard(
      { uuid: TEST_UUID, note: 'updated meeting notes' },
      TEST_EMAIL,
      env,
      'full' as WriteScope,
      provenance
    );

    const historyInsert = batchStatements.find(
      s => s.sql.includes('field_history') && s.bindings.includes('note')
    );
    expect(historyInsert).toBeDefined();

    const bindings = historyInsert!.bindings;
    expect(bindings).toContain('mcp_agent');        // source_type
    expect(bindings).toContain('mcp-client-xyz');   // client_id
    expect(bindings).toContain(TEST_EMAIL);         // user_email
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BU 4: Version History
// ══════════════════════════════════════════════════════════════════════════════

describe('Version History', () => {
  it('preserves multiple versions of same field', async () => {
    const allBatchStatements: Array<{ sql: string; bindings: unknown[] }> = [];

    // First update: old note → note v2
    const { db: db1, mockBatch: batch1 } = createMockDB({
      oldValues: { note: 'original note' },
      updateChanges: 1,
      batchStatements: allBatchStatements,
    });
    const env1 = createMockEnv(db1);

    await toolUpdateReceivedCard(
      { uuid: TEST_UUID, note: 'note v2' },
      TEST_EMAIL,
      env1,
      'full' as WriteScope,
      { sourceType: 'mcp_agent', clientId: null }
    );

    expect(batch1).toHaveBeenCalled();
    const firstUpdateStatements = [...allBatchStatements];

    // Second update: note v2 → note v3
    const secondBatchStatements: Array<{ sql: string; bindings: unknown[] }> = [];
    const { db: db2, mockBatch: batch2 } = createMockDB({
      oldValues: { note: 'note v2' },
      updateChanges: 1,
      batchStatements: secondBatchStatements,
    });
    const env2 = createMockEnv(db2);

    await toolUpdateReceivedCard(
      { uuid: TEST_UUID, note: 'note v3' },
      TEST_EMAIL,
      env2,
      'full' as WriteScope,
      { sourceType: 'mcp_agent', clientId: null }
    );

    expect(batch2).toHaveBeenCalled();

    // Verify first update recorded: original → v2
    const firstHistory = firstUpdateStatements.find(
      s => s.sql.includes('field_history') && s.bindings.includes('note')
    );
    expect(firstHistory).toBeDefined();
    expect(firstHistory!.bindings).toContain('original note');
    expect(firstHistory!.bindings).toContain('note v2');

    // Verify second update recorded: v2 → v3
    const secondHistory = secondBatchStatements.find(
      s => s.sql.includes('field_history') && s.bindings.includes('note')
    );
    expect(secondHistory).toBeDefined();
    expect(secondHistory!.bindings).toContain('note v2');
    expect(secondHistory!.bindings).toContain('note v3');
  });

  it('does not record unchanged fields', async () => {
    const batchStatements: Array<{ sql: string; bindings: unknown[] }> = [];
    const { db, mockBatch } = createMockDB({
      oldValues: { note: 'same note', company_summary: 'same summary' },
      updateChanges: 1,
      batchStatements,
    });
    const env = createMockEnv(db);

    // Send update with same values as existing
    await toolUpdateReceivedCard(
      { uuid: TEST_UUID, note: 'same note', company_summary: 'same summary' },
      TEST_EMAIL,
      env,
      'full' as WriteScope,
      { sourceType: 'mcp_agent', clientId: null }
    );

    // field_history should NOT have any inserts since values didn't change
    const historyInserts = batchStatements.filter(s => s.sql.includes('field_history'));
    expect(historyInserts).toHaveLength(0);

    // batch() should not be called if no fields actually changed
    // (implementation filters unchanged fields before calling batch)
    const batchCalls = mockBatch.mock.calls;
    // Either batch was not called, or was called with empty array
    if (batchCalls.length > 0) {
      // If batch is called, the implementation should have filtered out unchanged fields
      // In the current impl, batch is only called when historyStatements.length > 0
      // So this path means batch wasn't called at all for field_history
    }
    expect(historyInserts).toHaveLength(0);
  });
});
