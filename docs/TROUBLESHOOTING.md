# 故障排除指南

## PWA 雙語版名片解析問題

### 問題描述
PWA 中雙語版名片顯示錯誤的欄位對應：
- `organization` 顯示 email 資料
- `address` 顯示 socialNote 資料
- `email` 和 `socialNote` 顯示不完整或錯誤

### 根本原因
`SimpleCardParser.parsePipeFormat` 函數中的欄位對應與雙語生成器 (`bilingual-common.js`) 不一致。

### 解決方案
**v1.5.12 已修復** - 更新欄位對應邏輯：

```javascript
// 修復前（錯誤）
organization: SimpleCardParser.parseBilingualField(parts[3]),  // 錯誤：parts[3] 是 email
address: SimpleCardParser.parseBilingualField(parts[8]),       // 錯誤：parts[8] 是 socialNote

// 修復後（正確）
email: parts[3] || '',                                         // 正確：parts[3] 是 email
socialNote: SimpleCardParser.parseBilingualField(parts[8]),    // 正確：parts[8] 是 socialNote
```

### 正確的欄位格式
雙語生成器編碼格式：`name|title|department|email|phone|mobile|avatar|greetings|socialNote`

| 索引 | 欄位 | 類型 | 說明 |
|------|------|------|------|
| 0 | name | 雙語 | 姓名 |
| 1 | title | 雙語 | 職稱 |
| 2 | department | 單語 | 部門 |
| 3 | email | 單語 | 電子郵件 |
| 4 | phone | 單語 | 電話 |
| 5 | mobile | 單語 | 手機 |
| 6 | avatar | 單語 | 大頭貼 URL |
| 7 | greetings | 雙語 | 問候語 |
| 8 | socialNote | 單語 | 社群媒體 |

### 驗證步驟
1. 重新整理瀏覽器頁面
2. 重新匯入雙語版名片
3. 檢查 PWA 名片詳細檢視
4. 確認 email 和 socialNote 正確顯示

### 相關檔案
- `pwa-card-storage/src/utils/simple-card-parser.js` (主要修復)
- `pwa-card-storage/src/features/card-manager.js` (輔助修復)
- `assets/bilingual-common.js` (參考格式)

## 其他常見問題

### PWA 名片無法匯入
**症狀**：點擊名片連結後 PWA 無法正確匯入資料

**可能原因**：
1. URL 編碼格式不正確
2. 瀏覽器不支援 IndexedDB
3. 資料超出容量限制

**解決方案**：
1. 檢查 URL 格式是否正確
2. 清除瀏覽器快取和 IndexedDB
3. 減少名片資料內容

### 名片顯示 [object Object]
**症狀**：名片欄位顯示 `[object Object]` 而非實際內容

**原因**：物件類型資料未正確轉換為字串

**解決方案**：已在 v1.5.6 修復，確保所有顯示欄位正確轉換為字串格式

### QR 碼生成失敗
**症狀**：點擊生成 QR 碼按鈕後無反應或顯示錯誤

**可能原因**：
1. QRCode.js 未正確載入
2. URL 長度超出 QR 碼限制
3. 網路連線問題

**解決方案**：
1. 檢查 qrcode.min.js 是否正確載入
2. 減少名片資料內容
3. 使用本地 QR 碼生成（v2.1.0+）