# BDD Spec: QR Code 快速捷徑功能

## Feature: 主畫面 QR Code 快速啟動器
作為使用者，我希望能將名片 QR Code 加入主畫面，以便快速分享名片。

---

## Scenario 1: 極簡 QR 頁面立即顯示

**Given**: 使用者已安裝名片 QR 捷徑到主畫面  
**When**: 點擊主畫面圖示  
**Then**: 
- 在 500ms 內顯示 QR Code
- QR Code 尺寸為 280-320px（響應式）
- 背景為品牌色 #6868ac
- 白色圓角卡片容器（border-radius: 1.5rem）
- QR Code Error Correction Level 為 H（30% 容錯）
- 頁面總大小 < 5KB（未壓縮）

**Technical Requirements**:
```html
File: workers/public/qr-quick.html
- 極簡 HTML（< 40 行）
- 僅依賴 QRious 庫（CDN）
- 從 URL 參數取得 uuid
- 生成分享連結：${origin}/card-display.html?card=${uuid}
- 響應式尺寸：Math.min(window.innerWidth - 80, 320)
```

---

## Scenario 2: 動態 Manifest API

**Given**: 系統需要為每張名片生成專屬 manifest  
**When**: 請求 `/api/manifest/:uuid`  
**Then**:
- 返回 JSON 格式的 manifest
- 包含 name, short_name, start_url, display, icons
- start_url 指向 `/qr-quick.html?uuid=${uuid}`
- display 為 "standalone"
- orientation 為 "portrait"
- theme_color 和 background_color 為 #6868ac
- 驗證 UUID 格式（RFC 4122）
- 無效 UUID 返回 400 錯誤

**Technical Requirements**:
```typescript
File: workers/src/handlers/manifest.ts
- 新建 handleManifest(c: Context) 函數
- UUID 驗證正則：/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
- 返回 Content-Type: application/manifest+json
- icons 使用 /icons/icon-192.png 和 /icons/icon-512.png
- purpose: "any maskable"
```

**API Route**:
```typescript
File: workers/src/index.ts
- 添加路由：app.get('/api/manifest/:uuid', handleManifest)
```

---

## Scenario 3: user-portal.html 整合建立捷徑按鈕

**Given**: 使用者在名片列表查看自己的名片  
**When**: 點擊「建立主畫面捷徑」按鈕  
**Then**:
- 動態注入專屬 manifest（移除舊的，添加新的）
- 偵測平台（iOS/Android/Desktop）
- 顯示對應的引導 Modal
- iOS: 顯示分享按鈕圖示 + 「加入主畫面」步驟
- Android: 嘗試觸發 beforeinstallprompt，否則顯示引導
- Desktop: 顯示桌面版引導

**Technical Requirements**:
```javascript
File: workers/public/user-portal.html
- 在名片卡片中添加「建立主畫面捷徑」按鈕
- 實作 createShortcut(uuid) 函數
- 實作 showInstallGuide() 函數
- 實作平台偵測邏輯
- 使用 localStorage 記錄已關閉狀態（避免重複顯示）
```

---

## Scenario 4: iOS 引導 Modal

**Given**: iOS Safari 使用者點擊建立捷徑  
**When**: 系統偵測到 iOS 平台  
**Then**:
- 顯示引導 Modal
- 包含 iOS 分享按鈕圖示（SVG）
- 文字說明：「點選分享按鈕，然後選擇『加入主畫面』」
- 提供關閉按鈕
- 關閉後記錄到 localStorage（key: a2hs-guide-dismissed）

**Technical Requirements**:
```javascript
- 偵測條件：/ipad|iphone/i.test(navigator.userAgent) && ua.includes('Safari')
- Safari 版本檢查：>= 16.4
- 檢查是否已安裝：window.matchMedia('(display-mode: standalone)').matches
```

---

## Scenario 5: Android 自動提示（選用）

**Given**: Android Chrome 使用者點擊建立捷徑  
**When**: 系統偵測到 Android 平台且 beforeinstallprompt 可用  
**Then**:
- 自動觸發 deferredPrompt.prompt()
- 監聽使用者選擇結果
- 若無 beforeinstallprompt，顯示手動引導

**Technical Requirements**:
```javascript
- 監聽 beforeinstallprompt 事件
- 儲存 event 到 window.deferredPrompt
- 偵測條件：/android/i.test(navigator.userAgent)
```

---

## Acceptance Criteria

### P0 (必須)
- [x] qr-quick.html 頁面載入 < 500ms
- [x] QR Code 正確生成並可掃描
- [x] Manifest API 返回正確格式
- [x] UUID 驗證正常運作
- [x] user-portal.html 按鈕正常顯示

### P1 (重要)
- [x] iOS 引導 Modal 正確顯示
- [x] Android 平台偵測正常
- [x] 響應式設計適配手機/平板

### P2 (可選)
- [ ] Service Worker 離線支援
- [ ] 安裝統計追蹤
- [ ] 多語言支援

---

## Implementation Order

1. **qr-quick.html**（極簡 QR 頁面）
2. **handlers/manifest.ts**（動態 Manifest API）
3. **index.ts**（添加路由）
4. **user-portal.html**（整合按鈕與引導 UI）

---

## Testing Checklist

- [ ] qr-quick.html 在 iOS Safari 正常顯示
- [ ] qr-quick.html 在 Android Chrome 正常顯示
- [ ] QR Code 可被掃描並正確跳轉
- [ ] Manifest API 返回有效 JSON
- [ ] 無效 UUID 返回 400 錯誤
- [ ] 建立捷徑按鈕在名片列表顯示
- [ ] iOS 引導 Modal 正確顯示
- [ ] localStorage 記錄正常運作
- [ ] TypeScript 編譯通過
- [ ] 無 console 錯誤

---

## Performance Targets

| 指標 | 目標 | 驗證方式 |
|------|------|---------|
| qr-quick.html 大小 | < 5KB | `ls -lh qr-quick.html` |
| 首次載入時間 | < 500ms | Chrome DevTools Network |
| QR 生成時間 | < 100ms | Performance.now() |
| Manifest API 回應 | < 50ms | curl 測試 |

---

## Security Considerations

- UUID 格式驗證（防止 Path Traversal）
- Content-Type 正確設定
- 無 XSS 風險（QRious 庫安全）
- Manifest 無敏感資訊洩漏
