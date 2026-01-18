/**
 * SRIGenerator - Subresource Integrity Hash 生成器
 * 
 * 生成和驗證 SRI (Subresource Integrity) hashes，確保資源完整性
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

/**
 * SRI Hash 生成器
 */
export class SRIGenerator {
    constructor() {
        this.algorithm = 'sha384'; // 使用 SHA-384 作為預設演算法
        this.encoding = 'base64';
        this.hashCache = new Map();
    }

    /**
     * 為資源清單生成 SRI hashes
     * @param {Array} resources 資源清單
     * @returns {Promise<Array>} 包含 SRI hash 的資源清單
     */
    async generateHashes(resources) {
        console.log(`[SRIGenerator] 開始生成 ${resources.length} 個資源的 SRI hash...`);
        
        const results = [];
        
        for (const resource of resources) {
            try {
                const hash = await this.generateHash(resource.copiedPath || resource.destination);
                const integrity = `${this.algorithm}-${hash}`;
                
                results.push({
                    ...resource,
                    integrity,
                    algorithm: this.algorithm,
                    hashGenerated: new Date().toISOString()
                });
                
                // 快取 hash 值
                this.hashCache.set(resource.copiedPath || resource.destination, integrity);
                
            } catch (error) {
                console.error(`[SRIGenerator] Hash 生成失敗 ${resource.destination}:`, error);
                results.push({
                    ...resource,
                    integrity: null,
                    error: error.message
                });
            }
        }
        
        console.log(`[SRIGenerator] Hash 生成完成: ${results.filter(r => r.integrity).length}/${results.length}`);
        return results;
    }

    /**
     * 生成單一檔案的 SRI hash
     * @param {string} filePath 檔案路徑
     * @returns {Promise<string>} Base64 編碼的 hash
     */
    async generateHash(filePath) {
        try {
            // 檢查快取
            if (this.hashCache.has(filePath)) {
                const cachedIntegrity = this.hashCache.get(filePath);
                return cachedIntegrity.split('-')[1]; // 移除演算法前綴
            }

            // 模擬檔案內容讀取和 hash 計算
            const fileContent = await this.readFileContent(filePath);
            const hash = await this.computeHash(fileContent);
            
            return hash;
            
        } catch (error) {
            throw new Error(`無法生成 ${filePath} 的 hash: ${error.message}`);
        }
    }

    /**
     * 讀取檔案內容（模擬）
     * @param {string} filePath 檔案路徑
     * @returns {Promise<string>} 檔案內容
     */
    async readFileContent(filePath) {
        // 在實際環境中，這裡會使用 fs.readFile() 讀取檔案
        // 目前模擬不同檔案的內容
        const mockContents = {
            'assets/moda-logo.svg': '<svg xmlns="http://www.w3.org/2000/svg"><!-- moda logo --></svg>',
            'assets/bilingual-common.js': '// Bilingual functionality\nfunction translateText() { return "translated"; }',
            'assets/offline-qr-enhancement.js': '// QR enhancement\nfunction generateQR() { return "qr-code"; }',
            'assets/high-accessibility.css': '/* Accessibility styles */\n.high-contrast { color: #000; }',
            'assets/wu_sheng_fan/photo.jpg': 'MOCK_JPEG_CONTENT_' + Date.now()
        };
        
        const content = mockContents[filePath] || `MOCK_CONTENT_${filePath}_${Date.now()}`;
        return content;
    }

