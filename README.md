# DB-Card - NFC 數位名片系統 v5.1.0

安全預設 NFC 數位名片系統 | 隱私優先 · 安全至上 · OIDC 認證 · GDPR 合規

## 最新更新

### v5.1.0 (2026-04-03) - 自建名片 OCR 掃描
- **📷 實體名片掃描建立數位名片** - 拍照即可自動填入表單，大幅簡化建卡流程
  - 新 endpoint: `POST /api/user/cards/extract-draft` — Gemini Vision OCR 雙語辨識
  - Extract Draft 架構: 回傳 `{ value, provenance }` 標記每個欄位來源（observed/translated/inferred）
  - 不使用 Google Search: 自建名片僅需快速草稿，不需外部事實查核，降低延遲與成本
  - 共享 OCR 基礎層: `ocr-helpers.ts` 抽取 retryWithBackoff、parseGeminiJSON、arrayBufferToBase64Chunked
  - 前端 SelfCardOCR 模組: 掃描按鈕 + AI 處理指示器 + 表單自動填入
  - Provenance 標記: 綠點（名片可見）、橙點（AI 翻譯）、灰點（AI 推測），手動編輯後自動移除
  - temp_uploads 流程隔離: `flow` + `extract_schema_version` 欄位（Migration 0049）
  - 上傳共用: 既有 upload endpoint + `X-Upload-Flow: own_card` header
  - 現有建卡流程不變: `POST /api/user/cards` 仍為唯一加密寫入路徑
- **🔧 整合修復**
  - 修復 extract-draft 回應結構解析（unwrap `.fields`）
  - 修復 `website` → `web` 表單欄位映射
  - 修復 API 錯誤訊息顯示 `[object Object]` 問題
  - 修復 provenance badge 在無 `label[for]` 欄位上不顯示的問題

### v5.0.1 (2026-03-07) - 標籤系統與排序修復
- **🏷️ 標籤標準化系統** - 抽取與標準化分離架構，支援篩選與多樣性
  - Schema: category, raw_value, normalized_value 三欄位設計
  - 統一寫入層: tag-service.ts 單一入口，可重建快取
  - AI 抽取: 保留原始語言，後端標準化（台灣市場優化）
  - 前端相容: 篩選用 normalized，顯示用 raw
  - Migration 0039/0040: 446 tags 遷移，85 cards 重新標籤
- **🔧 Batch API 穩定化** - 統一 Cron 路徑，止血卡住的 jobs
  - Migration 0041: 清理超過 48 小時的 stale jobs
  - 簡單版 auto-tag: 20 張/批，單次 Gemini API 呼叫
  - Deprecated: auto-tag-cards-batch.ts（評估期 2 週）
- **📊 Cron Subrequest 優化** - 分離優先與背景任務
  - 優先任務: Auto-tag, Find Candidates, Sync Embeddings, Deduplicate（阻塞執行）
  - 背景任務: 8 個清理任務（ctx.waitUntil 非阻塞）
  - 修復: "Too many API requests" 錯誤
- **🐛 關鍵修復**
  - 排序邏輯: COALESCE(updated_at, created_at) 修復 87% 新卡片排序問題
  - Location 標準化: 支援繁簡體（臺→台），修復台北地區標籤
  - 標籤顯示: 修復 [object Object] 顯示問題，支援物件格式
  - 搜尋 Abort: 區分 timeout vs 用戶取消，消除錯誤訊息
- **📚 文檔完善**
  - 標籤系統架構總覽（4 categories, 標準化規則）
  - 國際化分析（台灣中心設計，擴展路徑）
  - Batch API 決策記錄（2 週評估期）

### v5.0.0 (2026-02-23) - 收到的名片管理系統完成
- **🎯 Gemini Structured Output** - JSON Schema 強制結構化輸出，零解析錯誤
- **多模態 AI 狀態追蹤** - pending/completed/failed 三階段狀態，ocr_error 錯誤記錄
- **統一提取流程** - OCR + Web Search 一次 API 呼叫，30% Token 減少
- **上傳冪等性保證** - idempotency_key UNIQUE 約束，防止重複上傳
- **HEIC 格式檢測與阻擋** - Extension + MIME + Magic Bytes 三重驗證
- **智慧圖片壓縮** - browser-image-compression，目標 1MB，80% 上傳時間減少
- **可靠性提升** - 指數退避重試機制 (3 次 + Jitter)，成功率 70%→95%
- **上傳取消支援** - AbortController 實作，使用者可中斷上傳
- **本地 Vendor 資源** - browser-image-compression 56KB MIT 授權本地化
- **代碼品質** - ESLint warnings 547→44 (87% 改善)，TypeScript 零錯誤
- **全域類型定義** - 33 個 Cloudflare + Web API 類型定義，消除 any 類型
- **資料庫優化** - Migration 0032: idempotency_key + user_email 複合唯一索引

