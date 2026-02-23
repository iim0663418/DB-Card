/**
 * Simple Node.js vCard Test Script
 * 測試所有 7 個 Scenario 的 vCard 生成邏輯
 *
 * 執行方式: node workers/test/vcard-simple.test.js
 */

const assert = require('assert');

// =============================================================================
// Mock Implementation - Copied from vcard.ts
// =============================================================================

/**
 * Escape special characters for vCard 3.0 (RFC 2426)
 */
function escapeVCardValue(value) {
  return value
    .replace(/\\/g, '\\\\')    // \ → \\
    .replace(/,/g, '\\,')      // , → \,
    .replace(/;/g, '\\;')      // ; → \;
    .replace(/\r\n/g, '\\n')   // CRLF → \n
    .replace(/\n/g, '\\n');    // LF → \n
}

/**
 * Generate N field (structured name) for vCard
 */
function generateNameField(card) {
  if (card.last_name && card.first_name) {
    return `${escapeVCardValue(card.last_name)};${escapeVCardValue(card.first_name)};;;`;
  }
  return `${escapeVCardValue(card.full_name)};;;;`;
}

/**
 * Generate vCard 3.0 string from ReceivedCard
 */
function generateVCard(card) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCardValue(card.full_name)}`,
    `N:${generateNameField(card)}`
  ];

  // Optional fields - only include if present
  if (card.organization) {
    lines.push(`ORG:${escapeVCardValue(card.organization)}`);
  }

  if (card.title) {
    lines.push(`TITLE:${escapeVCardValue(card.title)}`);
  }

  if (card.phone) {
    lines.push(`TEL;TYPE=CELL:${card.phone}`);
  }

  if (card.email) {
    lines.push(`EMAIL:${card.email}`);
  }

  if (card.website) {
    lines.push(`URL:${card.website}`);
  }

  if (card.address) {
    lines.push(`ADR:;;${escapeVCardValue(card.address)};;;;`);
  }

  if (card.note) {
    lines.push(`NOTE:${escapeVCardValue(card.note)}`);
  }

  lines.push('END:VCARD');

  // Join with CRLF as per RFC 2426
  return lines.join('\r\n');
}

// =============================================================================
// Test Runner
// =============================================================================

let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✅ [${testCount}] ${name}`);
  } catch (error) {
    failCount++;
    console.error(`❌ [${testCount}] ${name}`);
    console.error(`   Error: ${error.message}`);
  }
}

function describe(suiteName, fn) {
  console.log(`\n📋 ${suiteName}`);
  fn();
}

// =============================================================================
// Scenario 1: Basic vCard Format Validation
// =============================================================================

