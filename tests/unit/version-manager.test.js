/**
 * Unit Tests for VersionManager
 * Tests version increment, history management, and conflict resolution
 */

import { VersionManager } from '../../src/core/VersionManager.js';

describe('VersionManager', () => {
    let versionManager;
    let mockStorage;

    beforeEach(() => {
        mockStorage = {
            getCard: jest.fn(),
            updateCard: jest.fn(),
            getVersionHistory: jest.fn(),
            saveVersionHistory: jest.fn()
        };

        versionManager = new VersionManager(mockStorage);
    });

    describe('incrementVersion', () => {
        test('should increment major version for significant changes', () => {
            const currentVersion = '1.2';
            const newVersion = versionManager.incrementVersion(currentVersion, 'major');

            expect(newVersion).toBe('2.0');
        });

        test('should increment minor version for minor changes', () => {
            const currentVersion = '1.2';
            const newVersion = versionManager.incrementVersion(currentVersion, 'minor');

            expect(newVersion).toBe('1.3');
        });

        test('should handle initial version', () => {
            const newVersion = versionManager.incrementVersion(null, 'minor');

            expect(newVersion).toBe('1.0');
        });

        test('should handle invalid version format', () => {
            const newVersion = versionManager.incrementVersion('invalid', 'minor');

            expect(newVersion).toBe('1.0');
        });
    });

    describe('createVersionSnapshot', () => {
        test('should create version snapshot with metadata', () => {
            const cardData = {
                name: '蔡孟諭',
                email: 'test@moda.gov.tw',
                version: '1.0'
            };

            const snapshot = versionManager.createVersionSnapshot(cardData, 'Updated contact info');

            expect(snapshot).toMatchObject({
                version: '1.0',
                data: cardData,
                changeDescription: 'Updated contact info',
                timestamp: expect.any(String),
                checksum: expect.any(String)
            });
        });

        test('should generate consistent checksums', () => {
            const cardData = { name: '蔡孟諭', email: 'test@moda.gov.tw' };

            const snapshot1 = versionManager.createVersionSnapshot(cardData, 'test');
            const snapshot2 = versionManager.createVersionSnapshot(cardData, 'test');

            expect(snapshot1.checksum).toBe(snapshot2.checksum);
        });
    });

    describe('saveVersionHistory', () => {
        test('should save version history with proper structure', async () => {
            const cardId = 'card_123';
            const cardData = { name: '蔡孟諭', version: '1.1' };
            const changeDescription = 'Updated phone number';

            mockStorage.getVersionHistory.mockResolvedValue([]);
            mockStorage.saveVersionHistory.mockResolvedValue(true);

            await versionManager.saveVersionHistory(cardId, cardData, changeDescription);

            expect(mockStorage.saveVersionHistory).toHaveBeenCalledWith(
                cardId,
                expect.arrayContaining([
                    expect.objectContaining({
                        version: '1.1',
                        changeDescription: 'Updated phone number',
                        timestamp: expect.any(String)
                    })
                ])
            );
        });

        test('should maintain version history order', async () => {
            const cardId = 'card_123';
            const existingHistory = [
                { version: '1.0', timestamp: '2025-08-01T10:00:00Z' }
            ];

            mockStorage.getVersionHistory.mockResolvedValue(existingHistory);
            mockStorage.saveVersionHistory.mockResolvedValue(true);

            const newCardData = { name: '蔡孟諭', version: '1.1' };
            await versionManager.saveVersionHistory(cardId, newCardData, 'Update');

            const savedHistory = mockStorage.saveVersionHistory.mock.calls[0][1];
            expect(savedHistory).toHaveLength(2);
            expect(savedHistory[0].version).toBe('1.0'); // Older version first
            expect(savedHistory[1].version).toBe('1.1'); // Newer version last
        });

        test('should limit history to maximum entries', async () => {
            const cardId = 'card_123';
            const existingHistory = Array.from({ length: 50 }, (_, i) => ({
                version: `1.${i}`,
                timestamp: new Date(2025, 0, i + 1).toISOString()
            }));

            mockStorage.getVersionHistory.mockResolvedValue(existingHistory);
            mockStorage.saveVersionHistory.mockResolvedValue(true);

            const newCardData = { name: '蔡孟諭', version: '1.50' };
            await versionManager.saveVersionHistory(cardId, newCardData, 'Update');

            const savedHistory = mockStorage.saveVersionHistory.mock.calls[0][1];
            expect(savedHistory).toHaveLength(50); // Should maintain max limit
            expect(savedHistory[0].version).toBe('1.1'); // Oldest entry removed
            expect(savedHistory[49].version).toBe('1.50'); // New entry added
        });
    });

    describe('getVersionHistory', () => {
        test('should retrieve version history for card', async () => {
            const cardId = 'card_123';
            const mockHistory = [
                { version: '1.0', timestamp: '2025-08-01T10:00:00Z' },
                { version: '1.1', timestamp: '2025-08-02T10:00:00Z' }
            ];

            mockStorage.getVersionHistory.mockResolvedValue(mockHistory);

            const history = await versionManager.getVersionHistory(cardId);

            expect(history).toEqual(mockHistory);
            expect(mockStorage.getVersionHistory).toHaveBeenCalledWith(cardId);
        });

        test('should return empty array for card with no history', async () => {
            const cardId = 'card_new';

            mockStorage.getVersionHistory.mockResolvedValue([]);

            const history = await versionManager.getVersionHistory(cardId);

            expect(history).toEqual([]);
        });
    });

    describe('resolveVersionConflict', () => {
        test('should resolve conflict by choosing latest version', async () => {
            const cardId = 'card_123';
            const localVersion = {
                version: '1.2',
                timestamp: '2025-08-02T10:00:00Z',
                data: { name: '蔡孟諭', email: 'local@example.com' }
            };
            const remoteVersion = {
                version: '1.1',
                timestamp: '2025-08-01T10:00:00Z',
                data: { name: '蔡孟諭', email: 'remote@example.com' }
            };

            const resolution = await versionManager.resolveVersionConflict(
                cardId, localVersion, remoteVersion, 'latest'
            );

            expect(resolution.resolvedVersion).toEqual(localVersion);
            expect(resolution.strategy).toBe('latest');
        });

        test('should resolve conflict by merging versions', async () => {
            const cardId = 'card_123';
            const localVersion = {
                version: '1.2',
                data: { name: '蔡孟諭', email: 'local@example.com', phone: '123' }
            };
            const remoteVersion = {
                version: '1.1',
                data: { name: '蔡孟諭', email: 'remote@example.com', mobile: '456' }
            };

            const resolution = await versionManager.resolveVersionConflict(
                cardId, localVersion, remoteVersion, 'merge'
            );

            expect(resolution.resolvedVersion.data).toMatchObject({
                name: '蔡孟諭',
                email: 'local@example.com', // Local takes precedence
                phone: '123',
                mobile: '456'
            });
            expect(resolution.strategy).toBe('merge');
        });

        test('should create conflict resolution history entry', async () => {
            const cardId = 'card_123';
            const localVersion = { version: '1.2', data: { name: '蔡孟諭' } };
            const remoteVersion = { version: '1.1', data: { name: '蔡孟諭' } };

            mockStorage.saveVersionHistory.mockResolvedValue(true);

            const resolution = await versionManager.resolveVersionConflict(
                cardId, localVersion, remoteVersion, 'latest'
            );

            expect(resolution.conflictResolved).toBe(true);
            expect(mockStorage.saveVersionHistory).toHaveBeenCalledWith(
                cardId,
                expect.arrayContaining([
                    expect.objectContaining({
                        changeDescription: expect.stringContaining('Conflict resolved')
                    })
                ])
            );
        });
    });

    describe('validateVersionIntegrity', () => {
        test('should validate version integrity with correct checksum', () => {
            const cardData = { name: '蔡孟諭', email: 'test@moda.gov.tw' };
            const snapshot = versionManager.createVersionSnapshot(cardData, 'test');

            const isValid = versionManager.validateVersionIntegrity(snapshot);

            expect(isValid).toBe(true);
        });

        test('should detect corrupted version data', () => {
            const cardData = { name: '蔡孟諭', email: 'test@moda.gov.tw' };
            const snapshot = versionManager.createVersionSnapshot(cardData, 'test');
            
            // Corrupt the data
            snapshot.data.name = '王小明';

            const isValid = versionManager.validateVersionIntegrity(snapshot);

            expect(isValid).toBe(false);
        });

        test('should handle missing checksum', () => {
            const snapshot = {
                version: '1.0',
                data: { name: '蔡孟諭' },
                timestamp: new Date().toISOString()
                // Missing checksum
            };

            const isValid = versionManager.validateVersionIntegrity(snapshot);

            expect(isValid).toBe(false);
        });
    });

    describe('error handling', () => {
        test('should handle storage errors gracefully', async () => {
            const cardId = 'card_123';
            mockStorage.getVersionHistory.mockRejectedValue(new Error('Storage error'));

            await expect(versionManager.getVersionHistory(cardId))
                .rejects.toThrow('Storage error');
        });

        test('should handle invalid version formats', () => {
            expect(() => versionManager.incrementVersion('abc', 'minor')).not.toThrow();
            expect(() => versionManager.incrementVersion('1.2.3.4', 'major')).not.toThrow();
        });
    });
});