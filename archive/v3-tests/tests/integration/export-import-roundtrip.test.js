/**
 * 匯出匯入格式對齊驗證測試
 * 完整的 Export → Import → Verify 循環測試
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

describe('匯出匯入格式對齊測試', () => {
    let cardManager, transferManager, testCards;

    beforeEach(() => {
        // 測試資料 - 包含各種類型的名片資料
        testCards = [
            {
                id: 'test-001',
                type: 'personal',
                data: {
                    name: '張三',
                    title: '軟體工程師',
                    organization: '科技公司',
                    department: '研發部',
                    email: 'zhang@example.com',
                    phone: '02-1234-5678',
                    mobile: '0912-345-678',
                    address: '台北市信義區',
                    website: 'https://zhang.example.com',
                    socialNote: '歡迎交流技術',
                    greetings: ['您好！', '很高興認識您']
                },
                created: '2024-01-01T00:00:00.000Z',
                modified: '2024-01-01T00:00:00.000Z',
                version: '1.0'
            },
            {
                id: 'test-002',
                type: 'bilingual',
                data: {
                    name: '李四~John Li',
                    title: '產品經理~Product Manager',
                    organization: '創新公司~Innovation Corp',
                    email: 'li@innovation.com',
                    phone: '+886-2-3456-7890',
                    greetings: ['很高興認識您~Nice to meet you', '請多指教~Please guide me']
                },
                created: '2024-01-02T00:00:00.000Z',
                modified: '2024-01-02T00:00:00.000Z',
                version: '1.0'
            }
        ];

        // Mock 物件設定
        global.Blob = jest.fn((data, options) => ({
            data,
            type: options?.type || '',
            size: JSON.stringify(data).length
        }));

        global.URL = {
            createObjectURL: jest.fn(() => 'mock-blob-url'),
            revokeObjectURL: jest.fn()
        };

        // Mock CardManager
        cardManager = {
            storage: {
                listCards: jest.fn().mockResolvedValue(testCards),
                getCard: jest.fn().mockImplementation(id => {
                    return Promise.resolve(testCards.find(card => card.id === id));
                })
            },
            updateImportStatus: jest.fn(),
            getMessage: jest.fn().mockImplementation(key => key),
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
                        if (Array.isArray(result[key])) {
                            result[key] = result[key].map(item => 
                                typeof item === 'string' && item.includes('~') ? item.split('~')[0] : item
                            );
                        }
                    });
                }
                return result;
            }),
            getCardVersions: jest.fn().mockResolvedValue([])
        };

        // 綁定實際的方法
        const CardManagerPrototype = require('/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/features/card-manager.js').prototype;
        cardManager.exportCards = CardManagerPrototype.exportCards.bind(cardManager);
        cardManager.generateVCardContent = CardManagerPrototype.generateVCardContent.bind(cardManager);
        cardManager.downloadFile = CardManagerPrototype.downloadFile.bind(cardManager);
        cardManager.checkFileSizeWarning = CardManagerPrototype.checkFileSizeWarning.bind(cardManager);

        // Mock TransferManager
        transferManager = {
            getUserFriendlyError: jest.fn().mockReturnValue({ message: 'Test error', code: 'TEST_ERROR' }),
            updateProgress: jest.fn(),
            validateFileIntegrity: jest.fn().mockReturnValue({ isValid: true, warnings: [], errors: [] }),
            maskSensitiveData: jest.fn().mockImplementation(data => '***'),
            logSecurityEvent: jest.fn()
        };

        // 綁定實際的方法
        const TransferManagerPrototype = require('/Users/shengfanwu/GitHub/DB-Card/pwa-card-storage/src/features/transfer-manager.js').prototype;
        transferManager.convertVCardToJSON = TransferManagerPrototype.convertVCardToJSON.bind(transferManager);
        transferManager.sanitizeImportData = TransferManagerPrototype.sanitizeImportData.bind(transferManager);
        transferManager.validateImportData = TransferManagerPrototype.validateImportData.bind(transferManager);
        transferManager.secureJSONParse = TransferManagerPrototype.secureJSONParse.bind(transferManager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('JSON 格式循環測試', () => {
        it('應該成功完成 JSON 匯出 → 匯入 → 驗證循環', async () => {
            // 1. 匯出 JSON 格式
            const exportResult = await cardManager.exportCards({
                exportAll: true,
                format: 'json',
                autoDownload: false
            });

            expect(exportResult.success).toBe(true);
            expect(exportResult.files).toHaveLength(1);
            expect(exportResult.files[0].format).toBe('json');

            // 2. 模擬檔案內容解析
            const jsonContent = exportResult.exportData;
            expect(jsonContent).toBeDefined();
            expect(jsonContent.version).toBe('3.0.2');
            expect(jsonContent.cards).toHaveLength(2);

            // 3. 驗證匯出資料結構
            expect(jsonContent.cards[0]).toHaveProperty('id');
            expect(jsonContent.cards[0]).toHaveProperty('type');
            expect(jsonContent.cards[0]).toHaveProperty('data');
            expect(jsonContent.cards[0]).toHaveProperty('created');
            expect(jsonContent.cards[0]).toHaveProperty('modified');
            expect(jsonContent.cards[0]).toHaveProperty('version');

            // 4. 測試匯入驗證
            const sanitizedData = transferManager.sanitizeImportData(jsonContent);
            expect(sanitizedData).toBeDefined();
            expect(sanitizedData.cards).toHaveLength(2);

            const isValid = transferManager.validateImportData(sanitizedData);
            expect(isValid).toBe(true);

            // 5. 驗證資料完整性
            const originalCard = testCards[0];
            const exportedCard = jsonContent.cards.find(c => c.id === originalCard.id);
            expect(exportedCard).toBeDefined();
            expect(exportedCard.data.name).toBe(originalCard.data.name);
            expect(exportedCard.data.email).toBe(originalCard.data.email);
            expect(exportedCard.data.greetings).toEqual(originalCard.data.greetings);
        });

        it('應該保留所有名片欄位', async () => {
            const exportResult = await cardManager.exportCards({
                exportAll: true,
                format: 'json',
                autoDownload: false
            });

            const originalCard = testCards[0];
            const exportedCard = exportResult.exportData.cards.find(c => c.id === originalCard.id);

            // 檢查所有重要欄位都被保留
            expect(exportedCard.data.name).toBe(originalCard.data.name);
            expect(exportedCard.data.title).toBe(originalCard.data.title);
            expect(exportedCard.data.organization).toBe(originalCard.data.organization);
            expect(exportedCard.data.department).toBe(originalCard.data.department);
            expect(exportedCard.data.email).toBe(originalCard.data.email);
            expect(exportedCard.data.phone).toBe(originalCard.data.phone);
            expect(exportedCard.data.mobile).toBe(originalCard.data.mobile);
            expect(exportedCard.data.address).toBe(originalCard.data.address);
            expect(exportedCard.data.website).toBe(originalCard.data.website);
            expect(exportedCard.data.socialNote).toBe(originalCard.data.socialNote);
            expect(exportedCard.data.greetings).toEqual(originalCard.data.greetings);
        });
    });

    describe('vCard 格式循環測試', () => {
        it('應該成功完成 vCard 匯出 → 匯入 → 驗證循環', async () => {
            // 1. 生成 vCard 內容
            const testCard = testCards[0];
            const vCardContent = cardManager.generateVCardContent(testCard.data, 'zh', testCard.type);

            expect(vCardContent).toContain('BEGIN:VCARD');
            expect(vCardContent).toContain('END:VCARD');
            expect(vCardContent).toContain('VERSION:3.0');

            // 2. 解析 vCard 回 JSON
            const parseResult = transferManager.convertVCardToJSON(vCardContent);
            expect(parseResult.success).toBe(true);
            expect(parseResult.data).toBeDefined();

            // 3. 驗證欄位對應
            const parsedData = parseResult.data;
            expect(parsedData.name).toBe(testCard.data.name);
            expect(parsedData.title).toBe(testCard.data.title);
            expect(parsedData.organization).toBe(testCard.data.organization);
            expect(parsedData.department).toBe(testCard.data.department);
            expect(parsedData.email).toBe(testCard.data.email);
            expect(parsedData.phone).toBe(testCard.data.phone);
            expect(parsedData.mobile).toBe(testCard.data.mobile);
            expect(parsedData.address).toBe(testCard.data.address);
            expect(parsedData.website).toBe(testCard.data.website);
            expect(parsedData.socialNote).toBe(testCard.data.socialNote);
        });

        it('應該正確處理問候語', async () => {
            const testCard = testCards[0];
            const vCardContent = cardManager.generateVCardContent(testCard.data, 'zh', testCard.type);

            // 檢查問候語是否被包含在 vCard 中
            expect(vCardContent).toContain('X-GREETINGS:');

            // 解析回來檢查
            const parseResult = transferManager.convertVCardToJSON(vCardContent);
            expect(parseResult.success).toBe(true);
            expect(parseResult.data.greetings).toBeDefined();
            expect(Array.isArray(parseResult.data.greetings)).toBe(true);
            expect(parseResult.data.greetings.length).toBeGreaterThan(0);
        });

        it('應該正確處理不同電話類型', async () => {
            const testCard = testCards[0];
            const vCardContent = cardManager.generateVCardContent(testCard.data, 'zh', testCard.type);

            // 檢查是否包含工作電話和手機
            expect(vCardContent).toContain('TEL;TYPE=WORK:');
            expect(vCardContent).toContain('TEL;TYPE=CELL:');

            // 解析回來檢查
            const parseResult = transferManager.convertVCardToJSON(vCardContent);
            expect(parseResult.success).toBe(true);
            expect(parseResult.data.phone).toBe(testCard.data.phone);
            expect(parseResult.data.mobile).toBe(testCard.data.mobile);
        });
    });

    describe('雙語資料循環測試', () => {
        it('應該正確處理雙語名片資料', async () => {
            const bilingualCard = testCards[1]; // 雙語名片

            // 1. 生成中文版 vCard
            const processedZhData = cardManager.processBilingualCardData(bilingualCard.data, 'zh');
            const zhVCard = cardManager.generateVCardContent(processedZhData, 'zh', bilingualCard.type);

            expect(zhVCard).toContain('李四');
            expect(zhVCard).not.toContain('John Li');

            // 2. 解析中文版
            const zhParseResult = transferManager.convertVCardToJSON(zhVCard);
            expect(zhParseResult.success).toBe(true);
            expect(zhParseResult.data.name).toBe('李四');
            expect(zhParseResult.data.title).toBe('產品經理');
        });

        it('應該保留雙語問候語', async () => {
            const bilingualCard = testCards[1];
            const vCardContent = cardManager.generateVCardContent(bilingualCard.data, 'zh', bilingualCard.type);

            const parseResult = transferManager.convertVCardToJSON(vCardContent);
            expect(parseResult.success).toBe(true);
            expect(parseResult.data.greetings).toBeDefined();
            expect(parseResult.data.greetings.length).toBeGreaterThan(0);
        });
    });

    describe('格式驗證測試', () => {
        it('應該拒絕無效的 JSON 格式', () => {
            const invalidData = { invalid: 'format' };
            
            expect(() => {
                transferManager.sanitizeImportData(invalidData);
            }).toThrow();
        });

        it('應該正確驗證匯出的 JSON 格式', async () => {
            const exportResult = await cardManager.exportCards({
                exportAll: true,
                format: 'json',
                autoDownload: false
            });

            const sanitized = transferManager.sanitizeImportData(exportResult.exportData);
            const isValid = transferManager.validateImportData(sanitized);
            
            expect(isValid).toBe(true);
        });

        it('應該正確處理空的 vCard', () => {
            const emptyVCard = 'BEGIN:VCARD\nVERSION:3.0\nEND:VCARD';
            const result = transferManager.convertVCardToJSON(emptyVCard);
            
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });
    });
});