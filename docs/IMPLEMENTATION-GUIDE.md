# PWA 名片系統實作指南

## PWA 資料解析架構修復 (v1.5.12)

### 關鍵問題解決
**問題**: `SimpleCardParser.parsePipeFormat` 中欄位對應錯誤，導致 email 和 socialNote 資料錯置

**修復前**:
```javascript
organization: SimpleCardParser.parseBilingualField(parts[3]),  // 錯誤：parts[3] 是 email
address: SimpleCardParser.parseBilingualField(parts[8]),       // 錯誤：parts[8] 是 socialNote
```

**修復後**:
```javascript
email: parts[3] || '',                                        // 正確：parts[3] 是 email
socialNote: SimpleCardParser.parseBilingualField(parts[8]),    // 正確：parts[8] 是 socialNote
```

### 正確的雙語格式對應
雙語生成器編碼格式：`name|title|department|email|phone|mobile|avatar|greetings|socialNote`

| 索引 | 欄位 | 類型 | 處理方式 |
|------|------|------|----------|
| 0 | name | 雙語 | `parseBilingualField()` |
| 1 | title | 雙語 | `parseBilingualField()` |
| 2 | department | 單語 | `parseBilingualField()` |
| 3 | email | 單語 | 直接字串 |
| 4 | phone | 單語 | 直接字串 |
| 5 | mobile | 單語 | 直接字串 |
| 6 | avatar | 單語 | 直接字串 |
| 7 | greetings | 雙語 | `parseGreetingsField()` |
| 8 | socialNote | 單語 | `parseBilingualField()` |

## 分享連結生成修復 (v1.5.4)

### 問題概述
PWA 分享功能中，當名片資料包含物件格式欄位時，會產生 `[object Object]` 字串，導致分享連結無法正常開啟。

## 修復方案

### 雙語欄位處理
支援 `中文~English` 格式的欄位：
- 姓名 (name)
- 職稱 (title)
- 問候語 (greetings)

```javascript
const safeBilingualStringify = (field) => {
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null) {
    if (field.zh && field.en) return `${field.zh}~${field.en}`;
    const firstValue = Object.values(field).find(v => v && typeof v === 'string');
    return firstValue || '';
  }
  return String(field || '');
};
```

### 單語欄位處理
只提取字串值的欄位：
- 部門 (department)
- 郵件 (email)
- 電話 (phone)
- 手機 (mobile)
- 頭像 (avatar)
- 社群資訊 (socialNote)
- 組織 (organization)
- 地址 (address)

```javascript
const safeMonolingualStringify = (field) => {
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null) {
    const firstValue = Object.values(field).find(v => v && typeof v === 'string');
    return firstValue || '';
  }
  return String(field || '');
};
```

## 9個名片介面相容性確認

| 名片類型 | 檔案名稱 | 語言 | 建築 | 版面 | 狀態 |
|----------|----------|------|------|------|------|
| index | index.html | 中文 | 延平 | 機關版 | ✅ 已驗證 |
| index1 | index1.html | 中文 | 新光 | 機關版 | 📝 理論受益 |
| personal | index-personal.html | 中文 | - | 個人版 | 📝 理論受益 |
| bilingual | index-bilingual.html | 雙語 | 延平 | 機關版 | ✅ 已驗證 |
| bilingual1 | index1-bilingual.html | 雙語 | 新光 | 機關版 | 📝 理論受益 |
| personal-bilingual | index-bilingual-personal.html | 雙語 | - | 個人版 | 📝 理論受益 |
| en | index-en.html | 英文 | 延平 | 機關版 | 📝 理論受益 |
| en1 | index1-en.html | 英文 | 新光 | 機關版 | 📝 理論受益 |
| personal-en | index-personal-en.html | 英文 | - | 個人版 | 📝 理論受益 |

### 狀態說明
- ✅ **已驗證**: 直接修改並驗證修復效果
- 📝 **理論受益**: 通過PWA Card Manager修復理論上受益，但未直接修改或完整驗證

### 實際修改檔案
- `pwa-card-storage/src/features/card-manager.js` - PWA分享連結生成修復
- `index.html` - 單語版代表性驗證
- `index-bilingual.html` - 雙語版代表性驗證

### 建議後續動作
如需確保所有名片介面都能正常運作，建議進行完整的回歸測試或補齊其他7個檔案的直接修改。