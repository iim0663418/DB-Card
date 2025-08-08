/**
 * SecurityInputHandler - 統一安全輸入處理模組
 * 替代不安全的 prompt/confirm API，提供安全的用戶輸入機制
 */
class SecurityInputHandler {
    static #activeDialog = null;

    /**
     * 驗證並清理用戶輸入
     */
    static validateAndSanitize(input, type = 'text', options = {}) {
        try {
            const {
                maxLength = 1000,
                allowEmpty = false,
                customPattern = null
            } = options;

            const errors = [];
            
            if (!input && !allowEmpty) {
                errors.push('輸入不能為空');
            }
            
            if (input && input.length > maxLength) {
                errors.push(`輸入長度不能超過 ${maxLength} 字符`);
            }

            let sanitized = input ? this.#sanitizeInput(input) : '';

        // 類型驗證
        switch (type) {
            case 'email':
                if (sanitized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
                    errors.push('請輸入有效的電子郵件地址');
                }
                break;
            case 'alphanumeric':
                if (sanitized && !/^[a-zA-Z0-9\u4e00-\u9fff\s]*$/.test(sanitized)) {
                    errors.push('只能包含字母、數字和中文字符');
                }
                break;
            case 'url':
                if (sanitized && !/^https?:\/\/.+/.test(sanitized)) {
                    errors.push('請輸入有效的 URL');
                }
                break;
        }

        if (customPattern && sanitized && !customPattern.test(sanitized)) {
            errors.push('輸入格式不正確');
        }

            return {
                isValid: errors.length === 0,
                sanitized,
                errors
            };
        } catch (error) {
            return {
                isValid: false,
                sanitized: '',
                errors: ['輸入處理失敗']
            };
        }
    }

