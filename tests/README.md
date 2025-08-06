# 重複處理對話框雙語支援測試指南

## 📋 測試概覽

本測試套件為重複處理對話框的雙語支援功能提供完整的測試覆蓋，包括單元測試、整合測試和端到端測試。

### 🎯 測試目標

- **功能驗證**: 確保雙語功能正確運作
- **使用者體驗**: 驗證語言切換的流暢性
- **安全性**: 確保輸入驗證和 XSS 防護
- **無障礙性**: 驗證 ARIA 標籤和鍵盤導航
- **效能**: 確保批量處理效率

## 🚀 快速開始

### 安裝依賴

```bash
npm install --save-dev jest jest-dom babel-jest
```

### 執行測試

```bash
# 執行所有測試
npm test

# 執行特定測試檔案
npm test duplicate-dialog-bilingual.test.js

# 執行端到端測試
npm test duplicate-dialog-e2e.test.js

# 生成覆蓋率報告
npm run test:coverage
```

## 📁 測試檔案結構

```
tests/
├── jest.config.js                          # Jest 配置
├── setup.js                               # 測試環境設置
├── ui/
│   ├── duplicate-dialog-bilingual.test.js # 雙語支援單元測試
│   └── duplicate-dialog-e2e.test.js       # 端到端測試
└── coverage/                              # 覆蓋率報告
```

## 🧪 測試類型說明

### 1. 單元測試 (duplicate-dialog-bilingual.test.js)

**測試範圍**:
- 基本雙語功能
- 對話框渲染
- 日期格式化
- 名稱提取
- 用戶互動
- 批量處理
- 錯誤處理
- 無障礙功能
- 安全性驗證

**關鍵測試案例**:
```javascript
// 語言標籤測試
test('應該正確獲取中文標籤', () => {
  mockLanguageManager.getCurrentLanguage.mockReturnValue('zh');
  const labels = duplicateDialog.getUILabels();
  expect(labels.duplicateFound).toBe('發現重複名片');
});

// 安全性測試
test('應該正確轉義 HTML 內容', () => {
  const maliciousText = '<script>alert("xss")</script>';
  const escaped = duplicateDialog.escapeHtml(maliciousText);
  expect(escaped).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
});
```

### 2. 端到端測試 (duplicate-dialog-e2e.test.js)

**測試範圍**:
- 完整匯入流程
- 批量匯入處理
- 語言切換整合
- 錯誤處理和邊界情況
- 效能和可用性

**關鍵測試案例**:
```javascript
// 完整流程測試
test('單一名片匯入 - 有重複，選擇跳過', async () => {
  const importResult = await simulateImportWithDuplicates([duplicateCard], 'skip');
  expect(importResult.success).toBe(true);
  expect(importResult.skipped).toBe(1);
});

// 語言切換測試
test('匯入過程中切換語言', async () => {
  // 驗證中文介面
  let title = document.querySelector('#duplicate-dialog-title');
  expect(title.textContent).toBe('發現重複名片');
  
  // 切換到英文
  mockLanguageManager.setLanguage('en');
  duplicateDialog.renderContent();
  
  // 驗證英文介面
  title = document.querySelector('#duplicate-dialog-title');
  expect(title.textContent).toBe('Duplicate Card Found');
});
```

## 📊 測試覆蓋率要求

### 覆蓋率目標

- **整體覆蓋率**: ≥ 90%
- **重複處理對話框**: ≥ 95%
- **分支覆蓋率**: ≥ 85%
- **函數覆蓋率**: ≥ 90%

### 覆蓋率檢查

```bash
# 生成詳細覆蓋率報告
npm run test:coverage

# 檢查特定檔案覆蓋率
npm run test:coverage -- --collectCoverageFrom="**/duplicate-dialog.js"
```

## 🔧 測試配置

