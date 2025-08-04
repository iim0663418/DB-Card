/**
 * 重複處理對話框 - UI-01
 * 匯入時重複名片處理 UI，支援跳過/覆蓋/新版本選項與批量處理
 */

class DuplicateDialog {
  constructor() {
    this.dialog = null;
    this.currentData = null;
    this.batchMode = false;
    this.batchResults = [];
    this.onResolve = null;
    this.onReject = null;
  }

  /**
   * 顯示重複處理對話框
   * @param {Object} duplicateInfo - 重複檢測資訊
   * @param {Object} cardData - 新名片資料
   * @param {boolean} isBatch - 是否為批量模式
   * @returns {Promise<Object>} - 使用者選擇結果
   */
  async show(duplicateInfo, cardData, isBatch = false) {
    return new Promise((resolve, reject) => {
      this.onResolve = resolve;
      this.onReject = reject;
      this.currentData = { duplicateInfo, cardData };
      this.batchMode = isBatch;
      
      this.createDialog();
      this.renderContent();
      this.setupEventListeners();
      this.showDialog();
    });
  }

  /**
   * 創建對話框元素
   */
  createDialog() {
    // 移除現有對話框
    if (this.dialog) {
      this.dialog.remove();
    }

    this.dialog = document.createElement('div');
    this.dialog.className = 'duplicate-dialog-overlay';
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-modal', 'true');
    this.dialog.setAttribute('aria-labelledby', 'duplicate-dialog-title');
    
    document.body.appendChild(this.dialog);
  }

  /**
   * 渲染對話框內容
   */
  renderContent() {
    const { duplicateInfo, cardData } = this.currentData;
    const existingCard = duplicateInfo.existingCards[0] || {};
    
    this.dialog.innerHTML = `
      <div class="duplicate-dialog-container">
        <div class="duplicate-dialog-header">
          <h2 id="duplicate-dialog-title">發現重複名片</h2>
          <button class="duplicate-dialog-close" aria-label="關閉對話框" tabindex="0">×</button>
        </div>
        
        <div class="duplicate-dialog-content">
          <div class="duplicate-info">
            <p>檢測到 <strong>${duplicateInfo.duplicateCount}</strong> 張相似名片</p>
            ${this.batchMode ? '<p class="batch-indicator">批量處理模式</p>' : ''}
          </div>
          
          <div class="card-comparison">
            <div class="card-preview existing">
              <h3>現有名片</h3>
              <div class="card-details">
                <div class="name">${this.escapeHtml(existingCard.name || '未知')}</div>
                <div class="meta">建立時間: ${this.formatDate(existingCard.created)}</div>
                <div class="meta">版本: ${existingCard.version || '1.0'}</div>
              </div>
            </div>
            
            <div class="card-preview new">
              <h3>新名片</h3>
              <div class="card-details">
                <div class="name">${this.escapeHtml(this.extractDisplayName(cardData))}</div>
                <div class="meta">即將匯入</div>
              </div>
            </div>
          </div>
          
          <div class="action-options">
            <div class="option-group">
              <button class="action-btn skip" data-action="skip" tabindex="0">
                <span class="icon">⏭️</span>
                <span class="text">跳過</span>
                <span class="desc">保留現有名片，不匯入新名片</span>
              </button>
              
              <button class="action-btn overwrite" data-action="overwrite" tabindex="0">
                <span class="icon">🔄</span>
                <span class="text">覆蓋</span>
                <span class="desc">用新名片資料覆蓋現有名片</span>
              </button>
              
              <button class="action-btn version" data-action="version" tabindex="0">
                <span class="icon">📋</span>
                <span class="text">新版本</span>
                <span class="desc">建立新版本，保留兩張名片</span>
              </button>
            </div>
            
            ${this.batchMode ? this.renderBatchOptions() : ''}
          </div>
        </div>
        
        <div class="duplicate-dialog-footer">
          <button class="btn-secondary cancel" tabindex="0">取消</button>
          ${this.batchMode ? '<button class="btn-primary apply-all" tabindex="0">套用到全部</button>' : ''}
        </div>
      </div>
    `;
  }

