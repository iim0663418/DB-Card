# PWA 部署工具 API 參考

## 📋 概述

本文檔提供 PWA 靜態托管部署工具的完整 API 參考，包含所有自動化工具的使用方法、參數說明和範例。

## 🛠️ 核心部署工具

### 自動化部署腳本

#### `automated-deployment.sh`

完整的自動化部署腳本，整合所有部署步驟。

**語法**:
```bash
./deploy/automated-deployment.sh [選項]
```

**選項**:
- `-h, --help` - 顯示說明
- `-v, --verbose` - 詳細輸出模式
- `-n, --dry-run` - 模擬執行，不實際修改檔案
- `-r, --auto-rollback` - 失敗時自動回滾
- `-s, --skip-backup` - 跳過備份階段（不建議）
- `-c, --config FILE` - 指定配置檔案

**範例**:
```bash
# 標準部署
./deploy/automated-deployment.sh

# 詳細輸出
./deploy/automated-deployment.sh --verbose

# 模擬執行
./deploy/automated-deployment.sh --dry-run

# 自動回滾
./deploy/automated-deployment.sh --auto-rollback
```

**回傳值**:
- `0` - 部署成功
- `1` - 部署失敗

### 跨平台測試工具

#### `cross-platform-tester.js`

跨平台相容性測試工具，支援 5 個托管平台。

**語法**:
```bash
node deploy/cross-platform-tester.js [選項]
```

**選項**:
- `--platforms <list>` - 指定測試平台（逗號分隔）
- `--verbose` - 詳細輸出
- `--no-report` - 跳過 JSON 報告生成
- `--help` - 顯示說明

**支援平台**:
- `github-pages` - GitHub Pages
- `cloudflare-pages` - Cloudflare Pages  
- `netlify` - Netlify
- `vercel` - Vercel
- `local` - 本地開發

**範例**:
```bash
# 測試所有平台
node deploy/cross-platform-tester.js

# 測試特定平台
node deploy/cross-platform-tester.js --platforms local,github-pages

# 詳細輸出
node deploy/cross-platform-tester.js --verbose
```

**輸出格式**:
```json
{
  "timestamp": "2025-08-07T12:00:00.000Z",
  "platforms": {
    "local": {
      "platform": "Local Development",
      "tests": {
        "resourceLoading": { "totalTests": 5, "passedTests": 5 },
        "pwaFeatures": { "totalTests": 2, "passedTests": 2 }
      },
      "summary": { "score": 100 }
    }
  },
  "summary": { "overallScore": 85 }
}
```

### 部署驗證工具

#### `deployment-verifier.js`

部署後功能驗證工具。

**語法**:
```bash
node deploy/deployment-verifier.js [platform] [url]
```

**參數**:
- `platform` - 目標平台 (`local`, `github-pages`, `netlify`, `vercel`, `cloudflare-pages`, `all`)
- `url` - 自訂 URL（可選）

**範例**:
```bash
# 驗證本地部署
node deploy/deployment-verifier.js local

# 驗證 GitHub Pages
node deploy/deployment-verifier.js github-pages https://username.github.io/DB-Card

# 驗證所有平台
node deploy/deployment-verifier.js all
```

**驗證項目**:
- 資源載入驗證（9 項資源）
- PWA 功能驗證（manifest.json, Service Worker）
- 安全功能驗證（4 個安全標頭）
- 效能指標收集（載入時間、回應大小）
- 配置管理驗證（統一配置 API）

## 🔧 專用工具

### 路徑管理工具

#### `path-audit.js`

硬編碼路徑審計工具。

**語法**:
```bash
node deploy/path-audit.js
```

**功能**:
- 掃描 6 種路徑模式
- 識別硬編碼路徑問題
- 生成修復建議
- 自動生成修復腳本

**輸出**:
```json
{
  "summary": {
    "totalFiles": 4,
    "affectedFiles": 3,
    "totalIssues": 65
  },
  "issues": [
    {
      "file": "pwa-card-storage/index.html",
      "line": 123,
      "pattern": "../assets/",
      "suggestion": "./assets/"
    }
  ]
}
```

