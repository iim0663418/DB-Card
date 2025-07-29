document.addEventListener('DOMContentLoaded', function() {
    console.log('CSP Test script loaded');
    
    const testBtn = document.getElementById('test-qr-scanner');
    const resultDiv = document.getElementById('test-result');
    
    if (!testBtn || !resultDiv) {
        console.error('Required elements not found');
        return;
    }
    
    testBtn.addEventListener('click', async function() {
        console.log('Button clicked');
        resultDiv.innerHTML = '<p class="info">🔄 Testing CSP compliance...</p>';
        
        try {
            // Test 1: Check if QRScannerManager is available
            if (typeof QRScannerManager === 'undefined') {
                throw new Error('QRScannerManager not loaded');
            }
            
            // Test 2: Try to create scanner instance
            const scanner = new QRScannerManager();
            await scanner.initialize();
            
            // Test 3: Try to open scanner (will show modal)
            await scanner.openScannerModal();
            
            resultDiv.innerHTML = '<p class="success">✅ CSP Compliant! QR Scanner opened successfully without unsafe-inline.</p>';
            
        } catch (error) {
            console.error('Test failed:', error);
            resultDiv.innerHTML = '<p class="error">❌ Test failed: ' + error.message + '</p>';
        }
    });
    
    console.log('CSP test ready');
});