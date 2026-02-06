import { tapCard, readCard } from './api.js';
import { getLocalizedText, getLocalizedArray } from './utils/bilingual.js';
import { initIcons } from './icons-minimal.js';

const DEBUG = window.location.hostname === 'localhost';

// Error message constants for v4.1.0 & v4.2.0
const ERROR_MESSAGES = {
  'rate_limited': '請求過於頻繁，請稍後再試',
  'session_budget_exceeded': '此名片已達到使用上限，請聯絡管理員',
  'daily_budget_exceeded': '今日使用次數已達上限，請明天再試',
  'monthly_budget_exceeded': '本月使用次數已達上限,請下月再試'
};

/**
 * Validate QR Code input
 * @param {string} text - QR Code content
 * @throws {Error} If input is invalid
 */
function validateQRInput(text) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
        throw new Error('QR Code text cannot be empty');
    }
    if (text.length > 2953) {
        throw new Error('QR Code text too long (max 2953 characters)');
    }
}

let scene, camera, renderer, mesh, grid;
let currentLanguage = 'zh';
let typewriterTimeout = null;
let currentCardData = null; // 儲存當前名片資料供 vCard 下載使用

/**
 * Device detection function for device-aware vCard button
 * @returns {boolean} true if mobile device (iOS/Android/tablet), false for desktop
 */
function isMobileDevice() {
    // Method 1: User Agent detection
    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA = /iphone|ipad|ipod|android|mobile/i.test(ua);

    // Method 2: Touch capability + screen size
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;

    // Return true if either UA indicates mobile OR (has touch AND small screen)
    return isMobileUA || (hasTouch && isSmallScreen);
}

// 組織與部門雙語對照表（來自 v3 bilingual-common.js）
const ORG_DEPT_MAPPING = {
    organization: {
        zh: '數位發展部',
        en: 'Ministry of Digital Affairs'
    },
    departments: {
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
    }
};

/**
 * Update vCard button text and icon (unified as "Add to Contacts")
 */
function updateVCardButton() {
    const i18nKey = 'add_to_contacts';
    const iconName = 'user-plus';

    // Update button text and data-i18n attribute
    const vCardText = document.getElementById('vcard-text');
    if (vCardText) {
        vCardText.setAttribute('data-i18n', i18nKey);
        vCardText.textContent = i18nTexts[i18nKey][currentLanguage];
    }

    // Update icon
    const vCardIcon = document.getElementById('vcard-icon');
    if (vCardIcon) {
        vCardIcon.setAttribute('data-lucide', iconName);
    }

    // Reinitialize lucide icons to apply the new icon
    if (typeof lucide !== 'undefined') {
    }
}

function updateButtonTexts() {
    // Update vCard button first (device-aware)
    updateVCardButton();

    // 更新所有 data-i18n 元素
    const i18nElements = document.querySelectorAll('[data-i18n]');
    i18nElements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18nTexts[key]) {
            el.textContent = i18nTexts[key][currentLanguage];
        }
    });
    
    // 更新 session 資訊的預設文字（在資料載入前）
    const sessionExpiry = document.getElementById('session-expiry');
    const sessionReads = document.getElementById('session-reads');
    if (sessionExpiry && sessionExpiry.textContent.includes('--')) {
        sessionExpiry.textContent = `${i18nTexts['valid-until'][currentLanguage]}: --`;
    }
    if (sessionReads && sessionReads.textContent.includes('--')) {
        sessionReads.textContent = `${i18nTexts['shares-available'][currentLanguage]}: --`;
    }
}

// 多語言文字對照表
const i18nTexts = {
    'loading': {
        'zh': '載入名片資料...',
        'en': 'Loading Card...'
    },
    'qr-title': {
        'zh': '掃描分享名片',
        'en': 'Scan to Share'
    },
    'session-status': {
        'zh': '名片已開啟',
        'en': 'Card Active'
    },
    'add_to_contacts': {
        'zh': '加入聯絡人',
        'en': 'Add to Contacts'
    },
    'download_vcard': {
        'zh': '下載名片',
        'en': 'Download vCard'
    },
    'card-system': {
        'zh': '數位名片系統 Digital Business Card',
        'en': 'Digital Business Card System'
    },
    'desktop-hint': {
        'zh': '移動滑鼠體驗 3D 視差效果',
        'en': 'Move mouse to experience 3D parallax effect'
    },
    'transmission-feed': {
        'zh': 'Dynamic Transmission Feed',
        'en': 'Dynamic Transmission Feed'
    },
    'communication-node': {
        'zh': 'Communication Node',
        'en': 'Communication Node'
    },
    'voice-access': {
        'zh': 'Voice Access',
        'en': 'Voice Access'
    },
    'official-portal': {
        'zh': 'Official Portal',
        'en': 'Official Portal'
    },
    'security-spec': {
        'zh': '資料安全規範',
        'en': 'Security Specification'
    },
    'security-desc': {
        'zh': '雲端加密儲存，可隨時撤銷存取',
        'en': 'Cloud encrypted storage, revocable access'
    },
    'valid-until': {
        'zh': '有效期限',
        'en': 'Valid Until'
    },
    'shares-available': {
        'zh': '可分享次數',
        'en': 'Shares Available'
    },
    'hint-flip': {
        'zh': '點擊翻面',
        'en': 'Click to flip'
    },
    'skip-to-content': {
        'zh': '跳到主要內容',
        'en': 'Skip to main content'
    },
    'close-qr': {
        'zh': '關閉',
        'en': 'CLOSE'
    },
    'view-security': {
        'zh': '查看詳細安全特性',
        'en': 'View Security Features'
    },
    'desktop-hint-contacts-title': {
        'zh': '加入手機通訊錄',
        'en': 'Add to Contacts'
    },
    'desktop-hint-contacts-desc': {
        'zh': '掃描下方 QR Code，用手機開啟此頁面',
        'en': 'Scan the QR Code below to open on your phone'
    },
    'desktop-hint-qr-title': {
        'zh': '掃描 QR Code',
        'en': 'Scan QR Code'
    },
    'desktop-hint-qr-desc': {
        'zh': '使用手機相機掃描，即可加入通訊錄',
        'en': 'Use your phone camera to scan and add to contacts'
    }
};

