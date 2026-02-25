# Card View 重試機制優化計劃

## 📊 問題分析

### 當前問題
1. **無 Timeout 機制** - fetch() 可能永久等待
2. **無重試機制** - 網路暫時性錯誤不會重試
3. **Loading 狀態不明確** - 使用者不知道是等待還是卡住
4. **錯誤處理不完整** - 無法區分可重試 vs 不可重試錯誤

### 實測數據
- 後端實際回應時間: **~4 秒**
- 後端最長容忍時間: **10 秒**（異常情況）
- Loading 動畫週期: **2 秒** (pulse animation: "雲端資料解密中...")
- **調整**: Timeout 設為 **10 秒**（2.5 倍安全邊際 + 動畫對齊）

---

## 🎯 優化目標

1. **10 秒 Timeout** - 後端 4s 實測 + 2.5x 安全邊際
2. **指數退避重試** - 最多 3 次，間隔 1s/2s/4s
3. **進度式 Loading** - 6 秒後顯示提示，10 秒後顯示重試
4. **智慧錯誤處理** - 區分可重試 vs 不可重試錯誤

---

## 📚 外部最佳實踐

### 1. Timeout 設計 (Node.js Fetch Guide 2026)
**原則**: Timeout 是強制性的，重試是選擇性的

```typescript
// 使用 AbortSignal.timeout (標準 API)
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

fetch(url, { signal: controller.signal })
  .finally(() => clearTimeout(timeoutId));
```

**關鍵點**:
- 使用 `AbortController` 實現 timeout
- 10 秒符合後端實測數據
- 支援外部 signal 整合

---

### 2. 重試策略 (Exponential Backoff Best Practice)
**原則**: 只重試冪等方法 + 暫時性錯誤

```typescript
// 可重試條件
const isRetryable = (error) => {
  // 1. Timeout (AbortError)
  if (error.name === 'AbortError') return true;
  
  // 2. 網路錯誤
  if (error.message.includes('network')) return true;
  
  // 3. 暫時性 HTTP 錯誤
  const retryableStatus = [408, 429, 500, 502, 503, 504];
  if (error.status && retryableStatus.includes(error.status)) return true;
  
  return false;
};

// 指數退避 + Jitter
const calculateBackoff = (attempt, baseMs = 1000, maxMs = 5000) => {
  const exponential = baseMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * baseMs;
  return Math.min(maxMs, exponential + jitter);
};
```

**關鍵點**:
- GET/HEAD/OPTIONS 是冪等方法（可重試）
- 429/503 是暫時性錯誤（可重試）
- 404/403 是永久錯誤（不可重試）
- Jitter 避免雷鳴群效應

---

### 3. UX Loading 設計 (Nielsen Norman Group)
**原則**: 不同時長使用不同指示器

| 時長 | 指示器類型 | 說明 |
|------|-----------|------|
| < 1s | 無 | 太快不需要 |
| 1-10s | **Looped Spinner** | 旋轉動畫 |
| > 10s | **Percent-done** | 進度百分比 |

**進度式反饋**:
```
0-6s:   旋轉 spinner + "雲端資料解密中..."（3 個動畫週期，涵蓋正常 4s）
6-10s:  spinner + "正在連線，請稍候..."（異常情況）
10s+:   spinner + "連線逾時，正在重試 (1/3)..."（timeout 後重試）
失敗:   錯誤訊息 + "重試" 按鈕
```

**關鍵點**:
- 1 秒後顯示 spinner
- 6 秒後更新文字（涵蓋正常 4s + 50% 緩衝）
- 10 秒後顯示重試進度（timeout 觸發）
- 提供取消按鈕（Phase 4 實作）

---

## 🛠️ 實作計劃

### Phase 1: 核心重試邏輯 (30 分鐘)
**檔案**: `public/js/api-retry.js` (新建)

