/**
 * PlatformValidator - 平台特定驗證器
 * 
 * 驗證不同靜態托管平台的部署配置和優化
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

/**
 * 平台驗證器
 */
export class PlatformValidator {
    constructor() {
        this.supportedPlatforms = [
            'github-pages',
            'cloudflare-pages', 
            'netlify',
            'vercel',
            'firebase'
        ];
    }

    /**
     * 驗證特定平台配置
     * @param {string} platformName 平台名稱
     * @returns {Promise<Object>} 驗證結果
     */
    async validate(platformName) {
        try {
            console.log(`[PlatformValidator] 驗證平台: ${platformName}`);

            const checks = [];
            let passed = 0;

            // 通用檢查
            const commonChecks = await this.validateCommonRequirements();
            checks.push(...commonChecks.checks);
            passed += commonChecks.passed;

            // 平台特定檢查
            const platformChecks = await this.validatePlatformSpecific(platformName);
            checks.push(...platformChecks.checks);
            passed += platformChecks.passed;

            return {
                platform: platformName,
                passed,
                total: checks.length,
                checks,
                score: Math.round((passed / checks.length) * 100)
            };

        } catch (error) {
            return {
                platform: platformName,
                passed: 0,
                total: 1,
                checks: [{
                    name: '平台驗證',
                    passed: false,
                    message: `驗證失敗: ${error.message}`
                }],
                score: 0
            };
        }
    }

    /**
     * 驗證通用平台需求
     * @returns {Promise<Object>} 通用驗證結果
     */
    async validateCommonRequirements() {
        const checks = [];
        let passed = 0;

        // 檢查基本檔案存在
        const requiredFiles = [
            { path: 'index.html', name: '主頁面' },
            { path: 'manifest.json', name: 'PWA Manifest' },
            { path: 'sw.js', name: 'Service Worker' }
        ];

        for (const file of requiredFiles) {
            try {
                const response = await fetch(file.path, { method: 'HEAD' });
                const filePassed = response.ok;
                checks.push({
                    name: file.name,
                    passed: filePassed,
                    message: filePassed ? '檔案存在' : `HTTP ${response.status}`
                });
                if (filePassed) passed++;
            } catch (error) {
                checks.push({
                    name: file.name,
                    passed: false,
                    message: '檔案無法存取'
                });
            }
        }

        // 檢查 HTTPS
        const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
        checks.push({
            name: 'HTTPS 連線',
            passed: isHTTPS,
            message: isHTTPS ? 'HTTPS 已啟用' : '需要 HTTPS 連線'
        });
        if (isHTTPS) passed++;

        // 檢查響應式設計
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        checks.push({
            name: '響應式設計',
            passed: !!viewportMeta,
            message: viewportMeta ? 'Viewport 已配置' : '缺少 viewport meta 標籤'
        });
        if (viewportMeta) passed++;

        return { checks, passed };
    }

    /**
     * 驗證平台特定需求
     * @param {string} platformName 平台名稱
     * @returns {Promise<Object>} 平台特定驗證結果
     */
    async validatePlatformSpecific(platformName) {
        switch (platformName) {
            case 'github-pages':
                return await this.validateGitHubPages();
            case 'cloudflare-pages':
                return await this.validateCloudflarePages();
            case 'netlify':
                return await this.validateNetlify();
            case 'vercel':
                return await this.validateVercel();
            case 'firebase':
                return await this.validateFirebase();
            default:
                return await this.validateGenericPlatform();
        }
    }