  /**
   * 渲染批量處理選項
   */
  renderBatchOptions() {
    return `
      <div class="batch-options">
        <label class="checkbox-label">
          <input type="checkbox" id="apply-to-all" />
          <span>將此選擇套用到所有重複項目</span>
        </label>
      </div>
    `;
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    // 關閉按鈕
    const closeBtn = this.dialog.querySelector('.duplicate-dialog-close');
    closeBtn.addEventListener('click', () => this.handleCancel());

    // 取消按鈕
    const cancelBtn = this.dialog.querySelector('.cancel');
    cancelBtn.addEventListener('click', () => this.handleCancel());

    // 動作按鈕
    const actionBtns = this.dialog.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleAction(e));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleAction(e);
        }
      });
    });

    // 批量套用按鈕
    if (this.batchMode) {
      const applyAllBtn = this.dialog.querySelector('.apply-all');
      if (applyAllBtn) {
        applyAllBtn.addEventListener('click', () => this.handleApplyAll());
      }
    }

    // ESC 鍵關閉
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    // 點擊遮罩關閉
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) {
        this.handleCancel();
      }
    });
  }

  /**
   * 處理鍵盤事件
   */
  handleKeydown(e) {
    if (e.key === 'Escape') {
      this.handleCancel();
    }
  }

  /**
   * 處理動作選擇
   */
  handleAction(e) {
    const action = e.currentTarget.dataset.action;
    const applyToAll = this.batchMode && this.dialog.querySelector('#apply-to-all')?.checked;
    
    const result = {
      action,
      cardId: this.currentData.duplicateInfo.existingCards[0]?.id,
      applyToAll,
      timestamp: Date.now()
    };

    this.resolveDialog(result);
  }

  /**
   * 處理套用到全部
   */
  handleApplyAll() {
    const selectedAction = this.dialog.querySelector('.action-btn.selected');
    if (!selectedAction) {
      this.showError('請先選擇一個處理方式');
      return;
    }

    const action = selectedAction.dataset.action;
    const result = {
      action,
      applyToAll: true,
      timestamp: Date.now()
    };

    this.resolveDialog(result);
  }

  /**
   * 處理取消
   */
  handleCancel() {
    this.resolveDialog({ action: 'cancel' });
  }

  /**
   * 解析對話框
   */
  resolveDialog(result) {
    this.hideDialog();
    if (this.onResolve) {
      this.onResolve(result);
    }
  }

  /**
   * 顯示對話框
   */
  showDialog() {
    this.dialog.style.display = 'flex';
    
    // 聚焦到第一個可聚焦元素
    setTimeout(() => {
      const firstFocusable = this.dialog.querySelector('button, input, [tabindex="0"]');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 100);
  }

  /**
   * 隱藏對話框
   */
  hideDialog() {
    if (this.dialog) {
      this.dialog.style.display = 'none';
      document.removeEventListener('keydown', this.handleKeydown.bind(this));
    }
  }

  /**
   * 銷毀對話框
   */
  destroy() {
    this.hideDialog();
    if (this.dialog) {
      this.dialog.remove();
      this.dialog = null;
    }
    this.currentData = null;
    this.onResolve = null;
    this.onReject = null;
  }

  /**
   * 顯示錯誤訊息
   */
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'duplicate-dialog-error';
    errorDiv.textContent = message;
    
    const content = this.dialog.querySelector('.duplicate-dialog-content');
    content.insertBefore(errorDiv, content.firstChild);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }

  /**
   * 提取顯示名稱
   */
  extractDisplayName(cardData) {
    if (!cardData.name) return '未知';
    
    if (typeof cardData.name === 'string') {
      return cardData.name.includes('~') ? cardData.name.split('~')[0] : cardData.name;
    }
    
    if (typeof cardData.name === 'object' && cardData.name.zh) {
      return cardData.name.zh;
    }
    
    return String(cardData.name);
  }

  /**
   * 格式化日期
   */
  formatDate(dateString) {
    if (!dateString) return '未知';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '未知';
    }
  }

  /**
   * HTML 轉義
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 批量處理多個重複項目
   * @param {Array} duplicateItems - 重複項目陣列
   * @returns {Promise<Array>} - 處理結果陣列
   */
  async processBatch(duplicateItems) {
    const results = [];
    let globalAction = null;
    let applyToAll = false;

    for (let i = 0; i < duplicateItems.length; i++) {
      const item = duplicateItems[i];
      
      if (applyToAll && globalAction) {
        // 使用全域動作
        results.push({
          index: i,
          action: globalAction,
          cardId: item.duplicateInfo.existingCards[0]?.id,
          auto: true
        });
        continue;
      }

      try {
        const result = await this.show(item.duplicateInfo, item.cardData, true);
        
        if (result.action === 'cancel') {
          break;
        }

        if (result.applyToAll) {
          globalAction = result.action;
          applyToAll = true;
        }

        results.push({
          index: i,
          ...result,
          auto: false
        });
      } catch (error) {
        results.push({
          index: i,
          action: 'error',
          error: error.message
        });
      }
    }

    return results;
  }
}

