/**
 * BDD Test: vCard Compatibility Testing
 * Ensures cross-platform compatibility with vCard 3.0 format
 *
 * Test Coverage:
 * - Scenario 1: Basic vCard format validation
 * - Scenario 2: Special character escaping
 * - Scenario 3: Complete field validation
 * - Scenario 4: Missing optional fields
 * - Scenario 5: Tenant isolation
 * - Scenario 6: CRLF line endings
 * - Scenario 7: UTF-8 encoding with BOM
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateVCard, handleGetVCard } from '../src/handlers/user/received-cards/vcard';
import type { Env } from '../src/types';

/**
 * ReceivedCard interface for testing
 */
interface ReceivedCard {
  uuid: string;
  user_email: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  organization?: string | null;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  note?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// =============================================================================
// Scenario 1: Basic vCard Format Validation
// =============================================================================

describe('Scenario 1: Basic vCard Format Validation', () => {
  it('should generate basic vCard with minimal fields', () => {
    // Given: A simple card with only required fields
    const card: ReceivedCard = {
      uuid: 'test-uuid-001',
      user_email: 'owner@example.com',
      full_name: '測試使用者',
      created_at: '2024-01-01T00:00:00Z'
    };

    // When: Generate vCard
    const vcard = generateVCard(card);

    // Then: Should contain correct vCard format
    expect(vcard).toContain('BEGIN:VCARD');
    expect(vcard).toContain('VERSION:3.0');
    expect(vcard).toContain('FN:測試使用者');
    expect(vcard).toContain('N:測試使用者;;;;');
    expect(vcard).toContain('END:VCARD');
  });

  it('should have exactly 5 lines for minimal vCard', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-002',
      user_email: 'owner@example.com',
      full_name: '簡單名片',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);
    const lines = vcard.split('\r\n');

    // BEGIN:VCARD, VERSION:3.0, FN:..., N:..., END:VCARD
    expect(lines).toHaveLength(5);
  });

  it('should support CJK characters in full_name', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-003',
      user_email: 'owner@example.com',
      full_name: '吳勝繙',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    expect(vcard).toContain('FN:吳勝繙');
    expect(vcard).toContain('N:吳勝繙;;;;');
  });
});

// =============================================================================
// Scenario 2: Special Character Escaping
// =============================================================================

describe('Scenario 2: Special Character Escaping', () => {
  it('should escape comma (,) in names', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-004',
      user_email: 'owner@example.com',
      full_name: 'Last, First',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    // Comma should be escaped
    expect(vcard).toContain('FN:Last\\, First');
    expect(vcard).toContain('N:Last\\, First;;;;');
  });

  it('should escape semicolon (;) in organization', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-005',
      user_email: 'owner@example.com',
      full_name: 'Test User',
      organization: 'Company; Department',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    expect(vcard).toContain('ORG:Company\\; Department');
  });

  it('should escape backslash (\\) in names', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-006',
      user_email: 'owner@example.com',
      full_name: 'Test\\User',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    // Backslash should be escaped
    expect(vcard).toContain('FN:Test\\\\User');
  });

  it('should escape newlines (\\n) in notes', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-007',
      user_email: 'owner@example.com',
      full_name: 'Test User',
      note: 'Line 1\nLine 2\nLine 3',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    // Newlines should be escaped as \\n
    expect(vcard).toContain('NOTE:Line 1\\nLine 2\\nLine 3');
  });

  it('should escape CRLF (\\r\\n) in notes', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-008',
      user_email: 'owner@example.com',
      full_name: 'Test User',
      note: 'Line 1\r\nLine 2',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    expect(vcard).toContain('NOTE:Line 1\\nLine 2');
  });

  it('should handle multiple special characters in one field', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-009',
      user_email: 'owner@example.com',
      full_name: 'Test, User; Name\\Test',
      organization: 'Company, Inc.',
      note: 'Line 1\nLine 2',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    expect(vcard).toContain('FN:Test\\, User\\; Name\\\\Test');
    expect(vcard).toContain('ORG:Company\\, Inc.');
    expect(vcard).toContain('NOTE:Line 1\\nLine 2');
  });
});

// =============================================================================
// Scenario 3: Complete Field Validation
// =============================================================================

