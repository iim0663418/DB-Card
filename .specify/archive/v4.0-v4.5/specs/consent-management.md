# BDD Spec: 個資同意管理系統

## Context
- 符合《個人資料保護法》第 8、9 條
- 蒐集目的：069, 090, 135, 157
- 首次登入後立即顯示（阻斷式）
- 分開必要/選擇性同意
- 資料保存：帳號存續期間 + 刪除後 90 天
- 撤回機制：標記待刪除，30 天後自動刪除

## Scenario 1: 首次登入顯示同意介面
**Given**: 使用者首次通過 OAuth 登入
**When**: 重定向至 user-portal
**Then**:
- 檢查 consent_records 是否有該 user_email 的 accepted 記錄
- 若無，顯示全螢幕同意 Modal（阻斷式）
- 若有但版本過舊，顯示版本更新 Modal
- 若有且版本最新，正常進入 user-portal

## Scenario 2: 分層揭露內容
**Given**: 同意 Modal 顯示
**When**: 使用者查看內容
**Then**:
- 第一層：顯示摘要（summary_zh/en）
- 標示蒐集目的代碼：069, 090, 135, 157
- 提供「查看完整條款」連結
- 第二層：展開完整隱私政策（content_zh/en）

## Scenario 3: 必要同意（不可拒絕）
**Given**: 同意 Modal 顯示
**When**: 使用者查看必要項目
**Then**:
- 顯示「必要」標籤（紅色）
- 項目：
  * 基本資料蒐集（姓名、Email、大頭貼）
  * 名片資料儲存與展示
  * 系統操作日誌
- 無法取消勾選
- 說明：「此為服務必要項目，無法拒絕」

## Scenario 4: 選擇性同意（可拒絕）
**Given**: 同意 Modal 顯示
**When**: 使用者查看選擇性項目
**Then**:
- 顯示「選擇性」標籤（藍色）
- 項目：
  * 接收系統通知 Email（預設關閉）
  * 匿名使用統計（預設關閉）
- 使用 Switch 元件
- 可獨立勾選/取消

## Scenario 5: 滾動到底部才能同意
**Given**: 使用者查看完整條款
**When**: 滾動條款內容
**Then**:
- 追蹤滾動進度
- 未滾動到底部時，「同意」按鈕為 disabled
- 滾動到底部後，「同意」按鈕啟用
- 顯示提示：「請閱讀完整條款後同意」

## Scenario 6: 記錄同意
**Given**: 使用者點擊「同意」
**When**: 提交同意表單
**Then**:
- 插入 consent_records：
  * user_email
  * consent_version (當前版本)
  * consent_type: "required"
  * consent_category: "service"
  * consent_status: "accepted"
  * consented_at (當前時間)
  * ip_address (匿名化，僅前 3 段)
  * user_agent
  * privacy_policy_url
- 若有選擇性同意，分別插入記錄
- 關閉 Modal，進入 user-portal

## Scenario 7: 撤回同意
**Given**: 使用者在設定頁面
**When**: 點擊「撤回個資同意」
**Then**:
- 顯示確認 Modal：「撤回後將無法使用服務，資料將在 30 天後刪除」
- 確認後：
  * 更新 consent_records.consent_status = "withdrawn"
  * 設定 withdrawn_at = 當前時間
  * 設定 deletion_scheduled_at = 當前時間 + 30 天
  * 標記所有名片為 soft_deleted
- 發送撤回確認 Email
- 登出使用者

## Scenario 8: 恢復撤回
**Given**: 使用者在 30 天內重新登入
**When**: 檢測到 consent_status = "withdrawn"
**Then**:
- 顯示 Modal：「您的資料將在 X 天後刪除，是否恢復？」
- 若恢復：
  * 更新 consent_status = "accepted"
  * 清除 withdrawn_at 和 deletion_scheduled_at
  * 恢復名片的 soft_deleted 狀態
- 若不恢復：登出

## Scenario 9: 自動刪除
**Given**: Scheduled Worker 每日執行
**When**: 檢查 deletion_scheduled_at < 當前時間
**Then**:
- 刪除該使用者的所有資料：
  * consent_records
  * cards
  * read_sessions
  * audit_logs (保留 90 天)
- 從 email_allowlist 移除（若為個人 email）
- 記錄刪除日誌

## Scenario 10: 匯出個人資料
**Given**: 使用者在設定頁面
**When**: 點擊「匯出我的資料」
**Then**:
- 創建 data_export_requests 記錄
- 非同步生成 JSON 檔案：
  * 個人資訊
  * 所有名片資料
  * 同意記錄
  * 存取日誌（最近 90 天）
- 生成臨時下載 URL（24 小時有效）
- 發送 Email 通知

## Scenario 11: 查看同意歷史
**Given**: 使用者在設定頁面
**When**: 點擊「同意歷史記錄」
**Then**:
- 顯示所有 consent_records：
  * 同意時間
  * 版本號
  * 同意類型
  * 當時的隱私政策連結
- 可查看歷史版本的完整內容

## Scenario 12: 版本更新重新同意
**Given**: 隱私政策版本更新（v1.0.0 → v1.1.0）
**When**: 使用者登入
**Then**:
- 檢查最新同意版本 < 當前版本
- 顯示版本更新 Modal：
  * 標示「隱私政策已更新」
  * 顯示變更摘要
  * 要求重新同意
- 記錄新版本的同意

## Technical Requirements
1. 前端：全螢幕 Modal，滾動追蹤，多語言
2. 後端：API 端點（檢查、記錄、撤回、匯出）
3. 資料庫：3 張表（consent_records, privacy_policy_versions, data_export_requests）
4. Scheduled Worker：每日檢查自動刪除
5. Email 通知：撤回確認、匯出完成

## Success Criteria
- 首次登入必定顯示同意介面
- 未同意無法進入 user-portal
- 所有同意記錄完整保存
- 撤回後 30 天自動刪除
- 匯出功能正常運作
- 版本更新時重新取得同意
- 符合個資法六大要素
