/**
 * BDD Tests: received-cards list handler
 * - card_tags batching for >100 cards (chunking safety net)
 * - Cursor-based pagination (Scenarios 1–6)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleListCards } from '../src/handlers/user/received-cards/crud';
import type { Env } from '../src/types';
import * as oauthMiddleware from '../src/middleware/oauth';

// Generate N unique UUIDs for test cards
function makeUuids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `card-uuid-${String(i).padStart(4, '0')}`);
}

// Build a mock card row given a uuid and optional sort_ts
function makeCard(uuid: string, sort_ts = '1000000') {
  return {
    uuid,
    name_prefix: null,
    full_name: `Person ${uuid}`,
    first_name: null,
    last_name: null,
    name_suffix: null,
    organization: 'Org',
    organization_en: null,
    organization_alias: null,
    department: null,
    title: null,
    phone: null,
    email: null,
    website: null,
    address: null,
    note: null,
    company_summary: null,
    personal_summary: null,
    ai_sources_json: null,
    ai_status: null,
    original_image_url: null,
    thumbnail_url: null,
    created_at: sort_ts,
    updated_at: null,
    source: 'own',
    shared_by: null,
    sort_ts,
  };
}

// Encode a cursor (mirrors production logic)
function encodeCursor(sort_ts: number, uuid: string): string {
  return btoa(JSON.stringify({ t: sort_ts, u: uuid }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

describe('BDD: card_tags batching for >100 cards', () => {
  let mockEnv: Partial<Env>;
  let mockRequest: Request;

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(oauthMiddleware, 'verifyOAuth').mockResolvedValue({
      email: 'test@example.com',
    } as any);

    mockRequest = new Request('https://example.com/api/user/received-cards', {
      headers: { Authorization: 'Bearer mock-token' },
    });
  });

  it('returns 200 with all cards and tags when user has >100 cards', async () => {
    const uuids = makeUuids(150);
    const cards = uuids.map(uuid => makeCard(uuid));

    // Tag rows: give card-uuid-0000 one tag, and card-uuid-0100 one tag (crosses chunk boundary)
    const tagRowsChunk1 = [
      {
        card_uuid: uuids[0],
        category: 'industry',
        raw_value: 'Tech',
        normalized_value: 'tech',
        tag_source: 'auto_keyword',
      },
    ];
    const tagRowsChunk2 = [
      {
        card_uuid: uuids[100],
        category: 'industry',
        raw_value: 'Finance',
        normalized_value: 'finance',
        tag_source: 'auto_keyword',
      },
    ];

    const makePrepared = () => ({
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [] }),
      run: vi.fn(),
      first: vi.fn(),
    });

    const preparedStatements: ReturnType<typeof makePrepared>[] = [];

    const batchMock = vi.fn().mockImplementation(async (stmts: any[]) => {
      // Return chunk results in order: chunk 0 → tagRowsChunk1, chunk 1 → tagRowsChunk2
      return stmts.map((_stmt: any, i: number) => ({
        results: i === 0 ? tagRowsChunk1 : i === 1 ? tagRowsChunk2 : [],
      }));
    });

    const prepareMock = vi.fn().mockImplementation(() => {
      const stmt = makePrepared();
      preparedStatements.push(stmt);
      return stmt;
    });

    mockEnv = {
      DB: {
        prepare: prepareMock,
        batch: batchMock,
      } as any,
    };

    // First prepare call is the main UNION ALL query (returns all 150 cards)
    prepareMock.mockImplementationOnce(() => ({
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: cards }),
      run: vi.fn(),
      first: vi.fn(),
    }));
    // Reset for tag chunk queries
    prepareMock.mockImplementation(() => {
      const stmt = makePrepared();
      preparedStatements.push(stmt);
      return stmt;
    });

    const response = await handleListCards(mockRequest, mockEnv as Env);

    expect(response.status).toBe(200);

    const resp = await response.json() as any;
    const body = resp.data as any[];

    // All 150 cards returned
    expect(body).toHaveLength(150);

    // batch() called once with 2 chunks (100 + 50)
    expect(batchMock).toHaveBeenCalledTimes(1);
    const batchArgs = batchMock.mock.calls[0][0] as any[];
    expect(batchArgs).toHaveLength(2); // ceil(150/100) = 2 chunks

    // Card at index 0 has its tag from chunk 1
    const card0 = body.find((c: any) => c.uuid === uuids[0]);
    expect(card0).toBeDefined();
    expect(card0.tags).toHaveLength(1);
    expect(card0.tags[0]).toEqual({ category: 'industry', raw: 'Tech', normalized: 'tech' });

    // Card at index 100 has its tag from chunk 2
    const card100 = body.find((c: any) => c.uuid === uuids[100]);
    expect(card100).toBeDefined();
    expect(card100.tags).toHaveLength(1);
    expect(card100.tags[0]).toEqual({ category: 'industry', raw: 'Finance', normalized: 'finance' });

    // Cards without tags have empty arrays
    const card50 = body.find((c: any) => c.uuid === uuids[50]);
    expect(card50).toBeDefined();
    expect(card50.tags).toEqual([]);
  });

  it('uses a single batch statement when cards <= 100', async () => {
    const uuids = makeUuids(50);
    const cards = uuids.map(uuid => makeCard(uuid));

    const batchMock = vi.fn().mockResolvedValue([{ results: [] }]);
    const prepareMock = vi.fn()
      .mockImplementationOnce(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: cards }),
      }))
      .mockImplementation(() => ({
        bind: vi.fn().mockReturnThis(),
      }));

    mockEnv = {
      DB: {
        prepare: prepareMock,
        batch: batchMock,
      } as any,
    };

    const response = await handleListCards(mockRequest, mockEnv as Env);
    expect(response.status).toBe(200);

    expect(batchMock).toHaveBeenCalledTimes(1);
    const batchArgs = batchMock.mock.calls[0][0] as any[];
    expect(batchArgs).toHaveLength(1); // single chunk
  });

  it('returns 200 with empty tags array when user has no cards', async () => {
    const prepareMock = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [] }),
    });
    const batchMock = vi.fn();

    mockEnv = {
      DB: {
        prepare: prepareMock,
        batch: batchMock,
      } as any,
    };

    const response = await handleListCards(mockRequest, mockEnv as Env);
    expect(response.status).toBe(200);
    const resp = await response.json() as any;
    expect(resp.data).toEqual([]);
    // batch should NOT be called when there are no cards
    expect(batchMock).not.toHaveBeenCalled();
  });
});

describe('BDD: cursor-based pagination for received-cards list', () => {
  let mockEnv: Partial<Env>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(oauthMiddleware, 'verifyOAuth').mockResolvedValue({
      email: 'test@example.com',
    } as any);
  });

  // Scenario 1: First page with limit (no cursor)
  it('Scenario 1: first page returns 50 cards, hasMore: true, and nextCursor', async () => {
    // DB returns limit+1=51 cards (prefetch triggers hasMore)
    const uuids = makeUuids(51);
    const fetchedCards = uuids.map((uuid, i) => makeCard(uuid, String(2000000 - i)));

    const batchMock = vi.fn().mockResolvedValue([{ results: [] }]);
    const prepareMock = vi.fn()
      .mockImplementationOnce(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: fetchedCards }),
      }))
      .mockImplementation(() => ({ bind: vi.fn().mockReturnThis() }));

    mockEnv = { DB: { prepare: prepareMock, batch: batchMock } as any };

    const request = new Request('https://example.com/api/user/received-cards?limit=50', {
      headers: { Authorization: 'Bearer mock-token' },
    });

    const response = await handleListCards(request, mockEnv as Env);
    expect(response.status).toBe(200);

    const resp = await response.json() as any;
    expect(resp.data.cards).toHaveLength(50);
    expect(resp.data.hasMore).toBe(true);
    expect(resp.data.nextCursor).toBeTypeOf('string');
    expect(resp.data.nextCursor).not.toBeNull();

    // nextCursor decodes to the 50th card's sort_ts and uuid
    const decoded = JSON.parse(atob(
      resp.data.nextCursor.replace(/-/g, '+').replace(/_/g, '/') +
      '='.repeat((4 - resp.data.nextCursor.length % 4) % 4)
    ));
    expect(decoded.t).toBe(Number(fetchedCards[49].sort_ts));
    expect(decoded.u).toBe(fetchedCards[49].uuid);
  });

  // Scenario 2: Next page with cursor
  it('Scenario 2: cursor page returns next 50 cards with hasMore: true', async () => {
    const uuids = makeUuids(51);
    const fetchedCards = uuids.map((uuid, i) => makeCard(uuid, String(1000050 - i)));

    const batchMock = vi.fn().mockResolvedValue([{ results: [] }]);
    const prepareMock = vi.fn()
      .mockImplementationOnce(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: fetchedCards }),
      }))
      .mockImplementation(() => ({ bind: vi.fn().mockReturnThis() }));

    mockEnv = { DB: { prepare: prepareMock, batch: batchMock } as any };

    const cursor = encodeCursor(1000100, 'card-uuid-0049');
    const request = new Request(
      `https://example.com/api/user/received-cards?limit=50&cursor=${cursor}`,
      { headers: { Authorization: 'Bearer mock-token' } }
    );

    const response = await handleListCards(request, mockEnv as Env);
    expect(response.status).toBe(200);

    const resp = await response.json() as any;
    expect(resp.data.cards).toHaveLength(50);
    expect(resp.data.hasMore).toBe(true);
    expect(resp.data.nextCursor).toBeTypeOf('string');
  });

  // Scenario 3: Last page
  it('Scenario 3: last page returns remaining cards, hasMore: false, nextCursor: null', async () => {
    const fetchedCards = [makeCard('card-uuid-0100', '1000100')];

    const batchMock = vi.fn().mockResolvedValue([{ results: [] }]);
    const prepareMock = vi.fn()
      .mockImplementationOnce(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: fetchedCards }),
      }))
      .mockImplementation(() => ({ bind: vi.fn().mockReturnThis() }));

    mockEnv = { DB: { prepare: prepareMock, batch: batchMock } as any };

    const cursor = encodeCursor(1000150, 'card-uuid-0049');
    const request = new Request(
      `https://example.com/api/user/received-cards?limit=50&cursor=${cursor}`,
      { headers: { Authorization: 'Bearer mock-token' } }
    );

    const response = await handleListCards(request, mockEnv as Env);
    expect(response.status).toBe(200);

    const resp = await response.json() as any;
    expect(resp.data.cards).toHaveLength(1);
    expect(resp.data.hasMore).toBe(false);
    expect(resp.data.nextCursor).toBeNull();
  });

  // Scenario 4: Backward compatibility (no params)
  it('Scenario 4: no params returns flat array (backward compat, no pagination fields)', async () => {
    const uuids = makeUuids(5);
    const cards = uuids.map(uuid => makeCard(uuid));

    const batchMock = vi.fn().mockResolvedValue([{ results: [] }]);
    const prepareMock = vi.fn()
      .mockImplementationOnce(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: cards }),
      }))
      .mockImplementation(() => ({ bind: vi.fn().mockReturnThis() }));

    mockEnv = { DB: { prepare: prepareMock, batch: batchMock } as any };

    const request = new Request('https://example.com/api/user/received-cards', {
      headers: { Authorization: 'Bearer mock-token' },
    });

    const response = await handleListCards(request, mockEnv as Env);
    expect(response.status).toBe(200);

    const resp = await response.json() as any;
    expect(Array.isArray(resp.data)).toBe(true);
    expect(resp.data).toHaveLength(5);
    // No pagination wrapper fields on the flat array response
    expect(resp.data).not.toHaveProperty('nextCursor');
    expect(resp.data).not.toHaveProperty('hasMore');
    expect(resp.data).not.toHaveProperty('cards');
  });

  // Scenario 5: Invalid cursor
  it('Scenario 5: invalid cursor returns 400 INVALID_CURSOR', async () => {
    mockEnv = { DB: { prepare: vi.fn(), batch: vi.fn() } as any };

    const request = new Request(
      'https://example.com/api/user/received-cards?limit=50&cursor=' +
        encodeCursor(0, '').replace(/./g, 'X'), // corrupt the cursor
      { headers: { Authorization: 'Bearer mock-token' } }
    );

    const response = await handleListCards(request, mockEnv as Env);
    expect(response.status).toBe(400);

    const resp = await response.json() as any;
    expect(resp.error.code).toBe('INVALID_CURSOR');
  });

  it('Scenario 5b: cursor with wrong JSON shape returns 400 INVALID_CURSOR', async () => {
    mockEnv = { DB: { prepare: vi.fn(), batch: vi.fn() } as any };

    // Valid base64url but JSON missing required fields
    const badCursor = btoa(JSON.stringify({ x: 1 }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const request = new Request(
      `https://example.com/api/user/received-cards?limit=50&cursor=${badCursor}`,
      { headers: { Authorization: 'Bearer mock-token' } }
    );

    const response = await handleListCards(request, mockEnv as Env);
    expect(response.status).toBe(400);

    const resp = await response.json() as any;
    expect(resp.error.code).toBe('INVALID_CURSOR');
  });

  // Scenario 6: Own + shared cards unified pagination
  it('Scenario 6: shared cards have source: "shared" and shared_by populated', async () => {
    const ownCard = { ...makeCard('own-card-001', '2000000'), source: 'own', shared_by: null };
    const sharedCard = {
      ...makeCard('shared-card-001', '1999000'),
      source: 'shared',
      shared_by: 'sharer@example.com',
    };

    const batchMock = vi.fn().mockResolvedValue([{ results: [] }]);
    const prepareMock = vi.fn()
      .mockImplementationOnce(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [ownCard, sharedCard] }),
      }))
      .mockImplementation(() => ({ bind: vi.fn().mockReturnThis() }));

    mockEnv = { DB: { prepare: prepareMock, batch: batchMock } as any };

    const request = new Request('https://example.com/api/user/received-cards?limit=50', {
      headers: { Authorization: 'Bearer mock-token' },
    });

    const response = await handleListCards(request, mockEnv as Env);
    expect(response.status).toBe(200);

    const resp = await response.json() as any;
    expect(resp.data.cards).toHaveLength(2);

    const own = resp.data.cards.find((c: any) => c.uuid === 'own-card-001');
    expect(own.source).toBe('own');

    const shared = resp.data.cards.find((c: any) => c.uuid === 'shared-card-001');
    expect(shared.source).toBe('shared');
    expect(shared.shared_by).toBe('sharer@example.com');
  });
});
