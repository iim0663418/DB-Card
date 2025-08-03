# PWA Import/Export UX Enhancements - Test Execution Guide

**Version:** v3.0.2  
**Updated:** 2025-01-03  
**Test Suite:** UX Enhancements Comprehensive Testing  

## Overview

本指南提供 PWA 匯入匯出 UX 增強功能測試套件的完整執行說明，包含本地開發環境設置、CI/CD 集成配置，以及測試報告生成指引。

## Prerequisites and Dependencies

### 1. Node.js Environment

```bash
# Node.js 版本要求
node --version  # >= 18.0.0
npm --version   # >= 9.0.0

# 或使用 Yarn
yarn --version # >= 1.22.0
```

### 2. Required Dependencies

測試套件使用以下核心依賴：

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "@jest/globals": "^29.7.0",
    "babel-jest": "^29.7.0",
    "@babel/core": "^7.23.0",
    "@babel/preset-env": "^7.23.0",
    "eslint": "^8.55.0",
    "eslint-plugin-jest": "^27.6.0"
  }
}
```

### 3. Browser Testing Dependencies (Optional)

```bash
# 跨瀏覽器測試 (可選)
npm install --save-dev playwright @playwright/test

# 視覺回歸測試 (可選)  
npm install --save-dev puppeteer jest-image-snapshot
```

## Installation and Setup

### 1. Clone and Install

```bash
# 克隆專案
git clone https://github.com/your-org/DB-Card.git
cd DB-Card

# 安裝依賴
cd tests
npm install

# 或使用 Yarn
yarn install
```

### 2. Environment Configuration

建立測試環境配置檔案：

```bash
# 複製環境範本
cp .env.example .env.test

# 編輯測試環境變數
vi .env.test
```

測試環境變數設定：

```bash
# .env.test
NODE_ENV=test
TEST_TIMEOUT=10000
COVERAGE_THRESHOLD=90
ENABLE_SECURITY_TESTS=true
ENABLE_A11Y_TESTS=true
BROWSER_HEADLESS=true
LOG_LEVEL=error
```

### 3. Test Data Setup

```bash
# 建立測試資料目錄
mkdir -p tests/fixtures/data
mkdir -p tests/fixtures/files

# 複製測試資料檔案
cp tests/fixtures/sample-cards.json tests/fixtures/data/
cp tests/fixtures/test-import.json tests/fixtures/data/
```

## Running Tests

### 1. Basic Test Commands

```bash
# 執行所有測試
npm test

# 執行特定測試套件
npm run test:unit          # 單元測試
npm run test:integration   # 整合測試  
npm run test:e2e           # 端到端測試
npm run test:accessibility # 無障礙測試
npm run test:security      # 安全測試

# 執行特定測試檔案
npm test transfer-manager-ux.test.js
npm test -- --testNamePattern="progress callback"
```

### 2. Test with Coverage

```bash
# 生成測試覆蓋率報告
npm run test:coverage

# 設定覆蓋率門檻
npm test -- --coverage --coverageThreshold='{"global":{"branches":85,"functions":90,"lines":90,"statements":90}}'

# 生成 HTML 覆蓋率報告
npm run test:coverage -- --coverageReporters=html
```

### 3. Watch Mode Development

```bash
# 監控模式 - 自動重新執行測試
npm run test:watch

# 監控特定測試套件
npm run test:unit -- --watch
npm run test:integration -- --watch

# 監控特定檔案
npm test transfer-manager-ux.test.js -- --watch
```

### 4. Debug Mode

```bash
# 偵錯模式執行
npm test -- --verbose --no-cache

# 單一測試偵錯
npm test -- --testNamePattern="specific test name" --verbose

# Node.js 偵錯器
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Test Categories and Execution

### 1. Unit Tests

**位置:** `tests/unit/ux-enhancements/`  
**執行時間:** ~2-3 秒  
**覆蓋範圍:** TransferManager, CardManager UX 功能

```bash
# 執行所有單元測試
npm run test:unit

# 執行特定單元測試
npm test tests/unit/ux-enhancements/transfer-manager-ux.test.js
npm test tests/unit/ux-enhancements/card-manager-ux.test.js

# 單元測試 + 覆蓋率
npm run test:unit -- --coverage
```

