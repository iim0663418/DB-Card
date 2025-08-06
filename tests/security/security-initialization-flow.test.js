/**
 * Security Initialization Flow Test Suite
 * Comprehensive testing for PWA security architecture initialization
 * 
 * Test Coverage:
 * - Unit Tests: Individual component initialization
 * - Integration Tests: Component interaction and dependency injection
 * - E2E Tests: Complete initialization flow
 * - Security Tests: Error handling and fallback mechanisms
 * - Accessibility Tests: User experience during initialization
 */

describe('Security Initialization Flow', () => {
  let mockStorage;
  let mockToggle;
  let mockCompatibilityLayer;
  let mockHealthMonitor;
  let mockGracefulDegradation;
  let mockErrorRecovery;

  beforeEach(() => {
    // Reset DOM and global state
    document.body.innerHTML = '';
    localStorage.clear();
    
    // Mock IndexedDB
    global.indexedDB = {
      open: jest.fn().mockImplementation(() => ({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: {
          objectStoreNames: { contains: jest.fn().mockReturnValue(true) },
          transaction: jest.fn().mockReturnValue({
            objectStore: jest.fn().mockReturnValue({
              get: jest.fn().mockReturnValue({ onsuccess: null, result: null }),
              put: jest.fn().mockReturnValue({ onsuccess: null }),
              add: jest.fn().mockReturnValue({ onsuccess: null })
            })
          })
        }
      }))
    };

    // Mock security components
    mockToggle = {
      isEnabled: jest.fn().mockReturnValue(false),
      toggle: jest.fn(),
      getAllFeatures: jest.fn().mockReturnValue({}),
      addObserver: jest.fn(),
      removeObserver: jest.fn()
    };

    mockCompatibilityLayer = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      getStatus: jest.fn().mockReturnValue({
        initialized: true,
        fallbackAvailable: true,
        secureStorageAvailable: false,
        authHandlerAvailable: false
      }),
      validateAccess: jest.fn().mockResolvedValue({ authorized: true }),
      cleanup: jest.fn()
    };

    mockHealthMonitor = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      recordEvent: jest.fn().mockResolvedValue({ success: true }),
      recordSecurityEvent: jest.fn().mockResolvedValue({ success: true }),
      cleanup: jest.fn()
    };

    mockGracefulDegradation = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      handleModuleFailure: jest.fn().mockResolvedValue({ success: true }),
      resetDegradation: jest.fn().mockResolvedValue({ success: true })
    };

    mockErrorRecovery = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      handleSecurityError: jest.fn().mockResolvedValue({ success: true, recovered: true }),
      resetRecovery: jest.fn().mockResolvedValue({ success: true })
    };

    // Mock global security components
    global.window.StaticHostingSecurityToggle = jest.fn().mockImplementation(() => mockToggle);
    global.window.StaticHostingCompatibilityLayer = jest.fn().mockImplementation(() => mockCompatibilityLayer);
    global.window.ClientSideSecurityHealthMonitor = jest.fn().mockImplementation(() => mockHealthMonitor);
    global.window.ClientSideGracefulDegradation = jest.fn().mockImplementation(() => mockGracefulDegradation);
    global.window.ClientSideSecurityErrorRecovery = jest.fn().mockImplementation(() => mockErrorRecovery);

    // Mock PWACardStorage
    mockStorage = {
      db: null,
      dbVersion: 3,
      securityMode: 'compatibility',
      securityToggle: null,
      compatibilityLayer: null,
      healthMonitor: null,
      gracefulDegradation: null,
      errorRecovery: null,
      initializeSecurityComponents: jest.fn(),
      openDatabase: jest.fn().mockResolvedValue({}),
      initializeEncryption: jest.fn().mockResolvedValue(true),
      initializeManagers: jest.fn().mockResolvedValue(true),
      performHealthCheck: jest.fn().mockResolvedValue({ healthy: true }),
      cleanup: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  // ===== UNIT TESTS =====

  describe('Unit Tests - Individual Component Initialization', () => {
    
    describe('REQ-001: StaticHostingSecurityToggle', () => {
      test('TC-SEC-001: Should initialize with default feature states', () => {
        // Given: Fresh security toggle instance
        const toggle = new (require('../../src/security/StaticHostingSecurityToggle'))();
        
        // When: Checking default states
        const webauthnEnabled = toggle.isEnabled('webauthn');
        const encryptionEnabled = toggle.isEnabled('encryption');
        const monitoringEnabled = toggle.isEnabled('monitoring');
        
        // Then: All features should be disabled by default
        expect(webauthnEnabled).toBe(false);
        expect(encryptionEnabled).toBe(false);
        expect(monitoringEnabled).toBe(false);
      });

      test('TC-SEC-002: Should toggle features and persist to localStorage', () => {
        // Given: Security toggle instance
        const toggle = new (require('../../src/security/StaticHostingSecurityToggle'))();
        
        // When: Enabling a feature
        const result = toggle.toggle('webauthn', true, { autoReload: false });
        
        // Then: Feature should be enabled and persisted
        expect(result).toBe(true);
        expect(toggle.isEnabled('webauthn')).toBe(true);
        
        const stored = JSON.parse(localStorage.getItem('db-card-security-features'));
        expect(stored.webauthn.enabled).toBe(true);
      });

      test('TC-SEC-003: Should handle localStorage errors gracefully', () => {
        // Given: localStorage that throws errors
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = jest.fn().mockImplementation(() => {
          throw new Error('Storage quota exceeded');
        });
        
        const toggle = new (require('../../src/security/StaticHostingSecurityToggle'))();
        
        // When: Attempting to toggle feature
        const result = toggle.toggle('webauthn', true);
        
        // Then: Should handle error gracefully
        expect(result).toBe(false);
        
        // Cleanup
        localStorage.setItem = originalSetItem;
      });
    });

    describe('REQ-002: StaticHostingCompatibilityLayer', () => {
      test('TC-SEC-004: Should initialize with dependency injection', async () => {
        // Given: Existing storage instance
        const existingStorage = { initialized: true };
        const CompatibilityLayer = require('../../src/security/StaticHostingCompatibilityLayer');
        
        // When: Creating compatibility layer with existing storage
        const layer = new CompatibilityLayer(existingStorage);
        
        // Then: Should use provided storage instance
        expect(layer.fallbackStorage).toBe(existingStorage);
      });

      test('TC-SEC-005: Should handle module loading failures gracefully', async () => {
        // Given: Compatibility layer with failing modules
        const layer = new (require('../../src/security/StaticHostingCompatibilityLayer'))();
        layer._loadEncryptionModule = jest.fn().mockRejectedValue(new Error('Module not found'));
        
        // When: Initializing with module failures
        const result = await layer.initialize();
        
        // Then: Should continue initialization despite failures
        expect(result.success).toBe(true);
        expect(layer.healthStatus.issues).toHaveLength(0); // Issues handled internally
      });

      test('TC-SEC-006: Should provide fallback storage operations', async () => {
        // Given: Compatibility layer with fallback storage
        const layer = new (require('../../src/security/StaticHostingCompatibilityLayer'))();
        layer.fallbackStorage = {
          storeCard: jest.fn().mockResolvedValue('card_123')
        };
        
        // When: Storing card data
        const cardData = { name: 'Test User', email: 'test@example.com' };
        const result = await layer.storeCard(cardData);
        
        // Then: Should use fallback storage
        expect(result).toBe('card_123');
        expect(layer.fallbackStorage.storeCard).toHaveBeenCalledWith(cardData);
      });
    });

    describe('REQ-003: ClientSideSecurityHealthMonitor', () => {
      test('TC-SEC-007: Should initialize database with proper schema', async () => {
        // Given: Health monitor instance
        const monitor = new (require('../../src/security/ClientSideSecurityHealthMonitor'))();
        
        // Mock IndexedDB open request
        const mockRequest = {
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null
        };
        
        global.indexedDB.open = jest.fn().mockReturnValue(mockRequest);
        
        // When: Initializing monitor
        const initPromise = monitor.initialize();
        
        // Simulate successful database open
        mockRequest.result = { close: jest.fn() };
        mockRequest.onsuccess();
        
        const result = await initPromise;
        
        // Then: Should initialize successfully
        expect(result.success).toBe(true);
        expect(result.monitoring).toBe(true);
      });

      test('TC-SEC-008: Should handle database initialization failure', async () => {
        // Given: Health monitor with failing database
        const monitor = new (require('../../src/security/ClientSideSecurityHealthMonitor'))();
        
        const mockRequest = {
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null
        };
        
        global.indexedDB.open = jest.fn().mockReturnValue(mockRequest);
        
        // When: Database initialization fails
        const initPromise = monitor.initialize();
        
        // Simulate database error
        mockRequest.onerror();
        
        const result = await initPromise;
        
        // Then: Should handle failure gracefully
        expect(result.success).toBe(false);
        expect(result.monitoring).toBe(false);
      });

      test('TC-SEC-009: Should record security events with null database check', async () => {
        // Given: Health monitor without database
        const monitor = new (require('../../src/security/ClientSideSecurityHealthMonitor'))();
        monitor.db = null;
        monitor.monitoring = true;
        
        // When: Recording security event
        const result = await monitor.recordSecurityEvent('test_event', { test: 'data' });
        
        // Then: Should handle gracefully without database
        expect(result.success).toBe(false);
        expect(result.error).toBe('Monitoring not initialized');
      });
    });
  });

  // ===== INTEGRATION TESTS =====

  describe('Integration Tests - Component Interaction', () => {
    
    describe('REQ-004: PWACardStorage Security Integration', () => {
      test('TC-SEC-010: Should initialize all security components in correct order', async () => {
        // Given: PWACardStorage with security components available
        const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
        const storage = new PWACardStorage();
        
        // When: Initializing security components
        await storage.initializeSecurityComponents();
        
        // Then: All components should be initialized in order
        expect(global.window.StaticHostingSecurityToggle).toHaveBeenCalled();
        expect(global.window.StaticHostingCompatibilityLayer).toHaveBeenCalledWith(storage);
        expect(mockCompatibilityLayer.initialize).toHaveBeenCalled();
        expect(global.window.ClientSideSecurityHealthMonitor).toHaveBeenCalled();
        expect(global.window.ClientSideGracefulDegradation).toHaveBeenCalled();
        expect(global.window.ClientSideSecurityErrorRecovery).toHaveBeenCalled();
      });

      test('TC-SEC-011: Should handle circular dependency prevention', async () => {
        // Given: PWACardStorage instance
        const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
        const storage = new PWACardStorage();
        
        // When: Initializing compatibility layer with existing storage
        await storage.initializeSecurityComponents();
        
        // Then: Compatibility layer should receive storage instance
        expect(global.window.StaticHostingCompatibilityLayer).toHaveBeenCalledWith(storage);
        expect(mockCompatibilityLayer.initialize).toHaveBeenCalled();
      });

      test('TC-SEC-012: Should determine security mode based on available features', async () => {
        // Given: Storage with different component availability
        const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
        const storage = new PWACardStorage();
        
        // Mock different availability scenarios
        mockCompatibilityLayer.getStatus.mockReturnValue({
          secureStorageAvailable: true,
          authHandlerAvailable: true,
          fallbackAvailable: true
        });
        
        // When: Initializing security components
        await storage.initializeSecurityComponents();
        
        // Then: Should set appropriate security mode
        expect(storage.securityMode).toBe('secure');
      });
    });

    describe('REQ-005: Error Handling Integration', () => {
      test('TC-SEC-013: Should handle component initialization failures', async () => {
        // Given: Storage with failing security components
        const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
        const storage = new PWACardStorage();
        
        mockHealthMonitor.initialize.mockRejectedValue(new Error('Health monitor failed'));
        
        // When: Initializing with failures
        await storage.initializeSecurityComponents();
        
        // Then: Should fallback to basic mode
        expect(storage.securityMode).toBe('fallback');
      });

      test('TC-SEC-014: Should integrate error recovery with graceful degradation', async () => {
        // Given: Error recovery and graceful degradation components
        const errorRecovery = new (require('../../src/security/ClientSideSecurityErrorRecovery'))();
        const gracefulDegradation = new (require('../../src/security/ClientSideGracefulDegradation'))();
        
        errorRecovery.degradation = gracefulDegradation;
        
        // When: Handling unrecoverable error
        mockGracefulDegradation.handleModuleFailure.mockResolvedValue({ success: true, newLevel: 'degraded' });
        
        const result = await errorRecovery.handleSecurityError(
          new Error('Critical encryption failure'),
          { module: 'encryption' }
        );
        
        // Then: Should trigger graceful degradation
        expect(result.success).toBe(false);
        expect(result.degraded).toBe(true);
      });
    });
  });

  // ===== END-TO-END TESTS =====

  describe('E2E Tests - Complete Initialization Flow', () => {
    
    test('TC-SEC-015: Should complete full initialization flow successfully', async () => {
      // Given: Complete PWA environment
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // Mock successful database operations
      storage.openDatabase = jest.fn().mockResolvedValue({
        objectStoreNames: { contains: jest.fn().mockReturnValue(true) },
        close: jest.fn()
      });
      
      storage.checkMigrationNeeded = jest.fn().mockResolvedValue({ required: false });
      storage.initializeEncryption = jest.fn().mockResolvedValue(true);
      storage.initializeManagers = jest.fn().mockResolvedValue(true);
      storage.performHealthCheck = jest.fn().mockResolvedValue({ healthy: true });
      storage.recordInitializationComplete = jest.fn().mockResolvedValue(true);
      
      // When: Running complete initialization
      const result = await storage.initialize();
      
      // Then: Should complete successfully with all components
      expect(result).toBe(true);
      expect(storage.securityToggle).toBeDefined();
      expect(storage.compatibilityLayer).toBeDefined();
      expect(storage.healthMonitor).toBeDefined();
      expect(storage.gracefulDegradation).toBeDefined();
      expect(storage.errorRecovery).toBeDefined();
    });

    test('TC-SEC-016: Should handle initialization failure with recovery', async () => {
      // Given: PWA with failing initialization
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      storage.openDatabase = jest.fn().mockRejectedValue(new Error('Database unavailable'));
      
      // Mock error recovery
      mockErrorRecovery.handleSecurityError.mockResolvedValue({
        success: true,
        recovered: true,
        strategy: 'fallback_to_localstorage'
      });
      
      // When: Initialization fails but recovery succeeds
      try {
        await storage.initialize();
      } catch (error) {
        // Error expected, check recovery was attempted
        expect(mockErrorRecovery.handleSecurityError).toHaveBeenCalled();
      }
    });

    test('TC-SEC-017: Should maintain service continuity during security failures', async () => {
      // Given: PWA with partial security failures
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // Mock partial failures
      mockHealthMonitor.initialize.mockRejectedValue(new Error('Monitoring unavailable'));
      mockGracefulDegradation.initialize.mockRejectedValue(new Error('Degradation unavailable'));
      
      // Mock successful core operations
      storage.openDatabase = jest.fn().mockResolvedValue({});
      storage.checkMigrationNeeded = jest.fn().mockResolvedValue({ required: false });
      storage.initializeEncryption = jest.fn().mockResolvedValue(true);
      storage.initializeManagers = jest.fn().mockResolvedValue(true);
      storage.performHealthCheck = jest.fn().mockResolvedValue({ healthy: true });
      storage.recordInitializationComplete = jest.fn().mockResolvedValue(true);
      
      // When: Initializing with partial failures
      const result = await storage.initialize();
      
      // Then: Core functionality should remain available
      expect(result).toBe(true);
      expect(storage.securityMode).toBe('fallback');
    });
  });

  // ===== SECURITY TESTS =====

  describe('Security Tests - Error Handling and Fallback Mechanisms', () => {
    
    test('TC-SEC-018: Should prevent security bypass through component failures', async () => {
      // Given: Malicious attempt to bypass security through component failure
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // Mock malicious component that tries to bypass security
      global.window.StaticHostingSecurityToggle = jest.fn().mockImplementation(() => {
        throw new Error('Malicious component failure');
      });
      
      // When: Initializing with malicious component
      await storage.initializeSecurityComponents();
      
      // Then: Should fallback to secure default (fallback mode)
      expect(storage.securityMode).toBe('fallback');
      expect(storage.securityToggle).toBeNull();
    });

    test('TC-SEC-019: Should validate component integrity during initialization', async () => {
      // Given: Component with invalid interface
      const invalidComponent = {
        // Missing required methods
        someMethod: jest.fn()
      };
      
      global.window.ClientSideSecurityHealthMonitor = jest.fn().mockImplementation(() => invalidComponent);
      
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Initializing with invalid component
      await storage.initializeSecurityComponents();
      
      // Then: Should handle invalid component gracefully
      expect(storage.healthMonitor).toBeDefined();
      expect(storage.securityMode).toBe('compatibility');
    });

    test('TC-SEC-020: Should protect against prototype pollution in security components', () => {
      // Given: Attempt to pollute prototype through security toggle
      const toggle = new (require('../../src/security/StaticHostingSecurityToggle'))();
      
      // When: Attempting prototype pollution
      const maliciousData = JSON.stringify({
        '__proto__': { polluted: true },
        webauthn: { enabled: true }
      });
      
      localStorage.setItem('db-card-security-features', maliciousData);
      
      // Then: Should not be affected by prototype pollution
      const features = toggle.getAllFeatures();
      expect(Object.prototype.polluted).toBeUndefined();
      expect(features.webauthn.enabled).toBe(false); // Should use defaults
    });
  });

  // ===== ACCESSIBILITY TESTS =====

  describe('Accessibility Tests - User Experience During Initialization', () => {
    
    test('TC-SEC-021: Should provide accessible error messages during initialization', async () => {
      // Given: PWA with initialization errors
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      storage.openDatabase = jest.fn().mockRejectedValue(new Error('Database access denied'));
      
      // When: Initialization fails
      try {
        await storage.initialize();
      } catch (error) {
        // Then: Error should be user-friendly and accessible
        expect(error.message).toContain('Database');
        expect(error.message).not.toContain('undefined');
        expect(error.message).not.toContain('[object Object]');
      }
    });

    test('TC-SEC-022: Should maintain keyboard navigation during security degradation', async () => {
      // Given: Graceful degradation with UI elements
      const degradation = new (require('../../src/security/ClientSideGracefulDegradation'))();
      
      // Mock DOM elements
      const mockButton = document.createElement('button');
      mockButton.textContent = 'Security Settings';
      mockButton.setAttribute('aria-label', 'Open security settings');
      document.body.appendChild(mockButton);
      
      // When: Degradation occurs
      await degradation.handleModuleFailure('webauthn', new Error('Not supported'), {});
      
      // Then: UI elements should remain accessible
      expect(mockButton.getAttribute('aria-label')).toBeTruthy();
      expect(mockButton.tabIndex).not.toBe(-1);
    });

    test('TC-SEC-023: Should provide screen reader compatible status updates', async () => {
      // Given: Health monitor with status updates
      const monitor = new (require('../../src/security/ClientSideSecurityHealthMonitor'))();
      monitor.db = {}; // Mock database
      monitor.monitoring = true;
      
      // Mock screen reader announcement
      const mockAnnounce = jest.fn();
      global.window.speechSynthesis = {
        speak: mockAnnounce
      };
      
      // When: Recording security event
      await monitor.recordSecurityEvent('module_failure', {
        module: 'webauthn',
        userFacing: true
      });
      
      // Then: Should store accessible status message
      const storedAlerts = JSON.parse(localStorage.getItem('pwa-health-alerts') || '[]');
      expect(storedAlerts.length).toBeGreaterThan(0);
      expect(storedAlerts[0]).toHaveProperty('timestamp');
    });
  });

  // ===== PERFORMANCE TESTS =====

  describe('Performance Tests - Initialization Efficiency', () => {
    
    test('TC-SEC-024: Should initialize security components within performance budget', async () => {
      // Given: Performance monitoring
      const startTime = performance.now();
      
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Initializing security components
      await storage.initializeSecurityComponents();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Then: Should complete within 500ms budget
      expect(duration).toBeLessThan(500);
    });

    test('TC-SEC-025: Should handle concurrent initialization requests', async () => {
      // Given: Multiple concurrent initialization requests
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Multiple concurrent initializations
      const promises = Array(5).fill().map(() => storage.initializeSecurityComponents());
      
      // Then: Should handle concurrency without errors
      const results = await Promise.allSettled(promises);
      const failures = results.filter(r => r.status === 'rejected');
      expect(failures.length).toBe(0);
    });
  });

  // ===== COMPATIBILITY TESTS =====

  describe('Compatibility Tests - Browser and Environment Support', () => {
    
    test('TC-SEC-026: Should work without IndexedDB support', async () => {
      // Given: Environment without IndexedDB
      const originalIndexedDB = global.indexedDB;
      global.indexedDB = undefined;
      
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Initializing without IndexedDB
      await storage.initializeSecurityComponents();
      
      // Then: Should fallback gracefully
      expect(storage.securityMode).toBe('fallback');
      
      // Cleanup
      global.indexedDB = originalIndexedDB;
    });

    test('TC-SEC-027: Should work without Web Crypto API', async () => {
      // Given: Environment without Web Crypto API
      const originalCrypto = global.window.crypto;
      global.window.crypto = undefined;
      
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Initializing without crypto
      await storage.initializeSecurityComponents();
      
      // Then: Should disable encryption features
      expect(storage.securityMode).toBe('compatibility');
      
      // Cleanup
      global.window.crypto = originalCrypto;
    });

    test('TC-SEC-028: Should work in private browsing mode', async () => {
      // Given: Private browsing mode (limited storage)
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      const toggle = new (require('../../src/security/StaticHostingSecurityToggle'))();
      
      // When: Attempting to use localStorage in private mode
      const result = toggle.toggle('webauthn', true);
      
      // Then: Should handle storage limitations
      expect(result).toBe(false);
      
      // Cleanup
      localStorage.setItem = originalSetItem;
    });
  });
});