    /**
     * 驗證 GitHub Pages 特定需求
     * @returns {Promise<Object>} GitHub Pages 驗證結果
     */
    async validateGitHubPages() {
        const checks = [];
        let passed = 0;

        // 檢查基礎路徑配置
        const basePath = this.detectBasePath();
        const hasBasePath = basePath && basePath !== '/';
        checks.push({
            name: 'GitHub Pages 基礎路徑',
            passed: true, // GitHub Pages 可以有或沒有基礎路徑
            message: hasBasePath ? `基礎路徑: ${basePath}` : '根路徑部署'
        });
        passed++;

        // 檢查 404 頁面
        try {
            const response = await fetch('404.html', { method: 'HEAD' });
            const has404 = response.ok;
            checks.push({
                name: '404 錯誤頁面',
                passed: has404,
                message: has404 ? '自訂 404 頁面存在' : '建議添加 404.html'
            });
            if (has404) passed++;
        } catch (error) {
            checks.push({
                name: '404 錯誤頁面',
                passed: false,
                message: '建議添加 404.html'
            });
        }

        // 檢查 CNAME 檔案（自訂網域）
        try {
            const response = await fetch('CNAME', { method: 'HEAD' });
            const hasCNAME = response.ok;
            checks.push({
                name: '自訂網域配置',
                passed: true, // 可選功能
                message: hasCNAME ? '自訂網域已配置' : '使用預設 GitHub Pages 網域'
            });
            passed++;
        } catch (error) {
            checks.push({
                name: '自訂網域配置',
                passed: true,
                message: '使用預設 GitHub Pages 網域'
            });
            passed++;
        }

        return { checks, passed };
    }

    /**
     * 驗證 Cloudflare Pages 特定需求
     * @returns {Promise<Object>} Cloudflare Pages 驗證結果
     */
    async validateCloudflarePages() {
        const checks = [];
        let passed = 0;

        // 檢查 _headers 檔案
        try {
            const response = await fetch('_headers', { method: 'HEAD' });
            const hasHeaders = response.ok;
            checks.push({
                name: 'Cloudflare Headers 配置',
                passed: hasHeaders,
                message: hasHeaders ? '_headers 檔案存在' : '建議添加 _headers 檔案'
            });
            if (hasHeaders) passed++;
        } catch (error) {
            checks.push({
                name: 'Cloudflare Headers 配置',
                passed: false,
                message: '建議添加 _headers 檔案'
            });
        }

        // 檢查 _redirects 檔案
        try {
            const response = await fetch('_redirects', { method: 'HEAD' });
            const hasRedirects = response.ok;
            checks.push({
                name: 'Cloudflare Redirects 配置',
                passed: true, // 可選功能
                message: hasRedirects ? '_redirects 檔案存在' : '無重定向規則'
            });
            passed++;
        } catch (error) {
            checks.push({
                name: 'Cloudflare Redirects 配置',
                passed: true,
                message: '無重定向規則'
            });
            passed++;
        }

        // 檢查邊緣優化
        const hasServiceWorker = 'serviceWorker' in navigator;
        checks.push({
            name: 'Cloudflare 邊緣優化',
            passed: hasServiceWorker,
            message: hasServiceWorker ? 'Service Worker 支援邊緣快取' : '邊緣優化受限'
        });
        if (hasServiceWorker) passed++;

        return { checks, passed };
    }

    /**
     * 驗證 Netlify 特定需求
     * @returns {Promise<Object>} Netlify 驗證結果
     */
    async validateNetlify() {
        const checks = [];
        let passed = 0;

        // 檢查 _redirects 檔案
        try {
            const response = await fetch('_redirects', { method: 'HEAD' });
            const hasRedirects = response.ok;
            checks.push({
                name: 'Netlify Redirects 配置',
                passed: true, // 可選功能
                message: hasRedirects ? '_redirects 檔案存在' : '無重定向規則'
            });
            passed++;
        } catch (error) {
            checks.push({
                name: 'Netlify Redirects 配置',
                passed: true,
                message: '無重定向規則'
            });
            passed++;
        }

        // 檢查 netlify.toml 配置
        try {
            const response = await fetch('netlify.toml', { method: 'HEAD' });
            const hasConfig = response.ok;
            checks.push({
                name: 'Netlify 配置檔案',
                passed: true, // 可選功能
                message: hasConfig ? 'netlify.toml 存在' : '使用預設配置'
            });
            passed++;
        } catch (error) {
            checks.push({
                name: 'Netlify 配置檔案',
                passed: true,
                message: '使用預設配置'
            });
            passed++;
        }

        // 檢查表單處理
        const hasForms = document.querySelector('form[netlify]');
        checks.push({
            name: 'Netlify 表單處理',
            passed: true, // 可選功能
            message: hasForms ? 'Netlify 表單已配置' : '無表單處理需求'
        });
        passed++;

        return { checks, passed };
    }

