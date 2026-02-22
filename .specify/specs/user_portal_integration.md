# User Portal 整合方案（修正版）
## Version: 2.2 - Production-Ready with Donation Reminder

---

## 整合等級：中度整合（Medium Integration）

**影響範圍**：
- ✅ 後端：8 個 API 端點 + 2 個 Migrations + R2 Storage + Cron Job
- ✅ 前端：1 個新 section + 1 個新 JS 模組 + 32 個 i18n keys（含贊助提示）
- ✅ 基礎設施：R2 Lifecycle Rules + Cloudflare Secrets
- ✅ UX 增強：非阻斷式贊助提示（每 5 次儲存）

**風險等級**：中度（需完整測試與回滾計畫）

---

## 1. 前端 API 呼叫標準（修正 #1）

### 統一 API 呼叫模式

基於現有的 `getHeadersWithCSRF()` 模式：

```javascript
// workers/public/js/received-cards.js

// ==================== API Helper ====================
const ReceivedCardsAPI = {
  // 統一的 API 呼叫函式（含 CSRF + 錯誤處理 + AbortController）
  async call(endpoint, options = {}) {
    const csrfToken = sessionStorage.getItem('csrfToken');
    const headers = {
      ...options.headers,
      ...(csrfToken && { 'X-CSRF-Token': csrfToken })
    };
    
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers,
        credentials: 'include',  // 必須包含 cookies
        signal: options.signal   // ⭐ 支援 AbortController
      });
      
      // 統一錯誤處理
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      // 處理 204 No Content（如 DELETE）
      if (response.status === 204) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      // 忽略 AbortError（使用者主動取消）
      if (error.name === 'AbortError') {
        console.log('Request cancelled by user');
        return null;
      }
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  },
  
  // AI OCR（支援取消）
  async performOCR(uploadId, signal) {
    return await this.call('/api/user/received-cards/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_id: uploadId }),
      signal  // ⭐ 傳遞 AbortSignal
    });
  },
  
  // AI Enrichment（支援取消）
  async enrichCard(uploadId, ocrResult, signal) {
    return await this.call('/api/user/received-cards/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upload_id: uploadId,
        organization: ocrResult.organization,
        full_name: ocrResult.full_name,
        title: ocrResult.title
      }),
      signal  // ⭐ 傳遞 AbortSignal
    });
  },
  
  // 儲存名片
  async saveCard(data) {
    return await this.call('/api/user/received-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  
  // 載入名片列表
  async loadCards() {
    return await this.call('/api/user/received-cards');
  },
  
  // 刪除名片
  async deleteCard(uuid) {
    return await this.call(`/api/user/received-cards/${uuid}`, {
      method: 'DELETE'
    });
  }
};
```

---

## 2. 完整狀態機設計（修正 #4）

