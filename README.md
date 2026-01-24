# DB-Card - NFC 數位名片系統 v4.3.2

企業級 NFC 數位名片系統 | 隱私優先 · 安全至上 · OIDC 認證

## 最新更新

### v4.3.2 (2026-01-24) - OIDC Phase 2 完成
- ✅ Nonce 防重放攻擊 (OpenID Connect Core 1.0)
- ✅ Discovery Endpoint 動態配置
- ✅ OIDC 合規度：90%
- ✅ 所有核心安全功能完整

### v4.3.1 (2026-01-24) - OIDC Phase 1 完成
- ✅ ID Token 驗證 (iss/aud/exp/iat/sub)
- ✅ JWKS 公鑰驗證與快取
- ✅ Clock skew 容忍 (±60s)
- ✅ 向後相容 (降級到 UserInfo API)

### v4.3.0 (2026-01-22) - Passkey 認證
- 個別管理員策略 (附加而非替換)
- 緊急恢復路徑 (保留 SETUP_TOKEN)
- 符合業界最佳實踐 (SupportDevs, Tailscale, Corbado)

---

## 核心特性

### OpenID Connect (OIDC) 認證
- **ID Token 驗證**: iss/aud/exp/iat/sub 完整驗證
- **JWKS 公鑰驗證**: 自動快取與輪替
- **Nonce 防重放**: 一次性使用，600 秒 TTL
- **Discovery Endpoint**: 動態配置，24 小時快取
- **合規度**: 90% (OpenID Connect Core 1.0)

### 企業級安全架構
- **信封加密**: 每張名片獨立 DEK，KEK 定期輪換
- **授權會話機制 (ReadSession)**: 24 小時 TTL，可撤銷、可限制同時讀取數
- **即時撤銷**: NFC 重新觸碰即可撤銷上一個會話
- **審計日誌**: 完整記錄所有存取行為，IP 匿名化保護隱私

### Cloudflare Workers 架構
- **全球邊緣運算**: 低延遲、高可用性
- **D1 Database**: SQLite 相容的分散式資料庫
- **無伺服器**: 自動擴展，按需計費

### 使用者體驗
- **一觸即用**: NFC 觸碰自動創建授權會話
- **雙語支援**: 中英文動態切換
- **離線 QR 碼**: 無網路環境下生成 vCard QR 碼
- **智慧 vCard**: 自動生成聯絡人檔案

### 管理後台
- **完整 CRUD**: 創建、讀取、更新、刪除名片
- **即時監控**: KEK 版本、活躍名片數統計
- **緊急撤銷**: 全域撤銷機制
- **HttpOnly Cookies**: XSS 防護

---

## 安全掃描結果

本專案已通過三項安全掃描工具驗證（2026-01-24）：

### 1. OWASP ZAP 掃描 (Web 應用程式安全)
- **評級**: A
- **結果**: 52 PASS, 15 WARN, 0 FAIL
- **環境**: Staging (db-card-staging.csw30454.workers.dev)
- **狀態**: 所有中高風險漏洞已修復
- **安全標頭**: 9 個完整實作
  - Content-Security-Policy (CSP with nonce)
  - Strict-Transport-Security (HSTS)
  - X-Frame-Options, X-Content-Type-Options
  - Cross-Origin-Embedder-Policy (COEP)
  - Cross-Origin-Opener-Policy (COOP)
  - Cross-Origin-Resource-Policy (CORP)

### 2. npm audit 掃描 (Node.js 依賴安全)
- **漏洞數**: 0
- **掃描範圍**: 所有 npm 依賴
- **最近修復**: wrangler OS Command Injection (GHSA-36p8-mvp6-cv38)
- **狀態**: 所有依賴安全無虞

### 3. OSV-Scanner 掃描 (多語言依賴安全)
- **漏洞數**: 0
- **掃描範圍**: 806 個套件 (3 個 lockfiles)
- **最近修復**: js-yaml Prototype Pollution (CVE-2025-64718)
- **資料來源**: Google OSV Database

