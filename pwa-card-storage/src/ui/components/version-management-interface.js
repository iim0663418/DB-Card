/**
 * Version Management Interface with moda Design System Integration
 * 整合 moda 設計系統的版本管理介面
 */

import { modaDesign } from '../../core/moda-design-integration.js';
import { languageOptimizer } from '../../core/language-performance-optimizer.js';

export class VersionManagementInterface {
  constructor(storage, versionManager) {
    this.storage = storage;
    this.versionManager = versionManager;
    this.currentModal = null;
    this.currentLanguage = 'zh';
    
    // 載入 moda 樣式
    this.loadModaStyles();
    
    // 註冊語言變更觀察者
    if (window.languageManager) {
      window.languageManager.addObserver((lang) => {
        this.currentLanguage = lang;
        this.updateModalLanguage();
      });
    }
  }

  /**
   * 載入 moda 設計系統樣式
   */
  loadModaStyles() {
    const existingLink = document.querySelector('link[href*="moda-version-management.css"]');
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'assets/styles/moda-version-management.css';
      document.head.appendChild(link);
    }
  }

  /**
   * 顯示版本管理對話框
   */
  async showVersionDialog(cardId, card) {
    try {
      const versions = await this.versionManager.getVersionHistory(cardId);
      const modalContent = this.createVersionModalContent(card, versions);
      
      this.currentModal = modaDesign.createModaModal(
        this.getLocalizedText('versionManagement'),
        modalContent
      );
      
      this.setupModalEventListeners(cardId);
      document.body.appendChild(this.currentModal);
      
      // 設置焦點管理
      this.setupFocusManagement();
      
    } catch (error) {
      console.error('[VersionManagementInterface] Show dialog failed:', error);
      this.showError(this.getLocalizedText('operationFailed'));
    }
  }

  /**
   * 創建版本管理模態框內容
   */
  createVersionModalContent(card, versions) {
    const currentVersion = versions.find(v => v.isCurrent) || versions[0];
    
    return `
      <div class="version-management-container">
        <div class="current-card-info">
          <h3>${this.getLocalizedText('currentVersion')}</h3>
          <div class="version-item">
            <div class="version-item-header">
              <span class="version-number">v${currentVersion?.version || '1.0'}</span>
              <span class="status-indicator status-current">
                ${this.getLocalizedText('current')}
              </span>
            </div>
            <div class="version-date">
              ${this.formatDate(currentVersion?.createdAt || card.createdAt)}
            </div>
            <div class="card-preview">
              <strong>${card.data.name || ''}</strong>
              ${card.data.title ? `<br><span class="card-title">${card.data.title}</span>` : ''}
            </div>
          </div>
        </div>
        
        <div class="version-history-section">
          <h3>${this.getLocalizedText('versionHistory')}</h3>
          <div class="version-list">
            ${this.createVersionList(versions)}
          </div>
        </div>
        
        <div class="version-actions-section">
          <div class="version-actions">
            <button class="moda-btn moda-btn-secondary" data-action="cleanup">
              🧹 ${this.getLocalizedText('cleanupVersions')}
            </button>
            <button class="moda-btn moda-btn-secondary" data-action="export">
              📤 ${this.getLocalizedText('exportVersions')}
            </button>
            <button class="moda-btn moda-btn-primary" data-action="close">
              ${this.getLocalizedText('close')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 創建版本列表
   */
  createVersionList(versions) {
    if (!versions || versions.length === 0) {
      return `<div class="empty-state">${this.getLocalizedText('noVersionsFound')}</div>`;
    }

    return versions.map(version => `
      <div class="version-item" data-version-id="${version.id}">
        <div class="version-item-header">
          <span class="version-number">v${version.version}</span>
          <span class="version-date">${this.formatDate(version.createdAt)}</span>
        </div>
        <div class="version-details">
          <div class="version-changes">
            ${this.getVersionChanges(version)}
          </div>
        </div>
        <div class="version-actions">
          <button class="moda-btn moda-btn-secondary" data-action="view" data-version-id="${version.id}">
            👁️ ${this.getLocalizedText('viewVersion')}
          </button>
          ${!version.isCurrent ? `
            <button class="moda-btn moda-btn-success" data-action="restore" data-version-id="${version.id}">
              ↩️ ${this.getLocalizedText('restoreVersion')}
            </button>
            <button class="moda-btn moda-btn-danger" data-action="delete" data-version-id="${version.id}">
              🗑️ ${this.getLocalizedText('deleteVersion')}
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  /**
   * 獲取版本變更摘要
   */
  getVersionChanges(version) {
    if (!version.changes || version.changes.length === 0) {
      return `<span class="no-changes">${this.getLocalizedText('noChanges')}</span>`;
    }

    return version.changes.map(change => `
      <div class="change-item">
        <span class="change-type change-${change.type}">${change.type}</span>
        <span class="change-field">${change.field}</span>
      </div>
    `).join('');
  }

  /**
   * 設置模態框事件監聽器
   */
  setupModalEventListeners(cardId) {
    if (!this.currentModal) return;

    // 關閉按鈕
    const closeBtn = this.currentModal.querySelector('.moda-modal-close');
    const closeActionBtn = this.currentModal.querySelector('[data-action="close"]');
    const overlay = this.currentModal.querySelector('.moda-modal-overlay');

    [closeBtn, closeActionBtn, overlay].forEach(element => {
      if (element) {
        element.addEventListener('click', () => this.closeModal());
      }
    });

    // 版本操作按鈕
    this.currentModal.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      const versionId = e.target.dataset.versionId;

      switch (action) {
        case 'view':
          await this.viewVersion(versionId);
          break;
        case 'restore':
          await this.restoreVersion(cardId, versionId);
          break;
        case 'delete':
          await this.deleteVersion(cardId, versionId);
          break;
        case 'cleanup':
          await this.cleanupVersions(cardId);
          break;
        case 'export':
          await this.exportVersions(cardId);
          break;
      }
    });

    // ESC 鍵關閉
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * 設置焦點管理
   */
  setupFocusManagement() {
    if (!this.currentModal) return;

    const focusableElements = this.currentModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // 焦點陷阱
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    this.currentModal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }

  /**
   * 處理鍵盤事件
   */
  handleKeyDown(e) {
    if (e.key === 'Escape' && this.currentModal) {
      this.closeModal();
    }
  }

  /**
   * 檢視版本
   */
  async viewVersion(versionId) {
    try {
      const version = await this.versionManager.getVersion(versionId);
      if (version) {
        // 創建版本預覽模態框
        const previewModal = modaDesign.createModaModal(
          this.getLocalizedText('versionDetails'),
          this.createVersionPreview(version)
        );
        
        document.body.appendChild(previewModal);
        
        // 設置關閉事件
        const closeBtn = previewModal.querySelector('.moda-modal-close');
        const overlay = previewModal.querySelector('.moda-modal-overlay');
        
        [closeBtn, overlay].forEach(element => {
          if (element) {
            element.addEventListener('click', () => {
              previewModal.remove();
            });
          }
        });
      }
    } catch (error) {
      console.error('[VersionManagementInterface] View version failed:', error);
      this.showError(this.getLocalizedText('operationFailed'));
    }
  }

  /**
   * 創建版本預覽內容
   */
  createVersionPreview(version) {
    return `
      <div class="version-preview">
        <div class="version-info">
          <h4>v${version.version}</h4>
          <p>${this.formatDate(version.createdAt)}</p>
        </div>
        <div class="version-data">
          <pre>${JSON.stringify(version.data, null, 2)}</pre>
        </div>
      </div>
    `;
  }

  /**
   * 還原版本
   */
  async restoreVersion(cardId, versionId) {
    try {
      const confirmed = await this.showConfirmDialog(
        this.getLocalizedText('confirmRestore'),
        this.getLocalizedText('restoreVersionWarning')
      );

      if (confirmed) {
        await this.versionManager.restoreVersion(cardId, versionId);
        this.showSuccess(this.getLocalizedText('versionRestored'));
        this.closeModal();
        
        // 重新載入頁面或更新 UI
        if (window.app && window.app.updateStats) {
          await window.app.updateStats();
        }
      }
    } catch (error) {
      console.error('[VersionManagementInterface] Restore version failed:', error);
      this.showError(this.getLocalizedText('operationFailed'));
    }
  }

  /**
   * 刪除版本
   */
  async deleteVersion(cardId, versionId) {
    try {
      const confirmed = await this.showConfirmDialog(
        this.getLocalizedText('confirmDelete'),
        this.getLocalizedText('deleteVersionWarning')
      );

      if (confirmed) {
        await this.versionManager.deleteVersion(cardId, versionId);
        this.showSuccess(this.getLocalizedText('versionDeleted'));
        
        // 重新載入版本列表
        await this.refreshVersionList(cardId);
      }
    } catch (error) {
      console.error('[VersionManagementInterface] Delete version failed:', error);
      this.showError(this.getLocalizedText('operationFailed'));
    }
  }

  /**
   * 清理版本
   */
  async cleanupVersions(cardId) {
    try {
      const result = await this.versionManager.cleanupOldVersions(cardId);
      this.showSuccess(
        this.getLocalizedText('cleanupComplete').replace('{count}', result.deletedCount)
      );
      
      // 重新載入版本列表
      await this.refreshVersionList(cardId);
    } catch (error) {
      console.error('[VersionManagementInterface] Cleanup versions failed:', error);
      this.showError(this.getLocalizedText('operationFailed'));
    }
  }

  /**
   * 匯出版本
   */
  async exportVersions(cardId) {
    try {
      const versions = await this.versionManager.getVersionHistory(cardId);
      const exportData = {
        cardId,
        exportDate: new Date().toISOString(),
        versions
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `card-versions-${cardId}-${Date.now()}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      this.showSuccess(this.getLocalizedText('exportSuccess'));
      
    } catch (error) {
      console.error('[VersionManagementInterface] Export versions failed:', error);
      this.showError(this.getLocalizedText('operationFailed'));
    }
  }

  /**
   * 重新載入版本列表
   */
  async refreshVersionList(cardId) {
    if (!this.currentModal) return;

    try {
      const versions = await this.versionManager.getVersionHistory(cardId);
      const versionList = this.currentModal.querySelector('.version-list');
      
      if (versionList) {
        versionList.innerHTML = this.createVersionList(versions);
      }
    } catch (error) {
      console.error('[VersionManagementInterface] Refresh version list failed:', error);
    }
  }

  /**
   * 更新模態框語言
   */
  async updateModalLanguage() {
    if (!this.currentModal) return;

    const elementsToUpdate = [
      { selector: '.moda-modal-title', key: 'versionManagement' },
      { selector: '[data-action="cleanup"]', key: 'cleanupVersions' },
      { selector: '[data-action="export"]', key: 'exportVersions' },
      { selector: '[data-action="close"]', key: 'close' }
    ];

    const updates = elementsToUpdate.map(({ selector, key }) => {
      const element = this.currentModal.querySelector(selector);
      return {
        element,
        text: this.getLocalizedText(key),
        animate: true
      };
    }).filter(update => update.element);

    await languageOptimizer.batchUpdateElements(updates);
  }

  /**
   * 顯示確認對話框
   */
  async showConfirmDialog(title, message) {
    return new Promise((resolve) => {
      const confirmModal = modaDesign.createModaModal(title, `
        <div class="confirm-dialog">
          <p>${message}</p>
          <div class="confirm-actions">
            <button class="moda-btn moda-btn-danger" data-confirm="true">
              ${this.getLocalizedText('confirm')}
            </button>
            <button class="moda-btn moda-btn-secondary" data-confirm="false">
              ${this.getLocalizedText('cancel')}
            </button>
          </div>
        </div>
      `);

      confirmModal.addEventListener('click', (e) => {
        if (e.target.dataset.confirm !== undefined) {
          const confirmed = e.target.dataset.confirm === 'true';
          confirmModal.remove();
          resolve(confirmed);
        }
      });

      document.body.appendChild(confirmModal);
    });
  }

  /**
   * 顯示成功訊息
   */
  showSuccess(message) {
    if (window.app && window.app.showNotification) {
      window.app.showNotification(message, 'success');
    }
  }

  /**
   * 顯示錯誤訊息
   */
  showError(message) {
    if (window.app && window.app.showNotification) {
      window.app.showNotification(message, 'error');
    }
  }

  /**
   * 關閉模態框
   */
  closeModal() {
    if (this.currentModal) {
      this.currentModal.remove();
      this.currentModal = null;
    }
    
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * 格式化日期
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const isZh = this.currentLanguage === 'zh' || this.currentLanguage === 'zh-TW';
    
    return isZh 
      ? date.toLocaleDateString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
  }

  /**
   * 獲取本地化文字
   */
  getLocalizedText(key) {
    if (window.languageManager) {
      return window.languageManager.getText(key);
    }
    return key;
  }

  /**
   * 清理資源
   */
  cleanup() {
    this.closeModal();
    
    if (window.languageManager) {
      window.languageManager.removeObserver(this.updateModalLanguage);
    }
  }
}