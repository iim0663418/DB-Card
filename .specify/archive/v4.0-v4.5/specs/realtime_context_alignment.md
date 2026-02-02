# BDD Spec: Real-time Context 對齊名片顯示

## 問題分析

### 當前狀態
1. **card-display.html** (名片顯示)
   - 顯示完整的聯絡資訊（email, phone, web, address）
   - 社群連結動態生成
   - 問候語區塊（greetings）
   - 部門資訊（department）

2. **user-portal.html** (使用者編輯)
   - Real-time Context 預覽卡片
   - 僅顯示：avatar, name, title, department, email, phone, address
   - ❌ 缺少：web (官網連結)
   - ❌ 缺少：mobile (手機)

3. **admin-dashboard.html** (管理者編輯)
   - Real-time Context 預覽卡片
   - 顯示：avatar, name, title, department, email, phone, address
   - ❌ 缺少：web (官網連結)
   - ❌ 缺少：mobile (手機)

### 需要對齊的欄位
- ✅ avatar (頭像)
- ✅ name (姓名)
- ✅ title (職稱)
- ✅ department (部門)
- ✅ greetings (問候語)
- ✅ email (電子郵件)
- ✅ phone (辦公室電話)
- ❌ **web (官網連結)** - 需要新增
- ❌ **mobile (手機)** - 需要新增
- ✅ address (地址)
- ✅ social links (社群連結)

---

## Scenario 1: user-portal.html 新增 Web 和 Mobile 預覽

### Given
- 使用者在編輯表單中填寫 web 和 mobile 欄位
- Real-time Context 預覽卡片存在

### When
- 使用者輸入 web URL (例如: https://moda.gov.tw)
- 使用者輸入 mobile (例如: 0912-345-678)

### Then
- Real-time Context 應該即時顯示 web 連結
- Real-time Context 應該即時顯示 mobile 號碼
- 預覽卡片應該與 card-display.html 的顯示格式一致

### 實作要求
```html
<!-- 在 user-portal.html 的 Real-time Context 中新增 -->

<!-- Web (在 phone 之後) -->
<div class="bg-slate-50 p-3 rounded-xl flex items-center gap-3 text-left mt-2">
    <i data-lucide="globe" class="w-4 h-4 text-moda opacity-60"></i>
    <span id="prev-web" class="text-xs font-bold text-slate-600 truncate">---</span>
</div>

<!-- Mobile (在 phone 之後) -->
<div class="bg-slate-50 p-3 rounded-xl flex items-center gap-3 text-left mt-2">
    <i data-lucide="smartphone" class="w-4 h-4 text-moda opacity-60"></i>
    <span id="prev-mobile" class="text-xs font-bold text-slate-600 truncate">---</span>
</div>
```

### JavaScript 更新
```javascript
// 在 updatePreview() 函數中新增
document.getElementById('prev-web').textContent = 
    document.getElementById('web').value || 'https://moda.gov.tw';

document.getElementById('prev-mobile').textContent = 
    document.getElementById('mobile').value || '---';
```

---

## Scenario 2: admin-dashboard.html 新增 Web 和 Mobile 預覽

### Given
- 管理者在編輯表單中填寫 web 和 mobile 欄位
- Real-time Context 預覽卡片存在

### When
- 管理者輸入 web URL
- 管理者輸入 mobile

### Then
- Real-time Context 應該即時顯示 web 連結
- Real-time Context 應該即時顯示 mobile 號碼
- 預覽卡片應該與 card-display.html 的顯示格式一致

### 實作要求
```html
<!-- 在 admin-dashboard.html 的 Real-time Context 中新增 -->

<!-- Web (在 phone 之後) -->
<div class="bg-slate-50 p-4 rounded-2xl flex items-center gap-4 text-left mt-2">
    <i data-lucide="globe" class="w-4 h-4 text-moda opacity-60"></i>
    <span id="prev-web" class="text-[10px] font-bold text-slate-600 truncate">---</span>
</div>

<!-- Mobile (在 phone 之後) -->
<div class="bg-slate-50 p-4 rounded-2xl flex items-center gap-4 text-left mt-2">
    <i data-lucide="smartphone" class="w-4 h-4 text-moda opacity-60"></i>
    <span id="prev-mobile" class="text-[10px] font-bold text-slate-600 truncate">---</span>
</div>
```

### JavaScript 更新
```javascript
// 在 updatePreview() 函數中新增
document.getElementById('prev-web').textContent = 
    document.getElementById('web').value || 'https://moda.gov.tw';

document.getElementById('prev-mobile').textContent = 
    document.getElementById('mobile').value || '---';
```

---

## Scenario 3: 確保欄位順序一致

### Given
- card-display.html 的欄位順序為：email → phone → web → address
- user-portal.html 和 admin-dashboard.html 需要對齊

### When
- 使用者或管理者查看 Real-time Context

### Then
- 欄位順序應該與 card-display.html 一致
- 視覺樣式應該保持統一

### 標準順序
1. Avatar (頭像)
2. Name (姓名)
3. Title (職稱)
4. Department (部門) - 可選
5. Social Links (社群連結)
6. Greetings (問候語) - 可選
7. **Email** (電子郵件)
8. **Phone** (辦公室電話)
9. **Web** (官網連結) ← 新增
10. **Mobile** (手機) ← 新增
11. **Address** (地址)

---

## 驗收標準

### user-portal.html
- ✅ Real-time Context 包含 web 欄位
- ✅ Real-time Context 包含 mobile 欄位
- ✅ 即時更新功能正常
- ✅ 欄位順序與 card-display.html 一致

### admin-dashboard.html
- ✅ Real-time Context 包含 web 欄位
- ✅ Real-time Context 包含 mobile 欄位
- ✅ 即時更新功能正常
- ✅ 欄位順序與 card-display.html 一致

### 視覺一致性
- ✅ 圖標使用 lucide icons
- ✅ 樣式與現有欄位一致
- ✅ 響應式設計正常

---

## 技術要求

- 最小化修改：只新增必要的 HTML 和 JavaScript
- 保持現有功能不受影響
- 確保 Lucide icons 正確渲染
- 維持響應式設計
