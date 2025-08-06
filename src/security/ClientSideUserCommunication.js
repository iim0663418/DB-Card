/**
 * Client-Side User Communication System
 * Provides clear communication about security enhancements and issues
 * Static hosting compatible with localStorage persistence
 */

class ClientSideUserCommunication {
    constructor() {
        this.storageKey = 'db-card-user-communications';
        this.messageQueue = [];
        this.activeMessages = new Map();
        this.initialized = false;
        this.currentLanguage = this.detectLanguage();
        this.languageObserver = null;
        
        this.messageTypes = {
            SECURITY_ENHANCEMENT: 'security-enhancement',
            SECURITY_ISSUE: 'security-issue',
            FEATURE_UPDATE: 'feature-update',
            MAINTENANCE: 'maintenance',
            SUCCESS: 'success',
            WARNING: 'warning',
            ERROR: 'error',
            INFO: 'info'
        };
        
        this.init();
    }
    
    async init() {
        try {
            this.loadStoredMessages();
            this.createMessageContainer();
            this.setupEventListeners();
            this.setupLanguageObserver();
            this.initialized = true;
            
            // Process any queued messages
            this.processMessageQueue();
            
        } catch (error) {
            console.error('Failed to initialize user communication system:', error);
        }
    }
    
    loadStoredMessages() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                // Load persistent messages that haven't expired
                data.messages?.forEach(msg => {
                    if (!msg.expires || new Date(msg.expires) > new Date()) {
                        this.activeMessages.set(msg.id, msg);
                    }
                });
            }
        } catch (error) {
            console.warn('Failed to load stored messages:', error);
        }
    }
    
    saveMessages() {
        try {
            const data = {
                messages: Array.from(this.activeMessages.values()),
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save messages:', error);
        }
    }
    
    createMessageContainer() {
        if (document.getElementById('user-communication-container')) return;
        
        const container = document.createElement('div');
        container.id = 'user-communication-container';
        container.className = 'user-communication-container';
        container.setAttribute('role', 'region');
        container.setAttribute('aria-label', this.getLocalizedText('containerLabel'));
        
        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            .user-communication-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            }
            
            .communication-message {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                margin-bottom: 12px;
                padding: 16px;
                pointer-events: auto;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                border-left: 4px solid #1976d2;
            }
            
            .communication-message.show {
                transform: translateX(0);
            }
            
            .communication-message.security-enhancement {
                border-left-color: #4caf50;
            }
            
            .communication-message.security-issue {
                border-left-color: #f44336;
            }
            
            .communication-message.warning {
                border-left-color: #ff9800;
            }
            
            .communication-message.error {
                border-left-color: #f44336;
            }
            
            .communication-message.success {
                border-left-color: #4caf50;
            }
            
            .message-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
            }
            
            .message-title {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                margin: 0;
            }
            
            .message-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .message-content {
                font-size: 13px;
                color: #666;
                line-height: 1.4;
                margin-bottom: 12px;
            }
            
            .message-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .message-action {
                background: #1976d2;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
            }
            
            .message-action.secondary {
                background: #f5f5f5;
                color: #666;
            }
            
            .message-action:hover {
                opacity: 0.9;
            }
            
            @media (max-width: 480px) {
                .user-communication-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(container);
    }
    
    setupEventListeners() {
        // Listen for security events
        document.addEventListener('security-enhancement-applied', (event) => {
            this.showSecurityEnhancement(event.detail);
        });
        
        document.addEventListener('security-issue-detected', (event) => {
            this.showSecurityIssue(event.detail);
        });
        
        document.addEventListener('security-feature-disabled', (event) => {
            this.showFeatureDisabled(event.detail);
        });
    }
    
    showMessage(options) {
        if (!this.initialized) {
            this.messageQueue.push(options);
            return;
        }
        
        const messageId = options.id || this.generateMessageId();
        const message = {
            id: messageId,
            type: options.type || this.messageTypes.INFO,
            title: options.title || this.getLocalizedText('defaultTitle'),
            content: options.content || '',
            actions: options.actions || [],
            persistent: options.persistent || false,
            expires: options.expires || null,
            timestamp: new Date().toISOString()
        };
        
        this.activeMessages.set(messageId, message);
        this.renderMessage(message);
        
        if (message.persistent) {
            this.saveMessages();
        }
        
        // Auto-dismiss non-persistent messages
        if (!message.persistent && !message.expires) {
            setTimeout(() => {
                this.dismissMessage(messageId);
            }, 8000);
        }
        
        return messageId;
    }
    
    renderMessage(message) {
        const container = document.getElementById('user-communication-container');
        if (!container) return;
        
        const messageEl = document.createElement('div');
        messageEl.id = `message-${message.id}`;
        messageEl.className = `communication-message ${message.type}`;
        messageEl.setAttribute('role', 'alert');
        messageEl.setAttribute('aria-live', 'polite');
        
        const actionsHtml = message.actions.map(action => 
            `<button class="message-action ${action.type || ''}" 
                     onclick="window.userCommunication?.handleAction('${message.id}', '${action.id}')"
                     ${action.href ? `onclick="window.open('${action.href}', '_blank')"` : ''}>
                ${action.label}
             </button>`
        ).join('');
        
        messageEl.innerHTML = `
            <div class="message-header">
                <h4 class="message-title">${message.title}</h4>
                <button class="message-close" 
                        onclick="window.userCommunication?.dismissMessage('${message.id}')"
                        aria-label="${this.getLocalizedText('actions.close')}">×</button>
            </div>
            <div class="message-content">${message.content}</div>
            ${actionsHtml ? `<div class="message-actions">${actionsHtml}</div>` : ''}
        `;
        
        container.appendChild(messageEl);
        
        // Trigger animation
        setTimeout(() => {
            messageEl.classList.add('show');
        }, 100);
    }
    
    dismissMessage(messageId) {
        const messageEl = document.getElementById(`message-${messageId}`);
        if (messageEl) {
            messageEl.classList.remove('show');
            setTimeout(() => {
                messageEl.remove();
            }, 300);
        }
        
        this.activeMessages.delete(messageId);
        this.saveMessages();
    }
    
    handleAction(messageId, actionId) {
        const message = this.activeMessages.get(messageId);
        if (!message) return;
        
        const action = message.actions.find(a => a.id === actionId);
        if (!action) return;
        
        // Execute action callback if provided
        if (action.callback && typeof action.callback === 'function') {
            action.callback(messageId, actionId);
        }
        
        // Dismiss message if action specifies
        if (action.dismissOnClick !== false) {
            this.dismissMessage(messageId);
        }
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('user-communication-action', {
            detail: { messageId, actionId, action }
        }));
    }
    
    showSecurityEnhancement(details) {
        this.showMessage({
            type: this.messageTypes.SECURITY_ENHANCEMENT,
            title: this.getLocalizedText('messageTypes.securityEnhancement'),
            content: `${details.feature || this.getLocalizedText('defaultFeatureName')}${this.getLocalizedText('enhancementMessage')}`,
            actions: [
                {
                    id: 'learn-more',
                    label: this.getLocalizedText('actions.learnMore'),
                    href: '#security-settings'
                },
                {
                    id: 'dismiss',
                    label: this.getLocalizedText('actions.dismiss'),
                    type: 'secondary'
                }
            ]
        });
    }
    
    showSecurityIssue(details) {
        this.showMessage({
            type: this.messageTypes.SECURITY_ISSUE,
            title: this.getLocalizedText('messageTypes.securityIssue'),
            content: details.message || this.getLocalizedText('defaultSecurityIssueMessage'),
            persistent: details.critical || false,
            actions: [
                {
                    id: 'check-settings',
                    label: this.getLocalizedText('actions.checkSettings'),
                    callback: () => this.openSecuritySettings()
                },
                {
                    id: 'ignore',
                    label: this.getLocalizedText('actions.dismiss'),
                    type: 'secondary'
                }
            ]
        });
    }
    
    showFeatureDisabled(details) {
        this.showMessage({
            type: this.messageTypes.WARNING,
            title: this.getLocalizedText('messageTypes.featureDisabled'),
            content: `${details.feature || this.getLocalizedText('defaultFeatureName')}${this.getLocalizedText('featureDisabledMessage')}`,
            actions: [
                {
                    id: 'retry',
                    label: this.getLocalizedText('actions.retry'),
                    callback: () => details.retryCallback?.()
                },
                {
                    id: 'settings',
                    label: this.getLocalizedText('actions.settings'),
                    type: 'secondary',
                    callback: () => this.openSecuritySettings()
                }
            ]
        });
    }
    
    openSecuritySettings() {
        // Trigger security settings modal or navigation
        document.dispatchEvent(new CustomEvent('open-security-settings'));
    }
    
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const options = this.messageQueue.shift();
            this.showMessage(options);
        }
    }
    
    generateMessageId() {
        return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    clearAllMessages() {
        this.activeMessages.clear();
        this.saveMessages();
        
        const container = document.getElementById('user-communication-container');
        if (container) {
            container.innerHTML = '';
        }
    }
    
    getActiveMessages() {
        return Array.from(this.activeMessages.values());
    }
    
    /**
     * Detect current language
     */
    detectLanguage() {
        return window.languageManager ? window.languageManager.getCurrentLanguage() : 'zh';
    }
    
    /**
     * Setup language observer for unified language management
     */
    setupLanguageObserver() {
        if (window.languageManager && window.languageManager.registerObserver) {
            this.languageObserver = {
                id: 'user-communication',
                priority: 5,
                updateCallback: (newLanguage) => {
                    this.currentLanguage = newLanguage;
                    this.updateLanguage();
                }
            };
            window.languageManager.registerObserver('user-communication', this.languageObserver);
        }
    }
    
    /**
     * Update language for existing UI elements
     */
    updateLanguage() {
        const container = document.getElementById('user-communication-container');
        if (container) {
            container.setAttribute('aria-label', this.getLocalizedText('containerLabel'));
        }
        
        // Update existing messages if any
        const messages = container?.querySelectorAll('.communication-message');
        messages?.forEach(messageEl => {
            const closeBtn = messageEl.querySelector('.message-close');
            if (closeBtn) {
                closeBtn.setAttribute('aria-label', this.getLocalizedText('actions.close'));
            }
        });
    }
    
    /**
     * Get localized text using unified language manager
     */
    getLocalizedText(key) {
        if (window.languageManager && window.languageManager.getUnifiedText) {
            const fullKey = `security.userCommunication.${key}`;
            const text = window.languageManager.getUnifiedText(fullKey, this.currentLanguage);
            if (text !== fullKey) {
                return text;
            }
        }
        
        // Fallback translations
        const fallbacks = {
            zh: {
                containerLabel: '系統通知',
                defaultTitle: '系統通知',
                defaultFeatureName: '新的安全功能',
                enhancementMessage: '已成功啟用，您的資料將獲得更好的保護。',
                defaultSecurityIssueMessage: '檢測到潛在的安全問題，建議您檢查安全設定。',
                featureDisabledMessage: '已暫時停用以確保系統穩定運行。',
                'messageTypes.securityEnhancement': '安全功能已啟用',
                'messageTypes.securityIssue': '安全提醒',
                'messageTypes.featureDisabled': '功能已停用',
                'actions.close': '關閉通知',
                'actions.learnMore': '了解更多',
                'actions.dismiss': '知道了',
                'actions.checkSettings': '檢查設定',
                'actions.retry': '重試',
                'actions.settings': '設定'
            },
            en: {
                containerLabel: 'System Notifications',
                defaultTitle: 'System Notification',
                defaultFeatureName: 'New security feature',
                enhancementMessage: ' has been successfully enabled, your data will be better protected.',
                defaultSecurityIssueMessage: 'Potential security issue detected, please check security settings.',
                featureDisabledMessage: ' has been temporarily disabled to ensure system stability.',
                'messageTypes.securityEnhancement': 'Security Feature Enabled',
                'messageTypes.securityIssue': 'Security Alert',
                'messageTypes.featureDisabled': 'Feature Disabled',
                'actions.close': 'Close Notification',
                'actions.learnMore': 'Learn More',
                'actions.dismiss': 'Dismiss',
                'actions.checkSettings': 'Check Settings',
                'actions.retry': 'Retry',
                'actions.settings': 'Settings'
            }
        };
        
        return fallbacks[this.currentLanguage]?.[key] || fallbacks.zh[key] || key;
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.languageObserver && window.languageManager) {
            window.languageManager.unregisterObserver('user-communication');
        }
    }
}

// Global instance
window.userCommunication = new ClientSideUserCommunication();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientSideUserCommunication;
}