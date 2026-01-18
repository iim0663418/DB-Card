# DB-Card - NFC 數位名片系統 v4.0

基於「隱私優先」與「安全至上」理念的企業級 NFC 數位名片系統

## v4.0 核心特性

### 企業級安全架構
- **信封加密 (Envelope Encryption)**: 每張名片獨立 DEK，KEK 定期輪換
- **授權會話機制 (ReadSession)**: 24 小時 TTL，可撤銷、可限制讀取次數
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

## 專案結構

```
DB-Card/
├── workers/                        # v4.0 核心系統
│   ├── src/
│   │   ├── index.ts                # 主路由與中介層
│   │   ├── types.ts                # TypeScript 類型定義
│   │   ├── handlers/               # API 處理器
│   │   │   ├── tap.ts              # POST /api/nfc/tap
│   │   │   ├── read.ts             # GET /api/read
│   │   │   ├── health.ts           # GET /health
│   │   │   └── admin/              # 管理 API
│   │   │       ├── cards.ts        # CRUD 操作
│   │   │       ├── auth.ts         # 登入/登出
│   │   │       ├── revoke.ts       # 撤銷機制
│   │   │       └── kek.ts          # KEK 輪換
│   │   ├── middleware/
│   │   │   └── auth.ts             # 時序安全認證
│   │   ├── crypto/
│   │   │   └── envelope.ts         # 信封加密實作
│   │   └── utils/
│   │       ├── session.ts          # 會話管理
│   │       ├── policy.ts           # 名片類型策略
│   │       ├── audit.ts            # 審計日誌
│   │       └── response.ts         # CORS 與回應
│   ├── public/                     # 前端資源
│   │   ├── admin-dashboard.html    # 管理後台
│   │   ├── nfc-generator.html      # 名片生成器
│   │   ├── card-display.html       # 名片顯示頁
│   │   ├── js/
│   │   │   ├── api.js              # API 客戶端
│   │   │   ├── storage.js          # IndexedDB
│   │   │   ├── main.js             # 主邏輯
│   │   │   └── error-handler.js    # 錯誤處理
│   │   └── css/
│   │       └── v4-design.css       # v4.0 設計系統
│   ├── migrations/
│   │   └── 0001_initial_schema.sql # 資料庫結構
│   ├── wrangler.toml               # Cloudflare 配置
│   └── package.json                # 依賴管理
├── docs/                           # 技術文檔
│   ├── adr/                        # 架構決策記錄
│   │   ├── 001-privacy-first.md
│   │   └── 002-security-architecture.md
│   └── api/                        # API 文檔
│       ├── nfc-tap.md
│       ├── read.md
│       └── admin-apis.md
├── .specify/                       # 開發記憶系統
│   ├── specs/                      # BDD 規格書
│   └── memory/                     # 知識圖譜
└── archive/                        # v3.X 參考實作
    ├── v3-frontend/                # 純前端版本
    ├── v3-pwa/                     # PWA 離線系統
    └── README.md                   # 封存說明
```

## 快速開始

### 1. 環境準備

```bash
# 安裝依賴
cd workers
npm install

# 設定環境變數
cp .dev.vars.example .dev.vars
# 編輯 .dev.vars 設定 SETUP_TOKEN 和 KEK
```

### 2. 本地開發

```bash
# 啟動開發伺服器
npm run dev

# 執行測試
npm test

# 部署到 staging
npm run deploy:staging

# 部署到 production
npm run deploy:production
```

### 3. 資料庫初始化

```bash
# 本地開發環境
npx wrangler d1 execute DB --local --file=./migrations/0001_initial_schema.sql

# 生產環境
npx wrangler d1 execute DB --remote --file=./migrations/0001_initial_schema.sql
```

## 使用流程

### 使用者端

1. **NFC 觸碰**: 手機觸碰 NFC 卡片
2. **自動授權**: 系統創建 24 小時授權會話
3. **查看名片**: 瀏覽器開啟名片顯示頁
4. **下載 vCard**: 一鍵加入聯絡人
5. **離線分享**: 生成 vCard QR 碼

### 管理端

1. **登入後台**: `https://your-domain/admin-dashboard.html`
2. **創建名片**: 填寫 11 個欄位（對齊 nfc-generator）
3. **編輯名片**: 表單自動預填現有資料
4. **查看名片**: 自動創建會話並開啟預覽
5. **撤銷會話**: 緊急情況下全域撤銷

## 安全特性

### 信封加密架構

```
┌─────────────────────────────────────────┐
│  NFC Card (Plaintext card_uuid)        │
└─────────────────┬───────────────────────┘
                  │ Tap
                  ▼
┌─────────────────────────────────────────┐
│  POST /api/nfc/tap                      │
│  - Create ReadSession (24h TTL)         │
│  - Return session token                 │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  GET /api/read?session={token}          │
│  1. Validate session                    │
│  2. Fetch encrypted_dek + ciphertext    │
│  3. Unwrap DEK with KEK                 │
│  4. Decrypt card data with DEK          │
│  5. Return plaintext to user            │
└─────────────────────────────────────────┘
```

### 名片類型策略

| 類型 | TTL | 最大讀取次數 | 使用場景 |
|------|-----|-------------|---------|
| personal | 24h | 20 | 個人名片 |
| event_booth | 24h | 50 | 展會攤位 |
| sensitive | 24h | 5 | 敏感資訊 |

### 撤銷機制

- **單一撤銷**: 重新觸碰 NFC 卡片（10 分鐘內或 2 次讀取內）
- **全域撤銷**: 管理後台 `POST /api/admin/revoke`
- **緊急響應**: KEK 輪換使所有舊會話失效

## API 端點

### 公開 API

- `POST /api/nfc/tap` - NFC 觸碰創建會話
- `GET /api/read` - 讀取名片資料
- `GET /health` - 系統健康檢查

### 管理 API (需認證)

- `POST /api/admin/login` - 登入
- `POST /api/admin/logout` - 登出
- `GET /api/admin/cards` - 列出所有名片
- `GET /api/admin/cards/:uuid` - 取得單一名片
- `POST /api/admin/cards` - 創建名片
- `PUT /api/admin/cards/:uuid` - 更新名片
- `DELETE /api/admin/cards/:uuid` - 刪除名片
- `POST /api/admin/revoke` - 撤銷會話
- `POST /api/admin/kek/rotate` - KEK 輪換

詳細 API 文檔請參考 `docs/api/`

## 監控與日誌

### 健康檢查

```bash
curl https://your-domain/health
```

回應範例：
```json
{
  "status": "healthy",
  "timestamp": "2026-01-18T10:30:00.000Z",
  "kek": {
    "version": 1,
    "status": "active"
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
1. 使用 nfc-generator.html 創建新名片
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

MIT License - 詳見 [LICENSE](LICENSE)

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
- **Email**: iim0663418@moda.gov.tw

## 版本歷程

### v4.0.0 (2026-01-18) - 企業級安全架構
- 信封加密機制
- 授權會話系統
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
