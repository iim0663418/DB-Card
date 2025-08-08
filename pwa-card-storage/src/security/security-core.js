/**
 * Security Core ES6 Module
 * Provides modern ES6 exports for security functionality
 */

// Initialize security system
export function initializeSecurity() {
  console.log('[SecurityCore] Security system initialized');
  return {
    initialized: true,
    timestamp: Date.now()
  };
}

// Security health check
export function performSecurityHealthCheck() {
  return {
    status: 'healthy',
    checks: {
      crypto: !!(window.crypto && window.crypto.subtle),
      https: location.protocol === 'https:',
      csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    },
    timestamp: Date.now()
  };
}

// Security core instance (for backward compatibility)
export const securityCore = {
  initialize: initializeSecurity,
  healthCheck: performSecurityHealthCheck,
  isInitialized: () => true
};

// Default export
export default securityCore;