/**
 * 顯示錯誤訊息
 */
function showError(message) {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.innerHTML = DOMPurify.sanitize(`
            <div class="error-message">
                <i data-lucide="alert-circle"></i>
                <span>${message}</span>
            </div>
        `, { ADD_ATTR: ['onclick'] });
        errorContainer.style.display = 'block';
        initIcons();
    } else {
        console.error(message);
    }
}

/**
 * 顯示通知訊息
 */
function showNotification(message, type = 'info') {
    const notificationContainer = document.getElementById('notification-container');
    if (notificationContainer) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        const icons = {
            info: 'info',
            warning: 'alert-triangle',
            success: 'check-circle',
            error: 'alert-circle'
        };

        notification.innerHTML = DOMPurify.sanitize(`
            <i data-lucide="${icons[type] || 'info'}"></i>
            <span>${message}</span>
        `, { ADD_ATTR: ['onclick'] });

        notificationContainer.appendChild(notification);
        initIcons();

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    } else {
        if (DEBUG) console.log(`[${type}] ${message}`);
    }
}

async function initApp() {
    initLoadingIcon(); // 隨機選擇載入圖示

    // Conditional Three.js initialization - only on desktop (>= 1024px)
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
        if (typeof THREE !== 'undefined') {
            setTimeout(() => initThree(), 100);
        } else {
            // Wait for Three.js to load (lazy loaded on desktop)
            const waitForThree = setInterval(() => {
                if (typeof THREE !== 'undefined') {
                    clearInterval(waitForThree);
                    initThree();
                }
            }, 100);
            // Timeout after 5 seconds if Three.js doesn't load
            setTimeout(() => clearInterval(waitForThree), 5000);
        }
    }

    const params = new URLSearchParams(window.location.search);
    const uuid = params.get('uuid');
    
    // 自動偵測語系：URL > 瀏覽器語言 > 預設中文
    if (!params.get('lang')) {
        const browserLang = navigator.language || navigator.userLanguage;
        currentLanguage = browserLang.startsWith('zh') ? 'zh' : 'en';
    } else {
        currentLanguage = params.get('lang');
    }

    // 設定 HTML lang 屬性（無障礙）
    document.documentElement.lang = currentLanguage === 'zh' ? 'zh-TW' : 'en';

    // 設定語言切換按鈕文字
    document.getElementById('lang-switch').textContent = currentLanguage === 'zh' ? 'EN' : '繁中';

    // 英文語系時自動翻面到英文面
    if (currentLanguage === 'en') {
        setTimeout(() => {
            const card = document.getElementById('card');
            if (card) {
                card.classList.add('is-flipped');
            }
        }, 100);
    }

    // 設定按鈕文字（根據語言）
    updateButtonTexts();

    if (!uuid) {
        showError(currentLanguage === 'zh' ? '錯誤：缺少名片 UUID 參數' : 'Error: Missing card UUID parameter');
        hideLoading();
        return;
    }

    try {
        await loadCard(uuid);
    } catch (error) {
        console.error('Initialization error:', error);
        showError(currentLanguage === 'zh' ? `載入失敗: ${error.message}` : `Load failed: ${error.message}`);
        hideLoading();
    }
}

async function loadCard(uuid) {
    let sessionId = null;
    let cardData = null;
    let sessionData = null;

    try {
        // 優先使用 URL 中的 session 參數
        const params = new URLSearchParams(window.location.search);
        const urlSessionId = params.get('session');

        if (urlSessionId) {
            sessionId = urlSessionId;
        } else {
            // 需要新建 session
            const tapResult = await tapCard(uuid);
            sessionId = tapResult.session_id;
        }

        // 讀取名片資料 (readCard 內部處理快取)
        const readResult = await readCard(uuid, sessionId);
        cardData = readResult.data;
        sessionData = {
            session_id: sessionId,
            expires_at: readResult.session_info.expires_at,
            reads_remaining: readResult.session_info.reads_remaining
        };

    } catch (error) {
        console.error('Error loading card:', error);

        // Use ERROR_MESSAGES for known error codes
        const errorMessage = ERROR_MESSAGES[error.code] || error.message || '載入失敗';
        showError(errorMessage);

        hideLoading();
        return;
    }

    if (cardData) {
        currentCardData = cardData; // 儲存供 vCard 下載使用
        renderCard(cardData, sessionData);

        // Check for warning (budget alerts)
        if (sessionData && sessionData.warning) {
            const banner = document.createElement('div');
            banner.className = 'warning-banner';
            const remainingText = currentLanguage === 'zh' ? `剩餘 ${sessionData.warning.remaining} 次` : `${sessionData.warning.remaining} remaining`;
            banner.innerHTML = DOMPurify.sanitize(`<i data-lucide="alert-triangle"></i><span>${sessionData.warning.message} (${remainingText})</span>`, { ADD_ATTR: ['onclick'] });
            document.body.insertBefore(banner, document.body.firstChild);
        }
    } else {
        showError(currentLanguage === 'zh' ? '無法載入名片資料' : 'Failed to load card data');
        hideLoading();
    }
}

