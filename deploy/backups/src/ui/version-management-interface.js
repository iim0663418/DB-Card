/**
 * UI-03: 版本管理介面
 * 新增版本歷史顯示與管理 UI 元件
 */

class VersionManagementInterface {
  constructor(storage, versionManager) {
    this.storage = storage;
    this.versionManager = versionManager;
    this.currentCardId = null;
    this.currentVersionHistory = null;
    this.isLoading = false;
  }

  /**
   * 顯示版本管理對話框
   * @param {string} cardId - 名片ID
   * @param {Object} card - 名片資料
   */
  async showVersionDialog(cardId, card) {
    try {
      this.currentCardId = cardId;
      
      // 載入版本歷史
      this.showLoading('載入版本歷史...');
      this.currentVersionHistory = await this.versionManager.getVersionHistory(cardId);
      
      // 建立對話框
      const modal = this.createVersionModal(card);
      document.body.appendChild(modal);
      
      // 渲染版本列表
      await this.renderVersionList();
      
      this.hideLoading();
    } catch (error) {
      console.error('[VersionManagementInterface] Show version dialog failed:', error);
      this.hideLoading();
      this.showNotification('載入版本歷史失敗', 'error');
    }
  }

  /**
   * 建立版本管理模態視窗
   */
  createVersionModal(card) {
    const modal = document.createElement('div');
    modal.className = 'modal version-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content version-modal-content">
        <div class="modal-header">
          <h2>📋 版本管理 - ${card.data.name || '未知名片'}</h2>
          <button class="modal-close" aria-label="關閉">&times;</button>
        </div>
        <div class="modal-body">
          <div class="version-stats">
            <div class="stat-item">
              <span class="stat-label">總版本數：</span>
              <span class="stat-value" id="total-versions">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">目前版本：</span>
              <span class="stat-value" id="current-version">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最後修改：</span>
              <span class="stat-value" id="last-modified">-</span>
            </div>
          </div>
          
          <div class="version-actions">
            <button class="btn btn-secondary" id="cleanup-versions-btn">
              🧹 清理舊版本
            </button>
            <button class="btn btn-secondary" id="export-versions-btn">
              📤 匯出版本歷史
            </button>
            <button class="btn btn-secondary" id="merge-suggestions-btn">
              🔄 合併建議
            </button>
          </div>
          
          <div class="version-list-container">
            <div class="version-list-header">
              <h3>版本歷史</h3>
              <div class="version-filters">
                <select id="version-filter" class="form-select">
                  <option value="all">所有版本</option>
                  <option value="major">主要版本</option>
                  <option value="recent">最近版本</option>
                </select>
              </div>
            </div>
            <div class="version-list" id="version-list">
              <div class="loading-placeholder">載入中...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 設置事件監聽器
    this.setupVersionModalEvents(modal);
    
    return modal;
  }

