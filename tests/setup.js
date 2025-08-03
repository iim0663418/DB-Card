/**
 * Jest 測試環境設定
 * 設定全域變數和模擬物件
 */

// 設定全域變數
global.EMERGENCY_DISABLE_IMPORT = false;
global.MOCK_AUTH_FAIL = false;

// 模擬 File API
global.File = class File {
    constructor(bits, name, options = {}) {
        this.bits = bits;
        this.name = name;
        this.type = options.type || '';
        this.size = bits.join('').length;
        this.lastModified = Date.now();
    }
};

// 模擬 FileReader API
global.FileReader = class FileReader {
    constructor() {
        this.result = null;
        this.error = null;
        this.readyState = 0;
        this.onload = null;
        this.onerror = null;
    }
    
    readAsText(file) {
        setTimeout(() => {
            this.result = file.bits.join('');
            this.readyState = 2;
            if (this.onload) {
                this.onload({ target: this });
            }
        }, 0);
    }
};

// 模擬 PWA 管理器類別
global.PWACardManager = class PWACardManager {
    constructor(storage) {
        this.storage = storage;
    }

    async importFromFile(file) {
        // 模擬安全檢查
        if (global.EMERGENCY_DISABLE_IMPORT) {
            return { success: false, error: '匯入功能已暫時停用' };
        }

        if (global.SecurityAuthHandler && !global.SecurityAuthHandler.hasPermission('import')) {
            return { success: false, error: '無權限執行匯入操作' };
        }

        const allowedTypes = ['application/json', 'text/vcard'];
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.json') && !file.name.endsWith('.vcf')) {
            return { success: false, error: '不支援的檔案格式' };
        }

        if (file.size > 10 * 1024 * 1024) {
            return { success: false, error: '檔案大小超過限制 (10MB)' };
        }

        // 模擬成功匯入
        return { success: true, count: 1 };
    }

    secureJSONParse(jsonString) {
        return JSON.parse(jsonString, (key, value) => {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                return undefined;
            }
            return value;
        });
    }

    handleSecureError(error, context) {
        return {
            success: false,
            error: '操作失敗，請稍後再試'
        };
    }

    detectCardType(cardData) {
        return 'personal';
    }

    applyCardTypeDefaults(cardData, cardType) {
        return cardData;
    }

    secureReadFile(file) {
        return new Promise((resolve, reject) => {
            if (!file.name || file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
                reject(new Error('不安全的檔案名稱'));
                return;
            }
            resolve(file.bits.join(''));
        });
    }
};

// 模擬 TransferManager 類別
global.TransferManager = class TransferManager {
    constructor(cardManager) {
        this.cardManager = cardManager;
    }

    async importData(file) {
        // 模擬安全檢查
        if (global.EMERGENCY_DISABLE_IMPORT) {
            return { success: false, error: '匯入功能已暫時停用' };
        }

        if (global.SecurityAuthHandler && !global.SecurityAuthHandler.hasPermission('import')) {
            return { success: false, error: '無權限執行匯入操作' };
        }

        const allowedTypes = ['application/json', 'application/octet-stream'];
        if (!allowedTypes.includes(file.type)) {
            return { success: false, error: '不支援的檔案類型' };
        }

        if (file.size > 10 * 1024 * 1024) {
            return { success: false, error: '檔案大小超過限制 (10MB)' };
        }

        // 模擬成功匯入
        return { success: true, importedCount: 1, totalCards: 1 };
    }

    secureJSONParse(jsonString) {
        return JSON.parse(jsonString, (key, value) => {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                return undefined;
            }
            return value;
        });
    }

    maskSensitiveData(data) {
        if (!data || typeof data !== 'string') {
            return '[masked]';
        }
        
        return data.replace(/[\w.-]+@[\w.-]+/g, '[email]')
                   .replace(/\d{4,}/g, '[number]')
                   .replace(/[\u4e00-\u9fff]{2,}/g, '[name]');
    }

    secureReadFile(file) {
        return new Promise((resolve, reject) => {
            if (!file.name || file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
                reject(new Error('不安全的檔案名稱'));
                return;
            }
            
            const content = file.bits.join('');
            if (content.length > 50 * 1024 * 1024) {
                reject(new Error('檔案內容過大'));
                return;
            }
            
            resolve(content);
        });
    }

    handleSecureError(error, context) {
        return {
            success: false,
            error: '操作失敗，請稍後再試'
        };
    }
};

// 模擬 console 方法以避免測試輸出干擾
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// 測試前重置
beforeEach(() => {
    global.EMERGENCY_DISABLE_IMPORT = false;
    global.MOCK_AUTH_FAIL = false;
    delete Object.prototype.polluted;
    
    // 清除 console mock
    jest.clearAllMocks();
});

// 測試後清理
afterEach(() => {
    // 清理可能的原型污染
    delete Object.prototype.polluted;
});