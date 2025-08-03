/**
 * PWA 匯出功能使用範例
 * 展示如何使用新的完整匯出功能
 */

// ========== 基本使用範例 ==========

// 1. 匯出所有名片為 JSON 格式
async function exportAllCardsAsJSON() {
    const result = await cardManager.exportCards({
        exportAll: true,           // 匯出所有名片
        format: 'json',           // JSON 格式
        autoDownload: true        // 自動下載
    });
    
    if (result.success) {
        console.log(`成功匯出 ${result.count} 張名片`);
        console.log(`檔案: ${result.files[0].filename}`);
    }
}

// 2. 匯出選定名片為 vCard 格式
async function exportSelectedCardsAsVCard() {
    const result = await cardManager.exportCards({
        cardIds: ['card-001', 'card-002', 'card-003'],  // 選定的名片 ID
        format: 'vcard',                                // vCard 格式
        language: 'zh',                                 // 中文版本
        autoDownload: true
    });
    
    if (result.success) {
        console.log(`匯出了 ${result.count} 張名片為 vCard 格式`);
    }
}

// 3. 同時匯出 JSON 和 vCard 兩種格式
async function exportBothFormats() {
    const result = await cardManager.exportCards({
        exportAll: true,
        format: 'both',                    // 同時匯出兩種格式
        language: 'zh',
        includeBothLanguages: false,       // 不包含雙語版本
        autoDownload: true
    });
    
    if (result.success) {
        console.log(`生成了 ${result.files.length} 個檔案:`);
        result.files.forEach(file => {
            console.log(`- ${file.format}: ${file.filename} (${file.size} bytes)`);
        });
    }
}

// ========== 高級功能範例 ==========

// 4. 雙語匯出
async function exportBilingualCards() {
    const result = await cardManager.exportCards({
        exportAll: true,
        format: 'vcard',
        includeBothLanguages: true,        // 包含中英文兩個版本
        autoDownload: true
    });
    
    if (result.success) {
        console.log('雙語 vCard 檔案已生成');
    }
}

// 5. 包含版本歷史的匯出
async function exportWithVersionHistory() {
    const result = await cardManager.exportCards({
        exportAll: true,
        format: 'json',
        includeVersions: true,             // 包含版本歷史
        autoDownload: false                // 不自動下載，手動處理
    });
    
    if (result.success) {
        // 手動下載檔案
        for (const fileInfo of result.files) {
            await cardManager.downloadFile(fileInfo.file, fileInfo.filename);
        }
    }
}

// 6. 取得匯出預覽
async function getExportPreview() {
    const preview = await cardManager.getExportPreview(null, 'both');
    
    if (preview.success) {
        console.log('匯出預覽:');
        console.log(`- 總名片數: ${preview.preview.totalCards}`);
        console.log(`- 名片類型分布:`, preview.preview.cardTypes);
        console.log(`- 估算檔案大小:`);
        console.log(`  JSON: ${preview.preview.estimatedSizes.json} bytes`);
        console.log(`  vCard: ${preview.preview.estimatedSizes.vcard} bytes`);
    }
}

// ========== 簡化 API 範例 ==========

// 7. 快速匯出 - JSON
async function quickJSONExport() {
    const result = await cardManager.quickExport('json');
    console.log(result.success ? '快速 JSON 匯出完成' : '匯出失敗');
}

// 8. 快速匯出 - vCard
async function quickVCardExport() {
    const result = await cardManager.quickExport('vcard');
    console.log(result.success ? '快速 vCard 匯出完成' : '匯出失敗');
}

// 9. 匯出單張名片
async function exportSingleCard() {
    const result = await cardManager.exportSingleCard('card-001', 'vcard', {
        language: 'en',                    // 英文版本
        autoDownload: true
    });
    
    if (result.success) {
        console.log('單張名片匯出完成');
    }
}

// ========== 進度監控範例 ==========

// 10. 監控匯出進度
async function exportWithProgressTracking() {
    // 設置進度回調
    cardManager.setImportCallback((operationId, stage, progress, message) => {
        console.log(`[${operationId}] ${stage}: ${progress}% - ${message}`);
        
        // 更新 UI 進度條
        updateProgressBar(progress);
        updateStatusMessage(message);
    });
    
    const result = await cardManager.exportCards({
        exportAll: true,
        format: 'both',
        operationId: 'export_with_progress'
    });
    
    if (result.success) {
        console.log('匯出完成，包含進度追蹤');
    }
}

