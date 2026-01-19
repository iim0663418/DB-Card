import { tapCard, readCard } from './api.js';
import { getLocalizedText, getLocalizedArray } from './utils/bilingual.js';
import { getCachedCard, setCachedCard, clearExpiredCache } from './cache-helper.js';

let scene, camera, renderer, mesh, grid;
let currentLanguage = 'zh';
let typewriterTimeout = null;
let currentCardData = null; // 儲存當前名片資料供 vCard 下載使用

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

// 更新按鈕文字（根據當前語言）
function updateButtonTexts() {
    const desktopText = document.getElementById('save-vcard-text-desktop');
    const mobileText = document.getElementById('save-vcard-text-mobile');

    if (desktopText && mobileText) {
        if (currentLanguage === 'zh') {
            desktopText.textContent = 'Sync Identity';
            mobileText.textContent = '下載名片';
        } else {
            desktopText.textContent = 'Sync Identity';
            mobileText.textContent = 'Download';
        }
    }

    // 更新所有 data-i18n 元素
    const i18nElements = document.querySelectorAll('[data-i18n]');
    i18nElements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18nTexts[key]) {
            el.textContent = i18nTexts[key][currentLanguage];
        }
    });
}

// 多語言文字對照表
const i18nTexts = {
    'loading': {
        'zh': 'Synchronizing Secure Identity...',
        'en': 'Synchronizing Secure Identity...'
    },
    'qr-title': {
        'zh': 'Scan for Official Verification',
        'en': 'Scan for Official Verification'
    },
    'card-system': {
        'zh': '數位名片系統 Digital Business Card',
        'en': 'Digital Business Card System'
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
        'zh': 'Serverless Encrypted Node. No trace retained on node. Securely rendered via DB-Card gateway.',
        'en': 'Serverless Encrypted Node. No trace retained on node. Securely rendered via DB-Card gateway.'
    }
};

/**
 * 顯示錯誤訊息
 */
