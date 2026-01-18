/**
 * 版本歷史管理介面 - UI-02
 * 版本歷史查看、比較、還原功能，整合到現有 PWA 介面
 */

class VersionHistory {
  constructor(storage, versionManager) {
    this.storage = storage;
    this.versionManager = versionManager;
    this.container = null;
    this.currentCardId = null;
    this.versions = [];
    this.selectedVersions = [];
  }

  /**
   * 顯示版本歷史介面
   * @param {string} cardId - 名片ID
   * @param {HTMLElement} container - 容器元素
   */
  async show(cardId, container) {
    this.currentCardId = cardId;
    this.container = container;
    
    try {
      await this.loadVersionHistory();
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error('[VersionHistory] Show failed:', error);
      this.showError('載入版本歷史失敗');
    }
  }

  /**
   * 載入版本歷史
   */
  async loadVersionHistory() {
    const history = await this.versionManager.getVersionHistory(this.currentCardId);
    this.versions = history.versions || [];
  }

  /**
   * 渲染版本歷史介面
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="version-history-container">
        <div class="version-history-header">
          <h3>版本歷史</h3>
          <div class="version-stats">
            <span>共 ${this.versions.length} 個版本</span>
            ${this.versions.length > 0 ? `<span>最新版本: ${this.versions[0].version}</span>` : ''}
          </div>
        </div>
        
        <div class="version-actions">
          <button class="btn-compare" disabled aria-label="比較選中的版本">比較版本</button>
          <button class="btn-restore" disabled aria-label="還原到選中版本">還原版本</button>
          <button class="btn-export" aria-label="匯出版本歷史">匯出歷史</button>
        </div>
        
        <div class="version-timeline">
          ${this.renderVersionList()}
        </div>
        
        <div class="version-details" style="display: none;">
          <!-- 版本詳情將在這裡顯示 -->
        </div>
      </div>
    `;
  }

  /**
   * 渲染版本列表
   */
  renderVersionList() {
    if (this.versions.length === 0) {
      return '<div class="no-versions">暫無版本歷史</div>';
    }

    return this.versions.map((version, index) => `
      <div class="version-item ${index === 0 ? 'current' : ''}" data-version="${version.version}">
        <div class="version-checkbox">
          <input type="checkbox" id="version-${version.version}" 
                 value="${version.version}" aria-label="選擇版本 ${version.version}">
        </div>
        
        <div class="version-info">
          <div class="version-header">
            <span class="version-number">v${version.version}</span>
            ${index === 0 ? '<span class="current-badge">目前版本</span>' : ''}
            <span class="version-type">${this.getChangeTypeLabel(version.changeType)}</span>
          </div>
          
          <div class="version-meta">
            <time datetime="${version.timestamp}">${this.formatDate(version.timestamp)}</time>
            ${version.description ? `<span class="version-desc">${this.escapeHtml(version.description)}</span>` : ''}
          </div>
          
          <div class="version-preview">
            ${this.renderVersionPreview(version.data)}
          </div>
        </div>
        
        <div class="version-actions-inline">
          <button class="btn-view" data-version="${version.version}" aria-label="查看版本 ${version.version} 詳情">查看</button>
          ${index !== 0 ? `<button class="btn-restore-single" data-version="${version.version}" aria-label="還原到版本 ${version.version}">還原</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  /**
   * 渲染版本預覽
   */
  renderVersionPreview(data) {
    const name = this.extractDisplayName(data);
    const email = data.email || '';
    const title = data.title || '';
    
    return `
      <div class="preview-content">
        <div class="preview-name">${this.escapeHtml(name)}</div>
        ${title ? `<div class="preview-title">${this.escapeHtml(title)}</div>` : ''}
        ${email ? `<div class="preview-email">${this.escapeHtml(email)}</div>` : ''}
      </div>
    `;
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    if (!this.container) return;

    // 版本選擇
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => this.handleVersionSelection());
    });

    // 比較按鈕
    const compareBtn = this.container.querySelector('.btn-compare');
    compareBtn?.addEventListener('click', () => this.handleCompare());

