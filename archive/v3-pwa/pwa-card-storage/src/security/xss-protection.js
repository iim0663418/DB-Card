/**
 * XSS Protection Module - Enhanced Context-Aware Encoding
 * Implements OWASP XSS Prevention Cheat Sheet recommendations
 * Fixes CWE-79/80: Cross-site Scripting vulnerabilities
 * 
 * @version 1.0.0
 * @security Critical - CWE-79/80 Protection
 */

import { escapeHtml, validateInput } from './input-sanitizer.js';

/**
 * Context-aware XSS protection with OWASP compliance
 * Replaces dangerous innerHTML usage throughout the application
 */
export class XSSProtection {
  
  /**
   * Safely set text content (replaces innerHTML for text)
   * @param {HTMLElement} element - Target DOM element
   * @param {string} content - Content to set
   * @param {Object} options - Security options
   */
  static setTextContent(element, content, options = {}) {
    if (!element || !element.nodeType) {
      throw new Error('Invalid DOM element provided');
    }
    
    const { maxLength = 1000, allowEmpty = true } = options;
    
    // Validate input
    const validation = validateInput(content, { maxInputLength: maxLength });
    if (!validation.valid && !allowEmpty) {
      console.warn('[XSS Protection] Invalid content blocked:', validation.reason);
      return false;
    }
    
    // Use textContent for safe text insertion
    element.textContent = validation.sanitized || '';
    return true;
  }
  
  /**
   * Safely set HTML content with whitelist approach
   * @param {HTMLElement} element - Target DOM element  
   * @param {string} content - HTML content to set
   * @param {Object} options - Security options
   */
  static setHTMLContent(element, content, options = {}) {
    if (!element || !element.nodeType) {
      throw new Error('Invalid DOM element provided');
    }
    
    const { allowedTags = [], allowedAttributes = [] } = options;
    
    // Clear existing content safely
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    
    // If no HTML tags allowed, use text content
    if (allowedTags.length === 0) {
      return this.setTextContent(element, content, options);
    }
    
    // Sanitize and validate HTML content
    const sanitized = this.sanitizeHTML(content, { allowedTags, allowedAttributes });
    element.innerHTML = sanitized;
    return true;
  }
  
  /**
   * Create safe DOM elements programmatically
   * @param {string} tagName - HTML tag name
   * @param {Object} attributes - Element attributes
   * @param {string} textContent - Text content
   */
  static createElement(tagName, attributes = {}, textContent = '') {
    // Validate tag name against whitelist
    const allowedTags = ['div', 'span', 'p', 'a', 'img', 'button', 'input', 'label'];
    if (!allowedTags.includes(tagName.toLowerCase())) {
      throw new Error(`Tag '${tagName}' not allowed`);
    }
    
    const element = document.createElement(tagName);
    
    // Set attributes safely
    Object.entries(attributes).forEach(([key, value]) => {
      if (this.isAllowedAttribute(key, tagName)) {
        const sanitizedValue = this.sanitizeAttributeValue(key, value);
        element.setAttribute(key, sanitizedValue);
      }
    });
    
    // Set text content safely
    if (textContent) {
      this.setTextContent(element, textContent);
    }
    
    return element;
  }
  
  /**
   * Sanitize HTML with whitelist approach
   * @param {string} html - HTML content to sanitize
   * @param {Object} options - Sanitization options
   */
  static sanitizeHTML(html, options = {}) {
    const { allowedTags = [], allowedAttributes = [] } = options;
    
    // Remove all script tags and event handlers
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '');
    
