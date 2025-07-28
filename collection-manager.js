/**
 * 名片收藏管理核心功能
 * 整合 QR 掃描、資料解析、收藏管理
 */

class CollectionManager {
  constructor() {
    this.storage = window.pwaStorage;
    this.currentCards = [];
    this.currentFilter = 'all';
    this.currentSort = 'newest';
    this.searchTimeout = null;
    this.renderTimeout = null;
    this.visibleCards = [];
    this.cardHeight = 120;
    this.containerHeight = 0;
    this.scrollTop = 0;
    this.isVirtualScrollEnabled = false;
  }

  // 初始化
  async init() {
    await this.storage.init();
    await this.loadCards();
    this.setupEventListeners();
  }

  // 載入所有名片
  async loadCards() {
    try {
      this.currentCards = await this.storage.getAllCards();
      this.renderCards();
      this.updateStats();
    } catch (error) {
      console.error('載入名片失敗:', error);
      this.showError('載入名片失敗，請重新整理頁面');
    }
  }

  // 從 URL 解析名片資料 (統一格式解析)
  parseCardFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const dataParam = urlObj.searchParams.get('data') || urlObj.searchParams.get('c');
      const format = urlObj.searchParams.get('format');
      
      if (!dataParam) return null;
      
      // 使用與 collection.html 相同的解析邏輯
      return this.parseCardData(dataParam, format || 'auto');
    } catch (error) {
      console.error('解析名片資料失敗:', error);
      return null;
    }
  }
  
  // 統一格式解析函數 - 與 collection.html 保持一致
  parseCardData(dataParam, format = 'auto') {
    try {
      // 1. 嘗試雙語版緊密格式（管道分隔）
      if (format === 'compact' || format === 'auto') {
        try {
          const padding = '='.repeat((4 - dataParam.length % 4) % 4);
          const compact = decodeURIComponent(atob(
            dataParam.replace(/-/g, '+').replace(/_/g, '/') + padding
          ));
          
          if (compact.includes('|')) {
            const parts = compact.split('|');
            
            // 檢查是否為舊版本格式（8個欄位，沒有手機號碼）
            if (parts.length === 8) {
              return {
                name: parts[0] || '',
                title: parts[1] || '',
                department: parts[2] || '',
                email: parts[3] || '',
                phone: parts[4] || '',
                mobile: '', // 舊版本沒有手機號碼
                avatar: parts[5] || '',
                greetings: parts[6] ? parts[6].split(',') : [],
                socialNote: parts[7] || ''
              };
            }
            
            // 新版本格式（9個欄位，包含手機號碼）
            if (parts.length >= 9) {
              return {
                name: parts[0] || '',
                title: parts[1] || '',
                department: parts[2] || '',
                email: parts[3] || '',
                phone: parts[4] || '',
                mobile: parts[5] || '',
                avatar: parts[6] || '',
                greetings: parts[7] ? parts[7].split(',') : [],
                socialNote: parts[8] || ''
              };
            }
          }
        } catch (compactError) {
          console.log('緊密格式解析失敗，嘗試標準格式:', compactError);
        }
      }
      
      // 2. 嘗試標準 JSON + Base64 格式
      if (format === 'json' || format === 'auto') {
        try {
          const urlDecodedData = decodeURIComponent(dataParam);
          const base64DecodedData = atob(urlDecodedData);
          const jsonData = JSON.parse(decodeURIComponent(base64DecodedData));
          
          if (jsonData.data) {
            return jsonData.data;
          }
          return jsonData;
        } catch (jsonError) {
          console.log('JSON 格式解析失敗:', jsonError);
        }
      }
      
      // 3. 嘗試直接 JSON 解析
      if (format === 'direct' || format === 'auto') {
        try {
          const directJson = JSON.parse(decodeURIComponent(dataParam));
          if (directJson.data) {
            return directJson.data;
          }
          return directJson;
        } catch (directError) {
          console.log('直接 JSON 解析失敗:', directError);
        }
      }
      
      return null;
    } catch (error) {
      console.error('所有格式解析都失敗:', error);
      return null;
    }
  }

  // 標準化名片資料格式
  normalizeCardData(cardData) {
    if (!cardData) return null;
    
    // 確保必要欄位存在
    const normalized = {
      name: cardData.name || '',
      title: cardData.title || '',
      department: cardData.department || '',
      organization: cardData.organization || cardData.department || '',
      email: cardData.email || '',
      phone: cardData.phone || '',
      mobile: cardData.mobile || '',
      avatar: cardData.avatar || '',
      address: cardData.address || '',
      greetings: Array.isArray(cardData.greetings) ? cardData.greetings : 
                 (cardData.greetings ? [cardData.greetings] : []),
      socialLinks: cardData.socialLinks || {
        email: cardData.email ? `mailto:${cardData.email}` : '',
        socialNote: cardData.socialNote || ''
      }
    };
    
    // 處理 socialNote 欄位（向下相容）
    if (cardData.socialNote && !normalized.socialLinks.socialNote) {
      normalized.socialLinks.socialNote = cardData.socialNote;
    }
    
    return normalized;
  }

  // 新增名片到收藏（保留向下相容）
  async addCard(cardData, source = 'MANUAL', tags = [], notes = '') {
    return await this.addCardWithValidation(cardData, source, tags, notes);
  }

  // 從 QR 碼新增名片 (支援統一格式)
  async addCardFromQR(qrData) {
    let cardData;
    
    try {
      if (qrData.startsWith('http')) {
        // URL 格式的 QR 碼
        cardData = this.parseCardFromUrl(qrData);
      } else {
        // 直接資料格式的 QR 碼
        cardData = this.parseCardData(qrData, 'auto');
      }
    } catch (error) {
      console.error('QR 碼解析失敗:', error);
    }
    
    if (!cardData) {
      return { success: false, message: 'QR 碼格式不正確或無法解析' };
    }
    
    return await this.addCardWithValidation(cardData, 'QR');
  }

  // 驗證名片資料
  validateCardData(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.name || data.name.trim().length === 0) return false;
    if (data.email && !this.isValidEmail(data.email)) return false;
    if (data.phone && !this.isValidPhone(data.phone)) return false;
    return true;
  }

  // 檢查重複名片
  async checkDuplicate(cardData) {
    const existing = await this.storage.searchCards(cardData.email || cardData.name);
    return existing.some(card => 
      card.data.email === cardData.email || 
      (card.data.name === cardData.name && card.data.title === cardData.title)
    );
  }

  // 帶驗證的新增名片 (支援格式標準化)
  async addCardWithValidation(cardData, source = 'MANUAL', tags = [], notes = '', metadata = {}) {
    try {
      // 標準化資料格式
      let normalizedData = this.normalizeCardData(cardData);
      
      // 自動推斷卡片類型並加入 metadata
      if (!metadata.cardType) {
        metadata.cardType = this.detectCardType(normalizedData, source);
      }
      
      // 驗證資料格式
      if (!this.validateCardData(normalizedData)) {
        return { success: false, message: '名片資料格式不正確' };
      }

      // 檢查重複
      const isDuplicate = await this.checkDuplicate(normalizedData);
      if (isDuplicate) {
        return { success: false, message: '此名片已存在於收藏中' };
      }

      // 新增名片
      const card = await this.storage.addCard(normalizedData, source, tags, notes, metadata);
      this.currentCards.unshift(card);
      this.renderCards();
      this.updateStats();
      
      return { success: true, card: card };
    } catch (error) {
      console.error('新增名片失敗:', error);
      return { success: false, message: '新增名片失敗' };
    }
  }
  
  // 自動偵測卡片類型
  detectCardType(cardData, source) {
    // 根據 source 直接判斷
    const sourceTypeMap = {
      'personal': 'personal',
      'personal-en': 'personal-en',
      'bilingual': 'bilingual',
      'bilingual-personal': 'bilingual-personal',
      'bilingual-xinyi': 'bilingual-xinyi',
      'institutional-en': 'institutional-en',
      'institutional-xinyi': 'institutional-xinyi',
      'institutional-xinyi-en': 'institutional-xinyi-en'
    };
    
    if (sourceTypeMap[source]) {
      return sourceTypeMap[source];
    }
    
    // 根據資料特徵智慧判斷
    const hasEnglishContent = cardData.nameEn || cardData.titleEn || cardData.greetingsEn;
    const isPersonal = !cardData.organization || cardData.organization === '' ||
                       (cardData.address && 
                        cardData.address !== '100057臺北市中正區延平南路143號' && 
                        cardData.address !== '100507臺北市中正區忠孝西路一段66號（17、19樓）');
    const isXinyiBuilding = cardData.address && 
                          (cardData.address.includes('新光大樓') || 
                           cardData.address.includes('忠孝西路一段66號'));
    
    if (hasEnglishContent) {
      if (isPersonal) {
        return 'bilingual-personal';
      } else if (isXinyiBuilding) {
        return 'bilingual-xinyi';
      } else {
        return 'bilingual';
      }
    } else if (isPersonal) {
      return 'personal';
    } else if (isXinyiBuilding) {
      return 'institutional-xinyi';
    }
    
    return 'institutional';
  }

  // 驗證 Email 格式
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // 驗證電話格式
  isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 8;
  }

  // 刪除名片
  async deleteCard(cardId) {
    try {
      await this.storage.deleteCard(cardId);
      this.currentCards = this.currentCards.filter(card => card.id !== cardId);
      this.renderCards();
      this.updateStats();
      return { success: true };
    } catch (error) {
      console.error('刪除名片失敗:', error);
      return { success: false, message: '刪除名片失敗' };
    }
  }

  // 更新名片
  async updateCard(cardId, updates) {
    try {
      const updatedCard = await this.storage.updateCard(cardId, updates);
      const index = this.currentCards.findIndex(card => card.id === cardId);
      if (index !== -1) {
        this.currentCards[index] = updatedCard;
        this.renderCards();
      }
      return { success: true, card: updatedCard };
    } catch (error) {
      console.error('更新名片失敗:', error);
      return { success: false, message: '更新名片失敗' };
    }
  }

  // 搜尋名片（增強版）
  async searchCards(query) {
    try {
      if (!query.trim()) {
        this.currentCards = await this.storage.getAllCards();
      } else {
        this.currentCards = await this.storage.searchCards(query);
      }
      
      // 應用當前篩選和排序
      await this.applyCurrentFilters();
      this.renderCards();
    } catch (error) {
      console.error('搜尋失敗:', error);
      this.showError('搜尋功能發生錯誤');
    }
  }

  // 防抖動搜尋
  debounceSearch(query, delay = 300) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.searchCards(query);
    }, delay);
  }

  // 應用當前篩選條件
  async applyCurrentFilters() {
    // 按來源篩選
    if (this.currentFilter !== 'all') {
      this.currentCards = await this.filterBySource(this.currentFilter);
    }
    
    // 排序
    this.sortCards(this.currentSort);
  }

  // 按來源篩選
  async filterBySource(source) {
    let cards = this.currentCards;
    
    switch (source) {
      case 'recent':
        return this.filterByTimeRange('week');
      case 'qr':
        return cards.filter(card => card.source === 'QR');
      case 'nfc':
        return cards.filter(card => card.source === 'NFC');
      case 'manual':
        return cards.filter(card => card.source === 'MANUAL');
      default:
        return cards;
    }
  }

  // 按時間範圍篩選
  async filterByTimeRange(range) {
    const now = Date.now();
    let cutoff;
    
    switch (range) {
      case 'week':
        cutoff = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoff = now - (30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        cutoff = now - (365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return this.currentCards;
    }
    
    return this.currentCards.filter(card => card.timestamp > cutoff);
  }

  // 篩選名片（增強版）
  async filterCards(filter) {
    try {
      this.currentFilter = filter;
      
      // 重新載入所有名片
      this.currentCards = await this.storage.getAllCards();
      
      // 應用搜尋查詢（如果有）
      const searchQuery = document.getElementById('search-input')?.value.trim();
      if (searchQuery) {
        this.currentCards = await this.storage.searchCards(searchQuery);
      }
      
      // 應用篩選
      this.currentCards = await this.filterBySource(filter);
      
      // 應用排序
      this.sortCards(this.currentSort);
      
      this.renderCards();
    } catch (error) {
      console.error('篩選失敗:', error);
      this.showError('篩選功能發生錯誤');
    }
  }

  // 排序名片（增強版）
  sortCards(sortBy) {
    this.currentSort = sortBy;
    
    switch (sortBy) {
      case 'newest':
        this.currentCards.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        this.currentCards.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'name':
        this.currentCards.sort((a, b) => {
          const nameA = a.data.name.toLowerCase();
          const nameB = b.data.name.toLowerCase();
          return nameA.localeCompare(nameB, 'zh-TW');
        });
        break;
      case 'viewed':
        this.currentCards.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        break;
      case 'company':
        this.currentCards.sort((a, b) => {
          const orgA = (a.data.organization || a.data.department || '').toLowerCase();
          const orgB = (b.data.organization || b.data.department || '').toLowerCase();
          return orgA.localeCompare(orgB, 'zh-TW');
        });
        break;
    }
    
    this.renderCards();
  }

  // 進階搜尋（支援多欄位）
  async advancedSearch(criteria) {
    try {
      let results = await this.storage.getAllCards();
      
      if (criteria.name) {
        results = results.filter(card => 
          card.data.name.toLowerCase().includes(criteria.name.toLowerCase())
        );
      }
      
      if (criteria.title) {
        results = results.filter(card => 
          card.data.title?.toLowerCase().includes(criteria.title.toLowerCase())
        );
      }
      
      if (criteria.company) {
        results = results.filter(card => {
          const org = card.data.organization || card.data.department || '';
          return org.toLowerCase().includes(criteria.company.toLowerCase());
        });
      }
      
      if (criteria.tags && criteria.tags.length > 0) {
        results = results.filter(card => 
          criteria.tags.some(tag => card.tags.includes(tag))
        );
      }
      
      this.currentCards = results;
      this.renderCards();
      
      return results;
    } catch (error) {
      console.error('進階搜尋失敗:', error);
      this.showError('進階搜尋功能發生錯誤');
      return [];
    }
  }

  // 渲染名片列表（效能優化版）
  renderCards() {
    // 防抖動渲染
    clearTimeout(this.renderTimeout);
    this.renderTimeout = setTimeout(() => {
      this.doRenderCards();
    }, 16); // 60fps
  }

  doRenderCards() {
    const container = document.getElementById('cards-container');
    if (!container) return;
    
    if (this.currentCards.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }

    // 大量資料時啟用虛擬捲動
    if (this.currentCards.length > 50) {
      this.enableVirtualScrolling(container);
    } else {
      this.renderAllCards(container);
    }
  }

  renderAllCards(container) {
    const fragment = document.createDocumentFragment();
    this.currentCards.forEach(card => {
      const cardElement = this.createCardElement(card);
      fragment.appendChild(cardElement);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
    this.setupCardInteractions();
    this.lazyLoadImages();
  }

  createCardElement(card) {
    return this.createSecureCardElement(card);
  }

  // 創建安全的名片元素
  createSecureCardElement(card) {
    if (!card || !card.data) return document.createElement('div');
    
    const cardItem = document.createElement('div');
    cardItem.className = 'card-item';
    cardItem.dataset.id = card.id;
    cardItem.style.transition = 'all 0.3s ease';
    
    // 創建卡片標題
    const header = this.createCardHeader(card);
    const meta = this.createCardMeta(card);
    const contact = this.createCardContact(card.data);
    
    cardItem.appendChild(header);
    cardItem.appendChild(meta);
    cardItem.appendChild(contact);
    
    if (card.notes) {
      const notes = this.createCardNotes(card.notes);
      cardItem.appendChild(notes);
    }
    
    return cardItem;
  }

  // 創建卡片標題區域
  createCardHeader(card) {
    const header = document.createElement('div');
    header.className = 'card-header';
    
    // 頭像
    const avatar = this.createCardAvatar(card.data);
    
    // 資訊區域
    const info = document.createElement('div');
    info.className = 'card-info';
    
    const name = document.createElement('h3');
    name.className = 'card-name';
    name.textContent = card.data.name || '無名';
    
    const title = document.createElement('p');
    title.className = 'card-title';
    title.textContent = card.data.title || '';
    
    const org = document.createElement('p');
    org.className = 'card-org';
    org.textContent = card.data.organization || card.data.department || '';
    
    info.appendChild(name);
    info.appendChild(title);
    info.appendChild(org);
    
    // 操作按鈕
    const actions = this.createCardActions(card.id);
    
    header.appendChild(avatar);
    header.appendChild(info);
    header.appendChild(actions);
    
    return header;
  }

  // 創建頭像元素
  createCardAvatar(data) {
    const avatar = document.createElement('div');
    avatar.className = 'card-avatar';
    
    if (data.avatar) {
      const img = document.createElement('img');
      img.src = SecurityUtils.sanitizeUrl(data.avatar);
      img.alt = data.name || '無名';
      img.loading = 'lazy';
      img.addEventListener('error', this.handleAvatarError.bind(this));
      avatar.appendChild(img);
    }
    
    const fallback = document.createElement('div');
    fallback.className = 'avatar-fallback';
    fallback.style.display = data.avatar ? 'none' : 'flex';
    fallback.textContent = (data.name || '無名').charAt(0);
    avatar.appendChild(fallback);
    
    return avatar;
  }

  // 創建操作按鈕
  createCardActions(cardId) {
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'action-btn view-btn';
    viewBtn.title = '查看名片';
    viewBtn.textContent = '👁️ 查看';
    viewBtn.onclick = () => this.viewCard(cardId);
    
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn edit-btn';
    editBtn.title = '編輯名片';
    editBtn.textContent = '✏️ 編輯';
    editBtn.onclick = () => this.editCard(cardId);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.title = '刪除名片';
    deleteBtn.textContent = '🗑️ 刪除';
    deleteBtn.onclick = () => this.confirmDelete(cardId);
    
    actions.appendChild(viewBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    return actions;
  }

  // 創建卡片元數據
  createCardMeta(card) {
    const meta = document.createElement('div');
    meta.className = 'card-meta';
    
    const sourceTag = document.createElement('span');
    sourceTag.className = 'source-tag';
    sourceTag.textContent = `${this.getSourceIcon(card.source)} ${card.source}`;
    
    const timeTag = document.createElement('span');
    timeTag.className = 'time-tag';
    timeTag.textContent = `📅 ${this.formatTimeAgo(card.timestamp)}`;
    
    meta.appendChild(sourceTag);
    meta.appendChild(timeTag);
    
    if (card.viewCount) {
      const viewCount = document.createElement('span');
      viewCount.className = 'view-count';
      viewCount.textContent = `👁️ ${card.viewCount}`;
      meta.appendChild(viewCount);
    }
    
    if (card.tags && card.tags.length > 0) {
      const tags = document.createElement('span');
      tags.className = 'tags';
      card.tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.textContent = `#${tag}`;
        tags.appendChild(tagSpan);
      });
      meta.appendChild(tags);
    }
    
    return meta;
  }

  // 創建聯絡資訊
  createCardContact(data) {
    const contact = document.createElement('div');
    contact.className = 'card-contact';
    
    if (data.email) {
      const emailLink = document.createElement('a');
      emailLink.href = `mailto:${data.email}`;
      emailLink.className = 'contact-link';
      emailLink.title = '發送郵件';
      emailLink.textContent = `📧 ${data.email}`;
      contact.appendChild(emailLink);
    }
    
    if (data.phone) {
      const phoneLink = document.createElement('a');
      phoneLink.href = `tel:${data.phone.replace(/\D/g, '')}`;
      phoneLink.className = 'contact-link';
      phoneLink.title = '撥打電話';
      phoneLink.textContent = `📞 ${data.phone}`;
      contact.appendChild(phoneLink);
    }
    
    if (data.mobile) {
      const mobileLink = document.createElement('a');
      mobileLink.href = `tel:${data.mobile.replace(/\D/g, '')}`;
      mobileLink.className = 'contact-link';
      mobileLink.title = '撥打手機';
      mobileLink.textContent = `📱 ${data.mobile}`;
      contact.appendChild(mobileLink);
    }
    
    return contact;
  }

  // 創建備註區域
  createCardNotes(notes) {
    const notesDiv = document.createElement('div');
    notesDiv.className = 'card-notes';
    
    const small = document.createElement('small');
    small.textContent = `📝 ${notes}`;
    notesDiv.appendChild(small);
    
    return notesDiv;
  }

  // 渲染空狀態 - 安全版本
  renderEmptyState() {
    // 在測試環境中，直接返回預設空狀態
    if (typeof document === 'undefined' || !document.getElementById) {
      return this.createSecureEmptyState('default');
    }
    
    const hasSearch = document.getElementById('search-input')?.value.trim();
    const hasFilter = document.getElementById('filter-select')?.value !== 'all';
    
    if (hasSearch || hasFilter) {
      return this.createSecureEmptyState('search');
    }
    
    return this.createSecureEmptyState('default');
  }

  // 創建安全的空狀態元素
  createSecureEmptyState(type) {
    const container = document.createElement('div');
    container.className = 'empty-state';
    
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = type === 'search' ? '🔍' : '📇';
    
    const title = document.createElement('h3');
    title.textContent = type === 'search' ? '無符合條件的名片' : '尚無收藏的名片';
    
    const desc = document.createElement('p');
    desc.textContent = type === 'search' ? '請嘗試調整搜尋或篩選條件' : '掃描 QR 碼或手動新增名片開始收藏';
    
    container.appendChild(icon);
    container.appendChild(title);
    container.appendChild(desc);
    
    if (type === 'search') {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn btn-primary';
      clearBtn.style.marginTop = '1rem';
      clearBtn.textContent = '清除搜尋';
      clearBtn.onclick = () => {
        document.getElementById('search-input').value = '';
        this.searchCards('');
      };
      container.appendChild(clearBtn);
    } else {
      const btnContainer = document.createElement('div');
      btnContainer.style.marginTop = '1rem';
      
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-primary';
      addBtn.textContent = '➕ 新增名片';
      addBtn.onclick = () => showAddDialog();
      
      const scanBtn = document.createElement('button');
      scanBtn.className = 'btn btn-primary';
      scanBtn.style.marginLeft = '0.5rem';
      scanBtn.textContent = '📱 掃描 QR';
      scanBtn.onclick = () => showQRScanner();
      
      btnContainer.appendChild(addBtn);
      btnContainer.appendChild(scanBtn);
      container.appendChild(btnContainer);
    }
    
    return container.outerHTML;
  }

  // 設定名片互動功能
  setupCardInteractions() {
    // 設定頭像錯誤處理
    document.querySelectorAll('.card-avatar img').forEach(img => {
      img.addEventListener('error', this.handleAvatarError.bind(this));
    });
    
    // 設定 hover 效果
    document.querySelectorAll('.card-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.style.transform = 'translateY(-2px)';
        item.style.boxShadow = '0 8px 25px rgba(104,104,172,0.15)';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.transform = 'translateY(0)';
        item.style.boxShadow = '';
      });
    });
  }

  // 處理頭像載入錯誤
  handleAvatarError(event) {
    const img = event.target;
    const fallback = img.parentElement.querySelector('.avatar-fallback');
    if (fallback) {
      img.style.display = 'none';
      fallback.style.display = 'flex';
    }
  }

  // 格式化聯絡連結
  formatContactLinks(data) {
    if (!data) return '';
    
    const links = [];
    
    if (data.email) {
      links.push(`<a href="mailto:${data.email}" class="contact-link" title="發送郵件">📧 ${this.escapeHtml(data.email)}</a>`);
    }
    
    if (data.phone) {
      const cleanPhone = data.phone.replace(/\D/g, '');
      links.push(`<a href="tel:${cleanPhone}" class="contact-link" title="撥打電話">📞 ${this.escapeHtml(data.phone)}</a>`);
    }
    
    if (data.mobile) {
      const cleanMobile = data.mobile.replace(/\D/g, '');
      links.push(`<a href="tel:${cleanMobile}" class="contact-link" title="撥打手機">📱 ${this.escapeHtml(data.mobile)}</a>`);
    }
    
    return links.join('');
  }

  // 渲染單張名片項目
  renderCardItem(card) {
    if (!card || !card.data) return '';
    
    const data = card.data;
    const timeAgo = this.formatTimeAgo(card.timestamp);
    const sourceIcon = this.getSourceIcon(card.source);
    const contactLinks = this.formatContactLinks(data);
    const nameInitial = (data.name || '無名').charAt(0);
    
    return `
      <div class="card-item" data-id="${card.id}" style="transition: all 0.3s ease;">
        <div class="card-header">
          <div class="card-avatar">
            ${data.avatar ? `<img src="${data.avatar}" alt="${data.name || '無名'}" loading="lazy">` : ''}
            <div class="avatar-fallback" style="${data.avatar ? 'display:none' : 'display:flex'}">${nameInitial}</div>
          </div>
          <div class="card-info">
            <h3 class="card-name">${this.escapeHtml(data.name)}</h3>
            <p class="card-title">${this.escapeHtml(data.title || '')}</p>
            <p class="card-org">${this.escapeHtml(data.organization || data.department || '')}</p>
          </div>
          <div class="card-actions">
            <button class="action-btn view-btn" onclick="collectionManager.viewCard('${card.id}')" title="查看名片">
              👁️ 查看
            </button>
            <button class="action-btn edit-btn" onclick="collectionManager.editCard('${card.id}')" title="編輯名片">
              ✏️ 編輯
            </button>
            <button class="action-btn delete-btn" onclick="collectionManager.confirmDelete('${card.id}')" title="刪除名片">
              🗑️ 刪除
            </button>
          </div>
        </div>
        <div class="card-meta">
          <span class="source-tag">${sourceIcon} ${card.source}</span>
          <span class="time-tag">📅 ${timeAgo}</span>
          ${card.viewCount ? `<span class="view-count">👁️ ${card.viewCount}</span>` : ''}
          ${card.tags && card.tags.length > 0 ? `<span class="tags">${card.tags.map(tag => `<span class="tag">#${this.escapeHtml(tag)}</span>`).join('')}</span>` : ''}
        </div>
        <div class="card-contact">
          ${contactLinks}
        </div>
        ${card.notes ? `<div class="card-notes"><small>📝 ${this.escapeHtml(card.notes)}</small></div>` : ''}
      </div>
    `;
  }

  // 取得來源圖示
  getSourceIcon(source) {
    const icons = {
      'QR': '📱',
      'NFC': '📡',
      'MANUAL': '✏️'
    };
    return icons[source] || '📇';
  }

  // 格式化時間
  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    if (hours < 24) return `${hours} 小時前`;
    if (days < 7) return `${days} 天前`;
    return new Date(timestamp).toLocaleDateString();
  }

  // 更新統計資料
  async updateStats() {
    try {
      const stats = await this.storage.getStats();
      const statsContainer = document.getElementById('stats-container');
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="stat-item">
            <div class="stat-number">${stats.total}</div>
            <div class="stat-label">總收藏</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${stats.thisWeek}</div>
            <div class="stat-label">本週新增</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${Object.keys(stats.sources).length}</div>
            <div class="stat-label">來源類型</div>
          </div>
        `;
      }
    } catch (error) {
      console.error('更新統計失敗:', error);
    }
  }

  // 查看名片詳情
  viewCard(cardId) {
    const card = this.currentCards.find(c => c.id === cardId);
    if (card) {
      // 生成名片 URL 並開啟
      const cardUrl = this.generateCardUrl(card.data, card.source, card.metadata);
      window.open(cardUrl, '_blank');
      
      // 更新查看次數
      this.updateViewCount(cardId);
    }
  }

  // 生成名片 URL（智慧型）
  generateCardUrl(cardData, source = 'MANUAL', metadata = {}) {
    const data = { data: cardData };
    const jsonString = JSON.stringify(data);
    const base64Data = btoa(encodeURIComponent(jsonString));
    // 不需要再次進行 URL 編碼，因為 URL 參數會自動處理
    const encodedData = base64Data;
    
    // 根據來源和元數據決定使用哪個介面
    let interfacePath = '/index.html';
    
    // 檢查來源類型
    switch (source) {
      case 'personal':
        interfacePath = '/index-personal.html';
        break;
      case 'personal-en':
        interfacePath = '/index-personal-en.html';
        break;
      case 'bilingual':
        interfacePath = '/index-bilingual.html';
        break;
      case 'bilingual-personal':
        interfacePath = '/index-bilingual-personal.html';
        break;
      case 'bilingual-xinyi':
        interfacePath = '/index1-bilingual.html';
        break;
      case 'institutional-en':
        interfacePath = '/index-en.html';
        break;
      case 'institutional-xinyi':
        interfacePath = '/index1.html';
        break;
      case 'institutional-xinyi-en':
        interfacePath = '/index1-en.html';
        break;
      default:
        // 智慧判斷邏輯
        if (metadata && metadata.cardType) {
          switch (metadata.cardType) {
            case 'personal':
              interfacePath = '/index-personal.html';
              break;
            case 'personal-en':
              interfacePath = '/index-personal-en.html';
              break;
            case 'bilingual':
              interfacePath = '/index-bilingual.html';
              break;
            case 'bilingual-personal':
              interfacePath = '/index-bilingual-personal.html';
              break;
            case 'bilingual-xinyi':
              interfacePath = '/index1-bilingual.html';
              break;
            case 'institutional-en':
              interfacePath = '/index-en.html';
              break;
            case 'institutional-xinyi':
              interfacePath = '/index1.html';
              break;
            case 'institutional-xinyi-en':
              interfacePath = '/index1-en.html';
              break;
          }
        } else {
          // 基於資料內容的智慧判斷
          const hasEnglishContent = cardData.nameEn || cardData.titleEn || cardData.greetingsEn;
          const isPersonal = !cardData.organization || cardData.organization === '' ||
                           (cardData.address && 
                            cardData.address !== '100057臺北市中正區延平南路143號' && 
                            cardData.address !== '100507臺北市中正區忠孝西路一段66號（17、19樓）');
          const isXinyiBuilding = cardData.address && 
                                (cardData.address.includes('新光大樓') || 
                                 cardData.address.includes('忠孝西路一段66號'));
          
          if (hasEnglishContent) {
            if (isPersonal) {
              interfacePath = '/index-bilingual-personal.html';
            } else if (isXinyiBuilding) {
              interfacePath = '/index1-bilingual.html';
            } else {
              interfacePath = '/index-bilingual.html';
            }
          } else if (isPersonal) {
            interfacePath = '/index-personal.html';
          } else if (isXinyiBuilding) {
            interfacePath = '/index1.html';
          }
          // 預設為 /index.html（延平大樓機關版）
        }
    }
    
    return `${window.location.origin}${interfacePath}?data=${encodedData}`;
  }
  
  // 更新查看次數
  async updateViewCount(cardId) {
    try {
      const card = this.currentCards.find(c => c.id === cardId);
      if (card) {
        const newViewCount = (card.viewCount || 0) + 1;
        await this.updateCard(cardId, { viewCount: newViewCount });
      }
    } catch (error) {
      console.error('更新查看次數失敗:', error);
    }
  }

  // 編輯名片
  editCard(cardId) {
    // 開啟編輯對話框
    this.showEditDialog(cardId);
  }

  // 確認刪除
  confirmDelete(cardId) {
    const card = this.currentCards.find(c => c.id === cardId);
    if (card && confirm(`確定要刪除 ${card.data.name} 的名片嗎？`)) {
      this.deleteCard(cardId);
    }
  }

  // 顯示錯誤訊息
  showError(message) {
    // 簡單的錯誤提示
    alert(message);
  }

  // 設定事件監聽器（增強版）
  setupEventListeners() {
    // 搜尋功能 - 防抖動處理
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.debounceSearch(e.target.value);
      });
      
      // 支援 Enter 鍵即時搜尋
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(this.searchTimeout);
          this.searchCards(e.target.value);
        }
      });
    }
    
    // 篩選功能
    const filterSelect = document.getElementById('filter-select');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.filterCards(e.target.value);
      });
    }
    
    // 排序功能
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortCards(e.target.value);
      });
    }
    
    // 鍵盤快速鍵支援
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            searchInput?.focus();
            break;
          case 'n':
            e.preventDefault();
            showAddDialog();
            break;
        }
      }
    });
  }

  // 顯示編輯對話框
  showEditDialog(cardId) {
    // 簡化版編輯功能
    const card = this.currentCards.find(c => c.id === cardId);
    if (!card) return;
    
    const newNotes = prompt('編輯備註:', card.notes || '');
    if (newNotes !== null) {
      this.updateCard(cardId, { notes: newNotes });
    }
  }

  // HTML 轉義函數 - 使用安全工具
  escapeHtml(text) {
    return SecurityUtils.sanitizeText(text);
  }

  // 顯示載入狀態（改善版）
  showLoading() {
    const container = document.getElementById('cards-container');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="loading-spinner"></div>
          <h3>載入中...</h3>
          <p>正在載入您的名片收藏</p>
        </div>
      `;
    }
  }

  // 圖片懶載入
  lazyLoadImages() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  // 虛擬捲動
  enableVirtualScrolling(container) {
    this.isVirtualScrollEnabled = true;
    this.containerHeight = container.clientHeight || 600;
    
    const visibleCount = Math.ceil(this.containerHeight / this.cardHeight) + 2;
    const startIndex = Math.floor(this.scrollTop / this.cardHeight);
    const endIndex = Math.min(startIndex + visibleCount, this.currentCards.length);
    
    this.visibleCards = this.currentCards.slice(startIndex, endIndex);
    
    const totalHeight = this.currentCards.length * this.cardHeight;
    const offsetY = startIndex * this.cardHeight;
    
    container.innerHTML = `
      <div style="height: ${totalHeight}px; position: relative;">
        <div style="transform: translateY(${offsetY}px);">
          ${this.visibleCards.map(card => this.renderCardItem(card)).join('')}
        </div>
      </div>
    `;
    
    this.setupVirtualScrollListener(container);
    this.setupCardInteractions();
  }

  setupVirtualScrollListener(container) {
    container.addEventListener('scroll', () => {
      this.scrollTop = container.scrollTop;
      this.renderCards();
    }, { passive: true });
  }

  // IndexedDB 查詢優化
  async optimizeIndexedDBQueries() {
    // 批量讀取優化
    const batchSize = 100;
    const allCards = [];
    let cursor = null;
    
    try {
      const transaction = this.storage.db.transaction(['cards'], 'readonly');
      const store = transaction.objectStore('cards');
      const request = store.openCursor();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          cursor = event.target.result;
          if (cursor) {
            allCards.push(cursor.value);
            if (allCards.length < batchSize) {
              cursor.continue();
            } else {
              resolve(allCards);
            }
          } else {
            resolve(allCards);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('查詢優化失敗:', error);
      return [];
    }
  }

  // 記憶體使用監控
  monitorMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      console.log('記憶體使用狀態:', {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      });
      
      // 警告闾值
      if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
        console.warn('記憶體使用量過高，建議清理緩存');
        this.cleanupCache();
      }
    }
  }

  // 清理緩存
  cleanupCache() {
    // 清理過期的搜尋結果
    if (this.currentCards.length > 1000) {
      this.currentCards = this.currentCards.slice(0, 500);
    }
    
    // 強制垃圾回收
    if (window.gc) {
      window.gc();
    }
  }

  // 顯示成功訊息
  showSuccess(message) {
    this.showToast(message, 'success');
  }

  // 顯示錯誤訊息
  showError(message) {
    this.showToast(message, 'error');
  }

  // 顯示提示訊息
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#6868ac'};
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// 全域實例
window.collectionManager = new CollectionManager();