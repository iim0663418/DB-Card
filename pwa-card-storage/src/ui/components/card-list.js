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
      this.showLoading();
      
      if (!this.storage) {
        throw new Error('Storage not available');
      }
      
      const cards = await this.storage.listCards();
      
      this.cards = cards;
      this.filteredCards = [...cards];
      
      this.renderCards();
      this.hideLoading();
      
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
        
        // 安全提取搜尋文字，處理可能是物件的欄位
        const extractText = (field) => {
          if (!field) return '';
          if (typeof field === 'string') return field;
          if (typeof field === 'object' && field.zh) return field.zh;
          return String(field);
        };
        
        const searchableText = [
          extractText(card.data.name),
          extractText(card.data.title),
          extractText(card.data.email),
          extractText(card.data.organization),
          extractText(card.data.department)
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
    const displayName = this.getDisplayName(card.data);
    const displayTitle = this.getDisplayTitle(card.data);
    const displayGreetings = this.getDisplayGreetings(card.data);
    const typeLabel = this.getTypeLabel(card.type);
    const lastModified = this.formatDate(card.modified);
    
    // 組織資訊顯示（修復雙語版邏輯）
    const orgInfo = [];
    const safeGetText = (field) => {
      if (!field) return '';
      if (typeof field === 'string') {
        // 處理雙語格式 "中文~English"
        if (field.includes('~')) {
          const [chinese] = field.split('~');
          return chinese ? chinese.trim() : '';
        }
        return field.trim();
      }
      if (typeof field === 'object' && field !== null) {
        if (field.zh) return field.zh;
        if (field.en) return field.en;
        // 提取第一個有效字串值
        const firstValue = Object.values(field).find(v => v && typeof v === 'string');
        if (firstValue) return firstValue;
        return ''; // 避免 [object Object]
      }
      const stringValue = String(field);
      return stringValue === '[object Object]' ? '' : stringValue;
    };
    
    // 根據名片類型決定組織資訊顯示邏輯
    let orgText = '';
    if (card.type === 'bilingual' || card.type === 'bilingual1' || card.type === 'index' || card.type === 'index1') {
      // 政府機關版本：強制使用預設組織名稱
      orgText = '數位發展部';
    } else if (card.type === 'en' || card.type === 'en1') {
      // 英文版本：使用英文組織名稱
      orgText = 'Ministry of Digital Affairs';
    } else {
      // 個人版本：使用實際的組織資訊
      orgText = safeGetText(card.data.organization);
    }
    
    const deptText = safeGetText(card.data.department);
    
    if (orgText) orgInfo.push(orgText);
    if (deptText) orgInfo.push(deptText);
    const orgDisplay = orgInfo.join(' · ');
    
    return `
      <div class="card-item" data-card-id="${card.id}">
        <div class="card-content">
          <div class="card-main">
            <div class="card-identity">
              <div class="card-avatar">
                ${card.data.avatar ? 
                  `<img src="${card.data.avatar}" alt="${displayName}" class="avatar-image">` :
                  `<div class="avatar-placeholder">${displayName.charAt(0)}</div>`
                }
              </div>
              
              <div class="card-info">
                <h3 class="card-name">${displayName}</h3>
                ${displayTitle ? `<p class="card-title">${displayTitle}</p>` : ''}
                ${orgDisplay ? `<p class="card-org">${orgDisplay}</p>` : ''}
              </div>
            </div>
            
            <div class="card-type-badge">
              <span class="type-label">${typeLabel}</span>
            </div>
          </div>
          
          ${displayGreetings ? `
            <div class="card-greeting">
              <span class="greeting-text">"${displayGreetings}"</span>
            </div>
          ` : ''}
          
          <div class="card-contact">
            ${card.data.email ? `
              <div class="contact-item">
                <span class="contact-icon">📧</span>
                <span class="contact-text">${String(card.data.email).trim()}</span>
              </div>
            ` : ''}
            ${card.data.phone ? `
              <div class="contact-item">
                <span class="contact-icon">📞</span>
                <span class="contact-text">${String(card.data.phone).trim()}</span>
              </div>
            ` : ''}
            ${card.data.website ? `
              <div class="contact-item">
                <span class="contact-icon">🌐</span>
                <span class="contact-text">${card.data.website}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="card-footer">
            <div class="card-meta">
              <span class="card-date">儲存於 ${lastModified}</span>
            </div>
            
            <div class="card-actions">
              <button class="action-btn primary" data-action="view" title="檢視詳細資訊">
                <span class="action-icon">👁️</span>
                <span class="action-text">檢視</span>
              </button>
              <button class="action-btn secondary" data-action="qr" title="產生 QR 碼分享">
                <span class="action-icon">📱</span>
                <span class="action-text">分享</span>
              </button>
              <button class="action-btn secondary" data-action="vcard" title="下載為通訊錄格式">
                <span class="action-icon">📇</span>
                <span class="action-text">下載</span>
              </button>
              <button class="action-btn danger" data-action="delete" title="刪除此名片">
                <span class="action-icon">🗑️</span>
                <span class="action-text">刪除</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderEmptyState() {
    const hasFilter = this.currentFilter.searchTerm || this.currentFilter.type;
    
    if (hasFilter) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>沒有找到符合條件的名片</h3>
          <p>請嘗試調整搜尋關鍵字或篩選條件</p>
          <div class="empty-actions">
            <button class="btn btn-secondary" data-action="clear-filters">
              清除篩選條件
            </button>
          </div>
        </div>
      `;
    } else {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-illustration">
            <div class="empty-icon">📇</div>
            <div class="empty-cards">
              <div class="ghost-card"></div>
              <div class="ghost-card"></div>
              <div class="ghost-card"></div>
            </div>
          </div>
          <h3>還沒有儲存任何名片</h3>
          <p>匯入您的第一張數位名片，開始建立您的名片收藏</p>
          <div class="empty-actions">
            <button class="btn btn-primary" data-action="navigate-import">
              <span class="btn-icon">📥</span>
              開始匯入名片
            </button>

          </div>
          <div class="empty-tips">
            <h4>💡 小提示</h4>
            <ul>
              <li>支援從 URL 連結匯入名片</li>

              <li>支援匯入 JSON 和 vCard 檔案</li>
            </ul>
          </div>
        </div>
      `;
    }
    
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
        case 'delete':
          await this.deleteCard(cardId);
          break;
        default:
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
    try {
      if (!cardData || !cardData.name) return '未知姓名';
      
      const name = cardData.name;
      
      // 處理物件格式
      if (typeof name === 'object' && name !== null) {
        return name.zh || name.en || '未知姓名';
      }
      
      // 處理字串格式
      if (typeof name === 'string') {
        if (name.indexOf('~') !== -1) {
          const parts = name.split('~');
          return parts[0] ? parts[0].trim() : '未知姓名';
        }
        return name.trim() || '未知姓名';
      }
      
      return String(name) || '未知姓名';
    } catch (error) {
      return '未知姓名';
    }
  }

  getDisplayTitle(cardData) {
    try {
      if (!cardData || !cardData.title) return '';
      
      const title = cardData.title;
      
      // 處理物件格式
      if (typeof title === 'object' && title !== null) {
        return title.zh || title.en || '';
      }
      
      // 處理字串格式
      if (typeof title === 'string') {
        if (title.indexOf('~') !== -1) {
          const parts = title.split('~');
          return parts[0] ? parts[0].trim() : '';
        }
        return title.trim();
      }
      
      return String(title) || '';
    } catch (error) {
      return '';
    }
  }

  getDisplayGreetings(cardData) {
    if (!cardData || !cardData.greetings) {
      return '';
    }
    
    if (Array.isArray(cardData.greetings) && cardData.greetings.length > 0) {
      const firstGreeting = cardData.greetings[0];
      
      // 使用與儲存層一致的提取邏輯
      const result = this.processGreetingItem(firstGreeting);
      return result;
    }
    return '';
  }

  processGreetingItem(greeting) {
    if (!greeting) return '';
    
    if (typeof greeting === 'string') {
      const trimmed = greeting.trim();
      if (!trimmed) return '';
      
      // 過濾掉無效的字串
      if (trimmed === '[object Object]' || 
          trimmed === 'undefined' || 
          trimmed === 'null' ||
          trimmed === '[object Undefined]' ||
          trimmed === '[object Null]') {
        return '';
      }
      
      // 處理雙語格式 "中文~English"
      if (trimmed.includes('~')) {
        const [chinese] = trimmed.split('~');
        return chinese ? chinese.trim() : '';
      }
      return trimmed;
    }
    
    if (typeof greeting === 'object' && greeting !== null) {
      // 只處理標準的雙語物件格式 {zh: "中文", en: "English"}
      if (greeting.zh && typeof greeting.zh === 'string') {
        const trimmed = greeting.zh.trim();
        if (trimmed && trimmed !== '[object Object]') return trimmed;
      }
      if (greeting.en && typeof greeting.en === 'string') {
        const trimmed = greeting.en.trim();
        if (trimmed && trimmed !== '[object Object]') return trimmed;
      }
      
      // 不提取任意物件的值，只接受標準格式
      return '';
    }
    
    return '';
  }

  getTypeLabel(type) {
    const typeLabels = {
      'index': '機關版-延平大樓',
      'index1': '機關版-新光大樓',
      'personal': '個人版',
      'bilingual': '雙語版-延平',
      'bilingual1': '雙語版-新光',
      'personal-bilingual': '個人雙語版',
      'en': '英文版-延平',
      'en1': '英文版-新光',
      'personal-en': '個人英文版'
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
    

    
    const clearFiltersBtn = this.container.querySelector('[data-action="clear-filters"]');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        // 清除篩選條件
        const searchInput = document.getElementById('card-search');
        const filterSelect = document.getElementById('card-filter');
        
        if (searchInput) searchInput.value = '';
        if (filterSelect) filterSelect.value = '';
        
        this.currentFilter = {};
        this.filteredCards = [...this.cards];
        this.renderCards();
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