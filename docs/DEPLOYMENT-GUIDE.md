# PWA 靜態托管部署指南

## 📋 概述

本指南提供 PWA 數位名片系統的完整部署流程，包含自動化部署、跨平台測試和故障排除。基於 v3.2.0-pwa-deployment-compatibility 架構，支援 5 個主要靜態托管平台。

## 🚀 快速部署

### 自動化部署（推薦）

使用我們的自動化部署腳本，一鍵完成所有部署步驟：

```bash
# 進入專案目錄
cd DB-Card

# 執行自動化部署
./deploy/automated-deployment.sh

# 或使用詳細輸出模式
./deploy/automated-deployment.sh --verbose

# 模擬執行（不實際修改檔案）
./deploy/automated-deployment.sh --dry-run
```

### 手動部署步驟

如需手動控制部署流程：

1. **路徑審計與修復**
```bash
# 掃描硬編碼路徑問題
node deploy/path-audit.js

# 生成修復腳本
node deploy/path-fix-generator.js

# 執行修復
./deploy/fix-hardcoded-paths-v2.sh
```

2. **資源整合**
```bash
# 複製核心資源
node deploy/resource-integrity-manager.js

# 更新 HTML 路徑引用
node deploy/html-path-updater.js

# 更新 Manifest 路徑
node deploy/manifest-path-updater.js
```

3. **Service Worker 優化**
```bash
# 簡化 Service Worker
node deploy/sw-simplifier.js

# 標準化快取策略
node deploy/sw-cache-standardizer.js
```

4. **安全配置**
```bash
# 選擇安全模組
node deploy/security-module-selector.js

# 配置客戶端安全
node deploy/client-security-configurator.js
```

5. **環境配置**
```bash
# 生成環境檢測
node deploy/environment-detector.js

# 建立多環境配置
node deploy/multi-env-config-generator.js

# 生成配置管理器
node deploy/config-manager-generator.js
```

6. **部署驗證**
```bash
# 驗證部署結果
node deploy/deployment-verifier.js

# 跨平台測試
node deploy/cross-platform-tester.js
```

## 🌐 平台部署指南

### GitHub Pages

1. **Repository 設定**
```bash
# Fork 專案到你的 GitHub 帳號
git clone https://github.com/yourusername/DB-Card.git
cd DB-Card

# 執行自動化部署
./deploy/automated-deployment.sh
```

2. **GitHub Pages 啟用**
- 進入 Repository Settings > Pages
- 選擇 `main` 分支作為來源
- 等待部署完成（通常 2-5 分鐘）

3. **自訂網域（可選）**
```bash
# 在 Repository 根目錄建立 CNAME 檔案
echo "your-domain.com" > CNAME
git add CNAME
git commit -m "Add custom domain"
git push
```

**部署 URL**: `https://yourusername.github.io/DB-Card/pwa-card-storage/`

### Cloudflare Pages

1. **連接 Repository**
- 登入 Cloudflare Dashboard
- 進入 Pages > Create a project
- 連接你的 GitHub Repository

2. **建置設定**
```yaml
Build command: ./deploy/automated-deployment.sh
Build output directory: pwa-card-storage
Root directory: /
Node.js version: 18
```

3. **環境變數**
```bash
NODE_ENV=production
PLATFORM=cloudflare-pages
```

**部署 URL**: `https://db-card.pages.dev`

### Netlify

1. **拖放部署**
- 執行本地部署：`./deploy/automated-deployment.sh`
- 將 `pwa-card-storage/` 目錄拖放到 Netlify Deploy 頁面

2. **Git 整合部署**
```yaml
# netlify.toml
[build]
  command = "./deploy/automated-deployment.sh"
  publish = "pwa-card-storage"

[build.environment]
  NODE_VERSION = "18"
  PLATFORM = "netlify"
```

**部署 URL**: `https://db-card.netlify.app`

### Vercel

1. **CLI 部署**
```bash
# 安裝 Vercel CLI
npm i -g vercel

# 執行部署
./deploy/automated-deployment.sh
vercel --prod
```