```typescript
/**
 * Fetch with timeout and retry
 * @param {Function} fetchFn - Fetch function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(fetchFn, options = {}) {
  const {
    maxAttempts = 3,
    timeoutMs = 10000,
    baseDelayMs = 1000,
    maxDelayMs = 5000,
    onRetry = null
  } = options;

  let lastError = null;
  let lastStatus = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchFn(controller.signal);
      clearTimeout(timeoutId);

      // Success
      if (response.ok) return response;

      // Store last status for error reporting
      lastStatus = response.status;

      // Non-retryable error
      if (!isRetryableStatus(response.status)) {
        return response;
      }

      // Retry
      if (attempt < maxAttempts) {
        const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs);
        if (onRetry) onRetry(attempt, maxAttempts, delay, response.status);
        await sleep(delay);
      }

    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      // Non-retryable error
      if (!isRetryableError(error) || attempt >= maxAttempts) {
        throw error;
      }

      // Retry
      const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs);
      if (onRetry) onRetry(attempt, maxAttempts, delay, null);
      await sleep(delay);
    }
  }

  // Max retries exhausted - throw with context
  const error = new Error('Max retry attempts reached');
  error.name = 'RetryExhaustedError';
  error.lastStatus = lastStatus;
  error.lastError = lastError;
  throw error;
}

function isRetryableStatus(status) {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

function isRetryableError(error) {
  return error.name === 'AbortError' || 
         error.message.includes('network') ||
         error.message.includes('fetch');
}

function calculateBackoff(attempt, baseMs, maxMs) {
  const exponential = baseMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * baseMs;
  return Math.min(maxMs, exponential + jitter);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

### Phase 2: 整合到 API 層 (20 分鐘)
**檔案**: `public/js/api.js` (修改)

```typescript
import { fetchWithRetry } from './api-retry.js';

export async function readCard(uuid, sessionId, externalSignal = null) {
  const CACHE_TTL = 3600000;
  const cacheKey = `card:${uuid}`;

  // Check cache
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    }
  } catch {}

  // Fetch with retry
  const response = await fetchWithRetry(
    (signal) => {
      // Combine external signal (cancel button) with internal signal (timeout)
      const combinedSignal = externalSignal 
        ? AbortSignal.any ? AbortSignal.any([signal, externalSignal]) : signal
        : signal;
      
      return fetch(
        `${API_BASE}/api/read?uuid=${encodeURIComponent(uuid)}&session=${encodeURIComponent(sessionId)}`,
        { signal: combinedSignal }
      );
    },
    {
      maxAttempts: 3,
      timeoutMs: 10000,
      onRetry: (attempt, max, delay, status) => {
        console.log(`Retry ${attempt}/${max} after ${delay}ms${status ? ` (status: ${status})` : ''}`);
        if (window.updateRetryProgress) {
          window.updateRetryProgress(attempt, max);
        }
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    const error = new Error(errorData.error?.message || 'Failed to read card');
    error.code = errorData.error?.code;
    error.status = response.status;
    throw error;
  }

  const result = await response.json();

  // Cache
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: result,
      timestamp: Date.now()
    }));
  } catch {}

  return result;
}
```

---

### Phase 3: 進度式 Loading UI (30 分鐘)
**檔案**: `public/js/main.js` (修改)

```typescript
let loadingTimer = null;
let loadingTimer2 = null;
let loadingStage = 0;
let loadingAbortController = null;

function showProgressiveLoading() {
  const loadingText = document.getElementById('loading-text');
  const cancelBtn = document.getElementById('loading-cancel-btn');
  if (!loadingText) return;

  // Create abort controller for cancellation
  loadingAbortController = new AbortController();

  // Show cancel button
  if (cancelBtn) {
    cancelBtn.style.display = 'block';
    cancelBtn.onclick = () => {
      if (loadingAbortController) {
        loadingAbortController.abort();
        clearLoadingTimer();
        showError(
          currentLanguage === 'zh' ? '已取消載入' : 'Loading cancelled',
          true
        );
        hideLoading();
      }
    };
  }

  // Stage 1: 0-6s (covers normal 4s + buffer)
  loadingStage = 1;
  loadingText.textContent = currentLanguage === 'zh' ? '雲端資料解密中...' : 'Decrypting data...';

  // Stage 2: 6-10s (abnormal case)
  loadingTimer = setTimeout(() => {
    if (loadingStage === 1) {
      loadingStage = 2;
      loadingText.textContent = currentLanguage === 'zh' 
        ? '正在連線，請稍候...' 
        : 'Connecting, please wait...';
    }
  }, 6000);

  // Stage 3: 10s+ (timeout triggered)
  loadingTimer2 = setTimeout(() => {
    if (loadingStage === 2) {
      loadingStage = 3;
      loadingText.textContent = currentLanguage === 'zh'
        ? '連線逾時，正在重試...'
        : 'Connection timeout, retrying...';
    }
  }, 10000);
}