function renderCard(cardData, sessionData) {
    renderCardFace(cardData, sessionData, 'zh', '');
    renderCardFace(cardData, sessionData, 'en', '-en');
    
    hideLoading();
    document.getElementById('main-container').classList.remove('hidden');
    
    initIcons();

    setTimeout(matchCardHeight, 100);

    // 桌面版自動生成 QR Code - Deferred to idle time
    if (window.innerWidth >= 1024) {
        requestIdleCallback(() => {
            generateQRCode('qrcode-desktop');
        }, { timeout: 2000 });
    }
}

function renderCardFace(cardData, sessionData, lang, suffix) {
    const name = getLocalizedText(cardData.name, lang);
    const title = getLocalizedText(cardData.title, lang);
    const greetings = getLocalizedArray(cardData.greetings, lang);

    // 更新頁面標題（僅正面）
    if (suffix === '') {
        const titlePrefix = lang === 'en' ? 'DB-Card' : '數位名片';
        const titleFallback = lang === 'en' ? 'Card Display' : '名片顯示';
        document.title = name ? `${titlePrefix} | ${name}` : `${titlePrefix} | ${titleFallback}`;
    }

    document.getElementById(`user-name${suffix}`).textContent = name || '---';

    // Title (conditional display)
    if (title) {
        document.getElementById(`user-title${suffix}`).style.display = 'block';
        document.getElementById(`user-title${suffix}`).textContent = title;
    } else {
        document.getElementById(`user-title${suffix}`).style.display = 'none';
    }

    // Department (conditional display with translation)
    const dept = cardData.department || '';
    if (dept) {
        let deptText;

        if (typeof dept === 'object' && dept !== null) {
            deptText = lang === 'en' ? (dept.en || dept.zh || '') : (dept.zh || dept.en || '');
        } else if (typeof dept === 'string') {
            deptText = lang === 'en' && ORG_DEPT_MAPPING.departments[dept]
                ? ORG_DEPT_MAPPING.departments[dept]
                : dept;
        } else {
            deptText = '';
        }

        if (deptText) {
            const deptEl = document.getElementById(`user-department${suffix}`);
            const deptTextEl = document.getElementById(`user-department-text${suffix}`);
            if (deptEl && deptTextEl) {
                deptEl.style.display = 'block';
                deptTextEl.textContent = deptText;
            }
        } else {
            const deptEl = document.getElementById(`user-department${suffix}`);
            if (deptEl) deptEl.style.display = 'none';
        }
    } else {
        const deptEl = document.getElementById(`user-department${suffix}`);
        if (deptEl) deptEl.style.display = 'none';
    }

    // 大頭貼處理 - 支援 Google Drive URL 轉換
    const avatarEl = document.getElementById(`user-avatar${suffix}`);
    const avatarUrl = cardData.avatar_url || cardData.avatar;
    if (avatarUrl && avatarEl) {
        let processedUrl = avatarUrl;

        const driveMatch = processedUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([^\/\?&]+)/);
        if (driveMatch) {
            const fileId = driveMatch[1];
            processedUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
        }

        avatarEl.src = processedUrl;
        avatarEl.onerror = function() {
            console.warn('Avatar failed to load:', processedUrl);
            const container = avatarEl.closest('.relative');
            if (container) container.style.display = 'none';
        };

        const container = avatarEl.closest('.relative');
        if (container) container.style.display = 'block';
    } else if (avatarEl) {
        const container = avatarEl.closest('.relative');
        if (container) container.style.display = 'none';
    }

    // Email 處理
    const emailLink = document.getElementById(`email-link${suffix}`);
    const emailEl = document.getElementById(`user-email${suffix}`);
    if (cardData.email && emailLink && emailEl) {
        emailEl.textContent = cardData.email;
        emailLink.href = `mailto:${cardData.email}`;
        emailLink.style.display = 'flex';
    } else if (emailLink) {
        emailLink.style.display = 'none';
    }

    // 電話處理
    const phoneLink = document.getElementById(`phone-link${suffix}`);
    const phoneEl = document.getElementById(`user-phone${suffix}`);
    if (cardData.phone && phoneLink && phoneEl) {
        phoneEl.textContent = cardData.phone;
        phoneLink.href = `tel:${cardData.phone.replace(/\s/g, '')}`;
        phoneLink.style.display = 'flex';
    } else if (phoneLink) {
        phoneLink.style.display = 'none';
    }

    // 網站處理
    const webLink = document.getElementById(`web-link${suffix}`);
    const webEl = document.getElementById(`user-web${suffix}`);
    if (cardData.website && webLink && webEl) {
        webEl.textContent = cardData.website.replace('https://', '').replace('http://', '');
        webLink.href = cardData.website;
        webLink.style.display = 'flex';
    } else if (webLink) {
        webLink.style.display = 'none';
    }

    // 地址處理
    const addressLink = document.getElementById(`address-link${suffix}`);
    const addressEl = document.getElementById(`user-address${suffix}`);
    if (cardData.address && addressLink && addressEl) {
        const addr = getLocalizedText(cardData.address, lang);
        if (addr) {
            addressEl.textContent = addr;
            // Use both query and q parameters for maximum compatibility
            addressLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
            addressLink.style.display = 'flex';
        } else {
            addressLink.style.display = 'none';
        }
    } else if (addressLink) {
        addressLink.style.display = 'none';
    }

    // Session 資訊（僅正面顯示）
    if (suffix === '' && sessionData) {
        const expiresAt = new Date(sessionData.expires_at);
        const validUntilText = i18nTexts['valid-until'][currentLanguage];
        const sharesAvailableText = i18nTexts['shares-available'][currentLanguage];
        
        document.getElementById('session-expiry').textContent = `${validUntilText}: ${expiresAt.toLocaleString(currentLanguage === 'zh' ? 'zh-TW' : 'en-US')}`;
        document.getElementById('session-reads').textContent = `${sharesAvailableText}: ${sessionData.reads_remaining}`;
    }

    // 社群連結處理（僅正面完整處理，背面複製）
    // 靜態顯示問候語（所有行）- 雙面渲染
    try {
        const greetingSection = document.getElementById(`greeting-section${suffix}`);
        const greetingEl = document.getElementById(`typewriter${suffix}`);
        
        if (greetings && greetings.length > 0 && greetingSection && greetingEl) {
            greetingSection.classList.remove('hidden');
            greetingEl.innerHTML = greetings.map(line => DOMPurify.sanitize(line)).join('<br>');
        } else if (greetingSection) {
            greetingSection.classList.add('hidden');
        }
    } catch (error) {
        console.error(`[${lang}] 問候語渲染錯誤:`, error);
    }

    if (suffix === '-en') {
        // 背面：複製正面的社群連結
        const frontSocial = document.getElementById('social-cluster');
        const backSocial = document.getElementById('social-cluster-en');
        if (frontSocial && backSocial) {
            backSocial.innerHTML = frontSocial.innerHTML;
            backSocial.style.display = frontSocial.style.display;
        }
        return; // 背面到此結束
    }

    // 以下是正面的社群連結處理（保留原邏輯）
    const socialCluster = document.getElementById('social-cluster');

    // 品牌顏色對照表
    const SOCIAL_COLORS = {
        github: '#181717',
        linkedin: '#0A66C2',
        facebook: '#1877F2',
        instagram: '#E4405F',
        twitter: '#1DA1F2',
        youtube: '#FF0000',
        line: '#00B900',
        signal: '#3A76F0'
    };

    // URL 處理函數
    const getLineUrl = (input) => {
        if (!input) return null;
        
        // 清理輸入
        const trimmed = input.trim();
        if (!trimmed) return null;

        // 規則 1：若已是完整 URL，直接返回
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
        }

        // 規則 2：視為 ID，移除空白與前置 @
        const cleanId = trimmed.replace(/\s+/g, '').replace(/^@+/, '');
        
        // 規則 3：若清理後為空，返回 null
        if (!cleanId) return null;

        // 組成標準 URL
        return `https://line.me/ti/p/~${cleanId}`;
    };

    const getSignalUrl = (input) => {
        if (!input) return null;
        input = input.trim();

        // 如果已經是完整 URL，直接返回
        if (input.startsWith('http://') || input.startsWith('https://')) {
            return input;
        }

        // 如果是 signal.me 路徑，補上 https://
        if (input.startsWith('signal.me/')) {
            return `https://${input}`;
        }

        // 如果是電話號碼格式（+開頭），使用 #p/ 路徑
        if (input.startsWith('+')) {
            return `https://signal.me/#p/${input}`;
        }

        // 其他情況無法處理，返回 null
        return null;
    };

    // 新格式：獨立欄位
    const socialLinks = [];
    if (cardData.social_github) socialLinks.push({ url: cardData.social_github, icon: 'github', color: SOCIAL_COLORS.github });
    if (cardData.social_linkedin) socialLinks.push({ url: cardData.social_linkedin, icon: 'linkedin', color: SOCIAL_COLORS.linkedin });
    if (cardData.social_facebook) socialLinks.push({ url: cardData.social_facebook, icon: 'facebook', color: SOCIAL_COLORS.facebook });
    if (cardData.social_instagram) socialLinks.push({ url: cardData.social_instagram, icon: 'instagram', color: SOCIAL_COLORS.instagram });
    if (cardData.social_twitter) socialLinks.push({ url: cardData.social_twitter, icon: 'twitter', color: SOCIAL_COLORS.twitter });
    if (cardData.social_youtube) socialLinks.push({ url: cardData.social_youtube, icon: 'youtube', color: SOCIAL_COLORS.youtube });

    // LINE 處理
    if (cardData.social_line) {
        const lineUrl = getLineUrl(cardData.social_line);
        if (lineUrl) {
            socialLinks.push({ url: lineUrl, icon: 'line', color: SOCIAL_COLORS.line });
        }
    }

    // Signal 處理
    if (cardData.social_signal) {
        const signalUrl = getSignalUrl(cardData.social_signal);
        if (signalUrl) {
            socialLinks.push({ url: signalUrl, icon: 'signal', color: SOCIAL_COLORS.signal });
        }
    }

    if (socialLinks.length > 0) {
        socialCluster.innerHTML = '';
        socialLinks.forEach(link => {
            const node = document.createElement('a');
            node.href = link.url;
            node.target = '_blank';
            node.rel = 'noopener noreferrer';
            node.className = 'social-node w-12 h-12 flex items-center justify-center rounded-xl';
            node.style.backgroundColor = link.color;
            node.style.color = '#FFFFFF';

            // LINE 和 Signal 使用 SVG，其他使用 lucide icon
            if (link.icon === 'line') {
                node.innerHTML = DOMPurify.sanitize(`<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>`, { ADD_ATTR: ['onclick'] });
            } else if (link.icon === 'signal') {
                node.innerHTML = DOMPurify.sanitize(`<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0q-.934 0-1.83.139l.17 1.111a11 11 0 0 1 3.32 0l.172-1.111A12 12 0 0 0 12 0M9.152.34A12 12 0 0 0 5.77 1.742l.584.961a10.8 10.8 0 0 1 3.066-1.27zm5.696 0-.268 1.094a10.8 10.8 0 0 1 3.066 1.27l.584-.962A12 12 0 0 0 14.848.34M12 2.25a9.75 9.75 0 0 0-8.539 14.459c.074.134.1.292.064.441l-1.013 4.338 4.338-1.013a.62.62 0 0 1 .441.064A9.7 9.7 0 0 0 12 21.75c5.385 0 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25m-7.092.068a12 12 0 0 0-2.59 2.59l.909.664a11 11 0 0 1 2.345-2.345zm14.184 0-.664.909a11 11 0 0 1 2.345 2.345l.909-.664a12 12 0 0 0-2.59-2.59M1.742 5.77A12 12 0 0 0 .34 9.152l1.094.268a10.8 10.8 0 0 1 1.269-3.066zm20.516 0-.961.584a10.8 10.8 0 0 1 1.27 3.066l1.093-.268a12 12 0 0 0-1.402-3.383M.138 10.168A12 12 0 0 0 0 12q0 .934.139 1.83l1.111-.17A11 11 0 0 1 1.125 12q0-.848.125-1.66zm23.723.002-1.111.17q.125.812.125 1.66c0 .848-.042 1.12-.125 1.66l1.111.172a12.1 12.1 0 0 0 0-3.662M1.434 14.58l-1.094.268a12 12 0 0 0 .96 2.591l-.265 1.14 1.096.255.36-1.539-.188-.365a10.8 10.8 0 0 1-.87-2.35m21.133 0a10.8 10.8 0 0 1-1.27 3.067l.962.584a12 12 0 0 0 1.402-3.383zm-1.793 3.848a11 11 0 0 1-2.345 2.345l.664.909a12 12 0 0 0 2.59-2.59zm-19.959 1.1L.357 21.48a1.8 1.8 0 0 0 2.162 2.161l1.954-.455-.256-1.095-1.953.455a.675.675 0 0 1-.81-.81l.454-1.954zm16.832 1.769a10.8 10.8 0 0 1-3.066 1.27l.268 1.093a12 12 0 0 0 3.382-1.402zm-10.94.213-1.54.36.256 1.095 1.139-.266c.814.415 1.683.74 2.591.961l.268-1.094a10.8 10.8 0 0 1-2.35-.869zm3.634 1.24-.172 1.111a12.1 12.1 0 0 0 3.662 0l-.17-1.111q-.812.125-1.66.125a11 11 0 0 1-1.66-.125"/></svg>`, { ADD_ATTR: ['onclick'] });
            } else {
                node.innerHTML = DOMPurify.sanitize(`<i data-lucide="${link.icon}" class="w-5 h-5"></i>`, { ADD_ATTR: ['onclick'] });
            }

            socialCluster.appendChild(node);
        });
        socialCluster.style.display = 'flex';
    } else if (cardData.socialLinks && cardData.socialLinks.socialNote) {
        // 舊格式：向後相容
        parseSocialLinks(cardData.socialLinks.socialNote);
        if (socialCluster.children.length > 0) {
            socialCluster.style.display = 'flex';
        } else {
            socialCluster.style.display = 'none';
        }
    } else {
        socialCluster.style.display = 'none';
    }

}

