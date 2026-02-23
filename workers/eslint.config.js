// ESLint v9 Flat Config
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.js', 'public/js/**/*.js'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js Globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        module: 'writable',
        require: 'readonly',

        // Browser Globals
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
        URLSearchParams: 'readonly',
        FormData: 'readonly',

        // Cloudflare Workers Runtime
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        HeadersInit: 'readonly',
        ExecutionContext: 'readonly',
        D1Database: 'readonly',
        KVNamespace: 'readonly',
        R2Bucket: 'readonly',
        DurableObjectNamespace: 'readonly',
        DurableObjectStub: 'readonly',
        Fetcher: 'readonly',
        ScheduledEvent: 'readonly',
        Env: 'readonly',

        // Web APIs
        URL: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        CryptoKey: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        PerformanceObserver: 'readonly',
        performance: 'readonly',

        // Third-party Libraries
        DOMPurify: 'readonly',
        lucide: 'readonly',
        THREE: 'readonly',
        Chart: 'readonly',
        QRCreator: 'readonly',
        QRCode: 'readonly',
        QrCreator: 'readonly',
        Panzoom: 'readonly',
        SimpleWebAuthnBrowser: 'readonly',
        API_BASE: 'readonly',

        // Global Functions
        api: 'readonly',
        clearPreview: 'readonly',
        uploadAsset: 'readonly',
        viewAsset: 'readonly',
        getSocialLinkError: 'readonly',
        showToast: 'readonly',

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
