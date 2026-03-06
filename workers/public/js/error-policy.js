/**
 * Error Policy Layer - Structured error handling decisions
 * 
 * Responsibilities:
 * - Decide action based on status + error code + context
 * - Return structured action (no throw/redirect)
 * - Log errors for monitoring
 * 
 * Action types:
 * - retry: Retry the request (e.g., after CSRF refresh)
 * - redirect: Redirect to another page
 * - modal: Show modal dialog
 * - toast: Show toast notification
 * - throw: Throw error to caller
 */

const ErrorPolicy = {
  /**
   * Handle error and return structured action
   * 
   * @param {number} status - HTTP status code
   * @param {object} errorData - Parsed error data { code, message, requestId, retryable, retryAfter }
   * @param {string} context - Request context ('api', 'oauth', 'upload', 'admin')
   * @param {string} method - HTTP method ('GET', 'POST', etc.)
   * @param {string} endpoint - Request endpoint (for logging)
   * @returns {Promise<{action: string, ...}>}
   */
  async handle(status, errorData, context = 'api', method = 'GET', endpoint = '') {
    // Log for monitoring
    this.logError(status, errorData, context, method, endpoint);

    // 401 Unauthorized - Session expired
    if (status === 401) {
      sessionStorage.clear();
      return {
        action: 'redirect',
        url: context === 'admin' ? '/admin-dashboard.html' : '/user-portal.html',
        message: '登入已過期，請重新登入',
        delay: 2000
      };
    }

    // 403 Forbidden - Multiple scenarios
    if (status === 403) {
      return await this.handle403(errorData, context, method);
    }

    // 429 Rate Limiting
    if (status === 429) {
      return {
        action: 'toast',
        type: 'warning',
        message: errorData.retryAfter 
          ? `請求過於頻繁，請 ${errorData.retryAfter} 秒後再試`
          : '請求過於頻繁，請稍後再試',
        duration: 5000,
        retryAfter: errorData.retryAfter
      };
    }

    // Other errors
    return {
      action: 'toast',
      type: 'error',
      message: errorData.message,
      duration: 5000
    };
  },

  /**
   * Handle 403 Forbidden (multiple scenarios)
   */
  async handle403(errorData, context, method) {
    const { code } = errorData;

    // Scenario 1: WebView blocking (OAuth only)
    if (context === 'oauth' || code === 'WEBVIEW_BLOCKED') {
      return {
        action: 'modal',
        modalType: 'webview-error',
        message: '請使用外部瀏覽器開啟'
      };
    }

    // Scenario 2: CSRF token invalid (POST/PUT/PATCH/DELETE only)
    if (code === 'CSRF_INVALID' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const refreshed = await this.refreshCSRFToken();
      if (refreshed) {
        return {
          action: 'retry',
          retryable: true,
          message: 'CSRF token refreshed, retrying...'
        };
      } else {
        // CSRF refresh failed → treat as session expired
        sessionStorage.clear();
        return {
          action: 'redirect',
          url: '/user-portal.html',
          message: 'CSRF token 刷新失敗，請重新登入',
          delay: 2000
        };
      }
    }

    // Scenario 3: Session expired (treat as 401)
    if (code === 'SESSION_EXPIRED' || code === 'UNAUTHORIZED') {
      sessionStorage.clear();
      return {
        action: 'redirect',
        url: context === 'admin' ? '/admin-dashboard.html' : '/user-portal.html',
        message: '登入已過期，請重新登入',
        delay: 2000
      };
    }

    // Scenario 4: Generic permission denied
    return {
      action: 'toast',
      type: 'error',
      message: `權限不足：${errorData.message}`,
      duration: 5000
    };
  },

  /**
   * Refresh CSRF token (one-time only)
   */
  async refreshCSRFToken() {
    try {
      const response = await fetch('/api/csrf-token', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        sessionStorage.setItem('csrfToken', data.token);
        console.log('[CSRF] Token refreshed successfully');
        return true;
      }
    } catch (error) {
      console.error('[CSRF] Refresh failed:', error);
    }
    return false;
  },

  /**
   * Log error for monitoring
   */
  logError(status, errorData, context, method, endpoint) {
    const logData = {
      timestamp: new Date().toISOString(),
      status,
      code: errorData.code,
      message: errorData.message,
      requestId: errorData.requestId,
      context,
      method,
      endpoint,
      retryable: errorData.retryable
    };

    // Log to console (structured)
    console.error('[ErrorPolicy]', JSON.stringify(logData));

    // TODO: Send to analytics/monitoring service
    // if (window.analytics) {
    //   window.analytics.track('api_error', logData);
    // }
  }
};