### v4.6.0 (2026-02-26) - KV 使用優化
- **Idempotency 遷移到 Durable Objects** - KV writes 從 500/day 降至 0 (100% 減少)
- **延遲優化** - Idempotency 查詢從 50ms 降至 5ms (90% 改善)
- **無限制擴展** - Durable Objects 無每日 writes 限制
- **自動清理** - alarm() 機制每小時清理過期 keys

### v4.6.0 (2026-02-08) - Icon Bundle 優化完成
- **Vite Tree-Shaking** - Lucide Icons 從 379 KB 降至 12.33 KB (96.8% 減少)
- **ES Module 遷移** - 65 個實際使用的 icons，移除 1,400+ 未使用 icons
- **效能提升** - 預期 FCP 改善 50%+, LCP 改善 40%+
- **Build System** - Vite + esbuild minifier 自動化打包
- **全域函式** - `window.initIcons()` 統一 icon 初始化
- **動態載入** - 支援社群 icon 動態插入後初始化

### v4.6.0 (2026-02-06) - 並發控制與快取安全修復
- **並發控制修復** - 使用 SQLite RETURNING 實現原子性操作
- **樂觀鎖機制** - WHERE 子句防止競態條件
- **移除 Response Cache** - 修復 rate limiting 繞過漏洞 (CVE-2024-21662 類似模式)
- **統一快取失效** - 4 層快取一致性保證
- **HTTP Cache-Control** - 符合 RFC 7234 標準 (no-store)
- **max_reads 執行** - 100% 準確的讀取限制
- **TOCTOU 緩解** - 消除 Time-of-Check-Time-of-Use 漏洞

### v4.6.0 (2026-02-02) - 個資同意管理系統完成
- **GDPR 合規** - 100% 符合 GDPR Article 7, 12, 13, 15, 20, 30
- **分層揭露** - First Layer (摘要) + Second Layer (完整條款)
- **同意管理** - 接受、撤回、恢復完整流程
- **資料可攜權** - JSON 格式即時匯出
- **審計追蹤** - 完整同意歷史記錄
- **原子性交易** - DB.batch() 確保資料一致性
- **既有使用者支援** - 隱式同意機制
- **No-Email 設計** - Email 僅作內部 ID

### v4.6.0 (2026-01-31) - OIDC 安全優化完成
- **PKCE 實作** (RFC 7636) - 防止授權碼攔截攻擊
- **OAuth Redirect 流程** - 取代 Popup，更安全可靠
- **SameSite=Lax** - 從 None 改為 Lax，降低 CSRF 風險
- **移除 postMessage** - 消除跨域通信風險
- ✅ **移除 DEBUG 日誌** - 防止敏感資訊洩漏
- ✅ **符合 RFC 9700** - OAuth 2.0 Security Best Current Practice
- ✅ **OWASP 合規** - OAuth 2.0 Cheat Sheet 完全符合

### 安全預設架構
- **信封加密**: 每張名片獨立 DEK，KEK 定期輪換
- **授權會話機制 (ReadSession)**: 24 小時 TTL，可撤銷、可限制同時讀取數
- **原子性計數器**: SQLite RETURNING 確保 reads_used 準確性
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

### 個資同意管理系統
- **分層揭露**: First Layer (摘要 + 目的) + Second Layer (完整條款)
- **同意類型**: 必要同意（服務使用）+ 選擇性同意（匿名統計）
- **撤回機制**: 30 天緩衝期，可恢復
- **資料可攜權**: JSON 格式即時匯出
- **審計追蹤**: 完整同意歷史記錄
- **原子性交易**: DB.batch() 確保資料一致性
- **GDPR 合規**: 100% (Article 7, 12, 13, 15, 20, 30)
- **No-Email 設計**: Email 僅作內部 ID，所有通知透過 UI

---

## 核心功能

### 1. NFC 數位名片
- **一觸即用**: NFC 觸碰自動創建授權會話
- **授權會話**: 24 小時 TTL,可撤銷、可限制同時讀取數
- **即時撤銷**: NFC 重新觸碰即可撤銷上一個會話

