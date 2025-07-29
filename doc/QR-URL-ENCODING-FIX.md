# PWA QR 碼 URL 編碼修復

## 🚨 問題
雙語版的復現部分姓名會變成亂碼 `{"name":"æ¸¬è©¦`，問題出現在 QR 碼生成時的 URL 處理中。

## ✅ 修復
確保 PWA 中的 QR 碼 URL 生成使用與原生成器完全相同的編碼方式：

### 標準生成器編碼
```javascript
const jsonString = JSON.stringify(compactData);
const encoded = btoa(unescape(encodeURIComponent(jsonString)));
const url = `${baseUrl}${targetPage}?c=${encodeURIComponent(encoded)}`;
```

### 雙語生成器編碼  
```javascript
const jsonString = JSON.stringify(data);
const encoded = btoa(unescape(encodeURIComponent(jsonString)));
const url = `${baseUrl}${targetPage}?data=${encodeURIComponent(encoded)}`;
```

## 📊 結果
- ✅ QR 碼生成的 URL 與原生成器完全一致
- ✅ 雙語版名片復現正常顯示中文字符
- ✅ 解決 UTF-8 編碼亂碼問題

**修復檔案**：`/pwa-card-storage/src/features/card-manager.js`