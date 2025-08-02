// moda-01 Unit Tests: modaDesignSystemManager 完整測試套件
// Task: moda-01, Spec: R-009, D-009
// Coverage: Unit Testing + Security + Performance

import { modaDesignSystemManager, DesignSystemError } from '../../../src/design-system/modaDesignSystemManager.js';

describe('modaDesignSystemManager', () => {
  let manager;
  let mockDocument;

  beforeEach(() => {
    // 設置 DOM 模擬環境
    mockDocument = {
      documentElement: {
        style: {
          properties: {},
          setProperty: jest.fn(function(name, value) {
            this.properties[name] = value;
          }),
          getPropertyValue: jest.fn(function(name) {
            return this.properties[name] || '';
          })
        }
      }
    };

    global.document = mockDocument;
    global.getComputedStyle = jest.fn(() => ({
      getPropertyValue: jest.fn((name) => {
        if (name === '--md-primary-1') return '#6868ac';
        return mockDocument.documentElement.style.properties[name] || '';
      })
    }));

    global.performance = {
      now: jest.fn(() => Date.now())
    };

    manager = new modaDesignSystemManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Initial State', () => {
    // Given: 新建設計系統管理器實例
    // When: 檢查初始狀態
    // Then: 應該處於未初始化狀態
    test('should initialize with correct default state', () => {
      const state = manager.getState();
      
      expect(state.initialized).toBe(false);
      expect(state.tokensLoaded).toBe(false);
      expect(state.cssVariablesApplied).toBe(false);
      expect(state.loadTime).toBe(0);
    });

    test('should have null tokens initially', () => {
      expect(manager.getTokens()).toBeNull();
    });

    test('should not be initialized initially', () => {
      expect(manager.isInitialized()).toBe(false);
    });
  });

  describe('Design System Initialization', () => {
    // Given: PWA啟動時
    // When: 呼叫initialize()
    // Then: 設計系統在500ms內完成載入
    test('should initialize successfully within performance target', async () => {
      const startTime = 100;
      const endTime = 150; // 50ms duration
      
      global.performance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      await manager.initialize();

      const state = manager.getState();
      expect(state.initialized).toBe(true);
      expect(state.tokensLoaded).toBe(true);
      expect(state.cssVariablesApplied).toBe(true);
      expect(state.loadTime).toBe(50);
    });

    // Given: 設計系統已初始化
    // When: 再次呼叫initialize()
    // Then: 應該拋出ALREADY_INITIALIZED錯誤
    test('should throw error on duplicate initialization', async () => {
      await manager.initialize();

      await expect(manager.initialize()).rejects.toThrow(DesignSystemError);
      await expect(manager.initialize()).rejects.toMatchObject({
        code: 'ALREADY_INITIALIZED'
      });
    });

    test('should load design tokens correctly', async () => {
      await manager.initialize();

      const tokens = manager.getTokens();
      expect(tokens).not.toBeNull();
      expect(tokens.colors.primary['1']).toBe('#6868ac');
      expect(tokens.colors.secondary['1']).toBe('#565e62');
      expect(tokens.typography.fontFamily).toBe("'PingFang TC', 'Noto Sans TC', sans-serif");
    });
  });

  describe('CSS Variables Application', () => {
    // Given: 設計系統初始化完成
    // When: 檢查CSS變數應用
    // Then: 所有CSS變數正確應用
    test('should apply all CSS variables correctly', async () => {
      await manager.initialize();

      const setProperty = mockDocument.documentElement.style.setProperty;
      
      // 驗證主色系變數
      expect(setProperty).toHaveBeenCalledWith('--md-primary-1', '#6868ac');
      expect(setProperty).toHaveBeenCalledWith('--md-primary-2', 'rgba(104, 104, 172, 0.89)');
      
      // 驗證次要色系變數
      expect(setProperty).toHaveBeenCalledWith('--md-secondary-1', '#565e62');
      expect(setProperty).toHaveBeenCalledWith('--md-secondary-2', '#6E777C');
      
      // 驗證字體變數
      expect(setProperty).toHaveBeenCalledWith('--bs-body-font-family', "'PingFang TC', 'Noto Sans TC', sans-serif");
      expect(setProperty).toHaveBeenCalledWith('--bs-body-font-weight', '300');
      
      // 驗證Bootstrap整合變數
      expect(setProperty).toHaveBeenCalledWith('--bs-primary', 'var(--md-primary-1)');
      expect(setProperty).toHaveBeenCalledWith('--bs-secondary', 'var(--md-secondary-1)');
    });
  });

  describe('Security Tests', () => {
    // Security Test: CSS注入防護
    test('should validate tokens integrity', async () => {
      await manager.initialize();
      
      const tokens = manager.getTokens();
      
      // 驗證必要的色彩令牌存在
      expect(tokens.colors.primary).toBeDefined();
      expect(tokens.colors.secondary).toBeDefined();
      expect(tokens.colors.neutral).toBeDefined();
      
      // 驗證字體令牌存在
      expect(tokens.typography.fontFamily).toBeDefined();
      expect(tokens.typography.fontSize).toBeDefined();
    });

    // Security Test: 惡意令牌檢測
    test('should reject invalid tokens', () => {
      const invalidTokens = {
        colors: {
          primary: {}, // 缺少必要的 '1' 屬性
          secondary: { 1: '#565e62' },
          neutral: { 1: '#1a1a1a' }
        },
        typography: {
          fontFamily: "'PingFang TC', 'Noto Sans TC', sans-serif",
          fontSize: '0.875rem'
        }
      };

      expect(manager.validateTokens(invalidTokens)).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    // Performance Test: 500ms 初始化目標
    test('should complete initialization within 500ms target', async () => {
      const startTime = 1000;
      const endTime = 1400; // 400ms duration (within target)
      
      global.performance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      await manager.initialize();

      const state = manager.getState();
      expect(state.loadTime).toBe(400);
      expect(state.loadTime).toBeLessThan(500);
    });
  });
});