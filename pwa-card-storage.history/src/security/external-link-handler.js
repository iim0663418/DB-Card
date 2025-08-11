/**
 * ExternalLinkHandler - Reverse Tabnabbing Protection Module
 * 
 * Prevents reverse tabnabbing attacks by automatically securing external links
 * with proper rel attributes and accessibility-compliant warnings.
 * 
 * @version 1.0.0
 * @author Security Team
 */

class ExternalLinkHandler {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.enableLogging = options.enableLogging !== false;
        this.autoProcess = options.autoProcess !== false;
        this.addVisualHints = options.addVisualHints !== false;
        this.currentDomain = this.getCurrentDomain();
        this.observer = null;
        
        // Initialize if in browser environment
        if (typeof window !== 'undefined' && this.autoProcess) {
            this.initialize();
        }
    }

    /**
     * Get current domain for external link detection
     */
    getCurrentDomain() {
        if (typeof window !== 'undefined' && window.location) {
            return window.location.hostname.toLowerCase();
        }
        return 'localhost'; // Default for testing
    }

    /**
     * Initialize the handler with DOM observation
     */
    initialize() {
        // Process existing links
        this.processAllLinks(document);
        
        // Set up mutation observer for dynamic content
        this.observeNewLinks();
        
        if (this.enableLogging) {
            this.logger.info?.('ExternalLinkHandler initialized', {
                domain: this.currentDomain,
                autoProcess: this.autoProcess
            });
        }
    }

    /**
     * Check if a URL is external to current domain
     */
    isExternalLink(url) {
        if (!url) return false;
        
        try {
            // Handle relative URLs
            if (url.startsWith('/') || url.startsWith('#') || url.startsWith('?')) {
                return false;
            }
            
            // Handle protocol-relative URLs
            if (url.startsWith('//')) {
                url = 'https:' + url;
            }
            
            // Handle URLs without protocol
            if (!url.match(/^https?:\/\//)) {
                // Check for common external patterns
                if (url.includes('.') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
                    url = 'https://' + url;
                } else {
                    return false; // Likely internal or special protocol
                }
            }
            
            const linkUrl = new URL(url);
            const linkDomain = linkUrl.hostname.toLowerCase();
            
            // Check if domains match (including subdomains)
            return linkDomain !== this.currentDomain && 
                   !linkDomain.endsWith('.' + this.currentDomain) &&
                   !this.currentDomain.endsWith('.' + linkDomain);
                   
        } catch (error) {
            if (this.enableLogging) {
                this.logger.warn?.('Invalid URL detected', { url, error: error.message });
            }
            return false;
        }
    }

    /**
     * Secure an external link element
     */
    secureExternalLink(element) {
        if (!element || element.tagName !== 'A') return false;
        
        const href = element.getAttribute('href');
        if (!this.isExternalLink(href)) return false;
        
        // Add security attributes
        const currentRel = element.getAttribute('rel') || '';
        const relParts = currentRel.split(/\s+/).filter(Boolean);
        
        // Add noopener and noreferrer if not present
        if (!relParts.includes('noopener')) {
            relParts.push('noopener');
        }
        if (!relParts.includes('noreferrer')) {
            relParts.push('noreferrer');
        }
        
        element.setAttribute('rel', relParts.join(' '));
        
        // Ensure target="_blank" for external links
        if (!element.getAttribute('target')) {
            element.setAttribute('target', '_blank');
        }
        
        // Add accessibility hint
        this.addAccessibilityHint(element);
        
        // Add visual hint if enabled
        if (this.addVisualHints) {
            this.addVisualHint(element);
        }
        
        if (this.enableLogging) {
            this.logger.info?.('External link secured', {
                href,
                rel: element.getAttribute('rel'),
                target: element.getAttribute('target')
            });
        }
        
        return true;
    }

    /**
     * Add accessibility hint for screen readers
     */
    addAccessibilityHint(element) {
        const lang = (typeof window !== 'undefined' && window.languageManager?.getCurrentLanguage()) || 'zh';
        
        // Get existing aria-label or create new one
        let ariaLabel = element.getAttribute('aria-label') || element.textContent || '';
        
        // Add external link hint if not already present
        const externalHint = lang === 'zh' ? '（外部連結）' : '(external link)';
        if (!ariaLabel.includes(externalHint)) {
            ariaLabel = ariaLabel.trim() + ' ' + externalHint;
            element.setAttribute('aria-label', ariaLabel);
        }
        
        // Add title attribute for tooltip
        const titleHint = lang === 'zh' 
            ? '此連結將在新視窗開啟外部網站' 
            : 'This link will open an external website in a new window';
        
        if (!element.getAttribute('title')) {
            element.setAttribute('title', titleHint);
        }
    }

    /**
     * Add visual hint for external links
     */
    addVisualHint(element) {
        // Check if hint already added
        if (element.classList.contains('external-link-secured')) return;
        
        element.classList.add('external-link-secured');
        
        // Add CSS for visual indicator
        if (typeof document !== 'undefined') {
            this.ensureVisualStyles();
        }
    }

    /**
     * Ensure visual styles are loaded
     */
    ensureVisualStyles() {
        const styleId = 'external-link-handler-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .external-link-secured {
                position: relative;
            }
            
            .external-link-secured::after {
                content: "↗";
                font-size: 0.8em;
                margin-left: 0.2em;
                color: var(--pwa-primary, #0066cc);
                opacity: 0.7;
                font-weight: bold;
            }
            
            .external-link-secured:hover::after {
                opacity: 1;
            }
            
            @media (prefers-reduced-motion: reduce) {
                .external-link-secured::after {
                    transition: none;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Process all links in a container
     */
    processAllLinks(container = document) {
        if (!container || typeof container.querySelectorAll !== 'function') return 0;
        
        const links = container.querySelectorAll('a[href]');
        let securedCount = 0;
        
        links.forEach(link => {
            if (this.secureExternalLink(link)) {
                securedCount++;
            }
        });
        
        if (this.enableLogging && securedCount > 0) {
            this.logger.info?.(`Secured ${securedCount} external links`, {
                container: container.tagName || 'Document',
                totalLinks: links.length
            });
        }
        
        return securedCount;
    }

    /**
     * Set up mutation observer for dynamic content
     */
    observeNewLinks() {
        if (typeof MutationObserver === 'undefined') return;
        
        this.observer = new MutationObserver((mutations) => {
            let hasNewLinks = false;
            
            mutations.forEach(mutation => {
                // Check added nodes
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the node itself is a link
                        if (node.tagName === 'A' && node.getAttribute('href')) {
                            this.secureExternalLink(node);
                            hasNewLinks = true;
                        }
                        
                        // Check for links within the added node
                        if (typeof node.querySelectorAll === 'function') {
                            const newLinks = node.querySelectorAll('a[href]');
                            newLinks.forEach(link => {
                                if (this.secureExternalLink(link)) {
                                    hasNewLinks = true;
                                }
                            });
                        }
                    }
                });
                
                // Check modified attributes
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'href' && 
                    mutation.target.tagName === 'A') {
                    if (this.secureExternalLink(mutation.target)) {
                        hasNewLinks = true;
                    }
                }
            });
            
            if (hasNewLinks && this.enableLogging) {
                this.logger.info?.('Secured dynamically added external links');
            }
        });
        
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href']
        });
    }

    /**
     * Manually process a specific element or container
     */
    processElement(element) {
        if (!element) return 0;
        
        if (element.tagName === 'A') {
            return this.secureExternalLink(element) ? 1 : 0;
        } else {
            return this.processAllLinks(element);
        }
    }

    /**
     * Get statistics about processed links
     */
    getStatistics(container = document) {
        if (!container || typeof container.querySelectorAll !== 'function') {
            return { total: 0, external: 0, secured: 0 };
        }
        
        const allLinks = container.querySelectorAll('a[href]');
        let externalCount = 0;
        let securedCount = 0;
        
        allLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (this.isExternalLink(href)) {
                externalCount++;
                const rel = link.getAttribute('rel') || '';
                if (rel.includes('noopener') && rel.includes('noreferrer')) {
                    securedCount++;
                }
            }
        });
        
        return {
            total: allLinks.length,
            external: externalCount,
            secured: securedCount
        };
    }

    /**
     * Cleanup and disconnect observer
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        if (this.enableLogging) {
            this.logger.info?.('ExternalLinkHandler destroyed');
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExternalLinkHandler };
} else if (typeof window !== 'undefined') {
    window.ExternalLinkHandler = ExternalLinkHandler;
}