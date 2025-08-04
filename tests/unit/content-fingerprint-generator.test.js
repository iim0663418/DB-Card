/**
 * Unit Tests for ContentFingerprintGenerator
 * Tests content fingerprinting for duplicate detection
 */

import { ContentFingerprintGenerator } from '../../src/core/ContentFingerprintGenerator.js';

describe('ContentFingerprintGenerator', () => {
    let generator;

    beforeEach(() => {
        generator = new ContentFingerprintGenerator();
    });

    describe('generateFingerprint', () => {
        test('should generate consistent fingerprints for identical content', () => {
            const cardData = {
                name: '蔡孟諭',
                title: '分析師',
                email: 'test@moda.gov.tw',
                phone: '02-23800432'
            };

            const fingerprint1 = generator.generateFingerprint(cardData);
            const fingerprint2 = generator.generateFingerprint(cardData);

            expect(fingerprint1).toBe(fingerprint2);
            expect(fingerprint1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
        });

        test('should generate different fingerprints for different content', () => {
            const cardData1 = { name: '蔡孟諭', email: 'test1@moda.gov.tw' };
            const cardData2 = { name: '王小明', email: 'test2@moda.gov.tw' };

            const fingerprint1 = generator.generateFingerprint(cardData1);
            const fingerprint2 = generator.generateFingerprint(cardData2);

            expect(fingerprint1).not.toBe(fingerprint2);
        });

        test('should handle bilingual data structures', () => {
            const bilingualCard = {
                name: { zh: '蔡孟諭', en: 'Tsai Meng-Yu' },
                title: { zh: '分析師', en: 'Systems Analyst' },
                email: 'test@moda.gov.tw'
            };

            const fingerprint = generator.generateFingerprint(bilingualCard);
            expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
        });

        test('should normalize field order for consistent fingerprints', () => {
            const card1 = { name: '蔡孟諭', email: 'test@moda.gov.tw', phone: '123' };
            const card2 = { email: 'test@moda.gov.tw', phone: '123', name: '蔡孟諭' };

            const fingerprint1 = generator.generateFingerprint(card1);
            const fingerprint2 = generator.generateFingerprint(card2);

            expect(fingerprint1).toBe(fingerprint2);
        });

        test('should ignore metadata fields in fingerprint', () => {
            const card1 = { name: '蔡孟諭', email: 'test@moda.gov.tw' };
            const card2 = { 
                name: '蔡孟諭', 
                email: 'test@moda.gov.tw',
                id: 'card_123',
                created: '2025-08-04T21:21:53.449Z',
                version: '1.0'
            };

            const fingerprint1 = generator.generateFingerprint(card1);
            const fingerprint2 = generator.generateFingerprint(card2);

            expect(fingerprint1).toBe(fingerprint2);
        });

        test('should handle empty and null values consistently', () => {
            const card1 = { name: '蔡孟諭', avatar: '', socialNote: null };
            const card2 = { name: '蔡孟諭', avatar: undefined };

            const fingerprint1 = generator.generateFingerprint(card1);
            const fingerprint2 = generator.generateFingerprint(card2);

            expect(fingerprint1).toBe(fingerprint2);
        });
    });

    describe('compareFingerprints', () => {
        test('should return true for identical fingerprints', () => {
            const cardData = { name: '蔡孟諭', email: 'test@moda.gov.tw' };
            const fingerprint1 = generator.generateFingerprint(cardData);
            const fingerprint2 = generator.generateFingerprint(cardData);

            expect(generator.compareFingerprints(fingerprint1, fingerprint2)).toBe(true);
        });

        test('should return false for different fingerprints', () => {
            const fingerprint1 = 'a'.repeat(64);
            const fingerprint2 = 'b'.repeat(64);

            expect(generator.compareFingerprints(fingerprint1, fingerprint2)).toBe(false);
        });
    });

    describe('error handling', () => {
        test('should handle invalid input gracefully', () => {
            expect(() => generator.generateFingerprint(null)).not.toThrow();
            expect(() => generator.generateFingerprint(undefined)).not.toThrow();
            expect(() => generator.generateFingerprint({})).not.toThrow();
        });

        test('should handle circular references', () => {
            const circularObj = { name: '蔡孟諭' };
            circularObj.self = circularObj;

            expect(() => generator.generateFingerprint(circularObj)).not.toThrow();
        });
    });
});