```javascript
// ==================== State Machine ====================
const CardUploadStateMachine = {
  state: 'idle',  // idle | uploading | ocr | enriching | preview | saving | error
  currentUploadId: null,
  currentData: null,
  timeoutId: null,
  
  // 狀態轉換
  setState(newState, data = {}) {
    console.log(`State: ${this.state} → ${newState}`);
    this.state = newState;
    this.currentData = { ...this.currentData, ...data };
    this.updateUI();
  },
  
  // 重置狀態
  reset() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.state = 'idle';
    this.currentUploadId = null;
    this.currentData = null;
    this.updateUI();
  },
  
  // 更新 UI
  updateUI() {
    const uploadArea = document.getElementById('upload-area');
    const aiProgress = document.getElementById('ai-progress');
    const skipButton = document.getElementById('skip-ai-button');
    
    // 隱藏所有狀態 UI
    uploadArea.classList.remove('hidden');
    aiProgress.classList.add('hidden');
    skipButton.classList.add('hidden');
    
    switch (this.state) {
      case 'idle':
        // 顯示上傳區域
        break;
        
      case 'uploading':
      case 'ocr':
      case 'enriching':
        // 顯示 AI 處理進度
        uploadArea.classList.add('hidden');
        aiProgress.classList.remove('hidden');
        this.updateProgressUI();
        
        // 若處理 > 5 秒，顯示「跳過 AI」按鈕
        if (!this.timeoutId) {
          this.timeoutId = setTimeout(() => {
            if (this.state === 'ocr' || this.state === 'enriching') {
              skipButton.classList.remove('hidden');
            }
          }, 5000);
        }
        break;
        
      case 'preview':
        // 顯示預覽 Modal
        this.showPreviewModal();
        break;
        
      case 'error':
        // 顯示錯誤訊息
        this.showError(this.currentData.error);
        this.reset();
        break;
    }
  },
  
  // 更新進度 UI
  updateProgressUI() {
    const steps = {
      uploading: { index: 0, key: 'ai-step-uploading' },
      ocr: { index: 1, key: 'ai-step-ocr' },
      enriching: { index: 2, key: 'ai-step-enrich' }
    };
    
    const currentStep = steps[this.state];
    if (!currentStep) return;
    
    document.querySelectorAll('.ai-step').forEach((el, index) => {
      el.classList.remove('active', 'completed');
      if (index < currentStep.index) {
        el.classList.add('completed');
      } else if (index === currentStep.index) {
        el.classList.add('active');
      }
    });
  },
  
  // 主流程：上傳 → OCR → Enrich → Preview
  async processCard(file) {
    // 創建 AbortController（用於取消請求）
    this.abortController = new AbortController();
    
    try {
      // Step 1: 上傳
      this.setState('uploading');
      const uploadResult = await ReceivedCardsAPI.uploadImage(file);
      this.currentUploadId = uploadResult.upload_id;
      
      // Step 2: OCR（含超時處理 + 可取消）
      this.setState('ocr');
      const ocrResult = await Promise.race([
        ReceivedCardsAPI.performOCR(this.currentUploadId, this.abortController.signal),
        this.timeout(15000, 'OCR timeout')
      ]);
      
      // ⭐ 儲存 OCR 結果到 state（供 skipAI 使用）
      this.currentData = {
        ...ocrResult,
        upload_id: this.currentUploadId
      };
      
      // Step 3: AI Enrichment（含超時處理 + 可取消）
      this.setState('enriching');
      const enrichResult = await Promise.race([
        ReceivedCardsAPI.enrichCard(this.currentUploadId, ocrResult, this.abortController.signal),
        this.timeout(15000, 'AI enrichment timeout')
      ]).catch(error => {
        // 若 Enrichment 失敗，仍可繼續（部分成功）
        console.warn('AI enrichment failed, continuing with OCR data only:', error);
        return { company_summary: null, personal_summary: null, sources: [] };
      });
      
      // Step 4: 顯示預覽
      this.setState('preview', {
        ...this.currentData,
        ...enrichResult
      });
      
    } catch (error) {
      // 忽略 AbortError（使用者主動取消）
      if (error.name === 'AbortError') {
        console.log('User cancelled AI processing');
        return;
      }
      this.setState('error', { error: error.message });
    } finally {
      this.abortController = null;
    }
  },
  
  // 跳過 AI，直接儲存 OCR 結果
  async skipAI() {
    if (this.state !== 'ocr' && this.state !== 'enriching') return;
    
    // 取消當前請求（使用 AbortController）
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    // 使用當前已有的 OCR 資料
    this.setState('preview', {
      ...this.currentData,
      company_summary: null,
      personal_summary: null,
      sources: []
    });
  },
  
  // 超時 Promise
  timeout(ms, message) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  },
  
  // 顯示錯誤
  showError(message) {
    // 使用現有的 toast 機制
    if (typeof showToast === 'function') {
      showToast(message, 'error');
    } else {
      alert(message);
    }
  },
  
  // 顯示預覽 Modal
  showPreviewModal() {
    const modal = document.getElementById('preview-modal');
    const data = this.currentData;
    
    // 填充表單
    document.getElementById('preview-full-name').value = data.full_name || '';
    document.getElementById('preview-organization').value = data.organization || '';
    document.getElementById('preview-title').value = data.title || '';
    document.getElementById('preview-phone').value = data.phone || '';
    document.getElementById('preview-email').value = data.email || '';
    document.getElementById('preview-website').value = data.website || '';
    document.getElementById('preview-address').value = data.address || '';
    document.getElementById('preview-note').value = data.note || '';
    
    // 顯示 AI 摘要（若有）
    if (data.company_summary) {
      document.getElementById('preview-company-summary').textContent = data.company_summary;
      document.getElementById('ai-summary-section').classList.remove('hidden');
    } else {
      document.getElementById('ai-summary-section').classList.add('hidden');
    }
    
    // 綁定儲存按鈕事件
    const saveBtn = document.getElementById('preview-save-btn');
    const handleSave = async () => {
      try {
        // 收集表單資料
        const formData = {
          upload_id: data.upload_id,
          full_name: document.getElementById('preview-full-name').value,
          organization: document.getElementById('preview-organization').value,
          title: document.getElementById('preview-title').value,
          phone: document.getElementById('preview-phone').value,
          email: document.getElementById('preview-email').value,
          website: document.getElementById('preview-website').value,
          address: document.getElementById('preview-address').value,
          note: document.getElementById('preview-note').value,
          company_summary: data.company_summary,
          personal_summary: data.personal_summary,
          ai_sources_json: data.sources ? JSON.stringify(data.sources) : null
        };
        
        // 儲存名片
        await ReceivedCardsAPI.saveCard(formData);
        
        // 關閉 Modal
        modal.classList.add('hidden');
        
        // 顯示成功訊息
        if (typeof showToast === 'function') {
          showToast('名片已儲存', 'success');
        }
        
        // ⭐ 檢查是否顯示贊助提示
        ReceivedCards.checkDonationReminder();
        
        // 重新載入列表
        await ReceivedCards.loadCards();
        
        // 重置狀態機
        CardUploadStateMachine.reset();
        
      } catch (error) {
        if (typeof showToast === 'function') {
          showToast(`儲存失敗：${error.message}`, 'error');
        }
      } finally {
        saveBtn.removeEventListener('click', handleSave);
      }
    };
    
    saveBtn.addEventListener('click', handleSave);
    
    // 顯示 Modal
    modal.classList.remove('hidden');
  }
};
```

