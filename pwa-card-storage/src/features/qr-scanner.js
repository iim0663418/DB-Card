/**
 * PWA-19: QR 碼掃描功能整合
 * 整合 html5-qrcode 函式庫，實作相機掃描和檔案上傳掃描功能
 */

class QRScannerManager {
  constructor(cardManager) {
    this.cardManager = cardManager;
    this.html5QrCode = null;
    this.isScanning = false;
    this.scannerElement = null;
    this.currentModal = null;
    this.initializationFailed = false;
    
    // 掃描配置
    this.scannerConfig = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      facingMode: 'environment'
    };
    
    console.log('[QRScanner] QR Scanner Manager initialized');
  }

  /**
   * 初始化 QR 掃描器 - UAT 修復版本
   */
  async initialize() {
    try {
      // 檢查 html5-qrcode 是否可用
      if (typeof Html5Qrcode === 'undefined') {
        console.error('[QRScanner] html5-qrcode library not found, attempting dynamic load');
        
        // 嘗試動態載入
        try {
          await this.loadHtml5QrCodeLibrary();
        } catch (loadError) {
          console.warn('[QRScanner] Dynamic load failed, will use manual input only');
          this.initializationFailed = true;
          return false; // 不拋出錯誤，允許應用程式繼續運行
        }
      }
      
      console.log('[QRScanner] QR Scanner initialized successfully');
      this.initializationFailed = false;
      return true;
    } catch (error) {
      console.error('[QRScanner] Initialization failed:', error);
      this.initializationFailed = true;
      return false; // 優雅降級而非拋出錯誤
    }
  }

  /**
   * 動態載入 html5-qrcode 函式庫
   */
  async loadHtml5QrCodeLibrary() {
    return new Promise((resolve, reject) => {
      // 檢查是否已經載入
      if (typeof Html5Qrcode !== 'undefined') {
        resolve();
        return;
      }

      // 創建 script 標籤
      const script = document.createElement('script');
      script.src = 'assets/html5-qrcode.min.js';
      script.onload = () => {
        console.log('[QRScanner] html5-qrcode library loaded dynamically');
        resolve();
      };
      script.onerror = () => {
        console.error('[QRScanner] Failed to load html5-qrcode library');
        reject(new Error('無法載入 QR 掃描庫'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * 開啟 QR 掃描器介面 - UAT 修復版本
   */
  async openScannerModal() {
    try {
      console.log('[QRScanner] Opening scanner modal...');
      
      // 如果初始化失敗，顯示完整的手動輸入介面而非「開發中」
      if (this.initializationFailed) {
        console.warn('[QRScanner] Scanner initialization failed, showing manual input only');
        this.createManualInputModal();
        return;
      }
      
      // 檢查相機權限
      const hasCamera = await this.checkCameraPermission();
      
      // 創建掃描介面
      this.createScannerModal(hasCamera);
      
      if (hasCamera) {
        // 延遲啟動相機，等待 DOM 渲染完成
        setTimeout(() => {
          this.startCameraScanning();
        }, 500);
      }
      
    } catch (error) {
      console.error('[QRScanner] Failed to open scanner modal:', error);
      // 顯示手動輸入介面作為備用方案
      this.createManualInputModal();
    }
  }

  /**
   * 創建純手動輸入介面（當掃描功能不可用時）
   */
  createManualInputModal() {
    // 移除現有的 modal
    if (this.currentModal) {
      this.currentModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal qr-scanner-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>📱 名片匯入</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="scanner-unavailable-notice">
            <div class="notice-icon">⚠️</div>
            <h3>相機掃描暫時無法使用</h3>
            <p>請使用以下方式匯入名片：</p>
          </div>
          
          <div class="manual-input-section">
            <h3>📝 手動輸入名片連結</h3>
            <p>請貼上完整的名片連結：</p>
            <input type="url" id="manual-url-input" placeholder="https://example.com/index.html?data=..." class="url-input">
            <button id="manual-import" class="btn btn-primary">匯入名片</button>
          </div>
          
          <div class="file-upload-section">
            <h3>📁 上傳 QR 碼圖片</h3>
            <p>選擇包含 QR 碼的圖片檔案：</p>
            <input type="file" id="qr-file-input" accept="image/*" class="file-input hidden">
            <button id="upload-qr" class="btn btn-primary">選擇圖片</button>
          </div>
          
          <div class="help-section">
            <h4>💡 使用說明</h4>
            <ul>
              <li>從其他人的數位名片複製完整連結</li>
              <li>確保連結包含 ?data= 或 ?c= 參數</li>
              <li>支援所有 DB-Card 格式的名片</li>
              <li>可上傳 QR 碼圖片進行識別</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // 添加事件監聽器
    this.setupManualModalEventListeners(modal);
    
    document.body.appendChild(modal);
    this.currentModal = modal;
    
    console.log('[QRScanner] Manual input modal created');
  }

  /**
   * 設置手動輸入 modal 事件監聽器
   */
  setupManualModalEventListeners(modal) {
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const fileInput = modal.querySelector('#qr-file-input');
    const uploadBtn = modal.querySelector('#upload-qr');
    const manualInput = modal.querySelector('#manual-url-input');
    const manualImportBtn = modal.querySelector('#manual-import');

    // 關閉事件
    const closeModal = () => {
      this.closeScannerModal();
    };

    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    // 檔案上傳事件
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.scanFile(e.target.files[0]);
      }
    });

    // 手動輸入事件
    manualImportBtn.addEventListener('click', () => {
      const url = manualInput.value.trim();
      if (url) {
        this.processManualUrl(url);
      } else {
        this.showError('請輸入有效的連結');
      }
    });

    // Enter 鍵支援
    manualInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        manualImportBtn.click();
      }
    });
  }

  /**
   * 檢查相機權限
   */
  async checkCameraPermission() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[QRScanner] Camera API not supported');
        return false;
      }

      // 嘗試獲取相機權限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // 立即停止串流，只是檢查權限
      stream.getTracks().forEach(track => track.stop());
      
      console.log('[QRScanner] Camera permission granted');
      return true;
    } catch (error) {
      console.warn('[QRScanner] Camera permission denied or not available:', error);
      return false;
    }
  }

  /**
   * 創建掃描器介面
   */
  createScannerModal(hasCamera) {
    // 移除現有的 modal
    if (this.currentModal) {
      this.currentModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal qr-scanner-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>📱 QR 碼掃描</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          ${hasCamera ? `
            <div class="scanner-section">
              <div id="qr-reader" class="qr-reader"></div>
              <div class="scanner-controls">
                <button id="start-scan" class="btn btn-primary">開始掃描</button>
                <button id="stop-scan" class="btn btn-secondary hidden">停止掃描</button>
                <button id="switch-camera" class="btn btn-secondary hidden">切換相機</button>
              </div>
            </div>
            <div class="divider">或</div>
          ` : `
            <div class="no-camera-notice">
              <p>⚠️ 無法使用相機功能，請使用以下方式：</p>
            </div>
          `}
          <div class="file-upload-section">
            <h3>上傳 QR 碼圖片</h3>
            <input type="file" id="qr-file-input" accept="image/*" class="file-input">
            <button id="upload-qr" class="btn btn-primary">選擇圖片</button>
          </div>
          <div class="manual-input-section">
            <h3>手動輸入連結</h3>
            <input type="url" id="manual-url-input" placeholder="貼上名片連結..." class="url-input">
            <button id="manual-import" class="btn btn-primary">匯入名片</button>
          </div>
          <div class="scan-result hidden" id="scan-result">
            <h3>掃描結果</h3>
            <div class="result-content">
              <p id="result-text"></p>
              <div class="result-actions">
                <button id="import-result" class="btn btn-primary">匯入此名片</button>
                <button id="scan-again" class="btn btn-secondary">重新掃描</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 添加事件監聽器
    this.setupModalEventListeners(modal, hasCamera);
    
    document.body.appendChild(modal);
    this.currentModal = modal;
    
    console.log('[QRScanner] Scanner modal created');
  }

  /**
   * 設置 modal 事件監聽器
   */
  setupModalEventListeners(modal, hasCamera) {
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const fileInput = modal.querySelector('#qr-file-input');
    const uploadBtn = modal.querySelector('#upload-qr');
    const manualInput = modal.querySelector('#manual-url-input');
    const manualImportBtn = modal.querySelector('#manual-import');

    // 關閉事件
    const closeModal = () => {
      this.closeScannerModal();
    };

    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    // 檔案上傳事件
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.scanFile(e.target.files[0]);
      }
    });

    // 手動輸入事件
    manualImportBtn.addEventListener('click', () => {
      const url = manualInput.value.trim();
      if (url) {
        this.processManualUrl(url);
      } else {
        this.showError('請輸入有效的連結');
      }
    });

    // 相機控制事件（如果有相機）
    if (hasCamera) {
      const startBtn = modal.querySelector('#start-scan');
      const stopBtn = modal.querySelector('#stop-scan');
      const switchBtn = modal.querySelector('#switch-camera');

      startBtn.addEventListener('click', () => {
        this.startCameraScanning();
      });

      stopBtn.addEventListener('click', () => {
        this.stopScanning();
      });

      switchBtn.addEventListener('click', () => {
        this.switchCamera();
      });
    }

    // 掃描結果事件
    const importResultBtn = modal.querySelector('#import-result');
    const scanAgainBtn = modal.querySelector('#scan-again');

    if (importResultBtn) {
      importResultBtn.addEventListener('click', () => {
        this.importScannedResult();
      });
    }

    if (scanAgainBtn) {
      scanAgainBtn.addEventListener('click', () => {
        this.resetScanner();
      });
    }
  }

  /**
   * 開始相機掃描 - 簡化版本
   */
  async startCameraScanning() {
    try {
      console.log('[QRScanner] Starting camera scanning...');
      
      if (this.isScanning) {
        console.warn('[QRScanner] Scanner already running');
        return;
      }

      const readerElement = document.getElementById('qr-reader');
      if (!readerElement) {
        throw new Error('Scanner element not found');
      }

      // 使用 Html5QrcodeScanner 而非 Html5Qrcode
      this.html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader", 
        { fps: 10, qrbox: 250 }
      );
      
      // 渲染掃描器
      this.html5QrcodeScanner.render(
        (decodedText, decodedResult) => {
          console.log('[QRScanner] QR Code detected:', decodedText);
          this.onScanSuccess(decodedText, decodedResult);
          // 掃描成功後停止掃描
          this.html5QrcodeScanner.clear();
        },
        (errorMessage) => {
          // 只記錄非常見的掃描錯誤
          if (!errorMessage.includes('No QR code found')) {
            console.warn('[QRScanner] Scan error:', errorMessage);
          }
        }
      );

      this.isScanning = true;
      this.updateScannerUI(true);
      
      console.log('[QRScanner] Camera scanning started successfully');
    } catch (error) {
      console.error('[QRScanner] Failed to start camera scanning:', error);
      this.showError('無法啟動相機掃描：' + error.message);
    }
  }

  /**
   * 停止掃描
   */
  async stopScanning() {
    try {
      if (this.html5QrcodeScanner && this.isScanning) {
        this.html5QrcodeScanner.clear();
        this.html5QrcodeScanner = null;
        this.isScanning = false;
        this.updateScannerUI(false);
        console.log('[QRScanner] Scanning stopped');
      }
    } catch (error) {
      console.error('[QRScanner] Failed to stop scanning:', error);
    }
  }

  /**
   * 切換相機
   */
  async switchCamera() {
    try {
      if (!this.isScanning) return;

      // 停止當前掃描
      await this.stopScanning();
      
      // 切換相機方向
      this.scannerConfig.facingMode = 
        this.scannerConfig.facingMode === 'environment' ? 'user' : 'environment';
      
      // 重新開始掃描
      setTimeout(() => {
        this.startCameraScanning();
      }, 500);
      
    } catch (error) {
      console.error('[QRScanner] Failed to switch camera:', error);
      this.showError('切換相機失敗');
    }
  }

  /**
   * 掃描檔案
   */
  async scanFile(file) {
    try {
      console.log('[QRScanner] Scanning file:', file.name);
      
      // 使用 Html5Qrcode 進行檔案掃描
      const html5QrCode = new Html5Qrcode('qr-reader');
      const result = await html5QrCode.scanFile(file, true);
      console.log('[QRScanner] File scan result:', result);
      
      this.onScanSuccess(result, null);
    } catch (error) {
      console.error('[QRScanner] File scan failed:', error);
      this.showError('無法識別圖片中的 QR 碼，請確認圖片清晰且包含有效的 QR 碼');
    }
  }

  /**
   * 處理手動輸入的 URL
   */
  async processManualUrl(url) {
    try {
      console.log('[QRScanner] Processing manual URL:', url);
      
      // 解析 URL 參數
      const urlObj = new URL(url);
      const data = urlObj.searchParams.get('data') || urlObj.searchParams.get('c');
      
      if (!data) {
        // 檢查 hash 參數
        if (urlObj.hash && urlObj.hash.startsWith('#c=')) {
          const hashData = urlObj.hash.substring(3);
          this.onScanSuccess(url, null, hashData);
        } else {
          throw new Error('連結中未找到名片資料');
        }
      } else {
        this.onScanSuccess(url, null, data);
      }
    } catch (error) {
      console.error('[QRScanner] Manual URL processing failed:', error);
      this.showError('無法解析連結：' + error.message);
    }
  }

  /**
   * 掃描成功處理 - 直接處理名片資料
   */
  async onScanSuccess(qrText, decodedResult, cardData = null) {
    try {
      console.log('[QRScanner] Scan success:', qrText);
      console.log('[QRScanner] Processing scan result...');
      
      // 停止掃描
      if (this.isScanning) {
        await this.stopScanning();
      }

      // 解析名片資料
      let processedCardData = null;
      
      if (qrText.startsWith('http')) {
        // 如果是 URL，解析參數
        try {
          const url = new URL(qrText);
          const data = url.searchParams.get('data') || url.searchParams.get('c');
          if (data && window.app && typeof window.app.getCardDataFromNFC === 'function') {
            processedCardData = window.app.getCardDataFromNFC(data);
          }
        } catch (urlError) {
          console.warn('[QRScanner] URL parsing failed:', urlError);
        }
      }
      
      if (processedCardData) {
        // 直接儲存名片
        try {
          if (this.cardManager && typeof this.cardManager.storeCard === 'function') {
            await this.cardManager.storeCard(processedCardData);
            console.log('[QRScanner] Card stored successfully');
            
            // 顯示成功訊息
            if (window.app && typeof window.app.showNotification === 'function') {
              window.app.showNotification(`名片「${processedCardData.name || '未知'}」已成功匯入！`, 'success');
            } else {
              alert(`名片「${processedCardData.name || '未知'}」已成功匯入！`);
            }
            
            // 關閉掃描器
            this.closeScannerModal();
            
            // 重新載入名片列表
            if (window.app && typeof window.app.loadCards === 'function') {
              window.app.loadCards();
            }
            
            return; // 成功處理，結束函數
          }
        } catch (storeError) {
          console.error('[QRScanner] Failed to store card:', storeError);
          this.showError('儲存名片失敗：' + storeError.message);
          return;
        }
      }
      
      // 如果無法處理為名片，顯示結果供手動處理
      this.showScanResult(qrText, qrText);
      
    } catch (error) {
      console.error('[QRScanner] Scan success processing failed:', error);
      this.showError('處理掃描結果失敗：' + error.message);
    }
  }

  /**
   * 解析 QR 碼資料
   */
  parseQRData(qrText) {
    try {
      console.log('[QRScanner] Parsing QR data:', qrText);
      
      // 檢查是否為 DB-Card 格式的 URL
      if (qrText.includes('data=') || qrText.includes('c=')) {
        try {
          const url = new URL(qrText);
          const data = url.searchParams.get('data') || url.searchParams.get('c');
          
          if (data) {
            console.log('[QRScanner] Found URL parameter data:', data);
            return data;
          }
        } catch (urlError) {
          console.warn('[QRScanner] URL parsing failed:', urlError);
        }
      }
      
      // 檢查 hash 參數
      if (qrText.includes('#c=')) {
        const hashIndex = qrText.indexOf('#c=');
        const hashData = qrText.substring(hashIndex + 3);
        console.log('[QRScanner] Found hash data:', hashData);
        return hashData;
      }
      
      // 檢查是否為直接的 Base64 資料
      if (this.isValidBase64(qrText)) {
        console.log('[QRScanner] Found Base64 data');
        return qrText;
      }
      
      // 如果都不是，返回原始文本
      console.log('[QRScanner] No special format detected, returning raw text');
      return qrText;
      
    } catch (error) {
      console.error('[QRScanner] QR data parsing failed:', error);
      return qrText; // 返回原始文本而不是 null
    }
  }

  /**
   * 檢查是否為有效的 Base64
   */
  isValidBase64(str) {
    try {
      return btoa(atob(str)) === str;
    } catch (err) {
      return false;
    }
  }

  /**
   * 顯示掃描結果
   */
  showScanResult(qrText, cardData) {
    console.log('[QRScanner] Showing scan result:', { qrText, cardData });
    
    const resultSection = document.getElementById('scan-result');
    const resultText = document.getElementById('result-text');
    
    if (resultSection && resultText) {
      // 嘗試解析名片資料以顯示預覽
      let previewText = '檢測到 QR 碼內容';
      
      // 檢查是否為 URL
      if (qrText.startsWith('http')) {
        previewText = '檢測到網址 QR 碼';
      } else if (qrText.includes('data=') || qrText.includes('c=')) {
        previewText = '檢測到名片 QR 碼';
      }
      
      // 顯示部分內容預覽
      const preview = qrText.length > 50 ? qrText.substring(0, 50) + '...' : qrText;
      
      resultText.innerHTML = `
        <strong>${previewText}</strong><br>
        <small style="color: #666;">${preview}</small>
      `;
      
      resultSection.classList.remove('hidden');
      resultSection.classList.add('block-visible');
      
      // 儲存掃描結果供後續使用
      this.lastScanResult = {
        qrText,
        cardData
      };
      
      console.log('[QRScanner] Scan result displayed successfully');
    } else {
      console.error('[QRScanner] Result elements not found');
    }
  }

  /**
   * 匯入掃描結果 - 實際處理名片資料
   */
  async importScannedResult() {
    try {
      if (!this.lastScanResult) {
        throw new Error('沒有可匯入的掃描結果');
      }

      console.log('[QRScanner] Importing scanned result:', this.lastScanResult);
      
      const { qrText } = this.lastScanResult;
      
      // 解析名片資料
      let cardData = null;
      
      if (qrText.startsWith('http')) {
        // 如果是 URL，解析參數
        try {
          const url = new URL(qrText);
          const data = url.searchParams.get('data') || url.searchParams.get('c');
          if (data) {
            // 使用 app 的解析方法
            if (window.app && typeof window.app.getCardDataFromNFC === 'function') {
              cardData = window.app.getCardDataFromNFC(data);
            }
          }
        } catch (urlError) {
          console.warn('[QRScanner] URL parsing failed:', urlError);
        }
      }
      
      if (cardData) {
        // 儲存名片到本地
        if (this.cardManager && typeof this.cardManager.storeCard === 'function') {
          await this.cardManager.storeCard(cardData);
          console.log('[QRScanner] Card stored successfully');
          
          // 顯示成功訊息
          if (window.app && typeof window.app.showNotification === 'function') {
            window.app.showNotification('名片已成功匯入！', 'success');
          } else {
            alert('名片已成功匯入！');
          }
          
          // 關閉掃描器
          this.closeScannerModal();
          
          // 重新載入名片列表
          if (window.app && typeof window.app.loadCards === 'function') {
            window.app.loadCards();
          }
        } else {
          throw new Error('Card manager not available');
        }
      } else {
        // 如果無法解析為名片，顯示原始內容
        if (qrText.startsWith('http')) {
          window.open(qrText, '_blank');
        } else {
          alert('掃描結果：\n' + qrText);
        }
        this.closeScannerModal();
      }
      
    } catch (error) {
      console.error('[QRScanner] Import scanned result failed:', error);
      this.showError('處理掃描結果失敗：' + error.message);
    }
  }

  /**
   * 重置掃描器
   */
  resetScanner() {
    const resultSection = document.getElementById('scan-result');
    if (resultSection) {
      resultSection.classList.add('hidden');
      resultSection.classList.remove('block-visible');
    }
    
    this.lastScanResult = null;
    
    // 重新開始掃描
    setTimeout(() => {
      this.startCameraScanning();
    }, 500);
  }

  /**
   * 關閉掃描器介面
   */
  async closeScannerModal() {
    try {
      // 停止掃描
      if (this.isScanning) {
        await this.stopScanning();
      }
      
      // 清理 Html5QrcodeScanner
      if (this.html5QrcodeScanner) {
        try {
          this.html5QrcodeScanner.clear();
        } catch (clearError) {
          console.warn('[QRScanner] Scanner clear failed:', clearError);
        }
        this.html5QrcodeScanner = null;
      }
      
      // 移除 modal
      if (this.currentModal) {
        this.currentModal.remove();
        this.currentModal = null;
      }
      
      // 清理狀態
      this.lastScanResult = null;
      this.isScanning = false;
      
      console.log('[QRScanner] Scanner modal closed');
    } catch (error) {
      console.error('[QRScanner] Failed to close scanner modal:', error);
    }
  }

  /**
   * 更新掃描器 UI 狀態
   */
  updateScannerUI(isScanning) {
    const startBtn = document.getElementById('start-scan');
    const stopBtn = document.getElementById('stop-scan');
    const switchBtn = document.getElementById('switch-camera');
    
    if (startBtn) {
      if (isScanning) {
        startBtn.classList.add('hidden');
      } else {
        startBtn.classList.remove('hidden');
      }
    }
    if (stopBtn) {
      if (isScanning) {
        stopBtn.classList.remove('hidden');
      } else {
        stopBtn.classList.add('hidden');
      }
    }
    if (switchBtn) {
      if (isScanning) {
        switchBtn.classList.remove('hidden');
      } else {
        switchBtn.classList.add('hidden');
      }
    }
  }

  /**
   * 顯示錯誤訊息
   */
  showError(message) {
    console.error('[QRScanner] Error:', message);
    
    if (window.app && typeof window.app.showNotification === 'function') {
      window.app.showNotification(message, 'error');
    } else {
      alert('QR Scanner 錯誤：\n' + message);
    }
  }

  /**
   * 獲取相機列表
   */
  async getCameras() {
    try {
      if (this.html5QrCode) {
        return await Html5Qrcode.getCameras();
      }
      return [];
    } catch (error) {
      console.error('[QRScanner] Failed to get cameras:', error);
      return [];
    }
  }

  /**
   * 檢查掃描器狀態
   */
  getStatus() {
    return {
      isScanning: this.isScanning,
      hasCamera: !!this.html5QrCode,
      isModalOpen: !!this.currentModal
    };
  }
}

// 全域實例
window.QRScannerManager = QRScannerManager;

console.log('[QRScanner] QR Scanner Manager class loaded');