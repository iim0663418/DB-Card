/**
 * PWA 名片復現組件
 * 與現有名片頁面完全一致的渲染邏輯
 */

class CardRenderer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      showActions: true,
      enableTypewriter: true,
      language: 'zh',
      ...options
    };
    this.currentCard = null;
    this.typewriterTimeout = null;
  }

  /**
   * 渲染名片 - 支援所有 9 種類型
   */
  render(cardData, cardType = 'personal') {
    this.currentCard = { data: cardData, type: cardType };
    
    // 清空容器
    this.container.innerHTML = '';
    
    // 創建名片結構
    const cardElement = this.createCardStructure(cardData, cardType);
    this.container.appendChild(cardElement);
    
    // 設置資料
    this.populateCardData(cardData, cardType);
    
    // 啟動動畫效果
    if (this.options.enableTypewriter) {
      setTimeout(() => this.startTypewriterEffect(cardData.greetings), 1000);
    }
    
    return cardElement;
  }

  /**
   * 創建名片 HTML 結構
   */
  createCardStructure(cardData, cardType) {
    const showLogo = this.shouldShowLogo(cardType);
    const isBilingual = cardType.includes('bilingual');
    
    const cardHTML = `
      <div class="card">
        ${showLogo ? `
          <div class="logo-section">
            <img src="../assets/moda-logo.svg" alt="moda Logo" class="moda-logo">
          </div>
        ` : ''}
        
        ${isBilingual ? `
          <div class="language-switch">
            <button class="lang-btn" data-action="language-toggle">
              🇺🇸 EN
            </button>
          </div>
        ` : ''}
        
        <div class="avatar-section">
          <img class="avatar hidden" alt="">
        </div>
        
        <h1 class="name"></h1>
        <p class="title"></p>
        <p class="department"></p>
        
        <div class="greeting">歡迎認識我！</div>
        
        <div class="contact-info">
          <div class="contact-title">聯絡資訊</div>
          <div class="contact-item">
            <span class="contact-icon">📧</span>
            <span class="contact-text">
              <a class="contact-link email-link" href=""></a>
            </span>
          </div>
          <div class="contact-item phone-item">
            <span class="contact-icon">📞</span>
            <span class="contact-text">
              <a class="contact-link phone-link" href=""></a>
            </span>
          </div>
          <div class="contact-item mobile-item">
            <span class="contact-icon">📱</span>
            <span class="contact-text">
              <a class="contact-link mobile-link" href=""></a>
            </span>
          </div>
          <div class="contact-item">
            <span class="contact-icon">🏢</span>
            <span class="contact-text organization"></span>
          </div>
          <div class="contact-item">
            <span class="contact-icon">📍</span>
            <span class="contact-text address"></span>
          </div>
        </div>
        
        <div class="social-info hidden">
          <div class="social-info-title">🔗 社群連結</div>
          <div class="social-info-content"></div>
        </div>
        
        ${this.options.showActions ? `
          <div class="action-section">
            <button class="download-btn vcard-btn">📱 加入聯絡人</button>
            <button class="download-btn qr-btn">📱 生成 QR 碼</button>
          </div>
        ` : ''}
      </div>
    `;
    
    const wrapper = document.createElement('div');
    wrapper.innerHTML = cardHTML;
    return wrapper.firstElementChild;
  }

  /**
   * PWA-35: 填充名片資料 - 支援雙語欄位
   */
  populateCardData(cardData, cardType) {
    const card = this.container.querySelector('.card');
    
    // PWA-35: 基本資訊 - 支援雙語顯示
    card.querySelector('.name').textContent = this.displayBilingualField(cardData.name, this.options.language);
    card.querySelector('.title').textContent = this.displayBilingualField(cardData.title, this.options.language);
    card.querySelector('.department').textContent = this.displayBilingualField(cardData.department, this.options.language);
    
    // 頭像處理
    this.setupAvatar(card, cardData.avatar, this.displayBilingualField(cardData.name, this.options.language));
    
    // 聯絡資訊
    this.setupContactInfo(card, cardData);
    
    // PWA-35: 組織和地址 - 支援雙語顯示
    this.setupOrganizationInfo(card, cardData, cardType);
    
    // PWA-35: 社群媒體 - 支援雙語顯示
    this.setupSocialInfo(card, cardData);
    
    // 動作按鈕
    if (this.options.showActions) {
      this.setupActionButtons(card, cardData);
    }
  }
  
  /**
   * PWA-35: 雙語欄位顯示輔助方法
   */
  displayBilingualField(fieldData, currentLang) {
    if (typeof fieldData === 'object' && fieldData && fieldData.zh && fieldData.en) {
      return currentLang === 'en' ? fieldData.en : fieldData.zh;
    }
    
    // 向下相容：處理字串格式的雙語資料
    if (typeof fieldData === 'string' && fieldData.includes('~')) {
      const [zh, en] = fieldData.split('~');
      return currentLang === 'en' ? (en || '').trim() : (zh || '').trim();
    }
    
    return fieldData || '';
  }

  /**
   * 設置頭像
   */
  setupAvatar(card, avatarUrl, name) {
    const avatar = card.querySelector('.avatar');
    
    if (!avatarUrl) {
      avatar.classList.add('hidden');
      return;
    }
    
    avatar.onload = () => {
      avatar.classList.remove('hidden');
    };
    
    avatar.onerror = () => {
      avatar.classList.add('hidden');
    };
    
    avatar.src = avatarUrl;
    avatar.alt = name || '';
  }

  /**
   * 設置聯絡資訊
   */
  setupContactInfo(card, cardData) {
    // 電子郵件
    const emailLink = card.querySelector('.email-link');
    if (cardData.email) {
      emailLink.href = `mailto:${cardData.email}`;
      emailLink.textContent = cardData.email;
    }
    
    // 電話
    const phoneItem = card.querySelector('.phone-item');
    const phoneLink = card.querySelector('.phone-link');
    if (cardData.phone) {
      phoneLink.href = `tel:${cardData.phone.replace(/[^0-9+]/g, '')}`;
      phoneLink.textContent = cardData.phone;
      phoneItem.classList.remove('hidden');
    } else {
      phoneItem.classList.add('hidden');
    }
    
    // 手機
    const mobileItem = card.querySelector('.mobile-item');
    const mobileLink = card.querySelector('.mobile-link');
    if (cardData.mobile) {
      mobileLink.href = `tel:${cardData.mobile.replace(/[^0-9+]/g, '')}`;
      mobileLink.textContent = cardData.mobile;
      mobileItem.classList.remove('hidden');
    } else {
      mobileItem.classList.add('hidden');
    }
  }

  /**
   * PWA-35: 設置組織資訊 - 支援雙語欄位
   */
  setupOrganizationInfo(card, cardData, cardType) {
    const orgElement = card.querySelector('.organization');
    const addressElement = card.querySelector('.address');
    
    // PWA-35: 組織名稱 - 支援雙語顯示
    let organization = this.displayBilingualField(cardData.organization, this.options.language);
    if (!organization && this.isGovernmentType(cardType)) {
      organization = this.options.language === 'en' ? 
        'Ministry of Digital Affairs' : '數位發展部';
    }
    orgElement.textContent = organization || '';
    
    // PWA-35: 地址 - 支援雙語顯示
    let address = this.displayBilingualField(cardData.address, this.options.language);
    if (!address && this.isGovernmentType(cardType)) {
      const isXinyi = cardType.includes('sg') || cardType.includes('xinyi');
      if (this.options.language === 'en') {
        address = isXinyi ? 
          '66 Zhongxiao W. Rd. Sec. 1, Zhongzheng Dist., Taipei City, Taiwan (17F, 19F)' :
          '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan';
      } else {
        address = isXinyi ? 
          '臺北市中正區忠孝西路一段６６號（１７、１９樓）' :
          '臺北市中正區延平南路143號';
      }
    }
    
    if (address) {
      // 處理換行
      const lines = address.split('\n');
      addressElement.innerHTML = '';
      lines.forEach((line, index) => {
        if (index > 0) {
          addressElement.appendChild(document.createElement('br'));
        }
        addressElement.appendChild(document.createTextNode(line));
      });
    }
  }

  /**
   * PWA-35: 設置社群媒體資訊 - 支援雙語顯示
   */
  setupSocialInfo(card, cardData) {
    const socialSection = card.querySelector('.social-info');
    const socialContent = card.querySelector('.social-info-content');
    
    // PWA-35: 支援雙語社群連結顯示
    const socialNote = this.displayBilingualField(cardData.socialNote, this.options.language);
    
    if (!socialNote || !socialNote.trim()) {
      socialSection.classList.add('hidden');
      return;
    }
    
    // 使用現有的社群連結處理邏輯
    if (typeof processSocialLinks === 'function') {
      const processedContent = processSocialLinks(socialNote, this.options.language);
      socialContent.innerHTML = '';
      if (typeof processedContent === 'string') {
        socialContent.innerHTML = processedContent;
      } else {
        socialContent.appendChild(processedContent);
      }
      socialSection.classList.remove('hidden');
    } else {
      // 備用方案：簡單的社群資訊顯示
      socialContent.innerHTML = '';
      const socialText = this.processSocialLinksBasic(socialNote);
      socialContent.innerHTML = socialText;
      socialSection.classList.remove('hidden');
    }
  }
  
  /**
   * 基本的社群連結處理（備用方案）
   */
  processSocialLinksBasic(socialNote) {
    if (!socialNote) return '';
    
    // 簡單的連結處理
    let processed = socialNote
      .replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/(@[\w]+)/g, '<span class="social-handle">$1</span>');
    
    // 加入基本的社群功能按鈕
    if (socialNote.includes('LINE') || socialNote.includes('line')) {
      processed += '<br><button class="social-btn" data-action="add-to-line">📱 加入 LINE 好友</button>';
    }
    
    if (socialNote.includes('Facebook') || socialNote.includes('facebook') || socialNote.includes('FB')) {
      processed += '<br><button class="social-btn" data-action="add-to-facebook">👥 加入 Facebook 好友</button>';
    }
    
    return processed;
  }

  /**
   * 設置動作按鈕
   */
  setupActionButtons(card, cardData) {
    const vcardBtn = card.querySelector('.vcard-btn');
    const qrBtn = card.querySelector('.qr-btn');
    
    if (vcardBtn) {
      vcardBtn.addEventListener('click', () => {
        this.generateVCard(cardData);
      });
    }
    
    if (qrBtn) {
      qrBtn.addEventListener('click', () => {
        this.generateQRCode(cardData);
      });
    }
    
    // 設置社群互動事件
    card.addEventListener('addToLine', () => {
      this.handleSocialAction('line', cardData);
    });
    
    card.addEventListener('addToFacebook', () => {
      this.handleSocialAction('facebook', cardData);
    });
    
    // PWA-35: 設置 data-action 事件委托，包含語言切換
    card.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'language-toggle') {
        // PWA-35: 語言切換功能
        const newLanguage = this.options.language === 'zh' ? 'en' : 'zh';
        this.switchLanguage(newLanguage);
        card.dispatchEvent(new CustomEvent('languageToggle', { detail: { language: newLanguage } }));
      } else if (action === 'add-to-line') {
        this.handleSocialAction('line', cardData);
      } else if (action === 'add-to-facebook') {
        this.handleSocialAction('facebook', cardData);
      }
    });
  }
  
  /**
   * 處理社群互動動作
   */
  handleSocialAction(platform, cardData) {
    switch (platform) {
      case 'line':
        // 嘗試開啟 LINE 加好友功能
        if (cardData.socialNote && typeof cardData.socialNote === 'string' && cardData.socialNote.includes('line.me')) {
          const lineMatch = cardData.socialNote.match(/https?:\/\/line\.me\/[^\s]+/);
          if (lineMatch) {
            window.open(lineMatch[0], '_blank');
            return;
          }
        }
        // 備用方案：顯示提示
        alert('請手動搜尋 LINE ID 或掃描 QR 碼加入好友');
        break;
        
      case 'facebook':
        // 嘗試開啟 Facebook 個人檔案
        if (cardData.socialNote && typeof cardData.socialNote === 'string' && cardData.socialNote.includes('facebook.com')) {
          const fbMatch = cardData.socialNote.match(/https?:\/\/(?:www\.)?facebook\.com\/[^\s]+/);
          if (fbMatch) {
            window.open(fbMatch[0], '_blank');
            return;
          }
        }
        // 備用方案：顯示提示
        alert('請手動搜尋 Facebook 帳號或使用其他聯絡方式');
        break;
    }
  }

  /**
   * 打字機效果 - 修復問候語處理
   */
  startTypewriterEffect(greetings) {
    if (!greetings || greetings.length === 0) return;
    
    const greetingElement = this.container.querySelector('.greeting');
    if (!greetingElement) return;
    
    // 標準化問候語格式
    let normalizedGreetings = [];
    
    if (window.bilingualBridge && typeof window.bilingualBridge.normalizeGreetings === 'function') {
      normalizedGreetings = window.bilingualBridge.normalizeGreetings(greetings, this.options.language);
    } else {
      // 備用方案
      normalizedGreetings = this.normalizeGreetingsForTypewriter(greetings);
    }
    
    if (normalizedGreetings.length === 0) {
      normalizedGreetings = ['歡迎認識我！'];
    }
    
    
    let currentIndex = 0;
    
    const typeText = (text, callback) => {
      greetingElement.textContent = '';
      let i = 0;
      const timer = setInterval(() => {
        greetingElement.textContent += text[i];
        i++;
        if (i >= text.length) {
          clearInterval(timer);
          setTimeout(callback, 2000);
        }
      }, 100);
    };
    
    const changeGreeting = () => {
      const greeting = normalizedGreetings[currentIndex];
      
      if (greeting && typeof greeting === 'string') {
        typeText(greeting, () => {
          currentIndex = (currentIndex + 1) % normalizedGreetings.length;
          setTimeout(changeGreeting, 1000);
        });
      } else {
        // 如果問候語不是字串，跳過
        currentIndex = (currentIndex + 1) % normalizedGreetings.length;
        setTimeout(changeGreeting, 100);
      }
    };
    
    changeGreeting();
  }

  /**
   * PWA-35: 備用的問候語標準化方法（用於打字機效果） - 支援雙語
   */
  normalizeGreetingsForTypewriter(greetings) {
    if (!greetings) return [];
    
    if (typeof greetings === 'string') {
      return [this.processGreetingForTypewriter(greetings)];
    }
    
    if (Array.isArray(greetings)) {
      return greetings
        .map(g => this.processGreetingForTypewriter(g))
        .filter(g => g && typeof g === 'string');
    }
    
    if (typeof greetings === 'object' && greetings !== null) {
      const processed = [];
      
      // PWA-35: 支援雙語物件格式
      if (greetings.zh || greetings.en) {
        const target = greetings[this.options.language] || greetings.zh || greetings.en;
        if (Array.isArray(target)) {
          target.forEach(g => {
            const p = this.processGreetingForTypewriter(g);
            if (p) processed.push(p);
          });
        } else if (typeof target === 'string') {
          processed.push(target);
        }
      } else {
        // 提取所有字串值
        Object.values(greetings).forEach(value => {
          const p = this.processGreetingForTypewriter(value);
          if (p) processed.push(p);
        });
      }
      
      return processed;
    }
    
    return [];
  }

  /**
   * PWA-35: 處理單個問候語項目（用於打字機效果） - 支援雙語
   */
  processGreetingForTypewriter(greeting) {
    if (!greeting) return null;
    
    if (typeof greeting === 'string') {
      // PWA-35: 處理雙語格式
      if (greeting.includes('~')) {
        const [chinese, english] = greeting.split('~');
        return this.options.language === 'en' ? english.trim() : chinese.trim();
      }
      return greeting.trim();
    }
    
    // PWA-35: 支援雙語物件格式
    if (typeof greeting === 'object' && greeting !== null) {
      if (greeting.zh || greeting.en) {
        const target = greeting[this.options.language] || greeting.zh || greeting.en;
        return typeof target === 'string' ? target.trim() : null;
      }
      
      // 提取第一個字串值
      const firstString = Object.values(greeting).find(v => typeof v === 'string');
      return firstString ? firstString.trim() : null;
    }
    
    return null;
  }

  /**
   * 生成 vCard
   */
  generateVCard(cardData) {
    if (window.app && window.app.offlineTools) {
      window.app.offlineTools.exportVCard(this.currentCard.id || 'temp');
    }
  }

  /**
   * 生成 QR 碼
   */
  generateQRCode(cardData) {
    if (window.app && window.app.cardManager) {
      window.app.cardManager.generateQRCode(this.currentCard.id || 'temp');
    }
  }

  /**
   * 工具方法
   */
  shouldShowLogo(cardType) {
    return cardType.includes('gov') || cardType.includes('bilingual');
  }

  isGovernmentType(cardType) {
    return cardType.includes('gov');
  }

  /**
   * PWA-35: 切換語言 - 支援所有雙語欄位的切換
   */
  switchLanguage(language) {
    this.options.language = language;
    if (this.currentCard) {
      // 重新填充所有資料，確保所有雙語欄位都正確切換
      this.populateCardData(this.currentCard.data, this.currentCard.type);
      
      // 更新語言切換按鈕文字
      const langBtn = this.container.querySelector('.lang-btn');
      if (langBtn) {
        langBtn.textContent = language === 'en' ? '🇹🇼 中文' : '🇺🇸 EN';
      }
      
      // 重新啟動打字機效果（如果啟用）
      if (this.options.enableTypewriter && this.currentCard.data.greetings) {
        this.startTypewriterEffect(this.currentCard.data.greetings);
      }
    }
  }

  /**
   * 清理資源
   */
  destroy() {
    if (this.typewriterTimeout) {
      clearTimeout(this.typewriterTimeout);
    }
  }
}

// 導出到全域
window.CardRenderer = CardRenderer;

