/**
 * 統一 Manifest 管理器
 * 整合所有 manifest 相關的補救措施
 */

class UnifiedManifestManager {
  constructor() {
    this.manifestData = null;
    this.currentVersion = null;
    this.isInitialized = false;
    this.init();
  }

  init() {
    this.fixManifestLink();
    this.loadManifest();
    this.setupVersionDisplay();
  }

  // 修復 manifest 連結
  fixManifestLink() {
    let manifestLink = document.querySelector('link[rel="manifest"]');
    
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }

    // 根據環境選擇正確的 manifest
    const isGitHubPages = window.location.hostname.includes('.github.io') && 
                         window.location.pathname.includes('/DB-Card/');
    
    manifestLink.href = isGitHubPages ? './manifest-github.json' : './manifest.json';
  }

  // 載入 manifest 資料
  async loadManifest() {
    const urls = this.getManifestUrls();
    
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) {
          this.manifestData = await response.json();
          this.currentVersion = this.manifestData.version || null;
          this.isInitialized = true;
          return this.manifestData;
        }
      } catch (error) {
        continue;
      }
    }

    // 備用方案
    this.manifestData = this.getFallbackManifest();
    this.isInitialized = true;
    return this.manifestData;
  }

  getManifestUrls() {
    const isGitHubPages = window.location.hostname.includes('.github.io');
    
    if (isGitHubPages) {
      return ['./manifest-github.json', './manifest.json'];
    }
    return ['./manifest.json', './manifest-github.json'];
  }

  getFallbackManifest() {
    return {
      name: "NFC 數位名片離線儲存",
      version: null,
      start_url: "./",
      display: "standalone",
      theme_color: "#1976d2"
    };
  }

  // 設置版本顯示
  setupVersionDisplay() {
    const updateVersion = () => {
      const versionEl = document.getElementById('app-version');
      if (versionEl) {
        if (this.currentVersion) {
          versionEl.textContent = this.currentVersion.startsWith('v') ? this.currentVersion : `v${this.currentVersion}`;
        } else {
          versionEl.textContent = '載入中...';
        }
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateVersion);
    } else {
      updateVersion();
    }

    // 延遲更新確保載入完成
    setTimeout(updateVersion, 1000);
  }

  // 獲取版本
  getVersion() {
    return this.currentVersion || 'unknown';
  }

  // 檢查是否已初始化
  isReady() {
    return this.isInitialized;
  }
}

// 全域實例
window.manifestManager = new UnifiedManifestManager();

// 向後相容
window.manifestLoader = window.manifestManager;
window.loadAppVersion = (element) => {
  const version = window.manifestManager.getVersion();
  if (version && version !== 'unknown') {
    element.textContent = version.startsWith('v') ? version : `v${version}`;
  } else {
    element.textContent = '載入中...';
  }
};