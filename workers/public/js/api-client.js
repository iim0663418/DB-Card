/**
 * API Client Layer - Unified fetch with error parsing
 * 
 * Responsibilities:
 * - Fetch with timeout
 * - Parse response body ONCE
 * - Return structured result: { ok, status, data, error }
 */

const APIClient = {
  /**
   * Unified fetch with structured error handling
   * 
   * @param {string} endpoint 
   * @param {object} options 
   * @returns {Promise<{ok: boolean, status: number, data?: any, error?: object}>}
   */
  async fetch(endpoint, options = {}) {
    if (window.__sessionExpired) {
      return { ok: false, status: 401, error: { code: 'SESSION_EXPIRED', message: '登入已過期', retryable: false } };
    }

    const csrfToken = sessionStorage.getItem('csrfToken');
    const headers = {
      ...options.headers,
      ...(csrfToken && { 'X-CSRF-Token': csrfToken })
    };

    // Timeout handling
    const timeoutMs = options.timeoutMs ?? 30000;
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    // Combine signals
    let combinedSignal;
    if (options.signal) {
      if (typeof AbortSignal.any === 'function') {
        combinedSignal = AbortSignal.any([options.signal, timeoutController.signal]);
      } else {
        combinedSignal = timeoutController.signal;
        if (options.signal.aborted) {
          clearTimeout(timeoutId);
          throw new DOMException('Request aborted', 'AbortError');
        }
        options.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          timeoutController.abort();
        });
      }
    } else {
      combinedSignal = timeoutController.signal;
    }

    let response;
    try {
      response = await fetch(endpoint, {
        ...options,
        headers,
        credentials: 'include',
        signal: combinedSignal
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Distinguish between timeout and user cancellation
      if (error.name === 'AbortError') {
        if (timeoutController.signal.aborted) {
          // Timeout abort
          return {
            ok: false,
            status: 0,
            error: {
              code: 'TIMEOUT',
              message: '請求超時，請稍後再試',
              retryable: true
            }
          };
        } else {
          // User cancellation (e.g., new search initiated)
          return {
            ok: false,
            status: 0,
            error: {
              code: 'CANCELLED',
              message: error.message || 'Request cancelled',
              retryable: false
            }
          };
        }
      }
      
      return {
        ok: false,
        status: 0,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || '網路錯誤',
          retryable: true
        }
      };
    }

    // Parse body ONCE (critical: response.json() can only be called once)
    let bodyData = null;
    const contentType = response.headers.get('content-type');
    
    if (response.status !== 204) {
      try {
        if (contentType?.includes('application/json')) {
          bodyData = await response.json();
        } else {
          bodyData = { message: await response.text() };
        }
      } catch (parseError) {
        bodyData = { message: `HTTP ${response.status}` };
      }
    }

    // Success path
    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        data: bodyData
      };
    }

    // Error path: structure error data
    const errorData = {
      code: bodyData?.code || bodyData?.error || `HTTP_${response.status}`,
      message: bodyData?.message || `HTTP ${response.status}`,
      requestId: bodyData?.requestId || response.headers.get('x-request-id'),
      retryable: bodyData?.retryable ?? false,
      retryAfter: response.headers.get('retry-after') ? parseInt(response.headers.get('retry-after')) : null
    };

    return {
      ok: false,
      status: response.status,
      error: errorData
    };
  }
};