### 2. 收到的名片管理
- **Gemini Structured Output**: JSON Schema 強制結構化輸出，零解析錯誤
- **統一提取流程**: OCR + Web Search 一次 API 呼叫，30% Token 減少
- **多模態 AI**: pending/completed/failed 三階段狀態追蹤
- **智慧壓縮**: browser-image-compression,目標 1MB,80% 上傳時間減少
- **冪等上傳**: idempotency_key 防止重複上傳

### 3. 管理後台
- **完整 CRUD**: 創建、讀取、更新、刪除名片
- **即時監控**: KEK 版本、活躍名片數統計
- **緊急撤銷**: 全域撤銷機制

### 4. 隱私合規
- **GDPR 合規**: 100% 符合 Article 7, 12, 13, 15, 20, 30
- **個資同意**: 分層揭露、撤回機制、30 天緩衝期
- **資料可攜**: JSON 格式即時匯出

### 5. 安全架構
- **信封加密**: 每張名片獨立 DEK,KEK 定期輪換
- **OIDC 認證**: PKCE、State、Nonce 防護
- **審計日誌**: 完整記錄所有存取行為,IP 匿名化

### 6. 效能優化
- **Icon Tree-Shaking**: Lucide Icons 從 379 KB 降至 12.33 KB (96.8%)
- **並發控制**: SQLite RETURNING 原子性操作
- **快取策略**: 4 層快取一致性保證

## 安全掃描結果

本專案已通過三項安全掃描工具驗證（2026-03-07）：

### 1. npm audit 掃描 (Node.js 依賴安全)
- **漏洞數**: 0
- **掃描範圍**: 414 個依賴套件
- **最近修復**: ajv, minimatch, rollup (開發依賴)
- **狀態**: ✅ 所有依賴安全無虞

### 2. OSV-Scanner 掃描 (多語言依賴安全)
- **漏洞數**: 0
- **掃描範圍**: 378 個套件
- **最近修復**: 3 個開發依賴漏洞（2026-03-07）
- **資料來源**: Google OSV Database

### 3. OWASP ZAP 掃描 (Web 應用程式安全)
- **評級**: A
- **結果**: 51 PASS, 16 WARN, 0 FAIL
- **環境**: Staging (db-card-staging.csw30454.workers.dev)
- **狀態**: 所有中高風險漏洞已修復
- **安全標頭**: 9 個完整實作
  - Content-Security-Policy (CSP with nonce)
  - Strict-Transport-Security (HSTS)
  - X-Frame-Options, X-Content-Type-Options
  - Cross-Origin-Embedder-Policy (COEP)
  - Cross-Origin-Opener-Policy (COOP)
  - Cross-Origin-Resource-Policy (CORP)

**掃描報告**: `docs/security/`

### 4. 安全風險分析與處理 (2026-03-07)

本專案對 OWASP ZAP 報告的 Medium 風險項目進行了詳細分析：

#### ✅ CSRF Protection - False Positive
- **報告**: 11 個表單缺少 Anti-CSRF tokens
- **實際狀態**: 所有 POST/PUT/DELETE 請求已透過 `X-CSRF-Token` HTTP header 保護
- **實作方式**: 現代 SPA 模式（JavaScript + HTTP Header），非傳統表單模式
- **掃描器限制**: OWASP ZAP 只檢測 `<input type="hidden">` 模式
- **處理**: 標記為 False Positive
- **文檔**: `docs/security/csrf-protection-analysis.md`

#### ✅ CSP img-src Wildcard - 已修復
- **報告**: `img-src 'self' data: https:` 允許任意 HTTPS 圖片來源
- **風險**: Medium（tracking/phishing 潛在風險）
- **修復**: 替換為特定域名白名單
- **允許來源**: 
  - `*.googleusercontent.com` (Google OAuth 頭像)
  - `*.r2.cloudflarestorage.com` (R2 儲存的名片圖片)
  - `cdn.jsdelivr.net` (CDN 資源)
  - `static.cloudflareinsights.com` (Cloudflare Analytics)
- **結果**: Medium → Low 風險

#### ✅ CSP script-src unsafe-inline - Accepted Risk (Low)
- **報告**: `script-src 'unsafe-inline'` 存在安全風險
- **實際狀態**: 已實作 nonce-based CSP 保護所有內聯 script
- **現代瀏覽器** (95%+): 當有 nonce 時自動忽略 `'unsafe-inline'` (CSP Level 2+)
- **舊瀏覽器** (<5%): 需要 `'unsafe-inline'` 才能執行（向後相容）
- **業界實踐**: Google, Mozilla, OWASP 推薦此做法
- **處理**: 接受為低風險（現代瀏覽器已被 nonce 保護）
- **文檔**: `docs/security/csp-unsafe-inline-analysis.md`