function parseSocialLinks(socialText) {
    const cluster = document.getElementById('social-cluster');
    cluster.innerHTML = '';

    if (!socialText) return;

    // 平台配置：使用 hostname 精確匹配
    const platforms = [
        { hostnames: ['github.com'], icon: 'github' },
        { hostnames: ['linkedin.com'], icon: 'linkedin' },
        { hostnames: ['facebook.com', 'fb.com', 'fb.me'], icon: 'facebook' },
        { hostnames: ['instagram.com', 'instagr.am'], icon: 'instagram' },
        { hostnames: ['twitter.com', 'x.com', 't.co'], icon: 'twitter' },
        { hostnames: ['youtube.com', 'youtu.be'], icon: 'youtube' }
    ];

    const lines = socialText.split('\n').filter(line => line.trim());

    lines.forEach(line => {
        const url = line.trim();

        try {
            // 使用 URL API 解析（更可靠）
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
            const hostname = urlObj.hostname.replace(/^www\./, ''); // 移除 www

            // 精確匹配 hostname
            for (const platform of platforms) {
                if (platform.hostnames.includes(hostname)) {
                    const node = document.createElement('a');
                    node.href = url.startsWith('http') ? url : `https://${url}`;
                    node.target = '_blank';
                    node.rel = 'noopener noreferrer';
                    node.className = 'social-node w-12 h-12 flex items-center justify-center rounded-xl';
                    node.innerHTML = DOMPurify.sanitize(`<i data-lucide="${platform.icon}" class="w-5 h-5"></i>`, { ADD_ATTR: ['onclick'] });
                    cluster.appendChild(node);
                    break; // 每行只匹配一個平台
                }
            }
        } catch (e) {
            // URL 解析失敗，跳過此行
            console.warn('Invalid social URL:', url);
        }
    });

}

