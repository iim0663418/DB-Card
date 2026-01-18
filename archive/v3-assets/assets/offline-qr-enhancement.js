/**
 * 離線 vCard QR 碼增強功能
 * 擴展現有 generateQRCode() 函數，整合 PWA QR 碼生成機制
 * 版本: v3.0.4 | 任務: OFFLINE-01
 */

(function() {
  'use strict';
  
  // 保存原始函數
  const originalGenerateQRCode = window.generateQRCode;
  
  // 重新定義 generateQRCode 函數
  window.generateQRCode = function() {
    const isOnline = navigator.onLine;
    
    if (isOnline) {
      // 線上模式：使用原始邏輯
      if (originalGenerateQRCode) {
        originalGenerateQRCode();
      } else {
        generateOnlineQR();
      }
    } else {
      // 離線模式：生成 vCard QR 碼（整合 PWA 機制）
      generateOfflineVCardQR();
    }
  };
  
  // 離線 vCard QR 碼生成（整合 PWA 統一工具）
  function generateOfflineVCardQR() {
    try {
      const cardData = getCardDataFromNFC();
      if (!cardData) {
        console.error('[Offline QR] 無法獲取名片資料');
        return;
      }
      
      // 優先使用 PWA 的統一 QR 工具
      if (window.qrUtils && window.qrUtils.generateHighResQRCode) {
        generateOfflineQRWithPWAUtils(cardData);
      } else {
        // 備用：使用原始方法
        generateOfflineQRFallback(cardData);
      }
      
    } catch (error) {
      console.error('[Offline QR] 離線 QR 碼生成失敗:', error);
      generateOnlineQR(); // 降級到線上模式
    }
  }
  
  // 使用 PWA 統一 QR 工具生成（非同步）
  async function generateOfflineQRWithPWAUtils(cardData) {
    try {
      const vCardContent = generateVCardContent ? 
        generateVCardContent(cardData) : 
        generateBasicVCard(cardData);
      
      console.log('[Offline QR] 使用 PWA 統一工具生成 vCard QR 碼');
      
      const result = await window.qrUtils.generateHighResQRCode(vCardContent, {
        size: 240,
        colorDark: '#6b7280',
        colorLight: '#ffffff'
      });
      
      if (result.success) {
        displayQRFromDataUrl(result.dataUrl);
        updateQRLabel('offline');
        console.log('[Offline QR] PWA QR 碼生成成功');
      } else {
        throw new Error(result.error || 'PWA QR 生成失敗');
      }
    } catch (error) {
      console.warn('[Offline QR] PWA 工具失敗，使用備用方法:', error);
      generateOfflineQRFallback(cardData);
    }
  }
  
  // 備用 QR 碼生成方法
  function generateOfflineQRFallback(cardData) {
    const vCardContent = generateVCardContent ? 
      generateVCardContent(cardData) : 
      generateBasicVCard(cardData);
    
    console.log('[Offline QR] 使用備用方法生成 QR 碼');
    
    const qrContainer = document.getElementById('qrcode');
    if (!qrContainer) return;
    
    while (qrContainer.firstChild) {
      qrContainer.removeChild(qrContainer.firstChild);
    }
    
    const outerContainer = document.createElement('div');
    outerContainer.className = 'qr-code-wrapper';
    const innerContainer = document.createElement('div');
    innerContainer.className = 'qr-code-inner';
    outerContainer.appendChild(innerContainer);
    qrContainer.appendChild(outerContainer);
    
    new QRCode(innerContainer, {
      text: vCardContent,
      width: 240,
      height: 240,
      colorDark: "#6b7280",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
    
    updateQRLabel('offline');
  }
  
  // 從 DataURL 顯示 QR 碼（PWA 工具生成的結果）
  function displayQRFromDataUrl(dataUrl) {
    const qrContainer = document.getElementById('qrcode');
    if (!qrContainer) return;
    
    while (qrContainer.firstChild) {
      qrContainer.removeChild(qrContainer.firstChild);
    }
    
    const outerContainer = document.createElement('div');
    outerContainer.className = 'qr-code-wrapper';
    const innerContainer = document.createElement('div');
    innerContainer.className = 'qr-code-inner';
    
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.width = '240px';
    img.style.height = '240px';
    img.style.display = 'block';
    img.alt = 'vCard QR Code';
    
    innerContainer.appendChild(img);
    outerContainer.appendChild(innerContainer);
    qrContainer.appendChild(outerContainer);
  }
  
  // 線上 QR 碼生成（備用）
  function generateOnlineQR() {
    const currentURL = window.location.href;
    const qrContainer = document.getElementById('qrcode');
    if (!qrContainer) return;
    
    while (qrContainer.firstChild) {
      qrContainer.removeChild(qrContainer.firstChild);
    }
    
    const outerContainer = document.createElement('div');
    outerContainer.className = 'qr-code-wrapper';
    const innerContainer = document.createElement('div');
    innerContainer.className = 'qr-code-inner';
    outerContainer.appendChild(innerContainer);
    qrContainer.appendChild(outerContainer);
    
    new QRCode(innerContainer, {
      text: currentURL,
      width: 240,
      height: 240,
      colorDark: "#6b7280",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
    
    updateQRLabel('online');
  }
  
  // 更新 QR 碼說明文字
  function updateQRLabel(mode) {
    const qrLabel = document.querySelector('.qr-label');
    if (!qrLabel) return;
    
    if (mode === 'offline') {
      qrLabel.textContent = '離線模式：這是包含完整聯絡資訊的 vCard QR 碼，掃描後可直接加入通訊錄';
    } else {
      qrLabel.textContent = '這是這張名片的 QR code，你也可以請別人掃描來讀取這張名片';
    }
  }
  
  // 基本 vCard 生成（備用）
  function generateBasicVCard(cardData) {
    const data = cardData.data;
    const vCardLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${data.name}`,
      `ORG:${data.organization || '數位發展部'}`,
      `TITLE:${data.title || ''}`,
      `EMAIL:${data.email || ''}`,
      data.phone ? `TEL:${data.phone}` : '',
      data.mobile ? `TEL:${data.mobile}` : '',
      'END:VCARD'
    ].filter(line => line.trim() !== '');
    
    return vCardLines.join('\r\n');
  }
  
  // 檢測 PWA 工具可用性
  function checkPWAToolsAvailability() {
    const available = {
      qrUtils: !!window.qrUtils,
      generateHighResQRCode: !!(window.qrUtils && window.qrUtils.generateHighResQRCode),
      offlineTools: !!window.OfflineToolsManager
    };
    
    console.log('[Offline QR Enhancement] PWA 工具可用性:', available);
    return available;
  }
  
  // 初始化時檢查工具可用性
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkPWAToolsAvailability);
  } else {
    checkPWAToolsAvailability();
  }
  
  console.log('[Offline QR Enhancement] 離線 vCard QR 碼功能已載入（整合 PWA 機制）');
})();