2. **vercel.json 配置**
```json
{
  "buildCommand": "./deploy/automated-deployment.sh",
  "outputDirectory": "pwa-card-storage",
  "framework": null,
  "env": {
    "PLATFORM": "vercel"
  }
}
```

**部署 URL**: `https://db-card.vercel.app`

### 本地開發

```bash
# 執行本地部署
./deploy/automated-deployment.sh

# 啟動開發伺服器
cd pwa-card-storage
python -m http.server 8000

# 或使用 Node.js
npx http-server -p 8000
```

**本地 URL**: `http://localhost:8000`

## 🧪 測試與驗證

### 自動化測試

```bash
# 執行跨平台測試套件
node deploy/cross-platform-tester.js

# 測試特定平台
node deploy/cross-platform-tester.js --platforms github-pages,netlify

# 詳細輸出模式
node deploy/cross-platform-tester.js --verbose
```

### 部署驗證

```bash
# 驗證本地部署
node deploy/deployment-verifier.js local http://localhost:8000

# 驗證生產部署
node deploy/deployment-verifier.js github-pages https://yourusername.github.io/DB-Card

# 驗證所有平台
node deploy/deployment-verifier.js all
```

### 手動測試檢查清單

- [ ] PWA 主頁面載入正常
- [ ] Service Worker 註冊成功
- [ ] Manifest.json 可訪問
- [ ] 離線功能正常運作
- [ ] 名片儲存功能正常
- [ ] QR 碼生成功能正常
- [ ] vCard 下載功能正常
- [ ] 跨瀏覽器相容性
- [ ] 行動裝置相容性
- [ ] 安全標頭設定正確

## 🔧 故障排除

### 常見問題

#### 1. Service Worker 註冊失敗

**症狀**: 控制台顯示 SW 註冊錯誤

**解決方案**:
```bash
# 重新簡化 Service Worker
node deploy/sw-simplifier.js

# 檢查 sw.js 語法
node -c pwa-card-storage/sw.js

# 驗證 BASE_PATH 設定
node deploy/deployment-verifier.js local
```

#### 2. 資源載入 404 錯誤

**症狀**: 控制台顯示資源載入失敗

**解決方案**:
```bash
# 重新執行路徑修復
node deploy/path-audit.js
./deploy/fix-hardcoded-paths-v2.sh

# 驗證資源完整性
node deploy/resource-loading-validator.js

# 檢查資源複製狀態
ls -la pwa-card-storage/assets/
ls -la pwa-card-storage/src/
```

#### 3. PWA 安裝失敗

**症狀**: 瀏覽器不顯示安裝提示

**解決方案**:
```bash
# 檢查 Manifest 檔案
node -e "console.log(JSON.parse(require('fs').readFileSync('pwa-card-storage/manifest.json', 'utf8')))"

# 驗證 PWA 合規性
node deploy/deployment-verifier.js local | grep -A 10 "PWA Features"

# 檢查 HTTPS 設定（生產環境）
curl -I https://your-domain.com/pwa-card-storage/
```

#### 4. 跨平台相容性問題

**症狀**: 某些平台功能異常

**解決方案**:
```bash
# 執行跨平台測試
node deploy/cross-platform-tester.js --platforms problematic-platform

# 檢查平台特定配置
cat pwa-card-storage/config/platform-config.json

# 重新生成環境配置
node deploy/multi-env-config-generator.js
```

#### 5. 安全標頭缺失

**症狀**: 安全掃描工具報告缺少安全標頭

**解決方案**:
```bash
# 重新配置安全設定
node deploy/client-security-configurator.js

# 檢查安全配置
cat pwa-card-storage/config/security-headers.json

# 驗證安全標頭
curl -I https://your-domain.com/pwa-card-storage/ | grep -E "(X-|Content-Security)"
```

### 回滾程序

如果部署出現問題，可以使用自動回滾功能：

```bash
# 自動回滾到部署前狀態
./deploy/automated-deployment.sh --auto-rollback

# 手動回滾
cp deploy/backups/pwa-card-storage-backup/* pwa-card-storage/

# 驗證回滾結果
node deploy/deployment-verifier.js local
```

### 日誌分析

