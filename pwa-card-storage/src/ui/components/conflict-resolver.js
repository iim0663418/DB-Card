/**
 * PWA-12: 衝突解決器 UI 組件
 * 處理資料匯入時的衝突解決介面
 */

class ConflictResolver {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      language: 'zh',
      onResolve: null,
      onCancel: null,
      ...options
    };
    
    this.conflicts = [];
    this.resolutions = new Map();
    this.isVisible = false;
    
    this.init();
  }

  init() {
    this.createUI();
    this.setupEventListeners();
  }

  /**
   * 顯示衝突解決介面
   */
  showConflicts(conflicts, importData) {
    this.conflicts = conflicts;
    this.importData = importData;
    this.resolutions.clear();
    
    this.renderConflicts();
    this.show();
    
  }

  /**
   * 隱藏衝突解決介面
   */
  hide() {
    this.container.classList.add('hidden');
    this.isVisible = false;
  }

  /**
   * 顯示衝突解決介面
   */
  show() {
    this.container.classList.remove('hidden');
    this.isVisible = true;
  }

  /**
   * 建立 UI 結構
   */
  createUI() {
    this.container.innerHTML = `
      <div class="conflict-resolver-overlay">
        <div class="conflict-resolver-modal">
          <div class="conflict-resolver-header">
            <h2 class="conflict-title" data-i18n="conflictResolution">衝突解決</h2>
            <button class="conflict-close-btn" type="button">&times;</button>
          </div>
          
          <div class="conflict-resolver-body">
            <div class="conflict-summary">
              <p class="conflict-description" data-i18n="conflictDescription">
                發現重複的名片資料，請選擇處理方式：
              </p>
              <div class="conflict-stats">
                <span class="conflict-count">0</span> 個衝突
              </div>
            </div>
            
            <div class="conflict-list">
              <!-- 衝突項目將在這裡動態生成 -->
            </div>
            
            <div class="conflict-actions">
              <div class="bulk-actions">
                <button class="btn btn-secondary bulk-action-btn" data-action="replace-all">
                  全部覆蓋
                </button>
                <button class="btn btn-secondary bulk-action-btn" data-action="skip-all">
                  全部跳過
                </button>
                <button class="btn btn-secondary bulk-action-btn" data-action="keep-both-all">
                  全部保留
                </button>
              </div>
              
              <div class="primary-actions">
                <button class="btn btn-secondary conflict-cancel-btn">
                  取消匯入
                </button>
                <button class="btn btn-primary conflict-resolve-btn" disabled>
                  確認處理
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.container.classList.add('hidden');
  }

  /**
   * 設定事件監聽器
   */
  setupEventListeners() {
    // 關閉按鈕
    const closeBtn = this.container.querySelector('.conflict-close-btn');
    closeBtn?.addEventListener('click', () => this.handleCancel());
    
    // 取消按鈕
    const cancelBtn = this.container.querySelector('.conflict-cancel-btn');
    cancelBtn?.addEventListener('click', () => this.handleCancel());
    
    // 確認按鈕
    const resolveBtn = this.container.querySelector('.conflict-resolve-btn');
    resolveBtn?.addEventListener('click', () => this.handleResolve());
    
    // 批次操作按鈕
    const bulkActionBtns = this.container.querySelectorAll('.bulk-action-btn');
    bulkActionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        this.handleBulkAction(action);
      });
    });
    
    // 點擊遮罩關閉
    const overlay = this.container.querySelector('.conflict-resolver-overlay');
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.handleCancel();
      }
    });
  }

  /**
   * 渲染衝突列表
   */
  renderConflicts() {
    const conflictList = this.container.querySelector('.conflict-list');
    const conflictCount = this.container.querySelector('.conflict-count');
    
    if (!conflictList || !conflictCount) return;
    
    conflictCount.textContent = this.conflicts.length;
    
    conflictList.innerHTML = this.conflicts.map((conflict, index) => {
      return this.renderConflictItem(conflict, index);
    }).join('');
    
    // 設定個別衝突項目的事件監聽器
    this.setupConflictItemListeners();
  }

  /**
   * 渲染單個衝突項目
   */
  renderConflictItem(conflict, index) {
    const { importCard, existingCard, conflictType } = conflict;
    
    const importName = this.getCardDisplayName(importCard.data);
    const existingName = this.getCardDisplayName(existingCard.data);
    
    const importDate = new Date(importCard.modified).toLocaleDateString();
    const existingDate = new Date(existingCard.modified).toLocaleDateString();
    
    const conflictTypeText = this.getConflictTypeText(conflictType);
    
    return `
      <div class="conflict-item" data-index="${index}">
        <div class="conflict-item-header">
          <div class="conflict-info">
            <h3 class="conflict-card-name">${importName}</h3>
            <span class="conflict-type-badge conflict-type-${conflictType}">
              ${conflictTypeText}
            </span>
          </div>
        </div>
        
        <div class="conflict-comparison">
          <div class="conflict-card existing-card">
            <h4>現有名片</h4>
            <div class="card-preview">
              <div class="card-name">${existingName}</div>
              <div class="card-details">
                ${existingCard.data.title ? `<div class="card-title">${existingCard.data.title}</div>` : ''}
                ${existingCard.data.email ? `<div class="card-email">${existingCard.data.email}</div>` : ''}
                <div class="card-date">修改時間: ${existingDate}</div>
              </div>
            </div>
          </div>
          
          <div class="conflict-card import-card">
            <h4>匯入名片</h4>
            <div class="card-preview">
              <div class="card-name">${importName}</div>
              <div class="card-details">
                ${importCard.data.title ? `<div class="card-title">${importCard.data.title}</div>` : ''}
                ${importCard.data.email ? `<div class="card-email">${importCard.data.email}</div>` : ''}
                <div class="card-date">修改時間: ${importDate}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="conflict-resolution">
          <div class="resolution-options">
            <label class="resolution-option">
              <input type="radio" name="resolution-${index}" value="replace" />
              <span class="resolution-label">覆蓋現有名片</span>
              <span class="resolution-desc">使用匯入的名片資料替換現有名片</span>
            </label>
            
            <label class="resolution-option">
              <input type="radio" name="resolution-${index}" value="skip" />
              <span class="resolution-label">跳過此名片</span>
              <span class="resolution-desc">保留現有名片，不匯入此筆資料</span>
            </label>
            
            <label class="resolution-option">
              <input type="radio" name="resolution-${index}" value="keep_both" />
              <span class="resolution-label">保留兩者</span>
              <span class="resolution-desc">同時保留現有名片和匯入名片</span>
            </label>
            
            ${conflictType === 'newer_version' || conflictType === 'older_version' ? `
              <label class="resolution-option">
                <input type="radio" name="resolution-${index}" value="merge" />
                <span class="resolution-label">智慧合併</span>
                <span class="resolution-desc">自動合併兩個版本的資料</span>
              </label>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 設定衝突項目的事件監聽器
   */
  setupConflictItemListeners() {
    const radioButtons = this.container.querySelectorAll('input[type="radio"]');
    
    radioButtons.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const index = parseInt(e.target.name.split('-')[1]);
        const resolution = e.target.value;
        
        this.resolutions.set(index, resolution);
        this.updateResolveButton();
        
      });
    });
  }

  /**
   * 處理批次操作
   */
  handleBulkAction(action) {
    const actionMap = {
      'replace-all': 'replace',
      'skip-all': 'skip',
      'keep-both-all': 'keep_both'
    };
    
    const resolution = actionMap[action];
    if (!resolution) return;
    
    // 設定所有衝突的解決方案
    this.conflicts.forEach((_, index) => {
      this.resolutions.set(index, resolution);
      
      // 更新 UI 中的選項
      const radio = this.container.querySelector(`input[name="resolution-${index}"][value="${resolution}"]`);
      if (radio) {
        radio.checked = true;
      }
    });
    
    this.updateResolveButton();
    
  }

  /**
   * 更新確認按鈕狀態
   */
  updateResolveButton() {
    const resolveBtn = this.container.querySelector('.conflict-resolve-btn');
    if (!resolveBtn) return;
    
    const allResolved = this.conflicts.every((_, index) => this.resolutions.has(index));
    
    resolveBtn.disabled = !allResolved;
    resolveBtn.textContent = allResolved ? 
      `確認處理 (${this.resolutions.size}/${this.conflicts.length})` : 
      `請選擇處理方式 (${this.resolutions.size}/${this.conflicts.length})`;
  }

  /**
   * 處理取消操作
   */
  handleCancel() {
    this.hide();
    
    if (this.options.onCancel) {
      this.options.onCancel();
    }
    
  }

  /**
   * 處理確認操作
   */
  handleResolve() {
    if (this.resolutions.size !== this.conflicts.length) {
      alert('請為所有衝突選擇處理方式');
      return;
    }
    
    // 建立解決方案陣列
    const resolutionArray = [];
    for (let i = 0; i < this.conflicts.length; i++) {
      resolutionArray.push(this.resolutions.get(i));
    }
    
    this.hide();
    
    if (this.options.onResolve) {
      this.options.onResolve(resolutionArray, this.importData);
    }
    
  }

  /**
   * 獲取名片顯示名稱
   */
  getCardDisplayName(cardData) {
    if (window.bilingualBridge) {
      return window.bilingualBridge.getCardDisplayName(cardData, this.options.language);
    }
    
    return cardData.name || '未命名名片';
  }

  /**
   * 獲取衝突類型文字
   */
  getConflictTypeText(conflictType) {
    const typeTexts = {
      'duplicate_id': '重複 ID',
      'newer_version': '較新版本',
      'older_version': '較舊版本',
      'data_mismatch': '資料不符'
    };
    
    return typeTexts[conflictType] || '未知衝突';
  }

  /**
   * 設定語言
   */
  setLanguage(language) {
    this.options.language = language;
    
    // 更新 UI 語言
    if (window.bilingualBridge) {
      window.bilingualBridge.updateDOMLanguage();
    }
  }

  /**
   * 獲取衝突統計
   */
  getConflictStats() {
    const stats = {
      total: this.conflicts.length,
      resolved: this.resolutions.size,
      byType: {}
    };
    
    this.conflicts.forEach(conflict => {
      const type = conflict.conflictType;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * 重設衝突解決器
   */
  reset() {
    this.conflicts = [];
    this.resolutions.clear();
    this.importData = null;
    this.hide();
    
    const conflictList = this.container.querySelector('.conflict-list');
    if (conflictList) {
      conflictList.innerHTML = '';
    }
    
  }

  /**
   * 驗證解決方案
   */
  validateResolutions() {
    const errors = [];
    
    if (this.resolutions.size !== this.conflicts.length) {
      errors.push('並非所有衝突都已解決');
    }
    
    // 檢查是否有無效的解決方案
    this.resolutions.forEach((resolution, index) => {
      const validResolutions = ['replace', 'skip', 'keep_both', 'merge'];
      if (!validResolutions.includes(resolution)) {
        errors.push(`衝突 ${index + 1} 的解決方案無效: ${resolution}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 匯出衝突報告
   */
  exportConflictReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalConflicts: this.conflicts.length,
      resolvedConflicts: this.resolutions.size,
      conflicts: this.conflicts.map((conflict, index) => ({
        index,
        conflictType: conflict.conflictType,
        existingCard: {
          id: conflict.existingCard.id,
          name: conflict.existingCard.data.name,
          modified: conflict.existingCard.modified
        },
        importCard: {
          name: conflict.importCard.data.name,
          modified: conflict.importCard.modified
        },
        resolution: this.resolutions.get(index) || 'unresolved'
      })),
      stats: this.getConflictStats()
    };
    
    const jsonContent = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    return {
      success: true,
      file: blob,
      filename: `conflict-report-${Date.now()}.json`,
      report
    };
  }
}

// 全域可用
window.ConflictResolver = ConflictResolver;