    /**
     * 安全的用戶輸入對話框 - 替代 prompt()
     */
    static async securePrompt(message, options = {}) {
        if (this.#activeDialog) {
            throw new Error('已有對話框正在顯示');
        }

        const {
            title = '輸入',
            inputType = 'text',
            validation = {},
            placeholder = '',
            defaultValue = ''
        } = options;

        return new Promise((resolve) => {
            this.#activeDialog = this.#createInputDialog({
                title,
                message,
                inputType,
                placeholder,
                defaultValue,
                onConfirm: (value) => {
                    const result = this.validateAndSanitize(value, inputType, validation);
                    if (result.isValid) {
                        this.#closeDialog();
                        resolve({ confirmed: true, value: result.sanitized });
                    } else {
                        this.#showValidationErrors(result.errors);
                    }
                },
                onCancel: () => {
                    this.#closeDialog();
                    resolve({ confirmed: false, value: null });
                }
            });
        });
    }

    /**
     * 安全的確認對話框 - 替代 confirm()
     */
    static async secureConfirm(message, options = {}) {
        if (this.#activeDialog) {
            throw new Error('已有對話框正在顯示');
        }

        const {
            title = '確認',
            confirmText = '確認',
            cancelText = '取消',
            danger = false
        } = options;

        return new Promise((resolve) => {
            this.#activeDialog = this.#createConfirmDialog({
                title,
                message,
                confirmText,
                cancelText,
                danger,
                onConfirm: () => {
                    this.#closeDialog();
                    resolve(true);
                },
                onCancel: () => {
                    this.#closeDialog();
                    resolve(false);
                }
            });
        });
    }

    /**
     * 創建輸入對話框
     */
    static #createInputDialog(config) {
        const overlay = document.createElement('div');
        overlay.className = 'security-dialog-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.className = 'security-dialog';
        dialog.style.cssText = `
            background: white; border-radius: 8px; padding: 24px;
            min-width: 320px; max-width: 480px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;

        // Create elements safely without innerHTML
        const title = document.createElement('h3');
        title.style.cssText = 'margin: 0 0 16px 0; color: #333;';
        title.textContent = config.title;
        
        const message = document.createElement('p');
        message.style.cssText = 'margin: 0 0 16px 0; color: #666;';
        message.textContent = config.message;
        
        const input = document.createElement('input');
        input.type = config.inputType;
        input.placeholder = config.placeholder;
        input.value = config.defaultValue;
        input.style.cssText = 'width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 16px;';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-messages';
        errorDiv.style.cssText = 'color: #e74c3c; margin-bottom: 16px; display: none;';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-btn';
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = 'padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;';
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'confirm-btn';
        confirmBtn.textContent = '確認';
        confirmBtn.style.cssText = 'padding: 8px 16px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;';
        
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);
        
        dialog.appendChild(title);
        dialog.appendChild(message);
        dialog.appendChild(input);
        dialog.appendChild(errorDiv);
        dialog.appendChild(buttonContainer);

        // Elements are already created above

        confirmBtn.onclick = () => config.onConfirm(input.value);
        cancelBtn.onclick = config.onCancel;
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') config.onConfirm(input.value);
            if (e.key === 'Escape') config.onCancel();
        };

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        input.focus();

        return overlay;
    }

    /**
     * 創建確認對話框
     */
    static #createConfirmDialog(config) {
        const overlay = document.createElement('div');
        overlay.className = 'security-dialog-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.className = 'security-dialog';
        dialog.style.cssText = `
            background: white; border-radius: 8px; padding: 24px;
            min-width: 320px; max-width: 480px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;

        const confirmBtnStyle = config.danger 
            ? 'padding: 8px 16px; border: none; background: #dc3545; color: white; border-radius: 4px; cursor: pointer;'
            : 'padding: 8px 16px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;';

        // Create elements safely without innerHTML
        const title = document.createElement('h3');
        title.style.cssText = 'margin: 0 0 16px 0; color: #333;';
        title.textContent = config.title;
        
        const message = document.createElement('p');
        message.style.cssText = 'margin: 0 0 24px 0; color: #666;';
        message.textContent = config.message;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-btn';
        cancelBtn.textContent = config.cancelText;
        cancelBtn.style.cssText = 'padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;';
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'confirm-btn';
        confirmBtn.textContent = config.confirmText;
        confirmBtn.style.cssText = confirmBtnStyle;
        
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);
        
        dialog.appendChild(title);
        dialog.appendChild(message);
        dialog.appendChild(buttonContainer);

        // Elements are already created above

        confirmBtn.onclick = config.onConfirm;
        cancelBtn.onclick = config.onCancel;

        overlay.onclick = (e) => {
            if (e.target === overlay) config.onCancel();
        };

        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', escapeHandler);
                config.onCancel();
            }
        };
        document.addEventListener('keydown', escapeHandler);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        confirmBtn.focus();

        return overlay;
    }

    /**
     * 顯示驗證錯誤
     */
    static #showValidationErrors(errors) {
        if (!this.#activeDialog) return;
        
        const errorDiv = this.#activeDialog.querySelector('.error-messages');
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = errors.join(', ');
        }
    }

    /**
     * 關閉對話框
     */
    static #closeDialog() {
        if (this.#activeDialog) {
            document.body.removeChild(this.#activeDialog);
            this.#activeDialog = null;
            // Event listeners are cleaned up in their respective handlers
        }
    }

    /**
     * 清理輸入內容 - 增強原型污染防護
     */
    static #sanitizeInput(input) {
        if (typeof input !== 'string') {
            input = String(input);
        }
        
        // 防護原型污染攻擊
        if (this.#isPrototypePollutionAttempt(input)) {
            throw new Error('檢測到潛在的原型污染攻擊');
        }
        
        return input
            .replace(/[<>]/g, '') // 移除潛在的 HTML 標籤
            .replace(/javascript:/gi, '') // 移除 JavaScript 協議
            .replace(/on\w+=/gi, '') // 移除事件處理器
            .replace(/__proto__|constructor|prototype/gi, '') // 移除原型相關關鍵字
            .trim();
    }

    /**
     * 檢測原型污染攻擊
     */
    static #isPrototypePollutionAttempt(input) {
        const dangerousPatterns = [
            /__proto__/i,
            /constructor/i,
            /prototype/i,
            /\[\s*["']?__proto__["']?\s*\]/i,
            /\[\s*["']?constructor["']?\s*\]/i,
            /\[\s*["']?prototype["']?\s*\]/i
        ];
        
        return dangerousPatterns.some(pattern => pattern.test(input));
    }

    /**
     * 深度對象清理 - 防護原型污染
     */
    static sanitizeObject(obj, maxDepth = 10) {
        if (maxDepth <= 0) {
            throw new Error('對象嵌套層級過深');
        }
        
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item, maxDepth - 1));
        }
        
        const sanitized = Object.create(null); // 創建無原型對象
        
        for (const [key, value] of Object.entries(obj)) {
            // 阻止危險的鍵名
            if (this.#isDangerousKey(key)) {
                continue;
            }
            
            const sanitizedKey = this.#sanitizeKey(key);
            sanitized[sanitizedKey] = this.sanitizeObject(value, maxDepth - 1);
        }
        
        return Object.freeze(sanitized); // 凍結對象防止修改
    }

    /**
     * 檢查危險的鍵名
     */
    static #isDangerousKey(key) {
        const dangerousKeys = [
            '__proto__',
            'constructor',
            'prototype',
            'valueOf',
            'toString',
            'hasOwnProperty'
        ];
        
        return dangerousKeys.includes(key.toLowerCase());
    }

    /**
     * 清理鍵名
     */
    static #sanitizeKey(key) {
        return String(key)
            .replace(/[^a-zA-Z0-9_\u4e00-\u9fff]/g, '_')
            .substring(0, 100); // 限制鍵名長度
    }

    /**
     * HTML 轉義
     */
    static #escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        // Safe innerHTML usage - textContent prevents XSS, innerHTML gets escaped result
        return div.innerHTML;
    }
}

// 全域可用
window.SecurityInputHandler = SecurityInputHandler;