### 2. Integration Tests

**位置:** `tests/integration/`  
**執行時間:** ~8-10 秒  
**覆蓋範圍:** 完整匯入匯出流程整合

```bash
# 執行整合測試
npm run test:integration

# 特定整合測試
npm test tests/integration/import-export-ux-flow.test.js

# 整合測試 (詳細輸出)
npm run test:integration -- --verbose
```

### 3. End-to-End Tests

**位置:** `tests/e2e/`  
**執行時間:** ~45-60 秒  
**覆蓋範圍:** 用戶體驗流程

```bash
# 執行 E2E 測試
npm run test:e2e

# E2E 測試 (頭部模式 - 適合偵錯)
BROWSER_HEADLESS=false npm run test:e2e

# E2E 測試特定瀏覽器
npm run test:e2e -- --browser=chrome
npm run test:e2e -- --browser=firefox
```

### 4. Accessibility Tests

**位置:** `tests/accessibility/`  
**執行時間:** ~12-15 秒  
**覆蓋範圍:** WCAG 2.1 AA 合規性

```bash
# 執行無障礙測試
npm run test:accessibility

# 無障礙測試 + 詳細報告
npm run test:accessibility -- --verbose

# 產生無障礙測試報告
npm run test:accessibility -- --outputFile=accessibility-report.json
```

### 5. Security Tests

**位置:** `tests/security/`  
**執行時間:** ~5-8 秒  
**覆蓋範圍:** 安全性驗證

```bash
# 執行安全測試
npm run test:security

# 安全測試 (包含滲透測試)
ENABLE_PENETRATION_TESTS=true npm run test:security
```

## Coverage Reports and Analysis

### 1. Coverage Report Generation

```bash
# 生成完整覆蓋率報告
npm run test:coverage

# 輸出格式選項
npm run test:coverage -- --coverageReporters=text,html,lcov,json

# 特定組件覆蓋率
npm run test:coverage -- --collectCoverageFrom="**/src/features/**/*.js"
```

### 2. Coverage Report Types

| 報告格式 | 檔案位置 | 用途 |
|---------|---------|------|
| HTML | `tests/coverage/lcov-report/index.html` | 視覺化瀏覽 |
| LCOV | `tests/coverage/lcov.info` | CI/CD 整合 |
| JSON | `tests/coverage/coverage-summary.json` | 程式化處理 |
| Text | 終端機輸出 | 快速檢視 |

### 3. Coverage Thresholds

設定覆蓋率門檻：

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/features/transfer-manager.js': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/features/card-manager.js': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  }
};
```

## CI/CD Integration

### 1. GitHub Actions Configuration

建立 `.github/workflows/test-ux-enhancements.yml`：

```yaml
name: UX Enhancements Test Suite

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'pwa-card-storage/src/features/**'
      - 'tests/**'
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        cache-dependency-path: tests/package-lock.json
    
    - name: Install dependencies
      working-directory: ./tests
      run: npm ci
    
    - name: Run linting
      working-directory: ./tests
      run: npm run lint
    
    - name: Run unit tests
      working-directory: ./tests
      run: npm run test:unit -- --coverage
    
    - name: Run integration tests
      working-directory: ./tests
      run: npm run test:integration
    
    - name: Run E2E tests
      working-directory: ./tests
      run: npm run test:e2e
    
    - name: Run accessibility tests
      working-directory: ./tests
      run: npm run test:accessibility
    
    - name: Run security tests
      working-directory: ./tests
      run: npm run test:security
    
    - name: Generate coverage report
      working-directory: ./tests
      run: npm run test:coverage -- --coverageReporters=lcov
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./tests/coverage/lcov.info
        flags: ux-enhancements
        name: codecov-umbrella
    
    - name: Archive test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results-${{ matrix.node-version }}
        path: |
          tests/coverage/
          tests/test-results.xml
