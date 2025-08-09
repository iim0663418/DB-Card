#!/usr/bin/env node

/**
 * RESOURCE-04: Resource Loading Validation Tool
 * 
 * Implements comprehensive resource loading validation and error handling
 * for PWA static hosting deployment with SRI checks and secure error messages.
 * 
 * @version 3.2.0-resource-04
 * @security Resource validation, SRI checks, secure error handling
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ResourceLoadingValidator {
    constructor() {
        this.projectRoot = process.cwd();
        this.pwaRoot = path.join(this.projectRoot, 'pwa-card-storage');
        this.indexPath = path.join(this.pwaRoot, 'index.html');
        this.backupPath = `${this.indexPath}.resource-04-backup`;
        this.report = {
            timestamp: new Date().toISOString(),
            task: 'RESOURCE-04',
            validation: [],
            enhancements: [],
            security: []
        };
    }

    /**
     * Main validation process
     */
    async validateResourceLoading() {
        console.log('🔧 RESOURCE-04: Starting resource loading validation...');
        
        try {
            // 1. Backup current index.html
            await this.createBackup();
            
            // 2. Analyze current resource loading
            const analysis = await this.analyzeResourceLoading();
            
            // 3. Generate enhanced resource loading
            const enhancedHTML = await this.generateEnhancedResourceLoading(analysis);
            
            // 4. Implement SRI validation
            const sriEnhancedHTML = await this.addSRIValidation(enhancedHTML);
            
            // 5. Add error handling
            const finalHTML = await this.addErrorHandling(sriEnhancedHTML);
            
            // 6. Write enhanced HTML
            await this.writeEnhancedHTML(finalHTML);
            
            // 7. Generate report
            await this.generateReport();
            
            console.log('✅ RESOURCE-04: Resource loading validation completed successfully');
            return this.report;
            
        } catch (error) {
            console.error('❌ RESOURCE-04: Validation failed:', error.message);
            await this.rollback();
            throw error;
        }
    }

    /**
     * Create backup of current HTML
     */
    async createBackup() {
        if (!fs.existsSync(this.indexPath)) {
            throw new Error('PWA index.html file not found');
        }
        
        fs.copyFileSync(this.indexPath, this.backupPath);
        console.log('📋 Created HTML backup');
        
        this.report.validation.push({
            type: 'backup',
            file: this.backupPath,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Analyze current resource loading patterns
     */
    async analyzeResourceLoading() {
        const htmlContent = fs.readFileSync(this.indexPath, 'utf8');
        
        const analysis = {
            stylesheets: this.extractResources(htmlContent, /<link[^>]+rel=["']stylesheet["'][^>]*>/g),
            scripts: this.extractResources(htmlContent, /<script[^>]+src=["'][^"']+["'][^>]*>/g),
            images: this.extractResources(htmlContent, /<img[^>]+src=["'][^"']+["'][^>]*>/g),
            manifests: this.extractResources(htmlContent, /<link[^>]+rel=["']manifest["'][^>]*>/g),
            totalResources: 0,
            hasErrorHandling: htmlContent.includes('onerror'),
            hasSRIChecks: htmlContent.includes('integrity='),
            hasLoadingIndicators: htmlContent.includes('loading-overlay')
        };
        
        analysis.totalResources = analysis.stylesheets.length + analysis.scripts.length + 
                                 analysis.images.length + analysis.manifests.length;
        
        console.log('🔍 Analyzed resource loading:', {
            stylesheets: analysis.stylesheets.length,
            scripts: analysis.scripts.length,
            images: analysis.images.length,
            manifests: analysis.manifests.length,
            total: analysis.totalResources,
            hasErrorHandling: analysis.hasErrorHandling,
            hasSRIChecks: analysis.hasSRIChecks
        });
        
        return analysis;
    }

    /**
     * Generate enhanced resource loading with validation
     */
    async generateEnhancedResourceLoading(analysis) {
        let htmlContent = fs.readFileSync(this.indexPath, 'utf8');
        
        // Add resource loading validation script
        const validationScript = `
    <!-- RESOURCE-04: Enhanced Resource Loading Validation -->
    <script>
        /**
         * Resource Loading Validator
         * Provides comprehensive resource validation and error handling
         */
        class ResourceLoadingValidator {
            constructor() {
                this.loadedResources = new Set();
                this.failedResources = new Set();
                this.loadingTimeout = 30000; // 30 seconds
                this.retryAttempts = 3;
                this.retryDelay = 1000; // 1 second
            }

            /**
             * Initialize resource validation
             */
            init() {
                this.setupGlobalErrorHandlers();
                this.validateCriticalResources();
                this.monitorResourceLoading();
            }

            /**
             * Setup global error handlers for resources
             */
            setupGlobalErrorHandlers() {
                // Handle script loading errors
                window.addEventListener('error', (event) => {
                    if (event.target && (event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK')) {
                        this.handleResourceError(event.target, event.error || 'Loading failed');
                    }
                });

                // Handle unhandled promise rejections
                window.addEventListener('unhandledrejection', (event) => {
                    console.warn('[Resource Validator] Unhandled promise rejection:', event.reason);
                    this.showUserFriendlyError('部分功能可能無法正常運作，請重新整理頁面');
                });
            }

            /**
             * Validate critical resources on page load
             */
            validateCriticalResources() {
                const criticalResources = [
                    'assets/styles/main.css',
                    'assets/styles/components.css',
                    'src/app.js',
                    'src/core/storage.js'
                ];

                criticalResources.forEach(resource => {
                    this.validateResource(resource, true);
                });
            }

            /**
             * Monitor resource loading progress
             */
            monitorResourceLoading() {
                const allResources = document.querySelectorAll('script[src], link[rel="stylesheet"], img[src]');
                let loadedCount = 0;
                const totalCount = allResources.length;

                allResources.forEach(resource => {
                    const originalSrc = resource.src || resource.href;
                    
                    resource.addEventListener('load', () => {
                        loadedCount++;
                        this.loadedResources.add(originalSrc);
                        this.updateLoadingProgress(loadedCount, totalCount);
                    });

                    resource.addEventListener('error', () => {
                        this.failedResources.add(originalSrc);
                        this.handleResourceError(resource, 'Failed to load');
                    });
                });

                // Set loading timeout
                setTimeout(() => {
                    if (loadedCount < totalCount) {
                        console.warn(\`[Resource Validator] Loading timeout: \${loadedCount}/\${totalCount} resources loaded\`);
                        this.handleLoadingTimeout(totalCount - loadedCount);
                    }
                }, this.loadingTimeout);
            }

            /**
             * Validate individual resource
             */
            async validateResource(resourcePath, isCritical = false) {
                try {
                    const response = await fetch(resourcePath, {
                        method: 'HEAD',
                        cache: 'no-cache'
                    });

                    if (!response.ok) {
                        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                    }

                    // Validate content type for security
                    const contentType = response.headers.get('content-type') || '';
                    if (!this.isValidContentType(resourcePath, contentType)) {
                        throw new Error(\`Invalid content type: \${contentType}\`);
                    }

                    this.loadedResources.add(resourcePath);
                    return true;

                } catch (error) {
                    console.error(\`[Resource Validator] Validation failed for \${resourcePath}:\`, error.message);
                    
                    if (isCritical) {
                        await this.retryCriticalResource(resourcePath);
                    } else {
                        this.failedResources.add(resourcePath);
                    }
                    
                    return false;
                }
            }

            /**
             * Retry loading critical resources
             */
            async retryCriticalResource(resourcePath, attempt = 1) {
                if (attempt > this.retryAttempts) {
                    this.showCriticalResourceError(resourcePath);
                    return false;
                }

                console.log(\`[Resource Validator] Retrying critical resource \${resourcePath} (attempt \${attempt})\`);
                
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                
                const success = await this.validateResource(resourcePath, false);
                if (!success) {
                    return this.retryCriticalResource(resourcePath, attempt + 1);
                }
                
                return true;
            }

            /**
             * Handle resource loading errors
             */
            handleResourceError(element, error) {
                const resourcePath = element.src || element.href || 'unknown';
                console.error(\`[Resource Validator] Resource error: \${resourcePath}\`, error);

                // Add error class for styling
                element.classList.add('resource-error');
                
                // Try fallback for critical resources
                if (this.isCriticalResource(resourcePath)) {
                    this.loadFallbackResource(element, resourcePath);
                }

                // Update UI to show degraded functionality
                this.updateUIForMissingResource(resourcePath);
            }

            /**
             * Load fallback resource
             */
            loadFallbackResource(element, originalPath) {
                const fallbacks = {
                    'assets/styles/main.css': 'assets/styles/fallback.css',
                    'src/app.js': 'src/app-minimal.js',
                    'assets/scripts/qrcode.min.js': 'assets/scripts/qrcode-fallback.js'
                };

                const fallbackPath = fallbacks[originalPath];
                if (fallbackPath && element.tagName === 'SCRIPT') {
                    console.log(\`[Resource Validator] Loading fallback: \${fallbackPath}\`);
                    
                    const fallbackScript = document.createElement('script');
                    fallbackScript.src = fallbackPath;
                    fallbackScript.onerror = () => {
                        console.error(\`[Resource Validator] Fallback also failed: \${fallbackPath}\`);
                        this.showCriticalResourceError(originalPath);
                    };
                    
                    element.parentNode.insertBefore(fallbackScript, element.nextSibling);
                }
            }

            /**
             * Check if resource is critical
             */
            isCriticalResource(resourcePath) {
                const criticalPatterns = [
                    /assets\/styles\/main\.css/,
                    /src\/app\.js/,
                    /src\/core\/storage\.js/,
                    /assets\/scripts\/qrcode/
                ];

                return criticalPatterns.some(pattern => pattern.test(resourcePath));
            }

            /**
             * Validate content type for security
             */
            isValidContentType(resourcePath, contentType) {
                const validTypes = {
                    '.css': ['text/css', 'text/plain'],
                    '.js': ['application/javascript', 'text/javascript', 'application/x-javascript'],
                    '.json': ['application/json', 'text/plain'],
                    '.svg': ['image/svg+xml', 'text/plain'],
                    '.png': ['image/png'],
                    '.jpg': ['image/jpeg'],
                    '.jpeg': ['image/jpeg']
                };

                const extension = resourcePath.substring(resourcePath.lastIndexOf('.'));
                const allowedTypes = validTypes[extension];
                
                if (!allowedTypes) return true; // Unknown extension, allow
                
                return allowedTypes.some(type => contentType.includes(type));
            }

            /**
             * Update loading progress
             */
            updateLoadingProgress(loaded, total) {
                const percentage = Math.round((loaded / total) * 100);
                
                // Update loading indicator if present
                const loadingText = document.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = \`載入中... \${percentage}%\`;
                }

                // Hide loading overlay when complete
                if (loaded === total) {
                    setTimeout(() => {
                        const loadingOverlay = document.getElementById('loading');
                        if (loadingOverlay) {
                            loadingOverlay.classList.add('hidden');
                        }
                    }, 500);
                }
            }

            /**
             * Handle loading timeout
             */
            handleLoadingTimeout(failedCount) {
                console.warn(\`[Resource Validator] \${failedCount} resources failed to load within timeout\`);
                
                this.showUserFriendlyError(
                    \`部分資源載入較慢 (\${failedCount} 個)，功能可能受限。請檢查網路連線或重新整理頁面。\`
                );
            }

            /**
             * Update UI for missing resources
             */
            updateUIForMissingResource(resourcePath) {
                // Disable features that depend on missing resources
                if (resourcePath.includes('qrcode')) {
                    const qrButtons = document.querySelectorAll('[data-action*="qr"]');
                    qrButtons.forEach(btn => {
                        btn.disabled = true;
                        btn.title = 'QR 碼功能暫時無法使用';
                    });
                }

                if (resourcePath.includes('bilingual')) {
                    const langToggle = document.getElementById('lang-toggle');
                    if (langToggle) {
                        langToggle.disabled = true;
                        langToggle.title = '語言切換功能暫時無法使用';
                    }
                }
            }

            /**
             * Show critical resource error
             */
            showCriticalResourceError(resourcePath) {
                const errorMessage = \`關鍵資源載入失敗: \${resourcePath.split('/').pop()}。應用程式可能無法正常運作。\`;
                this.showUserFriendlyError(errorMessage, 'error');
            }

            /**
             * Show user-friendly error message
             */
            showUserFriendlyError(message, type = 'warning') {
                // Create or update notification
                let notification = document.getElementById('notification');
                if (!notification) {
                    notification = document.createElement('div');
                    notification.id = 'notification';
                    notification.className = 'notification';
                    document.body.appendChild(notification);
                }

                notification.innerHTML = \`
                    <div class="notification-content \${type}">
                        <span class="notification-icon">\${type === 'error' ? '❌' : '⚠️'}</span>
                        <span class="notification-message">\${this.sanitizeMessage(message)}</span>
                        <button class="notification-close" onclick="this.parentElement.parentElement.classList.add('hidden')">&times;</button>
                    </div>
                \`;

                notification.classList.remove('hidden');

                // Auto-hide after 10 seconds for warnings
                if (type === 'warning') {
                    setTimeout(() => {
                        notification.classList.add('hidden');
                    }, 10000);
                }
            }

            /**
             * Sanitize error message for XSS protection
             */
            sanitizeMessage(message) {
                return message
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;');
            }

            /**
             * Get validation report
             */
            getReport() {
                return {
                    timestamp: new Date().toISOString(),
                    loadedResources: Array.from(this.loadedResources),
                    failedResources: Array.from(this.failedResources),
                    totalLoaded: this.loadedResources.size,
                    totalFailed: this.failedResources.size,
                    successRate: this.loadedResources.size / (this.loadedResources.size + this.failedResources.size) * 100
                };
            }
        }

        // Initialize resource validator when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.resourceValidator = new ResourceLoadingValidator();
                window.resourceValidator.init();
            });
        } else {
            window.resourceValidator = new ResourceLoadingValidator();
            window.resourceValidator.init();
        }
    </script>`;

        // Insert validation script before closing head tag
        htmlContent = htmlContent.replace('</head>', `${validationScript}\n</head>`);
        
        this.report.enhancements.push({
            type: 'resource_validation',
            description: 'Added comprehensive resource loading validation system'
        });
        
        return htmlContent;
    }

    /**
     * Add SRI validation for critical resources
     */
    async addSRIValidation(htmlContent) {
        // Generate SRI hashes for critical resources
        const criticalResources = [
            'assets/styles/main.css',
            'assets/styles/components.css',
            'src/app.js'
        ];

        for (const resource of criticalResources) {
            const resourcePath = path.join(this.pwaRoot, resource);
            if (fs.existsSync(resourcePath)) {
                const hash = this.generateSRIHash(resourcePath);
                const resourceName = resource.split('/').pop();
                
                // Add integrity attribute to matching elements
                const linkPattern = new RegExp(`(<link[^>]+href=["'][^"']*${resourceName}["'][^>]*)(>)`, 'g');
                const scriptPattern = new RegExp(`(<script[^>]+src=["'][^"']*${resourceName}["'][^>]*)(>)`, 'g');
                
                htmlContent = htmlContent.replace(linkPattern, `$1 integrity="${hash}" crossorigin="anonymous"$2`);
                htmlContent = htmlContent.replace(scriptPattern, `$1 integrity="${hash}" crossorigin="anonymous"$2`);
                
                this.report.security.push({
                    type: 'sri_validation',
                    resource: resource,
                    hash: hash
                });
            }
        }
        
        return htmlContent;
    }

    /**
     * Add enhanced error handling styles and elements
     */
    async addErrorHandling(htmlContent) {
        // Add error handling styles
        const errorStyles = `
    <!-- RESOURCE-04: Error Handling Styles -->
    <style>
        .resource-error {
            opacity: 0.5;
            filter: grayscale(100%);
        }
        
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }
        
        .notification:not(.hidden) {
            transform: translateX(0);
        }
        
        .notification-content {
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .notification-content.warning {
            border-left: 4px solid #ff9800;
        }
        
        .notification-content.error {
            border-left: 4px solid #f44336;
        }
        
        .notification-icon {
            font-size: 20px;
            flex-shrink: 0;
        }
        
        .notification-message {
            flex: 1;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .notification-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s;
        }
        
        .notification-close:hover {
            background-color: rgba(0,0,0,0.1);
        }
        
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: opacity 0.3s ease;
        }
        
        .loading-overlay.hidden {
            opacity: 0;
            pointer-events: none;
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e3f2fd;
            border-top: 4px solid #1976d2;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .loading-text {
            font-size: 16px;
            color: #666;
        }
        
        [disabled] {
            opacity: 0.6;
            cursor: not-allowed !important;
        }
    </style>`;

        // Insert error styles before closing head tag
        htmlContent = htmlContent.replace('</head>', `${errorStyles}\n</head>`);
        
        this.report.enhancements.push({
            type: 'error_handling',
            description: 'Added comprehensive error handling styles and user feedback'
        });
        
        return htmlContent;
    }

    /**
     * Write enhanced HTML file
     */
    async writeEnhancedHTML(content) {
        fs.writeFileSync(this.indexPath, content, 'utf8');
        console.log('📝 Written enhanced HTML with resource validation');
        
        this.report.enhancements.push({
            type: 'html_enhancement',
            file: this.indexPath,
            features: [
                'Resource loading validation',
                'SRI integrity checks',
                'Error handling and recovery',
                'User-friendly error messages',
                'Loading progress indicators'
            ],
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Extract resources from HTML content
     */
    extractResources(content, pattern) {
        const matches = content.match(pattern) || [];
        return matches.map(match => {
            const srcMatch = match.match(/(?:src|href)=["']([^"']+)["']/);
            return srcMatch ? srcMatch[1] : null;
        }).filter(Boolean);
    }

    /**
     * Generate SRI hash for resource
     */
    generateSRIHash(filePath) {
        const content = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha384').update(content).digest('base64');
        return `sha384-${hash}`;
    }

    /**
     * Generate comprehensive report
     */
    async generateReport() {
        const reportPath = path.join(this.projectRoot, 'deploy', 'resource-04-validation-report.json');
        
        // Add summary statistics
        this.report.summary = {
            totalValidations: this.report.validation.length,
            totalEnhancements: this.report.enhancements.length,
            securityFeatures: this.report.security.length,
            features: [
                'Resource loading validation',
                'SRI integrity checks',
                'Error handling and recovery',
                'Loading progress monitoring',
                'User-friendly error messages',
                'Fallback resource loading',
                'Critical resource retry logic'
            ]
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
        console.log(`📊 Generated validation report: ${reportPath}`);
    }

    /**
     * Rollback on failure
     */
    async rollback() {
        if (fs.existsSync(this.backupPath)) {
            fs.copyFileSync(this.backupPath, this.indexPath);
            console.log('🔄 Rolled back to original HTML');
        }
    }
}

// CLI execution
if (require.main === module) {
    const validator = new ResourceLoadingValidator();
    
    validator.validateResourceLoading()
        .then(report => {
            console.log('\n✅ RESOURCE-04 Resource Loading Validation Summary:');
            console.log(`📊 Total Validations: ${report.summary.totalValidations}`);
            console.log(`🔧 Total Enhancements: ${report.summary.totalEnhancements}`);
            console.log(`🔒 Security Features: ${report.summary.securityFeatures}`);
            console.log(`🚀 Features: ${report.summary.features.join(', ')}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ RESOURCE-04 validation failed:', error.message);
            process.exit(1);
        });
}

module.exports = ResourceLoadingValidator;