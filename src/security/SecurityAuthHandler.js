/**
 * SecurityAuthHandler - 統一認證與授權處理模組
 * 實作最小權限原則和授權檢查機制
 */
class SecurityAuthHandler {
    static #sessions = new Map();
    static #permissions = new Map();

    /**
     * 驗證資源存取權限
     */
    static validateAccess(resource, operation, context = {}) {
        const {
            userId = 'anonymous',
            sessionId = null,
            timestamp = Date.now()
        } = context;

        // 基本資源權限檢查
        const resourcePermissions = this.#getResourcePermissions(resource);
        if (!resourcePermissions) {
            return {
                authorized: false,
                reason: '未知資源'
            };
        }

        // 操作權限檢查
        if (!resourcePermissions.operations.includes(operation)) {
            return {
                authorized: false,
                reason: '不支援的操作'
            };
        }

        // 會話驗證
        if (sessionId && !this.#validateSession(sessionId, userId)) {
            return {
                authorized: false,
                reason: '會話無效'
            };
        }

        // 記錄存取日誌
        this.#auditLog('access_check', {
            resource,
            operation,
            userId,
            authorized: true
        });

        return {
            authorized: true,
            reason: '授權通過'
        };
    }

    /**
     * 安全密碼輸入機制
     */
    static async securePasswordInput(options = {}) {
        const {
            title = '密碼輸入',
            minLength = 6,
            requireSpecialChars = false,
            showStrength = true
        } = options;

        try {
            const result = await SecurityInputHandler.securePrompt('請輸入密碼', {
                title,
                inputType: 'password',
                validation: {
                    minLength,
                    customPattern: requireSpecialChars ? /^(?=.*[!@#$%^&*])/ : null
                }
            });

            if (!result.confirmed) {
                return { success: false, hashedPassword: null };
            }

            // 簡單雜湊處理（實際應用中應使用更強的雜湊）
            const hashedPassword = await this.#hashPassword(result.value);
            
            return { success: true, hashedPassword };
        } catch (error) {
            this.#auditLog('password_input_error', { error: error.message }, 'error');
            return { success: false, hashedPassword: null };
        }
    }

    /**
     * 安全審計日誌記錄
     */
    static auditLog(action, details = {}, severity = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: this.#sanitizeLogField(action),
            severity: severity.toLowerCase(),
            details: this.#sanitizeLogDetails(details),
            source: 'SecurityAuthHandler'
        };

        // 使用 SecurityDataHandler 的安全日誌功能
        if (window.SecurityDataHandler) {
            window.SecurityDataHandler.secureLog(severity, action, details);
        } else {
            // 備用日誌方式
            console.log('[SECURITY-AUTH]', logEntry);
        }
    }

    /**
     * 創建安全會話
     */
    static createSession(userId, permissions = []) {
        const sessionId = this.#generateSessionId();
        const session = {
            userId,
            permissions,
            createdAt: Date.now(),
            lastAccess: Date.now(),
            expires: Date.now() + (30 * 60 * 1000) // 30分鐘
        };

        this.#sessions.set(sessionId, session);
        this.#auditLog('session_created', { userId, sessionId });

        return sessionId;
    }

    /**
     * 驗證會話
     */
    static validateSession(sessionId, userId = null) {
        const session = this.#sessions.get(sessionId);
        
        if (!session) {
            return false;
        }

        if (Date.now() > session.expires) {
            this.#sessions.delete(sessionId);
            this.#auditLog('session_expired', { sessionId });
            return false;
        }

        if (userId && session.userId !== userId) {
            this.#auditLog('session_user_mismatch', { sessionId, expectedUser: userId });
            return false;
        }

        // 更新最後存取時間
        session.lastAccess = Date.now();
        return true;
    }

    /**
     * 銷毀會話
     */
    static destroySession(sessionId) {
        const session = this.#sessions.get(sessionId);
        if (session) {
            this.#sessions.delete(sessionId);
            this.#auditLog('session_destroyed', { sessionId, userId: session.userId });
            return true;
        }
        return false;
    }

    /**
     * 獲取資源權限配置
     */
    static #getResourcePermissions(resource) {
        const defaultPermissions = {
            'card-data': {
                operations: ['read', 'write', 'delete'],
                requireAuth: false
            },
            'storage': {
                operations: ['read', 'write'],
                requireAuth: false
            },
            'export': {
                operations: ['read'],
                requireAuth: false
            },
            'import': {
                operations: ['write'],
                requireAuth: false
            },
            'admin': {
                operations: ['read', 'write', 'delete'],
                requireAuth: true
            }
        };

        return defaultPermissions[resource] || null;
    }

    /**
     * 驗證會話內部方法
     */
    static #validateSession(sessionId, userId) {
        return this.validateSession(sessionId, userId);
    }

    /**
     * 生成會話ID
     */
    static #generateSessionId() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * 密碼雜湊
     */
    static async #hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * 清理日誌欄位
     */
    static #sanitizeLogField(field) {
        if (typeof field !== 'string') {
            field = String(field);
        }
        
        return field
            .replace(/[\r\n\t]/g, ' ')
            .replace(/[^\w\s-_.]/g, '')
            .substring(0, 100);
    }

    /**
     * 清理日誌詳情
     */
    static #sanitizeLogDetails(details) {
        if (!details || typeof details !== 'object') {
            return {};
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(details)) {
            const sanitizedKey = this.#sanitizeLogField(key);
            let sanitizedValue;
            
            if (typeof value === 'string') {
                sanitizedValue = this.#sanitizeLogField(value);
            } else if (typeof value === 'object') {
                sanitizedValue = '[Object]';
            } else {
                sanitizedValue = String(value).substring(0, 100);
            }
            
            sanitized[sanitizedKey] = sanitizedValue;
        }
        
        return sanitized;
    }

    /**
     * 內部審計日誌
     */
    static #auditLog(action, details = {}, severity = 'info') {
        this.auditLog(action, details, severity);
    }
}

// 全域可用
window.SecurityAuthHandler = SecurityAuthHandler;