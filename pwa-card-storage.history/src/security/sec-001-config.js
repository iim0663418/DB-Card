/**
 * SEC-001 Configuration - XSS Protection Settings
 * Centralized configuration for enhanced XSS protection
 * 
 * @version 1.0.0
 * @security Critical - CWE-79/80 Configuration
 */

export const SEC001_CONFIG = {
  // XSS Protection Settings
  xss: {
    // Maximum input length for validation
    maxInputLength: 2000,
    
    // Allowed HTML tags (whitelist approach)
    allowedTags: [],
    
    // Allowed attributes per tag
    allowedAttributes: {
      global: ['id', 'class', 'title', 'lang', 'dir'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      input: ['type', 'name', 'value', 'placeholder'],
      button: ['type', 'disabled']
    },
    
    // Allowed URL protocols
    allowedProtocols: ['http:', 'https:', 'mailto:', 'tel:'],
    
    // Allowed event types for addEventListener
    allowedEvents: [
      'click', 'change', 'input', 'submit', 'load', 'error',
      'focus', 'blur', 'keydown', 'keyup', 'resize'
    ],
    
    // Context-specific escaping rules
    contexts: {
      html: {
        escapeChars: ['&', '<', '>', '"', "'", '/'],
        entities: {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '/': '&#x2F;'
        }
      },
      attribute: {
        escapeChars: ['&', '"', "'", '<', '>'],
        entities: {
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#x27;',
          '<': '&lt;',
          '>': '&gt;'
        }
      },
      javascript: {
        escapeChars: ['\\', "'", '"', '\n', '\r', '\t'],
        entities: {
          '\\': '\\\\',
          "'": "\\'",
          '"': '\\"',
          '\n': '\\n',
          '\r': '\\r',
          '\t': '\\t'
        }
      }
    }
  },
  
  // Social Media Platform Configuration
  socialMedia: {
    platforms: {
      facebook: {
        regex: /^FB:\s*([a-zA-Z0-9._@/-]+)/i,
        baseUrl: 'https://facebook.com/',
        displayName: '📘 Facebook'
      },
      instagram: {
        regex: /^IG:\s*([a-zA-Z0-9._@/-]+)/i,
        baseUrl: 'https://instagram.com/',
        displayName: '📷 Instagram'
      },
      line: {
        regex: /^LINE:\s*([a-zA-Z0-9._@/-]+)/i,
        baseUrl: 'https://line.me/ti/p/~',
        displayName: '💬 LINE'
      },
      github: {
        regex: /^GitHub:\s*([a-zA-Z0-9._@/-]+)/i,
        baseUrl: 'https://github.com/',
        displayName: '🐙 GitHub'
      },
      twitter: {
        regex: /^(Twitter|X):\s*([a-zA-Z0-9._@/-]+)/i,
        baseUrl: 'https://twitter.com/',
        displayName: '🐦 Twitter'
      },
      linkedin: {
        regex: /^LinkedIn:\s*([a-zA-Z0-9._@/-\u4e00-\u9fff-]+)/i,
        baseUrl: 'https://linkedin.com/in/',
        displayName: '💼 LinkedIn'
      },
      youtube: {
        regex: /^YouTube:\s*([a-zA-Z0-9._@/-]+)/i,
        baseUrl: 'https://youtube.com/',
        displayName: '📺 YouTube'
      },
      discord: {
        regex: /^Discord:\s*([a-zA-Z0-9._@/-]+)/i,
        baseUrl: 'https://discord.gg/',
        displayName: '🎮 Discord'
      }
    },
    
    // Button text translations
    buttonTexts: {
      zh: {
        facebook: '👥 造訪頁面',
        instagram: '❤️ 追蹤',
        lineOfficial: '🏢 加入官方',
        linePersonal: '👤 加好友',
        github: '⭐ 造訪',
        twitter: '👥 追蹤',
        linkedin: '🤝 連結',
        youtube: '🔔 訂閱',
        discord: '🏠 加入'
      },
      en: {
        facebook: '👥 Visit Page',
        instagram: '❤️ Follow',
        lineOfficial: '🏢 Add Official',
        linePersonal: '👤 Add Friend',
        github: '⭐ Visit',
        twitter: '👥 Follow',
        linkedin: '🤝 Connect',
        youtube: '🔔 Subscribe',
        discord: '🏠 Join'
      }
    }
  },
  
  // Security Headers for static hosting
  securityHeaders: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  },
  
  // Logging configuration
  logging: {
    enabled: true,
    level: 'warn', // 'debug', 'info', 'warn', 'error'
    maxLogLength: 200,
    sanitizeLogData: true,
    events: {
      xss_blocked: 'XSS attempt blocked',
      invalid_url: 'Invalid URL blocked',
      dangerous_content: 'Dangerous content sanitized',
      rate_limit_exceeded: 'Rate limit exceeded'
    }
  },
  
  // Performance settings
  performance: {
    maxProcessingTime: 100, // milliseconds
    batchSize: 50, // items to process in batch
    cacheEnabled: true,
    cacheSize: 100 // number of cached results
  },
  
  // Compliance settings
  compliance: {
    owasp: {
      level: 'ASVS-L2', // OWASP ASVS Level 2
      requirements: [
        'V5.1.1', // Input validation
        'V5.1.2', // Sanitization
        'V5.3.3', // Output encoding
        'V5.3.4', // Context-aware encoding
        'V14.4.1' // HTTP security headers
      ]
    },
    wcag: {
      level: 'AA', // WCAG 2.1 AA
      requirements: [
        '1.3.1', // Info and relationships
        '2.1.1', // Keyboard accessible
        '3.1.1', // Language of page
        '4.1.2'  // Name, role, value
      ]
    }
  }
};

/**
 * Get configuration value with fallback
 * @param {string} path - Configuration path (e.g., 'xss.maxInputLength')
 * @param {*} defaultValue - Default value if path not found
 */
export function getConfig(path, defaultValue = null) {
  const keys = path.split('.');
  let current = SEC001_CONFIG;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  
  return current;
}

/**
 * Validate configuration integrity
 */
export function validateConfig() {
  const required = [
    'xss.maxInputLength',
    'xss.allowedProtocols',
    'xss.allowedEvents',
    'socialMedia.platforms',
    'logging.enabled'
  ];
  
  const missing = required.filter(path => getConfig(path) === null);
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
  
  return true;
}

// Validate configuration on module load
validateConfig();

export default SEC001_CONFIG;