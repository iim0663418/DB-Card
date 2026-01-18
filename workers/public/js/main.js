import { tapCard, readCard } from './api.js';
import { saveSession, getSession, saveCard, getCard, cleanupCache, getStorageStats } from './storage.js';
import { getLocalizedText, getLocalizedArray } from './utils/bilingual.js';
import { handleNetworkError, handleSessionExpired, handleMaxReadsExceeded, showError, showNotification } from './error-handler.js';

let scene, camera, renderer, mesh, grid;
let currentLanguage = 'zh';
let typewriterTimeout = null;

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
    },
    'offline-mode': {
        'zh': '離線模式',
        'en': 'Offline Mode'
    },
    'privacy-notice': {
        'zh': '🔒 本應用使用 IndexedDB 在您的瀏覽器本地儲存名片資料，不會上傳到伺服器',
        'en': '🔒 This app uses IndexedDB to store card data locally in your browser, no data uploaded to server'
    }
};

async function initApp() {
    initThree();
    lucide.createIcons();

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
        await cleanupCache();
        
        // Display storage stats in console
        try {
            const stats = await getStorageStats();
            console.info('📊 [IndexedDB] 快取統計');
            console.info(`   - 名片: ${stats.cards} 張`);
            console.info(`   - Session: ${stats.sessions} 個`);
            console.info(`   - 預估大小: ${stats.estimatedSize}`);
            console.info(`   - 上次清理: ${stats.lastCleanup}`);
            console.info('💡 使用 Chrome DevTools > Application > IndexedDB 查看詳細資料');
        } catch (error) {
            console.warn('[IndexedDB] 無法取得統計資訊:', error);
        }
        
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
    let isOffline = false;

    try {
        // 優先使用 URL 中的 session 參數（從管理後台查看時）
        const params = new URLSearchParams(window.location.search);
        const urlSessionId = params.get('session');
        
        if (urlSessionId) {
            // 使用 URL 提供的新 session
            sessionId = urlSessionId;
        } else {
            // 嘗試從 IndexedDB 讀取現有 session
            const existingSession = await getSession(uuid);

            if (existingSession && existingSession.session_id && existingSession.expires_at) {
                const expiresAt = new Date(existingSession.expires_at);
                if (expiresAt > new Date() && existingSession.reads_remaining > 0) {
                    sessionId = existingSession.session_id;
                    sessionData = existingSession;
                }
            }
        }

        if (!sessionId) {
            const tapResult = await tapCard(uuid);
            sessionId = tapResult.session_id;
            sessionData = {
                session_id: tapResult.session_id,
                expires_at: tapResult.expires_at,
                reads_remaining: tapResult.max_reads - tapResult.reads_used
            };
            await saveSession(uuid, sessionData);
        }

        const readResult = await readCard(uuid, sessionId);
        cardData = readResult.data;
        sessionData = {
            session_id: sessionId,
            expires_at: readResult.session_info.expires_at,
            reads_remaining: readResult.session_info.reads_remaining
        };

        await saveSession(uuid, sessionData);
        await saveCard(uuid, cardData);

    } catch (error) {
        console.error('Error loading card:', error);

        if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
            const result = await handleNetworkError(uuid);
            if (result.cachedData) {
                cardData = result.cachedData;
                isOffline = true;
            } else {
                throw error;
            }
        } else if (error.message.includes('expired')) {
            const result = await handleSessionExpired(uuid);
            if (result.cachedData) {
                cardData = result.cachedData;
                isOffline = true;
            } else {
                throw error;
            }
        } else if (error.message.includes('exceeded')) {
            const result = await handleMaxReadsExceeded(uuid);
            if (result.cachedData) {
                cardData = result.cachedData;
                isOffline = true;
            } else {
                throw error;
            }
        } else {
            throw error;
        }
    }

    if (cardData) {
        renderCard(cardData, sessionData, isOffline);
    } else {
        showError('無法載入名片資料');
    }
}