function startTypewriter(phrases) {
    // 停止之前的 typewriter
    if (typewriterTimeout) {
        clearTimeout(typewriterTimeout);
        typewriterTimeout = null;
    }

    const el = document.getElementById('typewriter');
    let i = 0, j = 0, isDeleting = false;

    const type = () => {
        const current = phrases[i];
        el.textContent = isDeleting ? current.substring(0, j--) : current.substring(0, j++);

        if (!isDeleting && j > current.length) {
            isDeleting = true;
            typewriterTimeout = setTimeout(type, 2000);
        } else if (isDeleting && j === 0) {
            isDeleting = false;
            i = (i + 1) % phrases.length;
            typewriterTimeout = setTimeout(type, 500);
        } else {
            typewriterTimeout = setTimeout(type, isDeleting ? 30 : 80);
        }
    };

    type();
}

function hideLoading() {
    const loading = document.getElementById('loading');
    loading.style.opacity = '0';
    setTimeout(() => {
        loading.style.display = 'none';
    }, 1000);
}

function initThree() {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (!isDesktop) return;

    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    canvas.style.display = 'block';

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fb);
    scene.fog = new THREE.Fog(0xf8f9fb, 20, 80);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 50);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ground Grid (Perspective Horizon)
    const gridGeo = new THREE.PlaneGeometry(200, 200, 40, 40);
    const gridMat = new THREE.MeshBasicMaterial({
        color: 0x6868ac,
        wireframe: true,
        transparent: true,
        opacity: 0.1
    });
    grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -15;
    scene.add(grid);

    // Particle Network System
    const particleCount = 120;
    const particles = [];
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // Create card-shaped particle clusters (3 flying cards)
    const cardCount = 3;
    const particlesPerCard = 20;
    
    for (let i = 0; i < particleCount; i++) {
        let x, y, z, vx, vy, vz, isCard = false;
        
        if (i < cardCount * particlesPerCard) {
            // Card particles - form rectangular clusters (vertical orientation)
            const cardIndex = Math.floor(i / particlesPerCard);
            const particleInCard = i % particlesPerCard;
            const cardOffset = cardIndex * 40 - 40;
            
            x = (particleInCard % 4 - 1.5) * 2 + cardOffset;
            y = Math.floor(particleInCard / 4) * 2.5 - 6;
            z = -80 + cardIndex * 30;
            vx = 0;
            vy = 0;
            vz = 0.15 + cardIndex * 0.05;
            isCard = true;
        } else {
            // Regular network particles
            x = (Math.random() - 0.5) * 100;
            y = Math.random() * 40 - 10;
            z = (Math.random() - 0.5) * 80 - 20;
            vx = (Math.random() - 0.5) * 0.01;
            vy = (Math.random() - 0.5) * 0.01;
            vz = (Math.random() - 0.5) * 0.005;
            isCard = false;
        }
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        particles.push({ x, y, z, vx, vy, vz, isCard });
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMat = new THREE.PointsMaterial({
        size: 0.5,
        color: 0x6868ac,
        transparent: true,
        opacity: 0.4,
        map: createCircleTexture(),
        alphaTest: 0.01,
        sizeAttenuation: true
    });
    
    mesh = new THREE.Points(particleGeo, particleMat);
    scene.add(mesh);

    // Connection lines
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x6868ac,
        transparent: true,
        opacity: 0.25
    });
    
    const lineGeo = new THREE.BufferGeometry();
    const maxConnections = particleCount * 5;
    const linePositions = new Float32Array(maxConnections * 6);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setDrawRange(0, 0);
    
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    handleResize();
    animate();

    function animate() {
        requestAnimationFrame(animate);
        
        const positions = mesh.geometry.attributes.position.array;
        const linePositions = lines.geometry.attributes.position.array;
        let lineIndex = 0;
        const maxDistance = 15;
        
        // Update particle positions
        for (let i = 0; i < particleCount; i++) {
            const particle = particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.z += particle.vz;
            
            if (particle.isCard) {
                // Card particles fly forward and reset
                if (particle.z > 50) {
                    particle.z = -80;
                }
            } else {
                // Regular particles bounce
                if (Math.abs(particle.x) > 50) particle.vx *= -1;
                if (particle.y > 30 || particle.y < -10) particle.vy *= -1;
                if (particle.z > 20 || particle.z < -60) particle.vz *= -1;
            }
            
            // Mouse attraction (only for non-card particles)
            if (!particle.isCard && (mouseX !== 0 || mouseY !== 0)) {
                const dx = mouseX * 50 - particle.x;
                const dy = mouseY * 30 - particle.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 20) {
                    particle.vx += dx * 0.0001;
                    particle.vy += dy * 0.0001;
                }
            }
            
            positions[i * 3] = particle.x;
            positions[i * 3 + 1] = particle.y;
            positions[i * 3 + 2] = particle.z;
            
            // Create connections
            for (let j = i + 1; j < particleCount; j++) {
                const other = particles[j];
                const dx = particle.x - other.x;
                const dy = particle.y - other.y;
                const dz = particle.z - other.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                if (distance < maxDistance && lineIndex < maxConnections * 6) {
                    linePositions[lineIndex++] = particle.x;
                    linePositions[lineIndex++] = particle.y;
                    linePositions[lineIndex++] = particle.z;
                    linePositions[lineIndex++] = other.x;
                    linePositions[lineIndex++] = other.y;
                    linePositions[lineIndex++] = other.z;
                }
            }
        }
        
        mesh.geometry.attributes.position.needsUpdate = true;
        lines.geometry.attributes.position.needsUpdate = true;
        lines.geometry.setDrawRange(0, lineIndex / 3);
        
        renderer.render(scene, camera);
    }
}