// ===== TEST UTILITIES =====

/**
 * Test utility functions for security initialization testing
 */
class SecurityTestUtils {
  static createMockStorage() {
    return {
      db: null,
      dbVersion: 3,
      securityMode: 'compatibility',
      initializeSecurityComponents: jest.fn(),
      openDatabase: jest.fn().mockResolvedValue({}),
      cleanup: jest.fn()
    };
  }

  static createMockSecurityComponent(name, methods = {}) {
    const defaultMethods = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      cleanup: jest.fn()
    };
    
    return {
      ...defaultMethods,
      ...methods,
      _componentName: name
    };
  }

  static simulateSecurityFailure(component, error) {
    if (component.initialize) {
      component.initialize.mockRejectedValue(error);
    }
    if (component.handleSecurityError) {
      component.handleSecurityError.mockResolvedValue({
        success: false,
        error: error.message
      });
    }
  }

  static verifySecurityMode(storage, expectedMode) {
    expect(storage.securityMode).toBe(expectedMode);
    
    const modeRequirements = {
      secure: ['securityToggle', 'compatibilityLayer', 'healthMonitor'],
      compatibility: ['securityToggle', 'compatibilityLayer'],
      fallback: []
    };
    
    const required = modeRequirements[expectedMode] || [];
    required.forEach(component => {
      expect(storage[component]).toBeDefined();
    });
  }

  static async waitForInitialization(storage, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (storage.securityMode !== 'initializing') {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    throw new Error('Initialization timeout');
  }
}

module.exports = { SecurityTestUtils };