---

## 3. Namespace 化（修正 #5）

```javascript
// ==================== Namespace: ReceivedCards ====================
const ReceivedCards = {
  // 初始化
  init() {
    this.bindEvents();
    this.loadCards();
    this.initDonationReminder();  // ⭐ 初始化贊助提示
  },
  
  // 初始化贊助提示計數器
  initDonationReminder() {
    if (!localStorage.getItem('cardsSavedCount')) {
      localStorage.setItem('cardsSavedCount', '0');
    }
  },
  
  // 檢查是否顯示贊助提示（每 5 次儲存提示一次）
  checkDonationReminder() {
    const count = parseInt(localStorage.getItem('cardsSavedCount') || '0');
    const newCount = count + 1;
    localStorage.setItem('cardsSavedCount', newCount.toString());
    
    // 每 5 次儲存提示一次
    if (newCount % 5 === 0) {
      this.showDonationReminder();
    }
  },
  
  // 顯示贊助提示（Toast）
  showDonationReminder() {
    const lang = document.documentElement.lang || 'zh';
    const messages = {
      zh: '喜歡這個功能嗎？考慮<a href="https://github.com/sponsors/iim0663418" target="_blank" class="underline font-semibold">贊助開發者</a>支持專案發展！',
      en: 'Enjoying this feature? Consider <a href="https://github.com/sponsors/iim0663418" target="_blank" class="underline font-semibold">sponsoring the developer</a> to support the project!'
    };
    
    if (typeof showToast === 'function') {
      showToast(messages[lang] || messages.zh, 'info', 8000);  // 顯示 8 秒
    }
  },
  
  // 綁定事件
  bindEvents() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('card-image-input');
    
    // 點擊上傳
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // 檔案選擇
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this.handleFileUpload(e.target.files[0]);
      }
    });
    
    // 拖放上傳
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      
      const file = e.dataTransfer.files[0];
      if (file && file.type.match(/^image\/(jpeg|png)$/)) {
        this.handleFileUpload(file);
      } else {
        CardUploadStateMachine.showError('請上傳 JPG 或 PNG 格式的圖片');
      }
    });
    
    // 跳過 AI 按鈕
    document.getElementById('skip-ai-button').addEventListener('click', () => {
      CardUploadStateMachine.skipAI();
    });
  },
  
  // 處理檔案上傳
  async handleFileUpload(file) {
    // 檔案大小檢查
    if (file.size > 5 * 1024 * 1024) {
      CardUploadStateMachine.showError('檔案大小不可超過 5MB');
      return;
    }
    
    await CardUploadStateMachine.processCard(file);
  },
  
  // 載入名片列表
  async loadCards() {
    try {
      const cards = await ReceivedCardsAPI.loadCards();
      this.renderCards(cards);
    } catch (error) {
      console.error('Failed to load cards:', error);
    }
  },
  
  // 渲染名片列表
  renderCards(cards) {
    const grid = document.getElementById('cards-grid');
    grid.innerHTML = cards.map(card => this.renderCardHTML(card)).join('');
  },
  
  // 渲染單張名片 HTML
  renderCardHTML(card) {
    // ⭐ 使用 data 屬性傳遞參數（避免 JS 字串注入）
    return `
      <div class="glass-panel p-6 rounded-2xl space-y-4" 
           data-card-id="${card.uuid}"
           data-card-name="${this.escapeHTML(card.full_name)}"
           data-card-org="${this.escapeHTML(card.organization || '')}">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-lg font-bold text-slate-900">${this.escapeHTML(card.full_name)}</h3>
            <p class="text-sm text-slate-600">${this.escapeHTML(card.organization || '')}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="ReceivedCards.editCard('${card.uuid}')" class="btn-secondary">
            <i data-lucide="edit" class="w-4 h-4"></i>
          </button>
          <button onclick="ReceivedCards.deleteCardFromElement(this)" class="btn-danger">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  },
  
  // 從元素刪除名片（避免參數注入）
  deleteCardFromElement(buttonElement) {
    const cardElement = buttonElement.closest('[data-card-id]');
    const uuid = cardElement.dataset.cardId;
    const fullName = cardElement.dataset.cardName;
    const organization = cardElement.dataset.cardOrg;
    
    this.deleteCard(uuid, fullName, organization);
  },
  
  // 刪除名片（含樂觀更新與回滾）
  async deleteCard(uuid, fullName, organization) {
    // 顯示確認對話框
    const confirmed = await this.showDeleteConfirmModal(uuid, fullName, organization);
    if (!confirmed) return;
    
    // 樂觀更新：先從 UI 移除
    const cardElement = document.querySelector(`[data-card-id="${uuid}"]`);
    const cardHTML = cardElement.outerHTML;  // 備份 HTML
    cardElement.remove();
    
    try {
      // 調用 API
      await ReceivedCardsAPI.deleteCard(uuid);
      
      // 顯示成功訊息
      if (typeof showToast === 'function') {
        showToast('名片已刪除', 'success');
      }
    } catch (error) {
      // 失敗回滾：恢復 UI
      const grid = document.getElementById('cards-grid');
      grid.insertAdjacentHTML('beforeend', cardHTML);
      
      // 顯示錯誤訊息
      if (typeof showToast === 'function') {
        showToast(`刪除失敗：${error.message}`, 'error');
      }
      
      // 重新初始化 Lucide icons
      if (typeof window.initIcons === 'function') {
        window.initIcons();
      }
    }
  },
  
  // 顯示刪除確認對話框
  async showDeleteConfirmModal(uuid, fullName, organization) {
    return new Promise((resolve) => {
      const modal = document.getElementById('delete-confirm-modal');
      const cardInfo = document.getElementById('delete-card-info');
      const cancelBtn = document.getElementById('delete-cancel-btn');
      const confirmBtn = document.getElementById('delete-confirm-btn');
      
      // 設定名片資訊
      cardInfo.textContent = `${fullName} - ${organization}`;
      
      // 綁定事件
      const handleCancel = () => {
        modal.classList.add('hidden');
        resolve(false);
        cleanup();
      };
      
      const handleConfirm = () => {
        modal.classList.add('hidden');
        resolve(true);
        cleanup();
      };
      
      const cleanup = () => {
        cancelBtn.removeEventListener('click', handleCancel);
        confirmBtn.removeEventListener('click', handleConfirm);
      };
      
      cancelBtn.addEventListener('click', handleCancel);
      confirmBtn.addEventListener('click', handleConfirm);
      
      // 顯示 Modal
      modal.classList.remove('hidden');
    });
  },
  
  // HTML 轉義（防 XSS）
  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  
  // 視圖切換
  show() {
    document.getElementById('view-selection').classList.add('hidden');
    document.getElementById('view-received-cards').classList.remove('hidden');
    this.init();
  },
  
  hide() {
    document.getElementById('view-received-cards').classList.add('hidden');
    document.getElementById('view-selection').classList.remove('hidden');
  }
};

