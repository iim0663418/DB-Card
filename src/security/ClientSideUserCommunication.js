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
        container.setAttribute('aria-label', '系統通知');
        
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
            title: options.title || '系統通知',
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
                        aria-label="關閉通知">×</button>
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
            title: '安全功能已啟用',
            content: `${details.feature || '新的安全功能'}已成功啟用，您的資料將獲得更好的保護。`,
            actions: [
                {
                    id: 'learn-more',
                    label: '了解更多',
                    href: '#security-settings'
                },
                {
                    id: 'dismiss',
                    label: '知道了',
                    type: 'secondary'
                }
            ]
        });
    }
    
    showSecurityIssue(details) {
        this.showMessage({
            type: this.messageTypes.SECURITY_ISSUE,
            title: '安全提醒',
            content: details.message || '檢測到潛在的安全問題，建議您檢查安全設定。',
            persistent: details.critical || false,
            actions: [
                {
                    id: 'check-settings',
                    label: '檢查設定',
                    callback: () => this.openSecuritySettings()
                },
                {
                    id: 'ignore',
                    label: '暫時忽略',
                    type: 'secondary'
                }
            ]
        });
    }
    
    showFeatureDisabled(details) {
        this.showMessage({
            type: this.messageTypes.WARNING,
            title: '功能已停用',
            content: `${details.feature || '某項功能'}已暫時停用以確保系統穩定運行。`,
            actions: [
                {
                    id: 'retry',
                    label: '重試',
                    callback: () => details.retryCallback?.()
                },
                {
                    id: 'settings',
                    label: '設定',
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
}

// Global instance
window.userCommunication = new ClientSideUserCommunication();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientSideUserCommunication;
}