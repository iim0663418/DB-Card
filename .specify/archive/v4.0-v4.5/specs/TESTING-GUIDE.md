# Admin Dashboard Phase 1 - Testing Guide

## 🧪 Quick Testing Checklist

### Prerequisites
- ✅ Backend API 已部署到 staging
- ✅ SETUP_TOKEN 已設定
- ✅ 瀏覽器支援 ES6+ (Chrome, Firefox, Safari, Edge)

---

## Test 1: Token Verification ✓

### Steps:
1. 開啟 `http://localhost:8787/admin-dashboard.html`
2. 在「輸入 SETUP_TOKEN」欄位輸入正確的 token
3. 點擊「驗證權限」

### Expected Results:
- ✅ 綠色通知：「授權驗證成功」
- ✅ Token 區塊隱藏
- ✅ 顯示「已授權」狀態（綠點 + 文字）
- ✅ Tab 導航列顯示
- ✅ 主要內容區顯示
- ✅ 自動切換到「名片列表」Tab

### Error Cases:
1. **空白 Token**
   - 紅色通知：「請輸入 SETUP_TOKEN」

2. **錯誤 Token**
   - 紅色通知：「授權驗證失敗」

3. **網路錯誤**
   - 紅色通知：「無法連接到伺服器」

---

## Test 2: Create Card ✓

### Steps:
1. 切換到「創建名片」Tab
2. 填寫表單：
   - 中文姓名：王大明
   - English Name: David Wang
   - Email: david.wang@moda.gov.tw
   - 部門：數位策略司
3. 展開「進階資訊與社群」
4. 填寫：
   - 中文職稱：司長
   - English Title: Director General
   - 社群備註：LinkedIn: david-wang
5. 選擇卡片類型：個人名片 (20次)
6. 點擊「簽發並部署」

### Expected Results:
- ✅ 綠色通知：「名片創建成功！」
- ✅ 表單自動重置（所有欄位清空）
- ✅ 自動切換到「名片列表」Tab
- ✅ Console 無錯誤訊息

### Real-time Preview:
- ✅ 輸入「中文姓名」時，預覽卡片的名字即時更新
- ✅ 輸入「中文職稱」時，預覽卡片的職稱即時更新

### Error Cases:
1. **未授權**
   - 紅色通知：「未授權：請重新驗證」

2. **API 錯誤**
   - 紅色通知：「創建失敗: [錯誤訊息]」

---

## Test 3: Delete Card ✓

### Steps:
1. 在「名片列表」Tab 中，找到一張測試卡片
2. 點擊「刪除」按鈕
3. 確認 Modal 彈出
4. 點擊「確認執行」

### Expected Results:
- ✅ Modal 標題：「確認刪除名片？」
- ✅ Modal 描述：「刪除後此 UUID 將永久失效...」
- ✅ 確認按鈕為紅色
- ✅ Modal 關閉
- ✅ 綠色通知：「名片已刪除」
- ✅ 卡片列表自動刷新（目前仍顯示 Mock 資料）

### Cancel Flow:
1. 點擊「刪除」按鈕
2. 在 Modal 中點擊「取消」
3. ✅ Modal 關閉，不執行任何操作

### Error Cases:
1. **未授權**
   - 紅色通知：「未授權：請重新驗證」

2. **API 錯誤**
   - 紅色通知：「刪除失敗: [錯誤訊息]」

---

## Test 4: Revoke Sessions ✓

### Steps:
1. 在「名片列表」Tab 中，找到一張測試卡片
2. 點擊「撤銷」按鈕
3. 確認 Modal 彈出
4. 點擊「確認執行」

### Expected Results:
- ✅ Modal 標題：「確認撤銷所有 Session？」
- ✅ Modal 描述：「此名片目前已簽發的讀取授權...」
- ✅ 確認按鈕為琥珀色
- ✅ Modal 關閉
- ✅ 綠色通知：「已撤銷 N 個 Session」（N 為實際撤銷數量）

### Error Cases:
1. **未授權**
   - 紅色通知：「未授權：請重新驗證」

2. **API 錯誤**
   - 紅色通知：「撤銷失敗: [錯誤訊息]」

---

## Test 5: Tab Switching ✓

### Steps:
1. 點擊「名片列表」Tab
2. 點擊「創建名片」Tab
3. 點擊「系統工具」Tab
4. 再次點擊「名片列表」Tab

### Expected Results:
- ✅ Tab 內容正確切換
- ✅ 啟用的 Tab 有底部藍色線條
- ✅ 啟用的 Tab 文字為藍色
- ✅ 切換流暢無閃爍
- ✅ Three.js 背景持續運行

---

## Test 6: Notification System ✓

