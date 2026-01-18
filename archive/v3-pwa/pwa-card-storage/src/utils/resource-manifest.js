/**
 * ResourceManifest - 資源清單管理器
 * 
 * 建立、管理和驗證資源清單，包含 SRI hashes 和元資料
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

/**
 * 資源清單管理器
 */
export class ResourceManifest {
    constructor() {
        this.manifestPath = 'config/resource-manifest.json';
        this.version = '1.0.0';
        this.manifestCache = null;
    }

    /**
     * 建立資源清單
     * @param {Array} resources 包含 SRI hash 的資源清單
     * @returns {Promise<Object>} 清單建立結果
     */
    async createManifest(resources) {
        try {
            console.log(`[ResourceManifest] 建立資源清單，包含 ${resources.length} 個資源...`);

            const manifest = {
                metadata: {
                    version: this.version,
                    created: new Date().toISOString(),
                    generator: 'DB-Card ResourceManager',
                    totalResources: resources.length
                },
                resources: this.processResources(resources),
                integrity: {
                    algorithm: 'sha384',
                    totalHashes: resources.filter(r => r.integrity).length
                },
                deployment: {
                    platforms: ['github-pages', 'cloudflare-pages', 'netlify', 'vercel', 'firebase'],
                    requirements: {
                        https: true,
                        sri: true,
                        csp: true
                    }
                }
            };

            // 儲存清單
            const saveResult = await this.saveManifest(manifest);
            
            // 快取清單
            this.manifestCache = manifest;

            console.log(`[ResourceManifest] 資源清單建立完成: ${this.manifestPath}`);
            
            return {
                success: true,
                path: this.manifestPath,
                resourceCount: manifest.resources.length,
                manifestSize: JSON.stringify(manifest).length
            };

        } catch (error) {
            console.error('[ResourceManifest] 清單建立失敗:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 處理資源清單，標準化格式
     * @param {Array} resources 原始資源清單
     * @returns {Array} 處理後的資源清單
     */
    processResources(resources) {
        return resources.map(resource => {
            const processedResource = {
                path: resource.copiedPath || resource.destination,
                source: resource.source,
                type: resource.type,
                critical: resource.critical || false,
                size: resource.size || 0,
                integrity: resource.integrity || null,
                lastModified: resource.hashGenerated || new Date().toISOString()
            };

            // 添加資源特定的元資料
            if (resource.type === 'script') {
                processedResource.loadStrategy = resource.critical ? 'preload' : 'defer';
            } else if (resource.type === 'style') {
                processedResource.loadStrategy = 'preload';
            } else if (resource.type === 'image') {
                processedResource.loadStrategy = 'lazy';
            }

            return processedResource;
        }).sort((a, b) => {
            // 關鍵資源優先
            if (a.critical && !b.critical) return -1;
            if (!a.critical && b.critical) return 1;
            // 按類型排序
            return a.type.localeCompare(b.type);
        });
    }

    /**
     * 儲存清單到檔案（模擬）
     * @param {Object} manifest 清單物件
     * @returns {Promise<boolean>} 儲存結果
     */
    async saveManifest(manifest) {
        try {
            // 在實際環境中，這裡會使用 fs.writeFile() 儲存檔案
            // 目前模擬檔案儲存
            const manifestJson = JSON.stringify(manifest, null, 2);
            
            console.log(`[ResourceManifest] 模擬儲存清單到 ${this.manifestPath}`);
            console.log(`[ResourceManifest] 清單大小: ${manifestJson.length} bytes`);
            
            // 模擬檔案寫入延遲
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return true;
        } catch (error) {
            throw new Error(`清單儲存失敗: ${error.message}`);
        }
    }

    /**
     * 載入現有的資源清單
     * @returns {Promise<Object>} 清單物件
     */
    async loadManifest() {
        try {
            // 檢查快取
            if (this.manifestCache) {
                return this.manifestCache;
            }

            // 在實際環境中，這裡會使用 fs.readFile() 讀取檔案
            // 目前模擬清單載入
            const mockManifest = {
                metadata: {
                    version: this.version,
                    created: new Date().toISOString(),
                    generator: 'DB-Card ResourceManager',
                    totalResources: 0
                },
                resources: [],
                integrity: {
                    algorithm: 'sha384',
                    totalHashes: 0
                },
                deployment: {
                    platforms: ['github-pages', 'cloudflare-pages', 'netlify', 'vercel', 'firebase'],
                    requirements: {
                        https: true,
                        sri: true,
                        csp: true
                    }
                }
            };

            this.manifestCache = mockManifest;
            return mockManifest;

        } catch (error) {
            throw new Error(`清單載入失敗: ${error.message}`);
        }
    }

    /**
     * 驗證清單完整性
     * @returns {Promise<Object>} 驗證結果
     */
    async validateManifest() {
        try {
            const manifest = await this.loadManifest();
            const validationResults = {
                valid: true,
                errors: [],
                warnings: [],
                stats: {
                    totalResources: manifest.resources.length,
                    criticalResources: manifest.resources.filter(r => r.critical).length,
                    resourcesWithSRI: manifest.resources.filter(r => r.integrity).length
                }
            };

            // 檢查必要欄位
            if (!manifest.metadata || !manifest.metadata.version) {
                validationResults.errors.push('缺少版本資訊');
                validationResults.valid = false;
            }

            if (!manifest.resources || !Array.isArray(manifest.resources)) {
                validationResults.errors.push('資源清單格式錯誤');
                validationResults.valid = false;
            }

            // 檢查資源完整性
            for (const resource of manifest.resources) {
                if (!resource.path) {
                    validationResults.errors.push(`資源缺少路徑: ${JSON.stringify(resource)}`);
                    validationResults.valid = false;
                }

                if (resource.critical && !resource.integrity) {
                    validationResults.warnings.push(`關鍵資源缺少 SRI hash: ${resource.path}`);
                }
            }

            // 檢查重複資源
            const paths = manifest.resources.map(r => r.path);
            const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
            if (duplicates.length > 0) {
                validationResults.warnings.push(`發現重複資源: ${duplicates.join(', ')}`);
            }

            return validationResults;

        } catch (error) {
            return {
                valid: false,
                errors: [error.message],
                warnings: [],
                stats: {}
            };
        }
    }

    /**
     * 更新資源清單中的特定資源
     * @param {string} resourcePath 資源路徑
     * @param {Object} updates 更新資料
     * @returns {Promise<boolean>} 更新結果
     */
    async updateResource(resourcePath, updates) {
        try {
            const manifest = await this.loadManifest();
            const resourceIndex = manifest.resources.findIndex(r => r.path === resourcePath);

            if (resourceIndex === -1) {
                throw new Error(`找不到資源: ${resourcePath}`);
            }

            // 更新資源資料
            manifest.resources[resourceIndex] = {
                ...manifest.resources[resourceIndex],
                ...updates,
                lastModified: new Date().toISOString()
            };

            // 更新清單元資料
            manifest.metadata.lastUpdated = new Date().toISOString();

            // 儲存更新後的清單
            await this.saveManifest(manifest);
            this.manifestCache = manifest;

            console.log(`[ResourceManifest] 資源已更新: ${resourcePath}`);
            return true;

        } catch (error) {
            console.error('[ResourceManifest] 資源更新失敗:', error);
            return false;
        }
    }

    /**
     * 生成 HTML 載入標籤
     * @param {string} resourceType 資源類型 ('script', 'style', 'image')
     * @returns {Promise<Array>} HTML 標籤陣列
     */
    async generateLoadTags(resourceType = null) {
        try {
            const manifest = await this.loadManifest();
            const resources = resourceType 
                ? manifest.resources.filter(r => r.type === resourceType)
                : manifest.resources;

            const tags = resources.map(resource => {
                switch (resource.type) {
                    case 'script':
                        return `<script src="${resource.path}"${resource.integrity ? ` integrity="${resource.integrity}"` : ''} crossorigin="anonymous"${resource.loadStrategy === 'defer' ? ' defer' : ''}></script>`;
                    
                    case 'style':
                        return `<link rel="stylesheet" href="${resource.path}"${resource.integrity ? ` integrity="${resource.integrity}"` : ''} crossorigin="anonymous">`;
                    
                    case 'image':
                        return `<img src="${resource.path}" alt="" loading="${resource.loadStrategy === 'lazy' ? 'lazy' : 'eager'}">`;
                    
                    default:
                        return `<!-- Unknown resource type: ${resource.type} -->`;
                }
            });

            return tags;

        } catch (error) {
            console.error('[ResourceManifest] 標籤生成失敗:', error);
            return [];
        }
    }

    /**
     * 清理清單和快取
     * @returns {Promise<boolean>} 清理結果
     */
    async cleanup() {
        try {
            this.manifestCache = null;
            console.log('[ResourceManifest] 清單快取已清除');
            
            // 在實際環境中，這裡可能會刪除清單檔案
            // 目前僅清除快取
            return true;
        } catch (error) {
            console.error('[ResourceManifest] 清理失敗:', error);
            return false;
        }
    }

    /**
     * 取得清單統計資訊
     * @returns {Promise<Object>} 統計資訊
     */
    async getStats() {
        try {
            const manifest = await this.loadManifest();
            
            return {
                version: manifest.metadata.version,
                created: manifest.metadata.created,
                totalResources: manifest.resources.length,
                criticalResources: manifest.resources.filter(r => r.critical).length,
                resourcesWithSRI: manifest.resources.filter(r => r.integrity).length,
                resourceTypes: this.getResourceTypeStats(manifest.resources),
                totalSize: manifest.resources.reduce((sum, r) => sum + (r.size || 0), 0)
            };
        } catch (error) {
            return {
                error: error.message
            };
        }
    }

    /**
     * 取得資源類型統計
     * @param {Array} resources 資源清單
     * @returns {Object} 類型統計
     */
    getResourceTypeStats(resources) {
        const stats = {};
        for (const resource of resources) {
            stats[resource.type] = (stats[resource.type] || 0) + 1;
        }
        return stats;
    }
}

// 提供便利的匯出
export const resourceManifest = new ResourceManifest();

/**
 * 快速建立資源清單的便利函數
 * @param {Array} resources 資源清單
 * @returns {Promise<Object>} 建立結果
 */
export async function createResourceManifest(resources) {
    return await resourceManifest.createManifest(resources);
}

/**
 * 快速載入資源清單的便利函數
 * @returns {Promise<Object>} 清單物件
 */
export async function loadResourceManifest() {
    return await resourceManifest.loadManifest();
}