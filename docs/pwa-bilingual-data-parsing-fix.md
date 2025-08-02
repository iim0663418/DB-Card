# PWA 雙語版資料解析修復報告

## 問題概述

PWA 中雙語版名片出現欄位錯位問題：
- 組織資訊顯示 email 內容：`<p class="card-organization">test1@test1</p>`
- 地址資訊顯示社群連結：`<div class="detail-item"><strong>地址:</strong> LINE: test1</div>`

## 根本原因分析

### 1. 編碼格式差異
- **雙語版名片**：使用管道分隔符 `|` 的緊湊格式
- **標準版名片**：使用 JSON 格式

### 2. 解析邏輯問題
原有的 `parseCardUrlWithUTF8` 方法統一使用 JSON 解析，無法正確處理雙語版的管道分隔格式。

### 3. 欄位對應錯誤
雙語版資料結構：
```
fields[0] = name (雙語)
fields[1] = title (雙語)  
fields[2] = department (單語)
fields[3] = email (單語)
fields[4] = phone (單語)
fields[5] = mobile (單語)
fields[6] = avatar (單語)
fields[7] = greetings (雙語)
fields[8] = socialNote (單語)
```

## 修復方案

### 1. 分離解析邏輯
```javascript
parseCardUrlWithUTF8(url) {
  // 根據 URL 路徑判斷名片類型
  if (urlObj.pathname.includes('bilingual')) {
    return this.parseBilingualFormat(data);
  } else {
    return this.parseStandardFormat(data);
  }
}
```

### 2. 雙語版專用解析方法
```javascript
parseBilingualFormat(data) {
  const decoded = decodeURIComponent(data);
  const compact = atob(decoded.replace(/-/g, '+').replace(/_/g, '/'));
  const fields = compact.split('|');
  
  return {
    name: fields[0] || '',
    title: fields[1] || '',
    department: fields[2] || '',
    email: fields[3] || '',
    phone: fields[4] || '',
    mobile: fields[5] || '',
    avatar: fields[6] || '',
    greetings: fields[7] ? fields[7].split(',') : [],
    socialNote: fields[8] || '',
    // 組織和地址由前端預設提供
    organization: '',
    address: ''
  };
}
```

### 3. 前端預設邏輯
雙語版名片的組織和地址資訊由 `applyCardTypeDefaults` 方法根據名片類型自動提供：
- 機關版：自動套用「數位發展部」和對應地址
- 個人版：保持空白（由用戶自訂）

## 修復結果

### 修復前
```html
<p class="card-org">test1@test1 · 測試1</p>
<div class="detail-item"><strong>地址:</strong> LINE: test1</div>
```

### 修復後
```html
<p class="card-org">數位發展部 · 測試1</p>
<div class="detail-item"><strong>地址:</strong> 臺北市中正區延平南路143號</div>
```

## 安全性考量

- **資料完整性**：確保所有欄位都顯示在正確位置
- **類型安全**：加強物件類型檢查，避免 `[object Object]` 顯示
- **向下相容**：保持與現有標準版名片的相容性

## 測試驗證

- ✅ 雙語版名片欄位正確對應
- ✅ 組織資訊正確顯示
- ✅ 地址資訊由前端預設提供
- ✅ 社群連結顯示在正確位置
- ✅ 標準版名片功能不受影響

## 影響範圍

### 直接修復
- `pwa-card-storage/src/features/card-manager.js`
- `pwa-card-storage/src/app.js`

### 受益名片類型
- `index-bilingual.html` (雙語版-延平)
- `index1-bilingual.html` (雙語版-新光)
- `index-bilingual-personal.html` (個人雙語版)

---
**修復日期**：2024-12-20  
**修復人員**：Documentation Maintainer  
**審查狀態**：已完成