/**
 * Phase 2 Security Components Smoke Test
 * Tests SEC-04 to SEC-06: Graceful Degradation, Health Monitoring, Error Recovery
 */

class Phase2SecuritySmokeTest {
  constructor() {
    this.testResults = [];
    this.testCount = 0;
    this.passCount = 0;
  }

  /**
   * Run all Phase 2 smoke tests
   */
  async runAllTests() {
    console.log('🧪 Starting Phase 2 Security Components Smoke Test...');
    
    try {
      // Test 1: Component Loading
      await this.testComponentLoading();
      
      // Test 2: Graceful Degradation Initialization
      await this.testGracefulDegradationInit();
      
      // Test 3: Health Monitor Initialization
      await this.testHealthMonitorInit();
      
      // Test 4: Error Recovery Initialization
      await this.testErrorRecoveryInit();
      
      // Test 5: Module Failure Handling
      await this.testModuleFailureHandling();
      
      // Test 6: Health Monitoring
      await this.testHealthMonitoring();
      
      // Test 7: Error Recovery Strategies
      await this.testErrorRecoveryStrategies();
      
      // Test 8: Integration with Storage
      await this.testStorageIntegration();
      
      // Test 9: Cleanup and Reset
      await this.testCleanupAndReset();
      
      // Test 10: Browser Compatibility
      await this.testBrowserCompatibility();
      
      this.printResults();
      return this.passCount === this.testCount;
    } catch (error) {
      console.error('❌ Phase 2 smoke test suite failed:', error);
      return false;
    }
  }

  /**
   * Test 1: Component Loading
   */
  async testComponentLoading() {
    this.testCount++;
    
    try {
      // Check if Phase 2 components are loaded
      const componentsLoaded = {
        gracefulDegradation: typeof window.ClientSideGracefulDegradation === 'function',
        healthMonitor: typeof window.ClientSideSecurityHealthMonitor === 'function',
        errorRecovery: typeof window.ClientSideSecurityErrorRecovery === 'function'
      };
      
      const allLoaded = Object.values(componentsLoaded).every(loaded => loaded);
      
      if (allLoaded) {
        this.passCount++;
        this.testResults.push('✅ Component Loading: All Phase 2 components loaded successfully');
      } else {
        this.testResults.push(`❌ Component Loading: Missing components - ${JSON.stringify(componentsLoaded)}`);
      }
    } catch (error) {
      this.testResults.push(`❌ Component Loading: ${error.message}`);
    }
  }

  /**
   * Test 2: Graceful Degradation Initialization
   */
  async testGracefulDegradationInit() {
    this.testCount++;
    
    try {
      const degradation = new window.ClientSideGracefulDegradation();
      const initResult = await degradation.initialize();
      
      if (initResult.success) {
        this.passCount++;
        this.testResults.push(`✅ Graceful Degradation Init: Success (level: ${initResult.level})`);
      } else {
        this.testResults.push(`❌ Graceful Degradation Init: ${initResult.error}`);
      }
    } catch (error) {
      this.testResults.push(`❌ Graceful Degradation Init: ${error.message}`);
    }
  }

  /**
   * Test 3: Health Monitor Initialization
   */
  async testHealthMonitorInit() {
    this.testCount++;
    
    try {
      const healthMonitor = new window.ClientSideSecurityHealthMonitor();
      const initResult = await healthMonitor.initialize();
      
      if (initResult.success) {
        this.passCount++;
        this.testResults.push(`✅ Health Monitor Init: Success (monitoring: ${initResult.monitoring})`);
      } else {
        this.testResults.push(`❌ Health Monitor Init: ${initResult.error}`);
      }
    } catch (error) {
      this.testResults.push(`❌ Health Monitor Init: ${error.message}`);
    }
  }

  /**
   * Test 4: Error Recovery Initialization
   */
  async testErrorRecoveryInit() {
    this.testCount++;
    
    try {
      const errorRecovery = new window.ClientSideSecurityErrorRecovery();
      const initResult = await errorRecovery.initialize();
      
      if (initResult.success) {
        this.passCount++;
        this.testResults.push(`✅ Error Recovery Init: Success (strategies: ${initResult.strategies})`);
      } else {
        this.testResults.push(`❌ Error Recovery Init: ${initResult.error}`);
      }
    } catch (error) {
      this.testResults.push(`❌ Error Recovery Init: ${error.message}`);
    }
  }

  /**
   * Test 5: Module Failure Handling
   */
  async testModuleFailureHandling() {
    this.testCount++;
    
    try {
      const degradation = new window.ClientSideGracefulDegradation();
      await degradation.initialize();
      
      // Simulate module failure
      const testError = new Error('Test module failure');
      const result = await degradation.handleModuleFailure('webauthn', testError, {
        source: 'smoke-test'
      });
      
      if (result.success) {
        this.passCount++;
        this.testResults.push(`✅ Module Failure Handling: Success (level: ${result.newLevel})`);
      } else {
        this.testResults.push(`❌ Module Failure Handling: ${result.error}`);
      }
    } catch (error) {
      this.testResults.push(`❌ Module Failure Handling: ${error.message}`);
    }
  }