// ========== 錯誤處理範例 ==========

// 11. 完整的錯誤處理
async function exportWithErrorHandling() {
    try {
        const result = await cardManager.exportCards({
            exportAll: true,
            format: 'json'
        });
        
        if (result.success) {
            console.log(`成功匯出 ${result.count} 張名片`);
            
            // 檢查文件大小警告
            for (const file of result.files) {
                const warning = cardManager.checkFileSizeWarning(file.size);
                if (warning.level !== 'ok') {
                    console.warn(`檔案大小警告 (${warning.level}): ${warning.message}`);
                }
            }
        } else {
            console.error('匯出失敗:', result.error);
            
            // 根據錯誤代碼提供不同的處理
            if (result.code === 'NO_CARDS') {
                showMessage('沒有可匯出的名片，請先新增一些名片');
            } else if (result.code === 'PERMISSION_DENIED') {
                showMessage('沒有匯出權限，請聯繫管理員');
            } else {
                showMessage('匯出失敗，請稍後再試');
            }
        }
    } catch (error) {
        console.error('匯出過程發生錯誤:', error);
        showMessage('系統錯誤，請重新整理頁面後再試');
    }
}

// ========== 實用輔助函數 ==========

function updateProgressBar(progress) {
    const progressBar = document.getElementById('exportProgress');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
    }
}

function updateStatusMessage(message) {
    const statusElement = document.getElementById('exportStatus');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function showMessage(message, type = 'info') {
    // 顯示用戶友善的訊息
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // 可以整合到實際的 UI 通知系統
    if (window.showNotification) {
        window.showNotification(message, type);
    }
}

// ========== 批量操作範例 ==========

// 12. 分類匯出
async function exportByCardType() {
    const allCards = await cardManager.storage.listCards();
    
    // 按類型分組
    const cardsByType = allCards.reduce((groups, card) => {
        const type = card.type || cardManager.detectCardType(card.data);
        if (!groups[type]) groups[type] = [];
        groups[type].push(card.id);
        return groups;
    }, {});
    
    // 分別匯出每種類型
    for (const [type, cardIds] of Object.entries(cardsByType)) {
        const result = await cardManager.exportCards({
            cardIds: cardIds,
            format: 'vcard',
            autoDownload: true,
            operationId: `export_${type}`
        });
        
        if (result.success) {
            console.log(`${type} 類型名片匯出完成: ${result.count} 張`);
        }
    }
}

// 13. 定期備份
async function scheduleRegularBackup() {
    const backupInterval = 24 * 60 * 60 * 1000; // 24小時
    
    setInterval(async () => {
        console.log('開始定期備份...');
        
        const result = await cardManager.exportCards({
            exportAll: true,
            format: 'json',
            autoDownload: false, // 不自動下載，存儲到雲端或本地
            operationId: `backup_${Date.now()}`
        });
        
        if (result.success) {
            // 將備份檔案上傳到雲端或存儲到本地
            await saveBackupToStorage(result.files[0]);
            console.log('定期備份完成');
        }
    }, backupInterval);
}

async function saveBackupToStorage(fileInfo) {
    // 實作備份存儲邏輯
    console.log(`備份檔案已保存: ${fileInfo.filename}`);
}

// ========== 使用方式說明 ==========

/*
使用這些範例的方法:

1. 基本匯出:
   - exportAllCardsAsJSON() - 匯出所有名片為 JSON
   - exportSelectedCardsAsVCard() - 匯出選定名片為 vCard

2. 高級功能:
   - exportBothFormats() - 同時匯出兩種格式
   - exportBilingualCards() - 雙語匯出
   - getExportPreview() - 取得匯出預覽

3. 簡化 API:
   - quickJSONExport() - 快速 JSON 匯出
   - quickVCardExport() - 快速 vCard 匯出
   - exportSingleCard() - 匯出單張名片

4. 進階應用:
   - exportWithProgressTracking() - 包含進度監控
   - exportWithErrorHandling() - 完整錯誤處理
   - exportByCardType() - 分類匯出
   - scheduleRegularBackup() - 定期備份

所有功能都支援:
- 進度追蹤和狀態回饋
- 多語言支援 (中文/英文)
- 檔案大小警告和驗證
- 用戶友善的錯誤處理
- 安全的檔案下載機制
*/