describe('Scenario 3: Complete Field Validation', () => {
  it('should include all fields when provided', () => {
    // Given: Card with all fields
    const card: ReceivedCard = {
      uuid: 'test-uuid-010',
      user_email: 'owner@example.com',
      full_name: '吳勝繙',
      first_name: '勝繙',
      last_name: '吳',
      organization: '數位發展部',
      title: '科長',
      phone: '+886-912-345-678',
      email: 'user@example.com',
      website: 'https://moda.gov.tw',
      address: '台北市中正區寶慶路3號',
      note: '展會交換的名片',
      created_at: '2024-01-01T00:00:00Z'
    };

    // When: Generate vCard
    const vcard = generateVCard(card);

    // Then: All fields should be present
    expect(vcard).toContain('BEGIN:VCARD');
    expect(vcard).toContain('VERSION:3.0');
    expect(vcard).toContain('FN:吳勝繙');
    expect(vcard).toContain('N:吳;勝繙;;;');
    expect(vcard).toContain('ORG:數位發展部');
    expect(vcard).toContain('TITLE:科長');
    expect(vcard).toContain('TEL;TYPE=CELL:+886-912-345-678');
    expect(vcard).toContain('EMAIL:user@example.com');
    expect(vcard).toContain('URL:https://moda.gov.tw');
    expect(vcard).toContain('ADR:;;台北市中正區寶慶路3號;;;;');
    expect(vcard).toContain('NOTE:展會交換的名片');
    expect(vcard).toContain('END:VCARD');
  });

  it('should use structured name when first_name and last_name are provided', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-011',
      user_email: 'owner@example.com',
      full_name: 'John Doe',
      first_name: 'John',
      last_name: 'Doe',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    // N field should use last_name;first_name format
    expect(vcard).toContain('N:Doe;John;;;');
  });

  it('should have correct field count for complete vCard', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-012',
      user_email: 'owner@example.com',
      full_name: 'Complete Card',
      organization: 'Org',
      title: 'Title',
      phone: '+1234567890',
      email: 'test@example.com',
      website: 'https://example.com',
      address: 'Address',
      note: 'Note',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);
    const lines = vcard.split('\r\n');

    // BEGIN + VERSION + FN + N + ORG + TITLE + TEL + EMAIL + URL + ADR + NOTE + END = 12
    expect(lines).toHaveLength(12);
  });
});

// =============================================================================
// Scenario 4: Missing Optional Fields
// =============================================================================

describe('Scenario 4: Missing Optional Fields', () => {
  it('should only include required fields when optional fields are null', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-013',
      user_email: 'owner@example.com',
      full_name: '簡單名片',
      first_name: null,
      last_name: null,
      organization: null,
      title: null,
      phone: null,
      email: null,
      website: null,
      address: null,
      note: null,
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    // Should only contain required fields
    expect(vcard).toContain('BEGIN:VCARD');
    expect(vcard).toContain('VERSION:3.0');
    expect(vcard).toContain('FN:簡單名片');
    expect(vcard).toContain('N:簡單名片;;;;');
    expect(vcard).toContain('END:VCARD');

    // Should NOT contain optional fields
    expect(vcard).not.toContain('ORG:');
    expect(vcard).not.toContain('TITLE:');
    expect(vcard).not.toContain('TEL:');
    expect(vcard).not.toContain('EMAIL:');
    expect(vcard).not.toContain('URL:');
    expect(vcard).not.toContain('ADR:');
    expect(vcard).not.toContain('NOTE:');
  });

  it('should only include required fields when optional fields are undefined', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-014',
      user_email: 'owner@example.com',
      full_name: 'Minimal Card',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);
    const lines = vcard.split('\r\n');

    // Should have exactly 5 lines (minimal vCard)
    expect(lines).toHaveLength(5);
  });

  it('should include partial optional fields', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-015',
      user_email: 'owner@example.com',
      full_name: 'Partial Card',
      email: 'partial@example.com',
      phone: '+1234567890',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    // Should include provided optional fields
    expect(vcard).toContain('EMAIL:partial@example.com');
    expect(vcard).toContain('TEL;TYPE=CELL:+1234567890');

    // Should NOT include unprovided optional fields
    expect(vcard).not.toContain('ORG:');
    expect(vcard).not.toContain('TITLE:');
    expect(vcard).not.toContain('URL:');
    expect(vcard).not.toContain('ADR:');
    expect(vcard).not.toContain('NOTE:');
  });
});

// =============================================================================
// Scenario 5: Tenant Isolation
// =============================================================================

