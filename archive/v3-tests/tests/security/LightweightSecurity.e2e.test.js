/**
 * E2E Test Suite: Lightweight Security Architecture
 * Requirement: R-2.4 安全架構輕量化
 * Design: D-3.1 Security Layer (Lightweight)
 * Tasks: T-SECURITY-01, T-SECURITY-02, T-SECURITY-03
 */

describe('Lightweight Security E2E', () => {
  let page;
  let browser;

  beforeAll(async () => {
    // Setup Puppeteer for E2E testing
    browser = await require('puppeteer').launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Navigate to PWA
    await page.goto('http://localhost:8080/pwa-card-storage/', {
      waitUntil: 'networkidle0'
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    // Clear localStorage before each test
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    // Reload page to reset state
    await page.reload({ waitUntil: 'networkidle0' });
  });

  // TC-E2E-001: 安全組件載入測試
  describe('Security Components Loading', () => {
    test('should load all lightweight security components', async () => {
      const components = await page.evaluate(() => {
        return {
          core: typeof window.LightweightSecurityCore !== 'undefined',
          toggle: typeof window.StaticHostingSecurityToggle !== 'undefined',
          monitor: typeof window.ClientSideSecurityHealthMonitor !== 'undefined'
        };
      });
      
      expect(components.core).toBe(true);
      expect(components.toggle).toBe(true);
      expect(components.monitor).toBe(true);
    });

    test('should initialize security core automatically', async () => {
      const initialized = await page.evaluate(() => {
        const instance = window.LightweightSecurityCore.getInstance();
        return instance !== null;
      });
      
      expect(initialized).toBe(true);
    });

    test('should setup CSP meta tag', async () => {
      const cspExists = await page.evaluate(() => {
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        return meta !== null && meta.content.includes("default-src 'self'");
      });
      
      expect(cspExists).toBe(true);
    });
  });

  // TC-E2E-002: 輸入驗證 E2E 測試
  describe('Input Validation E2E', () => {
    test('should validate user input in forms', async () => {
      // Navigate to import page
      await page.click('[data-page="import"]');
      await page.waitForSelector('#import-url', { visible: true });
      
      // Test XSS input
      const xssInput = '<script>alert("xss")</script>';
      await page.type('#import-url', xssInput);
      
      // Validate input using security core
      const validationResult = await page.evaluate((input) => {
        return window.LightweightSecurityCore.validateInput(input);
      }, xssInput);
      
      expect(validationResult.valid).toBe(true);
      expect(validationResult.sanitized).not.toContain('<script>');
    });

    test('should handle long input gracefully', async () => {
      const longInput = 'a'.repeat(1001);
      
      const validationResult = await page.evaluate((input) => {
        return window.LightweightSecurityCore.validateInput(input);
      }, longInput);
      
      expect(validationResult.valid).toBe(false);
    });

    test('should escape HTML in output', async () => {
      const htmlInput = '<div>test & "quote"</div>';
      
      const escaped = await page.evaluate((input) => {
        return window.LightweightSecurityCore.escapeHtml(input);
      }, htmlInput);
      
      expect(escaped).toBe('&lt;div&gt;test &amp; &quot;quote&quot;&lt;/div&gt;');
    });
  });

  // TC-E2E-003: 安全功能開關 E2E 測試
  describe('Security Toggle E2E', () => {
    test('should persist security settings across page reloads', async () => {
      // Toggle CSP off
      await page.evaluate(() => {
        const toggle = new window.StaticHostingSecurityToggle();
        toggle.toggle('csp', false);
        return toggle.isEnabled('csp');
      });
      
      // Reload page
      await page.reload({ waitUntil: 'networkidle0' });
      
      // Check if setting persisted
      const cspEnabled = await page.evaluate(() => {
        const toggle = new window.StaticHostingSecurityToggle();
        return toggle.isEnabled('csp');
      });
      
      expect(cspEnabled).toBe(false);
    });

    test('should toggle multiple features independently', async () => {
      const results = await page.evaluate(() => {
        const toggle = new window.StaticHostingSecurityToggle();
        
        toggle.toggle('csp', false);
        toggle.toggle('xssProtection', true);
        toggle.toggle('rateLimit', false);
        
        return {
          csp: toggle.isEnabled('csp'),
          xssProtection: toggle.isEnabled('xssProtection'),
          rateLimit: toggle.isEnabled('rateLimit'),
          logging: toggle.isEnabled('logging') // Should remain default
        };
      });
      
      expect(results.csp).toBe(false);
      expect(results.xssProtection).toBe(true);
      expect(results.rateLimit).toBe(false);
      expect(results.logging).toBe(true);
    });
  });

  // TC-E2E-004: 健康監控 E2E 測試
  describe('Health Monitoring E2E', () => {
    test('should record and monitor security events', async () => {
      const monitoringResult = await page.evaluate(() => {
        const monitor = new window.ClientSideSecurityHealthMonitor();
        
        // Record some events
        monitor.recordEvent('xssAttempts', { input: 'test1' });
        monitor.recordEvent('xssAttempts', { input: 'test2' });
        monitor.recordEvent('rateLimitHits');
        
        return monitor.getHealthStatus();
      });
      
      expect(monitoringResult.metrics.xssAttempts).toBe(2);
      expect(monitoringResult.metrics.rateLimitHits).toBe(1);
      expect(monitoringResult.healthy).toBe(true);
    });

    test('should trigger alerts when thresholds exceeded', async () => {
      const alertResult = await page.evaluate(() => {
        const monitor = new window.ClientSideSecurityHealthMonitor();
        
        // Trigger threshold for xssAttempts (5)
        for (let i = 0; i < 5; i++) {
          monitor.recordEvent('xssAttempts');
        }
        
        return monitor.getHealthStatus();
      });
      
      expect(alertResult.alerts).toHaveLength(1);
      expect(alertResult.alerts[0].type).toBe('xssAttempts');
      expect(alertResult.healthy).toBe(false);
    });

    test('should reset monitoring state', async () => {
      const resetResult = await page.evaluate(() => {
        const monitor = new window.ClientSideSecurityHealthMonitor();
        
        // Record events and trigger alert
        for (let i = 0; i < 5; i++) {
          monitor.recordEvent('xssAttempts');
        }
        
        // Reset
        monitor.reset();
        
        return monitor.getHealthStatus();
      });
      
      expect(resetResult.metrics.xssAttempts).toBe(0);
      expect(resetResult.alerts).toHaveLength(0);
      expect(resetResult.healthy).toBe(true);
    });
  });

  // TC-E2E-005: 速率限制 E2E 測試
  describe('Rate Limiting E2E', () => {
    test('should enforce rate limits on operations', async () => {
      const rateLimitResult = await page.evaluate(() => {
        const core = window.LightweightSecurityCore.getInstance();
        const results = [];
        
        // Test rate limiting
        for (let i = 0; i < 102; i++) {
          results.push(core.checkRateLimit('test'));
        }
        
        return {
          totalRequests: results.length,
          allowedRequests: results.filter(r => r).length,
          blockedRequests: results.filter(r => !r).length
        };
      });
      
      expect(rateLimitResult.totalRequests).toBe(102);
      expect(rateLimitResult.allowedRequests).toBe(100);
      expect(rateLimitResult.blockedRequests).toBe(2);
    });

    test('should handle different operation types separately', async () => {
      const separateRateLimitResult = await page.evaluate(() => {
        const core = window.LightweightSecurityCore.getInstance();
        
        // Exhaust limit for 'op1'
        for (let i = 0; i < 100; i++) {
          core.checkRateLimit('op1');
        }
        
        return {
          op1Blocked: !core.checkRateLimit('op1'),
          op2Allowed: core.checkRateLimit('op2')
        };
      });
      
      expect(separateRateLimitResult.op1Blocked).toBe(true);
      expect(separateRateLimitResult.op2Allowed).toBe(true);
    });
  });

  // TC-E2E-006: 安全日誌 E2E 測試
  describe('Security Logging E2E', () => {
    test('should log security events to console', async () => {
      const logs = [];
      
      // Capture console logs
      page.on('console', msg => {
        if (msg.text().includes('[Security]')) {
          logs.push(msg.text());
        }
      });
      
      // Trigger security logging
      await page.evaluate(() => {
        window.LightweightSecurityCore.log('info', 'Test security event');
        window.LightweightSecurityCore.log('error', 'Test security error');
      });
      
      // Wait for logs to be captured
      await page.waitForTimeout(100);
      
      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.some(log => log.includes('Test security event'))).toBe(true);
      expect(logs.some(log => log.includes('Test security error'))).toBe(true);
    });

    test('should escape HTML in log messages', async () => {
      const logs = [];
      
      page.on('console', msg => {
        if (msg.text().includes('[Security]')) {
          logs.push(msg.text());
        }
      });
      
      await page.evaluate(() => {
        window.LightweightSecurityCore.log('info', '<script>alert("xss")</script>');
      });
      
      await page.waitForTimeout(100);
      
      const logWithEscapedHtml = logs.find(log => 
        log.includes('&lt;script&gt;') && log.includes('&lt;/script&gt;')
      );
      expect(logWithEscapedHtml).toBeDefined();
    });
  });

  // TC-E2E-007: 整合場景 E2E 測試
  describe('Integration Scenarios E2E', () => {
    test('should handle complete security workflow', async () => {
      const workflowResult = await page.evaluate(() => {
        // Initialize components
        const core = window.LightweightSecurityCore.getInstance();
        const toggle = new window.StaticHostingSecurityToggle();
        const monitor = new window.ClientSideSecurityHealthMonitor();
        
        // Configure security settings
        toggle.toggle('xssProtection', true);
        toggle.toggle('rateLimit', true);
        toggle.toggle('logging', true);
        
        // Simulate user input with potential XSS
        const userInput = '<script>alert("xss")</script>';
        const validation = core.validateInput(userInput);
        
        // Record security event
        if (validation.valid) {
          monitor.recordEvent('xssAttempts', { input: userInput });
        }
        
        // Check rate limit
        const rateLimitOk = core.checkRateLimit('userInput');
        if (!rateLimitOk) {
          monitor.recordEvent('rateLimitHits');
        }
        
        // Get final status
        return {
          validation,
          rateLimitOk,
          healthStatus: monitor.getHealthStatus(),
          toggleSettings: toggle.getAllFeatures()
        };
      });
      
      expect(workflowResult.validation.valid).toBe(true);
      expect(workflowResult.validation.sanitized).not.toContain('<script>');
      expect(workflowResult.rateLimitOk).toBe(true);
      expect(workflowResult.healthStatus.metrics.xssAttempts).toBe(1);
      expect(workflowResult.toggleSettings.xssProtection).toBe(true);
    });

    test('should maintain performance under load', async () => {
      const performanceResult = await page.evaluate(() => {
        const startTime = performance.now();
        
        const core = window.LightweightSecurityCore.getInstance();
        const monitor = new window.ClientSideSecurityHealthMonitor();
        
        // Simulate high load
        for (let i = 0; i < 1000; i++) {
          const input = `test input ${i}`;
          const validation = core.validateInput(input);
          
          if (i % 10 === 0) {
            monitor.recordEvent('invalidInputs');
          }
          
          if (i % 50 === 0) {
            core.checkRateLimit('loadTest');
          }
        }
        
        const endTime = performance.now();
        
        return {
          duration: endTime - startTime,
          healthStatus: monitor.getHealthStatus()
        };
      });
      
      // Should complete within reasonable time (< 100ms)
      expect(performanceResult.duration).toBeLessThan(100);
      expect(performanceResult.healthStatus.metrics.invalidInputs).toBe(100);
    });
  });

  // TC-E2E-008: 錯誤恢復 E2E 測試
  describe('Error Recovery E2E', () => {
    test('should recover from localStorage errors', async () => {
      const recoveryResult = await page.evaluate(() => {
        // Mock localStorage to throw errors
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = () => {
          throw new Error('localStorage error');
        };
        
        try {
          const toggle = new window.StaticHostingSecurityToggle();
          toggle.toggle('csp', false);
          
          // Should not throw error
          return { success: true, cspEnabled: toggle.isEnabled('csp') };
        } catch (error) {
          return { success: false, error: error.message };
        } finally {
          // Restore localStorage
          localStorage.setItem = originalSetItem;
        }
      });
      
      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.cspEnabled).toBe(false);
    });

    test('should continue functioning with missing dependencies', async () => {
      const dependencyResult = await page.evaluate(() => {
        // Remove LightweightSecurityCore temporarily
        const originalCore = window.LightweightSecurityCore;
        window.LightweightSecurityCore = null;
        
        try {
          const monitor = new window.ClientSideSecurityHealthMonitor();
          monitor.recordEvent('xssAttempts');
          
          const status = monitor.getHealthStatus();
          return { success: true, metrics: status.metrics };
        } catch (error) {
          return { success: false, error: error.message };
        } finally {
          // Restore LightweightSecurityCore
          window.LightweightSecurityCore = originalCore;
        }
      });
      
      expect(dependencyResult.success).toBe(true);
      expect(dependencyResult.metrics.xssAttempts).toBe(1);
    });
  });
});