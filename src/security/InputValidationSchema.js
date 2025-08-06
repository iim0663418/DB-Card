/**
 * InputValidationSchema - 統一輸入驗證架構
 * 提供 JSON Schema 驗證和類型檢查功能
 */
class InputValidationSchema {
    static #schemas = new Map();

    /**
     * 初始化預設 Schema
     */
    static init() {
        this.#registerCardDataSchema();
        this.#registerUserInputSchema();
        this.#registerFileImportSchema();
    }

    /**
     * 註冊名片資料 Schema
     */
    static #registerCardDataSchema() {
        const cardDataSchema = {
            type: 'object',
            required: ['name'],
            properties: {
                name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100,
                    pattern: '^[\\u4e00-\\u9fff\\w\\s~-]+$'
                },
                title: {
                    type: 'string',
                    maxLength: 100,
                    pattern: '^[\\u4e00-\\u9fff\\w\\s~-]*$'
                },
                department: {
                    type: 'string',
                    maxLength: 100,
                    pattern: '^[\\u4e00-\\u9fff\\w\\s~-]*$'
                },
                organization: {
                    type: 'string',
                    maxLength: 100,
                    pattern: '^[\\u4e00-\\u9fff\\w\\s~-]*$'
                },
                email: {
                    type: 'string',
                    format: 'email',
                    maxLength: 254
                },
                phone: {
                    type: 'string',
                    maxLength: 20,
                    pattern: '^[\\d\\s\\-\\+\\(\\)]*$'
                },
                mobile: {
                    type: 'string',
                    maxLength: 20,
                    pattern: '^[\\d\\s\\-\\+\\(\\)]*$'
                },
                avatar: {
                    type: 'string',
                    format: 'uri',
                    maxLength: 500
                },
                address: {
                    type: 'string',
                    maxLength: 200
                },
                greetings: {
                    type: 'array',
                    maxItems: 5,
                    items: {
                        type: 'string',
                        maxLength: 200
                    }
                },
                socialLinks: {
                    type: 'object',
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email'
                        },
                        socialNote: {
                            type: 'string',
                            maxLength: 500
                        }
                    }
                }
            },
            additionalProperties: false
        };

        this.#schemas.set('cardData', cardDataSchema);
    }

    /**
     * 註冊使用者輸入 Schema
     */
    static #registerUserInputSchema() {
        const userInputSchema = {
            type: 'object',
            properties: {
                searchTerm: {
                    type: 'string',
                    maxLength: 100,
                    pattern: '^[\\u4e00-\\u9fff\\w\\s]*$'
                },
                filterType: {
                    type: 'string',
                    enum: ['index', 'index1', 'personal', 'bilingual', 'bilingual1', 'personal-bilingual', 'en', 'en1', 'personal-en']
                },
                importUrl: {
                    type: 'string',
                    format: 'uri',
                    maxLength: 2000
                }
            },
            additionalProperties: false
        };

        this.#schemas.set('userInput', userInputSchema);
    }

    /**
     * 註冊檔案匯入 Schema
     */
    static #registerFileImportSchema() {
        const fileImportSchema = {
            type: 'object',
            required: ['type', 'data'],
            properties: {
                type: {
                    type: 'string',
                    enum: ['json', 'vcard', 'url']
                },
                data: {
                    type: 'object'
                },
                metadata: {
                    type: 'object',
                    properties: {
                        filename: {
                            type: 'string',
                            maxLength: 255
                        },
                        size: {
                            type: 'number',
                            minimum: 0,
                            maximum: 1048576 // 1MB
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                }
            },
            additionalProperties: false
        };

        this.#schemas.set('fileImport', fileImportSchema);
    }

    /**
     * 驗證資料
     */
    static validate(data, schemaName, options = {}) {
        try {
            const schema = this.#schemas.get(schemaName);
            if (!schema) {
                return {
                    valid: false,
                    errors: [`未知的 Schema: ${schemaName}`]
                };
            }

            // 預處理資料
            const processedData = this.#preprocessData(data, options);
            
            // 執行驗證
            const result = this.#validateAgainstSchema(processedData, schema);
            
            // 後處理結果
            if (result.valid && options.sanitize) {
                result.sanitizedData = this.#sanitizeValidatedData(processedData, schema);
            }

            return result;
        } catch (error) {
            return {
                valid: false,
                errors: [`驗證過程發生錯誤: ${error.message}`]
            };
        }
    }

    /**
     * 預處理資料
     */
    static #preprocessData(data, options) {
        if (!data || typeof data !== 'object') {
            return data;
        }

        // 深度複製避免修改原始資料
        const processed = JSON.parse(JSON.stringify(data));

        // 移除空值（如果選項啟用）
        if (options.removeEmpty) {
            this.#removeEmptyValues(processed);
        }

        // 修剪字串（如果選項啟用）
        if (options.trimStrings) {
            this.#trimStringValues(processed);
        }

        return processed;
    }

    /**
     * 對 Schema 執行驗證
     */
    static #validateAgainstSchema(data, schema) {
        const errors = [];

        // 類型檢查
        if (!this.#validateType(data, schema.type)) {
            errors.push(`資料類型錯誤，期望: ${schema.type}`);
            return { valid: false, errors };
        }

        // 物件驗證
        if (schema.type === 'object') {
            this.#validateObject(data, schema, errors);
        }

        // 陣列驗證
        if (schema.type === 'array') {
            this.#validateArray(data, schema, errors);
        }

        // 字串驗證
        if (schema.type === 'string') {
            this.#validateString(data, schema, errors);
        }

        // 數字驗證
        if (schema.type === 'number') {
            this.#validateNumber(data, schema, errors);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 驗證類型
     */
    static #validateType(data, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof data === 'string';
            case 'number':
                return typeof data === 'number' && !isNaN(data);
            case 'boolean':
                return typeof data === 'boolean';
            case 'object':
                return data !== null && typeof data === 'object' && !Array.isArray(data);
            case 'array':
                return Array.isArray(data);
            default:
                return true;
        }
    }

    /**
     * 驗證物件
     */
    static #validateObject(data, schema, errors) {
        // 必要欄位檢查
        if (schema.required) {
            for (const field of schema.required) {
                if (!(field in data) || data[field] === null || data[field] === undefined) {
                    errors.push(`缺少必要欄位: ${field}`);
                }
            }
        }

        // 屬性驗證
        if (schema.properties) {
            for (const [key, value] of Object.entries(data)) {
                const propSchema = schema.properties[key];
                if (propSchema) {
                    const propResult = this.#validateAgainstSchema(value, propSchema);
                    if (!propResult.valid) {
                        errors.push(...propResult.errors.map(err => `${key}: ${err}`));
                    }
                } else if (!schema.additionalProperties) {
                    errors.push(`不允許的屬性: ${key}`);
                }
            }
        }
    }

    /**
     * 驗證陣列
     */
    static #validateArray(data, schema, errors) {
        if (schema.maxItems && data.length > schema.maxItems) {
            errors.push(`陣列項目過多，最大允許: ${schema.maxItems}`);
        }

        if (schema.minItems && data.length < schema.minItems) {
            errors.push(`陣列項目過少，最小需要: ${schema.minItems}`);
        }

        if (schema.items) {
            data.forEach((item, index) => {
                const itemResult = this.#validateAgainstSchema(item, schema.items);
                if (!itemResult.valid) {
                    errors.push(...itemResult.errors.map(err => `[${index}]: ${err}`));
                }
            });
        }
    }

    /**
     * 驗證字串
     */
    static #validateString(data, schema, errors) {
        if (schema.minLength && data.length < schema.minLength) {
            errors.push(`字串長度過短，最小需要: ${schema.minLength}`);
        }

        if (schema.maxLength && data.length > schema.maxLength) {
            errors.push(`字串長度過長，最大允許: ${schema.maxLength}`);
        }

        if (schema.pattern) {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(data)) {
                errors.push('字串格式不符合要求');
            }
        }

        if (schema.format) {
            if (!this.#validateFormat(data, schema.format)) {
                errors.push(`格式錯誤: ${schema.format}`);
            }
        }

        if (schema.enum && !schema.enum.includes(data)) {
            errors.push(`值不在允許範圍內: ${schema.enum.join(', ')}`);
        }
    }

    /**
     * 驗證數字
     */
    static #validateNumber(data, schema, errors) {
        if (schema.minimum !== undefined && data < schema.minimum) {
            errors.push(`數值過小，最小值: ${schema.minimum}`);
        }

        if (schema.maximum !== undefined && data > schema.maximum) {
            errors.push(`數值過大，最大值: ${schema.maximum}`);
        }
    }

    /**
     * 驗證格式
     */
    static #validateFormat(data, format) {
        switch (format) {
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data);
            case 'uri':
                try {
                    new URL(data);
                    return true;
                } catch {
                    return false;
                }
            case 'date-time':
                return !isNaN(Date.parse(data));
            default:
                return true;
        }
    }

    /**
     * 清理已驗證的資料
     */
    static #sanitizeValidatedData(data, schema) {
        if (window.SecurityInputHandler && window.SecurityInputHandler.sanitizeObject) {
            return window.SecurityInputHandler.sanitizeObject(data);
        }
        return data;
    }

    /**
     * 移除空值
     */
    static #removeEmptyValues(obj) {
        if (Array.isArray(obj)) {
            return obj.filter(item => item !== null && item !== undefined && item !== '');
        }

        if (obj && typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
                if (value === null || value === undefined || value === '') {
                    delete obj[key];
                } else if (typeof value === 'object') {
                    this.#removeEmptyValues(value);
                }
            }
        }
    }

    /**
     * 修剪字串值
     */
    static #trimStringValues(obj) {
        if (Array.isArray(obj)) {
            obj.forEach(item => this.#trimStringValues(item));
        } else if (obj && typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string') {
                    obj[key] = value.trim();
                } else if (typeof value === 'object') {
                    this.#trimStringValues(value);
                }
            }
        }
    }

    /**
     * 獲取可用的 Schema 列表
     */
    static getAvailableSchemas() {
        return Array.from(this.#schemas.keys());
    }

    /**
     * 註冊自訂 Schema
     */
    static registerSchema(name, schema) {
        if (typeof name !== 'string' || !schema) {
            throw new Error('無效的 Schema 名稱或定義');
        }
        
        this.#schemas.set(name, schema);
    }

    /**
     * 快速驗證名片資料
     */
    static validateCardData(cardData, options = {}) {
        return this.validate(cardData, 'cardData', {
            sanitize: true,
            removeEmpty: true,
            trimStrings: true,
            ...options
        });
    }

    /**
     * 快速驗證使用者輸入
     */
    static validateUserInput(input, options = {}) {
        return this.validate(input, 'userInput', {
            sanitize: true,
            trimStrings: true,
            ...options
        });
    }

    /**
     * 快速驗證檔案匯入
     */
    static validateFileImport(importData, options = {}) {
        return this.validate(importData, 'fileImport', {
            sanitize: true,
            ...options
        });
    }
}

// 初始化預設 Schema
InputValidationSchema.init();

// 全域可用
window.InputValidationSchema = InputValidationSchema;