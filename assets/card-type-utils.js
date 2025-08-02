/**
 * 名片類型工具 - 瀏覽器版本
 * 整合到現有 assets 目錄，與 bilingual-common.js 等工具並列
 */

// 引入通用識別邏輯
const CARD_TYPES = {
  INDEX: 'index',
  INDEX1: 'index1',
  PERSONAL: 'personal',
  BILINGUAL: 'bilingual',
  BILINGUAL1: 'bilingual1',
  PERSONAL_BILINGUAL: 'personal-bilingual',
  EN: 'en',
  EN1: 'en1',
  PERSONAL_EN: 'personal-en'
};

function identifyCardType(data) {
  if (typeof data === 'string') data = { url: data };
  
  if (data.url) {
    const url = data.url.toLowerCase().trim();
    if (url.includes('index1-bilingual.html')) return CARD_TYPES.BILINGUAL1;
    if (url.includes('index-bilingual-personal.html')) return CARD_TYPES.PERSONAL_BILINGUAL;
    if (url.includes('index-bilingual.html')) return CARD_TYPES.BILINGUAL;
    if (url.includes('index1-en.html')) return CARD_TYPES.EN1;
    if (url.includes('index-personal-en.html')) return CARD_TYPES.PERSONAL_EN;
    if (url.includes('index-en.html')) return CARD_TYPES.EN;
    if (url.includes('index-personal.html')) return CARD_TYPES.PERSONAL;
    if (url.includes('index1.html')) return CARD_TYPES.INDEX1;
    if (url.includes('index.html')) return CARD_TYPES.INDEX;
  }
  
  const isBilingual = data.name?.includes('~') || data.title?.includes('~');
  const isGov = data.organization && data.department;
  const isShinGuang = data.address?.includes('新光') || data.address?.includes('松仁路');
  
  if (isBilingual) {
    return isGov ? (isShinGuang ? CARD_TYPES.BILINGUAL1 : CARD_TYPES.BILINGUAL) : CARD_TYPES.PERSONAL_BILINGUAL;
  }
  
  return isGov ? (isShinGuang ? CARD_TYPES.INDEX1 : CARD_TYPES.INDEX) : CARD_TYPES.PERSONAL;
}

// 全域可用
window.CARD_TYPES = CARD_TYPES;
window.identifyCardType = identifyCardType;