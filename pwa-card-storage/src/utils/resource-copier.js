/**
 * ResourceCopier - 安全的資源檔案複製工具
 * 
 * 提供安全的檔案複製功能，包含路徑驗證、檔案類型檢查、惡意檔案防護
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

/**
 * 資源複製器 - 安全的檔案操作
 */
export class ResourceCopier {
    constructor() {
        this.allowedExtensions = new Set([
            '.svg', '.js', '.css', '.jpg', '.jpeg', '.png', '.json', '.md'
        ]);
        this.blockedPatterns = [
            /\.exe$/i, /\.bat$/i, /\.sh$/i, /\.php$/i, /\.asp$/i
        ];
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
    }

    /**
     * 複製資源檔案清單
     * @param {Array} resources 資源清單
     * @returns {Promise<Object>} 複製結果
     */
    async copyResources(resources) {
        const results = {
            success: [],
            failed: [],
            skipped: []
        };

        console.log(`[ResourceCopier] 開始複製 ${resources.length} 個資源...`);

        for (const resource of resources) {
            try {
                const copyResult = await this.copyResource(resource);
                if (copyResult.success) {
                    results.success.push({
                        ...resource,
                        copiedPath: copyResult.path,
                        size: copyResult.size
                    });
                } else {
                    results.failed.push({
                        ...resource,
                        error: copyResult.error
                    });
                }
            } catch (error) {
                console.error(`[ResourceCopier] 複製失敗 ${resource.source}:`, error);
                results.failed.push({
                    ...resource,
                    error: error.message
                });
            }
        }

        console.log(`[ResourceCopier] 複製完成: ${results.success.length} 成功, ${results.failed.length} 失敗`);
        return results;
    }

    /**
     * 複製單一資源檔案
     * @param {Object} resource 資源資訊
     * @returns {Promise<Object>} 複製結果
     */
    async copyResource(resource) {
        try {
            // 1. 安全性檢查
            const securityCheck = this.validateResourceSecurity(resource);
            if (!securityCheck.valid) {
                return {
                    success: false,
                    error: `安全檢查失敗: ${securityCheck.reason}`
                };
            }

            // 2. 檢查來源檔案是否存在
            const sourceExists = await this.checkFileExists(resource.source);
            if (!sourceExists) {
                return {
                    success: false,
                    error: '來源檔案不存在'
                };
            }

            // 3. 建立目標目錄
            await this.ensureDirectoryExists(resource.destination);

            // 4. 執行檔案複製（模擬）
            const copyResult = await this.performFileCopy(resource);
            
            return {
                success: true,
                path: resource.destination,
                size: copyResult.size,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 驗證資源安全性
     * @param {Object} resource 資源資訊
     * @returns {Object} 驗證結果
     */
    validateResourceSecurity(resource) {
        // 1. 檢查檔案副檔名
        const extension = this.getFileExtension(resource.source);
        if (!this.allowedExtensions.has(extension)) {
            return {
                valid: false,
                reason: `不允許的檔案類型: ${extension}`
            };
        }

        // 2. 檢查惡意檔案模式
        for (const pattern of this.blockedPatterns) {
            if (pattern.test(resource.source)) {
                return {
                    valid: false,
                    reason: '檔案類型被封鎖'
                };
            }
        }

        // 3. 檢查路徑遍歷攻擊
        if (resource.source.includes('..') || resource.destination.includes('..')) {
            return {
                valid: false,
                reason: '偵測到路徑遍歷攻擊'
            };
        }

        // 4. 檢查目標路徑限制
        if (!resource.destination.startsWith('assets/')) {
            return {
                valid: false,
                reason: '目標路徑必須在 assets/ 目錄內'
            };
        }

        return { valid: true };
    }

    /**
     * 檢查檔案是否存在（模擬）
     * @param {string} filePath 檔案路徑
     * @returns {Promise<boolean>} 檔案是否存在
     */
    async checkFileExists(filePath) {
        // 在實際環境中，這裡會使用 fs.access() 或類似 API
        // 目前模擬檔案存在性檢查
        const knownFiles = [
            '../../assets/moda-logo.svg',
            '../../assets/bilingual-common.js',
            '../../assets/offline-qr-enhancement.js',
            '../../assets/high-accessibility.css',
            '../../assets/wu_sheng_fan/photo.jpg'
        ];
        
        return knownFiles.includes(filePath);
    }

    /**
     * 確保目標目錄存在
     * @param {string} filePath 檔案路徑
     * @returns {Promise<void>}
     */
    async ensureDirectoryExists(filePath) {
        const directory = filePath.substring(0, filePath.lastIndexOf('/'));
        console.log(`[ResourceCopier] 確保目錄存在: ${directory}`);
        
        // 在實際環境中，這裡會使用 fs.mkdir() 建立目錄
        // 目前模擬目錄建立
        return Promise.resolve();
    }

    /**
     * 執行檔案複製
     * @param {Object} resource 資源資訊
     * @returns {Promise<Object>} 複製結果
     */
    async performFileCopy(resource) {
        // 模擬檔案複製過程
        console.log(`[ResourceCopier] 複製檔案: ${resource.source} -> ${resource.destination}`);
        
        // 模擬檔案大小檢查
        const simulatedSize = Math.floor(Math.random() * 100000) + 1000; // 1KB-100KB
        
        if (simulatedSize > this.maxFileSize) {
            throw new Error(`檔案過大: ${simulatedSize} bytes`);
        }

        // 在實際環境中，這裡會使用 fs.copyFile() 或類似 API
        // 目前模擬成功複製
        return {
            size: simulatedSize,
            checksum: this.generateMockChecksum(resource.source)
        };
    }

    /**
     * 取得檔案副檔名
     * @param {string} filePath 檔案路徑
     * @returns {string} 副檔名
     */
    getFileExtension(filePath) {
        const lastDot = filePath.lastIndexOf('.');
        return lastDot === -1 ? '' : filePath.substring(lastDot).toLowerCase();
    }

    /**
     * 生成模擬檢查碼
     * @param {string} filePath 檔案路徑
     * @returns {string} 檢查碼
     */
    generateMockChecksum(filePath) {
        // 簡單的模擬檢查碼生成
        let hash = 0;
        for (let i = 0; i < filePath.length; i++) {
            const char = filePath.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 轉換為 32-bit 整數
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * 清理複製的資源（開發用）
     * @returns {Promise<boolean>} 清理結果
     */
    async cleanup() {
        try {
            console.log('[ResourceCopier] 執行資源清理...');
            // 在實際環境中，這裡會刪除複製的檔案
            // 目前模擬清理過程
            return true;
        } catch (error) {
            console.error('[ResourceCopier] 清理失敗:', error);
            return false;
        }
    }

    /**
     * 取得複製統計資訊
     * @returns {Object} 統計資訊
     */
    getStats() {
        return {
            allowedExtensions: Array.from(this.allowedExtensions),
            maxFileSize: this.maxFileSize,
            blockedPatterns: this.blockedPatterns.length
        };
    }
}

// 提供便利的匯出
export const resourceCopier = new ResourceCopier();