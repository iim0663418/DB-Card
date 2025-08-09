/**
 * 重複處理對話框管理器 - UI-02
 * 提供統一的重複處理對話框介面，支援雙語和批量處理
 */

class DuplicateDialogManager {
  constructor() {
    this.dialog = null;
  }

  /**
   * 顯示重複處理對話框
   * @param {Array} existingCards - 現有名片陣列
   * @param {Object} newCardData - 新名片資料
   * @param {Object} options - 選項
   * @returns {Promise<Object>} - 使用者選擇結果
   */
  async showDuplicateDialog(existingCards, newCardData, options = {}) {
    try {
      // 確保 DuplicateDialog 類別可用
      if (!window.DuplicateDialog) {
        throw new Error('DuplicateDialog class not available');
      }

      // 建立對話框實例
      this.dialog = new window.DuplicateDialog();

      // 準備重複資訊
      const duplicateInfo = {
        existingCards: existingCards,
        duplicateCount: existingCards.length
      };

      // 顯示對話框並等待使用者選擇
      const result = await this.dialog.show(duplicateInfo, newCardData, options.isBatch || false);

      return result;
    } catch (error) {
      console.error('[DuplicateDialogManager] Show dialog failed:', error);
      
      // 備用方案：使用簡單確認對話框
      return await this.showFallbackDialog(existingCards, newCardData);
    } finally {
      // 清理對話框
      if (this.dialog) {
        this.dialog.destroy();
        this.dialog = null;
      }
    }
  }

  /**
   * 備用對話框（當主對話框不可用時）
   */
  async showFallbackDialog(existingCards, newCardData) {
    const labels = this.getFallbackLabels();
    const cardName = this.extractCardName(newCardData);
    
    const message = `${labels.duplicateFound}\n\n${labels.cardName}: ${cardName}\n\n${labels.chooseAction}`;
    
    // 使用安全的確認對話框
    if (window.SecurityInputHandler && window.SecurityInputHandler.secureConfirm) {
      const confirmed = await window.SecurityInputHandler.secureConfirm(message, {
        title: labels.duplicateFound,
        confirmText: labels.overwrite,
        cancelText: labels.skip
      });
      
      return {
        action: confirmed ? 'overwrite' : 'skip',
        cardId: existingCards[0]?.id,
        fallback: true
      };
    } else {
      // 最後備用方案
      const confirmed = confirm(message);
      return {
        action: confirmed ? 'overwrite' : 'skip',
        cardId: existingCards[0]?.id,
        fallback: true
      };
    }
  }

  /**
   * 獲取備用標籤文字
   */
  getFallbackLabels() {
    if (window.languageManager) {
      return {
        duplicateFound: window.languageManager.getText('duplicateFound'),
        cardName: window.languageManager.getText('cardDetails'),
        chooseAction: window.languageManager.getText('selectAction'),
        overwrite: window.languageManager.getText('overwrite'),
        skip: window.languageManager.getText('skip')
      };
    }
    
    return {
      duplicateFound: '發現重複名片',
      cardName: '名片名稱',
      chooseAction: '請選擇處理方式：\n確定 = 覆蓋現有名片\n取消 = 跳過匯入',
      overwrite: '覆蓋',
      skip: '跳過'
    };
  }

  /**
   * 提取名片名稱
   */
  extractCardName(cardData) {
    if (!cardData || !cardData.name) return '未知名片';
    
    if (typeof cardData.name === 'string') {
      return cardData.name.includes('~') ? cardData.name.split('~')[0] : cardData.name;
    }
    
    if (typeof cardData.name === 'object' && cardData.name.zh) {
      return cardData.name.zh;
    }
    
    return String(cardData.name);
  }

  /**
   * 批量處理重複項目
   * @param {Array} duplicateItems - 重複項目陣列
   * @returns {Promise<Array>} - 處理結果陣列
   */
  async processBatchDuplicates(duplicateItems) {
    if (!duplicateItems || duplicateItems.length === 0) {
      return [];
    }

    try {
      // 確保 DuplicateDialog 類別可用
      if (!window.DuplicateDialog) {
        throw new Error('DuplicateDialog class not available');
      }

      // 建立對話框實例
      this.dialog = new window.DuplicateDialog();

      // 使用對話框的批量處理功能
      const results = await this.dialog.processBatch(duplicateItems);

      return results;
    } catch (error) {
      console.error('[DuplicateDialogManager] Batch processing failed:', error);
      
      // 備用方案：逐一處理
      const results = [];
      for (let i = 0; i < duplicateItems.length; i++) {
        const item = duplicateItems[i];
        try {
          const result = await this.showDuplicateDialog(
            item.duplicateInfo.existingCards,
            item.cardData,
            { isBatch: true }
          );
          results.push({ index: i, ...result });
        } catch (itemError) {
          results.push({ 
            index: i, 
            action: 'error', 
            error: itemError.message 
          });
        }
      }
      return results;
    } finally {
      // 清理對話框
      if (this.dialog) {
        this.dialog.destroy();
        this.dialog = null;
      }
    }
  }

  /**
   * 檢查對話框是否可用
   */
  isAvailable() {
    return typeof window.DuplicateDialog === 'function';
  }

  /**
   * 清理資源
   */
  cleanup() {
    if (this.dialog) {
      this.dialog.destroy();
      this.dialog = null;
    }
  }
}

// 匯出到全域
window.DuplicateDialogManager = DuplicateDialogManager;