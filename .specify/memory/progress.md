# DB-Card Project Progress
## Current Phase: PHASE_3_PLANNING ✅
- Status: Phase 3 Admin 擴充功能設計完成
- Task: 使用者管理與撤銷機制
- Last Update: 2026-01-19T02:09:00+08:00
- Spec Version: v3.0.0
- Next Action: 實作 Phase 3.1 撤銷 API

## Phase 3 規劃完成 ✅
### API 設計
- [x] POST /api/admin/revoke - 撤銷單一卡片
- [x] POST /api/admin/revoke-email - 撤銷帳號所有卡片
- [x] POST /api/admin/unbind - 解綁 UUID（隔離期）
- [x] GET /api/admin/users - 列出所有使用者
- [x] GET /api/admin/users/:email/cards - 查看使用者卡片

### 設計文檔
- [x] API 規格書完成
- [x] 資料庫操作定義
- [x] 錯誤處理規劃
- [x] 安全考量分析
- [x] 實作階段劃分

### 實作階段
- [ ] Phase 3.1: 撤銷功能 (1.5h)
- [ ] Phase 3.2: 解綁功能 (1h)
- [ ] Phase 3.3: 使用者查詢 (1.5h)
- [ ] 前端整合 (2.5h)
- [ ] 測試驗證 (2h)

## Phase 2 完成項目 ✅
### JWT Token 實作
- [x] 安裝 jose 函式庫
- [x] 生成 JWT Secret (32+ chars)
- [x] OAuth Callback 生成 JWT (1h expiration)
- [x] OAuth Middleware 驗證 JWT
- [x] 前端儲存 JWT (memory, not localStorage)
- [x] API 呼叫使用 JWT token
- [x] 自動處理 token 過期 (401 → re-login)
- [x] 部署到 Staging

### JWT 安全特性
- [x] HS256 簽名演算法
- [x] 1 小時 token 有效期
- [x] Issuer 驗證 (db-card-api)
- [x] 自動過期檢查
- [x] Token 儲存在 memory (XSS safe)
- [x] Domain allowlist 驗證

## Phase 2 測試結果 ✅
### 通過的測試 (9/9)
- [x] 健康檢查 (GET /health)
- [x] 頁面載入 (/user-portal)
- [x] 未登入保護 (401)
- [x] 建立名片 (POST /api/user/cards)
- [x] Binding Limit (409)
- [x] 建立其他類型 (Temporary)
- [x] 更新名片 (PUT /api/user/cards/:uuid)
- [x] 取得卡片列表 (GET /api/user/cards) - 含 uuid, name
- [x] 取得單一卡片 (GET /api/user/cards/:uuid) - 新增
- [x] Ownership 驗證 (403)

### 修復的問題
- [x] handleUserListCards() 現在返回 uuid, name_zh, name_en
- [x] 新增 handleUserGetCard() 端點
- [x] 新增 GET /api/user/cards/:uuid route
- [x] Ownership 驗證正確運作

## Phase 1 完成項目 ✅
### Database
- [x] Migration 0004_uuid_bindings_v2.sql
- [x] uuid_bindings 表（3 狀態機）
- [x] email_allowlist 表（domain 白名單）
- [x] UNIQUE INDEX 強制 1+1+1 binding limit
- [x] 本地測試通過

### Backend APIs
- [x] OAuth Middleware (oauth.ts) - 含 TODO 標註
- [x] User Cards Handler (cards.ts)
  - POST /api/user/cards (auto UUID generation)
  - PUT /api/user/cards/:uuid (edit with ownership check)
  - GET /api/user/cards (list own cards)
- [x] Rate Limiting 擴充 (5 create, 20 edit per hour)
- [x] Routes Integration (3 endpoints)
- [x] Types 擴充 (UUIDBinding, UserCardCreateRequest, etc.)
- [x] Audit Log 擴充 (actor_type, actor_id, target_uuid)

### 驗證結果
- [x] TypeScript 編譯通過 (npx tsc --noEmit)
- [x] Migration 執行成功 (7 commands)
- [x] 表結構驗證通過
- [x] 初始數據正確 (moda.gov.tw)

## Phase 2 完成項目 ✅
### Frontend
- [x] User Portal 頁面 (user-portal.html)
- [x] OAuth 登入介面（含錯誤處理）
- [x] 卡片選擇頁（3 格動態渲染）
- [x] 卡片編輯表單（完全同步 admin-dashboard 設計）
  - [x] 部門下拉選單（16 個選項）
  - [x] 地址預設選擇（延平/新光大樓）
  - [x] 進階資訊折疊區（手機、大頭貼、問候語、社群連結）
- [x] 即時預覽功能
- [x] Three.js 背景動畫
- [x] Glassmorphism 設計風格

