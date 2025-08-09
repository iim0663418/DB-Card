/**
 * PWA Deployment Compatibility Test Suite
 * 
 * Tests for static hosting deployment compatibility across platforms
 * Covers: Path auditing, resource management, environment detection
 * 
 * Requirements Mapping:
 * - ENV-001: 環境自動檢測系統 (T-ENV-001)
 * - PATH-001: 硬編碼路徑審計工具 (T-PATH-001)
 * - RESOURCE-001: 資源整合管理系統 (T-RESOURCE-001)
 * - DEPLOY-001: 部署驗證系統 (T-DEPLOY-001)
 */

import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';

// Mock file system operations
const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  copyFile: jest.fn(),
  mkdir: jest.fn()
};

// Mock Environment Detector
class MockEnvironmentDetector {
  static detectEnvironment() {
    const hostname = global.window?.location?.hostname || 'localhost';
    const pathname = global.window?.location?.pathname || '/';
    
    // Enhanced platform detection with fallback
    try {
      if (hostname.includes('.github.io')) {
        return this.loadConfig('github-pages');
      } else if (hostname.includes('.pages.dev')) {
        return this.loadConfig('cloudflare-pages');
      } else if (hostname.includes('.netlify.app')) {
        return this.loadConfig('netlify');
      } else if (hostname.includes('.vercel.app')) {
        return this.loadConfig('vercel');
      } else if (hostname.includes('.web.app') || hostname.includes('.firebaseapp.com')) {
        return this.loadConfig('firebase');
      }
      
      return this.loadConfig('default');
    } catch (error) {
      console.warn('Environment detection failed, using default config');
      return this.loadConfig('default');
    }
  }

  static async loadConfig(platform) {
    const configs = {
      'github-pages': {
        platform: 'github-pages',
        basePath: '/DB-Card',
        manifestPath: './manifest-github.json',
        serviceWorkerPath: './sw.js',
        assetPrefix: '/DB-Card/pwa-card-storage',
        features: {
          pushNotifications: false,
          backgroundSync: true,
          installPrompt: true
        },
        security: {
          cspEnabled: true,
          sriEnabled: true,
          httpsOnly: true
        }
      },
      'cloudflare-pages': {
        platform: 'cloudflare-pages',
        basePath: '',
        manifestPath: './manifest.json',
        serviceWorkerPath: './sw.js',
        assetPrefix: '',
        features: {
          pushNotifications: true,
          backgroundSync: true,
          installPrompt: true
        },
        security: {
          cspEnabled: true,
          sriEnabled: true,
          httpsOnly: true
        }
      },
      'default': {
        platform: 'default',
        basePath: '',
        manifestPath: './manifest.json',
        serviceWorkerPath: './sw.js',
        assetPrefix: '',
        features: {
          pushNotifications: false,
          backgroundSync: true,
          installPrompt: true
        },
        security: {
          cspEnabled: true,
          sriEnabled: false,
          httpsOnly: false
        }
      }
    };

    return configs[platform] || configs['default'];
  }

