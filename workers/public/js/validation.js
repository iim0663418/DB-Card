// Form Input Validation and Sanitization Utilities
// Based on OWASP and security best practices 2024

/**
 * Validate and sanitize URL input
 * @param {string} url - User input URL
 * @param {Array<string>} allowedHosts - Whitelist of allowed hostnames
 * @returns {string|null} - Sanitized URL or null if invalid
 */
export function validateURL(url, allowedHosts = []) {
    if (!url || typeof url !== 'string') return null;
    
    const trimmed = url.trim();
    if (!trimmed) return null;
    
    try {
        // Auto-prepend https:// if missing protocol
        const urlString = trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`;
        const urlObj = new URL(urlString);
        
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return null;
        }
        
        // Whitelist validation (if provided)
        if (allowedHosts.length > 0) {
            const hostname = urlObj.hostname.replace(/^www\./, '');
            const isAllowed = allowedHosts.some(allowed => 
                hostname === allowed || hostname.endsWith(`.${allowed}`)
            );
            if (!isAllowed) return null;
        }
        
        // Return sanitized URL
        return urlObj.href;
    } catch (e) {
        return null;
    }
}

/**
 * Sanitize text input (prevent XSS)
 * @param {string} text - User input text
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Sanitized text
 */
export function sanitizeText(text, maxLength = 1000) {
    if (!text || typeof text !== 'string') return '';
    
    // Trim and enforce max length
    let sanitized = text.trim().slice(0, maxLength);
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Escape HTML special characters
    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };
    
    sanitized = sanitized.replace(/[&<>"'\/]/g, char => escapeMap[char]);
    
    return sanitized;
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} - Is valid email
 */
export function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    // RFC 5322 compliant regex (simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    return emailRegex.test(email.trim()) && email.length <= 254;
}

/**
 * Validate phone number (international format)
 * @param {string} phone - Phone number
 * @returns {boolean} - Is valid phone
 */
export function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    
    // Allow digits, spaces, +, -, (, )
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    const cleaned = phone.trim();
    
    return phoneRegex.test(cleaned) && cleaned.length >= 7 && cleaned.length <= 20;
}

/**
 * Validate social media URLs with whitelist
 */
export const SOCIAL_PLATFORMS = {
    github: ['github.com'],
    linkedin: ['linkedin.com'],
    facebook: ['facebook.com', 'fb.com', 'fb.me'],
    instagram: ['instagram.com', 'instagr.am'],
    twitter: ['twitter.com', 'x.com', 't.co'],
    youtube: ['youtube.com', 'youtu.be']
};

/**
 * Validate social media URL
 * @param {string} url - Social media URL
 * @param {string} platform - Platform name (github, linkedin, etc.)
 * @returns {string|null} - Sanitized URL or null
 */
export function validateSocialURL(url, platform) {
    const allowedHosts = SOCIAL_PLATFORMS[platform];
    if (!allowedHosts) return null;
    
    return validateURL(url, allowedHosts);
}

/**
 * Batch validate form data
 * @param {Object} formData - Form data object
 * @returns {Object} - { valid: boolean, errors: Array, sanitized: Object }
 */
export function validateFormData(formData) {
    const errors = [];
    const sanitized = {};
    
    // Required text fields
    const requiredText = ['name_zh', 'name_en', 'title_zh', 'title_en'];
    for (const field of requiredText) {
        if (!formData[field] || !formData[field].trim()) {
            errors.push(`${field} is required`);
        } else {
            sanitized[field] = sanitizeText(formData[field], 100);
        }
    }
    
    // Email validation
    if (formData.email) {
        if (!validateEmail(formData.email)) {
            errors.push('Invalid email format');
        } else {
            sanitized.email = formData.email.trim().toLowerCase();
        }
    }
    
    // Phone validation
    if (formData.phone && !validatePhone(formData.phone)) {
        errors.push('Invalid phone format');
    } else if (formData.phone) {
        sanitized.phone = formData.phone.trim();
    }
    
    if (formData.mobile && !validatePhone(formData.mobile)) {
        errors.push('Invalid mobile format');
    } else if (formData.mobile) {
        sanitized.mobile = formData.mobile.trim();
    }
    
    // Avatar URL validation
    if (formData.avatar_url) {
        const validAvatar = validateURL(formData.avatar_url);
        if (!validAvatar) {
            errors.push('Invalid avatar URL');
        } else {
            sanitized.avatar_url = validAvatar;
        }
    }
    
    // Social URLs validation
    const socialFields = ['social_github', 'social_linkedin', 'social_facebook', 
                          'social_instagram', 'social_twitter', 'social_youtube'];
    
    for (const field of socialFields) {
        if (formData[field]) {
            const platform = field.replace('social_', '');
            const validURL = validateSocialURL(formData[field], platform);
            if (!validURL) {
                errors.push(`Invalid ${platform} URL`);
            } else {
                sanitized[field] = validURL;
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        sanitized
    };
}
