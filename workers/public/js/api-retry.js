/**
 * Fetch with timeout and retry
 * @param {Function} fetchFn - Fetch function to retry (receives signal parameter)
 * @param {Object} options - Retry options
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(fetchFn, options = {}) {
  const {
    maxAttempts = 3,
    timeoutMs = 4000,
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
  // 408: Request Timeout (server-side timeout, retryable)
  // Note: Different from client-side AbortError (not retryable)
  return [408, 429, 500, 502, 503, 504].includes(status);
}

function isRetryableError(error) {
  // Client timeout (AbortError) 不重試
  // 只重試網路暫時性錯誤
  return error.message.includes('network') ||
         error.message.includes('fetch') ||
         error.message.includes('ECONNRESET') ||
         error.message.includes('ETIMEDOUT');
}

function calculateBackoff(attempt, baseMs, maxMs) {
  const exponential = baseMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * baseMs;
  return Math.min(maxMs, exponential + jitter);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