#### `path-fix-generator.js`

路徑修復腳本生成器。

**語法**:
```bash
node deploy/path-fix-generator.js
```

**功能**:
- 基於審計結果生成修復腳本
- 包含資源複製命令
- 包含路徑替換命令
- 安全驗證和錯誤處理

### 資源管理工具

#### `resource-integrity-manager.js`

資源完整性管理工具。

**語法**:
```bash
node deploy/resource-integrity-manager.js
```

**功能**:
- 複製核心資源檔案
- SHA-384 完整性驗證
- 原子操作與回滾
- 目錄結構建立

**處理資源**:
- 核心資產：5 個檔案
- 安全模組：3 個核心模組
- 目標目錄：`assets/`, `src/security/`

#### `html-path-updater.js`

HTML 路徑引用更新工具。

**語法**:
```bash
node deploy/html-path-updater.js
```

**功能**:
- 更新 HTML 中的硬編碼路徑
- XSS 防護和內容驗證
- 備份建立與回滾
- CSP 合規性檢查

#### `manifest-path-updater.js`

Manifest 檔案路徑修復工具。

**語法**:
```bash
node deploy/manifest-path-updater.js
```

**功能**:
- 修復 manifest.json 路徑
- JSON schema 驗證
- 資源完整性驗證
- PWA 合規性檢查

### Service Worker 工具

#### `sw-simplifier.js`

Service Worker 簡化工具。

**語法**:
```bash
node deploy/sw-simplifier.js
```

**功能**:
- 簡化 BASE_PATH 邏輯
- 支援 5 個托管平台
- 65% 程式碼減少
- CSP 合規性驗證

**平台檢測邏輯**:
```javascript
// 簡化後的平台檢測
const hostname = self.location.hostname;
if (hostname.includes('github.io')) return '/DB-Card/pwa-card-storage';
if (hostname.includes('pages.dev')) return '/pwa-card-storage';
// ... 其他平台
```

#### `sw-cache-standardizer.js`

快取策略標準化工具。

**語法**:
```bash
node deploy/sw-cache-standardizer.js
```

**功能**:
- 實作 3 種標準快取策略
- 儲存配額管理（50MB/25MB/10MB）
- LRU 清理策略
- 資源驗證整合

**快取策略**:
- `cache-first` - 靜態資源
- `network-first` - 動態內容
- `stale-while-revalidate` - 運行時資源

### 安全工具

#### `security-module-selector.js`

安全模組選擇與複製工具。

**語法**:
```bash
node deploy/security-module-selector.js
```

**功能**:
- 從 22 個模組中選擇 5 個核心模組
- 模組依賴分析
- 檔案完整性驗證
- 組織結構優化

**選擇的模組**:
- **核心模組**（3 個）：SecurityInputHandler, SecurityDataHandler, SecurityAuthHandler
- **可選模組**（2 個）：SecurityMonitor, StaticHostingCompatibilityLayer

#### `client-security-configurator.js`

客戶端安全配置工具。

**語法**:
```bash
node deploy/client-security-configurator.js
```

**功能**:
- CSP 政策配置
- XSS 防護設定
- 安全標頭配置
- 多平台安全適配

**生成檔案**:
- `config/csp-config.json` - CSP 政策
- `config/xss-protection.json` - XSS 防護
- `config/security-headers.json` - 安全標頭

### 配置管理工具

#### `environment-detector.js`

環境檢測工具。

**語法**:
```bash
node deploy/environment-detector.js
```

**功能**:
- 自動平台檢測
- 配置檔案生成
- 信心度計算
- 回退機制

**檢測模式**:
```javascript
const platformPatterns = {
  'github-pages': /\.github\.io$/,
  'cloudflare-pages': /\.pages\.dev$/,
  'netlify': /\.netlify\.app$/,
  'vercel': /\.vercel\.app$/,
  'local': /^(localhost|127\.0\.0\.1)$/
};
```

#### `multi-env-config-generator.js`

多環境配置生成器。

**語法**:
```bash
node deploy/multi-env-config-generator.js
```

