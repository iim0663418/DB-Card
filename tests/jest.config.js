/**
 * Jest Configuration for Lightweight Security Architecture Tests
 * Requirement: R-2.4 安全架構輕量化
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'pwa-card-storage/src/security/**/*.js',
    '!pwa-card-storage/src/security/**/*.test.js',
    '!pwa-card-storage/src/security/**/*.spec.js'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './pwa-card-storage/src/security/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Module paths
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/pwa-card-storage/src/$1',
    '^@security/(.*)$': '<rootDir>/pwa-card-storage/src/security/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Global setup
  globalSetup: '<rootDir>/tests/globalSetup.js',
  
  // Global teardown
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  
  // Test results processor
  testResultsProcessor: '<rootDir>/tests/testResultsProcessor.js'
};