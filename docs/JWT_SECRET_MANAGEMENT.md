# JWT Secret 管理指南

## 概述

DB-Card 系統使用 JWT (JSON Web Token) 進行使用者認證。JWT Secret 是用於簽名和驗證 token 的密鑰，必須妥善保管。

---

## 當前配置

### 演算法
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Key Length**: 32 bytes (256 bits)
- **Encoding**: Base64

### Token 規格
- **Issuer**: `db-card-api`
- **Expiration**: 1 hour
- **Claims**: `sub`, `email`, `name`, `picture`, `iat`, `exp`, `iss`

---

## Secret 生成

### 生成新的 JWT Secret

使用 Node.js crypto 模組生成強隨機密鑰：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**範例輸出**：
```
/IeoBmI6xArg8o7Bti6hbLfUwRDsOD48Hn/U3Pn7o9M=
```

### 最低要求
- ✅ 至少 32 bytes (256 bits)
- ✅ 使用加密安全的隨機數生成器
- ✅ Base64 編碼（方便儲存）
- ❌ 不要使用可預測的字串
- ❌ 不要使用短密鑰

---

## 環境配置

### 開發環境 (.dev.vars)

```bash
# JWT Secret for token signing
# Generated: YYYY-MM-DD with crypto.randomBytes(32)
# Algorithm: HS256, 32 bytes base64-encoded
JWT_SECRET=<YOUR_GENERATED_SECRET_HERE>
```

**生成方法**：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Staging 環境

```bash
cd workers
echo "YOUR_SECRET_HERE" | wrangler secret put JWT_SECRET --env staging
```

### Production 環境

```bash
cd workers
echo "YOUR_SECRET_HERE" | wrangler secret put JWT_SECRET --env production
```

**重要**：
- ⚠️ Staging 和 Production 應使用不同的 secret
- ⚠️ 不要將 secret 提交到 Git
- ⚠️ 定期輪換 secret（建議每 90 天）

---

## Secret 輪換

### 何時需要輪換

- 🔴 **立即輪換**：
  - Secret 洩漏或懷疑洩漏
  - 員工離職（有權限存取者）
  - 安全事件發生

- 🟡 **定期輪換**：
  - 每 90 天（建議）
  - 每 180 天（最低要求）

### 輪換步驟

#### 1. 生成新 Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 2. 更新環境變數
```bash
# Staging
echo "NEW_SECRET" | wrangler secret put JWT_SECRET --env staging

# Production
echo "NEW_SECRET" | wrangler secret put JWT_SECRET --env production
```

#### 3. 部署新版本
```bash
wrangler deploy --env staging
wrangler deploy --env production
```

#### 4. 驗證
- 測試新登入流程
- 確認舊 token 失效
- 監控錯誤日誌

#### 5. 通知使用者（如需要）
- 所有使用者需要重新登入
- 舊 token 立即失效

---

## 安全最佳實踐

### ✅ 應該做的

1. **使用強隨機密鑰**
   ```bash
   # 好的做法
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **使用 Wrangler Secrets**
   ```bash
   # 好的做法
   wrangler secret put JWT_SECRET --env production
   ```

3. **定期輪換**
   - 設定日曆提醒
   - 記錄輪換歷史（不記錄實際 secret）

4. **限制存取權限**
   - 僅授權人員可存取
   - 使用 Cloudflare Access 控制

5. **監控異常**
   - 監控 401 錯誤率
   - 監控 JWT 驗證失敗

6. **安全儲存記錄**
   - 使用加密的密碼管理器（如 1Password, Bitwarden）
   - 不要在文件中明文記錄 secret
   - 不要在 Slack/Email 中傳送 secret

### ❌ 不應該做的

1. **不要使用弱密鑰**
   ```bash
   # 錯誤示範
   JWT_SECRET=mysecret123
   JWT_SECRET=db-card-secret
   ```

2. **不要提交到 Git**
   ```bash
   # 確保 .dev.vars 在 .gitignore 中
   echo ".dev.vars" >> .gitignore
   ```

3. **不要在程式碼中硬編碼**
   ```typescript
   // ❌ 錯誤
   const secret = "my-secret-key";
   
   // ✅ 正確
   const secret = env.JWT_SECRET;
   ```

4. **不要在日誌中輸出**
   ```typescript
   // ❌ 錯誤
   console.log('JWT Secret:', env.JWT_SECRET);
   
   // ✅ 正確
   console.log('JWT verification failed');
   ```

5. **不要在前端暴露**
   - JWT Secret 僅存在於後端
   - 前端僅儲存 signed token

---

## 故障排除

### 問題 1: "Invalid or expired token"

**原因**：
- Token 已過期（1 小時）
- Secret 已更換但 token 是舊 secret 簽發
- Token 格式錯誤

**解決方案**：
1. 重新登入取得新 token
2. 檢查 secret 是否正確設定
3. 檢查 token 格式

### 問題 2: "JWT verification failed"

**原因**：
- Secret 不匹配
- Token 被篡改
- Algorithm 不匹配

**解決方案**：
1. 確認環境變數正確設定
2. 檢查 wrangler secret list
3. 重新部署

### 問題 3: 所有使用者突然登出

**原因**：
- Secret 已輪換
- 部署了新版本

**解決方案**：
- 這是正常行為
- 使用者重新登入即可

---

## 檢查清單

### 部署前檢查

- [ ] JWT_SECRET 已設定（至少 32 bytes）
- [ ] Secret 未提交到 Git
- [ ] Staging 和 Production 使用不同 secret
- [ ] 已測試登入流程
- [ ] 已測試 token 過期處理

### 定期檢查（每季）

- [ ] Secret 是否需要輪換（90 天）
- [ ] 存取權限是否需要更新
- [ ] 監控日誌是否有異常
- [ ] 備份當前 secret（加密儲存）

---

## 相關文件

- [OAuth 2.0 整合指南](./OAUTH_SETUP.md)
- [安全架構文件](../docs/adr/002-security-architecture.md)
- [部署指南](./DEPLOYMENT.md)

---

## 聯絡資訊

如有安全疑慮，請立即聯絡：
- **安全團隊**: security@db-card.example.com
- **技術負責人**: tech-lead@db-card.example.com

---

**最後更新**: 2026-01-19  
**版本**: 1.0.0
