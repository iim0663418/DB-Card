/**
 * Unit Tests for DuplicateDetector
 * Tests duplicate detection and handling logic
 */

import { DuplicateDetector } from '../../src/core/DuplicateDetector.js';
import { ContentFingerprintGenerator } from '../../src/core/ContentFingerprintGenerator.js';

describe('DuplicateDetector', () => {
    let detector;
    let mockStorage;
    let mockFingerprinter;

    beforeEach(() => {
        mockStorage = {
            getAllCards: jest.fn(),
            getCard: jest.fn(),
            updateCard: jest.fn()
        };

        mockFingerprinter = new ContentFingerprintGenerator();
        detector = new DuplicateDetector(mockStorage, mockFingerprinter);
    });

    describe('detectDuplicates', () => {
        test('should detect exact duplicates', async () => {
            const existingCard = {
                id: 'card_1',
                data: { name: '蔡孟諭', email: 'test@moda.gov.tw' },
                fingerprint: 'abc123'
            };

            const newCard = {
                data: { name: '蔡孟諭', email: 'test@moda.gov.tw' }
            };

            mockStorage.getAllCards.mockResolvedValue([existingCard]);

            const result = await detector.detectDuplicates(newCard);

            expect(result.isDuplicate).toBe(true);
            expect(result.duplicateType).toBe('exact');
            expect(result.existingCard.id).toBe('card_1');
        });

        test('should detect similar duplicates with high similarity', async () => {
            const existingCard = {
                id: 'card_1',
                data: { name: '蔡孟諭', email: 'test@moda.gov.tw', phone: '123' },
                fingerprint: 'abc123'
            };

            const newCard = {
                data: { name: '蔡孟諭', email: 'test@moda.gov.tw', phone: '456' }
            };

            mockStorage.getAllCards.mockResolvedValue([existingCard]);

            const result = await detector.detectDuplicates(newCard);

            expect(result.isDuplicate).toBe(true);
            expect(result.duplicateType).toBe('similar');
            expect(result.similarity).toBeGreaterThan(0.8);
        });

        test('should not detect duplicates for dissimilar cards', async () => {
            const existingCard = {
                id: 'card_1',
                data: { name: '王小明', email: 'wang@example.com' },
                fingerprint: 'def456'
            };

            const newCard = {
                data: { name: '蔡孟諭', email: 'test@moda.gov.tw' }
            };

            mockStorage.getAllCards.mockResolvedValue([existingCard]);

            const result = await detector.detectDuplicates(newCard);

            expect(result.isDuplicate).toBe(false);
            expect(result.duplicateType).toBe('none');
        });

        test('should handle bilingual card comparison', async () => {
            const existingCard = {
                id: 'card_1',
                data: {
                    name: { zh: '蔡孟諭', en: 'Tsai Meng-Yu' },
                    email: 'test@moda.gov.tw'
                }
            };

            const newCard = {
                data: {
                    name: '蔡孟諭~Tsai Meng-Yu',
                    email: 'test@moda.gov.tw'
                }
            };

            mockStorage.getAllCards.mockResolvedValue([existingCard]);

            const result = await detector.detectDuplicates(newCard);

            expect(result.isDuplicate).toBe(true);
            expect(result.duplicateType).toBe('similar');
        });
    });

    describe('calculateSimilarity', () => {
        test('should calculate high similarity for similar cards', () => {
            const card1 = { name: '蔡孟諭', email: 'test@moda.gov.tw', phone: '123' };
            const card2 = { name: '蔡孟諭', email: 'test@moda.gov.tw', phone: '456' };

            const similarity = detector.calculateSimilarity(card1, card2);

            expect(similarity).toBeGreaterThan(0.6);
            expect(similarity).toBeLessThan(1.0);
        });

        test('should calculate low similarity for different cards', () => {
            const card1 = { name: '蔡孟諭', email: 'test@moda.gov.tw' };
            const card2 = { name: '王小明', email: 'wang@example.com' };

            const similarity = detector.calculateSimilarity(card1, card2);

            expect(similarity).toBeLessThan(0.3);
        });

        test('should handle empty or missing fields', () => {
            const card1 = { name: '蔡孟諭', email: '', phone: null };
            const card2 = { name: '蔡孟諭', avatar: undefined };

            const similarity = detector.calculateSimilarity(card1, card2);

            expect(similarity).toBeGreaterThan(0);
            expect(similarity).toBeLessThan(1);
        });
    });

    describe('handleDuplicateAction', () => {
        test('should replace existing card when action is replace', async () => {
            const existingCard = { id: 'card_1', data: { name: '舊資料' } };
            const newCard = { data: { name: '新資料' } };

            mockStorage.updateCard.mockResolvedValue(true);

            const result = await detector.handleDuplicateAction('replace', existingCard, newCard);

            expect(result.action).toBe('replace');
            expect(result.success).toBe(true);
            expect(mockStorage.updateCard).toHaveBeenCalledWith('card_1', expect.objectContaining({
                data: { name: '新資料' }
            }));
        });

        test('should merge cards when action is merge', async () => {
            const existingCard = {
                id: 'card_1',
                data: { name: '蔡孟諭', email: 'old@example.com', phone: '123' }
            };
            const newCard = {
                data: { name: '蔡孟諭', email: 'new@example.com', mobile: '456' }
            };

            mockStorage.updateCard.mockResolvedValue(true);

            const result = await detector.handleDuplicateAction('merge', existingCard, newCard);

            expect(result.action).toBe('merge');
            expect(result.success).toBe(true);
            expect(mockStorage.updateCard).toHaveBeenCalledWith('card_1', expect.objectContaining({
                data: expect.objectContaining({
                    name: '蔡孟諭',
                    email: 'new@example.com', // New value takes precedence
                    phone: '123', // Existing value preserved
                    mobile: '456' // New field added
                })
            }));
        });

        test('should skip import when action is skip', async () => {
            const existingCard = { id: 'card_1' };
            const newCard = { data: { name: '新資料' } };

            const result = await detector.handleDuplicateAction('skip', existingCard, newCard);

            expect(result.action).toBe('skip');
            expect(result.success).toBe(true);
            expect(mockStorage.updateCard).not.toHaveBeenCalled();
        });

        test('should handle storage errors gracefully', async () => {
            const existingCard = { id: 'card_1' };
            const newCard = { data: { name: '新資料' } };

            mockStorage.updateCard.mockRejectedValue(new Error('Storage error'));

            const result = await detector.handleDuplicateAction('replace', existingCard, newCard);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('edge cases', () => {
        test('should handle empty storage', async () => {
            mockStorage.getAllCards.mockResolvedValue([]);

            const newCard = { data: { name: '蔡孟諭' } };
            const result = await detector.detectDuplicates(newCard);

            expect(result.isDuplicate).toBe(false);
        });

        test('should handle storage errors', async () => {
            mockStorage.getAllCards.mockRejectedValue(new Error('Storage error'));

            const newCard = { data: { name: '蔡孟諭' } };

            await expect(detector.detectDuplicates(newCard)).rejects.toThrow('Storage error');
        });
    });
});