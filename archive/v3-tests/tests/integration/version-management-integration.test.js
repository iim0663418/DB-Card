/**
 * Integration Tests for Version Management System
 * Tests complete workflow from duplicate detection to version management
 */

import { ContentFingerprintGenerator } from '../../src/core/ContentFingerprintGenerator.js';
import { DuplicateDetector } from '../../src/core/DuplicateDetector.js';
import { VersionManager } from '../../src/core/VersionManager.js';
import { PWACardStorage } from '../../pwa-card-storage/src/core/storage.js';

describe('Version Management Integration', () => {
    let storage;
    let fingerprinter;
    let duplicateDetector;
    let versionManager;

    beforeEach(async () => {
        // Use in-memory storage for testing
        storage = new PWACardStorage(':memory:');
        await storage.init();

        fingerprinter = new ContentFingerprintGenerator();
        duplicateDetector = new DuplicateDetector(storage, fingerprinter);
        versionManager = new VersionManager(storage);
    });

    afterEach(async () => {
        await storage.close();
    });

    describe('Complete Import Workflow', () => {
        test('should handle new card import without duplicates', async () => {
            const newCard = {
                type: 'bilingual',
                data: {
                    name: { zh: '蔡孟諭', en: 'Tsai Meng-Yu' },
                    title: { zh: '分析師', en: 'Systems Analyst' },
                    email: 'test@moda.gov.tw'
                }
            };

            // Step 1: Check for duplicates
            const duplicateResult = await duplicateDetector.detectDuplicates(newCard);
            expect(duplicateResult.isDuplicate).toBe(false);

            // Step 2: Save new card with version
            const cardId = await storage.saveCard({
                ...newCard,
                version: '1.0',
                fingerprint: fingerprinter.generateFingerprint(newCard.data)
            });

            // Step 3: Save version history
            await versionManager.saveVersionHistory(cardId, newCard.data, 'Initial import');

            // Verify card was saved correctly
            const savedCard = await storage.getCard(cardId);
            expect(savedCard.version).toBe('1.0');
            expect(savedCard.fingerprint).toBeDefined();

            // Verify version history
            const history = await versionManager.getVersionHistory(cardId);
            expect(history).toHaveLength(1);
            expect(history[0].changeDescription).toBe('Initial import');
        });

        test('should handle duplicate card with replace action', async () => {
            // Step 1: Save initial card
            const initialCard = {
                type: 'bilingual',
                data: {
                    name: { zh: '蔡孟諭', en: 'Tsai Meng-Yu' },
                    email: 'old@moda.gov.tw',
                    phone: '02-12345678'
                },
                version: '1.0'
            };

            const cardId = await storage.saveCard({
                ...initialCard,
                fingerprint: fingerprinter.generateFingerprint(initialCard.data)
            });

            await versionManager.saveVersionHistory(cardId, initialCard.data, 'Initial import');

            // Step 2: Import updated card
            const updatedCard = {
                type: 'bilingual',
                data: {
                    name: { zh: '蔡孟諭', en: 'Tsai Meng-Yu' },
                    email: 'new@moda.gov.tw',
                    phone: '02-87654321',
                    mobile: '0912-345-678'
                }
            };

            // Step 3: Detect duplicate
            const duplicateResult = await duplicateDetector.detectDuplicates(updatedCard);
            expect(duplicateResult.isDuplicate).toBe(true);
            expect(duplicateResult.duplicateType).toBe('similar');

            // Step 4: Handle duplicate with replace action
            const actionResult = await duplicateDetector.handleDuplicateAction(
                'replace', 
                duplicateResult.existingCard, 
                updatedCard
            );

            expect(actionResult.success).toBe(true);

            // Step 5: Verify card was updated
            const finalCard = await storage.getCard(cardId);
            expect(finalCard.data.email).toBe('new@moda.gov.tw');
            expect(finalCard.data.mobile).toBe('0912-345-678');
            expect(finalCard.version).toBe('1.1'); // Version incremented

            // Step 6: Verify version history
            const history = await versionManager.getVersionHistory(cardId);
            expect(history).toHaveLength(2);
            expect(history[1].changeDescription).toContain('Replaced');
        });

        test('should handle duplicate card with merge action', async () => {
            // Step 1: Save initial card
            const initialCard = {
                type: 'bilingual',
                data: {
                    name: { zh: '蔡孟諭', en: 'Tsai Meng-Yu' },
                    email: 'test@moda.gov.tw',
                    phone: '02-12345678'
                },
                version: '1.0'
            };

            const cardId = await storage.saveCard({
                ...initialCard,
                fingerprint: fingerprinter.generateFingerprint(initialCard.data)
            });

            // Step 2: Import card with additional info
            const additionalCard = {
                type: 'bilingual',
                data: {
                    name: { zh: '蔡孟諭', en: 'Tsai Meng-Yu' },
                    email: 'test@moda.gov.tw',
                    mobile: '0912-345-678',
                    avatar: 'https://example.com/avatar.jpg'
                }
            };

            // Step 3: Detect and handle duplicate
            const duplicateResult = await duplicateDetector.detectDuplicates(additionalCard);
            expect(duplicateResult.isDuplicate).toBe(true);

            const actionResult = await duplicateDetector.handleDuplicateAction(
                'merge',
                duplicateResult.existingCard,
                additionalCard
            );

            expect(actionResult.success).toBe(true);

            // Step 4: Verify merged data
            const mergedCard = await storage.getCard(cardId);
            expect(mergedCard.data.phone).toBe('02-12345678'); // Original preserved
            expect(mergedCard.data.mobile).toBe('0912-345-678'); // New field added
            expect(mergedCard.data.avatar).toBe('https://example.com/avatar.jpg'); // New field added
        });

        test('should handle version conflicts during concurrent updates', async () => {
            // Step 1: Save initial card
            const initialCard = {
                type: 'bilingual',
                data: { name: { zh: '蔡孟諭', en: 'Tsai Meng-Yu' }, email: 'test@moda.gov.tw' },
                version: '1.0'
            };

            const cardId = await storage.saveCard({
                ...initialCard,
                fingerprint: fingerprinter.generateFingerprint(initialCard.data)
            });

            // Step 2: Simulate concurrent updates
            const localUpdate = {
                version: '1.1',
                timestamp: '2025-08-04T12:00:00Z',
                data: { ...initialCard.data, phone: '02-11111111' }
            };

            const remoteUpdate = {
                version: '1.1',
                timestamp: '2025-08-04T12:01:00Z',
                data: { ...initialCard.data, mobile: '0912-111-111' }
            };

            // Step 3: Resolve conflict using merge strategy
            const resolution = await versionManager.resolveVersionConflict(
                cardId, localUpdate, remoteUpdate, 'merge'
            );

            expect(resolution.conflictResolved).toBe(true);
            expect(resolution.resolvedVersion.data.phone).toBe('02-11111111');
            expect(resolution.resolvedVersion.data.mobile).toBe('0912-111-111');
        });
    });

    describe('Bulk Import Scenarios', () => {
        test('should handle bulk import with mixed duplicate scenarios', async () => {
            const importCards = [
                {
                    type: 'bilingual',
                    data: { name: { zh: '蔡孟諭', en: 'Tsai Meng-Yu' }, email: 'tsai@moda.gov.tw' }
                },
                {
                    type: 'bilingual',
                    data: { name: { zh: '王小明', en: 'Wang Ming' }, email: 'wang@moda.gov.tw' }
                },
                {
                    type: 'bilingual',
                    data: { name: { zh: '蔡孟諭', en: 'Tsai Meng-Yu' }, email: 'tsai.new@moda.gov.tw' }
                }
            ];

            const results = [];

            for (const card of importCards) {
                const duplicateResult = await duplicateDetector.detectDuplicates(card);
                
                if (duplicateResult.isDuplicate) {
                    const actionResult = await duplicateDetector.handleDuplicateAction(
                        'merge', duplicateResult.existingCard, card
                    );
                    results.push({ action: 'merged', success: actionResult.success });
                } else {
                    const cardId = await storage.saveCard({
                        ...card,
                        version: '1.0',
                        fingerprint: fingerprinter.generateFingerprint(card.data)
                    });
                    results.push({ action: 'imported', cardId });
                }
            }

            // Verify results
            expect(results).toHaveLength(3);
            expect(results.filter(r => r.action === 'imported')).toHaveLength(2); // First two cards
            expect(results.filter(r => r.action === 'merged')).toHaveLength(1); // Third card merged
        });

        test('should maintain data integrity during bulk operations', async () => {
            const bulkCards = Array.from({ length: 10 }, (_, i) => ({
                type: 'bilingual',
                data: {
                    name: { zh: `測試用戶${i}`, en: `Test User ${i}` },
                    email: `user${i}@moda.gov.tw`
                }
            }));

            // Import all cards
            const cardIds = [];
            for (const card of bulkCards) {
                const cardId = await storage.saveCard({
                    ...card,
                    version: '1.0',
                    fingerprint: fingerprinter.generateFingerprint(card.data)
                });
                cardIds.push(cardId);
                
                await versionManager.saveVersionHistory(cardId, card.data, 'Bulk import');
            }

            // Verify all cards were saved correctly
            const allCards = await storage.getAllCards();
            expect(allCards).toHaveLength(10);

            // Verify version history for each card
            for (const cardId of cardIds) {
                const history = await versionManager.getVersionHistory(cardId);
                expect(history).toHaveLength(1);
                expect(history[0].changeDescription).toBe('Bulk import');
            }

            // Verify fingerprints are unique
            const fingerprints = allCards.map(card => card.fingerprint);
            const uniqueFingerprints = new Set(fingerprints);
            expect(uniqueFingerprints.size).toBe(10);
        });
    });

    describe('Error Recovery', () => {
        test('should recover from storage failures during import', async () => {
            const card = {
                type: 'bilingual',
                data: { name: { zh: '蔡孟諭', en: 'Tsai Meng-Yu' }, email: 'test@moda.gov.tw' }
            };

            // Mock storage failure
            const originalSaveCard = storage.saveCard;
            storage.saveCard = jest.fn().mockRejectedValueOnce(new Error('Storage full'));

            // Attempt import
            try {
                await storage.saveCard(card);
                fail('Should have thrown error');
            } catch (error) {
                expect(error.message).toBe('Storage full');
            }

            // Restore storage and retry
            storage.saveCard = originalSaveCard;
            const cardId = await storage.saveCard({
                ...card,
                version: '1.0',
                fingerprint: fingerprinter.generateFingerprint(card.data)
            });

            expect(cardId).toBeDefined();
        });

        test('should handle corrupted version history gracefully', async () => {
            const card = {
                type: 'bilingual',
                data: { name: { zh: '蔡孟諭', en: 'Tsai Meng-Yu' }, email: 'test@moda.gov.tw' },
                version: '1.0'
            };

            const cardId = await storage.saveCard({
                ...card,
                fingerprint: fingerprinter.generateFingerprint(card.data)
            });

            // Simulate corrupted history
            await storage.saveVersionHistory(cardId, [
                { version: '1.0', data: null, timestamp: 'invalid' } // Corrupted entry
            ]);

            // Should still be able to add new version
            await versionManager.saveVersionHistory(cardId, card.data, 'Recovery update');

            const history = await versionManager.getVersionHistory(cardId);
            expect(history.length).toBeGreaterThan(0);
        });
    });
});