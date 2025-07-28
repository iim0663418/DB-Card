/**
 * QR 掃描器模組
 * 使用 HTML5 QR Code Scanner 實作 QR 碼掃描功能
 */

class QRScanner {
  constructor() {
    this.isScanning = false;
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.context = null;
    this.scanInterval = null;
    this.onSuccessCallback = null;
    this.onErrorCallback = null;
  }

  // 請求相機權限
  async requestCameraPermission() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('此瀏覽器不支援相機功能');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      // 測試成功後關閉
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('相機權限請求失敗:', error);
      return false;
    }
  }

  // 開始掃描
  async startScan(videoElement) {
    try {
      if (this.isScanning) return;

      this.video = videoElement;
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');

      // 請求相機串流
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      this.video.srcObject = this.stream;
      this.video.play();

      this.isScanning = true;

      // 等待視頻載入
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;
          resolve();
        };
      });

      // 開始掃描循環
      this.scanInterval = setInterval(() => {
        this.scanFrame();
      }, 100);

    } catch (error) {
      console.error('啟動掃描失敗:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    }
  }

  // 掃描單幀
  scanFrame() {
    if (!this.isScanning || !this.video || !this.canvas) return;

    try {
      // 將視頻幀繪製到 canvas
      this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      
      // 獲取圖像資料
      const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      // 使用 jsQR 解析 QR 碼
      if (window.jsQR) {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code && code.data) {
          this.handleScanSuccess(code.data);
        }
      }
    } catch (error) {
      console.error('掃描幀處理失敗:', error);
    }
  }

  // 處理掃描成功
  handleScanSuccess(data) {
    if (this.onSuccessCallback) {
      this.onSuccessCallback(data);
    }
    this.stopScan();
  }

  // 停止掃描
  stopScan() {
    this.isScanning = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
  }

  // 設定成功回調
  onScanSuccess(callback) {
    this.onSuccessCallback = callback;
  }

  // 設定錯誤回調
  onScanError(callback) {
    this.onErrorCallback = callback;
  }

  // 檢查瀏覽器支援
  static isSupported() {
    return !!(navigator.mediaDevices && 
              navigator.mediaDevices.getUserMedia && 
              window.jsQR);
  }
}

// 全域實例
window.qrScanner = new QRScanner();