    // If no tags allowed, strip all HTML
    if (allowedTags.length === 0) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    } else {
      // Remove non-whitelisted tags
      const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
      sanitized = sanitized.replace(tagRegex, (match, tagName) => {
        return allowedTags.includes(tagName.toLowerCase()) ? match : '';
      });
    }
    
    return escapeHtml(sanitized);
  }
  
  /**
   * Check if attribute is allowed for specific tag
   * @param {string} attribute - Attribute name
   * @param {string} tagName - HTML tag name
   */
  static isAllowedAttribute(attribute, tagName) {
    const globalAllowed = ['id', 'class', 'title', 'lang', 'dir'];
    const tagSpecific = {
      'a': ['href', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height'],
      'input': ['type', 'name', 'value', 'placeholder'],
      'button': ['type', 'disabled']
    };
    
    const allowed = [...globalAllowed, ...(tagSpecific[tagName.toLowerCase()] || [])];
    return allowed.includes(attribute.toLowerCase());
  }
  
  /**
   * Sanitize attribute values
   * @param {string} attribute - Attribute name
   * @param {string} value - Attribute value
   */
  static sanitizeAttributeValue(attribute, value) {
    const strValue = String(value);
    
    switch (attribute.toLowerCase()) {
      case 'href':
        // Validate URLs
        const urlValidation = this.validateURL(strValue);
        return urlValidation.valid ? urlValidation.sanitized : '#';
        
      case 'src':
        // Validate image sources
        return this.validateImageSrc(strValue);
        
      case 'target':
        // Only allow safe target values
        return ['_blank', '_self', '_parent', '_top'].includes(strValue) ? strValue : '_self';
        
      case 'rel':
        // Sanitize rel attribute for security
        return strValue.includes('noopener') ? strValue : `${strValue} noopener noreferrer`.trim();
        
      default:
        // General attribute sanitization
        return escapeHtml(strValue, 'attribute');
    }
  }
  
  /**
   * Validate URL for href attributes
   * @param {string} url - URL to validate
   */
  static validateURL(url) {
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    
    try {
      const urlObj = new URL(url);
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return { valid: false, sanitized: '#' };
      }
      return { valid: true, sanitized: urlObj.toString() };
    } catch {
      // Handle relative URLs
      if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        return { valid: true, sanitized: url };
      }
      return { valid: false, sanitized: '#' };
    }
  }
  
  /**
   * Validate image source URLs
   * @param {string} src - Image source URL
   */
  static validateImageSrc(src) {
    const allowedProtocols = ['http:', 'https:', 'data:'];
    
    try {
      const urlObj = new URL(src);
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return '';
      }
      
      // Additional validation for data URLs
      if (urlObj.protocol === 'data:') {
        if (!src.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,/i)) {
          return '';
        }
      }
      
      return urlObj.toString();
    } catch {
      // Handle relative URLs
      if (src.startsWith('/') || src.startsWith('./')) {
        return src;
      }
      return '';
    }
  }
  
  /**
   * Safe event handler attachment
   * @param {HTMLElement} element - Target element
   * @param {string} eventType - Event type (click, change, etc.)
   * @param {Function} handler - Event handler function
   */
  static addEventListener(element, eventType, handler) {
    if (!element || typeof handler !== 'function') {
      throw new Error('Invalid element or handler provided');
    }
    
    // Validate event type against whitelist
    const allowedEvents = [
      'click', 'change', 'input', 'submit', 'load', 'error',
      'focus', 'blur', 'keydown', 'keyup', 'resize'
    ];
    
    if (!allowedEvents.includes(eventType)) {
      console.warn(`[XSS Protection] Event type '${eventType}' not allowed`);
      return false;
    }
    
    element.addEventListener(eventType, handler);
    return true;
  }
  
  /**
   * Secure form data processing
   * @param {FormData|Object} formData - Form data to process
   */
  static sanitizeFormData(formData) {
    const sanitized = {};
    
    const processEntry = (key, value) => {
      const validation = validateInput(value, { maxInputLength: 2000 });
      sanitized[key] = validation.valid ? validation.sanitized : '';
    };
    
    if (formData instanceof FormData) {
      for (const [key, value] of formData.entries()) {
        processEntry(key, value);
      }
    } else if (typeof formData === 'object') {
      Object.entries(formData).forEach(([key, value]) => {
        processEntry(key, value);
      });
    }
    
    return sanitized;
  }
}

