# Admin Dashboard 實體孿生 UI 測試指南

**測試環境**: Staging  
**URL**: https://db-card-staging.csw30454.workers.dev/admin-dashboard.html  
**版本**: d9507894-1b6d-4339-9890-4cf349582498  
**測試日期**: 2026-01-28

---

## 🎯 測試前準備

### 1. 登入 Admin Dashboard
```
URL: https://db-card-staging.csw30454.workers.dev/admin-dashboard.html
Email: admin@example.com
Token: YOUR_SETUP_TOKEN
```

### 2. 準備測試圖片
- **有效圖片**: 2 MB JPEG (1920x1080)
- **超大圖片**: 6 MB JPEG (測試錯誤處理)
- **無效格式**: PDF 或 TXT 檔案

---

## ✅ 測試場景

### Scenario 1: 顯示「實體孿生」Tab ✅

**步驟**:
1. 登入 Admin Dashboard
2. 查看 Tab 列表

**預期結果**:
- [ ] 顯示「實體孿生」Tab
- [ ] Tab 位於「創建名片」和「安全監控」之間
- [ ] Tab 圖示為圖片圖示（image icon）

---

### Scenario 2: 選擇名片並上傳圖片 ✅

**步驟**:
1. 點擊「實體孿生」Tab
2. 從下拉選單選擇一張名片
3. 選擇圖片類型「正面 (twin_front)」
4. 拖放一張 2 MB JPEG 圖片到上傳區域

**預期結果**:
- [ ] 下拉選單顯示所有名片
- [ ] 圖片類型 radio buttons 可選擇
- [ ] 拖放區域顯示虛線邊框
- [ ] 拖放時區域高亮顯示
- [ ] 放下圖片後顯示預覽
- [ ] 顯示檔案資訊（名稱、大小、尺寸）
- [ ] 「上傳」按鈕變為可用

---

### Scenario 3: 成功上傳圖片 ✅

**步驟**:
1. 完成 Scenario 2 的步驟
2. 點擊「上傳」按鈕

**預期結果**:
- [ ] 顯示上傳進度條
- [ ] 進度條動畫流暢
- [ ] 上傳成功後顯示綠色成功訊息
- [ ] 成功訊息 3 秒後自動消失
- [ ] 表單自動清空
- [ ] 已上傳圖片列表自動更新

**驗證 API**:
```javascript
// 在 Console 檢查
fetch('/api/admin/monitoring/overview', {credentials: 'include'})
  .then(r => r.json())
  .then(d => console.log('Upload count:', d.upload.total));
// 應該增加 1
```

---

### Scenario 4: 顯示已上傳的圖片 ✅

**步驟**:
1. 選擇一張已有圖片的名片
2. 查看「已上傳的圖片」區域

**預期結果**:
- [ ] 顯示圖片列表表格
- [ ] 每行包含：
  - 縮圖預覽
  - 圖片類型（正面/背面/大頭貼）
  - 版本號（v1, v2...）
  - 上傳時間
  - 操作按鈕（查看）
- [ ] 縮圖可正常顯示
- [ ] 點擊「查看」按鈕可在新視窗開啟圖片

---

### Scenario 5: 錯誤處理 - 檔案過大 ✅

**步驟**:
1. 選擇名片和圖片類型
2. 拖放一張 6 MB 的圖片
3. 點擊「上傳」按鈕

**預期結果**:
- [ ] 顯示紅色錯誤訊息「檔案大小超過 5 MB 限制」
- [ ] 不應調用 API（檢查 Network tab）
- [ ] 表單保持原狀態
- [ ] 可以重新選擇檔案

---

### Scenario 6: 錯誤處理 - 無效格式 ✅

**步驟**:
1. 選擇名片和圖片類型
2. 拖放一個 PDF 或 TXT 檔案

**預期結果**:
- [ ] 顯示紅色錯誤訊息「不支援的檔案格式」
- [ ] 不應調用 API
- [ ] 表單保持原狀態

---

### Scenario 7: 點擊上傳（非拖放） ✅

**步驟**:
1. 選擇名片和圖片類型
2. 點擊上傳區域
3. 從檔案選擇器選擇圖片

**預期結果**:
- [ ] 開啟檔案選擇器
- [ ] 選擇圖片後顯示預覽
- [ ] 其他行為與拖放相同

---

### Scenario 8: 取消上傳 ✅

