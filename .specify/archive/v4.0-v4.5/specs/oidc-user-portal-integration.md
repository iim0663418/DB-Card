# OIDC User Portal Integration - 自動填入與個人化

## 目標
利用 OIDC ID Token 的使用者資訊，自動填入 User Portal 表單，減少重複輸入

## 優先級
**P1 - 使用者體驗優化**

---

## 可用的 OIDC 資訊

從 Google ID Token 可取得：
- `sub`: 使用者唯一 ID
- `email`: 使用者 Email
- `name`: 使用者姓名 (通常是英文全名)
- `picture`: 使用者頭像 URL
- `email_verified`: Email 驗證狀態

---

## Feature 1: 自動填入基本資訊

### Scenario 1: 首次創建名片時自動填入
- **Given**: 使用者首次登入 User Portal
- **When**: 點擊「創建名片」
- **Then**: 
  - ✅ Email 欄位自動填入 `email`
  - ✅ 大頭貼 URL 自動填入 `picture`
  - ✅ 顯示提示：「已自動填入 Email 與大頭貼」

### Scenario 2: 智慧判斷姓名語言
- **Given**: OIDC `name` = "John Smith"
- **When**: 創建名片
- **Then**: 
  - ✅ 自動填入 `name_en` = "John Smith"
  - ✅ `name_zh` 保持空白（需手動填寫）

### Scenario 3: 中文姓名自動判斷
- **Given**: OIDC `name` = "王大明"
- **When**: 創建名片
- **Then**: 
  - ✅ 自動填入 `name_zh` = "王大明"
  - ✅ `name_en` 保持空白（需手動填寫）

### Scenario 4: 混合姓名處理
- **Given**: OIDC `name` = "王大明 David Wang"
- **When**: 創建名片
- **Then**: 
  - ✅ 自動填入 `name_zh` = "王大明"
  - ✅ 自動填入 `name_en` = "David Wang"

---

## Feature 2: 個人化歡迎訊息

### Scenario 5: 顯示使用者姓名
- **Given**: 使用者已登入，`name` = "John Smith"
- **When**: 進入 User Portal
- **Then**: 
  - ✅ 顯示「歡迎，John Smith」
  - ✅ 顯示使用者頭像

### Scenario 6: 顯示 Email
- **Given**: 使用者已登入
- **When**: 查看個人資訊
- **Then**: 
  - ✅ 顯示 Email
  - ✅ 顯示「已驗證」標記（如果 `email_verified` = true）

---

## Feature 3: 編輯時保留原值

### Scenario 7: 編輯名片時不覆蓋
- **Given**: 名片已存在，Email = "old@example.com"
- **When**: 編輯名片
- **Then**: 
  - ✅ 保留原有的 Email
  - ✅ 不自動覆蓋為 OIDC Email

### Scenario 8: 僅在創建時自動填入
- **Given**: 使用者編輯現有名片
- **When**: 開啟編輯表單
- **Then**: 
  - ✅ 顯示原有資料
  - ✅ 不自動填入 OIDC 資訊

---

## Implementation Requirements

### 前端修改
1. `workers/public/js/user-portal-init.js`
   - 新增 `prefillFormWithOIDC(userData)` 函數
   - 在創建名片時呼叫
   - 智慧判斷姓名語言

### 姓名語言判斷邏輯
```javascript
function detectNameLanguage(name) {
  const hasChinese = /[\u4e00-\u9fa5]/.test(name);
  const hasEnglish = /[a-zA-Z]/.test(name);
  
  if (hasChinese && hasEnglish) {
    // 混合：分割中英文
    const parts = name.split(/\s+/);
    const zhPart = parts.filter(p => /[\u4e00-\u9fa5]/.test(p)).join(' ');
    const enPart = parts.filter(p => /[a-zA-Z]/.test(p)).join(' ');
    return { name_zh: zhPart, name_en: enPart };
  } else if (hasChinese) {
    return { name_zh: name, name_en: '' };
  } else {
    return { name_zh: '', name_en: name };
  }
}
```

---

## UI/UX 設計

### 自動填入提示
```html
<div class="auto-fill-hint">
  <i data-lucide="check-circle"></i>
  <span>已自動填入 Email 與大頭貼（來自 Google 帳號）</span>
</div>
```

### 可編輯性
- ✅ 所有自動填入的欄位均可編輯
- ✅ 使用者可以修改或清空
- ✅ 不強制使用 OIDC 資訊

---

## 測試清單

### 自動填入測試
- [ ] Email 自動填入
- [ ] 大頭貼 URL 自動填入
- [ ] 英文姓名自動填入 name_en
- [ ] 中文姓名自動填入 name_zh
- [ ] 混合姓名正確分割

### 智慧判斷測試
- [ ] @moda.gov.tw 自動選擇部門
- [ ] 其他網域不自動填入
- [ ] 編輯時不覆蓋原值

### UI/UX 測試
- [ ] 顯示歡迎訊息
- [ ] 顯示使用者頭像
- [ ] 自動填入提示顯示
- [ ] 所有欄位可編輯

---

## 成功標準

1. ✅ 所有 8 個 BDD scenarios 通過
2. ✅ 減少至少 2 個欄位的手動輸入
3. ✅ 使用者體驗流暢
4. ✅ 不破壞現有編輯功能
5. ✅ 向後相容

---

## 預估工期
**2 小時** (前端實作 + 測試)

---

## 參考資料
- Google ID Token Claims: https://developers.google.com/identity/openid-connect/openid-connect#obtainuserinfo
- User Portal Form: workers/public/user-portal.html
