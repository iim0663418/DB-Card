/**
 * Client-Side Security Settings Management
 * User-friendly security settings interface for managing preferences
 * Static hosting compatible with localStorage persistence
 */

class ClientSideSecuritySettings {
    constructor() {
        this.storageKey = 'db-card-security-settings';
        this.preferencesKey = 'db-card-security-preferences';
        this.settingsData = null;
        this.preferences = null;
        this.initialized = false;
        this.currentLanguage = this.detectLanguage();
        
        this.settingsCategories = this.getLocalizedCategories();
        
        this.settingsSchema = this.getLocalizedSchema();
        
        this.init();
    }
    
    detectLanguage() {
        if (window.languageManager) {
            return window.languageManager.getCurrentLanguage();
        }
        return localStorage.getItem('pwa-language') || 'zh';
    }
    
    getLocalizedCategories() {
        const categories = {
            zh: {
                authentication: { name: '身份驗證', icon: '🔐', description: '管理登入和身份驗證設定' },
                encryption: { name: '資料加密', icon: '🛡️', description: '控制資料加密和隱私保護' },
                monitoring: { name: '安全監控', icon: '👁️', description: '設定安全監控和警報' },
                privacy: { name: '隱私設定', icon: '🔒', description: '管理資料收集和隱私選項' }
            },
            en: {
                authentication: { name: 'Authentication', icon: '🔐', description: 'Manage login and authentication settings' },
                encryption: { name: 'Data Encryption', icon: '🛡️', description: 'Control data encryption and privacy protection' },
                monitoring: { name: 'Security Monitoring', icon: '👁️', description: 'Configure security monitoring and alerts' },
                privacy: { name: 'Privacy Settings', icon: '🔒', description: 'Manage data collection and privacy options' }
            }
        };
        return categories[this.currentLanguage] || categories.zh;
    }
    
    getLocalizedSchema() {
        const schemas = {
            zh: {
                'webauthn.enabled': { category: 'authentication', name: 'WebAuthn 生物識別', description: '使用指紋或臉部識別進行身份驗證', type: 'boolean', default: false, requiresRestart: false },
                'webauthn.fallback': { category: 'authentication', name: 'PIN 備用驗證', description: '當生物識別不可用時使用 PIN 碼', type: 'boolean', default: true, dependsOn: 'webauthn.enabled' },
                'encryption.enabled': { category: 'encryption', name: '自動加密', description: '自動加密儲存的名片資料', type: 'boolean', default: true, requiresRestart: true },
                'encryption.algorithm': { category: 'encryption', name: '加密演算法', description: '選擇加密演算法', type: 'select', options: [{ value: 'AES-GCM', label: 'AES-GCM (推薦)' }, { value: 'AES-CBC', label: 'AES-CBC' }], default: 'AES-GCM', dependsOn: 'encryption.enabled' },
                'monitoring.enabled': { category: 'monitoring', name: '安全監控', description: '監控系統安全狀態', type: 'boolean', default: true, requiresRestart: false },
                'monitoring.alertLevel': { category: 'monitoring', name: '警報等級', description: '設定安全警報的敏感度', type: 'select', options: [{ value: 'low', label: '低 (僅嚴重問題)' }, { value: 'medium', label: '中 (推薦)' }, { value: 'high', label: '高 (所有問題)' }], default: 'medium', dependsOn: 'monitoring.enabled' },
                'privacy.analytics': { category: 'privacy', name: '使用統計', description: '收集匿名使用統計以改善服務', type: 'boolean', default: false, requiresRestart: false },
                'privacy.errorReporting': { category: 'privacy', name: '錯誤回報', description: '自動回報錯誤以協助修復問題', type: 'boolean', default: true, requiresRestart: false }
            },
            en: {
                'webauthn.enabled': { category: 'authentication', name: 'WebAuthn Biometric', description: 'Use fingerprint or face recognition for authentication', type: 'boolean', default: false, requiresRestart: false },
                'webauthn.fallback': { category: 'authentication', name: 'PIN Fallback', description: 'Use PIN code when biometric is unavailable', type: 'boolean', default: true, dependsOn: 'webauthn.enabled' },
                'encryption.enabled': { category: 'encryption', name: 'Auto Encryption', description: 'Automatically encrypt stored card data', type: 'boolean', default: true, requiresRestart: true },
                'encryption.algorithm': { category: 'encryption', name: 'Encryption Algorithm', description: 'Choose encryption algorithm', type: 'select', options: [{ value: 'AES-GCM', label: 'AES-GCM (Recommended)' }, { value: 'AES-CBC', label: 'AES-CBC' }], default: 'AES-GCM', dependsOn: 'encryption.enabled' },
                'monitoring.enabled': { category: 'monitoring', name: 'Security Monitoring', description: 'Monitor system security status', type: 'boolean', default: true, requiresRestart: false },
                'monitoring.alertLevel': { category: 'monitoring', name: 'Alert Level', description: 'Set security alert sensitivity', type: 'select', options: [{ value: 'low', label: 'Low (Critical only)' }, { value: 'medium', label: 'Medium (Recommended)' }, { value: 'high', label: 'High (All issues)' }], default: 'medium', dependsOn: 'monitoring.enabled' },
                'privacy.analytics': { category: 'privacy', name: 'Usage Analytics', description: 'Collect anonymous usage statistics to improve service', type: 'boolean', default: false, requiresRestart: false },
                'privacy.errorReporting': { category: 'privacy', name: 'Error Reporting', description: 'Automatically report errors to help fix issues', type: 'boolean', default: true, requiresRestart: false }
            }
        };
        return schemas[this.currentLanguage] || schemas.zh;
    }
    