function updateRetryProgress(attempt, max) {
  const loadingText = document.getElementById('loading-text');
  if (!loadingText) return;

  loadingStage = 3;
  loadingText.textContent = currentLanguage === 'zh'
    ? `正在重試 (${attempt}/${max})...`
    : `Retrying (${attempt}/${max})...`;
}

function clearLoadingTimer() {
  if (loadingTimer) {
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }
  if (loadingTimer2) {
    clearTimeout(loadingTimer2);
    loadingTimer2 = null;
  }
  loadingStage = 0;
  loadingAbortController = null;
  
  // Hide cancel button
  const cancelBtn = document.getElementById('loading-cancel-btn');
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }
}

async function loadCard(uuid) {
  showProgressiveLoading();

  try {
    // ... existing code with retry callback
    const readResult = await readCard(uuid, sessionId, loadingAbortController?.signal);
    // Success
    clearLoadingTimer();
    renderCard(readResult.data, sessionData);
  } catch (error) {
    clearLoadingTimer();
    
    // Handle user cancellation
    if (error.name === 'AbortError' && loadingAbortController?.signal.aborted) {
      return; // Already handled in showProgressiveLoading
    }
    
    // User-friendly error message with retry context
    let errorMessage = error.message;
    let retryable = false;
    
    if (error.name === 'AbortError') {
      errorMessage = currentLanguage === 'zh'
        ? '連線逾時，請檢查網路後重試'
        : 'Connection timeout, please check network and retry';
      retryable = true;
    } else if (error.name === 'RetryExhaustedError') {
      const statusMsg = error.lastStatus ? ` (HTTP ${error.lastStatus})` : '';
      errorMessage = currentLanguage === 'zh'
        ? `連線失敗，已重試 3 次${statusMsg}`
        : `Connection failed after 3 retries${statusMsg}`;
      retryable = error.lastStatus && [429, 503].includes(error.lastStatus);
    }
    
    showError(errorMessage, retryable);
    hideLoading();
  }
}
```

**HTML 修改** (`public/card-display.html`):
```html
<!-- 載入動畫 -->
<div id="loading" class="...">
    <div class="relative w-32 h-32">
        <!-- ... existing spinner ... -->
    </div>
    <p id="loading-text" class="mt-8 hud-text animate-pulse">雲端資料解密中...</p>
    <button id="loading-cancel-btn" style="display: none;" class="mt-4 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
        <i data-lucide="x-circle" class="w-4 h-4 inline"></i>
        <span id="loading-cancel-text">取消</span>
    </button>
