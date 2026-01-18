/**
 * Security Health Monitor Error Handling Test Suite
 * Tests for the enhanced error handling in ClientSideSecurityHealthMonitor
 * 
 * Test Coverage:
 * - Database initialization error handling
 * - Null database operation handling
 * - Graceful degradation when database unavailable
 * - Error recovery and retry mechanisms
 */

describe('Security Health Monitor Error Handling', () => {
  let healthMonitor;
  let mockIndexedDB;
  let mockRequest;

  beforeEach(() => {
    // Reset global state
    jest.clearAllMocks();
    localStorage.clear();
    
    // Mock IndexedDB request object
    mockRequest = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: null,
      error: null
    };
    
    // Mock IndexedDB
    mockIndexedDB = {
      open: jest.fn().mockReturnValue(mockRequest)
    };
    
    global.indexedDB = mockIndexedDB;
    
    // Create health monitor instance
    const HealthMonitor = require('../../src/security/ClientSideSecurityHealthMonitor');
    healthMonitor = new HealthMonitor();
  });

  afterEach(() => {
    if (healthMonitor && healthMonitor.cleanup) {
      healthMonitor.cleanup();
    }
    jest.clearAllMocks();
  });

  // ===== DATABASE INITIALIZATION ERROR HANDLING =====

  describe('Database Initialization Error Handling', () => {
    
    test('TC-HM-001: Should handle database open failure gracefully', async () => {
      // Given: IndexedDB open request that fails
      mockIndexedDB.open.mockReturnValue(mockRequest);
      
      // When: Initializing health monitor with database failure
      const initPromise = healthMonitor.initialize();
      
      // Simulate database error
      mockRequest.error = new Error('Database access denied');
      if (mockRequest.onerror) {
        mockRequest.onerror();
      }
      
      const result = await initPromise;
      
      // Then: Should handle failure gracefully
      expect(result.success).toBe(false);
      expect(result.monitoring).toBe(false);
      expect(healthMonitor.db).toBeNull();
    });

    test('TC-HM-002: Should handle database upgrade failure', async () => {
      // Given: IndexedDB upgrade that fails
      mockIndexedDB.open.mockReturnValue(mockRequest);
      
      // When: Initializing with upgrade failure
      const initPromise = healthMonitor.initialize();
      
      // Simulate upgrade needed but fails
      const mockEvent = {
        target: {
          result: {
            objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
            createObjectStore: jest.fn().mockImplementation(() => {
              throw new Error('Upgrade failed');
            })
          }
        }
      };
      
      if (mockRequest.onupgradeneeded) {
        try {
          mockRequest.onupgradeneeded(mockEvent);
        } catch (error) {
          mockRequest.error = error;
          if (mockRequest.onerror) {
            mockRequest.onerror();
          }
        }
      }
      
      const result = await initPromise;
      
      // Then: Should handle upgrade failure
      expect(result.success).toBe(false);
      expect(healthMonitor.monitoring).toBe(false);
    });

    test('TC-HM-003: Should initialize successfully with valid database', async () => {
      // Given: Valid IndexedDB setup
      const mockDB = {
        objectStoreNames: { contains: jest.fn().mockReturnValue(true) },
        close: jest.fn()
      };
      
      mockIndexedDB.open.mockReturnValue(mockRequest);
      
      // When: Initializing with successful database
      const initPromise = healthMonitor.initialize();
      
      // Simulate successful database open
      mockRequest.result = mockDB;
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess();
      }
      
      const result = await initPromise;
      
      // Then: Should initialize successfully
      expect(result.success).toBe(true);
      expect(result.monitoring).toBe(true);
      expect(healthMonitor.db).toBe(mockDB);
    });
  });

  // ===== NULL DATABASE OPERATION HANDLING =====

  describe('Null Database Operation Handling', () => {
    
    test('TC-HM-004: Should handle recordModuleHealth with null database', async () => {
      // Given: Health monitor without database
      healthMonitor.db = null;
      healthMonitor.monitoring = true;
      
      // When: Recording module health
      const result = await healthMonitor.recordModuleHealth('webauthn', 'healthy', {
        responseTime: 100,
        errorCount: 0
      });
      
      // Then: Should handle gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBe('Monitoring not initialized');
    });

    test('TC-HM-005: Should handle recordPerformanceMetric with null database', async () => {
      // Given: Health monitor without database
      healthMonitor.db = null;
      healthMonitor.monitoring = true;
      
      // When: Recording performance metric
      const result = await healthMonitor.recordPerformanceMetric('card_store', 150, true);
      
      // Then: Should handle gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBe('Monitoring not initialized');
    });

    test('TC-HM-006: Should handle recordSecurityEvent with null database', async () => {
      // Given: Health monitor without database
      healthMonitor.db = null;
      healthMonitor.monitoring = true;
      
      // When: Recording security event
      const result = await healthMonitor.recordSecurityEvent('module_failure', {
        module: 'encryption',
        error: 'Key generation failed'
      });
      
      // Then: Should handle gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBe('Monitoring not initialized');
    });

    test('TC-HM-007: Should handle monitoring disabled state', async () => {
      // Given: Health monitor with monitoring disabled
      healthMonitor.db = {}; // Mock database exists
      healthMonitor.monitoring = false;
      
      // When: Attempting to record events
      const moduleResult = await healthMonitor.recordModuleHealth('webauthn', 'healthy');
      const perfResult = await healthMonitor.recordPerformanceMetric('test', 100, true);
      const eventResult = await healthMonitor.recordSecurityEvent('test_event');
      
      // Then: All should be rejected
      expect(moduleResult.success).toBe(false);
      expect(perfResult.success).toBe(false);
      expect(eventResult.success).toBe(false);
    });
  });

  // ===== GRACEFUL DEGRADATION TESTS =====

  describe('Graceful Degradation When Database Unavailable', () => {
    
    test('TC-HM-008: Should continue operation without database', async () => {
      // Given: Health monitor that fails to initialize database
      healthMonitor.db = null;
      healthMonitor.monitoring = false;
      
      // When: Attempting to get health status
      const status = await healthMonitor.getHealthStatus();
      
      // Then: Should return basic status without database operations
      expect(status).toBeDefined();
      expect(status.overall).toBe('unknown');
      expect(status.error).toBeDefined();
    });

    test('TC-HM-009: Should handle database connection loss during operation', async () => {
      // Given: Health monitor with initially working database
      const mockDB = {
        objectStoreNames: { contains: jest.fn().mockReturnValue(true) },
        transaction: jest.fn().mockImplementation(() => {
          throw new Error('Database connection lost');
        }),
        close: jest.fn()
      };
      
      healthMonitor.db = mockDB;
      healthMonitor.monitoring = true;
      
      // When: Database connection is lost during operation
      const result = await healthMonitor.recordModuleHealth('webauthn', 'healthy');
      
      // Then: Should handle connection loss gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('failed');
    });

    test('TC-HM-010: Should provide fallback functionality without database', async () => {
      // Given: Health monitor without database
      healthMonitor.db = null;
      healthMonitor.monitoring = false;
      
      // When: Getting monitoring status
      const status = healthMonitor.getMonitoringStatus();
      
      // Then: Should provide basic status information
      expect(status.monitoring).toBe(false);
      expect(status.database).toBe(false);
      expect(status.moduleCount).toBe(0);
      expect(status.errorCount).toBe(0);
    });
  });

  // ===== STORE OPERATION ERROR HANDLING =====

  describe('Store Operation Error Handling', () => {
    
    test('TC-HM-011: Should handle _storeHealthRecord with null database', async () => {
      // Given: Health monitor without database
      healthMonitor.db = null;
      
      // When: Attempting to store health record
      const result = await healthMonitor._storeHealthRecord({
        module: 'test',
        status: 'healthy',
        timestamp: Date.now()
      });
      
      // Then: Should handle gracefully and return null
      expect(result).toBeNull();
    });

    test('TC-HM-012: Should handle _storePerformanceRecord with null database', async () => {
      // Given: Health monitor without database
      healthMonitor.db = null;
      
      // When: Attempting to store performance record
      const result = await healthMonitor._storePerformanceRecord({
        operation: 'test',
        duration: 100,
        timestamp: Date.now()
      });
      
      // Then: Should handle gracefully and return null
      expect(result).toBeNull();
    });

    test('TC-HM-013: Should handle _storeSecurityEvent with null database', async () => {
      // Given: Health monitor without database
      healthMonitor.db = null;
      
      // When: Attempting to store security event
      const result = await healthMonitor._storeSecurityEvent({
        eventType: 'test_event',
        severity: 'low',
        timestamp: Date.now()
      });
      
      // Then: Should handle gracefully and return null
      expect(result).toBeNull();
    });

    test('TC-HM-014: Should handle transaction errors in store operations', async () => {
      // Given: Health monitor with database that fails transactions
      const mockTransaction = {
        objectStore: jest.fn().mockImplementation(() => {
          throw new Error('Transaction failed');
        })
      };
      
      const mockDB = {
        transaction: jest.fn().mockReturnValue(mockTransaction)
      };
      
      healthMonitor.db = mockDB;
      healthMonitor.monitoring = true;
      
      // When: Attempting to record with failing transaction
      const result = await healthMonitor.recordModuleHealth('test', 'healthy');
      
      // Then: Should handle transaction failure
      expect(result.success).toBe(false);
      expect(result.error).toContain('failed');
    });
  });

  // ===== ERROR RECOVERY AND RETRY MECHANISMS =====

  describe('Error Recovery and Retry Mechanisms', () => {
    
    test('TC-HM-015: Should attempt database reconnection on connection loss', async () => {
      // Given: Health monitor with connection that gets lost
      let connectionAttempts = 0;
      
      mockIndexedDB.open.mockImplementation(() => {
        connectionAttempts++;
        if (connectionAttempts === 1) {
          // First attempt fails
          setTimeout(() => {
            mockRequest.error = new Error('Connection failed');
            if (mockRequest.onerror) mockRequest.onerror();
          }, 10);
        } else {
          // Second attempt succeeds
          setTimeout(() => {
            mockRequest.result = { close: jest.fn() };
            if (mockRequest.onsuccess) mockRequest.onsuccess();
          }, 10);
        }
        return mockRequest;
      });
      
      // When: Initial connection fails, then retry
      const firstResult = await healthMonitor.initialize();
      expect(firstResult.success).toBe(false);
      
      // Reset for retry
      healthMonitor.db = null;
      healthMonitor.monitoring = false;
      
      const retryResult = await healthMonitor.initialize();
      
      // Then: Should succeed on retry
      expect(retryResult.success).toBe(true);
      expect(connectionAttempts).toBe(2);
    });

    test('TC-HM-016: Should maintain in-memory metrics when database unavailable', async () => {
      // Given: Health monitor without database but with in-memory metrics
      healthMonitor.db = null;
      healthMonitor.monitoring = true;
      
      // Manually add in-memory metrics
      healthMonitor.healthMetrics.modules.set('webauthn', {
        status: 'healthy',
        timestamp: Date.now()
      });
      
      // When: Getting health status
      const status = await healthMonitor.getHealthStatus();
      
      // Then: Should use in-memory metrics
      expect(status.modules.webauthn).toBeDefined();
      expect(status.modules.webauthn.status).toBe('healthy');
    });

    test('TC-HM-017: Should handle partial database functionality', async () => {
      // Given: Database with some working and some failing stores
      const mockStore = {
        add: jest.fn().mockImplementation((data) => {
          if (data.type === 'failing_type') {
            const failingRequest = { 
              onsuccess: null, 
              onerror: null,
              error: new Error('Store operation failed')
            };
            setTimeout(() => {
              if (failingRequest.onerror) failingRequest.onerror();
            }, 10);
            return failingRequest;
          } else {
            const successRequest = { 
              onsuccess: null, 
              onerror: null,
              result: 'success'
            };
            setTimeout(() => {
              if (successRequest.onsuccess) successRequest.onsuccess();
            }, 10);
            return successRequest;
          }
        })
      };
      
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore)
      };
      
      const mockDB = {
        transaction: jest.fn().mockReturnValue(mockTransaction)
      };
      
      healthMonitor.db = mockDB;
      healthMonitor.monitoring = true;
      
      // When: Recording different types of events
      const successResult = await healthMonitor.recordModuleHealth('webauthn', 'healthy');
      
      // Modify the record to trigger failure
      const originalStoreHealthRecord = healthMonitor._storeHealthRecord;
      healthMonitor._storeHealthRecord = jest.fn().mockImplementation(async (record) => {
        record.type = 'failing_type';
        return originalStoreHealthRecord.call(healthMonitor, record);
      });
      
      const failResult = await healthMonitor.recordModuleHealth('encryption', 'failed');
      
      // Then: Should handle mixed success/failure
      expect(successResult.success).toBe(true);
      expect(failResult.success).toBe(false);
    });
  });

  // ===== CLEANUP AND RESOURCE MANAGEMENT =====

  describe('Cleanup and Resource Management', () => {
    
    test('TC-HM-018: Should cleanup resources properly on error', async () => {
      // Given: Health monitor with resources that need cleanup
      const mockDB = {
        close: jest.fn(),
        objectStoreNames: { contains: jest.fn().mockReturnValue(true) }
      };
      
      healthMonitor.db = mockDB;
      healthMonitor.monitoring = true;
      
      // When: Cleanup is called
      healthMonitor.cleanup();
      
      // Then: Should cleanup all resources
      expect(mockDB.close).toHaveBeenCalled();
      expect(healthMonitor.db).toBeNull();
      expect(healthMonitor.monitoring).toBe(false);
    });

    test('TC-HM-019: Should handle cleanup with null database', () => {
      // Given: Health monitor without database
      healthMonitor.db = null;
      healthMonitor.monitoring = false;
      
      // When: Cleanup is called
      expect(() => healthMonitor.cleanup()).not.toThrow();
      
      // Then: Should complete without errors
      expect(healthMonitor.db).toBeNull();
      expect(healthMonitor.monitoring).toBe(false);
    });

    test('TC-HM-020: Should handle cleanup errors gracefully', () => {
      // Given: Database that throws error on close
      const mockDB = {
        close: jest.fn().mockImplementation(() => {
          throw new Error('Close failed');
        })
      };
      
      healthMonitor.db = mockDB;
      healthMonitor.monitoring = true;
      
      // When: Cleanup encounters error
      expect(() => healthMonitor.cleanup()).not.toThrow();
      
      // Then: Should still reset state
      expect(healthMonitor.db).toBeNull();
      expect(healthMonitor.monitoring).toBe(false);
    });
  });

  // ===== INTEGRATION TESTS WITH STORAGE =====

  describe('Integration with PWACardStorage', () => {
    
    test('TC-HM-021: Should integrate with storage initialization gracefully', async () => {
      // Given: PWACardStorage with health monitor
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      // Mock health monitor that fails to initialize
      global.window.ClientSideSecurityHealthMonitor = jest.fn().mockImplementation(() => {
        return {
          initialize: jest.fn().mockRejectedValue(new Error('Health monitor init failed')),
          cleanup: jest.fn()
        };
      });
      
      // When: Storage initializes with failing health monitor
      await storage.initializeSecurityComponents();
      
      // Then: Storage should continue without health monitoring
      expect(storage.healthMonitor).toBeDefined();
      expect(storage.securityMode).toBe('compatibility'); // Should not be 'secure'
    });

    test('TC-HM-022: Should handle storage cleanup with health monitor errors', async () => {
      // Given: Storage with health monitor that has cleanup errors
      const PWACardStorage = require('../../pwa-card-storage/src/core/storage');
      const storage = new PWACardStorage();
      
      const mockHealthMonitor = {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        cleanup: jest.fn().mockImplementation(() => {
          throw new Error('Cleanup failed');
        })
      };
      
      global.window.ClientSideSecurityHealthMonitor = jest.fn().mockImplementation(() => mockHealthMonitor);
      
      await storage.initializeSecurityComponents();
      
      // When: Storage cleanup encounters health monitor error
      expect(() => storage.cleanup()).not.toThrow();
      
      // Then: Should handle cleanup error gracefully
      expect(mockHealthMonitor.cleanup).toHaveBeenCalled();
    });
  });
});

