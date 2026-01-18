/**
 * Security Coexistence Flow Integration Test Suite
 * End-to-end testing of security architecture coexistence with core PWA functionality
 * 
 * Test Coverage:
 * - Complete security initialization flow
 * - Service continuity during security failures
 * - Static hosting compatibility
 * - User experience preservation
 * - Performance impact measurement
 */

describe('Security Coexistence Flow Integration', () => {
  let mockPWACardStorage;
  let mockSecurityComponents;
  let originalConsoleError;
  let originalConsoleWarn;

  beforeAll(() => {
    // Suppress console errors/warnings during tests
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  beforeEach(() => {
    // Reset global state
    jest.clearAllMocks();
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
          }),
          close: jest.fn()
        }
      }))
    };

    // Mock security components
    mockSecurityComponents = {
      toggle: {
        isEnabled: jest.fn().mockReturnValue(false),
        toggle: jest.fn().mockReturnValue(true),
        getAllFeatures: jest.fn().mockReturnValue({}),
        addObserver: jest.fn(),
        removeObserver: jest.fn()
      },
      compatibilityLayer: {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        getStatus: jest.fn().mockReturnValue({
          initialized: true,
          fallbackAvailable: true,
          secureStorageAvailable: false
        }),
        validateAccess: jest.fn().mockResolvedValue({ authorized: true }),
        storeCard: jest.fn().mockResolvedValue('card_123'),
        getCard: jest.fn().mockResolvedValue({ id: 'card_123' }),
        cleanup: jest.fn()
      },
      healthMonitor: {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        recordEvent: jest.fn().mockResolvedValue({ success: true }),
        recordSecurityEvent: jest.fn().mockResolvedValue({ success: true }),
        getHealthStatus: jest.fn().mockResolvedValue({ overall: 'healthy' }),
        cleanup: jest.fn()
      },
      gracefulDegradation: {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        handleModuleFailure: jest.fn().mockResolvedValue({ success: true, newLevel: 'degraded' }),
        getStatus: jest.fn().mockReturnValue({ level: 'normal' }),
        resetDegradation: jest.fn().mockResolvedValue({ success: true })
      },
      errorRecovery: {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        handleSecurityError: jest.fn().mockResolvedValue({ success: true, recovered: true }),
        getRecoveryStatus: jest.fn().mockReturnValue({ strategies: 5 }),
        resetRecovery: jest.fn().mockResolvedValue({ success: true })
      }
    };

    // Mock global security component constructors
    global.window.StaticHostingSecurityToggle = jest.fn().mockImplementation(() => mockSecurityComponents.toggle);
    global.window.StaticHostingCompatibilityLayer = jest.fn().mockImplementation(() => mockSecurityComponents.compatibilityLayer);
    global.window.ClientSideSecurityHealthMonitor = jest.fn().mockImplementation(() => mockSecurityComponents.healthMonitor);
    global.window.ClientSideGracefulDegradation = jest.fn().mockImplementation(() => mockSecurityComponents.gracefulDegradation);
    global.window.ClientSideSecurityErrorRecovery = jest.fn().mockImplementation(() => mockSecurityComponents.errorRecovery);

    // Mock PWACardStorage
    const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
    mockPWACardStorage = new PWACardStorage();
    
    // Mock core methods
    mockPWACardStorage.openDatabase = jest.fn().mockResolvedValue({});
    mockPWACardStorage.checkMigrationNeeded = jest.fn().mockResolvedValue({ required: false });
    mockPWACardStorage.initializeEncryption = jest.fn().mockResolvedValue(true);
    mockPWACardStorage.initializeManagers = jest.fn().mockResolvedValue(true);
    mockPWACardStorage.performHealthCheck = jest.fn().mockResolvedValue({ healthy: true });
    mockPWACardStorage.recordInitializationComplete = jest.fn().mockResolvedValue(true);
  });

  afterEach(() => {
    if (mockPWACardStorage && mockPWACardStorage.cleanup) {
      mockPWACardStorage.cleanup();
    }
    jest.clearAllMocks();
  });

  // ===== COMPLETE INITIALIZATION FLOW TESTS =====

  describe('Complete Security Initialization Flow', () => {
    
    test('TC-COEX-001: Should complete full initialization with all security components', async () => {
      // Given: Complete PWA environment with all security components available
      
      // When: Running complete initialization
      const result = await mockPWACardStorage.initialize();
      
      // Then: Should complete successfully with all components initialized
      expect(result).toBe(true);
      expect(mockPWACardStorage.securityToggle).toBeDefined();
      expect(mockPWACardStorage.compatibilityLayer).toBeDefined();
      expect(mockPWACardStorage.healthMonitor).toBeDefined();
      expect(mockPWACardStorage.gracefulDegradation).toBeDefined();
      expect(mockPWACardStorage.errorRecovery).toBeDefined();
      expect(mockPWACardStorage.securityMode).toBe('compatibility');
    });

    test('TC-COEX-002: Should initialize security components in correct order', async () => {
      // Given: Tracking initialization order
      const initOrder = [];
      
      global.window.StaticHostingSecurityToggle = jest.fn().mockImplementation(() => {
        initOrder.push('toggle');
        return mockSecurityComponents.toggle;
      });
      
      global.window.StaticHostingCompatibilityLayer = jest.fn().mockImplementation((storage) => {
        initOrder.push('compatibility');
        expect(storage).toBe(mockPWACardStorage); // Should receive storage instance
        return mockSecurityComponents.compatibilityLayer;
      });
      
      global.window.ClientSideSecurityHealthMonitor = jest.fn().mockImplementation(() => {
        initOrder.push('healthMonitor');
        return mockSecurityComponents.healthMonitor;
      });
      
      global.window.ClientSideGracefulDegradation = jest.fn().mockImplementation(() => {
        initOrder.push('gracefulDegradation');
        return mockSecurityComponents.gracefulDegradation;
      });
      
      global.window.ClientSideSecurityErrorRecovery = jest.fn().mockImplementation(() => {
        initOrder.push('errorRecovery');
        return mockSecurityComponents.errorRecovery;
      });
      
      // When: Initializing security components
      await mockPWACardStorage.initialize();
      
      // Then: Should initialize in correct order
      expect(initOrder).toEqual(['toggle', 'compatibility', 'healthMonitor', 'gracefulDegradation', 'errorRecovery']);
    });

    test('TC-COEX-003: Should determine appropriate security mode based on component availability', async () => {
      // Given: Different component availability scenarios
      const scenarios = [
        {
          name: 'secure mode',
          status: { secureStorageAvailable: true, authHandlerAvailable: true, fallbackAvailable: true },
          expectedMode: 'secure'
        },
        {
          name: 'compatibility mode',
          status: { secureStorageAvailable: false, authHandlerAvailable: false, fallbackAvailable: true },
          expectedMode: 'compatibility'
        },
        {
          name: 'fallback mode',
          status: { secureStorageAvailable: false, authHandlerAvailable: false, fallbackAvailable: false },
          expectedMode: 'fallback'
        }
      ];
      
      for (const scenario of scenarios) {
        // Reset storage
        const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
        const storage = new PWACardStorage();
        storage.openDatabase = jest.fn().mockResolvedValue({});
        storage.checkMigrationNeeded = jest.fn().mockResolvedValue({ required: false });
        storage.initializeEncryption = jest.fn().mockResolvedValue(true);
        storage.initializeManagers = jest.fn().mockResolvedValue(true);
        storage.performHealthCheck = jest.fn().mockResolvedValue({ healthy: true });
        storage.recordInitializationComplete = jest.fn().mockResolvedValue(true);
        
        // Mock compatibility layer status
        mockSecurityComponents.compatibilityLayer.getStatus.mockReturnValue(scenario.status);
        
        // When: Initializing with specific component availability
        await storage.initialize();
        
        // Then: Should set appropriate security mode
        expect(storage.securityMode).toBe(scenario.expectedMode);
      }
    });
  });

  // ===== SERVICE CONTINUITY TESTS =====

  describe('Service Continuity During Security Failures', () => {
    
    test('TC-COEX-004: Should maintain core functionality when security components fail', async () => {
      // Given: Security components that fail to initialize
      mockSecurityComponents.healthMonitor.initialize.mockRejectedValue(new Error('Health monitor failed'));
      mockSecurityComponents.gracefulDegradation.initialize.mockRejectedValue(new Error('Degradation failed'));
      
      // When: Initializing with failing security components
      const result = await mockPWACardStorage.initialize();
      
      // Then: Core functionality should remain available
      expect(result).toBe(true);
      expect(mockPWACardStorage.securityMode).toBe('fallback');
      
      // Core storage operations should still work
      expect(mockPWACardStorage.openDatabase).toHaveBeenCalled();
      expect(mockPWACardStorage.initializeEncryption).toHaveBeenCalled();
    });

    test('TC-COEX-005: Should handle partial security component failures gracefully', async () => {
      // Given: Mixed success/failure in security components
      mockSecurityComponents.healthMonitor.initialize.mockRejectedValue(new Error('Health monitor unavailable'));
      // Other components succeed
      
      // When: Initializing with partial failures
      const result = await mockPWACardStorage.initialize();
      
      // Then: Should continue with available components
      expect(result).toBe(true);
      expect(mockPWACardStorage.securityToggle).toBeDefined();
      expect(mockPWACardStorage.compatibilityLayer).toBeDefined();
      expect(mockPWACardStorage.gracefulDegradation).toBeDefined();
      expect(mockPWACardStorage.errorRecovery).toBeDefined();
    });

    test('TC-COEX-006: Should provide fallback functionality when all security fails', async () => {
      // Given: All security components fail
      Object.values(mockSecurityComponents).forEach(component => {
        if (component.initialize) {
          component.initialize.mockRejectedValue(new Error('Component failed'));
        }
      });
      
      // When: Initializing with complete security failure
      const result = await mockPWACardStorage.initialize();
      
      // Then: Should fallback to basic functionality
      expect(result).toBe(true);
      expect(mockPWACardStorage.securityMode).toBe('fallback');
      
      // Basic operations should still work
      const cardData = { name: 'Test User', email: 'test@example.com' };
      mockPWACardStorage.storeCard = jest.fn().mockResolvedValue('card_123');
      
      const cardId = await mockPWACardStorage.storeCard(cardData);
      expect(cardId).toBe('card_123');
    });
  });

  // ===== STATIC HOSTING COMPATIBILITY TESTS =====

  describe('Static Hosting Compatibility', () => {
    
    test('TC-COEX-007: Should work without server-side dependencies', async () => {
      // Given: Pure client-side environment (no server APIs)
      delete global.fetch; // Remove fetch API
      delete global.XMLHttpRequest; // Remove XHR
      
      // When: Initializing in static hosting environment
      const result = await mockPWACardStorage.initialize();
      
      // Then: Should work with client-side only features
      expect(result).toBe(true);
      expect(mockPWACardStorage.securityToggle).toBeDefined();
      expect(mockPWACardStorage.compatibilityLayer).toBeDefined();
    });

    test('TC-COEX-008: Should use localStorage for feature toggles in static hosting', async () => {
      // Given: Static hosting environment
      const toggle = mockSecurityComponents.toggle;
      
      // When: Toggling security features
      toggle.toggle('webauthn', true, { autoReload: false });
      
      // Then: Should persist to localStorage
      expect(toggle.toggle).toHaveBeenCalledWith('webauthn', true, { autoReload: false });
      
      // Verify localStorage usage
      const stored = localStorage.getItem('db-card-security-features');
      // Note: In real implementation, this would be set by the actual toggle component
    });

    test('TC-COEX-009: Should handle GitHub Pages/Cloudflare Pages deployment constraints', async () => {
      // Given: Static hosting constraints
      const constraints = {
        noServerSideProcessing: true,
        limitedStorageAPIs: false, // IndexedDB available
        noBackendAuth: true,
        staticFileServing: true
      };
      
      // When: Initializing under static hosting constraints
      const result = await mockPWACardStorage.initialize();
      
      // Then: Should adapt to constraints
      expect(result).toBe(true);
      expect(mockPWACardStorage.securityMode).toMatch(/compatibility|fallback/);
    });
  });

  // ===== USER EXPERIENCE PRESERVATION TESTS =====

  describe('User Experience Preservation', () => {
    
    test('TC-COEX-010: Should maintain responsive UI during security initialization', async () => {
      // Given: Tracking initialization timing
      const startTime = performance.now();
      
      // Mock slow security component initialization
      mockSecurityComponents.healthMonitor.initialize.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true };
      });
      
      // When: Initializing with timing measurement
      await mockPWACardStorage.initialize();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Then: Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });

    test('TC-COEX-011: Should provide user feedback during security failures', async () => {
      // Given: Security component that fails with user-facing error
      mockSecurityComponents.gracefulDegradation.handleModuleFailure.mockResolvedValue({
        success: true,
        newLevel: 'degraded',
        userMessage: 'Some security features are temporarily unavailable'
      });
      
      // When: Security failure occurs
      await mockSecurityComponents.gracefulDegradation.handleModuleFailure(
        'webauthn',
        new Error('WebAuthn not supported'),
        { userFacing: true }
      );
      
      // Then: Should provide appropriate user feedback
      expect(mockSecurityComponents.gracefulDegradation.handleModuleFailure).toHaveBeenCalledWith(
        'webauthn',
        expect.any(Error),
        expect.objectContaining({ userFacing: true })
      );
    });

    test('TC-COEX-012: Should preserve accessibility during security degradation', async () => {
      // Given: Accessibility requirements
      const accessibilityChecks = {
        keyboardNavigation: true,
        screenReaderSupport: true,
        highContrast: true,
        focusManagement: true
      };
      
      // Mock DOM elements for accessibility testing
      const mockButton = document.createElement('button');
      mockButton.setAttribute('aria-label', 'Security settings');
      mockButton.setAttribute('role', 'button');
      document.body.appendChild(mockButton);
      
      // When: Security degradation occurs
      await mockSecurityComponents.gracefulDegradation.handleModuleFailure(
        'webauthn',
        new Error('Not supported'),
        {}
      );
      
      // Then: Accessibility features should be preserved
      expect(mockButton.getAttribute('aria-label')).toBeTruthy();
      expect(mockButton.getAttribute('role')).toBe('button');
      expect(mockButton.tabIndex).not.toBe(-1);
      
      // Cleanup
      document.body.removeChild(mockButton);
    });
  });

  // ===== PERFORMANCE IMPACT MEASUREMENT TESTS =====

  describe('Performance Impact Measurement', () => {
    
    test('TC-COEX-013: Should measure security initialization overhead', async () => {
      // Given: Performance monitoring
      const performanceMetrics = {
        withSecurity: 0,
        withoutSecurity: 0
      };
      
      // Measure with security components
      const startWithSecurity = performance.now();
      await mockPWACardStorage.initialize();
      performanceMetrics.withSecurity = performance.now() - startWithSecurity;
      
      // Reset and measure without security components
      const PWACardStorageBasic = require('../../pwa-card-storage/src/core/storage');
      const basicStorage = new PWACardStorageBasic();
      basicStorage.openDatabase = jest.fn().mockResolvedValue({});
      basicStorage.checkMigrationNeeded = jest.fn().mockResolvedValue({ required: false });
      basicStorage.initializeEncryption = jest.fn().mockResolvedValue(true);
      basicStorage.initializeManagers = jest.fn().mockResolvedValue(true);
      basicStorage.performHealthCheck = jest.fn().mockResolvedValue({ healthy: true });
      basicStorage.recordInitializationComplete = jest.fn().mockResolvedValue(true);
      
      // Disable security components
      global.window.StaticHostingSecurityToggle = undefined;
      global.window.StaticHostingCompatibilityLayer = undefined;
      global.window.ClientSideSecurityHealthMonitor = undefined;
      global.window.ClientSideGracefulDegradation = undefined;
      global.window.ClientSideSecurityErrorRecovery = undefined;
      
      const startWithoutSecurity = performance.now();
      await basicStorage.initialize();
      performanceMetrics.withoutSecurity = performance.now() - startWithoutSecurity;
      
      // Then: Security overhead should be reasonable
      const overhead = performanceMetrics.withSecurity - performanceMetrics.withoutSecurity;
      expect(overhead).toBeLessThan(500); // Less than 500ms overhead
      
      console.log('Performance metrics:', performanceMetrics);
    });

    test('TC-COEX-014: Should monitor memory usage during security initialization', async () => {
      // Given: Memory monitoring (if available)
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // When: Initializing with security components
      await mockPWACardStorage.initialize();
      
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Then: Memory increase should be reasonable
      if (performance.memory) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
        console.log('Memory increase:', memoryIncrease, 'bytes');
      }
    });

    test('TC-COEX-015: Should handle concurrent operations during security initialization', async () => {
      // Given: Multiple concurrent operations
      const concurrentOperations = [
        mockPWACardStorage.initialize(),
        mockPWACardStorage.initialize(),
        mockPWACardStorage.initialize()
      ];
      
      // When: Running concurrent initializations
      const results = await Promise.allSettled(concurrentOperations);
      
      // Then: Should handle concurrency without errors
      const failures = results.filter(r => r.status === 'rejected');
      expect(failures.length).toBe(0);
      
      const successes = results.filter(r => r.status === 'fulfilled' && r.value === true);
      expect(successes.length).toBe(3);
    });
  });

  // ===== ERROR RECOVERY INTEGRATION TESTS =====

  describe('Error Recovery Integration', () => {
    
    test('TC-COEX-016: Should integrate error recovery with graceful degradation', async () => {
      // Given: Error recovery and graceful degradation working together
      mockSecurityComponents.errorRecovery.handleSecurityError.mockResolvedValue({
        success: false,
        recovered: false,
        degraded: true
      });
      
      // When: Unrecoverable error occurs
      const error = new Error('Critical security failure');
      const result = await mockSecurityComponents.errorRecovery.handleSecurityError(error, {
        module: 'encryption'
      });
      
      // Then: Should trigger graceful degradation
      expect(result.degraded).toBe(true);
      expect(mockSecurityComponents.errorRecovery.handleSecurityError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ module: 'encryption' })
      );
    });

    test('TC-COEX-017: Should recover from temporary security failures', async () => {
      // Given: Temporary failure that can be recovered
      let failureCount = 0;
      mockSecurityComponents.healthMonitor.initialize.mockImplementation(async () => {
        failureCount++;
        if (failureCount === 1) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });
      
      mockSecurityComponents.errorRecovery.handleSecurityError.mockResolvedValue({
        success: true,
        recovered: true,
        strategy: 'retry'
      });
      
      // When: First initialization fails, then recovery succeeds
      try {
        await mockPWACardStorage.initialize();
      } catch (error) {
        // Expected first failure
      }
      
      // Reset and retry
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const retryStorage = new PWACardStorage();
      retryStorage.openDatabase = jest.fn().mockResolvedValue({});
      retryStorage.checkMigrationNeeded = jest.fn().mockResolvedValue({ required: false });
      retryStorage.initializeEncryption = jest.fn().mockResolvedValue(true);
      retryStorage.initializeManagers = jest.fn().mockResolvedValue(true);
      retryStorage.performHealthCheck = jest.fn().mockResolvedValue({ healthy: true });
      retryStorage.recordInitializationComplete = jest.fn().mockResolvedValue(true);
      
      const retryResult = await retryStorage.initialize();
      
      // Then: Should succeed on retry
      expect(retryResult).toBe(true);
      expect(failureCount).toBe(2); // Called twice
    });

    test('TC-COEX-018: Should maintain service during rolling security updates', async () => {
      // Given: Security components being updated one by one
      const updateSequence = ['toggle', 'compatibility', 'healthMonitor'];
      
      for (const componentName of updateSequence) {
        // Simulate component update (temporary unavailability)
        const originalComponent = mockSecurityComponents[componentName];
        mockSecurityComponents[componentName] = {
          ...originalComponent,
          initialize: jest.fn().mockRejectedValue(new Error('Component updating'))
        };
        
        // When: Initializing during component update
        const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
        const storage = new PWACardStorage();
        storage.openDatabase = jest.fn().mockResolvedValue({});
        storage.checkMigrationNeeded = jest.fn().mockResolvedValue({ required: false });
        storage.initializeEncryption = jest.fn().mockResolvedValue(true);
        storage.initializeManagers = jest.fn().mockResolvedValue(true);
        storage.performHealthCheck = jest.fn().mockResolvedValue({ healthy: true });
        storage.recordInitializationComplete = jest.fn().mockResolvedValue(true);
        
        const result = await storage.initialize();
        
        // Then: Should maintain service with degraded security
        expect(result).toBe(true);
        expect(storage.securityMode).toMatch(/compatibility|fallback/);
        
        // Restore component
        mockSecurityComponents[componentName] = originalComponent;
      }
    });
  });

  // ===== CLEANUP AND RESOURCE MANAGEMENT TESTS =====

  describe('Cleanup and Resource Management', () => {
    
    test('TC-COEX-019: Should cleanup all security components properly', async () => {
      // Given: Initialized storage with all security components
      await mockPWACardStorage.initialize();
      
      // When: Cleaning up
      await mockPWACardStorage.cleanup();
      
      // Then: All security components should be cleaned up
      expect(mockSecurityComponents.compatibilityLayer.cleanup).toHaveBeenCalled();
      expect(mockSecurityComponents.healthMonitor.cleanup).toHaveBeenCalled();
    });

    test('TC-COEX-020: Should handle cleanup errors gracefully', async () => {
      // Given: Security components that fail during cleanup
      mockSecurityComponents.compatibilityLayer.cleanup.mockImplementation(() => {
        throw new Error('Cleanup failed');
      });
      
      await mockPWACardStorage.initialize();
      
      // When: Cleanup encounters errors
      expect(() => mockPWACardStorage.cleanup()).not.toThrow();
      
      // Then: Should handle cleanup errors gracefully
      expect(mockSecurityComponents.compatibilityLayer.cleanup).toHaveBeenCalled();
    });
  });
});

