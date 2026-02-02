# BDD Spec: 個資同意前端整合

## 目標
在 user-portal.html 整合個資同意管理功能，符合 BDD 規格與台灣《個人資料保護法》。

## 核心需求

### 1. 首次登入同意流程
**Given**: 使用者首次通過 OAuth 登入
**When**: 載入 user-portal.html
**Then**:
- 呼叫 `GET /api/consent/check`
- 若 `needs_consent: true`，顯示全螢幕阻斷式 Modal
- 若 `needs_consent: false`，正常載入頁面

### 2. 同意 Modal 設計
**Given**: 需要同意時
**When**: 顯示 Modal
**Then**:
- 全螢幕覆蓋（backdrop 不可關閉）
- 顯示隱私政策內容（中英文切換）
- 必要同意：服務使用（checkbox disabled, checked）
- 選擇性同意：匿名統計（checkbox 可切換）
- 滾動到底部才啟用「同意」按鈕
- 點擊「同意」呼叫 `POST /api/consent/accept`

### 3. 設定頁面整合
**Given**: 使用者已登入
**When**: 進入設定頁面
**Then**:
- 顯示「個資管理」區塊
- 按鈕：
  * 查看同意歷史
  * 匯出我的資料
  * 撤回同意

### 4. 撤回同意流程
**Given**: 使用者點擊「撤回同意」
**When**: 顯示確認 Modal
**Then**:
- 警告文字：「撤回後將無法使用服務，資料將在 30 天後刪除」
- 顯示刪除日期計算
- 輸入確認文字：「確認撤回」
- Checkbox：「我了解後果」
- 確認後呼叫 `POST /api/consent/withdraw`

### 5. 恢復同意流程
**Given**: 使用者在 30 天內重新登入
**When**: 檢測到 `consent_status: 'withdrawn'`
**Then**:
- 顯示 Modal：「您的資料將在 X 天後刪除」
- 按鈕：「取消撤回」或「繼續刪除」
- 取消撤回呼叫 `POST /api/consent/restore`

## 技術規格

### API 端點
- `GET /api/consent/check` - 檢查同意狀態
- `POST /api/consent/accept` - 接受同意
- `POST /api/consent/withdraw` - 撤回同意
- `POST /api/consent/restore` - 恢復同意
- `GET /api/consent/history` - 查看歷史
- `POST /api/data/export` - 匯出資料
- `GET /api/privacy-policy/current` - 取得隱私政策

### UI 元件
- Consent Modal (全螢幕阻斷式)
- Withdraw Confirmation Modal
- Restore Modal
- History Modal
- Settings Section

### 樣式要求
- 使用現有 Tailwind CSS
- 符合 WCAG 2.1 AA
- 支援中英文切換
- 響應式設計

## 實作檔案
- `workers/public/user-portal.html` - 主要整合點
- 新增 JavaScript 模組處理同意邏輯
- 使用現有 i18n 系統

## 驗收標準
1. ✅ 首次登入顯示同意 Modal
2. ✅ 滾動到底部才能同意
3. ✅ 同意後正常使用系統
4. ✅ 設定頁面顯示個資管理
5. ✅ 撤回同意流程完整
6. ✅ 30 天內可恢復
7. ✅ 資料匯出功能正常
8. ✅ 中英文切換正常
