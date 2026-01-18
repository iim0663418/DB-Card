# GitHub Secrets 設定資訊

## 您的 Cloudflare 帳號資訊

**Email**: csw30454@gmail.com  
**Account ID**: `2ea884050052b2cb8039c0c1285219df`

---

## 需要設定的 GitHub Secrets

### 1. CLOUDFLARE_ACCOUNT_ID
```
Name: CLOUDFLARE_ACCOUNT_ID
Value: 2ea884050052b2cb8039c0c1285219df
```

### 2. CLOUDFLARE_API_TOKEN
**取得方式**:
1. 前往: https://dash.cloudflare.com/profile/api-tokens
2. 點擊 "Create Token"
3. 使用 "Edit Cloudflare Workers" 模板
4. 複製生成的 Token

```
Name: CLOUDFLARE_API_TOKEN
Value: <從 Cloudflare 複製的 Token>
```

---

## 設定步驟

### 方法 1: 使用 GitHub Web UI
1. 前往: https://github.com/[your-username]/DB-Card/settings/secrets/actions
2. 點擊 "New repository secret"
3. 依序新增上述 2 個 Secrets

### 方法 2: 使用 GitHub CLI (如已安裝)
```bash
# 設定 Account ID
gh secret set CLOUDFLARE_ACCOUNT_ID -b"2ea884050052b2cb8039c0c1285219df"

# 設定 API Token (會提示輸入)
gh secret set CLOUDFLARE_API_TOKEN
```

---

## 驗證設定

設定完成後，執行：
```bash
# 創建 develop branch
git checkout -b develop
git push origin develop

# 查看 GitHub Actions
# https://github.com/[your-username]/DB-Card/actions
```

---

## 當前 Token 權限 (已驗證)
✅ account (read)
✅ workers (write)
✅ workers_scripts (write)
✅ d1 (write)

**權限充足，可直接使用！**
