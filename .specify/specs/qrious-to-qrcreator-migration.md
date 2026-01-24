# QRious → qr-creator 完全遷移計劃

**日期**: 2026-01-24  
**版本**: v4.3.2 → v4.3.3  
**原因**: QRious 授權混淆（MIT vs GPL-3.0），存在法律風險

---

## 📊 影響範圍掃描結果

### 1. CDN 引用（2 個文件）
- `workers/public/card-display.html` (line 21)
- `workers/public/admin-dashboard.html` (line 24)

### 2. JavaScript 使用（1 個文件）
- `workers/public/js/main.js` (line 1014)
  - 功能：生成名片 URL QR Code
  - 位置：`open-qr` 按鈕事件處理

### 3. API 差異分析

#### QRious API (當前)
```javascript
new QRious({
    element: canvas,
    value: cardUrl,
    size: 240,
    background: 'white',
    foreground: 'black',
    level: 'H'
});
```

#### qr-creator API (目標)
```javascript
QrCreator.render({
    text: cardUrl,
    radius: 0,
    ecLevel: 'H',
    fill: '#000000',
    background: '#ffffff',
    size: 240
}, canvas);
```

#### 參數對應表
| QRious | qr-creator | 說明 |
|--------|------------|------|
| `element` | 第二參數 | canvas 元素 |
| `value` | `text` | QR Code 內容 |
| `size` | `size` | 尺寸（相同） |
| `background` | `background` | 背景色（需轉 hex） |
| `foreground` | `fill` | 前景色（需轉 hex） |
| `level` | `ecLevel` | 錯誤修正等級 |
| N/A | `radius` | 圓角半徑（新增，設為 0） |

---

## 🎯 遷移步驟

### Phase 1: CDN 更新（2 個文件）

#### 1.1 card-display.html
**位置**: Line 21  
**變更前**:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"
        integrity="sha512-pUhApVQtLbnpLtJn6DuzDD5o2xtmLJnJ7oBoMsBnzOkVkpqofGLGPaBJ6ayD2zQe3lCgCibhJBi4cj5wAxwVKA=="
        crossorigin="anonymous"
        defer></script>
```

**變更後**:
```html
<script src="https://unpkg.com/qr-creator@1.0.0/dist/qr-creator.min.js" defer></script>
```

**備註**: unpkg 不支援 SRI，但 qr-creator 為 MIT License，風險可控

#### 1.2 admin-dashboard.html
**位置**: Line 24  
**變更**: 同 1.1

---

### Phase 2: JavaScript API 遷移（1 個文件）

#### 2.1 main.js - QR Code 生成邏輯
**位置**: Line 1005-1020  
**功能**: 名片 URL QR Code 生成

**變更前**:
```javascript
// Create canvas for QRious
const canvas = document.createElement('canvas');
qrContainer.appendChild(canvas);

// Use QRious (modern QR code library)
new QRious({
    element: canvas,
    value: cardUrl,
    size: 240,
    background: 'white',
    foreground: 'black',
    level: 'H'
});
```

**變更後**:
```javascript
// Create canvas for qr-creator
const canvas = document.createElement('canvas');
qrContainer.appendChild(canvas);

// Use qr-creator (MIT License QR code library)
QrCreator.render({
    text: cardUrl,
    radius: 0,
    ecLevel: 'H',
    fill: '#000000',
    background: '#ffffff',
    size: 240
}, canvas);
```

**變更說明**:
- `element` → 移到第二參數
- `value` → `text`
- `background: 'white'` → `background: '#ffffff'`
- `foreground: 'black'` → `fill: '#000000'`
- `level` → `ecLevel`
- 新增 `radius: 0`（保持方形）

---

### Phase 3: 輸入驗證增強（防禦性編程）

#### 3.1 添加驗證函數
**位置**: main.js 開頭（line ~20）

**新增代碼**:
```javascript
/**
 * 驗證 QR Code 輸入
 * @param {string} text - QR Code 內容
 * @throws {Error} 如果輸入無效
 */
function validateQRInput(text) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
        throw new Error('QR Code text cannot be empty');
    }
    if (text.length > 2953) {
        throw new Error('QR Code text too long (max 2953 characters)');
    }
}
```

#### 3.2 應用驗證
**位置**: Line 1005-1020（QR Code 生成處）

**變更後**:
```javascript
// Validate input
try {
    validateQRInput(cardUrl);
} catch (error) {
    console.error('QR Code generation failed:', error);
    showError('無法生成 QR Code');
    return;
}

// Create canvas for qr-creator
const canvas = document.createElement('canvas');
qrContainer.appendChild(canvas);