### Jest 配置重點

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  coverageThreshold: {
    './pwa-card-storage/src/ui/components/duplicate-dialog.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
```

### 測試環境設置

```javascript
// setup.js 重點功能
- DOM 環境模擬
- Web APIs 模擬 (IndexedDB, localStorage, fetch)
- 語言管理器模擬
- 測試工具函數
- 全域錯誤處理
```

## 🎭 模擬和工具

### 語言管理器模擬

```javascript
const mockLanguageManager = {
  getCurrentLanguage: jest.fn(() => 'zh'),
  getText: jest.fn((key) => translations[currentLang][key])
};
```

### 測試工具函數

```javascript
// 等待 DOM 更新
await testUtils.waitForDOMUpdate();

// 模擬用戶點擊
testUtils.click(element);

// 模擬鍵盤事件
testUtils.keydown(element, 'Enter');

// 模擬表單輸入
testUtils.type(input, 'test text');
```

## 🐛 常見問題排解

### 1. 測試環境問題

**問題**: `ReferenceError: window is not defined`
**解決**: 確保 `testEnvironment: 'jsdom'` 在 jest.config.js 中設置

### 2. 異步測試問題

**問題**: 測試提前結束，Promise 未解析
**解決**: 使用 `await` 等待異步操作完成

```javascript
// ❌ 錯誤
test('async test', () => {
  duplicateDialog.show(data); // 沒有等待
});

// ✅ 正確
test('async test', async () => {
  const result = await duplicateDialog.show(data);
  expect(result).toBeDefined();
});
```

### 3. DOM 清理問題

**問題**: 測試間 DOM 狀態污染
**解決**: 在 `afterEach` 中清理 DOM

```javascript
afterEach(() => {
  document.body.innerHTML = '';
  if (duplicateDialog) {
    duplicateDialog.destroy();
  }
});
```

### 4. 模擬問題

**問題**: 模擬函數未正確重置
**解決**: 使用 `jest.clearAllMocks()` 或 `mockFn.mockReset()`

## 📈 效能測試

### 效能基準

- **對話框開啟時間**: < 200ms
- **批量處理效率**: ≥ 50 cards/second
- **記憶體使用**: 峰值 < 50MB
- **大量資料處理**: 1000 張名片 < 5 秒

### 效能測試範例

```javascript
test('對話框開啟速度測試', async () => {
  const startTime = performance.now();
  
  const showPromise = duplicateDialog.show(duplicateInfo, cardData);
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const endTime = performance.now();
  const openTime = endTime - startTime;
  
  expect(openTime).toBeLessThan(200);
});
```

## 🔒 安全性測試

### 安全測試重點

- **XSS 防護**: HTML 內容轉義
- **輸入驗證**: 惡意輸入處理
- **資料清理**: 敏感資訊過濾
- **錯誤處理**: 安全錯誤訊息

### 安全測試範例

```javascript
test('應該安全處理惡意名稱資料', async () => {
  const maliciousCardData = {
    name: '<img src="x" onerror="alert(1)">'
  };
  
  const showPromise = duplicateDialog.show(mockDuplicateInfo, maliciousCardData);
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const nameElement = document.querySelector('.card-preview.new .name');
  expect(nameElement.innerHTML).not.toContain('<img');
  expect(nameElement.innerHTML).toContain('&lt;img');
});
```

## 🎯 最佳實踐

### 1. 測試組織

- **描述性測試名稱**: 清楚說明測試目的
- **邏輯分組**: 使用 `describe` 組織相關測試
- **單一職責**: 每個測試只驗證一個功能點

### 2. 斷言策略

- **具體斷言**: 使用具體的期望值而非通用檢查
- **錯誤訊息**: 提供有意義的錯誤訊息
- **邊界測試**: 測試邊界條件和異常情況

### 3. 維護性

- **DRY 原則**: 提取共用的設置和工具函數
- **清晰註釋**: 複雜測試邏輯加上註釋
- **定期更新**: 隨功能變更更新測試

## 📚 參考資源

- [Jest 官方文檔](https://jestjs.io/docs/getting-started)
- [Testing Library 最佳實踐](https://testing-library.com/docs/guiding-principles)
- [WCAG 2.1 無障礙測試指南](https://www.w3.org/WAI/WCAG21/quickref/)
- [專案 README](../README.md)

---

**測試是品質保證的基石，完整的測試套件確保雙語支援功能的穩定性和可靠性。** 🚀