// ===== TEST UTILITIES FOR HEALTH MONITOR ERROR HANDLING =====

/**
 * Utility functions for testing health monitor error handling
 */
class HealthMonitorErrorTestUtils {
  
  /**
   * Create mock IndexedDB with configurable failure modes
   */
  static createMockIndexedDB(failureMode = null) {
    const mockRequest = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: null,
      error: null
    };
    
    const mockDB = {
      objectStoreNames: { contains: jest.fn().mockReturnValue(true) },
      transaction: jest.fn().mockReturnValue({
        objectStore: jest.fn().mockReturnValue({
          add: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null,
            result: 'success'
          })
        })
      }),
      close: jest.fn()
    };
    
    const mockIndexedDB = {
      open: jest.fn().mockImplementation(() => {
        switch (failureMode) {
          case 'open_failure':
            setTimeout(() => {
              mockRequest.error = new Error('Database open failed');
              if (mockRequest.onerror) mockRequest.onerror();
            }, 10);
            break;
          case 'upgrade_failure':
            setTimeout(() => {
              if (mockRequest.onupgradeneeded) {
                try {
                  mockRequest.onupgradeneeded({
                    target: {
                      result: {
                        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
                        createObjectStore: jest.fn().mockImplementation(() => {
                          throw new Error('Upgrade failed');
                        })
                      }
                    }
                  });
                } catch (error) {
                  mockRequest.error = error;
                  if (mockRequest.onerror) mockRequest.onerror();
                }
              }
            }, 10);
            break;
          default:
            setTimeout(() => {
              mockRequest.result = mockDB;
              if (mockRequest.onsuccess) mockRequest.onsuccess();
            }, 10);
        }
        return mockRequest;
      })
    };
    
    return { mockIndexedDB, mockRequest, mockDB };
  }
  
  /**
   * Simulate database connection loss
   */
  static simulateConnectionLoss(healthMonitor) {
    if (healthMonitor.db) {
      healthMonitor.db.transaction = jest.fn().mockImplementation(() => {
        throw new Error('Database connection lost');
      });
    }
  }
  
  /**
   * Verify error handling compliance
   */
  static verifyErrorHandling(result, expectedBehavior) {
    const checks = {
      graceful_failure: () => {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      },
      null_safe: () => {
        expect(result).toBeDefined();
        expect(result).not.toBeNull();
      },
      no_throw: () => {
        // This check is implicit - if we reach here, no exception was thrown
        expect(true).toBe(true);
      }
    };
    
    if (checks[expectedBehavior]) {
      checks[expectedBehavior]();
    }
  }
  
  /**
   * Create health monitor with specific error conditions
   */
  static createHealthMonitorWithErrors(errorConditions = []) {
    const HealthMonitor = require('../../src/security/ClientSideSecurityHealthMonitor');
    const monitor = new HealthMonitor();
    
    errorConditions.forEach(condition => {
      switch (condition) {
        case 'no_database':
          monitor.db = null;
          monitor.monitoring = false;
          break;
        case 'monitoring_disabled':
          monitor.db = {}; // Mock database exists
          monitor.monitoring = false;
          break;
        case 'transaction_failure':
          monitor.db = {
            transaction: jest.fn().mockImplementation(() => {
              throw new Error('Transaction failed');
            })
          };
          monitor.monitoring = true;
          break;
      }
    });
    
    return monitor;
  }
}

module.exports = { HealthMonitorErrorTestUtils };