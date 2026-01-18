/**
 * 匯出功能完整測試套件
 * 測試所有匯出格式和功能
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

describe('匯出功能完整測試', () => {
    let cardManager, mockStorage, testCards;

    beforeEach(() => {
        // 設置測試資料
        testCards = [
            {
                id: 'test-001',
                type: 'personal',
                data: {
                    name: '張三',
                    title: '軟體工程師',
                    organization: '科技公司',
                    email: 'zhang@example.com',
                    phone: '02-1234-5678',
                    mobile: '0912-345-678',
                    address: '台北市信義區',
                    greetings: ['您好！', 'Hello!'],
                    socialNote: '歡迎交流技術'
                },
                created: '2024-01-01T00:00:00.000Z',
                modified: '2024-01-01T00:00:00.000Z',
                version: '1.0'
            },
            {
                id: 'test-002', 
                type: 'official',
                data: {
                    name: '李四',
                    title: '專案經理',
                    department: '數位策略司',
                    organization: '數位發展部',
                    email: 'li@moda.gov.tw',
                    phone: '02-2345-6789',
                    address: '臺北市中正區延平南路143號'
                },
                created: '2024-01-02T00:00:00.000Z',
                modified: '2024-01-02T00:00:00.000Z',
                version: '1.0'
            },
            {
                id: 'test-003',
                type: 'bilingual', 
                data: {
                    name: '王五~John Wang',
                    title: '產品經理~Product Manager',
                    organization: '創新公司~Innovation Corp',
                    email: 'wang@innovation.com',
                    phone: '+886-2-3456-7890',
                    greetings: ['很高興認識您~Nice to meet you', '請多指教~Please guide me']
                },
                created: '2024-01-03T00:00:00.000Z',
                modified: '2024-01-03T00:00:00.000Z',
                version: '1.0'
            }
        ];

        // 模擬儲存系統
        mockStorage = {
            listCards: jest.fn().mockResolvedValue(testCards),
            getCard: jest.fn().mockImplementation(id => {
                return Promise.resolve(testCards.find(card => card.id === id));
            })
        };

        // 模擬 CardManager
        cardManager = {
            storage: mockStorage,
            updateImportStatus: jest.fn(),
            getMessage: jest.fn().mockImplementation(key => {
                const messages = {
                    'preparing_export': '正在準備匯出...',
                    'processing_cards': '正在處理名片...',
                    'generating_files': '正在生成檔案...',
                    'export_completed': '匯出完成',
                    'no_cards_to_export': '沒有可匯出的名片',
                    'card_not_found': '名片不存在',
                    'file_too_large': '檔案太大',
                    'file_large_warning': '檔案較大',
                    'file_size_info': '檔案大小資訊'
                };
                return messages[key] || key;
            }),
            getUserFriendlyError: jest.fn().mockReturnValue({ message: '測試錯誤', code: 'TEST_ERROR' }),
            detectCardType: jest.fn().mockImplementation(data => {
                if (data.organization && data.organization.includes('數位發展部')) return 'official';
                if (data.greetings && data.greetings.some(g => g.includes('~'))) return 'bilingual';
                return 'personal';
            }),
            processBilingualCardData: jest.fn().mockImplementation((data, language) => {
                const result = { ...data };
                if (language === 'zh') {
                    Object.keys(result).forEach(key => {
                        if (typeof result[key] === 'string' && result[key].includes('~')) {
                            result[key] = result[key].split('~')[0];
                        }
                    });
                } else if (language === 'en') {
                    Object.keys(result).forEach(key => {
                        if (typeof result[key] === 'string' && result[key].includes('~')) {
                            result[key] = result[key].split('~')[1] || result[key].split('~')[0];
                        }
                    });
                }
                return result;
            })
        };

        // 綁定方法
        cardManager.exportCards = require('/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/features/card-manager.js').prototype.exportCards.bind(cardManager);
        cardManager.exportVCardBatch = require('/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/features/card-manager.js').prototype.exportVCardBatch.bind(cardManager);
        cardManager.generateVCardContent = require('/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/features/card-manager.js').prototype.generateVCardContent.bind(cardManager);
        cardManager.downloadFile = require('/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/features/card-manager.js').prototype.downloadFile.bind(cardManager);
        cardManager.checkFileSizeWarning = require('/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/features/card-manager.js').prototype.checkFileSizeWarning.bind(cardManager);
        cardManager.getSelectedCards = require('/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/features/card-manager.js').prototype.getSelectedCards.bind(cardManager);
        cardManager.getCardVersions = require('/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/features/card-manager.js').prototype.getCardVersions.bind(cardManager);
        cardManager.quickExport = require('/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/features/card-manager.js').prototype.quickExport.bind(cardManager);
        cardManager.exportSingleCard = require('/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/features/card-manager.js').prototype.exportSingleCard.bind(cardManager);
        cardManager.getExportPreview = require('/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/features/card-manager.js').prototype.getExportPreview.bind(cardManager);

        // 模擬 DOM API
        global.document = {
            createElement: jest.fn(() => ({
                href: '',
                download: '',
                style: { display: '' },
                click: jest.fn()
            })),
            body: {
                appendChild: jest.fn(),
                removeChild: jest.fn()
            }
        };

        global.URL = {
            createObjectURL: jest.fn(() => 'mock-blob-url'),
            revokeObjectURL: jest.fn()
        };

        global.Blob = jest.fn((data, options) => ({
            data,
            type: options?.type || '',
            size: JSON.stringify(data).length
        }));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('JSON 匯出功能', () => {
        it('應該成功匯出所有名片為 JSON 格式', async () => {
            const result = await cardManager.exportCards({
                exportAll: true,
                format: 'json',
                autoDownload: false
            });

            expect(result.success).toBe(true);
            expect(result.files).toHaveLength(1);
            expect(result.files[0].format).toBe('json');
            expect(result.files[0].filename).toMatch(/cards-export-.*\.json/);
            expect(result.count).toBe(3);
        });

        it('應該匯出選定的名片', async () => {
            const result = await cardManager.exportCards({
                cardIds: ['test-001', 'test-002'],
                format: 'json',
                autoDownload: false
            });

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
        });

        it('應該包含正確的元資料', async () => {
            const result = await cardManager.exportCards({
                exportAll: true,
                format: 'json',
                autoDownload: false
            });

            expect(result.success).toBe(true);
            expect(result.exportData).toBeDefined();
            expect(result.exportData.version).toBe('3.0.2');
            expect(result.exportData.totalCards).toBe(3);
            expect(result.exportData.cards).toHaveLength(3);
        });
    });

    describe('vCard 匯出功能', () => {
        it('應該成功匯出為 vCard 格式', async () => {
            const result = await cardManager.exportCards({
                exportAll: true,
                format: 'vcard',
                autoDownload: false,
                language: 'zh'
            });

            expect(result.success).toBe(true);
            expect(result.files).toHaveLength(1);
            expect(result.files[0].format).toBe('vcard');
            expect(result.files[0].filename).toMatch(/cards-zh-.*\.vcf/);
        });

        it('應該支援雙語匯出', async () => {
            const result = await cardManager.exportCards({
                exportAll: true,
                format: 'vcard',
                autoDownload: false,
                includeBothLanguages: true
            });

            expect(result.success).toBe(true);
            expect(result.files[0].filename).toMatch(/cards-bilingual-.*\.vcf/);
        });

        it('應該正確生成 vCard 內容', () => {
            const testData = {
                name: '測試用戶',
                title: '測試職位',
                organization: '測試公司',
                email: 'test@example.com',
                phone: '02-1234-5678'
            };

            const vCardContent = cardManager.generateVCardContent(testData, 'zh', 'personal');

            expect(vCardContent).toContain('BEGIN:VCARD');
            expect(vCardContent).toContain('END:VCARD');
            expect(vCardContent).toContain('FN:測試用戶');
            expect(vCardContent).toContain('EMAIL:test@example.com');
            expect(vCardContent).toContain('X-CARD-TYPE:personal');
        });
    });

    describe('混合格式匯出', () => {
        it('應該同時匯出 JSON 和 vCard 格式', async () => {
            const result = await cardManager.exportCards({
                exportAll: true,
                format: 'both',
                autoDownload: false
            });

            expect(result.success).toBe(true);
            expect(result.files).toHaveLength(2);
            
            const formats = result.files.map(f => f.format);
            expect(formats).toContain('json');
            expect(formats).toContain('vcard');
        });
    });

    describe('檔案大小檢查', () => {
        it('應該正確檢查檔案大小', () => {
            const MB = 1024 * 1024;
            
            // 正常大小
            let warning = cardManager.checkFileSizeWarning(1 * MB);
            expect(warning.level).toBe('ok');
            
            // 大檔案警告
            warning = cardManager.checkFileSizeWarning(8 * MB);
            expect(warning.level).toBe('info');
            
            // 非常大的檔案
            warning = cardManager.checkFileSizeWarning(15 * MB);
            expect(warning.level).toBe('warning');
            
            // 超大檔案
            warning = cardManager.checkFileSizeWarning(60 * MB);
            expect(warning.level).toBe('error');
        });
    });

    describe('快速匯出功能', () => {
        it('應該提供快速 JSON 匯出', async () => {
            const result = await cardManager.quickExport('json', { autoDownload: false });

            expect(result.success).toBe(true);
            expect(result.files[0].format).toBe('json');
        });

        it('應該提供快速 vCard 匯出', async () => {
            const result = await cardManager.quickExport('vcard', { autoDownload: false });

            expect(result.success).toBe(true);
            expect(result.files[0].format).toBe('vcard');
        });
    });

    describe('單張名片匯出', () => {
        it('應該成功匯出單張名片', async () => {
            const result = await cardManager.exportSingleCard('test-001', 'vcard', { autoDownload: false });

            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
            expect(result.files[0].format).toBe('vcard');
        });

        it('應該處理不存在的名片', async () => {
            const result = await cardManager.exportSingleCard('non-existent', 'vcard');

            expect(result.success).toBe(false);
            expect(result.error).toContain('名片不存在');
        });
    });

    describe('匯出預覽功能', () => {
        it('應該生成正確的匯出預覽', async () => {
            const result = await cardManager.getExportPreview(null, 'json');

            expect(result.success).toBe(true);
            expect(result.preview.totalCards).toBe(3);
            expect(result.preview.cardTypes).toBeDefined();
            expect(result.preview.estimatedSizes.json).toBeGreaterThan(0);
        });

        it('應該預覽選定的名片', async () => {
            const result = await cardManager.getExportPreview(['test-001', 'test-002'], 'both');

            expect(result.success).toBe(true);
            expect(result.preview.totalCards).toBe(2);
            expect(result.preview.estimatedSizes.json).toBeDefined();
            expect(result.preview.estimatedSizes.vcard).toBeDefined();
        });
    });

    describe('雙語資料處理', () => {
        it('應該正確處理雙語名片資料', () => {
            const bilingualData = {
                name: '張三~John Zhang',
                title: '工程師~Engineer',
                organization: '科技公司~Tech Corp'
            };

            const zhData = cardManager.processBilingualCardData(bilingualData, 'zh');
            const enData = cardManager.processBilingualCardData(bilingualData, 'en');

            expect(zhData.name).toBe('張三');
            expect(zhData.title).toBe('工程師');
            expect(zhData.organization).toBe('科技公司');

            expect(enData.name).toBe('John Zhang');
            expect(enData.title).toBe('Engineer');
            expect(enData.organization).toBe('Tech Corp');
        });
    });

    describe('錯誤處理', () => {
        it('應該處理空的名片列表', async () => {
            mockStorage.listCards.mockResolvedValue([]);

            const result = await cardManager.exportCards({
                exportAll: true,
                format: 'json'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('沒有可匯出的名片');
        });

        it('應該處理儲存錯誤', async () => {
            mockStorage.listCards.mockRejectedValue(new Error('Storage error'));

            const result = await cardManager.exportCards({
                exportAll: true,
                format: 'json'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('進度追蹤', () => {
        it('應該正確更新匯出進度', async () => {
            await cardManager.exportCards({
                exportAll: true,
                format: 'json',
                autoDownload: false
            });

            expect(cardManager.updateImportStatus).toHaveBeenCalledWith(
                expect.any(String),
                'preparing',
                10,
                expect.any(String)
            );

            expect(cardManager.updateImportStatus).toHaveBeenCalledWith(
                expect.any(String),
                'completed',
                100,
                expect.any(String)
            );
        });
    });
});