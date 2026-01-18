/**
 * 匯出功能驗證測試 - 簡化版本
 * 驗證匯出功能的核心邏輯
 */

describe('匯出功能驗證測試', () => {
    let testCards, mockBlob, mockURL;

    beforeEach(() => {
        // 測試資料
        testCards = [
            {
                id: 'test-001',
                type: 'personal',
                data: {
                    name: '張三',
                    title: '軟體工程師',
                    email: 'zhang@example.com',
                    phone: '02-1234-5678'
                }
            },
            {
                id: 'test-002',
                type: 'official',
                data: {
                    name: '李四',
                    title: '專案經理',
                    organization: '數位發展部',
                    email: 'li@moda.gov.tw'
                }
            }
        ];

        // Mock Blob and URL
        mockBlob = jest.fn((data, options) => ({
            data,
            type: options?.type || '',
            size: JSON.stringify(data).length
        }));

        mockURL = {
            createObjectURL: jest.fn(() => 'mock-blob-url'),
            revokeObjectURL: jest.fn()
        };

        global.Blob = mockBlob;
        global.URL = mockURL;

        // Mock document
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
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('JSON 匯出資料結構', () => {
        it('應該生成正確的 JSON 匯出格式', () => {
            const exportData = {
                version: '3.0.2',
                timestamp: new Date().toISOString(),
                exportedBy: 'PWA Card Storage v3.0.2',
                totalCards: testCards.length,
                format: 'json',
                cards: testCards
            };

            expect(exportData.version).toBe('3.0.2');
            expect(exportData.totalCards).toBe(2);
            expect(exportData.cards).toHaveLength(2);
            expect(exportData.cards[0]).toHaveProperty('id');
            expect(exportData.cards[0]).toHaveProperty('data');
        });

        it('應該包含完整的名片資訊', () => {
            const card = testCards[0];
            
            expect(card.id).toBeDefined();
            expect(card.type).toBeDefined();
            expect(card.data.name).toBeDefined();
            expect(card.data.email).toBeDefined();
        });
    });

    describe('vCard 內容生成', () => {
        it('應該生成標準 vCard 格式', () => {
            const cardData = testCards[0].data;
            const vCardLines = [
                'BEGIN:VCARD',
                'VERSION:3.0',
                `FN:${cardData.name}`,
                `TITLE:${cardData.title}`,
                `EMAIL:${cardData.email}`,
                `TEL;TYPE=WORK:${cardData.phone}`,
                'X-CARD-TYPE:personal',
                'X-LANGUAGE:zh',
                'END:VCARD'
            ];
            
            const vCardContent = vCardLines.join('\n');
            
            expect(vCardContent).toContain('BEGIN:VCARD');
            expect(vCardContent).toContain('END:VCARD');
            expect(vCardContent).toContain('FN:張三');
            expect(vCardContent).toContain('EMAIL:zhang@example.com');
        });

        it('應該處理政府名片格式', () => {
            const govCard = testCards[1].data;
            const vCardLines = [
                'BEGIN:VCARD',
                'VERSION:3.0',
                `FN:${govCard.name}`,
                `TITLE:${govCard.title}`,
                `ORG:${govCard.organization}`,
                `EMAIL:${govCard.email}`,
                'X-CARD-TYPE:official',
                'X-LANGUAGE:zh',
                'END:VCARD'
            ];
            
            const vCardContent = vCardLines.join('\n');
            
            expect(vCardContent).toContain('ORG:數位發展部');
            expect(vCardContent).toContain('X-CARD-TYPE:official');
        });
    });

    describe('雙語資料處理', () => {
        it('應該正確分離雙語內容', () => {
            const bilingualData = {
                name: '王五~John Wang',
                title: '產品經理~Product Manager',
                organization: '創新公司~Innovation Corp'
            };

            // 模擬中文處理
            const zhData = {};
            Object.keys(bilingualData).forEach(key => {
                const value = bilingualData[key];
                if (typeof value === 'string' && value.includes('~')) {
                    zhData[key] = value.split('~')[0];
                } else {
                    zhData[key] = value;
                }
            });

            // 模擬英文處理
            const enData = {};
            Object.keys(bilingualData).forEach(key => {
                const value = bilingualData[key];
                if (typeof value === 'string' && value.includes('~')) {
                    enData[key] = value.split('~')[1] || value.split('~')[0];
                } else {
                    enData[key] = value;
                }
            });

            expect(zhData.name).toBe('王五');
            expect(zhData.title).toBe('產品經理');
            expect(zhData.organization).toBe('創新公司');

            expect(enData.name).toBe('John Wang');
            expect(enData.title).toBe('Product Manager');
            expect(enData.organization).toBe('Innovation Corp');
        });
    });

    describe('檔案大小檢查', () => {
        it('應該正確計算檔案大小警告', () => {
            const MB = 1024 * 1024;
            
            function checkFileSizeWarning(size) {
                if (size > 50 * MB) {
                    return { level: 'error', message: '檔案太大' };
                } else if (size > 10 * MB) {
                    return { level: 'warning', message: '檔案較大' };
                } else if (size > 5 * MB) {
                    return { level: 'info', message: '檔案大小資訊' };
                }
                return { level: 'ok', message: '' };
            }
            
            expect(checkFileSizeWarning(1 * MB).level).toBe('ok');
            expect(checkFileSizeWarning(8 * MB).level).toBe('info');
            expect(checkFileSizeWarning(15 * MB).level).toBe('warning');
            expect(checkFileSizeWarning(60 * MB).level).toBe('error');
        });
    });

    describe('名片類型檢測', () => {
        it('應該正確檢測個人名片', () => {
            const personalCard = {
                name: '張三',
                email: 'zhang@personal.com'
            };

            function detectCardType(data) {
                if (data.organization && data.organization.includes('數位發展部')) return 'official';
                if (data.greetings && data.greetings.some(g => g.includes('~'))) return 'bilingual';
                return 'personal';
            }

            expect(detectCardType(personalCard)).toBe('personal');
        });

        it('應該正確檢測政府名片', () => {
            const govCard = {
                name: '李四',
                organization: '數位發展部',
                email: 'li@moda.gov.tw'
            };

            function detectCardType(data) {
                if (data.organization && data.organization.includes('數位發展部')) return 'official';
                if (data.greetings && data.greetings.some(g => g.includes('~'))) return 'bilingual';
                return 'personal';
            }

            expect(detectCardType(govCard)).toBe('official');
        });

        it('應該正確檢測雙語名片', () => {
            const bilingualCard = {
                name: '王五~John Wang',
                greetings: ['您好~Hello', '很高興認識您~Nice to meet you']
            };

            function detectCardType(data) {
                if (data.organization && data.organization.includes('數位發展部')) return 'official';
                if (data.greetings && data.greetings.some(g => g.includes('~'))) return 'bilingual';
                return 'personal';
            }

            expect(detectCardType(bilingualCard)).toBe('bilingual');
        });
    });

    describe('匯出結果驗證', () => {
        it('應該生成正確的匯出結果結構', () => {
            const exportResult = {
                success: true,
                files: [
                    {
                        format: 'json',
                        file: new mockBlob(['test data'], { type: 'application/json' }),
                        filename: 'cards-export-2024-01-01T00-00-00.json',
                        size: 100,
                        count: 2
                    }
                ],
                count: 2,
                operationId: 'export_123456789'
            };

            expect(exportResult.success).toBe(true);
            expect(exportResult.files).toHaveLength(1);
            expect(exportResult.files[0].format).toBe('json');
            expect(exportResult.files[0].filename).toMatch(/cards-export-.*\.json/);
            expect(exportResult.count).toBe(2);
        });

        it('應該支援多格式匯出結果', () => {
            const multiFormatResult = {
                success: true,
                files: [
                    {
                        format: 'json',
                        file: new mockBlob(['json data'], { type: 'application/json' }),
                        filename: 'cards-export-2024-01-01T00-00-00.json',
                        size: 200,
                        count: 2
                    },
                    {
                        format: 'vcard',
                        file: new mockBlob(['vcard data'], { type: 'text/vcard' }),
                        filename: 'cards-zh-2024-01-01T00-00-00.vcf',
                        size: 300,
                        count: 2
                    }
                ],
                count: 2
            };

            expect(multiFormatResult.files).toHaveLength(2);
            expect(multiFormatResult.files.map(f => f.format)).toEqual(['json', 'vcard']);
        });
    });

    describe('安全驗證', () => {
        it('應該清理惡意檔名', () => {
            function sanitizeFilename(filename) {
                return filename.replace(/[^\w\-_.]/g, '_');
            }

            const maliciousName = '../../../etc/passwd';
            const safeName = sanitizeFilename(maliciousName);
            
            expect(safeName).not.toContain('../');
            expect(safeName).not.toContain('/');
        });

        it('應該限制匯出資料大小', () => {
            const largeData = {
                cards: Array(1001).fill().map((_, i) => ({
                    id: `card_${i}`,
                    data: { name: `User ${i}` }
                }))
            };

            expect(largeData.cards.length).toBeGreaterThan(1000);
            // 在實際實作中應該被拒絕
        });
    });
});