**步驟**:
1. 選擇圖片並顯示預覽
2. 點擊「取消」按鈕

**預期結果**:
- [ ] 清空圖片預覽
- [ ] 清空檔案資訊
- [ ] 「上傳」按鈕變為禁用
- [ ] 表單重置

---

### Scenario 9: 切換名片 ✅

**步驟**:
1. 選擇名片 A
2. 查看已上傳圖片列表
3. 切換到名片 B

**預期結果**:
- [ ] 圖片列表自動更新為名片 B 的圖片
- [ ] 如果名片 B 無圖片，顯示「尚未上傳圖片」

---

### Scenario 10: 響應式設計 ✅

**步驟**:
1. 調整瀏覽器視窗大小（桌面 → 平板 → 手機）

**預期結果**:
- [ ] 桌面：表格完整顯示
- [ ] 平板：表格可橫向滾動
- [ ] 手機：表格可橫向滾動，按鈕堆疊

---

## 🔍 進階測試

### 測試 1: 連續上傳多張圖片

**步驟**:
1. 上傳 twin_front
2. 上傳 twin_back
3. 上傳 avatar

**預期結果**:
- [ ] 每次上傳都成功
- [ ] 圖片列表正確顯示 3 張圖片
- [ ] 版本號都是 v1

---

### 測試 2: 更新圖片（版本控制）

**步驟**:
1. 上傳 twin_front（v1）
2. 再次上傳 twin_front（應為 v2）

**預期結果**:
- [ ] 第二次上傳成功
- [ ] 圖片列表顯示 v2
- [ ] v1 不再顯示（已軟刪除）

---

### 測試 3: Twin Status 自動啟用

**步驟**:
1. 選擇一張新名片（無圖片）
2. 上傳第一張圖片

**預期結果**:
- [ ] 上傳成功
- [ ] 在資料庫中檢查 twin_status 表：
```sql
SELECT * FROM twin_status WHERE card_uuid = 'your-card-uuid';
-- 應該有記錄，enabled=1, status='ready'
```

---

### 測試 4: 監控 API 統計

**步驟**:
1. 上傳 3 張圖片
2. 切換到「安全監控」Tab
3. 查看「系統監控」區塊

**預期結果**:
- [ ] Upload Total 增加 3
- [ ] Upload Success 增加 3
- [ ] Success Rate 為 100%

---

## 🐛 已知問題檢查

### 檢查 1: R2 Transform 是否正常

**測試**:
```javascript
// 在 Console 執行
fetch('/api/assets/ASSET_ID/content?variant=thumb&card_uuid=UUID&session=SESSION', {
  credentials: 'include'
}).then(r => console.log('Status:', r.status, 'Type:', r.headers.get('content-type')));
```

**預期**: Status 200, Type: image/webp

---

### 檢查 2: Session 驗證是否正常

**測試**:
1. 上傳圖片
2. 在新視窗打開圖片 URL（不帶 session）

**預期**: 401 Unauthorized

---

### 檢查 3: Rate Limiting 是否正常

**測試**:
1. 快速連續上傳 11 張圖片

**預期**: 第 11 張應返回 429 Too Many Requests

---

## 📊 測試結果記錄

| 場景 | 狀態 | 備註 |
|------|------|------|
| Scenario 1: 顯示 Tab | ⬜ | |
| Scenario 2: 選擇並上傳 | ⬜ | |
| Scenario 3: 成功上傳 | ⬜ | |
| Scenario 4: 顯示圖片 | ⬜ | |
| Scenario 5: 檔案過大 | ⬜ | |
| Scenario 6: 無效格式 | ⬜ | |
| Scenario 7: 點擊上傳 | ⬜ | |
| Scenario 8: 取消上傳 | ⬜ | |
| Scenario 9: 切換名片 | ⬜ | |
| Scenario 10: 響應式 | ⬜ | |

---

## 🎯 驗收標準

**必須通過**:
- ✅ Scenarios 1-5（核心功能）
- ✅ 測試 1-2（基本流程）
- ✅ 檢查 1-2（安全性）

**建議通過**:
- ✅ Scenarios 6-10（完整體驗）
- ✅ 測試 3-4（整合驗證）
- ✅ 檢查 3（效能）

---

**測試指南版本**: v1.0  
**最後更新**: 2026-01-28 13:30:00+08:00
