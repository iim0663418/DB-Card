# Language Management API Reference

**版本**: v3.1.4-unified-integration  
**最後更新**: 2025-01-28  
**相容性**: ES6+, Modern Browsers  

## 目錄

- [概述](#概述)
- [快速開始](#快速開始)
- [核心 API](#核心-api)
  - [LanguageManager](#languagemanager)
  - [EnhancedLanguageManager](#enhancedlanguagemanager)
  - [TranslationValidator](#translationvalidator)
  - [PerformanceMetricsCollector](#performancemetricscollector)
  - [SmartCacheManager](#smartcachemanager)
  - [LanguageDebugPanel](#languagedebugpanel)
- [TypeScript 支援](#typescript-支援)
- [事件系統](#事件系統)
- [錯誤處理](#錯誤處理)
- [最佳實踐](#最佳實踐)

## 概述

統一語言管理系統提供完整的多語言支援解決方案，包括翻譯載入、快取管理、效能監控和開發調試功能。系統採用分層架構設計，支援漸進式增強和向下相容。

### 核心特性

- 🌐 **多語言支援** - 支援繁體中文、英文，可擴展
- 🚀 **效能優化** - 智能快取、增量更新、記憶體管理
- 🔒 **安全防護** - XSS 防護、輸入驗證、安全錯誤處理
- 🎯 **TypeScript** - 完整類型定義和編輯器支援
- 🐛 **開發工具** - 內建調試面板和效能監控
- ♿ **無障礙** - WCAG 2.1 AA 合規，螢幕閱讀器支援

## 快速開始

### 基本使用

```javascript
// 1. 確認語言管理器已載入
if (window.languageManager) {
    // 2. 獲取翻譯文字
    const title = window.languageManager.getText('app.title', '預設標題');
    
    // 3. 切換語言
    await window.languageManager.switchLanguage('en-US');
    
    // 4. 監聽語言變更事件
    document.addEventListener('languageChanged', (event) => {
        console.log(`語言已切換至: ${event.detail.language}`);
    });
}
```

### 進階功能

```javascript
// 使用增強型語言管理器
if (window.EnhancedLanguageManager) {
    await window.EnhancedLanguageManager.initialize();
    
    // 獲取快取狀態
    const cacheStatus = window.EnhancedLanguageManager.getCacheStatus();
    console.log('快取狀態:', cacheStatus);
}

// 啟用調試面板 (開發環境)
// 在 URL 加上 ?debug=1 參數即可啟用
```

## 核心 API

### LanguageManager

基礎語言管理器，提供核心翻譯功能。

#### 建構函式

```typescript
new LanguageManager(): LanguageManager
```

#### 屬性

| 屬性 | 類型 | 說明 |
|------|------|------|
| `supportedLanguages` | `string[]` | 支援的語言清單 |
| `currentLanguage` | `string` | 目前使用的語言 |
| `isLoading` | `boolean` | 是否正在載入翻譯 |
| `loadedLanguages` | `Set<string>` | 已載入的語言集合 |

#### 方法

##### `getText(key: string, fallback?: string): string`

獲取翻譯文字，支援巢狀鍵值。

**參數**:
- `key`: 翻譯鍵值 (支援點記法，如 `"app.title"`)
- `fallback`: 備用文字 (預設為 `key`)

**回傳**: 翻譯文字或備用文字

**範例**:
```javascript
// 基本用法
const title = languageManager.getText('app.title');

// 使用備用文字
const title = languageManager.getText('app.title', '我的應用程式');

// 巢狀鍵值
const buttonText = languageManager.getText('card.actions.edit', '編輯');
```

##### `switchLanguage(language: string): Promise<boolean>`

切換到指定語言。

**參數**:
- `language`: 目標語言代碼 (`"zh-TW"` 或 `"en-US"`)

**回傳**: Promise<boolean> - 成功時為 `true`

**範例**:
```javascript
// 切換至英文
const success = await languageManager.switchLanguage('en-US');
if (success) {
    console.log('語言切換成功');
} else {
    console.error('語言切換失敗');
}
```

##### `getCurrentLanguage(): string`

獲取目前語言。

**回傳**: 目前語言代碼

##### `getSupportedLanguages(): string[]`

獲取支援的語言清單。

**回傳**: 語言代碼陣列

##### `isLanguageSupported(language: string): boolean`

檢查是否支援指定語言。

**參數**:
- `language`: 語言代碼

**回傳**: `true` 如果支援該語言

##### `addChangeListener(listener: (newLang: string, prevLang: string) => void): void`

新增語言變更監聽器。

**參數**:
- `listener`: 回調函式

**範例**:
```javascript
languageManager.addChangeListener((newLang, prevLang) => {
    console.log(`語言從 ${prevLang} 切換至 ${newLang}`);
    updateUI();
});
```

##### `applyTranslations(): void`

套用翻譯到 DOM 元素。自動查找帶有 `data-translate` 屬性的元素。

**範例**:
```html
<!-- HTML -->
<h1 data-translate="app.title">載入中...</h1>
<button data-translate="actions.save">儲存</button>

<script>
// JavaScript
languageManager.applyTranslations(); // 自動套用翻譯
</script>
```

#### 高級方法

##### `loadTranslation(language: string): Promise<object>`

載入特定語言的翻譯資料。

**參數**:
- `language`: 語言代碼

**回傳**: Promise<object> - 翻譯資料物件

##### `validateTranslations(options?: ValidationOptions): ValidationResult`

驗證翻譯完整性。

**參數**:
- `options`: 驗證選項

**回傳**: 驗證結果物件

**範例**:
```javascript
const result = languageManager.validateTranslations({
    strictMode: true,
    checkXSS: true
});

console.log('缺失的鍵值:', result.missingKeys);
console.log('安全問題:', result.securityIssues);
```

### EnhancedLanguageManager

增強型語言管理器，提供進階快取、效能監控和重試機制。

#### 方法

##### `initialize(): Promise<void>`

初始化增強語言管理器。

**範例**:
```javascript
await window.EnhancedLanguageManager.initialize();
```

##### `getCacheStatus(): CacheStatus`

獲取快取狀態資訊。

**回傳**:
```typescript
interface CacheStatus {
    cacheSize: number;
    cachedLanguages: string[];
    loadingCount: number;
}
```

##### `clearCache(): void`

清除翻譯快取。

##### `getLoadingStats(): LoadingStats`

獲取載入統計資訊。

**回傳**:
```typescript
interface LoadingStats {
    cacheHitRate: number;
    cacheSize: number;
    isInitialized: boolean;
    loadingPromises: number;
}
```

### TranslationValidator

翻譯驗證器，確保翻譯完整性和安全性。

#### 方法

##### `validateTranslationCompleteness(translations: object, baseLanguage: string): ValidationResult`

驗證翻譯完整性。

**參數**:
- `translations`: 翻譯資料
- `baseLanguage`: 基準語言

##### `checkTranslationSecurity(value: string): SecurityCheckResult`

檢查翻譯安全性。

**參數**:
- `value`: 翻譯文字

**回傳**: 安全檢查結果

### PerformanceMetricsCollector

效能指標收集器。

#### 方法

##### `getLatestMetrics(): PerformanceMetrics`

獲取最新效能指標。

**回傳**:
```typescript
interface PerformanceMetrics {
    languageSwitchTime: number;
    memoryUsage: number;
    cacheHitRate: number;
    domUpdateTime: number;
}
```

##### `startMeasurement(name: string): void`

開始效能測量。

##### `endMeasurement(name: string): number`

結束效能測量並回傳時間。

### SmartCacheManager

智能快取管理器，提供 LRU + TTL 快取策略。

#### 方法

##### `get(key: string): any`

獲取快取項目。

##### `set(key: string, value: any, ttl?: number): void`

設定快取項目。

**參數**:
- `key`: 快取鍵值
- `value`: 快取值
- `ttl`: 存活時間 (毫秒)

##### `getStats(): CacheStats`

獲取快取統計。

**回傳**:
```typescript
interface CacheStats {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
}
```

### LanguageDebugPanel

調試面板，提供視覺化調試介面。

#### 方法

##### `show(): void`

顯示調試面板。

##### `hide(): void`

隱藏調試面板。

##### `exportDebugReport(): void`

匯出調試報告。

## TypeScript 支援

系統提供完整的 TypeScript 型別定義。

### 基本類型

```typescript
type LanguageCode = 'zh-TW' | 'en-US';

interface TranslationData {
    [key: string]: string | TranslationData;
}

interface LanguageChangeEvent {
    detail: {
        language: LanguageCode;
        previousLanguage: LanguageCode;
        timestamp: number;
    };
}
```

### 使用範例

```typescript
import type { LanguageManager } from './language-manager';

// 型別安全的語言管理
const manager: LanguageManager = window.languageManager;
const text: string = manager.getText('app.title');
const success: boolean = await manager.switchLanguage('en-US');
```

## 事件系統

系統使用自訂事件進行通訊。

### languageChanged

語言變更時觸發。

```javascript
document.addEventListener('languageChanged', (event) => {
    const { language, previousLanguage, timestamp } = event.detail;
    
    // 更新 UI
    updateLanguageUI(language);
    
    // 更新文件語言屬性
    document.documentElement.lang = language;
});
```

### enhancedLanguageChanged

增強語言管理器的語言變更事件。

```javascript
document.addEventListener('enhancedLanguageChanged', (event) => {
    const { language, cacheStatus } = event.detail;
    
    console.log('增強事件:', { language, cacheStatus });
});
```

## 錯誤處理

### 錯誤類型

| 錯誤類型 | 說明 | 處理建議 |
|----------|------|----------|
| `LoadingError` | 翻譯載入失敗 | 檢查網路連線和檔案路徑 |
| `ValidationError` | 翻譯驗證失敗 | 檢查翻譯格式和內容 |
| `SecurityError` | 安全檢查失敗 | 檢查翻譯內容是否包含危險代碼 |

### 錯誤處理範例

```javascript
try {
    await languageManager.switchLanguage('en-US');
} catch (error) {
    if (error instanceof LoadingError) {
        console.error('載入失敗:', error.message);
        // 顯示錯誤訊息給使用者
        showErrorMessage('語言切換失敗，請稍後再試');
    }
}
```

## 最佳實踐

### 1. 翻譯鍵值組織

```javascript
// ✅ 建議：使用巢狀結構
const translations = {
    app: {
        title: 'DB 卡片儲存器',
        description: '安全的本地卡片資料儲存'
    },
    actions: {
        save: '儲存',
        cancel: '取消',
        delete: '刪除'
    }
};

// ❌ 避免：扁平結構
const translations = {
    'app_title': 'DB 卡片儲存器',
    'app_description': '安全的本地卡片資料儲存',
    'action_save': '儲存'
};
```

### 2. 安全使用

```javascript
// ✅ 建議：使用 textContent
element.textContent = languageManager.getText('user.name');

// ❌ 避免：使用 innerHTML (有 XSS 風險)
element.innerHTML = languageManager.getText('user.input');
```

### 3. 效能優化

```javascript
// ✅ 建議：批量套用翻譯
languageManager.applyTranslations();

// ❌ 避免：逐一手動設定
document.querySelectorAll('[data-translate]').forEach(element => {
    const key = element.getAttribute('data-translate');
    element.textContent = languageManager.getText(key);
});
```

### 4. 錯誤處理

```javascript
// ✅ 建議：提供有意義的備用文字
const title = languageManager.getText('app.title', '應用程式');

// ✅ 建議：監聽載入錯誤
languageManager.addChangeListener((newLang, prevLang) => {
    if (newLang === prevLang) {
        console.warn('語言切換可能失敗');
    }
});
```

### 5. 開發調試

```javascript
// 開發環境啟用調試面板
if (process.env.NODE_ENV === 'development') {
    // 在 URL 加上 ?debug=1
    // 或強制啟用: ?force-debug=1
}

// 效能監控
if (window.performanceMetricsCollector) {
    const metrics = window.performanceMetricsCollector.getLatestMetrics();
    console.log('語言切換時間:', metrics.languageSwitchTime);
}
```

### 6. 無障礙支援

```html
<!-- ✅ 建議：正確的語言聲明 -->
<html lang="zh-TW">
<div lang="en-US">English content</div>

<!-- ✅ 建議：ARIA 標籤翻譯 -->
<button data-translate-aria="actions.save" aria-label="儲存">💾</button>
```

### 7. 載入順序

```html
<!-- 正確的載入順序 -->
<script src="src/core/language-manager.js"></script>
<script src="src/core/enhanced-language-manager.js"></script>
<script src="src/debug/language-debug-panel.js"></script>
<script src="src/app.js"></script>
```

## 疑難排解

### 常見問題

**Q: 翻譯沒有載入？**  
A: 檢查翻譯檔案路徑和網路連線。確認檔案格式正確。

**Q: 語言切換後部分文字沒有更新？**  
A: 確認 HTML 元素有正確的 `data-translate` 屬性，或手動調用 `applyTranslations()`。

**Q: 調試面板沒有出現？**  
A: 確認是在開發環境且 URL 包含 `?debug=1` 參數。

**Q: 效能較差？**  
A: 啟用智能快取，檢查是否有記憶體洩漏，使用增量更新。

### 診斷工具

1. **瀏覽器控制台**: 查看錯誤訊息和警告
2. **調試面板**: 使用 `?debug=1` 啟用
3. **效能面板**: 使用 `?perf=1` 查看效能指標
4. **網路面板**: 檢查翻譯檔案載入狀況

---

**技術支援**: 如有問題請參考 [GitHub Issues](https://github.com/your-repo/issues) 或查看 [疑難排解指南](../guides/troubleshooting.md)。