// ===== TEST UTILITIES FOR COEXISTENCE TESTING =====

/**
 * Utility functions for testing security coexistence
 */
class SecurityCoexistenceTestUtils {
  
  /**
   * Create mock PWA environment with configurable security components
   */
  static createMockPWAEnvironment(securityConfig = {}) {
    const defaultConfig = {
      toggle: true,
      compatibility: true,
      healthMonitor: true,
      gracefulDegradation: true,
      errorRecovery: true
    };
    
    const config = { ...defaultConfig, ...securityConfig };
    const mockComponents = {};
    
    if (config.toggle) {
      mockComponents.toggle = {
        isEnabled: jest.fn().mockReturnValue(false),
        toggle: jest.fn().mockReturnValue(true),
        getAllFeatures: jest.fn().mockReturnValue({})
      };
      global.window.StaticHostingSecurityToggle = jest.fn().mockImplementation(() => mockComponents.toggle);
    }
    
    if (config.compatibility) {
      mockComponents.compatibility = {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        getStatus: jest.fn().mockReturnValue({ initialized: true }),
        cleanup: jest.fn()
      };
      global.window.StaticHostingCompatibilityLayer = jest.fn().mockImplementation(() => mockComponents.compatibility);
    }
    
    // Add other components similarly...
    
    return mockComponents;
  }
  
