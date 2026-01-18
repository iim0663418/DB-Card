// Initialize secure logger using global window object
let secureLogger;
if (window.SecureLogger) {
  secureLogger = new window.SecureLogger({ logLevel: 'INFO', enableMasking: true });
} else {
  // Fallback logger
  secureLogger = {
    info: (msg, data) => console.log(`[INFO] ${msg}`, data),
    error: (msg, data) => console.error(`[ERROR] ${msg}`, data),
    warn: (msg, data) => console.warn(`[WARN] ${msg}`, data)
  };
}

// 最小錯誤處理器 - Enhanced with secure logging
window.pwaErrorHandler = {
    logStep: (step, status, details) => {
        secureLogger.info('PWA step execution', { 
            step, 
            status, 
            details: details || '', 
            component: 'PWAErrorHandler' 
        });
    },
    logError: (error, context) => {
        secureLogger.error('PWA error occurred', { 
            error: error?.message || String(error), 
            context, 
            component: 'PWAErrorHandler' 
        });
    },
    diagnoseInitializationFailure: async () => {
        return { message: '初始化失敗' };
    },
    showDiagnosticModal: (diagnosis) => {
        secureLogger.error('PWA diagnostic result', { 
            diagnosis: diagnosis?.message || String(diagnosis), 
            component: 'PWAErrorHandler' 
        });
    }
};

// Export to global scope
window.errorLogger = secureLogger;
window.pwaErrorHandlerDefault = window.pwaErrorHandler;