**掃描報告**: `docs/security/scan-reports/`

---

## 快速開始

### 1. 環境準備

```bash
# 安裝依賴
cd workers
npm install

# 設定環境變數
cp .dev.vars.example .dev.vars
# 編輯 .dev.vars 設定：
# - SETUP_TOKEN: 管理員認證 token
# - KEK: 主加密金鑰
# - GOOGLE_CLIENT_ID/SECRET: OAuth
# - JWT_SECRET: JWT 簽名密鑰 (至少 32 bytes)

# 生成 JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**重要**：請參閱 [JWT Secret 管理指南](docs/JWT_SECRET_MANAGEMENT.md)

### 2. 本地開發

```bash
npm run dev          # 啟動開發伺服器
npm test             # 執行測試
npm run deploy:staging    # 部署到 staging
npm run deploy:production # 部署到 production
```

### 3. 資料庫初始化

```bash
# 本地開發環境
npx wrangler d1 execute DB --local --file=./migrations/0001_initial_schema.sql

# 生產環境
npx wrangler d1 execute DB --remote --file=./migrations/0001_initial_schema.sql
```

---

## OIDC 認證流程

### 登入流程
1. 使用者點擊 Google 登入
2. 前端呼叫 `/api/oauth/init` 取得 state 和 nonce
3. 重定向到 Google OAuth (含 state 和 nonce)
4. Google 回傳 authorization code
5. 後端驗證 state 和 nonce
6. 交換 ID Token
7. 驗證 ID Token (iss/aud/exp/iat/sub/nonce)
8. 使用 JWKS 驗證簽章
9. 設定 HttpOnly Cookie
10. 登入成功

### 安全特性
- ✅ **State Parameter**: CSRF 防護 (600s TTL)
- ✅ **Nonce**: 防重放攻擊 (600s TTL, 一次性使用)
- ✅ **ID Token**: JWT 簽章驗證
- ✅ **JWKS Cache**: 公鑰快取 (3600s TTL)
- ✅ **Discovery Cache**: 端點配置快取 (86400s TTL)
- ✅ **Clock Skew**: ±60 秒容忍

---

## API 端點

### 公開 API
- `POST /api/nfc/tap` - NFC 觸碰創建會話
- `GET /api/read` - 讀取名片資料
- `GET /health` - 系統健康檢查
- `GET /api/oauth/init` - OAuth 初始化 (取得 state 和 nonce)
- `GET /oauth/callback` - OAuth 回調

### 管理 API (需認證)
- `POST /api/admin/login` - 登入
- `POST /api/admin/logout` - 登出
- `GET /api/admin/cards` - 列出所有名片
- `POST /api/admin/cards` - 創建名片
- `PUT /api/admin/cards/:uuid` - 更新名片
- `DELETE /api/admin/cards/:uuid` - 刪除名片
- `POST /api/admin/revoke` - 撤銷會話
- `POST /api/admin/kek/rotate` - KEK 輪換

詳細文檔: `docs/api/`

---

## 安全標準合規

### OIDC 合規度: 90%
- ✅ Scope: openid email profile
- ✅ Authorization Code Flow
- ✅ State Parameter (CSRF Protection)
- ✅ ID Token Validation
- ✅ JWKS Verification
- ✅ Nonce (Anti-Replay)
- ✅ Discovery Endpoint
- ⏳ Sub as Primary Key (Phase 3, 可選)

### 安全標準
- ✅ OpenID Connect Core 1.0
- ✅ OpenID Connect Discovery 1.0
- ✅ RFC 7519 (JWT)
- ✅ RFC 6749 (OAuth 2.0)
- ✅ OWASP OAuth2 Cheat Sheet
- ✅ Google OIDC Certified

---

## 測試

```bash
npm test                 # 單元測試
npm run test:integration # 整合測試
npm run test:e2e        # 端對端測試
```

---

## 開發指南

### BDD 規格驅動開發
所有功能開發均遵循 BDD 規格，位於 `.specify/specs/`

### 架構決策記錄 (ADR)
重要技術決策記錄於 `docs/adr/`：
- ADR-001: 隱私優先設計原則
- ADR-002: 信封加密架構

---

## 授權條款

Apache License 2.0 - 詳見 [LICENSE](LICENSE)

完整的第三方元件清單與授權資訊請參閱：[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)

---

## 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 撰寫 BDD 規格（`.specify/specs/`）
4. 實作功能並通過測試
5. 提交變更 (`git commit -m 'feat: add amazing feature'`)
6. 推送分支 (`git push origin feature/amazing-feature`)
7. 開啟 Pull Request

---

## 技術支援

- **文檔**: `docs/`
- **Issues**: [GitHub Issues](https://github.com/iim0663418/DB-Card/issues)

---

## 版本歷程

### v4.3.2 (2026-01-24) - OIDC Phase 2
- Nonce 防重放攻擊
- Discovery Endpoint 動態配置
- OIDC 合規度 90%

### v4.3.1 (2026-01-24) - OIDC Phase 1
- ID Token 驗證
- JWKS 公鑰驗證
- OIDC 合規度 80%

### v4.3.0 (2026-01-22) - Passkey 認證
- 個別管理員策略
- 緊急恢復路徑
- 符合業界最佳實踐

### v4.2.1 (2026-01-21) - OWASP Top 10 修復
- SRI 75% 覆蓋率
- HttpOnly Cookies
- DOMPurify XSS 防護
- CSP Nonce-based

### v4.2.0 (2026-01-20) - 雙層快取優化
- 前端 sessionStorage 快取
- 後端混合快取策略

### v4.1.0 (2026-01-20) - 多層防護機制
- 60 秒去重 + 速率限制 + 併發讀取限制

---

**企業級安全，隱私優先設計，OIDC 認證**  
**Cloudflare Workers 全球邊緣運算**
  },
  "database": {
    "active_cards": 42
  }
}
```