    getLocalizedText(key) {
        const texts = {
            zh: {
                title: '安全設定',
                closeLabel: '關閉設定',
                restartNotice: '⚠️ 某些設定需要重新載入頁面才能生效',
                exportButton: '匯出設定',
                resetButton: '重設為預設值',
                saveButton: '儲存並關閉'
            },
            en: {
                title: 'Security Settings',
                closeLabel: 'Close Settings',
                restartNotice: '⚠️ Some settings require page reload to take effect',
                exportButton: 'Export Settings',
                resetButton: 'Reset to Defaults',
                saveButton: 'Save and Close'
            }
        };
        return texts[this.currentLanguage]?.[key] || texts.zh[key] || key;
    }
    
    async init() {
        try {
            this.loadSettings();
            this.loadPreferences();
            this.createSettingsModal();
            this.setupEventListeners();
            this.initialized = true;
            
        } catch (error) {
            console.error('Failed to initialize security settings:', error);
        }
    }
    
    loadSettings() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            this.settingsData = stored ? JSON.parse(stored) : {
                version: '1.0.0',
                lastModified: new Date().toISOString(),
                exportable: true
            };
        } catch (error) {
            console.warn('Failed to load settings data:', error);
            this.settingsData = { version: '1.0.0' };
        }
    }
    
    loadPreferences() {
        try {
            const stored = localStorage.getItem(this.preferencesKey);
            this.preferences = stored ? JSON.parse(stored) : {};
            
            // Apply defaults for missing preferences
            Object.entries(this.settingsSchema).forEach(([key, schema]) => {
                if (this.preferences[key] === undefined) {
                    this.preferences[key] = schema.default;
                }
            });
        } catch (error) {
            console.warn('Failed to load preferences:', error);
            this.preferences = {};
        }
    }
    
    saveSettings() {
        try {
            this.settingsData.lastModified = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(this.settingsData));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }
    
    savePreferences() {
        try {
            localStorage.setItem(this.preferencesKey, JSON.stringify(this.preferences));
            this.saveSettings();
        } catch (error) {
            console.warn('Failed to save preferences:', error);
        }
    }
    
    createSettingsModal() {
        if (document.getElementById('security-settings-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'security-settings-modal';
        modal.className = 'security-settings-modal hidden';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'settings-title');
        
        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            .security-settings-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10002;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .security-settings-modal.show {
                opacity: 1;
            }
            
            .security-settings-modal.hidden {
                display: none;
            }
            
            .settings-content {
                background: white;
                border-radius: 12px;
                max-width: 800px;
                width: 90%;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            }
            
            .settings-header {
                padding: 24px 24px 0;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .settings-title {
                font-size: 24px;
                font-weight: 600;
                color: #333;
                margin: 0;
            }
            
            .settings-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 8px;
                border-radius: 4px;
            }
            
            .settings-close:hover {
                background: #f5f5f5;
            }
            
            .settings-body {
                display: flex;
                flex: 1;
                overflow: hidden;
            }
            
            .settings-sidebar {
                width: 200px;
                background: #f8f9fa;
                border-right: 1px solid #e0e0e0;
                padding: 16px 0;
            }
            
            .settings-nav-item {
                display: flex;
                align-items: center;
                padding: 12px 20px;
                cursor: pointer;
                border: none;
                background: none;
                width: 100%;
                text-align: left;
                transition: background-color 0.2s ease;
            }
            
            .settings-nav-item:hover {
                background: #e9ecef;
            }
            
            .settings-nav-item.active {
                background: #1976d2;
                color: white;
            }
            
            .settings-nav-icon {
                margin-right: 8px;
                font-size: 16px;
            }
            
            .settings-nav-label {
                font-size: 14px;
                font-weight: 500;
            }
            
            .settings-main {
                flex: 1;
                padding: 24px;
                overflow-y: auto;
            }
            
            .settings-category {
                margin-bottom: 32px;
            }
            
            .category-header {
                margin-bottom: 16px;
            }
            
            .category-title {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                margin: 0 0 4px;
            }
            
            .category-description {
                color: #666;
                font-size: 14px;
                margin: 0;
            }
            
            .setting-item {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
                border: 1px solid #e0e0e0;
            }
            
            .setting-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
            }
            
            .setting-info {
                flex: 1;
            }
            
            .setting-name {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                margin: 0 0 4px;
            }
            
            .setting-description {
                color: #666;
                font-size: 13px;
                margin: 0;
                line-height: 1.4;
            }
            
            .setting-control {
                margin-left: 16px;
            }
            
            .setting-toggle {
                position: relative;
                width: 44px;
                height: 24px;
                background: #ccc;
                border-radius: 12px;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            
            .setting-toggle.enabled {
                background: #1976d2;
            }
            
            .setting-toggle::after {
                content: '';
                position: absolute;
                top: 2px;
                left: 2px;
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 50%;
                transition: transform 0.2s ease;
            }
            
            .setting-toggle.enabled::after {
                transform: translateX(20px);
            }
            
            .setting-select {
                padding: 8px 12px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 13px;
                min-width: 150px;
            }
            
            .setting-disabled {
                opacity: 0.5;
                pointer-events: none;
            }
            
            .setting-restart-required {
                background: #fff3cd;
                border-color: #ffeaa7;
            }
            
            .restart-notice {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 6px;
                padding: 12px;
                margin: 16px 0;
                font-size: 13px;
                color: #856404;
            }
            
            .settings-actions {
                padding: 16px 24px;
                border-top: 1px solid #e0e0e0;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            
            .settings-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            
            .settings-btn.primary {
                background: #1976d2;
                color: white;
            }
            
            .settings-btn.primary:hover {
                background: #1565c0;
            }
            
            .settings-btn.secondary {
                background: #f5f5f5;
                color: #666;
            }
            
            .settings-btn.secondary:hover {
                background: #e0e0e0;
            }
            
            @media (max-width: 768px) {
                .settings-content {
                    width: 95%;
                    height: 90vh;
                }
                
                .settings-body {
                    flex-direction: column;
                }
                
                .settings-sidebar {
                    width: 100%;
                    display: flex;
                    overflow-x: auto;
                    padding: 8px 0;
                }
                
                .settings-nav-item {
                    white-space: nowrap;
                    min-width: 120px;
                }
            }
        `;
        document.head.appendChild(style);
        
        modal.innerHTML = `
            <div class="settings-content">
                <div class="settings-header">
                    <h2 id="settings-title" class="settings-title">${this.getLocalizedText('title')}</h2>
                    <button class="settings-close" onclick="window.securitySettings?.hideSettings()" aria-label="${this.getLocalizedText('closeLabel')}">×</button>
                </div>
                <div class="settings-body">
                    <div class="settings-sidebar">
                        ${Object.entries(this.settingsCategories).map(([key, category]) => `
                            <button class="settings-nav-item ${key === 'authentication' ? 'active' : ''}" 
                                    data-category="${key}"
                                    onclick="window.securitySettings?.showCategory('${key}')">
                                <span class="settings-nav-icon">${category.icon}</span>
                                <span class="settings-nav-label">${category.name}</span>
                            </button>
                        `).join('')}
                    </div>
                    <div class="settings-main">
                        <div id="settings-categories"></div>
                        <div id="restart-notice" class="restart-notice hidden">
                            ${this.getLocalizedText('restartNotice')}
                        </div>
                    </div>
                </div>
                <div class="settings-actions">
                    <button class="settings-btn secondary" onclick="window.securitySettings?.exportSettings()">
                        ${this.getLocalizedText('exportButton')}
                    </button>
                    <button class="settings-btn secondary" onclick="window.securitySettings?.resetSettings()">
                        ${this.getLocalizedText('resetButton')}
                    </button>
                    <button class="settings-btn primary" onclick="window.securitySettings?.saveAndClose()">
                        ${this.getLocalizedText('saveButton')}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    setupEventListeners() {
        // Listen for open settings events
        document.addEventListener('open-security-settings', () => {
            this.showSettings();
        });
        
        // Listen for preference changes from onboarding
        document.addEventListener('security-preference-changed', (event) => {
            const { feature, enabled } = event.detail;
            this.updatePreference(feature, enabled);
        });
        
        // Listen for language changes
        if (window.languageManager) {
            window.languageManager.addObserver((lang) => {
                this.currentLanguage = lang;
                this.updateLanguage();
            });
        }
        
        // Close modal on escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isSettingsVisible()) {
                this.hideSettings();
            }
        });
    }
    
    updateLanguage() {
        this.settingsCategories = this.getLocalizedCategories();
        this.settingsSchema = this.getLocalizedSchema();
        
        if (this.isSettingsVisible()) {
            // Update modal content
            const modal = document.getElementById('security-settings-modal');
            if (modal) {
                modal.remove();
                this.createSettingsModal();
                this.showSettings();
            }
        }
    }
    
    showSettings(category = 'authentication') {
        if (!this.initialized) return;
        
        this.renderCategories();
        this.showCategory(category);
        
        const modal = document.getElementById('security-settings-modal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.add('show'), 100);
            
            // Focus management
            const firstSetting = modal.querySelector('.setting-toggle, .setting-select');
            if (firstSetting) firstSetting.focus();
        }
    }
    
    hideSettings() {
        const modal = document.getElementById('security-settings-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    }
    
    isSettingsVisible() {
        const modal = document.getElementById('security-settings-modal');
        return modal && !modal.classList.contains('hidden');
    }
    
    showCategory(categoryKey) {
        // Update navigation
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.category === categoryKey);
        });
        
        // Show category content
        const container = document.getElementById('settings-categories');
        if (!container) return;
        
        const category = this.settingsCategories[categoryKey];
        const settings = Object.entries(this.settingsSchema)
            .filter(([key, schema]) => schema.category === categoryKey);
        
        container.innerHTML = `
            <div class="settings-category">
                <div class="category-header">
                    <h3 class="category-title">${category.name}</h3>
                    <p class="category-description">${category.description}</p>
                </div>
                ${settings.map(([key, schema]) => this.renderSetting(key, schema)).join('')}
            </div>
        `;
    }
    
    renderSetting(key, schema) {
        const value = this.preferences[key];
        const isDisabled = schema.dependsOn && !this.preferences[schema.dependsOn];
        const requiresRestart = schema.requiresRestart && this.hasRestartRequiredChanges();
        
        let controlHtml = '';
        
        if (schema.type === 'boolean') {
            controlHtml = `
                <div class="setting-toggle ${value ? 'enabled' : ''} ${isDisabled ? 'setting-disabled' : ''}"
                     onclick="window.securitySettings?.toggleSetting('${key}')">
                </div>
            `;
        } else if (schema.type === 'select') {
            controlHtml = `
                <select class="setting-select ${isDisabled ? 'setting-disabled' : ''}"
                        onchange="window.securitySettings?.updateSetting('${key}', this.value)"
                        ${isDisabled ? 'disabled' : ''}>
                    ${schema.options.map(option => `
                        <option value="${option.value}" ${value === option.value ? 'selected' : ''}>
                            ${option.label}
                        </option>
                    `).join('')}
                </select>
            `;
        }
        
        return `
            <div class="setting-item ${requiresRestart ? 'setting-restart-required' : ''} ${isDisabled ? 'setting-disabled' : ''}">
                <div class="setting-header">
                    <div class="setting-info">
                        <h4 class="setting-name">${schema.name}</h4>
                        <p class="setting-description">${schema.description}</p>
                    </div>
                    <div class="setting-control">
                        ${controlHtml}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderCategories() {
        // This will be called when showing settings to refresh the content
        this.showCategory('authentication');
    }
    
    toggleSetting(key) {
        const currentValue = this.preferences[key];
        this.updateSetting(key, !currentValue);
    }
    
    updateSetting(key, value) {
        const oldValue = this.preferences[key];
        this.preferences[key] = value;
        
        // Check for dependent settings
        const schema = this.settingsSchema[key];
        if (schema && !value) {
            // Disable dependent settings
            Object.entries(this.settingsSchema).forEach(([depKey, depSchema]) => {
                if (depSchema.dependsOn === key) {
                    this.preferences[depKey] = false;
                }
            });
        }
        
        // Update UI
        this.renderCategories();
        
        // Show restart notice if needed
        this.updateRestartNotice();
        
        // Apply setting immediately if possible
        this.applySetting(key, value, oldValue);
        
        // Dispatch change event
        document.dispatchEvent(new CustomEvent('security-setting-changed', {
            detail: { key, value, oldValue }
        }));
    }
    
    updatePreference(feature, enabled) {
        // Map feature names to setting keys
        const featureMap = {
            'webauthn': 'webauthn.enabled',
            'encryption': 'encryption.enabled',
            'monitoring': 'monitoring.enabled'
        };
        
        const settingKey = featureMap[feature] || feature;
        if (this.settingsSchema[settingKey]) {
            this.updateSetting(settingKey, enabled);
        }
    }
    
    applySetting(key, value, oldValue) {
        // Apply settings that don't require restart
        const schema = this.settingsSchema[key];
        if (!schema.requiresRestart) {
            document.dispatchEvent(new CustomEvent('apply-security-setting', {
                detail: { key, value, oldValue }
            }));
        }
    }
    
    hasRestartRequiredChanges() {
        // Check if any restart-required settings have been changed
        return Object.entries(this.settingsSchema).some(([key, schema]) => {
            return schema.requiresRestart && this.preferences[key] !== schema.default;
        });
    }
    
    updateRestartNotice() {
        const notice = document.getElementById('restart-notice');
        if (notice) {
            notice.classList.toggle('hidden', !this.hasRestartRequiredChanges());
        }
    }
    
    saveAndClose() {
        this.savePreferences();
        this.hideSettings();
        
        // Show success message
        if (window.userCommunication) {
            window.userCommunication.showMessage({
                type: 'success',
                title: '設定已儲存',
                content: '您的安全設定已成功儲存。'
            });
        }
        
        // Dispatch save event
        document.dispatchEvent(new CustomEvent('security-settings-saved', {
            detail: { preferences: this.preferences }
        }));
    }
    
    exportSettings() {
        const exportData = {
            version: this.settingsData.version,
            preferences: this.preferences,
            exportedAt: new Date().toISOString(),
            source: 'DB-Card Security Settings'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `db-card-security-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (window.userCommunication) {
            window.userCommunication.showMessage({
                type: 'success',
                title: '設定已匯出',
                content: '安全設定檔案已下載到您的裝置。'
            });
        }
    }
    
    resetSettings() {
        if (confirm('確定要重設所有安全設定為預設值嗎？此操作無法復原。')) {
            // Reset to defaults
            Object.entries(this.settingsSchema).forEach(([key, schema]) => {
                this.preferences[key] = schema.default;
            });
            
            this.savePreferences();
            this.renderCategories();
            this.updateRestartNotice();
            
            if (window.userCommunication) {
                window.userCommunication.showMessage({
                    type: 'info',
                    title: '設定已重設',
                    content: '所有安全設定已重設為預設值。'
                });
            }
        }
    }
    
    getPreferences() {
        return { ...this.preferences };
    }
    
    getPreference(key) {
        return this.preferences[key];
    }
    
    setPreference(key, value) {
        this.updateSetting(key, value);
        this.savePreferences();
    }
}

// Global instance
window.securitySettings = new ClientSideSecuritySettings();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientSideSecuritySettings;
}