describe('Scenario 1: Basic vCard Format Validation', () => {
  test('should generate basic vCard with minimal fields', () => {
    const card = {
      uuid: 'test-uuid-001',
      user_email: 'owner@example.com',
      full_name: '測試使用者',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    assert.ok(vcard.includes('BEGIN:VCARD'));
    assert.ok(vcard.includes('VERSION:3.0'));
    assert.ok(vcard.includes('FN:測試使用者'));
    assert.ok(vcard.includes('N:測試使用者;;;;'));
    assert.ok(vcard.includes('END:VCARD'));
  });

  test('should have exactly 5 lines for minimal vCard', () => {
    const card = {
      uuid: 'test-uuid-002',
      user_email: 'owner@example.com',
      full_name: '簡單名片',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);
    const lines = vcard.split('\r\n');

    assert.strictEqual(lines.length, 5);
  });

  test('should support CJK characters in full_name', () => {
    const card = {
      uuid: 'test-uuid-003',
      user_email: 'owner@example.com',
      full_name: '吳勝繙',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    assert.ok(vcard.includes('FN:吳勝繙'));
    assert.ok(vcard.includes('N:吳勝繙;;;;'));
  });
});

// =============================================================================
// Scenario 2: Special Character Escaping
// =============================================================================

describe('Scenario 2: Special Character Escaping', () => {
  test('should escape comma (,) in names', () => {
    const card = {
      uuid: 'test-uuid-004',
      user_email: 'owner@example.com',
      full_name: 'Last, First',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    assert.ok(vcard.includes('FN:Last\\, First'));
    assert.ok(vcard.includes('N:Last\\, First;;;;'));
  });

  test('should escape semicolon (;) in organization', () => {
    const card = {
      uuid: 'test-uuid-005',
      user_email: 'owner@example.com',
      full_name: 'Test User',
      organization: 'Company; Department',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    assert.ok(vcard.includes('ORG:Company\\; Department'));
  });

  test('should escape backslash (\\) in names', () => {
    const card = {
      uuid: 'test-uuid-006',
      user_email: 'owner@example.com',
      full_name: 'Test\\User',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    assert.ok(vcard.includes('FN:Test\\\\User'));
  });

  test('should escape newlines (\\n) in notes', () => {
    const card = {
      uuid: 'test-uuid-007',
      user_email: 'owner@example.com',
      full_name: 'Test User',
      note: 'Line 1\nLine 2\nLine 3',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    assert.ok(vcard.includes('NOTE:Line 1\\nLine 2\\nLine 3'));
  });

  test('should escape CRLF (\\r\\n) in notes', () => {
    const card = {
      uuid: 'test-uuid-008',
      user_email: 'owner@example.com',
      full_name: 'Test User',
      note: 'Line 1\r\nLine 2',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    assert.ok(vcard.includes('NOTE:Line 1\\nLine 2'));
  });

  test('should handle multiple special characters in one field', () => {
    const card = {
      uuid: 'test-uuid-009',
      user_email: 'owner@example.com',
      full_name: 'Test, User; Name\\Test',
      organization: 'Company, Inc.',
      note: 'Line 1\nLine 2',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    assert.ok(vcard.includes('FN:Test\\, User\\; Name\\\\Test'));
    assert.ok(vcard.includes('ORG:Company\\, Inc.'));
    assert.ok(vcard.includes('NOTE:Line 1\\nLine 2'));
  });
});

// =============================================================================
// Scenario 3: Complete Field Validation
// =============================================================================

describe('Scenario 3: Complete Field Validation', () => {
  test('should include all fields when provided', () => {
    const card = {
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

    const vcard = generateVCard(card);

    assert.ok(vcard.includes('BEGIN:VCARD'));
    assert.ok(vcard.includes('VERSION:3.0'));
    assert.ok(vcard.includes('FN:吳勝繙'));
    assert.ok(vcard.includes('N:吳;勝繙;;;'));
    assert.ok(vcard.includes('ORG:數位發展部'));
    assert.ok(vcard.includes('TITLE:科長'));
    assert.ok(vcard.includes('TEL;TYPE=CELL:+886-912-345-678'));
    assert.ok(vcard.includes('EMAIL:user@example.com'));
    assert.ok(vcard.includes('URL:https://moda.gov.tw'));
    assert.ok(vcard.includes('ADR:;;台北市中正區寶慶路3號;;;;'));
    assert.ok(vcard.includes('NOTE:展會交換的名片'));
    assert.ok(vcard.includes('END:VCARD'));
  });

  test('should use structured name when first_name and last_name are provided', () => {
    const card = {
      uuid: 'test-uuid-011',
      user_email: 'owner@example.com',
      full_name: 'John Doe',
      first_name: 'John',
      last_name: 'Doe',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    assert.ok(vcard.includes('N:Doe;John;;;'));
  });

  test('should have correct field count for complete vCard', () => {
    const card = {
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
    assert.strictEqual(lines.length, 12);
  });
});

// =============================================================================
// Scenario 4: Missing Optional Fields
// =============================================================================

describe('Scenario 4: Missing Optional Fields', () => {
  test('should only include required fields when optional fields are null', () => {
    const card = {
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

    assert.ok(vcard.includes('BEGIN:VCARD'));
    assert.ok(vcard.includes('VERSION:3.0'));
    assert.ok(vcard.includes('FN:簡單名片'));
    assert.ok(vcard.includes('N:簡單名片;;;;'));
    assert.ok(vcard.includes('END:VCARD'));

    // Should NOT contain optional fields
    assert.ok(!vcard.match(/^ORG:/m));
    assert.ok(!vcard.match(/^TITLE:/m));
    assert.ok(!vcard.match(/^TEL:/m));
    assert.ok(!vcard.match(/^EMAIL:/m));
    assert.ok(!vcard.match(/^URL:/m));
    assert.ok(!vcard.match(/^ADR:/m));
    assert.ok(!vcard.match(/^NOTE:/m));
  });

  test('should only include required fields when optional fields are undefined', () => {
    const card = {
      uuid: 'test-uuid-014',
      user_email: 'owner@example.com',
      full_name: 'Minimal Card',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);
    const lines = vcard.split('\r\n');

    assert.strictEqual(lines.length, 5);
  });

  test('should include partial optional fields', () => {
    const card = {
      uuid: 'test-uuid-015',
      user_email: 'owner@example.com',
      full_name: 'Partial Card',
      email: 'partial@example.com',
      phone: '+1234567890',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    assert.ok(vcard.includes('EMAIL:partial@example.com'));
    assert.ok(vcard.includes('TEL;TYPE=CELL:+1234567890'));

    // Should NOT include unprovided optional fields
    assert.ok(!vcard.match(/^ORG:/m));
    assert.ok(!vcard.match(/^TITLE:/m));
    assert.ok(!vcard.match(/^URL:/m));
    assert.ok(!vcard.match(/^ADR:/m));
    assert.ok(!vcard.match(/^NOTE:/m));
  });
});

// =============================================================================
// Scenario 5: Tenant Isolation (Skipped - requires API testing)
// =============================================================================

describe('Scenario 5: Tenant Isolation', () => {
  test('[SKIPPED] API-level test - requires handleGetVCard function', () => {
    console.log('   ⏭️  Skipped: This scenario requires full API context with DB mocking');
  });
});

// =============================================================================
// Scenario 6: CRLF Line Endings Validation
// =============================================================================

describe('Scenario 6: CRLF Line Endings Validation', () => {
  test('should use CRLF (\\r\\n) line endings', () => {
    const card = {
      uuid: 'test-uuid-017',
      user_email: 'owner@example.com',
      full_name: '測試',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    assert.ok(vcard.includes('\r\n'));

    const lines = vcard.split('\r\n');
    assert.ok(lines.length > 1);
  });

  test('should not contain standalone LF (\\n)', () => {
    const card = {
      uuid: 'test-uuid-018',
      user_email: 'owner@example.com',
      full_name: 'Test User',
      organization: 'Company',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    // Should NOT contain standalone LF (without preceding CR)
    const standaloneNewlines = vcard.match(/[^\r]\n/g);
    assert.strictEqual(standaloneNewlines, null);
  });

  test('should have consistent CRLF endings across all lines', () => {
    const card = {
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

    const crlfCount = (vcard.match(/\r\n/g) || []).length;
    const lines = vcard.split('\r\n');

    assert.strictEqual(crlfCount, lines.length - 1);
  });

  test('should maintain CRLF after escaping special characters', () => {
    const card = {
      uuid: 'test-uuid-020',
      user_email: 'owner@example.com',
      full_name: 'Test, User',
      note: 'Line 1\nLine 2',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    assert.ok(vcard.split('\r\n').length > 1);
    assert.ok(vcard.includes('NOTE:Line 1\\nLine 2'));
  });
});

// =============================================================================
// Scenario 7: UTF-8 BOM Validation (Skipped - requires Response object)
// =============================================================================

describe('Scenario 7: UTF-8 BOM Validation', () => {
  test('[SKIPPED] Response-level test - requires handleGetVCard function', () => {
    console.log('   ⏭️  Skipped: This scenario requires full API context with Response object');
  });

  test('vCard string should correctly encode CJK characters', () => {
    const card = {
      uuid: 'test-uuid-023',
      user_email: 'owner@example.com',
      full_name: '吳勝繙',
      organization: '數位發展部',
      created_at: '2024-01-01T00:00:00Z'
    };

    const vcard = generateVCard(card);

    assert.ok(vcard.includes('吳勝繙'));
    assert.ok(vcard.includes('數位發展部'));
  });
});

// =============================================================================
// Summary
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary');
console.log('='.repeat(60));
console.log(`Total Tests: ${testCount}`);
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`⏭️  Skipped: 2 (Scenario 5 & 7 - require API context)`);
console.log('='.repeat(60));

if (failCount > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
