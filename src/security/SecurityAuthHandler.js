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
        try {
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
                resource: this.#sanitizeLogField(resource),
                operation: this.#sanitizeLogField(operation),
                userId: this.#sanitizeLogField(userId),
                authorized: true
            });

            return {
                authorized: true,
                reason: '授權通過'
            };
        } catch (error) {
            this.#auditLog('access_check_error', { error: 'Validation failed' }, 'error');
            return {
                authorized: false,
                reason: '授權檢查失敗'
            };
        }
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
            this.#auditLog('password_input_error', { error: 'Password input failed' }, 'error');
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
            // 備用日誌方式 - 只在開發環境使用
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('[SECURITY-AUTH]', JSON.stringify(logEntry));
            }
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
        try {
            const session = this.#sessions.get(sessionId);
            
            if (!session) {
                return false;
            }

            if (Date.now() > session.expires) {
                this.#sessions.delete(sessionId);
                this.#auditLog('session_expired', { sessionId: this.#sanitizeLogField(sessionId) });
                return false;
            }

            if (userId && session.userId !== userId) {
                this.#auditLog('session_user_mismatch', { 
                    sessionId: this.#sanitizeLogField(sessionId), 
                    expectedUser: this.#sanitizeLogField(userId) 
                });
                return false;
            }

            // 更新最後存取時間
            session.lastAccess = Date.now();
            return true;
        } catch (error) {
            this.#auditLog('session_validation_error', { error: 'Session validation failed' }, 'error');
            return false;
        }
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
            'logging': {
                operations: ['write'],
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
     * 密碼雜湊 - 使用更安全的方法
     * 注意：這是簡化實作，生產環境應使用 bcrypt 或 Argon2
     */
    static async #hashPassword(password) {
        try {
            // Add salt for better security
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const encoder = new TextEncoder();
            const passwordData = encoder.encode(password + Array.from(salt).join(''));
            
            // Use multiple iterations for better security
            let hash = passwordData;
            for (let i = 0; i < 10000; i++) {
                hash = new Uint8Array(await crypto.subtle.digest('SHA-256', hash));
            }
            
            // Combine salt and hash
            const combined = new Uint8Array(salt.length + hash.length);
            combined.set(salt);
            combined.set(hash, salt.length);
            
            return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            throw new Error('密碼處理失敗');
        }
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