# Scenario: Gemini API Retry Mechanism

## Problem
- 前端遇到 Gemini 429 錯誤時直接崩潰
- 沒有重試機制處理暫時性配額錯誤

## Solution: Exponential Backoff Retry

### Backend: unified_extract.ts
**Given**: Gemini API 返回 429 QUOTA_EXCEEDED
**When**: unified_extract 呼叫 Gemini
**Then**: 
- 重試 3 次，指數退避 (1s, 2s, 4s) + jitter (±20%)
- 第 3 次失敗後返回 429 給前端
- 412/422 錯誤不重試，直接返回

### Frontend: received-cards.js
**Given**: 後端返回 429 錯誤
**When**: 上傳名片失敗
**Then**:
- 顯示 Toast: "⚠️ 系統繁忙，請稍後再試"
- 不要崩潰或拋出 uncaught error
- 允許用戶重新上傳

## Technical Requirements
1. 在 unified_extract.ts 加入 `retryWithBackoff()` 函式
2. 只對 429 錯誤重試（3 次）
3. 指數退避：1000ms, 2000ms, 4000ms
4. Jitter: ±20% 隨機延遲
5. 前端加入 429 錯誤處理（不崩潰）

## Retry Logic
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const is429 = error.message.includes('QUOTA_OR_LIMIT');
      if (!is429 || i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      const jitter = delay * 0.2 * (Math.random() - 0.5);
      await new Promise(r => setTimeout(r, delay + jitter));
    }
  }
  throw new Error('Retry exhausted');
}
```

## Error Handling Matrix
| Error Type | Retry | Max Attempts | User Message |
|-----------|-------|--------------|--------------|
| 429 QUOTA | Yes | 3 | 系統繁忙，請稍後再試 |
| 412 SAFETY | No | 1 | 圖片無法辨識 |
| 422 VALIDATION | No | 1 | 圖片無法辨識 |
| 500 SERVER | No | 1 | 系統錯誤，請重試 |
