/**
 * 統一的 QR 碼工具
 * 提供高解析度 QR 碼生成和下載功能
 */

window.qrUtils = {
  /**
   * 生成高解析度 QR 碼
   */
  async generateHighResQRCode(url, options = {}) {
    try {
      if (!window.QRCode) {
        throw new Error('QRCode library not loaded');
      }
      
      const settings = {
        size: options.size || 800,
        colorDark: options.colorDark || '#6b7280',
        colorLight: options.colorLight || '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
        ...options
      };
      
      // 創建臨時容器
      const tempContainer = document.createElement('div');
      tempContainer.style.display = 'none';
      document.body.appendChild(tempContainer);
      
      // 生成 QR 碼
      const qr = new QRCode(tempContainer, {
        text: url,
        width: settings.size,
        height: settings.size,
        colorDark: settings.colorDark,
        colorLight: settings.colorLight,
        correctLevel: settings.correctLevel
      });
      
      // 等待生成完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 獲取生成的圖片
      const img = tempContainer.querySelector('img');
      if (!img) {
        throw new Error('QR code generation failed');
      }
      
      const dataUrl = img.src;
      
      // 清理臨時容器
      document.body.removeChild(tempContainer);
      
      return {
        success: true,
        dataUrl,
        size: settings.size
      };
    } catch (error) {
      console.error('[QRUtils] Generate QR code failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * 下載 QR 碼圖片
   */
  async downloadQRCode(dataUrl, filename = 'qr-code.png') {
    try {
      // 創建下載連結
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      
      // 觸發下載
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true };
    } catch (error) {
      console.error('[QRUtils] Download QR code failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * 生成智慧檔名
   */
  generateSmartFilename(name, language = 'zh') {
    const cleanName = name ? name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_') : 'card';
    const suffix = language === 'en' ? '_Digital_Card.png' : '_數位名片.png';
    return cleanName + suffix;
  }
};