  /**
   * Test 6: Health Monitoring
   */
  async testHealthMonitoring() {
    this.testCount++;
    
    try {
      const healthMonitor = new window.ClientSideSecurityHealthMonitor();
      await healthMonitor.initialize();
      
      // Record test health data
      const recordResult = await healthMonitor.recordModuleHealth('test-module', 'healthy', {
        responseTime: 100,
        successCount: 10,
        errorCount: 0
      });
      
      // Get health status
      const healthStatus = await healthMonitor.getHealthStatus();
      
      if (recordResult.success && healthStatus.overall) {
        this.passCount++;
        this.testResults.push(`✅ Health Monitoring: Success (overall: ${healthStatus.overall})`);
      } else {
        this.testResults.push(`❌ Health Monitoring: Failed to record or retrieve health data`);
      }
    } catch (error) {
      this.testResults.push(`❌ Health Monitoring: ${error.message}`);
    }
  }

  /**
   * Test 7: Error Recovery Strategies
   */
  async testErrorRecoveryStrategies() {
    this.testCount++;
    
    try {
      const errorRecovery = new window.ClientSideSecurityErrorRecovery();
      await errorRecovery.initialize();
      
      // Test WebAuthn not supported error
      const testError = new Error('webauthn not supported');
      const recoveryResult = await errorRecovery.handleSecurityError(testError, {
        module: 'webauthn',
        operation: 'authentication'
      });
      
      if (recoveryResult.success !== undefined) {
        this.passCount++;
        this.testResults.push(`✅ Error Recovery Strategies: Success (recovered: ${recoveryResult.recovered})`);
      } else {
        this.testResults.push(`❌ Error Recovery Strategies: Invalid result format`);
      }
    } catch (error) {
      this.testResults.push(`❌ Error Recovery Strategies: ${error.message}`);
    }
  }

  /**
   * Test 8: Integration with Storage
   */
  async testStorageIntegration() {
    this.testCount++;
    
    try {
      // Test if storage can initialize with Phase 2 components
      if (typeof window.PWACardStorage === 'function') {
        const storage = new window.PWACardStorage();
        
        // Check if Phase 2 components are properly integrated
        const hasPhase2Components = storage.gracefulDegradation !== undefined &&
                                   storage.errorRecovery !== undefined;
        
        if (hasPhase2Components) {
          this.passCount++;
          this.testResults.push('✅ Storage Integration: Phase 2 components integrated');
        } else {
          this.testResults.push('❌ Storage Integration: Phase 2 components not integrated');
        }
      } else {
        this.testResults.push('❌ Storage Integration: PWACardStorage not available');
      }
    } catch (error) {
      this.testResults.push(`❌ Storage Integration: ${error.message}`);
    }
  }

  /**
   * Test 9: Cleanup and Reset
   */
  async testCleanupAndReset() {
    this.testCount++;
    
    try {
      const degradation = new window.ClientSideGracefulDegradation();
      await degradation.initialize();
      
      // Test reset functionality
      const resetResult = await degradation.resetDegradation();
      
      const errorRecovery = new window.ClientSideSecurityErrorRecovery();
      await errorRecovery.initialize();
      
      const recoveryResetResult = errorRecovery.resetRecovery();
      
      if (resetResult.success && recoveryResetResult.success) {
        this.passCount++;
        this.testResults.push('✅ Cleanup and Reset: All components reset successfully');
      } else {
        this.testResults.push('❌ Cleanup and Reset: Reset failed');
      }
    } catch (error) {
      this.testResults.push(`❌ Cleanup and Reset: ${error.message}`);
    }
  }

  /**
   * Test 10: Browser Compatibility
   */
  async testBrowserCompatibility() {
    this.testCount++;
    
    try {
      const compatibility = {
        localStorage: typeof localStorage !== 'undefined',
        indexedDB: typeof indexedDB !== 'undefined',
        crypto: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined',
        performance: typeof performance !== 'undefined',
        webWorker: typeof Worker !== 'undefined'
      };
      
      const compatibilityScore = Object.values(compatibility).filter(Boolean).length;
      const totalFeatures = Object.keys(compatibility).length;
      
      if (compatibilityScore >= 3) { // Minimum required features
        this.passCount++;
        this.testResults.push(`✅ Browser Compatibility: ${compatibilityScore}/${totalFeatures} features supported`);
      } else {
        this.testResults.push(`❌ Browser Compatibility: Only ${compatibilityScore}/${totalFeatures} features supported`);
      }
    } catch (error) {
      this.testResults.push(`❌ Browser Compatibility: ${error.message}`);
    }
  }

  /**
   * Print test results
   */
  printResults() {
    console.log('\n📊 Phase 2 Security Components Smoke Test Results:');
    console.log('='.repeat(60));
    
    this.testResults.forEach(result => {
      console.log(result);
    });
    
    console.log('='.repeat(60));
    console.log(`📈 Summary: ${this.passCount}/${this.testCount} tests passed (${Math.round(this.passCount/this.testCount*100)}%)`);
    
    if (this.passCount === this.testCount) {
      console.log('🎉 All Phase 2 security components are working correctly!');
    } else {
      console.log('⚠️  Some Phase 2 security components need attention.');
    }
  }
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  window.Phase2SecuritySmokeTest = Phase2SecuritySmokeTest;
  
  // Auto-run after DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      const tester = new Phase2SecuritySmokeTest();
      await tester.runAllTests();
    });
  } else {
    // DOM already loaded, run immediately
    setTimeout(async () => {
      const tester = new Phase2SecuritySmokeTest();
      await tester.runAllTests();
    }, 1000);
  }
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Phase2SecuritySmokeTest;
}