#### ✅ CSP style-src unsafe-inline - Accepted Risk (Very Low)
- **報告**: `style-src 'unsafe-inline'` 存在安全風險
- **實際需求**: Tailwind CSS utility classes 需要內聯樣式
- **風險評估**: 極低（CSS 無法執行 JavaScript 代碼）
- **CSS 攻擊向量**:
  1. 視覺破壞（粉紅頁面、愚蠢外觀）
  2. 文字修改（冒犯性內容）
  3. 假 UI 元素（釣魚登入按鈕）
  4. 資料外洩（精心設計的 CSS 規則）
- **緩解措施**: `connect-src` 嚴格域名白名單阻止第 4 種攻擊（最嚴重）
- **處理**: 接受為極低風險（CSS 無法執行代碼）

**安全狀態總結**:
- 🔒 所有高風險漏洞: 0
- ✅ 所有中風險項目: 已修復或已接受（有文檔支持）
- 📊 整體安全評級: A (OWASP ZAP)

---

## 快速開始

### 前置需求
- Node.js 18+ 
- Cloudflare 帳號
- Wrangler CLI (`npm install -g wrangler`)

### 1. 環境準備

```bash
# Clone 專案
git clone https://github.com/iim0663418/DB-Card.git
cd DB-Card/workers

# 安裝依賴
npm install

# 登入 Cloudflare
wrangler login
```

### 2. 設定環境變數

```bash
# 複製環境變數範本
cp .dev.vars.example .dev.vars

# 編輯 .dev.vars 設定以下變數：
# - SETUP_TOKEN: 管理員認證 token (自訂強密碼)
# - KEK: 主加密金鑰 (32 bytes base64)
# - GOOGLE_CLIENT_ID: Google OAuth Client ID
# - GOOGLE_CLIENT_SECRET: Google OAuth Client Secret
# - JWT_SECRET: JWT 簽名密鑰 (至少 32 bytes base64)

# 生成加密金鑰
node -e "console.log('KEK:', require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('JWT_SECRET:', require('crypto').randomBytes(32).toString('base64'))"
```

**重要**：請參閱 [JWT Secret 管理指南](docs/JWT_SECRET_MANAGEMENT.md)

### 3. 創建 D1 資料庫

```bash
# 創建 Staging 資料庫
wrangler d1 create db-card-staging

# 創建 Production 資料庫
wrangler d1 create db-card-production

# 記錄資料庫 ID 並更新 wrangler.toml
```

更新 `wrangler.toml` 中的資料庫綁定：
```toml
[[d1_databases]]
binding = "DB"
database_name = "db-card-staging"
database_id = "your-staging-database-id"

[env.production.d1_databases]
binding = "DB"
database_name = "db-card-production"
database_id = "your-production-database-id"
```

### 4. 初始化資料庫

```bash
# 本地開發環境
npx wrangler d1 execute DB --local --file=./migrations/0001_initial_schema.sql
npx wrangler d1 execute DB --local --file=./migrations/0002_read_sessions.sql
# ... 依序執行所有 migration

# Staging 環境
npx wrangler d1 execute DB --remote --file=./migrations/0001_initial_schema.sql
npx wrangler d1 execute DB --remote --file=./migrations/0002_read_sessions.sql
# ... 依序執行所有 migration

# Production 環境
npx wrangler d1 execute DB --remote --env production --file=./migrations/0001_initial_schema.sql
npx wrangler d1 execute DB --remote --env production --file=./migrations/0002_read_sessions.sql
# ... 依序執行所有 migration
```

### 5. 設定 Secrets (生產環境)

```bash
# Staging 環境
wrangler secret put SETUP_TOKEN
wrangler secret put KEK
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put JWT_SECRET

# Production 環境
wrangler secret put SETUP_TOKEN --env production
wrangler secret put KEK --env production
wrangler secret put GOOGLE_CLIENT_ID --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production
wrangler secret put JWT_SECRET --env production
```

### 6. 創建 KV Namespace

```bash
# 創建 Staging KV
wrangler kv:namespace create "CACHE" --preview
wrangler kv:namespace create "CACHE"

# 創建 Production KV
wrangler kv:namespace create "CACHE" --env production --preview
wrangler kv:namespace create "CACHE" --env production

# 更新 wrangler.toml 中的 KV ID
```

