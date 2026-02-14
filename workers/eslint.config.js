// ESLint v9 Flat Config
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'public/js/**/*.js'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        module: 'writable',
        require: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        crypto: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        requestIdleCallback: 'readonly',
        requestAnimationFrame: 'readonly',
        sessionStorage: 'readonly',
        localStorage: 'readonly',
        prompt: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        DOMPurify: 'readonly',
        lucide: 'readonly',
        THREE: 'readonly',
        Chart: 'readonly',
        QRCreator: 'readonly',
        Panzoom: 'readonly',
        SimpleWebAuthnBrowser: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        // Functions called from HTML onclick attributes
        closeWebViewWarning: 'writable',
        copyCurrentURL: 'writable',
        handleGoogleLogin: 'writable'
      }
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-unused-vars': 'warn'
    }
  }
];
