/**
 * Phase 2 Optimizations Smoke Test Suite
 * Tests OPT-01 (MutationObserver optimization) and OPT-02 (Translation loading retry)
 */

const { expect } = require('chai');
const sinon = require('sinon');

describe('Phase 2 Optimizations Smoke Tests', function() {
  let sandbox;
  let globalFetchStub;

  before(function() {
    // Setup global fetch stub once
    if (!global.fetch) {
      global.fetch = sinon.stub();
      globalFetchStub = global.fetch;
    }
  });

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    
    // Reset global fetch stub
    if (globalFetchStub) {
      globalFetchStub.reset();
    }
  });

  afterEach(function() {
    sandbox.restore();
  });

  after(function() {
    // Cleanup global fetch stub
    if (globalFetchStub) {
      globalFetchStub.restore();
    }
  });

  describe('OPT-01: MutationObserver Performance Optimization', function() {
    let MutationObserverOptimizer;
    let optimizer;

    before(function() {
      // Load the module
      MutationObserverOptimizer = require('../../pwa-card-storage/src/core/mutation-observer-optimizer.js');
    });

    beforeEach(function() {
      optimizer = new MutationObserverOptimizer({
        debounceDelay: 50,
        throttleDelay: 25,
        maxBatchSize: 10
      });
    });

    afterEach(function() {
      if (optimizer) {
        optimizer.cleanup();
      }
    });

    it('should create MutationObserverOptimizer instance', function() {
      expect(optimizer).to.be.instanceOf(MutationObserverOptimizer);
      expect(optimizer.debounceDelay).to.equal(50);
      expect(optimizer.throttleDelay).to.equal(25);
      expect(optimizer.maxBatchSize).to.equal(10);
    });

    it('should create optimized observer with debouncing', function() {
      const mockCallback = sandbox.spy();
      const optimizedObserver = optimizer.createOptimizedObserver(mockCallback);

      expect(optimizedObserver).to.have.property('observer');
      expect(optimizedObserver).to.have.property('observerId');
      expect(optimizedObserver).to.have.property('observe');
      expect(optimizedObserver).to.have.property('disconnect');
      expect(optimizedObserver.observer).to.exist;
    });

    it('should apply debouncing to mutation callbacks', function(done) {
      const mockCallback = sandbox.spy();
      const optimizedObserver = optimizer.createOptimizedObserver(mockCallback);

      // Mock mutations
      const mockMutations = [
        { type: 'childList', target: global.document.body },
        { type: 'attributes', target: global.document.body }
      ];

      // Simulate mutation observer callback
      const observerId = optimizedObserver.observerId;
      optimizer.mutationQueue.set(observerId, mockMutations);
      
      // Trigger debounced callback
      optimizer.debounceCallback(observerId, mockCallback, optimizedObserver.observer);

      // Callback should not be called immediately due to debouncing
      expect(mockCallback.called).to.be.false;

      // Wait for debounce delay + processing time
      setTimeout(() => {
        done();
      }, 150);
    });

    it('should batch mutations to prevent overwhelming callbacks', function() {
      const mockCallback = sandbox.spy();
      const optimizedObserver = optimizer.createOptimizedObserver(mockCallback);

      // Create large number of mutations
      const largeMutationSet = Array.from({ length: 25 }, (_, i) => ({
        type: 'childList',
        target: document.body,
        addedNodes: [document.createElement('div')]
      }));

      // Process mutations
      const batches = optimizer.createMutationBatches(largeMutationSet);

      // Should create multiple batches due to maxBatchSize = 10
      expect(batches.length).to.be.greaterThan(1);
      expect(batches[0].length).to.equal(10);
      expect(batches[1].length).to.equal(10);
      expect(batches[2].length).to.equal(5);
    });

    it('should track performance metrics', function() {
      const metrics = optimizer.getPerformanceMetrics();

      expect(metrics).to.have.property('totalMutations');
      expect(metrics).to.have.property('processedBatches');
      expect(metrics).to.have.property('averageProcessingTime');
      expect(metrics).to.have.property('cpuEfficiency');
      expect(metrics).to.have.property('memoryUsage');
      expect(metrics.totalMutations).to.equal(0);
      expect(metrics.activeObservers).to.equal(0);
    });

    it('should cleanup resources properly', function() {
      const mockCallback = sandbox.spy();
      const optimizedObserver = optimizer.createOptimizedObserver(mockCallback);
      
      expect(optimizer.observers.size).to.equal(1);
      
      optimizedObserver.disconnect();
      
      expect(optimizer.observers.size).to.equal(0);
    });

    it('should configure optimization parameters', function() {
      optimizer.configure({
        debounceDelay: 200,
        throttleDelay: 100,
        maxBatchSize: 20
      });

      expect(optimizer.debounceDelay).to.equal(200);
      expect(optimizer.throttleDelay).to.equal(100);
      expect(optimizer.maxBatchSize).to.equal(20);
    });
  });

  describe('OPT-02: Translation Loading Retry Mechanism', function() {
    let TranslationLoaderWithRetry;
    let loader;
    let fetchStub;

    before(function() {
      // Load the module
      TranslationLoaderWithRetry = require('../../pwa-card-storage/src/core/translation-loader-with-retry.js');
    });

    beforeEach(function() {
      loader = new TranslationLoaderWithRetry({
        maxRetries: 2,
        baseDelay: 100,
        timeout: 1000,
        maxRequestsPerMinute: 5
      });

      // Use global fetch stub
      fetchStub = globalFetchStub || global.fetch;
    });

    afterEach(function() {
      if (loader) {
        loader.reset();
      }
    });

    it('should create TranslationLoaderWithRetry instance', function() {
      expect(loader).to.be.instanceOf(TranslationLoaderWithRetry);
      expect(loader.maxRetries).to.equal(2);
      expect(loader.baseDelay).to.equal(100);
      expect(loader.timeout).to.equal(1000);
      expect(loader.maxRequestsPerMinute).to.equal(5);
    });

    it('should successfully load translation on first attempt', async function() {
      const mockTranslation = {
        ariaLabels: { test: 'Test Label' },
        screenReaderTexts: { test: 'Test Text' }
      };

      fetchStub.resolves({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockTranslation)
      });

      const result = await loader.loadTranslationWithRetry('/test.json', 'en');

      expect(result).to.deep.equal(mockTranslation);
      expect(fetchStub.calledOnce).to.be.true;
      expect(loader.metrics.successfulRequests).to.equal(1);
      expect(loader.metrics.retriedRequests).to.equal(0);
    });

    it('should retry on failure and eventually succeed', async function() {
      this.timeout(5000);
      
      const mockTranslation = {
        ariaLabels: { test: 'Test Label' },
        screenReaderTexts: { test: 'Test Text' }
      };

      // First call fails, second succeeds
      fetchStub.onFirstCall().rejects(new Error('Network error'));
      fetchStub.onSecondCall().resolves({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockTranslation)
      });

      const result = await loader.loadTranslationWithRetry('/test-retry.json', 'en');

      expect(result).to.deep.equal(mockTranslation);
      expect(fetchStub.calledTwice).to.be.true;
      expect(loader.metrics.successfulRequests).to.be.greaterThan(0);
    });

    it('should return fallback translation after max retries', async function() {
      fetchStub.rejects(new Error('Persistent network error'));

      const result = await loader.loadTranslationWithRetry('/test.json', 'zh');

      expect(result).to.have.property('ariaLabels');
      expect(result).to.have.property('screenReaderTexts');
      expect(result.ariaLabels.systemNotifications).to.equal('系統通知');
      expect(loader.metrics.failedRequests).to.equal(1);
    });

    it('should implement exponential backoff with jitter', function() {
      const delay1 = loader.calculateDelay(1);
      const delay2 = loader.calculateDelay(2);
      const delay3 = loader.calculateDelay(3);

      expect(delay1).to.be.greaterThan(100);
      expect(delay2).to.be.greaterThan(delay1);
      expect(delay3).to.be.greaterThan(delay2);
      expect(delay3).to.be.lessThan(loader.maxDelay);
    });

    it('should enforce rate limiting', async function() {
      const url = '/test-rate-limit.json';

      // Make requests up to the limit
      for (let i = 0; i < loader.maxRequestsPerMinute; i++) {
        expect(loader.checkRateLimit(url)).to.be.true;
      }

      // Next request should be rate limited
      expect(loader.checkRateLimit(url)).to.be.false;
    });

    it('should cache successful translations', async function() {
      const mockTranslation = {
        ariaLabels: { test: 'Cached Label' },
        screenReaderTexts: { test: 'Cached Text' }
      };

      fetchStub.resolves({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockTranslation)
      });

      // First request
      const result1 = await loader.loadTranslationWithRetry('/cached-unique.json', 'en');
      expect(result1).to.deep.equal(mockTranslation);
      
      const initialCallCount = fetchStub.callCount;

      // Second request should use cache
      const result2 = await loader.loadTranslationWithRetry('/cached-unique.json', 'en');
      expect(result2).to.deep.equal(mockTranslation);
      expect(fetchStub.callCount).to.equal(initialCallCount); // No additional calls
      expect(loader.metrics.cacheHits).to.be.greaterThan(0);
    });

    it('should provide performance metrics', function() {
      const metrics = loader.getMetrics();

      expect(metrics).to.have.property('totalRequests');
      expect(metrics).to.have.property('successfulRequests');
      expect(metrics).to.have.property('failedRequests');
      expect(metrics).to.have.property('retriedRequests');
      expect(metrics).to.have.property('cacheHits');
      expect(metrics).to.have.property('rateLimitedRequests');
      expect(metrics).to.have.property('successRate');
      expect(metrics).to.have.property('cacheSize');
    });

    it('should configure loader parameters', function() {
      loader.configure({
        maxRetries: 5,
        baseDelay: 500,
        timeout: 3000,
        maxRequestsPerMinute: 20
      });

      expect(loader.maxRetries).to.equal(5);
      expect(loader.baseDelay).to.equal(500);
      expect(loader.timeout).to.equal(3000);
      expect(loader.maxRequestsPerMinute).to.equal(20);
    });
  });

  describe('Integration: UnifiedLanguageObserver with Optimizations', function() {
    let UnifiedLanguageObserver;
    let observer;

    before(function() {
      // Mock MutationObserverOptimizer for integration test
      global.MutationObserverOptimizer = require('../../pwa-card-storage/src/core/mutation-observer-optimizer.js');
      
      // Load UnifiedLanguageObserver
      UnifiedLanguageObserver = require('../../pwa-card-storage/src/core/unified-language-observer.js');
    });

    beforeEach(function() {
      observer = new UnifiedLanguageObserver();
    });

    afterEach(function() {
      if (observer) {
        observer.clearAllObservers();
      }
    });

    it('should initialize with MutationObserver optimizer', function() {
      expect(observer.mutationOptimizer).to.not.be.null;
      expect(observer.mutationOptimizer).to.be.instanceOf(global.MutationObserverOptimizer);
    });

    it('should create optimized MutationObserver', function() {
      const mockCallback = sandbox.spy();
      const optimizedObserver = observer.createOptimizedMutationObserver(mockCallback);

      expect(optimizedObserver).to.have.property('observer');
      expect(optimizedObserver).to.have.property('observe');
      expect(optimizedObserver).to.have.property('disconnect');
    });

    it('should include mutation observer metrics in status', function() {
      const status = observer.getObserverStatus();

      expect(status).to.have.property('mutationObserverMetrics');
      expect(status.mutationObserverMetrics).to.have.property('totalMutations');
      expect(status.mutationObserverMetrics).to.have.property('cpuEfficiency');
    });

    it('should cleanup mutation optimizer on clear', function() {
      const cleanupSpy = sandbox.spy(observer.mutationOptimizer, 'cleanup');
      
      observer.clearAllObservers();
      
      expect(cleanupSpy.calledOnce).to.be.true;
    });
  });

  describe('Integration: TranslationRegistry with Retry Loader', function() {
    let TranslationRegistry;
    let registry;
    let fetchStub;

    before(function() {
      // Mock TranslationLoaderWithRetry for integration test
      global.TranslationLoaderWithRetry = require('../../pwa-card-storage/src/core/translation-loader-with-retry.js');
      
      // Load TranslationRegistry
      TranslationRegistry = require('../../pwa-card-storage/src/core/translation-registry.js');
    });

    beforeEach(function() {
      registry = new TranslationRegistry();
      
      // Use global fetch stub
      fetchStub = globalFetchStub || global.fetch;
    });

    afterEach(function() {
      if (registry) {
        registry.clearCache();
      }
    });

    it('should use retry loader for external translations', async function() {
      const mockAccessibilityTranslation = {
        ariaLabels: { test: 'Test' },
        screenReaderTexts: { test: 'Test' }
      };

      fetchStub.resolves({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockAccessibilityTranslation)
      });

      const result = await registry.loadAccessibilityTranslations('en');

      expect(result).to.deep.equal(mockAccessibilityTranslation);
      expect(registry.retryLoader).to.not.be.undefined;
      expect(registry.retryLoader).to.be.instanceOf(global.TranslationLoaderWithRetry);
    });

    it('should handle retry loader failures gracefully', async function() {
      fetchStub.rejects(new Error('Network failure'));

      const result = await registry.loadAccessibilityTranslations('zh');

      // Should return fallback translation
      expect(result).to.have.property('ariaLabels');
      expect(result).to.have.property('screenReaderTexts');
      expect(result.ariaLabels.systemNotifications).to.equal('系統通知');
    });
  });
});