    // 還原按鈕
    const restoreBtn = this.container.querySelector('.btn-restore');
    restoreBtn?.addEventListener('click', () => this.handleRestore());

    // 匯出按鈕
    const exportBtn = this.container.querySelector('.btn-export');
    exportBtn?.addEventListener('click', () => this.handleExport());

    // 查看按鈕
    const viewBtns = this.container.querySelectorAll('.btn-view');
    viewBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleView(e.target.dataset.version));
    });

    // 單個還原按鈕
    const restoreBtns = this.container.querySelectorAll('.btn-restore-single');
    restoreBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleRestoreSingle(e.target.dataset.version));
    });
  }

  /**
   * 處理版本選擇
   */
  handleVersionSelection() {
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"]:checked');
    this.selectedVersions = Array.from(checkboxes).map(cb => cb.value);

    // 更新按鈕狀態
    const compareBtn = this.container.querySelector('.btn-compare');
    const restoreBtn = this.container.querySelector('.btn-restore');

    compareBtn.disabled = this.selectedVersions.length !== 2;
    restoreBtn.disabled = this.selectedVersions.length !== 1 || this.selectedVersions[0] === this.versions[0].version;
  }

  /**
   * 處理版本比較
   */
  async handleCompare() {
    if (this.selectedVersions.length !== 2) return;

    try {
      const [version1, version2] = this.selectedVersions.sort((a, b) => parseFloat(b) - parseFloat(a));
      const comparison = await this.versionManager.compareVersions(this.currentCardId, version1, version2);
      
      this.showComparison(comparison);
    } catch (error) {
      console.error('[VersionHistory] Compare failed:', error);
      this.showError('版本比較失敗');
    }
  }

  /**
   * 處理版本還原
   */
  async handleRestore() {
    if (this.selectedVersions.length !== 1) return;

    const version = this.selectedVersions[0];
    if (!confirm(`確定要還原到版本 ${version} 嗎？此操作將覆蓋目前版本。`)) {
      return;
    }

    try {
      const result = await this.versionManager.restoreToVersion(this.currentCardId, parseFloat(version));
      
      if (result.success) {
        this.showSuccess(`已成功還原到版本 ${version}`);
        await this.loadVersionHistory();
        this.render();
        this.setupEventListeners();
      } else {
        this.showError(`還原失敗: ${result.error}`);
      }
    } catch (error) {
      console.error('[VersionHistory] Restore failed:', error);
      this.showError('版本還原失敗');
    }
  }

  /**
   * 處理單個版本還原
   */
  async handleRestoreSingle(version) {
    if (!confirm(`確定要還原到版本 ${version} 嗎？`)) return;

    try {
      const result = await this.versionManager.restoreToVersion(this.currentCardId, parseFloat(version));
      
      if (result.success) {
        this.showSuccess(`已還原到版本 ${version}`);
        await this.loadVersionHistory();
        this.render();
        this.setupEventListeners();
      } else {
        this.showError(`還原失敗: ${result.error}`);
      }
    } catch (error) {
      console.error('[VersionHistory] Restore single failed:', error);
      this.showError('版本還原失敗');
    }
  }

  /**
   * 處理版本匯出
   */
  async handleExport() {
    try {
      const result = await this.versionManager.exportVersionHistory(this.currentCardId);
      
      if (result.success) {
        const url = URL.createObjectURL(result.file);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showSuccess('版本歷史已匯出');
      } else {
        this.showError(`匯出失敗: ${result.error}`);
      }
    } catch (error) {
      console.error('[VersionHistory] Export failed:', error);
      this.showError('匯出版本歷史失敗');
    }
  }

  /**
   * 處理版本查看
   */
  handleView(version) {
    const versionData = this.versions.find(v => v.version == version);
    if (!versionData) return;

    this.showVersionDetails(versionData);
  }

  /**
   * 顯示版本比較結果
   */
  showComparison(comparison) {
    const detailsContainer = this.container.querySelector('.version-details');
    
    detailsContainer.innerHTML = `
      <div class="comparison-result">
        <h4>版本比較: v${comparison.version1} vs v${comparison.version2}</h4>
        <div class="differences">
          ${comparison.differences.length === 0 ? 
            '<p>兩個版本沒有差異</p>' : 
            comparison.differences.map(diff => `
              <div class="diff-item ${diff.changeType}">
                <strong>${diff.field}:</strong>
                <div class="diff-values">
                  <div class="old-value">舊值: ${this.escapeHtml(String(diff.oldValue || ''))}</div>
                  <div class="new-value">新值: ${this.escapeHtml(String(diff.newValue || ''))}</div>
                </div>
              </div>
            `).join('')
          }
        </div>
        <button class="btn-close-details">關閉</button>
      </div>
    `;
    
    detailsContainer.style.display = 'block';
    
    // 關閉按鈕
    detailsContainer.querySelector('.btn-close-details')?.addEventListener('click', () => {
      detailsContainer.style.display = 'none';
    });
  }

  /**
   * 顯示版本詳情
   */
  showVersionDetails(versionData) {
    const detailsContainer = this.container.querySelector('.version-details');
    
    detailsContainer.innerHTML = `
      <div class="version-detail">
        <h4>版本 ${versionData.version} 詳情</h4>
        <div class="detail-meta">
          <p><strong>時間:</strong> ${this.formatDate(versionData.timestamp)}</p>
          <p><strong>類型:</strong> ${this.getChangeTypeLabel(versionData.changeType)}</p>
          ${versionData.description ? `<p><strong>說明:</strong> ${this.escapeHtml(versionData.description)}</p>` : ''}
        </div>
        <div class="detail-data">
          <h5>名片資料:</h5>
          <pre>${JSON.stringify(versionData.data, null, 2)}</pre>
        </div>
        <button class="btn-close-details">關閉</button>
      </div>
    `;
    
    detailsContainer.style.display = 'block';
    
    // 關閉按鈕
    detailsContainer.querySelector('.btn-close-details')?.addEventListener('click', () => {
      detailsContainer.style.display = 'none';
    });
  }

  /**
   * 工具方法
   */
  extractDisplayName(data) {
    if (!data.name) return '未知';
    
    if (typeof data.name === 'string') {
      return data.name.includes('~') ? data.name.split('~')[0] : data.name;
    }
    
    if (typeof data.name === 'object' && data.name.zh) {
      return data.name.zh;
    }
    
    return String(data.name);
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '未知時間';
    }
  }

  getChangeTypeLabel(changeType) {
    const labels = {
      'create': '建立',
      'update': '更新',
      'restore': '還原',
      'merge': '合併'
    };
    return labels[changeType] || changeType;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `version-message ${type}`;
    messageDiv.textContent = message;
    
    this.container.insertBefore(messageDiv, this.container.firstChild);
    
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }

  /**
   * 清理資源
   */
  destroy() {
    this.container = null;
    this.currentCardId = null;
    this.versions = [];
    this.selectedVersions = [];
  }
}

