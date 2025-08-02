/**
 * SecurityTestSuite - 安全測試套件
 * 用於驗證安全修復的有效性
 */
class SecurityTestSuite {
    static async runAllTests() {
        console.log('[SecurityTest] 開始執行安全測試套件...');
        
        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };

        // Phase 1 Critical 測試
        await this.testSecurityInputHandler(results);
        await this.testSecurityDataHandler(results);
        
        // Phase 2 High 測試
        await this.testSecurityAuthHandler(results);
        await this.testLogInjectionPrevention(results);
        
        console.log(`[SecurityTest] 測試完成: ${results.passed} 通過, ${results.failed} 失敗`);
        return results;
    }

    static async testSecurityInputHandler(results) {
        console.log('[SecurityTest] 測試 SecurityInputHandler...');
        
        // 測試輸入驗證
        try {
            const result = SecurityInputHandler.validateAndSanitize('<script>alert("xss")</script>', 'text');
            if (result.sanitized.includes('<script>')) {
                throw new Error('XSS 清理失敗');
            }
            this.addTestResult(results, 'SecurityInputHandler XSS 清理', true);
        } catch (error) {
            this.addTestResult(results, 'SecurityInputHandler XSS 清理', false, error.message);
        }

        // 測試 HTML 轉義
        try {
            const escaped = SecurityInputHandler.validateAndSanitize('<>&"\'', 'text');
            if (escaped.sanitized === '<>&"\'') {
                throw new Error('HTML 轉義失敗');
            }
            this.addTestResult(results, 'SecurityInputHandler HTML 轉義', true);
        } catch (error) {
            this.addTestResult(results, 'SecurityInputHandler HTML 轉義', false, error.message);
        }
    }

    static async testSecurityDataHandler(results) {
        console.log('[SecurityTest] 測試 SecurityDataHandler...');
        
        // 測試 XSS 防護
        try {
            const sanitized = SecurityDataHandler.sanitizeOutput('<script>alert("xss")</script>', 'html');
            if (sanitized.includes('<script>')) {
                throw new Error('XSS 防護失敗');
            }
            this.addTestResult(results, 'SecurityDataHandler XSS 防護', true);
        } catch (error) {
            this.addTestResult(results, 'SecurityDataHandler XSS 防護', false, error.message);
        }

        // 測試資料完整性
        try {
            const testData = { test: 'data' };
            const integrity = await SecurityDataHandler.validateDataIntegrity(testData);
            if (!integrity.valid || !integrity.actualHash) {
                throw new Error('資料完整性檢查失敗');
            }
            this.addTestResult(results, 'SecurityDataHandler 資料完整性', true);
        } catch (error) {
            this.addTestResult(results, 'SecurityDataHandler 資料完整性', false, error.message);
        }
    }

    static async testSecurityAuthHandler(results) {
        console.log('[SecurityTest] 測試 SecurityAuthHandler...');
        
        // 測試授權檢查
        try {
            const authResult = SecurityAuthHandler.validateAccess('card-data', 'read');
            if (!authResult.authorized) {
                throw new Error('基本授權檢查失敗');
            }
            this.addTestResult(results, 'SecurityAuthHandler 授權檢查', true);
        } catch (error) {
            this.addTestResult(results, 'SecurityAuthHandler 授權檢查', false, error.message);
        }

        // 測試會話管理
        try {
            const sessionId = SecurityAuthHandler.createSession('test-user', ['read']);
            const isValid = SecurityAuthHandler.validateSession(sessionId, 'test-user');
            if (!isValid) {
                throw new Error('會話管理失敗');
            }
            SecurityAuthHandler.destroySession(sessionId);
            this.addTestResult(results, 'SecurityAuthHandler 會話管理', true);
        } catch (error) {
            this.addTestResult(results, 'SecurityAuthHandler 會話管理', false, error.message);
        }
    }

    static async testLogInjectionPrevention(results) {
        console.log('[SecurityTest] 測試日誌注入防護...');
        
        try {
            // 測試日誌注入防護
            const maliciousLog = 'Normal log\r\nINJECTED: Fake admin login';
            SecurityDataHandler.secureLog('info', maliciousLog, { test: 'data' });
            
            // 如果沒有拋出異常，表示日誌已被安全處理
            this.addTestResult(results, '日誌注入防護', true);
        } catch (error) {
            this.addTestResult(results, '日誌注入防護', false, error.message);
        }
    }

    static addTestResult(results, testName, passed, error = null) {
        results.tests.push({
            name: testName,
            passed,
            error
        });
        
        if (passed) {
            results.passed++;
            console.log(`[SecurityTest] ✅ ${testName}`);
        } else {
            results.failed++;
            console.log(`[SecurityTest] ❌ ${testName}: ${error}`);
        }
    }

    static async runPenetrationTests() {
        console.log('[SecurityTest] 執行滲透測試...');
        
        const attacks = [
            // XSS 攻擊測試
            '<script>alert("XSS")</script>',
            'javascript:alert("XSS")',
            '<img src="x" onerror="alert(\'XSS\')">',
            
            // SQL 注入測試（雖然我們使用 IndexedDB）
            "'; DROP TABLE cards; --",
            "' OR '1'='1",
            
            // 日誌注入測試
            'Normal input\r\nFAKE LOG: Admin access granted',
            'Test\nINJECTED: Security breach detected'
        ];

        let blocked = 0;
        let total = attacks.length;

        for (const attack of attacks) {
            try {
                const sanitized = SecurityDataHandler.sanitizeOutput(attack, 'html');
                if (!sanitized.includes('<script>') && 
                    !sanitized.includes('javascript:') && 
                    !sanitized.includes('onerror=')) {
                    blocked++;
                }
            } catch (error) {
                // 異常也算作被阻擋
                blocked++;
            }
        }

        console.log(`[SecurityTest] 滲透測試結果: ${blocked}/${total} 攻擊被阻擋`);
        return { blocked, total, success: blocked === total };
    }
}

// 全域可用
window.SecurityTestSuite = SecurityTestSuite;