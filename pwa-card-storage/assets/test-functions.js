// Test functions - CSP compliant
// Test implementation status
function checkImplementationStatus() {
    const statusDiv = document.getElementById('implementation-status');
    const components = [
        { name: 'QRScannerManager', class: window.QRScannerManager, status: 'PWA-19' },
        { name: 'BilingualBridge', class: window.bilingualBridge, status: 'PWA-04' },
        { name: 'VersionManager', class: window.VersionManager, status: 'PWA-08' },
        { name: 'TransferManager', class: window.TransferManager, status: 'PWA-11/12' },
        { name: 'Html5Qrcode', class: window.Html5Qrcode, status: 'Library' }
    ];
    
    let html = '<ul>';
    components.forEach(comp => {
        const exists = comp.class !== undefined;
        const statusClass = exists ? 'success' : 'error';
        const statusText = exists ? '✅ 已實作' : '❌ 缺失';
        html += `<li><strong>${comp.name}</strong> (${comp.status}): <span class="${statusClass}">${statusText}</span></li>`;
    });
    html += '</ul>';
    
    statusDiv.innerHTML = html;
}

// Test QR Scanner
function testQRScanner() {
    const resultsDiv = document.getElementById('test-results');
    
    try {
        if (typeof QRScannerManager === 'undefined') {
            throw new Error('QRScannerManager 類別不存在');
        }
        
        // Create mock card manager
        const mockCardManager = {
            storage: { getCard: () => Promise.resolve(null) }
        };
        
        const scanner = new QRScannerManager(mockCardManager);
        
        resultsDiv.innerHTML += `
            <div class="status success">
                ✅ QR Scanner 測試通過
                <br>- 類別可正常實例化
                <br>- 基本方法可用: ${Object.getOwnPropertyNames(Object.getPrototypeOf(scanner)).join(', ')}
            </div>
        `;
    } catch (error) {
        resultsDiv.innerHTML += `
            <div class="status error">
                ❌ QR Scanner 測試失敗: ${error.message}
            </div>
        `;
    }
}

// Test Bilingual Bridge
function testBilingualBridge() {
    const resultsDiv = document.getElementById('test-results');
    
    try {
        if (!window.bilingualBridge) {
            throw new Error('BilingualBridge 實例不存在');
        }
        
        const currentLang = window.bilingualBridge.getCurrentLanguage();
        const translation = window.bilingualBridge.translate('name');
        
        resultsDiv.innerHTML += `
            <div class="status success">
                ✅ Bilingual Bridge 測試通過
                <br>- 當前語言: ${currentLang}
                <br>- 翻譯測試: name → ${translation}
            </div>
        `;
    } catch (error) {
        resultsDiv.innerHTML += `
            <div class="status error">
                ❌ Bilingual Bridge 測試失敗: ${error.message}
            </div>
        `;
    }
}

// Test Version Manager
function testVersionManager() {
    const resultsDiv = document.getElementById('test-results');
    
    try {
        if (typeof VersionManager === 'undefined') {
            throw new Error('VersionManager 類別不存在');
        }
        
        const mockStorage = {};
        const versionManager = new VersionManager(mockStorage);
        
        resultsDiv.innerHTML += `
            <div class="status success">
                ✅ Version Manager 測試通過
                <br>- 類別可正常實例化
                <br>- 最大版本數: ${versionManager.maxVersions}
            </div>
        `;
    } catch (error) {
        resultsDiv.innerHTML += `
            <div class="status error">
                ❌ Version Manager 測試失敗: ${error.message}
            </div>
        `;
    }
}

// Test Transfer Manager
function testTransferManager() {
    const resultsDiv = document.getElementById('test-results');
    
    try {
        if (typeof TransferManager === 'undefined') {
            throw new Error('TransferManager 類別不存在');
        }
        
        const mockCardManager = {};
        const transferManager = new TransferManager(mockCardManager);
        
        resultsDiv.innerHTML += `
            <div class="status success">
                ✅ Transfer Manager 測試通過
                <br>- 類別可正常實例化
                <br>- 壓縮功能: ${transferManager.compressionEnabled ? '啟用' : '停用'}
            </div>
        `;
    } catch (error) {
        resultsDiv.innerHTML += `
            <div class="status error">
                ❌ Transfer Manager 測試失敗: ${error.message}
            </div>
        `;
    }
}

// Open QR Scanner Demo
async function openQRScanner() {
    const demoDiv = document.getElementById('scanner-demo');
    
    try {
        if (typeof QRScannerManager === 'undefined') {
            throw new Error('QRScannerManager 不可用');
        }
        
        const mockCardManager = {
            storage: { getCard: () => Promise.resolve(null) }
        };
        
        const scanner = new QRScannerManager(mockCardManager);
        await scanner.initialize();
        await scanner.openScannerModal();
        
        demoDiv.innerHTML = `
            <div class="status success">
                ✅ QR 掃描器已開啟
                <br>狀態: ${JSON.stringify(scanner.getStatus())}
            </div>
        `;
    } catch (error) {
        demoDiv.innerHTML = `
            <div class="status error">
                ❌ QR 掃描器開啟失敗: ${error.message}
            </div>
        `;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    checkImplementationStatus();
    
    // Add event listeners
    document.getElementById('test-qr-scanner').addEventListener('click', testQRScanner);
    document.getElementById('test-bilingual-bridge').addEventListener('click', testBilingualBridge);
    document.getElementById('test-version-manager').addEventListener('click', testVersionManager);
    document.getElementById('test-transfer-manager').addEventListener('click', testTransferManager);
    document.getElementById('open-qr-scanner').addEventListener('click', openQRScanner);
});