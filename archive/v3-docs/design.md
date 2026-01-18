# 技術設計文檔

## 🐛 近期錯誤修復 (2025-08-09)

### BUG-001: ComponentHealthMonitor track 方法缺失
**問題**: PWA 初始化時發生 `TypeError: this.healthMonitor.track is not a function`

**根本原因**: ComponentHealthMonitor 類別缺少 track 方法，但 app.js 嘗試呼叫此方法

**解決方案**: 
```javascript
// 在 ComponentHealthMonitor 類別中新增 track 方法
track(name, component) {
  return this.registerComponent(name, component);
}
```

**影響**: 修復 PWA 初始化失敗問題，確保健康監控功能正常運作

### BUG-002: ES6 import 語法錯誤
**問題**: `SyntaxError: Cannot use import statement outside a module` 在 error-handler.js 和 transfer-manager.js

**根本原因**: 檔案使用 ES6 import 語句但未在模組上下文中載入

**解決方案**:
```javascript
// 轉換 ES6 import 為 window 全域存取
// 原本: import { SecureLogger } from '../security/secure-logger.js';
// 修復後:
let secureLogger;
if (window.SecureLogger) {
  secureLogger = new window.SecureLogger({ logLevel: 'INFO', enableMasking: true });
} else {
  // 提供備用記錄器
  secureLogger = {
    info: (msg, data) => console.log(`[INFO] ${msg}`, data),
    error: (msg, data) => console.error(`[ERROR] ${msg}`, data)
  };
}
```

**影響**: 解決模組載入問題，確保錯誤處理和傳輸管理功能正常運作

## 🏗️ 架構改進 (QUA-001)

### 常數管理系統
建立結構化的常數管理，提升程式碼可讀性：

```javascript
// 結構化常數定義
this.CONSTANTS = {
  TIME: {
    SECONDS_PER_MINUTE: 60,
    MILLISECONDS_PER_SECOND: 1000,
    ONE_MINUTE: null, // 計算值
    CONNECTION_CHECK_INTERVAL: null
  },
  MATH: {
    BASE36_RADIX: 36,
    PERCENTAGE_MULTIPLIER: 100,
    BYTES_PER_KB: 1024,
    FINGERPRINT_SUBSTRING_LENGTH: 16
  },
  STORAGE: {
    HASH_LENGTH: 64,
    RANDOM_STRING_LENGTH: 8
  }
};
```

### 方法分解策略
遵循單一職責原則，提升可維護性：

- **複雜度控制**: 方法複雜度 ≤ 15
- **行數限制**: 方法行數 ≤ 100
- **職責分離**: 一個方法一個職責

### 命名規範
使用描述性的常數名稱，避免魔術數字：

- ✅ `this.CONSTANTS.TIME.ONE_MINUTE`
- ❌ `60 * 1000`
- ✅ `this.CONSTANTS.MATH.PERCENTAGE_MULTIPLIER`
- ❌ `100`