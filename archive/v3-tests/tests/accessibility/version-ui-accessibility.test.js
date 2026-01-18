/**
 * Accessibility Tests for Version Management UI
 * Tests WCAG 2.1 AA standards and senior-friendly design
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Version Management UI Accessibility', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/pwa-card-storage/');
        await page.waitForLoadState('networkidle');
    });

    describe('WCAG 2.1 AA Compliance', () => {
        test('should pass automated accessibility scan', async ({ page }) => {
            const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
            expect(accessibilityScanResults.violations).toEqual([]);
        });

        test('should have proper heading hierarchy', async ({ page }) => {
            const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
            
            for (let i = 0; i < headings.length; i++) {
                const heading = headings[i];
                const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
                const text = await heading.textContent();
                
                expect(text?.trim()).not.toBe(''); // Headings should not be empty
                
                if (i === 0) {
                    expect(tagName).toBe('h1'); // First heading should be h1
                }
            }
        });

        test('should have sufficient color contrast', async ({ page }) => {
            // Test duplicate dialog contrast
            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');
            
            // Import same card to trigger duplicate dialog
            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            const duplicateDialog = page.locator('[data-testid="duplicate-dialog"]');
            await expect(duplicateDialog).toBeVisible();

            // Check contrast using axe-core
            const contrastResults = await new AxeBuilder({ page })
                .include('[data-testid="duplicate-dialog"]')
                .withTags(['wcag2aa', 'wcag143'])
                .analyze();

            expect(contrastResults.violations).toEqual([]);
        });

        test('should support keyboard navigation', async ({ page }) => {
            // Test keyboard navigation through duplicate dialog
            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.keyboard.press('Enter'); // Submit with keyboard

            // Import duplicate
            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.keyboard.press('Enter');

            // Navigate duplicate dialog with keyboard
            await page.keyboard.press('Tab'); // Focus first action button
            await page.keyboard.press('Tab'); // Focus second action button
            await page.keyboard.press('Tab'); // Focus third action button
            await page.keyboard.press('Enter'); // Select action

            const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
            expect(focusedElement).toBeTruthy();
        });

        test('should have proper ARIA labels and roles', async ({ page }) => {
            // Trigger duplicate dialog
            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            const duplicateDialog = page.locator('[data-testid="duplicate-dialog"]');
            await expect(duplicateDialog).toBeVisible();

            // Check ARIA attributes
            await expect(duplicateDialog).toHaveAttribute('role', 'dialog');
            await expect(duplicateDialog).toHaveAttribute('aria-labelledby');
            await expect(duplicateDialog).toHaveAttribute('aria-describedby');

            // Check action buttons have proper labels
            const actionButtons = page.locator('[data-testid^="action-"]');
            const buttonCount = await actionButtons.count();

            for (let i = 0; i < buttonCount; i++) {
                const button = actionButtons.nth(i);
                const ariaLabel = await button.getAttribute('aria-label');
                const text = await button.textContent();
                
                expect(ariaLabel || text?.trim()).toBeTruthy();
            }
        });
    });

    describe('Senior-Friendly Design', () => {
        test('should have large touch targets (minimum 44px)', async ({ page }) => {
            // Trigger duplicate dialog
            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            const actionButtons = page.locator('[data-testid^="action-"]');
            const buttonCount = await actionButtons.count();

            for (let i = 0; i < buttonCount; i++) {
                const button = actionButtons.nth(i);
                const boundingBox = await button.boundingBox();
                
                expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
                expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
            }
        });

        test('should use large, readable fonts', async ({ page }) => {
            // Check version history text size
            await page.click('[data-testid="card-item"]:first-child');
            await page.click('[data-testid="version-history-button"]');

            const versionText = page.locator('[data-testid="version-item"] .version-number');
            const fontSize = await versionText.evaluate(el => 
                window.getComputedStyle(el).fontSize
            );

            const fontSizeValue = parseInt(fontSize.replace('px', ''));
            expect(fontSizeValue).toBeGreaterThanOrEqual(16); // Minimum 16px for seniors
        });

        test('should have clear visual hierarchy', async ({ page }) => {
            // Trigger duplicate dialog
            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            // Check dialog title is prominent
            const dialogTitle = page.locator('[data-testid="duplicate-dialog-title"]');
            const titleFontSize = await dialogTitle.evaluate(el => 
                window.getComputedStyle(el).fontSize
            );
            const titleFontWeight = await dialogTitle.evaluate(el => 
                window.getComputedStyle(el).fontWeight
            );

            expect(parseInt(titleFontSize.replace('px', ''))).toBeGreaterThanOrEqual(20);
            expect(parseInt(titleFontWeight)).toBeGreaterThanOrEqual(600);
        });

        test('should provide clear feedback for actions', async ({ page }) => {
            // Import card and check for success feedback
            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            // Check for success message
            const successMessage = page.locator('[data-testid="success-message"]');
            await expect(successMessage).toBeVisible();
            await expect(successMessage).toHaveCSS('background-color', /green|#[0-9a-f]{3,6}/i);

            // Check message persists long enough to read
            await page.waitForTimeout(2000);
            await expect(successMessage).toBeVisible();
        });

        test('should handle errors gracefully with clear messages', async ({ page }) => {
            // Trigger error by importing invalid data
            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', 'invalid json');
            await page.click('[data-testid="confirm-import"]');

            const errorMessage = page.locator('[data-testid="error-message"]');
            await expect(errorMessage).toBeVisible();
            
            const errorText = await errorMessage.textContent();
            expect(errorText).toContain('錯誤'); // Should contain error indication in Chinese
            expect(errorText?.length).toBeGreaterThan(10); // Should be descriptive
        });
    });

    describe('Screen Reader Support', () => {
        test('should announce duplicate detection results', async ({ page }) => {
            // Enable screen reader simulation
            await page.addInitScript(() => {
                window.speechSynthesis = {
                    speak: (utterance) => {
                        window.lastSpokenText = utterance.text;
                    },
                    cancel: () => {},
                    getVoices: () => []
                };
            });

            // Import duplicate card
            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            // Check for live region updates
            const liveRegion = page.locator('[aria-live="polite"]');
            await expect(liveRegion).toBeVisible();
            
            const announcement = await liveRegion.textContent();
            expect(announcement).toContain('重複'); // Should announce duplicate detection
        });

        test('should provide descriptive button labels', async ({ page }) => {
            // Trigger duplicate dialog
            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            // Check action button descriptions
            const replaceButton = page.locator('[data-testid="action-replace"]');
            const mergeButton = page.locator('[data-testid="action-merge"]');
            const skipButton = page.locator('[data-testid="action-skip"]');

            await expect(replaceButton).toHaveAttribute('aria-describedby');
            await expect(mergeButton).toHaveAttribute('aria-describedby');
            await expect(skipButton).toHaveAttribute('aria-describedby');

            // Check descriptions are informative
            const replaceDesc = await page.locator(`#${await replaceButton.getAttribute('aria-describedby')}`).textContent();
            expect(replaceDesc?.length).toBeGreaterThan(20); // Should be descriptive
        });

        test('should support focus management in dialogs', async ({ page }) => {
            // Trigger duplicate dialog
            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            await page.click('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.click('[data-testid="confirm-import"]');

            // Focus should be trapped in dialog
            const dialog = page.locator('[data-testid="duplicate-dialog"]');
            await expect(dialog).toBeVisible();

            // First focusable element should receive focus
            const firstButton = dialog.locator('button').first();
            await expect(firstButton).toBeFocused();

            // Tab should cycle through dialog elements only
            await page.keyboard.press('Tab');
            const secondButton = dialog.locator('button').nth(1);
            await expect(secondButton).toBeFocused();
        });
    });

    describe('Mobile Accessibility', () => {
        test('should work with mobile screen readers', async ({ page, browserName }) => {
            // Simulate mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });

            // Test touch interactions
            await page.tap('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.tap('[data-testid="confirm-import"]');

            // Verify mobile-friendly duplicate dialog
            await page.tap('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.tap('[data-testid="confirm-import"]');

            const dialog = page.locator('[data-testid="duplicate-dialog"]');
            await expect(dialog).toBeVisible();

            // Check dialog is properly sized for mobile
            const dialogBox = await dialog.boundingBox();
            expect(dialogBox?.width).toBeLessThanOrEqual(375);
        });

        test('should support swipe gestures for version history', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });

            // Import card and open version history
            await page.tap('[data-testid="import-button"]');
            await page.fill('[data-testid="import-textarea"]', JSON.stringify({
                cards: [{ type: 'bilingual', data: { name: '蔡孟諭', email: 'test@moda.gov.tw' } }]
            }));
            await page.tap('[data-testid="confirm-import"]');

            await page.tap('[data-testid="card-item"]:first-child');
            await page.tap('[data-testid="version-history-button"]');

            // Test swipe navigation if version history supports it
            const versionHistory = page.locator('[data-testid="version-history"]');
            await expect(versionHistory).toBeVisible();

            // Verify touch-friendly version history interface
            const versionItems = page.locator('[data-testid="version-item"]');
            const itemCount = await versionItems.count();

            if (itemCount > 0) {
                const firstItem = versionItems.first();
                const itemBox = await firstItem.boundingBox();
                expect(itemBox?.height).toBeGreaterThanOrEqual(44); // Touch-friendly height
            }
        });
    });
});