describe('Scenario 5: Tenant Isolation', () => {
  let mockEnv: Env;

  beforeEach(() => {
    // Mock environment with DB
    mockEnv = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null) // Default: no card found
          })
        })
      } as any,
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      JWT_SECRET: 'test-jwt-secret-32-chars-long!!!'
    } as Env;

    // Mock verifyOAuth to return authenticated user
    vi.mock('../src/middleware/oauth', () => ({
      verifyOAuth: vi.fn().mockResolvedValue({
        email: 'user-a@example.com',
        name: 'User A'
      })
    }));
  });

  it('should return 404 when trying to access another users card', async () => {
    // Given: User A is authenticated
    const { verifyOAuth } = await import('../src/middleware/oauth');
    vi.mocked(verifyOAuth).mockResolvedValue({
      email: 'user-a@example.com',
      name: 'User A'
    });

    // Database returns no card (tenant isolation)
    const mockFirst = vi.fn().mockResolvedValue(null);
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    mockEnv.DB.prepare = mockPrepare;

    const request = new Request('https://db-card.moda.gov.tw/api/user/received-cards/user-b-card-uuid/vcard');

    // When: User A tries to access User B's card
    const response = await handleGetVCard(request, mockEnv, 'user-b-card-uuid');

    // Then: Should return 404
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty('error', 'CARD_NOT_FOUND');
    expect(body).toHaveProperty('message', 'Card not found or not authorized');

    // Verify tenant isolation in DB query
    expect(mockPrepare).toHaveBeenCalled();
    expect(mockBind).toHaveBeenCalledWith('user-b-card-uuid', 'user-a@example.com');
  });

  it('should not reveal card existence for unauthorized access', async () => {
    // Given: User trying to access non-existent card
    const { verifyOAuth } = await import('../src/middleware/oauth');
    vi.mocked(verifyOAuth).mockResolvedValue({
      email: 'user@example.com',
      name: 'User'
    });

    const mockFirst = vi.fn().mockResolvedValue(null);
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    mockEnv.DB.prepare = mockPrepare;

    const request = new Request('https://db-card.moda.gov.tw/api/user/received-cards/non-existent-uuid/vcard');

    // When: Access non-existent card
    const response = await handleGetVCard(request, mockEnv, 'non-existent-uuid');

    // Then: Should return same 404 error (resource hiding)
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty('error', 'CARD_NOT_FOUND');
    // Should not distinguish between "not found" and "unauthorized"
  });

  it('should successfully return vCard for authorized access', async () => {
    // Given: User accessing their own card
    const { verifyOAuth } = await import('../src/middleware/oauth');
    vi.mocked(verifyOAuth).mockResolvedValue({
      email: 'owner@example.com',
      name: 'Owner'
    });

    const mockCard = {
      uuid: 'test-uuid-016',
      user_email: 'owner@example.com',
      full_name: 'Test User',
      created_at: '2024-01-01T00:00:00Z'
    };

    const mockFirst = vi.fn().mockResolvedValue(mockCard);
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    mockEnv.DB.prepare = mockPrepare;

    const request = new Request('https://db-card.moda.gov.tw/api/user/received-cards/test-uuid-016/vcard');

    // When: Owner accesses their own card
    const response = await handleGetVCard(request, mockEnv, 'test-uuid-016');

    // Then: Should return 200 with vCard
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/vcard; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
  });
});

// =============================================================================
// Scenario 6: CRLF Line Endings Validation
// =============================================================================

describe('Scenario 6: CRLF Line Endings Validation', () => {
  it('should use CRLF (\\r\\n) line endings', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-017',
      user_email: 'owner@example.com',
      full_name: '測試',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    // Should contain CRLF
    expect(vcard).toContain('\r\n');

    // Split by CRLF should produce multiple lines
    const lines = vcard.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
  });

  it('should not contain standalone LF (\\n)', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-018',
      user_email: 'owner@example.com',
      full_name: 'Test User',
      organization: 'Company',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    // Should NOT contain standalone LF (without preceding CR)
    // Check that there are no \n not preceded by \r
    const standaloneNewlines = vcard.match(/[^\r]\n/g);
    expect(standaloneNewlines).toBeNull();
  });

  it('should have consistent CRLF endings across all lines', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-019',
      user_email: 'owner@example.com',
      full_name: 'Complete Card',
      organization: 'Org',
      title: 'Title',
      phone: '+1234567890',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    // Count CRLF occurrences
    const crlfCount = (vcard.match(/\r\n/g) || []).length;

    // Split by CRLF
    const lines = vcard.split('\r\n');

    // CRLF count should be lines.length - 1
    expect(crlfCount).toBe(lines.length - 1);
  });

  it('should maintain CRLF after escaping special characters', () => {
    const card: ReceivedCard = {
      uuid: 'test-uuid-020',
      user_email: 'owner@example.com',
      full_name: 'Test, User',
      note: 'Line 1\nLine 2',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    // Should use CRLF for line endings
    expect(vcard.split('\r\n').length).toBeGreaterThan(1);

    // Internal newlines in NOTE should be escaped as \\n
    expect(vcard).toContain('NOTE:Line 1\\nLine 2');
  });
});

// =============================================================================
// Scenario 7: UTF-8 BOM Validation
// =============================================================================