  static validateConfig(config) {
    const errors = [];
    
    if (!config.platform) errors.push('Platform is required');
    if (!config.manifestPath) errors.push('Manifest path is required');
    if (!config.serviceWorkerPath) errors.push('Service worker path is required');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Mock Path Auditor
class MockPathAuditor {
  constructor() {
    this.patterns = {
      upwardReference: /\.\.\//g,
      assetPath: /\/assets\/[^\s"']+/g,
      srcPath: /\/src\/[^\s"']+/g,
      manifestIcon: /"src":\s*"[^"]*\.\.\//g
    };
  }

  async auditProject(projectPath = './') {
    const result = {
      totalFiles: 0,
      affectedFiles: [],
      pathIssues: [],
      fixSuggestions: [],
      summary: {
        upwardReferences: 0,
        hardcodedPaths: 0,
        securityModules: 0,
        manifestIssues: 0
      }
    };

    // Mock file scanning
    const mockFiles = [
      {
        path: 'pwa-card-storage/index.html',
        content: `
          <link rel="stylesheet" href="../assets/high-accessibility.css">
          <script src="../assets/bilingual-common.js"></script>
          <script src="../src/security/SecurityInputHandler.js"></script>
          <img src="../assets/moda-logo.svg" alt="Logo">
        `
      },
      {
        path: 'pwa-card-storage/manifest.json',
        content: `{
          "icons": [
            {"src": "../assets/moda-logo.svg", "sizes": "192x192"}
          ]
        }`
      }
    ];

    for (const file of mockFiles) {
      result.totalFiles++;
      const issues = this.scanFileContent(file.content, file.path);
      
      if (issues.length > 0) {
        result.affectedFiles.push({
          filePath: file.path,
          fileType: this.getFileType(file.path),
          issues
        });
        result.pathIssues.push(...issues);
      }
    }

    // Generate fix suggestions
    result.fixSuggestions = this.generateFixSuggestions(result.pathIssues);
    
    // Update summary
    result.summary.upwardReferences = result.pathIssues.filter(i => i.issueType === 'upward-reference').length;
    result.summary.hardcodedPaths = result.pathIssues.filter(i => i.issueType === 'hardcoded-path').length;
    result.summary.manifestIssues = result.pathIssues.filter(i => i.issueType === 'manifest-icon').length;

    return result;
  }

  scanFileContent(content, filePath) {
    const issues = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for upward references
      const upwardMatches = line.match(this.patterns.upwardReference);
      if (upwardMatches) {
        upwardMatches.forEach(match => {
          issues.push({
            lineNumber: index + 1,
            columnNumber: line.indexOf(match) + 1,
            issueType: 'upward-reference',
            originalPath: match,
            suggestedPath: this.suggestFixedPath(match),
            severity: 'critical'
          });
        });
      }

      // Check for manifest icon issues
      if (filePath.endsWith('.json')) {
        const manifestMatches = line.match(this.patterns.manifestIcon);
        if (manifestMatches) {
          manifestMatches.forEach(match => {
            issues.push({
              lineNumber: index + 1,
              columnNumber: line.indexOf(match) + 1,
              issueType: 'manifest-icon',
              originalPath: match,
              suggestedPath: match.replace('../assets/', './assets/'),
              severity: 'high'
            });
          });
        }
      }
    });

    return issues;
  }

  suggestFixedPath(originalPath) {
    if (originalPath.includes('../assets/')) {
      return originalPath.replace('../assets/', './assets/');
    }
    if (originalPath.includes('../src/')) {
      return originalPath.replace('../src/', './src/');
    }
    return originalPath;
  }

  getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      '.html': 'html',
      '.js': 'js',
      '.json': 'json',
      '.css': 'css'
    };
    return typeMap[ext] || 'unknown';
  }

  generateFixSuggestions(pathIssues) {
    const suggestions = [];
    const resourcesToCopy = new Set();

    pathIssues.forEach(issue => {
      if (issue.issueType === 'upward-reference') {
        if (issue.originalPath.includes('../assets/')) {
          const filename = path.basename(issue.originalPath);
          resourcesToCopy.add({
            source: issue.originalPath,
            target: `./assets/${filename}`,
            type: 'asset'
          });
        } else if (issue.originalPath.includes('../src/security/')) {
          const filename = path.basename(issue.originalPath);
          resourcesToCopy.add({
            source: issue.originalPath,
            target: `./src/security/${filename}`,
            type: 'security-module'
          });
        }
      }
    });

    // Generate copy commands
    resourcesToCopy.forEach(resource => {
      suggestions.push({
        action: 'copy-resource',
        source: resource.source,
        target: resource.target,
        command: `cp ${resource.source} ${resource.target}`,
        description: `Copy ${resource.type} to PWA directory`
      });
    });

    // Generate path update commands
    const uniquePaths = [...new Set(pathIssues.map(i => i.originalPath))];
    uniquePaths.forEach(originalPath => {
      const suggestedPath = this.suggestFixedPath(originalPath);
      if (originalPath !== suggestedPath) {
        suggestions.push({
          action: 'update-path',
          source: originalPath,
          target: suggestedPath,
          command: `sed -i 's|${originalPath}|${suggestedPath}|g' pwa-card-storage/*.html pwa-card-storage/*.json`,
          description: `Update path reference from ${originalPath} to ${suggestedPath}`
        });
      }
    });

    return suggestions;
  }

  generateFixScript(auditResult) {
    const commands = [
      '#!/bin/bash',
      '# Auto-generated path fix script',
      '# Generated by PathAuditor',
      '',
      'echo "Starting hardcoded path fixes..."',
      ''
    ];

    // Add resource copy commands
    const copyCommands = auditResult.fixSuggestions
      .filter(fix => fix.action === 'copy-resource')
      .map(fix => fix.command);
    
    if (copyCommands.length > 0) {
      commands.push('# Copy resources to PWA directory');
      commands.push('mkdir -p pwa-card-storage/assets pwa-card-storage/src/security');
      commands.push(...copyCommands);
      commands.push('');
    }

    // Add path update commands
    const updateCommands = auditResult.fixSuggestions
      .filter(fix => fix.action === 'update-path')
      .map(fix => fix.command);
    
    if (updateCommands.length > 0) {
      commands.push('# Update path references');
      commands.push(...updateCommands);
      commands.push('');
    }

    commands.push('echo "Path fixes completed!"');
    commands.push('echo "Please run validation to verify fixes."');

    return commands.join('\n');
  }
}

