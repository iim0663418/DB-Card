/**
 * ResourceManager - 資源整合管理系統
 * 
 * 從根目錄複製必要資源到 PWA 目錄，生成 SRI hash，建立資源清單
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

import { ResourceCopier } from '../utils/resource-copier.js';
import { SRIGenerator } from '../utils/sri-generator.js';
import { ResourceManifest } from '../utils/resource-manifest.js';

/**
 * 資源管理器 - 統籌資源整合流程
 */
export class ResourceManager {
    constructor() {
        this.copier = new ResourceCopier();
        this.sriGenerator = new SRIGenerator();
        this.manifest = new ResourceManifest();
        this.processedResources = new Map();
    }

    /**
     * 執行完整的資源整合流程
     * @returns {Promise<Object>} 整合結果報告
     */
    async integrateResources() {
        try {
            console.log('[ResourceManager] 開始資源整合流程...');
            
            // 1. 發現需要的資源
            const requiredResources = await this.discoverRequiredResources();
            console.log(`[ResourceManager] 發現 ${requiredResources.length} 個必要資源`);

            // 2. 複製資源檔案
            const copyResults = await this.copier.copyResources(requiredResources);
            console.log(`[ResourceManager] 成功複製 ${copyResults.success.length} 個資源`);

            // 3. 生成 SRI hashes
            const sriResults = await this.sriGenerator.generateHashes(copyResults.success);
            console.log(`[ResourceManager] 生成 ${sriResults.length} 個 SRI hash`);

            // 4. 建立資源清單
            const manifestResult = await this.manifest.createManifest(sriResults);
            console.log('[ResourceManager] 資源清單建立完成');

            // 5. 驗證完整性
            const validationResult = await this.validateIntegrity();
            console.log(`[ResourceManager] 完整性驗證: ${validationResult.valid ? '通過' : '失敗'}`);

            return {
                success: true,
                resourcesProcessed: sriResults.length,
                manifestPath: manifestResult.path,
                integrity: validationResult,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('[ResourceManager] 資源整合失敗:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 發現專案中需要的資源
     * @returns {Promise<Array>} 資源清單
     */
    async discoverRequiredResources() {
        // 基於 PATH-001 的路徑審計結果，識別必要資源
        const coreResources = [
            {
                source: '../../assets/moda-logo.svg',
                destination: 'assets/moda-logo.svg',
                type: 'image',
                critical: true
            },
            {
                source: '../../assets/bilingual-common.js',
                destination: 'assets/bilingual-common.js',
                type: 'script',
                critical: true
            },
            {
                source: '../../assets/offline-qr-enhancement.js',
                destination: 'assets/offline-qr-enhancement.js',
                type: 'script',
                critical: false
            },
            {
                source: '../../assets/high-accessibility.css',
                destination: 'assets/high-accessibility.css',
                type: 'style',
                critical: true
            }
        ];

        // 檢查可選資源
        const optionalResources = await this.discoverOptionalResources();
        
        return [...coreResources, ...optionalResources];
    }

    /**
     * 發現可選資源（如範例圖片）
     * @returns {Promise<Array>} 可選資源清單
     */
    async discoverOptionalResources() {
        const optional = [];
        
        try {
            // 檢查範例使用者資源
            const examplePhotoPath = '../../assets/wu_sheng_fan/photo.jpg';
            optional.push({
                source: examplePhotoPath,
                destination: 'assets/wu_sheng_fan/photo.jpg',
                type: 'image',
                critical: false
            });
        } catch (error) {
            console.warn('[ResourceManager] 可選資源檢查失敗:', error.message);
        }

        return optional;
    }

    /**
     * 驗證資源完整性
     * @returns {Promise<Object>} 驗證結果
     */
    async validateIntegrity() {
        try {
            const manifest = await this.manifest.loadManifest();
            const validationResults = [];

            for (const resource of manifest.resources) {
                const isValid = await this.sriGenerator.verifyHash(
                    resource.path,
                    resource.integrity
                );
                
                validationResults.push({
                    path: resource.path,
                    valid: isValid,
                    integrity: resource.integrity
                });
            }

            const allValid = validationResults.every(result => result.valid);
            
            return {
                valid: allValid,
                results: validationResults,
                totalResources: validationResults.length,
                validResources: validationResults.filter(r => r.valid).length
            };

        } catch (error) {
            console.error('[ResourceManager] 完整性驗證失敗:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * 取得資源整合狀態
     * @returns {Promise<Object>} 狀態資訊
     */
    async getStatus() {
        try {
            const manifest = await this.manifest.loadManifest();
            return {
                hasManifest: true,
                resourceCount: manifest.resources.length,
                lastUpdated: manifest.metadata.created,
                version: manifest.metadata.version
            };
        } catch (error) {
            return {
                hasManifest: false,
                error: error.message
            };
        }
    }

    /**
     * 清理資源（開發用）
     * @returns {Promise<boolean>} 清理結果
     */
    async cleanup() {
        try {
            await this.copier.cleanup();
            await this.manifest.cleanup();
            console.log('[ResourceManager] 資源清理完成');
            return true;
        } catch (error) {
            console.error('[ResourceManager] 清理失敗:', error);
            return false;
        }
    }
}

// 提供簡化的 API
export const resourceManager = new ResourceManager();

/**
 * 快速整合資源的便利函數
 * @returns {Promise<Object>} 整合結果
 */
export async function integrateResources() {
    return await resourceManager.integrateResources();
}

/**
 * 驗證資源完整性的便利函數
 * @returns {Promise<Object>} 驗證結果
 */
export async function validateResourceIntegrity() {
    return await resourceManager.validateIntegrity();
}