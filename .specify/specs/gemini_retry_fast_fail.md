# Scenario: Fast Retry + Fast Fail Strategy

## User Experience Priority
- ❌ 60s max_delay 太長，用戶會以為系統卡住
- ✅ 快速重試（1s, 2s, 4s）保持流暢度
- ✅ 3 次失敗後立即告知用戶，讓用戶決定是否重試

## Optimization (Minimal Changes)

### 1. Add 503 Error Retry (NEW)
- 當前：只重試 429 QUOTA_OR_LIMIT
- 優化：重試 429 + 503 SERVICE_UNAVAILABLE
- 理由：2026 年 503 是最常見的暫時性錯誤

### 2. Keep Fast Retry (UNCHANGED)
- 保持：3 次重試，1s, 2s, 4s
- 理由：快速反饋，不影響用戶體驗

### 3. Add Retry Logging (NEW)
- 記錄當前重試次數和延遲時間
- 方便除錯和監控

### 4. Keep 20% Jitter (UNCHANGED)
- 保持：±20% jitter
- 理由：防止 thundering herd

## Implementation
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3  // Keep 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const shouldRetry = 
        message.includes('QUOTA_OR_LIMIT') ||   // 429
        message.includes('SERVICE_UNAVAILABLE'); // 503 (NEW)
      
      if (!shouldRetry || i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      const jitter = delay * 0.2 * (Math.random() - 0.5);
      const finalDelay = delay + jitter;
      
      console.log(`[Gemini Retry ${i + 1}/${maxRetries}] Waiting ${Math.round(finalDelay)}ms`); // NEW
      await new Promise(r => setTimeout(r, finalDelay));
    }
  }
  throw new Error('Retry exhausted');
}
```

## Changes Summary
1. ✅ 加入 503 錯誤重試（1 行）
2. ✅ 加入重試日誌（1 行）
3. ✅ 保持 3 次重試、4s max_delay
4. ✅ 總延遲：最多 7 秒（1+2+4）

## Error Handling Matrix
| Error Type | Retry | Max Attempts | Total Time |
|-----------|-------|--------------|------------|
| 429 QUOTA | Yes | 3 | ~7s |
| 503 UNAVAILABLE | Yes | 3 | ~7s |
| 412 SAFETY | No | 1 | 0s |
| 422 VALIDATION | No | 1 | 0s |
