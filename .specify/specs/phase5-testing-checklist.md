# Phase 5: 測試驗證清單

**測試日期**: 2026-01-24  
**測試版本**: v4.3.3 (QRious → qr-creator)  
**測試環境**: http://localhost:8787

---

## ✅ 功能測試清單

### 1. card-display.html - QR Code 功能
- [ ] 點擊「顯示 QR Code」按鈕
- [ ] QR Code Modal 正常顯示
- [ ] QR Code 圖像清晰可見
- [ ] QR Code 尺寸正確（240x240）
- [ ] 關閉按鈕正常運作
- [ ] 使用手機掃描 QR Code
- [ ] 掃描後導向正確頁面

### 2. admin-dashboard.html - 預覽功能
- [ ] 登入管理後台
- [ ] 點擊「預覽」按鈕
- [ ] QR Code 正常生成
- [ ] QR Code 可掃描

### 3. 輸入驗證測試
- [ ] 空字串驗證（應拒絕）
- [ ] 超長文字驗證（應拒絕）
- [ ] 正常 URL 驗證（應通過）

### 4. 回歸測試
- [ ] vCard 下載功能正常
- [ ] 語言切換功能正常
- [ ] 離線模式正常
- [ ] 3D 背景動畫正常
- [ ] 所有按鈕功能正常

### 5. 跨瀏覽器測試
- [ ] Chrome/Edge (Chromium)
- [ ] Safari (WebKit)
- [ ] Firefox (Gecko)

### 6. 手機測試
- [ ] iOS Safari
- [ ] Android Chrome

---

## 🧪 自動化測試腳本

### 測試 1: 基本功能驗證
```bash
# 測試頁面可訪問
curl -s http://localhost:8787/card-display.html | grep -q "qr-creator" && echo "✅ qr-creator 已載入" || echo "❌ qr-creator 未載入"

# 測試 admin-dashboard
curl -s http://localhost:8787/admin-dashboard.html | grep -q "qr-creator" && echo "✅ admin-dashboard qr-creator 已載入" || echo "❌ admin-dashboard qr-creator 未載入"
```

### 測試 2: JavaScript 語法檢查
```bash
# 檢查 main.js 是否有語法錯誤
node -c workers/public/js/main.js && echo "✅ main.js 語法正確" || echo "❌ main.js 語法錯誤"
```

### 測試 3: 驗證函數測試
```javascript
// 在瀏覽器 Console 執行
try {
    validateQRInput(''); // 應拋出錯誤
    console.log('❌ 空字串驗證失敗');
} catch (e) {
    console.log('✅ 空字串驗證通過:', e.message);
}

try {
    validateQRInput('A'.repeat(3000)); // 應拋出錯誤
    console.log('❌ 超長文字驗證失敗');
} catch (e) {
    console.log('✅ 超長文字驗證通過:', e.message);
}

try {
    validateQRInput('https://example.com'); // 應通過
    console.log('✅ 正常 URL 驗證通過');
} catch (e) {
    console.log('❌ 正常 URL 驗證失敗:', e.message);
}
```

---

## 📋 測試結果記錄

### 功能測試
| 測試項目 | 狀態 | 備註 |
|---------|------|------|
| QR Code 生成 | ⏳ 待測試 | |
| QR Code 掃描 | ⏳ 待測試 | |
| 輸入驗證 | ⏳ 待測試 | |
| 回歸測試 | ⏳ 待測試 | |

### 瀏覽器相容性
| 瀏覽器 | 版本 | 狀態 | 備註 |
|--------|------|------|------|
| Chrome | Latest | ⏳ 待測試 | |
| Safari | Latest | ⏳ 待測試 | |
| Firefox | Latest | ⏳ 待測試 | |

### 手機測試
| 裝置 | 系統 | 狀態 | 備註 |
|------|------|------|------|
| iPhone | iOS | ⏳ 待測試 | |
| Android | Latest | ⏳ 待測試 | |

---

## 🎯 驗收標準

### 必須通過 (P0)
- ✅ QR Code 正常生成
- ✅ QR Code 可掃描
- ✅ 輸入驗證正常運作
- ✅ 無 JavaScript 錯誤

### 應該通過 (P1)
- ✅ 所有回歸測試通過
- ✅ 跨瀏覽器相容
- ✅ 手機掃描正常

### 可選通過 (P2)
- ✅ 性能無降級
- ✅ 視覺效果一致

---

## 📝 測試指引

### 手動測試步驟

1. **開啟測試頁面**
   ```
   http://localhost:8787/card-display.html?card=test-uuid
   ```

2. **測試 QR Code 功能**
   - 點擊右下角「QR Code」按鈕
   - 確認 Modal 彈出
   - 確認 QR Code 顯示
   - 使用手機掃描

3. **測試驗證功能**
   - 開啟瀏覽器 Console
   - 執行驗證測試腳本
   - 確認錯誤訊息正確

4. **回歸測試**
   - 測試所有現有功能
   - 確認無破壞性變更

---

## 🚀 完成後動作

測試通過後執行：

1. **清理測試文件**
   ```bash
   rm workers/public/test-qr-creator.html
   ```

2. **提交變更**
   ```bash
   git add .
   git commit -m "refactor: replace QRious with qr-creator (MIT License)

   - Remove QRious (GPL-3.0 license confusion)
   - Add qr-creator 1.0.0 (MIT License)
   - Add input validation for QR code generation
   - Update THIRD_PARTY_LICENSES.md
   - Security scan: 0 vulnerabilities
   - All tests passed

   BREAKING CHANGE: None (API compatible)
   Closes #XXX"
   ```

3. **更新記憶**
   - 更新 progress.md
   - 更新 knowledge_graph.mem

---

**測試環境已就緒，請開始手動測試！**
