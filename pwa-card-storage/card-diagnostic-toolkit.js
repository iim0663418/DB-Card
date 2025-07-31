/**
 * 統一名片診斷工具包
 * 整合所有診斷、測試和修復功能
 */

class CardDiagnosticToolkit {
  constructor() {
    this.testCases = [
      {
        name: '雙語個人名片',
        data: '測試~test|測試~test|測試|test|測試|測試||測試~test|',
        expected: 'personal-bilingual'
      },
      {
        name: '政府機關雙語名片',
        data: '王小明~Wang Ming|司長~Director|數位策略司|數位發展部|wang@moda.gov.tw|02-1234-5678||歡迎認識我~Nice to meet you|臺北市中正區延平南路143號',
        expected: 'gov-yp-bilingual'
      },
      {
        name: '政府雙語版旅程地圖測試',
        data: '測試~test|測試~test|數位策略司|數位發展部|測試@moda.gov.tw|測試||測試~test|',
        expected: 'gov-yp-bilingual'
      },
      {
        name: '個人中文名片',
        data: '張三|工程師|技術部|科技公司|zhang@example.com|0912345678||您好|台北市',
        expected: 'personal'
      }
    ];
  }

  // 系統檢查
  checkSystem() {
    return {
      SimpleCardParser: typeof window.SimpleCardParser !== 'undefined',
      PWACardManager: typeof window.PWACardManager !== 'undefined',
      app: typeof window.app !== 'undefined',
      storage: window.app && typeof window.app.storage !== 'undefined'
    };
  }

  // 測試解析
  testParsing(testData) {
    try {
      if (!window.SimpleCardParser) {
        return { success: false, error: 'SimpleCardParser 未載入' };
      }

      const parsed = window.SimpleCardParser.parseDirectly(testData);
      
      if (!parsed) {
        return { success: false, error: '解析返回 null' };
      }

      return { 
        success: true, 
        data: parsed,
        isBilingual: (parsed.name && parsed.name.includes('~')) || 
                    (parsed.greetings && JSON.stringify(parsed.greetings).includes('~'))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 測試分類
  testClassification(cardData) {
    try {
      if (!window.PWACardManager) {
        return { success: false, error: 'PWACardManager 未載入' };
      }

      const manager = new window.PWACardManager(null);
      const detectedType = manager.identifyCardType(cardData);

      return {
        success: true,
        type: detectedType,
        checks: {
          isGov: manager.isGovernmentCard(cardData),
          isEn: manager.isEnglishCard(cardData),
          isBilingual: manager.isBilingualCard(cardData),
          isShinGuang: manager.isShinGuangBuilding(cardData)
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 完整診斷
  async runDiagnosis() {
    console.log('🔍 開始完整診斷...');
    
    const diagnosis = {
      timestamp: new Date().toISOString(),
      system: this.checkSystem(),
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, issues: [] }
    };

    for (const testCase of this.testCases) {
      const test = {
        name: testCase.name,
        expected: testCase.expected,
        parsing: this.testParsing(testCase.data),
        classification: null,
        passed: false
      };

      if (test.parsing.success) {
        test.classification = this.testClassification(test.parsing.data);
        test.passed = test.classification.success && 
                     test.classification.type === testCase.expected;
      }

      diagnosis.tests.push(test);
      diagnosis.summary.total++;
      
      if (test.passed) {
        diagnosis.summary.passed++;
        console.log(`✅ ${testCase.name}: ${test.classification.type}`);
      } else {
        diagnosis.summary.failed++;
        const issue = `❌ ${testCase.name}: 預期 ${testCase.expected}, 實際 ${test.classification?.type || '解析失敗'}`;
        diagnosis.summary.issues.push(issue);
        console.log(issue);
      }
    }

    const passRate = (diagnosis.summary.passed / diagnosis.summary.total * 100).toFixed(1);
    diagnosis.summary.passRate = `${passRate}%`;
    
    console.log(`📊 診斷完成: ${diagnosis.summary.passed}/${diagnosis.summary.total} 通過 (${passRate}%)`);
    
    return diagnosis;
  }

  // 修復所有問題
  async fixAllIssues() {
    console.log('🔧 開始修復所有名片分類問題...');
    
    try {
      if (!window.app || !window.app.storage || !window.PWACardManager) {
        throw new Error('必要組件未載入');
      }
      
      const cards = await window.app.storage.listCards();
      console.log(`📊 檢查 ${cards.length} 張名片`);
      
      const manager = new window.PWACardManager(window.app.storage);
      let fixedCount = 0;
      const results = [];
      
      for (const card of cards) {
        try {
          const newType = manager.identifyCardType(card.data);
          
          if (card.type !== newType) {
            await window.app.storage.updateCard(card.id, {
              ...card.data,
              type: newType
            });
            
            results.push({
              id: card.id,
              name: card.data.name || '未知',
              oldType: card.type,
              newType: newType,
              fixed: true
            });
            
            fixedCount++;
            console.log(`✅ 已修復: ${card.id} ${card.type} -> ${newType}`);
          }
        } catch (error) {
          console.error(`❌ 修復名片 ${card.id} 失敗:`, error);
        }
      }
      
      if (window.app.cardList) {
        await window.app.cardList.refresh();
      }
      
      console.log(`🎉 修復完成！共修復 ${fixedCount} 張名片`);
      
      return {
        success: true,
        total: cards.length,
        fixed: fixedCount,
        results: results.filter(r => r.fixed)
      };
      
    } catch (error) {
      console.error('❌ 修復失敗:', error);
      return { success: false, error: error.message };
    }
  }

  // 快速測試單張名片
  quickTest(userData) {
    console.log('🚀 快速測試:', userData);
    
    const parsing = this.testParsing(userData);
    console.log('解析結果:', parsing);
    
    if (parsing.success) {
      const classification = this.testClassification(parsing.data);
      console.log('分類結果:', classification);
      
      return {
        input: userData,
        parsing: parsing,
        classification: classification,
        success: classification.success
      };
    }
    
    return { input: userData, parsing: parsing, success: false };
  }
}

// 創建全域實例
window.cardDiagnostic = new CardDiagnosticToolkit();

// 提供簡化命令
window.diagCard = (data) => window.cardDiagnostic.quickTest(data);
window.fixCards = () => window.cardDiagnostic.fixAllIssues();
window.checkCards = () => window.cardDiagnostic.runDiagnosis();

console.log('🔧 統一名片診斷工具包已載入');
console.log('💡 可用命令:');
console.log('  - diagCard("名片資料") - 快速測試');
console.log('  - checkCards() - 完整診斷');
console.log('  - fixCards() - 修復所有問題');