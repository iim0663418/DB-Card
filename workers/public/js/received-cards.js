// Received Cards Module
// AI-First Card Capture Feature

// ==================== Mobile Upload Optimization ====================

/**
 * Generate idempotency key for upload deduplication
 */
function generateIdempotencyKey() {
  return `${Date.now()}_${crypto.randomUUID()}`;
}

/**
 * Read file magic bytes for format detection
 */
async function readMagicBytes(file, length = 12) {
  const slice = file.slice(0, length);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Check if file is HEIC format (extension + MIME + magic bytes)
 */
async function isHEIC(file) {
  const fileName = file.name.toLowerCase();
  
  // Check extension
  if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
    return true;
  }
  
  // Check MIME type
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    return true;
  }
  
  // Check magic bytes
  const magicBytes = await readMagicBytes(file, 12);
  return isHEICMagicBytes(magicBytes);
}

/**
 * Detect HEIC magic bytes (ftyp heic/mif1/msf1/hevc)
 */
function isHEICMagicBytes(bytes) {
  if (bytes.length < 12) return false;
  
  // Check "ftyp" (66 74 79 70)
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && 
      bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    return ['heic', 'mif1', 'msf1', 'hevc'].includes(brand);
  }
  
  return false;
}

/**
 * Show HEIC error message with iPhone settings guide
 */
function showHEICError() {
  const lang = document.documentElement.lang || 'zh';
  
  const messages = {
    zh: `❌ 不支援 HEIC 格式

📱 iPhone 用戶請依以下步驟設定（30 秒完成）：
1. 開啟「設定」App
2. 點選「相機」
3. 點選「格式」
4. 選擇「最相容」（而非「高效率」）

✅ 設定後拍攝的照片將自動儲存為 JPG 格式`,
    
    en: `❌ HEIC format not supported

📱 iPhone users: Change camera settings (30 seconds):
1. Open "Settings" app
2. Tap "Camera"
3. Tap "Formats"
4. Select "Most Compatible" (not "High Efficiency")

✅ Photos will be saved as JPG automatically`
  };
  
  const message = messages[lang] || messages.zh;
  
  if (typeof showToast === 'function') {
    showToast(message, 'error', 10000);
  } else {
    alert(message);
  }
}

/**
 * Compress image with cancellation support
 */
async function compressImageWithCancellation(file, signal) {
  // Safari/iOS compatibility: disable Web Worker, use main thread
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  const compressionPromise = imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: !isSafari,  // Disable for Safari
    fileType: 'image/jpeg',
    initialQuality: 0.8  // Better compatibility
  });
  
  if (!signal) {
    return await compressionPromise;
  }
  
  // Simulate cancellation with Promise.race
  const abortPromise = new Promise((_, reject) => {
    signal.addEventListener('abort', () => {
      reject(new Error('Compression cancelled'));
    });
  });
  
  return await Promise.race([compressionPromise, abortPromise]);
}

/**
 * File to Base64 conversion
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload with exponential backoff retry
 */
