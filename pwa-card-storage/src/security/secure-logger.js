/**
 * SecureLogger - CWE-117 Log Injection Protection Module
 * 
 * Prevents log injection attacks by sanitizing user input and providing
 * structured logging with sensitive data masking capabilities.
 * 
 * @version 1.0.0
 * @author Security Team
 */

// Prevent duplicate class declaration
if (typeof SecureLogger === 'undefined') {
  class SecureLogger {
    constructor(options = {}) {
        this.logLevel = options.logLevel || 'INFO';
        this.enableMasking = options.enableMasking !== false;
        this.maxLogLength = options.maxLogLength || 1000;
    }

    /**
     * Sanitizes log input to prevent CWE-117 injection attacks
     * Removes control characters that could corrupt log files
     */
    sanitizeLogInput(input) {
        if (typeof input !== 'string') {
            input = String(input);
        }

        // Remove control characters (0x00-0x1F, 0x7F-0x9F)
        // Specifically targets newline, carriage return, and other control chars
        return input
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
            .replace(/[\r\n\t]/g, ' ')
            .substring(0, this.maxLogLength);
    }

    /**
     * Masks sensitive data patterns in log messages
     * Prevents PII leakage in logs
     */
    maskSensitiveData(message) {
        if (!this.enableMasking) return message;

        return message
            // Email patterns
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_MASKED]')
            // Phone patterns
            .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE_MASKED]')
            .replace(/\b\d{10}\b/g, '[PHONE_MASKED]')
            // Credit card patterns
            .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_MASKED]')
            // Password patterns
            .replace(/password[=:]\s*\S+/gi, 'password=[MASKED]');
    }

    /**
     * Creates structured log entry with security sanitization
     */
    structuredLog(level, message, context = {}) {
        const timestamp = new Date().toISOString();
        const sanitizedMessage = this.sanitizeLogInput(message);
        const maskedMessage = this.maskSensitiveData(sanitizedMessage);

        // Sanitize context object
        const sanitizedContext = {};
        for (const [key, value] of Object.entries(context)) {
            const sanitizedKey = this.sanitizeLogInput(key);
            const sanitizedValue = this.maskSensitiveData(this.sanitizeLogInput(String(value)));
            sanitizedContext[sanitizedKey] = sanitizedValue;
        }

        return {
            timestamp,
            level: level.toUpperCase(),
            message: maskedMessage,
            context: sanitizedContext,
            source: 'SecureLogger'
        };
    }

    /**
     * Safe logging methods
     */
    info(message, context) {
        const logEntry = this.structuredLog('INFO', message, context);
        console.log(JSON.stringify(logEntry));
        return logEntry;
    }

    warn(message, context) {
        const logEntry = this.structuredLog('WARN', message, context);
        console.warn(JSON.stringify(logEntry));
        return logEntry;
    }

    error(message, context) {
        const logEntry = this.structuredLog('ERROR', message, context);
        console.error(JSON.stringify(logEntry));
        return logEntry;
    }

    debug(message, context) {
        if (this.logLevel === 'DEBUG') {
            const logEntry = this.structuredLog('DEBUG', message, context);
            console.debug(JSON.stringify(logEntry));
            return logEntry;
        }
    }
}

  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
      module.exports = { SecureLogger };
  }
  
  // Make available globally
  if (typeof window !== 'undefined') {
      window.SecureLogger = SecureLogger;
      window.SecureLoggerClass = SecureLogger;
  }
  
} else {
  console.log('[SecureLogger] Class already defined, skipping redefinition');
}