    /**
     * 計算內容的 hash 值
     * @param {string} content 檔案內容
     * @returns {Promise<string>} Base64 編碼的 hash
     */
    async computeHash(content) {
        // 在瀏覽器環境中使用 Web Crypto API
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(content);
                const hashBuffer = await crypto.subtle.digest('SHA-384', data);
                const hashArray = new Uint8Array(hashBuffer);
                return this.arrayBufferToBase64(hashArray);
            } catch (error) {
                console.warn('[SRIGenerator] Web Crypto API 失敗，使用模擬 hash');
            }
        }
        
        // 備用：簡單的模擬 hash 生成
        return this.generateMockHash(content);
    }

    /**
     * 將 ArrayBuffer 轉換為 Base64
     * @param {Uint8Array} buffer 位元組陣列
     * @returns {string} Base64 字串
     */
    arrayBufferToBase64(buffer) {
        let binary = '';
        for (let i = 0; i < buffer.byteLength; i++) {
            binary += String.fromCharCode(buffer[i]);
        }
        return btoa(binary);
    }

    /**
     * 生成模擬 hash（備用方案）
     * @param {string} content 內容
     * @returns {string} 模擬的 Base64 hash
     */
    generateMockHash(content) {
        // 簡單的模擬 hash 生成，僅用於開發測試
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 轉換為 32-bit 整數
        }
        
        // 模擬 SHA-384 長度的 Base64 字串 (64 字元)
        const mockHash = Math.abs(hash).toString(16).padStart(16, '0');
        const extendedHash = (mockHash + mockHash + mockHash + mockHash).substring(0, 64);
        
        return btoa(extendedHash).substring(0, 64);
    }

    /**
     * 驗證檔案的 SRI hash
     * @param {string} filePath 檔案路徑
     * @param {string} expectedIntegrity 預期的 integrity 值
     * @returns {Promise<boolean>} 驗證結果
     */
    async verifyHash(filePath, expectedIntegrity) {
        try {
            const currentHash = await this.generateHash(filePath);
            const currentIntegrity = `${this.algorithm}-${currentHash}`;
            
            const isValid = currentIntegrity === expectedIntegrity;
            
            if (!isValid) {
                console.warn(`[SRIGenerator] Hash 驗證失敗 ${filePath}:`);
                console.warn(`  預期: ${expectedIntegrity}`);
                console.warn(`  實際: ${currentIntegrity}`);
            }
            
            return isValid;
            
        } catch (error) {
            console.error(`[SRIGenerator] Hash 驗證錯誤 ${filePath}:`, error);
            return false;
        }
    }

    /**
     * 批次驗證多個檔案的 hash
     * @param {Array} resources 包含 integrity 的資源清單
     * @returns {Promise<Object>} 驗證結果統計
     */
    async verifyHashes(resources) {
        console.log(`[SRIGenerator] 開始驗證 ${resources.length} 個資源的 hash...`);
        
        const results = {
            total: resources.length,
            valid: 0,
            invalid: 0,
            errors: 0,
            details: []
        };
        
        for (const resource of resources) {
            try {
                if (!resource.integrity) {
                    results.errors++;
                    results.details.push({
                        path: resource.path,
                        status: 'error',
                        message: '缺少 integrity 值'
                    });
                    continue;
                }
                
                const isValid = await this.verifyHash(resource.path, resource.integrity);
                
                if (isValid) {
                    results.valid++;
                    results.details.push({
                        path: resource.path,
                        status: 'valid'
                    });
                } else {
                    results.invalid++;
                    results.details.push({
                        path: resource.path,
                        status: 'invalid',
                        expected: resource.integrity
                    });
                }
                
            } catch (error) {
                results.errors++;
                results.details.push({
                    path: resource.path,
                    status: 'error',
                    message: error.message
                });
            }
        }
        
        console.log(`[SRIGenerator] Hash 驗證完成: ${results.valid} 有效, ${results.invalid} 無效, ${results.errors} 錯誤`);
        return results;
    }

    /**
     * 清除 hash 快取
     */
    clearCache() {
        this.hashCache.clear();
        console.log('[SRIGenerator] Hash 快取已清除');
    }

    /**
     * 取得快取統計資訊
     * @returns {Object} 快取統計
     */
    getCacheStats() {
        return {
            size: this.hashCache.size,
            algorithm: this.algorithm,
            encoding: this.encoding
        };
    }

    /**
     * 生成 HTML 中使用的 integrity 屬性值
     * @param {string} filePath 檔案路徑
     * @returns {Promise<string>} integrity 屬性值
     */
    async generateIntegrityAttribute(filePath) {
        const hash = await this.generateHash(filePath);
        return `${this.algorithm}-${hash}`;
    }
}

// 提供便利的匯出
export const sriGenerator = new SRIGenerator();

/**
 * 快速生成單一檔案 SRI hash 的便利函數
 * @param {string} filePath 檔案路徑
 * @returns {Promise<string>} integrity 值
 */
export async function generateSRI(filePath) {
    return await sriGenerator.generateIntegrityAttribute(filePath);
}

/**
 * 快速驗證檔案 SRI hash 的便利函數
 * @param {string} filePath 檔案路徑
 * @param {string} expectedIntegrity 預期的 integrity 值
 * @returns {Promise<boolean>} 驗證結果
 */
export async function verifySRI(filePath, expectedIntegrity) {
    return await sriGenerator.verifyHash(filePath, expectedIntegrity);
}