async function uploadWithRetry(file, thumbnail, signal, maxRetries = 3) {
  const idempotencyKey = generateIdempotencyKey();
  const API_BASE = window.API_BASE || '';
  const csrfToken = sessionStorage.getItem('csrfToken');
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const imageBase64 = await fileToBase64(file);
      const thumbnailBase64 = thumbnail ? await fileToBase64(thumbnail) : null;
      
      const response = await fetch(`${API_BASE}/api/user/received-cards/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
          ...(csrfToken && { 'X-CSRF-Token': csrfToken })
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          thumbnail_base64: thumbnailBase64,
          filename: file.name
        }),
        signal
      });
      
      if (!response.ok) {
        const error = new Error(`Upload failed: ${response.status}`);
        error.status = response.status;
        throw error;
      }
      
      return await response.json();
      
    } catch (error) {
      // Don't retry if cancelled
      if (error.name === 'AbortError' || signal?.aborted) {
        throw error;
      }
      
      // Check if retryable
      const isNetworkError = !error.status;
      const isServerError = error.status >= 500;
      const isRateLimit = error.status === 429;
      const isRetryable = isNetworkError || isServerError || isRateLimit;
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const baseDelay = 1000 * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const delay = Math.min(baseDelay + jitter, 10000);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ==================== Thumbnail Generator ====================
async function generateThumbnailClient(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      // Calculate thumbnail size (300x200 max, keep aspect ratio)
      const maxWidth = 300;
      const maxHeight = 200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Create canvas and draw thumbnail
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG blob (Safari compatible)
      // Note: WebP not supported in Safari canvas.toBlob()
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to generate thumbnail'));
            return;
          }

          // Check size, reduce quality if needed
          if (blob.size > 20 * 1024) {
            canvas.toBlob(
              (reducedBlob) => {
                resolve(reducedBlob || blob);
              },
              'image/jpeg',
              0.6
            );
          } else {
            resolve(blob);
          }
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    reader.onerror = () => reject(new Error('Failed to read file'));

    reader.readAsDataURL(file);
  });
}

// ==================== API Helper ====================
const ReceivedCardsAPI = {
  async call(endpoint, options = {}) {
    const csrfToken = sessionStorage.getItem('csrfToken');

    // Debug: log CSRF token status
    if (!csrfToken) {
      // CSRF token not found - request will proceed without it
    }

    const headers = {
      ...options.headers,
      ...(csrfToken && { 'X-CSRF-Token': csrfToken })
    };

    const response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include',
      signal: options.signal
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // If response is not JSON, try to read as text
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch {
          // Ignore text parsing errors
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  },

  async uploadImage(file, signal) {
    try {
      // 1. HEIC detection and blocking
      if (await isHEIC(file)) {
        showHEICError();
        throw new Error('HEIC format not supported');
      }

      // 2. Check cancellation before compression
      if (signal?.aborted) {
        throw new Error('Upload cancelled');
      }

      // 3. Compress image (cancellable)
      const compressedFile = await compressImageWithCancellation(file, signal);

      // 4. Generate thumbnail (parallel with upload preparation)
      const thumbnail = await generateThumbnailClient(compressedFile);

      // 5. Check cancellation after compression
      if (signal?.aborted) {
        throw new Error('Upload cancelled');
      }

      // 6. Upload with retry (idempotent)
      const result = await uploadWithRetry(compressedFile, thumbnail, signal);

      // Handle response format: { success: true, data: { upload_id, ... } }
      const uploadData = result.data || result;
      if (!uploadData || !uploadData.upload_id) {
        throw new Error('Upload failed: Invalid response from server');
      }

      return uploadData;

    } catch (error) {
      console.error('[Upload] Failed:', error);
      
      // Handle cancellation gracefully
      if (error.message === 'Upload cancelled' || error.message === 'Compression cancelled') {
        if (typeof showToast === 'function') {
          showToast('上傳已取消', 'info');
        }
      } else if (typeof showToast === 'function') {
        showToast(`上傳失敗：${error.message}`, 'error');
      }
      
      throw error;
    }
  },

  async performOCR(uploadId, signal) {
    return await this.call('/api/user/received-cards/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_id: uploadId }),
      signal
    });
  },

  async unifiedExtract(uploadId, signal) {
    return await this.call('/api/user/received-cards/unified-extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_id: uploadId }),
      signal
    });
  },

  async enrichCard(uploadId, ocrData, signal) {
    return await this.call('/api/user/received-cards/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upload_id: uploadId,
        organization: ocrData.organization,
        full_name: ocrData.full_name,
        title: ocrData.title
      }),
      signal
    });
  },

  async saveCard(data) {
    return await this.call('/api/user/received-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async loadCards() {
    return await this.call('/api/user/received-cards');
  },

  async searchCards(query, page = 1, limit = 100) {
    const params = new URLSearchParams({ q: query, page: page.toString(), limit: limit.toString() });
    return await this.call(`/api/user/received-cards/search?${params}`);
  },

  async updateCard(uuid, data) {
    return await this.call(`/api/user/received-cards/${uuid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async deleteCard(uuid) {
    return await this.call(`/api/user/received-cards/${uuid}`, {
      method: 'DELETE'
    });
  }
};

// ==================== State Machine ====================
const CardUploadStateMachine = {
  state: 'idle',
  currentData: null,
  currentUploadId: null,
  abortController: null,
  skipAITimer: null,

  setState(newState, data = null) {
    this.state = newState;
    if (data) {
      this.currentData = { ...this.currentData, ...data };
    }
    this.updateUI();
  },

  updateUI() {
    const states = {
      idle: { show: ['upload-area'], hide: ['ai-processing', 'preview-modal', 'error-message'] },
      uploading: { show: ['ai-processing'], hide: ['upload-area', 'preview-modal'], step: 0 },
      ocr: { show: ['ai-processing'], hide: ['upload-area', 'preview-modal'], step: 1 },
      preview: { show: ['preview-modal'], hide: ['ai-processing', 'upload-area', 'skip-ai-button'] },
      error: { show: ['error-message'], hide: ['ai-processing', 'upload-area', 'preview-modal'] }
    };

    const config = states[this.state];
    if (!config) return;

    config.show?.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    });

    config.hide?.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    if (config.step !== undefined) {
      this.updateAIStep(config.step);
    }

    if (this.state === 'preview') {
      this.showPreviewModal();
    }
  },

  updateAIStep(stepIndex) {
    document.querySelectorAll('.ai-step').forEach((el, index) => {
      el.classList.remove('active', 'completed');
      if (index < stepIndex) {
        el.classList.add('completed');
      } else if (index === stepIndex) {
        el.classList.add('active');
      }
    });
  },

  startSkipAITimer() {
    this.clearSkipAITimer();
    this.skipAITimer = setTimeout(() => {
      const btn = document.getElementById('skip-ai-button');
      if (btn) btn.classList.remove('hidden');
    }, 5000);
  },

  clearSkipAITimer() {
    if (this.skipAITimer) {
      clearTimeout(this.skipAITimer);
      this.skipAITimer = null;
    }
  },

  // Schema validator for extract result
  validateExtractResult(data) {
    const schema = {
      full_name: v => typeof v === 'string',
      organization: v => typeof v === 'string',
      organization_en: v => typeof v === 'string' || v === null,
      organization_alias: v => Array.isArray(v),
      organization_full: v => typeof v === 'string' || v === null,
      department: v => typeof v === 'string' || v === null,
      title: v => typeof v === 'string' || v === null,
      phone: v => typeof v === 'string' || v === null,
      email: v => typeof v === 'string' || v === null,
      website: v => typeof v === 'string' || v === null,
      address: v => typeof v === 'string' || v === null,
      company_summary: v => typeof v === 'string' || v === null,
      personal_summary: v => typeof v === 'string' || v === null,
      sources: v => Array.isArray(v)
    };

    const errors = [];
    for (const [key, validator] of Object.entries(schema)) {
      if (!validator(data[key])) {
        errors.push(`Invalid ${key}: ${typeof data[key]}`);
      }
    }

    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  },

  // Safe data extraction with validation
  safeExtractData(rawData) {
    // Validate schema
    const validation = this.validateExtractResult(rawData);
    if (!validation.ok) {
      console.error('[Schema Validation Failed]', validation.errors);
      throw new Error('Invalid API response format');
    }

    // Extract with defensive defaults
    return {
      full_name: rawData.full_name || '',
      organization: rawData.organization || '',
      organization_en: rawData.organization_en || '',
      organization_alias: Array.isArray(rawData.organization_alias) ? rawData.organization_alias : [],
      organization_full: rawData.organization_full || '',
      department: rawData.department || '',
      title: rawData.title || '',
      phone: rawData.phone || '',
      email: rawData.email || '',
      website: rawData.website || '',
      address: rawData.address || '',
      company_summary: rawData.company_summary || '',
      personal_summary: rawData.personal_summary || '',
      sources: Array.isArray(rawData.sources) ? rawData.sources : []
    };
  },

  async processCard(file) {
    this.abortController = new AbortController();
    
    try {
      this.setState('uploading');
      const uploadResult = await ReceivedCardsAPI.uploadImage(file, this.abortController.signal);
      const uploadData = uploadResult.data || uploadResult;
      this.currentUploadId = uploadData.upload_id;
      
      this.setState('ocr');
      const extractResult = await Promise.race([
        ReceivedCardsAPI.unifiedExtract(this.currentUploadId, this.abortController.signal),
        this.timeout(20000, 'Extract timeout')
      ]);
      
      // Safe extraction with schema validation
      const rawData = extractResult.data || extractResult;
      const extractData = this.safeExtractData(rawData);
      
      this.currentData = {
        ...extractData,
        upload_id: this.currentUploadId
      };
      
      this.setState('preview', {
        ...this.currentData
      });
      
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }

      // Handle 429 errors gracefully
      if (error.status === 429) {
        if (typeof showToast === 'function') {
          showToast('⚠️ 系統繁忙，請稍後再試', 'warning');
        }
        this.setState('idle');
      } else {
        this.setState('error', { error: error.message });
      }
    } finally {
      this.abortController = null;
    }
  },

  async skipAI() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    this.setState('preview', { ...this.currentData });
  },

  timeout(ms, message) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error(message)), ms)
    );
  },

  showPreviewModal() {
    const modal = document.getElementById('preview-modal');
    const data = this.currentData;
    
    if (!modal || !data) {
      return;
    }
    
    // 安全填充表單（防止 DOM 元素不存在）
    const safeSetValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value || '';
    };
    
    safeSetValue('preview-name-prefix', data.name_prefix);
    safeSetValue('preview-full-name', data.full_name);
    safeSetValue('preview-name-suffix', data.name_suffix);
    safeSetValue('preview-organization', data.organization);
    safeSetValue('preview-organization-en', data.organization_en);
    
    // Handle organization_alias: convert array to comma-separated string
    const aliasValue = Array.isArray(data.organization_alias) 
      ? data.organization_alias.join(', ') 
      : (data.organization_alias || '');
    safeSetValue('preview-organization-alias', aliasValue);
    
    safeSetValue('preview-department', data.department);
    safeSetValue('preview-title', data.title);
    safeSetValue('preview-phone', data.phone);
    safeSetValue('preview-email', data.email);
    safeSetValue('preview-website', data.website);
    safeSetValue('preview-address', data.address);
    safeSetValue('preview-note', data.note);
    
    // Safe handling of AI summaries
    const companySummaryEl = document.getElementById('preview-company-summary');
    const personalSummaryEl = document.getElementById('preview-personal-summary');
    const aiSectionEl = document.getElementById('ai-summary-section');
    
    let hasAnySummary = false;
    
    if (data.company_summary && companySummaryEl) {
      companySummaryEl.textContent = data.company_summary;
      const parent = companySummaryEl.parentElement;
      if (parent) parent.classList.remove('hidden');
      hasAnySummary = true;
    } else if (companySummaryEl && companySummaryEl.parentElement) {
      companySummaryEl.parentElement.classList.add('hidden');
    }
    
    if (data.personal_summary && personalSummaryEl) {
      personalSummaryEl.textContent = data.personal_summary;
      const parent = personalSummaryEl.parentElement;
      if (parent) parent.classList.remove('hidden');
      hasAnySummary = true;
    } else if (personalSummaryEl && personalSummaryEl.parentElement) {
      personalSummaryEl.parentElement.classList.add('hidden');
    }
    
    if (aiSectionEl) {
      if (hasAnySummary) {
        aiSectionEl.classList.remove('hidden');
      } else {
        aiSectionEl.classList.add('hidden');
      }
    }
    
    const saveBtn = document.getElementById('preview-save-btn');
    const handleSave = async () => {
      // 防止重複點擊
      if (saveBtn.disabled) return;

      // 儲存原始按鈕文字
      const originalText = saveBtn.innerHTML;

      try {
        // 禁用按鈕並顯示 loading
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<svg class="animate-spin h-5 w-5 inline-block" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> 儲存中...';

        // 判斷 ai_status：有 sources 就是 completed
        const aiStatus = (data.sources && data.sources.length > 0) ? 'completed' : null;

        const formData = {
          upload_id: data.upload_id,
          name_prefix: document.getElementById('preview-name-prefix').value,
          full_name: document.getElementById('preview-full-name').value,
          name_suffix: document.getElementById('preview-name-suffix').value,
          organization: document.getElementById('preview-organization').value,
          organization_en: document.getElementById('preview-organization-en').value,
          organization_alias: document.getElementById('preview-organization-alias').value
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0),
          department: document.getElementById('preview-department').value,
          title: document.getElementById('preview-title').value,
          phone: document.getElementById('preview-phone').value,
          email: document.getElementById('preview-email').value,
          website: document.getElementById('preview-website').value,
          address: document.getElementById('preview-address').value,
          note: document.getElementById('preview-note').value,
          company_summary: data.company_summary,
          personal_summary: data.personal_summary,
          sources: data.sources,
          ai_status: aiStatus,
          ocr_raw_text: data.ocr_raw_text
        };

        await ReceivedCardsAPI.saveCard(formData);

        modal.classList.add('hidden');

        if (typeof showToast === 'function') {
          showToast('名片已儲存', 'success');
        }

        ReceivedCards.checkDonationReminder();

        await ReceivedCards.loadCards();

        this.reset();

      } catch (error) {
        if (typeof showToast === 'function') {
          showToast(`儲存失敗：${error.message}`, 'error');
        }

        // 錯誤時恢復按鈕狀態
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText || '確認儲存';
      } finally {
        saveBtn.removeEventListener('click', handleSave);
      }
    };
    
    saveBtn.addEventListener('click', handleSave);
    
    modal.classList.remove('hidden');
  },

  reset() {
    this.state = 'idle';
    this.currentData = null;
    this.currentUploadId = null;
    this.abortController = null;
    this.clearSkipAITimer();
    this.updateUI();
  }
};

