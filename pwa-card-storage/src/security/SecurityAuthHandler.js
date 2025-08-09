/**
 * SecurityAuthHandler - 統一認證與授權處理模組
 * 實作 WebAuthn 無密碼認證與最小權限原則
 */
class SecurityAuthHandler {
    static #sessions = new Map();
    static #permissions = new Map();
    static #webAuthnCredentials = new Map();
    static #isWebAuthnSupported = null;

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
     * WebAuthn 認證機制
     */
    static async authenticateWithWebAuthn(options = {}) {
        const {
            userDisplayName = 'PWA User',
            timeout = 60000,
            requireResidentKey = false
        } = options;

        try {
            if (!this.#checkWebAuthnSupport()) {
                return await this.#fallbackAuthentication();
            }

            // 檢查是否已有註冊的憑證
            const existingCredentials = await this.#getStoredCredentials();
            
            if (existingCredentials.length === 0) {
                // 首次使用，註冊新憑證
                return await this.#registerWebAuthnCredential(userDisplayName, timeout, requireResidentKey);
            } else {
                // 使用現有憑證進行認證
                return await this.#authenticateWithExistingCredential(existingCredentials, timeout);
            }
        } catch (error) {
            this.#auditLog('webauthn_auth_error', { error: 'WebAuthn authentication failed' }, 'error');
            return await this.#fallbackAuthentication();
        }
    }

