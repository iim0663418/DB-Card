/**
 * Environment Detector - 環境自動檢測系統
 * 支援 GitHub Pages, Cloudflare Pages, Netlify, Vercel, Firebase 五大平台
 * 
 * @module EnvironmentDetector
 * @version 3.2.0
 */

/**
 * 檢測當前部署環境
 * @returns {Promise<Object>} 環境配置
 */
export async function detectEnvironment() {
  const hostname = getHostname();
  
  try {
    if (hostname.includes('.github.io')) {
      return await loadConfig('github-pages');
    } else if (hostname.includes('.pages.dev')) {
      return await loadConfig('cloudflare-pages');
    } else if (hostname.includes('.netlify.app')) {
      return await loadConfig('netlify');
    } else if (hostname.includes('.vercel.app')) {
      return await loadConfig('vercel');
    } else if (hostname.includes('.web.app') || hostname.includes('.firebaseapp.com')) {
      return await loadConfig('firebase');
    }
    
    return await loadConfig('default');
  } catch (error) {
    console.warn('Environment detection failed, using default config');
    return await loadConfig('default');
  }
}

/**
 * 獲取主機名稱（可測試）
 * @returns {string} 主機名稱
 */
export function getHostname() {
  return globalThis.window?.location?.hostname || 'localhost';
}

/**
 * 載入平台配置
 * @param {string} platform - 平台名稱
 * @returns {Promise<Object>} 配置對象
 */
export async function loadConfig(platform) {
  const configs = {
    'github-pages': {
      platform: 'github-pages',
      basePath: '/DB-Card',
      manifestPath: './manifest-github.json',
      serviceWorkerPath: './sw.js',
      assetPrefix: '/DB-Card/pwa-card-storage',
      features: {
        pushNotifications: false,
        backgroundSync: true,
        installPrompt: true
      },
      security: {
        cspEnabled: true,
        sriEnabled: true,
        httpsOnly: true
      }
    },
    'cloudflare-pages': {
      platform: 'cloudflare-pages',
      basePath: '',
      manifestPath: './manifest.json',
      serviceWorkerPath: './sw.js',
      assetPrefix: '',
      features: {
        pushNotifications: true,
        backgroundSync: true,
        installPrompt: true
      },
      security: {
        cspEnabled: true,
        sriEnabled: true,
        httpsOnly: true
      }
    },
    'netlify': {
      platform: 'netlify',
      basePath: '',
      manifestPath: './manifest.json',
      serviceWorkerPath: './sw.js',
      assetPrefix: '',
      features: {
        pushNotifications: true,
        backgroundSync: true,
        installPrompt: true
      },
      security: {
        cspEnabled: true,
        sriEnabled: true,
        httpsOnly: true
      }
    },
    'vercel': {
      platform: 'vercel',
      basePath: '',
      manifestPath: './manifest.json',
      serviceWorkerPath: './sw.js',
      assetPrefix: '',
      features: {
        pushNotifications: true,
        backgroundSync: true,
        installPrompt: true
      },
      security: {
        cspEnabled: true,
        sriEnabled: true,
        httpsOnly: true
      }
    },
    'firebase': {
      platform: 'firebase',
      basePath: '',
      manifestPath: './manifest.json',
      serviceWorkerPath: './sw.js',
      assetPrefix: '',
      features: {
        pushNotifications: true,
        backgroundSync: true,
        installPrompt: true
      },
      security: {
        cspEnabled: true,
        sriEnabled: true,
        httpsOnly: true
      }
    },
    'default': {
      platform: 'default',
      basePath: '',
      manifestPath: './manifest.json',
      serviceWorkerPath: './sw.js',
      assetPrefix: '',
      features: {
        pushNotifications: false,
        backgroundSync: true,
        installPrompt: true
      },
      security: {
        cspEnabled: true,
        sriEnabled: false,
        httpsOnly: false
      }
    }
  };

  return configs[platform] || configs['default'];
}

/**
 * 驗證配置完整性
 * @param {Object} config - 配置對象
 * @returns {Object} 驗證結果
 */
export function validateConfig(config) {
  const errors = [];
  
  if (!config.platform) errors.push('Platform is required');
  if (!config.manifestPath) errors.push('Manifest path is required');
  if (!config.serviceWorkerPath) errors.push('Service worker path is required');
  
  return {
    valid: errors.length === 0,
    errors
  };
}