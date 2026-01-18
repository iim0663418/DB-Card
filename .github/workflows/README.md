# GitHub Actions Setup Guide

## Required Secrets

在 GitHub Repository Settings > Secrets and variables > Actions 中新增以下 Secrets：

### 1. CLOUDFLARE_API_TOKEN

**取得方式**:
1. 登入 Cloudflare Dashboard
2. 前往 My Profile > API Tokens
3. 點擊 "Create Token"
4. 使用 "Edit Cloudflare Workers" 模板
5. 設定權限：
   - Account > Workers Scripts > Edit
   - Account > Account Settings > Read
6. 複製生成的 Token

**在 GitHub 中設定**:
```
Name: CLOUDFLARE_API_TOKEN
Value: <your_token_here>
```

### 2. CLOUDFLARE_ACCOUNT_ID

**取得方式**:
1. 登入 Cloudflare Dashboard
2. 選擇任一網域
3. 右側欄位會顯示 "Account ID"
4. 複製 Account ID

**在 GitHub 中設定**:
```
Name: CLOUDFLARE_ACCOUNT_ID
Value: <your_account_id>
```

## Workflow 觸發條件

- **Push to `develop` branch**: 自動部署到 Staging
- **Push to `main` branch**: 自動部署到 Production
- **Pull Request to `main`**: 執行 Type Check（不部署）

## 部署流程

1. Checkout code
2. Setup Node.js 18
3. Install dependencies
4. Run TypeScript type check
5. Deploy to Cloudflare Workers
6. Run health check

## 驗證部署

部署完成後，可訪問：
- Staging: `https://your-worker.workers.dev/health`
- Production: `https://your-worker.workers.dev/health`

預期回應：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-18T14:00:00.000Z",
    "kek": {
      "version": 1,
      "status": "active"
    },
    "database": {
      "active_cards": 0
    }
  }
}
```

## 故障排除

如果部署失敗，檢查：
1. Secrets 是否正確設定
2. Cloudflare API Token 權限是否足夠
3. wrangler.toml 配置是否正確
4. GitHub Actions 日誌中的詳細錯誤訊息
