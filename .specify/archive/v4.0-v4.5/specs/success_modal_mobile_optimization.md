# BDD Spec: Success Modal Mobile 優化與 Add to Home Screen 引導

## 問題分析

### 當前狀態
- Success Modal 顯示「名片已儲存」
- 包含分享連結和下一步操作建議
- 桌面版排版正常，但 mobile 可以更友善

### 需求
1. 新增「加入主畫面」引導（PWA Add to Home Screen）
2. 優化 mobile 排版（減少垂直空間佔用）
3. 強化 mobile 友善度（更大的觸控區域）

---

## Scenario 1: 新增「加入主畫面」引導

### Given
- 使用者成功儲存名片
- Success Modal 顯示

### When
- 使用者在 mobile 裝置上查看 modal

### Then
- 應該顯示「加入主畫面」的引導卡片
- 引導應該包含平台特定的說明（iOS/Android）
- 使用適當的圖標（home icon）

### 實作要求

```html
<!-- 在「下一步操作建議」區塊中新增第三個卡片 -->
<div class="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-white/50 hover:border-moda/30 transition-all cursor-default group">
    <div class="flex flex-col items-center text-center gap-2">
        <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <i data-lucide="home" class="w-5 h-5 text-blue-600"></i>
        </div>
        <div>
            <p class="text-xs font-black text-slate-700">加入主畫面</p>
            <p class="text-[10px] text-slate-500 mt-1">快速存取名片</p>
        </div>
    </div>
</div>
```

---

## Scenario 2: Mobile 排版優化

### Given
- Success Modal 在 mobile 裝置上顯示
- 螢幕高度有限

### When
- 使用者查看 modal

### Then
- Modal 應該適應螢幕高度
- 內容應該可滾動（如果超出螢幕）
- 按鈕應該固定在底部（或保持可見）

### 實作要求

```css
/* Mobile 優化 */
@media (max-width: 640px) {
    #success-modal .modal-content {
        max-height: 90vh;
        overflow-y: auto;
        margin: 1rem;
    }
    
    /* 減少內邊距 */
    #success-modal .modal-content {
        padding: 1.5rem;
    }
    
    /* 優化卡片網格 */
    .next-steps-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
    }
    
    /* 更大的觸控區域 */
    #success-modal button {
        min-height: 48px;
    }
}
```

---

## Scenario 3: 三欄網格改為響應式

### Given
- 「下一步操作建議」有 3 個卡片
- Mobile 螢幕寬度有限

### When
- 在 mobile 上顯示

### Then
- 應該改為單欄或雙欄佈局
- 卡片應該保持可讀性

### 實作要求

```html
<!-- 改用響應式 grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    <!-- NFC Card -->
    <div>...</div>
    <!-- URL Shortening -->
    <div>...</div>
    <!-- Add to Home Screen -->
    <div>...</div>
</div>
```

---

## Scenario 4: 簡化 Mobile 文案

### Given
- Mobile 螢幕空間有限

### When
- 在小螢幕上顯示

### Then
- 標題和說明應該簡潔
- 保持資訊完整性

### 實作要求

```html
<!-- 使用響應式文字大小 -->
<h3 class="text-xl sm:text-2xl font-black text-slate-900">名片已儲存</h3>
<p class="text-xs sm:text-sm text-slate-600 mt-2">您的名片已成功更新</p>
```

---

## Scenario 5: Add to Home Screen 平台檢測

### Given
- 使用者在不同平台上使用

### When
- 顯示「加入主畫面」引導

### Then
- iOS: 顯示「點擊分享按鈕 → 加入主畫面」
- Android: 顯示「點擊選單 → 安裝應用程式」
- Desktop: 隱藏或顯示通用說明

### 實作要求（選用）

```javascript
// 平台檢測
function getPlatform() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'desktop';
}

// 動態顯示說明
const platform = getPlatform();
if (platform === 'ios') {
    // 顯示 iOS 說明
} else if (platform === 'android') {
    // 顯示 Android 說明
}
```

---

## 驗收標準

### 功能
- ✅ 新增「加入主畫面」引導卡片
- ✅ Mobile 排版優化（單欄或雙欄）
- ✅ 內容可滾動（如果超出螢幕）
- ✅ 按鈕觸控區域 ≥ 48px

### 視覺
- ✅ 卡片網格響應式（1 欄 → 2 欄 → 3 欄）
- ✅ 文字大小響應式
- ✅ 間距適當（mobile 減少，desktop 正常）

### 使用者體驗
- ✅ Modal 不會超出螢幕
- ✅ 所有按鈕易於點擊
- ✅ 資訊清晰易讀

---

## 技術要求

- 最小化修改：只調整必要的 HTML 和 CSS
- 保持現有功能不受影響
- 確保 Lucide icons 正確渲染
- 維持無障礙設計（ARIA labels）
- 測試不同螢幕尺寸（320px - 1920px）
