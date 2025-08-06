/**
 * Client-Side Security Feature Onboarding
 * Optional onboarding flow for new security features with clear opt-in/opt-out
 * Static hosting compatible with localStorage preferences
 */

class ClientSideSecurityOnboarding {
    constructor() {
        this.storageKey = 'db-card-security-onboarding';
        this.preferencesKey = 'db-card-security-preferences';
        this.currentStep = 0;
        this.onboardingData = null;
        this.initialized = false;
        this.isUpdating = false;
        this.languageObserver = null;
        this.focusedElement = null;
        
        this.currentLanguage = this.detectLanguage();
        this.securityFeatures = this.getLocalizedFeatures();
        
        this.init();
    }
    
    detectLanguage() {
        return window.languageManager ? window.languageManager.getCurrentLanguage() : 'zh';
    }
    
    getLocalizedFeatures() {
        const features = {
            zh: {
                webauthn: {
                    name: 'WebAuthn 生物識別',
                    description: '使用指紋或臉部識別來保護您的名片資料',
                    benefits: ['更安全的身份驗證', '無需記住密碼', '快速便捷的存取'],
                    risks: ['需要支援的裝置', '可能影響載入速度'],
                    defaultEnabled: false
                },
                encryption: {
                    name: '資料加密',
                    description: '自動加密儲存在瀏覽器中的名片資料',
                    benefits: ['保護敏感資訊', '防止未授權存取', '符合隱私標準'],
                    risks: ['可能影響效能', '需要額外的儲存空間'],
                    defaultEnabled: true
                },
                monitoring: {
                    name: '安全監控',
                    description: '監控系統安全狀態並提供即時警報',
                    benefits: ['即時威脅偵測', '系統健康監控', '自動安全回應'],
                    risks: ['收集使用統計', '可能產生通知'],
                    defaultEnabled: true
                }
            },
            en: {
                webauthn: {
                    name: 'WebAuthn Biometric',
                    description: 'Use fingerprint or face recognition to protect your card data',
                    benefits: ['More secure authentication', 'No passwords to remember', 'Fast and convenient access'],
                    risks: ['Requires supported device', 'May affect loading speed'],
                    defaultEnabled: false
                },
                encryption: {
                    name: 'Data Encryption',
                    description: 'Automatically encrypt card data stored in browser',
                    benefits: ['Protect sensitive information', 'Prevent unauthorized access', 'Privacy compliant'],
                    risks: ['May affect performance', 'Requires additional storage'],
                    defaultEnabled: true
                },
                monitoring: {
                    name: 'Security Monitoring',
                    description: 'Monitor system security status and provide real-time alerts',
                    benefits: ['Real-time threat detection', 'System health monitoring', 'Automatic security response'],
                    risks: ['Collects usage statistics', 'May generate notifications'],
                    defaultEnabled: true
                }
            }
        };
        return features[this.currentLanguage] || features.zh;
    }
    
    getLocalizedText(key) {
        // Use PWA language manager if available for consistency
        if (window.languageManager && window.languageManager.getText) {
            const pwaText = window.languageManager.getText(`security.${key}`);
            if (pwaText !== `security.${key}`) {
                return pwaText;
            }
        }
        
        const texts = {
            zh: {
                title: '安全功能設定',
                subtitle: '選擇適合您的安全功能，隨時可以在設定中修改',
                benefits: '優點：',
                risks: '注意事項：',
                privacyNotice: '所有安全功能都在您的裝置上運行，不會將資料傳送到外部伺服器。您可以隨時停用這些功能。',
                privacyTitle: '隱私承諾：',
                skipButton: '稍後設定',
                confirmButton: '確認設定'
            },
            en: {
                title: 'Security Features Setup',
                subtitle: 'Choose security features that suit you, can be modified in settings anytime',
                benefits: 'Benefits:',
                risks: 'Considerations:',
                privacyNotice: 'All security features run on your device and do not send data to external servers. You can disable these features at any time.',
                privacyTitle: 'Privacy Promise:',
                skipButton: 'Set up later',
                confirmButton: 'Confirm Settings'
            }
        };
        return texts[this.currentLanguage]?.[key] || texts.zh[key] || key;
    }
    
    async init() {
        try {
            this.loadOnboardingState();
            this.loadUserPreferences();
            this.createOnboardingModal();
            this.setupEventListeners();
            this.initialized = true;
            
            // Check if onboarding is needed
            this.checkOnboardingNeeded();
            
        } catch (error) {
            console.error('Failed to initialize security onboarding:', error);
        }
    }
    