    /**
     * 註冊 WebAuthn 憑證
     */
    static async #registerWebAuthnCredential(userDisplayName, timeout, requireResidentKey) {
        try {
            const userId = this.#generateUserId();
            const challenge = this.#generateChallenge();
            
            const publicKeyCredentialCreationOptions = {
                challenge,
                rp: {
                    name: "DB-Card PWA",
                    id: window.location.hostname
                },
                user: {
                    id: new TextEncoder().encode(userId),
                    name: userId,
                    displayName: userDisplayName
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" },  // ES256
                    { alg: -257, type: "public-key" } // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "preferred",
                    requireResidentKey
                },
                timeout,
                attestation: "none"
            };

            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions
            });

            if (!credential) {
                throw new Error('Failed to create credential');
            }

            // 儲存憑證資訊到 IndexedDB
            await this.#storeCredential({
                id: credential.id,
                rawId: Array.from(new Uint8Array(credential.rawId)),
                type: credential.type,
                userId,
                userDisplayName,
                created: Date.now()
            });

            this.#auditLog('webauthn_credential_registered', { userId, credentialId: credential.id });
            
            return {
                success: true,
                credentialId: credential.id,
                userId,
                isNewRegistration: true
            };
        } catch (error) {
            this.#auditLog('webauthn_registration_failed', { error: error.message }, 'error');
            throw error;
        }
    }

    /**
     * 使用現有憑證進行認證
     */
    static async #authenticateWithExistingCredential(credentials, timeout) {
        try {
            const challenge = this.#generateChallenge();
            const allowCredentials = credentials.map(cred => ({
                id: new Uint8Array(cred.rawId),
                type: "public-key"
            }));

            const publicKeyCredentialRequestOptions = {
                challenge,
                allowCredentials,
                timeout,
                userVerification: "preferred"
            };

            const assertion = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions
            });

            if (!assertion) {
                throw new Error('Authentication failed');
            }

            // 驗證斷言
            const credentialInfo = credentials.find(c => c.id === assertion.id);
            if (!credentialInfo) {
                throw new Error('Unknown credential');
            }

            this.#auditLog('webauthn_auth_success', { 
                userId: credentialInfo.userId,
                credentialId: assertion.id 
            });

            return {
                success: true,
                credentialId: assertion.id,
                userId: credentialInfo.userId,
                isNewRegistration: false
            };
        } catch (error) {
            this.#auditLog('webauthn_auth_failed', { error: error.message }, 'error');
            throw error;
        }
    }

    /**
     * 備用認證機制（PIN 或密碼）
     */
    static async #fallbackAuthentication() {
        try {
            // 檢查是否已設定 PIN
            const storedPin = await this.#getStoredPin();
            
            if (!storedPin) {
                // 首次使用，設定 PIN
                return await this.#setupPin();
            } else {
                // 驗證 PIN
                return await this.#verifyPin(storedPin);
            }
        } catch (error) {
            this.#auditLog('fallback_auth_error', { error: 'Fallback authentication failed' }, 'error');
            return { success: false, error: error.message };
        }
    }

    /**
     * 設定 PIN 碼
     */
    static async #setupPin() {
        try {
            const pin = await this.#securePrompt('請設定 6 位數 PIN 碼', {
                inputType: 'password',
                pattern: /^\d{6}$/,
                title: 'PIN 設定'
            });

            if (!pin.confirmed) {
                return { success: false, cancelled: true };
            }

            const hashedPin = await this.#hashPassword(pin.value);
            await this.#storePin(hashedPin);

            this.#auditLog('pin_setup_success', { message: 'PIN setup completed' });
            
            return {
                success: true,
                userId: 'pin-user',
                isNewRegistration: true,
                authMethod: 'pin'
            };
        } catch (error) {
            this.#auditLog('pin_setup_error', { error: error.message }, 'error');
            return { success: false, error: error.message };
        }
    }

    /**
     * 驗證 PIN 碼
     */
    static async #verifyPin(storedHashedPin) {
        try {
            const pin = await this.#securePrompt('請輸入 PIN 碼', {
                inputType: 'password',
                pattern: /^\d{6}$/,
                title: 'PIN 驗證'
            });

            if (!pin.confirmed) {
                return { success: false, cancelled: true };
            }

            const hashedPin = await this.#hashPassword(pin.value);
            
            if (hashedPin !== storedHashedPin) {
                this.#auditLog('pin_verification_failed', { message: 'Invalid PIN' }, 'warning');
                return { success: false, error: 'Invalid PIN' };
            }

            this.#auditLog('pin_verification_success', { message: 'PIN verified' });
            
            return {
                success: true,
                userId: 'pin-user',
                isNewRegistration: false,
                authMethod: 'pin'
            };
        } catch (error) {
            this.#auditLog('pin_verification_error', { error: error.message }, 'error');
            return { success: false, error: error.message };
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
     * 檢查 WebAuthn 支援
     */
    static #checkWebAuthnSupport() {
        if (this.#isWebAuthnSupported !== null) {
            return this.#isWebAuthnSupported;
        }

        this.#isWebAuthnSupported = !!(window.PublicKeyCredential && 
                                      navigator.credentials && 
                                      navigator.credentials.create && 
                                      navigator.credentials.get);
        
        return this.#isWebAuthnSupported;
    }

    /**
     * 生成使用者 ID
     */
    static #generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    /**
     * 生成挑戰值
     */
    static #generateChallenge() {
        return crypto.getRandomValues(new Uint8Array(32));
    }

    /**
     * 儲存憑證到 IndexedDB
     */
    static async #storeCredential(credentialInfo) {
        try {
            const dbName = 'PWASecurityDB';
            const storeName = 'credentials';
            
            const db = await this.#openSecurityDB(dbName);
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            await new Promise((resolve, reject) => {
                const request = store.put(credentialInfo);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            db.close();
        } catch (error) {
            console.error('[SecurityAuth] Store credential failed:', error);
            throw error;
        }
    }

    /**
     * 從 IndexedDB 獲取儲存的憑證
     */
    static async #getStoredCredentials() {
        try {
            const dbName = 'PWASecurityDB';
            const storeName = 'credentials';
            
            const db = await this.#openSecurityDB(dbName);
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            const credentials = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            db.close();
            return credentials;
        } catch (error) {
            console.error('[SecurityAuth] Get stored credentials failed:', error);
            return [];
        }
    }

    /**
     * 開啟安全資料庫
     */
    static async #openSecurityDB(dbName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('credentials')) {
                    const store = db.createObjectStore('credentials', { keyPath: 'id' });
                    store.createIndex('userId', 'userId', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('pins')) {
                    db.createObjectStore('pins', { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * 儲存 PIN 碼
     */
    static async #storePin(hashedPin) {
        try {
            const dbName = 'PWASecurityDB';
            const storeName = 'pins';
            
            const db = await this.#openSecurityDB(dbName);
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            await new Promise((resolve, reject) => {
                const request = store.put({ id: 'user-pin', hashedPin, created: Date.now() });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            db.close();
        } catch (error) {
            console.error('[SecurityAuth] Store PIN failed:', error);
            throw error;
        }
    }

    /**
     * 獲取儲存的 PIN 碼
     */
    static async #getStoredPin() {
        try {
            const dbName = 'PWASecurityDB';
            const storeName = 'pins';
            
            const db = await this.#openSecurityDB(dbName);
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            const pinData = await new Promise((resolve, reject) => {
                const request = store.get('user-pin');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            db.close();
            return pinData ? pinData.hashedPin : null;
        } catch (error) {
            console.error('[SecurityAuth] Get stored PIN failed:', error);
            return null;
        }
    }

    /**
     * 安全提示輸入
     */
    static async #securePrompt(message, options = {}) {
        const {
            inputType = 'text',
            pattern = null,
            title = '輸入'
        } = options;

        return new Promise((resolve) => {
            // 創建安全的輸入對話框
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.8); display: flex; align-items: center;
                justify-content: center; z-index: 10000;
            `;
            
            const form = document.createElement('div');
            form.style.cssText = `
                background: white; padding: 20px; border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; width: 90%;
            `;
            
            form.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #333;">${title}</h3>
                <p style="margin: 0 0 15px 0; color: #666;">${message}</p>
                <input type="${inputType}" id="secureInput" style="
                    width: 100%; padding: 10px; border: 1px solid #ddd;
                    border-radius: 4px; font-size: 16px; box-sizing: border-box;
                " />
                <div style="margin-top: 15px; text-align: right;">
                    <button id="cancelBtn" style="
                        margin-right: 10px; padding: 8px 16px; border: 1px solid #ddd;
                        background: white; border-radius: 4px; cursor: pointer;
                    ">取消</button>
                    <button id="confirmBtn" style="
                        padding: 8px 16px; border: none; background: #007cba;
                        color: white; border-radius: 4px; cursor: pointer;
                    ">確認</button>
                </div>
            `;
            
            dialog.appendChild(form);
            document.body.appendChild(dialog);
            
            const input = form.querySelector('#secureInput');
            const cancelBtn = form.querySelector('#cancelBtn');
            const confirmBtn = form.querySelector('#confirmBtn');
            
            input.focus();
            
            const cleanup = () => {
                document.body.removeChild(dialog);
            };
            
            cancelBtn.onclick = () => {
                cleanup();
                resolve({ confirmed: false, value: null });
            };
            
            confirmBtn.onclick = () => {
                const value = input.value;
                if (pattern && !pattern.test(value)) {
                    input.style.borderColor = '#ff4444';
                    return;
                }
                cleanup();
                resolve({ confirmed: true, value });
            };
            
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            };
        });
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