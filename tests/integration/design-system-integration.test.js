// moda-01 Integration Tests: 設計系統整合測試
// Task: moda-01, Spec: R-009, D-009
// Coverage: DOM Integration + Bootstrap Integration

import { modaDesignSystemManager } from '../../src/design-system/modaDesignSystemManager.js';

describe('Design System Integration Tests', () => {
  let manager;
  let testContainer;

  beforeEach(() => {
    // 創建真實DOM測試環境
    testContainer = document.createElement('div');
    testContainer.id = 'test-container';
    document.body.appendChild(testContainer);

    manager = new modaDesignSystemManager();
  });

  afterEach(() => {
    if (testContainer && testContainer.parentNode) {
      testContainer.parentNode.removeChild(testContainer);
    }
  });

  describe('DOM Integration', () => {
    // Given: 真實DOM環境
    // When: 初始化設計系統
    // Then: CSS變數正確應用到DOM
    test('should apply CSS variables to real DOM', async () => {
      await manager.initialize();

      const computedStyle = getComputedStyle(document.documentElement);
      
      // 驗證主要CSS變數已應用
      expect(computedStyle.getPropertyValue('--md-primary-1').trim()).toBe('#6868ac');
      expect(computedStyle.getPropertyValue('--bs-primary').trim()).toBe('var(--md-primary-1)');
    });

    test('should integrate with existing DOM elements', async () => {
      // 創建測試元素
      const testElement = document.createElement('div');
      testElement.className = 'test-element';
      testElement.style.color = 'var(--md-primary-1)';
      testContainer.appendChild(testElement);

      await manager.initialize();

      const computedStyle = getComputedStyle(testElement);
      // 驗證CSS變數在元素中正確解析
      expect(computedStyle.color).toBeTruthy();
    });
  });

  describe('Bootstrap Integration', () => {
    // Given: Bootstrap元件載入
    // When: 應用moda變數映射
    // Then: 所有Bootstrap元件使用moda色彩系統
    test('should map moda variables to Bootstrap variables', async () => {
      await manager.initialize();

      const rootStyle = getComputedStyle(document.documentElement);
      
      // 驗證Bootstrap變數映射
      expect(rootStyle.getPropertyValue('--bs-primary').trim()).toBe('var(--md-primary-1)');
      expect(rootStyle.getPropertyValue('--bs-secondary').trim()).toBe('var(--md-secondary-1)');
    });

    test('should maintain Bootstrap component compatibility', async () => {
      // 創建模擬Bootstrap按鈕
      const button = document.createElement('button');
      button.className = 'btn btn-primary';
      button.style.backgroundColor = 'var(--bs-primary)';
      testContainer.appendChild(button);

      await manager.initialize();

      const buttonStyle = getComputedStyle(button);
      expect(buttonStyle.backgroundColor).toBeTruthy();
    });
  });

  describe('Typography Integration', () => {
    // Given: 頁面載入完成
    // When: 檢查字體系統
    // Then: 字體大小符合標準
    test('should apply typography system correctly', async () => {
      await manager.initialize();

      const rootStyle = getComputedStyle(document.documentElement);
      
      // 驗證字體變數
      expect(rootStyle.getPropertyValue('--bs-body-font-family').trim())
        .toBe("'PingFang TC', 'Noto Sans TC', sans-serif");
      expect(rootStyle.getPropertyValue('--bs-body-font-weight').trim()).toBe('300');
      expect(rootStyle.getPropertyValue('--bs-body-font-size').trim()).toBe('0.875rem');
    });
  });

  describe('Error Recovery Integration', () => {
    test('should handle DOM manipulation errors gracefully', async () => {
      // 模擬DOM操作限制
      const originalSetProperty = document.documentElement.style.setProperty;
      document.documentElement.style.setProperty = () => {
        throw new Error('DOM access denied');
      };

      await expect(manager.initialize()).rejects.toThrow();

      // 恢復原始方法
      document.documentElement.style.setProperty = originalSetProperty;
    });
  });
});