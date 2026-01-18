# NFC 數位名片設定指南

## 📱 支援的作業系統與規格

### Android 系統
- **NFC 規格**: NFC Forum Type 2-4 (建議使用 Type 2)
- **標準**: ISO14443 Type A/B, ISO15693
- **記錄格式**: NDEF (NFC Data Exchange Format)
- **支援晶片**: NTAG213/215/216, Mifare Classic, Mifare Ultralight
- **容量建議**: 最少 96 bytes (NTAG213)

### iOS 系統 (iPhone 7 以上)
- **NFC 規格**: NFC Forum Type 2-5 (建議使用 Type 2)
- **標準**: ISO14443 Type A
- **記錄格式**: NDEF
- **支援晶片**: NTAG213/215/216
- **容量建議**: 最少 180 bytes (NTAG213)
- **注意事項**: iOS 11+ 自動支援，無需額外 App

## 🔧 NFC 卡片寫入內容

### 寫入的 URL 內容
```
https://yourusername.github.io/NFC-Digital-Business-Card-Project/
```

### NDEF 記錄結構
```
記錄類型: URI (U)
URI 識別碼: 0x01 (http://www.)
URI 內容: yourusername.github.io/NFC-Digital-Business-Card-Project/
```

## 📋 Android 寫入步驟

### 方法一：使用 NFC Tools App
1. 下載「NFC Tools」App (免費)
2. 開啟 App，選擇「寫入」(Write)
3. 選擇「新增記錄」(Add a record) → 「URL/URI」
4. **重要**：輸入完整網址，必須包含 `https://` 協議
   ```
   https://yourusername.github.io/NFC-Digital-Business-Card-Project/
   ```
5. 將 NFC 卡片靠近手機背面中央
6. 點擊「寫入」(Write) 完成
7. **測試**：用另一支手機測試讀取，確認能開啟瀏覽器

### 方法二：使用 TagWriter App
1. 下載「TagWriter by NXP」App
2. 選擇「Write tags」→「URL」
3. **重要**：輸入完整網址，必須包含 `https://` 協議
   ```
   https://yourusername.github.io/NFC-Digital-Business-Card-Project/
   ```
4. 選擇「Write」，將卡片靠近手機背面
5. **測試**：寫入完成後立即測試讀取功能

## 🍎 iOS 寫入步驟

### 方法一：使用 NFC Tools App
1. 從 App Store 下載「NFC Tools」
2. 開啟 App，點擊「Write」
3. 選擇「Add a record」→「URL」
4. **重要**：輸入完整網址，必須包含 `https://` 協議
   ```
   https://yourusername.github.io/NFC-Digital-Business-Card-Project/
   ```
5. 點擊「Write」，將卡片靠近 iPhone 頂部邊緣
6. 確認寫入成功訊息
7. **測試**：立即測試 NFC 讀取功能

### 方法二：使用 Shortcuts App (iOS 13+)
1. 開啟「捷徑」App
2. 點擊「自動化」→「建立個人自動化操作」
3. 選擇「NFC」→「掃描」現有標籤
4. 新增動作「在 Safari 中開啟 URL」
5. 輸入網址並儲存

## 🛠️ 建議的 NFC 卡片規格

### 推薦晶片型號
- **NTAG213**: 180 bytes 容量，適合基本 URL
- **NTAG215**: 924 bytes 容量，適合複雜內容
- **NTAG216**: 924 bytes 容量，企業級應用

### 卡片形式選擇
- **標準卡片**: 85.5mm × 54mm (名片大小)
- **圓形標籤**: 直徑 25-30mm (黏貼式)
- **方形標籤**: 25mm × 25mm (黏貼式)
- **手環/戒指**: 便攜式，適合個人使用

## ⚡ 讀取測試

### Android 測試
1. 開啟 NFC 功能 (設定 → 連線 → NFC)
2. 將卡片靠近手機背面中央
3. 應會自動開啟瀏覽器並載入網頁

### iOS 測試
1. NFC 功能預設開啟 (iPhone 7+)
2. 將卡片靠近 iPhone 頂部
3. 會出現通知橫幅，點擊即可開啟

## 🔍 故障排除

### 瀏覽器無法開啟
- **最常見原因**: URL 格式不完整，缺少 `https://` 或 `http://` 協議
- **解決方法**: 使用 [NFC 內容產生器](nfc-generator.html) 產生正確格式
- **檢查方式**: 確認 URL 以 `https://` 開頭

### NFC 讀取問題
- **無法讀取**: 檢查 NFC 功能是否開啟
- **讀取距離短**: 正常現象，需靠近 1-4cm
- **偶爾失效**: 卡片可能受磁場干擾，遠離金屬物品
- **iOS 無反應**: 確認 iPhone 未在使用其他 App，螢幕需要亮起

### 寫入失敗處理
- **格式檢查**: 使用 NFC 內容產生器驗證 URL 格式
- **卡片狀態**: 確認卡片未被鎖定或損壞
- **App 更新**: 嘗試更新 NFC Tools 或 TagWriter 到最新版
- **重新格式化**: 先清除卡片內容，再重新寫入
- **更換 App**: 如一個 App 失敗，嘗試另一個 App

## 📊 容量使用參考

### URL 格式要求
- **必須包含協議**: `https://` 或 `http://` (7-8 bytes)
- **基本 URL**: ~50 bytes
- **GitHub Pages URL**: ~60 bytes  
- **建議保留空間**: 20 bytes
- **總需求**: ~80 bytes (NTAG213 足夠)

### 正確 URL 範例
```
✅ 正確: https://username.github.io/project/
✅ 正確: http://example.com/page
❌ 錯誤: username.github.io/project (缺少協議)
❌ 錯誤: www.example.com (缺少協議)
```

### 進階功能 (需更大容量)
- 多個聯絡方式: ~200 bytes
- vCard 直接嵌入: ~300+ bytes