### 7. 本地開發

```bash
# 啟動開發伺服器 (http://localhost:8787)
npm run dev

# 執行測試
npm test

# TypeScript 編譯檢查
npm run build
```

### 8. 部署到 Cloudflare Workers

```bash
# 部署到 Staging
npm run deploy:staging
# 或
wrangler deploy

# 部署到 Production
npm run deploy:production
# 或
wrangler deploy --env production
```

### 9. 驗證部署

```bash
# 檢查健康狀態
curl https://your-worker.workers.dev/health

# 預期回應：
# {
#   "status": "healthy",
#   "timestamp": "2026-01-24T15:00:00.000Z",
#   "kek": {
#     "version": 1,
#     "status": "active"
#   },
#   "database": {
#     "active_cards": 0
#   }
# }
```

### 10. 設定自訂網域 (選用)

```bash
# 在 Cloudflare Dashboard 設定 Workers Route
# 或使用 wrangler.toml 設定：

routes = [
  { pattern = "db-card.example.com/*", zone_name = "example.com" }
]
```

---

## 隱私政策管理

### 查看當前隱私政策

```bash
# 查看資料庫中的隱私政策版本
cd /Users/shengfanwu/GitHub/DB-Card/workers
wrangler d1 execute DB --remote --command "SELECT version, effective_date, is_active FROM privacy_policy_versions ORDER BY effective_date DESC"
```

### 更新隱私政策內容

```bash
# 更新特定版本的隱私政策（例如：修正聯絡方式）
wrangler d1 execute DB --remote --command "
UPDATE privacy_policy_versions 
SET content_zh = REPLACE(content_zh, '舊文字', '新文字'),
    content_en = REPLACE(content_en, 'Old Text', 'New Text')
WHERE version = 'v1.0.0'
"

# 驗證更新結果
wrangler d1 execute DB --remote --command "SELECT content_zh FROM privacy_policy_versions WHERE version = 'v1.0.0'" | grep "新文字"
```

### 發布新版本隱私政策

```bash
# 1. 停用舊版本
wrangler d1 execute DB --remote --command "UPDATE privacy_policy_versions SET is_active = 0 WHERE version = 'v1.0.0'"

# 2. 插入新版本
wrangler d1 execute DB --remote --command "
INSERT INTO privacy_policy_versions (version, content_zh, content_en, effective_date, is_active)
VALUES (
  'v1.1.0',
  '【新版隱私政策中文內容】',
  '【New Privacy Policy English Content】',
  $(date +%s)000,
  1
)
"

# 3. 驗證新版本已生效
wrangler d1 execute DB --remote --command "SELECT version, is_active FROM privacy_policy_versions WHERE is_active = 1"
```

### 部署隱私政策變更

```bash
# 隱私政策儲存於資料庫，無需重新部署 Worker
# 但若修改了前端顯示邏輯，需要部署：

cd /Users/shengfanwu/GitHub/DB-Card/workers
wrangler deploy --env=""  # Staging
wrangler deploy --env="production"  # Production
```

### 重置使用者同意狀態（測試用）

```bash
# 刪除特定使用者的同意記錄
wrangler d1 execute DB --remote --command "DELETE FROM consent_records WHERE user_email = 'user@example.com'"

# 查看使用者同意記錄
wrangler d1 execute DB --remote --command "SELECT user_email, consent_type, consent_status, consented_at FROM consent_records WHERE user_email = 'user@example.com' ORDER BY consented_at DESC"
```

---

## 部署架構

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Staging    │  │  Production  │  │   Preview    │      │
│  │ Environment  │  │ Environment  │  │ Environment  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ D1 Database  │  │ D1 Database  │  │ D1 Database  │      │
│  │  (Staging)   │  │ (Production) │  │   (Local)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              KV Namespace (Cache)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Secrets (KEK, JWT_SECRET, OAuth)             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 環境變數說明

| 變數名稱 | 用途 | 生成方式 | 必填 |
|---------|------|---------|------|
| `SETUP_TOKEN` | 管理員登入 Token | 自訂強密碼 | ✅ |
| `KEK` | 主加密金鑰 (Key Encryption Key) | `crypto.randomBytes(32).toString('base64')` | ✅ |
| `JWT_SECRET` | JWT 簽名密鑰 | `crypto.randomBytes(32).toString('base64')` | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Google Cloud Console | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Google Cloud Console | ✅ |

---

## 資料庫遷移

