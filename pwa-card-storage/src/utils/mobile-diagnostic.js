/**
 * 移動端診斷工具 - 簡化版
 * 專注於 Manifest 相關問題診斷
 */

window.showManifestDiagnostic = async function() {
  const results = {
    environment: {
      url: window.location.href,
      hostname: window.location.hostname,
      isGitHubPages: window.location.hostname.includes('.github.io'),
      isMobile: /Mobi|Android/i.test(navigator.userAgent)
    },
    manifest: {
      linkHref: document.querySelector('link[rel="manifest"]')?.href,
      managerReady: window.manifestManager?.isReady(),
      currentVersion: window.manifestManager?.getVersion()
    },
    tests: []
  };

  // 測試 manifest 載入
  const testUrls = ['./manifest.json', './manifest-github.json'];
  for (const url of testUrls) {
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      const test = { url, status: response.status, ok: response.ok };
      if (response.ok) {
        const manifest = await response.json();
        test.version = manifest.version;
      }
      results.tests.push(test);
    } catch (error) {
      results.tests.push({ url, error: error.message });
    }
  }

  // 顯示結果
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed; top: 10px; left: 10px; right: 10px; bottom: 10px;
    background: rgba(0,0,0,0.9); color: #00ff00; font-family: monospace;
    font-size: 12px; padding: 10px; overflow-y: auto; z-index: 10000;
    border: 2px solid #00ff00; border-radius: 5px;
  `;
  
  panel.innerHTML = `
    <h3 style="color: #ffff00;">Manifest 診斷結果</h3>
    <button onclick="this.parentElement.remove()" style="float: right; background: #ff0000; color: white; border: none; padding: 5px 10px;">關閉</button>
    <pre style="white-space: pre-wrap; font-size: 10px;">${JSON.stringify(results, null, 2)}</pre>
  `;
  
  document.body.appendChild(panel);
  return results;
};

console.log('%c執行 showManifestDiagnostic() 查看 Manifest 診斷', 'color: #00ffff;');