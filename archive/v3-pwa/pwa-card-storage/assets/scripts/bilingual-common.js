/**
 * 雙語 NFC 數位名片核心函數庫
 * 提供編碼優化、雙語解析、語言切換等核心功能
 * 包含標準化名片類型識別
 */

// 標準化名片類型識別 - 全域通用
const CARD_TYPES = {
  INDEX: 'index',
  INDEX1: 'index1', 
  PERSONAL: 'personal',
  BILINGUAL: 'bilingual',
  BILINGUAL1: 'bilingual1',
  PERSONAL_BILINGUAL: 'personal-bilingual',
  EN: 'en',
  EN1: 'en1',
  PERSONAL_EN: 'personal-en'
};

function identifyCardType(data) {
  if (typeof data === 'string') data = { url: data };
  
  if (data.url) {
    const url = data.url.toLowerCase().trim();
    if (url.includes('index1-bilingual.html')) return CARD_TYPES.BILINGUAL1;
    if (url.includes('index-bilingual-personal.html')) return CARD_TYPES.PERSONAL_BILINGUAL;
    if (url.includes('index-bilingual.html')) return CARD_TYPES.BILINGUAL;
    // 修復：處理不帶 .html 的 URL
    if (url.includes('index1-bilingual?') || url.includes('index1-bilingual&') || url.endsWith('index1-bilingual')) return CARD_TYPES.BILINGUAL1;
    if (url.includes('index-bilingual-personal?') || url.includes('index-bilingual-personal&') || url.endsWith('index-bilingual-personal')) return CARD_TYPES.PERSONAL_BILINGUAL;
    if (url.includes('index-bilingual?') || url.includes('index-bilingual&') || url.endsWith('index-bilingual')) return CARD_TYPES.BILINGUAL;
    if (url.includes('index1-en.html')) return CARD_TYPES.EN1;
    if (url.includes('index-personal-en.html')) return CARD_TYPES.PERSONAL_EN;
    if (url.includes('index-en.html')) return CARD_TYPES.EN;
    if (url.includes('index-personal.html')) return CARD_TYPES.PERSONAL;
    if (url.includes('index1.html')) return CARD_TYPES.INDEX1;
    if (url.includes('index.html')) return CARD_TYPES.INDEX;
  }
  
  const isBilingual = data.name?.includes('~') || data.title?.includes('~');
  const isGov = data.organization && data.department;
  const isShinGuang = data.address?.includes('新光') || data.address?.includes('松仁路');
  
  if (isBilingual) {
    return isGov ? (isShinGuang ? CARD_TYPES.BILINGUAL1 : CARD_TYPES.BILINGUAL) : CARD_TYPES.PERSONAL_BILINGUAL;
  }
  
  return isGov ? (isShinGuang ? CARD_TYPES.INDEX1 : CARD_TYPES.INDEX) : CARD_TYPES.PERSONAL;
}

// 全域變數
// 偵測瀏覽器語言偏好，預設為中文
function detectBrowserLanguage() {
    // 檢查是否有儲存的使用者偏好
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang && ['zh', 'en'].includes(savedLang)) {
        return savedLang;
    }
    
    // 否則偵測瀏覽器語言
    const userLang = (navigator.language || navigator.userLanguage || navigator.browserLanguage || '').toLowerCase();
    const detectedLang = /^en(-[a-z]{2})?$/.test(userLang) ? 'en' : 'zh';
    
    // 設定 HTML 語言屬性
    document.documentElement.lang = detectedLang === 'zh' ? 'zh-TW' : 'en';
    
    return detectedLang;
}

let currentLanguage = detectBrowserLanguage();
let currentData = null;

/**
 * 緊湊格式編碼 - PWA-23 資料完整性終極修復版本
 * 確保問候語保持雙語字串格式，防止資料截斷
 */
