# DB-Card - NFC 數位名片系統 v4.3.2

企業級 NFC 數位名片系統 | 隱私優先 · 安全至上

## 最新更新

### v4.3.2 (2026-01-22) - P1 安全修復
- CSRF Token 防護 (32 bytes, timing-safe)
- 會話固定攻擊防護 (crypto.randomUUID)
- 並發會話限制 (最多 3 個)

### v4.3.1 (2026-01-22) - P0 安全修復
- 登入速率限制 (5 次/15 分鐘)
- Email 格式驗證 (防 SQL 注入)
- 條件式 Console Logging (生產環境無 log)

### v4.3.0 (2026-01-22) - Passkey 認證
- 個別管理員策略 (附加而非替換)
- 緊急恢復路徑 (保留 SETUP_TOKEN)
- 符合業界最佳實踐 (SupportDevs, Tailscale, Corbado)

### v4.2.1 (2026-01-21) - OWASP Top 10 修復
- SRI 75% 覆蓋率 (Three.js, QRious, DOMPurify)
- HttpOnly Cookies (移除 localStorage)
- DOMPurify XSS 防護 (25 個 innerHTML)
- CSP Nonce-based (移除 unsafe-inline)
- 依賴更新 (QRious 4.0.2, DOMPurify 3.2.7)
- **安全評級**: 🟡 中等 → 🟢 高

### v4.2.0 (2026-01-20) - 雙層快取優化
- 前端 sessionStorage 快取 (性能提升 95%)
- 後端混合快取策略 (sensitive 不快取, personal/event 60s)

### v4.1.0 (2026-01-20) - 多層防護機制
- 60 秒去重 + 速率限制 (10/min, 50/hour) + 併發讀取限制

---

## 核心特性

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

## 使用流程

### 使用者端
1. NFC 觸碰 → 2. 自動授權 → 3. 查看名片 → 4. 下載 vCard → 5. 離線分享

### 管理端
1. 登入後台 → 2. 創建名片 → 3. 編輯名片 → 4. 查看名片 → 5. 撤銷會話

---

## 安全特性

### 多層防護架構 (v4.1.0)

**Layer 1: 去重 (60s)** → **Layer 2: 速率限制 (10/min, 50/hour)** → **Layer 3: 併發讀取限制**

### 名片類型策略

| 類型 | TTL | 最大同時讀取數 | 使用場景 |
|------|-----|---------------|---------|
| personal | 24h | 20 | 個人名片 |
| event_booth | 24h | 50 | 展會攤位 |
| sensitive | 24h | 5 | 敏感資訊 |

### 撤銷機制
- **單一撤銷**: 重新觸碰 NFC 卡片
- **全域撤銷**: 管理後台
- **緊急響應**: KEK 輪換

---

## API 端點

### 公開 API
- `POST /api/nfc/tap` - NFC 觸碰創建會話
- `GET /api/read` - 讀取名片資料
- `GET /health` - 系統健康檢查

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

**企業級安全，隱私優先設計**  
**Cloudflare Workers 全球邊緣運算**

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
