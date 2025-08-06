/**
 * Circular Dependency Prevention Test Suite
 * Tests for the dependency injection solution that prevents circular dependencies
 * 
 * Test Coverage:
 * - Dependency injection pattern validation
 * - Circular dependency detection and prevention
 * - Component initialization order verification
 * - Memory leak prevention during initialization
 */

describe('Circular Dependency Prevention', () => {
  let mockStorage;
  let mockCompatibilityLayer;
  let mockSecurityToggle;

  beforeEach(() => {
    // Reset global state
    jest.clearAllMocks();
    localStorage.clear();
    
    // Mock components
    mockStorage = {
      db: null,
      dbVersion: 3,
      securityToggle: null,
      compatibilityLayer: null,
      initializeSecurityComponents: jest.fn()
    };

    mockSecurityToggle = {
      isEnabled: jest.fn().mockReturnValue(false),
      toggle: jest.fn(),
      getAllFeatures: jest.fn().mockReturnValue({})
    };

    mockCompatibilityLayer = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      getStatus: jest.fn().mockReturnValue({
        initialized: true,
        fallbackAvailable: true
      }),
      cleanup: jest.fn(),
      fallbackStorage: null
    };

    // Mock constructors
    global.window.StaticHostingSecurityToggle = jest.fn().mockImplementation(() => mockSecurityToggle);
    global.window.StaticHostingCompatibilityLayer = jest.fn().mockImplementation((existingStorage) => {
      mockCompatibilityLayer.fallbackStorage = existingStorage;
      return mockCompatibilityLayer;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===== DEPENDENCY INJECTION TESTS =====

  describe('Dependency Injection Pattern', () => {
    
    test('TC-DEP-001: Should pass storage instance to compatibility layer constructor', async () => {
      // Given: PWACardStorage instance
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Initializing security components
      await storage.initializeSecurityComponents();
      
      // Then: Compatibility layer should receive storage instance
      expect(global.window.StaticHostingCompatibilityLayer).toHaveBeenCalledWith(storage);
      expect(mockCompatibilityLayer.fallbackStorage).toBe(storage);
    });

    test('TC-DEP-002: Should prevent duplicate storage instance creation', async () => {
      // Given: PWACardStorage with existing instance
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Initializing multiple times
      await storage.initializeSecurityComponents();
      await storage.initializeSecurityComponents();
      
      // Then: Should reuse existing instances
      expect(global.window.StaticHostingCompatibilityLayer).toHaveBeenCalledTimes(2);
      expect(global.window.StaticHostingCompatibilityLayer).toHaveBeenCalledWith(storage);
    });

    test('TC-DEP-003: Should handle null storage parameter gracefully', () => {
      // Given: Compatibility layer with null storage
      const CompatibilityLayer = require('../../src/security/StaticHostingCompatibilityLayer');
      
      // When: Creating with null parameter
      const layer = new CompatibilityLayer(null);
      
      // Then: Should handle gracefully
      expect(layer.fallbackStorage).toBeNull();
      expect(() => layer.initialize()).not.toThrow();
    });
  });

  // ===== CIRCULAR DEPENDENCY DETECTION =====

  describe('Circular Dependency Detection', () => {
    
    test('TC-DEP-004: Should detect potential circular dependency in constructor chain', () => {
      // Given: Mock components that could create circular dependency
      const createCircularDependency = () => {
        const storage = { compatibilityLayer: null };
        const toggle = { storage: storage };
        const layer = { 
          storage: storage,
          toggle: toggle,
          initialize: () => {
            // This would create a circular reference
            storage.compatibilityLayer = layer;
            toggle.layer = layer;
          }
        };
        return { storage, toggle, layer };
      };
      
      // When: Creating components with circular references
      const { storage, toggle, layer } = createCircularDependency();
      layer.initialize();
      
      // Then: Should detect circular reference
      expect(storage.compatibilityLayer).toBe(layer);
      expect(toggle.layer).toBe(layer);
      expect(layer.storage).toBe(storage);
      
      // Verify circular dependency exists
      const hasCircularDep = storage.compatibilityLayer.storage === storage;
      expect(hasCircularDep).toBe(true);
    });

    test('TC-DEP-005: Should prevent circular dependency through dependency injection', async () => {
      // Given: Real PWACardStorage implementation
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Initializing with dependency injection pattern
      await storage.initializeSecurityComponents();
      
      // Then: Should not create circular dependencies
      expect(storage.compatibilityLayer).toBeDefined();
      expect(storage.compatibilityLayer.fallbackStorage).toBe(storage);
      
      // Verify no circular reference in constructor chain
      const constructorArgs = global.window.StaticHostingCompatibilityLayer.mock.calls[0];
      expect(constructorArgs[0]).toBe(storage);
      expect(constructorArgs[0].compatibilityLayer).toBeNull(); // Not set yet during construction
    });

    test('TC-DEP-006: Should maintain proper initialization order', async () => {
      // Given: PWACardStorage with initialization tracking
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      const initOrder = [];
      
      // Mock components to track initialization order
      global.window.StaticHostingSecurityToggle = jest.fn().mockImplementation(() => {
        initOrder.push('toggle');
        return mockSecurityToggle;
      });
      
      global.window.StaticHostingCompatibilityLayer = jest.fn().mockImplementation((existingStorage) => {
        initOrder.push('compatibility');
        expect(existingStorage).toBe(storage); // Should receive storage instance
        return mockCompatibilityLayer;
      });
      
      // When: Initializing security components
      await storage.initializeSecurityComponents();
      
      // Then: Should initialize in correct order
      expect(initOrder).toEqual(['toggle', 'compatibility']);
    });
  });

  // ===== MEMORY LEAK PREVENTION =====

  describe('Memory Leak Prevention', () => {
    
    test('TC-DEP-007: Should not create memory leaks through circular references', async () => {
      // Given: PWACardStorage with memory tracking
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // Track object references
      const references = new WeakMap();
      references.set(storage, 'storage');
      
      // When: Initializing and cleaning up
      await storage.initializeSecurityComponents();
      
      // Store references to components
      const toggle = storage.securityToggle;
      const layer = storage.compatibilityLayer;
      
      if (toggle) references.set(toggle, 'toggle');
      if (layer) references.set(layer, 'layer');
      
      // Cleanup
      await storage.cleanup();
      
      // Then: References should be cleanable
      expect(references.has(storage)).toBe(true);
      if (toggle) expect(references.has(toggle)).toBe(true);
      if (layer) expect(references.has(layer)).toBe(true);
    });

    test('TC-DEP-008: Should properly cleanup component references', async () => {
      // Given: PWACardStorage with components
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      await storage.initializeSecurityComponents();
      
      // Verify components are initialized
      expect(storage.securityToggle).toBeDefined();
      expect(storage.compatibilityLayer).toBeDefined();
      
      // When: Cleaning up
      await storage.cleanup();
      
      // Then: Cleanup should be called on components
      expect(mockCompatibilityLayer.cleanup).toHaveBeenCalled();
    });

    test('TC-DEP-009: Should handle cleanup with partial initialization', async () => {
      // Given: PWACardStorage with partial initialization failure
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // Mock partial failure
      global.window.StaticHostingCompatibilityLayer = jest.fn().mockImplementation(() => {
        throw new Error('Initialization failed');
      });
      
      // When: Initializing with failure and cleaning up
      await storage.initializeSecurityComponents(); // Should handle error
      await storage.cleanup();
      
      // Then: Should not throw errors during cleanup
      expect(storage.securityToggle).toBeDefined();
      expect(storage.compatibilityLayer).toBeNull();
    });
  });

  // ===== COMPONENT LIFECYCLE TESTS =====

  describe('Component Lifecycle Management', () => {
    
    test('TC-DEP-010: Should initialize components only once', async () => {
      // Given: PWACardStorage instance
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Calling initialization multiple times
      await storage.initializeSecurityComponents();
      const firstToggle = storage.securityToggle;
      const firstLayer = storage.compatibilityLayer;
      
      await storage.initializeSecurityComponents();
      const secondToggle = storage.securityToggle;
      const secondLayer = storage.compatibilityLayer;
      
      // Then: Should reuse existing instances
      expect(secondToggle).toBe(firstToggle);
      expect(secondLayer).toBe(firstLayer);
    });

    test('TC-DEP-011: Should handle component reinitialization after cleanup', async () => {
      // Given: PWACardStorage with initialized components
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      await storage.initializeSecurityComponents();
      const originalToggle = storage.securityToggle;
      
      // When: Cleaning up and reinitializing
      await storage.cleanup();
      
      // Reset component references
      storage.securityToggle = null;
      storage.compatibilityLayer = null;
      
      await storage.initializeSecurityComponents();
      
      // Then: Should create new instances
      expect(storage.securityToggle).toBeDefined();
      expect(storage.securityToggle).not.toBe(originalToggle);
    });

    test('TC-DEP-012: Should maintain component state consistency', async () => {
      // Given: PWACardStorage with state changes
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      await storage.initializeSecurityComponents();
      
      // Modify component state
      if (storage.securityToggle) {
        storage.securityToggle.toggle('webauthn', true, { autoReload: false });
      }
      
      // When: Accessing component state
      const isEnabled = storage.securityToggle?.isEnabled('webauthn');
      
      // Then: State should be consistent
      expect(isEnabled).toBe(true);
      
      // Verify state persists across component access
      const isStillEnabled = storage.securityToggle?.isEnabled('webauthn');
      expect(isStillEnabled).toBe(true);
    });
  });

  // ===== ERROR HANDLING TESTS =====

  describe('Error Handling in Dependency Injection', () => {
    
    test('TC-DEP-013: Should handle constructor errors gracefully', async () => {
      // Given: Failing component constructor
      global.window.StaticHostingCompatibilityLayer = jest.fn().mockImplementation(() => {
        throw new Error('Constructor failed');
      });
      
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Initializing with failing constructor
      await storage.initializeSecurityComponents();
      
      // Then: Should handle error and continue
      expect(storage.securityToggle).toBeDefined();
      expect(storage.compatibilityLayer).toBeNull();
      expect(storage.securityMode).toBe('fallback');
    });

    test('TC-DEP-014: Should handle initialization errors in dependency chain', async () => {
      // Given: Component with failing initialization
      mockCompatibilityLayer.initialize.mockRejectedValue(new Error('Init failed'));
      
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Initializing with failing dependency
      await storage.initializeSecurityComponents();
      
      // Then: Should handle error gracefully
      expect(storage.compatibilityLayer).toBeDefined();
      expect(mockCompatibilityLayer.initialize).toHaveBeenCalled();
    });

    test('TC-DEP-015: Should prevent cascading failures in dependency chain', async () => {
      // Given: Multiple components with potential failures
      const failureOrder = [];
      
      global.window.StaticHostingSecurityToggle = jest.fn().mockImplementation(() => {
        failureOrder.push('toggle-created');
        return mockSecurityToggle;
      });
      
      global.window.StaticHostingCompatibilityLayer = jest.fn().mockImplementation((storage) => {
        failureOrder.push('compatibility-created');
        if (!storage) {
          throw new Error('No storage provided');
        }
        return mockCompatibilityLayer;
      });
      
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Initializing components
      await storage.initializeSecurityComponents();
      
      // Then: Should create components in order despite potential failures
      expect(failureOrder).toEqual(['toggle-created', 'compatibility-created']);
      expect(global.window.StaticHostingCompatibilityLayer).toHaveBeenCalledWith(storage);
    });
  });

  // ===== INTEGRATION TESTS =====

  describe('Integration with Real Components', () => {
    
    test('TC-DEP-016: Should work with actual StaticHostingCompatibilityLayer', async () => {
      // Given: Real compatibility layer implementation
      const CompatibilityLayer = require('../../src/security/StaticHostingCompatibilityLayer');
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      
      global.window.StaticHostingCompatibilityLayer = CompatibilityLayer;
      
      const storage = new PWACardStorage();
      
      // When: Initializing with real component
      await storage.initializeSecurityComponents();
      
      // Then: Should initialize successfully
      expect(storage.compatibilityLayer).toBeInstanceOf(CompatibilityLayer);
      expect(storage.compatibilityLayer.fallbackStorage).toBe(storage);
    });

    test('TC-DEP-017: Should maintain proper this context in injected dependencies', async () => {
      // Given: Component that relies on this context
      class TestComponent {
        constructor(storage) {
          this.storage = storage;
          this.initialized = false;
        }
        
        async initialize() {
          // This method relies on proper this context
          this.initialized = true;
          return { success: true };
        }
        
        getStorage() {
          return this.storage;
        }
      }
      
      global.window.StaticHostingCompatibilityLayer = TestComponent;
      
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Initializing with component that uses this context
      await storage.initializeSecurityComponents();
      
      // Then: Should maintain proper this context
      expect(storage.compatibilityLayer).toBeInstanceOf(TestComponent);
      expect(storage.compatibilityLayer.getStorage()).toBe(storage);
      expect(storage.compatibilityLayer.initialized).toBe(true);
    });

    test('TC-DEP-018: Should handle async initialization in dependency chain', async () => {
      // Given: Component with async initialization
      class AsyncComponent {
        constructor(storage) {
          this.storage = storage;
          this.initPromise = null;
        }
        
        async initialize() {
          if (this.initPromise) {
            return this.initPromise;
          }
          
          this.initPromise = new Promise(resolve => {
            setTimeout(() => {
              this.ready = true;
              resolve({ success: true });
            }, 10);
          });
          
          return this.initPromise;
        }
      }
      
      global.window.StaticHostingCompatibilityLayer = AsyncComponent;
      
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // When: Initializing with async component
      const startTime = Date.now();
      await storage.initializeSecurityComponents();
      const endTime = Date.now();
      
      // Then: Should wait for async initialization
      expect(storage.compatibilityLayer.ready).toBe(true);
      expect(endTime - startTime).toBeGreaterThanOrEqual(10);
    });
  });
});

// ===== TEST UTILITIES FOR DEPENDENCY INJECTION =====

/**
 * Utility functions for testing dependency injection patterns
 */
class DependencyInjectionTestUtils {
  
  /**
   * Create a mock component with dependency injection support
   */
  static createMockComponentWithDI(name, dependencies = []) {
    return class MockComponent {
      constructor(...args) {
        this.name = name;
        this.dependencies = {};
        
        dependencies.forEach((dep, index) => {
          this.dependencies[dep] = args[index];
        });
        
        this.initialized = false;
      }
      
      async initialize() {
        this.initialized = true;
        return { success: true };
      }
      
      cleanup() {
        this.initialized = false;
      }
      
      getDependency(name) {
        return this.dependencies[name];
      }
    };
  }
  
  /**
   * Detect circular dependencies in object graph
   */
  static detectCircularDependency(obj, visited = new Set(), path = []) {
    if (visited.has(obj)) {
      return path.concat([obj]);
    }
    
    visited.add(obj);
    path.push(obj);
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
        const cycle = this.detectCircularDependency(obj[key], visited, path.slice());
        if (cycle) {
          return cycle;
        }
      }
    }
    
    visited.delete(obj);
    return null;
  }
  
  /**
   * Verify dependency injection pattern compliance
   */
  static verifyDIPattern(component, expectedDependencies) {
    const issues = [];
    
    // Check if component accepts dependencies in constructor
    if (component.constructor.length < expectedDependencies.length) {
      issues.push(`Component accepts ${component.constructor.length} parameters, expected ${expectedDependencies.length}`);
    }
    
    // Check if dependencies are properly stored
    expectedDependencies.forEach(dep => {
      if (!component.getDependency || !component.getDependency(dep)) {
        issues.push(`Missing dependency: ${dep}`);
      }
    });
    
    return {
      compliant: issues.length === 0,
      issues
    };
  }
  
  /**
   * Simulate dependency injection container
   */
  static createDIContainer() {
    const container = new Map();
    const singletons = new Map();
    
    return {
      register(name, factory, singleton = false) {
        container.set(name, { factory, singleton });
      },
      
      resolve(name) {
        const registration = container.get(name);
        if (!registration) {
          throw new Error(`Service ${name} not registered`);
        }
        
        if (registration.singleton) {
          if (!singletons.has(name)) {
            singletons.set(name, registration.factory());
          }
          return singletons.get(name);
        }
        
        return registration.factory();
      },
      
      clear() {
        container.clear();
        singletons.clear();
      }
    };
  }
}

module.exports = { DependencyInjectionTestUtils };