function encodeCompact(data) {
    // 深度複製以避免修改原始資料
    const processedData = JSON.parse(JSON.stringify(data));
    
    // 確保問候語格式一致性 - 保持雙語字串格式
    if (processedData.greetings) {
        if (!Array.isArray(processedData.greetings)) {
            processedData.greetings = [processedData.greetings];
        }
        
        processedData.greetings = processedData.greetings.map(greeting => {
            // 如果是物件格式，轉換為雙語字串格式
            if (typeof greeting === 'object' && greeting !== null) {
                if (greeting.zh && greeting.en) {
                    return `${greeting.zh}~${greeting.en}`;
                }
                // 如果只有單一語言，直接轉換
                const firstValue = Object.values(greeting).find(v => v && typeof v === 'string');
                return firstValue ? String(firstValue) : String(greeting);
            }
            // 確保是字串格式，保持雙語格式
            const greetingStr = String(greeting);
            // 防止 [object Object] 問題
            if (greetingStr === '[object Object]') {
                return '歡迎認識我！~Nice to meet you!';
            }
            return greetingStr;
        }).filter(g => g && g.trim() && g !== '[object Object]');
    }
    
    // 如果沒有有效問候語，設定預設值
    if (!processedData.greetings || processedData.greetings.length === 0) {
        processedData.greetings = ['歡迎認識我！~Nice to meet you!'];
    }
    
    const compact = [
        String(processedData.name || ''),
        String(processedData.title || ''),
        String(processedData.department || ''),
        String(processedData.email || ''),
        String(processedData.phone || ''),
        String(processedData.mobile || ''),
        String(processedData.avatar || ''),
        String(processedData.greetings.join(',')),
        String(processedData.socialNote || '')
    ].join('|');
    
    try {
        const encoded = btoa(encodeURIComponent(compact))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        
        return encoded;
    } catch (error) {
        throw new Error('編碼失敗: ' + error.message);
    }
}

/**
 * 緊湊格式解碼 - PWA-23 資料完整性修復版本
 */
function decodeCompact(encoded) {
    try {
        // 第一步：Base64 解碼（先處理 URL 安全字符）
        const padding = '='.repeat((4 - encoded.length % 4) % 4);
        const base64Fixed = encoded.replace(/-/g, '+').replace(/_/g, '/') + padding;
        const base64Decoded = atob(base64Fixed);
        
        // 第二步：URL 解碼
        const compact = decodeURIComponent(base64Decoded);
        
            const parts = compact.split('|');
        
        // 檢查是否為舊版本格式（8個欄位，沒有手機號碼）
        if (parts.length === 8) {
            const result = {
                name: parts[0] || '',
                title: parts[1] || '',
                department: parts[2] || '',
                email: parts[3] || '',
                phone: parts[4] || '',
                mobile: '', // 舊版本沒有手機號碼
                avatar: parts[5] || '',
                greetings: parts[6] ? parts[6].split(',').filter(g => g.trim()) : [],
                socialNote: parts[7] || ''
            };
            return result;
        }
        
        // 新版本格式（9個欄位，包含手機號碼）
        if (parts.length >= 9) {
            const result = {
                name: parts[0] || '',
                title: parts[1] || '',
                department: parts[2] || '',
                email: parts[3] || '',
                phone: parts[4] || '',
                mobile: parts[5] || '',
                avatar: parts[6] || '',
                greetings: parts[7] ? parts[7].split(',').filter(g => g.trim()) : [],
                socialNote: parts[8] || ''
            };
            return result;
        }
        
        // 處理不完整的資料
        const result = {
            name: parts[0] || '',
            title: parts[1] || '',
            department: parts[2] || '',
            email: parts[3] || '',
            phone: parts[4] || '',
            mobile: parts[5] || '',
            avatar: parts[6] || '',
            greetings: parts[7] ? parts[7].split(',').filter(g => g.trim()) : ['歡迎認識我！~Nice to meet you!'],
            socialNote: parts[8] || ''
        };
        return result;
        
    } catch (error) {
        return null;
    }
}

