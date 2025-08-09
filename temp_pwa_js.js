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
                        console.warn(`[Resource Validator] Loading timeout: ${loadedCount}/${totalCount} resources loaded`);
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
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    // Validate content type for security
                    const contentType = response.headers.get('content-type') || '';
                    if (!this.isValidContentType(resourcePath, contentType)) {
                        throw new Error(`Invalid content type: ${contentType}`);
                    }

                    this.loadedResources.add(resourcePath);
                    return true;

                } catch (error) {
                    console.error(`[Resource Validator] Validation failed for ${resourcePath}:`, error.message);
                    
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

                console.log(`[Resource Validator] Retrying critical resource ${resourcePath} (attempt ${attempt})`);
                
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
                console.error(`[Resource Validator] Resource error: ${resourcePath}`, error);

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
                    console.log(`[Resource Validator] Loading fallback: ${fallbackPath}`);
                    
                    const fallbackScript = document.createElement('script');
                    fallbackScript.src = fallbackPath;
                    fallbackScript.onerror = () => {
                        console.error(`[Resource Validator] Fallback also failed: ${fallbackPath}`);
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
                    /assets/styles/main.css/,
                    /src/app.js/,
                    /src/core/storage.js/,
                    /assets/scripts/qrcode/
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
                    loadingText.textContent = `載入中... ${percentage}%`;
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
                console.warn(`[Resource Validator] ${failedCount} resources failed to load within timeout`);
                
                this.showUserFriendlyError(
                    `部分資源載入較慢 (${failedCount} 個)，功能可能受限。請檢查網路連線或重新整理頁面。`
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
                const errorMessage = `關鍵資源載入失敗: ${resourcePath.split('/').pop()}。應用程式可能無法正常運作。`;
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

                notification.innerHTML = `
                    <div class="notification-content ${type}">
                        <span class="notification-icon">${type === 'error' ? '❌' : '⚠️'}</span>
                        <span class="notification-message">${this.sanitizeMessage(message)}</span>
                        <button class="notification-close" onclick="this.parentElement.parentElement.classList.add('hidden')">&times;</button>
                    </div>
                `;

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
