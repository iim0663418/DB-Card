# Card View Loading 動畫時脈整理

## 📊 時間軸

```
0ms     頁面載入
        ↓
        初始文字: "雲端資料解密中..." / "Decrypting cloud data..."
        動畫: pulse (2s 週期)
        ↓
~4000ms 後端正常回應 (實測)
        ↓ 成功
        hideLoading() → 顯示名片
        
        ↓ 失敗/超時
4000ms  Timeout 觸發
        ↓
        文字: "連線逾時，請稍候..." / "Connection timeout, please wait..."
        顯示: 取消按鈕
        ↓
        使用者可選擇:
        1. 點擊取消 → 顯示錯誤 + 重試按鈕
        2. 繼續等待 → 最終錯誤處理
```

---

## 🎯 狀態管理

### loadingStage
```javascript
0: 未初始化
1: 正常載入中 (0-4s)
2: 重試中 (網路錯誤重試)
```

### loadingTimer
```javascript
setTimeout(() => {
  // 4s 後顯示取消按鈕和逾時文字
}, 4000);
```

### loadingAbortController
```javascript
// 使用者點擊取消按鈕時 abort()
// 傳遞給 readCard() 作為 externalSignal
```

---

## 📝 文字變化

| 時間 | 中文 | 英文 | 觸發條件 |
|------|------|------|---------|
| 0-4s | 雲端資料解密中... | Decrypting cloud data... | 初始 |
| 4s+ | 連線逾時，請稍候... | Connection timeout, please wait... | Timeout |
| 重試 | 正在重試 (1/3)... | Retrying (1/3)... | onRetry callback |

---

## 🔧 函數職責

### showProgressiveLoading()
**職責**: 初始化 loading 狀態
- 建立 AbortController
- 設定 4s timer
- 綁定取消按鈕事件
- 設定初始文字

### updateRetryProgress(attempt, max)
**職責**: 更新重試進度
- 顯示重試次數
- 更新 loadingStage = 2

### clearLoadingTimer()
**職責**: 清理所有 loading 狀態
- 清除 timer
- 重置 stage
- 清除 AbortController
- 隱藏取消按鈕

---

## ⚠️ 已修正的衝突

### 問題
**HTML inline script** 有 3 秒 timeout:
```javascript
setTimeout(() => {
  loadingText.textContent = '處理中，請稍候...';
}, 3000);
```

**main.js** 有 4 秒 timeout:
```javascript
loadingTimer = setTimeout(() => {
  loadingText.textContent = '連線逾時，請稍候...';
}, 4000);
```

### 解決方案
✅ **移除 HTML inline 的 3 秒 timeout**  
✅ **統一由 main.js 管理**  
✅ **單一時脈: 4 秒**

---

## 🎨 動畫

### Pulse Animation
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}
```
- 週期: **2 秒**
- 應用於: loading-text, loading-icon
- 持續時間: 整個 loading 期間

### Spin Animation
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
```
- 週期: **1 秒**
- 應用於: border-t-2 (spinner)
- 持續時間: 整個 loading 期間

### Ping Animation
```css
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}
```
- 週期: **1 秒**
- 應用於: border-2 (外圈)
- 持續時間: 整個 loading 期間

---

## 🧪 測試場景

### 場景 1: 正常載入 (< 4s)
```
0s → "雲端資料解密中..."
2s → 後端回應
   → hideLoading()
   → 顯示名片
```

### 場景 2: Timeout (4s)
```
0s → "雲端資料解密中..."
4s → Timeout 觸發
   → "連線逾時，請稍候..."
   → 顯示取消按鈕
   → AbortError
   → 顯示錯誤 + 重試按鈕
```

### 場景 3: 網路錯誤重試
```
0s → "雲端資料解密中..."
1s → Network error (ECONNRESET)
   → "正在重試 (1/3)..."
   → 等待 1s
2s → 重試
   → "正在重試 (2/3)..."
   → 等待 2s
4s → 重試
   → "正在重試 (3/3)..."
   → 等待 4s
8s → RetryExhaustedError
   → 顯示錯誤 + 重試按鈕
```

### 場景 4: 使用者取消
```
0s → "雲端資料解密中..."
4s → "連線逾時，請稍候..."
   → 顯示取消按鈕
5s → 使用者點擊取消
   → AbortController.abort()
   → clearLoadingTimer()
   → "已取消載入" + 重試按鈕
```

---

## 📊 時脈衝突檢查表

- [x] HTML inline 3s timeout **已移除**
- [x] main.js 4s timeout **保留**
- [x] 單一文字控制點 **main.js**
- [x] 單一 timer 管理 **loadingTimer**
- [x] 清理機制完整 **clearLoadingTimer()**

---

## 🎯 最佳實踐

1. **單一真相來源**: 所有 loading 文字由 main.js 管理
2. **明確的狀態**: loadingStage 追蹤當前階段
3. **完整的清理**: clearLoadingTimer() 清除所有狀態
4. **使用者控制**: 4s 後提供取消選項
5. **錯誤上下文**: 顯示 HTTP 狀態和重試次數

---

**建立日期**: 2026-02-25  
**版本**: v1.0  
**狀態**: 已整理 ✅
