# 分享連結所有欄位序列化 Bug 修復

## 🔍 問題範圍擴大

### 實際問題
不只是問候語，**姓名、職稱、單位等所有欄位**都可能出現 `[object Object]` 問題。

### 根本原因
當名片資料中的任何欄位是物件格式時（如雙語物件 `{zh: "中文", en: "English"}`），直接使用 `String()` 轉換會產生 `"[object Object]"`。

## 🛠 全面修復方案

### 新增安全字串化函數
```javascript
// 雙語欄位處理（姓名、職稱、問候語）
const safeBilingualStringify = (field) => {
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null) {
    if (field.zh && field.en) return `${field.zh}~${field.en}`;
    const firstValue = Object.values(field).find(v => v && typeof v === 'string');
    return firstValue || '';
  }
  return String(field || '');
};

// 單語欄位處理（部門、郵件、電話等）
const safeMonolingualStringify = (field) => {
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null) {
    const firstValue = Object.values(field).find(v => v && typeof v === 'string');
    return firstValue || '';
  }
  return String(field || '');
};
```

### 修復位置

#### 1. generateBilingualUrl() 方法
```javascript
const compactFields = [
  safeBilingualStringify(safeCardData.name),     // 姓名（雙語）
  safeBilingualStringify(safeCardData.title),    // 職稱（雙語）
  safeMonolingualStringify(safeCardData.department), // 部門（單語）
  safeMonolingualStringify(safeCardData.email),     // 郵件（單語）
  safeMonolingualStringify(safeCardData.phone),     // 電話（單語）
  safeMonolingualStringify(safeCardData.mobile),    // 手機（單語）
  safeMonolingualStringify(safeCardData.avatar),    // 頭像（單語）
  greetingsArray.join(','),                         // 問候語（雙語，已處理）
  safeMonolingualStringify(safeCardData.socialNote) // 社群資訊（單語）
];
```

#### 2. preprocessCardData() 方法
```javascript
const processed = {
  name: safeBilingualStringify(cardData.name),        // 姓名（雙語）
  title: safeBilingualStringify(cardData.title),      // 職稱（雙語）
  department: safeMonolingualStringify(cardData.department), // 部門（單語）
  email: safeMonolingualStringify(cardData.email),    // 郵件（單語）
  phone: safeMonolingualStringify(cardData.phone),    // 電話（單語）
  mobile: safeMonolingualStringify(cardData.mobile),  // 手機（單語）
  avatar: safeMonolingualStringify(cardData.avatar),  // 頭像（單語）
  greetings: cardData.greetings || [],               // 問候語（雙語，單獨處理）
  socialNote: safeMonolingualStringify(cardData.socialNote), // 社群資訊（單語）
  organization: safeMonolingualStringify(cardData.organization), // 組織（單語）
  address: safeMonolingualStringify(cardData.address) // 地址（單語）
};
```

## ✅ 修復效果

### 處理的資料格式
- **字串格式**：直接返回
- **雙語物件**：`{zh: "中文", en: "English"}` → `"中文~English"`
- **其他物件**：提取第一個有效字串值
- **空值/null**：返回空字串

### 預期結果
所有欄位都能正確序列化，不再出現 `[object Object]` 字串。

---

**修復狀態：✅ 已完成**  
**影響欄位：姓名、職稱、部門、郵件、電話、手機、頭像、社群資訊、組織、地址**