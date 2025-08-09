module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // CWE-117 Log Injection Prevention Rules
    'no-console': ['warn', {
      allow: ['warn', 'error'] // Only allow console.warn and console.error for critical issues
    }],
    
    // Custom rule to prevent unsafe console.log with template literals
    'no-template-literals-in-console': 'off', // Will be implemented as custom rule below
    
    // Security-focused rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Code quality rules
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    
    // Prevent potential XSS
    'no-inner-declarations': 'error',
    'no-multi-str': 'error'
  },
  
  // Custom rules for LOG-001 security requirements
  overrides: [
    {
      files: ['pwa-card-storage/src/**/*.js'],
      rules: {
        // Stricter rules for PWA source files
        'no-console': ['error', {
          allow: [] // No console statements allowed in PWA source
        }]
      }
    },
    {
      files: ['*.test.js', '*.spec.js', 'test-*.js'],
      rules: {
        // Allow console in test files
        'no-console': 'off'
      }
    }
  ],
  
  // Global variables
  globals: {
    // PWA globals
    'SecureLogger': 'readonly',
    'SecurityDataHandler': 'readonly',
    'SecurityInputHandler': 'readonly',
    'SecurityAuthHandler': 'readonly',
    
    // Browser APIs
    'navigator': 'readonly',
    'localStorage': 'readonly',
    'sessionStorage': 'readonly',
    'indexedDB': 'readonly'
  }
};