/**
 * 雙語 NFC 數位名片核心函數庫
 * 提供編碼優化、雙語解析、語言切換等核心功能
 */

// 全域變數
let currentLanguage = 'zh';
let currentData = null;

/**
 * 緊湊格式編碼 - 優化版本
 */
function encodeCompact(data) {
    const compact = [
        data.name || '',
        data.title || '',
        data.department || '',
        data.email || '',
        data.phone || '',
        data.avatar || '',
        (data.greetings || []).join(','),
        data.socialNote || ''
    ].join('|');
    
    return btoa(encodeURIComponent(compact))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * 緊湊格式解碼
 */
function decodeCompact(encoded) {
    try {
        const padding = '='.repeat((4 - encoded.length % 4) % 4);
        const compact = decodeURIComponent(atob(
            encoded.replace(/-/g, '+').replace(/_/g, '/') + padding
        ));
        
        const parts = compact.split('|');
        return {
            name: parts[0] || '',
            title: parts[1] || '',
            department: parts[2] || '',
            email: parts[3] || '',
            phone: parts[4] || '',
            avatar: parts[5] || '',
            greetings: parts[6] ? parts[6].split(',') : [],
            socialNote: parts[7] || ''
        };
    } catch (error) {
        console.error('解碼失敗:', error);
        return null;
    }
}

/**
 * 解析雙語字串
 */
function parseBilingual(value) {
    if (!value) return { zh: '', en: '' };
    
    if (value.includes('~')) {
        const [zh, en] = value.split('~').map(s => s.trim());
        return { zh: zh || '', en: en || '' };
    }
    
    return { zh: value, en: value };
}

/**
 * 根據語言獲取文字
 */
function getLocalizedText(value, lang = 'zh') {
    const parsed = parseBilingual(value);
    return lang === 'en' ? parsed.en : parsed.zh;
}

/**
 * 切換語言
 */
function switchLanguage(lang) {
    if (!currentData) return;
    
    currentLanguage = lang;
    document.documentElement.lang = lang;
    
    renderBilingualCard(currentData, lang);
    updateLanguageButton(lang);
    updatePageTitle(lang);
    
    // 更新界面文字
    if (typeof updateUIText === 'function') {
        updateUIText(lang);
    }
}

/**
 * 更新語言按鈕
 */
function updateLanguageButton(lang) {
    const button = document.getElementById('langSwitch');
    if (button) {
        button.textContent = lang === 'zh' ? '🇺🇸 EN' : '🇹🇼 中';
        button.title = lang === 'zh' ? 'Switch to English' : '切換到中文';
    }
}

/**
 * 更新頁面標題
 */
function updatePageTitle(lang) {
    const titleMap = {
        zh: '數位名片 - 數位發展部',
        en: 'Digital Business Card - Ministry of Digital Affairs'
    };
    document.title = titleMap[lang] || titleMap.zh;
}

/**
 * 部門翻譯字典
 */
const departmentTranslations = {
    '數位策略司': 'Department of Digital Strategy',
    '數位政府司': 'Department of Digital Service',
    '資源管理司': 'Department of Resource Management', 
    '韌性建設司': 'Department of Communications and Cyber Resilience',
    '數位國際司': 'Department of International Cooperation',
    '資料創新司': 'Department of Data Innovation',
    '秘書處': 'Secretariat',
    '人事處': 'Department of Personnel',
    '政風處': 'Department of Civil Service Ethics',
    '主計處': 'Department of Budget, Accounting and Statistics',
    '資訊處': 'Department of Information Management',
    '法制處': 'Department of Legal Affairs',
    '部長室': "Minister's Office",
    '政務次長室': "Deputy Minister's Office",
    '常務次長室': "Administrative Deputy Minister's Office",
    '主任秘書室': "Chief Secretary's Office"
};

/**
 * 翻譯部門名稱
 */
function translateDepartment(department, lang) {
    if (lang === 'en' && departmentTranslations[department]) {
        return departmentTranslations[department];
    }
    return department;
}

/**
 * 處理雙語問候語
 */
function processBilingualGreetings(greetings, lang) {
    if (!greetings || greetings.length === 0) return ['歡迎認識我！'];
    
    return greetings.map(greeting => getLocalizedText(greeting, lang));
}

/**
 * 渲染雙語名片
 */
function renderBilingualCard(data, lang = 'zh') {
    const name = getLocalizedText(data.name, lang);
    const title = getLocalizedText(data.title, lang);
    const department = translateDepartment(data.department, lang);
    const greetings = processBilingualGreetings(data.greetings, lang);
    
    updateElement('userName', name);
    updateElement('userTitle', title);
    updateElement('userDepartment', department);
    updateElement('userEmail', data.email);
    updateElement('userPhone', data.phone);
    
    if (data.avatar) {
        updateElement('userAvatar', '', 'src', data.avatar);
    }
    
    // 更新問候語並重新啟動打字機效果
    if (greetings && greetings.length > 0) {
        window.currentGreetings = greetings;
        window.currentGreetingIndex = 0;
        updateElement('greetings', greetings[0]);
        
        // 重新啟動打字機效果
        if (typeof startGreetingAnimation === 'function') {
            startGreetingAnimation();
        }
    }
    
    if (data.socialNote) {
        updateElement('socialInfo', data.socialNote);
    }
    
    // 檢查是否為新光大樓版本
    const isXinyiBuilding = window.location.pathname.includes('index1-bilingual') || 
                           window.location.pathname.includes('index1.html');
    const building = isXinyiBuilding ? 'xinyi' : 'yanping';
    
    updateOrganizationInfo(lang, building);
}

/**
 * 更新 DOM 元素
 */
function updateElement(id, content, attr = null, value = null) {
    const element = document.getElementById(id);
    if (element) {
        if (attr && value) {
            element.setAttribute(attr, value);
        } else {
            element.textContent = content;
        }
    }
}

/**
 * 更新組織資訊
 */
function updateOrganizationInfo(lang, building = 'yanping') {
    const orgInfo = {
        zh: {
            name: '數位發展部',
            yanping: '台北市中正區延平南路143號',
            xinyi: '台北市中正區忠孝西路一段６６號（１７、１９樓）'
        },
        en: {
            name: 'Ministry of Digital Affairs',
            yanping: '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan',
            xinyi: '66 Zhongxiao W. Rd. Sec. 1, Zhongzheng Dist., Taipei City, Taiwan (17F, 19F)'
        }
    };
    
    const info = orgInfo[lang] || orgInfo.zh;
    updateElement('orgName', info.name);
    updateElement('orgAddress', info[building] || info.yanping);
}

/**
 * 生成雙語 vCard
 */
function generateBilingualVCard(data, lang = 'zh') {
    const name = getLocalizedText(data.name, lang);
    const title = getLocalizedText(data.title, lang);
    
    const nameParts = lang === 'zh' && name.length <= 4 ? 
        [name.charAt(0), name.slice(1)] : 
        name.split(' ');
    
    // 檢查是否為新光大樓版本
    const isXinyiBuilding = window.location.pathname.includes('index1-bilingual') || 
                           window.location.pathname.includes('index1.html');
    
    const orgInfo = {
        zh: { 
            name: '數位發展部', 
            address: isXinyiBuilding ? 
                '台北市中正區忠孝西路一段６６號（１７、１９樓）' : 
                '台北市中正區延平南路143號'
        },
        en: { 
            name: 'Ministry of Digital Affairs', 
            address: isXinyiBuilding ? 
                '66 Zhongxiao W. Rd. Sec. 1, Zhongzheng Dist., Taipei City, Taiwan (17F, 19F)' : 
                '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan'
        }
    };
    
    const org = orgInfo[lang] || orgInfo.zh;
    
    const department = translateDepartment(data.department, lang);
    
    // 處理雙語問候語，只保留當前語言
    let greetingNote = '';
    if (data.greetings && data.greetings.length > 0) {
        const localizedGreetings = data.greetings.map(greeting => getLocalizedText(greeting, lang));
        greetingNote = `NOTE;CHARSET=UTF-8:${localizedGreetings.join(' ')}`;
    }
    
    const vcard = `BEGIN:VCARD
VERSION:3.0
PRODID:-//moda//NFC Digital Business Card//EN
FN;CHARSET=UTF-8:${name}
N;CHARSET=UTF-8:${nameParts[0] || ''};${nameParts[1] || ''};;;
ORG;CHARSET=UTF-8:${org.name};${department}
TITLE;CHARSET=UTF-8:${title}
EMAIL;TYPE=work:${data.email || ''}
TEL;TYPE=work,voice:${data.phone || ''}
ADR;TYPE=work;CHARSET=UTF-8:;;${org.address};;;;Taiwan
${data.avatar ? `PHOTO;TYPE=JPEG:${data.avatar}` : ''}
${greetingNote}
REV:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
END:VCARD`.replace(/\n\n/g, '\n');

    return vcard;
}

/**
 * 下載 vCard
 */
function downloadBilingualVCard(data, lang = 'zh') {
    const vcard = generateBilingualVCard(data, lang);
    const name = getLocalizedText(data.name, lang);
    const filename = `${name.replace(/\s+/g, '_')}_contact.vcf`;
    
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
}

/**
 * 計算容量
 */
function calculateCapacity(data) {
    const encoded = encodeCompact(data);
    return {
        encoded: encoded,
        size: encoded.length,
        remaining: 492 - encoded.length,
        percentage: Math.round((encoded.length / 492) * 100)
    };
}

/**
 * 切換語言（按鈕事件）
 */
function toggleLanguage() {
    const newLang = currentLanguage === 'zh' ? 'en' : 'zh';
    switchLanguage(newLang);
}

/**
 * 初始化頁面
 */
function initializePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    
    if (data) {
        currentData = decodeCompact(data);
        if (currentData) {
            renderBilingualCard(currentData, currentLanguage);
        }
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', initializePage);