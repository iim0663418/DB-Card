/**
 * 統一的 QR 碼工具
 * 提供高解析度 QR 碼生成和下載功能
 */

window.qrUtils = {
  /**
   * 生成高解析度 QR 碼 - Android 相容性增強版本
   */
  async generateHighResQRCode(url, options = {}) {
    let tempContainer = null;
    
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
      

      
      // 檢測設備類型用於優化等待時間
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      
      // 創建臨時容器
      tempContainer = document.createElement('div');
      tempContainer.style.cssText = 'position: absolute; left: -9999px; top: -9999px; visibility: hidden;';
      tempContainer.id = 'qr-temp-' + Date.now();
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
      
      // 動態等待時間：Android 設備需要更長時間
      const waitTime = isAndroid ? (isMobile ? 500 : 300) : 150;
      console.log(`[QRUtils] Waiting ${waitTime}ms for QR generation (Android: ${isAndroid}, Mobile: ${isMobile})`);
      
      // 使用更可靠的完成檢測
      const result = await this.waitForQRGeneration(tempContainer, waitTime, 3);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return {
        success: true,
        dataUrl: result.dataUrl,
        size: settings.size,
        deviceInfo: {
          isAndroid,
          isMobile,
          waitTime,
          retries: result.retries
        }
      };
    } catch (error) {
      console.error('[QRUtils] Generate QR code failed:', {
        error: error.message,
        userAgent: navigator.userAgent,
        url: url.substring(0, 100) + '...',
        options: settings
      });
      return {
        success: false,
        error: error.message,
        details: {
          isAndroid: /Android/i.test(navigator.userAgent),
          isMobile: /Mobi|Android/i.test(navigator.userAgent),
          userAgent: navigator.userAgent
        }
      };
    } finally {
      // 確保清理臨時容器
      if (tempContainer && tempContainer.parentNode) {
        try {
          document.body.removeChild(tempContainer);
        } catch (cleanupError) {
          console.warn('[QRUtils] Cleanup failed:', cleanupError);
        }
      }
    }
  },
  
  /**
   * 等待 QR 碼生成完成 - 支援重試機制
   */
  async waitForQRGeneration(container, initialWaitTime, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 基礎等待時間
        const waitTime = initialWaitTime * (attempt + 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // 檢查是否生成成功
        const img = container.querySelector('img');
        const canvas = container.querySelector('canvas');
        
        if (img && img.src && img.src.startsWith('data:')) {
          // 驗證圖片是否完整載入
          if (img.complete && img.naturalWidth > 0) {
            // Android 相容性：驗證 dataURL 完整性
            const validDataUrl = await this.validateAndFixDataUrl(img.src);
            if (validDataUrl) {
              return {
                success: true,
                dataUrl: validDataUrl,
                retries: attempt
              };
            }
          }
        }
        
        // 如果有 canvas，嘗試從 canvas 獲取
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          try {
            // Android 優先使用 JPEG 格式，相容性更好
            const isAndroid = /Android/i.test(navigator.userAgent);
            const format = isAndroid ? 'image/jpeg' : 'image/png';
            const quality = isAndroid ? 0.9 : undefined;
            
            const dataUrl = canvas.toDataURL(format, quality);
            if (dataUrl && dataUrl.length > 100) {
              const validDataUrl = await this.validateAndFixDataUrl(dataUrl);
              if (validDataUrl) {
                return {
                  success: true,
                  dataUrl: validDataUrl,
                  retries: attempt,
                  format: format
                };
              }
            }
          } catch (canvasError) {
            console.warn('[QRUtils] Canvas extraction failed:', canvasError);
          }
        }
        
        console.log(`[QRUtils] Attempt ${attempt + 1}/${maxRetries} failed, retrying...`);
      } catch (error) {
        console.warn(`[QRUtils] Wait attempt ${attempt + 1} failed:`, error);
      }
    }
    
    return {
      success: false,
      error: `QR code generation failed after ${maxRetries} attempts`,
      retries: maxRetries
    };
  },
  
  /**
   * 驗證並修復 dataURL - Android 相容性處理
   */
  async validateAndFixDataUrl(dataUrl) {
    try {
      // 基本格式檢查
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        return null;
      }
      
      // 檢查 dataURL 長度（太短表示可能損壞）
      if (dataUrl.length < 1000) {
        console.warn('[QRUtils] DataURL too short, possibly corrupted');
        return null;
      }
      
      // Android 設備：嘗試載入圖片驗證完整性
      if (/Android/i.test(navigator.userAgent)) {
        const isValid = await this.testImageLoad(dataUrl);
        if (!isValid) {
          console.warn('[QRUtils] Image validation failed on Android');
          return null;
        }
      }
      
      return dataUrl;
    } catch (error) {
      console.warn('[QRUtils] DataURL validation failed:', error);
      return null;
    }
  },
  
  /**
   * 測試圖片是否能正確載入
   */
  testImageLoad(dataUrl) {
    return new Promise((resolve) => {
      const testImg = new Image();
      const timeout = setTimeout(() => {
        resolve(false);
      }, 2000);
      
      testImg.onload = () => {
        clearTimeout(timeout);
        resolve(testImg.width > 0 && testImg.height > 0);
      };
      
      testImg.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
      
      testImg.src = dataUrl;
    });
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