/**
 * Utility functions for common XSS protection scenarios
 */

/**
 * Safe innerHTML replacement for bilingual content
 * Fixes specific XSS vulnerabilities in bilingual-common.js
 */
export function safeSetBilingualContent(element, content, lang = 'zh') {
  if (!element) return false;
  
  // Validate and sanitize content
  const validation = validateInput(content);
  if (!validation.valid) {
    console.warn('[XSS Protection] Bilingual content blocked:', validation.reason);
    return false;
  }
  
  // Use textContent for safe insertion
  XSSProtection.setTextContent(element, validation.sanitized);
  
  // Set language attribute for accessibility
  element.setAttribute('lang', lang === 'en' ? 'en' : 'zh-TW');
  
  return true;
}

/**
 * Safe social links processing
 * Replaces innerHTML usage in social links generation
 */
export function safeSocialLinksProcessor(socialNote, lang = 'zh') {
  if (!socialNote || typeof socialNote !== 'string') {
    return document.createDocumentFragment();
  }
  
  const validation = validateInput(socialNote, { maxInputLength: 2000 });
  if (!validation.valid) {
    console.warn('[XSS Protection] Social links content blocked:', validation.reason);
    return document.createDocumentFragment();
  }
  
  const fragment = document.createDocumentFragment();
  const lines = validation.sanitized.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    const trimmed = line.trim();
    const linkElement = createSafeSocialLink(trimmed, lang);
    if (linkElement) {
      fragment.appendChild(linkElement);
    }
  });
  
  return fragment;
}

/**
 * Create safe social media link elements
 * @param {string} linkText - Social media link text
 * @param {string} lang - Language preference
 */
function createSafeSocialLink(linkText, lang) {
  // Platform detection with validation
  const platforms = {
    facebook: /^FB:\s*([a-zA-Z0-9._@/-]+)/i,
    instagram: /^IG:\s*([a-zA-Z0-9._@/-]+)/i,
    line: /^LINE:\s*([a-zA-Z0-9._@/-]+)/i,
    github: /^GitHub:\s*([a-zA-Z0-9._@/-]+)/i
  };
  
  for (const [platform, regex] of Object.entries(platforms)) {
    const match = linkText.match(regex);
    if (match) {
      return createPlatformLink(platform, match[1], lang);
    }
  }
  
  return null;
}

/**
 * Create platform-specific safe link element
 */
function createPlatformLink(platform, identifier, lang) {
  const container = XSSProtection.createElement('div', {
    style: 'display: flex; align-items: center; gap: 8px; margin: 6px 0;'
  });
  
  const label = XSSProtection.createElement('span', {
    style: 'font-weight: 500;'
  }, `${platform}: ${identifier}`);
  
  const url = generatePlatformURL(platform, identifier);
  if (!url) return null;
  
  const link = XSSProtection.createElement('a', {
    href: url,
    target: '_blank',
    rel: 'noopener noreferrer',
    style: 'padding: 4px 12px; border-radius: 16px; text-decoration: none; font-size: 0.85em;'
  }, lang === 'en' ? 'Visit' : '造訪');
  
  container.appendChild(label);
  container.appendChild(link);
  
  return container;
}

/**
 * Generate safe platform URLs
 */
function generatePlatformURL(platform, identifier) {
  const baseUrls = {
    facebook: 'https://facebook.com/',
    instagram: 'https://instagram.com/',
    line: 'https://line.me/ti/p/~',
    github: 'https://github.com/'
  };
  
  const baseUrl = baseUrls[platform];
  if (!baseUrl) return null;
  
  // Sanitize identifier
  const sanitizedId = identifier.replace(/[^a-zA-Z0-9._@/-]/g, '');
  if (!sanitizedId) return null;
  
  return baseUrl + sanitizedId;
}

// Export for global usage
export default XSSProtection;