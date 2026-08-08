// DB-Card i18n Module
// Auto-extracted from user-portal-init.js

// ==================== i18n Translations (Batch 1) ====================
const i18n = {
    zh: {
        // 1. Login Page (5 keys)
        'login-title': 'DB-Card 數位名片系統',
        'login-subtitle': '請使用內部 Google 帳號登入',
        'login-button': '使用 Google 帳號登入',
        'login-restriction': '僅限授權使用者',

        // 2. Card Selection (5 keys)
        'selection-title': '我的數位名片',
        'selection-subtitle': '管理您的數位名片，最多可建立三張不同用途的名片',
        'card-type-personal': '個人名片',
        'card-type-event': '活動名片',
        'card-type-sensitive': '敏感名片',

        // 3. Form Labels (15 keys)
        'form-title': '編輯數位名片',
        'form-subtitle': 'Self-Service Issuance',
        'label-department': '選擇您的所屬部門',
        'label-name': '姓名',
        'label-title': '職稱',
        'label-email': 'Email',
        'label-phone': '辦公室電話',
        'label-web': '官方網站連結',
        'label-address': '辦公地址',
        'label-mobile': '手機號碼',
        'label-avatar': '大頭貼連結',
        'label-greeting': '關於我',
        'label-social': '社群連結',
        'advanced-section': '進階與社群資訊',

        // 4. Buttons (8 keys)
        'button-cancel': '取消',
        'button-submit': '送出',
        'button-create': '創建名片',
        'button-edit': '編輯',
        'button-revoke': '撤銷',
        'button-close': '關閉',
        'button-confirm': '確認',
        'button-copy': '複製',

        // 5. Form Placeholder (10 keys)
        'placeholder-email': 'your.email@moda.gov.tw',
        'placeholder-phone': '02-1234-5678',
        'placeholder-web': 'https://moda.gov.tw',
        'placeholder-mobile': '0912-345-678',
        'placeholder-avatar': 'https://example.com/avatar.jpg',
        'placeholder-greeting-zh': '您好，很高興認識您',
        'placeholder-greeting-en': 'Hello, nice to meet you',
        'placeholder-github': 'https://github.com/username',
        'placeholder-linkedin': 'https://linkedin.com/in/username',
        'placeholder-twitter': 'https://twitter.com/username',

        // 6. Success Modal (12 keys)
        'modal-success-title': '名片已儲存',
        'modal-success-subtitle': '您的名片已成功更新',
        'modal-share-link': '分享連結',
        'modal-share-desc': '可透過此連結分享您的名片',
        'modal-qr-title': '加入主畫面',
        'modal-qr-desc': '一鍵快速開啟',
        'modal-nfc-title': '寫入 NFC 卡片',
        'modal-nfc-desc': '實體卡片快速分享',
        'modal-short-title': '縮短網址',
        'modal-short-desc': '方便線上分享',
        'modal-copied': '已複製',
        'modal-copy-failed': '複製失敗',

        // 7. Revoke Modal (8 keys)
        'modal-revoke-title': '確認撤銷名片',
        'modal-revoke-subtitle': '撤銷後，所有分享連結將立即失效',
        'modal-revoke-warning': '可在 7 天內自行恢復',
        'modal-revoke-reason': '撤銷原因（選填）',
        'revoke-reason-none': '不提供原因',
        'revoke-reason-lost': '卡片遺失',
        'revoke-reason-leak': '疑似資訊外洩',
        'revoke-reason-update': '資訊需更新',

        // 8. Preview Block (4 keys) - preview-title moved to Received Cards
        'preview-footer': 'Digital Twin Preview',
        'preview-email-label': '電子郵件',
        'preview-phone-label': '辦公室電話',
        'preview-mobile-label': '手機',

        // 9. Error Messages (8 keys)
        'error-login-failed': '登入失敗，請稍後再試',
        'error-unauthorized': '您的帳號未獲授權',
        'error-network': '網路連線錯誤',
        'error-invalid-email': 'Email 格式不正確',
        'error-required-field': '此欄位為必填',
        'error-save-failed': '儲存失敗，請稍後再試',
        'error-revoke-failed': '撤銷失敗，請稍後再試',
        'error-rate-limit': '操作過於頻繁，請稍後再試',

        // 10. Auxiliary Text (4 keys)
        'loading': '載入中...',
        'processing': '處理中...',
        'saving': '儲存中...',
        'success': '成功',

        // 11. Consent Management (30 keys)
        'consent-title': '隱私權與個人資料保護政策',
        'consent-subtitle': '請詳閱以下條款，同意後方可使用服務',
        'consent-required-label': '必要同意（服務使用）',
        'consent-optional-label': '選擇性同意（匿名統計）',
        'consent-scroll-hint': '請滾動至底部閱讀完整內容',
        'consent-agree-button': '我已詳閱並同意',
        'consent-decline-button': '不同意',
        'consent-accepting': '處理中...',
        'consent-version': '版本',
        'consent-effective-date': '生效日期',
        'withdraw-title': '撤回個資同意',
        'withdraw-subtitle': '撤回後將無法使用服務',
        'withdraw-warning': '您的資料將在 30 天後永久刪除',
        'withdraw-deletion-date': '預計刪除日期',
        'withdraw-confirm-text': '請輸入「確認撤回」以繼續',
        'withdraw-confirm-placeholder': '確認撤回',
        'withdraw-understand-checkbox': '我了解撤回後果',
        'withdraw-button': '確認撤回同意',
        'withdraw-canceling': '取消中...',
        'restore-title': '恢復個資同意',
        'restore-subtitle': '您的資料將被保留',
        'restore-days-remaining': '剩餘時間',
        'restore-button': '取消撤回（恢復同意）',
        'restore-continue-delete': '繼續刪除',
        'restore-restoring': '恢復中...',
        'history-title': '同意歷史記錄',
        'history-no-records': '無歷史記錄',
        'privacy-settings-title': '個資管理',
        'privacy-view-history': '查看同意歷史',
        'privacy-export-data': '匯出我的資料',
        'privacy-withdraw-consent': '撤回同意',

        // Received Cards (40 keys)
        'received-cards-title': '收到的名片',
        'received-cards-subtitle': 'AI-First Card Capture',
        'received-cards-description': '拍照上傳名片，AI 自動辨識並整理。管理您收到的所有名片',
        'received-cards-open': '開啟名片夾',
        'upload-title': '拍照或上傳名片',
        'upload-subtitle': '支援 JPG/PNG，最大 5MB',
        'ai-processing': 'AI 處理中...',
        'ai-step-uploading': '上傳中',
        'ai-step-ocr': '辨識與補全',
        'skip-ai': '跳過 AI，直接儲存',
        'preview-title': '確認名片資訊',
        'delete-confirm-title': '確定要刪除名片嗎？',
        'delete-confirm-warning': '⚠️ 此操作無法復原',
        'delete-confirm-cancel': '取消',
        'delete-confirm-ok': '確定刪除',
        'search-placeholder': '搜尋名片...',
        'tag-filter-label': '標籤篩選：',
        'tag-all': '全部',
        'edit-card-title': '編輯名片',
        'enrich-card-btn': '補充名片資訊',
        'enrich-card-time': '(約需 10-30 秒)',
        'card-detail-title': '名片詳情',
        
        // AI Summary Fields (6 keys)
        'company-summary': '公司摘要',
        'personal-summary': '個人摘要',
        'ai-generated': 'AI 生成',
        'company-summary-placeholder': 'AI 會自動生成公司簡介，包含產業、業務、規模等資訊...',
        'personal-summary-placeholder': 'AI 會自動生成個人簡介，包含專長、成就、經歷等...',
        'company-summary-hint': '建議 100-200 字，描述組織的產業、主要業務、成立年份、規模等',
        'personal-summary-hint': '建議 30-80 字，總結專業背景、核心專長或主要成就',
        
        // Field Labels (13 keys)
        'field-name-prefix': '稱謂',
        'field-full-name': '姓名 *',
        'field-name-suffix': '後綴',
        'field-organization': '公司',
        'field-organization-en': '公司英文名稱',
        'field-organization-alias': '公司簡稱',
        'field-department': '部門',
        'field-title': '職稱',
        'field-phone': '電話',
        'field-email': 'Email',
        'field-website': '網站',
        'field-address': '地址',
        'field-note': '備註',
        'share-with-users': '分享給其他使用者',

        // WebView Warning
        'webview_warning_title': '不支援的瀏覽器',
        'webview_warning_message': '此頁面不支援應用程式內建瀏覽器。請使用系統瀏覽器（Chrome、Safari、Firefox）開啟此連結。',
        'copy_url': '複製網址',
        'url_copied': '網址已複製',
        'close': '關閉',

        // Self-Card OCR
        'scan-button': '📷 從實體名片掃描',
        'scan-processing': 'AI 辨識中...',
        'prov-observed': '名片上可見',
        'prov-translated': 'AI 翻譯',
        'prov-inferred': 'AI 推測'
    },
    en: {
        // 1. Login Page (5 keys)
        'login-title': 'DB-Card Digital Business Card',
        'login-subtitle': 'Please sign in with your internal Google account',
        'login-button': 'Sign in with Google',
        'login-restriction': 'Authorized Users Only',

        // 2. Card Selection (5 keys)
        'selection-title': 'My Digital Cards',
        'selection-subtitle': 'Manage your digital cards, create up to three cards for different purposes',
        'card-type-personal': 'Personal Card',
        'card-type-event': 'Event Card',
        'card-type-sensitive': 'Sensitive Card',

        // 3. Form Labels (15 keys)
        'form-title': 'Edit Digital Card',
        'form-subtitle': 'Self-Service Issuance',
        'label-department': 'Select Your Department',
        'label-name': 'Name',
        'label-title': 'Title',
        'label-email': 'Email',
        'label-phone': 'Office Phone',
        'label-web': 'Official Website',
        'label-address': 'Office Address',
        'label-mobile': 'Mobile Number',
        'label-avatar': 'Avatar URL',
        'label-greeting': 'About Me',
        'label-social': 'Social Links',
        'advanced-section': 'Advanced & Social Info',

        // 4. Buttons (8 keys)
        'button-cancel': 'Cancel',
        'button-submit': 'Submit',
        'button-create': 'Create Card',
        'button-edit': 'Edit',
        'button-revoke': 'Revoke',
        'button-close': 'Close',
        'button-confirm': 'Confirm',
        'button-copy': 'Copy',

        // 5. Form Placeholder (10 keys)
        'placeholder-email': 'your.email@moda.gov.tw',
        'placeholder-phone': '02-1234-5678',
        'placeholder-web': 'https://moda.gov.tw',
        'placeholder-mobile': '0912-345-678',
        'placeholder-avatar': 'https://example.com/avatar.jpg',
        'placeholder-greeting-zh': 'Hello, nice to meet you',
        'placeholder-greeting-en': 'Hello, nice to meet you',
        'placeholder-github': 'https://github.com/username',
        'placeholder-linkedin': 'https://linkedin.com/in/username',
        'placeholder-twitter': 'https://twitter.com/username',

        // 6. Success Modal (12 keys)
        'modal-success-title': 'Card Saved',
        'modal-success-subtitle': 'Your card has been successfully updated',
        'modal-share-link': 'Share Link',
        'modal-share-desc': 'Share your card via this link',
        'modal-qr-title': 'Add to Home Screen',
        'modal-qr-desc': 'Quick access',
        'modal-nfc-title': 'Write to NFC Card',
        'modal-nfc-desc': 'Physical card sharing',
        'modal-short-title': 'Shorten URL',
        'modal-short-desc': 'Easy online sharing',
        'modal-copied': 'Copied',
        'modal-copy-failed': 'Copy failed',

        // 7. Revoke Modal (8 keys)
        'modal-revoke-title': 'Confirm Revoke Card',
        'modal-revoke-subtitle': 'All shared links will be immediately invalidated',
        'modal-revoke-warning': 'Can be restored within 7 days',
        'modal-revoke-reason': 'Revoke Reason (Optional)',
        'revoke-reason-none': 'No reason provided',
        'revoke-reason-lost': 'Card lost',
        'revoke-reason-leak': 'Suspected information leak',
        'revoke-reason-update': 'Information needs update',

        // 8. Preview Block (4 keys) - preview-title moved to Received Cards
        'preview-footer': 'Digital Twin Preview',
        'preview-email-label': 'Email',
        'preview-phone-label': 'Office Phone',
        'preview-mobile-label': 'Mobile',

        // 9. Error Messages (8 keys)
        'error-login-failed': 'Login failed, please try again later',
        'error-unauthorized': 'Your account is not authorized',
        'error-network': 'Network connection error',
        'error-invalid-email': 'Invalid email format',
        'error-required-field': 'This field is required',
        'error-save-failed': 'Save failed, please try again later',
        'error-revoke-failed': 'Revoke failed, please try again later',
        'error-rate-limit': 'Too many requests, please try again later',

        // 10. Auxiliary Text (4 keys)
        'loading': 'Loading...',
        'processing': 'Processing...',
        'saving': 'Saving...',
        'success': 'Success',

        // 11. Consent Management (30 keys)
        'consent-title': 'Privacy and Personal Data Protection Policy',
        'consent-subtitle': 'Please review the following terms before using our services',
        'consent-required-label': 'Required Consent (Service Usage)',
        'consent-optional-label': 'Optional Consent (Anonymous Statistics)',
        'consent-scroll-hint': 'Please scroll to the bottom to read the complete content',
        'consent-agree-button': 'I have read and agree',
        'consent-decline-button': 'Decline',
        'consent-accepting': 'Processing...',
        'consent-version': 'Version',
        'consent-effective-date': 'Effective Date',
        'withdraw-title': 'Withdraw Personal Data Consent',
        'withdraw-subtitle': 'You will not be able to use the service after withdrawal',
        'withdraw-warning': 'Your data will be permanently deleted in 30 days',
        'withdraw-deletion-date': 'Scheduled Deletion Date',
        'withdraw-confirm-text': 'Type "CONFIRM WITHDRAW" to continue',
        'withdraw-confirm-placeholder': 'CONFIRM WITHDRAW',
        'withdraw-understand-checkbox': 'I understand the consequences',
        'withdraw-button': 'Confirm Withdrawal',
        'withdraw-canceling': 'Withdrawing...',
        'restore-title': 'Restore Personal Data Consent',
        'restore-subtitle': 'Your data will be retained',
        'restore-days-remaining': 'Days Remaining',
        'restore-button': 'Cancel Withdrawal (Restore Consent)',
        'restore-continue-delete': 'Continue Deletion',
        'restore-restoring': 'Restoring...',
        'history-title': 'Consent History',
        'history-no-records': 'No History Records',
        'privacy-settings-title': 'Privacy Management',
        'privacy-view-history': 'View Consent History',
        'privacy-export-data': 'Export My Data',
        'privacy-withdraw-consent': 'Withdraw Consent',

        // Received Cards (40 keys)
        'received-cards-title': 'Received Cards',
        'received-cards-subtitle': 'AI-First Card Capture',
        'received-cards-description': 'Take a photo and let AI organize your cards. Manage all received cards',
        'received-cards-open': 'Open Card Holder',
        'upload-title': 'Take Photo or Upload Card',
        'upload-subtitle': 'Supports JPG/PNG, max 5MB',
        'ai-processing': 'AI Processing...',
        'ai-step-uploading': 'Uploading',
        'ai-step-ocr': 'Recognizing & Enriching',
        'skip-ai': 'Skip AI, Save Now',
        'preview-title': 'Confirm Card Information',
        'delete-confirm-title': 'Delete this card?',
        'delete-confirm-warning': '⚠️ This action cannot be undone',
        'delete-confirm-cancel': 'Cancel',
        'delete-confirm-ok': 'Confirm Delete',
        'search-placeholder': 'Search cards...',
        'tag-filter-label': 'Filter by Tag:',
        'tag-all': 'All',
        'edit-card-title': 'Edit Card',
        'enrich-card-btn': 'Enrich Card Info',
        'enrich-card-time': '(10-30 seconds)',
        'card-detail-title': 'Card Details',
        
        // AI Summary Fields (6 keys)
        'company-summary': 'Company Summary',
        'personal-summary': 'Personal Summary',
        'ai-generated': 'AI Generated',
        'company-summary-placeholder': 'AI will generate company profile including industry, business, scale...',
        'personal-summary-placeholder': 'AI will generate personal profile including expertise, achievements...',
        'company-summary-hint': 'Recommended 100-200 chars: industry, business, founding year, scale, etc.',
        'personal-summary-hint': 'Recommended 30-80 chars: professional background, expertise, achievements',
        
        // Field Labels (13 keys)
        'field-name-prefix': 'Prefix',
        'field-full-name': 'Full Name *',
        'field-name-suffix': 'Suffix',
        'field-organization': 'Organization',
        'field-organization-en': 'Organization (English)',
        'field-organization-alias': 'Organization Alias',
        'field-department': 'Department',
        'field-title': 'Title',
        'field-phone': 'Phone',
        'field-email': 'Email',
        'field-website': 'Website',
        'field-address': 'Address',
        'field-note': 'Note',
        'share-with-users': 'Share with Users',

        // WebView Warning
        'webview_warning_title': 'Unsupported Browser',
        'webview_warning_message': 'This page does not support in-app browsers. Please open this link in your system browser (Chrome, Safari, Firefox).',
        'copy_url': 'Copy URL',
        'url_copied': 'URL copied',
        'close': 'Close',

        // Self-Card OCR
        'scan-button': '📷 Scan from Physical Card',
        'scan-processing': 'AI Processing...',
        'prov-observed': 'Visible on card',
        'prov-translated': 'AI translated',
        'prov-inferred': 'AI inferred'
    }
};

// Auto-detect browser language and apply translations
const userLang = (navigator.language || navigator.userLanguage || 'zh-TW').toLowerCase();
const currentLang = userLang.startsWith('zh') ? 'zh' : 'en';

function applyTranslations(lang) {
    const translations = i18n[lang] || i18n.zh;

    // Handle data-i18n for text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            // Handle different element types
            if (el.tagName === 'INPUT' && el.type === 'button') {
                el.value = translations[key];
            } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[key];
            } else {
                el.textContent = translations[key];
            }
        }
    });

    // Handle data-i18n-placeholder for placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[key]) {
            el.placeholder = translations[key];
        }
    });
}


// Export
export { i18n, currentLang, applyTranslations };
