# Staging 測試指南

## 問題診斷

**錯誤**: `Failed to fetch` at `tapCard`

**原因**: 測試 URL 使用了無效的參數

---

## 正確的測試方式

### 方式 1: 使用真實的名片 (推薦)

1. 登入 Admin Dashboard
2. 創建或選擇一張測試名片
3. 點擊「查看」按鈕
4. 系統會自動創建 session 並開啟名片頁面

**URL 格式**:
```
https://db-card-staging.csw30454.workers.dev/card-display.html?session={real_session_id}
```

---

### 方式 2: 手動創建 Session

1. 取得名片 UUID（從 Admin Dashboard）
2. 使用 API 創建 session：

```bash
curl -X POST https://db-card-staging.csw30454.workers.dev/api/nfc/tap \
  -H "Content-Type: application/json" \
  -d '{"card_uuid": "YOUR_UUID_HERE"}'
```

3. 取得 `session_id`
4. 開啟名片頁面：

```
https://db-card-staging.csw30454.workers.dev/card-display.html?session={session_id}
```

---

### 方式 3: 使用 User Portal

1. 登入 User Portal
2. 選擇一張名片
3. 點擊「查看」按鈕
4. 系統會自動處理

---

## 測試 3D 翻面功能

### 快速驗證清單

一旦成功載入名片頁面：

1. **浮動提示**
   - [ ] 頁面載入時顯示「中文 ⇄ English / 點擊翻面」
   - [ ] 3 秒後自動淡出消失
   - [ ] 重新整理後不再顯示

2. **翻面功能**
   - [ ] 點擊卡片任意位置
   - [ ] 卡片翻轉 180 度（0.8 秒動畫）
   - [ ] 顯示英文背面
   - [ ] 再次點擊翻回中文

3. **鍵盤操作**
   - [ ] Tab 鍵聚焦到卡片
   - [ ] 顯示焦點框
   - [ ] Enter 或 Space 可翻轉

4. **響應式**
   - [ ] 開啟 DevTools (F12)
   - [ ] 切換到手機模式 (Cmd+Shift+M)
   - [ ] 測試不同尺寸

5. **Console 檢查**
   - [ ] 開啟 Console (Cmd+Option+J)
   - [ ] 確認無錯誤訊息

---

## 常見問題

### Q: 為什麼不能用 `?session=test`？

A: `session=test` 不是真實的 session ID。系統需要：
- 真實的 session ID（從 `/api/nfc/tap` 取得）
- 或者讓系統自動創建（但需要有效的 card UUID）

### Q: 如何取得測試用的 card UUID？

A: 
1. 登入 Admin Dashboard
2. 查看現有名片列表
3. 複製任一名片的 UUID

### Q: 翻面功能不工作？

A: 檢查：
1. Console 是否有錯誤
2. 是否成功載入名片資料
3. 是否有 `toggleFlip` 函數

---

## 測試報告

完成測試後，請填寫：
`.specify/reports/card-flip-test-report.md`