/**
 * 解析雙語字串
 */
function parseBilingual(value) {
    if (!value) return { zh: '', en: '' };
    
    // 確保 value 是字串
    const strValue = String(value);
    
    if (strValue.includes('~')) {
        const [zh, en] = strValue.split('~').map(s => s.trim());
        return { zh: zh || '', en: en || '' };
    }
    
    return { zh: strValue, en: strValue };
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
    document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';
    
    // 儲存使用者語言偏好
    localStorage.setItem('preferredLanguage', lang);
    
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
        if (lang === 'zh') {
            button.innerHTML = '<span style="margin-right:4px;">🇺🇸</span> EN';
            button.title = 'Switch to English';
        } else {
            button.innerHTML = '<span style="margin-right:4px;">🇹🇼</span> 中';
            button.title = '切換到中文';
        }
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
 * 處理雙語問候語 - PWA-23 資料一致性終極修復版本
 * 僅在顯示時選擇語言，不改變原始資料格式
 */
function processBilingualGreetings(greetings, lang) {
    if (!greetings || greetings.length === 0) {
        const fallback = lang === 'en' ? ['Nice to meet you!'] : ['歡迎認識我！'];
        return fallback;
    }
    
    // 確保輸入是陣列
    if (!Array.isArray(greetings)) {
        greetings = [greetings];
    }
    
    const processed = greetings.map(greeting => {
        // 防護：如果收到物件格式，先轉換為雙語字串格式
        if (typeof greeting === 'object' && greeting !== null) {
            if (greeting.zh && greeting.en) {
                greeting = `${greeting.zh}~${greeting.en}`;
            } else {
                const firstValue = Object.values(greeting).find(v => v && typeof v === 'string');
                greeting = firstValue ? String(firstValue) : String(greeting);
            }
        }
        
        // 確保是字串後再處理語言選擇
        const greetingStr = String(greeting);
        if (greetingStr === '[object Object]') {
            return lang === 'en' ? 'Nice to meet you!' : '歡迎認識我！';
        }
        
        // 處理雙語字串格式 "中文~English"
        if (greetingStr.includes('~')) {
            const [zh, en] = greetingStr.split('~').map(s => s.trim());
            const result = lang === 'en' ? (en || zh) : (zh || en);
            return result;
        }
        
        // 單語問候語直接返回
        return greetingStr;
    }).filter(g => g && g.trim());
    
    return processed.length > 0 ? processed : (lang === 'en' ? ['Nice to meet you!'] : ['歡迎認識我！']);
}

/**
 * 渲染雙語名片 - 資料一致性修復版本
 */
function renderBilingualCard(data, lang = 'zh') {
    const name = getLocalizedText(data.name, lang);
    const title = getLocalizedText(data.title, lang);
    const department = translateDepartment(data.department, lang);
    
    const greetings = processBilingualGreetings(data.greetings, lang);
    
    updateElement('userName', name);
    updateElement('userTitle', title);
    updateElement('userDepartment', department);
    if (data.email) {
        updateElement('userEmail', data.email);
        const emailLink = document.getElementById('userEmail');
        if (emailLink) {
            emailLink.href = `mailto:${data.email}`;
        }
    }
    
    // 處理電話顯示
    const phoneItem = document.getElementById('phoneItem');
    if (data.phone) {
        updateElement('userPhone', data.phone);
        const phoneLink = document.getElementById('userPhone');
        if (phoneLink) {
            phoneLink.href = `tel:${data.phone.replace(/[^0-9+]/g, '')}`;
        }
        if (phoneItem) phoneItem.style.display = 'flex';
    } else {
        if (phoneItem) phoneItem.style.display = 'none';
    }
    
    // 處理手機號碼顯示
    const mobileItem = document.getElementById('mobileItem');
    if (data.mobile) {
        updateElement('userMobile', data.mobile);
        const mobileLink = document.getElementById('userMobile');
        if (mobileLink) {
            mobileLink.href = `tel:${data.mobile.replace(/[^0-9+]/g, '')}`;
        }
        if (mobileItem) mobileItem.style.display = 'flex';
    } else {
        if (mobileItem) mobileItem.style.display = 'none';
    }
    
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
    
    // 處理社群媒體資訊
    if (data.socialNote && typeof processSocialLinks === 'function') {
        const socialInfo = document.getElementById('socialInfo');
        const socialContent = document.getElementById('socialInfoContent');
        if (socialInfo && socialContent) {
            // 安全清理現有內容
            while (socialContent.firstChild) {
                socialContent.removeChild(socialContent.firstChild);
            }
            // 安全處理社群連結
            const socialLinks = processSocialLinks(data.socialNote, lang);
            if (socialLinks) {
                socialContent.appendChild(socialLinks);
            }
            socialInfo.style.display = 'block';
        }
    } else {
        const socialInfo = document.getElementById('socialInfo');
        if (socialInfo) {
            socialInfo.style.display = 'none';
        }
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
            yanping: '臺北市中正區延平南路143號',
            xinyi: '臺北市中正區忠孝西路一段６６號（１７、１９樓）'
        },
        en: {
            name: 'Ministry of Digital Affairs',
            yanping: '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan',
            xinyi: '66 Zhongxiao W. Rd. Sec. 1, Zhongzheng Dist., Taipei City, Taiwan (17F, 19F)'
        }
    };
    
    const info = orgInfo[lang] || orgInfo.zh;
    
    // 確保組織和地址元素存在且正確更新
    const orgElement = document.getElementById('orgName');
    const addressElement = document.getElementById('orgAddress');
    
    if (orgElement) {
        orgElement.textContent = info.name;
    }
    
    if (addressElement) {
        addressElement.textContent = info[building] || info.yanping;
    }
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
                '臺北市中正區忠孝西路一段６６號（１７、１９樓）' : 
                '臺北市中正區延平南路143號'
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
    
    // 處理社群連結資訊
    let socialNote = '';
    if (data.socialNote) {
        const socialText = lang === 'zh' ? '社群連結' : 'Social Links';
        socialNote = `\nNOTE;CHARSET=UTF-8:${socialText}: ${data.socialNote.replace(/\n/g, ' | ')}`;
    }
    
    const prodId = lang === 'zh' ? 
        'PRODID:-//moda//NFC 數位名片//ZH' : 
        'PRODID:-//moda//NFC Digital Business Card//EN';
    
    const vcard = `BEGIN:VCARD
VERSION:3.0
${prodId}
FN;CHARSET=UTF-8:${name}
N;CHARSET=UTF-8:${nameParts[0] || ''};${nameParts[1] || ''};;;
ORG;CHARSET=UTF-8:${org.name};${department}
TITLE;CHARSET=UTF-8:${title}
EMAIL;TYPE=work:${data.email || ''}
${data.phone ? `TEL;TYPE=work,voice:${data.phone}` : ''}
${data.mobile ? `TEL;TYPE=cell,voice:${data.mobile}` : ''}
ADR;TYPE=work;CHARSET=UTF-8:;;${org.address};;;;Taiwan
${data.avatar ? `PHOTO;TYPE=JPEG:${data.avatar}` : ''}
${greetingNote}${socialNote}
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
    setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const data = urlParams.get('data');
        
        if (!data) {
            const loadingState = document.getElementById('loading-state');
            const accessDenied = document.getElementById('access-denied');
            if (loadingState) loadingState.style.display = 'none';
            if (accessDenied) accessDenied.style.display = 'block';
            return;
        }
        
        try {
            currentData = decodeCompact(data);
            if (!currentData || !currentData.name) {
                throw new Error('名片資料格式不正確');
            }
            
            const loadingState = document.getElementById('loading-state');
            const cardContainer = document.getElementById('card-container');
            const accessDenied = document.getElementById('access-denied');
            
            if (loadingState) loadingState.style.display = 'none';
            if (accessDenied) accessDenied.style.display = 'none';
            if (cardContainer) cardContainer.style.display = 'block';
            
            renderBilingualCard(currentData, currentLanguage);
            updateUIText(currentLanguage);
            updateLanguageButton(currentLanguage);
            
            // 生成 QR 碼
            if (typeof generateQRCode === 'function') {
                generateQRCode();
            }
            
            // 處理頭像
            const avatar = document.getElementById('userAvatar');
            if (avatar && currentData.avatar) {
                avatar.src = currentData.avatar;
                avatar.style.display = 'block';
                avatar.onerror = function() {
                    this.style.display = 'none';
                };
            } else if (avatar) {
                avatar.style.display = 'none';
            }
            
            // 處理社群資訊
            if (currentData.socialNote && typeof processSocialLinks === 'function') {
                const socialInfo = document.getElementById('socialInfo');
                const socialContent = document.getElementById('socialInfoContent');
                if (socialInfo && socialContent) {
                    while (socialContent.firstChild) {
                        socialContent.removeChild(socialContent.firstChild);
                    }
                    const socialLinks = processSocialLinks(currentData.socialNote, currentLanguage);
                    socialContent.appendChild(socialLinks);
                    socialInfo.style.display = 'block';
                }
            }
            
            // 啟動問候語動畫
            setTimeout(() => {
                if (typeof startGreetingAnimation === 'function') {
                    startGreetingAnimation();
                }
            }, 1000);
            
            // 設定 PWA 按鈕功能
            if (typeof setupPWASaveButton === 'function') {
                setupPWASaveButton(currentData);
            }
            
        } catch (error) {
            const loadingState = document.getElementById('loading-state');
            const accessDenied = document.getElementById('access-denied');
            if (loadingState) loadingState.style.display = 'none';
            if (accessDenied) accessDenied.style.display = 'block';
        }
        
        // 確保語言按鈕與偵測到的語言同步
        updateLanguageButton(currentLanguage);
    }, 800);
}

/**
 * 安全創建社群連結元素
 */
function createSocialElement(platform, url, buttonText, brandColor, displayUrl = '') {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 8px; margin: 6px 0;';
    
    const label = document.createElement('span');
    label.style.cssText = `color: ${brandColor}; font-weight: 500;`;
    label.textContent = platform + (displayUrl ? `: ${displayUrl}` : '');
    
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.className = 'social-link';
    link.style.cssText = `background: ${brandColor}; color: white; padding: 4px 12px; border-radius: 16px; text-decoration: none; font-size: 0.85em; font-weight: 500;`;
    link.textContent = buttonText;
    
    container.appendChild(label);
    container.appendChild(link);
    return container;
}

/**
 * 處理社群媒體連結 - 安全版本
 */
function processSocialLinks(text, lang = 'zh') {
    if (!text || !text.trim()) return document.createDocumentFragment();
    
    const buttonTexts = {
        zh: {
            facebook: '👥 造訪頁面', instagram: '❤️ 追蹤', lineOfficial: '🏢 加入官方',
            linePersonal: '👤 加好友', github: '⭐ 造訪', twitter: '👥 追蹤',
            linkedin: '🤝 連結', youtube: '🔔 訂閱', discord: '🏠 加入'
        },
        en: {
            facebook: '👥 Visit Page', instagram: '❤️ Follow', lineOfficial: '🏢 Add Official',
            linePersonal: '👤 Add Friend', github: '⭐ Visit', twitter: '👥 Follow',
            linkedin: '🤝 Connect', youtube: '🔔 Subscribe', discord: '🏠 Join'
        }
    };
    
    const texts = buttonTexts[lang] || buttonTexts.zh;
    const fragment = document.createDocumentFragment();
    
    text.split('\n').filter(line => line.trim()).forEach(line => {
        const trimmed = line.trim();
        let element = null;
        
        if (/^FB:/i.test(trimmed)) {
            const match = trimmed.match(/FB:\s*([\w\.-@\/]+)/i);
            if (match) {
                let url = match[1];
                if (url.startsWith('@')) url = `fb.com/${url.substring(1)}`;
                else if (!url.includes('.com')) url = `fb.com/${url}`;
                const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                element = createSocialElement('📘 Facebook', fullUrl, texts.facebook, '#1877f2');
            }
        } else if (/^IG:/i.test(trimmed)) {
            const match = trimmed.match(/IG:\s*([\w\.-@\/]+)/i);
            if (match) {
                let url = match[1];
                if (url.startsWith('@')) url = `instagram.com/${url.substring(1)}`;
                else if (!url.includes('.com')) url = `instagram.com/${url}`;
                const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                element = createSocialElement('📷 Instagram', fullUrl, texts.instagram, 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)');
            }
        } else if (/^LINE:/i.test(trimmed)) {
            const match = trimmed.match(/LINE:\s*([\w\.-@\/]+)/i);
            if (match) {
                const url = match[1];
                const isOfficial = url.startsWith('@');
                const fullUrl = `https://line.me/ti/p/~${url}`;
                const buttonText = isOfficial ? texts.lineOfficial : texts.linePersonal;
                element = createSocialElement('💬 LINE', fullUrl, buttonText, '#00B900', url);
            }
        } else if (/^GitHub:/i.test(trimmed)) {
            const match = trimmed.match(/GitHub:\s*([\w\.-@\/]+)/i);
            if (match) {
                let url = match[1];
                if (url.startsWith('@')) url = `github.com/${url.substring(1)}`;
                else if (!url.includes('.com')) url = `github.com/${url}`;
                const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                element = createSocialElement('🐙 GitHub', fullUrl, texts.github, '#24292e');
            }
        } else if (/^(Twitter|X):/i.test(trimmed)) {
            const match = trimmed.match(/(Twitter|X):\s*([\w\.-@\/]+)/i);
            if (match) {
                let url = match[2];
                if (url.startsWith('@')) url = `twitter.com/${url.substring(1)}`;
                else if (!url.includes('.com')) url = `twitter.com/${url}`;
                const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                element = createSocialElement('🐦 Twitter', fullUrl, texts.twitter, '#1da1f2');
            }
        } else if (/^LinkedIn:/i.test(trimmed)) {
            const match = trimmed.match(/LinkedIn:\s*([\w\.-@\/\u4e00-\u9fff-]+)/i);
            if (match) {
                let url = match[1];
                if (!url.includes('.com')) url = `linkedin.com/in/${url}`;
                const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                element = createSocialElement('💼 LinkedIn', fullUrl, texts.linkedin, '#0077b5');
            }
        } else if (/^YouTube:/i.test(trimmed)) {
            const match = trimmed.match(/YouTube:\s*([\w\.-@\/]+)/i);
            if (match) {
                let url = match[1];
                if (url.startsWith('@')) url = `youtube.com/${url}`;
                else if (!url.includes('.com')) url = `youtube.com/c/${url}`;
                const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                element = createSocialElement('📺 YouTube', fullUrl, texts.youtube, '#ff0000');
            }
        } else if (/^Discord:/i.test(trimmed)) {
            const match = trimmed.match(/Discord:\s*([\w\.-@\/]+)/i);
            if (match) {
                const url = match[1];
                const fullUrl = url.startsWith('http') ? url : `https://discord.gg/${url}`;
                element = createSocialElement('🎮 Discord', fullUrl, texts.discord, '#5865f2');
            }
        }
        
        if (element) fragment.appendChild(element);
    });
    
    return fragment;
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', initializePage);
