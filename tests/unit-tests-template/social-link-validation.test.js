/**
 * Social Link URL Validation Tests
 * TDD approach: Write tests first, then implement
 */

describe('validateSocialLink', () => {
    // Test 1: Valid HTTPS URLs
    test('should accept valid HTTPS URLs', () => {
        expect(validateSocialLink('https://facebook.com/user')).toBe(true);
        expect(validateSocialLink('https://www.instagram.com/user')).toBe(true);
        expect(validateSocialLink('https://linkedin.com/in/user')).toBe(true);
    });

    // Test 2: Valid HTTP URLs (for backward compatibility)
    test('should accept valid HTTP URLs', () => {
        expect(validateSocialLink('http://example.com')).toBe(true);
    });

    // Test 3: Reject dangerous protocols
    test('should reject javascript: protocol', () => {
        expect(validateSocialLink('javascript:alert(1)')).toBe(false);
        expect(validateSocialLink('JavaScript:alert(1)')).toBe(false); // case insensitive
    });

    test('should reject data: protocol', () => {
        expect(validateSocialLink('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    test('should reject vbscript: protocol', () => {
        expect(validateSocialLink('vbscript:msgbox(1)')).toBe(false);
    });

    test('should reject file: protocol', () => {
        expect(validateSocialLink('file:///etc/passwd')).toBe(false);
    });

    // Test 4: Reject malformed URLs
    test('should reject malformed URLs', () => {
        expect(validateSocialLink('not a url')).toBe(false);
        expect(validateSocialLink('htp://wrong.com')).toBe(false);
        expect(validateSocialLink('//example.com')).toBe(false);
    });

    // Test 5: Handle empty/null values
    test('should accept empty string (optional field)', () => {
        expect(validateSocialLink('')).toBe(true);
        expect(validateSocialLink(null)).toBe(true);
        expect(validateSocialLink(undefined)).toBe(true);
    });

    // Test 6: Reject URLs with spaces
    test('should reject URLs with spaces', () => {
        expect(validateSocialLink('https://example.com/path with spaces')).toBe(false);
    });

    // Test 7: Accept URLs with query parameters
    test('should accept URLs with query parameters', () => {
        expect(validateSocialLink('https://example.com?param=value')).toBe(true);
        expect(validateSocialLink('https://example.com?param=value&other=123')).toBe(true);
    });

    // Test 8: Accept URLs with fragments
    test('should accept URLs with fragments', () => {
        expect(validateSocialLink('https://example.com#section')).toBe(true);
    });

    // Test 9: Reject XSS attempts
    test('should reject XSS attempts in URL', () => {
        expect(validateSocialLink('https://example.com/<script>alert(1)</script>')).toBe(false);
        expect(validateSocialLink('https://example.com/\'"onload=alert(1)')).toBe(false);
    });
});

describe('getSocialLinkError', () => {
    // Test 10: Return appropriate error messages
    test('should return error message for dangerous protocols', () => {
        expect(getSocialLinkError('javascript:alert(1)')).toContain('不允許的協定');
    });

    test('should return error message for malformed URLs', () => {
        expect(getSocialLinkError('not a url')).toContain('無效的 URL');
    });

    test('should return null for valid URLs', () => {
        expect(getSocialLinkError('https://example.com')).toBe(null);
        expect(getSocialLinkError('')).toBe(null);
    });
});
