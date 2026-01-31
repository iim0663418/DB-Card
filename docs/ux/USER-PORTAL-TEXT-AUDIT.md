# User Portal 介面文字友善評估報告
**評估日期**: 2026-01-27  
**評估標準**: 2026 UX Writing Best Practices

---

## 📊 評估總覽

| 類別 | 評分 | 問題數 | 優先級 |
|------|------|--------|--------|
| 按鈕文字 | 7/10 | 3 | P1 |
| 表單標籤 | 8/10 | 2 | P2 |
| Placeholder | 6/10 | 5 | P1 |
| 錯誤訊息 | 5/10 | 4 | P0 |
| 說明文字 | 7/10 | 2 | P2 |
| 無障礙性 | 6/10 | 3 | P1 |

**總體評分**: 6.5/10 ⚠️ 需要改進

---

## 🔴 P0 問題（嚴重，立即修正）

### 1. 錯誤訊息不夠友善
**位置**: 登入錯誤、表單驗證錯誤

**問題**:
```html
<!-- 目前：空的錯誤容器，由 JS 動態注入 -->
<div id="login-error-box" class="hidden">
    <!-- 錯誤訊息注入 -->
</div>
```

**最佳實踐** (來源: Netguru 2026):
- 錯誤訊息應該清楚說明問題
- 提供具體的解決方案
- 使用友善的語氣，不要責怪使用者

**建議改進**:
```javascript
// 不好：「登入失敗」
// 好：「無法登入，請確認您使用的是 @moda.gov.tw 帳號」

// 不好：「欄位不能為空」
// 好：「請輸入您的中文姓名」
```

---

## 🟠 P1 問題（重要，優先修正）

### 2. Placeholder 文字過於技術性
**位置**: 大頭貼 URL 欄位

**問題**:
```html
<input placeholder="https://drive.google.com/file/d/...">
```

**最佳實踐** (來源: Substack 2026):
- Placeholder 不應該是必要資訊
- 應該提供範例，而非指令

**建議改進**:
```html
<input placeholder="貼上 Google Drive 分享連結">
```

### 3. 按鈕文字不夠明確
**位置**: 表單提交按鈕

**問題**:
```html
<button>儲存</button>
```

**最佳實踐** (來源: Netguru 2026):
- 按鈕應該清楚說明動作結果
- 避免使用「提交」、「確定」等模糊詞彙

**建議改進**:
```html
<button>儲存並預覽名片</button>
```

### 4. 社交連結欄位缺少說明
**位置**: Signal, LINE 等欄位

**問題**:
```html
<input id="social_signal" placeholder="+886912345678 或 https://signal.me/#p/+886...">
```

**最佳實踐**:
- 複雜格式需要額外說明
- 提供「為什麼需要這個」的資訊

**建議改進**:
```html
<label>
  Signal
  <span class="hint">輸入手機號碼，方便他人聯繫</span>
</label>
<input placeholder="+886912345678">
```

### 5. 無障礙標籤不完整
**位置**: 多個表單欄位

**問題**:
```html
<input id="name_zh" placeholder="如：王大明" required>
<!-- 缺少 <label> 或 aria-label -->
```

**最佳實踐** (來源: Netguru 2026):
- 所有輸入欄位必須有明確的標籤
- 使用 `<label for>` 或 `aria-label`

**建議改進**:
```html
<label for="name_zh">中文姓名 *</label>
<input id="name_zh" placeholder="如：王大明" required>
```

---

## 🟡 P2 問題（改善，建議修正）

### 6. 標籤文字過於簡短
**位置**: 部門選擇

**問題**:
```html
<label>所屬部門</label>
```

**建議改進**:
```html
<label>選擇您的所屬部門</label>
```

### 7. 成功訊息缺少下一步指引
**位置**: 儲存成功後

**問題**:
- 只顯示「儲存成功」
- 沒有告訴使用者接下來可以做什麼

**建議改進**:
```
✓ 名片已儲存
您現在可以：
• 預覽名片效果
• 下載 QR Code
• 分享給他人
```

---

## ✅ 做得好的地方

1. **雙語支援完整** - 中英文標籤清楚
2. **視覺層次清晰** - 使用大小寫和顏色區分
3. **一致性良好** - 相同類型的欄位使用相同的文字模式

---

## 📋 優先改進清單

### 立即修正 (本週)
1. ✅ 新增友善的錯誤訊息
2. ✅ 改進按鈕文字（說明動作結果）
3. ✅ 補充無障礙標籤

### 短期改進 (2 週內)
4. ⏳ 優化 Placeholder 文字
5. ⏳ 新增欄位說明文字
6. ⏳ 改進成功訊息

### 長期改進 (1 個月內)
7. ⏳ 建立統一的文字風格指南
8. ⏳ 進行使用者測試
9. ⏳ 建立錯誤訊息庫

---

## 🎯 建議的文字風格指南

### 語氣
- ✅ 友善、專業、清楚
- ❌ 技術性、命令式、模糊

### 按鈕
- ✅ 「儲存並預覽」、「下載名片」
- ❌ 「提交」、「確定」、「OK」

### 錯誤訊息
- ✅ 「請輸入您的中文姓名」
- ❌ 「欄位不能為空」

### Placeholder
- ✅ 「如：王大明」
- ❌ 「請輸入姓名」

---

## 📚 參考資料

1. Netguru (2026) - "Hidden Web Accessibility Issues Most Designers Miss"
2. Substack (2026) - "The Anatomy of an Input Field"
3. SlideShare (2026) - "12 Great Examples of UX Writing"
4. Interaction Design Foundation - "Mobile UX Design Best Practices"

---

**評估人員**: AI Assistant  
**下次評估**: 2026-02-27