function renderCard(cardData, sessionData, isOffline = false) {
    if (isOffline) {
        document.getElementById('offline-badge').classList.remove('hidden');
    }

    const name = getLocalizedText(cardData.name, currentLanguage);
    const title = getLocalizedText(cardData.title, currentLanguage);
    const greetings = getLocalizedArray(cardData.greetings, currentLanguage);

    document.getElementById('user-name').textContent = name || '---';
    document.getElementById('user-title').textContent = title || '---';
    
    // 大頭貼處理 - 支援 Google Drive URL 轉換
    const avatarContainer = document.getElementById('user-avatar').closest('.relative');
    if (cardData.avatar) {
        let avatarUrl = cardData.avatar;
        
        // 轉換 Google Drive 分享連結為直接圖片 URL
        // 支援多種格式：
        // 1. https://drive.google.com/file/d/FILE_ID/view?usp=sharing
        // 2. https://drive.google.com/open?id=FILE_ID
        const driveMatch = avatarUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([^\/\?&]+)/);
        if (driveMatch) {
            const fileId = driveMatch[1];
            // 使用 thumbnail API 更穩定
            avatarUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
        }
        
        const imgElement = document.getElementById('user-avatar');
        imgElement.src = avatarUrl;
        
        // 圖片載入失敗時的處理
        imgElement.onerror = function() {
            console.warn('Avatar failed to load:', avatarUrl);
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

    if (sessionData) {
        const expiresAt = new Date(sessionData.expires_at);
        document.getElementById('session-expiry').textContent = `SESSION EXPIRES: ${expiresAt.toLocaleString(currentLanguage === 'zh' ? 'zh-TW' : 'en-US')}`;
        document.getElementById('session-reads').textContent = `ATTEMPTS REMAINING: ${sessionData.reads_remaining}`;
    }

    // 社群連結處理 - 無資料時隱藏整個區塊
    const socialCluster = document.getElementById('social-cluster');
    if (cardData.socialLinks && cardData.socialLinks.socialNote) {
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
    const name = getLocalizedText(cardData.name, currentLanguage);
    const title = getLocalizedText(cardData.title, currentLanguage);
    
    let vcard = 'BEGIN:VCARD\n';
    vcard += 'VERSION:3.0\n';
    vcard += `FN:${name}\n`;
    vcard += `TITLE:${title || ''}\n`;
    
    if (cardData.email) {
        vcard += `EMAIL:${cardData.email}\n`;
    }
    
    if (cardData.phone) {
        vcard += `TEL;TYPE=WORK:${cardData.phone}\n`;
    }
    
    if (cardData.mobile) {
        vcard += `TEL;TYPE=CELL:${cardData.mobile}\n`;
    }
    
    if (cardData.department) {
        vcard += `ORG:數位發展部;${cardData.department}\n`;
    }
    
    vcard += 'END:VCARD';
    return vcard;
}

document.getElementById('lang-switch').addEventListener('click', () => {
    // 切換語言
    currentLanguage = currentLanguage === 'zh' ? 'en' : 'zh';
    
    // 更新 HTML lang 屬性（無障礙）
    document.documentElement.lang = currentLanguage === 'zh' ? 'zh-TW' : 'en';
    
    // 更新按鈕文字
    document.getElementById('lang-switch').textContent = currentLanguage === 'zh' ? 'EN' : '繁中';
    
    // 更新按鈕文字（根據語言）
    updateButtonTexts();
    
    // 重新渲染名片
    const params = new URLSearchParams(window.location.search);
    const uuid = params.get('uuid');
    
    getCard(uuid).then(cardData => {
        if (cardData) {
            getSession(uuid).then(sessionData => {
                renderCard(cardData, sessionData, false);
            });
        }
    });
});

// vCard 下載
document.getElementById('save-vcard').addEventListener('click', () => {
    const params = new URLSearchParams(window.location.search);
    const uuid = params.get('uuid');
    
    getCard(uuid).then(cardData => {
        if (cardData) {
            const vcard = generateVCard(cardData);
            const blob = new Blob([vcard], { type: 'text/vcard' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // 根據當前語言狀態決定檔名
            const name = typeof cardData.name === 'object' 
                ? (currentLanguage === 'zh' ? (cardData.name.zh || cardData.name.en) : (cardData.name.en || cardData.name.zh))
                : cardData.name;
            a.download = `${name || 'contact'}.vcf`;
            a.click();
            URL.revokeObjectURL(url);
            showNotification('vCard 已下載', 'success');
        }
    });
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