### Test Success Notification:
1. 創建一張名片成功
2. ✅ 綠色通知顯示在右下角
3. ✅ 淡入動畫
4. ✅ 2 秒後自動淡出並移除

### Test Error Notification:
1. 輸入空白 Token 並驗證
2. ✅ 紅色通知顯示在右下角
3. ✅ 淡入動畫
4. ✅ 5 秒後自動淡出並移除

### Test Warning Notification:
1. 點擊任一卡片的「編輯」按鈕
2. ✅ 琥珀色通知：「編輯功能需要 GET API，Phase 2 實作」
3. ✅ 2 秒後自動移除

---

## Test 7: LocalStorage Persistence ✓

### Steps:
1. 輸入 Token 並驗證成功
2. 重新整理頁面
3. 檢查 Token 輸入框

### Expected Results:
- ✅ Token 自動填充在輸入框中
- ✅ 需要再次點擊「驗證權限」才能進入
- ✅ localStorage 中存在 `setup_token` key

### Developer Console:
```javascript
localStorage.getItem('setup_token')
// 應該返回你的 Token
```

---

## Test 8: Three.js Background ✓

### Visual Check:
- ✅ 頁面背景有粒子動畫
- ✅ 粒子緩慢旋轉
- ✅ 粒子顏色為紫色 (#6868ac)
- ✅ 不透明度約 20%
- ✅ 不影響前景內容的可讀性

### Performance:
- ✅ 動畫流暢（60fps）
- ✅ CPU 使用率正常
- ✅ 視窗縮放時正確調整

---

## Test 9: Responsive Design ✓

### Desktop (1920x1080):
- ✅ Tab 導航列水平排列
- ✅ 創建表單與預覽左右排列
- ✅ 卡片列表操作按鈕水平排列

### Tablet (768x1024):
- ✅ 佈局適當調整
- ✅ 內容不重疊
- ✅ 可讀性良好

### Mobile (375x667):
- ✅ Tab 可水平滾動
- ✅ 創建表單與預覽垂直堆疊
- ✅ 卡片操作按鈕垂直排列

---

## Test 10: Error Handling ✓

### Network Offline:
1. 開啟 DevTools → Network → Offline
2. 嘗試驗證 Token
3. ✅ 紅色通知：「無法連接到伺服器」

### API 500 Error (Simulate):
1. 在 DevTools Console 輸入：
```javascript
fetch = () => Promise.reject(new Error('Server Error'))
```
2. 嘗試創建卡片
3. ✅ 紅色通知：「創建失敗: Server Error」

---

## 🐛 Known Issues (Phase 1)

### Not Bugs - Expected Behavior:
1. **列表資料為 Mock**
   - 目前使用 MOCK_CARDS 陣列
   - 需要 GET API 才能載入真實資料

2. **編輯功能未實作**
   - 點擊「編輯」顯示警告通知
   - Phase 2 實作

3. **搜尋/篩選無作用**
   - UI 已存在但無功能
   - Phase 2 實作

4. **分頁固定顯示 "Page 1 of 1"**
   - 需要 GET API 提供總數
   - Phase 2 實作

5. **系統工具中的「全局撤銷」和「KEK 輪替」**
   - 顯示警告通知
   - 需要額外 API 端點

---

## 📊 Performance Benchmarks

### Page Load:
- Initial Load: < 2s
- Three.js Init: < 500ms
- Lucide Icons: < 200ms

### API Calls:
- Token Verify: < 300ms
- Create Card: < 500ms
- Delete Card: < 300ms
- Revoke Sessions: < 400ms

### Animations:
- Tab Switch: instant
- Modal Open/Close: 300ms
- Notification: 300ms fade

---

## 🔍 Browser Compatibility

### Tested & Supported:
- ✅ Chrome 100+
- ✅ Firefox 100+
- ✅ Safari 15+
- ✅ Edge 100+

### Required Features:
- ES6+ (async/await, arrow functions, template literals)
- Fetch API
- LocalStorage
- CSS Grid & Flexbox
- Backdrop Filter (for glass effect)

---

## 📝 Testing Report Template

```markdown
### Test Date: [YYYY-MM-DD]
### Tester: [Name]
### Environment: [localhost / staging / production]

#### Test Results:
- [ ] Token Verification
- [ ] Create Card
- [ ] Delete Card
- [ ] Revoke Sessions
- [ ] Tab Switching
- [ ] Notification System
- [ ] LocalStorage Persistence
- [ ] Three.js Background
- [ ] Responsive Design
- [ ] Error Handling

#### Issues Found:
1. [Description]
   - Severity: [Low / Medium / High / Critical]
   - Steps to Reproduce: [...]
   - Expected: [...]
   - Actual: [...]

#### Notes:
[Any additional observations]
```

---

**Testing Version**: Phase 1 v1.0.0
**Last Updated**: 2026-01-18
