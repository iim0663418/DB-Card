/**
 * SecurityValidator - 安全驗證器
 * 
 * 驗證安全標頭、配置和漏洞防護
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

/**
 * 安全驗證器
 */
export class SecurityValidator {
    constructor() {
        this.requiredHeaders = [
            'content-security-policy',
            'x-frame-options',
            'x-content-type-options',
            'referrer-policy'
        ];
    }

    /**
     * 執行安全驗證
     * @returns {Promise<Object>} 安全驗證結果
     */
    async validate() {
        try {
            console.log('[SecurityValidator] 執行安全驗證...');

            const checks = [];
            let passed = 0;

            // 檢查 HTTPS
            const httpsCheck = this.validateHTTPS();
            checks.push(httpsCheck);
            if (httpsCheck.passed) passed++;

            // 檢查 CSP 標頭
            const cspCheck = await this.validateCSP();
            checks.push(cspCheck);
            if (cspCheck.passed) passed++;

            // 檢查安全標頭
            const headersCheck = await this.validateSecurityHeaders();
            checks.push(...headersCheck.checks);
            passed += headersCheck.passed;

            // 檢查 SRI 完整性
            const sriCheck = this.validateSRI();
            checks.push(sriCheck);
            if (sriCheck.passed) passed++;

            // 檢查混合內容
            const mixedContentCheck = this.validateMixedContent();
            checks.push(mixedContentCheck);
            if (mixedContentCheck.passed) passed++;

            // 檢查敏感資訊洩露
            const sensitiveDataCheck = await this.validateSensitiveData();
            checks.push(sensitiveDataCheck);
            if (sensitiveDataCheck.passed) passed++;

            return {
                passed,
                total: checks.length,
                checks,
                score: Math.round((passed / checks.length) * 100)
            };

        } catch (error) {
            return {
                passed: 0,
                total: 1,
                checks: [{
                    name: '安全驗證',
                    passed: false,
                    message: `驗證失敗: ${error.message}`
                }],
                score: 0
            };
        }
    }

    /**
     * 驗證 HTTPS 連線
     * @returns {Object} HTTPS 驗證結果
     */
    validateHTTPS() {
        const isHTTPS = location.protocol === 'https:';
        const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        const isSecure = isHTTPS || isLocalhost;

        return {
            name: 'HTTPS 連線',
            passed: isSecure,
            message: isHTTPS ? 'HTTPS 連線已啟用' : 
                     isLocalhost ? '本地開發環境' : 
                     '⚠️ 生產環境需要 HTTPS 連線',
            priority: 'critical'
        };
    }

    /**
     * 驗證 Content Security Policy
     * @returns {Promise<Object>} CSP 驗證結果
     */
    async validateCSP() {
        try {
            // 檢查 meta 標籤中的 CSP
            const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
            
            if (cspMeta) {
                const cspContent = cspMeta.content;
                const hasBasicDirectives = [
                    'default-src',
                    'script-src',
                    'style-src'
                ].some(directive => cspContent.includes(directive));

                return {
                    name: 'Content Security Policy',
                    passed: hasBasicDirectives,
                    message: hasBasicDirectives ? 
                        'CSP 已配置基本指令' : 
                        'CSP 缺少基本安全指令',
                    priority: 'critical'
                };
            }

            // 檢查 HTTP 標頭中的 CSP
            try {
                const response = await fetch(location.href, { method: 'HEAD' });
                const cspHeader = response.headers.get('content-security-policy');
                
                if (cspHeader) {
                    const hasBasicDirectives = [
                        'default-src',
                        'script-src',
                        'style-src'
                    ].some(directive => cspHeader.includes(directive));

                    return {
                        name: 'Content Security Policy',
                        passed: hasBasicDirectives,
                        message: hasBasicDirectives ? 
                            'CSP HTTP 標頭已配置' : 
                            'CSP 標頭缺少基本指令',
                        priority: 'critical'
                    };
                }
            } catch (error) {
                // 無法檢查 HTTP 標頭
            }

            return {
                name: 'Content Security Policy',
                passed: false,
                message: '未找到 CSP 配置',
                priority: 'critical'
            };

        } catch (error) {
            return {
                name: 'Content Security Policy',
                passed: false,
                message: `CSP 檢查失敗: ${error.message}`,
                priority: 'critical'
            };
        }
    }

