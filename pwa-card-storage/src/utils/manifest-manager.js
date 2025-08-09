/**
 * ManifestManager - PWA Manifest 管理器
 * 
 * 管理 PWA manifest 配置、驗證和動態更新
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

/**
 * PWA Manifest 管理器
 */
export class ManifestManager {
    constructor() {
        this.manifestPath = './manifest.json';
        this.manifest = null;
        this.isConfigured = false;
        this.validationErrors = [];
    }

    /**
     * 配置 PWA Manifest
     * @returns {Promise<Object>} 配置結果
     */
    async configure() {
        try {
            console.log('[ManifestManager] 開始配置 PWA Manifest...');

            // 載入 manifest
            const loadResult = await this.loadManifest();
            if (!loadResult.success) {
                throw new Error(`Manifest 載入失敗: ${loadResult.error}`);
            }

            // 驗證 manifest
            const validationResult = this.validateManifest();
            if (!validationResult.valid) {
                console.warn('[ManifestManager] Manifest 驗證警告:', validationResult.errors);
            }

            // 增強 manifest 功能
            await this.enhanceManifest();

            // 設置動態功能
            this.setupDynamicFeatures();

            this.isConfigured = true;

            return {
                success: true,
                manifest: this.manifest,
                validation: validationResult,
                message: 'PWA Manifest 配置完成'
            };

        } catch (error) {
            console.error('[ManifestManager] Manifest 配置失敗:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 載入 PWA Manifest
     * @returns {Promise<Object>} 載入結果
     */
    async loadManifest() {
        try {
            // 檢查 manifest link 標籤
            const manifestLink = document.querySelector('link[rel="manifest"]');
            if (!manifestLink) {
                throw new Error('找不到 manifest link 標籤');
            }

            const manifestUrl = manifestLink.href;
            console.log(`[ManifestManager] 載入 manifest: ${manifestUrl}`);

            // 載入 manifest 檔案
            const response = await fetch(manifestUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.manifest = await response.json();
            console.log('[ManifestManager] Manifest 載入成功');

            return {
                success: true,
                manifest: this.manifest
            };

        } catch (error) {
            console.error('[ManifestManager] Manifest 載入失敗:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 驗證 PWA Manifest
     * @returns {Object} 驗證結果
     */
    validateManifest() {
        const errors = [];
        const warnings = [];

        if (!this.manifest) {
            errors.push('Manifest 未載入');
            return { valid: false, errors, warnings };
        }

        // 必要欄位檢查
        const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
        for (const field of requiredFields) {
            if (!this.manifest[field]) {
                errors.push(`缺少必要欄位: ${field}`);
            }
        }

        // 圖示驗證
        if (this.manifest.icons && Array.isArray(this.manifest.icons)) {
            if (this.manifest.icons.length === 0) {
                warnings.push('沒有定義圖示');
            } else {
                // 檢查必要的圖示尺寸
                const requiredSizes = ['192x192', '512x512'];
                const availableSizes = this.manifest.icons.map(icon => icon.sizes).filter(Boolean);
                
                for (const size of requiredSizes) {
                    if (!availableSizes.some(s => s.includes(size))) {
                        warnings.push(`缺少 ${size} 尺寸的圖示`);
                    }
                }
            }
        }

        // 顯示模式檢查
        const validDisplayModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
        if (this.manifest.display && !validDisplayModes.includes(this.manifest.display)) {
            warnings.push(`無效的顯示模式: ${this.manifest.display}`);
        }

        // 主題色彩檢查
        if (this.manifest.theme_color && !this.isValidColor(this.manifest.theme_color)) {
            warnings.push(`無效的主題色彩: ${this.manifest.theme_color}`);
        }

        // 背景色彩檢查
        if (this.manifest.background_color && !this.isValidColor(this.manifest.background_color)) {
            warnings.push(`無效的背景色彩: ${this.manifest.background_color}`);
        }

        // 起始 URL 檢查
        if (this.manifest.start_url && !this.isValidUrl(this.manifest.start_url)) {
            warnings.push(`無效的起始 URL: ${this.manifest.start_url}`);
        }

        this.validationErrors = errors;

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            score: this.calculateManifestScore()
        };
    }

    /**
     * 增強 PWA Manifest 功能
     * @private
     * @returns {Promise<void>}
     */
    async enhanceManifest() {
        if (!this.manifest) return;

        // 動態設置語言
        const currentLang = document.documentElement.lang || 'zh-TW';
        if (this.manifest.lang !== currentLang) {
            console.log(`[ManifestManager] 更新語言設定: ${currentLang}`);
            this.updateManifestField('lang', currentLang);
        }

        // 動態設置主題色彩（基於當前主題）
        const isDarkMode = this.detectDarkMode();
        if (isDarkMode && this.manifest.theme_color === '#1976d2') {
            this.updateManifestField('theme_color', '#1565c0');
            this.updateManifestField('background_color', '#121212');
        }

        // 增強無障礙功能
        this.enhanceAccessibility();

        // 設置快捷方式
        this.setupShortcuts();
    }

    /**
     * 設置動態功能
     * @private
     */
    setupDynamicFeatures() {
        // 監聽主題變更
        this.setupThemeListener();

        // 監聽語言變更
        this.setupLanguageListener();

        // 設置分享目標
        this.setupShareTarget();
    }

    /**
     * 設置主題監聽器
     * @private
     */
    setupThemeListener() {
        // 監聽系統主題變更
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            console.log(`[ManifestManager] 系統主題變更: ${e.matches ? 'dark' : 'light'}`);
            this.updateThemeColors(e.matches);
        });

        // 監聽手動主題切換
        document.addEventListener('theme-changed', (event) => {
            const isDark = event.detail.theme === 'dark';
            this.updateThemeColors(isDark);
        });
    }

    /**
     * 設置語言監聽器
     * @private
     */
    setupLanguageListener() {
        document.addEventListener('language-changed', (event) => {
            const newLang = event.detail.language;
            console.log(`[ManifestManager] 語言變更: ${newLang}`);
            this.updateManifestField('lang', newLang);
        });
    }

    /**
     * 設置分享目標
     * @private
     */
    setupShareTarget() {
        // 檢查是否支援 Web Share Target API
        if ('serviceWorker' in navigator && 'share' in navigator) {
            console.log('[ManifestManager] Web Share Target 功能可用');
            
            // 監聽分享事件
            window.addEventListener('web-share-target', (event) => {
                this.handleShareTarget(event.detail);
            });
        }
    }

    /**
     * 處理分享目標
     * @private
     * @param {Object} shareData 分享資料
     */
    handleShareTarget(shareData) {
        console.log('[ManifestManager] 處理分享目標:', shareData);
        
        // 檢查是否為名片 URL
        if (shareData.url && this.isCardUrl(shareData.url)) {
            // 觸發名片匯入
            const event = new CustomEvent('import-card-url', {
                detail: { url: shareData.url }
            });
            window.dispatchEvent(event);
        }
    }

    /**
     * 更新主題色彩
     * @private
     * @param {boolean} isDark 是否為深色主題
     */
    updateThemeColors(isDark) {
        const themeColor = isDark ? '#1565c0' : '#1976d2';
        const backgroundColor = isDark ? '#121212' : '#ffffff';

        this.updateManifestField('theme_color', themeColor);
        this.updateManifestField('background_color', backgroundColor);

        // 更新 meta 標籤
        this.updateThemeColorMeta(themeColor);
    }

    /**
     * 更新主題色彩 meta 標籤
     * @private
     * @param {string} color 色彩值
     */
    updateThemeColorMeta(color) {
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.name = 'theme-color';
            document.head.appendChild(themeColorMeta);
        }
        themeColorMeta.content = color;
    }

    /**
     * 增強無障礙功能
     * @private
     */
    enhanceAccessibility() {
        if (!this.manifest.icons) return;

        // 確保圖示有適當的 purpose 屬性
        this.manifest.icons.forEach(icon => {
            if (!icon.purpose) {
                icon.purpose = 'any';
            }
        });

        // 添加高對比度圖示（如果需要）
        const hasHighContrast = this.manifest.icons.some(icon => 
            icon.purpose && icon.purpose.includes('monochrome')
        );

        if (!hasHighContrast) {
            console.log('[ManifestManager] 建議添加高對比度圖示以提升無障礙性');
        }
    }

    /**
     * 設置快捷方式
     * @private
     */
    setupShortcuts() {
        if (!this.manifest.shortcuts) {
            this.manifest.shortcuts = [];
        }

        // 動態添加常用快捷方式
        const commonShortcuts = [
            {
                name: '匯入名片',
                short_name: '匯入',
                description: '快速匯入新的數位名片',
                url: './?action=import',
                icons: [{ src: './assets/icons/import-icon.png', sizes: '96x96' }]
            },
            {
                name: '瀏覽名片',
                short_name: '瀏覽',
                description: '瀏覽已儲存的名片',
                url: './?action=browse',
                icons: [{ src: './assets/icons/browse-icon.png', sizes: '96x96' }]
            }
        ];

        // 合併現有快捷方式
        const existingUrls = this.manifest.shortcuts.map(s => s.url);
        for (const shortcut of commonShortcuts) {
            if (!existingUrls.includes(shortcut.url)) {
                this.manifest.shortcuts.push(shortcut);
            }
        }
    }

    /**
     * 更新 manifest 欄位
     * @private
     * @param {string} field 欄位名稱
     * @param {*} value 新值
     */
    updateManifestField(field, value) {
        if (this.manifest[field] !== value) {
            this.manifest[field] = value;
            console.log(`[ManifestManager] 更新 manifest.${field}: ${value}`);
        }
    }

    /**
     * 偵測深色模式
     * @private
     * @returns {boolean} 是否為深色模式
     */
    detectDarkMode() {
        // 檢查系統偏好
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // 檢查手動設定
        const manualTheme = localStorage.getItem('theme');
        
        return manualTheme === 'dark' || (manualTheme !== 'light' && systemDark);
    }

    /**
     * 驗證色彩值
     * @private
     * @param {string} color 色彩值
     * @returns {boolean} 是否有效
     */
    isValidColor(color) {
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return colorRegex.test(color) || CSS.supports('color', color);
    }

    /**
     * 驗證 URL
     * @private
     * @param {string} url URL 字串
     * @returns {boolean} 是否有效
     */
    isValidUrl(url) {
        try {
            new URL(url, window.location.origin);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 檢查是否為名片 URL
     * @private
     * @param {string} url URL 字串
     * @returns {boolean} 是否為名片 URL
     */
    isCardUrl(url) {
        return url.includes('data=') || url.includes('nfc-card') || url.includes('digital-card');
    }

    /**
     * 計算 manifest 分數
     * @private
     * @returns {number} 分數 (0-100)
     */
    calculateManifestScore() {
        let score = 0;
        const maxScore = 100;

        // 基本欄位 (40 分)
        const basicFields = ['name', 'short_name', 'start_url', 'display'];
        score += (basicFields.filter(field => this.manifest[field]).length / basicFields.length) * 40;

        // 圖示 (20 分)
        if (this.manifest.icons && this.manifest.icons.length > 0) {
            score += 20;
        }

        // 主題色彩 (10 分)
        if (this.manifest.theme_color) {
            score += 10;
        }

        // 背景色彩 (10 分)
        if (this.manifest.background_color) {
            score += 10;
        }

        // 進階功能 (20 分)
        const advancedFeatures = ['shortcuts', 'categories', 'share_target', 'file_handlers'];
        score += (advancedFeatures.filter(feature => this.manifest[feature]).length / advancedFeatures.length) * 20;

        return Math.round(score);
    }

    /**
     * 取得管理器狀態
     * @returns {Object} 狀態資訊
     */
    getStatus() {
        return {
            isConfigured: this.isConfigured,
            hasManifest: !!this.manifest,
            validationErrors: this.validationErrors.length,
            manifestScore: this.manifest ? this.calculateManifestScore() : 0,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 匯出 manifest 配置
     * @returns {Object} manifest 物件
     */
    exportManifest() {
        return this.manifest ? { ...this.manifest } : null;
    }

    /**
     * 重新載入 manifest
     * @returns {Promise<Object>} 重新載入結果
     */
    async reload() {
        console.log('[ManifestManager] 重新載入 manifest...');
        
        this.manifest = null;
        this.isConfigured = false;
        this.validationErrors = [];

        return await this.configure();
    }
}

// 提供便利的匯出
export const manifestManager = new ManifestManager();