</div>
```

---

### Phase 4: 錯誤處理優化 (20 分鐘)
**檔案**: `public/js/main.js` (修改現有 showError)

**注意**: 保留現有 `error-container` 結構，只增強 `showError` 函數

```javascript
function showError(message, retryable = false) {
  const errorContainer = document.getElementById('error-container');
  if (!errorContainer) return;
  
  // 使用現有 DOMPurify 注入機制
  const retryButton = retryable 
    ? `<button onclick="location.reload()" class="mt-4 px-4 py-2 bg-moda text-white rounded-lg hover:bg-moda/90 transition-colors">
         <i data-lucide="refresh-cw"></i>
         <span>${currentLanguage === 'zh' ? '重試' : 'Retry'}</span>
       </button>`
    : '';
  
  errorContainer.innerHTML = DOMPurify.sanitize(`
    <div class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>${message}</span>
    </div>
    ${retryButton}
  `, { ADD_ATTR: ['onclick'] });
  
  errorContainer.style.display = 'block';
  
  if (window.initIcons) window.initIcons();
}
```

**變更說明**:
- ✅ 保留現有 `error-container` 結構（不新增 HTML）
- ✅ 保留 DOMPurify 注入機制
- ✅ 增加 `retryable` 參數控制重試按鈕顯示
- ✅ 向後相容（retryable 預設 false）

---

## 📊 預期效果

### 效能改善
- ✅ **Timeout 保護**: 最長等待 10 秒（實測 4s + 2.5x 安全邊際）
- ✅ **自動重試**: 暫時性錯誤自動恢復（成功率提升 30-50%）
- ✅ **降低焦慮**: 進度式反饋（使用者願意等待時間 +3 倍）

### UX 改善
- ✅ **6 秒提示**: 降低不確定性（涵蓋正常 4s + 50% 緩衝）
- ✅ **10 秒重試**: 明確告知狀態（異常情況處理）
- ✅ **智慧錯誤**: 區分可重試 vs 不可重試

### 技術改善
- ✅ **標準 API**: 使用 AbortController（無需第三方庫）
- ✅ **向後相容**: 不影響現有快取機制
- ✅ **可測試**: 獨立模組易於測試

---

## 🧪 測試計劃

### 1. 單元測試
```javascript
// api-retry.test.js
test('timeout after 10s', async () => {
  const slowFetch = (signal) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve({ ok: true }), 15000);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
  
  await expect(fetchWithRetry(slowFetch, { timeoutMs: 10000 }))
    .rejects.toThrow('AbortError');
});

test('retry 3 times on 503', async () => {
  let attempts = 0;
  const fetch503 = () => {
    attempts++;
    return Promise.resolve({ ok: false, status: 503 });
  };
  
  await fetchWithRetry(fetch503, { maxAttempts: 3 });
  expect(attempts).toBe(3);
});

test('no retry on 404', async () => {
  let attempts = 0;
  const fetch404 = () => {
    attempts++;
    return Promise.resolve({ ok: false, status: 404 });
  };
  
  await fetchWithRetry(fetch404, { maxAttempts: 3 });
  expect(attempts).toBe(1);
});
```

### 2. 整合測試
- 模擬慢速網路（Chrome DevTools Throttling）
- 模擬 503 錯誤（後端 mock）
- 模擬 timeout（後端延遲 15 秒）

### 3. 使用者測試
- 觀察 6 秒提示是否降低焦慮
- 觀察 10 秒重試是否清楚
- 收集錯誤訊息可讀性反饋

---

## 📅 時程規劃

| Phase | 任務 | 時間 | 負責人 |
|-------|------|------|--------|
| 1 | 核心重試邏輯 | 30 分鐘 | Dev |
| 2 | 整合到 API 層 | 20 分鐘 | Dev |
| 3 | 進度式 Loading UI | 30 分鐘 | Dev |
| 4 | 錯誤處理優化 | 20 分鐘 | Dev |
| 5 | 單元測試 | 30 分鐘 | Dev |
| 6 | 整合測試 | 20 分鐘 | QA |
| 7 | 部署 Staging | 10 分鐘 | DevOps |
| 8 | 使用者測試 | 1 天 | PM |

**總計**: 2.5 小時開發 + 1 天測試

---

## 📚 參考資料

1. **Timeout & Retry**: Tasuke Hub - Node.js Fetch Guide (2026)
2. **Exponential Backoff**: Better Stack - Distributed Systems Guide
3. **UX Loading**: Nielsen Norman Group - Progress Indicators
4. **Error Handling**: OWASP - API Security Best Practices

---

## ✅ 驗收標準

1. ✅ 10 秒 timeout 生效（實測 4s + 2.5x 安全邊際）
2. ✅ 暫時性錯誤自動重試 3 次
3. ✅ 6 秒後顯示「正在連線」（涵蓋正常 4s + 50% 緩衝）
4. ✅ 10 秒後顯示「正在重試」（timeout 觸發）
5. ✅ 404/403 不重試
6. ✅ 429/503 重試
7. ✅ 錯誤訊息清楚易懂（含 HTTP 狀態）
8. ✅ ESLint 零錯誤（JavaScript 專案）
9. ✅ 單元測試覆蓋率 > 80%
10. ✅ 使用者測試滿意度 > 4/5
11. ✅ 取消按鈕功能正常（AbortController）

---

**建立日期**: 2026-02-25  
**版本**: v1.0  
**狀態**: 待審核