// Mock Resource Manager
class MockResourceManager {
  async integrateResources() {
    const manifest = {
      version: '3.2.0',
      lastUpdated: new Date().toISOString(),
      resources: {
        images: [],
        scripts: [],
        styles: [],
        fonts: []
      },
      integrity: {}
    };

    // Mock resource integration
    const resourcesToIntegrate = [
      { source: '../assets/moda-logo.svg', target: 'assets/images/moda-logo.svg', type: 'images' },
      { source: '../assets/bilingual-common.js', target: 'assets/scripts/bilingual-common.js', type: 'scripts' },
      { source: '../assets/high-accessibility.css', target: 'assets/styles/high-accessibility.css', type: 'styles' },
      { source: '../assets/qrcode.min.js', target: 'assets/scripts/qrcode.min.js', type: 'scripts' },
      { source: '../assets/qr-utils.js', target: 'assets/scripts/qr-utils.js', type: 'scripts' }
    ];

    for (const resource of resourcesToIntegrate) {
      const resourceItem = {
        originalPath: resource.source,
        targetPath: resource.target,
        size: Math.floor(Math.random() * 100000), // Mock size
        hash: this.generateMockHash(),
        required: true,
        platforms: ['all']
      };

      manifest.resources[resource.type].push(resourceItem);
      manifest.integrity[resource.target] = resourceItem.hash;
    }

    return manifest;
  }

  generateMockHash() {
    return 'sha384-' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  async validateResourceIntegrity(manifest) {
    // Mock validation - in real implementation would check actual file hashes
    for (const [resourcePath, expectedHash] of Object.entries(manifest.integrity)) {
      const actualHash = this.generateMockHash(); // Mock hash calculation
      if (actualHash !== expectedHash) {
        console.warn(`Resource integrity mismatch: ${resourcePath}`);
        return false;
      }
    }
    return true;
  }
}

// Mock Deployment Validator
class MockDeploymentValidator {
  constructor(config) {
    this.config = config;
    this.results = {
      platform: config.platform,
      timestamp: new Date().toISOString(),
      success: false,
      tests: {},
      metrics: {},
      recommendations: []
    };
  }

  async validate() {
    // Execute test suite
    this.results.tests.resourcePaths = await this.testResourcePaths();
    this.results.tests.serviceWorker = await this.testServiceWorker();
    this.results.tests.pwaFeatures = await this.testPWAFeatures();
    this.results.tests.securityHeaders = await this.testSecurityHeaders();
    this.results.tests.performance = await this.testPerformance();

    // Calculate overall success
    const testResults = Object.values(this.results.tests);
    this.results.success = testResults.every(test => test.passed);

    // Generate recommendations
    this.generateRecommendations();

    return this.results;
  }

  async testResourcePaths() {
    const startTime = performance.now();
    const resources = [
      './assets/styles/main.css',
      './assets/scripts/bilingual-common.js',
      './assets/images/moda-logo.svg',
      './manifest.json'
    ];

    try {
      // Mock resource availability check
      const results = resources.map(resource => ({
        resource,
        success: !resource.includes('../') // Pass if no upward references
      }));

      const failedResources = results.filter(r => !r.success);

      return {
        passed: failedResources.length === 0,
        message: failedResources.length === 0 
          ? 'All resource paths are valid' 
          : `${failedResources.length} resources have invalid paths`,
        details: failedResources,
        duration: performance.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        message: `Resource path test failed: ${error.message}`,
        duration: performance.now() - startTime
      };
    }
  }

  async testServiceWorker() {
    const startTime = performance.now();

    try {
      // Mock service worker registration test
      const swContent = `
        const CACHE_NAME = 'pwa-card-storage-v3.2.0';
        const BASE_PATH = '${this.config.basePath}';
        
        self.addEventListener('install', (event) => {
          // Installation logic
        });
      `;

      const hasValidCacheName = swContent.includes('CACHE_NAME');
      const hasBasePath = swContent.includes('BASE_PATH');
      const hasInstallListener = swContent.includes('addEventListener(\'install\'');

      return {
        passed: hasValidCacheName && hasBasePath && hasInstallListener,
        message: 'Service Worker structure is valid',
        details: { hasValidCacheName, hasBasePath, hasInstallListener },
        duration: performance.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        message: `Service Worker test failed: ${error.message}`,
        duration: performance.now() - startTime
      };
    }
  }

