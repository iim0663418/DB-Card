// Consent Management — extracted from user-portal-init.js

// ==================== Consent Management Functions ====================

/**
 * Check consent status on login
 */
/**
 * Check consent status on login (legacy wrapper for window.checkConsentStatus)
 */
async function checkConsentStatus() {
    const { consentOk } = await validateSessionAndConsent();
    return consentOk;
}

/**
 * Show consent modal (blocking)
 */
function showConsentModal(policy, reason) {
    const modal = document.getElementById('consent-modal');
    const scrollContainer = document.getElementById('consent-content-scroll');
    const scrollHint = document.getElementById('consent-scroll-hint');
    const agreeBtn = document.getElementById('consent-agree-btn');
    const fullContent = document.getElementById('consent-full-content');

    // Populate policy data
    document.getElementById('consent-policy-version').textContent = policy.version;
    document.getElementById('consent-effective-date').textContent = new Date(policy.effective_date).toLocaleDateString('zh-TW');

    const summary = currentLang === 'zh' ? policy.summary_zh : policy.summary_en;
    const content = currentLang === 'zh' ? policy.content_zh : policy.content_en;

    document.getElementById('consent-summary').textContent = summary;
    fullContent.innerHTML = DOMPurify.sanitize(content.replace(/\n/g, '<br>'));

    // Reset state
    agreeBtn.disabled = true;
    scrollHint.classList.remove('hidden');
    document.getElementById('consent-optional-analytics').checked = false;
    fullContent.classList.add('hidden'); // Initially hide full content

    // Scroll detection
    const checkScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

        if (isAtBottom) {
            agreeBtn.disabled = false;
            scrollHint.classList.add('hidden');
        }
    };

    scrollContainer.addEventListener('scroll', checkScroll);
    checkScroll();

    modal.classList.remove('hidden');
    if (window.initIcons) window.initIcons();
}

/**
 * Toggle full content visibility (layered disclosure)
 */
function toggleFullContent() {
    const fullContent = document.getElementById('consent-full-content');
    const toggleBtn = document.getElementById('toggle-full-content-btn');
    const icon = toggleBtn?.querySelector('i');
    
    if (fullContent.classList.contains('hidden')) {
        fullContent.classList.remove('hidden');
        if (icon) icon.style.transform = 'rotate(180deg)';
    } else {
        fullContent.classList.add('hidden');
        if (icon) icon.style.transform = 'rotate(0deg)';
    }

    if (window.initIcons) window.initIcons();
}

/**
 * Accept consent
 */
async function acceptConsent() {
    const agreeBtn = document.getElementById('consent-agree-btn');
    
    // Prevent double-click or clicking disabled button
    if (agreeBtn.disabled) {
        return;
    }
    
    const analyticsConsent = document.getElementById('consent-optional-analytics').checked;

    agreeBtn.disabled = true;
    agreeBtn.textContent = i18n[currentLang]['consent-accepting'] || '處理中...';

    try {
        await apiCall('/api/consent/accept', {
            method: 'POST',
            body: JSON.stringify({
                consent_analytics: analyticsConsent
            })
        });

        document.getElementById('consent-modal').classList.add('hidden');
        showToast('同意已記錄，歡迎使用服務');

        // Continue with login flow
        await fetchUserCards();
        showView('selection');
    } catch (error) {
        console.error('Failed to accept consent:', error);
        showToast('同意處理失敗，請重試');
        agreeBtn.disabled = false;
        agreeBtn.textContent = i18n[currentLang]['consent-agree-button'];
    }
}

/**
 * Show withdraw consent modal
 */
function showWithdrawConsentModal() {
    const modal = document.getElementById('withdraw-consent-modal');
    const confirmInput = document.getElementById('withdraw-confirm-input');
    const checkbox = document.getElementById('withdraw-understand-checkbox');
    const confirmBtn = document.getElementById('withdraw-consent-confirm-btn');

    // Calculate deletion date (30 days from now)
    const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    document.getElementById('withdraw-deletion-date').textContent = deletionDate.toLocaleDateString('zh-TW');

    // Reset state
    confirmInput.value = '';
    checkbox.checked = false;
    confirmBtn.disabled = true;

    // Validation
    const validate = () => {
        const confirmText = currentLang === 'zh' ? '確認撤回' : 'CONFIRM WITHDRAW';
        const isValid = confirmInput.value.trim() === confirmText && checkbox.checked;
        confirmBtn.disabled = !isValid;
    };

    confirmInput.addEventListener('input', validate);
    checkbox.addEventListener('change', validate);

    modal.classList.remove('hidden');
    if (window.initIcons) window.initIcons();
}

/**
 * Close withdraw modal
 */
function closeWithdrawConsentModal() {
    document.getElementById('withdraw-consent-modal').classList.add('hidden');
}

/**
 * Confirm withdraw consent
 */
async function confirmWithdrawConsent() {
    const confirmBtn = document.getElementById('withdraw-consent-confirm-btn');

    confirmBtn.disabled = true;
    confirmBtn.textContent = i18n[currentLang]['withdraw-canceling'] || '處理中...';

    try {
        await apiCall('/api/consent/withdraw', {
            method: 'POST'
        });

        closeWithdrawConsentModal();
        showToast('同意已撤回，資料將在 30 天後刪除');

        // Logout user
        setTimeout(() => {
            handleLogout();
        }, 2000);
    } catch (error) {
        console.error('Failed to withdraw consent:', error);
        showToast(errorHandler.handle(error));
        confirmBtn.disabled = false;
        confirmBtn.textContent = i18n[currentLang]['withdraw-button'];
    }
}

/**
 * Show restore consent modal
 */