```bash
# 檢查部署日誌
tail -f deploy/deployment.log

# 檢查錯誤日誌
grep -i error deploy/deployment.log

# 檢查安全日誌
grep -i security deploy/deployment.log
```

## 📊 效能優化

### 載入時間優化

1. **資源壓縮**
```bash
# 檢查資源大小
du -sh pwa-card-storage/assets/*
du -sh pwa-card-storage/src/*

# 優化建議
node deploy/cross-platform-tester.js | grep -A 5 "Performance"
```

2. **快取策略調整**
```bash
# 檢查快取設定
grep -A 10 "cache" pwa-card-storage/sw.js

# 重新標準化快取策略
node deploy/sw-cache-standardizer.js
```

### 安全性強化

1. **安全標頭檢查**
```bash
# 檢查安全配置
node deploy/deployment-verifier.js local | grep -A 10 "Security"

# 更新安全設定
node deploy/client-security-configurator.js
```

2. **內容安全政策**
```bash
# 檢查 CSP 設定
grep -r "Content-Security-Policy" pwa-card-storage/

# 驗證 CSP 合規性
node deploy/cross-platform-tester.js --verbose | grep CSP
```

## 🔄 持續部署

### GitHub Actions 設定

建立 `.github/workflows/deploy.yml`：

```yaml
name: PWA Deployment

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Make deployment script executable
      run: chmod +x deploy/automated-deployment.sh
    
    - name: Run automated deployment
      run: ./deploy/automated-deployment.sh --verbose
    
    - name: Run cross-platform tests
      run: node deploy/cross-platform-tester.js --platforms local
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./pwa-card-storage
```

### 部署監控

```bash
# 設定部署監控
node deploy/deployment-verifier.js all > deploy/monitoring-report.json

# 定期健康檢查
*/30 * * * * cd /path/to/DB-Card && node deploy/cross-platform-tester.js --no-report
```

## 📚 進階配置

### 自訂網域設定

1. **DNS 配置**
```bash
# A 記錄（GitHub Pages）
your-domain.com -> 185.199.108.153
your-domain.com -> 185.199.109.153
your-domain.com -> 185.199.110.153
your-domain.com -> 185.199.111.153

# CNAME 記錄（其他平台）
your-domain.com -> your-app.netlify.app
```

2. **SSL 憑證**
- GitHub Pages: 自動提供 Let's Encrypt
- Cloudflare Pages: 自動 SSL
- Netlify: 自動 SSL
- Vercel: 自動 SSL

### 多環境管理

```bash
# 開發環境
PLATFORM=local ./deploy/automated-deployment.sh

# 測試環境
PLATFORM=netlify ./deploy/automated-deployment.sh

# 生產環境
PLATFORM=github-pages ./deploy/automated-deployment.sh
```

## 🛡️ 安全最佳實踐

### 部署前檢查

- [ ] 移除所有測試資料和 API 金鑰
- [ ] 確認安全標頭設定正確
- [ ] 驗證 CSP 政策完整
- [ ] 檢查 HTTPS 強制重導向
- [ ] 確認敏感檔案不在公開目錄

### 定期維護

```bash
# 每月安全檢查
node deploy/deployment-verifier.js all | grep -A 20 "Security"

# 每季跨平台測試
node deploy/cross-platform-tester.js --verbose

# 每半年完整部署測試
./deploy/automated-deployment.sh --dry-run
```

## 📞 技術支援

### 聯絡方式

- **GitHub Issues**: [DB-Card Issues](https://github.com/moda-gov-tw/DB-Card/issues)
- **技術文檔**: `docs/` 目錄下的相關文件
- **部署工具**: `deploy/` 目錄下的自動化工具

### 常用命令參考

```bash
# 完整部署
./deploy/automated-deployment.sh

# 驗證部署
node deploy/deployment-verifier.js local

# 跨平台測試
node deploy/cross-platform-tester.js

# 查看幫助
./deploy/automated-deployment.sh --help
node deploy/cross-platform-tester.js --help
```

---

**部署指南版本**: v3.2.0-pwa-deployment-compatibility  
**最後更新**: 2025-08-07  
**維護者**: 數位發展部 PWA 開發團隊