    /**
     * 驗證安全標頭
     * @returns {Promise<Object>} 安全標頭驗證結果
     */
    async validateSecurityHeaders() {
        const checks = [];
        let passed = 0;

        try {
            const response = await fetch(location.href, { method: 'HEAD' });
            
            // 檢查 X-Frame-Options
            const xFrameOptions = response.headers.get('x-frame-options');
            checks.push({
                name: 'X-Frame-Options',
                passed: !!xFrameOptions,
                message: xFrameOptions ? 
                    `已設定: ${xFrameOptions}` : 
                    '建議設定 X-Frame-Options 防止點擊劫持',
                priority: 'high'
            });
            if (xFrameOptions) passed++;

            // 檢查 X-Content-Type-Options
            const xContentTypeOptions = response.headers.get('x-content-type-options');
            checks.push({
                name: 'X-Content-Type-Options',
                passed: xContentTypeOptions === 'nosniff',
                message: xContentTypeOptions === 'nosniff' ? 
                    '已設定 nosniff' : 
                    '建議設定 X-Content-Type-Options: nosniff',
                priority: 'high'
            });
            if (xContentTypeOptions === 'nosniff') passed++;

            // 檢查 Referrer-Policy
            const referrerPolicy = response.headers.get('referrer-policy');
            checks.push({
                name: 'Referrer-Policy',
                passed: !!referrerPolicy,
                message: referrerPolicy ? 
                    `已設定: ${referrerPolicy}` : 
                    '建議設定 Referrer-Policy',
                priority: 'medium'
            });
            if (referrerPolicy) passed++;

            // 檢查 Strict-Transport-Security (僅 HTTPS)
            if (location.protocol === 'https:') {
                const hsts = response.headers.get('strict-transport-security');
                checks.push({
                    name: 'Strict-Transport-Security',
                    passed: !!hsts,
                    message: hsts ? 
                        `HSTS 已啟用: ${hsts}` : 
                        '建議啟用 HSTS',
                    priority: 'high'
                });
                if (hsts) passed++;
            }

        } catch (error) {
            checks.push({
                name: '安全標頭檢查',
                passed: false,
                message: `無法檢查 HTTP 標頭: ${error.message}`,
                priority: 'high'
            });
        }

        return { checks, passed };
    }

    /**
     * 驗證 Subresource Integrity
     * @returns {Object} SRI 驗證結果
     */
    validateSRI() {
        const scriptsWithSrc = document.querySelectorAll('script[src]');
        const linksWithHref = document.querySelectorAll('link[rel="stylesheet"][href]');
        
        let totalResources = 0;
        let resourcesWithSRI = 0;

        // 檢查外部腳本
        scriptsWithSrc.forEach(script => {
            const src = script.src;
            // 只檢查外部資源
            if (src && !src.startsWith(location.origin) && !src.startsWith('/')) {
                totalResources++;
                if (script.integrity) {
                    resourcesWithSRI++;
                }
            }
        });

        // 檢查外部樣式表
        linksWithHref.forEach(link => {
            const href = link.href;
            // 只檢查外部資源
            if (href && !href.startsWith(location.origin) && !href.startsWith('/')) {
                totalResources++;
                if (link.integrity) {
                    resourcesWithSRI++;
                }
            }
        });

        const sriCoverage = totalResources > 0 ? (resourcesWithSRI / totalResources) * 100 : 100;
        const passed = totalResources === 0 || sriCoverage >= 80; // 80% 覆蓋率

        return {
            name: 'Subresource Integrity',
            passed,
            message: totalResources === 0 ? 
                '無外部資源需要 SRI' : 
                `${resourcesWithSRI}/${totalResources} 外部資源有 SRI (${sriCoverage.toFixed(1)}%)`,
            priority: 'high'
        };
    }

