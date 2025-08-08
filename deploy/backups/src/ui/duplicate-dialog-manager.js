/**
 * 重複處理對話框管理器 - UI-01
 * 實作 CRS-V31-009: showDuplicateDialog() 與 DuplicateDialogManager 類別
 */

class DuplicateDialogManager {
  constructor() {
    this.currentDialog = null;
    this.currentLanguage = 'zh';
  }

  /**
   * 顯示重複處理對話框
   * @param {Object} duplicateInfo - 重複資訊
   * @param {Object} newCardData - 新名片資料
   * @returns {Promise<string>} - 使用者選擇的動作
   */
  async showDuplicateDialog(duplicateInfo, newCardData) {
    return new Promise((resolve, reject) => {
      try {
        // 移除現有對話框
        this.closeDuplicateDialog();
        
        const dialog = this.createDuplicateDialog(duplicateInfo, newCardData, resolve);
        document.body.appendChild(dialog);
        this.currentDialog = dialog;
        
        // 設置焦點和無障礙
        this.setupAccessibility(dialog);
        
        // 顯示動畫
        requestAnimationFrame(() => {
          dialog.classList.add('show');
        });
      } catch (error) {
        console.error('[DuplicateDialogManager] Show dialog failed:', error);
        reject(error);
      }
    });
  }

  /**
   * 創建重複處理對話框
   * @param {Object} duplicateInfo - 重複資訊
   * @param {Object} newCardData - 新名片資料
   * @param {Function} resolve - Promise resolve 函數
   * @returns {HTMLElement} - 對話框元素
   */
  createDuplicateDialog(duplicateInfo, newCardData, resolve) {
    const labels = this.getLabels();
    const existingCard = duplicateInfo.existingCards[0];
    
    const dialog = document.createElement('div');
    dialog.className = 'duplicate-dialog-overlay';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'duplicate-dialog-title');
    
    dialog.innerHTML = `
      <div class="duplicate-dialog">
        <div class="duplicate-dialog-header">
          <h2 id="duplicate-dialog-title" class="duplicate-dialog-title">
            ${labels.title}
          </h2>
          <button class="duplicate-dialog-close" aria-label="${labels.close}">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        
        <div class="duplicate-dialog-content">
          <div class="duplicate-info">
            <p class="duplicate-message">
              ${labels.message.replace('{count}', duplicateInfo.duplicateCount)}
            </p>
          </div>
          
          <div class="card-comparison">
            <div class="existing-card">
              <h3>${labels.existingCard}</h3>
              <div class="card-preview">
                ${this.renderCardPreview(existingCard.data, labels)}
              </div>
              <div class="card-meta">
                <small>${labels.lastModified}: ${this.formatDate(existingCard.modified)}</small>
              </div>
            </div>
            
            <div class="new-card">
              <h3>${labels.newCard}</h3>
              <div class="card-preview">
                ${this.renderCardPreview(newCardData, labels)}
              </div>
              <div class="card-meta">
                <small>${labels.source}: ${labels.import}</small>
              </div>
            </div>
          </div>
          
          <div class="action-options">
            <h3>${labels.chooseAction}</h3>
            <div class="option-buttons">
              <button class="option-btn skip-btn" data-action="skip">
                <div class="option-icon">⏭️</div>
                <div class="option-content">
                  <div class="option-title">${labels.skip}</div>
                  <div class="option-desc">${labels.skipDesc}</div>
                </div>
              </button>
              
              <button class="option-btn overwrite-btn" data-action="overwrite">
                <div class="option-icon">🔄</div>
                <div class="option-content">
                  <div class="option-title">${labels.overwrite}</div>
                  <div class="option-desc">${labels.overwriteDesc}</div>
                </div>
              </button>
              
              <button class="option-btn version-btn recommended" data-action="version">
                <div class="option-icon">📝</div>
                <div class="option-content">
                  <div class="option-title">${labels.version}</div>
                  <div class="option-desc">${labels.versionDesc}</div>
                  <div class="recommended-badge">${labels.recommended}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        <div class="duplicate-dialog-footer">
          <button class="btn btn-secondary cancel-btn">${labels.cancel}</button>
        </div>
      </div>
    `;
    
    // 設置事件監聽器
    this.setupDialogEvents(dialog, resolve);
    
