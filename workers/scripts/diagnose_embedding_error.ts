/**
 * 診斷 Vectorize Sync Embedding API 400 錯誤
 * 
 * 使用方式：
 * npx tsx scripts/diagnose_embedding_error.ts <card_uuid>
 */

import type { ReceivedCardData } from '../src/types';

// 模擬 generateCardText 函式
function generateCardText(card: ReceivedCardData): string {
  const sections: string[] = [
    `Name: ${card.full_name}`,
  ];

  if (card.organization) {
    const orgLine = card.organization_en
      ? `Company: ${card.organization} (${card.organization_en})`
      : `Company: ${card.organization}`;
    sections.push(orgLine);
  }

  if (card.title)            sections.push(`Title: ${card.title}`);
  if (card.department)       sections.push(`Department: ${card.department}`);
  if (card.company_summary)  sections.push(`Company Summary: ${card.company_summary}`);
  if (card.personal_summary) sections.push(`Personal Summary: ${card.personal_summary}`);

  const contact = [card.email, card.phone].filter(Boolean).join(', ');
  if (contact) sections.push(`Contact: ${contact}`);

  if (card.address) sections.push(`Address: ${card.address}`);
  if (card.website) sections.push(`Website: ${card.website}`);
  if (card.note)    sections.push(`Note: ${card.note}`);

  return sections.join('\n');
}

// 分析文本可能的問題
function analyzeText(text: string): {
  issues: string[];
  warnings: string[];
  stats: {
    length: number;
    lines: number;
    hasControlChars: boolean;
    hasNullBytes: boolean;
    encoding: string;
  };
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // 統計資訊
  const stats = {
    length: text.length,
    lines: text.split('\n').length,
    hasControlChars: /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(text),
    hasNullBytes: text.includes('\0'),
    encoding: 'UTF-8',
  };

  // 檢查空文本
  if (text.trim().length === 0) {
    issues.push('Empty text after trimming');
  }

  // 檢查最小長度
  if (text.length < 10) {
    warnings.push(`Text too short: ${text.length} chars (minimum recommended: 10)`);
  }

  // 檢查控制字元
  if (stats.hasControlChars) {
    issues.push('Contains control characters (0x00-0x1F, 0x7F)');
  }

  // 檢查 null bytes
  if (stats.hasNullBytes) {
    issues.push('Contains null bytes (\\0)');
  }

  // 檢查超長文本（Gemini 限制通常是 2048 tokens ≈ 8000 chars）
  if (text.length > 8000) {
    warnings.push(`Text very long: ${text.length} chars (may exceed token limit)`);
  }

  // 檢查是否只有 "Name: " 標籤
  const contentLines = text.split('\n').filter(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return false;
    const value = line.substring(colonIndex + 1).trim();
    return value.length > 0;
  });

  if (contentLines.length === 0) {
    issues.push('No actual content (all fields empty)');
  } else if (contentLines.length === 1 && contentLines[0].startsWith('Name:')) {
    warnings.push('Only name field has content');
  }

  return { issues, warnings, stats };
}

// 主程式
async function main() {
  const cardUuid = process.argv[2];
  
  if (!cardUuid) {
    console.error('Usage: npx tsx scripts/diagnose_embedding_error.ts <card_uuid>');
    process.exit(1);
  }

  console.log(`\n🔍 Diagnosing card: ${cardUuid}\n`);

  // 模擬卡片資料（需要從資料庫查詢）
  console.log('⚠️  Note: This script needs database access to fetch actual card data.');
  console.log('   For now, it demonstrates the diagnostic logic.\n');

  // 範例：測試各種問題情境
  const testCases: Array<{ name: string; card: Partial<ReceivedCardData> }> = [
    {
      name: 'Empty card (only name)',
      card: { full_name: 'John Doe' },
    },
    {
      name: 'Card with null bytes',
      card: { full_name: 'John\0Doe', organization: 'Test\0Corp' },
    },
    {
      name: 'Card with control chars',
      card: { full_name: 'John Doe', organization: 'Test\x07Corp' },
    },
    {
      name: 'Normal card',
      card: {
        full_name: 'John Doe',
        organization: 'ACME Corp',
        title: 'Engineer',
        email: 'john@example.com',
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test Case: ${testCase.name}`);
    console.log('─'.repeat(60));

    const text = generateCardText(testCase.card as ReceivedCardData);
    const analysis = analyzeText(text);

    console.log('\n📊 Statistics:');
    console.log(`   Length: ${analysis.stats.length} chars`);
    console.log(`   Lines: ${analysis.stats.lines}`);
    console.log(`   Control chars: ${analysis.stats.hasControlChars ? '❌ YES' : '✅ NO'}`);
    console.log(`   Null bytes: ${analysis.stats.hasNullBytes ? '❌ YES' : '✅ NO'}`);

    if (analysis.issues.length > 0) {
      console.log('\n❌ Issues (will cause API failure):');
      analysis.issues.forEach(issue => console.log(`   • ${issue}`));
    }

    if (analysis.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      analysis.warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    if (analysis.issues.length === 0 && analysis.warnings.length === 0) {
      console.log('\n✅ No issues detected');
    }

    console.log('\n📝 Generated text:');
    console.log('─'.repeat(60));
    console.log(text.substring(0, 200) + (text.length > 200 ? '...' : ''));
    console.log('─'.repeat(60));
  }

  console.log('\n\n💡 Recommendations:');
  console.log('   1. Add pre-validation before calling Embedding API');
  console.log('   2. Filter out control characters and null bytes');
  console.log('   3. Ensure minimum content length (at least 10 chars)');
  console.log('   4. Log detailed error info when API returns 400');
  console.log('');
}

main().catch(console.error);
