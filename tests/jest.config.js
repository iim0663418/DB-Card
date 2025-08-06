/**
 * Jest 測試配置
 * 針對重複處理對話框雙語支援測試
 */

module.exports = {
  // 測試環境
  testEnvironment: 'jsdom',
  
  // 測試檔案匹配模式
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // 設置檔案
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // 覆蓋率報告
  collectCoverage: true,
  collectCoverageFrom: [
    'pwa-card-storage/src/**/*.js',
    '!pwa-card-storage/src/**/*.test.js',
    '!pwa-card-storage/src/**/*.spec.js'
  ],
  coverageDirectory: 'tests/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 覆蓋率閾值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './pwa-card-storage/src/ui/components/duplicate-dialog.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // 模組對應
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/pwa-card-storage/src/$1',
    '^@ui/(.*)$': '<rootDir>/pwa-card-storage/src/ui/$1',
    '^@core/(.*)$': '<rootDir>/pwa-card-storage/src/core/$1'
  },
  
  // 測試超時
  testTimeout: 10000,
  
  // 詳細輸出
  verbose: true,
  
  // 清除模擬
  clearMocks: true,
  restoreMocks: true,
  
  // 全域變數
  globals: {
    'window': {},
    'document': {},
    'navigator': {
      language: 'zh-TW',
      languages: ['zh-TW', 'en-US']
    }
  },
  
  // 轉換設定
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // 忽略轉換的模組
  transformIgnorePatterns: [
    'node_modules/(?!(qrcode|other-es6-module)/)'
  ]
};