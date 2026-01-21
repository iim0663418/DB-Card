/**
 * Social Link URL Validation (Backend)
 * Server-side validation to prevent URL injection
 */

/**
 * Validate social link URL on server side
 * @param url - URL to validate
 * @returns true if valid or empty, false otherwise
 */
export function validateSocialLink(url: string | null | undefined): boolean {
    // Allow empty values (optional field)
    if (!url || url.trim() === '') {
        return true;
    }

    url = url.trim();

    // Check for spaces
    if (url.includes(' ')) {
        return false;
    }

    // Dangerous protocols
    const dangerousProtocols = [
        'javascript:',
        'data:',
        'vbscript:',
        'file:',
        'about:',
        'blob:'
    ];

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
        /on\w+\s*=/i,
        /['"]\s*on/i
    ];

    for (const pattern of xssPatterns) {
        if (pattern.test(url)) {
            return false;
        }
    }

    // Try to parse as URL
    try {
        const urlObj = new URL(url);
        
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return false;
        }

        if (!urlObj.hostname) {
            return false;
        }

        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Validate all social links in card data
 * @param socialLinks - Object containing social link URLs
 * @returns Array of validation errors, empty if all valid
 */
export function validateAllSocialLinks(socialLinks: Record<string, string | null | undefined>): string[] {
    const errors: string[] = [];
    
    for (const [platform, url] of Object.entries(socialLinks)) {
        if (url && !validateSocialLink(url)) {
            errors.push(`Invalid ${platform} URL: ${url}`);
        }
    }
    
    return errors;
}