// CSS 樣式
const duplicateDialogStyles = `
.duplicate-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.duplicate-dialog-container {
  background: var(--pwa-surface, white);
  color: var(--pwa-text, #1a1a1a);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  font-family: var(--pwa-font-family, 'Noto Sans TC', sans-serif);
}

.duplicate-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.duplicate-dialog-header h2 {
  margin: 0;
  font-size: var(--senior-font-size-xl, 1.5rem);
  color: var(--pwa-text, #333);
  font-weight: var(--pwa-font-weight-bold, 600);
}

.duplicate-dialog-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  color: var(--pwa-text-secondary, #666);
  transition: var(--pwa-transition-duration, 0.3s) var(--pwa-transition-timing, ease);
}

.duplicate-dialog-close:hover {
  background: var(--pwa-border, #f5f5f5);
  color: var(--pwa-text, #333);
}

.duplicate-dialog-content {
  padding: 20px;
}

.duplicate-info {
  margin-bottom: var(--pwa-spacing-lg, 1.5rem);
  padding: var(--pwa-spacing-md, 1rem);
  background: var(--md-neutral-10, #f8f9fa);
  border-radius: 6px;
  border-left: 3px solid var(--pwa-primary, #6868ac);
}

.batch-indicator {
  color: var(--pwa-primary, #6868ac);
  font-weight: var(--pwa-font-weight-medium, 500);
  margin: var(--pwa-spacing-xs, 0.25rem) 0 0 0;
}

.card-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.card-preview {
  border: 1px solid var(--pwa-border, #ddd);
  border-radius: 6px;
  padding: var(--pwa-spacing-md, 1rem);
  background: var(--pwa-surface, white);
}

.card-preview h3 {
  margin: 0 0 var(--pwa-spacing-sm, 0.5rem) 0;
  font-size: var(--senior-font-size-lg, 1.25rem);
  color: var(--pwa-text-secondary, #666);
  font-weight: var(--pwa-font-weight-medium, 500);
}

.card-preview.existing {
  border-color: var(--md-primary-4, #ffc107);
  background: var(--md-primary-5, #fff8e1);
}

.card-preview.new {
  border-color: #28a745;
  background: #f8fff9;
}

.card-details .name {
  font-size: var(--senior-font-size-lg, 1.25rem);
  font-weight: var(--pwa-font-weight-bold, 600);
  margin-bottom: var(--pwa-spacing-sm, 0.5rem);
  color: var(--pwa-text, #333);
  line-height: var(--senior-line-height-tight, 1.4);
}

.card-details .meta {
  font-size: var(--senior-font-size-sm, 1rem);
  color: var(--pwa-text-secondary, #666);
  margin-bottom: var(--pwa-spacing-xs, 0.25rem);
}

.action-options {
  margin-bottom: 20px;
}

.option-group {
  display: grid;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  padding: var(--pwa-spacing-md, 1rem);
  border: 2px solid var(--pwa-border, #ddd);
  border-radius: 6px;
  background: var(--pwa-surface, white);
  color: var(--pwa-text, #333);
  cursor: pointer;
  transition: var(--pwa-transition-duration, 0.3s) var(--pwa-transition-timing, ease);
  text-align: left;
  font-family: var(--pwa-font-family, 'Noto Sans TC', sans-serif);
}

.action-btn:hover {
  border-color: var(--pwa-primary, #6868ac);
  background: var(--md-primary-5, #f8f9ff);
}

.action-btn:focus {
  outline: 2px solid var(--pwa-primary, #6868ac);
  outline-offset: 2px;
}

.action-btn .icon {
  font-size: 1.5em;
  margin-right: 12px;
}

.action-btn .text {
  font-weight: var(--pwa-font-weight-bold, 600);
  font-size: var(--senior-font-size-lg, 1.25rem);
  margin-bottom: var(--pwa-spacing-xs, 0.25rem);
  display: block;
  color: var(--pwa-text, #333);
}

.action-btn .desc {
  font-size: var(--senior-font-size-sm, 1rem);
  color: var(--pwa-text-secondary, #666);
  display: block;
  line-height: var(--senior-line-height-normal, 1.6);
}

.batch-options {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input {
  margin-right: 8px;
}

.duplicate-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #eee;
}

.btn-secondary, .btn-primary {
  padding: var(--pwa-spacing-sm, 0.5rem) var(--pwa-spacing-lg, 1.5rem);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: var(--senior-font-size-base, 1.125rem);
  font-family: var(--pwa-font-family, 'Noto Sans TC', sans-serif);
  font-weight: var(--pwa-font-weight-medium, 500);
  transition: var(--pwa-transition-duration, 0.3s) var(--pwa-transition-timing, ease);
}

.btn-secondary {
  background: var(--md-secondary-1, #6c757d);
  color: var(--pwa-text-inverse, white);
}

.btn-primary {
  background: var(--pwa-primary, #6868ac);
  color: var(--pwa-text-inverse, white);
}

.btn-secondary:hover {
  background: var(--md-secondary-2, #5a6268);
}

.btn-primary:hover {
  background: var(--md-primary-3, #4e4e81);
}

.duplicate-dialog-error {
  background: #f8d7da;
  color: #721c24;
  padding: var(--pwa-spacing-sm, 0.5rem);
  border-radius: 4px;
  margin-bottom: var(--pwa-spacing-md, 1rem);
  border-left: 3px solid #dc3545;
  font-family: var(--pwa-font-family, 'Noto Sans TC', sans-serif);
}

@media (max-width: 768px) {
  .card-comparison {
    grid-template-columns: 1fr;
  }
  
  .duplicate-dialog-container {
    width: 95%;
    margin: 10px;
  }
}
`;

// 注入樣式
if (typeof document !== 'undefined' && !document.getElementById('duplicate-dialog-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'duplicate-dialog-styles';
  styleSheet.textContent = duplicateDialogStyles;
  document.head.appendChild(styleSheet);
}

// 匯出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DuplicateDialog;
} else if (typeof window !== 'undefined') {
  window.DuplicateDialog = DuplicateDialog;
}