// 全域函式（向後相容）
function showReceivedCards() {
  ReceivedCards.show();
}

function backToSelection() {
  ReceivedCards.hide();
}
```

---

## 4. 無障礙改進（修正 #3）

```html
<!-- 上傳區域（含鍵盤操作與 ARIA） -->
<div id="upload-area" 
     class="glass-panel p-8 rounded-[2rem] border-2 border-dashed border-purple-300 hover:border-purple-500 transition-all cursor-pointer"
     role="button"
     tabindex="0"
     aria-label="上傳名片照片"
     onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();document.getElementById('card-image-input').click()}">
  <div class="text-center space-y-4">
    <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
      <i data-lucide="camera" class="w-8 h-8 text-purple-600" aria-hidden="true"></i>
    </div>
    <div>
      <p class="text-lg font-bold text-slate-900" data-i18n="upload-title">拍照上傳名片</p>
      <p class="text-sm text-slate-500" data-i18n="upload-subtitle">或拖放照片到此處</p>
    </div>
    <p class="text-xs text-slate-400" data-i18n="upload-hint">支援 JPG/PNG，最大 5MB</p>
  </div>
  <input type="file" 
         id="card-image-input" 
         accept="image/jpeg,image/png" 
         class="hidden"
         aria-label="選擇名片照片">
