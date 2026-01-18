# GitHub Secrets 設定步驟指南

## 步驟 1: 取得 Cloudflare API Token

### 1.1 前往 Cloudflare API Tokens 頁面
```
https://dash.cloudflare.com/profile/api-tokens
```

### 1.2 創建 Token
1. 點擊 "Create Token" 按鈕
2. 選擇 "Edit Cloudflare Workers" 模板
3. 或自訂權限：
   - Account > Workers Scripts > Edit
   - Account > Account Settings > Read
   - Zone > Workers Routes > Edit (可選)

### 1.3 複製 Token
⚠️ Token 只會顯示一次，請立即複製並儲存

---

## 步驟 2: 取得 Cloudflare Account ID

### 2.1 前往 Cloudflare Dashboard
```
https://dash.cloudflare.com
```

### 2.2 找到 Account ID
- 選擇任一網域
- 右側欄位會顯示 "Account ID"
- 或在 Workers & Pages 頁面右側查看

---

## 步驟 3: 設定 GitHub Secrets

### 3.1 前往 GitHub Repository Settings
```
https://github.com/[your-username]/DB-Card/settings/secrets/actions
```

### 3.2 新增 Secret #1
1. 點擊 "New repository secret"
2. Name: `CLOUDFLARE_API_TOKEN`
3. Value: 貼上步驟 1.3 複製的 Token
4. 點擊 "Add secret"

### 3.3 新增 Secret #2
1. 點擊 "New repository secret"
2. Name: `CLOUDFLARE_ACCOUNT_ID`
3. Value: 貼上步驟 2.2 的 Account ID
4. 點擊 "Add secret"

---

## 步驟 4: 驗證設定

### 4.1 檢查 Secrets 列表
應該看到：
- ✅ CLOUDFLARE_API_TOKEN
- ✅ CLOUDFLARE_ACCOUNT_ID

### 4.2 測試部署
```bash
# 創建 develop branch
git checkout -b develop

# Push 觸發 GitHub Actions
git push origin develop
```

### 4.3 查看 Actions 執行狀態
```
https://github.com/[your-username]/DB-Card/actions
```

---

## 常見問題

### Q: 找不到 Account ID？
A: 在 Cloudflare Dashboard 首頁，URL 中包含 Account ID：
```
https://dash.cloudflare.com/[account_id]/workers
```

### Q: API Token 權限不足？
A: 確認 Token 包含以下權限：
- Account > Workers Scripts > Edit
- Account > Account Settings > Read

### Q: GitHub Actions 失敗？
A: 檢查 Actions 日誌，常見錯誤：
- Token 過期或無效
- Account ID 錯誤
- wrangler.toml 配置問題

---

## 快速指令

### 取得 Account ID (使用 wrangler)
```bash
cd workers
wrangler whoami
```

### 測試 Token 有效性
```bash
export CLOUDFLARE_API_TOKEN="your_token_here"
wrangler whoami
```

---

## 安全提醒

⚠️ **絕對不要**：
- 將 API Token 提交到 Git
- 在公開場合分享 Token
- 使用過於寬鬆的權限

✅ **建議做法**：
- 定期輪換 API Token (每 90 天)
- 使用最小權限原則
- 備份 Token 到密碼管理器

---

**設定完成後，回報我以繼續 Task 1.8 驗證！**