目前共有 **33 個 migrations** (0001-0032)，執行所有 migration 腳本（依序執行）：

```bash
# 本地環境
for file in migrations/*.sql; do
  npx wrangler d1 execute DB --local --file="$file"
done

# Staging 環境
for file in migrations/*.sql; do
  npx wrangler d1 execute DB --remote --file="$file"
done

# Production 環境
for file in migrations/*.sql; do
  npx wrangler d1 execute DB --remote --env production --file="$file"
done
```

### 最新關鍵 Migrations (v5.0.0)
- **0029_bilingual_card_support**: 雙語名片支援
- **0030_organization_extended**: 組織資訊擴充
- **0031_shared_cards**: 共享名片功能
- **0032_idempotency_key**: 冪等性金鑰 + user_email 複合唯一索引

---

## 安全保證計畫

DB-Card 遵循 **ISO/IEC 18974:2023** (OpenChain Security Assurance) 標準：

- **漏洞掃描**: OSV-Scanner + npm audit (每次提交)
- **零漏洞政策**: 生產環境不允許高/嚴重 CVE
- **回報管道**: [GitHub Security Advisories](https://github.com/iim0663418/DB-Card/security/advisories/new) (48 小時內回應)
- **修復承諾**: 高/嚴重漏洞 30 天內修復

詳細文檔: `docs/security/`

---

## 常見問題

### Q: 如何輪替 KEK？
A: 使用本地腳本執行：
```bash
npm run kek:rewrap
```

### Q: 如何查看部署日誌？
A: 使用 wrangler tail：
```bash
wrangler tail              # Staging
wrangler tail --env production  # Production
```

### Q: 如何回滾部署？
A: 在 Cloudflare Dashboard > Workers > Deployments 選擇舊版本回滾

### Q: 本地開發如何連接遠端資料庫？
A: 修改 wrangler.toml 使用 `--remote` flag：
```bash
wrangler dev --remote
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
- `GET /api/oauth/config` - 取得 OAuth 配置（clientId）
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

### 使用者 API (需 OIDC 認證)
- `POST /api/user/upload` - 上傳名片圖片
- `POST /api/user/cards/extract-draft` - 自建名片 OCR 草稿提取
- `GET /api/user/received-cards` - 列出收到的名片
- `DELETE /api/user/received-cards/:id` - 刪除收到的名片

詳細文檔: `docs/api/`

---

## 安全標準合規

### OIDC 合規度: 100%
- ✅ Authorization Code Flow (RFC 6749)
- ✅ PKCE (RFC 7636)
- ✅ State Parameter (CSRF Protection)
- ✅ Nonce (Anti-Replay)
- ✅ ID Token Validation (iss/aud/exp/iat/sub)
- ✅ JWKS Verification
- ✅ Discovery Endpoint
- ✅ Redirect Flow (SameSite=Lax)

### 符合標準
- ✅ RFC 6749 (OAuth 2.0)
- ✅ RFC 7636 (PKCE)
- ✅ RFC 9700 (OAuth 2.0 Security Best Current Practice)
- ✅ OpenID Connect Core 1.0
- ✅ OpenID Connect Discovery 1.0
- ✅ OWASP Top 10 2021
- ✅ OWASP OAuth 2.0 Cheat Sheet

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
- ADR-003: 移除客戶端快取

---

## 從 v3.X 遷移

v3.X 純前端架構已封存至 `archive/` 目錄。v4.0 採用後端 API 架構，提供更強的安全性與管理能力。

**主要差異**：
- v3.X: 資料儲存在 NFC 卡片 URL 參數（Base64）
- v4.0: 資料加密儲存於 D1 Database，NFC 卡片僅含 UUID

**遷移步驟**：
1. 使用 admin-dashboard.html 創建新名片
2. 透過管理後台取得 card_uuid
3. 將 UUID 寫入 NFC 卡片（格式：`https://your-domain/card-display.html?card={uuid}`）

詳細遷移指南請參考 `archive/README.md`

---

## 授權條款

Apache License 2.0 - 詳見 [LICENSE](LICENSE)

本專案使用多個開源元件與字體，所有依賴均為開源授權（MIT、ISC、Apache 2.0、SIL OFL 1.1），允許商業使用。

完整的第三方元件清單與授權資訊請參閱：[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)

---

## 貢獻指南

歡迎提交 Issue 和 Pull Request！

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

**安全預設，隱私優先設計，OIDC 認證**  
**Cloudflare Workers 全球邊緣運算**
