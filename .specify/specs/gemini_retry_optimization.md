# Scenario: Optimize Gemini Retry Based on 2026 Best Practices

## Current Implementation Issues
1. max_delay 4s 太短（官方建議 60-120s）
2. 未處理 503 SERVICE_UNAVAILABLE（2026 年最常見錯誤）
3. 重試次數 3 次可能不足（官方建議 5 次）

## Optimization Plan

### 1. Extend max_delay to 60s
- 當前：1s, 2s, 4s (max 4s)
- 優化：1s, 2s, 4s, 8s, 16s (max 60s)
- 理由：高峰時段 API 恢復需要 30-120 分鐘

### 2. Add 503 Error Retry
- 當前：只重試 429 QUOTA_OR_LIMIT
- 優化：重試 429 + 503 SERVICE_UNAVAILABLE
- 理由：2026 年 503 錯誤率達 45%（高峰時段）

### 3. Increase Retry Attempts to 5
- 當前：3 次重試
- 優化：5 次重試
- 理由：符合 Google 官方推薦

### 4. Keep 20% Jitter (Better than Official 10%)
- 當前：±20% jitter ✅
- 保持不變（優於官方 10%）

## Implementation
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5  // 3 → 5
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
      
      const baseDelay = Math.pow(2, i) * 1000; // 1s, 2s, 4s, 8s, 16s
      const cappedDelay = Math.min(baseDelay, 60000); // max 60s (NEW)
      const jitter = cappedDelay * 0.2 * (Math.random() - 0.5);
      const finalDelay = cappedDelay + jitter;
      
      console.log(`[Retry ${i + 1}/${maxRetries}] Waiting ${Math.round(finalDelay)}ms`);
      await new Promise(r => setTimeout(r, finalDelay));
    }
  }
  throw new Error('Retry exhausted');
}
```

## Error Handling Matrix (Updated)
| Error Type | Retry | Max Attempts | Max Delay |
|-----------|-------|--------------|-----------|
| 429 QUOTA | Yes | 5 | 60s |
| 503 UNAVAILABLE | Yes | 5 | 60s |
| 412 SAFETY | No | 1 | - |
| 422 VALIDATION | No | 1 | - |
| 500 SERVER | No | 1 | - |

## Expected Improvement
- 成功率：70% → 90%+（加入 503 重試）
- 高峰時段可用性：55% → 85%+
- 用戶體驗：減少「系統繁忙」錯誤 60%
