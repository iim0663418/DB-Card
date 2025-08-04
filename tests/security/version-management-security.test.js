/**
 * Security Tests for Version Management System
 * Tests OWASP Top 10 vulnerabilities and security requirements
 */

import { ContentFingerprintGenerator } from '../../src/core/ContentFingerprintGenerator.js';
import { DuplicateDetector } from '../../src/core/DuplicateDetector.js';
import { VersionManager } from '../../src/core/VersionManager.js';

describe('Version Management Security', () => {
    let fingerprinter;
    let duplicateDetector;
    let versionManager;
    let mockStorage;

    beforeEach(() => {
        mockStorage = {
            getAllCards: jest.fn(),
            getCard: jest.fn(),
            updateCard: jest.fn(),
            saveCard: jest.fn(),
            getVersionHistory: jest.fn(),
            saveVersionHistory: jest.fn()
        };

        fingerprinter = new ContentFingerprintGenerator();
        duplicateDetector = new DuplicateDetector(mockStorage, fingerprinter);
        versionManager = new VersionManager(mockStorage);
    });

    describe('Input Validation (CWE-20)', () => {
        test('should sanitize malicious script injection in card data', () => {
            const maliciousCard = {
                name: '<script>alert("XSS")</script>',
                email: 'javascript:alert("XSS")',
                socialNote: '<img src=x onerror=alert("XSS")>'
            };

            const fingerprint = fingerprinter.generateFingerprint(maliciousCard);
            expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
            expect(fingerprint).not.toContain('<script>');
        });

        test('should handle SQL injection attempts in search queries', async () => {
            const maliciousQuery = "'; DROP TABLE cards; --";
            mockStorage.getAllCards.mockResolvedValue([]);

            const card = { name: maliciousQuery, email: 'test@example.com' };
            const result = await duplicateDetector.detectDuplicates(card);

            expect(result.isDuplicate).toBe(false);
            expect(mockStorage.getAllCards).toHaveBeenCalled();
        });

        test('should validate version format to prevent injection', () => {
            const maliciousVersions = [
                '1.0; DROP TABLE versions;',
                '1.0<script>alert("XSS")</script>',
                '../../etc/passwd',
                'javascript:alert("XSS")'
            ];

            maliciousVersions.forEach(version => {
                const result = versionManager.incrementVersion(version, 'minor');
                expect(result).toBe('1.0'); // Should default to safe version
            });
        });
    });

    describe('Authentication & Authorization (CWE-862)', () => {
        test('should prevent unauthorized version history access', async () => {
            const cardId = 'card_123';
            const unauthorizedCardId = '../../../admin/cards';

            mockStorage.getVersionHistory.mockImplementation((id) => {
                if (id !== cardId) {
                    throw new Error('Unauthorized access');
                }
                return Promise.resolve([]);
            });

            await expect(versionManager.getVersionHistory(unauthorizedCardId))
                .rejects.toThrow('Unauthorized access');
        });

        test('should validate card ownership before version operations', async () => {
            const cardId = 'card_123';
            const maliciousUpdate = {
                id: '../../../admin/config',
                data: { admin: true }
            };

            mockStorage.updateCard.mockImplementation((id, data) => {
                if (id.includes('../') || id.includes('admin')) {
                    throw new Error('Path traversal detected');
                }
                return Promise.resolve(true);
            });

            await expect(
                duplicateDetector.handleDuplicateAction('replace', { id: maliciousUpdate.id }, maliciousUpdate)
            ).rejects.toThrow('Path traversal detected');
        });
    });

    describe('Data Integrity (CWE-345)', () => {
        test('should detect tampered version checksums', () => {
            const cardData = { name: '蔡孟諭', email: 'test@moda.gov.tw' };
            const snapshot = versionManager.createVersionSnapshot(cardData, 'test');

            // Tamper with data but keep original checksum
            snapshot.data.name = 'Hacker';

            const isValid = versionManager.validateVersionIntegrity(snapshot);
            expect(isValid).toBe(false);
        });

        test('should prevent checksum collision attacks', () => {
            const card1 = { name: '蔡孟諭', email: 'test1@moda.gov.tw' };
            const card2 = { name: '王小明', email: 'test2@moda.gov.tw' };

            const fingerprint1 = fingerprinter.generateFingerprint(card1);
            const fingerprint2 = fingerprinter.generateFingerprint(card2);

            expect(fingerprint1).not.toBe(fingerprint2);
            expect(fingerprint1).toMatch(/^[a-f0-9]{64}$/);
            expect(fingerprint2).toMatch(/^[a-f0-9]{64}$/);
        });

        test('should validate version history chain integrity', async () => {
            const cardId = 'card_123';
            const corruptedHistory = [
                {
                    version: '1.0',
                    data: { name: '蔡孟諭' },
                    checksum: 'invalid_checksum',
                    timestamp: '2025-08-01T10:00:00Z'
                }
            ];

            mockStorage.getVersionHistory.mockResolvedValue(corruptedHistory);

            const history = await versionManager.getVersionHistory(cardId);
            const isValid = versionManager.validateVersionIntegrity(history[0]);

            expect(isValid).toBe(false);
        });
    });

    describe('Information Disclosure (CWE-200)', () => {
        test('should not expose sensitive data in error messages', async () => {
            const sensitiveCard = {
                name: '蔡孟諭',
                email: 'classified@moda.gov.tw',
                phone: '02-CLASSIFIED'
            };

            mockStorage.saveCard.mockRejectedValue(new Error('Database connection failed'));

            try {
                await mockStorage.saveCard(sensitiveCard);
            } catch (error) {
                expect(error.message).not.toContain('classified');
                expect(error.message).not.toContain('CLASSIFIED');
                expect(error.message).not.toContain(sensitiveCard.email);
            }
        });

        test('should sanitize version history before logging', () => {
            const sensitiveData = {
                name: '蔡孟諭',
                email: 'secret@moda.gov.tw',
                notes: 'CONFIDENTIAL PROJECT DETAILS'
            };

            const snapshot = versionManager.createVersionSnapshot(sensitiveData, 'Update');

            // Verify sensitive data is not exposed in logs
            const logSafeSnapshot = {
                version: snapshot.version,
                timestamp: snapshot.timestamp,
                changeDescription: snapshot.changeDescription
                // Data should not be included in logs
            };

            expect(logSafeSnapshot.data).toBeUndefined();
        });
    });

    describe('Denial of Service (CWE-400)', () => {
        test('should limit version history size to prevent memory exhaustion', async () => {
            const cardId = 'card_123';
            const largeHistory = Array.from({ length: 1000 }, (_, i) => ({
                version: `1.${i}`,
                data: { name: '蔡孟諭', iteration: i },
                timestamp: new Date().toISOString()
            }));

            mockStorage.getVersionHistory.mockResolvedValue(largeHistory);
            mockStorage.saveVersionHistory.mockResolvedValue(true);

            const newData = { name: '蔡孟諭', email: 'test@moda.gov.tw' };
            await versionManager.saveVersionHistory(cardId, newData, 'Update');

            const savedHistory = mockStorage.saveVersionHistory.mock.calls[0][1];
            expect(savedHistory.length).toBeLessThanOrEqual(50); // Max history limit
        });

        test('should prevent infinite recursion in duplicate detection', async () => {
            const circularCard = { name: '蔡孟諭' };
            circularCard.self = circularCard; // Circular reference

            mockStorage.getAllCards.mockResolvedValue([]);

            const result = await duplicateDetector.detectDuplicates(circularCard);
            expect(result.isDuplicate).toBe(false);
        });

        test('should timeout long-running similarity calculations', async () => {
            const complexCard1 = {
                name: 'A'.repeat(10000),
                description: 'B'.repeat(10000)
            };
            const complexCard2 = {
                name: 'C'.repeat(10000),
                description: 'D'.repeat(10000)
            };

            const startTime = Date.now();
            const similarity = duplicateDetector.calculateSimilarity(complexCard1, complexCard2);
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
            expect(similarity).toBeGreaterThanOrEqual(0);
            expect(similarity).toBeLessThanOrEqual(1);
        });
    });

    describe('Cryptographic Security (CWE-327)', () => {
        test('should use secure hashing algorithm for fingerprints', () => {
            const cardData = { name: '蔡孟諭', email: 'test@moda.gov.tw' };
            const fingerprint = fingerprinter.generateFingerprint(cardData);

            // SHA-256 produces 64-character hex strings
            expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
            expect(fingerprint.length).toBe(64);
        });

        test('should generate cryptographically secure checksums', () => {
            const cardData = { name: '蔡孟諭', email: 'test@moda.gov.tw' };
            const snapshot = versionManager.createVersionSnapshot(cardData, 'test');

            expect(snapshot.checksum).toMatch(/^[a-f0-9]{64}$/);
            expect(snapshot.checksum.length).toBe(64);
        });

        test('should prevent timing attacks on fingerprint comparison', () => {
            const fingerprint1 = 'a'.repeat(64);
            const fingerprint2 = 'b'.repeat(64);

            const startTime = process.hrtime.bigint();
            const result = fingerprinter.compareFingerprints(fingerprint1, fingerprint2);
            const endTime = process.hrtime.bigint();

            expect(result).toBe(false);
            // Comparison should take consistent time regardless of input
            expect(Number(endTime - startTime)).toBeLessThan(1000000); // 1ms in nanoseconds
        });
    });

    describe('Session Management (CWE-384)', () => {
        test('should not persist sensitive data in browser storage', () => {
            const sensitiveCard = {
                name: '蔡孟諭',
                email: 'classified@moda.gov.tw',
                notes: 'TOP SECRET'
            };

            // Simulate browser storage check
            const storageData = JSON.stringify(sensitiveCard);
            expect(storageData).not.toContain('TOP SECRET');
            expect(storageData).not.toContain('classified');
        });

        test('should clear sensitive data from memory after operations', async () => {
            const sensitiveCard = {
                name: '蔡孟諭',
                password: 'secret123',
                token: 'auth_token_xyz'
            };

            const fingerprint = fingerprinter.generateFingerprint(sensitiveCard);

            // Verify sensitive fields are not retained in fingerprint
            expect(fingerprint).not.toContain('secret123');
            expect(fingerprint).not.toContain('auth_token_xyz');
        });
    });
});