        // API Base URL (defined in config.js)

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

        let previewLang = 'zh';
        let currentModalUuid = null;
        let currentRevokeUuid = null;
        let currentRevokeType = null;

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

                    // Handle token expiration
                    if (res.status === 401) {
                        state.isLoggedIn = false;
                        state.authToken = null;
                        state.currentUser = null;
                        showView('login');
                        showToast('登入已過期，請重新登入');
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
                throw { status: 0, message: '網路連線失敗' };
            }
        }

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
                    throw new Error('Failed to initialize OAuth');
                }

                const { state, nonce, codeChallenge, codeChallengeMethod } = await stateResponse.json();

                const clientId = '675226781448-akeqtr5d603ad0bcb3tve5hl4a8c164u.apps.googleusercontent.com';
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
                errorBox.innerText = '登入初始化失敗，請重試';
                errorBox.classList.remove('hidden');
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
            lucide.createIcons();
            
            const formData = new FormData(e.target);
            const data = {};

            // 收集表單資料（允許空字串以支援清空欄位）
            ['type', 'name_zh', 'name_en', 'title_zh', 'title_en',
             'email', 'phone', 'mobile', 'avatar_url', 'greetings_zh', 'greetings_en',
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

        // Scenario F5: GET /api/user/cards/:uuid (編輯模式)
        async function openEditForm(type) {
            const card = state.cards.find(c => c.type === type);

            // 阻擋 revoked 卡片
            if (card && card.status === 'revoked') {
                showToast('此名片已被撤銷，無法編輯');
                return;
            }

            const isEdit = card && card.status === 'bound';

            document.getElementById('edit-form').reset();
            document.getElementById('form-error-msg').classList.add('hidden');
            document.getElementById('form-type').value = type;

            if (isEdit && card.uuid) {
                try {
                    toggleLoading(true);
                    const response = await apiCall(`/api/user/cards/${card.uuid}`, { method: 'GET' });
                    const fullCard = response.data || response;

                    document.getElementById('form-uuid').value = card.uuid;

                    // 預填所有欄位（扁平結構）
                    ['name_zh', 'name_en', 'title_zh', 'title_en',
                     'email', 'phone', 'mobile', 'avatar_url',
                     'greetings_zh', 'greetings_en',
                     'social_github', 'social_linkedin', 'social_facebook',
                     'social_instagram', 'social_twitter', 'social_youtube',
                     'social_line', 'social_signal'].forEach(key => {
                        const el = document.getElementById(key);
                        if (el && fullCard[key] !== undefined) el.value = fullCard[key];
                    });

                    // 處理部門預設選項
                    const PRESET_DEPARTMENTS = [
                        '數位策略司', '數位政府司', '資源管理司', '韌性建設司',
                        '數位國際司', '資料創新司', '秘書處', '人事處',
                        '政風處', '主計處', '資訊處', '法制處',
                        '部長室', '政務次長室', '常務次長室', '主任秘書室'
                    ];

                    if (fullCard.department) {
                        if (PRESET_DEPARTMENTS.includes(fullCard.department)) {
                            document.getElementById('department-preset').value = fullCard.department;
                            document.getElementById('custom-department-field').classList.add('hidden');
                        } else {
                            // 自訂部門
                            document.getElementById('department-preset').value = 'custom';
                            document.getElementById('custom-department-field').classList.remove('hidden');

                            if (typeof fullCard.department === 'string') {
                                document.getElementById('department-custom-zh').value = fullCard.department;
                                document.getElementById('department-custom-en').value = '';
                            } else if (fullCard.department && typeof fullCard.department === 'object') {
                                document.getElementById('department-custom-zh').value = fullCard.department.zh || '';
                                document.getElementById('department-custom-en').value = fullCard.department.en || '';
                            }
                        }
                    }

                    // 處理地址預設選項
                    if (fullCard.address_zh || fullCard.address_en) {
                        // 檢查是否為預設地址
                        if (fullCard.address_zh === ADDRESS_PRESETS.yanping.zh) {
                            document.getElementById('address-preset').value = 'yanping';
                            document.getElementById('custom-address-fields').classList.add('hidden');
                        } else if (fullCard.address_zh === ADDRESS_PRESETS.shinkong.zh) {
                            document.getElementById('address-preset').value = 'shinkong';
                            document.getElementById('custom-address-fields').classList.add('hidden');
                        } else {
                            // 自訂地址
                            document.getElementById('address-preset').value = 'custom';
                            document.getElementById('address_zh').value = fullCard.address_zh || '';
                            document.getElementById('address_en').value = fullCard.address_en || '';
                            document.getElementById('custom-address-fields').classList.remove('hidden');
                        }
                    }

                    document.getElementById('form-title').innerText = '編輯數位名片';
                } catch (err) {
                    showToast('載入名片資料失敗');
                    return;
                } finally {
                    toggleLoading(false);
                }
            } else {
                document.getElementById('form-uuid').value = '';
                document.getElementById('form-title').innerText = '建立新名片';

                // BDD Scenario 1-4: 自動填入 OIDC 資訊(僅創建時)
                prefillFormWithOIDC(state.currentUser);
            }

            updatePreview();
            showView('form');
        }


        function renderSelectionPage() {
            const container = document.getElementById('card-slots-container');
            container.innerHTML = DOMPurify.sanitize(CARD_TYPES.map(config => {
                const data = state.cards.find(c => c.type === config.id) || { status: 'empty' };
                const isBound = data.status === 'bound';
                const isRevoked = data.status === 'revoked';

                return `
                    <div class="selection-card glass-panel p-8 rounded-[2.5rem] flex flex-col justify-between min-h-[380px] ${isRevoked ? 'revoked' : ''}">
                        <div class="space-y-6">
                            <div class="flex justify-between items-start">
                                <div class="w-12 h-12 bg-${config.color}-50 rounded-2xl flex items-center justify-center text-${config.color}-600">
                                    <i data-lucide="${config.icon}"></i>
                                </div>
                                <span class="badge bg-${config.color}-100 text-${config.color}-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    ${config.label}
                                </span>
                            </div>
                            <div class="space-y-1">
                                <h3 class="text-xl font-black ${isBound || isRevoked ? 'text-slate-900' : 'text-slate-300'}">
                                    ${isBound || isRevoked ? data.name_zh : '尚未建立'}
                                </h3>
                                <p class="text-xs ${isBound || isRevoked ? 'text-slate-500' : 'text-slate-400'} ${config.securityBadge && !isBound && !isRevoked ? 'font-black' : ''}">
                                    ${isBound || isRevoked ? (data.name_en || '') : config.desc}
                                </p>
                                ${!isBound && !isRevoked && config.features ? `
                                    <div class="mt-3 space-y-1.5">
                                        ${config.features.map(feature => `
                                            <div class="flex items-start gap-2 text-[10px] text-slate-600">
                                                <i data-lucide="${config.id === 'sensitive' ? 'shield-check' : 'check'}" class="w-3 h-3 mt-0.5 text-${config.color}-500 flex-shrink-0"></i>
                                                <span class="${config.id === 'sensitive' && feature.includes('零快取') ? 'font-black text-red-600' : ''}">${feature}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                ${isBound || isRevoked ? `<p class="text-[9px] text-moda font-bold mt-4 uppercase tracking-tighter">Updated: ${data.updated_at ? new Date(data.updated_at).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}</p>` : ''}
                                ${isRevoked ? (data.revoked_at ? (() => {
                                    const revokedTime = new Date(data.revoked_at * 1000);
                                    const restoreDeadline = new Date(revokedTime.getTime() + 7 * 86400 * 1000);
                                    const canRestore = Date.now() < restoreDeadline.getTime();
                                    return `<p class="text-[10px] text-red-600 font-black mt-2 uppercase tracking-widest">已撤銷${canRestore ? ' (可恢復)' : ' (已過期)'}</p>
                                            <p class="text-[9px] text-red-500 mt-1">撤銷時間: ${revokedTime.toLocaleString('zh-TW')}</p>`;
                                })() : `<p class="text-[10px] text-red-600 font-black mt-2 uppercase tracking-widest">已被管理員撤銷</p>`) : ''}
                            </div>
                        </div>
                        ${isRevoked ? (data.revoked_at ? (() => {
                            const revokedTime = new Date(data.revoked_at * 1000);
                            const restoreDeadline = new Date(revokedTime.getTime() + 7 * 86400 * 1000);
                            const canRestore = Date.now() < restoreDeadline.getTime();
                            return canRestore ? `
                                <div class="space-y-3 mt-10">
                                    <p class="text-xs text-amber-600 text-center font-medium">可在 ${restoreDeadline.toLocaleDateString('zh-TW')} 前自行恢復</p>
                                    <button onclick="handleRestoreCard('${data.uuid}')"
                                            class="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
                                        恢復名片
                                    </button>
                                </div>
                            ` : `
                                <div class="space-y-3 mt-10">
                                    <p class="text-xs text-red-600 text-center font-medium">恢復期限已過（7 天），請聯繫管理員</p>
                                    <button onclick="showToast('請聯繫管理員恢復名片')"
                                            class="w-full py-3 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed">
                                        已過期
                                    </button>
                                </div>
                            `;
                        })() : `
                            <div class="space-y-3 mt-10">
                                <p class="text-xs text-red-600 text-center font-medium">此名片已被管理員撤銷，無法使用或編輯</p>
                                <button onclick="showToast('請聯繫管理員恢復名片')"
                                        class="w-full py-3 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed">
                                    已撤銷
                                </button>
                            </div>
                        `) : (isBound ? `
                            <div class="space-y-3 mt-10">
                                <button onclick="viewCard('${data.uuid}')"
                                        ${data._optimistic ? 'disabled' : ''}
                                        class="w-full py-3 ${data._optimistic ? 'bg-slate-300 cursor-not-allowed' : 'bg-moda hover:scale-[1.02] shadow-moda'} text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
                                    ${data._optimistic ? '同步中...' : '查看名片'}
                                </button>
                                <button onclick="createQRShortcut('${data.uuid}', '${(data.name_zh || data.name_en || '').replace(/'/g, "\\'")}', '${data.type}')"
                                        ${data._optimistic ? 'disabled' : ''}
                                        class="w-full py-3 ${data._optimistic ? 'bg-slate-200 cursor-not-allowed' : 'bg-white border-2 border-moda/30 text-moda hover:border-moda hover:bg-moda/5'} rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2">
                                    <i data-lucide="qr-code" class="w-4 h-4"></i>
                                    ${data._optimistic ? '同步中...' : '加到主畫面'}
                                </button>
                                <div class="grid grid-cols-3 gap-2">
                                    <button data-action="edit" data-type="${config.id}"
                                            class="py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">
                                        編輯
                                    </button>
                                    <button onclick="copyCardLink('${data.uuid}')"
                                            class="py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">
                                        複製
                                    </button>
                                    <button onclick="showRevokeModal('${data.uuid}', '${config.id}')"
                                            class="py-3 bg-white border border-red-200 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-50 transition-all">
                                        撤銷
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <button data-action="edit" data-type="${config.id}"
                                    class="w-full py-4 bg-moda text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] transition-all mt-10 shadow-moda shadow-lg">
                                建立名片
                            </button>
                        `)}
                    </div>
                `;
            }).join(''), { ADD_ATTR: ['onclick'] });
            lucide.createIcons();

            // Event delegation for edit buttons
            container.addEventListener('click', (e) => {
                const button = e.target.closest('[data-action="edit"]');
                if (button) {
                    const type = button.dataset.type;
                    openEditForm(type);
                }
            });
        }


        // 顯示成功 Modal
        function showSuccessModal(uuid, type) {
            currentModalUuid = uuid;

            // 設定名片類型文字
            const typeText = {
                'personal': '個人名片',
                'event': '活動名片',
                'sensitive': '敏感名片'
            }[type] || '名片';
            document.getElementById('modal-card-type').innerText = `您的${typeText}已準備就緒`;

            // 設定分享連結（不帶 session）
            const shareLink = `${window.location.origin}/card-display.html?uuid=${uuid}`;
            document.getElementById('modal-share-link').value = shareLink;

            // 重置複製按鈕
            const copyBtn = document.getElementById('modal-copy-btn');
            const copyBtnText = document.getElementById('modal-copy-text');
            const copyBtnIcon = copyBtn.querySelector('i[data-lucide]');

            if (copyBtnText) copyBtnText.innerText = '複製';
            copyBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            copyBtn.classList.add('bg-moda', 'hover:bg-moda/90');

            if (copyBtnIcon) {
                copyBtnIcon.setAttribute('data-lucide', 'copy');
            }

            // 顯示 Modal
            document.getElementById('success-modal').classList.remove('hidden');

            // 初始化 lucide icons（確保 check-circle 顯示）
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // 綁定 ESC 鍵
            document.addEventListener('keydown', handleModalEscape);
        }

        // 關閉 Modal
        function closeSuccessModal() {
            document.getElementById('success-modal').classList.add('hidden');
            document.removeEventListener('keydown', handleModalEscape);
            currentModalUuid = null;

            // 返回選擇頁面
            showView('selection');
        }

        // ESC 鍵處理
        function handleModalEscape(e) {
            if (e.key === 'Escape') {
                closeSuccessModal();
            }
        }

        // 複製連結
        async function copyModalLink() {
            const link = document.getElementById('modal-share-link').value;
            const btn = document.getElementById('modal-copy-btn');
            const btnText = document.getElementById('modal-copy-text');
            const btnIcon = btn.querySelector('i[data-lucide]');

            try {
                await navigator.clipboard.writeText(link);

                // 視覺反饋
                btnText.innerText = '已複製';
                btn.classList.remove('bg-moda', 'hover:bg-moda/90');
                btn.classList.add('bg-green-600', 'hover:bg-green-700');

                // 更換 icon 為 check
                if (btnIcon) {
                    btnIcon.setAttribute('data-lucide', 'check');
                    lucide.createIcons();
                }

                // 2 秒後恢復
                setTimeout(() => {
                    btnText.innerText = '複製';
                    btn.classList.remove('bg-green-600', 'hover:bg-green-700');
                    btn.classList.add('bg-moda', 'hover:bg-moda/90');

                    // 恢復原始 icon
                    if (btnIcon) {
                        btnIcon.setAttribute('data-lucide', 'copy');
                        lucide.createIcons();
                    }
                }, 2000);
            } catch (err) {
                showToast('複製失敗，請手動複製');
            }
        }

        // 查看名片（從 Modal）
        function viewModalCard() {
            if (currentModalUuid) {
                window.open(`/card-display.html?uuid=${currentModalUuid}`, '_blank');
            }
        }

        async function viewCard(uuid) {
            try {
                toggleLoading(true);

                // 先 tap 獲取 session（與 admin-dashboard 一致）
                const tapResponse = await fetch(`${API_BASE}/api/nfc/tap`, {
                    method: 'POST',
                    headers: getHeadersWithCSRF({ 'Content-Type': 'application/json' }),
                    credentials: 'include',
                    body: JSON.stringify({ card_uuid: uuid })
                });

                // v4.1.0 & v4.2.0: Handle rate_limited error
                if (!tapResponse.ok) {
                    const error = await tapResponse.json();
                    if (error.error?.code === 'rate_limited') {
                        showToast('名片預覽功能暫時無法使用（請求過於頻繁）', 'warning');
                        toggleLoading(false);
                        return;
                    }
                    throw error;
                }

                const response = await tapResponse.json();
                const sessionId = response.session_id || response.data?.session_id;

                if (!sessionId) {
                    throw { code: 'SESSION_ERROR', message: '無法獲取查看授權' };
                }

                // 打開名片頁面（帶 session）
                const url = `${window.location.origin}/card-display.html?uuid=${uuid}&session=${sessionId}`;
                window.open(url, '_blank');

                toggleLoading(false);
            } catch (error) {
                toggleLoading(false);
                // 使用統一錯誤處理
                const errorMsg = errorHandler.handle(error.error || error);
                showToast(errorMsg, 'error');
            }
        }

        function copyCardLink(uuid) {
            const url = `${window.location.origin}/card-display.html?uuid=${uuid}`;
            navigator.clipboard.writeText(url).then(() => {
                showToast('連結已複製到剪貼簿');
            }).catch(() => {
                showToast('複製失敗，請手動複製');
            });
        }

        function toggleLoading(show) {
            state.loading = show;
            document.getElementById('global-loading').classList.toggle('hidden', !show);
        }

        function showView(viewId) {
            document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
            document.getElementById(`view-${viewId}`).classList.remove('hidden');
            if (state.isLoggedIn) document.getElementById('app-header').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Department mapping for preview (same as main.js)
        const ORG_DEPT_MAPPING = {
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
                '主任秘書室': "Secretary-General's Office"
            }
        };

        function updatePreview() {
            const isEn = previewLang === 'en';
            const name = isEn ? document.getElementById('name_en').value || '---' : document.getElementById('name_zh').value || '---';
            const title = isEn ? document.getElementById('title_en').value || '---' : document.getElementById('title_zh').value || '---';

            // 問候語
            const greetingInput = isEn ? document.getElementById('greetings_en').value : document.getElementById('greetings_zh').value;
            const greet = greetingInput ? greetingInput.split('\n').filter(g => g.trim())[0] || '' : '';

            const email = document.getElementById('email').value || '---';
            const phone = document.getElementById('phone').value || '---';
            const avatar = document.getElementById('avatar_url').value || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80";

            // 地址
            const preset = document.getElementById('address-preset').value;
            let addressZh = '', addressEn = '';
            if (preset === 'yanping') {
                addressZh = ADDRESS_PRESETS.yanping.zh;
                addressEn = ADDRESS_PRESETS.yanping.en;
            } else if (preset === 'shinkong') {
                addressZh = ADDRESS_PRESETS.shinkong.zh;
                addressEn = ADDRESS_PRESETS.shinkong.en;
            } else {
                addressZh = document.getElementById('address_zh').value || '';
                addressEn = document.getElementById('address_en').value || '';
            }
            const addressText = isEn ? (addressEn || '---') : (addressZh || '---');

            // 更新預覽
            document.getElementById('prev-name').innerText = name;

            // Title (conditional display - align with card-display)
            const titleElement = document.getElementById('prev-title');
            const titleZh = document.getElementById('title_zh').value;
            const titleEn = document.getElementById('title_en').value;
            if (title && title !== '---') {
                titleElement.style.display = 'block';
                titleElement.innerText = title;
            } else if (!titleZh && !titleEn) {
                titleElement.style.display = 'none';
            } else {
                titleElement.style.display = 'block';
                titleElement.innerText = title;
            }

            // Department (conditional display with bilingual support)
            const departmentPreset = document.getElementById('department-preset').value;
            let deptValue;

            if (departmentPreset === 'custom') {
                const zh = document.getElementById('department-custom-zh').value.trim();
                const en = document.getElementById('department-custom-en').value.trim();

                if (zh && en) {
                    deptValue = { zh, en };
                } else if (zh) {
                    deptValue = zh;
                } else if (en) {
                    deptValue = en;
                }
            } else if (departmentPreset) {
                deptValue = departmentPreset;
            }

            const deptElement = document.getElementById('prev-department');
            if (deptValue) {
                let deptText;

                // Handle bilingual object
                if (typeof deptValue === 'object' && deptValue !== null) {
                    deptText = isEn ? (deptValue.en || deptValue.zh || '') : (deptValue.zh || deptValue.en || '');
                }
                // Handle string (preset or single language)
                else if (typeof deptValue === 'string') {
                    // Use ORG_DEPT_MAPPING for preset departments
                    if (isEn && ORG_DEPT_MAPPING.departments[deptValue]) {
                        deptText = ORG_DEPT_MAPPING.departments[deptValue];
                    } else {
                        deptText = deptValue;
                    }
                }

                if (deptText) {
                    deptElement.style.display = 'flex';
                    document.getElementById('prev-department-text').innerText = deptText;
                } else {
                    deptElement.style.display = 'none';
                }
            } else {
                deptElement.style.display = 'none';
            }

            document.getElementById('prev-email').innerText = email;
            document.getElementById('prev-phone').innerText = phone;
            document.getElementById('prev-address').innerText = addressText;

            // 問候語條件顯示
            const greetingSection = document.getElementById('prev-greeting-section');
            if (greet) {
                greetingSection.classList.remove('hidden');
                document.getElementById('prev-greeting').innerText = greet;
            } else {
                greetingSection.classList.add('hidden');
            }

            // 大頭貼條件顯示
            const prevAvatar = document.getElementById('prev-avatar');
            const avatarUrl = document.getElementById('avatar_url').value;
            if (avatarUrl && avatarUrl.trim()) {
                prevAvatar.classList.remove('hidden');
                prevAvatar.src = avatarUrl;
            } else {
                prevAvatar.classList.add('hidden');
            }
            prevAvatar.onerror = function() {
                this.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
            };

            // 社群連結預覽
            const icons = SocialParser.collectFromInputs();
            const cluster = document.getElementById('prev-social-cluster');
            cluster.innerHTML = '';
            icons.forEach(icon => {
                const node = document.createElement('div');
                node.className = 'social-chip-prev';

                // LINE 和 Signal 使用 SVG，其他使用 Lucide
                if (icon === 'line') {
                    node.innerHTML = DOMPurify.sanitize(`<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>`, { ADD_ATTR: ['onclick'] });
                } else if (icon === 'signal') {
                    node.innerHTML = DOMPurify.sanitize(`<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0q-.934 0-1.83.139l.17 1.111a11 11 0 0 1 3.32 0l.172-1.111A12 12 0 0 0 12 0M9.152.34A12 12 0 0 0 5.77 1.742l.584.961a10.8 10.8 0 0 1 3.066-1.27zm5.696 0-.268 1.094a10.8 10.8 0 0 1 3.066 1.27l.584-.962A12 12 0 0 0 14.848.34M12 2.25a9.75 9.75 0 0 0-8.539 14.459c.074.134.1.292.064.441l-1.013 4.338 4.338-1.013a.62.62 0 0 1 .441.064A9.7 9.7 0 0 0 12 21.75c5.385 0 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25m-7.092.068a12 12 0 0 0-2.59 2.59l.909.664a11 11 0 0 1 2.345-2.345zm14.184 0-.664.909a11 11 0 0 1 2.345 2.345l.909-.664a12 12 0 0 0-2.59-2.59M1.742 5.77A12 12 0 0 0 .34 9.152l1.094.268a10.8 10.8 0 0 1 1.269-3.066zm20.516 0-.961.584a10.8 10.8 0 0 1 1.27 3.066l1.093-.268a12 12 0 0 0-1.402-3.383M.138 10.168A12 12 0 0 0 0 12q0 .934.139 1.83l1.111-.17A11 11 0 0 1 1.125 12q0-.848.125-1.66zm23.723.002-1.111.17q.125.812.125 1.66c0 .848-.042 1.12-.125 1.66l1.111.172a12.1 12.1 0 0 0 0-3.662M1.434 14.58l-1.094.268a12 12 0 0 0 .96 2.591l-.265 1.14 1.096.255.36-1.539-.188-.365a10.8 10.8 0 0 1-.87-2.35m21.133 0a10.8 10.8 0 0 1-1.27 3.067l.962.584a12 12 0 0 0 1.402-3.383zm-1.793 3.848a11 11 0 0 1-2.345 2.345l.664.909a12 12 0 0 0 2.59-2.59zm-19.959 1.1L.357 21.48a1.8 1.8 0 0 0 2.162 2.161l1.954-.455-.256-1.095-1.953.455a.675.675 0 0 1-.81-.81l.454-1.954zm16.832 1.769a10.8 10.8 0 0 1-3.066 1.27l.268 1.093a12 12 0 0 0 3.382-1.402zm-10.94.213-1.54.36.256 1.095 1.139-.266c.814.415 1.683.74 2.591.961l.268-1.094a10.8 10.8 0 0 1-2.35-.869zm3.634 1.24-.172 1.111a12.1 12.1 0 0 0 3.662 0l-.17-1.111q-.812.125-1.66.125a11 11 0 0 1-1.66-.125"/></svg>`, { ADD_ATTR: ['onclick'] });
                } else {
                    node.innerHTML = DOMPurify.sanitize(`<i data-lucide="${icon}" class="w-4 h-4"></i>`, { ADD_ATTR: ['onclick'] });
                }

                cluster.appendChild(node);
            });
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        function showToast(msg) {
            const t = document.getElementById('toast');
            t.innerText = msg;
            t.classList.remove('hidden');
            setTimeout(() => t.classList.add('hidden'), 3000);
        }

        function handleError(err) {
            console.error('[API Error]', err);

            if (err.status === 401 || err.status === 403) {
                // Token 過期或無權限,返回登入頁
                state.isLoggedIn = false;
                showView('login');
                showToast('登入已過期,請重新登入');
            } else if (err.status === 429) {
                showToast('操作過於頻繁,請稍後再試');
            } else {
                showToast(err.message || '操作失敗');
            }
        }

        // User Self-Revoke Functions
        function showRevokeModal(uuid, type) {
            currentRevokeUuid = uuid;
            currentRevokeType = type;
            document.getElementById('revoke-modal').classList.remove('hidden');
            document.getElementById('revoke-reason').value = '';
            document.getElementById('rate-limit-warning').classList.add('hidden');
            lucide.createIcons();
        }

        function closeRevokeModal() {
            document.getElementById('revoke-modal').classList.add('hidden');
            currentRevokeUuid = null;
            currentRevokeType = null;
            
            // Reset button state
            const confirmBtn = document.getElementById('confirm-revoke-btn');
            confirmBtn.disabled = false;
            confirmBtn.textContent = '確認撤銷';
            
            // Reset reason select
            document.getElementById('revoke-reason').value = '';
        }

        async function confirmRevokeCard() {
            if (!currentRevokeUuid) return;

            const reason = document.getElementById('revoke-reason').value || undefined;
            const confirmBtn = document.getElementById('confirm-revoke-btn');

            confirmBtn.disabled = true;
            confirmBtn.textContent = '撤銷中...';

            try {
                const response = await fetch(`/api/user/cards/${currentRevokeUuid}/revoke`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getHeadersWithCSRF({
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify(reason ? { reason } : {})
                });

                const data = await response.json();

                if (response.status === 429) {
                    // Rate limit exceeded
                    showRateLimitError(data);
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = '確認撤銷';
                    return;
                }

                if (!response.ok) {
                    const errorMsg = data.message
                        || (typeof data.error === 'string' ? data.error : data.error?.message)
                        || 'Revoke failed';

                    // Special handling for CSRF token errors
                    if (data.error?.code === 'csrf_token_invalid' || data.error?.code === 'csrf_token_missing') {
                        showToast('登入已過期，請重新整理頁面後再試');
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = '確認撤銷';
                        return;
                    }

                    throw new Error(errorMsg);
                }

                // Success
                closeRevokeModal();
                
                // Format restore deadline
                const restoreDate = data.restore_deadline 
                    ? new Date(data.restore_deadline).toLocaleDateString('zh-TW', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit' 
                    })
                    : '7 天內';
                
                showToast(`名片已撤銷，可在 ${restoreDate} 前恢復`);

                // Reload cards
                await fetchUserCards();
                renderSelectionPage();
            } catch (error) {
                console.error('Revoke error:', error);
                showToast(errorHandler.handle(error));
                confirmBtn.disabled = false;
                confirmBtn.textContent = '確認撤銷';
            }
        }

        async function handleRestoreCard(uuid) {
            if (!confirm('確定要恢復此名片嗎？恢復後所有分享連結將重新生效。')) {
                return;
            }

            document.getElementById('global-loading').classList.remove('hidden');

            try {
                const response = await fetch(`/api/user/cards/${uuid}/restore`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getHeadersWithCSRF()
                });

                const data = await response.json();

                if (!response.ok) {
                    if (data.error === 'RESTORE_WINDOW_EXPIRED') {
                        showToast('恢復期限已過（7 天），請聯繫管理員');
                    } else {
                        throw new Error(data.message || data.error || 'Restore failed');
                    }
                    return;
                }

                // Success
                showToast('名片已成功恢復');
                await fetchUserCards();
                renderSelectionPage();
            } catch (error) {
                console.error('Restore error:', error);
                showToast(errorHandler.handle(error));
            } finally {
                document.getElementById('global-loading').classList.add('hidden');
            }
        }

        function showRateLimitError(data) {
            const banner = document.getElementById('rate-limit-banner');
            const message = document.getElementById('rate-limit-message');
            const retry = document.getElementById('rate-limit-retry');

            message.textContent = data.message;

            const retryMinutes = Math.ceil(data.retry_after / 60);
            retry.textContent = `請在 ${retryMinutes} 分鐘後重試`;

            banner.classList.remove('hidden');
            lucide.createIcons();

            setTimeout(() => banner.classList.add('hidden'), 10000);
        }

        function formatDuration(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.ceil((seconds % 3600) / 60);
            if (hours > 0) {
                return `${hours} 小時 ${minutes} 分鐘`;
            }
            return `${minutes} 分鐘`;
        }

        // 暴露函數到全域作用域供 onclick 使用
        window.viewCard = viewCard;
        window.copyCardLink = copyCardLink;
        window.copyModalLink = copyModalLink;
        window.viewModalCard = viewModalCard;
        window.closeSuccessModal = closeSuccessModal;
        window.showRevokeModal = showRevokeModal;
        window.closeRevokeModal = closeRevokeModal;
        window.confirmRevokeCard = confirmRevokeCard;
        window.handleRestoreCard = handleRestoreCard;

        let scene, camera, renderer, mesh, grid;
        function initThree() {
            const canvas = document.getElementById('three-canvas');
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 0, 10);
            renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            // 網格效果
            const gridGeo = new THREE.PlaneGeometry(150, 150, 45, 45);
            const gridMat = new THREE.MeshBasicMaterial({
                color: 0x6868ac,
                wireframe: true,
                transparent: true,
                opacity: 0.08
            });
            grid = new THREE.Mesh(gridGeo, gridMat);
            grid.rotation.x = -Math.PI / 2.2;
            grid.position.y = -6;
            scene.add(grid);
            
            // 星空效果
            const starGeo = new THREE.BufferGeometry();
            const pos = new Float32Array(2000 * 3);
            for(let i=0; i<2000*3; i++) pos[i] = (Math.random() - 0.5) * 50;
            starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            mesh = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.05, color: 0x6868ac, transparent: true, opacity: 0.3 }));
            scene.add(mesh);
            
            camera.position.z = 10;
            function animate() { 
                requestAnimationFrame(animate); 
                if(mesh) mesh.rotation.y += 0.0002;
                if(grid) grid.rotation.z += 0.0001;
                renderer.render(scene, camera); 
            }
            animate();
        }

        document.addEventListener('DOMContentLoaded', async () => {
            lucide.createIcons();

            if (typeof THREE !== 'undefined') {
                setTimeout(() => initThree(), 100);
            } else {
                window.addEventListener('load', () => {
                    if (typeof THREE !== 'undefined') initThree();
                });
            }

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
                                sessionStorage.setItem('csrfToken', csrfToken);
                            }

                            // Store user info
                            const user = { email, name, picture };
                            sessionStorage.setItem('auth_user', JSON.stringify(user));

                            // Set login state
                            state.isLoggedIn = true;
                            state.currentUser = user;

                            // Update user display
                            updateUserDisplay(email, name, picture);

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
                    errorBox.innerText = '登入失敗：您的 Email 尚未授權';
                } else {
                    errorBox.innerText = '登入失敗，請重試';
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
                        await fetchUserCards();
                        // 只有成功載入才切換視圖和顯示 toast
                        if (state.isLoggedIn) {
                            showToast('自動登入成功');
                            showView('selection');
                        }
                    } catch (err) {
                        console.error('Failed to load cards:', err);
                        // Session 無效或過期，清除並顯示登入頁
                        sessionStorage.removeItem('auth_user');
                        state.isLoggedIn = false;
                        state.currentUser = null;
                        showView('login');
                        showToast('登入已過期，請重新登入');
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
                    previewLang = btn.dataset.lang;
                    document.querySelectorAll('#preview-lang-switch button').forEach(b => {
                        b.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
                        b.classList.add('text-slate-500');
                    });
                    btn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
                    btn.classList.remove('text-slate-500');
                    updatePreview();
                };
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

        window.onresize = () => {
            if(camera && renderer) {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            }
        };