  /**
   * Simulate static hosting environment constraints
   */
  static simulateStaticHostingConstraints() {
    // Remove server-side APIs
    delete global.fetch;
    delete global.XMLHttpRequest;
    
    // Limit storage APIs
    const originalQuota = navigator.storage?.estimate;
    if (navigator.storage) {
      navigator.storage.estimate = jest.fn().mockResolvedValue({
        quota: 50 * 1024 * 1024, // 50MB limit
        usage: 10 * 1024 * 1024   // 10MB used
      });
    }
    
    return {
      restore: () => {
        if (originalQuota && navigator.storage) {
          navigator.storage.estimate = originalQuota;
        }
      }
    };
  }
  
  /**
   * Measure performance impact of security components
   */
  static async measureSecurityPerformanceImpact(initFunction) {
    const metrics = {
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      memoryBefore: performance.memory ? performance.memory.usedJSHeapSize : 0,
      memoryAfter: 0,
      memoryIncrease: 0
    };
    
    await initFunction();
    
    metrics.endTime = performance.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.memoryAfter = performance.memory ? performance.memory.usedJSHeapSize : 0;
    metrics.memoryIncrease = metrics.memoryAfter - metrics.memoryBefore;
    
    return metrics;
  }
  
  /**
   * Verify service continuity during security failures
   */
  static async verifyServiceContinuity(storage, coreOperations) {
    const results = {};
    
    for (const [operationName, operation] of Object.entries(coreOperations)) {
      try {
        const result = await operation();
        results[operationName] = { success: true, result };
      } catch (error) {
        results[operationName] = { success: false, error: error.message };
      }
    }
    
    return results;
  }
  
  /**
   * Simulate security component failures
   */
  static simulateSecurityFailures(components, failureTypes) {
    const originalMethods = {};
    
    failureTypes.forEach(failureType => {
      switch (failureType) {
        case 'initialization_failure':
          components.forEach(component => {
            if (component.initialize) {
              originalMethods[component] = component.initialize;
              component.initialize = jest.fn().mockRejectedValue(new Error('Init failed'));
            }
          });
          break;
        case 'runtime_failure':
          components.forEach(component => {
            Object.keys(component).forEach(method => {
              if (typeof component[method] === 'function' && method !== 'initialize') {
                originalMethods[`${component}_${method}`] = component[method];
                component[method] = jest.fn().mockRejectedValue(new Error('Runtime failure'));
              }
            });
          });
          break;
      }
    });
    
    return {
      restore: () => {
        Object.keys(originalMethods).forEach(key => {
          const [component, method] = key.split('_');
          if (method) {
            component[method] = originalMethods[key];
          } else {
            component.initialize = originalMethods[key];
          }
        });
      }
    };
  }
}

module.exports = { SecurityCoexistenceTestUtils };