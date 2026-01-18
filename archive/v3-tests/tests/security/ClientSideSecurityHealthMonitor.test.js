/**
 * Test Suite: ClientSideSecurityHealthMonitor
 * Requirement: R-2.4 安全架構輕量化
 * Design: D-3.1 Security Layer (Lightweight)
 * Tasks: T-SECURITY-01, T-SECURITY-02
 */

describe('ClientSideSecurityHealthMonitor', () => {
  let healthMonitor;
  let mockLightweightSecurityCore;

  beforeEach(() => {
    // Mock LightweightSecurityCore
    mockLightweightSecurityCore = {
      log: jest.fn()
    };
    global.window = {
      LightweightSecurityCore: mockLightweightSecurityCore
    };

    healthMonitor = new ClientSideSecurityHealthMonitor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // TC-MON-001: 初始化測試
  describe('Initialization', () => {
    test('should initialize with default metrics', () => {
      const monitor = new ClientSideSecurityHealthMonitor();
      const status = monitor.getHealthStatus();
      
      expect(status.metrics.xssAttempts).toBe(0);
      expect(status.metrics.rateLimitHits).toBe(0);
      expect(status.metrics.invalidInputs).toBe(0);
      expect(status.metrics.errors).toBe(0);
      expect(status.alerts).toEqual([]);
      expect(status.healthy).toBe(true);
    });

    test('should initialize with correct thresholds', () => {
      expect(healthMonitor.thresholds.xssAttempts).toBe(5);
      expect(healthMonitor.thresholds.rateLimitHits).toBe(10);
      expect(healthMonitor.thresholds.invalidInputs).toBe(20);
    });
  });

  // TC-MON-002: 事件記錄測試
  describe('Event Recording', () => {
    test('should record valid security events', () => {
      healthMonitor.recordEvent('xssAttempts', { input: 'test' });
      
      const status = healthMonitor.getHealthStatus();
      expect(status.metrics.xssAttempts).toBe(1);
      expect(mockLightweightSecurityCore.log).toHaveBeenCalledWith(
        'info',
        'Security event: xssAttempts',
        { input: 'test' }
      );
    });

    test('should ignore invalid event types', () => {
      healthMonitor.recordEvent('invalidEvent', {});
      
      const status = healthMonitor.getHealthStatus();
      expect(status.metrics.xssAttempts).toBe(0);
      expect(status.metrics.rateLimitHits).toBe(0);
      expect(status.metrics.invalidInputs).toBe(0);
      expect(status.metrics.errors).toBe(0);
    });

    test('should increment metrics correctly', () => {
      healthMonitor.recordEvent('xssAttempts');
      healthMonitor.recordEvent('xssAttempts');
      healthMonitor.recordEvent('rateLimitHits');
      
      const status = healthMonitor.getHealthStatus();
      expect(status.metrics.xssAttempts).toBe(2);
      expect(status.metrics.rateLimitHits).toBe(1);
    });

    test('should handle missing LightweightSecurityCore', () => {
      global.window.LightweightSecurityCore = null;
      
      expect(() => {
        healthMonitor.recordEvent('xssAttempts');
      }).not.toThrow();
    });
  });

  // TC-MON-003: 閾值檢查測試
  describe('Threshold Checking', () => {
    test('should trigger alert when threshold exceeded', () => {
      // Record events up to threshold
      for (let i = 0; i < 5; i++) {
        healthMonitor.recordEvent('xssAttempts');
      }
      
      const status = healthMonitor.getHealthStatus();
      expect(status.alerts).toHaveLength(1);
      expect(status.alerts[0].type).toBe('xssAttempts');
      expect(status.alerts[0].count).toBe(5);
      expect(status.healthy).toBe(false);
    });

    test('should not trigger alert below threshold', () => {
      // Record events below threshold
      for (let i = 0; i < 4; i++) {
        healthMonitor.recordEvent('xssAttempts');
      }
      
      const status = healthMonitor.getHealthStatus();
      expect(status.alerts).toHaveLength(0);
      expect(status.healthy).toBe(true);
    });

    test('should handle events without thresholds', () => {
      healthMonitor.recordEvent('errors');
      
      const status = healthMonitor.getHealthStatus();
      expect(status.metrics.errors).toBe(1);
      expect(status.alerts).toHaveLength(0); // No threshold for errors
    });

    test('should trigger multiple alerts for different event types', () => {
      // Trigger xssAttempts alert
      for (let i = 0; i < 5; i++) {
        healthMonitor.recordEvent('xssAttempts');
      }
      
      // Trigger rateLimitHits alert
      for (let i = 0; i < 10; i++) {
        healthMonitor.recordEvent('rateLimitHits');
      }
      
      const status = healthMonitor.getHealthStatus();
      expect(status.alerts).toHaveLength(2);
      expect(status.alerts.some(a => a.type === 'xssAttempts')).toBe(true);
      expect(status.alerts.some(a => a.type === 'rateLimitHits')).toBe(true);
    });
  });

  // TC-MON-004: 告警觸發測試
  describe('Alert Triggering', () => {
    test('should create alert with correct properties', () => {
      const beforeTime = Date.now();
      healthMonitor.triggerAlert('xssAttempts', 5);
      const afterTime = Date.now();
      
      const status = healthMonitor.getHealthStatus();
      const alert = status.alerts[0];
      
      expect(alert.id).toBeGreaterThanOrEqual(beforeTime);
      expect(alert.id).toBeLessThanOrEqual(afterTime);
      expect(alert.type).toBe('xssAttempts');
      expect(alert.count).toBe(5);
      expect(alert.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(alert.timestamp).toBeLessThanOrEqual(afterTime);
      expect(alert.message).toBe('Security threshold exceeded: xssAttempts (5)');
    });

    test('should log alert message', () => {
      healthMonitor.triggerAlert('xssAttempts', 5);
      
      expect(mockLightweightSecurityCore.log).toHaveBeenCalledWith(
        'warn',
        'Security threshold exceeded: xssAttempts (5)'
      );
    });

    test('should limit alerts to 10 most recent', () => {
      // Generate 15 alerts
      for (let i = 0; i < 15; i++) {
        healthMonitor.triggerAlert('xssAttempts', i + 1);
      }
      
      expect(healthMonitor.alerts).toHaveLength(10);
      // Should keep the last 10 alerts
      expect(healthMonitor.alerts[0].count).toBe(6); // 15 - 10 + 1
      expect(healthMonitor.alerts[9].count).toBe(15);
    });
  });

  // TC-MON-005: 健康狀態測試
  describe('Health Status', () => {
    test('should return complete health status', () => {
      healthMonitor.recordEvent('xssAttempts');
      healthMonitor.recordEvent('rateLimitHits');
      
      const status = healthMonitor.getHealthStatus();
      
      expect(status).toHaveProperty('metrics');
      expect(status).toHaveProperty('alerts');
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('healthy');
      
      expect(status.metrics.xssAttempts).toBe(1);
      expect(status.metrics.rateLimitHits).toBe(1);
      expect(typeof status.timestamp).toBe('number');
    });

    test('should return copy of metrics', () => {
      const status1 = healthMonitor.getHealthStatus();
      const status2 = healthMonitor.getHealthStatus();
      
      expect(status1.metrics).toEqual(status2.metrics);
      expect(status1.metrics).not.toBe(status2.metrics);
    });

    test('should return last 5 alerts', () => {
      // Generate 8 alerts
      for (let i = 0; i < 8; i++) {
        healthMonitor.triggerAlert('xssAttempts', i + 1);
      }
      
      const status = healthMonitor.getHealthStatus();
      expect(status.alerts).toHaveLength(5);
      // Should be the last 5 alerts
      expect(status.alerts[0].count).toBe(4);
      expect(status.alerts[4].count).toBe(8);
    });

    test('should indicate unhealthy when alerts exist', () => {
      healthMonitor.triggerAlert('xssAttempts', 5);
      
      const status = healthMonitor.getHealthStatus();
      expect(status.healthy).toBe(false);
    });

    test('should indicate healthy when no alerts', () => {
      const status = healthMonitor.getHealthStatus();
      expect(status.healthy).toBe(true);
    });
  });

  // TC-MON-006: 重置功能測試
  describe('Reset Functionality', () => {
    test('should reset all metrics to zero', () => {
      healthMonitor.recordEvent('xssAttempts');
      healthMonitor.recordEvent('rateLimitHits');
      healthMonitor.recordEvent('invalidInputs');
      healthMonitor.recordEvent('errors');
      
      healthMonitor.reset();
      
      const status = healthMonitor.getHealthStatus();
      expect(status.metrics.xssAttempts).toBe(0);
      expect(status.metrics.rateLimitHits).toBe(0);
      expect(status.metrics.invalidInputs).toBe(0);
      expect(status.metrics.errors).toBe(0);
    });

    test('should clear all alerts', () => {
      healthMonitor.triggerAlert('xssAttempts', 5);
      healthMonitor.triggerAlert('rateLimitHits', 10);
      
      healthMonitor.reset();
      
      const status = healthMonitor.getHealthStatus();
      expect(status.alerts).toHaveLength(0);
      expect(status.healthy).toBe(true);
    });

    test('should allow recording events after reset', () => {
      healthMonitor.recordEvent('xssAttempts');
      healthMonitor.reset();
      healthMonitor.recordEvent('xssAttempts');
      
      const status = healthMonitor.getHealthStatus();
      expect(status.metrics.xssAttempts).toBe(1);
    });
  });

  // TC-MON-007: 邊界條件測試
  describe('Edge Cases', () => {
    test('should handle rapid event recording', () => {
      for (let i = 0; i < 1000; i++) {
        healthMonitor.recordEvent('xssAttempts');
      }
      
      const status = healthMonitor.getHealthStatus();
      expect(status.metrics.xssAttempts).toBe(1000);
    });

    test('should handle concurrent access', () => {
      const monitor1 = new ClientSideSecurityHealthMonitor();
      const monitor2 = new ClientSideSecurityHealthMonitor();
      
      monitor1.recordEvent('xssAttempts');
      monitor2.recordEvent('rateLimitHits');
      
      expect(monitor1.getHealthStatus().metrics.xssAttempts).toBe(1);
      expect(monitor1.getHealthStatus().metrics.rateLimitHits).toBe(0);
      expect(monitor2.getHealthStatus().metrics.xssAttempts).toBe(0);
      expect(monitor2.getHealthStatus().metrics.rateLimitHits).toBe(1);
    });

    test('should handle undefined event details', () => {
      expect(() => {
        healthMonitor.recordEvent('xssAttempts', undefined);
      }).not.toThrow();
      
      expect(mockLightweightSecurityCore.log).toHaveBeenCalledWith(
        'info',
        'Security event: xssAttempts',
        undefined
      );
    });
  });
});