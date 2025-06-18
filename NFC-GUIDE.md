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
2. 開啟 App，選擇「寫入」
3. 選擇「新增記錄」→「URL/URI」
4. 輸入完整網址：`https://yourusername.github.io/NFC-Digital-Business-Card-Project/`
5. 將 NFC 卡片靠近手機背面
6. 點擊「寫入」完成

### 方法二：使用 TagWriter App
1. 下載「TagWriter by NXP」App
2. 選擇「Write tags」→「URL」
3. 輸入網址並選擇「Write」
4. 將卡片靠近手機完成寫入

## 🍎 iOS 寫入步驟

### 方法一：使用 NFC Tools App
1. 從 App Store 下載「NFC Tools」
2. 開啟 App，點擊「Write」
3. 選擇「Add a record」→「URL」
4. 輸入網址：`https://yourusername.github.io/NFC-Digital-Business-Card-Project/`
5. 點擊「Write」，將卡片靠近 iPhone 頂部
6. 確認寫入成功

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

### 常見問題
- **無法讀取**: 檢查 NFC 功能是否開啟
- **讀取距離短**: 正常現象，需靠近 1-4cm
- **偶爾失效**: 卡片可能受磁場干擾，遠離金屬物品
- **iOS 無反應**: 確認 iPhone 未在使用其他 App

### 寫入失敗處理
- 確認卡片未被鎖定
- 檢查 URL 格式正確性
- 嘗試格式化後重新寫入
- 更換 NFC 寫入 App

## 📊 容量使用參考

### URL 長度計算
- 基本 URL: ~50 bytes
- GitHub Pages URL: ~60 bytes  
- 建議保留空間: 20 bytes
- 總需求: ~80 bytes (NTAG213 足夠)

### 進階功能 (需更大容量)
- 多個聯絡方式: ~200 bytes
- vCard 直接嵌入: ~300+ bytes