let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = -(e.clientY / window.innerHeight) + 0.5;
});

// Create circular particle texture
function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function handleResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleResize);

function generateVCard(cardData) {
    // vCard 值跳脫函數
    const escapeVCardValue = (value) => {
        if (!value) return '';
        return value
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    };

    // URL 處理函數（與 renderCard 一致）
    const getLineUrl = (input) => {
        if (!input) return null;
        
        // 清理輸入
        const trimmed = input.trim();
        if (!trimmed) return null;

        // 規則 1：若已是完整 URL，直接返回
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
        }

        // 規則 2：視為 ID，移除空白與前置 @
        const cleanId = trimmed.replace(/\s+/g, '').replace(/^@+/, '');
        
        // 規則 3：若清理後為空，返回 null
        if (!cleanId) return null;

        // 組成標準 URL
        return `https://line.me/ti/p/~${cleanId}`;
    };

    const getSignalUrl = (input) => {
        if (!input) return null;
        input = input.trim();
        if (input.startsWith('http://') || input.startsWith('https://')) {
            return input;
        }
        if (input.startsWith('signal.me/') || input.startsWith('signal.group/')) {
            return `https://${input}`;
        }
        return `https://signal.me/#p/${input}`;
    };

    // 取得當前語言的資料（iOS 對 vCard 4.0 支援不完整，改用 3.0 單語言）
    const name = getLocalizedText(cardData.name, currentLanguage);
    const title = getLocalizedText(cardData.title, currentLanguage);
    const dept = cardData.department || '';
    const addr = getLocalizedText(cardData.address, currentLanguage);

    // 組織與部門翻譯
    const organization = ORG_DEPT_MAPPING.organization[currentLanguage];
    const departmentTranslated = currentLanguage === 'en' && ORG_DEPT_MAPPING.departments[dept]
        ? ORG_DEPT_MAPPING.departments[dept]
        : dept;

    let vcard = 'BEGIN:VCARD\n';
    vcard += 'VERSION:3.0\n';
    vcard += 'CHARSET:UTF-8\n';

    // FN (Formatted Name)
    if (name) {
        vcard += `FN:${escapeVCardValue(name)}\n`;
    }

    // N (Structured Name)
    if (name) {
        const familyName = name.charAt(0);
        const givenName = name.substring(1);
        vcard += `N:${escapeVCardValue(familyName)};${escapeVCardValue(givenName)};;;\n`;
    }

    // TITLE
    if (title) {
        vcard += `TITLE:${escapeVCardValue(title)}\n`;
    }

    // ORG (組織;部門)
    if (organization && departmentTranslated) {
        vcard += `ORG:${escapeVCardValue(organization)};${escapeVCardValue(departmentTranslated)}\n`;
    } else if (departmentTranslated) {
        vcard += `ORG:${escapeVCardValue(departmentTranslated)}\n`;
    }

    // ADR
    if (addr) {
        vcard += `ADR;TYPE=WORK:;;${escapeVCardValue(addr)};;;;\n`;
    }

    // EMAIL
    if (cardData.email) {
        vcard += `EMAIL;TYPE=WORK:${cardData.email}\n`;
    }

    // TEL
    if (cardData.phone) {
        vcard += `TEL;TYPE=WORK:${cardData.phone}\n`;
    }
    if (cardData.mobile) {
        vcard += `TEL;TYPE=CELL:${cardData.mobile}\n`;
    }

    // PHOTO - 只支援公開可存取的 URL
    if (cardData.avatar_url || cardData.avatar) {
        let photoUrl = cardData.avatar_url || cardData.avatar;
        // 轉換 Google Drive 分享連結為直接圖片 URL
        const driveMatch = photoUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([^\/\?&]+)/);
        if (driveMatch) {
            const fileId = driveMatch[1];
            // 使用 uc?export=view 格式，相容性更好
            photoUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
        vcard += `PHOTO;VALUE=URL;TYPE=JPEG:${photoUrl}\n`;
    }

    // 社群連結 - 使用 URL;TYPE=PLATFORM 格式
    if (cardData.social_github) {
        vcard += `URL;TYPE=GITHUB:${escapeVCardValue(cardData.social_github)}\n`;
    }
    if (cardData.social_linkedin) {
        vcard += `URL;TYPE=LINKEDIN:${escapeVCardValue(cardData.social_linkedin)}\n`;
    }
    if (cardData.social_facebook) {
        vcard += `URL;TYPE=FACEBOOK:${escapeVCardValue(cardData.social_facebook)}\n`;
    }
    if (cardData.social_instagram) {
        vcard += `URL;TYPE=INSTAGRAM:${escapeVCardValue(cardData.social_instagram)}\n`;
    }
    if (cardData.social_twitter) {
        vcard += `URL;TYPE=TWITTER:${escapeVCardValue(cardData.social_twitter)}\n`;
    }
    if (cardData.social_youtube) {
        vcard += `URL;TYPE=YOUTUBE:${escapeVCardValue(cardData.social_youtube)}\n`;
    }

    // LINE - 使用 URL 處理函數轉換後再寫入
    if (cardData.social_line) {
        const lineUrl = getLineUrl(cardData.social_line);
        if (lineUrl) {
            vcard += `URL;TYPE=LINE:${escapeVCardValue(lineUrl)}\n`;
        }
    }

    // Signal - 使用 URL 處理函數轉換後再寫入
    if (cardData.social_signal) {
        const signalUrl = getSignalUrl(cardData.social_signal);
        if (signalUrl) {
            vcard += `URL;TYPE=SIGNAL:${escapeVCardValue(signalUrl)}\n`;
        }
    }

    vcard += 'END:VCARD';
    return vcard;
}