function showError(message) {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div class="error-message">
                <i data-lucide="alert-circle"></i>
                <span>${message}</span>
            </div>
        `;
        errorContainer.style.display = 'block';
        lucide.createIcons();
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

        notification.innerHTML = `
            <i data-lucide="${icons[type] || 'info'}"></i>
            <span>${message}</span>
        `;

        notificationContainer.appendChild(notification);
        lucide.createIcons();

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

async function initApp() {
    initThree();
    lucide.createIcons();

    // 清理過期快取
    clearExpiredCache();

    const params = new URLSearchParams(window.location.search);
    const uuid = params.get('uuid');
    currentLanguage = params.get('lang') || 'zh';

    // 設定 HTML lang 屬性（無障礙）
    document.documentElement.lang = currentLanguage === 'zh' ? 'zh-TW' : 'en';

    // 設定語言切換按鈕文字
    document.getElementById('lang-switch').textContent = currentLanguage === 'zh' ? 'EN' : '繁中';

    // 設定按鈕文字（根據語言）
    updateButtonTexts();

    if (!uuid) {
        showError('錯誤：缺少名片 UUID 參數');
        hideLoading();
        return;
    }

    try {
        await loadCard(uuid);
    } catch (error) {
        console.error('Initialization error:', error);
        showError(`載入失敗: ${error.message}`);
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

        // 檢查快取
        const cached = getCachedCard(uuid, sessionId);
        if (cached) {
            cardData = cached.data;
            sessionData = cached.sessionData;
        } else {
            // 讀取名片資料
            const readResult = await readCard(uuid, sessionId);
            cardData = readResult.data;
            sessionData = {
                session_id: sessionId,
                expires_at: readResult.session_info.expires_at,
                reads_remaining: readResult.session_info.reads_remaining
            };

            // 儲存快取
            setCachedCard(uuid, sessionId, { data: cardData, sessionData });
        }

    } catch (error) {
        console.error('Error loading card:', error);

        // 根據錯誤類型顯示對應訊息
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('session_expired') || errorMsg.includes('expired') || errorMsg.includes('過期')) {
            showError('授權已過期（24 小時），請重新觸碰 NFC 卡片取得新授權');
        } else if (errorMsg.includes('session_revoked') || errorMsg.includes('revoked') || errorMsg.includes('已撤銷')) {
            showError('此授權已被撤銷，請重新觸碰 NFC 卡片或聯絡名片擁有者');
        } else if (errorMsg.includes('max_reads_exceeded') || errorMsg.includes('exceeded') || errorMsg.includes('次數上限')) {
            showError('已達讀取次數上限，請重新觸碰 NFC 卡片取得新授權');
        } else if (errorMsg.includes('session_not_found') || errorMsg.includes('not_found')) {
            showError('授權不存在或已失效，請重新觸碰 NFC 卡片');
        } else if (errorMsg.includes('card_not_found') || errorMsg.includes('名片不存在')) {
            showError('名片不存在或已被刪除，請聯絡名片擁有者');
        } else if (errorMsg.includes('network') || errorMsg.includes('failed to fetch')) {
            showError('網路連線失敗，請檢查網路後重試');
        } else if (errorMsg.includes('403')) {
            showError('授權驗證失敗，請重新觸碰 NFC 卡片');
        } else if (errorMsg.includes('404')) {
            showError('資源不存在，請確認連結是否正確');
        } else if (errorMsg.includes('500')) {
            showError('伺服器錯誤，請稍後再試或聯絡技術支援');
        } else {
            showError(`載入失敗: ${error.message}`);
        }

        hideLoading();
        return;
    }

    if (cardData) {
        currentCardData = cardData; // 儲存供 vCard 下載使用
        renderCard(cardData, sessionData);
    } else {
        showError('無法載入名片資料');
        hideLoading();
    }
}

function renderCard(cardData, sessionData) {
    const name = getLocalizedText(cardData.name, currentLanguage);
    const title = getLocalizedText(cardData.title, currentLanguage);
    const greetings = getLocalizedArray(cardData.greetings, currentLanguage);

    document.getElementById('user-name').textContent = name || '---';
    document.getElementById('user-title').textContent = title || '---';

    // 大頭貼處理 - 支援 Google Drive URL 轉換
    const avatarContainer = document.getElementById('user-avatar').closest('.relative');
    const avatarUrl = cardData.avatar_url || cardData.avatar;  // 相容舊格式
    if (avatarUrl) {
        let processedUrl = avatarUrl;

        // 轉換 Google Drive 分享連結為直接圖片 URL
        const driveMatch = processedUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([^\/\?&]+)/);
        if (driveMatch) {
            const fileId = driveMatch[1];
            processedUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
        }

        const imgElement = document.getElementById('user-avatar');
        imgElement.src = processedUrl;

        imgElement.onerror = function() {
            console.warn('Avatar failed to load:', processedUrl);
            if (avatarContainer) avatarContainer.style.display = 'none';
        };

        if (avatarContainer) avatarContainer.style.display = 'block';
    } else {
        if (avatarContainer) avatarContainer.style.display = 'none';
    }

    // Email 處理 - 無資料時隱藏
    const emailLink = document.getElementById('email-link');
    if (cardData.email) {
        document.getElementById('user-email').textContent = cardData.email;
        emailLink.href = `mailto:${cardData.email}`;
        emailLink.style.display = 'flex';
    } else {
        emailLink.style.display = 'none';
    }

    // 電話處理 - 無資料時隱藏
    const phoneLink = document.getElementById('phone-link');
    if (cardData.phone) {
        document.getElementById('user-phone').textContent = cardData.phone;
        phoneLink.href = `tel:${cardData.phone.replace(/\s/g, '')}`;
        phoneLink.style.display = 'flex';
    } else {
        phoneLink.style.display = 'none';
    }

    // 手機處理 - 無資料時隱藏
    const mobileLink = document.getElementById('mobile-link');
    if (mobileLink && cardData.mobile) {
        document.getElementById('user-mobile').textContent = cardData.mobile;
        mobileLink.href = `tel:${cardData.mobile.replace(/\s/g, '')}`;
        mobileLink.style.display = 'flex';
    } else if (mobileLink) {
        mobileLink.style.display = 'none';
    }

    // 網站處理 - 無資料時隱藏
    const webLink = document.getElementById('web-link');
    if (webLink && cardData.website) {
        document.getElementById('user-web').textContent = cardData.website.replace('https://', '').replace('http://', '');
        webLink.href = cardData.website;
        webLink.style.display = 'flex';
    } else if (webLink) {
        webLink.style.display = 'none';
    }

    // 地址處理 - 無資料時隱藏
    const addressLink = document.getElementById('address-link');
    if (addressLink && cardData.address) {
        const addr = getLocalizedText(cardData.address, currentLanguage);
        if (addr) {
            document.getElementById('user-address').textContent = addr;
            addressLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
            addressLink.style.display = 'flex';
        } else {
            addressLink.style.display = 'none';
        }
    } else if (addressLink) {
        addressLink.style.display = 'none';
    }

    if (sessionData) {
        const expiresAt = new Date(sessionData.expires_at);
        document.getElementById('session-expiry').textContent = `SESSION EXPIRES: ${expiresAt.toLocaleString(currentLanguage === 'zh' ? 'zh-TW' : 'en-US')}`;
        document.getElementById('session-reads').textContent = `ATTEMPTS REMAINING: ${sessionData.reads_remaining}`;
    }

    // 社群連結處理 - 支援新舊格式
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
        if (input.startsWith('signal.me/') || input.startsWith('signal.group/')) {
            return `https://${input}`;
        }

        // 其他情況（純 username），返回原值（無法確定格式）
        return `https://signal.me/#p/${input}`;
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
        console.log('[DEBUG] LINE input:', cardData.social_line);
        const lineUrl = getLineUrl(cardData.social_line);
        console.log('[DEBUG] LINE URL:', lineUrl);
        if (lineUrl) {
            socialLinks.push({ url: lineUrl, icon: 'line', color: SOCIAL_COLORS.line });
            console.log('[DEBUG] LINE added to socialLinks');
        }
    }

    // Signal 處理
    if (cardData.social_signal) {
        console.log('[DEBUG] Signal input:', cardData.social_signal);
        const signalUrl = getSignalUrl(cardData.social_signal);
        console.log('[DEBUG] Signal URL:', signalUrl);
        if (signalUrl) {
            socialLinks.push({ url: signalUrl, icon: 'signal', color: SOCIAL_COLORS.signal });
            console.log('[DEBUG] Signal added to socialLinks');
        }
    }

    console.log('[DEBUG] Total socialLinks:', socialLinks.length, socialLinks);

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
                node.innerHTML = `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>`;
            } else if (link.icon === 'signal') {
                node.innerHTML = `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 16.707s-1.067 1.341-1.24 1.514c-.173.173-.346.26-.519.26-.173 0-.346-.087-.519-.26l-3.616-3.616-3.616 3.616c-.173.173-.346.26-.519.26-.173 0-.346-.087-.519-.26-.173-.173-1.24-1.514-1.24-1.514-.173-.173-.26-.433-.26-.693 0-.26.087-.52.26-.693l3.616-3.616-3.616-3.616c-.173-.173-.26-.433-.26-.693 0-.26.087-.52.26-.693 0 0 1.067-1.341 1.24-1.514.173-.173.346-.26.519-.26.173 0 .346.087.519.26l3.616 3.616 3.616-3.616c.173-.173.346-.26.519-.26.173 0 .346.087.519.26.173.173 1.24 1.514 1.24 1.514.173.173.26.433.26.693 0 .26-.087.52-.26.693l-3.616 3.616 3.616 3.616c.173.173.26.433.26.693 0 .26-.087.52-.26.693z"/></svg>`;
            } else {
                node.innerHTML = `<i data-lucide="${link.icon}" class="w-5 h-5"></i>`;
            }

            socialCluster.appendChild(node);
        });
        lucide.createIcons();
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

    hideLoading();
    document.getElementById('main-container').classList.remove('hidden');

    // 顯示問候語區塊（如果有內容）
    const greetingSection = document.getElementById('greeting-section');
    if (greetings && greetings.length > 0) {
        greetingSection.classList.remove('hidden');
        startTypewriter(greetings);
    } else {
        greetingSection.classList.add('hidden');
    }

    lucide.createIcons();
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
                    node.innerHTML = `<i data-lucide="${platform.icon}" class="w-5 h-5"></i>`;
                    cluster.appendChild(node);
                    break; // 每行只匹配一個平台
                }
            }
        } catch (e) {
            // URL 解析失敗，跳過此行
            console.warn('Invalid social URL:', url);
        }
    });

    lucide.createIcons();
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
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f7f9);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 10);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const gridGeo = new THREE.PlaneGeometry(150, 150, 45, 45);
    const gridMat = new THREE.MeshBasicMaterial({
        color: 0x6868ac,
        wireframe: true,
        transparent: true,
        opacity: 0.05
    });
    grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2.2;
    grid.position.y = -6;
    scene.add(grid);

    const starCount = 2000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
        starPos[i] = (Math.random() - 0.5) * 50;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
        size: 0.05,
        color: 0x6868ac,
        transparent: true,
        opacity: 0.3
    });
    mesh = new THREE.Points(starGeo, starMat);
    scene.add(mesh);

    handleResize();
    animate();
}

let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) / 3000;
    mouseY = (e.clientY - window.innerHeight / 2) / 3000;
});

function handleResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (mesh) mesh.rotation.y += 0.0003;
    if (grid) {
        grid.position.z += 0.012;
        if (grid.position.z > 5) grid.position.z = 0;
    }
    camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 5 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
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

// 語系切換 - 改為 URL 參數 + 頁面重新載入
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
        showError('無法下載 vCard，請重新載入頁面');
    }
});

// QR Code 顯示
document.getElementById('open-qr').addEventListener('click', () => {
    const params = new URLSearchParams(window.location.search);
    const uuid = params.get('uuid');

    const qrContainer = document.getElementById('qrcode-target');
    qrContainer.innerHTML = '';

    // 使用名片 URL 而不是 vCard（避免資料過長）
    const cardUrl = `${window.location.origin}/card-display?uuid=${uuid}`;
    new QRCode(qrContainer, {
        text: cardUrl,
        width: 240,
        height: 240
    });

    document.getElementById('qr-modal').classList.remove('hidden');
});

document.getElementById('close-qr').addEventListener('click', () => {
    document.getElementById('qr-modal').classList.add('hidden');
});

document.addEventListener('DOMContentLoaded', initApp);
