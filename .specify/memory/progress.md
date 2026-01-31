# DB-Card Project Progress
## Current Phase: USER_CARD_UPDATE_FIX
- Status: 所有問題已修復並驗收完成
- Version: v4.6.0 (690e1da9)
- Last Update: 2026-01-31T18:02:00+08:00

## 修復的問題

### 1. 地址預設選項無法更新 ✅
**根因**：前端沒有將 address-preset 下拉選單轉換為 address_zh/address_en
**修復**：在表單提交時檢查預設選項並轉換為實際地址值

### 2. Signal 和 LINE 驗證錯誤 ✅
**根因**：validateSocialLink 要求所有社群媒體必須是 URL 格式
**修復**：分離驗證邏輯（URL 欄位嚴格驗證，文字欄位僅 XSS 檢查）

### 3. 問候語顯示問題 ✅
**根因**：
- 資料格式不匹配（字串 vs 陣列）
- 英文面提前 return，問候語代碼未執行
**修復**：
- 儲存時將字串按行分割為陣列
- 讀取時將陣列用換行符連接為字串
- 將問候語處理移到英文面 return 之前
- 顯示所有問候語行，用 `<br>` 分隔
- 修改標題為「問候語 / Greeting」

## 完成項目
- ✅ 地址預設選項更新（新光 ↔ 延平）
- ✅ Signal/LINE 社群媒體驗證與更新
- ✅ 問候語雙面靜態顯示（所有行）
- ✅ 移除 debug 日誌

## Next Action
- 歸檔到 Knowledge Graph
- 清理進度記憶
