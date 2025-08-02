/**
 * 設計系統錯誤類別
 * 簡化版本，避免循環依賴
 */

class DesignSystemError extends Error {
    constructor(message, code, context) {
        super(message);
        this.name = 'DesignSystemError';
        this.code = code;
        this.context = context;
    }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DesignSystemError };
} else if (typeof window !== 'undefined') {
    window.DesignSystemError = DesignSystemError;
}