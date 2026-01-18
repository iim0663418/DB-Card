# DB-Card Project Progress
## Current Phase: VCARD_OPTIMIZATION_COMPLETE ✅
- Status: vCard 3.0 雙語優化與大頭貼支援完成
- Task: 規劃使用者自助名片管理系統
- Last Update: 2026-01-18T23:35:00+08:00
- Next Action: 撰寫 BDD 規格書

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
