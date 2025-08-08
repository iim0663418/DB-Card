/**
 * DEPLOY-01: Resource Copier for Static Hosting Compatibility
 * Copies required assets from main project to PWA directory
 */

const fs = require('fs');
const path = require('path');

class ResourceCopier {
  constructor() {
    this.sourceRoot = path.resolve(__dirname, '../../');
    this.targetRoot = path.resolve(__dirname, '../');
    
    // Define resource mapping
    this.resourceMap = [
      // Core scripts
      { src: 'assets/bilingual-common.js', dest: 'assets/scripts/bilingual-common.js' },
      { src: 'assets/qrcode.min.js', dest: 'assets/scripts/qrcode.min.js' },
      { src: 'assets/qr-utils.js', dest: 'assets/scripts/qr-utils.js' },
      { src: 'assets/offline-qr-enhancement.js', dest: 'assets/scripts/offline-qr-enhancement.js' },
      { src: 'assets/pwa-integration.js', dest: 'assets/scripts/pwa-integration.js' },
      { src: 'assets/card-type-utils.js', dest: 'assets/scripts/card-type-utils.js' },
      
      // Core styles
      { src: 'assets/high-accessibility.css', dest: 'assets/styles/high-accessibility.css' },
      { src: 'assets/qrcode-style.css', dest: 'assets/styles/qrcode-style.css' },
      
      // Images
      { src: 'assets/moda-logo.svg', dest: 'assets/images/moda-logo.svg' },
      
      // Security modules (if they exist)
      { src: 'src/security/SecurityInputHandler.js', dest: 'src/security/SecurityInputHandler.js' },
      { src: 'src/security/SecurityDataHandler.js', dest: 'src/security/SecurityDataHandler.js' },
      { src: 'src/security/SecurityAuthHandler.js', dest: 'src/security/SecurityAuthHandler.js' }
    ];
  }

  /**
   * Copy all required resources
   */
  async copyResources() {
    console.log('[ResourceCopier] Starting resource copy process...');
    
    let copiedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const resource of this.resourceMap) {
      try {
        const result = await this.copyResource(resource.src, resource.dest);
        if (result.copied) {
          copiedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`[ResourceCopier] Failed to copy ${resource.src}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`[ResourceCopier] Copy complete: ${copiedCount} copied, ${skippedCount} skipped, ${errorCount} errors`);
    
    return {
      success: errorCount === 0,
      copied: copiedCount,
      skipped: skippedCount,
      errors: errorCount
    };
  }

  /**
   * Copy individual resource
   */
  async copyResource(srcPath, destPath) {
    const fullSrcPath = path.join(this.sourceRoot, srcPath);
    const fullDestPath = path.join(this.targetRoot, destPath);
    
    // Check if source exists
    if (!fs.existsSync(fullSrcPath)) {
      console.warn(`[ResourceCopier] Source not found: ${srcPath}`);
      return { copied: false, reason: 'source_not_found' };
    }
    
    // Check if destination already exists and is newer
    if (fs.existsSync(fullDestPath)) {
      const srcStats = fs.statSync(fullSrcPath);
      const destStats = fs.statSync(fullDestPath);
      
      if (destStats.mtime >= srcStats.mtime) {
        console.log(`[ResourceCopier] Skipping ${srcPath} (destination is newer)`);
        return { copied: false, reason: 'destination_newer' };
      }
    }
    
    // Ensure destination directory exists
    const destDir = path.dirname(fullDestPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Copy file
    fs.copyFileSync(fullSrcPath, fullDestPath);
    console.log(`[ResourceCopier] Copied: ${srcPath} -> ${destPath}`);
    
    return { copied: true };
  }

  /**
   * Validate copied resources
   */
  async validateResources() {
    console.log('[ResourceCopier] Validating copied resources...');
    
    const validationResults = [];
    
    for (const resource of this.resourceMap) {
      const fullDestPath = path.join(this.targetRoot, resource.dest);
      const exists = fs.existsSync(fullDestPath);
      
      validationResults.push({
        resource: resource.dest,
        exists,
        size: exists ? fs.statSync(fullDestPath).size : 0
      });
    }
    
    const missingResources = validationResults.filter(r => !r.exists);
    
    if (missingResources.length > 0) {
      console.warn('[ResourceCopier] Missing resources:', missingResources.map(r => r.resource));
    } else {
      console.log('[ResourceCopier] All resources validated successfully');
    }
    
    return {
      success: missingResources.length === 0,
      total: validationResults.length,
      missing: missingResources.length,
      results: validationResults
    };
  }

  /**
   * Generate resource manifest
   */
  generateManifest() {
    const manifest = {
      generated: new Date().toISOString(),
      resources: this.resourceMap.map(resource => ({
        source: resource.src,
        destination: resource.dest,
        type: this.getResourceType(resource.dest),
        critical: this.isCriticalResource(resource.dest)
      }))
    };
    
    const manifestPath = path.join(this.targetRoot, 'deploy/resource-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log('[ResourceCopier] Resource manifest generated');
    return manifest;
  }

  /**
   * Get resource type
   */
  getResourceType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      '.js': 'script',
      '.css': 'style',
      '.svg': 'image',
      '.png': 'image',
      '.jpg': 'image',
      '.json': 'data'
    };
    return typeMap[ext] || 'unknown';
  }

  /**
   * Check if resource is critical
   */
  isCriticalResource(filePath) {
    const criticalPatterns = [
      /bilingual-common\.js$/,
      /qrcode\.min\.js$/,
      /high-accessibility\.css$/,
      /moda-logo\.svg$/
    ];
    
    return criticalPatterns.some(pattern => pattern.test(filePath));
  }
}

// CLI usage
if (require.main === module) {
  const copier = new ResourceCopier();
  
  (async () => {
    try {
      const copyResult = await copier.copyResources();
      const validationResult = await copier.validateResources();
      const manifest = copier.generateManifest();
      
      console.log('\n=== DEPLOY-01 Resource Copy Summary ===');
      console.log(`Resources copied: ${copyResult.copied}`);
      console.log(`Resources skipped: ${copyResult.skipped}`);
      console.log(`Copy errors: ${copyResult.errors}`);
      console.log(`Validation: ${validationResult.success ? 'PASSED' : 'FAILED'}`);
      console.log(`Missing resources: ${validationResult.missing}`);
      
      process.exit(copyResult.success && validationResult.success ? 0 : 1);
    } catch (error) {
      console.error('[ResourceCopier] Fatal error:', error);
      process.exit(1);
    }
  })();
}

module.exports = ResourceCopier;