/**
 * 分析真實失敗卡片
 */

const realCard = {
  uuid: "1081934c-3a06-4923-bf65-4629df60620b",
  full_name: "胡淑嫻",
  organization: "中菲電腦股份有限公司",
  organization_en: "DIMERCO DATA SYSTEM CORPORATION",
  title: "副總經理",
  department: null,
  company_summary: "中菲電腦成立於1981年，為資訊服務業上櫃公司（股票代號5403）。主要經營金融與證券相關軟體開發、硬體代理及資料處理服務，總部設於台北，並於高雄設有分公司，具備ISO 9001認證。",
  personal_summary: "現任中菲電腦副總經理暨董事，具備豐富的系統分析與資訊服務資歷，長期深耕於金融軟體與公司治理領域。",
  email: "susan@ddsc.com.tw",
  phone: "+886-937-197-902",
  website: "http://www.ddsc.com.tw",
  address: "114067 台北市內湖區行愛路151號8樓",
  note: null,
};

// 模擬 generateCardText
function generateCardText(card) {
  const sections = [`Name: ${card.full_name}`];

  if (card.organization) {
    const orgLine = card.organization_en
      ? `Company: ${card.organization} (${card.organization_en})`
      : `Company: ${card.organization}`;
    sections.push(orgLine);
  }

  if (card.title) sections.push(`Title: ${card.title}`);
  if (card.department) sections.push(`Department: ${card.department}`);
  if (card.company_summary) sections.push(`Company Summary: ${card.company_summary}`);
  if (card.personal_summary) sections.push(`Personal Summary: ${card.personal_summary}`);

  const contact = [card.email, card.phone].filter(Boolean).join(', ');
  if (contact) sections.push(`Contact: ${contact}`);

  if (card.address) sections.push(`Address: ${card.address}`);
  if (card.website) sections.push(`Website: ${card.website}`);
  if (card.note) sections.push(`Note: ${card.note}`);

  return sections.join('\n');
}

// 分析函式
function analyzeText(text) {
  const issues = [];
  const warnings = [];

  // 檢查控制字元
  const controlChars = text.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g);
  if (controlChars) {
    issues.push(`Found ${controlChars.length} control characters`);
    controlChars.forEach((char, i) => {
      if (i < 5) { // 只顯示前 5 個
        issues.push(`  - 0x${char.charCodeAt(0).toString(16).padStart(2, '0')} at position ${text.indexOf(char)}`);
      }
    });
  }

  // 檢查長度
  if (text.length < 10) warnings.push(`Text too short: ${text.length} chars`);
  if (text.length > 8000) warnings.push(`Text too long: ${text.length} chars`);

  // 檢查空內容
  const contentLines = text.split('\n').filter(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return false;
    const value = line.substring(colonIndex + 1).trim();
    return value.length > 0;
  });

  if (contentLines.length === 0) {
    issues.push('No actual content');
  }

  return {
    issues,
    warnings,
    stats: {
      length: text.length,
      lines: text.split('\n').length,
      contentLines: contentLines.length,
      hasControlChars: controlChars !== null,
      controlCharCount: controlChars ? controlChars.length : 0,
    }
  };
}

// 執行分析
console.log('🔍 Analyzing Real Failed Card\n');
console.log('Card UUID:', realCard.uuid);
console.log('Name:', realCard.full_name);
console.log('Organization:', realCard.organization);
console.log('\n' + '='.repeat(60) + '\n');

const text = generateCardText(realCard);
const analysis = analyzeText(text);

console.log('📝 Generated Text:');
console.log('─'.repeat(60));
console.log(text);
console.log('─'.repeat(60));

console.log('\n📊 Statistics:');
console.log(`   Total length: ${analysis.stats.length} chars`);
console.log(`   Total lines: ${analysis.stats.lines}`);
console.log(`   Content lines: ${analysis.stats.contentLines}`);
console.log(`   Control chars: ${analysis.stats.hasControlChars ? '❌ YES' : '✅ NO'}`);
if (analysis.stats.controlCharCount > 0) {
  console.log(`   Control char count: ${analysis.stats.controlCharCount}`);
}

if (analysis.issues.length > 0) {
  console.log('\n❌ Issues (will cause API failure):');
  analysis.issues.forEach(issue => console.log(`   ${issue}`));
}

if (analysis.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  analysis.warnings.forEach(warning => console.log(`   ${warning}`));
}

if (analysis.issues.length === 0 && analysis.warnings.length === 0) {
  console.log('\n✅ No obvious issues detected');
  console.log('\n🤔 Possible causes:');
  console.log('   1. Gemini API rate limiting or quota exceeded');
  console.log('   2. Temporary API service issue');
  console.log('   3. Specific character combination that API rejects');
  console.log('   4. Request format issue (not text content)');
}

// 檢查特殊字元
console.log('\n🔬 Character Analysis:');
const uniqueChars = new Set(text);
const specialChars = Array.from(uniqueChars).filter(char => {
  const code = char.charCodeAt(0);
  return code < 32 || code === 127 || code > 127;
});

if (specialChars.length > 0) {
  console.log(`   Found ${specialChars.length} special/non-ASCII characters:`);
  specialChars.slice(0, 10).forEach(char => {
    const code = char.charCodeAt(0);
    console.log(`   - '${char}' (U+${code.toString(16).toUpperCase().padStart(4, '0')})`);
  });
} else {
  console.log('   All ASCII characters');
}

console.log('\n');