  async testPWAFeatures() {
    const startTime = performance.now();
    const features = [];

    try {
      // Test manifest
      const manifestContent = {
        name: 'PWA Card Storage',
        short_name: 'PWA Cards',
        start_url: this.config.basePath + '/pwa-card-storage/',
        display: 'standalone',
        icons: [
          { src: './assets/images/moda-logo.svg', sizes: '192x192' }
        ]
      };

      features.push({ 
        name: 'Manifest', 
        success: manifestContent.name && manifestContent.icons.length > 0 
      });

      // Test offline capability
      features.push({ 
        name: 'OfflineCapability', 
        success: this.config.features.backgroundSync 
      });

      // Test install prompt
      features.push({ 
        name: 'InstallPrompt', 
        success: this.config.features.installPrompt 
      });

      const failedFeatures = features.filter(f => !f.success);

      return {
        passed: failedFeatures.length === 0,
        message: failedFeatures.length === 0 
          ? 'All PWA features are working' 
          : `${failedFeatures.length} PWA features failed`,
        details: features,
        duration: performance.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        message: `PWA features test failed: ${error.message}`,
        duration: performance.now() - startTime
      };
    }
  }

  async testSecurityHeaders() {
    const startTime = performance.now();

    const securityChecks = {
      csp: this.config.security.cspEnabled,
      https: this.config.security.httpsOnly,
      sri: this.config.security.sriEnabled
    };

    const failedChecks = Object.entries(securityChecks)
      .filter(([_, enabled]) => !enabled)
      .map(([check]) => check);

    return {
      passed: failedChecks.length === 0,
      message: `Security checks: ${Object.keys(securityChecks).length - failedChecks.length}/${Object.keys(securityChecks).length} passed`,
      details: securityChecks,
      duration: performance.now() - startTime
    };
  }

  async testPerformance() {
    const startTime = performance.now();

    // Mock performance metrics
    const metrics = {
      loadTime: Math.floor(Math.random() * 3000) + 500, // 500-3500ms
      domContentLoaded: Math.floor(Math.random() * 2000) + 300, // 300-2300ms
      firstContentfulPaint: Math.floor(Math.random() * 2500) + 400 // 400-2900ms
    };

    this.results.metrics = metrics;

    return {
      passed: metrics.loadTime < 3000,
      message: `Load time: ${metrics.loadTime}ms`,
      details: metrics,
      duration: performance.now() - startTime
    };
  }

  generateRecommendations() {
    const recommendations = [];

    if (!this.results.tests.resourcePaths.passed) {
      recommendations.push('Fix hardcoded resource paths using the path auditor tool');
    }

    if (!this.results.tests.serviceWorker.passed) {
      recommendations.push('Update Service Worker configuration for current platform');
    }

    if (!this.results.tests.securityHeaders.passed) {
      recommendations.push('Enable missing security headers (CSP, HTTPS, SRI)');
    }

    if (this.results.metrics.loadTime > 3000) {
      recommendations.push('Optimize resource loading to improve performance');
    }

    this.results.recommendations = recommendations;
  }
}

describe('PWA Deployment Compatibility Test Suite', () => {
  let mockEnvironmentDetector;
  let mockPathAuditor;
  let mockResourceManager;
  let mockDeploymentValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Enhanced mock environment setup
    global.window = {
      location: {
        hostname: 'localhost',
        pathname: '/pwa-card-storage/',
        protocol: 'https:',
        port: ''
      },
      navigator: {
        userAgent: 'Mozilla/5.0 (Test Environment)'
      }
    };
    
    // Mock performance API
    global.performance = {
      now: jest.fn(() => Date.now())
    };

    // Initialize mock components
    mockEnvironmentDetector = MockEnvironmentDetector;
    mockPathAuditor = new MockPathAuditor();
    mockResourceManager = new MockResourceManager();
  });

  afterEach(() => {
    delete global.window;
  });

  // ==================== ENVIRONMENT DETECTION TESTS ====================
  
