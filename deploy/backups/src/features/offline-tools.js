/**
 * 離線工具管理器
 * 負責 QR 碼生成和 vCard 匯出等離線功能
 */

class OfflineToolsManager {
  constructor(cardManager) {
    this.cardManager = cardManager;
    this.qrGenerator = null;
    this.init();
  }

  init() {
    // 檢查 QR 碼生成庫
    if (typeof QRCode !== 'undefined') {
      this.qrGenerator = QRCode;
    } else {
    }
  }

  /**
   * 生成 QR 碼 - 使用統一的 QR 碼工具
   */
  async generateQRCode(cardId, options = {}) {
    try {
      // 檢查統一 QR 工具是否可用
      if (!window.qrUtils) {
        throw new Error('QR 碼工具未載入');
      }

      const card = await this.cardManager.storage.getCard(cardId);
      if (!card) {
        throw new Error('名片不存在');
      }

      // 生成名片 URL
      const cardUrl = this.generateCardUrl(card.data, card.type);
      
      
      // 檢查 URL 長度
      if (cardUrl.length > 2000) {
        return {
          success: false,
          error: `URL 太長（${cardUrl.length} 字元），無法生成 QR 碼`
        };
      }
      
      // 使用統一的 QR 碼生成工具
      const result = await window.qrUtils.generateHighResQRCode(cardUrl, {
        size: options.size || 800,
        colorDark: options.colorDark || '#6b7280',
        colorLight: options.colorLight || '#ffffff'
      });

      if (result.success) {
        return {
          success: true,
          dataUrl: result.dataUrl,
          url: cardUrl,
          size: result.size
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('[OfflineTools] QR code generation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 批次生成 QR 碼 - 使用統一的批次工具
   */
  async generateBatchQRCodes(cardIds, options = {}) {
    try {
      if (!window.qrUtils) {
        throw new Error('QR 碼工具未載入');
      }

      // 準備卡片資料
      const cards = [];
      for (const cardId of cardIds) {
        const card = await this.cardManager.storage.getCard(cardId);
        if (card) {
          cards.push({ id: cardId, ...card });
        }
      }

      // 使用統一工具批次生成
      const results = await window.qrUtils.batchGenerateQRCodes(
        cards,
        (card) => this.generateCardUrl(card.data, card.type),
        options
      );

      return results;
    } catch (error) {
      console.error('[OfflineTools] Batch QR generation failed:', error);
      const results = new Map();
      cardIds.forEach(id => {
        results.set(id, { success: false, error: error.message });
      });
      return results;
    }
  }

  /**
   * 下載 QR 碼圖片 - 使用統一的下載工具
   */
  async downloadQRCode(dataUrl, filename) {
    try {
      if (!window.qrUtils) {
        throw new Error('QR 碼工具未載入');
      }
      
      return await window.qrUtils.downloadQRCode(dataUrl, filename || 'qr-code.png');
    } catch (error) {
      console.error('[OfflineTools] QR code download failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * PWA-10: 離線 vCard 匯出 - 修復版本，使用正確的名片類型
   */
  async exportVCard(cardId, language = 'zh') {
    try {
      const card = await this.cardManager.storage.getCard(cardId);
      if (!card) {
        throw new Error('名片不存在');
      }

      // 使用雙語橋接器處理資料
      let processedData = card.data;
      if (window.bilingualBridge) {
        processedData = window.bilingualBridge.processBilingualCardData(card.data, language);
      }

      // 重要修復：傳遞名片類型給 vCard 生成器
      const vCardContent = this.generateVCard(processedData, language, card.type);
      const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8' });
      
      const name = this.getDisplayName(processedData, language);
      const safeFilename = this.generateSafeFilename(name, language);

      return {
        success: true,
        file: blob,
        filename: safeFilename,
        content: vCardContent,
        language: language,
        cardType: card.type
      };
    } catch (error) {
      console.error('[OfflineTools] vCard export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 批次匯出 vCard - 支援雙語版本，修復名片類型傳遞
   */
  async exportBatchVCards(cardIds, options = {}) {
    try {
      const { format = 'individual', language = 'zh', includeBothLanguages = false } = options;
      
      if (format === 'merged') {
        // 合併為單一 vCard 檔案
        let mergedContent = '';
        const exportedCards = [];
        
        for (const cardId of cardIds) {
          if (includeBothLanguages) {
            // 匯出中英文兩個版本
            const zhResult = await this.exportVCard(cardId, 'zh');
            const enResult = await this.exportVCard(cardId, 'en');
            
            if (zhResult.success) {
              mergedContent += zhResult.content + '\n';
              exportedCards.push({ cardId, language: 'zh' });
            }
            if (enResult.success) {
              mergedContent += enResult.content + '\n';
              exportedCards.push({ cardId, language: 'en' });
            }
          } else {
            const result = await this.exportVCard(cardId, language);
            if (result.success) {
              mergedContent += result.content + '\n';
              exportedCards.push({ cardId, language });
            }
          }
        }
        
        const blob = new Blob([mergedContent], { type: 'text/vcard;charset=utf-8' });
        const timestamp = new Date().toISOString().slice(0, 10);
        const langSuffix = includeBothLanguages ? 'bilingual' : language;
        
        return {
          success: true,
          file: blob,
          filename: `cards-${langSuffix}-${timestamp}.vcf`,
          exportedCards,
          totalCards: exportedCards.length
        };
      } else {
        // 個別檔案
        const results = [];
        
        for (const cardId of cardIds) {
          if (includeBothLanguages) {
            const zhResult = await this.exportVCard(cardId, 'zh');
            const enResult = await this.exportVCard(cardId, 'en');
            
            if (zhResult.success) results.push({ ...zhResult, cardId, language: 'zh' });
            if (enResult.success) results.push({ ...enResult, cardId, language: 'en' });
          } else {
            const result = await this.exportVCard(cardId, language);
            if (result.success) {
              results.push({ ...result, cardId, language });
            }
          }
        }
        
        return {
          success: true,
          files: results,
          count: results.length,
          format: 'individual'
        };
      }
    } catch (error) {
      console.error('[OfflineTools] Batch vCard export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 下載 vCard 檔案
   */
  async downloadVCard(blob, filename) {
    try {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      
      // 清理 URL
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      
      return { success: true };
    } catch (error) {
      console.error('[OfflineTools] vCard download failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成分享連結
   */
  generateShareableLink(cardId) {
    // 這個方法將在實際使用時實作
    return `${window.location.origin}/pwa-card-storage/?card=${cardId}`;
  }

  /**
   * 建立分享包
   */
  async createSharePackage(cardIds) {
    try {
      const cards = [];
      for (const cardId of cardIds) {
        const card = await this.cardManager.storage.getCard(cardId);
        if (card) {
          cards.push({
            id: card.id,
            type: card.type,
            data: card.data
          });
        }
      }

      const shareData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        cards: cards
      };

      const jsonContent = JSON.stringify(shareData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      
      return {
        success: true,
        file: blob,
        filename: `cards-share-${Date.now()}.json`
      };
    } catch (error) {
      console.error('[OfflineTools] Create share package failed:', error);
      return { success: false, error: error.message };
    }
  }

  // 私有方法

  /**
   * 生成名片 URL
   */
  generateCardUrl(cardData, cardType) {
    try {
      // 使用 legacy adapter
      if (window.legacyAdapter) {
        return window.legacyAdapter.generateCardUrl(cardData, cardType);
      }

      // 備用方法
      const jsonData = JSON.stringify(cardData);
      const encodedData = encodeURIComponent(btoa(jsonData));
      const baseUrl = window.location.origin;
      
      return `${baseUrl}/index-personal.html?data=${encodedData}`;
    } catch (error) {
      console.error('[OfflineTools] URL generation failed:', error);
      throw error;
    }
  }

  /**
   * 生成 vCard 內容 - 使用對應名片類型的邏輯
   */
  generateVCard(cardData, language = 'zh', cardType = 'personal') {
    // 使用對應名片類型的 vCard 生成邏輯
    return this.generateVCardByType(cardData, language, cardType);
  }

  /**
   * 根據名片類型生成 vCard - 修復 [object Object] 問題
   */
  generateVCardByType(cardData, language = 'zh', cardType = 'personal') {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];

    // 安全字串化函數 - 修復 [object Object] 問題
    const safeStringify = (field) => {
      if (!field) return '';
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field !== null) {
        // 處理雙語物件格式
        if (field.zh && field.en) {
          return language === 'en' ? field.en : field.zh;
        }
        // 提取第一個有效字串值
        const firstValue = Object.values(field).find(v => v && typeof v === 'string');
        if (firstValue) return firstValue;
        // 避免 [object Object]
        return '';
      }
      // 其他類型轉字串，但避免 [object Object]
      const stringValue = String(field);
      return stringValue === '[object Object]' ? '' : stringValue;
    };

    // 姓名處理
    const name = safeStringify(this.getDisplayName(cardData, language));
    if (name) {
      lines.push(`FN:${this.escapeVCardValue(name)}`);
      
      // 結構化姓名（支援中英文）
      if (language === 'zh') {
        lines.push(`N:${this.escapeVCardValue(name)};;;;`);
      } else {
        // 英文名字嘗試分離姓氏和名字
        const nameParts = name.split(' ');
        if (nameParts.length >= 2) {
          const lastName = nameParts[nameParts.length - 1];
          const firstName = nameParts.slice(0, -1).join(' ');
          lines.push(`N:${this.escapeVCardValue(lastName)};${this.escapeVCardValue(firstName)};;;`);
        } else {
          lines.push(`N:${this.escapeVCardValue(name)};;;;`);
        }
      }
    }

    // 職稱
    const title = safeStringify(this.getDisplayTitle(cardData, language));
    if (title) {
      lines.push(`TITLE:${this.escapeVCardValue(title)}`);
    }

    // 組織和部門 - 根據名片類型處理
    const organization = this.getCorrectOrganization(cardData, cardType, language);
    const department = safeStringify(this.getDisplayDepartment(cardData, language));
    
    if (organization && department) {
      lines.push(`ORG:${this.escapeVCardValue(organization)};${this.escapeVCardValue(department)}`);
    } else if (organization) {
      lines.push(`ORG:${this.escapeVCardValue(organization)}`);
    }

    // 聯絡資訊
    const email = safeStringify(cardData.email);
    if (email) {
      lines.push(`EMAIL;TYPE=WORK:${email}`);
    }

    const phone = safeStringify(cardData.phone);
    if (phone) {
      lines.push(`TEL;TYPE=WORK,VOICE:${phone}`);
    }

    const mobile = safeStringify(cardData.mobile);
    if (mobile) {
      lines.push(`TEL;TYPE=CELL,VOICE:${mobile}`);
    }

    // 地址 - 根據名片類型處理
    const address = this.getCorrectAddress(cardData, cardType, language);
    if (address) {
      lines.push(`ADR;TYPE=WORK:;;${this.escapeVCardValue(address)};;;;`);
    }

    // 頭像
    const avatar = safeStringify(cardData.avatar);
    if (avatar && this.isValidUrl(avatar)) {
      lines.push(`PHOTO;VALUE=URL:${avatar}`);
    }

    // 網址（如果有的話）
    const website = safeStringify(cardData.website);
    if (website) {
      lines.push(`URL:${website}`);
    }

    // 備註（問候語和社群資訊）
    const notes = [];
    
    if (cardData.greetings && Array.isArray(cardData.greetings) && cardData.greetings.length > 0) {
      const greetings = cardData.greetings
        .map(g => safeStringify(g))
        .filter(g => g && g.trim())
        .join('; ');
      if (greetings) notes.push(greetings);
    }
    
    const socialNote = safeStringify(cardData.socialNote);
    if (socialNote) {
      notes.push(socialNote);
    }
    
    if (notes.length > 0) {
      lines.push(`NOTE:${this.escapeVCardValue(notes.join('\n\n'))}`);
    }

    // 版本和時間戳
    lines.push(`REV:${new Date().toISOString()}`);
    
    // 產品識別
    lines.push('PRODID:-//moda//PWA Card Storage//EN');

    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

  /**
   * 根據名片類型獲取正確的組織名稱
   */
  getCorrectOrganization(cardData, cardType, language = 'zh') {
    // 對於政府機關版本，強制使用預設組織名稱
    if (cardType === 'index' || cardType === 'index1' || cardType === 'bilingual' || cardType === 'bilingual1') {
      return language === 'en' ? 'Ministry of Digital Affairs' : '數位發展部';
    } else if (cardType === 'en' || cardType === 'en1') {
      return 'Ministry of Digital Affairs';
    }
    
    // 個人版使用實際的組織資訊
    return this.safeStringify(this.getDisplayOrganization(cardData, language));
  }

  /**
   * 根據名片類型獲取正確的地址
   */
  getCorrectAddress(cardData, cardType, language = 'zh') {
    // 對於政府機關版本，強制使用預設地址
    if (cardType === 'index' || cardType === 'bilingual') {
      // 延平大樓
      return language === 'en' ? 
        '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan' :
        '臺北市中正區延平南路143號';
    } else if (cardType === 'index1' || cardType === 'bilingual1') {
      // 新光大樓
      return language === 'en' ? 
        '66 Zhongxiao W. Rd. Sec. 1, Zhongzheng Dist., Taipei City, Taiwan (17F, 19F)' :
        '臺北市中正區忠孝西路一段６６號（１７、１９樓）';
    } else if (cardType === 'en') {
      return '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan';
    } else if (cardType === 'en1') {
      return '66 Zhongxiao W. Rd. Sec. 1, Zhongzheng Dist., Taipei City, Taiwan (17F, 19F)';
    }
    
    // 個人版使用實際的地址資訊
    return this.safeStringify(this.getDisplayAddress(cardData, language));
  }

  /**
   * 安全字串化輔助函數
   */
  safeStringify(field) {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field !== null) {
      const firstValue = Object.values(field).find(v => v && typeof v === 'string');
      if (firstValue) return firstValue;
      return '';
    }
    const stringValue = String(field);
    return stringValue === '[object Object]' ? '' : stringValue;
  }

  /**
   * 獲取顯示名稱 - 使用雙語橋接器，修復 [object Object] 問題
   */
  getDisplayName(cardData, language = 'zh') {
    if (window.bilingualBridge) {
      return window.bilingualBridge.getCardDisplayName(cardData, language);
    }
    
    // 備用邏輯 - 修復 [object Object] 問題
    if (cardData.nameZh && cardData.nameEn) {
      return language === 'en' ? cardData.nameEn : cardData.nameZh;
    }
    
    if (cardData.name) {
      // 處理物件格式
      if (typeof cardData.name === 'object' && cardData.name !== null) {
        if (cardData.name.zh && cardData.name.en) {
          return language === 'en' ? cardData.name.en : cardData.name.zh;
        }
        // 提取第一個有效字串值
        const firstValue = Object.values(cardData.name).find(v => v && typeof v === 'string');
        if (firstValue) return firstValue;
        // 避免 [object Object]
        return '';
      }
      
      // 處理字串格式
      if (typeof cardData.name === 'string') {
        if (cardData.name.includes('~')) {
          const [chinese, english] = cardData.name.split('~');
          return language === 'en' ? english.trim() : chinese.trim();
        }
        return cardData.name;
      }
    }
    
    return '';
  }

  /**
   * 獲取顯示職稱 - 使用雙語橋接器，修復 [object Object] 問題
   */
  getDisplayTitle(cardData, language = 'zh') {
    if (window.bilingualBridge) {
      return window.bilingualBridge.getCardDisplayTitle(cardData, language);
    }
    
    // 備用邏輯 - 修復 [object Object] 問題
    if (cardData.titleZh && cardData.titleEn) {
      return language === 'en' ? cardData.titleEn : cardData.titleZh;
    }
    
    if (cardData.title) {
      // 處理物件格式
      if (typeof cardData.title === 'object' && cardData.title !== null) {
        if (cardData.title.zh && cardData.title.en) {
          return language === 'en' ? cardData.title.en : cardData.title.zh;
        }
        // 提取第一個有效字串值
        const firstValue = Object.values(cardData.title).find(v => v && typeof v === 'string');
        if (firstValue) return firstValue;
        // 避免 [object Object]
        return '';
      }
      
      // 處理字串格式
      if (typeof cardData.title === 'string') {
        if (cardData.title.includes('~')) {
          const [chinese, english] = cardData.title.split('~');
          return language === 'en' ? english.trim() : chinese.trim();
        }
        return cardData.title;
      }
    }
    
    return '';
  }

  /**
   * 獲取顯示組織名稱 - 修復 [object Object] 問題
   */
  getDisplayOrganization(cardData, language = 'zh') {
    if (cardData.organizationZh && cardData.organizationEn) {
      return language === 'en' ? cardData.organizationEn : cardData.organizationZh;
    }
    
    if (cardData.organization) {
      // 處理物件格式
      if (typeof cardData.organization === 'object' && cardData.organization !== null) {
        if (cardData.organization.zh && cardData.organization.en) {
          return language === 'en' ? cardData.organization.en : cardData.organization.zh;
        }
        // 提取第一個有效字串值
        const firstValue = Object.values(cardData.organization).find(v => v && typeof v === 'string');
        if (firstValue) return firstValue;
        // 避免 [object Object]
        return '';
      }
      
      // 處理字串格式
      if (typeof cardData.organization === 'string') {
        if (cardData.organization.includes('~')) {
          const [chinese, english] = cardData.organization.split('~');
          return language === 'en' ? english.trim() : chinese.trim();
        }
        
        // 預設翻譯
        if (cardData.organization === '數位發展部' && language === 'en') {
          return 'Ministry of Digital Affairs';
        }
        
        return cardData.organization;
      }
    }
    
    return '';
  }

  /**
   * 獲取顯示部門名稱 - 修復 [object Object] 問題
   */
  getDisplayDepartment(cardData, language = 'zh') {
    if (cardData.departmentZh && cardData.departmentEn) {
      return language === 'en' ? cardData.departmentEn : cardData.departmentZh;
    }
    
    if (cardData.department) {
      // 處理物件格式
      if (typeof cardData.department === 'object' && cardData.department !== null) {
        if (cardData.department.zh && cardData.department.en) {
          return language === 'en' ? cardData.department.en : cardData.department.zh;
        }
        // 提取第一個有效字串值
        const firstValue = Object.values(cardData.department).find(v => v && typeof v === 'string');
        if (firstValue) return firstValue;
        // 避免 [object Object]
        return '';
      }
      
      // 處理字串格式
      if (typeof cardData.department === 'string') {
        if (cardData.department.includes('~')) {
          const [chinese, english] = cardData.department.split('~');
          return language === 'en' ? english.trim() : chinese.trim();
        }
        return cardData.department;
      }
    }
    
    return '';
  }

  /**
   * 獲取顯示地址 - 修復 [object Object] 問題
   */
  getDisplayAddress(cardData, language = 'zh') {
    if (cardData.addressZh && cardData.addressEn) {
      return language === 'en' ? cardData.addressEn : cardData.addressZh;
    }
    
    if (cardData.address) {
      // 處理物件格式
      if (typeof cardData.address === 'object' && cardData.address !== null) {
        if (cardData.address.zh && cardData.address.en) {
          return language === 'en' ? cardData.address.en : cardData.address.zh;
        }
        // 提取第一個有效字串值
        const firstValue = Object.values(cardData.address).find(v => v && typeof v === 'string');
        if (firstValue) return firstValue;
        // 避免 [object Object]
        return '';
      }
      
      // 處理字串格式
      if (typeof cardData.address === 'string') {
        if (cardData.address.includes('~')) {
          const [chinese, english] = cardData.address.split('~');
          return language === 'en' ? english.trim() : chinese.trim();
        }
        return cardData.address;
      }
    }
    
    return '';
  }

  /**
   * 轉義 vCard 值
   */
  escapeVCardValue(value) {
    if (!value) return '';
    return value
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  }

  /**
   * 驗證 URL 格式
   */
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * 生成安全的檔案名稱
   */
  generateSafeFilename(name, language = 'zh') {
    const safeName = name
      .replace(/[^a-zA-Z0-9\u4e00-\u9fff\s]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 50); // 限制長度
    
    const langSuffix = language === 'en' ? '_EN' : '_ZH';
    const timestamp = new Date().toISOString().slice(0, 10);
    
    return `${safeName}${langSuffix}_${timestamp}.vcf`;
  }

  /**
   * 自動下載 vCard 檔案 - 修復版本，確保名片類型正確傳遞
   */
  async autoDownloadVCard(cardId, language = 'zh') {
    try {
      const result = await this.exportVCard(cardId, language);
      if (result.success) {
        return await this.downloadVCard(result.file, result.filename);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('[OfflineTools] Auto download vCard failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 預覽 vCard 內容
   */
  async previewVCard(cardId, language = 'zh') {
    try {
      const result = await this.exportVCard(cardId, language);
      if (result.success) {
        return {
          success: true,
          content: result.content,
          filename: result.filename,
          language: result.language,
          preview: this.formatVCardForPreview(result.content)
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('[OfflineTools] vCard preview failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 格式化 vCard 內容供預覽
   */
  formatVCardForPreview(vCardContent) {
    const lines = vCardContent.split('\r\n');
    const formatted = [];
    
    for (const line of lines) {
      if (line.startsWith('FN:')) {
        formatted.push(`姓名: ${line.substring(3)}`);
      } else if (line.startsWith('TITLE:')) {
        formatted.push(`職稱: ${line.substring(6)}`);
      } else if (line.startsWith('ORG:')) {
        formatted.push(`組織: ${line.substring(4)}`);
      } else if (line.startsWith('EMAIL:')) {
        formatted.push(`電子郵件: ${line.substring(6)}`);
      } else if (line.startsWith('TEL;')) {
        const tel = line.substring(line.indexOf(':') + 1);
        if (line.includes('WORK')) {
          formatted.push(`電話: ${tel}`);
        } else if (line.includes('CELL')) {
          formatted.push(`手機: ${tel}`);
        }
      } else if (line.startsWith('ADR;')) {
        const addr = line.substring(line.indexOf(':') + 1).split(';')[2];
        if (addr) formatted.push(`地址: ${addr}`);
      } else if (line.startsWith('NOTE:')) {
        formatted.push(`備註: ${line.substring(5)}`);
      }
    }
    
    return formatted.join('\n');
  }
}