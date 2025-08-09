/**
 * Translation Key Debug Reporting Tools
 * Comprehensive logging and debugging capabilities for translation issues
 * Development-mode safe debug tools with performance tracking
 */

class TranslationDebugReporter {
  constructor(config = {}) {
    this.config = {
      enableDebugMode: config.enableDebugMode || this._isDevMode(),
      enableConsoleTools: config.enableConsoleTools !== false,
      enablePerformanceTracking: config.enablePerformanceTracking !== false,
      logLevel: config.logLevel || 'debug',
      maxHistorySize: config.maxHistorySize || 1000,
      enableRealtimeReporting: config.enableRealtimeReporting || false,
      ...config
    };

    this.keyLookupHistory = [];
    this.missingKeysReport = new Map();
    this.performanceMetrics = {
      lookups: [],
      averageTime: 0,
      slowestLookups: [],
      keyUsageFrequency: new Map()
    };
    
    this.debugSession = {
      startTime: Date.now(),
      totalLookups: 0,
      errors: 0,
      warnings: 0
    };

    // Initialize console tools if enabled
    if (this.config.enableDebugMode && this.config.enableConsoleTools) {
      this._initializeConsoleTools();
    }
  }

  /**
   * Report a missing translation key
   * @param {Object} context - Context information about the missing key
   */
  reportMissingKey(context) {
    if (!this.config.enableDebugMode) return;

    const report = {
      ...context,
      reportId: this._generateReportId(),
      reportTime: Date.now(),
      stackTrace: this.config.logLevel === 'debug' ? new Error().stack : null
    };

    // Add to missing keys report
    const languageKey = `${context.language}-${context.key}`;
    if (!this.missingKeysReport.has(languageKey)) {
      this.missingKeysReport.set(languageKey, {
        key: context.key,
        language: context.language,
        occurrences: 0,
        firstSeen: report.reportTime,
        lastSeen: report.reportTime,
        fallbackStrategies: new Set(),
        contexts: []
      });
    }

    const existing = this.missingKeysReport.get(languageKey);
    existing.occurrences++;
    existing.lastSeen = report.reportTime;
    existing.fallbackStrategies.add(context.fallbackUsed || 'none');
    existing.contexts.push({
      timestamp: report.reportTime,
      fallback: context.fallbackUsed
    });

    // Limit context history
    if (existing.contexts.length > 10) {
      existing.contexts = existing.contexts.slice(-5);
    }

    this._logDebugEvent('missing_key', report);
    this.debugSession.errors++;

    // Trigger real-time reporting if enabled
    if (this.config.enableRealtimeReporting) {
      this._triggerRealtimeReport('missing_key', report);
    }
  }

  /**
   * Report a successful translation key lookup with performance metrics
   * @param {Object} lookupInfo - Information about the lookup
   */
  reportKeyLookup(lookupInfo) {
    if (!this.config.enableDebugMode) return;

    const report = {
      key: lookupInfo.key,
      language: lookupInfo.language,
      duration: lookupInfo.duration || 0,
      cacheHit: lookupInfo.cacheHit || false,
      timestamp: Date.now(),
      reportId: this._generateReportId()
    };

    // Track performance metrics
    if (this.config.enablePerformanceTracking) {
      this.performanceMetrics.lookups.push(report);
      
      // Update frequency tracking
      const keyFreq = this.performanceMetrics.keyUsageFrequency.get(lookupInfo.key) || 0;
      this.performanceMetrics.keyUsageFrequency.set(lookupInfo.key, keyFreq + 1);

      // Track slow lookups
      if (report.duration > 5) { // 5ms threshold
        this.performanceMetrics.slowestLookups.push(report);
        this.performanceMetrics.slowestLookups.sort((a, b) => b.duration - a.duration);
        this.performanceMetrics.slowestLookups = this.performanceMetrics.slowestLookups.slice(0, 20);
      }

      // Update average time
      const recentLookups = this.performanceMetrics.lookups.slice(-100);
      this.performanceMetrics.averageTime = recentLookups.reduce((sum, lookup) => sum + lookup.duration, 0) / recentLookups.length;

      // Limit history size
      if (this.performanceMetrics.lookups.length > this.config.maxHistorySize) {
        this.performanceMetrics.lookups = this.performanceMetrics.lookups.slice(-Math.floor(this.config.maxHistorySize / 2));
      }
    }

    // Add to lookup history
    this.keyLookupHistory.push(report);
    if (this.keyLookupHistory.length > this.config.maxHistorySize) {
      this.keyLookupHistory = this.keyLookupHistory.slice(-Math.floor(this.config.maxHistorySize / 2));
    }

    this.debugSession.totalLookups++;

    // Debug level logging for individual lookups
    if (this.config.logLevel === 'debug' && report.duration > 10) {
      this._logDebugEvent('slow_lookup', report);
    }
  }