    return dialog;
  }

  /**
   * 渲染名片預覽
   * @param {Object} cardData - 名片資料
   * @param {Object} labels - 標籤文字
   * @returns {string} - HTML 字串
   */
  renderCardPreview(cardData, labels) {
    const name = this.getDisplayValue(cardData.name);
    const title = this.getDisplayValue(cardData.title);
    const email = this.getDisplayValue(cardData.email);
    const phone = this.getDisplayValue(cardData.phone);
    
    return `
      <div class="card-info">
        ${cardData.avatar ? `<img src="${cardData.avatar}" alt="${labels.avatar}" class="card-avatar-small">` : ''}
        <div class="card-details">
          <div class="card-name">${name}</div>
          ${title ? `<div class="card-title">${title}</div>` : ''}
          ${email ? `<div class="card-email">${email}</div>` : ''}
          ${phone ? `<div class="card-phone">${phone}</div>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 獲取顯示值（處理雙語格式）
   * @param {string|Object} value - 原始值
   * @returns {string} - 顯示值
   */
  getDisplayValue(value) {
    if (!value) return '';
    
    if (typeof value === 'string') {
      if (value.includes('~')) {
        const [zh, en] = value.split('~');
        return this.currentLanguage === 'en' ? (en || zh) : zh;
      }
      return value;
    }
    
    if (typeof value === 'object' && value !== null) {
      return value[this.currentLanguage] || value.zh || value.en || String(value);
    }
    
    return String(value);
  }

  /**
   * 格式化日期
   * @param {Date|string} date - 日期
   * @returns {string} - 格式化後的日期
   */
  formatDate(date) {
    try {
      const d = new Date(date);
      return d.toLocaleString(this.currentLanguage === 'en' ? 'en-US' : 'zh-TW');
    } catch (error) {
      return String(date);
    }
  }

  /**
   * 設置對話框事件
   * @param {HTMLElement} dialog - 對話框元素
   * @param {Function} resolve - Promise resolve 函數
   */
  setupDialogEvents(dialog, resolve) {
    // 選項按鈕事件
    const optionButtons = dialog.querySelectorAll('.option-btn');
    optionButtons.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        this.closeDuplicateDialog();
        resolve(action);
      });
      
      // 鍵盤支援
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          button.click();
        }
      });
    });
    
    // 關閉按鈕事件
    const closeBtn = dialog.querySelector('.duplicate-dialog-close');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    
    [closeBtn, cancelBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          this.closeDuplicateDialog();
          resolve('skip'); // 預設動作
        });
      }
    });
    
    // 背景點擊關閉
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        this.closeDuplicateDialog();
        resolve('skip');
      }
    });
    
    // ESC 鍵關閉
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape);
        this.closeDuplicateDialog();
        resolve('skip');
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * 設置無障礙功能
   * @param {HTMLElement} dialog - 對話框元素
   */
  setupAccessibility(dialog) {
    // 設置焦點陷阱
    const focusableElements = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      // 初始焦點設置到推薦選項
      const recommendedBtn = dialog.querySelector('.recommended');
      if (recommendedBtn) {
        recommendedBtn.focus();
      } else {
        firstElement.focus();
      }
      
      // 焦點陷阱
      dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      });
    }
    
    // ARIA 標籤
    dialog.setAttribute('aria-describedby', 'duplicate-dialog-content');
  }

  /**
   * 關閉重複處理對話框
   */
  closeDuplicateDialog() {
    if (this.currentDialog) {
      this.currentDialog.classList.add('hide');
      setTimeout(() => {
        if (this.currentDialog && this.currentDialog.parentNode) {
          this.currentDialog.parentNode.removeChild(this.currentDialog);
        }
        this.currentDialog = null;
      }, 300);
    }
  }

  /**
   * 設置語言
   * @param {string} language - 語言代碼
   */
  setLanguage(language) {
    this.currentLanguage = language;
  }

  /**
   * 獲取標籤文字
   * @returns {Object} - 標籤物件
   */
  getLabels() {
    const labels = {
      zh: {
        title: '發現重複名片',
        message: '發現 {count} 張相同的名片，請選擇處理方式：',
        existingCard: '現有名片',
        newCard: '新名片',
        lastModified: '最後修改',
        source: '來源',
        import: '匯入',
        chooseAction: '選擇處理方式',
        skip: '跳過',
        skipDesc: '保持現有名片不變',
        overwrite: '覆蓋',
        overwriteDesc: '用新資料替換現有名片',
        version: '建立新版本',
        versionDesc: '保留歷史版本，建立新版本',
        recommended: '推薦',
        cancel: '取消',
        close: '關閉',
        avatar: '大頭貼'
      },
      en: {
        title: 'Duplicate Card Found',
        message: 'Found {count} duplicate card(s). Please choose how to handle:',
        existingCard: 'Existing Card',
        newCard: 'New Card',
        lastModified: 'Last Modified',
        source: 'Source',
        import: 'Import',
        chooseAction: 'Choose Action',
        skip: 'Skip',
        skipDesc: 'Keep existing card unchanged',
        overwrite: 'Overwrite',
        overwriteDesc: 'Replace existing card with new data',
        version: 'Create Version',
        versionDesc: 'Keep history, create new version',
        recommended: 'Recommended',
        cancel: 'Cancel',
        close: 'Close',
        avatar: 'Avatar'
      }
    };
    
    return labels[this.currentLanguage] || labels.zh;
  }

  /**
   * 批量處理對話框
   * @param {Array} duplicates - 重複名片陣列
   * @returns {Promise<string>} - 批量處理動作
   */
  async showBatchDuplicateDialog(duplicates) {
    return new Promise((resolve, reject) => {
      try {
        const labels = this.getLabels();
        const dialog = document.createElement('div');
        dialog.className = 'duplicate-dialog-overlay';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        
        dialog.innerHTML = `
          <div class="duplicate-dialog batch-dialog">
            <div class="duplicate-dialog-header">
              <h2>${labels.title} (${duplicates.length})</h2>
              <button class="duplicate-dialog-close" aria-label="${labels.close}">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            
            <div class="duplicate-dialog-content">
              <p>發現 ${duplicates.length} 張重複名片，請選擇批量處理方式：</p>
              
              <div class="batch-options">
                <button class="batch-option-btn" data-action="skip-all">
                  <span class="option-icon">⏭️</span>
                  <span>全部跳過</span>
                </button>
                <button class="batch-option-btn" data-action="overwrite-all">
                  <span class="option-icon">🔄</span>
                  <span>全部覆蓋</span>
                </button>
                <button class="batch-option-btn recommended" data-action="version-all">
                  <span class="option-icon">📝</span>
                  <span>全部建立新版本</span>
                </button>
                <button class="batch-option-btn" data-action="individual">
                  <span class="option-icon">⚙️</span>
                  <span>逐一處理</span>
                </button>
              </div>
            </div>
            
            <div class="duplicate-dialog-footer">
              <button class="btn btn-secondary cancel-btn">${labels.cancel}</button>
            </div>
          </div>
        `;
        
        // 設置事件
        const optionButtons = dialog.querySelectorAll('.batch-option-btn');
        optionButtons.forEach(button => {
          button.addEventListener('click', () => {
            const action = button.dataset.action;
            this.closeDuplicateDialog();
            resolve(action);
          });
        });
        
        const closeBtn = dialog.querySelector('.duplicate-dialog-close');
        const cancelBtn = dialog.querySelector('.cancel-btn');
        [closeBtn, cancelBtn].forEach(btn => {
          if (btn) {
            btn.addEventListener('click', () => {
              this.closeDuplicateDialog();
              resolve('skip-all');
            });
          }
        });
        
        document.body.appendChild(dialog);
        this.currentDialog = dialog;
        
        // 設置焦點
        const recommendedBtn = dialog.querySelector('.recommended');
        if (recommendedBtn) {
          recommendedBtn.focus();
        }
        
        requestAnimationFrame(() => {
          dialog.classList.add('show');
        });
      } catch (error) {
        console.error('[DuplicateDialogManager] Show batch dialog failed:', error);
        reject(error);
      }
    });
  }
}

// 全域函數
function showDuplicateDialog(duplicateInfo, newCardData) {
  if (!window.duplicateDialogManager) {
    window.duplicateDialogManager = new DuplicateDialogManager();
  }
  
  // 設置當前語言
  if (window.languageManager) {
    window.duplicateDialogManager.setLanguage(window.languageManager.getCurrentLanguage());
  }
  
  return window.duplicateDialogManager.showDuplicateDialog(duplicateInfo, newCardData);
}

// 匯出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DuplicateDialogManager;
} else if (typeof window !== 'undefined') {
  window.DuplicateDialogManager = DuplicateDialogManager;
  window.showDuplicateDialog = showDuplicateDialog;
}