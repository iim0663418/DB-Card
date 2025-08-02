# 安全API規格說明書

## 概述
本文件定義統一安全架構中各安全模組的API規格，用於替代現有不安全的瀏覽器API並提供統一的安全控制機制。

## SecurityInputHandler API

### validateAndSanitize(input, type, options)
驗證並清理用戶輸入

**參數:**
- `input` (string): 待驗證的輸入內容
- `type` (string): 輸入類型 ('text', 'email', 'url', 'alphanumeric')
- `options` (object): 驗證選項
  - `maxLength` (number): 最大長度限制
  - `allowEmpty` (boolean): 是否允許空值
  - `customPattern` (RegExp): 自定義驗證模式

**返回值:**
- `{isValid: boolean, sanitized: string, errors: string[]}`

**範例:**
```javascript
const result = SecurityInputHandler.validateAndSanitize(
    userInput, 
    'alphanumeric', 
    { maxLength: 50, allowEmpty: false }
);
if (result.isValid) {
    // 使用 result.sanitized
}
```

### securePrompt(message, options)
安全的用戶輸入對話框

**參數:**
- `message` (string): 提示訊息
- `options` (object): 對話框選項
  - `title` (string): 對話框標題
  - `inputType` (string): 輸入類型
  - `validation` (object): 驗證規則
  - `placeholder` (string): 佔位符文字

**返回值:**
- `Promise<{confirmed: boolean, value: string}>`

**範例:**
```javascript
const result = await SecurityInputHandler.securePrompt(
    '請輸入您的名稱', 
    {
        title: '用戶資訊',
        inputType: 'text',
        validation: { maxLength: 50 },
        placeholder: '請輸入姓名'
    }
);
```

### secureConfirm(message, options)
安全的確認對話框

**參數:**
- `message` (string): 確認訊息
- `options` (object): 對話框選項
  - `title` (string): 對話框標題
  - `confirmText` (string): 確認按鈕文字
  - `cancelText` (string): 取消按鈕文字
  - `danger` (boolean): 是否為危險操作

**返回值:**
- `Promise<boolean>`

**範例:**
```javascript
const confirmed = await SecurityInputHandler.secureConfirm(
    '您確定要刪除此項目嗎？',
    {
        title: '確認刪除',
        confirmText: '刪除',
        cancelText: '取消',
        danger: true
    }
);
```

## SecurityAuthHandler API

### validateAccess(resource, operation, context)
驗證資源存取權限

**參數:**
- `resource` (string): 資源識別符
- `operation` (string): 操作類型 ('read', 'write', 'delete')
- `context` (object): 存取上下文
  - `userId` (string): 用戶ID
  - `sessionId` (string): 會話ID
  - `timestamp` (number): 時間戳

**返回值:**
- `{authorized: boolean, reason: string}`

**範例:**
```javascript
const access = SecurityAuthHandler.validateAccess(
    'card-data',
    'write',
    { userId: 'user123', sessionId: 'sess456' }
);
if (!access.authorized) {
    throw new Error(`存取被拒絕: ${access.reason}`);
}
```

### securePasswordInput(options)
安全的密碼輸入機制

**參數:**
- `options` (object): 密碼輸入選項
  - `title` (string): 對話框標題
  - `minLength` (number): 最小長度
  - `requireSpecialChars` (boolean): 是否需要特殊字符
  - `showStrength` (boolean): 是否顯示強度指示

**返回值:**
- `Promise<{success: boolean, hashedPassword: string}>`

**範例:**
```javascript
const result = await SecurityAuthHandler.securePasswordInput({
    title: '設定密碼',
    minLength: 8,
    requireSpecialChars: true,
    showStrength: true
});
```

### auditLog(action, details, severity)
安全審計日誌記錄

**參數:**
- `action` (string): 操作類型
- `details` (object): 操作詳情
- `severity` (string): 嚴重程度 ('info', 'warning', 'error', 'critical')

**返回值:**
- `void`

**範例:**
```javascript
SecurityAuthHandler.auditLog(
    'user_login_attempt',
    {
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        success: true
    },
    'info'
);
```

## SecurityDataHandler API

### sanitizeOutput(data, context)
清理輸出資料防止XSS

**參數:**
- `data` (any): 待清理的資料
- `context` (string): 輸出上下文 ('html', 'attribute', 'javascript', 'css')

**返回值:**
- `string`: 清理後的安全資料

**範例:**
```javascript
const safeHtml = SecurityDataHandler.sanitizeOutput(
    userGeneratedContent,
    'html'
);
element.innerHTML = safeHtml;
```

### validateDataIntegrity(data, expectedHash)
驗證資料完整性

**參數:**
- `data` (any): 待驗證的資料
- `expectedHash` (string): 預期的雜湊值