**功能**:
- 生成 5 個平台配置檔案
- JSON schema 驗證
- 安全配置整合
- 平台特性差異化

**配置結構**:
```json
{
  "platform": "github-pages",
  "version": "v3.2.0",
  "basePath": "/DB-Card/pwa-card-storage",
  "features": {
    "offline": true,
    "caching": true,
    "pushNotifications": false
  },
  "security": {
    "level": "standard",
    "csp": { "directives": {...} },
    "headers": {...}
  }
}
```

#### `config-manager-generator.js`

配置管理器生成工具。

**語法**:
```bash
node deploy/config-manager-generator.js
```

**功能**:
- 生成統一配置管理介面
- 14 個 API 方法
- 智慧快取系統
- 配置驗證

**生成的 API**:
```javascript
// 主要 API 方法
loadConfiguration(platform)
getCurrentConfig()
getConfigValue(path)
isFeatureEnabled(feature)
getSecurityConfig()
getCacheConfig()
// ... 其他 8 個方法
```

## 📊 輸出格式

### 標準報告格式

所有工具都遵循統一的報告格式：

```json
{
  "tool": "tool-name",
  "version": "v3.2.0",
  "timestamp": "2025-08-07T12:00:00.000Z",
  "success": true,
  "summary": {
    "totalTests": 10,
    "passedTests": 9,
    "failedTests": 1,
    "score": 90
  },
  "results": [...],
  "errors": [...],
  "recommendations": [...]
}
```

### 錯誤格式

```json
{
  "error": {
    "code": "E_RESOURCE_NOT_FOUND",
    "message": "Resource file not found",
    "file": "path/to/file",
    "line": 123,
    "suggestion": "Check file path and permissions"
  }
}
```

## 🔒 安全考量

### 輸入驗證

所有工具都實作以下安全檢查：

```javascript
// 路徑遍歷防護
function sanitizePath(path) {
  return path.replace(/\.\.\//g, '').replace(/[;&|`$()]/g, '');
}

// XSS 防護
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

### 檔案操作安全

- 原子操作與回滾
- 檔案權限檢查
- 路徑驗證
- 完整性驗證（SHA-384）

## 🚀 整合範例

### CI/CD 整合

```yaml
# GitHub Actions 範例
- name: Run PWA Deployment
  run: |
    chmod +x deploy/automated-deployment.sh
    ./deploy/automated-deployment.sh --verbose
    
- name: Verify Deployment
  run: |
    node deploy/deployment-verifier.js local
    node deploy/cross-platform-tester.js --platforms local
```

### 自訂腳本整合

```bash
#!/bin/bash
# 自訂部署腳本

set -euo pipefail

echo "Starting PWA deployment..."

# 執行路徑審計
node deploy/path-audit.js

# 執行自動化部署
./deploy/automated-deployment.sh --verbose

# 驗證部署結果
node deploy/deployment-verifier.js local

# 執行跨平台測試
node deploy/cross-platform-tester.js --platforms local

echo "Deployment completed successfully!"
```

## 📚 進階用法

### 自訂配置

```javascript
// 自訂平台配置
const customConfig = {
  platform: 'custom-platform',
  basePath: '/custom-path',
  features: {
    offline: true,
    customFeature: true
  }
};

// 載入自訂配置
node deploy/config-manager-generator.js --config custom-config.json
```

### 批次處理

```bash
# 批次測試多個平台
for platform in github-pages netlify vercel; do
  echo "Testing $platform..."
  node deploy/cross-platform-tester.js --platforms $platform
done
```

## 🔧 除錯模式

### 詳細日誌

```bash
# 啟用詳細日誌
DEBUG=* node deploy/deployment-verifier.js local

# 特定模組日誌
DEBUG=security:* node deploy/client-security-configurator.js
```

### 效能分析

```bash
# 效能分析模式
time node deploy/cross-platform-tester.js
node --prof deploy/deployment-verifier.js local
```

---

**API 參考版本**: v3.2.0-pwa-deployment-compatibility  
**最後更新**: 2025-08-07  
**維護者**: 數位發展部 PWA 開發團隊