  /**
   * 設置版本模態視窗事件
   */
  setupVersionModalEvents(modal) {
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const cleanupBtn = modal.querySelector('#cleanup-versions-btn');
    const exportBtn = modal.querySelector('#export-versions-btn');
    const mergeBtn = modal.querySelector('#merge-suggestions-btn');
    const filterSelect = modal.querySelector('#version-filter');

    // 關閉對話框
    const closeModal = () => {
      modal.remove();
      this.currentCardId = null;
      this.currentVersionHistory = null;
    };

    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    // 版本操作
    cleanupBtn.addEventListener('click', () => this.handleCleanupVersions());
    exportBtn.addEventListener('click', () => this.handleExportVersions());
    mergeBtn.addEventListener('click', () => this.handleMergeSuggestions());

    // 篩選器
    filterSelect.addEventListener('change', (e) => {
      this.filterVersions(e.target.value);
    });

    // 鍵盤支援
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  /**
   * 渲染版本列表
   */
  async renderVersionList(filter = 'all') {
    try {
      const versionList = document.getElementById('version-list');
      if (!versionList || !this.currentVersionHistory) return;

      // 更新統計資訊
      this.updateVersionStats();

      // 篩選版本
      let versions = this.currentVersionHistory.versions;
      switch (filter) {
        case 'major':
          versions = versions.filter(v => v.semanticVersion && v.semanticVersion.endsWith('.0'));
          break;
        case 'recent':
          versions = versions.slice(0, 10);
          break;
        default:
          // 顯示所有版本
          break;
      }

      if (versions.length === 0) {
        versionList.innerHTML = '<div class="no-versions">沒有符合條件的版本</div>';
        return;
      }

      // 渲染版本項目
      const versionItems = versions.map(version => this.createVersionItem(version)).join('');
      versionList.innerHTML = versionItems;

      // 設置版本項目事件
      this.setupVersionItemEvents(versionList);

    } catch (error) {
      console.error('[VersionManagementInterface] Render version list failed:', error);
      const versionList = document.getElementById('version-list');
      if (versionList) {
        versionList.innerHTML = '<div class="error-message">載入版本列表失敗</div>';
      }
    }
  }

  /**
   * 建立版本項目 HTML
   */
  createVersionItem(version) {
    const isCurrentVersion = version.version === this.currentVersionHistory.currentVersion;
    const formattedDate = new Date(version.timestamp).toLocaleString('zh-TW');
    
    // 變更類型圖示
    const changeTypeIcons = {
      'create': '🆕',
      'update': '✏️',
      'restore': '🔄',
      'merge': '🔀'
    };
    
    const changeIcon = changeTypeIcons[version.changeType] || '📝';
    
    return `
      <div class="version-item ${isCurrentVersion ? 'current-version' : ''}" data-version="${version.version}">
        <div class="version-header">
          <div class="version-info">
            <span class="version-number">v${version.semanticVersion || version.version}</span>
            <span class="version-type">${changeIcon} ${this.getChangeTypeText(version.changeType)}</span>
            ${isCurrentVersion ? '<span class="current-badge">目前版本</span>' : ''}
          </div>
          <div class="version-date">${formattedDate}</div>
        </div>
        <div class="version-description">
          ${version.description || '無描述'}
        </div>
        <div class="version-actions">
          <button class="btn btn-sm btn-secondary view-version-btn" data-version="${version.version}">
            👁️ 檢視
          </button>
          <button class="btn btn-sm btn-secondary compare-version-btn" data-version="${version.version}">
            🔍 比較
          </button>
          ${!isCurrentVersion ? `
            <button class="btn btn-sm btn-primary restore-version-btn" data-version="${version.version}">
              🔄 還原
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 設置版本項目事件
   */
  setupVersionItemEvents(container) {
    // 檢視版本
    container.querySelectorAll('.view-version-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const version = parseInt(e.target.dataset.version);
        this.viewVersion(version);
      });
    });