document.getElementById('lang-switch').addEventListener('click', () => {
    const params = new URLSearchParams(window.location.search);
    const newLang = currentLanguage === 'zh' ? 'en' : 'zh';

    // 保留 uuid 和 session 參數，新增/更新 lang 參數
    params.set('lang', newLang);

    // 重新載入頁面
    window.location.search = params.toString();
});

// vCard 下載
document.getElementById('save-vcard').addEventListener('click', () => {
    if (currentCardData) {
        const vcard = generateVCard(currentCardData);

        // Safari iOS 不支援 Blob URL 下載，改用 data URI
        const dataUri = 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vcard);
        const a = document.createElement('a');
        a.href = dataUri;

        // 根據當前語言狀態決定檔名
        const name = typeof currentCardData.name === 'object'
            ? (currentLanguage === 'zh' ? (currentCardData.name.zh || currentCardData.name.en) : (currentCardData.name.en || currentCardData.name.zh))
            : currentCardData.name;
        a.download = `${name || 'contact'}.vcf`;
        a.click();
        showNotification('vCard 已下載', 'success');
    } else {
        showError(currentLanguage === 'zh' ? '無法下載 vCard，請重新載入頁面' : 'Failed to download vCard, please reload the page');
    }
});

// QR Code 生成函數
function generateQRCode(targetId) {
    const params = new URLSearchParams(window.location.search);
    const uuid = params.get('uuid');
    const qrContainer = document.getElementById(targetId);
    
    if (!qrContainer) return;
    
    qrContainer.innerHTML = '';
    const cardUrl = `${window.location.origin}/card-display?uuid=${uuid}`;
    
    try {
        validateQRInput(cardUrl);
        const canvas = document.createElement('canvas');
        qrContainer.appendChild(canvas);
        
        QrCreator.render({
            text: cardUrl,
            radius: 0,
            ecLevel: 'H',
            fill: '#000000',
            background: '#ffffff',
            size: 240
        }, canvas);
    } catch (error) {
        console.error('QR Code generation failed:', error);
        showError(currentLanguage === 'zh' ? '無法生成 QR Code' : 'Failed to generate QR Code');
    }
}