// Use qr-creator (MIT License QR code library)
QrCreator.render({
    text: cardUrl,
    radius: 0,
    ecLevel: 'H',
    fill: '#000000',
    background: '#ffffff',
    size: 240
}, canvas);
```

---

### Phase 4: 文檔更新

#### 4.1 THIRD_PARTY_LICENSES.md
**變更**: 移除 QRious，添加 qr-creator

**移除**:
```markdown
### 4. QRious
- **版本**: 4.0.2
- **授權**: GPL-3.0 License
```

**新增**:
```markdown
### 4. qr-creator
- **版本**: 1.0.0
- **來源**: https://unpkg.com/qr-creator@1.0.0/dist/qr-creator.min.js
- **授權**: MIT License
- **用途**: 離線 QR Code 生成
- **授權連結**: https://github.com/nimiq/qr-creator/blob/master/LICENSE
- **合規性**: ✅ 可商用、可修改、可分發
- **備註**: 無 SRI（unpkg 不支援 CORS）
```

#### 4.2 更新授權總結表
**變更前**: GPL-3.0: 1  
**變更後**: GPL-3.0: 0

---

### Phase 5: 測試驗證

#### 5.1 功能測試清單
- [ ] card-display.html - QR Code 按鈕點擊
- [ ] card-display.html - QR Code 顯示正確
- [ ] card-display.html - QR Code 可掃描
- [ ] admin-dashboard.html - 預覽功能 QR Code
- [ ] 手機掃描測試（iOS + Android）
- [ ] 不同尺寸測試（responsive）

#### 5.2 回歸測試
- [ ] vCard 下載功能正常
- [ ] 語言切換功能正常
- [ ] 離線模式正常
- [ ] 所有現有功能無破壞

---

## 📝 BDD 驗收規格

### Scenario 1: QR Code 生成成功
**Given**: 使用者點擊「顯示 QR Code」按鈕  
**When**: 系統生成名片 URL QR Code  
**Then**: 
- QR Code 正確顯示在 Modal 中
- QR Code 尺寸為 240x240
- QR Code 可被手機掃描
- 掃描後導向正確的名片頁面

### Scenario 2: 空字串驗證
**Given**: 系統嘗試生成空字串 QR Code  
**When**: 呼叫 QR Code 生成函數  
**Then**: 
- 拋出錯誤「QR Code text cannot be empty」
- 不生成 QR Code
- 顯示錯誤訊息給使用者

### Scenario 3: 超長文字驗證
**Given**: 系統嘗試生成超過 2953 字元的 QR Code  
**When**: 呼叫 QR Code 生成函數  
**Then**: 
- 拋出錯誤「QR Code text too long」
- 不生成 QR Code
- 顯示錯誤訊息給使用者

### Scenario 4: 向後相容性
**Given**: 現有的名片 URL 格式  
**When**: 生成 QR Code  
**Then**: 
- QR Code 與舊版本相同
- 掃描結果相同
- 無功能降級

---

## ⚠️ 風險評估

### 低風險
- ✅ API 差異小，容易遷移
- ✅ 只有 1 處使用，影響範圍小
- ✅ 測試頁面已驗證功能完整

### 中風險
- ⚠️ unpkg CDN 無 SRI（可接受，MIT License）
- ⚠️ 空字串驗證需手動實作（已規劃）

### 零風險
- ✅ 授權問題完全解決（MIT License）
- ✅ 檔案更小，性能更好
- ✅ 維護更活躍

---

## 📅 執行時程

### 預估時間: 30 分鐘

1. **Phase 1**: CDN 更新（5 分鐘）
2. **Phase 2**: JavaScript 遷移（10 分鐘）
3. **Phase 3**: 驗證增強（5 分鐘）
4. **Phase 4**: 文檔更新（5 分鐘）
5. **Phase 5**: 測試驗證（5 分鐘）

---

## ✅ 完成標準

- [ ] 所有 QRious 引用已移除
- [ ] qr-creator 正常運作
- [ ] 輸入驗證已實作
- [ ] 文檔已更新
- [ ] 所有測試通過
- [ ] 無功能降級
- [ ] 授權合規（100% MIT/Apache 2.0）

---

## 🚀 執行指令

```bash
# 1. 更新 HTML 文件
# 手動編輯 card-display.html 和 admin-dashboard.html

# 2. 更新 JavaScript
# 手動編輯 main.js

# 3. 測試
cd workers
npm run dev
# 訪問 http://localhost:8787/card-display.html
# 測試 QR Code 功能

# 4. 提交變更
git add .
git commit -m "refactor: replace QRious with qr-creator (MIT License)

- Remove QRious (GPL-3.0 license confusion)
- Add qr-creator 1.0.0 (MIT License)
- Add input validation for QR code generation
- Update THIRD_PARTY_LICENSES.md
- Resolve license compliance issues

Closes #XXX"
```

---

**準備就緒，等待執行指令。**