    /**
     * 驗證混合內容
     * @returns {Object} 混合內容驗證結果
     */
    validateMixedContent() {
        if (location.protocol !== 'https:') {
            return {
                name: '混合內容檢查',
                passed: true,
                message: 'HTTP 環境，無混合內容問題',
                priority: 'medium'
            };
        }

        const httpResources = [];
        
        // 檢查圖片
        document.querySelectorAll('img[src]').forEach(img => {
            if (img.src.startsWith('http://')) {
                httpResources.push(`圖片: ${img.src}`);
            }
        });

        // 檢查腳本
        document.querySelectorAll('script[src]').forEach(script => {
            if (script.src.startsWith('http://')) {
                httpResources.push(`腳本: ${script.src}`);
            }
        });

        // 檢查樣式表
        document.querySelectorAll('link[href]').forEach(link => {
            if (link.href.startsWith('http://')) {
                httpResources.push(`樣式: ${link.href}`);
            }
        });

        const passed = httpResources.length === 0;

        return {
            name: '混合內容檢查',
            passed,
            message: passed ? 
                '無混合內容問題' : 
                `發現 ${httpResources.length} 個 HTTP 資源`,
            priority: 'high'
        };
    }

    /**
     * 驗證敏感資訊洩露
     * @returns {Promise<Object>} 敏感資訊驗證結果
     */
    async validateSensitiveData() {
        const issues = [];

        // 檢查 HTML 中的敏感資訊
        const htmlContent = document.documentElement.outerHTML.toLowerCase();
        
        const sensitivePatterns = [
            { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, type: '密碼' },
            { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, type: 'API 金鑰' },
            { pattern: /secret\s*[:=]\s*['"][^'"]+['"]/gi, type: '密鑰' },
            { pattern: /token\s*[:=]\s*['"][^'"]+['"]/gi, type: '令牌' }
        ];

        sensitivePatterns.forEach(({ pattern, type }) => {
            const matches = htmlContent.match(pattern);
            if (matches) {
                issues.push(`${type}: ${matches.length} 個可能的洩露`);
            }
        });

        // 檢查 console 中的敏感資訊（開發模式）
        if (window.console && typeof window.console.log === 'function') {
            // 這裡只能做基本檢查，實際的 console 內容無法直接存取
            issues.push('建議檢查 console 輸出是否包含敏感資訊');
        }

        const passed = issues.length === 0;

        return {
            name: '敏感資訊洩露',
            passed,
            message: passed ? 
                '未發現明顯的敏感資訊洩露' : 
                `發現 ${issues.length} 個潛在問題`,
            priority: 'critical'
        };
    }

    /**
     * 檢查特定安全標頭
     * @param {string} headerName 標頭名稱
     * @returns {Promise<string|null>} 標頭值
     */
    async checkSecurityHeader(headerName) {
        try {
            const response = await fetch(location.href, { method: 'HEAD' });
            return response.headers.get(headerName.toLowerCase());
        } catch (error) {
            console.warn(`[SecurityValidator] 無法檢查標頭 ${headerName}:`, error);
            return null;
        }
    }

    /**
     * 生成安全建議
     * @param {Array} failedChecks 失敗的檢查
     * @returns {Array} 安全建議
     */
    generateSecurityRecommendations(failedChecks) {
        const recommendations = [];

        failedChecks.forEach(check => {
            switch (check.name) {
                case 'HTTPS 連線':
                    recommendations.push({
                        issue: 'HTTPS 連線',
                        action: '配置 SSL 憑證並強制 HTTPS 重定向',
                        priority: 'critical'
                    });
                    break;
                case 'Content Security Policy':
                    recommendations.push({
                        issue: 'CSP 配置',
                        action: '添加 Content-Security-Policy 標頭或 meta 標籤',
                        priority: 'critical'
                    });
                    break;
                case 'X-Frame-Options':
                    recommendations.push({
                        issue: 'X-Frame-Options',
                        action: '設定 X-Frame-Options: DENY 或 SAMEORIGIN',
                        priority: 'high'
                    });
                    break;
                case 'Subresource Integrity':
                    recommendations.push({
                        issue: 'SRI 完整性',
                        action: '為外部資源添加 integrity 屬性',
                        priority: 'high'
                    });
                    break;
                default:
                    recommendations.push({
                        issue: check.name,
                        action: '請檢查相關安全配置',
                        priority: check.priority || 'medium'
                    });
            }
        });

        return recommendations;
    }
}

// 提供便利的匯出
export const securityValidator = new SecurityValidator();