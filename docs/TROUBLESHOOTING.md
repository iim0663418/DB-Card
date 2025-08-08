# PWA 部署故障排除指南

## 🚨 緊急故障處理

### 立即回滾程序

如果部署後發現嚴重問題，立即執行回滾：

```bash
# 自動回滾（推薦）
./deploy/automated-deployment.sh --auto-rollback

# 手動回滾
cp -r deploy/backups/pwa-card-storage-backup/* pwa-card-storage/

# 驗證回滾成功
node deploy/deployment-verifier.js local
```

## 🔍 診斷工具

### 快速診斷

```bash
# 一鍵診斷所有問題
node deploy/deployment-verifier.js local --verbose

# 跨平台相容性檢查
node deploy/cross-platform-tester.js --platforms local

# 資源載入驗證
node deploy/resource-loading-validator.js
```

### 詳細日誌分析

```bash
# 檢查部署日誌
tail -f deploy/deployment.log

# 搜尋錯誤訊息
grep -i "error\|failed\|exception" deploy/deployment.log

# 檢查安全相關問題
grep -i "security\|xss\|csp" deploy/deployment.log
```

## 🛠️ 常見問題解決

### 1. Service Worker 問題

#### 問題：SW 註冊失敗
```
Error: Failed to register service worker
```

**診斷步驟**:
```bash
# 檢查 SW 檔案語法
node -c pwa-card-storage/sw.js

# 檢查 SW 路徑
ls -la pwa-card-storage/sw.js

# 檢查控制台錯誤
# 開啟瀏覽器開發者工具 > Console
```

**解決方案**:
```bash
# 重新簡化 Service Worker
node deploy/sw-simplifier.js

# 重新標準化快取策略
node deploy/sw-cache-standardizer.js

# 清除瀏覽器快取並重新載入
```

#### 問題：SW 快取策略錯誤
```
Error: Cache strategy not working
```

**解決方案**:
```bash
# 檢查快取配置
grep -A 20 "cacheStrategies" pwa-card-storage/sw.js

# 重新配置快取策略
node deploy/sw-cache-standardizer.js

# 清除 Service Worker 快取
# 瀏覽器 > 開發者工具 > Application > Storage > Clear storage
```

### 2. 資源載入問題

#### 問題：404 資源載入失敗
```
GET /assets/styles/main.css 404 (Not Found)
```

**診斷步驟**:
```bash
# 檢查資源檔案是否存在
ls -la pwa-card-storage/assets/styles/
ls -la pwa-card-storage/assets/scripts/
ls -la pwa-card-storage/src/security/

# 檢查路徑引用
grep -r "\.\./assets" pwa-card-storage/
grep -r "\.\./src" pwa-card-storage/
```

**解決方案**:
```bash
# 重新執行路徑審計
node deploy/path-audit.js

# 重新複製資源檔案
node deploy/resource-integrity-manager.js

# 重新更新路徑引用
node deploy/html-path-updater.js
node deploy/manifest-path-updater.js

# 驗證修復結果
node deploy/resource-loading-validator.js
```

#### 問題：安全模組載入失敗
```
Error: Cannot load security modules
```

**解決方案**:
```bash
# 檢查安全模組是否存在
ls -la pwa-card-storage/src/security/

# 重新選擇和複製安全模組
node deploy/security-module-selector.js

# 更新安全模組路徑
node deploy/security-module-path-updater.js

# 重新配置客戶端安全
node deploy/client-security-configurator.js
```

### 3. PWA 功能問題

#### 問題：PWA 無法安裝
```
PWA install prompt not showing
```

**診斷步驟**:
```bash
# 檢查 Manifest 檔案
cat pwa-card-storage/manifest.json | jq .

# 檢查 PWA 合規性
node deploy/deployment-verifier.js local | grep -A 10 "PWA Features"

# 檢查 HTTPS 設定（生產環境必需）
curl -I https://your-domain.com/pwa-card-storage/
```

**解決方案**:
```bash
# 重新更新 Manifest 路徑
node deploy/manifest-path-updater.js

# 檢查 Manifest 必要欄位
node -e "
const manifest = require('./pwa-card-storage/manifest.json');
const required = ['name', 'short_name', 'start_url', 'display', 'icons'];
required.forEach(field => {
  if (!manifest[field]) console.log('Missing:', field);
});
"

# 確保 HTTPS 部署（生產環境）
# PWA 需要 HTTPS 才能安裝
```

#### 問題：離線功能不工作
```
App not working offline
```

**解決方案**:
```bash
# 檢查 Service Worker 快取策略
grep -A 10 "cache-first\|network-first" pwa-card-storage/sw.js

# 重新標準化快取策略
node deploy/sw-cache-standardizer.js

# 測試離線功能
# 瀏覽器 > 開發者工具 > Network > Offline
```

### 4. 跨平台相容性問題

#### 問題：特定平台功能異常
```
Platform-specific features not working
```

**診斷步驟**:
```bash
# 執行跨平台測試
node deploy/cross-platform-tester.js --platforms github-pages,netlify,vercel

# 檢查平台特定配置
ls -la pwa-card-storage/config/
cat pwa-card-storage/config/github-pages-config.json
```

**解決方案**:
```bash
# 重新生成環境檢測
node deploy/environment-detector.js

# 重新建立多環境配置
node deploy/multi-env-config-generator.js

# 重新生成配置管理器
node deploy/config-manager-generator.js

# 測試特定平台
node deploy/cross-platform-tester.js --platforms problematic-platform --verbose
```

