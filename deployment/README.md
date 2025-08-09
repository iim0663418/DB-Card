# DB-Card 跨平台部署安全配置

本目錄包含 DB-Card 專案在各大靜態托管平台的安全部署配置，確保所有平台都具備完整的安全 Headers 防護。

## 🛡️ 安全 Headers 概覽

所有平台配置都包含以下安全 Headers：

| Header | 功能 | 配置值 |
|--------|------|--------|
| **Content-Security-Policy** | 防止 XSS 攻擊 | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'` |
| **Strict-Transport-Security** | 強制 HTTPS | `max-age=31536000; includeSubDomains; preload` |
| **X-Frame-Options** | 防止點擊劫持 | `DENY` |
| **X-Content-Type-Options** | 防止 MIME 類型混淆 | `nosniff` |
| **Referrer-Policy** | 控制 Referrer 資訊 | `strict-origin-when-cross-origin` |
| **Permissions-Policy** | 限制瀏覽器功能 | `geolocation=(), microphone=(), camera=()` |

## 🚀 支援平台

| 平台 | 配置文件 | 部署指南 | 狀態 |
|------|----------|----------|------|
| **GitHub Pages** | `github-pages/` | [部署指南](github-pages/README.md) | ✅ 已配置 |
| **Netlify** | `netlify/` | [部署指南](netlify/README.md) | ✅ 已配置 |
| **Vercel** | `vercel/` | [部署指南](vercel/README.md) | ✅ 已配置 |
| **Cloudflare Pages** | `cloudflare-pages/` | [部署指南](cloudflare-pages/README.md) | ✅ 已配置 |
| **AWS S3 + CloudFront** | `aws-s3-cloudfront/` | [部署指南](aws-s3-cloudfront/README.md) | ✅ 已配置 |

## 🔍 安全驗證

### 自動化驗證
```bash
# 驗證所有安全 Headers
node validate-headers.js https://your-domain.com

# 跨平台部署測試
bash test-deployment.sh

# 瀏覽器端驗證
open security-headers-test.html
```

### 手動驗證
使用瀏覽器開發者工具檢查 Response Headers：

1. 開啟網站
2. 按 F12 開啟開發者工具
3. 切換到 Network 標籤
4. 重新載入頁面
5. 點擊主文檔請求
6. 檢查 Response Headers 是否包含所有安全 Headers

### 線上工具驗證
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)

## 📋 部署檢查清單

- [ ] 選擇目標平台
- [ ] 複製對應配置文件到專案根目錄
- [ ] 根據平台指南進行部署
- [ ] 驗證安全 Headers 是否生效
- [ ] 測試所有功能正常運作
- [ ] 檢查無障礙功能相容性

## 🚨 故障排除

### CSP 錯誤
如果遇到 Content Security Policy 錯誤：
1. 檢查瀏覽器控制台的具體錯誤訊息
2. 根據錯誤調整 CSP 規則
3. 測試調整後的配置

### HSTS 問題
如果 HSTS 未生效：
1. 確認網站使用 HTTPS
2. 檢查 Header 語法是否正確
3. 清除瀏覽器快取重新測試

### 平台特定問題
請參考各平台的 README.md 文件中的故障排除章節。

## 🔄 更新維護

1. **定期檢查**：每月檢查安全 Headers 是否正常
2. **安全更新**：根據最新安全建議更新配置
3. **相容性測試**：確保新配置不影響現有功能

## 📞 技術支援

如需協助，請參考：
- [GitHub Issues](https://github.com/moda-gov-tw/DB-Card/issues)
- [安全操作手冊](../docs/SECURITY-OPERATIONS-MANUAL.md)
- [技術文檔](../docs/)

---

**⚠️ 重要提醒**：部署前請務必在測試環境驗證所有配置，確保不影響現有功能。