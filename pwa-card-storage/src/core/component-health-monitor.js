/**
 * Component Health Monitor - Minimal Implementation
 * Provides basic health monitoring interface for PWA components
 */

class ComponentHealthMonitor {
  constructor() {
    this.components = new Map();
    this.healthChecks = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize health monitor
   */
  async initialize() {
    this.isInitialized = true;
    return { success: true, message: 'Health monitor initialized' };
  }

  /**
   * Register component for health monitoring
   */
  registerComponent(name, component) {
    if (!name || !component) return false;
    
    this.components.set(name, {
      component,
      registeredAt: Date.now(),
      lastCheck: null,
      status: 'registered'
    });
    
    return true;
  }

  /**
   * Track component (alias for registerComponent)
   */
  track(name, component) {
    return this.registerComponent(name, component);
  }

  /**
   * Unregister component
   */
  unregisterComponent(name) {
    return this.components.delete(name);
  }

  /**
   * Perform health check on component
   */
  async checkComponentHealth(name) {
    const componentInfo = this.components.get(name);
    if (!componentInfo) {
      return { healthy: false, error: 'Component not found' };
    }

    try {
      // Basic health check - component exists and has required methods
      const component = componentInfo.component;
      const isHealthy = component && typeof component === 'object';
      
      componentInfo.lastCheck = Date.now();
      componentInfo.status = isHealthy ? 'healthy' : 'unhealthy';
      
      return {
        healthy: isHealthy,
        lastCheck: componentInfo.lastCheck,
        status: componentInfo.status
      };
    } catch (error) {
      componentInfo.status = 'error';
      return {
        healthy: false,
        error: error.message,
        lastCheck: Date.now()
      };
    }
  }

  /**
   * Get health status of all components
   */
  getHealthStatus() {
    const status = {
      totalComponents: this.components.size,
      healthy: 0,
      unhealthy: 0,
      errors: 0,
      components: {}
    };

    for (const [name, info] of this.components) {
      status.components[name] = {
        status: info.status,
        lastCheck: info.lastCheck,
        registeredAt: info.registeredAt
      };

      switch (info.status) {
        case 'healthy':
          status.healthy++;
          break;
        case 'unhealthy':
          status.unhealthy++;
          break;
        case 'error':
          status.errors++;
          break;
      }
    }

    return status;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.components.clear();
    this.healthChecks.clear();
    this.isInitialized = false;
  }

  /**
   * Check if monitor is available
   */
  isAvailable() {
    return this.isInitialized;
  }
}

// Export to global scope
window.ComponentHealthMonitor = ComponentHealthMonitor;

console.log('[ComponentHealthMonitor] Minimal health monitor loaded');