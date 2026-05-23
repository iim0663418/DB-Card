# 部署指南

## 前置需求

- Node.js 18+
- Cloudflare 帳號
- Wrangler CLI (`npm install -g wrangler`)

## 1. 環境準備

```bash
git clone https://github.com/iim0663418/DB-Card.git
cd DB-Card/workers
npm install
wrangler login
```

## 2. 設定環境變數

```bash
cp .dev.vars.example .dev.vars
```

編輯 `.dev.vars`：

| 變數名稱 | 用途 | 生成方式 |
|---------|------|---------|
| `SETUP_TOKEN` | 管理員登入 Token | 自訂強密碼 |
| `KEK` | 主加密金鑰 | `crypto.randomBytes(32).toString('base64')` |
| `JWT_SECRET` | JWT 簽名密鑰 | `crypto.randomBytes(32).toString('base64')` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Google Cloud Console |

```bash
node -e "console.log('KEK:', require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('JWT_SECRET:', require('crypto').randomBytes(32).toString('base64'))"
```

## 3. 創建 D1 資料庫

```bash
wrangler d1 create db-card-staging
wrangler d1 create db-card-production
```

更新 `wrangler.toml` 中的 database_id。

## 4. 初始化資料庫

```bash
for file in migrations/*.sql; do
  npx wrangler d1 execute DB --local --file="$file"
done
```

## 5. 設定 Secrets (生產環境)

```bash
wrangler secret put SETUP_TOKEN
wrangler secret put KEK
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put JWT_SECRET
```

## 6. 本地開發

```bash
npm run dev          # http://localhost:8787
npm test             # 測試
npm run typecheck    # TypeScript 檢查
```

## 7. 部署

```bash
npm run deploy:staging      # Staging
npm run deploy:production   # Production
```

## 8. 驗證

```bash
curl https://your-worker.workers.dev/health
```

## 隱私政策管理

### 查看版本
```bash
wrangler d1 execute DB --remote --command "SELECT version, effective_date, is_active FROM privacy_policy_versions ORDER BY effective_date DESC"
```

### 發布新版本
```bash
wrangler d1 execute DB --remote --command "UPDATE privacy_policy_versions SET is_active = 0 WHERE version = 'v1.0.0'"
wrangler d1 execute DB --remote --command "INSERT INTO privacy_policy_versions (version, content_zh, content_en, effective_date, is_active) VALUES ('v1.1.0', '...', '...', $(date +%s)000, 1)"
```

## 資料庫遷移

目前共有 33+ 個 migrations，依序執行：

```bash
# Staging
for file in migrations/*.sql; do
  npx wrangler d1 execute DB --remote --file="$file"
done

# Production
for file in migrations/*.sql; do
  npx wrangler d1 execute DB --remote --env production --file="$file"
done
```

## KEK 輪替

```bash
npm run kek:rewrap
```

## 回滾

在 Cloudflare Dashboard > Workers > Deployments 選擇舊版本回滾。
