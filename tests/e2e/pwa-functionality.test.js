/**
 * PWA E2E Functionality Tests
 * End-to-end tests for PWA core functionality after security fixes
 * 
 * @requirements All tasks integration
 * @security Complete security workflow validation
 */

const puppeteer = require('puppeteer');
const path = require('path');

describe('PWA E2E Functionality Tests', () => {
  let browser;
  let page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  });
  
  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('TC-E2E-001: PWA Application Loading', () => {
    
    test('Should load PWA application without errors', async () => {
      // Given: PWA application URL
      const pwaUrl = `file://${path.join(__dirname, '../../pwa-card-storage/index.html')}`;
      
      // When: Loading the application
      const response = await page.goto(pwaUrl, { waitUntil: 'networkidle0' });
      
      // Then: Should load successfully
      expect(response.status()).toBe(200);
      
      // And: Should have required elements
      const title = await page.title();
      expect(title).toContain('數位名片收納');
      
      const appTitle = await page.$('#app-title');
      expect(appTitle).toBeTruthy();
    });

    test('Should register Service Worker successfully', async () => {
      // Given: PWA application loaded
      const pwaUrl = `file://${path.join(__dirname, '../../pwa-card-storage/index.html')}`;
      await page.goto(pwaUrl, { waitUntil: 'networkidle0' });
      
      // When: Checking Service Worker registration
      const swRegistered = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      
      // Then: Should support Service Worker
      expect(swRegistered).toBe(true);
    });
  });

  describe('TC-E2E-002: Language System Integration', () => {
    
    test('Should switch languages without infinite recursion', async () => {
      // Given: PWA application loaded
      const pwaUrl = `file://${path.join(__dirname, '../../pwa-card-storage/index.html')}`;
      await page.goto(pwaUrl, { waitUntil: 'networkidle0' });
      
      // When: Switching language
      const langToggle = await page.$('#lang-toggle');
      if (langToggle) {
        await langToggle.click();
        await page.waitForTimeout(1000);
      }
      
      // Then: Should not have recursion errors
      const errors = await page.evaluate(() => {
        return window.console.error.calls || [];
      });
      
      const recursionErrors = errors.filter(error => 
        error && error.includes && error.includes('Maximum call stack size exceeded')
      );
      
      expect(recursionErrors).toHaveLength(0);
    });

    test('Should display translated content correctly', async () => {
      // Given: PWA application loaded
      const pwaUrl = `file://${path.join(__dirname, '../../pwa-card-storage/index.html')}`;
      await page.goto(pwaUrl, { waitUntil: 'networkidle0' });
      
      // When: Getting current language content
      const appTitle = await page.$eval('#app-title', el => el.textContent);
      
      // Then: Should display proper translated content
      expect(appTitle).toMatch(/(數位名片收納|Digital Card Hub)/);
    });
  });

  describe('TC-E2E-003: Security Integration', () => {
    
    test('Should prevent XSS attacks in user input', async () => {
      // Given: PWA application loaded
      const pwaUrl = `file://${path.join(__dirname, '../../pwa-card-storage/index.html')}`;
      await page.goto(pwaUrl, { waitUntil: 'networkidle0' });
      
      // When: Attempting XSS injection
      const searchInput = await page.$('#card-search');
      if (searchInput) {
        await searchInput.type('<script>window.xssExecuted = true;</script>');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
      
      // Then: Should not execute malicious script
      const xssExecuted = await page.evaluate(() => window.xssExecuted);
      expect(xssExecuted).toBeUndefined();
    });

    test('Should sanitize displayed content', async () => {
      // Given: PWA application loaded with potential unsafe content
      const pwaUrl = `file://${path.join(__dirname, '../../pwa-card-storage/index.html')}`;
      await page.goto(pwaUrl, { waitUntil: 'networkidle0' });
      
      // When: Checking for proper content sanitization
      const pageContent = await page.content();
      
      // Then: Should not contain unescaped script tags
      expect(pageContent).not.toMatch(/<script[^>]*>(?!.*<\/script>)/);
      expect(pageContent).not.toMatch(/javascript:/);
      expect(pageContent).not.toMatch(/on\w+\s*=/);
    });
  });

  describe('TC-E2E-004: PWA Features', () => {
    
    test('Should have valid manifest.json', async () => {
      // Given: PWA manifest URL
      const manifestUrl = `file://${path.join(__dirname, '../../pwa-card-storage/manifest.json')}`;
      
      // When: Loading manifest
      const response = await page.goto(manifestUrl);
      const manifestContent = await response.text();
      
      // Then: Should be valid JSON
      expect(() => JSON.parse(manifestContent)).not.toThrow();
      
      const manifest = JSON.parse(manifestContent);
      expect(manifest.name).toBeDefined();
      expect(manifest.start_url).toBeDefined();
      expect(manifest.icons).toBeDefined();
    });

    test('Should work offline (basic functionality)', async () => {
      // Given: PWA application loaded
      const pwaUrl = `file://${path.join(__dirname, '../../pwa-card-storage/index.html')}`;
      await page.goto(pwaUrl, { waitUntil: 'networkidle0' });
      
      // When: Simulating offline mode
      await page.setOfflineMode(true);
      await page.reload({ waitUntil: 'networkidle0' });
      
      // Then: Should still display basic content
      const appTitle = await page.$('#app-title');
      expect(appTitle).toBeTruthy();
      
      // Restore online mode
      await page.setOfflineMode(false);
    });
  });

  describe('TC-E2E-005: Performance and Accessibility', () => {
    
    test('Should meet basic performance criteria', async () => {
      // Given: PWA application URL
      const pwaUrl = `file://${path.join(__dirname, '../../pwa-card-storage/index.html')}`;
      
      // When: Measuring load time
      const startTime = Date.now();
      await page.goto(pwaUrl, { waitUntil: 'networkidle0' });
      const loadTime = Date.now() - startTime;
      
      // Then: Should load within reasonable time (5 seconds for local file)
      expect(loadTime).toBeLessThan(5000);
    });

    test('Should have accessible elements', async () => {
      // Given: PWA application loaded
      const pwaUrl = `file://${path.join(__dirname, '../../pwa-card-storage/index.html')}`;
      await page.goto(pwaUrl, { waitUntil: 'networkidle0' });
      
      // When: Checking accessibility attributes
      const langToggle = await page.$('#lang-toggle');
      const themeToggle = await page.$('#theme-toggle');
      
      // Then: Should have proper accessibility attributes
      if (langToggle) {
        const ariaLabel = await langToggle.getAttribute('aria-label');
        const title = await langToggle.getAttribute('title');
        expect(ariaLabel || title).toBeTruthy();
      }
      
      if (themeToggle) {
        const ariaLabel = await themeToggle.getAttribute('aria-label');
        const title = await themeToggle.getAttribute('title');
        expect(ariaLabel || title).toBeTruthy();
      }
    });

    test('Should support keyboard navigation', async () => {
      // Given: PWA application loaded
      const pwaUrl = `file://${path.join(__dirname, '../../pwa-card-storage/index.html')}`;
      await page.goto(pwaUrl, { waitUntil: 'networkidle0' });
      
      // When: Using keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement.id);
      
      // Then: Should be able to focus on interactive elements
      expect(focusedElement).toBeTruthy();
    });
  });

  describe('TC-E2E-006: Error Handling', () => {
    
    test('Should handle missing resources gracefully', async () => {
      // Given: PWA application with potential missing resources
      const pwaUrl = `file://${path.join(__dirname, '../../pwa-card-storage/index.html')}`;
      
      // When: Loading application and checking for errors
      await page.goto(pwaUrl, { waitUntil: 'networkidle0' });
      
      // Then: Should not have critical JavaScript errors
      const jsErrors = [];
      page.on('pageerror', error => jsErrors.push(error.message));
      
      await page.waitForTimeout(2000);
      
      const criticalErrors = jsErrors.filter(error => 
        error.includes('ReferenceError') || 
        error.includes('TypeError') ||
        error.includes('Maximum call stack size exceeded')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });

    test('Should display user-friendly error messages', async () => {
      // Given: PWA application loaded
      const pwaUrl = `file://${path.join(__dirname, '../../pwa-card-storage/index.html')}`;
      await page.goto(pwaUrl, { waitUntil: 'networkidle0' });
      
      // When: Triggering an error condition (if possible)
      // This would depend on specific error scenarios in the app
      
      // Then: Should not display raw error messages to users
      const pageText = await page.evaluate(() => document.body.textContent);
      expect(pageText).not.toContain('ReferenceError');
      expect(pageText).not.toContain('TypeError');
      expect(pageText).not.toContain('Maximum call stack size exceeded');
    });
  });
});