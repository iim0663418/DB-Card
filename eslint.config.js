import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        indexedDB: 'readonly',
        SecureLogger: 'readonly',
        SecurityDataHandler: 'readonly',
        SecurityInputHandler: 'readonly',
        SecurityAuthHandler: 'readonly'
      }
    },
    rules: {
      // Code quality rules for QUA-001
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-duplicate-imports': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      'no-empty': 'error',
      'no-extra-semi': 'error',
      'no-func-assign': 'error',
      'no-inner-declarations': 'error',
      'no-irregular-whitespace': 'error',
      'no-obj-calls': 'error',
      'no-sparse-arrays': 'error',
      'no-unexpected-multiline': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      // Medium-level quality rules (warnings)
      'no-debugger': 'warn',
      'no-alert': 'warn',
      'no-eval': 'warn',
      'no-implied-eval': 'warn',
      'no-magic-numbers': ['warn', { ignore: [0, 1, -1, 2] }],
      'complexity': ['warn', { max: 15 }],
      'max-depth': ['warn', { max: 4 }],
      'max-lines-per-function': ['warn', { max: 100 }],
      'max-params': ['warn', { max: 5 }]
    }
  },
  {
    files: ['pwa-card-storage/src/**/*.js'],
    rules: {
      'no-console': 'error'
    }
  },
  {
    files: ['*.test.js', '*.spec.js', 'test-*.js'],
    rules: {
      'no-console': 'off'
    }
  }
];