**返回值:**
- `{valid: boolean, actualHash: string}`

**範例:**
```javascript
const integrity = SecurityDataHandler.validateDataIntegrity(
    cardData,
    storedHash
);
if (!integrity.valid) {
    throw new Error('資料完整性檢查失敗');
}
```

### secureStorage(key, value, options)
安全儲存機制

**參數:**
- `key` (string): 儲存鍵值
- `value` (any): 待儲存的資料
- `options` (object): 儲存選項
  - `encrypt` (boolean): 是否加密
  - `expiry` (number): 過期時間（毫秒）
  - `integrity` (boolean): 是否進行完整性檢查

**返回值:**
- `Promise<{success: boolean, error?: string}>`

**範例:**
```javascript
const result = await SecurityDataHandler.secureStorage(
    'user-preferences',
    userData,
    {
        encrypt: true,
        expiry: 24 * 60 * 60 * 1000, // 24小時
        integrity: true
    }
);
```

### secureRetrieve(key, options)
安全資料檢索

**參數:**
- `key` (string): 儲存鍵值
- `options` (object): 檢索選項
  - `decrypt` (boolean): 是否解密
  - `verifyIntegrity` (boolean): 是否驗證完整性

**返回值:**
- `Promise<{success: boolean, data?: any, error?: string}>`

**範例:**
```javascript
const result = await SecurityDataHandler.secureRetrieve(
    'user-preferences',
    {
        decrypt: true,
        verifyIntegrity: true
    }
);
if (result.success) {
    // 使用 result.data
}
```

## SecurityUI API

### showInputDialog(config)
顯示安全輸入對話框

**參數:**
- `config` (object): 對話框配置
  - `title` (string): 標題
  - `message` (string): 訊息
  - `inputType` (string): 輸入類型
  - `validation` (object): 驗證規則
  - `buttons` (array): 按鈕配置

**返回值:**
- `Promise<{action: string, value: string}>`

### showConfirmDialog(config)
顯示確認對話框

**參數:**
- `config` (object): 對話框配置
  - `title` (string): 標題
  - `message` (string): 訊息
  - `type` (string): 類型 ('info', 'warning', 'error', 'success')
  - `buttons` (array): 按鈕配置

**返回值:**
- `Promise<string>`: 用戶選擇的按鈕動作

### showNotification(config)
顯示安全通知

**參數:**
- `config` (object): 通知配置
  - `title` (string): 標題
  - `message` (string): 訊息
  - `type` (string): 類型
  - `duration` (number): 顯示時間
  - `actions` (array): 可用動作

**返回值:**
- `Promise<string>`: 用戶選擇的動作

## 錯誤處理規範

### SecurityError 類別
```javascript
class SecurityError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'SecurityError';
        this.code = code;
        this.details = details;
        this.timestamp = Date.now();
    }
}
```

### 錯誤代碼定義
- `SEC_001`: 輸入驗證失敗
- `SEC_002`: 授權檢查失敗
- `SEC_003`: 資料完整性檢查失敗
- `SEC_004`: 加密/解密失敗
- `SEC_005`: 會話驗證失敗
- `SEC_006`: 安全策略違反

## 配置選項

### 全域安全配置
```javascript
const SecurityConfig = {
    // 輸入驗證配置
    input: {
        maxLength: 1000,
        allowedTags: [],
        sanitizeLevel: 'strict'
    },
    
    // 認證配置
    auth: {
        sessionTimeout: 30 * 60 * 1000, // 30分鐘
        maxLoginAttempts: 3,
        lockoutDuration: 15 * 60 * 1000 // 15分鐘
    },
    
    // 儲存配置
    storage: {
        encryptionAlgorithm: 'AES-256-GCM',
        keyDerivationIterations: 100000,
        integrityAlgorithm: 'SHA-256'
    },
    
    // 日誌配置
    logging: {
        level: 'info',
        maxLogSize: 10 * 1024 * 1024, // 10MB
        retentionDays: 30
    }
};
```

## 實作指南

### 1. 模組初始化
```javascript
// 在應用程式啟動時初始化安全模組
await SecurityManager.initialize(SecurityConfig);
```

### 2. 錯誤處理
```javascript
try {
    const result = await SecurityInputHandler.securePrompt(message, options);
} catch (error) {
    if (error instanceof SecurityError) {
        // 處理安全相關錯誤
        SecurityAuthHandler.auditLog('security_error', {
            code: error.code,
            message: error.message,
            details: error.details
        }, 'error');
    }
}
```

### 3. 最佳實踐
- 始終驗證和清理用戶輸入
- 使用最小權限原則
- 記錄所有安全相關操作
- 定期更新安全配置
- 進行定期安全測試

---

**文件版本**: v1.0  
**最後更新**: 2024-12-20  
**維護者**: technical-architect