```

### 2. Jenkins Pipeline Configuration

建立 `Jenkinsfile`：

```groovy
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        COVERAGE_THRESHOLD = '90'
    }
    
    stages {
        stage('Setup') {
            steps {
                script {
                    // 設置 Node.js 環境
                    sh "nvm use ${NODE_VERSION}"
                    dir('tests') {
                        sh 'npm ci'
                    }
                }
            }
        }
        
        stage('Lint') {
            steps {
                dir('tests') {
                    sh 'npm run lint'
                }
            }
        }
        
        stage('Unit Tests') {
            steps {
                dir('tests') {
                    sh 'npm run test:unit -- --coverage --ci'
                }
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'tests/coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Unit Test Coverage Report'
                    ])
                }
            }
        }
        
        stage('Integration Tests') {
            steps {
                dir('tests') {
                    sh 'npm run test:integration -- --ci'
                }
            }
        }
        
        stage('E2E Tests') {
            steps {
                dir('tests') {
                    sh 'npm run test:e2e -- --ci'
                }
            }
        }
        
        stage('Security & Accessibility Tests') {
            parallel {
                stage('Security Tests') {
                    steps {
                        dir('tests') {
                            sh 'npm run test:security -- --ci'
                        }
                    }
                }
                stage('Accessibility Tests') {
                    steps {
                        dir('tests') {
                            sh 'npm run test:accessibility -- --ci'
                        }
                    }
                }
            }
        }
        
        stage('Coverage Analysis') {
            steps {
                dir('tests') {
                    sh 'npm run test:coverage -- --ci'
                    
                    script {
                        def coverage = readJSON file: 'coverage/coverage-summary.json'
                        def linesCoverage = coverage.total.lines.pct
                        
                        if (linesCoverage < COVERAGE_THRESHOLD.toInteger()) {
                            error("Coverage ${linesCoverage}% below threshold ${COVERAGE_THRESHOLD}%")
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            dir('tests') {
                // 發布測試結果
                publishTestResults testResultsPattern: 'test-results.xml'
                
                // 發布覆蓋率報告
                publishCoverage adapters: [
                    istanbulCoberturaAdapter('coverage/cobertura-coverage.xml')
                ], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                
                // 清理工作空間
                cleanWs()
            }
        }
        
        success {
            echo 'All UX Enhancement tests passed successfully!'
        }
        
        failure {
            echo 'UX Enhancement tests failed. Please check the reports.'
            // 發送通知
            emailext (
                subject: "Test Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "UX Enhancement tests failed. Please check Jenkins for details.",
                to: "${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
    }
}
```

### 3. GitLab CI Configuration

建立 `.gitlab-ci.yml`：

```yaml
stages:
  - lint
  - test
  - coverage
  - report

variables:
  NODE_VERSION: "18"
  COVERAGE_THRESHOLD: "90"

before_script:
  - cd tests
  - npm ci

cache:
  paths:
    - tests/node_modules/

lint:
  stage: lint
  script:
    - npm run lint
  only:
    - merge_requests
    - main

unit-tests:
  stage: test
  script:
    - npm run test:unit -- --coverage --ci
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    reports:
      junit: tests/test-results.xml
      coverage_report:
        coverage_format: cobertura
        path: tests/coverage/cobertura-coverage.xml
    paths:
      - tests/coverage/
    expire_in: 1 week

integration-tests:
  stage: test
  script:
    - npm run test:integration -- --ci
  artifacts:
    reports:
      junit: tests/integration-results.xml

e2e-tests:
  stage: test
  script:
    - npm run test:e2e -- --ci
  artifacts:
    reports:
      junit: tests/e2e-results.xml

security-tests:
  stage: test
  script:
    - npm run test:security -- --ci
  artifacts:
    reports:
      junit: tests/security-results.xml

accessibility-tests:
  stage: test
  script:
    - npm run test:accessibility -- --ci
  artifacts:
    reports:
      junit: tests/a11y-results.xml

coverage-analysis:
  stage: coverage
  script:
    - npm run test:coverage -- --ci
    - node scripts/check-coverage.js
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: tests/coverage/cobertura-coverage.xml
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'

test-report:
  stage: report
  script:
    - npm run generate-test-report
  artifacts:
    paths:
      - tests/reports/
    expire_in: 1 month
  only:
    - main
```

## Test Data Management

### 1. Test Fixtures Structure

```
tests/
├── fixtures/
│   ├── data/
│   │   ├── sample-cards.json       # 標準測試名片資料
│   │   ├── bilingual-cards.json    # 雙語測試資料
│   │   ├── large-dataset.json      # 大量資料測試
│   │   ├── corrupted-data.json     # 損壞資料測試
│   │   └── edge-cases.json         # 邊界情況測試
│   ├── files/
│   │   ├── test-import.vcf         # vCard 測試檔案
│   │   ├── large-file.json         # 大檔案測試
│   │   ├── empty-file.json         # 空檔案測試
│   │   └── malformed.txt           # 格式錯誤檔案
│   └── mockData/
│       ├── mockStorage.js          # 模擬儲存
│       ├── mockDOM.js              # 模擬 DOM
│       └── mockBrowser.js          # 模擬瀏覽器 API
```

### 2. Test Data Generation

建立測試資料生成腳本：

```javascript
// tests/scripts/generate-test-data.js
const fs = require('fs');
const path = require('path');

// 生成標準測試名片
function generateSampleCards(count = 10) {
  const cards = [];
  for (let i = 1; i <= count; i++) {
    cards.push({
      id: `test-card-${i}`,
      type: 'personal',
      data: {
        name: `測試用戶 ${i}`,
        email: `test${i}@example.com`,
        phone: `0912-345-${String(i).padStart(3, '0')}`
      },
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    });
  }
  return cards;
}

// 生成雙語測試資料
function generateBilingualCards(count = 5) {
  const cards = [];
  for (let i = 1; i <= count; i++) {
    cards.push({
      id: `bilingual-card-${i}`,
      type: 'personal-bilingual',
      data: {
        name: `測試用戶${i}~Test User ${i}`,
        title: `工程師~Engineer`,
        greetings: ['您好！~Hello!', '歡迎認識我！~Nice to meet you!'],
        email: `bilingual${i}@example.com`
      }
    });
  }
  return cards;
}

// 執行生成
const sampleCards = generateSampleCards(20);
const bilingualCards = generateBilingualCards(10);

fs.writeFileSync(
  path.join(__dirname, '../fixtures/data/sample-cards.json'),
  JSON.stringify({ version: '1.0', cards: sampleCards }, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, '../fixtures/data/bilingual-cards.json'),
  JSON.stringify({ version: '1.0', cards: bilingualCards }, null, 2)
);

console.log('Test data generated successfully!');
```

執行測試資料生成：

```bash
# 生成測試資料
node tests/scripts/generate-test-data.js

# 清理舊測試資料
npm run clean-test-data

# 重新生成所有測試資料
npm run regenerate-test-data
```

## Reporting and Monitoring

### 1. Test Report Generation

```bash
# 生成綜合測試報告
npm run generate-test-report

# 生成 HTML 報告
npm run test:report -- --format html

# 生成 JSON 報告 (供 API 使用)
npm run test:report -- --format json --output reports/test-results.json

# 生成 PDF 報告
npm run test:report -- --format pdf --output reports/test-summary.pdf
```

### 2. Continuous Monitoring

設置測試監控腳本：

```javascript
// tests/scripts/monitor-tests.js
const { execSync } = require('child_process');
const fs = require('fs');

async function runTestMonitoring() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  try {
    // 執行各類測試
    const testSuites = ['unit', 'integration', 'e2e', 'accessibility', 'security'];
    
    for (const suite of testSuites) {
      console.log(`Running ${suite} tests...`);
      const startTime = Date.now();
      
      try {
        const output = execSync(`npm run test:${suite} -- --json`, { encoding: 'utf8' });
        const testResult = JSON.parse(output);
        
        results.tests[suite] = {
          passed: testResult.numPassedTests,
          failed: testResult.numFailedTests,
          total: testResult.numTotalTests,
          duration: Date.now() - startTime,
          coverage: testResult.coverageMap ? calculateCoverage(testResult.coverageMap) : null
        };
      } catch (error) {
        results.tests[suite] = {
          error: error.message,
          duration: Date.now() - startTime
        };
      }
    }

    // 儲存結果
    fs.writeFileSync('tests/monitoring/results.json', JSON.stringify(results, null, 2));
    
    // 檢查是否有失敗的測試
    const hasFailures = Object.values(results.tests).some(test => test.failed > 0);
    if (hasFailures) {
      console.error('Some tests failed!');
      process.exit(1);
    }
    
    console.log('All tests passed successfully!');
  } catch (error) {
    console.error('Test monitoring failed:', error);
    process.exit(1);
  }
}

function calculateCoverage(coverageMap) {
  // 計算覆蓋率邏輯
  return {
    lines: 90,
    branches: 85,
    functions: 95,
    statements: 90
  };
}

// 定期執行 (可搭配 cron job)
if (require.main === module) {
  runTestMonitoring();
}
```

### 3. Performance Monitoring

```bash
# 測試性能監控
npm run test:performance

# 生成性能基準報告
npm run test:benchmark

# 記憶體使用分析
npm run test:memory-analysis
```

## Troubleshooting

### 1. Common Issues

#### 測試超時
```bash
# 增加測試超時時間
npm test -- --testTimeout=30000

# 針對特定慢速測試
npm test -- --testNamePattern="slow test" --testTimeout=60000
```

#### 記憶體不足
```bash
# 增加 Node.js 記憶體限制
NODE_OPTIONS="--max-old-space-size=4096" npm test

# 序列執行測試
npm test -- --runInBand
```

#### 檔案監控問題
```bash
# 清除 Jest 快取
npm test -- --clearCache

# 停用快取
npm test -- --no-cache
```

### 2. Debug Configuration

建立偵錯配置檔案 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Jest Tests",
      "program": "${workspaceFolder}/tests/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--no-cache",
        "${fileBasenameNoExtension}"
      ],
      "cwd": "${workspaceFolder}/tests",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Specific Test",
      "program": "${workspaceFolder}/tests/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--testNamePattern",
        "${input:testName}"
      ],
      "cwd": "${workspaceFolder}/tests",
      "console": "integratedTerminal"
    }
  ],
  "inputs": [
    {
      "id": "testName",
      "description": "Test name pattern",
      "default": "",
      "type": "promptString"
    }
  ]
}
```

### 3. Environment Issues

```bash
# 檢查 Node.js 版本
node --version

# 檢查 npm 配置
npm config list

# 重新安裝依賴
rm -rf node_modules package-lock.json
npm install

# 檢查權限問題
npm config set cache /tmp/.npm-cache --global
```

## Best Practices

### 1. Test Writing Guidelines

- **測試命名**: 使用 Given-When-Then 格式
- **測試隔離**: 每個測試應該獨立執行
- **資料清理**: 測試後清理所有模擬資料
- **錯誤處理**: 測試各種錯誤情境
- **性能考量**: 避免測試阻塞主執行緒

### 2. CI/CD Integration Best Practices

- **快速回饋**: 優先執行快速測試
- **並行執行**: 適當使用測試並行化
- **失敗快停**: 關鍵測試失敗時立即停止
- **清楚報告**: 提供詳細的失敗資訊
- **自動重試**: 對不穩定測試設置重試機制

### 3. Maintenance Guidelines

- **定期更新**: 保持測試與代碼同步
- **效能監控**: 監控測試執行時間
- **覆蓋率維護**: 定期檢查測試覆蓋率
- **清理舊測試**: 移除過時的測試案例
- **文件更新**: 保持測試文件最新

## Support and Resources

### 1. Documentation Links

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Guides](https://testing-library.com/docs/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [PWA Testing Best Practices](https://web.dev/testing-web-apps/)

### 2. Team Contacts

- **測試負責人**: test-team@your-org.com
- **CI/CD 支援**: devops@your-org.com  
- **無障礙專家**: accessibility@your-org.com
- **安全團隊**: security@your-org.com

### 3. Issue Reporting

遇到問題時請提供：
1. 測試執行命令
2. 完整錯誤訊息
3. 環境資訊 (Node.js 版本、OS 等)
4. 重現步驟
5. 相關日誌檔案

---

**維護者**: test-coverage-generator v3.0.2  
**最後更新**: 2025-01-03  
**下次檢查**: 每月第一個週一