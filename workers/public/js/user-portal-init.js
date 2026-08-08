        /* global isHEIC, compressImageWithCancellation, fileToBase64, generateIdempotencyKey */
        // API Base URL
        const API_BASE = window.location.origin;

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

        // CardStateManager: 管理狀態、快照、樂觀更新和回滾
        class CardStateManager {
            constructor() {
                this.state = { cards: [] };
                this.snapshots = [];
                this.syncQueue = [];
                this.isSyncing = false;
            }

            // 初始化狀態
            initialize(cards) {
                this.state.cards = cards.map(card => ({ ...card }));
            }

            // 獲取當前狀態
            getState() {
                return this.state;
            }

            // 快照當前狀態
            snapshot() {
                this.snapshots.push(JSON.parse(JSON.stringify(this.state)));
            }

            // 樂觀創建
            optimisticCreate(type, cardData) {
                this.snapshot();

                const tempId = `temp_${Date.now()}`;
                const timestamp = new Date().toISOString();

                this.state.cards = this.state.cards.map(card =>
                    card.type === type
                        ? {
                            ...card,
                            uuid: tempId,
                            status: 'bound',
                            name_zh: cardData.name_zh,
                            name_en: cardData.name_en,
                            updated_at: timestamp,
                            _optimistic: true
                        }
                        : card
                );

                return tempId;
            }

            // 確認創建
            confirmCreate(tempId, realUuid, serverData) {
                this.state.cards = this.state.cards.map(card =>
                    card.uuid === tempId
                        ? {
                            uuid: realUuid,
                            type: card.type,
                            status: 'bound',
                            name_zh: serverData.name_zh || card.name_zh,
                            name_en: serverData.name_en || card.name_en,
                            updated_at: serverData.updated_at || card.updated_at,
                            _optimistic: false
                        }
                        : card
                );

                this.snapshots = [];
            }

            // 回滾
            rollback() {
                if (this.snapshots.length > 0) {
                    this.state = this.snapshots.pop();
                    return true;
                }
                return false;
            }

            // 加入同步隊列
            queueSync(task) {
                this.syncQueue.push(task);
                this.processSyncQueue();
            }

            // 處理同步隊列
            async processSyncQueue() {
                if (this.isSyncing || this.syncQueue.length === 0) return;

                this.isSyncing = true;

                while (this.syncQueue.length > 0) {
                    const task = this.syncQueue.shift();
                    try {
                        await task();
                    } catch (error) {
                        console.error('Background sync failed:', error);
                    }
                }

                this.isSyncing = false;
            }
        }

        // ErrorHandler: 統一錯誤處理
        class ErrorHandler {
            constructor() {
                this.handlers = new Map([
                    ['CARD_NOT_FOUND', '名片不存在，請重新創建'],
                    ['NETWORK_ERROR', '網路連線失敗，請檢查網路'],
                    ['VALIDATION_ERROR', '資料格式錯誤，請檢查輸入'],
                    ['UNAUTHORIZED', '登入已過期，請重新登入'],
                    ['FORBIDDEN', '權限不足'],
                    ['SERVER_ERROR', '伺服器錯誤，請稍後再試'],
                    ['binding_limit_exceeded', '您已經有此類型的名片，每種類型限制 1 張'],
                    ['invalid_type', '名片類型錯誤'],
                    ['invalid_data', '資料格式錯誤'],
                    ['CARD_ALREADY_REVOKED', '名片已經被撤銷'],
                    ['CARD_NOT_REVOKED', '名片未處於撤銷狀態'],
                    ['REVOCATION_RATE_LIMITED', '撤銷次數超過限制'],
                    ['RESTORE_WINDOW_EXPIRED', '恢復期限已過（7 天），請聯繫管理員'],
                    // v4.1.0 & v4.2.0: Rate limit and budget error codes
                    ['rate_limited', '請求過於頻繁，請稍後再試'],
                    ['session_budget_exceeded', '此名片已達到使用上限，請聯絡管理員'],
                    ['daily_budget_exceeded', '今日使用次數已達上限，請明天再試'],
                    ['monthly_budget_exceeded', '本月使用次數已達上限，請下月再試'],
                    [401, '登入已過期，請重新登入'],
                    [403, '權限不足'],
                    [404, '資源不存在'],
                    [409, '名片已存在'],
                    [429, '操作過於頻繁，請稍後再試'],
                    [500, '伺服器錯誤，請稍後再試'],
                    [0, '網路連線失敗']
                ]);
            }

            // 取得當前語言的錯誤訊息
            getI18nError(key) {
                const i18nKey = `error-${key}`;
                return i18n[currentLang][i18nKey] || null;
            }

            handle(error) {
                // 優先處理 code
                if (error?.code && this.handlers.has(error.code)) {
                    return this.handlers.get(error.code);
                }

                // 其次處理 status
                if (error?.status && this.handlers.has(error.status)) {
                    return this.handlers.get(error.status);
                }

                // 最後處理 message
                if (error?.message) {
                    return error.message;
                }

                if (error?.error) {
                    return error.error;
                }

                if (typeof error === 'string') {
                    return error;
                }

                return '未知錯誤';
            }

            register(code, message) {
                this.handlers.set(code, message);
            }
        }

        // 全局實例
        const stateManager = new CardStateManager();
        const errorHandler = new ErrorHandler();

        // Helper function to get headers with CSRF token
        function getHeadersWithCSRF(baseHeaders = {}) {
            const csrfToken = sessionStorage.getItem('csrfToken');
            if (csrfToken) {
                return {
                    ...baseHeaders,
                    'X-CSRF-Token': csrfToken
                };
            }
            return baseHeaders;
        }

        const state = {
            isLoggedIn: false,
            currentUser: null,
            authToken: null, // JWT token
            cards: [], // 格式: { uuid, type, status, name_zh, name_en, updated_at }
            loading: false
        };

        // 自動偵測瀏覽器語言（使用 currentLang 保持一致）
        // previewLang: shared mutable via window (used by self-card-ocr.js updatePreview)
        window.previewLang = currentLang;
        // currentModalUuid, currentRevokeUuid, currentRevokeType: migrated to self-card-ocr.js

        const SocialParser = {
            collectFromInputs() {
                const platforms = [
                    { id: 'social_github', icon: 'github' },
                    { id: 'social_linkedin', icon: 'linkedin' },
                    { id: 'social_facebook', icon: 'facebook' },
                    { id: 'social_instagram', icon: 'instagram' },
                    { id: 'social_twitter', icon: 'twitter' },
                    { id: 'social_youtube', icon: 'youtube' },
                    { id: 'social_line', icon: 'line' },
                    { id: 'social_signal', icon: 'signal' }
                ];

                const results = [];

                for (const platform of platforms) {
                    const input = document.getElementById(platform.id);
                    if (input && input.value.trim()) {
                        results.push(platform.icon);
                    }
                }

                return results;
            }
        };

        function getCardTypeLabel(type) {
            const typeMap = {
                'personal': 'card-type-personal',
                'event': 'card-type-event',
                'sensitive': 'card-type-sensitive'
            };
            return i18n[currentLang][typeMap[type]] || type;
        }

        const CARD_TYPES = [
            {
                id: 'personal',
                label: 'Personal',
                icon: 'user',
                color: 'indigo',
                desc: '標準個人名片',
                features: ['同時讀取限制: 20 人', '適合日常使用', '100/日, 1000/月, 10000/總計']
            },
            {
                id: 'event',
                label: 'Event',
                icon: 'megaphone',
                color: 'green',
                desc: '活動專用名片',
                features: ['同時讀取限制: 50 人', '適合展會攤位', '500/日, 5000/月, 50000/總計']
            },
            {
                id: 'sensitive',
                label: 'Sensitive',
                icon: 'shield',
                color: 'red',
                desc: '最高安全等級',
                features: ['同時讀取限制: 5 人', '零快取暴露', '適用: 高敏感資訊、機密聯絡方式', '3/日, 30/月, 100/總計'],
                securityBadge: true
            }
        ];

        // 地址預設選項
        const ADDRESS_PRESETS = {
            yanping: {
                zh: '10058 台北市中正區延平南路143號',
                en: '143 Yanping South Road, Zhongzheng District, Taipei City 10058, Taiwan'
            },
            shinkong: {
                zh: '臺北市中正區忠孝西路一段66號（17、19樓）',
                en: '66 Zhongxiao West Road Section 1, Zhongzheng District, Taipei City 100, Taiwan'
            }
        };


        async function apiCall(endpoint, options = {}) {
            if (window.__sessionExpired) {
                throw { status: 401, code: 'SESSION_EXPIRED', message: '登入已過期' };
            }
            try {
                const headers = getHeadersWithCSRF({
                    'Content-Type': 'application/json',
                    ...options.headers
                });

                // Token is automatically sent via HttpOnly cookie
                // No need for Authorization header

                const res = await fetch(endpoint, {
                    ...options,
                    credentials: 'include',
                    headers
                });

                if (!res.ok) {
                    const error = await res.json().catch(() => ({ message: 'Request failed' }));

                    // Handle token expiration (circuit breaker)
                    if (res.status === 401) {
                        if (!window.__sessionExpired) {
                            window.__sessionExpired = true;
                            state.isLoggedIn = false;
                            state.authToken = null;
                            state.currentUser = null;
                            sessionStorage.removeItem('auth_user');
                            sessionStorage.removeItem('csrfToken');
                            showToast('登入已過期，請重新登入');
                        }
                        showView('login');
                    }

                    // Extract error details (support nested error object)
                    const errorDetails = error.error || error;
                    throw { 
                        status: res.status, 
                        code: errorDetails.code,
                        message: errorDetails.message || error.message || 'Request failed',
                        existing_uuid: errorDetails.existing_uuid
                    };
                }

                return res.json();
            } catch (err) {
                if (err.status) throw err;
                throw { status: 0, message: i18n[currentLang]['error-network'] || '網路連線失敗' };
            }
        }

        /**
         * Validate session before calling protected APIs
         * Uses consent check as lightweight validator
         * @returns {Promise<boolean>} - true if session valid
         */
        /**
         * Validate session AND check consent in a single API call.
         * Returns { valid: true, consentOk: true } on full success,
         * { valid: true, consentOk: false } if consent needed,
         * { valid: false } if session invalid.
         */
        async function validateSessionAndConsent() {
            try {
                const response = await apiCall('/api/consent/check', { method: 'GET' });
                const data = response.data || response;

                if (data.needs_consent) {
                    showConsentModal(data.current_policy, data.reason);
                    return { valid: true, consentOk: false };
                }

                if (data.is_withdrawn && data.can_restore) {
                    showRestoreConsentModal(data.days_remaining);
                    return { valid: true, consentOk: false };
                }

                return { valid: true, consentOk: true };
            } catch (error) {
                console.error('Session validation failed:', error);
                return { valid: false, consentOk: false };
            }
        }

        function isEmbeddedBrowser() {
          const ua = navigator.userAgent || navigator.vendor || window.opera;
          const patterns = [
            /WebView/i, /\bwv\b/i, /WKWebView/i,
            /FB_IAB/i, /Instagram/i, /Line\//i, /KAKAOTALK/i
          ];
          return patterns.some(pattern => pattern.test(ua));
        }

        function showWebViewWarning() {
          const modal = document.getElementById('webview-warning-modal');
          if (modal) {
            modal.classList.remove('hidden');
          }
        }

        // eslint-disable-next-line no-unused-vars -- Called from HTML onclick
        function closeWebViewWarning() {
          const modal = document.getElementById('webview-warning-modal');
          if (modal) {
            modal.classList.add('hidden');
          }
        }

        // eslint-disable-next-line no-unused-vars -- Called from HTML onclick
        function copyCurrentURL() {
          navigator.clipboard.writeText(window.location.href).then(() => {
            alert(i18n[currentLang]['url_copied'] || 'URL copied!');
          });
        }

        // Check for WebView or OAuth error
        const urlParams = new URLSearchParams(window.location.search);
        if (isEmbeddedBrowser() || urlParams.get('oauth_error') === 'webview_blocked') {
          showWebViewWarning();
          // Disable Google Sign-In button
          const signInBtn = document.getElementById('google-signin-btn');
          if (signInBtn) {
            signInBtn.disabled = true;
            signInBtn.classList.add('opacity-50', 'cursor-not-allowed');
          }
        }

        async function getOAuthConfig() {
          const cached = sessionStorage.getItem('oauth_config');
          if (cached) {
            const { clientId, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < 3600000) {
              return { clientId };
            }
          }

          const res = await fetch('/api/oauth/config');
          if (!res.ok) throw new Error('Failed to fetch OAuth config');
          const config = await res.json();

          sessionStorage.setItem('oauth_config', JSON.stringify({
            ...config,
            timestamp: Date.now()
          }));
          return config;
        }

        // eslint-disable-next-line no-unused-vars -- Called from HTML onclick
        async function handleGoogleLogin() {
            const errorBox = document.getElementById('login-error-box');
            errorBox.classList.add('hidden');

            try {
                // ✅ BDD Scenario 1: Generate OAuth state and nonce (CSRF + Replay Protection)
                const stateResponse = await fetch('/api/oauth/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!stateResponse.ok) {
                    // Check for WebView blocking (403)
                    if (stateResponse.status === 403) {
                        const errorData = await stateResponse.json();
                        if (errorData.error === 'webview_not_allowed') {
                            showWebViewError();
                            return;
                        }
                    }
                    throw new Error('Failed to initialize OAuth');
                }

                const { state, nonce, codeChallenge, codeChallengeMethod } = await stateResponse.json();

                const { clientId } = await getOAuthConfig();
                const redirectUri = window.location.origin + '/oauth/callback';
                const scope = 'openid email profile';

                const authParams = {
                    client_id: clientId,
                    redirect_uri: redirectUri,
                    response_type: 'code',
                    scope: scope,
                    access_type: 'online',
                    prompt: 'select_account',
                    state: state, // CSRF protection
                    nonce: nonce  // Replay protection (Phase 2)
                };

                // Add PKCE parameters (RFC 7636)
                if (codeChallenge) {
                    authParams.code_challenge = codeChallenge;
                    authParams.code_challenge_method = codeChallengeMethod || 'S256';
                }

                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams(authParams);

                // Direct redirect (no popup)
                window.location.href = authUrl;
            } catch (error) {
                console.error('OAuth init error:', error);
                errorBox.innerText = i18n[currentLang]['error-login-failed'] || '登入初始化失敗，請重試';
                errorBox.classList.remove('hidden');
            }
        }

        function showWebViewError() {
            const modal = document.getElementById('webview-error-modal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        }

        async function handleLogout() {
            try {
                // 呼叫後端清除 HttpOnly cookie
                await fetch('/api/user/logout', {
                    method: 'POST',
                    credentials: 'include',
                    headers: getHeadersWithCSRF()
                });
            } catch (err) {
                console.error('Logout API call failed:', err);
                // Continue with frontend cleanup even if API call fails
            }

            // Clear CSRF token from sessionStorage
            sessionStorage.removeItem('csrfToken');

            state.isLoggedIn = false;
            state.authToken = null;
            state.currentUser = null;
            state.cards = [];

            // 清除使用者資訊
            sessionStorage.removeItem('auth_user');

            // 隱藏導航欄
            document.getElementById('app-header').classList.add('hidden');

            showView('login');
        }

        // Scenario F3: GET /api/user/cards
        async function fetchUserCards() {
            try {
                const response = await apiCall('/api/user/cards', { method: 'GET' });
                const cards = response.data?.cards || [];

                // 使用後端返回的 status，並保留 revoked_at
                state.cards = ['personal', 'event', 'sensitive'].map(type => {
                    const card = cards.find(c => c.type === type);
                    if (card) {
                        return {
                            ...card,
                            status: card.status || 'bound',
                            revoked_at: card.revoked_at || null
                        };
                    }
                    return { type, status: 'empty' };
                });

                // 初始化狀態管理器
                stateManager.initialize(state.cards);

                renderSelectionPage();
            } catch (err) {
                handleError(err);
            }
        }

        // Scenario F4 (POST/PUT): Create/Edit Card
        async function handleFormSubmit(e) {
            e.preventDefault();
            
            // 顯示 loading 狀態
            const submitBtn = document.getElementById('submit-btn');
            const submitBtnText = document.getElementById('submit-btn-text');
            const submitBtnLoading = document.getElementById('submit-btn-loading');
            
            submitBtn.disabled = true;
            submitBtnText.classList.add('hidden');
            submitBtnLoading.classList.remove('hidden');
            if (window.initIcons) window.initIcons();
            
            const formData = new FormData(e.target);
            const data = {};

            // 收集表單資料（允許空字串以支援清空欄位）
            ['type', 'name_zh', 'name_en', 'title_zh', 'title_en',
             'email', 'phone', 'mobile', 'web', 'avatar_url', 'greetings_zh', 'greetings_en',
             'social_github', 'social_linkedin', 'social_facebook',
             'social_instagram', 'social_twitter', 'social_youtube',
             'social_line', 'social_signal'].forEach(key => {
                const val = formData.get(key);
                if (val !== null && val !== undefined) data[key] = val;
            });

            // 處理地址欄位（檢查預設選項）
            const addressPreset = document.getElementById('address-preset').value;
            if (addressPreset === 'yanping') {
                data.address_zh = ADDRESS_PRESETS.yanping.zh;
                data.address_en = ADDRESS_PRESETS.yanping.en;
            } else if (addressPreset === 'shinkong') {
                data.address_zh = ADDRESS_PRESETS.shinkong.zh;
                data.address_en = ADDRESS_PRESETS.shinkong.en;
            } else {
                data.address_zh = formData.get('address_zh') || '';
                data.address_en = formData.get('address_en') || '';
            }

            // 處理部門欄位
            const departmentPreset = document.getElementById('department-preset').value;
            if (departmentPreset === 'custom') {
                const zh = document.getElementById('department-custom-zh').value.trim();
                const en = document.getElementById('department-custom-en').value.trim();

                if (zh && en) {
                    data.department = { zh, en };
                } else if (zh) {
                    data.department = zh;
                } else if (en) {
                    data.department = en;
                } else {
                    data.department = '';
                }
            } else {
                data.department = departmentPreset;
            }

            const uuid = formData.get('form-uuid');
            const type = formData.get('form-type');

            try {
                if (uuid) {
                    // 編輯：使用 Toast
                    submitBtnText.textContent = '更新中...';
                    submitBtnText.classList.remove('hidden');
                    submitBtnLoading.classList.add('hidden');
                    
                    await apiCall(`/api/user/cards/${uuid}`, {
                        method: 'PUT',
                        body: JSON.stringify(data)
                    });
                    showToast('名片更新成功');
                    await fetchUserCards();
                    showView('selection');
                } else {
                    // 創建：使用樂觀更新
                    submitBtnText.textContent = '驗證中...';
                    submitBtnText.classList.remove('hidden');
                    submitBtnLoading.classList.add('hidden');

                    // 1. 樂觀更新（立即反應）
                    const tempId = stateManager.optimisticCreate(type, data);
                    state.cards = stateManager.getState().cards;
                    renderSelectionPage();

                    // 2. API 請求
                    submitBtnText.textContent = '加密中...';
                    const response = await apiCall('/api/user/cards', {
                        method: 'POST',
                        body: JSON.stringify({ ...data, type })
                    });

                    const realUuid = response.data?.uuid;

                    if (!realUuid) {
                        throw new Error('API 未返回 UUID');
                    }

                    submitBtnText.textContent = '儲存中...';

                    // 3. 確認更新
                    stateManager.confirmCreate(tempId, realUuid, {
                        name_zh: data.name_zh,
                        name_en: data.name_en,
                        updated_at: new Date().toISOString()
                    });
                    state.cards = stateManager.getState().cards;

                    // 4. 顯示 Modal
                    showSuccessModal(realUuid, type);

                    // 5. 背景同步
                    stateManager.queueSync(async () => {
                        await fetchUserCards();
                    });
                }
            } catch (err) {
                // 6. 失敗回滾
                if (!uuid) {
                    const rolled = stateManager.rollback();
                    if (rolled) {
                        state.cards = stateManager.getState().cards;
                        renderSelectionPage();
                    }
                }

                // 7. 統一錯誤處理
                const errorMsg = errorHandler.handle(err);
                const errEl = document.getElementById('form-error-msg');
                errEl.innerText = errorMsg;
                errEl.classList.remove('hidden');
            } finally {
                // 8. 恢復按鈕狀態
                submitBtn.disabled = false;
                submitBtnText.textContent = uuid ? '儲存變更' : '建立名片';
                submitBtnText.classList.remove('hidden');
                submitBtnLoading.classList.add('hidden');
            }
        }

        // 姓名語言判斷邏輯
        function detectNameLanguage(name) {
            const hasChinese = /[\u4e00-\u9fa5]/.test(name);
            const hasEnglish = /[a-zA-Z]/.test(name);

            if (hasChinese && hasEnglish) {
                // 混合：分割中英文
                const parts = name.split(/\s+/);
                const zhPart = parts.filter(p => /[\u4e00-\u9fa5]/.test(p)).join(' ');
                const enPart = parts.filter(p => /[a-zA-Z]/.test(p)).join(' ');
                return { name_zh: zhPart, name_en: enPart };
            } else if (hasChinese) {
                return { name_zh: name, name_en: '' };
            } else {
                return { name_zh: '', name_en: name };
            }
        }

        // 自動填入 OIDC 資訊 (BDD Scenario 1-4)
        function prefillFormWithOIDC(userData) {
            if (!userData) return;

            // Scenario 1: 自動填入 Email
            if (userData.email) {
                document.getElementById('email').value = userData.email;
            }

            // Scenario 1: 自動填入大頭貼 URL (如果存在)
            if (userData.picture && userData.picture !== 'undefined') {
                const avatarInput = document.getElementById('avatar_url');
                if (avatarInput) {
                    avatarInput.value = userData.picture;
                }
            }

            // Scenario 2-4: 智慧判斷姓名語言
            if (userData.name) {
                const nameResult = detectNameLanguage(userData.name);
                if (nameResult.name_zh) {
                    document.getElementById('name_zh').value = nameResult.name_zh;
                }
                if (nameResult.name_en) {
                    document.getElementById('name_en').value = nameResult.name_en;
                }
            }

            updatePreview();
        }

        // BDD Scenario 5-6: 更新使用者顯示資訊
        function updateUserDisplay(email, name, picture) {
            document.getElementById('user-email-display').innerText = email || '---';

            if (name) {
                document.getElementById('user-name-display').innerText = name;
            }

            if (picture) {
                const avatarEl = document.getElementById('user-avatar-display');
                avatarEl.src = picture;
                avatarEl.classList.remove('hidden');
                avatarEl.onerror = function() {
                    this.classList.add('hidden');
                };
            }
        }

        // SelfCardOCR: migrated to /js/self-card-ocr.js
        // Consent Management: migrated to /js/consent-management.js

        // ==================== Window Bridge for split scripts ====================
        window.i18n = i18n;
        window.currentLang = currentLang;
        window.applyTranslations = applyTranslations;
        window.apiCall = apiCall;
        window.getHeadersWithCSRF = getHeadersWithCSRF;
        window.state = state;
        window.stateManager = stateManager;
        window.fetchUserCards = fetchUserCards;
        window.API_BASE = API_BASE;
        window.ADDRESS_PRESETS = ADDRESS_PRESETS;
        window.CARD_TYPES = CARD_TYPES;
        window.errorHandler = errorHandler;
        window.SocialParser = SocialParser;

        // Three.js particles: migrated to /js/modules/particles.js (ES module)

        document.addEventListener('DOMContentLoaded', async () => {
            // i18n: applyTranslations still called here (not yet migrated to module)
            applyTranslations(currentLang);

            if (window.initIcons) window.initIcons();

            // Three.js init: migrated to /js/modules/main.js (ES module)

            document.getElementById('edit-form').onsubmit = handleFormSubmit;

            // Check if just completed OAuth redirect
            const urlParams = new URLSearchParams(window.location.search);
            const loginStatus = urlParams.get('login');

            if (loginStatus === 'success') {
                // Clear URL parameters
                window.history.replaceState({}, '', '/user-portal.html');

                // Get session ID from URL
                const sessionId = urlParams.get('session');

                if (sessionId) {
                    try {
                        // Show loading
                        document.getElementById('global-loading').classList.remove('hidden');

                        // Retrieve user info from backend (one-time use)
                        const response = await fetch(`/api/user/oauth-user-info?session=${sessionId}`, {
                            credentials: 'include'
                        });

                        if (response.ok) {
                            const data = await response.json();
                            const { email, name, picture, csrfToken } = data.data;

                            // Store CSRF token
                            if (csrfToken) {
                                sessionStorage.removeItem('csrfToken'); // 先清除
                                sessionStorage.setItem('csrfToken', csrfToken); // 再設定
                                // CSRF token updated silently
                            }

                            // Store user info
                            const user = { email, name, picture };
                            sessionStorage.setItem('auth_user', JSON.stringify(user));

                            // Set login state
                            state.isLoggedIn = true;
                            state.currentUser = user;
                            window.__sessionExpired = false;

                            // Update user display
                            updateUserDisplay(email, name, picture);

                            // Validate session first
                            const { valid: sessionValid, consentOk } = await validateSessionAndConsent();
                            if (!sessionValid) {
                                // Session invalid - cleanup already done by apiCall
                                document.getElementById('global-loading').classList.add('hidden');
                                return;
                            }

                            // Session valid - check consent status (blocking if needed)
                            if (!consentOk) {
                                // User needs to consent first - modal will be shown
                                document.getElementById('global-loading').classList.add('hidden');
                                return;
                            }

                            // Initialize user state
                            await fetchUserCards();

                            // Show success and switch to selection view
                            showToast('登入成功');
                            showView('selection');
                        } else {
                            throw new Error('Failed to retrieve user info');
                        }
                    } catch (error) {
                        console.error('OAuth redirect error:', error);
                        showToast('登入失敗，請重試');
                        showView('login');
                    } finally {
                        document.getElementById('global-loading').classList.add('hidden');
                    }
                    return;
                }
            } else if (loginStatus === 'error') {
                // Clear URL parameters
                window.history.replaceState({}, '', '/user-portal.html');

                // Handle OAuth error
                const error = urlParams.get('error');
                const errorBox = document.getElementById('login-error-box');

                if (error === 'unauthorized_domain') {
                    errorBox.innerText = i18n[currentLang]['error-unauthorized'] || '登入失敗：您的 Email 尚未授權';
                } else {
                    errorBox.innerText = i18n[currentLang]['error-login-failed'] || '登入失敗，請重試';
                }

                errorBox.classList.remove('hidden');
                showView('login');
                return;
            }

            // 檢查是否有存儲的使用者資訊（token 在 HttpOnly cookie 中）
            const userJson = sessionStorage.getItem('auth_user');

            if (userJson) {
                try {
                    const user = JSON.parse(userJson);

                    // 恢復登入狀態
                    state.isLoggedIn = true;
                    state.authToken = null; // No longer needed
                    state.currentUser = user;

                    // BDD Scenario 5-6: 顯示個人化歡迎訊息
                    updateUserDisplay(user.email, user.name, user.picture);

                    // 顯示載入中
                    document.getElementById('global-loading').classList.remove('hidden');

                    // 驗證 session 並載入名片資料
                    try {
                        // Validate session first
                        const { valid: sessionValid, consentOk } = await validateSessionAndConsent();
                        if (!sessionValid) {
                            // Session invalid - cleanup already done by apiCall
                            document.getElementById('global-loading').classList.add('hidden');
                            return;
                        }

                        // Session valid - check consent status
                        if (!consentOk) {
                            // User needs to consent - modal will be shown
                            document.getElementById('global-loading').classList.add('hidden');
                            return;
                        }

                        await fetchUserCards();
                        // 只有成功載入才切換視圖和顯示 toast
                        if (state.isLoggedIn) {
                            window.__sessionExpired = false;
                            showToast('自動登入成功');
                            showView('selection');
                        }
                    } catch (err) {
                        console.error('Failed to load cards:', err);
                        // Session expired - silent logout
                        sessionStorage.removeItem('auth_user');
                        state.isLoggedIn = false;
                        state.currentUser = null;
                        showView('login');
                    } finally {
                        // 隱藏載入中
                        document.getElementById('global-loading').classList.add('hidden');
                    }
                } catch (err) {
                    // 解析失敗，清除並顯示登入頁
                    console.error('Auto-login failed:', err);
                    sessionStorage.removeItem('auth_user');
                    showView('login');
                }
            } else {
                // 沒有使用者資訊，顯示登入頁
                showView('login');
            }

            // 綁定預覽聯動
            document.querySelectorAll('input, textarea, select').forEach(el => el.addEventListener('input', updatePreview));
            document.querySelectorAll('input, textarea, select').forEach(el => el.addEventListener('change', updatePreview));

            // 預覽語言切換
            document.querySelectorAll('#preview-lang-switch button').forEach(btn => {
                btn.onclick = () => {
                    window.previewLang = btn.dataset.lang;
                    document.querySelectorAll('#preview-lang-switch button').forEach(b => {
                        b.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
                        b.classList.add('text-slate-500');
                    });
                    btn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
                    btn.classList.remove('text-slate-500');
                    updatePreview();
                };
            });

            // 初始化語言切換按鈕狀態（根據自動偵測的語言）
            document.querySelectorAll('#preview-lang-switch button').forEach(btn => {
                if (btn.dataset.lang === window.previewLang) {
                    btn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
                    btn.classList.remove('text-slate-500');
                } else {
                    btn.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
                    btn.classList.add('text-slate-500');
                }
            });

            // 地址預設選擇監聽
            document.getElementById('address-preset').addEventListener('change', (e) => {
                const value = e.target.value;
                const customFields = document.getElementById('custom-address-fields');

                if (value === 'custom') {
                    customFields.classList.remove('hidden');
                } else if (value && ADDRESS_PRESETS[value]) {
                    customFields.classList.add('hidden');
                    document.getElementById('address_zh').value = ADDRESS_PRESETS[value].zh;
                    document.getElementById('address_en').value = ADDRESS_PRESETS[value].en;
                } else {
                    customFields.classList.add('hidden');
                    document.getElementById('address_zh').value = '';
                    document.getElementById('address_en').value = '';
                }
                updatePreview();
            });

            // 部門預設選擇監聽
            document.getElementById('department-preset').addEventListener('change', (e) => {
                const value = e.target.value;
                const customField = document.getElementById('custom-department-field');

                if (value === 'custom') {
                    customField.classList.remove('hidden');
                    document.getElementById('department-custom-zh').focus();
                } else {
                    customField.classList.add('hidden');
                    document.getElementById('department-custom-zh').value = '';
                    document.getElementById('department-custom-en').value = '';
                }
                updatePreview();
            });

            // Modal 背景點擊關閉
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-backdrop')) {
                    closeSuccessModal();
                }
            });
        });

        // window.onresize for Three.js: migrated to /js/modules/particles.js
