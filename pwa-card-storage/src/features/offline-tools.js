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
   * PWA-10: 離線 vCard 匯出 - 完善版本
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

      const vCardContent = this.generateVCard(processedData, language);
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
   * 批次匯出 vCard - 支援雙語版本
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
   * 生成 vCard 內容 - 完善的雙語支援版本
   */
  generateVCard(cardData, language = 'zh') {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];

    // 姓名處理
    const name = this.getDisplayName(cardData, language);
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

    // 職稱
    const title = this.getDisplayTitle(cardData, language);
    if (title) {
      lines.push(`TITLE:${this.escapeVCardValue(title)}`);
    }

    // 組織和部門
    const organization = this.getDisplayOrganization(cardData, language);
    const department = this.getDisplayDepartment(cardData, language);
    
    if (organization && department) {
      lines.push(`ORG:${this.escapeVCardValue(organization)};${this.escapeVCardValue(department)}`);
    } else if (organization) {
      lines.push(`ORG:${this.escapeVCardValue(organization)}`);
    }

    // 聯絡資訊
    if (cardData.email) {
      lines.push(`EMAIL;TYPE=WORK:${cardData.email}`);
    }

    if (cardData.phone) {
      lines.push(`TEL;TYPE=WORK,VOICE:${cardData.phone}`);
    }

    if (cardData.mobile) {
      lines.push(`TEL;TYPE=CELL,VOICE:${cardData.mobile}`);
    }

    // 地址
    if (cardData.address) {
      const address = this.getDisplayAddress(cardData, language);
      lines.push(`ADR;TYPE=WORK:;;${this.escapeVCardValue(address)};;;;`);
    }

    // 頭像
    if (cardData.avatar && this.isValidUrl(cardData.avatar)) {
      lines.push(`PHOTO;VALUE=URL:${cardData.avatar}`);
    }

    // 網址（如果有的話）
    if (cardData.website) {
      lines.push(`URL:${cardData.website}`);
    }

    // 備註（問候語和社群資訊）
    const notes = [];
    
    if (cardData.greetings && cardData.greetings.length > 0) {
      const greetings = cardData.greetings.join('; ');
      notes.push(greetings);
    }
    
    if (cardData.socialNote) {
      notes.push(cardData.socialNote);
    }
    
    if (notes.length > 0) {
      lines.push(`NOTE:${this.escapeVCardValue(notes.join('\n\n'))}`);
    }

    // 版本和時間戳
    lines.push(`REV:${new Date().toISOString()}`);
    
    // 產品識別
    lines.push('PRODID:-//MODA//PWA Card Storage//EN');

    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

  /**
   * 獲取顯示名稱 - 使用雙語橋接器
   */
  getDisplayName(cardData, language = 'zh') {
    if (window.bilingualBridge) {
      return window.bilingualBridge.getCardDisplayName(cardData, language);
    }
    
    // 備用邏輯
    if (cardData.nameZh && cardData.nameEn) {
      return language === 'en' ? cardData.nameEn : cardData.nameZh;
    }
    
    if (cardData.name && cardData.name.includes('~')) {
      const [chinese, english] = cardData.name.split('~');
      return language === 'en' ? english.trim() : chinese.trim();
    }
    
    return cardData.name || '';
  }

  /**
   * 獲取顯示職稱 - 使用雙語橋接器
   */
  getDisplayTitle(cardData, language = 'zh') {
    if (window.bilingualBridge) {
      return window.bilingualBridge.getCardDisplayTitle(cardData, language);
    }
    
    // 備用邏輯
    if (cardData.titleZh && cardData.titleEn) {
      return language === 'en' ? cardData.titleEn : cardData.titleZh;
    }
    
    if (cardData.title && cardData.title.includes('~')) {
      const [chinese, english] = cardData.title.split('~');
      return language === 'en' ? english.trim() : chinese.trim();
    }
    
    return cardData.title || '';
  }

  /**
   * 獲取顯示組織名稱
   */
  getDisplayOrganization(cardData, language = 'zh') {
    if (cardData.organizationZh && cardData.organizationEn) {
      return language === 'en' ? cardData.organizationEn : cardData.organizationZh;
    }
    
    if (cardData.organization && cardData.organization.includes('~')) {
      const [chinese, english] = cardData.organization.split('~');
      return language === 'en' ? english.trim() : chinese.trim();
    }
    
    // 預設翻譯
    if (cardData.organization === '數位發展部' && language === 'en') {
      return 'Ministry of Digital Affairs';
    }
    
    return cardData.organization || '';
  }

  /**
   * 獲取顯示部門名稱
   */
  getDisplayDepartment(cardData, language = 'zh') {
    if (cardData.departmentZh && cardData.departmentEn) {
      return language === 'en' ? cardData.departmentEn : cardData.departmentZh;
    }
    
    if (cardData.department && cardData.department.includes('~')) {
      const [chinese, english] = cardData.department.split('~');
      return language === 'en' ? english.trim() : chinese.trim();
    }
    
    return cardData.department || '';
  }

  /**
   * 獲取顯示地址
   */
  getDisplayAddress(cardData, language = 'zh') {
    if (cardData.addressZh && cardData.addressEn) {
      return language === 'en' ? cardData.addressEn : cardData.addressZh;
    }
    
    if (cardData.address && cardData.address.includes('~')) {
      const [chinese, english] = cardData.address.split('~');
      return language === 'en' ? english.trim() : chinese.trim();
    }
    
    return cardData.address || '';
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
   * 自動下載 vCard 檔案
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