</div>

<!-- 拖放失敗提示 -->
<div id="drop-error" class="hidden mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm" role="alert">
  <i data-lucide="alert-circle" class="w-4 h-4 inline mr-2" aria-hidden="true"></i>
  <span data-i18n="drop-error">請上傳 JPG 或 PNG 格式的圖片</span>
</div>
```

---

## 5. i18n 對齊（修正 #6）

基於現有的 `zh` / `en` 語系（非 `zh-TW` / `en-US`）：

```javascript
// 在 user-portal-init.js 的 i18n 物件中新增
const i18n = {
  zh: {
    // ... 現有翻譯
    
    // 新增：我的名片夾
    'received-cards-title': '我的名片夾',
    'received-cards-desc': '管理您收到的實體名片，AI 自動辨識與補充資訊',
    'received-cards-manage': '管理收到的名片',
    'upload-title': '拍照上傳名片',
    'upload-subtitle': '或拖放照片到此處',
    'upload-hint': '支援 JPG/PNG，最大 5MB',
    'manual-add': '手動新增（當 OCR 失敗時）',
    'ai-processing': 'AI 處理中...',
    'ai-step-uploading': '上傳中',
    'ai-step-ocr': '辨識名片文字',
    'ai-step-enrich': '智慧補充公司資訊',
    'ai-step-preview': '準備預覽',
    'skip-ai': '跳過 AI，直接儲存',
    'delete-confirm-title': '確定要刪除名片嗎？',
    'delete-confirm-warning': '此操作無法復原',
    'delete-confirm-cancel': '取消',
    'delete-confirm-ok': '確定刪除',
    'drop-error': '請上傳 JPG 或 PNG 格式的圖片',
    'back-to-selection': '返回選擇頁'
  },
  en: {
    // ... 現有翻譯
    
    // 新增：我的名片夾
    'received-cards-title': 'My Card Collection',
    'received-cards-desc': 'Manage received business cards with AI recognition',
    'received-cards-manage': 'Manage Received Cards',
    'upload-title': 'Upload Card Photo',
    'upload-subtitle': 'or drag and drop here',
    'upload-hint': 'Supports JPG/PNG, max 5MB',
    'manual-add': 'Manual Add (when OCR fails)',
    'ai-processing': 'AI Processing...',
    'ai-step-uploading': 'Uploading',
    'ai-step-ocr': 'Recognizing text',
    'ai-step-enrich': 'Enriching company info',
    'ai-step-preview': 'Preparing preview',
    'skip-ai': 'Skip AI, save now',
    'delete-confirm-title': 'Delete this card?',
    'delete-confirm-warning': 'This action cannot be undone',
    'delete-confirm-cancel': 'Cancel',
    'delete-confirm-ok': 'Confirm Delete',
    'drop-error': 'Please upload JPG or PNG image',
    'back-to-selection': 'Back to Selection',
    'donation-reminder': 'Enjoying this feature? Consider <a href="https://github.com/sponsors/iim0663418" target="_blank" class="underline font-semibold">sponsoring the developer</a> to support the project!'
  }
};
```

**i18n Keys 總計**: 32 個（30 個原有 + 2 個贊助提示）

---

## 6. 回滾策略（修正 #2）

### 回滾計畫

| 層級 | 回滾方式 | 預估時間 |
|------|---------|---------|
| **前端** | 移除 view-received-cards section + received-cards.js | 5 分鐘 |
| **後端 API** | 註解掉 8 個路由 | 10 分鐘 |
| **資料庫** | 執行 rollback migration | 5 分鐘 |
| **R2 Storage** | 刪除 Bucket（若已創建） | 5 分鐘 |
| **Cron Job** | 移除 Cron Trigger | 5 分鐘 |
| **總計** | | **30 分鐘** |

### 回滾觸發條件

- ✅ 生產環境出現 Critical Bug
- ✅ 使用者無法正常使用現有功能
- ✅ API 錯誤率 > 10%
- ✅ 資料庫效能下降 > 20%

---

## 7. 整合檢查清單

### 前端整合
- [ ] 在 user-portal.html 新增 view-received-cards section
- [ ] 在 view-selection 新增入口按鈕
- [ ] 新增 received-cards.js（Namespace 化）
- [ ] 新增 32 個 i18n keys（zh/en，含贊助提示）
- [ ] 實作完整狀態機（含超時、取消、重試）
- [ ] 實作無障礙功能（鍵盤操作、ARIA）
- [ ] 實作樂觀更新與回滾（刪除功能）

### 後端整合
- [ ] 執行 Migration 0024 (received_cards)
- [ ] 執行 Migration 0025 (temp_uploads)
- [ ] 實作 8 個 API 端點（含 CSRF 支援）
- [ ] 設定 R2 Storage Bucket
- [ ] 設定 R2 Lifecycle Rules
- [ ] 設定 Cron Job（臨時檔案清理）
- [ ] 設定 Cloudflare Secrets（GEMINI_API_KEY）

### 測試
- [ ] 單元測試（API 端點）
- [ ] 整合測試（完整流程）
- [ ] 無障礙測試（鍵盤操作、螢幕閱讀器）
- [ ] 效能測試（5MB 圖片上傳）
- [ ] 錯誤處理測試（網路失敗、API 失敗）
- [ ] 回滾測試（確保可快速回滾）

---

## 8. 預估時間（修正版）

| 階段 | 任務 | 時間 |
|------|------|------|
| **後端** | 8 個 API 端點 + 錯誤處理 | 6 小時 |
| **後端** | 2 個 Migrations + R2 + Cron | 2 小時 |
| **前端** | HTML + 狀態機 + Namespace | 4 小時 |
| **前端** | 無障礙 + i18n | 2 小時 |
| **測試** | 整合測試 + 回滾測試 | 2 小時 |
| **總計** | | **16 小時** |

---

## 總結

此修正版整合方案：
- ✅ 統一 API 呼叫模式（CSRF + 錯誤處理）
- ✅ 完整狀態機設計（含超時、取消、重試）
- ✅ Namespace 化（避免全域函式衝突）
- ✅ 無障礙支援（鍵盤操作 + ARIA）
- ✅ i18n 對齊（zh/en）
- ✅ 樂觀更新與回滾（刪除功能）
- ✅ 明確回滾策略（30 分鐘內完成）

**風險等級**: 中度（可控）
**預估時間**: 16 小時
**回滾時間**: 30 分鐘