  /**
   * Generate comprehensive debug report
   * @param {Object} options - Report options
   * @returns {Object} Debug report
   */
  generateDebugReport(options = {}) {
    const {
      includeHistory = false,
      includePerformance = true,
      includeMissingKeys = true,
      format = 'object' // 'object', 'json', 'console'
    } = options;

    const report = {
      generated: new Date().toISOString(),
      session: {
        ...this.debugSession,
        duration: Date.now() - this.debugSession.startTime
      },
      summary: {
        totalMissingKeys: this.missingKeysReport.size,
        totalLookups: this.debugSession.totalLookups,
        errorRate: this.debugSession.totalLookups > 0 ? (this.debugSession.errors / this.debugSession.totalLookups * 100).toFixed(2) + '%' : '0%'
      }
    };

    if (includeMissingKeys) {
      report.missingKeys = this._compileMissingKeysReport();
    }

    if (includePerformance && this.config.enablePerformanceTracking) {
      report.performance = this._compilePerformanceReport();
    }

    if (includeHistory) {
      report.recentHistory = this.keyLookupHistory.slice(-50);
    }

    // Add recommendations
    report.recommendations = this._generateRecommendations();

    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    } else if (format === 'console') {
      this._printConsoleReport(report);
      return report;
    }

    return report;
  }

  /**
   * Compile missing keys report
   * @returns {Object} Missing keys analysis
   */
  _compileMissingKeysReport() {
    const report = {
      total: this.missingKeysReport.size,
      byLanguage: {},
      mostFrequent: [],
      recentlyAdded: []
    };

    // Group by language and find patterns
    for (const [languageKey, data] of this.missingKeysReport.entries()) {
      const { language, key, occurrences, firstSeen, fallbackStrategies } = data;
      
      if (!report.byLanguage[language]) {
        report.byLanguage[language] = {
          count: 0,
          keys: []
        };
      }
      
      report.byLanguage[language].count++;
      report.byLanguage[language].keys.push({
        key,
        occurrences,
        firstSeen,
        fallbackStrategies: Array.from(fallbackStrategies)
      });
    }

    // Sort keys by frequency
    const allMissingKeys = Array.from(this.missingKeysReport.values());
    report.mostFrequent = allMissingKeys
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10)
      .map(item => ({
        key: item.key,
        language: item.language,
        occurrences: item.occurrences,
        fallbackStrategies: Array.from(item.fallbackStrategies)
      }));

    // Recently discovered missing keys
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    report.recentlyAdded = allMissingKeys
      .filter(item => item.firstSeen > oneHourAgo)
      .sort((a, b) => b.firstSeen - a.firstSeen)
      .slice(0, 10)
      .map(item => ({
        key: item.key,
        language: item.language,
        firstSeen: new Date(item.firstSeen).toISOString()
      }));

    return report;
  }

  /**
   * Compile performance analysis report
   * @returns {Object} Performance metrics
   */
  _compilePerformanceReport() {
    const { lookups, averageTime, slowestLookups, keyUsageFrequency } = this.performanceMetrics;

    const report = {
      averageTime: Math.round(averageTime * 100) / 100,
      totalLookups: lookups.length,
      slowestLookups: slowestLookups.slice(0, 10),
      frequentlyUsedKeys: [],
      cacheEffectiveness: 0
    };

    // Most frequently used keys
    const sortedFrequencies = Array.from(keyUsageFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    
    report.frequentlyUsedKeys = sortedFrequencies.map(([key, frequency]) => ({
      key,
      frequency,
      percentage: ((frequency / lookups.length) * 100).toFixed(1) + '%'
    }));

    // Cache effectiveness
    const cacheHits = lookups.filter(lookup => lookup.cacheHit).length;
    report.cacheEffectiveness = lookups.length > 0 ? 
      Math.round((cacheHits / lookups.length) * 100) : 0;

    // Performance trends (last 100 lookups vs earlier)
    if (lookups.length > 100) {
      const recent100 = lookups.slice(-100);
      const earlier100 = lookups.slice(-200, -100);
      
      const recentAvg = recent100.reduce((sum, l) => sum + l.duration, 0) / recent100.length;
      const earlierAvg = earlier100.reduce((sum, l) => sum + l.duration, 0) / earlier100.length;
      
      report.trend = {
        recent100Avg: Math.round(recentAvg * 100) / 100,
        earlier100Avg: Math.round(earlierAvg * 100) / 100,
        improvement: Math.round((earlierAvg - recentAvg) * 100) / 100
      };
    }

    return report;
  }

  /**
   * Generate actionable recommendations based on collected data
   * @returns {Array} List of recommendations
   */
  _generateRecommendations() {
    const recommendations = [];

    // Missing keys recommendations
    if (this.missingKeysReport.size > 0) {
      const totalMissing = this.missingKeysReport.size;
      if (totalMissing > 50) {
        recommendations.push({
          type: 'critical',
          category: 'missing_keys',
          message: `High number of missing keys (${totalMissing}). Consider running a comprehensive translation audit.`,
          action: 'Run TranslationValidator.validateTranslationCompleteness()'
        });
      } else if (totalMissing > 10) {
        recommendations.push({
          type: 'warning',
          category: 'missing_keys',
          message: `Moderate number of missing keys (${totalMissing}). Review and add missing translations.`,
          action: 'Check generated report for most frequent missing keys'
        });
      }
    }

    // Performance recommendations
    if (this.config.enablePerformanceTracking && this.performanceMetrics.averageTime > 5) {
      recommendations.push({
        type: 'performance',
        category: 'speed',
        message: `Average lookup time is ${this.performanceMetrics.averageTime.toFixed(2)}ms. Consider optimizing translation loading.`,
        action: 'Enable smart caching or preload frequently used translations'
      });
    }

    // Cache effectiveness
    if (this.performanceMetrics.lookups.length > 100) {
      const cacheHits = this.performanceMetrics.lookups.filter(l => l.cacheHit).length;
      const cacheRate = (cacheHits / this.performanceMetrics.lookups.length) * 100;
      
      if (cacheRate < 50) {
        recommendations.push({
          type: 'performance',
          category: 'caching',
          message: `Low cache hit rate (${cacheRate.toFixed(1)}%). Improve caching strategy.`,
          action: 'Review translation caching configuration'
        });
      }
    }

    // Frequent missing keys
    const frequentMissing = Array.from(this.missingKeysReport.values())
      .filter(item => item.occurrences > 5);
    
    if (frequentMissing.length > 0) {
      recommendations.push({
        type: 'urgent',
        category: 'user_impact',
        message: `${frequentMissing.length} keys are missing frequently and impacting user experience.`,
        action: 'Prioritize adding these high-impact translations: ' + 
               frequentMissing.slice(0, 3).map(item => `${item.language}.${item.key}`).join(', ')
      });
    }

    return recommendations;
  }

  /**
   * Initialize browser console debug tools
   */
  _initializeConsoleTools() {
    if (typeof window === 'undefined') return;

    // Add global debug functions to window
    window.translationDebug = {
      getReport: (options = {}) => this.generateDebugReport(options),
      printReport: () => this.generateDebugReport({ format: 'console' }),
      getMissingKeys: () => this._compileMissingKeysReport(),
      getPerformance: () => this._compilePerformanceReport(),
      clearHistory: () => this.clearDebugHistory(),
      exportReport: () => this._exportDebugReport(),
      
      // Utility functions
      findKey: (keyPattern) => this._findKeysMatching(keyPattern),
      analyzeUsage: (key) => this._analyzeKeyUsage(key),
      testTranslation: (key, language) => this._testTranslationKey(key, language)
    };

    console.info('[TranslationDebugReporter] Debug tools initialized. Use window.translationDebug for debugging.');
  }

  /**
   * Find keys matching a pattern
   * @param {string|RegExp} pattern - Pattern to match keys
   * @returns {Array} Matching keys from history
   */
  _findKeysMatching(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    
    const matchingKeys = new Set();
    
    // Search in lookup history
    this.keyLookupHistory.forEach(lookup => {
      if (regex.test(lookup.key)) {
        matchingKeys.add(lookup.key);
      }
    });

    // Search in missing keys
    this.missingKeysReport.forEach((data, languageKey) => {
      if (regex.test(data.key)) {
        matchingKeys.add(`${data.language}.${data.key}`);
      }
    });

    return Array.from(matchingKeys);
  }

  /**
   * Analyze usage patterns for a specific key
   * @param {string} key - Translation key to analyze
   * @returns {Object} Usage analysis
   */
  _analyzeKeyUsage(key) {
    const analysis = {
      key: key,
      found: false,
      usageCount: 0,
      languages: new Set(),
      averageTime: 0,
      isMissing: false,
      recentUsage: []
    };

    // Check lookup history
    const keyLookups = this.keyLookupHistory.filter(lookup => lookup.key === key);
    if (keyLookups.length > 0) {
      analysis.found = true;
      analysis.usageCount = keyLookups.length;
      analysis.averageTime = keyLookups.reduce((sum, l) => sum + l.duration, 0) / keyLookups.length;
      analysis.recentUsage = keyLookups.slice(-10);
      keyLookups.forEach(lookup => analysis.languages.add(lookup.language));
    }

    // Check missing keys
    for (const [languageKey, data] of this.missingKeysReport.entries()) {
      if (data.key === key) {
        analysis.isMissing = true;
        analysis.languages.add(data.language);
      }
    }

    analysis.languages = Array.from(analysis.languages);
    return analysis;
  }

  /**
   * Test if a translation key exists and return debug info
   * @param {string} key - Translation key
   * @param {string} language - Language to test
   * @returns {Object} Test result
   */
  _testTranslationKey(key, language) {
    // This would need to integrate with the actual translation system
    // For now, return debug information about the key
    const testResult = {
      key: key,
      language: language,
      exists: 'unknown', // Would be determined by actual translation lookup
      debugInfo: this._analyzeKeyUsage(key),
      recommendations: []
    };

    if (testResult.debugInfo.isMissing) {
      testResult.recommendations.push(`Key '${key}' is missing in language '${language}'`);
    }

    return testResult;
  }

  /**
   * Export debug report as downloadable file
   */
  _exportDebugReport() {
    if (typeof window === 'undefined') return;

    const report = this.generateDebugReport({ 
      includeHistory: true, 
      includePerformance: true, 
      format: 'json' 
    });

    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `translation-debug-report-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    console.info('[TranslationDebugReporter] Debug report exported');
  }

  /**
   * Print formatted report to console
   * @param {Object} report - Report data
   */
  _printConsoleReport(report) {
    console.group('< Translation Debug Report');
    
    console.info('=Ê Session Summary:', report.summary);
    
    if (report.missingKeys && report.missingKeys.total > 0) {
      console.group('L Missing Keys Analysis');
      console.info('By Language:', report.missingKeys.byLanguage);
      if (report.missingKeys.mostFrequent.length > 0) {
        console.info('Most Frequent:', report.missingKeys.mostFrequent);
      }
      console.groupEnd();
    }

    if (report.performance) {
      console.group('¡ Performance Metrics');
      console.info(`Average Lookup Time: ${report.performance.averageTime}ms`);
      console.info(`Cache Effectiveness: ${report.performance.cacheEffectiveness}%`);
      if (report.performance.slowestLookups.length > 0) {
        console.info('Slowest Lookups:', report.performance.slowestLookups.slice(0, 5));
      }
      console.groupEnd();
    }

    if (report.recommendations && report.recommendations.length > 0) {
      console.group('=¡ Recommendations');
      report.recommendations.forEach(rec => {
        const icon = rec.type === 'critical' ? '=¨' : rec.type === 'warning' ? ' ' : '=¡';
        console.info(`${icon} ${rec.message}`);
        console.info(`   Action: ${rec.action}`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Generate unique report ID
   * @returns {string} Unique ID
   */
  _generateReportId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Check if running in development mode
   * @returns {boolean} True if in development mode
   */
  _isDevMode() {
    return typeof window !== 'undefined' && 
           (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('github.io'));
  }

  /**
   * Log debug event with appropriate formatting
   * @param {string} eventType - Type of debug event
   * @param {Object} data - Event data
   */
  _logDebugEvent(eventType, data) {
    if (!this.config.enableDebugMode || this.config.logLevel === 'none') return;

    const logData = {
      event: eventType,
      timestamp: new Date().toISOString(),
      ...data
    };

    // Remove sensitive data
    delete logData.stackTrace;

    switch (eventType) {
      case 'missing_key':
        console.warn(`[TranslationDebug] Missing key: ${data.language}.${data.key}`, {
          fallback: data.fallbackUsed,
          reportId: data.reportId
        });
        break;
      
      case 'slow_lookup':
        console.debug(`[TranslationDebug] Slow lookup: ${data.key} (${data.duration}ms)`, logData);
        break;
      
      default:
        console.debug(`[TranslationDebug] ${eventType}:`, logData);
    }
  }

  /**
   * Trigger real-time reporting (for development integration)
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  _triggerRealtimeReport(eventType, data) {
    // This could be extended to integrate with development tools
    // For now, just emit a custom event
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('translationDebugEvent', {
        detail: { eventType, data }
      }));
    }
  }

  /**
   * Clear debug history and reset metrics
   */
  clearDebugHistory() {
    this.keyLookupHistory = [];
    this.missingKeysReport.clear();
    this.performanceMetrics = {
      lookups: [],
      averageTime: 0,
      slowestLookups: [],
      keyUsageFrequency: new Map()
    };
    
    this.debugSession = {
      startTime: Date.now(),
      totalLookups: 0,
      errors: 0,
      warnings: 0
    };

    console.info('[TranslationDebugReporter] Debug history cleared');
  }

  /**
   * Get current debug session statistics
   * @returns {Object} Session statistics
   */
  getSessionStats() {
    return {
      ...this.debugSession,
      duration: Date.now() - this.debugSession.startTime,
      missingKeysCount: this.missingKeysReport.size,
      historySize: this.keyLookupHistory.length
    };
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranslationDebugReporter;
}

// Global window object for browser usage
if (typeof window !== 'undefined') {
  window.TranslationDebugReporter = TranslationDebugReporter;
}