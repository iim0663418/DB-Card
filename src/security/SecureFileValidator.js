/**
 * PWA-15: Secure File Import Validation
 * 實作安全檔案匯入驗證機制
 */

class SecureFileValidator {
    constructor() {
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['application/json', 'text/vcard', 'text/x-vcard', 'application/octet-stream'];
        this.allowedExtensions = ['.json', '.vcf', '.enc'];
        this.maliciousPatterns = [
            /<script[^>]*>/i,
            /javascript:/i,
            /vbscript:/i,
            /on\w+\s*=/i,
            /<iframe[^>]*>/i,
            /<object[^>]*>/i,
            /<embed[^>]*>/i,
            /eval\s*\(/i,
            /Function\s*\(/i
        ];
    }

    /**
     * 安全檔案驗證
     */
    async validateFileSecurely(file) {
        // 檔案大小限制
        if (file.size > this.maxFileSize) {
            return { isValid: false, reason: `檔案大小超過限制 (${this.maxFileSize / 1024 / 1024}MB)` };
        }

        // 檔案類型白名單
        const hasValidExtension = this.allowedExtensions.some(ext => 
            file.name.toLowerCase().endsWith(ext)
        );
        
        if (!hasValidExtension) {
            return { isValid: false, reason: '不支援的檔案副檔名' };
        }

        // 檔案名稱安全檢查
        if (!this.isSecureFileName(file.name)) {
            return { isValid: false, reason: '檔案名稱包含不安全字符' };
        }

        // MIME 類型檢查
        if (file.type && !this.allowedTypes.includes(file.type) && file.type !== '') {
            return { isValid: false, reason: '不支援的 MIME 類型' };
        }

        return { isValid: true };
    }

    /**
     * 檢查檔案名稱安全性
     */
    isSecureFileName(fileName) {
        // 危險字符檢查
        const dangerousChars = /[<>:"|?*\x00-\x1f]/;
        if (dangerousChars.test(fileName)) {
            return false;
        }

        // 路徑遍歷檢查
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            return false;
        }

        // 長度限制
        if (fileName.length > 255) {
            return false;
        }

        return true;
    }

    /**
     * 安全讀取檔案內容
     */
    async readFileContentSecurely(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            // 設定超時
            const timeout = setTimeout(() => {
                reader.abort();
                reject(new Error('檔案讀取超時'));
            }, 30000); // 30秒超時

            reader.onload = (event) => {
                clearTimeout(timeout);
                resolve(event.target.result);
            };

            reader.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('檔案讀取失敗'));
            };

            reader.onabort = () => {
                clearTimeout(timeout);
                reject(new Error('檔案讀取被中止'));
            };

            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * 安全解析 JSON 檔案
     */
    async parseJSONFileSecurely(content) {
        try {
            // 內容長度檢查
            if (content.length > 1024 * 1024) { // 1MB 限制
                throw new Error('JSON 檔案內容過大');
            }

            // 惡意內容預檢
            if (this.containsMaliciousContent(content)) {
                throw new Error('檔案包含潛在惡意內容');
            }

            const data = JSON.parse(content);
            
            // 深度限制檢查
            if (this.getObjectDepth(data) > 10) {
                throw new Error('JSON 結構過於複雜');
            }

            return data;
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error('JSON 格式錯誤');
            }
            throw error;
        }
    }

    /**
     * 安全解析 vCard 檔案
     */
    async parseVCardFileSecurely(content) {
        try {
            // 內容長度檢查
            if (content.length > 512 * 1024) { // 512KB 限制
                throw new Error('vCard 檔案內容過大');
            }

            // vCard 格式基本驗證
            if (!content.includes('BEGIN:VCARD') || !content.includes('END:VCARD')) {
                throw new Error('無效的 vCard 格式');
            }

            // 惡意內容檢查
            if (this.containsMaliciousContent(content)) {
                throw new Error('vCard 包含潛在惡意內容');
            }

            return this.parseVCardContent(content);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 解析 vCard 內容
     */
    parseVCardContent(content) {
        const lines = content.split('\n');
        const cardData = {};
        let greetings = [];
        
        lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) return;
            
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            
            if (!value) return;
            
            const [fieldName, params] = key.split(';');
            const upperFieldName = fieldName.toUpperCase();
            
            switch(upperFieldName) {
                case 'FN':
                    cardData.name = value;
                    break;
                case 'TITLE':
                    cardData.title = value;
                    break;
                case 'ORG':
                    cardData.organization = value;
                    break;
                case 'EMAIL':
                    cardData.email = value;
                    break;
                case 'TEL':
                    if (params && params.includes('TYPE=CELL')) {
                        cardData.mobile = value;
                    } else {
                        cardData.phone = value;
                    }
                    break;
                case 'ADR':
                    const addressParts = value.split(';');
                    if (addressParts.length >= 3 && addressParts[2]) {
                        cardData.address = addressParts[2];
                    }
                    break;
                case 'NOTE':
                    cardData.socialNote = value;
                    break;
                case 'X-GREETING':
                    greetings.push(value);
                    break;
            }
        });
        
        if (greetings.length > 0) {
            cardData.greetings = greetings;
        }
        
        return cardData;
    }

    /**
     * 檢查惡意內容
     */
    containsMaliciousContent(content) {
        return this.maliciousPatterns.some(pattern => pattern.test(content));
    }

    /**
     * 計算物件深度
     */
    getObjectDepth(obj, depth = 0) {
        if (depth > 20) return depth; // 防止無限遞迴
        
        if (obj === null || typeof obj !== 'object') {
            return depth;
        }

        let maxDepth = depth;
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const currentDepth = this.getObjectDepth(obj[key], depth + 1);
                maxDepth = Math.max(maxDepth, currentDepth);
            }
        }

        return maxDepth;
    }

    /**
     * 驗證檔案完整性
     */
    validateFileIntegrity(file) {
        const validation = {
            isValid: true,
            warnings: [],
            errors: []
        };

        // 檢查檔案擴展名
        const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        
        if (!this.allowedExtensions.includes(fileExtension)) {
            validation.errors.push('不支援的檔案格式');
            validation.isValid = false;
        }

        // 檢查檔案大小
        if (file.size === 0) {
            validation.errors.push('檔案為空');
            validation.isValid = false;
        }

        if (file.size > this.maxFileSize) {
            validation.errors.push(`檔案過大（超過 ${this.maxFileSize / 1024 / 1024}MB）`);
            validation.isValid = false;
        }

        // 檔案名稱安全性
        if (!this.isSecureFileName(file.name)) {
            validation.warnings.push({
                level: 'warning',
                message: '檔案名稱包含特殊字符',
                code: 'UNSAFE_FILENAME'
            });
        }

        return validation;
    }
}

// 全域實例
window.SecureFileValidator = window.SecureFileValidator || new SecureFileValidator();

// 匯出供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecureFileValidator;
}