describe('Scenario 7: UTF-8 BOM Validation', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn()
          })
        })
      } as any,
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      JWT_SECRET: 'test-jwt-secret-32-chars-long!!!'
    } as Env;

    vi.mock('../src/middleware/oauth', () => ({
      verifyOAuth: vi.fn().mockResolvedValue({
        email: 'owner@example.com',
        name: 'Owner'
      })
    }));
  });

  it('should return Content-Type with UTF-8 charset', async () => {
    const { verifyOAuth } = await import('../src/middleware/oauth');
    vi.mocked(verifyOAuth).mockResolvedValue({
      email: 'owner@example.com',
      name: 'Owner'
    });

    const mockCard = {
      uuid: 'test-uuid-021',
      user_email: 'owner@example.com',
      full_name: '測試使用者',
      created_at: '2024-01-01T00:00:00Z'
    };

    const mockFirst = vi.fn().mockResolvedValue(mockCard);
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    mockEnv.DB.prepare = vi.fn().mockReturnValue({ bind: mockBind });

    const request = new Request('https://db-card.moda.gov.tw/api/user/received-cards/test-uuid-021/vcard');

    // When: Generate vCard response
    const response = await handleGetVCard(request, mockEnv, 'test-uuid-021');

    // Then: Should have UTF-8 charset in Content-Type
    const contentType = response.headers.get('Content-Type');
    expect(contentType).toBe('text/vcard; charset=utf-8');
  });

  it('should include UTF-8 BOM in response body', async () => {
    const { verifyOAuth } = await import('../src/middleware/oauth');
    vi.mocked(verifyOAuth).mockResolvedValue({
      email: 'owner@example.com',
      name: 'Owner'
    });

    const mockCard = {
      uuid: 'test-uuid-022',
      user_email: 'owner@example.com',
      full_name: '中文名片',
      created_at: '2024-01-01T00:00:00Z'
    };

    const mockFirst = vi.fn().mockResolvedValue(mockCard);
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    mockEnv.DB.prepare = vi.fn().mockReturnValue({ bind: mockBind });

    const request = new Request('https://db-card.moda.gov.tw/api/user/received-cards/test-uuid-022/vcard');

    // When: Generate vCard response
    const response = await handleGetVCard(request, mockEnv, 'test-uuid-022');

    // Then: Body should start with UTF-8 BOM
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // UTF-8 BOM: 0xEF 0xBB 0xBF
    expect(bytes[0]).toBe(0xEF);
    expect(bytes[1]).toBe(0xBB);
    expect(bytes[2]).toBe(0xBF);
  });

  it('should correctly encode CJK characters with BOM', async () => {
    const { verifyOAuth } = await import('../src/middleware/oauth');
    vi.mocked(verifyOAuth).mockResolvedValue({
      email: 'owner@example.com',
      name: 'Owner'
    });

    const mockCard = {
      uuid: 'test-uuid-023',
      user_email: 'owner@example.com',
      full_name: '吳勝繙',
      organization: '數位發展部',
      created_at: '2024-01-01T00:00:00Z'
    };

    const mockFirst = vi.fn().mockResolvedValue(mockCard);
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    mockEnv.DB.prepare = vi.fn().mockReturnValue({ bind: mockBind });

    const request = new Request('https://db-card.moda.gov.tw/api/user/received-cards/test-uuid-023/vcard');

    // When: Generate vCard response
    const response = await handleGetVCard(request, mockEnv, 'test-uuid-023');

    // Then: Should decode correctly with UTF-8
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Skip BOM (first 3 bytes) and decode
    const textBytes = bytes.slice(3);
    const text = new TextDecoder('utf-8').decode(textBytes);

    expect(text).toContain('吳勝繙');
    expect(text).toContain('數位發展部');
  });

  it('should set Content-Disposition with sanitized filename', async () => {
    const { verifyOAuth } = await import('../src/middleware/oauth');
    vi.mocked(verifyOAuth).mockResolvedValue({
      email: 'owner@example.com',
      name: 'Owner'
    });

    const mockCard = {
      uuid: 'test-uuid-024',
      user_email: 'owner@example.com',
      full_name: '測試使用者',
      created_at: '2024-01-01T00:00:00Z'
    };

    const mockFirst = vi.fn().mockResolvedValue(mockCard);
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    mockEnv.DB.prepare = vi.fn().mockReturnValue({ bind: mockBind });

    const request = new Request('https://db-card.moda.gov.tw/api/user/received-cards/test-uuid-024/vcard');

    // When: Generate vCard response
    const response = await handleGetVCard(request, mockEnv, 'test-uuid-024');

    // Then: Should have attachment disposition with .vcf filename
    const disposition = response.headers.get('Content-Disposition');
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('filename="');
    expect(disposition).toContain('.vcf"');
  });
});