// 手機版 QR Code modal
document.getElementById('open-qr').addEventListener('click', () => {
    // Defer QR Code generation to idle time
    requestIdleCallback(() => {
        generateQRCode('qrcode-target');
    }, { timeout: 2000 });
    document.getElementById('qr-modal').classList.remove('hidden');
});

document.getElementById('close-qr').addEventListener('click', () => {
    document.getElementById('qr-modal').classList.add('hidden');
});

function initLoadingIcon() {
    const icons = ['contact', 'user-circle'];
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];
    const iconContainer = document.getElementById('loading-icon');
    if (iconContainer) {
        iconContainer.innerHTML = DOMPurify.sanitize(`<i data-lucide="${randomIcon}" class="w-10 h-10 animate-pulse" aria-hidden="true"></i>`, { ADD_ATTR: ['onclick'] });
    }
}

document.addEventListener('DOMContentLoaded', initApp);

// ========================================
// 3D Card Flip - Bilingual Support
// ========================================

// 翻轉控制（防抖）
let isFlipping = false;
window.toggleFlip = function(event) {
    // 排除可互動元素的點擊
    if (event && event.target) {
        const isInteractive = event.target.closest('a, button, input, select, textarea, [role="button"]');
        if (isInteractive && isInteractive.id !== 'card') {
            return;
        }
    }

    if (isFlipping) return;
    isFlipping = true;
    const card = document.getElementById('card');
    if (card) {
        card.classList.toggle('is-flipped');
        setTimeout(() => { isFlipping = false; }, 800);
    }
};

// ========================================
// 桌面版 3D 視差效果
// ========================================
function initDesktopParallax() {
    if (window.innerWidth < 1024) return; // 僅桌面版

    const cardPerspective = document.querySelector('.card-perspective');
    const cardInner = document.querySelector('.card-inner');
    if (!cardPerspective || !cardInner) return;

    let ticking = false;
    let currentRotation = { x: 0, y: 0 };

    cardPerspective.addEventListener('mousemove', (e) => {
        if (ticking) return;

        requestAnimationFrame(() => {
            const rect = cardPerspective.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;

            currentRotation = { x: -y * 10, y: x * 10 };
            applyCardTransform();
            ticking = false;
        });
        ticking = true;
    });

    cardPerspective.addEventListener('mouseleave', () => {
        if (ticking) return;

        requestAnimationFrame(() => {
            // 加入 transition 讓回位動畫平滑（0.1s）
            cardInner.style.transition = 'transform 0.1s ease';
            currentRotation = { x: 0, y: 0 };
            applyCardTransform();
            ticking = false;
        });
        ticking = true;
    });

    // mouseenter 時清除臨時 transition，保持傾斜即時響應
    cardPerspective.addEventListener('mouseenter', () => {
        cardInner.style.transition = '';
    });

    function applyCardTransform() {
        // 使用 CSS 變數，避免直接操作 transform
        cardInner.style.setProperty('--rotate-x', `${currentRotation.x}deg`);
        cardInner.style.setProperty('--rotate-y', `${currentRotation.y}deg`);
    }
}

// 動態高度匹配
function matchCardHeight() {
    const front = document.querySelector('.card-front');
    const back = document.querySelector('.card-back');
    const card = document.getElementById('card');
    
    if (!front || !back || !card) return;
    
    const maxHeight = Math.max(front.scrollHeight, back.scrollHeight, 600);
    card.style.height = `${maxHeight}px`;
}

// 浮動提示自動隱藏
function initHintBadge() {
    const hintBadge = document.getElementById('hint-badge');
    const hintSeen = sessionStorage.getItem('hint-seen');
    
    if (!hintSeen && hintBadge) {
        setTimeout(() => {
            hintBadge.style.opacity = '0';
            setTimeout(() => {
                hintBadge.style.display = 'none';
                sessionStorage.setItem('hint-seen', 'true');
            }, 300);
        }, 3000);
    } else if (hintSeen && hintBadge) {
        hintBadge.style.display = 'none';
    }
}

// ========================================
// 物理互動效果（桌面版）
// ========================================
function initCardPhysics() {
    if (window.innerWidth < 1024) return;

    const cardPerspective = document.querySelector('.card-perspective');
    if (!cardPerspective) return;

    // Click Bounce：點擊名片時觸發彈跳動畫（與翻轉同時觸發）
    cardPerspective.addEventListener('click', (e) => {
        // 排除社群連結、輸入欄等可互動子元素（不排除 #card 本身）
        const interactive = e.target.closest('a, button, input');
        if (interactive) return;

        cardPerspective.classList.remove('is-bouncing');
        // 強制 reflow，才能重新觸發同一個 animation
        void cardPerspective.offsetWidth;
        cardPerspective.classList.add('is-bouncing');
    });

    // Bounce 動畫結束後移除 class，恢復浮動
    cardPerspective.addEventListener('animationend', (e) => {
        if (e.animationName === 'cardBounce') {
            cardPerspective.classList.remove('is-bouncing');
        }
    });
}

// 初始化
window.addEventListener('resize', matchCardHeight);
setTimeout(() => {
    matchCardHeight();
    initHintBadge();
    initDesktopParallax();
    initCardPhysics();
}, 100);