### API 整合
- [x] apiCall() 真實 fetch + HttpOnly Cookie
- [x] fetchUserCards() - GET /api/user/cards
- [x] handleFormSubmit() - POST/PUT APIs（含所有新欄位）
- [x] openEditForm() - GET /api/user/cards/:uuid（智能預填）
- [x] 錯誤處理（403, 409, 429, 410）
- [x] Loading 狀態指示
- [x] Toast 通知系統

### 表單功能
- [x] 16 個部門選項
- [x] 地址預設選擇（延平/新光）+ 自訂
- [x] 10 個進階欄位（mobile, avatar_url, greeting, 6 個社群）
- [x] 地址預設智能判斷（編輯模式）

### OAuth 狀態
- [x] Mock 實作（標註 TODO）
- [x] 真實 Google OAuth 整合 ✅
  - [x] OAuth 2.0 Authorization Code Flow
  - [x] Popup 模式登入
  - [x] postMessage 通訊
  - [x] Domain 驗證 (@moda.gov.tw)
  - [x] 環境變數配置
  - [x] Callback handler 實作

## BDD Scenarios 覆蓋率
- [x] Scenario 1.1: Valid OAuth Login
- [x] Scenario 1.2: Invalid Email Domain
- [x] Scenario 2.1: Create First Card (Auto UUID)
- [x] Scenario 2.2: Binding Limit Exceeded
- [x] Scenario 3.1: Edit Own Card
- [x] Scenario 3.2: Edit Others' Card
- [x] Scenario 3.3: Edit Revoked Card
- [x] Scenario 6.1: Creation Rate Limit
- [x] Scenario 6.2: Edit Rate Limit

## 待辦事項
- [ ] OAuth 真實整合 (目前為 mock，已標註 TODO)
- [ ] Phase 2: User Frontend (/edit 頁面)
- [ ] Phase 3: Admin Extensions (revoke/unbind APIs)
- [ ] Phase 4: Rate Limiting & Monitoring

## 重大需求變更 (v1.0 → v2.0)
- ❌ 移除：邀請碼/Claim 機制、Pending/Expired 狀態
- ✅ 改為：OAuth 直接進入 /edit，自助建立名片
- UUID 產生：首次建立時自動生成（非預發）
- 治理策略：事後撤銷（非事前阻擋）
- 狀態機簡化：3 狀態（Bound/Revoked/Quarantine）
- API 簡化：11 個端點（原 13 個）

## vCard 優化完成 ✅
- [x] 改用 vCard 3.0（iOS 相容性最佳）
- [x] 完整雙語支援（FN, N, TITLE, ORG, ADR）
- [x] 特殊字元跳脫（\;, \,, \\, \n）
- [x] data URI 下載（Safari iOS 相容）
- [x] 移除 BOM（避免解析問題）
- [x] Google Drive 大頭貼支援（uc?export=view）

## 新功能規劃：使用者自助名片管理 🎯
### 核心需求
- 管理員預先發行 UUID（邀請碼）
- 使用者 Google OAuth 登入（@moda.gov.tw）
- UUID 與 Google 帳號綁定（一對一）
- 使用者自助創建/編輯名片
- Session 管理（JWT-based）

### 技術架構
- 新資料表：uuid_bindings
- 新 API：6+ 端點（生成、OAuth、綁定、CRUD）
- 新前端：user-portal.html
- 管理後台擴充：UUID 管理頁籤

### 記錄需求分析完成 ✅
**採用方案 A：擴充現有 audit_logs**
- 新增 event_type：uuid_generate, user_bind_uuid, user_card_create 等
- 新增欄位：actor_type, actor_id, target_uuid
- security_events 新增：uuid_brute_force, invalid_email_domain

**記錄優先級**：
- P0：UUID 生成、綁定、OAuth 失敗、名片 CRUD
- P1：UUID 撤銷/解綁、登入/登出、暴力嘗試
- P2：OAuth 流程開始、查看名片、Session 過期

### 待確認需求
1. UUID 生命週期（永久/有過期）
2. 一個 Google 帳號可綁定幾個 UUID
3. UUID 可否解綁/重新綁定
4. Email 驗證規則（單一/多個 domain）
5. Session 過期定義與行為
6. 名片 UUID 使用方式（綁定 UUID = card_uuid?）
7. 使用者刪除名片權限
8. 管理員編輯使用者名片權限
9. UUID 發送方式（email/手動/QR Code）
10. 安全機制（rate limiting, CAPTCHA）

## 部署狀態
- Environment: staging
- Backend URL: https://db-card-staging.csw30454.workers.dev
- Version: a6d0fbd2-0c10-4c59-aa72-099a92eca420
- Commit: (待更新)
- All Tests: ✅ Passing

## 下一步
1. 確認需求細節（10 個問題）
2. 撰寫 BDD 規格書（user-self-service.md）
3. 設計資料庫 schema（0004_uuid_bindings.sql）
4. 實作後端 API（分 4 個 Phase）
5. 實作前端頁面
6. 整合測試

🎯 預估工作量：10-15 小時
