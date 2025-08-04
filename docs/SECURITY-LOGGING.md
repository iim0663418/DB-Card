# 安全日誌記錄規範

## 概述

本文件定義了 DB-Card 專案中安全日誌記錄的標準和最佳實踐，確保符合 GDPR、PCI DSS 等合規要求，防止個人識別資訊 (PII) 洩露。

## 核心原則

### 1. 隱私優先 (Privacy by Design)
- **最小必要原則**: 僅記錄除錯和監控所需的最少資訊
- **資料遮罩**: 所有 PII 資料必須自動遮罩或匿名化
- **環境區分**: 生產環境禁用詳細除錯日誌

### 2. 安全預設 (Secure by Default)
- **預設遮罩**: 所有日誌輸出預設啟用敏感資料遮罩
- **白名單機制**: 僅允許明確標記為安全的欄位輸出
- **自動檢測**: 自動識別並遮罩電子郵件、電話號碼等敏感格式

## 實作規範

### 安全日誌記錄方法

```javascript
/**
 * 安全日誌記錄 - 防止 PII 洩露
 * @param {string} level - 日誌等級 (debug, info, warn, error)
 * @param {string} message - 日誌訊息
 * @param {Object} data - 要記錄的資料物件
 */
secureLog(level, message, data = {}) {
  // 生產環境檢查
  if (typeof window !== 'undefined' && window.location && 
      (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') &&
      level === 'debug') {
    return; // 生產環境不輸出 debug 日誌
  }

  if (window.SecurityDataHandler) {
    window.SecurityDataHandler.secureLog(level, message, data);
  } else {
    const sensitiveFields = ['name', 'nameZh', 'nameEn', 'email', 'phone', 'mobile', 'avatar', 'socialNote', 'originalData', 'processedData'];
    const sanitizedData = this.sanitizeLogData(data, sensitiveFields);
    console.log(`[${level.toUpperCase()}] ${message}`, sanitizedData);
  }
}
```

### 敏感欄位定義

#### 完全遮罩欄位
以下欄位將完全以 `[REDACTED]` 顯示：
- `name`, `nameZh`, `nameEn` - 姓名資訊
- `email` - 電子郵件地址
- `phone`, `mobile` - 電話號碼
- `avatar` - 頭像 URL
- `socialNote` - 社群媒體資訊
- `originalData`, `processedData` - 原始/處理後資料物件

#### 自動檢測遮罩
系統自動檢測並遮罩以下格式：
- 電子郵件格式: `[EMAIL_REDACTED]`
- 電話號碼格式: `[PHONE_REDACTED]`
- 長字串 (>50字元): 截斷並標記 `[TRUNCATED]`

### 環境控制

#### 開發環境 (localhost, 127.0.0.1)
- 允許所有等級日誌輸出
- 啟用詳細除錯資訊
- 敏感資料仍需遮罩

#### 生產環境
- 禁用 `debug` 等級日誌
- 僅輸出 `info`, `warn`, `error` 等級
- 強制啟用所有安全遮罩機制

## 合規對應

### GDPR (一般資料保護規則)
- **第 32 條**: 資料處理安全性 - 透過日誌遮罩確保個人資料保護
- **第 5 條**: 資料處理原則 - 最小必要原則應用於日誌記錄

### PCI DSS (支付卡產業資料安全標準)
- **要求 3.4**: 保護儲存的帳戶資料 - 防止敏感資料意外記錄
- **要求 10**: 記錄和監控 - 確保稽核日誌不包含敏感資料

## 使用範例

### ✅ 正確使用
```javascript
// 使用安全日誌記錄
this.secureLog('info', '名片匯入成功', {
  cardId: 'card_123',
  type: 'bilingual',
  hasName: !!cardData.name  // 僅記錄布林值
});

// 輸出: [INFO] 名片匯入成功 { cardId: 'card_123', type: 'bilingual', hasName: true }
```

### ❌ 錯誤使用
```javascript
// 直接輸出敏感資料 - 禁止
console.log('名片資料:', {
  name: '張三',           // PII 洩露
  email: 'test@test.com'  // PII 洩露
});
```

## 監控和稽核

### 日誌審查檢查點
1. **開發階段**: 程式碼審查時檢查所有 `console.log` 調用
2. **測試階段**: 自動化測試驗證日誌輸出不包含 PII
3. **部署前**: 安全掃描檢查日誌記錄合規性
4. **運行時**: 定期審查生產環境日誌內容

### 違規處理
發現 PII 洩露時的處理流程：
1. **立即修復**: 停用相關日誌輸出
2. **影響評估**: 評估資料洩露範圍和影響
3. **通報程序**: 依法規要求進行必要通報
4. **預防措施**: 加強程式碼審查和自動化檢測

## 技術實作細節

### 遞歸資料清理
```javascript
sanitizeLogData(data, sensitiveFields) {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => this.sanitizeLogData(item, sensitiveFields));
  }

  const sanitized = {};
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    if (sensitiveFields.includes(key)) {
      sanitized[key] = value ? '[REDACTED]' : null;
    } else if (typeof value === 'string') {
      // 自動檢測敏感格式
      if (value.includes('@') && value.includes('.')) {
        sanitized[key] = '[EMAIL_REDACTED]';
      } else if (/\d{2,4}-\d{4,8}/.test(value) || /09\d{8}/.test(value)) {
        sanitized[key] = '[PHONE_REDACTED]';
      } else if (value.length > 50) {
        sanitized[key] = value.substring(0, 50) + '...[TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = this.sanitizeLogData(value, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}
```

## 更新歷史

| 版本 | 日期 | 變更內容 | 負責人 |
|------|------|----------|--------|
| 1.0 | 2025-01-XX | 初版建立，定義基本安全日誌規範 | Security Team |

---

**注意**: 本規範為強制性要求，所有開發人員必須遵循。違反此規範可能導致合規風險和資料保護法律責任。