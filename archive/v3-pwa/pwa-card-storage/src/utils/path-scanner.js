/**
 * Path Scanner Utility Module
 * Secure file scanning for hardcoded path detection
 * 
 * @version 3.2.0
 * @author PWA Deployment Compatibility Team
 */

// Security-validated file extensions
const ALLOWED_EXTENSIONS = ['.js', '.html', '.css', '.json', '.md', '.txt'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const SCAN_TIMEOUT = 30000; // 30 second timeout

// Path detection patterns with security validation
const PATH_PATTERNS = {
    // Critical issues - parent directory references
    parentReference: {
        regex: /\.\.\/[^"'\s)]+/g,
        severity: 'critical',
        description: 'Parent directory reference that breaks static hosting'
    },
    
    // High issues - absolute paths
    absoluteAssetPath: {
        regex: /(?:src|href|url)\s*=\s*["']\/[^"'\s]+["']/g,
        severity: 'high', 
        description: 'Absolute path that may not work with basePath'
    },
    
    // Medium issues - relative path inconsistencies
    relativeAssetPath: {
        regex: /(?:src|href|url)\s*=\s*["']\.\//g,
        severity: 'medium',
        description: 'Relative path that may need normalization'
    },
    
    // Low issues - hardcoded localhost
    localhostReference: {
        regex: /https?:\/\/localhost[:\d]*/g,
        severity: 'low',
        description: 'Hardcoded localhost reference'
    },
    
    // Path separator inconsistencies
    mixedSeparators: {
        regex: /[^"'\s]*\\[^"'\s]*\/[^"'\s]*/g,
        severity: 'medium',
        description: 'Mixed path separators (backslash and forward slash)'
    }
};

/**
 * Validate file path for security
 * @param {string} filePath - File path to validate
 * @returns {boolean} True if path is safe
 */
function validateFilePath(filePath) {
    if (typeof filePath !== 'string') {
        return false;
    }
    
    // Prevent path traversal
    if (filePath.includes('..') || filePath.includes('~')) {
        return false;
    }
    
    // Check allowed extensions
    const extension = filePath.substring(filePath.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(extension.toLowerCase())) {
        return false;
    }
    
    // Ensure path is within allowed directory
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (!normalizedPath.startsWith('./') && !normalizedPath.startsWith('/')) {
        return false;
    }
    
    return true;
}

/**
 * Sanitize file content before processing
 * @param {string} content - File content
 * @returns {string} Sanitized content
 */
function sanitizeContent(content) {
    if (typeof content !== 'string') {
        return '';
    }
    
    // Limit content size
    if (content.length > MAX_FILE_SIZE) {
        console.warn('[PathScanner] File content truncated due to size limit');
        return content.substring(0, MAX_FILE_SIZE);
    }
    
    return content;
}

/**
 * Scan file content for path issues
 * @param {string} content - File content to scan
 * @param {string} filePath - File path for context
 * @returns {Array} Array of detected issues
 */
export function scanContent(content, filePath) {
    const sanitizedContent = sanitizeContent(content);
    const lines = sanitizedContent.split('\n');
    const issues = [];
    
    // Process each line with timeout protection
    const startTime = Date.now();
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        // Timeout protection
        if (Date.now() - startTime > SCAN_TIMEOUT) {
            console.warn('[PathScanner] Scan timeout reached, stopping');
            break;
        }
        
        const line = lines[lineIndex];
        const lineNumber = lineIndex + 1;
        
        // Check each pattern
        for (const [patternName, pattern] of Object.entries(PATH_PATTERNS)) {
            try {
                const matches = line.matchAll(pattern.regex);
                
                for (const match of matches) {
                    issues.push({
                        filePath,
                        lineNumber,
                        columnNumber: match.index + 1,
                        patternName,
                        severity: pattern.severity,
                        description: pattern.description,
                        matchedText: match[0],
                        fullLine: line.trim(),
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                console.warn(`[PathScanner] Pattern ${patternName} failed on line ${lineNumber}:`, error.message);
            }
        }
    }
    
    return issues;
}

/**
 * Scan file from URL with security validation
 * @param {string} fileUrl - URL to scan
 * @param {string} baseUrl - Base URL for relative paths
 * @returns {Promise<Object>} Scan results
 */
export async function scanFile(fileUrl, baseUrl = '') {
    try {
        // Validate file URL
        const fullUrl = baseUrl ? new URL(fileUrl, baseUrl).href : fileUrl;
        const urlPath = new URL(fullUrl).pathname;
        
        if (!validateFilePath(urlPath)) {
            throw new Error(`Invalid file path: ${urlPath}`);
        }
        
        // Fetch file with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT);
        
        const response = await fetch(fullUrl, {
            signal: controller.signal,
            headers: {
                'Accept': 'text/plain,text/html,application/json,text/css,application/javascript'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Check content type
        const contentType = response.headers.get('content-type') || '';
        const allowedTypes = ['text/', 'application/json', 'application/javascript'];
        
        if (!allowedTypes.some(type => contentType.includes(type))) {
            throw new Error(`Unsupported content type: ${contentType}`);
        }
        
        const content = await response.text();
        const issues = scanContent(content, fileUrl);
        
        return {
            filePath: fileUrl,
            fullUrl,
            contentLength: content.length,
            issues,
            scannedAt: new Date().toISOString(),
            success: true
        };
        
    } catch (error) {
        return {
            filePath: fileUrl,
            issues: [],
            error: error.message,
            scannedAt: new Date().toISOString(),
            success: false
        };
    }
}

/**
 * Scan multiple files in parallel
 * @param {Array<string>} fileUrls - Array of file URLs to scan
 * @param {string} baseUrl - Base URL for relative paths
 * @param {number} concurrency - Maximum concurrent scans
 * @returns {Promise<Array>} Array of scan results
 */
export async function scanFiles(fileUrls, baseUrl = '', concurrency = 5) {
    const results = [];
    const semaphore = new Array(concurrency).fill(null);
    
    const scanWithSemaphore = async (fileUrl) => {
        // Wait for available slot
        await new Promise(resolve => {
            const checkSlot = () => {
                const freeIndex = semaphore.findIndex(slot => slot === null);
                if (freeIndex !== -1) {
                    semaphore[freeIndex] = fileUrl;
                    resolve(freeIndex);
                } else {
                    setTimeout(checkSlot, 10);
                }
            };
            checkSlot();
        }).then(async (slotIndex) => {
            try {
                const result = await scanFile(fileUrl, baseUrl);
                results.push(result);
            } finally {
                semaphore[slotIndex] = null;
            }
        });
    };
    
    // Start all scans
    await Promise.all(fileUrls.map(scanWithSemaphore));
    
    return results;
}

/**
 * Get scan statistics
 * @param {Array} scanResults - Array of scan results
 * @returns {Object} Statistics summary
 */
export function getScanStatistics(scanResults) {
    const stats = {
        totalFiles: scanResults.length,
        successfulScans: 0,
        failedScans: 0,
        totalIssues: 0,
        issuesBySeverity: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        },
        issuesByPattern: {},
        affectedFiles: 0
    };
    
    for (const result of scanResults) {
        if (result.success) {
            stats.successfulScans++;
            stats.totalIssues += result.issues.length;
            
            if (result.issues.length > 0) {
                stats.affectedFiles++;
            }
            
            for (const issue of result.issues) {
                stats.issuesBySeverity[issue.severity]++;
                stats.issuesByPattern[issue.patternName] = 
                    (stats.issuesByPattern[issue.patternName] || 0) + 1;
            }
        } else {
            stats.failedScans++;
        }
    }
    
    return stats;
}

// Export pattern definitions for external use
export { PATH_PATTERNS, ALLOWED_EXTENSIONS };