function showRestoreConsentModal(daysRemaining) {
    const modal = document.getElementById('restore-consent-modal');
    document.getElementById('restore-days-remaining').textContent = daysRemaining;

    modal.classList.remove('hidden');
    if (window.initIcons) window.initIcons();
}

/**
 * Close restore modal
 */
function closeRestoreConsentModal() {
    document.getElementById('restore-consent-modal').classList.add('hidden');
    // User chose to continue deletion - logout
    handleLogout();
}

/**
 * Confirm restore consent
 */
async function confirmRestoreConsent() {
    try {
        toggleLoading(true);

        await apiCall('/api/consent/restore', {
            method: 'POST'
        });

        document.getElementById('restore-consent-modal').classList.add('hidden');
        showToast('同意已恢復，歡迎回來');

        // Continue with login
        await fetchUserCards();
        showView('selection');
    } catch (error) {
        console.error('Failed to restore consent:', error);
        showToast(errorHandler.handle(error));
    } finally {
        toggleLoading(false);
    }
}

/**
 * Show consent history modal
 */
async function showConsentHistoryModal() {
    const modal = document.getElementById('consent-history-modal');
    const content = document.getElementById('consent-history-content');

    modal.classList.remove('hidden');
    content.innerHTML = '<p class="text-center text-slate-400">載入中...</p>';

    try {
        const response = await apiCall('/api/consent/history', { method: 'GET' });
        const data = response.data || response;
        const history = data.history || [];

        if (history.length === 0) {
            content.innerHTML = `<p class="text-center text-slate-400" data-i18n="history-no-records">${i18n[currentLang]['history-no-records']}</p>`;
        } else {
            content.innerHTML = DOMPurify.sanitize(history.map(record => {
                const statusText = record.status === 'accepted' ? '✓ 已同意' : 
                                  record.status === 'withdrawn' ? '✗ 已撤回' : 
                                  record.status === 'rejected' ? '✗ 已拒絕' : record.status;
                const statusColor = record.status === 'accepted' ? 'text-green-600 bg-green-50' : 
                                   record.status === 'withdrawn' ? 'text-red-600 bg-red-50' : 
                                   'text-slate-600 bg-slate-50';
                const typeText = record.type === 'required' ? '必要同意' : '選擇性同意';
                const categoryText = record.category === 'service' ? '服務使用' : 
                                    record.category === 'analytics' ? '匿名統計' : record.category;
                
                return `
                <div class="p-4 border border-slate-200 rounded-xl mb-3 hover:border-slate-300 transition-colors">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex items-center gap-2">
                            <span class="px-3 py-1 ${statusColor} text-sm font-bold rounded-lg">
                                ${statusText}
                            </span>
                            <span class="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                                ${typeText}
                            </span>
                        </div>
                        <span class="text-xs text-slate-500 font-mono">${record.version}</span>
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center gap-2 text-sm">
                            <span class="text-slate-500">項目：</span>
                            <span class="font-medium text-slate-900">${categoryText}</span>
                        </div>
                        <div class="flex items-center gap-2 text-sm">
                            <span class="text-slate-500">時間：</span>
                            <span class="text-slate-700">${new Date(record.consented_at).toLocaleString('zh-TW', { 
                                year: 'numeric', month: '2-digit', day: '2-digit', 
                                hour: '2-digit', minute: '2-digit' 
                            })}</span>
                        </div>
                        ${record.withdrawn_at ? `
                        <div class="flex items-center gap-2 text-sm">
                            <span class="text-slate-500">撤回時間：</span>
                            <span class="text-red-600">${new Date(record.withdrawn_at).toLocaleString('zh-TW', { 
                                year: 'numeric', month: '2-digit', day: '2-digit', 
                                hour: '2-digit', minute: '2-digit' 
                            })}</span>
                        </div>` : ''}
                        ${record.restored_at ? `
                        <div class="flex items-center gap-2 text-sm">
                            <span class="text-slate-500">恢復時間：</span>
                            <span class="text-green-600">${new Date(record.restored_at).toLocaleString('zh-TW', { 
                                year: 'numeric', month: '2-digit', day: '2-digit', 
                                hour: '2-digit', minute: '2-digit' 
                            })}</span>
                        </div>` : ''}
                    </div>
                </div>
            `}).join(''));
        }

        if (window.initIcons) window.initIcons();
    } catch (error) {
        console.error('Failed to fetch history:', error);
        content.innerHTML = '<p class="text-center text-red-500">載入失敗</p>';
    }
}

/**
 * Close consent history modal
 */
function closeConsentHistoryModal() {
    document.getElementById('consent-history-modal').classList.add('hidden');
}

/**
 * Export user data
 */
async function handleDataExport() {
    try {
        toggleLoading(true);

        const response = await fetch('/api/data/export', {
            method: 'POST',
            credentials: 'include',
            headers: getHeadersWithCSRF()
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `db-card-data-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showToast('資料已匯出');
    } catch (error) {
        console.error('Failed to export data:', error);
        showToast('匯出失敗，請稍後再試');
    } finally {
        toggleLoading(false);
    }
}

// ==================== Window Exposure for onclick handlers ====================
window.checkConsentStatus = checkConsentStatus;
window.acceptConsent = acceptConsent;
window.toggleFullContent = toggleFullContent;
window.showWithdrawConsentModal = showWithdrawConsentModal;
window.closeWithdrawConsentModal = closeWithdrawConsentModal;
window.confirmWithdrawConsent = confirmWithdrawConsent;
window.showRestoreConsentModal = showRestoreConsentModal;
window.closeRestoreConsentModal = closeRestoreConsentModal;
window.confirmRestoreConsent = confirmRestoreConsent;
window.showConsentHistoryModal = showConsentHistoryModal;
window.closeConsentHistoryModal = closeConsentHistoryModal;
window.handleDataExport = handleDataExport;
