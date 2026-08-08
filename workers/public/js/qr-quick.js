// QR Quick - PWA install + QR code display
// Extracted from qr-quick.html inline script

// Auto language detection
const lang = (navigator.language || 'zh-TW').toLowerCase().startsWith('zh') ? 'zh' : 'en';
const i18n = {
  'qr-subtitle': { 'zh': '掃描 QR Code 查看名片', 'en': 'Scan QR Code to view card' },
  'qr-instruction': { 'zh': '使用手機相機或任何 QR Code 掃描器<br>即可開啟此名片', 'en': 'Use your phone camera or any QR Code scanner<br>to open this card' },
  'install-title': { 'zh': '加到主畫面', 'en': 'Add to Home Screen' },
  'install-subtitle': { 'zh': '隨時打開，立即分享', 'en': 'Quick access, instant sharing' },
  'ios-guide-title': { 'zh': 'iOS Safari 安裝步驟', 'en': 'iOS Safari Installation' },
  'ios-guide-text': { 'zh': '點選 <svg style="display:inline;width:1rem;height:1rem;vertical-align:middle" fill="currentColor" viewBox="0 0 24 24"><path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/></svg> → 加入主畫面 → 完成', 'en': 'Tap <svg style="display:inline;width:1rem;height:1rem;vertical-align:middle" fill="currentColor" viewBox="0 0 24 24"><path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/></svg> → Add to Home Screen → Done' },
  'chrome-warning': { 'zh': '⚠️ 需要使用 Safari', 'en': '⚠️ Safari Required' },
  'chrome-text': { 'zh': 'Chrome 不支援此功能，將自動切換到 Safari 瀏覽器', 'en': 'Chrome does not support this feature. Will switch to Safari' },
  'open-safari': { 'zh': '在 Safari 中打開', 'en': 'Open in Safari' },
  'android-install': { 'zh': '安裝（3 秒完成）', 'en': 'Install (3 seconds)' },
  'android-confirm': { 'zh': '點擊後會顯示瀏覽器確認對話框', 'en': 'Browser confirmation dialog will appear' },
  'android-manual-title': { 'zh': 'Android 安裝步驟', 'en': 'Android Installation' },
  'android-manual-text': { 'zh': '選單 (⋮) → 加到主畫面 → 完成', 'en': 'Menu (⋮) → Add to Home Screen → Done' },
  'desktop-title': { 'zh': '桌面版瀏覽器', 'en': 'Desktop Browser' },
  'desktop-text': { 'zh': '請使用手機瀏覽器開啟此頁面，或複製連結傳送到手機。', 'en': 'Please open this page on a mobile browser, or copy the link to your phone.' },
  'copy-link': { 'zh': '複製連結', 'en': 'Copy Link' },
  'success-title': { 'zh': '已加入主畫面', 'en': 'Added to Home Screen' },
  'success-text': { 'zh': '您現在可以從主畫面開啟 QR Code 了', 'en': 'You can now open QR Code from home screen' },
  'back-to-portal': { 'zh': '返回名片列表', 'en': 'Back to Card List' }
};
document.querySelectorAll('[data-i18n]').forEach(el => {
  const key = el.getAttribute('data-i18n');
  if (i18n[key]) el.textContent = i18n[key][lang];
});

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });

const params = new URLSearchParams(window.location.search);
const uuid = params.get('uuid');
const name = params.get('name') || '數位名片';
const type = params.get('type') || 'personal';

if (!uuid) {
  const card = document.createElement('div');
  card.className = 'card';
  const p = document.createElement('p');
  p.textContent = '錯誤：缺少名片 ID';
  card.appendChild(p);
  document.body.innerHTML = '';
  document.body.appendChild(card);
  throw new Error('Missing uuid');
}

// Add type suffix for title
const typeSuffix = type === 'personal' ? '' :
                   type === 'event' ? '（活動）' :
                   type === 'sensitive' ? '（敏感）' : '';
const displayName = type === 'personal' ? `${name}的名片` : `${name}的名片${typeSuffix}`;

document.getElementById('dynamic-manifest').href = `/api/manifest/${uuid}?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
document.title = displayName;

const ua = navigator.userAgent;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

if (isStandalone) {
  document.getElementById('install-view').classList.add('hidden');
  document.getElementById('qr-view').classList.remove('hidden');
  document.getElementById('qr-card-name').textContent = displayName;
  const size = Math.min(window.innerWidth - 80, 320);
  const shareUrl = `${window.location.origin}/card-display.html?uuid=${uuid}`;
  new QRious({ element: document.getElementById('qr'), value: shareUrl, size: size, level: 'H' });
} else {
  const isMobile = navigator.userAgentData ? navigator.userAgentData.mobile : /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  if (!isMobile) {
    document.getElementById('desktop-guide').classList.remove('hidden');
  } else {
    const isIOS = /iPad|iPhone|iPod/i.test(ua);
    const isIOSChrome = isIOS && /CriOS/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    if (isIOSChrome) {
      document.getElementById('ios-chrome-guide').classList.remove('hidden');
    } else if (isIOS) {
      document.getElementById('ios-guide').classList.remove('hidden');
    } else if (isAndroid) {
      document.getElementById('android-guide').classList.remove('hidden');
      if (deferredPrompt) {
        document.getElementById('android-auto').classList.remove('hidden');
        document.getElementById('android-manual').classList.add('hidden');
      } else {
        document.getElementById('android-auto').classList.add('hidden');
        document.getElementById('android-manual').classList.remove('hidden');
      }
    } else {
      document.getElementById('android-guide').classList.remove('hidden');
      document.getElementById('android-auto').classList.add('hidden');
      document.getElementById('android-manual').classList.remove('hidden');
    }
  }
}

function triggerInstall() {
  if (!deferredPrompt) {
    document.getElementById('android-auto').classList.add('hidden');
    document.getElementById('android-manual').classList.remove('hidden');
    return;
  }
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(result => {
    if (result.outcome === 'accepted') {
      document.getElementById('android-guide').classList.add('hidden');
      document.getElementById('success-message').classList.remove('hidden');
    }
    deferredPrompt = null;
  });
}

function openInSafari() {
  const safariUrl = window.location.href.replace('https://', 'x-safari-https://');
  window.location.href = safariUrl;
}

async function copyLink(event) {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    const btn = event.target.closest('button');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="check" style="width:1rem;height:1rem;display:inline-block;vertical-align:middle;margin-right:0.5rem"></i>已複製';
    window.initIcons();
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      window.initIcons();
    }, 2000);
  } catch (err) {
    console.error('Copy failed:', err);
    alert('複製失敗，請手動複製連結');
  }
}

function backToPortal() {
  window.location.href = '/user-portal.html';
}

// Delegated event handler for data-action buttons
document.addEventListener('click', (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  if (action === 'triggerInstall') triggerInstall();
  else if (action === 'openInSafari') openInSafari();
  else if (action === 'copyLink') copyLink(e);
  else if (action === 'backToPortal') backToPortal();
});

// Initialize icons
if (typeof window.initIcons === 'function') {
  window.initIcons();
}
