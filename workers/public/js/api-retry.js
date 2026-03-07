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

      // Non-retryable error (4xx except 408, 429)
      if (!isRetryableStatus(response.status)) {
        return response;
      }

      // Special handling for 429 Rate Limited (max 2 retries)
      if (response.status === 429) {
        const retryAfterMs = parseRetryAfter(response);

        if (retryAfterMs !== null) {
          // Respect Retry-After header
          if (attempt < 2) {
            if (onRetry) onRetry(attempt, 2, retryAfterMs, response.status);
            await sleep(retryAfterMs);
            continue;
          }
        } else {
          // No Retry-After, use backoff (max 2 attempts)
          if (attempt < 2) {
            const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs);
            if (onRetry) onRetry(attempt, 2, delay, response.status);
            await sleep(delay);
            continue;
          }
        }

        // Exhausted 429 retries
        return response;
      }

      // 5xx or 408: Use normal retry logic (max 3 attempts)
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

      // Network error retry (max 3 attempts)
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

function parseRetryAfter(response) {
  const retryAfter = response.headers.get('Retry-After');
  if (!retryAfter) return null;

  // Try parsing as seconds (integer)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000; // Convert to milliseconds
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return null;
}

function isRetryableStatus(status) {
  // 408: Request Timeout (server-side timeout, retryable)
  // 429: Rate Limited (retryable with Retry-After)
  // 5xx: Server errors (transient, retryable)
  // Note: Different from client-side AbortError (not retryable)
  return status === 408 || status === 429 || (status >= 500 && status < 600);
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
  // Exponential: attempt^2 × base
  const exponential = Math.pow(attempt, 2) * baseMs;

  // Add jitter: ±20% (prevents thundering herd)
  const jitter = exponential * 0.2 * (Math.random() * 2 - 1);

  // Cap at max
  return Math.min(exponential + jitter, maxMs);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
