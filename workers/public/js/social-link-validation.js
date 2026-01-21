/**
 * Social Link URL Validation
 * Prevents XSS and URL injection attacks
 */

/**
 * Validate social link URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid or empty, false otherwise
 */
function validateSocialLink(url) {
    // Allow empty values (optional field)
    if (!url || url.trim() === '') {
        return true;
    }

    // Trim whitespace
    url = url.trim();

    // Check for spaces in URL (likely malformed)
    if (url.includes(' ')) {
        return false;
    }

    // Dangerous protocols to block
    const dangerousProtocols = [
        'javascript:',
        'data:',
        'vbscript:',
        'file:',
        'about:',
        'blob:'
    ];

    // Check for dangerous protocols (case insensitive)
    const lowerUrl = url.toLowerCase();
    for (const protocol of dangerousProtocols) {
        if (lowerUrl.startsWith(protocol)) {
            return false;
        }
    }

    // Must start with http:// or https://
    if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
        return false;
    }

    // Check for XSS patterns
    const xssPatterns = [
        /<script/i,
        /<iframe/i,
        /javascript:/i,
        /on\w+\s*=/i,  // onclick=, onload=, etc.
        /['"]\s*on/i   // " onclick, ' onload, etc.
    ];

    for (const pattern of xssPatterns) {
        if (pattern.test(url)) {
            return false;
        }
    }

    // Try to parse as URL
    try {
        const urlObj = new URL(url);
        
        // Ensure protocol is http or https
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return false;
        }

        // Ensure hostname exists
        if (!urlObj.hostname) {
            return false;
        }

        return true;
    } catch (e) {
        // Invalid URL format
        return false;
    }
}

/**
 * Get error message for invalid social link
 * @param {string} url - URL to validate
 * @returns {string|null} - Error message or null if valid
 */
function getSocialLinkError(url) {
    // Empty is valid
    if (!url || url.trim() === '') {
        return null;
    }

    url = url.trim();

    // Check for dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:', 'blob:'];
    const lowerUrl = url.toLowerCase();
    
    for (const protocol of dangerousProtocols) {
        if (lowerUrl.startsWith(protocol)) {
            return '不允許的協定。僅支援 http:// 或 https://';
        }
    }

    // Check for XSS patterns
    const xssPatterns = [/<script/i, /<iframe/i, /on\w+\s*=/i, /['"]\s*on/i];
    for (const pattern of xssPatterns) {
        if (pattern.test(url)) {
            return '偵測到不安全的內容';
        }
    }

    // Try to parse
    try {
        const urlObj = new URL(url);
        
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return '不允許的協定。僅支援 http:// 或 https://';
        }

        if (!urlObj.hostname) {
            return '無效的 URL 格式';
        }

        return null; // Valid
    } catch (e) {
        return '無效的 URL 格式。請輸入完整的 URL（包含 http:// 或 https://）';
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateSocialLink, getSocialLinkError };
}