// CSS 樣式
const versionHistoryStyles = `
.version-history-container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--pwa-spacing-lg, 1.5rem);
  font-family: var(--pwa-font-family, 'Noto Sans TC', sans-serif);
  color: var(--pwa-text, #1a1a1a);
}

.version-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--pwa-spacing-lg, 1.5rem);
  padding-bottom: var(--pwa-spacing-md, 1rem);
  border-bottom: 2px solid var(--pwa-border, #eee);
}

.version-history-header h3 {
  margin: 0;
  color: var(--pwa-text, #333);
  font-size: var(--senior-font-size-2xl, 1.75rem);
  font-weight: var(--pwa-font-weight-bold, 600);
}

.version-stats {
  display: flex;
  gap: var(--pwa-spacing-md, 1rem);
  font-size: var(--senior-font-size-sm, 1rem);
  color: var(--pwa-text-secondary, #666);
}

.version-actions {
  display: flex;
  gap: var(--pwa-spacing-sm, 0.5rem);
  margin-bottom: var(--pwa-spacing-lg, 1.5rem);
}

.version-actions button {
  padding: var(--pwa-spacing-sm, 0.5rem) var(--pwa-spacing-md, 1rem);
  border: 1px solid var(--pwa-border, #ddd);
  border-radius: 4px;
  background: var(--pwa-surface, white);
  color: var(--pwa-text, #333);
  cursor: pointer;
  font-size: var(--senior-font-size-sm, 1rem);
  font-family: var(--pwa-font-family, 'Noto Sans TC', sans-serif);
  transition: var(--pwa-transition-duration, 0.3s) var(--pwa-transition-timing, ease);
}

.version-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.version-actions button:not(:disabled):hover {
  background: var(--md-primary-5, #f5f5f5);
  border-color: var(--pwa-primary, #6868ac);
}

.version-timeline {
  border-left: 3px solid var(--pwa-primary, #6868ac);
  padding-left: var(--pwa-spacing-lg, 1.5rem);
}

.version-item {
  position: relative;
  margin-bottom: var(--pwa-spacing-lg, 1.5rem);
  padding: var(--pwa-spacing-md, 1rem);
  background: var(--pwa-surface, white);
  border: 1px solid var(--pwa-border, #ddd);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  color: var(--pwa-text, #333);
}

.version-item::before {
  content: '';
  position: absolute;
  left: -27px;
  top: var(--pwa-spacing-lg, 1.5rem);
  width: 12px;
  height: 12px;
  background: var(--pwa-primary, #6868ac);
  border-radius: 50%;
  border: 3px solid var(--pwa-surface, white);
}

.version-item.current::before {
  background: #28a745;
}

.version-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 15px;
  align-items: start;
}

.version-checkbox input {
  margin: 0;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.version-number {
  font-weight: var(--pwa-font-weight-bold, 600);
  color: var(--pwa-primary, #6868ac);
  font-size: var(--senior-font-size-lg, 1.25rem);
}

.current-badge {
  background: #28a745;
  color: var(--pwa-text-inverse, white);
  padding: var(--pwa-spacing-xs, 0.25rem) var(--pwa-spacing-sm, 0.5rem);
  border-radius: 12px;
  font-size: var(--senior-font-size-xs, 0.9rem);
  font-weight: var(--pwa-font-weight-medium, 500);
}

.version-type {
  background: var(--md-secondary-1, #6c757d);
  color: var(--pwa-text-inverse, white);
  padding: var(--pwa-spacing-xs, 0.25rem) var(--pwa-spacing-sm, 0.5rem);
  border-radius: 12px;
  font-size: var(--senior-font-size-xs, 0.9rem);
  font-weight: var(--pwa-font-weight-medium, 500);
}

.version-meta {
  display: flex;
  gap: var(--pwa-spacing-md, 1rem);
  font-size: var(--senior-font-size-sm, 1rem);
  color: var(--pwa-text-secondary, #666);
  margin-bottom: var(--pwa-spacing-sm, 0.5rem);
}

.version-desc {
  font-style: italic;
}

.version-preview {
  background: var(--md-neutral-10, #f8f9fa);
  padding: var(--pwa-spacing-sm, 0.5rem);
  border-radius: 4px;
  border-left: 3px solid var(--pwa-primary, #6868ac);
}

.preview-name {
  font-weight: var(--pwa-font-weight-bold, 600);
  margin-bottom: var(--pwa-spacing-xs, 0.25rem);
  color: var(--pwa-text, #333);
  font-size: var(--senior-font-size-base, 1.125rem);
}

.preview-title, .preview-email {
  font-size: var(--senior-font-size-sm, 1rem);
  color: var(--pwa-text-secondary, #666);
  margin-bottom: var(--pwa-spacing-xs, 0.25rem);
}

.version-actions-inline {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.version-actions-inline button {
  padding: var(--pwa-spacing-xs, 0.25rem) var(--pwa-spacing-sm, 0.5rem);
  border: 1px solid var(--pwa-border, #ddd);
  border-radius: 4px;
  background: var(--pwa-surface, white);
  cursor: pointer;
  font-size: var(--senior-font-size-xs, 0.9rem);
  font-family: var(--pwa-font-family, 'Noto Sans TC', sans-serif);
  white-space: nowrap;
  transition: var(--pwa-transition-duration, 0.3s) var(--pwa-transition-timing, ease);
}

.btn-view {
  background: var(--pwa-primary, #6868ac);
  color: var(--pwa-text-inverse, white);
  border-color: var(--pwa-primary, #6868ac);
}

.btn-restore-single {
  background: var(--md-primary-4, #ffc107);
  color: var(--pwa-text, #212529);
  border-color: var(--md-primary-4, #ffc107);
}

.version-details {
  margin-top: var(--pwa-spacing-lg, 1.5rem);
  padding: var(--pwa-spacing-lg, 1.5rem);
  background: var(--md-neutral-10, #f8f9fa);
  border-radius: 8px;
  border: 1px solid var(--pwa-border, #ddd);
  color: var(--pwa-text, #333);
}

.comparison-result h4,
.version-detail h4 {
  margin-top: 0;
  color: var(--pwa-text, #333);
  font-size: var(--senior-font-size-xl, 1.5rem);
  font-weight: var(--pwa-font-weight-bold, 600);
}

.differences {
  margin: 15px 0;
}

.diff-item {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 4px;
}

.diff-item.added {
  background: #d4edda;
  border-left: 3px solid #28a745;
}

.diff-item.removed {
  background: #f8d7da;
  border-left: 3px solid #dc3545;
}

.diff-item.modified {
  background: #fff3cd;
  border-left: 3px solid #ffc107;
}

.diff-values {
  margin-top: 5px;
  font-size: 0.9em;
}

.old-value, .new-value {
  margin: 2px 0;
  padding: 5px;
  background: rgba(255,255,255,0.5);
  border-radius: 3px;
}

.detail-data pre {
  background: white;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.8em;
}

.btn-close-details {
  background: var(--md-secondary-1, #6c757d);
  color: var(--pwa-text-inverse, white);
  border: none;
  padding: var(--pwa-spacing-sm, 0.5rem) var(--pwa-spacing-md, 1rem);
  border-radius: 4px;
  cursor: pointer;
  margin-top: var(--pwa-spacing-md, 1rem);
  font-family: var(--pwa-font-family, 'Noto Sans TC', sans-serif);
  font-size: var(--senior-font-size-base, 1.125rem);
  transition: var(--pwa-transition-duration, 0.3s) var(--pwa-transition-timing, ease);
}

.btn-close-details:hover {
  background: var(--md-secondary-2, #5a6268);
}

.no-versions {
  text-align: center;
  padding: var(--pwa-spacing-xl, 2rem);
  color: var(--pwa-text-secondary, #666);
  font-style: italic;
  font-size: var(--senior-font-size-lg, 1.25rem);
}

.version-message {
  padding: var(--pwa-spacing-sm, 0.5rem) var(--pwa-spacing-md, 1rem);
  border-radius: 4px;
  margin-bottom: var(--pwa-spacing-md, 1rem);
  font-family: var(--pwa-font-family, 'Noto Sans TC', sans-serif);
  font-size: var(--senior-font-size-base, 1.125rem);
}

.version-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-left: 3px solid #dc3545;
}

.version-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  border-left: 3px solid #28a745;
}

@media (max-width: 768px) {
  .version-item {
    grid-template-columns: auto 1fr;
    gap: 10px;
  }
  
  .version-actions-inline {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
    margin-top: 10px;
  }
  
  .version-stats {
    flex-direction: column;
    gap: 5px;
  }
}
`;

// 注入樣式
if (typeof document !== 'undefined' && !document.getElementById('version-history-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'version-history-styles';
  styleSheet.textContent = versionHistoryStyles;
  document.head.appendChild(styleSheet);
}

// 匯出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VersionHistory;
} else if (typeof window !== 'undefined') {
  window.VersionHistory = VersionHistory;
}