### 審計日誌

所有敏感操作均記錄於 `audit_logs` 表：
- 名片創建/更新/刪除
- 會話創建/讀取
- KEK 輪換
- IP 地址自動匿名化（保留前 3 段）

## 從 v3.X 遷移

v3.X 純前端架構已封存至 `archive/` 目錄，包含：
- PWA 離線儲存系統
- 雙語翻譯模組
- 安全架構模組

v4.0 採用後端 API 架構，提供更強的安全性與管理能力。

**主要差異**：
- v3.X: 資料儲存在 NFC 卡片 URL 參數（Base64）
- v4.0: 資料加密儲存於 D1 Database，NFC 卡片僅含 UUID

**遷移步驟**：
1. 使用 admin-dashboard.html 創建新名片
2. 透過管理後台取得 card_uuid
3. 將 UUID 寫入 NFC 卡片（格式：`https://your-domain/card-display.html?card={uuid}`）

詳細遷移指南請參考 `archive/README.md`

## 測試

```bash
# 單元測試
npm test

# 整合測試
npm run test:integration

# 端對端測試
npm run test:e2e
```

## 開發指南

### BDD 規格驅動開發

所有功能開發均遵循 BDD 規格，位於 `.specify/specs/`：
- `nfc-tap-api.md` - NFC 觸碰 API
- `read-api.md` - 讀取 API
- `admin-crud-apis.md` - 管理 CRUD API
- `security-enhancements.md` - 安全增強

### 架構決策記錄 (ADR)

重要技術決策記錄於 `docs/adr/`：
- ADR-001: 隱私優先設計原則
- ADR-002: 信封加密架構

### 記憶系統

開發過程使用知識圖譜記憶系統（`.specify/memory/`）：
- `progress.md` - 當前開發進度
- `knowledge_graph.mem` - 長期知識歸檔