    // 比較版本
    container.querySelectorAll('.compare-version-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const version = parseInt(e.target.dataset.version);
        this.compareVersion(version);
      });
    });

    // 還原版本
    container.querySelectorAll('.restore-version-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const version = parseInt(e.target.dataset.version);
        await this.restoreVersion(version);
      });
    });
  }

  /**
   * 更新版本統計資訊
   */
  updateVersionStats() {
    if (!this.currentVersionHistory) return;

    const totalVersionsEl = document.getElementById('total-versions');
    const currentVersionEl = document.getElementById('current-version');
    const lastModifiedEl = document.getElementById('last-modified');

    if (totalVersionsEl) {
      totalVersionsEl.textContent = this.currentVersionHistory.totalVersions;
    }

    if (currentVersionEl) {
      currentVersionEl.textContent = `v${this.currentVersionHistory.latestSemanticVersion}`;
    }

    if (lastModifiedEl && this.currentVersionHistory.versions.length > 0) {
      const lastModified = new Date(this.currentVersionHistory.versions[0].timestamp);
      lastModifiedEl.textContent = lastModified.toLocaleString('zh-TW');
    }
  }

  /**
   * 檢視特定版本
   */
  async viewVersion(versionNumber) {
    try {
      this.showLoading('載入版本資料...');
      
      const versionSnapshot = await this.versionManager.getVersionSnapshot(this.currentCardId, versionNumber);
      if (!versionSnapshot) {
        throw new Error('版本不存在');
      }

      // 顯示版本詳情對話框
      this.showVersionDetailsDialog(versionSnapshot);
      
    } catch (error) {
      console.error('[VersionManagementInterface] View version failed:', error);
      this.showNotification('載入版本失敗', 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 比較版本
   */
  async compareVersion(versionNumber) {
    try {
      // 簡化版本：與目前版本比較
      const currentVersion = this.currentVersionHistory.currentVersion;
      
      if (versionNumber === currentVersion) {
        this.showNotification('無法與自己比較', 'warning');
        return;
      }

      this.showLoading('比較版本中...');
      
      const comparison = await this.versionManager.compareVersions(
        this.currentCardId, 
        versionNumber, 
        currentVersion
      );

      this.showVersionComparisonDialog(comparison);
      
    } catch (error) {
      console.error('[VersionManagementInterface] Compare version failed:', error);
      this.showNotification('版本比較失敗', 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 還原版本
   */
  async restoreVersion(versionNumber) {
    try {
      // 確認對話框
      const confirmed = await this.showConfirmDialog(
        `確定要還原到版本 ${versionNumber} 嗎？`,
        '此操作會建立新的版本記錄，原有資料不會遺失。'
      );

      if (!confirmed) return;

      this.showLoading('還原版本中...');
      
      const result = await this.versionManager.restoreToVersion(this.currentCardId, versionNumber);
      
      if (result.success) {
        this.showNotification(`已還原到版本 ${versionNumber}`, 'success');
        
        // 重新載入版本歷史
        this.currentVersionHistory = await this.versionManager.getVersionHistory(this.currentCardId);
        await this.renderVersionList();
        
        // 通知父應用更新
        if (window.app && window.app.updateStats) {
          await window.app.updateStats();
        }
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('[VersionManagementInterface] Restore version failed:', error);
      this.showNotification('版本還原失敗', 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 處理版本清理
   */
  async handleCleanupVersions() {
    try {
      // 顯示清理選項對話框
      const options = await this.showCleanupOptionsDialog();
      if (!options) return;

      this.showLoading('清理版本中...');
      
      const result = await this.versionManager.cleanupOldVersions(this.currentCardId, options);
      
      if (result.success) {
        const message = result.deletedCount > 0 
          ? `已清理 ${result.deletedCount} 個舊版本`
          : result.message;
        
        this.showNotification(message, 'success');
        
        // 重新載入版本歷史
        this.currentVersionHistory = await this.versionManager.getVersionHistory(this.currentCardId);
        await this.renderVersionList();
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('[VersionManagementInterface] Cleanup versions failed:', error);
      this.showNotification('版本清理失敗', 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 處理版本匯出
   */
  async handleExportVersions() {
    try {
      this.showLoading('匯出版本歷史...');
      
      const result = await this.versionManager.exportVersionHistory(this.currentCardId);
      
      if (result.success) {
        // 下載檔案
        const link = document.createElement('a');
        link.href = URL.createObjectURL(result.file);
        link.download = result.filename;
        link.click();
        URL.revokeObjectURL(link.href);
        
        this.showNotification('版本歷史已匯出', 'success');
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('[VersionManagementInterface] Export versions failed:', error);
      this.showNotification('版本匯出失敗', 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 處理合併建議
   */
  async handleMergeSuggestions() {
    try {
      this.showLoading('分析版本...');
      
      const suggestions = await this.versionManager.suggestVersionMerging(this.currentCardId);
      
      this.showMergeSuggestionsDialog(suggestions);
      
    } catch (error) {
      console.error('[VersionManagementInterface] Merge suggestions failed:', error);
      this.showNotification('合併分析失敗', 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 顯示版本詳情對話框
   */
  showVersionDetailsDialog(versionSnapshot) {
    const modal = document.createElement('div');
    modal.className = 'modal version-details-modal';
    
    const formattedDate = new Date(versionSnapshot.timestamp).toLocaleString('zh-TW');
    const changeIcon = this.getChangeTypeIcon(versionSnapshot.changeType);
    
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>${changeIcon} 版本 ${versionSnapshot.semanticVersion || versionSnapshot.version} 詳情</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="version-meta">
            <div class="meta-item">
              <strong>版本號：</strong>v${versionSnapshot.semanticVersion || versionSnapshot.version}
            </div>
            <div class="meta-item">
              <strong>變更類型：</strong>${this.getChangeTypeText(versionSnapshot.changeType)}
            </div>
            <div class="meta-item">
              <strong>時間：</strong>${formattedDate}
            </div>
            <div class="meta-item">
              <strong>描述：</strong>${versionSnapshot.description || '無描述'}
            </div>
          </div>
          
          <div class="version-data">
            <h3>名片資料</h3>
            <div class="card-preview">
              ${this.renderCardPreview(versionSnapshot.data)}
            </div>
          </div>
        </div>
      </div>
    `;

    // 設置關閉事件
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    
    const closeModal = () => modal.remove();
    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    document.body.appendChild(modal);
  }

  /**
   * 顯示版本比較對話框
   */
  showVersionComparisonDialog(comparison) {
    const modal = document.createElement('div');
    modal.className = 'modal version-comparison-modal';
    
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>🔍 版本比較</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="comparison-header">
            <div class="version-info">
              <strong>版本 ${comparison.version1.semantic}</strong>
              <span class="version-date">${new Date(comparison.version1.timestamp).toLocaleString('zh-TW')}</span>
            </div>
            <div class="comparison-arrow">→</div>
            <div class="version-info">
              <strong>版本 ${comparison.version2.semantic}</strong>
              <span class="version-date">${new Date(comparison.version2.timestamp).toLocaleString('zh-TW')}</span>
            </div>
          </div>
          
          <div class="comparison-stats">
            <div class="stat-item">
              <span class="stat-label">變更數量：</span>
              <span class="stat-value">${comparison.totalChanges}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">相似度：</span>
              <span class="stat-value">${Math.round(comparison.similarity.score * 100)}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">影響等級：</span>
              <span class="stat-value impact-${comparison.impact.level}">${this.getImpactLevelText(comparison.impact.level)}</span>
            </div>
          </div>
          
          <div class="differences-list">
            <h3>變更詳情</h3>
            ${this.renderDifferencesList(comparison.differences)}
          </div>
        </div>
      </div>
    `;

    // 設置關閉事件
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    
    const closeModal = () => modal.remove();
    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    document.body.appendChild(modal);
  }

  /**
   * 顯示清理選項對話框
   */
  async showCleanupOptionsDialog() {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal cleanup-options-modal';
      
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>🧹 版本清理選項</h2>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="max-versions">保留版本數量：</label>
              <input type="number" id="max-versions" value="${this.versionManager.maxVersions}" min="1" max="50">
            </div>
            <div class="form-group">
              <label for="days-old">清理天數（天前的版本）：</label>
              <input type="number" id="days-old" value="30" min="1" max="365">
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="create-backup" checked>
                清理前建立備份
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary cancel-btn">取消</button>
            <button class="btn btn-primary confirm-btn">開始清理</button>
          </div>
        </div>
      `;

      const overlay = modal.querySelector('.modal-overlay');
      const closeBtn = modal.querySelector('.modal-close');
      const cancelBtn = modal.querySelector('.cancel-btn');
      const confirmBtn = modal.querySelector('.confirm-btn');

      const closeModal = () => {
        modal.remove();
        resolve(null);
      };

      const confirmCleanup = () => {
        const options = {
          maxVersions: parseInt(document.getElementById('max-versions').value),
          daysOld: parseInt(document.getElementById('days-old').value),
          createBackup: document.getElementById('create-backup').checked
        };
        modal.remove();
        resolve(options);
      };

      overlay.addEventListener('click', closeModal);
      closeBtn.addEventListener('click', closeModal);
      cancelBtn.addEventListener('click', closeModal);
      confirmBtn.addEventListener('click', confirmCleanup);

      document.body.appendChild(modal);
    });
  }

  /**
   * 顯示合併建議對話框
   */
  showMergeSuggestionsDialog(suggestions) {
    const modal = document.createElement('div');
    modal.className = 'modal merge-suggestions-modal';
    
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>🔄 版本合併建議</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          ${suggestions.shouldMerge ? `
            <div class="suggestions-list">
              ${suggestions.suggestions.map(suggestion => `
                <div class="suggestion-item">
                  <div class="suggestion-type">${this.getSuggestionTypeText(suggestion.type)}</div>
                  <div class="suggestion-details">${suggestion.recommendation}</div>
                  ${suggestion.similarity ? `<div class="similarity">相似度：${Math.round(suggestion.similarity * 100)}%</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="no-suggestions">
              <p>✅ 目前版本結構良好，無需合併。</p>
              <p>總版本數：${suggestions.totalVersions}</p>
            </div>
          `}
        </div>
      </div>
    `;

    // 設置關閉事件
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    
    const closeModal = () => modal.remove();
    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    document.body.appendChild(modal);
  }

  /**
   * 篩選版本
   */
  filterVersions(filter) {
    this.renderVersionList(filter);
  }

  /**
   * 渲染名片預覽
   */
  renderCardPreview(cardData) {
    return `
      <div class="card-preview-content">
        ${cardData.avatar ? `<img src="${cardData.avatar}" alt="大頭貼" class="card-avatar">` : ''}
        <h3>${cardData.name || '未知'}</h3>
        ${cardData.title ? `<p class="card-title">${cardData.title}</p>` : ''}
        ${cardData.department ? `<p class="card-department">${cardData.department}</p>` : ''}
        ${cardData.email ? `<p class="card-email">${cardData.email}</p>` : ''}
        ${cardData.phone ? `<p class="card-phone">${cardData.phone}</p>` : ''}
      </div>
    `;
  }

  /**
   * 渲染差異列表
   */
  renderDifferencesList(differences) {
    if (differences.length === 0) {
      return '<p class="no-differences">無變更</p>';
    }

    return `
      <div class="differences">
        ${differences.map(diff => `
          <div class="difference-item ${diff.changeType}">
            <div class="field-name">${this.getFieldDisplayName(diff.field)}</div>
            <div class="change-type">${this.getChangeTypeText(diff.changeType)}</div>
            <div class="change-details">
              ${diff.changeType === 'modified' ? `
                <div class="old-value">舊值：${diff.oldValue || '(空)'}</div>
                <div class="new-value">新值：${diff.newValue || '(空)'}</div>
              ` : diff.changeType === 'added' ? `
                <div class="new-value">新增：${diff.newValue}</div>
              ` : `
                <div class="old-value">刪除：${diff.oldValue}</div>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * 顯示確認對話框
   */
  async showConfirmDialog(title, message) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal confirm-modal';
      
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>${title}</h2>
          </div>
          <div class="modal-body">
            <p>${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary cancel-btn">取消</button>
            <button class="btn btn-primary confirm-btn">確定</button>
          </div>
        </div>
      `;

      const overlay = modal.querySelector('.modal-overlay');
      const cancelBtn = modal.querySelector('.cancel-btn');
      const confirmBtn = modal.querySelector('.confirm-btn');

      const closeModal = (result) => {
        modal.remove();
        resolve(result);
      };

      overlay.addEventListener('click', () => closeModal(false));
      cancelBtn.addEventListener('click', () => closeModal(false));
      confirmBtn.addEventListener('click', () => closeModal(true));

      document.body.appendChild(modal);
    });
  }

  /**
   * 工具方法
   */
  getChangeTypeText(changeType) {
    const types = {
      'create': '建立',
      'update': '更新',
      'restore': '還原',
      'merge': '合併'
    };
    return types[changeType] || changeType;
  }

  getChangeTypeIcon(changeType) {
    const icons = {
      'create': '🆕',
      'update': '✏️',
      'restore': '🔄',
      'merge': '🔀'
    };
    return icons[changeType] || '📝';
  }

  getImpactLevelText(level) {
    const levels = {
      'low': '低',
      'medium': '中',
      'high': '高'
    };
    return levels[level] || level;
  }

  getSuggestionTypeText(type) {
    const types = {
      'similar_versions': '相似版本',
      'frequent_small_changes': '頻繁小改動'
    };
    return types[type] || type;
  }

  getFieldDisplayName(field) {
    const names = {
      'name': '姓名',
      'title': '職稱',
      'department': '部門',
      'organization': '組織',
      'email': '電子郵件',
      'phone': '電話',
      'mobile': '手機',
      'address': '地址',
      'avatar': '大頭貼',
      'socialNote': '社群連結',
      'greetings': '問候語'
    };
    return names[field] || field;
  }

  showLoading(message) {
    this.isLoading = true;
    if (window.app && window.app.showLoading) {
      window.app.showLoading(message);
    }
  }

  hideLoading() {
    this.isLoading = false;
    if (window.app && window.app.hideLoading) {
      window.app.hideLoading();
    }
  }

  showNotification(message, type) {
    if (window.app && window.app.showNotification) {
      window.app.showNotification(message, type);
    }
  }
}

// 匯出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VersionManagementInterface;
} else if (typeof window !== 'undefined') {
  window.VersionManagementInterface = VersionManagementInterface;
}