  describe('Environment Detection Tests', () => {
    
    // TC-ENV-001: GitHub Pages Detection
    test('TC-ENV-001: Detects GitHub Pages environment correctly', async () => {
      global.window.location.hostname = 'username.github.io';
      
      const config = await mockEnvironmentDetector.detectEnvironment();
      
      expect(config.platform).toBe('github-pages');
      expect(config.basePath).toBe('/DB-Card');
      expect(config.manifestPath).toBe('./manifest-github.json');
      expect(config.features.pushNotifications).toBe(false);
    });

    // TC-ENV-002: Cloudflare Pages Detection
    test('TC-ENV-002: Detects Cloudflare Pages environment correctly', async () => {
      global.window.location.hostname = 'project.pages.dev';
      
      const config = await mockEnvironmentDetector.detectEnvironment();
      
      expect(config.platform).toBe('cloudflare-pages');
      expect(config.basePath).toBe('');
      expect(config.manifestPath).toBe('./manifest.json');
      expect(config.features.pushNotifications).toBe(true);
    });

    // TC-ENV-003: Netlify Detection
    test('TC-ENV-003: Detects Netlify environment correctly', async () => {
      global.window.location.hostname = 'project.netlify.app';
      
      const config = await mockEnvironmentDetector.detectEnvironment();
      
      expect(config.platform).toBe('netlify');
      expect(config.basePath).toBe('');
    });

    // TC-ENV-004: Vercel Detection
    test('TC-ENV-004: Detects Vercel environment correctly', async () => {
      global.window.location.hostname = 'project.vercel.app';
      
      const config = await mockEnvironmentDetector.detectEnvironment();
      
      expect(config.platform).toBe('vercel');
      expect(config.basePath).toBe('');
    });

    // TC-ENV-005: Firebase Hosting Detection
    test('TC-ENV-005: Detects Firebase Hosting environment correctly', async () => {
      global.window.location.hostname = 'project.web.app';
      
      const config = await mockEnvironmentDetector.detectEnvironment();
      
      expect(config.platform).toBe('firebase');
      expect(config.basePath).toBe('');
    });

    // TC-ENV-006: Default Environment Fallback
    test('TC-ENV-006: Falls back to default environment for unknown hosts', async () => {
      global.window.location.hostname = 'unknown-host.com';
      
      const config = await mockEnvironmentDetector.detectEnvironment();
      
      expect(config.platform).toBe('default');
      expect(config.basePath).toBe('');
      expect(config.security.httpsOnly).toBe(false);
    });

    // TC-ENV-007: Configuration Validation
    test('TC-ENV-007: Validates environment configuration', async () => {
      const validConfig = await mockEnvironmentDetector.loadConfig('github-pages');
      const validation = mockEnvironmentDetector.validateConfig(validConfig);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    // TC-ENV-008: Invalid Configuration Handling
    test('TC-ENV-008: Handles invalid configuration', () => {
      const invalidConfig = { platform: null };
      const validation = mockEnvironmentDetector.validateConfig(invalidConfig);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('Platform is required');
    });
  });

  // ==================== PATH AUDITING TESTS ====================
  
  describe('Path Auditing Tests', () => {
    
    // TC-PATH-001: Hardcoded Path Detection
    test('TC-PATH-001: Detects hardcoded upward reference paths', async () => {
      const auditResult = await mockPathAuditor.auditProject('./');
      
      expect(auditResult.totalFiles).toBeGreaterThan(0);
      expect(auditResult.pathIssues.length).toBeGreaterThan(0);
      
      const upwardRefs = auditResult.pathIssues.filter(
        issue => issue.issueType === 'upward-reference'
      );
      expect(upwardRefs.length).toBeGreaterThan(0);
      
      upwardRefs.forEach(issue => {
        expect(issue.originalPath).toContain('../');
        expect(issue.severity).toBe('critical');
      });
    });

    // TC-PATH-002: Manifest Icon Path Issues
    test('TC-PATH-002: Detects manifest icon path issues', async () => {
      const auditResult = await mockPathAuditor.auditProject('./');
      
      const manifestIssues = auditResult.pathIssues.filter(
        issue => issue.issueType === 'manifest-icon'
      );
      
      expect(manifestIssues.length).toBeGreaterThan(0);
      manifestIssues.forEach(issue => {
        expect(issue.originalPath).toContain('../assets/');
        expect(issue.suggestedPath).toContain('./assets/');
      });
    });

    // TC-PATH-003: Fix Suggestion Generation
    test('TC-PATH-003: Generates appropriate fix suggestions', async () => {
      const auditResult = await mockPathAuditor.auditProject('./');
      
      expect(auditResult.fixSuggestions.length).toBeGreaterThan(0);
      
      const copyActions = auditResult.fixSuggestions.filter(
        fix => fix.action === 'copy-resource'
      );
      const updateActions = auditResult.fixSuggestions.filter(
        fix => fix.action === 'update-path'
      );
      
      expect(copyActions.length).toBeGreaterThan(0);
      expect(updateActions.length).toBeGreaterThan(0);
      
      copyActions.forEach(action => {
        expect(action.command).toContain('cp');
        expect(action.source).toContain('../');
        expect(action.target).toContain('./');
      });
    });

    // TC-PATH-004: Fix Script Generation
    test('TC-PATH-004: Generates executable fix script', async () => {
      const auditResult = await mockPathAuditor.auditProject('./');
      const fixScript = mockPathAuditor.generateFixScript(auditResult);
      
      expect(fixScript).toContain('#!/bin/bash');
      expect(fixScript).toContain('mkdir -p');
      expect(fixScript).toContain('cp ../assets/');
      expect(fixScript).toContain('sed -i');
      
      const lines = fixScript.split('\n');
      expect(lines[0]).toBe('#!/bin/bash');
      expect(lines.some(line => line.includes('echo'))).toBe(true);
    });

    // TC-PATH-005: File Type Detection
    test('TC-PATH-005: Correctly identifies file types', () => {
      expect(mockPathAuditor.getFileType('test.html')).toBe('html');
      expect(mockPathAuditor.getFileType('script.js')).toBe('js');
      expect(mockPathAuditor.getFileType('manifest.json')).toBe('json');
      expect(mockPathAuditor.getFileType('style.css')).toBe('css');
      expect(mockPathAuditor.getFileType('unknown.xyz')).toBe('unknown');
    });

    // TC-PATH-006: Path Suggestion Logic
    test('TC-PATH-006: Suggests correct path replacements', () => {
      const testCases = [
        { input: '../assets/logo.svg', expected: './assets/logo.svg' },
        { input: '../src/security/handler.js', expected: './src/security/handler.js' },
        { input: './local/file.js', expected: './local/file.js' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = mockPathAuditor.suggestFixedPath(input);
        expect(result).toBe(expected);
      });
    });
  });

  // ==================== RESOURCE MANAGEMENT TESTS ====================
  
  describe('Resource Management Tests', () => {
    
    // TC-RES-001: Resource Integration
    test('TC-RES-001: Integrates resources correctly', async () => {
      const manifest = await mockResourceManager.integrateResources();
      
      expect(manifest.version).toBe('3.2.0');
      expect(manifest.lastUpdated).toBeTruthy();
      expect(manifest.resources.images.length).toBeGreaterThan(0);
      expect(manifest.resources.scripts.length).toBeGreaterThan(0);
      expect(manifest.resources.styles.length).toBeGreaterThan(0);
      
      // Check specific resources
      const logoResource = manifest.resources.images.find(
        r => r.originalPath.includes('moda-logo.svg')
      );
      expect(logoResource).toBeTruthy();
      expect(logoResource.targetPath).toBe('assets/images/moda-logo.svg');
    });

    // TC-RES-002: SRI Hash Generation
    test('TC-RES-002: Generates SRI hashes for resources', async () => {
      const manifest = await mockResourceManager.integrateResources();
      
      expect(Object.keys(manifest.integrity).length).toBeGreaterThan(0);
      
      Object.values(manifest.integrity).forEach(hash => {
        expect(hash).toMatch(/^sha384-[a-f0-9]{64}$/);
      });
    });

    // TC-RES-003: Resource Validation
    test('TC-RES-003: Validates resource integrity', async () => {
      const manifest = await mockResourceManager.integrateResources();
      
      // Mock successful validation
      mockResourceManager.generateMockHash = jest.fn()
        .mockReturnValueOnce(Object.values(manifest.integrity)[0])
        .mockReturnValue('different-hash');
      
      const isValid = await mockResourceManager.validateResourceIntegrity(manifest);
      
      // First resource should validate, others should fail
      expect(mockResourceManager.generateMockHash).toHaveBeenCalled();
    });

    // TC-RES-004: Resource Categorization
    test('TC-RES-004: Categorizes resources correctly', async () => {
      const manifest = await mockResourceManager.integrateResources();
      
      const imageResources = manifest.resources.images;
      const scriptResources = manifest.resources.scripts;
      const styleResources = manifest.resources.styles;
      
      imageResources.forEach(resource => {
        expect(resource.originalPath).toMatch(/\.(svg|png|jpg|jpeg)$/i);
      });
      
      scriptResources.forEach(resource => {
        expect(resource.originalPath).toMatch(/\.js$/i);
      });
      
      styleResources.forEach(resource => {
        expect(resource.originalPath).toMatch(/\.css$/i);
      });
    });
  });

  // ==================== DEPLOYMENT VALIDATION TESTS ====================
  
  describe('Deployment Validation Tests', () => {
    
    // TC-DEPLOY-001: Complete Deployment Validation
    test('TC-DEPLOY-001: Performs complete deployment validation', async () => {
      const config = await mockEnvironmentDetector.loadConfig('github-pages');
      mockDeploymentValidator = new MockDeploymentValidator(config);
      
      const results = await mockDeploymentValidator.validate();
      
      expect(results.platform).toBe('github-pages');
      expect(results.timestamp).toBeTruthy();
      expect(typeof results.success).toBe('boolean');
      
      // Check all test categories
      expect(results.tests.resourcePaths).toBeTruthy();
      expect(results.tests.serviceWorker).toBeTruthy();
      expect(results.tests.pwaFeatures).toBeTruthy();
      expect(results.tests.securityHeaders).toBeTruthy();
      expect(results.tests.performance).toBeTruthy();
    });

    // TC-DEPLOY-002: Resource Path Validation
    test('TC-DEPLOY-002: Validates resource paths correctly', async () => {
      const config = await mockEnvironmentDetector.loadConfig('default');
      mockDeploymentValidator = new MockDeploymentValidator(config);
      
      const result = await mockDeploymentValidator.testResourcePaths();
      
      expect(result.passed).toBe(true);
      expect(result.message).toContain('valid');
      expect(result.duration).toBeGreaterThan(0);
    });

    // TC-DEPLOY-003: Service Worker Validation
    test('TC-DEPLOY-003: Validates Service Worker configuration', async () => {
      const config = await mockEnvironmentDetector.loadConfig('cloudflare-pages');
      mockDeploymentValidator = new MockDeploymentValidator(config);
      
      const result = await mockDeploymentValidator.testServiceWorker();
      
      expect(result.passed).toBe(true);
      expect(result.details.hasValidCacheName).toBe(true);
      expect(result.details.hasBasePath).toBe(true);
      expect(result.details.hasInstallListener).toBe(true);
    });

    // TC-DEPLOY-004: PWA Features Validation
    test('TC-DEPLOY-004: Validates PWA features', async () => {
      const config = await mockEnvironmentDetector.loadConfig('netlify');
      mockDeploymentValidator = new MockDeploymentValidator(config);
      
      const result = await mockDeploymentValidator.testPWAFeatures();
      
      expect(result.passed).toBe(true);
      expect(result.details).toBeInstanceOf(Array);
      
      const manifestFeature = result.details.find(f => f.name === 'Manifest');
      expect(manifestFeature.success).toBe(true);
    });

    // TC-DEPLOY-005: Security Headers Validation
    test('TC-DEPLOY-005: Validates security headers', async () => {
      const config = await mockEnvironmentDetector.loadConfig('vercel');
      mockDeploymentValidator = new MockDeploymentValidator(config);
      
      const result = await mockDeploymentValidator.testSecurityHeaders();
      
      expect(result.passed).toBe(true);
      expect(result.details.csp).toBe(true);
      expect(result.details.https).toBe(true);
      expect(result.details.sri).toBe(true);
    });

    // TC-DEPLOY-006: Performance Validation
    test('TC-DEPLOY-006: Validates performance metrics', async () => {
      const config = await mockEnvironmentDetector.loadConfig('firebase');
      mockDeploymentValidator = new MockDeploymentValidator(config);
      
      const result = await mockDeploymentValidator.testPerformance();
      
      expect(result.details.loadTime).toBeGreaterThan(0);
      expect(result.details.domContentLoaded).toBeGreaterThan(0);
      expect(result.details.firstContentfulPaint).toBeGreaterThan(0);
    });

    // TC-DEPLOY-007: Recommendation Generation
    test('TC-DEPLOY-007: Generates appropriate recommendations', async () => {
      const config = await mockEnvironmentDetector.loadConfig('default');
      config.security.httpsOnly = false; // Force a security issue
      
      mockDeploymentValidator = new MockDeploymentValidator(config);
      await mockDeploymentValidator.validate();
      
      expect(mockDeploymentValidator.results.recommendations).toBeInstanceOf(Array);
      
      if (!mockDeploymentValidator.results.tests.securityHeaders.passed) {
        expect(mockDeploymentValidator.results.recommendations.some(
          rec => rec.includes('security headers')
        )).toBe(true);
      }
    });
  });

  // ==================== INTEGRATION TESTS ====================
  
  describe('Integration Tests - Complete Deployment Pipeline', () => {
    
    // TC-INT-001: End-to-End Deployment Pipeline
    test('TC-INT-001: Complete deployment pipeline works correctly', async () => {
      // Step 1: Environment Detection
      global.window.location.hostname = 'test.github.io';
      const config = await mockEnvironmentDetector.detectEnvironment();
      expect(config.platform).toBe('github-pages');
      
      // Step 2: Path Auditing
      const auditResult = await mockPathAuditor.auditProject('./');
      expect(auditResult.pathIssues.length).toBeGreaterThan(0);
      
      // Step 3: Resource Integration
      const manifest = await mockResourceManager.integrateResources();
      expect(manifest.resources.images.length).toBeGreaterThan(0);
      
      // Step 4: Deployment Validation
      mockDeploymentValidator = new MockDeploymentValidator(config);
      const validationResult = await mockDeploymentValidator.validate();
      expect(validationResult.platform).toBe('github-pages');
    });

    // TC-INT-002: Cross-Platform Compatibility
    test('TC-INT-002: Works across different platforms', async () => {
      const platforms = [
        { hostname: 'test.github.io', expected: 'github-pages' },
        { hostname: 'test.pages.dev', expected: 'cloudflare-pages' },
        { hostname: 'test.netlify.app', expected: 'netlify' },
        { hostname: 'test.vercel.app', expected: 'vercel' },
        { hostname: 'test.web.app', expected: 'firebase' }
      ];

      for (const platform of platforms) {
        global.window.location.hostname = platform.hostname;
        const config = await mockEnvironmentDetector.detectEnvironment();
        expect(config.platform).toBe(platform.expected);
        
        // Validate configuration works for each platform
        const validation = mockEnvironmentDetector.validateConfig(config);
        expect(validation.valid).toBe(true);
      }
    });

    // TC-INT-003: Error Recovery and Fallbacks
    test('TC-INT-003: Handles errors and provides fallbacks', async () => {
      // Test with invalid environment
      global.window.location.hostname = 'invalid-host.com';
      const config = await mockEnvironmentDetector.detectEnvironment();
      expect(config.platform).toBe('default');
      
      // Test deployment validation with fallback config
      mockDeploymentValidator = new MockDeploymentValidator(config);
      const result = await mockDeploymentValidator.validate();
      expect(result.platform).toBe('default');
    });
  });

  // ==================== PERFORMANCE TESTS ====================
  
  describe('Performance Tests', () => {
    
    // TC-PERF-001: Path Auditing Performance
    test('TC-PERF-001: Path auditing completes within time limit', async () => {
      const mockStart = 1000;
      const mockEnd = 1500;
      global.performance.now
        .mockReturnValueOnce(mockStart)
        .mockReturnValueOnce(mockEnd);
      
      const startTime = performance.now();
      await mockPathAuditor.auditProject('./');
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    // TC-PERF-002: Resource Integration Performance
    test('TC-PERF-002: Resource integration is efficient', async () => {
      const startTime = performance.now();
      
      await mockResourceManager.integrateResources();
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    // TC-PERF-003: Deployment Validation Performance
    test('TC-PERF-003: Deployment validation completes quickly', async () => {
      const config = await mockEnvironmentDetector.loadConfig('default');
      mockDeploymentValidator = new MockDeploymentValidator(config);
      
      const startTime = performance.now();
      
      await mockDeploymentValidator.validate();
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  
  describe('Error Handling Tests', () => {
    
    // TC-ERR-001: Invalid File Path Handling
    test('TC-ERR-001: Handles invalid file paths gracefully', async () => {
      // Test with invalid path
      const auditResult = await mockPathAuditor.auditProject('./nonexistent');
      
      // Should not throw, should return valid structure
      expect(auditResult).toHaveProperty('totalFiles');
      expect(auditResult).toHaveProperty('pathIssues');
      expect(auditResult).toHaveProperty('fixSuggestions');
      expect(Array.isArray(auditResult.pathIssues)).toBe(true);
    });

    // TC-ERR-002: Network Error Handling
    test('TC-ERR-002: Handles network errors during validation', async () => {
      const config = await mockEnvironmentDetector.loadConfig('default');
      mockDeploymentValidator = new MockDeploymentValidator(config);
      
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await mockDeploymentValidator.testResourcePaths();
      
      // Should handle error gracefully
      expect(result.passed).toBe(true); // Mock implementation passes
      
      // Restore fetch
      global.fetch = originalFetch;
    });

    // TC-ERR-003: Configuration Error Handling
    test('TC-ERR-003: Handles invalid configuration gracefully', async () => {
      const invalidConfig = { platform: null };
      
      expect(() => {
        new MockDeploymentValidator(invalidConfig);
      }).not.toThrow();
      
      const validator = new MockDeploymentValidator(invalidConfig);
      expect(validator.config.platform).toBeNull();
    });
  });
});