## 授權條款

Apache License 2.0 - 詳見 [LICENSE](LICENSE)

### 第三方元件授權

本專案使用多個開源元件與字體，所有依賴均為開源授權（MIT、ISC、Apache 2.0、SIL OFL 1.1），允許商業使用。

完整的第三方元件清單與授權資訊請參閱：[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)

## 貢獻指南

歡迎提交 Issue 和 Pull Request！

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 撰寫 BDD 規格（`.specify/specs/`）
4. 實作功能並通過測試
5. 提交變更 (`git commit -m 'feat: add amazing feature'`)
6. 推送分支 (`git push origin feature/amazing-feature`)
7. 開啟 Pull Request

## 技術支援

- **文檔**: `docs/`
- **Issues**: [GitHub Issues](https://github.com/iim0663418/DB-Card/issues)

## 版本歷程

### v4.3.0 (2026-01-22) - Passkey 個別管理員策略
- 實作個別管理員 Passkey 策略（符合業界最佳實踐）
- SETUP_TOKEN 登入需要 email（個別檢查 passkey_enabled）
- 兩種登入方式並列顯示（附加而非替換）
- 設計系統統一（純色風格，主色 #6868ac）
- 完整 BDD 規格（5 scenarios）
- 引用最佳實踐：SupportDevs, Tailscale, Corbado

### v4.2.1 (2026-01-21) - OWASP Top 10 安全修復
---

## 版本歷程

### v4.3.0 (2026-01-22) - Passkey 認證
- 個別管理員策略（附加而非替換）
- 緊急恢復路徑（保留 SETUP_TOKEN）
- 符合業界最佳實踐（SupportDevs, Tailscale, Corbado）

### v4.2.1 (2026-01-21) - OWASP Top 10 修復
- SRI 75% 覆蓋率
- HttpOnly Cookies 認證（移除 localStorage）
- DOMPurify XSS 防護（消毒 25 個 innerHTML）
- CSP Nonce-based（移除 unsafe-inline）
- 依賴更新（QRious, DOMPurify, Lucide, Chart.js）
- 安全評級提升至「高」

### v4.2.0 (2026-01-20) - 雙層快取優化
- 前端 sessionStorage 快取（性能提升 95%）
- 後端混合快取策略（依名片類型差異化）
- sensitive 名片不快取解密資料（最高安全）
- personal/event 名片快取 60s（從 300s 縮短）

### v4.1.0 (2026-01-20) - 多層防護機制
- NFC Tap API 三層防護（Dedup + Rate Limit + Max Reads）
- 60 秒去重機制（防止重複請求）
- 雙維度速率限制（Card UUID + IP: 10/min, 50/hour）
- Sliding Window Counter 算法
- IP 優先提取（CF-Connecting-IP）
- 防爬蟲與資源濫用保護
- 完整 BDD 規格（11 scenarios）

### v4.0.1 (2026-01-19) - 性能優化與永久刪除
- 前端性能優化（阻塞資源大幅減少）
- API 性能提升（Tap API 72-79%, Read API 44%）
- 永久刪除功能（協助重置）
- 首頁產品介紹優化
- LLM 友善文檔

### v4.0.0 (2026-01-18) - 企業級安全架構
- 信封加密機制
- 授權會話系統
- 完整雙語支援（11 個 i18n keys）
- 安全監控儀表板（7 個 APIs）
- 表單驗證與清理
- KEK 遷移基礎設施
- 管理後台完整 CRUD
- HttpOnly Cookies 安全增強
- 審計日誌與監控

### v3.2.1 (2025-08-09) - PWA 穩定版
- PWA 離線儲存
- 雙語翻譯系統
- 安全架構模組
- 已封存至 `archive/v3-pwa/`

---

**企業級安全，隱私優先設計**  
**Cloudflare Workers 全球邊緣運算**
