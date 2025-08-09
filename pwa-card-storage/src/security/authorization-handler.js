/**
 * AuthorizationHandler - CWE-862 Missing Authorization Protection Module
 * 
 * Prevents unauthorized access to sensitive operations by implementing
 * user confirmation mechanisms with accessibility support.
 * 
 * @version 1.0.0
 * @author Security Team
 */

class AuthorizationHandler {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.enableLogging = options.enableLogging !== false;
        this.confirmationTimeout = options.confirmationTimeout || 30000; // 30 seconds
        this.sensitiveOperations = new Set([
            'delete', 'clear', 'reset', 'remove', 'purge',
            'export', 'backup', 'restore', 'migrate'
        ]);
    }

    /**
     * Checks if an operation requires user confirmation
     */
    requiresConfirmation(operation, context = {}) {
        const operationLower = operation.toLowerCase();
        
        // Check against sensitive operations list
        if (this.sensitiveOperations.has(operationLower)) {
            return true;
        }

        // Check for bulk operations
        if (context.itemCount && context.itemCount > 10) {
            return true;
        }

        // Check for destructive patterns
        if (operationLower.includes('delete') || 
            operationLower.includes('remove') || 
            operationLower.includes('clear')) {
            return true;
        }

        return false;
    }

    /**
     * Creates accessible confirmation dialog with moda design system
     * Follows WCAG 2.1 AA guidelines and unified language management
     */
    createConfirmationDialog(message, options = {}) {
        return new Promise((resolve) => {
            const lang = (typeof window !== 'undefined' && window.languageManager?.getCurrentLanguage()) || 'zh';
            
            // Create modal overlay with moda design
            const overlay = document.createElement('div');
            overlay.className = 'auth-modal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'auth-dialog-title');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); z-index: 10000;
                display: flex; align-items: center; justify-content: center;
                font-family: var(--pwa-font-family);
            `;

            // Create dialog with moda styling
            const dialog = document.createElement('div');
            dialog.className = 'auth-dialog';
            dialog.style.cssText = `
                background: var(--pwa-surface); 
                border: 1px solid var(--pwa-border);
                color: var(--pwa-text);
                padding: var(--pwa-spacing-xl); 
                border-radius: 12px;
                max-width: 400px; margin: 20px; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-family: var(--pwa-font-family);
            `;

            // Title with language support
            const title = document.createElement('h2');
            title.id = 'auth-dialog-title';
            title.textContent = (typeof window !== 'undefined' && window.languageManager?.getText('security.confirmOperation')) || 
                               (lang === 'zh' ? '確認操作' : 'Confirm Operation');
            title.style.cssText = `
                margin: 0 0 var(--pwa-spacing-md) 0; 
                font-size: var(--senior-font-size-lg); 
                color: var(--pwa-text);
                font-weight: var(--pwa-font-weight-bold);
            `;

            // Message with moda typography
            const messageEl = document.createElement('p');
            messageEl.textContent = message;
            messageEl.style.cssText = `
                margin: 0 0 var(--pwa-spacing-xl) 0; 
                color: var(--pwa-text); 
                line-height: var(--senior-line-height-normal);
                font-size: var(--senior-font-size-base);
            `;

            // Button container
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex; gap: var(--pwa-spacing-sm); 
                justify-content: flex-end;
            `;

            // Cancel button with moda design
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = (typeof window !== 'undefined' && window.languageManager?.getText('cancel')) || 
                                   (lang === 'zh' ? '取消' : 'Cancel');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.style.cssText = `
                padding: var(--pwa-spacing-sm) var(--pwa-spacing-md); 
                border: 1px solid var(--pwa-border); 
                background: var(--pwa-surface);
                color: var(--pwa-text);
                border-radius: 6px; cursor: pointer; 
                font-size: var(--senior-font-size-base);
                font-family: var(--pwa-font-family);
                transition: var(--pwa-transition-duration) var(--pwa-transition-timing);
            `;
            cancelBtn.onclick = () => {
                document.body.removeChild(overlay);
                resolve(false);
            };

            // Confirm button with moda primary color
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = (typeof window !== 'undefined' && window.languageManager?.getText('confirm')) || 
                                    (lang === 'zh' ? '確認' : 'Confirm');
            confirmBtn.className = 'btn btn-primary';
            confirmBtn.style.cssText = `
                padding: var(--pwa-spacing-sm) var(--pwa-spacing-md); 
                border: none; 
                background: var(--pwa-primary);
                color: var(--md-white-1); 
                border-radius: 6px; cursor: pointer; 
                font-size: var(--senior-font-size-base);
                font-family: var(--pwa-font-family);
                transition: var(--pwa-transition-duration) var(--pwa-transition-timing);
            `;
            confirmBtn.onclick = () => {
                document.body.removeChild(overlay);
                resolve(true);
            };

            // Assemble dialog
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);
            dialog.appendChild(title);
            dialog.appendChild(messageEl);
            dialog.appendChild(buttonContainer);
            overlay.appendChild(dialog);

            // Handle ESC key
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(overlay);
                    document.removeEventListener('keydown', handleKeydown);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleKeydown);

            // Auto-timeout
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                    document.removeEventListener('keydown', handleKeydown);
                    resolve(false);
                }
            }, this.confirmationTimeout);

            // Show dialog
            document.body.appendChild(overlay);
            confirmBtn.focus();
        });
    }

    /**
     * Validates authorization for sensitive operations
     */
    async validateOperation(operation, context = {}) {
        const operationId = `${operation}_${Date.now()}`;
        
        if (this.enableLogging) {
            this.logger.info?.(`Authorization check started for operation: ${operation}`, {
                operationId,
                context: JSON.stringify(context)
            });
        }

        // Check if confirmation is required
        if (!this.requiresConfirmation(operation, context)) {
            if (this.enableLogging) {
                this.logger.info?.(`Operation ${operation} authorized without confirmation`, {
                    operationId
                });
            }
            return { authorized: true, confirmed: false };
        }

        // Generate confirmation message
        const message = this.generateConfirmationMessage(operation, context);
        
        try {
            // Show confirmation dialog
            const confirmed = await this.createConfirmationDialog(message, {
                title: '安全確認',
                confirmText: '執行'
            });

            const result = { authorized: confirmed, confirmed: true };

            if (this.enableLogging) {
                this.logger.info?.(`Authorization result for ${operation}: ${confirmed ? 'GRANTED' : 'DENIED'}`, {
                    operationId,
                    result: confirmed ? 'GRANTED' : 'DENIED'
                });
            }

            return result;
        } catch (error) {
            if (this.enableLogging) {
                this.logger.error?.(`Authorization error for ${operation}`, {
                    operationId,
                    error: error.message
                });
            }
            return { authorized: false, confirmed: false, error: error.message };
        }
    }

    /**
     * Generates appropriate confirmation message with language support
     */
    generateConfirmationMessage(operation, context) {
        const operationLower = operation.toLowerCase();
        const lang = (typeof window !== 'undefined' && window.languageManager?.getCurrentLanguage()) || 'zh';
        const count = context.itemCount || 1;
        
        if (operationLower.includes('delete') || operationLower.includes('remove')) {
            return lang === 'zh' 
                ? `您即將刪除 ${count} 個項目，此操作無法復原。確定要繼續嗎？`
                : `You are about to delete ${count} item(s). This action cannot be undone. Continue?`;
        }
        
        if (operationLower.includes('clear') || operationLower.includes('reset')) {
            return lang === 'zh'
                ? `您即將清除所有資料，此操作無法復原。確定要繼續嗎？`
                : `You are about to clear all data. This action cannot be undone. Continue?`;
        }
        
        if (operationLower.includes('export') || operationLower.includes('backup')) {
            return lang === 'zh'
                ? `您即將匯出敏感資料，請確保在安全環境中進行。確定要繼續嗎？`
                : `You are about to export sensitive data. Please ensure you are in a secure environment. Continue?`;
        }
        
        return lang === 'zh'
            ? `您即將執行敏感操作：${operation}。確定要繼續嗎？`
            : `You are about to perform a sensitive operation: ${operation}. Continue?`;
    }

    /**
     * Convenience method for protecting functions
     */
    async protectOperation(operation, fn, context = {}) {
        const authResult = await this.validateOperation(operation, context);
        
        if (!authResult.authorized) {
            throw new Error(`Operation ${operation} not authorized`);
        }
        
        return await fn();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthorizationHandler };
} else if (typeof window !== 'undefined') {
    window.AuthorizationHandler = AuthorizationHandler;
}