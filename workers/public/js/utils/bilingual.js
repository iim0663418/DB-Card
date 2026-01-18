/**
 * Get localized text from single-language or bilingual value
 * @param {string|object} value - Single language string or {zh: string, en: string}
 * @param {string} language - Language code ('zh' or 'en')
 * @returns {string}
 */
export function getLocalizedText(value, language = 'zh') {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    return value[language] || value.zh || '';
  }
  return '';
}

/**
 * Get localized array from single-language or bilingual value
 * @param {Array|object} value - Single language array or {zh: Array, en: Array}
 * @param {string} language - Language code ('zh' or 'en')
 * @returns {Array}
 */
export function getLocalizedArray(value, language = 'zh') {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    const result = value[language] || value.zh;
    return Array.isArray(result) ? result : [];
  }
  return [];
}