// ==================== Namespace: ReceivedCards ====================
const ReceivedCards = {
  cards: [], // Store loaded cards
  allCards: [], // Store all cards for filtering
  selectedTags: [], // Store selected tags
  currentKeyword: '', // Store current search keyword

  init() {
    this.bindEvents();
    this.bindSearchEvents();
    this.bindEditModalEvents();
    this.bindQRCodeModalEvents();
    this.bindCardDetailModalEvents();
    this.loadCards();
    this.initDonationReminder();
  },
  
  initDonationReminder() {
    if (!localStorage.getItem('cardsSavedCount')) {
      localStorage.setItem('cardsSavedCount', '0');
    }
  },
  
  checkDonationReminder() {
    const count = parseInt(localStorage.getItem('cardsSavedCount') || '0');
    const newCount = count + 1;
    localStorage.setItem('cardsSavedCount', newCount.toString());
    
    if (newCount % 5 === 0) {
      this.showDonationReminder();
    }
  },
  
  showDonationReminder() {
    const lang = document.documentElement.lang || 'zh';
    const messages = {
      zh: '喜歡這個功能嗎？考慮<a href="https://github.com/sponsors/iim0663418" target="_blank" class="underline font-semibold">贊助開發者</a>支持專案發展！',
      en: 'Enjoying this feature? Consider <a href="https://github.com/sponsors/iim0663418" target="_blank" class="underline font-semibold">sponsoring the developer</a> to support the project!'
    };
    
    // Use custom toast for HTML content
    this.showHTMLToast(messages[lang] || messages.zh, 'info', 8000);
  },

  // Custom toast that supports HTML content
  showHTMLToast(html, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 max-w-md ${
      type === 'info' ? 'bg-blue-500' : 
      type === 'success' ? 'bg-green-500' : 
      type === 'warning' ? 'bg-yellow-500' : 
      'bg-red-500'
    }`;
    toast.innerHTML = html;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  
  bindEvents() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('card-image-input');

    uploadArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

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
        if (typeof showToast === 'function') {
          showToast('請上傳 JPG 或 PNG 格式的圖片', 'error');
        }
      }
    });

    const skipBtn = document.getElementById('skip-ai-button');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        CardUploadStateMachine.skipAI();
      });
    }
  },

  bindSearchEvents() {
    // 搜尋框輸入事件
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.currentKeyword = e.target.value.toLowerCase().trim();
        this.filterCards();

        // 顯示/隱藏清除按鈕
        const clearBtn = document.getElementById('clearSearch');
        if (clearBtn) {
          if (this.currentKeyword) {
            clearBtn.classList.remove('hidden');
          } else {
            clearBtn.classList.add('hidden');
          }
        }
      });
    }

    // 清除搜尋按鈕
    const clearSearch = document.getElementById('clearSearch');
    if (clearSearch) {
      clearSearch.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          this.currentKeyword = '';
          this.filterCards();
          clearSearch.classList.add('hidden');
        }
      });
    }

    // 清除所有篩選按鈕
    const clearFilters = document.getElementById('clearFilters');
    if (clearFilters) {
      clearFilters.addEventListener('click', () => {
        this.clearAllFilters();
      });
    }
  },

  bindEditModalEvents() {
    // 綁定表單提交事件
    const form = document.getElementById('editCardForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleEditFormSubmit(e));
    }

    // 取消按鈕
    const cancelBtn = document.getElementById('cancelEdit');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeEditModal());
    }

    // 點擊背景關閉
    const modal = document.getElementById('editCardModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target.id === 'editCardModal') {
          this.closeEditModal();
        }
      });
    }

    // ESC 鍵關閉
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('editCardModal');
        if (modal && !modal.classList.contains('hidden')) {
          this.closeEditModal();
        }
      }
    });
  },

  bindQRCodeModalEvents() {
    // 關閉按鈕
    const closeBtn = document.getElementById('closeQRCode');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeQRCodeModal());
    }

    // 下載按鈕
    const downloadBtn = document.getElementById('downloadQRCode');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadQRCode());
    }

    // 點擊背景關閉
    const modal = document.getElementById('qrCodeModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target.id === 'qrCodeModal') {
          this.closeQRCodeModal();
        }
      });
    }

    // ESC 鍵關閉（共用）
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('qrCodeModal');
        if (modal && !modal.classList.contains('hidden')) {
          this.closeQRCodeModal();
        }
      }
    });
  },

  async filterCards() {
    // 如果有搜尋關鍵字，使用智慧搜尋 API
    if (this.currentKeyword && this.currentKeyword.trim().length > 0) {
      try {
        const response = await API.searchCards(this.currentKeyword.trim());
        
        if (response && response.results) {
          // 套用標籤過濾
          const filtered = response.results.filter(card => {
            const matchTags = this.selectedTags.length === 0 ||
              this.selectedTags.some(tag => card.tags?.includes(tag));
            return matchTags;
          });

          // 更新結果數量
          const resultCount = document.getElementById('resultCount');
          if (resultCount) {
            resultCount.textContent = `${filtered.length} (智慧搜尋)`;
          }

          // 渲染名片（帶高亮）
          this.renderCards(filtered, this.currentKeyword);
          this.updateClearFiltersButton();
          this.updateURL();
          return;
        }
      } catch (error) {
        console.error('Smart search failed, fallback to client-side filter:', error);
        // 失敗時回退到客戶端過濾
      }
    }

    // 客戶端過濾（無搜尋或 API 失敗時）
    const filtered = this.allCards.filter(card => {
      // 搜尋過濾（擴展到新欄位）
      const matchKeyword = !this.currentKeyword ||
        card.full_name?.toLowerCase().includes(this.currentKeyword) ||
        card.organization?.toLowerCase().includes(this.currentKeyword) ||
        card.organization_en?.toLowerCase().includes(this.currentKeyword) ||
        card.organization_alias?.toLowerCase().includes(this.currentKeyword) ||
        card.department?.toLowerCase().includes(this.currentKeyword) ||
        card.title?.toLowerCase().includes(this.currentKeyword) ||
        card.email?.toLowerCase().includes(this.currentKeyword) ||
        card.phone?.toLowerCase().includes(this.currentKeyword);

      // 標籤過濾（多選 OR 邏輯）
      const matchTags = this.selectedTags.length === 0 ||
        this.selectedTags.some(tag => card.tags?.includes(tag));

      return matchKeyword && matchTags;
    });

    // 更新結果數量
    const resultCount = document.getElementById('resultCount');
    if (resultCount) {
      resultCount.textContent = filtered.length;
    }

    // 渲染名片（帶高亮）
    this.renderCards(filtered, this.currentKeyword);

    // 更新清除篩選按鈕可見性
    this.updateClearFiltersButton();

    // 更新 URL 參數
    this.updateURL();
  },

  clearAllFilters() {
    // 清除標籤選擇
    this.selectedTags = [];
    document.querySelectorAll('.tag-filter').forEach(btn => {
      btn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
      btn.classList.add('border-gray-300', 'text-gray-700');
    });

    // 清除搜尋
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = '';
    }
    this.currentKeyword = '';

    const clearSearch = document.getElementById('clearSearch');
    if (clearSearch) {
      clearSearch.classList.add('hidden');
    }

    // 顯示所有名片
    this.filterCards();
  },

  updateClearFiltersButton() {
    const clearFilters = document.getElementById('clearFilters');
    if (clearFilters) {
      if (this.selectedTags.length > 0 || this.currentKeyword) {
        clearFilters.classList.remove('hidden');
      } else {
        clearFilters.classList.add('hidden');
      }
    }
  },

  updateURL() {
    const params = new URLSearchParams();
    if (this.currentKeyword) params.set('q', this.currentKeyword);
    if (this.selectedTags.length > 0) params.set('tags', this.selectedTags.join(','));

    const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newURL);
  },

  initFromURL() {
    const params = new URLSearchParams(window.location.search);
    const keyword = params.get('q') || '';
    const tags = params.get('tags')?.split(',').filter(Boolean) || [];

    // 設定搜尋框
    const searchInput = document.getElementById('searchInput');
    if (searchInput && keyword) {
      searchInput.value = keyword;
      this.currentKeyword = keyword.toLowerCase().trim();

      const clearSearch = document.getElementById('clearSearch');
      if (clearSearch) {
        clearSearch.classList.remove('hidden');
      }
    }

    // 設定標籤選擇
    this.selectedTags = tags;
    tags.forEach(tag => {
      const btn = document.querySelector(`[data-tag="${tag}"]`);
      if (btn) {
        btn.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
        btn.classList.remove('border-gray-300', 'text-gray-700');
      }
    });

    // 執行篩選
    if (keyword || tags.length > 0) {
      this.filterCards();
    }
  },

  initTagFilters() {
    // 從所有名片中提取標籤並按類別分組
    const tagsByCategory = {
      industry: new Map(),
      location: new Map(),
      expertise: new Map(),
      seniority: new Map()
    };

    this.allCards.forEach(card => {
      card.tags?.forEach(tag => {
        const [category, value] = tag.split(':');
        if (tagsByCategory[category]) {
          const count = tagsByCategory[category].get(value) || 0;
          tagsByCategory[category].set(value, count + 1);
        }
      });
    });

    // 渲染各類別標籤
    this.renderCategoryTags('industry', tagsByCategory.industry);
    this.renderCategoryTags('location', tagsByCategory.location);
    this.renderCategoryTags('expertise', tagsByCategory.expertise);
    this.renderCategoryTags('seniority', tagsByCategory.seniority);

    // Accordion toggle
    const toggle = document.getElementById('tagFilterToggle');
    const content = document.getElementById('tagFilterContent');
    const chevron = document.getElementById('tagFilterChevron');

    toggle?.addEventListener('click', () => {
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !isExpanded);
      content?.classList.toggle('hidden');
      chevron?.classList.toggle('rotate-180');
    });

    // Clear filters
    document.getElementById('clearFilters')?.addEventListener('click', () => {
      this.selectedTags = [];
      document.querySelectorAll('.tag-filter').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
        btn.classList.add('border-slate-300', 'text-slate-700');
      });
      this.updateActiveFilterCount();
      this.filterCards();
    });
  },

  renderCategoryTags(category, tagsMap) {
    const container = document.getElementById(`${category}Tags`);
    if (!container) return;

    if (tagsMap.size === 0) {
      container.innerHTML = '<span class="text-xs text-slate-400">無資料</span>';
      return;
    }

    container.innerHTML = Array.from(tagsMap.entries())
      .sort((a, b) => b[1] - a[1]) // 按數量排序
      .map(([value, count]) => `
        <button
          class="tag-filter px-3 py-1.5 rounded-full text-sm font-medium border-2 border-slate-300 text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all"
          data-tag="${category}:${this.escapeHTML(value)}"
        >
          ${this.escapeHTML(value)} <span class="text-xs opacity-60">(${count})</span>
        </button>
      `).join('');

    // 綁定點擊事件
    container.querySelectorAll('.tag-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;

        if (this.selectedTags.includes(tag)) {
          this.selectedTags = this.selectedTags.filter(t => t !== tag);
          btn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
          btn.classList.add('border-slate-300', 'text-slate-700');
        } else {
          this.selectedTags.push(tag);
          btn.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
          btn.classList.remove('border-slate-300', 'text-slate-700');
        }

        this.updateActiveFilterCount();
        this.filterCards();
      });
    });
  },

  updateActiveFilterCount() {
    const countBadge = document.getElementById('activeFilterCount');
    const clearBtn = document.getElementById('clearFilters');

    if (this.selectedTags.length > 0) {
      countBadge.textContent = this.selectedTags.length;
      countBadge.classList.remove('hidden');
      clearBtn?.classList.remove('hidden');
    } else {
      countBadge.classList.add('hidden');
      clearBtn?.classList.add('hidden');
    }
  },

  getTagLabel(tag) {
    // 標籤格式: "category:value"
    const [category, value] = tag.split(':');
    return value || tag;
  },

  highlightText(text, keyword) {
    if (!keyword || !text) return this.escapeHTML(text);

    const escapedText = this.escapeHTML(text);
    // Escape special regex characters in keyword
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    return escapedText.replace(regex, '<mark class="bg-yellow-200 font-bold">$1</mark>');
  },
  
  async handleFileUpload(file) {
    if (file.size > 5 * 1024 * 1024) {
      if (typeof showToast === 'function') {
        showToast('檔案大小不可超過 5MB', 'error');
      }
      return;
    }
    
    await CardUploadStateMachine.processCard(file);
  },
  
  async loadCards() {
    try {
      const response = await ReceivedCardsAPI.loadCards();
      const cards = Array.isArray(response) ? response : (response?.data || []);

      // 查詢已分享的名片 UUID（加上錯誤處理）
      let sharedUuids = new Set();
      try {
        const sharedResponse = await fetch(`${API_BASE}/api/user/shared-cards`, {
          credentials: 'include'
        });
        if (sharedResponse.ok) {
          const sharedData = await sharedResponse.json();
          const sharedCards = Array.isArray(sharedData) ? sharedData : (sharedData?.data || []);
          sharedUuids = new Set(sharedCards.map(c => c.uuid));
        }
      } catch (error) {
        console.warn('Failed to load shared cards:', error);
        // 繼續執行，不影響主要功能
      }

      // 標記 is_shared
      cards.forEach(card => {
        card.is_shared = sharedUuids.has(card.uuid);
      });

      this.cards = cards; // Store for later use
      this.allCards = cards; // Store all cards for filtering

      // 初始化標籤篩選器
      this.initTagFilters();

      // 從 URL 初始化篩選
      this.initFromURL();

      // 如果沒有 URL 參數，顯示所有名片
      if (!this.currentKeyword && this.selectedTags.length === 0) {
        this.renderCards(cards);
        const resultCount = document.getElementById('resultCount');
        if (resultCount) {
          resultCount.textContent = cards.length;
        }
      }
    } catch (_error) {
      this.cards = [];
      this.allCards = [];
      this.renderCards([]);
      const resultCount = document.getElementById('resultCount');
      if (resultCount) {
        resultCount.textContent = '0';
      }
    }
  },
  
  renderCards(cards, keyword = '') {
    const grid = document.getElementById('cards-grid');
    if (!grid) return;

    if (!Array.isArray(cards) || cards.length === 0) {
      // 無結果提示
      const isFiltering = this.currentKeyword || this.selectedTags.length > 0;
      grid.innerHTML = `
        <div class="col-span-full text-center py-12 space-y-4">
          <svg class="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p class="text-slate-500 font-medium">${isFiltering ? '找不到符合條件的名片' : '尚無名片'}</p>
          ${isFiltering ? `
            <button
              onclick="ReceivedCards.clearAllFilters()"
              class="px-4 py-2 text-blue-600 hover:text-blue-800 font-bold transition-colors"
            >
              清除篩選
            </button>
          ` : ''}
        </div>
      `;
      return;
    }

    grid.innerHTML = cards.map(card => this.renderCardHTML(card, keyword)).join('');

    // Bind thumbnail click events
    this.bindThumbnailEvents();

    // Bind share toggle events
    this.bindShareToggles();

    if (typeof window.initIcons === 'function') {
      window.initIcons();
    }
  },

  renderCardThumbnail(card) {
    // Desktop: 120x80px, Mobile: 80x53px (responsive via CSS)
    if (card.thumbnail_url) {
      return `
        <div class="card-thumbnail flex-shrink-0 w-20 h-[53px] md:w-[120px] md:h-20 bg-gray-100 rounded overflow-hidden cursor-pointer"
             data-card-uuid="${card.uuid}">
          <img
            src="/api/user/received-cards/${card.uuid}/thumbnail"
            alt="名片縮圖"
            class="w-full h-full object-cover"
            loading="lazy"
            onerror="this.parentElement.innerHTML='<svg class=\\'w-8 h-8 text-gray-400\\' fill=\\'none\\' stroke=\\'currentColor\\' viewBox=\\'0 0 24 24\\'><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z\\' /></svg>';"
          >
        </div>
      `;
    } else {
      // No thumbnail: show default icon
      return `
        <div class="card-thumbnail flex-shrink-0 w-20 h-[53px] md:w-[120px] md:h-20 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      `;
    }
  },

  bindThumbnailEvents() {
    // Bind click events for thumbnails
    document.querySelectorAll('.card-thumbnail[data-card-uuid]').forEach(thumbnail => {
      thumbnail.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardUuid = thumbnail.dataset.cardUuid;
        this.showImagePreview(cardUuid);
      });
    });
  },

  bindShareToggles() {
    document.querySelectorAll('.share-toggle').forEach(toggle => {
      const switchEl = toggle.nextElementSibling; // .toggle-switch
      const slider = switchEl?.querySelector('.toggle-slider');

      // 初始化樣式
      if (toggle.checked) {
        if (switchEl) switchEl.style.backgroundColor = '#3b82f6'; // blue-600
        if (slider) slider.style.transform = 'translateX(20px)';
      }

      toggle.addEventListener('change', async (e) => {
        const uuid = e.target.dataset.cardUuid;
        const isShared = e.target.checked;

        // 立即更新 UI
        if (isShared) {
          if (switchEl) switchEl.style.backgroundColor = '#3b82f6';
          if (slider) slider.style.transform = 'translateX(20px)';
        } else {
          if (switchEl) switchEl.style.backgroundColor = '#d1d5db';
          if (slider) slider.style.transform = 'translateX(0)';
        }

        try {
          if (isShared) {
            await this.shareCard(uuid);
          } else {
            await this.unshareCard(uuid);
          }
        } catch (error) {
          // Revert toggle and styles on error
          e.target.checked = !isShared;
          if (!isShared) {
            if (switchEl) switchEl.style.backgroundColor = '#3b82f6';
            if (slider) slider.style.transform = 'translateX(20px)';
          } else {
            if (switchEl) switchEl.style.backgroundColor = '#d1d5db';
            if (slider) slider.style.transform = 'translateX(0)';
          }
          if (typeof showToast === 'function') {
            showToast(error.message, 'error');
          }
        }
      });
    });
  },

  showImagePreview(cardUuid) {
    // Create modal backdrop
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4';
    modal.style.cursor = 'zoom-out';
    
    // Create container
    const container = document.createElement('div');
    container.className = 'relative';
    container.onclick = (e) => e.stopPropagation();
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors';
    closeBtn.innerHTML = '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
    closeBtn.onclick = () => modal.remove();
    
    // Create image
    const img = document.createElement('img');
    img.src = `/api/user/received-cards/${cardUuid}/image`;
    img.className = 'max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl';
    img.style.cursor = 'default';
    
    container.appendChild(closeBtn);
    container.appendChild(img);
    modal.appendChild(container);
    
    // Click backdrop to close
    modal.onclick = () => modal.remove();
    
    // ESC key to close
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
    
    document.body.appendChild(modal);
  },

  renderCardHTML(card, keyword = '') {
    // Parse organization_alias if it's a JSON string
    let aliasDisplay = '';
    if (card.organization_alias) {
      try {
        const aliases = typeof card.organization_alias === 'string' && card.organization_alias.startsWith('[')
          ? JSON.parse(card.organization_alias)
          : card.organization_alias;
        aliasDisplay = Array.isArray(aliases) ? aliases.join(', ') : aliases;
      } catch {
        aliasDisplay = card.organization_alias;
      }
    }

    return `
      <div class="received-card glass-panel p-6 rounded-[2rem] space-y-4"
           data-card-id="${card.uuid}"
           data-card-name="${this.escapeHTML(card.full_name)}"
           data-card-org="${this.escapeHTML(card.organization || '')}">
        <div class="flex items-start gap-4">
          ${this.renderCardThumbnail(card)}
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-black text-slate-900 truncate tracking-tight">${this.highlightText(card.full_name, keyword)}</h3>
            ${card.organization ? `<p class="text-sm font-bold text-slate-600 truncate">${this.highlightText(card.organization, keyword)}</p>` : ''}
            ${card.organization_en ? `<p class="text-xs text-slate-500 truncate">${this.escapeHTML(card.organization_en)}</p>` : ''}
            ${aliasDisplay ? `<p class="text-xs text-slate-400 truncate italic">(${this.escapeHTML(aliasDisplay)})</p>` : ''}
            ${card.title ? `<p class="text-xs text-slate-500 truncate uppercase tracking-wider">${this.highlightText(card.title, keyword)}</p>` : ''}
          </div>
        </div>
        ${card.phone || card.email || card.website ? `
        <div class="space-y-2 text-sm text-slate-700">
          ${card.phone ? `<div class="flex items-center gap-2"><i data-lucide="phone" class="w-4 h-4 flex-shrink-0" style="color: var(--moda-accent);"></i><span class="truncate">${this.escapeHTML(card.phone)}</span></div>` : ''}
          ${card.email ? `<div class="flex items-center gap-2"><i data-lucide="mail" class="w-4 h-4 flex-shrink-0" style="color: var(--moda-accent);"></i><span class="truncate">${this.highlightText(card.email, keyword)}</span></div>` : ''}
          ${card.website ? `<div class="flex items-center gap-2"><i data-lucide="globe" class="w-4 h-4 flex-shrink-0" style="color: var(--moda-accent);"></i><span class="truncate">${this.escapeHTML(card.website)}</span></div>` : ''}
        </div>
        ` : ''}
        ${card.note ? `<p class="text-xs text-slate-500 italic truncate px-3 py-2 rounded-xl border border-white/20" style="background: rgba(255, 255, 255, 0.4);">${this.escapeHTML(card.note)}</p>` : ''}
        <div class="pt-4 mt-4 border-t border-white/30 flex items-center justify-between gap-3">
          ${card.source === 'own' ? `
          <label class="inline-flex items-center cursor-pointer">
            <input type="checkbox"
                   class="share-toggle"
                   data-card-uuid="${card.uuid}"
                   ${card.is_shared ? 'checked' : ''}
                   style="display: none;">
            <div class="toggle-switch" style="position: relative; width: 44px; height: 24px; background-color: ${card.is_shared ? '#3b82f6' : '#d1d5db'}; border-radius: 9999px; transition: background-color 0.3s;">
              <div class="toggle-slider" style="position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background-color: white; border-radius: 50%; transition: transform 0.3s; ${card.is_shared ? 'transform: translateX(20px);' : ''}"></div>
            </div>
            <span class="ms-3 text-sm font-medium text-gray-900" data-i18n="share-with-users">分享給其他使用者</span>
          </label>
          ` : `
          <span class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold" style="background-color: #dbeafe; color: #1e40af;">
            分享者: ${this.escapeHTML(card.shared_by || '')}
          </span>
          `}
        </div>
        <div class="grid grid-cols-${card.source === 'own' ? '3' : '2'} gap-2">
          <button onclick="ReceivedCards.viewCard('${card.uuid}')" class="card-action-btn py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2" style="background: var(--moda-accent); color: white;">
            <i data-lucide="info" class="w-4 h-4"></i>
            <span data-i18n="view-card">查看</span>
          </button>
          ${card.source === 'own' ? `<button onclick="ReceivedCards.openEditModal('${card.uuid}')" class="card-action-btn py-3 px-3 rounded-xl font-black transition-all flex items-center justify-center" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;" title="編輯名片">
            <i data-lucide="edit" class="w-5 h-5"></i>
          </button>` : ''}
          <button onclick="ReceivedCards.exportVCard('${card.uuid}')" class="card-action-btn py-3 px-3 rounded-xl font-black transition-all flex items-center justify-center" style="background: rgba(16, 185, 129, 0.15); color: #10b981;" title="匯出 vCard">
            <i data-lucide="download" class="w-5 h-5"></i>
          </button>
        </div>
        ${card.source === 'own' ? `<button onclick="ReceivedCards.deleteCardFromElement(this)" class="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
          <span data-i18n="delete-card">刪除名片</span>
        </button>` : ''}
      </div>
    `;
  },
  
  deleteCardFromElement(buttonElement) {
    const cardElement = buttonElement.closest('[data-card-id]');
    const uuid = cardElement.dataset.cardId;
    const fullName = cardElement.dataset.cardName;
    const organization = cardElement.dataset.cardOrg;
    
    this.deleteCard(uuid, fullName, organization);
  },
  
  viewCard(uuid) {
    this.openCardDetail(uuid);
  },
  
  async exportVCard(uuid) {
    try {
      // 1. 呼叫 vCard API
      const response = await fetch(`/api/user/received-cards/${uuid}/vcard`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to export vCard');
      }

      // 2. 取得檔案內容
      const blob = await response.blob();

      // 3. 取得檔名（從 Content-Disposition header，處理 UTF-8 編碼）
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'contact.vcf';

      if (contentDisposition) {
        // 嘗試解析 filename*=UTF-8''encoded_name 格式
        const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        if (filenameStarMatch) {
          filename = decodeURIComponent(filenameStarMatch[1]);
        } else {
          // 回退到 filename="name" 格式
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
      }

      // 4. 設備檢測與平台特定處理
      const userAgent = navigator.userAgent || '';
      const isIOS = /(iPhone|iPad|iPod)/i.test(userAgent);
      const isAndroid = /Android/i.test(userAgent);

      // iOS: 使用 data URI 打開系統通訊錄
      if (isIOS) {
        const vcardText = await blob.text();
        const dataUri = 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vcardText);
        window.open(dataUri, '_blank');
        showToast('請選擇「加入聯絡資訊」', 'success');
        return;
      }

      // Android: 嘗試 Contact Picker API，失敗則降級為下載
      if (isAndroid) {
        // 檢查 Contact Picker API 支援
        const hasContactsAPI = 'contacts' in navigator && 'ContactsManager' in window;

        if (hasContactsAPI) {
          try {
            // 注意：Contact Picker API 僅支援讀取，不支援寫入
            // 因此 Android 仍然使用下載方式，但保留 API 檢測邏輯以備未來擴展
            throw new Error('Contact Picker API does not support writing contacts');
          } catch {
            // 降級為下載
          }
        }

        // Android 下載流程（與 Desktop 相同）
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('vCard 已下載', 'success');
        return;
      }

      // Desktop: 原有下載行為
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('vCard 已下載', 'success');
    } catch (_error) {
      showToast('匯出失敗', 'error');
    }
  },

  async shareCard(uuid) {
    const csrfToken = sessionStorage.getItem('csrfToken');

    const response = await fetch(`${API_BASE}/api/user/received-cards/${uuid}/share`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(csrfToken && { 'X-CSRF-Token': csrfToken })
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to share card');
    }

    if (typeof showToast === 'function') {
      showToast('已分享給其他使用者', 'success');
    }
  },

  async unshareCard(uuid) {
    const csrfToken = sessionStorage.getItem('csrfToken');

    const response = await fetch(`${API_BASE}/api/user/received-cards/${uuid}/share`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        ...(csrfToken && { 'X-CSRF-Token': csrfToken })
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to unshare card');
    }

    if (typeof showToast === 'function') {
      showToast('已取消分享', 'success');
    }
  },

  async showQRCode(uuid) {
    try {
      // 檢查 QRCode 函式庫是否載入
      if (typeof QRCode === 'undefined') {
        showToast('QR Code 功能載入中，請稍後再試', 'error');
        return;
      }

      // 1. 取得 vCard 資料
      const response = await fetch(`/api/user/received-cards/${uuid}/vcard`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to get vCard');
      }

      const vCardText = await response.text();

      // 2. 清空容器
      const qrCodeContainer = document.getElementById('qrCodeContainer');
      if (!qrCodeContainer) {
        throw new Error('QR Code container not found');
      }
      qrCodeContainer.innerHTML = '';

      // 3. 生成 QR Code
      new QRCode(qrCodeContainer, {
        text: vCardText,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });

      // 4. 顯示 Modal
      const modal = document.getElementById('qrCodeModal');
      if (modal) {
        modal.classList.remove('hidden');
      }

      // 5. 初始化 icons
      if (window.lucide) {
        window.lucide.createIcons();
      }

    } catch (error) {
      showToast('生成 QR Code 失敗：' + error.message, 'error');
    }
  },

  downloadQRCode() {
    try {
      // 1. 取得 QR Code canvas
      const canvas = document.querySelector('#qrCodeContainer canvas');
      if (!canvas) {
        throw new Error('QR Code not found');
      }

      // 2. 轉換為 PNG
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create blob');
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qrcode.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof showToast === 'function') {
          showToast('QR Code 已下載', 'success');
        }
      });
    } catch (_error) {
      if (typeof showToast === 'function') {
        showToast('下載失敗', 'error');
      }
    }
  },

  closeQRCodeModal() {
    const modal = document.getElementById('qrCodeModal');
    if (modal) {
      modal.classList.add('hidden');
    }

    // 清空 QR Code
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    if (qrCodeContainer) {
      qrCodeContainer.innerHTML = '';
    }
  },

  // Card Detail Modal
  async openCardDetail(uuid) {
    try {
      // 從已載入的 cards 陣列中找到卡片
      const card = this.cards.find(c => c.uuid === uuid);
      if (!card) {
        showToast('找不到名片', 'error');
        return;
      }

      // 解析 AI sources JSON
      if (card.ai_sources_json && typeof card.ai_sources_json === 'string') {
        try {
          card.sources = JSON.parse(card.ai_sources_json);
        } catch (_e) {
          // Silently fallback to empty array
          card.sources = [];
        }
      } else {
        card.sources = [];
      }

      // 渲染基本資訊（含稱謂和後綴）
      let fullName = card.full_name || '';
      if (card.name_prefix) fullName = card.name_prefix + ' ' + fullName;
      if (card.name_suffix) fullName = fullName + ', ' + card.name_suffix;
      document.getElementById('detail-name').textContent = fullName;
      
      // Parse organization_alias
      let aliasDisplay = '';
      if (card.organization_alias) {
        try {
          const aliases = typeof card.organization_alias === 'string' && card.organization_alias.startsWith('[')
            ? JSON.parse(card.organization_alias)
            : card.organization_alias;
          aliasDisplay = Array.isArray(aliases) ? aliases.join(', ') : aliases;
        } catch {
          aliasDisplay = card.organization_alias;
        }
      }
      
      // 公司和部門並存顯示（含雙語和別名）
      let orgParts = [];
      if (card.organization) orgParts.push(card.organization);
      if (card.organization_en) orgParts.push(`(${card.organization_en})`);
      if (aliasDisplay) orgParts.push(`(${aliasDisplay})`);
      if (card.department) orgParts.push(`- ${card.department}`);
      document.getElementById('detail-org').textContent = orgParts.join(' ');

      // 渲染可選欄位
      this.renderDetailField('title', card.title);
      this.renderDetailField('phone', card.phone);
      this.renderDetailField('email', card.email);
      this.renderDetailField('website', card.website, true);
      this.renderDetailField('address', card.address);
      this.renderDetailField('note', card.note);
      
      // 渲染更新時間
      if (card.updated_at) {
        const updatedDate = new Date(parseInt(card.updated_at));
        const formatted = updatedDate.toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        this.renderDetailField('updated', `最後更新：${formatted}`);
      }

      // 渲染 AI 狀態（根據 sources 判斷）
      this.renderAIStatus(card);

      // 渲染公司摘要
      this.renderAISummaries(card);

      // 綁定按鈕事件
      const editBtn = document.getElementById('detail-edit-btn');
      const exportBtn = document.getElementById('detail-export-btn');
      
      if (editBtn) {
        editBtn.onclick = () => {
          this.closeCardDetailModal();
          this.openEditModal(uuid);
        };
      }
      
      if (exportBtn) {
        exportBtn.onclick = () => {
          this.exportVCard(uuid);
        };
      }

      // 顯示 Modal
      const modal = document.getElementById('cardDetailModal');
      if (modal) {
        modal.classList.remove('hidden');
      }

      // 初始化 Lucide icons
      if (window.lucide) {
        window.lucide.createIcons();
      }

    } catch (_error) {
      showToast('載入失敗', 'error');
    }
  },

  renderDetailField(fieldName, value, isLink = false) {
    const container = document.getElementById(`detail-${fieldName}-container`);
    const element = document.getElementById(`detail-${fieldName}`);

    if (!container || !element) {
      return;
    }

    if (value) {
      if (isLink) {
        element.href = value;
        element.textContent = value;
      } else {
        element.textContent = value;
      }
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
  },

  renderAIStatus(card) {
    const container = document.getElementById('ai-status-container');
    if (!container) return;

    // 清空容器
    container.innerHTML = '';

    // 直接根據 ai_status 判斷
    if (card.ai_status !== 'completed') return;

    // 創建 badge
    const badge = document.createElement('div');
    badge.style.cssText = 'display: inline-flex; align-items: center; padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 700; background-color: #d1fae5; color: #065f46;';

    const text = document.createElement('span');
    text.textContent = '已使用外部資訊補全';

    badge.appendChild(text);
    container.appendChild(badge);
  },

  renderAISummaries(card) {
    const aiContainer = document.getElementById('ai-summaries-container');
    const companySection = document.getElementById('company-summary-section');
    const companyText = document.getElementById('company-summary-text');
    const personalSection = document.getElementById('personal-summary-section');
    const personalText = document.getElementById('personal-summary-text');
    const sourcesContainer = document.getElementById('sources-container');
    const sourcesList = document.getElementById('sources-list');

    let hasAnySummary = false;

    // 顯示組織摘要
    if (card.company_summary && companySection && companyText) {
      companyText.textContent = card.company_summary;
      companySection.classList.remove('hidden');
      hasAnySummary = true;
    } else if (companySection) {
      companySection.classList.add('hidden');
    }

    // 顯示個人摘要
    if (card.personal_summary && personalSection && personalText) {
      personalText.textContent = card.personal_summary;
      personalSection.classList.remove('hidden');
      hasAnySummary = true;
    } else if (personalSection) {
      personalSection.classList.add('hidden');
    }

    // 顯示 AI 摘要容器
    if (aiContainer) {
      if (hasAnySummary) {
        aiContainer.classList.remove('hidden');
      } else {
        aiContainer.classList.add('hidden');
      }
    }

    // 顯示參考來源（如果有任何摘要）
    if (hasAnySummary && card.sources && card.sources.length > 0) {
      if (sourcesList) {
        sourcesList.innerHTML = '';

        card.sources.forEach(s => {
          // 驗證 URL scheme（只允許 https）
          let url = s.uri;
          try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'https:') {
              url = '#';
            }
          } catch {
            url = '#';
          }

          // 使用 createElement 避免 XSS
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = s.title;
          a.style.cssText = 'color: #2563eb; text-decoration: underline;';
          li.appendChild(a);
          sourcesList.appendChild(li);
        });
      }

      if (sourcesContainer) {
        sourcesContainer.classList.remove('hidden');
      }
    } else if (sourcesContainer) {
      sourcesContainer.classList.add('hidden');
    }
  },

  async enrichCardInfo(uuid) {
    try {
      // 顯示進度覆蓋層
      this.showEnrichProgress('🔍 步驟 1/3：搜尋公司資訊...', 33);

      // 取得卡片資料
      const card = this.cards.find(c => c.uuid === uuid);
      if (!card) {
        this.hideEnrichProgress();
        showToast('找不到名片', 'error');
        return;
      }

      // 呼叫 Enrich API
      const enrichResult = await ReceivedCardsAPI.call('/api/user/received-cards/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_uuid: uuid,
          organization: card.organization,
          full_name: card.full_name,
          title: card.title
        })
      });

      // 步驟 2: 驗證來源
      this.showEnrichProgress('✓ 步驟 2/3：驗證資料來源...', 66);
      
      // 處理 jsonResponse 包裝
      const enrichData = enrichResult.data || enrichResult;
      
      // 驗證 AI 來源：無來源則不採信
      if (!enrichData.sources || enrichData.sources.length === 0) {
        this.hideEnrichProgress();
        showToast('此名片無法補齊（AI 無法找到可靠來源）', 'error');
        return;
      }

      // 步驟 3: 回填資料
      this.showEnrichProgress('✓ 步驟 3/3：回填資料到表單...', 100);
      
      // 關閉詳情 Modal，開啟編輯 Modal
      this.closeCardDetailModal();
      this.openEditModal(uuid);
      
      // 等待 Modal 開啟和表單渲染
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 回填 AI 補齊的資料到編輯表單（只填空白欄位）
      const form = document.getElementById('editCardForm');
      if (!form) {
        this.hideEnrichProgress();
        return;
      }
      
      // 只回填空白欄位
      if (enrichData.organization_en && !form.elements.organization_en?.value) {
        form.elements.organization_en.value = enrichData.organization_en;
      }
      if (enrichData.organization_alias && !form.elements.organization_alias?.value) {
        form.elements.organization_alias.value = enrichData.organization_alias;
      }
      if (enrichData.website && !form.elements.website?.value) {
        form.elements.website.value = enrichData.website;
      }
      if (enrichData.address && !form.elements.address?.value) {
        form.elements.address.value = enrichData.address;
      }
      
      // 儲存 AI 摘要到表單 dataset（供儲存時使用）
      if (enrichData.company_summary) {
        form.dataset.companySummary = enrichData.company_summary;
      }
      if (enrichData.sources) {
        form.dataset.aiSources = JSON.stringify(enrichData.sources);
      }
      form.dataset.aiStatus = 'completed';
      
      this.hideEnrichProgress();
      showToast('✓ AI 資訊已回填，請確認後儲存', 'success');

    } catch (_error) {
      this.hideEnrichProgress();
      showToast('補齊失敗，請稍後再試', 'error');
    }
  },
  
  showEnrichProgress(message, progress) {
    let overlay = document.getElementById('enrich-progress-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'enrich-progress-overlay';
      overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center;';
      overlay.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 1rem; max-width: 400px; width: 90%;">
          <div id="enrich-progress-message" style="font-size: 1rem; font-weight: bold; margin-bottom: 1rem; text-align: center;"></div>
          <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
            <div id="enrich-progress-bar" style="background: linear-gradient(90deg, #8b5cf6, #6366f1); height: 100%; transition: width 0.3s;"></div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    
    const messageEl = document.getElementById('enrich-progress-message');
    const barEl = document.getElementById('enrich-progress-bar');
    if (messageEl) messageEl.textContent = message;
    if (barEl) barEl.style.width = progress + '%';
    overlay.classList.remove('hidden');
  },
  
  hideEnrichProgress() {
    const overlay = document.getElementById('enrich-progress-overlay');
    if (overlay) {
      overlay.remove();
    }
  },

  closeCardDetailModal() {
    const modal = document.getElementById('cardDetailModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  },

  bindCardDetailModalEvents() {
    // 關閉按鈕
    const closeBtn = document.getElementById('closeCardDetail');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeCardDetailModal());
    }

    // 點擊背景關閉
    const modal = document.getElementById('cardDetailModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target.id === 'cardDetailModal') {
          this.closeCardDetailModal();
        }
      });
    }

    // ESC 鍵關閉
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('cardDetailModal');
        if (modal && !modal.classList.contains('hidden')) {
          this.closeCardDetailModal();
        }
      }
    });
  },
  
  async deleteCard(uuid, fullName, organization) {
    const confirmed = await this.showDeleteConfirmModal(uuid, fullName, organization);
    if (!confirmed) return;
    
    const cardElement = document.querySelector(`[data-card-id="${uuid}"]`);
    const cardHTML = cardElement ? cardElement.outerHTML : '';
    
    if (cardElement) {
      cardElement.remove();
    }
    
    try {
      await ReceivedCardsAPI.deleteCard(uuid);
      
      if (typeof showToast === 'function') {
        showToast('名片已刪除', 'success');
      }
    } catch (error) {
      const grid = document.getElementById('cards-grid');
      grid.insertAdjacentHTML('beforeend', cardHTML);
      
      if (typeof showToast === 'function') {
        showToast(`刪除失敗：${error.message}`, 'error');
      }
      
      if (typeof window.initIcons === 'function') {
        window.initIcons();
      }
    }
  },
  
  async showDeleteConfirmModal(uuid, fullName, organization) {
    return new Promise((resolve) => {
      const modal = document.getElementById('delete-confirm-modal');
      const cardInfo = document.getElementById('delete-card-info');
      const cancelBtn = document.getElementById('delete-cancel-btn');
      const confirmBtn = document.getElementById('delete-confirm-btn');
      
      cardInfo.textContent = `${fullName}${organization ? ' - ' + organization : ''}`;
      
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
      
      modal.classList.remove('hidden');
    });
  },
  
  escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // ==================== Edit Card Functions ====================

  openEditModal(cardUuid) {
    const card = this.allCards.find(c => c.uuid === cardUuid);
    if (!card) {
      return;
    }

    const form = document.getElementById('editCardForm');
    if (!form) {
      return;
    }

    // Parse organization_alias for editing
    let aliasValue = '';
    if (card.organization_alias) {
      try {
        const aliases = typeof card.organization_alias === 'string' && card.organization_alias.startsWith('[')
          ? JSON.parse(card.organization_alias)
          : card.organization_alias;
        aliasValue = Array.isArray(aliases) ? aliases.join(', ') : aliases;
      } catch {
        aliasValue = card.organization_alias;
      }
    }

    // 填充表單
    form.elements.name_prefix.value = card.name_prefix || '';
    form.elements.name.value = card.full_name || '';
    form.elements.name_suffix.value = card.name_suffix || '';
    form.elements.organization.value = card.organization || '';
    form.elements.organization_en.value = card.organization_en || '';
    form.elements.organization_alias.value = aliasValue;
    form.elements.department.value = card.department || '';
    form.elements.title.value = card.title || '';
    form.elements.email.value = card.email || '';
    form.elements.phone.value = card.phone || '';
    form.elements.website.value = card.website || '';
    form.elements.address.value = card.address || '';
    form.elements.notes.value = card.note || '';

    // 儲存 card_uuid
    form.dataset.cardUuid = cardUuid;
    
    // 清除之前的 AI 資料
    delete form.dataset.companySummary;
    delete form.dataset.aiSources;
    delete form.dataset.aiStatus;

    // 顯示 Modal
    const modal = document.getElementById('editCardModal');
    if (modal) {
      modal.classList.remove('hidden');

      // Re-init icons after modal is visible
      if (typeof window.initIcons === 'function') {
        window.initIcons();
      }
    }
  },

  closeEditModal() {
    const modal = document.getElementById('editCardModal');
    if (modal) {
      modal.classList.add('hidden');
    }

    // 重置表單
    const form = document.getElementById('editCardForm');
    if (form) {
      form.reset();
      delete form.dataset.cardUuid;
    }
  },

  validateEditForm(formData) {
    const errors = [];

    // 姓名必填
    if (!formData.name.trim()) {
      errors.push('姓名為必填欄位');
    }

    // Email 格式驗證
    if (formData.email && !this.isValidEmail(formData.email)) {
      errors.push('Email 格式不正確');
    }

    // 網站格式驗證
    if (formData.website && !this.isValidURL(formData.website)) {
      errors.push('網站格式不正確');
    }

    return errors;
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  async handleEditFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const cardUuid = form.dataset.cardUuid;

    if (!cardUuid) {
      return;
    }

    // 收集表單資料
    const formData = {
      name_prefix: form.elements.name_prefix.value.trim(),
      name: form.elements.name.value.trim(),
      name_suffix: form.elements.name_suffix.value.trim(),
      organization: form.elements.organization.value.trim(),
      organization_en: form.elements.organization_en?.value.trim() || '',
      organization_alias: form.elements.organization_alias?.value.trim() || '',
      department: form.elements.department.value.trim(),
      title: form.elements.title.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      website: form.elements.website.value.trim(),
      address: form.elements.address.value.trim(),
      notes: form.elements.notes.value.trim()
    };

    // 驗證
    const errors = this.validateEditForm(formData);
    if (errors.length > 0) {
      if (typeof showToast === 'function') {
        showToast(errors.join('\n'), 'error');
      }
      return;
    }

    try {
      // 準備更新資料
      const updateData = {
        name_prefix: formData.name_prefix,
        full_name: formData.name,
        name_suffix: formData.name_suffix,
        organization: formData.organization,
        organization_en: formData.organization_en,
        organization_alias: formData.organization_alias,
        department: formData.department,
        title: formData.title,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        address: formData.address,
        note: formData.notes
      };
      
      // 如果有 AI 補齊的資料，一併更新
      if (form.dataset.companySummary) {
        updateData.company_summary = form.dataset.companySummary;
      }
      if (form.dataset.aiSources) {
        updateData.ai_sources_json = form.dataset.aiSources;
      }
      if (form.dataset.aiStatus) {
        updateData.ai_status = form.dataset.aiStatus;
      }
      
      // 更新名片（使用 PATCH 支援 AI 欄位）
      await ReceivedCardsAPI.call(`/api/user/received-cards/${cardUuid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      // 關閉 Modal
      this.closeEditModal();

      // 重新載入名片列表
      await this.loadCards();

      if (typeof showToast === 'function') {
        showToast('名片已更新', 'success');
      }
    } catch (_error) {
      if (typeof showToast === 'function') {
        showToast('更新失敗，請稍後再試', 'error');
      }
    }
  },

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

// eslint-disable-next-line no-unused-vars -- Called from HTML onclick
function showReceivedCards() {
  ReceivedCards.show();
}

// eslint-disable-next-line no-unused-vars -- Called from HTML onclick
function backToSelection() {
  ReceivedCards.hide();
}

// ==================== Batch Upload Module ====================
const BatchUpload = {
  currentBatchId: null,
  progressInterval: null,

  init() {
    this.bindBatchEvents();
  },

  bindBatchEvents() {
    const dropZone = document.getElementById('batch-drop-zone');
    const fileInput = document.getElementById('batch-file-input');
    const cancelBtn = document.getElementById('cancel-batch-upload');

    if (!dropZone || !fileInput) return;

    // Click to select files
    dropZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        this.handleBatchUpload(files);
      }
      // Reset file input
      e.target.value = '';
    });

    // Drag & Drop events
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '#3b82f6';
      dropZone.style.backgroundColor = '#eff6ff';
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '';
      dropZone.style.backgroundColor = '';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '';
      dropZone.style.backgroundColor = '';

      const files = Array.from(e.dataTransfer.files);
      this.handleBatchUpload(files);
    });

    // Cancel upload
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelUpload());
    }
  },

  validateFiles(files) {
    const MAX_FILES = 20;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    // Check file count
    if (files.length > MAX_FILES) {
      if (typeof showToast === 'function') {
        showToast(`最多只能上傳 ${MAX_FILES} 張圖片`, 'error');
      }
      return false;
    }

    // Check each file
    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        if (typeof showToast === 'function') {
          showToast(`檔案 ${file.name} 超過 10MB 限制`, 'error');
        }
        return false;
      }

      // Check file type
      if (!VALID_TYPES.includes(file.type)) {
        if (typeof showToast === 'function') {
          showToast(`檔案 ${file.name} 不是有效的圖片格式`, 'error');
        }
        return false;
      }
    }

    return true;
  },

  async handleBatchUpload(files) {
    try {
      // Validate files
      if (!this.validateFiles(files)) {
        return;
      }

      // Show progress UI
      this.showProgressUI();

      // Create FormData
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      // Upload
      const response = await ReceivedCardsAPI.call('/api/user/received-cards/batch-upload', {
        method: 'POST',
        body: formData
      });

      const data = response.data || response;
      this.currentBatchId = data.batch_id;

      // Start progress polling
      this.startProgressPolling();

    } catch (error) {
      if (typeof showToast === 'function') {
        showToast(`上傳失敗：${error.message}`, 'error');
      }
      this.hideProgressUI();
    }
  },

  showProgressUI() {
    const dropZone = document.getElementById('batch-drop-zone');
    const progressContainer = document.getElementById('batch-progress-container');

    if (dropZone) dropZone.classList.add('hidden');
    if (progressContainer) progressContainer.classList.remove('hidden');
  },

  hideProgressUI() {
    const dropZone = document.getElementById('batch-drop-zone');
    const progressContainer = document.getElementById('batch-progress-container');

    if (dropZone) dropZone.classList.remove('hidden');
    if (progressContainer) progressContainer.classList.add('hidden');

    // Reset progress
    this.updateProgress({ total: 0, completed: 0, failed: 0, results: [] });
  },

  startProgressPolling() {
    // Clear existing interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    // Poll every 2 seconds
    this.progressInterval = setInterval(async () => {
      try {
        const response = await ReceivedCardsAPI.call(
          `/api/user/received-cards/batch/${this.currentBatchId}`
        );
        const data = response.data || response;

        this.updateProgress(data);

        // Check if complete
        const { total, completed, failed } = data;
        if (completed + failed >= total) {
          this.onBatchComplete(data);
        }
      } catch (_error) {
        this.cancelUpload();
        if (typeof showToast === 'function') {
          showToast('無法取得上傳進度', 'error');
        }
      }
    }, 2000);
  },

  updateProgress(data) {
    const { total, completed, failed, results } = data;
    const percentage = total > 0 ? Math.round((completed + failed) / total * 100) : 0;

    // Update progress bar
    const progressBar = document.getElementById('batch-progress-bar');
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }

    // Update progress text
    const progressText = document.getElementById('batch-progress-text');
    if (progressText) {
      progressText.textContent = `${completed + failed} / ${total}`;
    }

    // Update status list
    const statusList = document.getElementById('batch-status-list');
    if (statusList && results) {
      statusList.innerHTML = results.map(result => {
        const statusColor = this.getStatusColor(result.status);
        const statusText = this.getStatusText(result.status);

        return `
          <div class="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
            <span class="text-sm font-bold text-slate-700 truncate flex-1">${this.escapeHTML(result.filename)}</span>
            <span class="text-xs font-bold ${statusColor} ml-3">${statusText}</span>
          </div>
        `;
      }).join('');
    }
  },

  getStatusColor(status) {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'processing': return 'text-blue-600';
      default: return 'text-slate-400';
    }
  },

  getStatusText(status) {
    switch (status) {
      case 'completed': return '✓ 完成';
      case 'failed': return '✗ 失敗';
      case 'processing': return '⏳ 處理中';
      default: return '等待中';
    }
  },

  onBatchComplete(data) {
    const { completed, failed } = data;

    // Stop polling
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    // Show completion message
    if (failed === 0) {
      if (typeof showToast === 'function') {
        showToast(`成功上傳 ${completed} 張名片！`, 'success');
      }
    } else {
      if (typeof showToast === 'function') {
        showToast(`上傳完成：${completed} 成功，${failed} 失敗`, 'warning');
      }
    }

    // Reload cards
    ReceivedCards.loadCards();

    // Reset UI after 3 seconds
    setTimeout(() => {
      this.hideProgressUI();
      this.currentBatchId = null;
    }, 3000);
  },

  cancelUpload() {
    // Stop polling
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    // Reset UI
    this.hideProgressUI();
    this.currentBatchId = null;

    if (typeof showToast === 'function') {
      showToast('已取消上傳', 'info');
    }
  },

  escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// Initialize batch upload when ReceivedCards is shown
const originalReceivedCardsShow = ReceivedCards.show;
ReceivedCards.show = function() {
  originalReceivedCardsShow.call(this);
  BatchUpload.init();
};
