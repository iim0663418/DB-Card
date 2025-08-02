// 最小錯誤處理器
window.pwaErrorHandler = {
    logStep: (step, status, details) => {
        console.log(`[PWA] ${step}: ${status}`, details || '');
    },
    logError: (error, context) => {
        console.error(`[PWA] ${context}:`, error);
    },
    diagnoseInitializationFailure: async () => {
        return { message: '初始化失敗' };
    },
    showDiagnosticModal: (diagnosis) => {
        console.error('[PWA] 診斷結果:', diagnosis);
    }
};