### 5. 安全配置問題

#### 問題：安全標頭缺失
```
Security headers not set
```

**診斷步驟**:
```bash
# 檢查安全標頭
curl -I https://your-domain.com/pwa-card-storage/ | grep -E "(X-|Content-Security)"

# 檢查安全配置檔案
ls -la pwa-card-storage/config/
cat pwa-card-storage/config/security-headers.json
```

**解決方案**:
```bash
# 重新配置客戶端安全
node deploy/client-security-configurator.js

# 檢查 CSP 設定
grep -r "Content-Security-Policy" pwa-card-storage/

# 驗證安全配置
node deploy/deployment-verifier.js local | grep -A 15 "Security"
```

#### 問題：XSS 防護失效
```
XSS protection not working
```

**解決方案**:
```bash
# 檢查 XSS 防護配置
cat pwa-card-storage/config/xss-protection.json

# 重新配置 XSS 防護
node deploy/client-security-configurator.js

# 檢查安全模組
ls -la pwa-card-storage/src/security/
grep -r "sanitize\|escape" pwa-card-storage/src/security/
```

### 6. 效能問題

#### 問題：載入時間過長
```
Page load time > 5 seconds
```

**診斷步驟**:
```bash
# 檢查效能指標
node deploy/cross-platform-tester.js | grep -A 10 "Performance"

# 檢查資源大小
du -sh pwa-card-storage/assets/*
du -sh pwa-card-storage/src/*
```

**解決方案**:
```bash
# 檢查快取策略
grep -A 20 "cache" pwa-card-storage/sw.js

# 優化資源載入
node deploy/resource-loading-validator.js

# 檢查是否有不必要的資源
find pwa-card-storage -name "*.js" -size +100k
find pwa-card-storage -name "*.css" -size +50k
```

## 🔧 進階故障排除

### 環境變數檢查

```bash
# 檢查環境變數
echo $NODE_ENV
echo $PLATFORM

# 設定正確的環境變數
export NODE_ENV=production
export PLATFORM=github-pages
```

### 權限問題

```bash
# 檢查檔案權限
ls -la deploy/automated-deployment.sh
ls -la deploy/fix-hardcoded-paths-v2.sh

# 修復權限
chmod +x deploy/automated-deployment.sh
chmod +x deploy/fix-hardcoded-paths-v2.sh
```

### 依賴問題

```bash
# 檢查 Node.js 版本
node --version  # 建議 >= 16

# 檢查必要工具
which git
which curl
which jq  # 可選，用於 JSON 處理
```

## 📊 監控與預防

### 定期健康檢查

```bash
# 每日健康檢查腳本
#!/bin/bash
echo "=== PWA Health Check $(date) ==="

# 檢查部署狀態
node deploy/deployment-verifier.js local

# 檢查跨平台相容性
node deploy/cross-platform-tester.js --platforms local

# 檢查資源載入
node deploy/resource-loading-validator.js

echo "=== Health Check Complete ==="
```

### 自動化監控

```bash
# 設定 cron job 進行定期檢查
# 編輯 crontab
crontab -e

# 新增以下行（每小時檢查一次）
0 * * * * cd /path/to/DB-Card && ./health-check.sh >> /var/log/pwa-health.log 2>&1
```

### 效能基準

建立效能基準以便比較：

```bash
# 建立效能基準檔案
node deploy/cross-platform-tester.js > baseline-performance.json

# 定期比較效能
node deploy/cross-platform-tester.js > current-performance.json
diff baseline-performance.json current-performance.json
```

## 🆘 緊急聯絡

### 嚴重問題處理流程

1. **立即回滾**
```bash
./deploy/automated-deployment.sh --auto-rollback
```

2. **收集診斷資訊**
```bash
# 生成完整診斷報告
{
  echo "=== System Info ==="
  uname -a
  node --version
  
  echo "=== Deployment Status ==="
  node deploy/deployment-verifier.js local
  
  echo "=== Error Logs ==="
  tail -50 deploy/deployment.log
  
  echo "=== File Structure ==="
  find pwa-card-storage -type f | head -20
} > emergency-diagnostic-report.txt
```

3. **提交問題報告**
- 前往 [GitHub Issues](https://github.com/moda-gov-tw/DB-Card/issues)
- 附上診斷報告
- 描述問題發生的步驟

### 聯絡資訊

- **GitHub Issues**: 技術問題和 bug 報告
- **文檔**: `docs/` 目錄下的相關文件
- **工具說明**: 各部署工具都有 `--help` 選項

## 📚 參考資源

### 相關文檔

- [部署指南](DEPLOYMENT-GUIDE.md) - 完整部署流程
- [安全文檔](SECURITY.md) - 安全架構說明
- [技術設計](design.md) - 系統架構設計

### 工具參考

```bash
# 查看所有可用工具
ls deploy/*.js

# 查看工具說明
node deploy/deployment-verifier.js --help
node deploy/cross-platform-tester.js --help
./deploy/automated-deployment.sh --help
```

### 常用除錯命令

```bash
# 檢查語法錯誤
find pwa-card-storage -name "*.js" -exec node -c {} \;

# 檢查 JSON 格式
find pwa-card-storage -name "*.json" -exec jq . {} \; > /dev/null

# 檢查 HTML 結構
find pwa-card-storage -name "*.html" -exec tidy -q -e {} \;
```

---

**故障排除指南版本**: v3.2.0-pwa-deployment-compatibility  
**最後更新**: 2025-08-07  
**維護者**: 數位發展部 PWA 開發團隊