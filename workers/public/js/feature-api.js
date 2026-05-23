/**
 * Feature Layer - Business logic wrappers
 * 
 * Responsibilities:
 * - Handle actions from ErrorPolicy
 * - Execute retry/redirect/modal/toast
 * - Provide context-specific wrappers
 */

const FeatureAPI = {
  /**
   * Generic API call with error handling
   * 
   * @param {string} endpoint 
   * @param {object} options 
   * @param {string} context - 'api', 'oauth', 'upload', 'admin'
   * @returns {Promise<any>}
   */
  async call(endpoint, options = {}, context = 'api') {
    const method = options.method || 'GET';
    let retryCount = 0;
    const maxRetries = 1; // Only retry once for CSRF

    while (retryCount <= maxRetries) {
      // Call API Client
      const result = await APIClient.fetch(endpoint, options);

      // Success path
      if (result.ok) {
        return result.data;
      }

      // Error path: get action from ErrorPolicy
      const action = await ErrorPolicy.handle(
        result.status,
        result.error,
        context,
        method,
        endpoint
      );

      // Execute action
      const shouldRetry = await this.executeAction(action);

      // Suppressed duplicate 401 — swallow silently, redirect already in progress
      if (action.action === 'none') {
        return;
      }

      // Retry if action says so (and not exceeded max retries)
      if (shouldRetry && retryCount < maxRetries) {
        retryCount++;
        console.log(`[FeatureAPI] Retrying ${endpoint} (${retryCount}/${maxRetries})`);
        continue;
      }

      // No retry: throw error with structured data
      const error = new Error(result.error.message);
      error.status = result.status;
      error.code = result.error.code;
      error.requestId = result.error.requestId;
      error.retryable = result.error.retryable;
      throw error;
    }
  },

  /**
   * Execute action from ErrorPolicy
   * 
   * @param {object} action 
   * @returns {Promise<boolean>} - true if should retry
   */
  async executeAction(action) {
    switch (action.action) {
      case 'retry':
        // Signal to retry
        return true;

      case 'redirect':
        // Show toast then redirect
        if (action.message && typeof showToast === 'function') {
          showToast(action.message, 'info', action.delay || 2000);
        }
        setTimeout(() => {
          window.location.href = action.url;
        }, action.delay || 2000);
        return false;

      case 'modal':
        // Show modal (context-specific)
        if (action.modalType === 'webview-error') {
          this.showWebViewErrorModal();
        }
        return false;

      case 'toast':
        // Show toast notification
        if (typeof showToast === 'function') {
          showToast(action.message, action.type || 'error', action.duration || 5000);
        }
        return false;

      default:
        return false;
    }
  },

  /**
   * Show WebView error modal
   */
  showWebViewErrorModal() {
    // Reuse existing modal from user-portal-init.js
    if (typeof showWebViewErrorModal === 'function') {
      showWebViewErrorModal();
    } else {
      alert('請使用外部瀏覽器開啟此頁面');
    }
  },

  /**
   * OAuth-specific wrapper (auto context='oauth')
   */
  async oauthFetch(endpoint, options = {}) {
    return await this.call(endpoint, options, 'oauth');
  },

  /**
   * Upload-specific wrapper (auto context='upload')
   */
  async uploadFetch(endpoint, options = {}) {
    return await this.call(endpoint, options, 'upload');
  },

  /**
   * Admin-specific wrapper (auto context='admin')
   */
  async adminFetch(endpoint, options = {}) {
    return await this.call(endpoint, options, 'admin');
  }
};
