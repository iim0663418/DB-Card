/**
 * E2E Tests for Duplicate Import Workflow
 * Tests complete user workflow from duplicate detection to resolution
 */

import { test, expect } from '@playwright/test';

test.describe('Duplicate Import Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/pwa-card-storage/');
        await page.waitForLoadState('networkidle');
    });

    test('should detect and handle exact duplicate during import', async ({ page }) => {
        // Step 1: Import initial card
        await page.click('[data-testid="import-button"]');
        
        const cardData = {
            name: '蔡孟諭~Tsai Meng-Yu',
            title: '分析師~Systems Analyst',
            email: 'test@moda.gov.tw',
            phone: '02-23800432'
        };

        await page.fill('[data-testid="import-textarea"]', JSON.stringify({
            cards: [{ type: 'bilingual', data: cardData }]
        }));

        await page.click('[data-testid="confirm-import"]');
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

        // Step 2: Import same card again
        await page.click('[data-testid="import-button"]');
        await page.fill('[data-testid="import-textarea"]', JSON.stringify({
            cards: [{ type: 'bilingual', data: cardData }]
        }));

        await page.click('[data-testid="confirm-import"]');

        // Step 3: Verify duplicate dialog appears
        await expect(page.locator('[data-testid="duplicate-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="duplicate-type"]')).toContainText('完全相同');

        // Step 4: Choose skip action
        await page.click('[data-testid="action-skip"]');
        await page.click('[data-testid="confirm-duplicate-action"]');

        // Step 5: Verify card count remains 1
        const cardCount = await page.locator('[data-testid="card-item"]').count();
        expect(cardCount).toBe(1);
    });

    test('should handle similar duplicate with merge action', async ({ page }) => {
        // Step 1: Import initial card
        const initialCard = {
            name: '蔡孟諭~Tsai Meng-Yu',
            title: '分析師~Systems Analyst',
            email: 'test@moda.gov.tw',
            phone: '02-23800432'
        };

        await page.click('[data-testid="import-button"]');
        await page.fill('[data-testid="import-textarea"]', JSON.stringify({
            cards: [{ type: 'bilingual', data: initialCard }]
        }));
        await page.click('[data-testid="confirm-import"]');

        // Step 2: Import similar card with additional info
        const similarCard = {
            name: '蔡孟諭~Tsai Meng-Yu',
            title: '分析師~Systems Analyst',
            email: 'test@moda.gov.tw',
            phone: '02-23800432',
            mobile: '0912-345-678',
            avatar: 'https://example.com/avatar.jpg'
        };

        await page.click('[data-testid="import-button"]');
        await page.fill('[data-testid="import-textarea"]', JSON.stringify({
            cards: [{ type: 'bilingual', data: similarCard }]
        }));
        await page.click('[data-testid="confirm-import"]');

        // Step 3: Handle duplicate with merge
        await expect(page.locator('[data-testid="duplicate-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="duplicate-type"]')).toContainText('相似');

        await page.click('[data-testid="action-merge"]');
        await page.click('[data-testid="confirm-duplicate-action"]');

        // Step 4: Verify merged data
        await page.click('[data-testid="card-item"]:first-child');
        await expect(page.locator('[data-testid="card-mobile"]')).toContainText('0912-345-678');
        await expect(page.locator('[data-testid="card-avatar"]')).toBeVisible();
    });
});