    loadOnboardingState() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.onboardingData = JSON.parse(stored);
            } else {
                this.onboardingData = {
                    completed: false,
                    skipped: false,
                    lastShown: null,
                    version: '1.0.0'
                };
            }
        } catch (error) {
            console.warn('Failed to load onboarding state:', error);
            this.onboardingData = { completed: false, skipped: false };
        }
    }
    
    loadUserPreferences() {
        try {
            const stored = localStorage.getItem(this.preferencesKey);
            this.userPreferences = stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('Failed to load user preferences:', error);
            this.userPreferences = {};
        }
    }
    
    saveOnboardingState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.onboardingData));
        } catch (error) {
            console.warn('Failed to save onboarding state:', error);
        }
    }
    
    saveUserPreferences() {
        try {
            localStorage.setItem(this.preferencesKey, JSON.stringify(this.userPreferences));
        } catch (error) {
            console.warn('Failed to save user preferences:', error);
        }
    }
    
    createOnboardingModal() {
        if (document.getElementById('security-onboarding-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'security-onboarding-modal';
        modal.className = 'security-onboarding-modal hidden';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'onboarding-title');
        
        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            .security-onboarding-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .security-onboarding-modal.show {
                opacity: 1;
            }
            
            .security-onboarding-modal.hidden {
                display: none;
            }
            
            .onboarding-content {
                background: white;
                border-radius: 12px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            }
            
            .onboarding-header {
                padding: 24px 24px 0;
                text-align: center;
            }
            
            .onboarding-title {
                font-size: 24px;
                font-weight: 600;
                color: #333;
                margin: 0 0 8px;
            }
            
            .onboarding-subtitle {
                color: #666;
                margin: 0 0 24px;
            }
            
            .onboarding-body {
                padding: 0 24px 24px;
            }
            
            .feature-card {
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 16px;
                transition: border-color 0.2s ease;
            }
            
            .feature-card.selected {
                border-color: #1976d2;
                background: #f3f8ff;
            }
            
            .feature-header {
                display: flex;
                align-items: center;
                margin-bottom: 12px;
            }
            
            .feature-toggle {
                margin-right: 12px;
            }
            
            .feature-name {
                font-weight: 600;
                font-size: 16px;
                color: #333;
                margin: 0;
            }
            
            .feature-description {
                color: #666;
                margin: 0 0 16px;
                line-height: 1.4;
            }
            
            .feature-benefits {
                margin-bottom: 12px;
            }
            
            .feature-benefits h4,
            .feature-risks h4 {
                font-size: 14px;
                font-weight: 600;
                margin: 0 0 8px;
                color: #333;
            }
            
            .feature-benefits ul,
            .feature-risks ul {
                margin: 0;
                padding-left: 20px;
                font-size: 13px;
                color: #666;
            }
            
            .feature-benefits li {
                color: #4caf50;
                margin-bottom: 4px;
            }
            
            .feature-risks li {
                color: #ff9800;
                margin-bottom: 4px;
            }
            
            .onboarding-actions {
                padding: 0 24px 24px;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            
            .onboarding-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            
            .onboarding-btn.primary {
                background: #1976d2;
                color: white;
            }
            
            .onboarding-btn.primary:hover {
                background: #1565c0;
            }
            
            .onboarding-btn.secondary {
                background: #f5f5f5;
                color: #666;
            }
            
            .onboarding-btn.secondary:hover {
                background: #e0e0e0;
            }
            
            .privacy-notice {
                background: #f8f9fa;
                border-radius: 6px;
                padding: 16px;
                margin: 16px 0;
                font-size: 13px;
                color: #666;
                line-height: 1.4;
            }
            
            .privacy-notice strong {
                color: #333;
            }
            
            @media (max-width: 480px) {
                .onboarding-content {
                    width: 95%;
                    margin: 20px;
                }
                
                .onboarding-actions {
                    flex-direction: column;
                }
                
                .onboarding-btn {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
        
        modal.innerHTML = `
            <div class="onboarding-content">
                <div class="onboarding-header">
                    <h2 id="onboarding-title" class="onboarding-title">${this.getLocalizedText('title')}</h2>
                    <p class="onboarding-subtitle">${this.getLocalizedText('subtitle')}</p>
                </div>
                <div class="onboarding-body">
                    <div id="features-list"></div>
                    <div class="privacy-notice">
                        <strong>${this.getLocalizedText('privacyTitle')}</strong>${this.getLocalizedText('privacyNotice')}
                    </div>
                </div>
                <div class="onboarding-actions">
                    <button class="onboarding-btn secondary" onclick="window.securityOnboarding?.skipOnboarding()">
                        ${this.getLocalizedText('skipButton')}
                    </button>
                    <button class="onboarding-btn primary" onclick="window.securityOnboarding?.completeOnboarding()">
                        ${this.getLocalizedText('confirmButton')}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    setupEventListeners() {
        // Listen for security feature changes
        document.addEventListener('security-feature-available', (event) => {
            this.handleNewFeature(event.detail);
        });
        
        // Listen for language changes from PWA language manager
        if (window.languageManager) {
            this.languageObserver = (lang) => {
                if (this.isUpdating) return;
                this.currentLanguage = lang;
                this.updateLanguage();
            };
            window.languageManager.addObserver(this.languageObserver);
        }
        
        // Close modal on escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isOnboardingVisible()) {
                this.skipOnboarding();
            }
        });
    }
    
    checkOnboardingNeeded() {
        // Show onboarding if not completed and not recently skipped
        if (!this.onboardingData.completed && !this.onboardingData.skipped) {
            setTimeout(() => this.showOnboarding(), 2000);
        } else if (this.onboardingData.skipped) {
            // Check if enough time has passed since last skip (7 days)
            const lastShown = new Date(this.onboardingData.lastShown || 0);
            const daysSinceLastShown = (Date.now() - lastShown.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceLastShown > 7) {
                setTimeout(() => this.showOnboarding(), 5000);
            }
        }
    }
    
    updateLanguage() {
        if (this.isUpdating) return;
        this.isUpdating = true;
        
        try {
            this.securityFeatures = this.getLocalizedFeatures();
            
            if (this.isOnboardingVisible()) {
                // Store current focus
                this.focusedElement = document.activeElement;
                
                // Update content without recreating modal
                this.updateModalContent();
                
                // Restore focus
                setTimeout(() => {
                    if (this.focusedElement && this.focusedElement.isConnected) {
                        this.focusedElement.focus();
                    } else {
                        // Focus first interactive element if original is gone
                        const modal = document.getElementById('security-onboarding-modal');
                        const firstInput = modal?.querySelector('input[type="checkbox"]');
                        if (firstInput) firstInput.focus();
                    }
                    this.focusedElement = null;
                }, 100);
            }
        } finally {
            this.isUpdating = false;
        }
    }
    
    showOnboarding() {
        if (!this.initialized) return;
        
        this.renderFeatures();
        
        const modal = document.getElementById('security-onboarding-modal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.add('show'), 100);
            
            // Focus management
            const firstButton = modal.querySelector('input[type="checkbox"]');
            if (firstButton) firstButton.focus();
        }
        
        this.onboardingData.lastShown = new Date().toISOString();
        this.saveOnboardingState();
    }
    
    renderFeatures() {
        const container = document.getElementById('features-list');
        if (!container) return;
        
        container.innerHTML = Object.entries(this.securityFeatures).map(([key, feature]) => {
            const isEnabled = this.userPreferences[key] !== undefined 
                ? this.userPreferences[key] 
                : feature.defaultEnabled;
            
            return `
                <div class="feature-card ${isEnabled ? 'selected' : ''}" id="feature-${key}">
                    <div class="feature-header">
                        <input type="checkbox" 
                               id="toggle-${key}" 
                               class="feature-toggle"
                               ${isEnabled ? 'checked' : ''}
                               onchange="window.securityOnboarding?.toggleFeature('${key}', this.checked)">
                        <label for="toggle-${key}" class="feature-name">${feature.name}</label>
                    </div>
                    <p class="feature-description">${feature.description}</p>
                    <div class="feature-benefits">
                        <h4>${this.getLocalizedText('benefits')}</h4>
                        <ul>
                            ${feature.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="feature-risks">
                        <h4>${this.getLocalizedText('risks')}</h4>
                        <ul>
                            ${feature.risks.map(risk => `<li>${risk}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    toggleFeature(featureKey, enabled) {
        this.userPreferences[featureKey] = enabled;
        
        const card = document.getElementById(`feature-${featureKey}`);
        if (card) {
            card.classList.toggle('selected', enabled);
        }
        
        // Dispatch event for immediate application
        document.dispatchEvent(new CustomEvent('security-preference-changed', {
            detail: { feature: featureKey, enabled }
        }));
    }
    
    completeOnboarding() {
        // Save preferences
        this.saveUserPreferences();
        
        // Mark onboarding as completed
        this.onboardingData.completed = true;
        this.onboardingData.skipped = false;
        this.onboardingData.completedAt = new Date().toISOString();
        this.saveOnboardingState();
        
        // Apply preferences
        this.applySecurityPreferences();
        
        // Hide modal
        this.hideOnboarding();
        
        // Show success message
        if (window.userCommunication) {
            window.userCommunication.showMessage({
                type: 'success',
                title: '安全設定已完成',
                content: '您的安全偏好設定已儲存，可隨時在設定中修改。'
            });
        }
        
        // Dispatch completion event
        document.dispatchEvent(new CustomEvent('security-onboarding-completed', {
            detail: { preferences: this.userPreferences }
        }));
    }
    
    skipOnboarding() {
        this.onboardingData.skipped = true;
        this.onboardingData.lastShown = new Date().toISOString();
        this.saveOnboardingState();
        
        this.hideOnboarding();
        
        // Show reminder message
        if (window.userCommunication) {
            window.userCommunication.showMessage({
                type: 'info',
                title: '安全設定已跳過',
                content: '您可以隨時在設定中啟用安全功能。',
                actions: [
                    {
                        id: 'open-settings',
                        label: '開啟設定',
                        callback: () => this.openSecuritySettings()
                    }
                ]
            });
        }
    }
    
    hideOnboarding() {
        const modal = document.getElementById('security-onboarding-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    }
    
    isOnboardingVisible() {
        const modal = document.getElementById('security-onboarding-modal');
        return modal && !modal.classList.contains('hidden');
    }
    
    applySecurityPreferences() {
        // Apply each preference
        Object.entries(this.userPreferences).forEach(([feature, enabled]) => {
            document.dispatchEvent(new CustomEvent('apply-security-preference', {
                detail: { feature, enabled }
            }));
        });
    }
    
    openSecuritySettings() {
        document.dispatchEvent(new CustomEvent('open-security-settings'));
    }
    
    handleNewFeature(featureDetails) {
        // Add new feature to available features
        if (featureDetails.key && !this.securityFeatures[featureDetails.key]) {
            this.securityFeatures[featureDetails.key] = featureDetails;
            
            // Show notification about new feature
            if (window.userCommunication) {
                window.userCommunication.showMessage({
                    type: 'feature-update',
                    title: '新的安全功能可用',
                    content: `${featureDetails.name}現已可用，您可以在設定中啟用。`,
                    actions: [
                        {
                            id: 'configure',
                            label: '立即設定',
                            callback: () => this.showOnboarding()
                        }
                    ]
                });
            }
        }
    }
    
    updateModalContent() {
        const modal = document.getElementById('security-onboarding-modal');
        if (!modal) return;
        
        // Update header text
        const title = modal.querySelector('#onboarding-title');
        const subtitle = modal.querySelector('.onboarding-subtitle');
        if (title) title.textContent = this.getLocalizedText('title');
        if (subtitle) subtitle.textContent = this.getLocalizedText('subtitle');
        
        // Update privacy notice
        const privacyNotice = modal.querySelector('.privacy-notice');
        if (privacyNotice) {
            privacyNotice.innerHTML = `<strong>${this.getLocalizedText('privacyTitle')}</strong>${this.getLocalizedText('privacyNotice')}`;
        }
        
        // Update buttons
        const skipBtn = modal.querySelector('.onboarding-btn.secondary');
        const confirmBtn = modal.querySelector('.onboarding-btn.primary');
        if (skipBtn) skipBtn.textContent = this.getLocalizedText('skipButton');
        if (confirmBtn) confirmBtn.textContent = this.getLocalizedText('confirmButton');
        
        // Re-render features with new language
        this.renderFeatures();
    }
    
    cleanup() {
        // Remove language observer
        if (this.languageObserver && window.languageManager) {
            window.languageManager.removeObserver(this.languageObserver);
            this.languageObserver = null;
        }
        
        // Remove modal
        const modal = document.getElementById('security-onboarding-modal');
        if (modal) {
            modal.remove();
        }
        
        // Clear references
        this.focusedElement = null;
    }
    
    resetOnboarding() {
        this.onboardingData = {
            completed: false,
            skipped: false,
            lastShown: null,
            version: '1.0.0'
        };
        this.saveOnboardingState();
    }
    
    getPreferences() {
        return { ...this.userPreferences };
    }
    
    setPreference(feature, enabled) {
        this.userPreferences[feature] = enabled;
        this.saveUserPreferences();
        this.applySecurityPreferences();
    }
}

// Global instance
window.securityOnboarding = new ClientSideSecurityOnboarding();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientSideSecurityOnboarding;
}