module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000, // 10 秒超時
  verbose: false,
  collectCoverage: false,
  maxWorkers: 1 // 單線程執行避免資源競爭
};