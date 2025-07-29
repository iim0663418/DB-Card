/**
 * 名片列表元件
 * 負責名片的展示、搜尋和基本操作
 */

class CardListComponent {
  constructor(container, cardManagerOrOptions) {
    this.container = container;
    
    // 支援舊版本和新版本初始化
    if (cardManagerOrOptions && cardManagerOrOptions.storage) {
      this.storage = cardManagerOrOptions.storage;
      this.cardManager = cardManagerOrOptions.cardManager || null;
    } else {
      this.cardManager = cardManagerOrOptions;
      this.storage = this.cardManager?.storage || null;
    }
    
    this.cards = [];
    this.filteredCards = [];
    this.currentFilter = {};
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    console.log('[CardList] Component initialized');
  }

  setupEventListeners() {
    // 搜尋功能
    const searchInput = document.getElementById('card-search');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce((e) => {
        this.filterCards({ searchTerm: e.target.value });
      }, 300));
    }

    // 篩選功能
    const filterSelect = document.getElementById('card-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.filterCards({ type: e.target.value });
      });
    }
  }

  async loadCards() {
    try {
      console.log('[CardList] Loading cards...');
      this.showLoading();
      
      if (!this.storage) {
        throw new Error('Storage not available');
      }
      
      const cards = await this.storage.listCards();
      console.log('[CardList] Retrieved cards from storage:', cards);
      
      this.cards = cards;
      this.filteredCards = [...cards];
      
      this.renderCards();
      this.hideLoading();
      
      console.log(`[CardList] Loaded ${cards.length} cards successfully`);
    } catch (error) {
      console.error('[CardList] Load cards failed:', error);
      this.showError('載入名片失敗');
      this.hideLoading();
    }
  }

  filterCards(filter = {}) {
    this.currentFilter = { ...this.currentFilter, ...filter };
    
    this.filteredCards = this.cards.filter(card => {
      // 類型篩選
      if (this.currentFilter.type && card.type !== this.currentFilter.type) {
        return false;
      }
      
      // 搜尋篩選
      if (this.currentFilter.searchTerm) {
        const term = this.currentFilter.searchTerm.toLowerCase();
        const searchableText = [
          card.data.name,
          card.data.title,
          card.data.email,
          card.data.organization,
          card.data.department
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(term)) {
          return false;
        }
      }
      
      return true;
    });
    
    this.renderCards();
  }

  renderCards() {
    if (!this.container) return;

    if (this.filteredCards.length === 0) {
      this.renderEmptyState();
      return;
    }

    const cardsHtml = this.filteredCards.map(card => this.renderCard(card)).join('');
    this.container.innerHTML = cardsHtml;
    
    // 綁定事件
    this.bindCardEvents();
  }

  renderCard(card) {
    console.log('[CardList] renderCard - Full card data:', card);
    console.log('[CardList] renderCard - card.data:', card.data);
    console.log('[CardList] renderCard - card.data.greetings:', card.data.greetings);
    
    const displayName = this.getDisplayName(card.data);
    const displayTitle = this.getDisplayTitle(card.data);
    const displayGreetings = this.getDisplayGreetings(card.data);
    
    console.log('[CardList] renderCard - displayGreetings result:', displayGreetings, typeof displayGreetings);
    
    const typeLabel = this.getTypeLabel(card.type);
    const lastModified = this.formatDate(card.modified);
    
    return `
      <div class="card-item" data-card-id="${card.id}">
        <div class="card-avatar">
          ${card.data.avatar ? 
            `<img src="${card.data.avatar}" alt="${displayName}" class="avatar-image">` :
            `<div class="avatar-placeholder">${displayName.charAt(0)}</div>`
          }
        </div>
        
        <div class="card-info">
          <div class="card-header">
            <h3 class="card-name">${displayName}</h3>
            <span class="card-type">${typeLabel}</span>
          </div>
          
          <div class="card-details">
            ${displayTitle ? `<p class="card-title">${displayTitle}</p>` : ''}
            ${card.data.organization ? `<p class="card-org">${card.data.organization}</p>` : ''}
            ${card.data.email ? `<p class="card-email">${card.data.email}</p>` : ''}

          </div>
          
          <div class="card-meta">
            <span class="card-date">修改於 ${lastModified}</span>
            ${card.isFavorite ? '<span class="card-favorite">⭐</span>' : ''}
          </div>
        </div>
        
        <div class="card-actions">
          <button class="btn btn-icon" data-action="view" title="檢視">
            <span class="icon">👁️</span>
          </button>
          <button class="btn btn-icon" data-action="qr" title="生成 QR 碼">
            <span class="icon">📱</span>
          </button>
          <button class="btn btn-icon" data-action="vcard" title="下載 vCard">
            <span class="icon">📇</span>
          </button>
          <button class="btn btn-icon" data-action="edit" title="編輯">
            <span class="icon">✏️</span>
          </button>
          <button class="btn btn-icon btn-danger" data-action="delete" title="刪除">
            <span class="icon">🗑️</span>
          </button>
        </div>
      </div>
    `;
  }

  renderEmptyState() {
    const hasFilter = this.currentFilter.searchTerm || this.currentFilter.type;
    
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📇</div>
        <h3>${hasFilter ? '沒有符合條件的名片' : '尚未儲存任何名片'}</h3>
        <p>${hasFilter ? '請嘗試調整搜尋條件' : '開始匯入您的第一張數位名片'}</p>
        ${!hasFilter ? `
          <button class="btn btn-primary" data-action="navigate-import">
            匯入名片
          </button>
        ` : ''}
      </div>
    `;
    
    this.bindEmptyStateEvents();
  }

  bindCardEvents() {
    const cardItems = this.container.querySelectorAll('.card-item');
    
    cardItems.forEach(item => {
      const cardId = item.dataset.cardId;
      
      // 點擊名片檢視
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.card-actions')) {
          this.viewCard(cardId);
        }
      });
      
      // 操作按鈕
      const actionButtons = item.querySelectorAll('[data-action]');
      actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = button.dataset.action;
          this.handleCardAction(cardId, action);
        });
      });
    });
  }

  async handleCardAction(cardId, action) {
    try {
      switch (action) {
        case 'view':
          await this.viewCard(cardId);
          break;
        case 'qr':
          await this.generateQR(cardId);
          break;
        case 'vcard':
          await this.exportVCard(cardId);
          break;
        case 'edit':
          await this.editCard(cardId);
          break;
        case 'delete':
          await this.deleteCard(cardId);
          break;
      }
    } catch (error) {
      console.error(`[CardList] Action ${action} failed:`, error);
      this.showNotification(`操作失敗: ${error.message}`, 'error');
    }
  }

  async viewCard(cardId) {
    if (window.app) {
      await window.app.viewCard(cardId);
    }
  }

  async generateQR(cardId) {
    if (window.app) {
      await window.app.generateQR(cardId);
    }
  }

  async exportVCard(cardId) {
    if (window.app) {
      await window.app.exportVCard(cardId);
    }
  }

  async editCard(cardId) {
    this.showNotification('編輯功能開發中', 'info');
  }

  async deleteCard(cardId) {
    if (!confirm('確定要刪除這張名片嗎？此操作無法復原。')) {
      return;
    }

    try {
      if (!this.storage) {
        throw new Error('Storage not available');
      }
      
      await this.storage.deleteCard(cardId);
      await this.loadCards(); // 重新載入列表
      this.showNotification('名片已刪除', 'success');
    } catch (error) {
      console.error('[CardList] Delete card failed:', error);
      this.showNotification('刪除失敗', 'error');
    }
  }

  // 工具方法

  getDisplayName(cardData) {
    if (cardData.name && cardData.name.includes('~')) {
      const [chinese] = cardData.name.split('~');
      return chinese.trim();
    }
    return cardData.name || '未知姓名';
  }

  getDisplayTitle(cardData) {
    if (cardData.title && cardData.title.includes('~')) {
      const [chinese] = cardData.title.split('~');
      return chinese.trim();
    }
    return cardData.title || '';
  }

  getDisplayGreetings(cardData) {
    console.log('[CardList] getDisplayGreetings - input cardData:', cardData);
    console.log('[CardList] getDisplayGreetings - cardData.greetings:', cardData.greetings);
    
    if (!cardData || !cardData.greetings) {
      console.log('[CardList] No greetings data found');
      return '';
    }
    
    if (Array.isArray(cardData.greetings) && cardData.greetings.length > 0) {
      const firstGreeting = cardData.greetings[0];
      console.log('[CardList] First greeting:', firstGreeting, typeof firstGreeting);
      
      if (firstGreeting && typeof firstGreeting === 'object') {
        console.log('[CardList] Object greeting - zh:', firstGreeting.zh, 'en:', firstGreeting.en);
        const result = firstGreeting.zh || firstGreeting.en || '';
        console.log('[CardList] Final result:', result);
        return result;
      }
    }
    
    console.log('[CardList] No valid greeting found, returning empty');
    return '';
  }

  processGreetingItem(greeting) {
    if (!greeting) return '';
    
    if (typeof greeting === 'string') {
      // 處理雙語格式 "中文~English"
      if (greeting.includes('~')) {
        const [chinese] = greeting.split('~');
        return chinese ? chinese.trim() : '';
      }
      return greeting.trim();
    }
    
    if (typeof greeting === 'object' && greeting !== null) {
      // 處理物件格式 {zh: "中文", en: "English"} - 強化版
      if (greeting.zh && typeof greeting.zh === 'string') {
        return greeting.zh.trim();
      } else if (greeting.en && typeof greeting.en === 'string') {
        return greeting.en.trim();
      }
      
      // 提取第一個有效的字串值
      const values = Object.values(greeting);
      for (const value of values) {
        if (value && typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
      
      // 如果都沒有有效字串，返回空字串
      return '';
    }
    
    // 其他類型：嘗試轉換為字串，但避免 [object Object]
    const stringified = String(greeting);
    if (stringified === '[object Object]' || stringified === 'undefined' || stringified === 'null') {
      return '';
    }
    
    return stringified.trim();
  }

  getTypeLabel(type) {
    const typeLabels = {
      'gov-yp': '機關版-延平',
      'gov-sg': '機關版-新光',
      'personal': '個人版',
      'bilingual': '雙語版',
      'personal-bilingual': '個人雙語版',
      'en': '英文版',
      'personal-en': '個人英文版',
      'gov-yp-en': '機關英文版-延平',
      'gov-sg-en': '機關英文版-新光'
    };
    return typeLabels[type] || '未知類型';
  }

  formatDate(date) {
    if (!date) return '未知';
    
    const d = new Date(date);
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  }

  showLoading() {
    if (this.container) {
      this.container.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>載入名片中...</p>
        </div>
      `;
    }
  }

  hideLoading() {
    // Loading state will be replaced by renderCards()
  }

  showError(message) {
    if (this.container) {
      this.container.innerHTML = `
        <div class="error-state">
          <div class="error-icon">❌</div>
          <h3>載入失敗</h3>
          <p>${message}</p>
          <button class="btn btn-primary" data-action="retry-load">
            重試
          </button>
        </div>
      `;
      
      this.bindErrorStateEvents();
    }
  }

  showNotification(message, type = 'info') {
    if (window.app) {
      window.app.showNotification(message, type);
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 公開方法供外部調用

  async refresh() {
    await this.loadCards();
  }

  getSelectedCards() {
    const selectedItems = this.container.querySelectorAll('.card-item.selected');
    return Array.from(selectedItems).map(item => item.dataset.cardId);
  }

  selectAll() {
    const cardItems = this.container.querySelectorAll('.card-item');
    cardItems.forEach(item => item.classList.add('selected'));
  }

  clearSelection() {
    const cardItems = this.container.querySelectorAll('.card-item');
    cardItems.forEach(item => item.classList.remove('selected'));
  }

  bindEmptyStateEvents() {
    const navigateBtn = this.container.querySelector('[data-action="navigate-import"]');
    if (navigateBtn) {
      navigateBtn.addEventListener('click', () => {
        if (window.app) {
          window.app.navigateTo('import');
        }
      });
    }
  }

  bindErrorStateEvents() {
    const retryBtn = this.container.querySelector('[data-action="retry-load"]');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.loadCards();
      });
    }
  }
}

window.CardListComponent = CardListComponent;