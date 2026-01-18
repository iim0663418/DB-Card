/**
 * UX Enhancement Smoke Tests
 * Testing the improved user experience features for import/export
 */

const fs = require('fs');
const path = require('path');

describe('UX Enhancements Smoke Tests', () => {
  
  test('TransferManager has progress callback functionality', () => {
    const transferManagerPath = path.join(__dirname, '../../pwa-card-storage/src/features/transfer-manager.js');
    const content = fs.readFileSync(transferManagerPath, 'utf8');
    
    // Check for progress callback methods
    expect(content).toContain('setProgressCallback');
    expect(content).toContain('updateProgress');
    expect(content).toContain('checkFileSizeWarning');
    expect(content).toContain('getUserFriendlyError');
  });

  test('CardManager has import status feedback', () => {
    const cardManagerPath = path.join(__dirname, '../../pwa-card-storage/src/features/card-manager.js');
    const content = fs.readFileSync(cardManagerPath, 'utf8');
    
    // Check for import status methods
    expect(content).toContain('setImportCallback');
    expect(content).toContain('updateImportStatus');
    expect(content).toContain('getMessage');
    expect(content).toContain('detectCardTypeEnhanced');
  });

  test('Enhanced error messages support bilingual', () => {
    const cardManagerPath = path.join(__dirname, '../../pwa-card-storage/src/features/card-manager.js');
    const content = fs.readFileSync(cardManagerPath, 'utf8');
    
    // Check for bilingual support
    expect(content).toContain('Importing...');
    expect(content).toContain('detectLanguage');
  });

  test('Enhanced user feedback maintains security', () => {
    const transferManagerPath = path.join(__dirname, '../../pwa-card-storage/src/features/transfer-manager.js');
    const content = fs.readFileSync(transferManagerPath, 'utf8');
    
    // Check security features are preserved
    expect(content).toContain('SEC-PWA-001');
    expect(content).toContain('SEC-PWA-002');
    expect(content).toContain('secureReadFile');
    expect(content).toContain('validateSingleCardStrict');
  });

});
