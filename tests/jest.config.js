// Jest 測試配置 - moda設計系統測試套件
// 支援 ES6 modules, DOM 測試環境, 覆蓋率報告

module.exports = {
  // 測試環境
  testEnvironment: 'jsdom',
  
  // 測試檔案模式
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // 模組路徑映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // 支援 ES6 modules
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // 覆蓋率設定
  collectCoverage: true,
  collectCoverageFrom: [
    'src/design-system/**/*.js',
    '!src/design-system/**/*.test.js',
    '!src/design-system/**/*.spec.js'
  ],
  
  // 覆蓋率報告格式
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'json-summary'
  ],
  
  // 覆蓋率門檻
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/design-system/modaDesignSystemManager.js': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // 測試設置檔案
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // 測試超時設定
  testTimeout: 10000,
  
  // 詳細輸出
  verbose: true,
  
  // 錯誤報告
  errorOnDeprecated: true
};