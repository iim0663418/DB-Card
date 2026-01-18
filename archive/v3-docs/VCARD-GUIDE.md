# vCard 檔案編碼指南

## 📱 iOS 中文編碼問題解決方案

### 問題描述
iOS 設備在匯入包含中文字元的 vCard 檔案時，可能會出現亂碼問題。這主要是由於：
- vCard 版本相容性問題
- 字元編碼聲明不完整
- 行結束符格式不正確

## ✅ 解決方案

### 1. 使用 vCard 3.0 版本
```vcf
VERSION:3.0
```
**原因**: iOS 對 vCard 3.0 的中文支援比 4.0 更穩定

### 2. 明確聲明字元編碼
```vcf
FN;CHARSET=UTF-8:吳勝繙
N;CHARSET=UTF-8:吳;勝繙;;;
ORG;CHARSET=UTF-8:數位發展部
```
**原因**: 明確告知 iOS 使用 UTF-8 解碼中文字元

### 3. 添加 PRODID 標識
```vcf
PRODID:-//Apple Inc.//iPhone OS 16.5//EN
```
**原因**: 幫助 iOS 識別並正確處理 vCard 格式

### 4. 使用 CRLF 行結束符
檔案必須使用 Windows 風格的行結束符 (`\r\n`)，而非 Unix 風格 (`\n`)

## 📋 完整的 iOS 相容 vCard 範例

```vcf
BEGIN:VCARD
VERSION:3.0
PRODID:-//Apple Inc.//iPhone OS 16.5//EN
FN;CHARSET=UTF-8:吳勝繙
N;CHARSET=UTF-8:吳;勝繙;;;
ORG;CHARSET=UTF-8:數位發展部
TITLE;CHARSET=UTF-8:科長
EMAIL;TYPE=work:iim0663418@moda.gov.tw
TEL;TYPE=work,voice:+886-2-2380-0411
URL;TYPE=work:https://github.com/iim0663418
ADR;TYPE=work;CHARSET=UTF-8:;;臺北市中正區延平南路143號;;;;Taiwan
PHOTO;TYPE=JPEG:https://example.com/photo.jpg
NOTE;CHARSET=UTF-8:歡迎透過 GitHub 或 LinkedIn 與我聯繫！
REV:20250618T000000Z
END:VCARD
```

## 🔧 手動修復步驟

### macOS/Linux 環境
```bash
# 1. 修改版本為 3.0
sed -i 's/VERSION:4.0/VERSION:3.0/' contact.vcf

# 2. 添加 CHARSET 參數到包含中文的欄位
sed -i 's/FN:/FN;CHARSET=UTF-8:/' contact.vcf
sed -i 's/N:/N;CHARSET=UTF-8:/' contact.vcf
sed -i 's/ORG:/ORG;CHARSET=UTF-8:/' contact.vcf
sed -i 's/TITLE:/TITLE;CHARSET=UTF-8:/' contact.vcf
sed -i 's/ADR;TYPE=work:/ADR;TYPE=work;CHARSET=UTF-8:/' contact.vcf
sed -i 's/NOTE:/NOTE;CHARSET=UTF-8:/' contact.vcf

# 3. 轉換行結束符為 CRLF
sed -i 's/$/\r/' contact.vcf

# 4. 添加 PRODID (在 VERSION 行後)
sed -i '/VERSION:3.0/a\
PRODID:-//Apple Inc.//iPhone OS 16.5//EN' contact.vcf
```

### Windows 環境
使用文字編輯器 (如 Notepad++) 手動修改，並確保：
- 編碼設為 UTF-8 (without BOM)
- 行結束符設為 CRLF (Windows)

## 📋 測試驗證

### iOS 測試步驟
1. **Safari 測試**: 在 iOS Safari 中開啟 vCard 連結
2. **下載測試**: 點擊下載按鈕
3. **匯入測試**: 選擇「加入聯絡人」
4. **顯示確認**: 檢查聯絡人中文字元是否正確顯示

### Android 測試
Android 對編碼的容忍度較高，但仍建議使用相同格式確保一致性。

## ⚠️ 常見問題

### 問題 1: 部分中文字元正常，部分亂碼
**原因**: 某些欄位缺少 `CHARSET=UTF-8` 參數
**解決**: 檢查所有包含中文的欄位都有編碼聲明

### 問題 2: 整個檔案無法匯入
**原因**: 行結束符格式錯誤或版本不支援
**解決**: 確保使用 CRLF 行結束符和 vCard 3.0 版本

### 問題 3: 照片無法顯示
**原因**: PHOTO URL 無效或類型聲明錯誤
**解決**: 使用完整的 HTTPS URL 和正確的圖片類型

## 🔄 自動化解決方案

專案已包含自動優化的 vCard 檔案，無需手動修改。如需自訂：

1. 修改 `contact.vcf` 中的個人資訊
2. 確保保持現有的編碼聲明格式
3. 使用支援 UTF-8 的編輯器
4. 測試在實際 iOS 設備上的匯入效果

## 📚 參考資料

- [RFC 6350 - vCard Format Specification](https://tools.ietf.org/html/rfc6350)
- [Apple Contacts vCard Support](https://support.apple.com/guide/contacts/welcome/mac)
- [UTF-8 編碼標準](https://tools.ietf.org/html/rfc3629)