// NFC Generator - API Integration
import { API_BASE } from './config.js';

let setupToken = '';
let isAuthenticated = false;

// 驗證 Token
export async function verifyToken(token) {
    setupToken = token;
    
    // 測試 Token 是否有效（嘗試呼叫 health endpoint）
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            isAuthenticated = true;
            return { success: true };
        }
    } catch (error) {
        console.error('Token verification failed:', error);
    }
    
    return { success: false, error: 'Token 驗證失敗' };
}

// 生成名片
export async function createCard(formData) {
    if (!isAuthenticated || !setupToken) {
        throw new Error('未授權：請先驗證 SETUP_TOKEN');
    }
    
    // 驗證必填欄位
    const errors = validateFormData(formData);
    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    }
    
    // 構建 API 請求資料
    const cardData = buildCardData(formData);
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/cards`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${setupToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cardType: formData.cardType,
                cardData: cardData
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || error.message || '創建失敗');
        }
        
        const result = await response.json();
        return result.data || result;
        
    } catch (error) {
        console.error('Create card error:', error);
        throw error;
    }
}

// 驗證表單資料
function validateFormData(formData) {
    const errors = [];
    
    // 姓名（中英文必填）
    if (!formData.name_zh || !formData.name_en) {
        errors.push('姓名（中英文）為必填欄位');
    }
    
    // Email 必填
    if (!formData.email) {
        errors.push('Email 為必填欄位');
    } else if (!isValidEmail(formData.email)) {
        errors.push('Email 格式不正確');
    }
    
    // 職稱雙語一致性
    if ((formData.title_zh && !formData.title_en) || (!formData.title_zh && formData.title_en)) {
        errors.push('職稱請同時填寫中英文，或都不填寫');
    }
    
    // 問候語雙語一致性
    const greetingsZh = formData.greetings_zh ? formData.greetings_zh.split('\n').filter(g => g.trim()) : [];
    const greetingsEn = formData.greetings_en ? formData.greetings_en.split('\n').filter(g => g.trim()) : [];
    
    if ((greetingsZh.length > 0 && greetingsEn.length === 0) ||
        (greetingsZh.length === 0 && greetingsEn.length > 0)) {
        errors.push('問候語請同時填寫中英文，或都不填寫');
    }
    
    return errors;
}

// 構建名片資料
function buildCardData(formData) {
    const cardData = {
        name: {
            zh: formData.name_zh,
            en: formData.name_en
        },
        email: formData.email
    };
    
    // 職稱（雙語）
    if (formData.title_zh && formData.title_en) {
        cardData.title = {
            zh: formData.title_zh,
            en: formData.title_en
        };
    }
    
    // 部門（單語）
    if (formData.department) {
        cardData.department = formData.department;
    }

    // 公務電話
    if (formData.phone) {
        cardData.phone = formData.phone;
    }

    // 手機
    if (formData.mobile) {
        cardData.mobile = formData.mobile;
    }

    // 大頭貼
    if (formData.avatar_url) {
        cardData.avatar = formData.avatar_url;
    }

    // 地址（雙語）
    if (formData.address) {
        cardData.address = formData.address;
    }
    
    // 問候語（雙語）
    const greetingsZh = formData.greetings_zh ? formData.greetings_zh.split('\n').filter(g => g.trim()) : [];
    const greetingsEn = formData.greetings_en ? formData.greetings_en.split('\n').filter(g => g.trim()) : [];
    
    if (greetingsZh.length > 0 && greetingsEn.length > 0) {
        cardData.greetings = {
            zh: greetingsZh,
            en: greetingsEn
        };
    }
    
    // 社群連結
    if (formData.social_note) {
        cardData.socialLinks = {
            email: `mailto:${formData.email}`,
            socialNote: formData.social_note
        };
    }
    
    return cardData;
}

// Email 驗證
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// 儲存到歷史記錄
export function saveToHistory(uuid, name) {
    try {
        const history = JSON.parse(localStorage.getItem('card-history') || '[]');
        history.unshift({
            uuid,
            name,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('card-history', JSON.stringify(history.slice(0, 10)));
    } catch (error) {
        console.error('Failed to save history:', error);
    }
}

// 取得歷史記錄
export function getHistory() {
    try {
        return JSON.parse(localStorage.getItem('card-history') || '[]');
    } catch (error) {
        console.error('Failed to get history:', error);
        return [];
    }
}