    /**
     * 驗證 Vercel 特定需求
     * @returns {Promise<Object>} Vercel 驗證結果
     */
    async validateVercel() {
        const checks = [];
        let passed = 0;

        // 檢查 vercel.json 配置
        try {
            const response = await fetch('vercel.json', { method: 'HEAD' });
            const hasConfig = response.ok;
            checks.push({
                name: 'Vercel 配置檔案',
                passed: true, // 可選功能
                message: hasConfig ? 'vercel.json 存在' : '使用預設配置'
            });
            passed++;
        } catch (error) {
            checks.push({
                name: 'Vercel 配置檔案',
                passed: true,
                message: '使用預設配置'
            });
            passed++;
        }

        // 檢查邊緣函數支援
        const hasServiceWorker = 'serviceWorker' in navigator;
        checks.push({
            name: 'Vercel 邊緣函數',
            passed: hasServiceWorker,
            message: hasServiceWorker ? 'Service Worker 支援邊緣運算' : '邊緣函數受限'
        });
        if (hasServiceWorker) passed++;

        // 檢查分析支援
        const hasAnalytics = document.querySelector('script[src*="vercel"]');
        checks.push({
            name: 'Vercel Analytics',
            passed: true, // 可選功能
            message: hasAnalytics ? 'Vercel Analytics 已配置' : '無分析追蹤'
        });
        passed++;

        return { checks, passed };
    }

    /**
     * 驗證 Firebase 特定需求
     * @returns {Promise<Object>} Firebase 驗證結果
     */
    async validateFirebase() {
        const checks = [];
        let passed = 0;

        // 檢查 firebase.json 配置
        try {
            const response = await fetch('firebase.json', { method: 'HEAD' });
            const hasConfig = response.ok;
            checks.push({
                name: 'Firebase 配置檔案',
                passed: true, // 可選功能
                message: hasConfig ? 'firebase.json 存在' : '使用預設配置'
            });
            passed++;
        } catch (error) {
            checks.push({
                name: 'Firebase 配置檔案',
                passed: true,
                message: '使用預設配置'
            });
            passed++;
        }

        // 檢查 Firebase SDK
        const hasFirebaseSDK = window.firebase || document.querySelector('script[src*="firebase"]');
        checks.push({
            name: 'Firebase SDK',
            passed: true, // 可選功能
            message: hasFirebaseSDK ? 'Firebase SDK 已載入' : '無 Firebase 功能'
        });
        passed++;

        // 檢查安全規則
        checks.push({
            name: 'Firebase 安全規則',
            passed: true, // 假設已正確配置
            message: 'Firebase 安全規則需在控制台配置'
        });
        passed++;

        return { checks, passed };
    }

    /**
     * 驗證通用平台需求
     * @returns {Promise<Object>} 通用平台驗證結果
     */
    async validateGenericPlatform() {
        const checks = [];
        let passed = 0;

        // 基本靜態托管檢查
        checks.push({
            name: '靜態托管相容性',
            passed: true,
            message: '基本靜態檔案托管'
        });
        passed++;

        // 檢查快取標頭
        try {
            const response = await fetch(location.href, { method: 'HEAD' });
            const hasCacheControl = response.headers.get('cache-control');
            checks.push({
                name: '快取控制',
                passed: !!hasCacheControl,
                message: hasCacheControl ? `快取策略: ${hasCacheControl}` : '建議配置快取標頭'
            });
            if (hasCacheControl) passed++;
        } catch (error) {
            checks.push({
                name: '快取控制',
                passed: false,
                message: '無法檢查快取標頭'
            });
        }

        return { checks, passed };
    }

    /**
     * 檢測基礎路徑
     * @returns {string} 基礎路徑
     */
    detectBasePath() {
        const pathname = location.pathname;
        
        // GitHub Pages 模式檢測
        if (location.hostname.includes('.github.io')) {
            const pathParts = pathname.split('/').filter(Boolean);
            return pathParts.length > 0 ? `/${pathParts[0]}` : '/';
        }
        
        return '/';
    }

    /**
     * 取得支援的平台清單
     * @returns {Array} 平台清單
     */
    getSupportedPlatforms() {
        return [...this.supportedPlatforms];
    }

    /**
     * 檢查平台是否支援
     * @param {string} platformName 平台名稱
     * @returns {boolean} 是否支援
     */
    isPlatformSupported(platformName) {
        return this.supportedPlatforms.includes(platformName);
    }
}

// 提供便利的匯出
export const platformValidator = new PlatformValidator();