# PWA 雙語格式修復報告

## 🚨 問題
雙語版的復現部分姓名會變成亂碼，問題出現在 PWA 錯誤地使用了 JSON 格式來生成雙語版 QR 碼，但實際上雙語生成器使用的是管道分隔格式。

## 🔍 發現
通過讀取 `nfc-generator-bilingual.html` 和 `assets/bilingual-common.js`，發現：

### 雙語生成器實際使用的格式
```javascript
// bilingual-common.js 中的 encodeCompact 函數
function encodeCompact(data) {
    const compact = [
        data.name || '',
        data.title || '',
        data.department || '',
        data.email || '',
        data.phone || '',
        data.mobile || '',
        data.avatar || '',
        (data.greetings || []).join(','),
        data.socialNote || ''
    ].join('|');
    
    return btoa(encodeURIComponent(compact))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
```

## ✅ 修復
修正 PWA 中的 `generateBilingualUrl` 方法，使用與雙語生成器完全相同的管道分隔格式：

### 修復前（錯誤的 JSON 格式）
```javascript
const jsonString = JSON.stringify(data);
const encoded = btoa(unescape(encodeURIComponent(jsonString)));
```

### 修復後（正確的管道分隔格式）
```javascript
const compact = [
  cardData.name || '',
  cardData.title || '',
  cardData.department || '',
  cardData.email || '',
  cardData.phone || '',
  cardData.mobile || '',
  cardData.avatar || '',
  (Array.isArray(cardData.greetings) ? cardData.greetings : []).join(','),
  cardData.socialNote || ''
].join('|');

const encoded = btoa(encodeURIComponent(compact))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');
```

## 📊 結果
- ✅ QR 碼生成的 URL 與雙語生成器完全一致
- ✅ 雙語版名片復現正常顯示中文字符
- ✅ 解決 UTF-8 編碼亂碼問題
- ✅ 支援管道分隔格式的正確解析

**修復檔案**：`/pwa-card-storage/src/features/card-manager.js`