/**
 * 通用名片類型識別工具
 * 全域標準化的 9 種名片類型識別邏輯
 */

// 9 種支援的名片類型定義
const CARD_TYPES = {
  INDEX: 'index',                    // 機關版-延平大樓 (index.html)
  INDEX1: 'index1',                  // 機關版-新光大樓 (index1.html)
  PERSONAL: 'personal',              // 個人版 (index-personal.html)
  BILINGUAL: 'bilingual',            // 雙語版-延平 (index-bilingual.html)
  BILINGUAL1: 'bilingual1',          // 雙語版-新光 (index1-bilingual.html)
  PERSONAL_BILINGUAL: 'personal-bilingual', // 個人雙語版 (index-bilingual-personal.html)
  EN: 'en',                          // 英文版-延平 (index-en.html)
  EN1: 'en1',                        // 英文版-新光 (index1-en.html)
  PERSONAL_EN: 'personal-en'         // 個人英文版 (index-personal-en.html)
};

/**
 * 通用名片類型識別函數
 * @param {any} data - 名片資料或 URL
 * @returns {string} CardType
 */
function identifyCardType(data) {
  // 處理字串 URL 輸入
  if (typeof data === 'string') {
    data = { url: data };
  }
  
  // URL 模式匹配 - 精確識別 9 種類型
  if (data.url) {
    const url = data.url.toLowerCase().trim();
    
    // 雙語版本
    if (url.includes('index1-bilingual.html')) return CARD_TYPES.BILINGUAL1;
    if (url.includes('index-bilingual-personal.html')) return CARD_TYPES.PERSONAL_BILINGUAL;
    if (url.includes('index-bilingual.html')) return CARD_TYPES.BILINGUAL;
    
    // 英文版本
    if (url.includes('index1-en.html')) return CARD_TYPES.EN1;
    if (url.includes('index-personal-en.html')) return CARD_TYPES.PERSONAL_EN;
    if (url.includes('index-en.html')) return CARD_TYPES.EN;
    
    // 個人版本
    if (url.includes('index-personal.html')) return CARD_TYPES.PERSONAL;
    
    // 機關版本
    if (url.includes('index1.html')) return CARD_TYPES.INDEX1;
    if (url.includes('index.html')) return CARD_TYPES.INDEX;
  }
  
  // 資料特徵備用識別
  const isBilingual = data.name?.includes('~') || data.title?.includes('~');
  const isGov = data.organization && data.department;
  const isShinGuang = data.address?.includes('新光') || data.address?.includes('松仁路');
  
  if (isBilingual) {
    return isGov ? (isShinGuang ? CARD_TYPES.BILINGUAL1 : CARD_TYPES.BILINGUAL) : CARD_TYPES.PERSONAL_BILINGUAL;
  }
  
  return isGov ? (isShinGuang ? CARD_TYPES.INDEX1 : CARD_TYPES.INDEX) : CARD_TYPES.PERSONAL;
}

/**
 * 檢查是否為政府機關版
 */
function isGovernmentCard(cardType) {
  return [CARD_TYPES.INDEX, CARD_TYPES.INDEX1, CARD_TYPES.BILINGUAL, CARD_TYPES.BILINGUAL1, CARD_TYPES.EN, CARD_TYPES.EN1].includes(cardType);
}

/**
 * 檢查是否為雙語版
 */
function isBilingualCard(cardType) {
  return [CARD_TYPES.BILINGUAL, CARD_TYPES.BILINGUAL1, CARD_TYPES.PERSONAL_BILINGUAL].includes(cardType);
}

/**
 * 檢查是否為英文版
 */
function isEnglishCard(cardType) {
  return [CARD_TYPES.EN, CARD_TYPES.EN1, CARD_TYPES.PERSONAL_EN].includes(cardType);
}

/**
 * 檢查是否為新光大樓版本
 */
function isShinGuangCard(cardType) {
  return [CARD_TYPES.INDEX1, CARD_TYPES.BILINGUAL1, CARD_TYPES.EN1].includes(cardType);
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
  // Node.js 環境
  module.exports = {
    CARD_TYPES,
    identifyCardType,
    isGovernmentCard,
    isBilingualCard,
    isEnglishCard,
    isShinGuangCard
  };
} else {
  // 瀏覽器環境
  window.CardTypeIdentifier = {
    CARD_TYPES,
    identifyCardType,
    isGovernmentCard,
    isBilingualCard,
    isEnglishCard,
    isShinGuangCard
  };
}