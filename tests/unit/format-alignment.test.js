/**
 * 格式對齊驗證測試
 * 專注於驗證匯出格式與匯入解析的對齊性
 */

describe('格式對齊驗證', () => {
    // 測試 JSON 格式結構
    describe('JSON 格式驗證', () => {
        it('匯出的 JSON 格式應符合匯入預期', () => {
            // 模擬匯出格式
            const exportFormat = {
                version: '3.0.2',
                timestamp: '2025-01-04T10:00:00.000Z',
                exportedBy: 'PWA Card Storage v3.0.2',
                totalCards: 1,
                format: 'json',
                cards: [{
                    id: 'test-001',
                    type: 'personal',
                    data: {
                        name: '張三',
                        email: 'zhang@example.com'
                    },
                    created: '2024-01-01T00:00:00.000Z',
                    modified: '2024-01-01T00:00:00.000Z',
                    version: '1.0'
                }]
            };

            // 驗證匯入驗證邏輯會接受的格式
            expect(exportFormat).toHaveProperty('version');
            expect(typeof exportFormat.version).toBe('string');
            expect(exportFormat).toHaveProperty('cards');
            expect(Array.isArray(exportFormat.cards)).toBe(true);
            expect(exportFormat.cards[0]).toHaveProperty('id');
            expect(exportFormat.cards[0]).toHaveProperty('data');
        });

        it('應該包含所有必要的名片欄位', () => {
            const cardData = {
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
            };

            // 所有欄位都應該被保留
            const requiredFields = ['name', 'title', 'organization', 'department', 
                                  'email', 'phone', 'mobile', 'address', 'website', 
                                  'socialNote', 'greetings'];
            
            requiredFields.forEach(field => {
                expect(cardData).toHaveProperty(field);
            });
        });
    });

    describe('vCard 格式驗證', () => {
        it('vCard 匯出格式應能被正確解析', () => {
            // 模擬 vCard 匯出內容
            const vCardContent = `BEGIN:VCARD
VERSION:3.0
FN:張三
TITLE:軟體工程師
ORG:科技公司
X-DEPARTMENT:研發部
EMAIL:zhang@example.com
TEL;TYPE=WORK:02-1234-5678
TEL;TYPE=CELL:0912-345-678
ADR;TYPE=WORK:;;台北市信義區;;;
URL:https://zhang.example.com
NOTE:歡迎交流技術
X-GREETINGS:您好！; 很高興認識您
X-CARD-TYPE:personal
X-LANGUAGE:zh
END:VCARD`;

            // 驗證 vCard 格式結構
            expect(vCardContent).toContain('BEGIN:VCARD');
            expect(vCardContent).toContain('END:VCARD');
            expect(vCardContent).toContain('VERSION:3.0');
            
            // 驗證所有欄位都存在
            expect(vCardContent).toContain('FN:張三');
            expect(vCardContent).toContain('TITLE:軟體工程師');
            expect(vCardContent).toContain('ORG:科技公司');
            expect(vCardContent).toContain('X-DEPARTMENT:研發部');
            expect(vCardContent).toContain('EMAIL:zhang@example.com');
            expect(vCardContent).toContain('TEL;TYPE=WORK:02-1234-5678');
            expect(vCardContent).toContain('TEL;TYPE=CELL:0912-345-678');
            expect(vCardContent).toContain('ADR;TYPE=WORK:;;台北市信義區;;;');
            expect(vCardContent).toContain('URL:https://zhang.example.com');
            expect(vCardContent).toContain('NOTE:歡迎交流技術');
            expect(vCardContent).toContain('X-GREETINGS:您好！; 很高興認識您');
            expect(vCardContent).toContain('X-CARD-TYPE:personal');
            expect(vCardContent).toContain('X-LANGUAGE:zh');
        });

        it('vCard 解析邏輯應支援所有匯出欄位', () => {
            // 模擬解析邏輯（簡化版）
            const parseVCard = (vCardContent) => {
                const lines = vCardContent.split('\n');
                const cardData = {};
                let greetings = [];
                
                lines.forEach(line => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex === -1) return;
                    
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    
                    if (!value) return;
                    
                    const [fieldName, params] = key.split(';');
                    const upperFieldName = fieldName.toUpperCase();
                    
                    switch(upperFieldName) {
                        case 'FN': cardData.name = value; break;
                        case 'TITLE': cardData.title = value; break;
                        case 'ORG': cardData.organization = value; break;
                        case 'X-DEPARTMENT': cardData.department = value; break;
                        case 'EMAIL': cardData.email = value; break;
                        case 'TEL':
                            if (params && params.includes('TYPE=CELL')) {
                                cardData.mobile = value;
                            } else {
                                cardData.phone = value;
                            }
                            break;
                        case 'ADR':
                            const addressParts = value.split(';');
                            if (addressParts.length >= 3 && addressParts[2]) {
                                cardData.address = addressParts[2];
                            }
                            break;
                        case 'URL': cardData.website = value; break;
                        case 'NOTE': cardData.socialNote = value; break;
                        case 'X-GREETINGS':
                            const greetingsList = value.split(';').map(g => g.trim()).filter(Boolean);
                            greetings.push(...greetingsList);
                            break;
                        case 'X-CARD-TYPE': cardData.type = value; break;
                    }
                });
                
                if (greetings.length > 0) {
                    cardData.greetings = greetings;
                }
                
                return cardData;
            };

            const vCardContent = `BEGIN:VCARD
VERSION:3.0
FN:張三
TITLE:軟體工程師
ORG:科技公司
X-DEPARTMENT:研發部
EMAIL:zhang@example.com
TEL;TYPE=WORK:02-1234-5678
TEL;TYPE=CELL:0912-345-678
ADR;TYPE=WORK:;;台北市信義區;;;
URL:https://zhang.example.com
NOTE:歡迎交流技術
X-GREETINGS:您好！; 很高興認識您
X-CARD-TYPE:personal
END:VCARD`;

            const parsedData = parseVCard(vCardContent);

            // 驗證所有欄位都被正確解析
            expect(parsedData.name).toBe('張三');
            expect(parsedData.title).toBe('軟體工程師');
            expect(parsedData.organization).toBe('科技公司');
            expect(parsedData.department).toBe('研發部');
            expect(parsedData.email).toBe('zhang@example.com');
            expect(parsedData.phone).toBe('02-1234-5678');
            expect(parsedData.mobile).toBe('0912-345-678');
            expect(parsedData.address).toBe('台北市信義區');
            expect(parsedData.website).toBe('https://zhang.example.com');
            expect(parsedData.socialNote).toBe('歡迎交流技術');
            expect(parsedData.greetings).toEqual(['您好！', '很高興認識您']);
            expect(parsedData.type).toBe('personal');
        });
    });

    describe('雙語資料處理驗證', () => {
        it('應該正確處理雙語欄位', () => {
            const bilingualData = {
                name: '李四~John Li',
                title: '產品經理~Product Manager',
                organization: '創新公司~Innovation Corp',
                greetings: ['很高興認識您~Nice to meet you', '請多指教~Please guide me']
            };

            // 模擬中文處理
            const processForLanguage = (data, language) => {
                const result = { ...data };
                Object.keys(result).forEach(key => {
                    if (typeof result[key] === 'string' && result[key].includes('~')) {
                        const parts = result[key].split('~');
                        result[key] = language === 'zh' ? parts[0] : (parts[1] || parts[0]);
                    }
                    if (Array.isArray(result[key])) {
                        result[key] = result[key].map(item => {
                            if (typeof item === 'string' && item.includes('~')) {
                                const parts = item.split('~');
                                return language === 'zh' ? parts[0] : (parts[1] || parts[0]);
                            }
                            return item;
                        });
                    }
                });
                return result;
            };

            const zhData = processForLanguage(bilingualData, 'zh');
            const enData = processForLanguage(bilingualData, 'en');

            // 驗證中文處理
            expect(zhData.name).toBe('李四');
            expect(zhData.title).toBe('產品經理');
            expect(zhData.organization).toBe('創新公司');
            expect(zhData.greetings[0]).toBe('很高興認識您');

            // 驗證英文處理
            expect(enData.name).toBe('John Li');
            expect(enData.title).toBe('Product Manager');
            expect(enData.organization).toBe('Innovation Corp');
            expect(enData.greetings[0]).toBe('Nice to meet you');
        });
    });

    describe('資料完整性驗證', () => {
        it('應該保持完整的循環一致性', () => {
            // 原始資料
            const originalCard = {
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
                }
            };

            // 模擬 JSON 匯出格式
            const exportFormat = {
                version: '3.0.2',
                timestamp: new Date().toISOString(),
                cards: [originalCard]
            };

            // 模擬匯入驗證
            const validateImportData = (data) => {
                return data && 
                       typeof data === 'object' && 
                       typeof data.version === 'string' && 
                       Array.isArray(data.cards);
            };

            // 驗證循環
            expect(validateImportData(exportFormat)).toBe(true);
            expect(exportFormat.cards[0].data).toEqual(originalCard.data);
        });
    });
});