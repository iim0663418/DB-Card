# DB-Card Project Progress
## Current Phase: PHASE_2_COMPLETE ✅
- Status: Phase 2 User Portal 完成 + 撤銷/恢復機制重構完成
- Task: 使用者自助門戶與完整卡片生命週期管理
- Last Update: 2026-01-19T09:43:00+08:00
- Commit: a5b783f
- Version: b671362c-ae22-464f-a117-58d7186f81ee
- Next Action: 等待用戶指示下一步優化方向

## 重要決策記錄 (2026-01-19)
- ❌ ADR-005 (Fingerprint Verification) 已取消
- 原因：產品定位為「名片系統」而非「授權系統」
- SESSION EXPIRES 和 ATTEMPTS REMAINING 是「資源管理」而非「訪問控制」
- 當前設計符合名片分享的核心需求（QR Code、URL 分享）

## Phase 2 完成項目 ✅

### User Portal 完整功能
- [x] Google OAuth 登入整合
- [x] 卡片選擇頁面（3 種類型）
- [x] 完整表單（16 欄位對齊 admin-dashboard）
- [x] Real-time Preview（雙語切換）
- [x] 地址預設選擇（延平/新光大樓）
- [x] 6 個社群連結欄位
- [x] 查看名片 + 複製連結功能
- [x] Revoked 卡片正確處理

### 撤銷/恢復機制重構 ✅
- [x] DELETE API 改為撤銷邏輯
- [x] 新增 POST /api/admin/cards/:uuid/restore
- [x] Admin Dashboard 顯示 revoked 卡片
- [x] 根據狀態顯示不同按鈕（查看/編輯/撤銷 vs 查看/恢復）
- [x] 全局撤銷功能實作
- [x] User Portal 禁用 revoked 卡片操作

### 資料庫架構優化 ✅
- [x] 移除 cards.card_type 冗餘欄位
- [x] 移除 cards.status 冗餘欄位
- [x] 統一以 uuid_bindings 為 Single Source of Truth
- [x] 新增 deleted_cards 審計表
- [x] Migration 0005: 更新類型約束（official/temporary/event → personal/event/sensitive）
- [x] Migration 0006: 同步 card_type
- [x] Migration 0007: 移除冗餘欄位
- [x] Migration 0008: 創建審計表

### 定期清除機制 ✅
- [x] Cron Job 配置（每日 02:00 UTC）
- [x] 90 天保留期
- [x] 自動歸檔到 deleted_cards
- [x] 保留加密資料快照
- [x] scheduled-cleanup.ts 實作

### 設計系統統一 ✅
- [x] MODA accent color (#6868ac) 三個前端統一
- [x] 字體改為 Outfit
- [x] WCAG AAA 合規（7.8:1 對比度）
- [x] 頁籤名稱統一：數位名片 | XXX

### Bug 修復 ✅
- [x] user-portal 編輯預填邏輯（扁平結構）
- [x] card-display 地址和社群連結顯示
- [x] admin-dashboard 社群連結讀取（新舊格式相容）
- [x] tap/read API 查詢邏輯（移除 cards.status）
- [x] 類型映射（event → event_booth）
- [x] 函數暴露（closeModal, confirmAction, restoreCard）
- [x] 移除前端 debug log（安全性）
- [x] 空字串判斷（!== undefined）
- [x] Real-time Preview 讀取預設地址

### API 完整性 ✅
- [x] GET /api/user/cards - 返回 bound + revoked
- [x] GET /api/user/cards/:uuid - 返回完整扁平結構（16 欄位）
- [x] POST /api/user/cards - 自動生成 UUID
- [x] PUT /api/user/cards/:uuid - 完整更新
- [x] GET /api/admin/cards - JOIN uuid_bindings 獲取狀態
- [x] POST /api/admin/cards/:uuid/restore - 恢復功能
- [x] DELETE /api/admin/cards/:uuid - 改為撤銷
- [x] POST /api/admin/revoke - 全局撤銷

## 待辦事項
- [ ] Phase 3: Admin Extensions (revoke/unbind APIs) - 已規劃
- [ ] 測試完整流程
- [ ] 文檔更新

## 部署狀態
- Environment: staging
- Backend URL: https://db-card-staging.csw30454.workers.dev
- Version: b671362c-ae22-464f-a117-58d7186f81ee
- Commit: a5b783f
- Cron: 0 2 * * * (每日 02:00 UTC)
- Database: db-card-staging (0.20 MB)
- All Tests: ✅ Passing
