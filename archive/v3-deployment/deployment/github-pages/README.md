# GitHub Pages 部署指南

GitHub Pages 是 GitHub 提供的免費靜態網站托管服務，非常適合部署 DB-Card 專案。

## 🚀 快速部署

### 方法一：使用 GitHub Actions（推薦）

1. **複製配置文件**
   ```bash
   # 複製 Headers 配置
   cp deployment/github-pages/_headers ./_headers
   
   # 複製 GitHub Actions 工作流程
   cp -r deployment/github-pages/.github ./.github
   ```

2. **提交並推送**
   ```bash
   git add _headers .github/
   git commit -m "Add GitHub Pages security headers configuration"
   git push origin main
   ```

3. **啟用 GitHub Pages**
   - 前往 Repository Settings > Pages
   - Source 選擇 "GitHub Actions"
   - 工作流程將自動執行部署

### 方法二：直接部署

1. **複製 Headers 配置**
   ```bash
   cp deployment/github-pages/_headers ./_headers
   ```

2. **啟用 GitHub Pages**
   - 前往 Repository Settings > Pages
   - Source 選擇 "Deploy from a branch"
   - Branch 選擇 "main" 和 "/ (root)"

3. **提交配置**
   ```bash
   git add _headers
   git commit -m "Add security headers for GitHub Pages"
   git push origin main
   ```

## 🛡️ 安全配置說明

### Headers 文件格式
GitHub Pages 使用 `_headers` 文件來配置 HTTP Headers：

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### 支援的 Headers
GitHub Pages 支援大部分標準 HTTP Headers，包括：
- Content-Security-Policy
- Strict-Transport-Security
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Cache-Control

## 🔍 驗證部署

### 自動驗證
GitHub Actions 工作流程會自動驗證安全 Headers：

```yaml
- name: Verify deployment
  run: |
    curl -I "${{ steps.deployment.outputs.page_url }}" | grep -E "(Content-Security-Policy|Strict-Transport-Security)"
```

### 手動驗證
部署完成後，使用驗證工具檢查：

```bash
# 等待部署完成（通常需要 5-10 分鐘）
node deployment/validate-headers.js https://yourusername.github.io/DB-Card/
```

### 瀏覽器驗證
1. 開啟部署的網站
2. 按 F12 開啟開發者工具
3. 切換到 Network 標籤
4. 重新載入頁面
5. 檢查主文檔的 Response Headers

## ⚙️ 進階配置

### 自訂網域
如果使用自訂網域：

1. **設定 CNAME**
   ```bash
   echo "your-domain.com" > CNAME
   git add CNAME
   git commit -m "Add custom domain"
   git push origin main
   ```

2. **DNS 配置**
   - 添加 CNAME 記錄指向 `yourusername.github.io`
   - 或添加 A 記錄指向 GitHub Pages IP

3. **啟用 HTTPS**
   - 在 Repository Settings > Pages 中勾選 "Enforce HTTPS"

### 快取配置
針對不同文件類型設定適當的快取：

```
*.js
  Cache-Control: public, max-age=86400

*.css
  Cache-Control: public, max-age=86400

*.html
  Cache-Control: public, max-age=3600
```

## 🚨 故障排除

### Headers 未生效
**問題**: 部署後安全 Headers 未出現

**解決方案**:
1. 確認 `_headers` 文件在專案根目錄
2. 檢查文件格式是否正確（無 BOM，UTF-8 編碼）
3. 等待 5-10 分鐘讓配置生效
4. 清除瀏覽器快取重新測試

### GitHub Actions 失敗
**問題**: 部署工作流程執行失敗

**解決方案**:
1. 檢查 Repository Settings > Actions 是否啟用
2. 確認 Pages 權限已設定為 "GitHub Actions"
3. 檢查工作流程日誌中的錯誤訊息
4. 確認所有必要文件都已提交

### CSP 錯誤
**問題**: Content Security Policy 阻止資源載入

**解決方案**:
1. 檢查瀏覽器控制台的 CSP 錯誤
2. 根據錯誤調整 `_headers` 中的 CSP 規則
3. 測試調整後的配置

### 404 錯誤
**問題**: 頁面顯示 404 Not Found

**解決方案**:
1. 確認 `index.html` 在專案根目錄
2. 檢查 Repository Settings > Pages 的配置
3. 確認分支和目錄設定正確

## 📊 效能優化

### 啟用壓縮
GitHub Pages 自動啟用 Gzip 壓縮，無需額外配置。

### 圖片優化
建議使用 WebP 格式並設定適當的快取：

```
*.webp
  Cache-Control: public, max-age=604800
  Content-Type: image/webp
```

### Service Worker
如果使用 PWA 功能，確保 Service Worker 正確配置：

```
/sw.js
  Cache-Control: no-cache, no-store, must-revalidate
```

## 📞 技術支援

- [GitHub Pages 官方文檔](https://docs.github.com/en/pages)
- [GitHub Actions 文檔](https://docs.github.com/en/actions)
- [DB-Card Issues](https://github.com/moda-gov-tw/DB-Card/issues)

---

**✅ 部署檢查清單**
- [ ] 複製 `_headers` 文件到專案根目錄
- [ ] 設定 GitHub Actions 工作流程（可選）
- [ ] 啟用 GitHub Pages
- [ ] 驗證安全 Headers 生效
- [ ] 測試所有功能正常運作
- [ ] 設定自訂網域（可選）