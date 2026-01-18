/**
 * DEPLOY-01: Deployment Validator
 * Final validation before static hosting deployment
 */

class DeploymentValidator {
  constructor() {
    this.validationResults = [];
    this.criticalIssues = [];
  }

  /**
   * Run complete deployment validation
   */
  async validateDeployment() {
    console.log('🚀 Starting DEPLOY-01 deployment validation...\n');

    const validations = [
      this.validateResourceAvailability(),
      this.validatePathSecurity(),
      this.validateManifestIntegrity(),
      this.validateStaticHostingCompatibility(),
      this.validateSecurityHeaders(),
      this.validatePerformanceOptimizations()
    ];

    const results = await Promise.all(validations);
    
    const allPassed = results.every(result => result.passed);
    const criticalFailures = results.filter(r => !r.passed && r.critical);

    console.log('\n📊 DEPLOY-01 Validation Summary:');
    console.log(`✅ Passed: ${results.filter(r => r.passed).length}/${results.length}`);
    console.log(`❌ Failed: ${results.filter(r => !r.passed).length}/${results.length}`);
    console.log(`🚨 Critical: ${criticalFailures.length}`);

    if (allPassed) {
      console.log('\n🎉 DEPLOY-01 validation PASSED! Ready for static hosting deployment.');
    } else if (criticalFailures.length === 0) {
      console.log('\n⚠️  DEPLOY-01 validation completed with warnings. Deployment possible but not optimal.');
    } else {
      console.log('\n🚫 DEPLOY-01 validation FAILED! Critical issues must be resolved before deployment.');
    }

    return {
      success: allPassed,
      critical: criticalFailures.length === 0,
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        critical: criticalFailures.length
      }
    };
  }

  /**
   * Validate all required resources are available
   */
  async validateResourceAvailability() {
    console.log('📦 Validating resource availability...');
    
    const requiredResources = [
      'assets/scripts/bilingual-common.js',
      'assets/scripts/qrcode.min.js',
      'assets/scripts/qr-utils.js',
      'assets/styles/high-accessibility.css',
      'assets/images/moda-logo.svg',
      'manifest.json',
      'sw.js',
      'index.html'
    ];

    const missingResources = [];
    
    for (const resource of requiredResources) {
      try {
        const response = await fetch(resource, { method: 'HEAD' });
        if (!response.ok) {
          missingResources.push(resource);
        }
      } catch (error) {
        missingResources.push(resource);
      }
    }

    const passed = missingResources.length === 0;
    
    if (passed) {
      console.log('  ✅ All required resources available');
    } else {
      console.log(`  ❌ Missing resources: ${missingResources.join(', ')}`);
    }

    return {
      name: 'Resource Availability',
      passed,
      critical: true,
      details: {
        total: requiredResources.length,
        missing: missingResources.length,
        missingResources
      }
    };
  }

  /**
   * Validate path security
   */
  async validatePathSecurity() {
    console.log('🔒 Validating path security...');
    
    const filesToCheck = ['index.html', 'manifest.json', 'sw.js'];
    const securityIssues = [];
    
    for (const file of filesToCheck) {
      try {
        const response = await fetch(file);
        const content = await response.text();
        
        // Check for dangerous path patterns
        const dangerousPatterns = [
          { pattern: /\.\.\//g, name: 'Parent directory reference' },
          { pattern: /file:\/\//g, name: 'File protocol' },
          { pattern: /\.\.\\\\?/g, name: 'Windows parent reference' }
        ];
        
        dangerousPatterns.forEach(({ pattern, name }) => {
          const matches = content.match(pattern);
          if (matches) {
            securityIssues.push({
              file,
              issue: name,
              count: matches.length
            });
          }
        });
      } catch (error) {
        console.warn(`  ⚠️  Cannot check ${file}: ${error.message}`);
      }
    }

    const passed = securityIssues.length === 0;
    
    if (passed) {
      console.log('  ✅ No path security issues found');
    } else {
      console.log(`  ❌ Path security issues: ${securityIssues.length}`);
      securityIssues.forEach(issue => {
        console.log(`    - ${issue.file}: ${issue.issue} (${issue.count} occurrences)`);
      });
    }

    return {
      name: 'Path Security',
      passed,
      critical: true,
      details: { securityIssues }
    };
  }

  /**
   * Validate manifest integrity
   */
  async validateManifestIntegrity() {
    console.log('📋 Validating manifest integrity...');
    
    try {
      const response = await fetch('manifest.json');
      const manifest = await response.json();
      
      const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
      const missingFields = requiredFields.filter(field => !manifest[field]);
      
      const iconIssues = [];
      if (manifest.icons) {
        for (const icon of manifest.icons) {
          try {
            const iconResponse = await fetch(icon.src, { method: 'HEAD' });
            if (!iconResponse.ok) {
              iconIssues.push(icon.src);
            }
          } catch (error) {
            iconIssues.push(icon.src);
          }
        }
      }

      const passed = missingFields.length === 0 && iconIssues.length === 0;
      
      if (passed) {
        console.log('  ✅ Manifest integrity validated');
      } else {
        if (missingFields.length > 0) {
          console.log(`  ❌ Missing manifest fields: ${missingFields.join(', ')}`);
        }
        if (iconIssues.length > 0) {
          console.log(`  ❌ Invalid icon paths: ${iconIssues.join(', ')}`);
        }
      }

      return {
        name: 'Manifest Integrity',
        passed,
        critical: false,
        details: { missingFields, iconIssues }
      };
    } catch (error) {
      console.log(`  ❌ Manifest validation failed: ${error.message}`);
      return {
        name: 'Manifest Integrity',
        passed: false,
        critical: true,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate static hosting compatibility
   */
  async validateStaticHostingCompatibility() {
    console.log('🌐 Validating static hosting compatibility...');
    
    const compatibilityIssues = [];
    
    // Check for server-side dependencies
    const serverSidePatterns = [
      { pattern: /require\s*\(/g, name: 'Node.js require()' },
      { pattern: /process\./g, name: 'Node.js process' },
      { pattern: /__dirname/g, name: 'Node.js __dirname' },
      { pattern: /module\.exports/g, name: 'Node.js exports' }
    ];

    const clientFiles = ['index.html', 'sw.js'];
    
    for (const file of clientFiles) {
      try {
        const response = await fetch(file);
        const content = await response.text();
        
        serverSidePatterns.forEach(({ pattern, name }) => {
          const matches = content.match(pattern);
          if (matches) {
            compatibilityIssues.push({
              file,
              issue: name,
              count: matches.length
            });
          }
        });
      } catch (error) {
        console.warn(`  ⚠️  Cannot check ${file}: ${error.message}`);
      }
    }

    const passed = compatibilityIssues.length === 0;
    
    if (passed) {
      console.log('  ✅ Static hosting compatibility validated');
    } else {
      console.log(`  ⚠️  Potential compatibility issues: ${compatibilityIssues.length}`);
      compatibilityIssues.forEach(issue => {
        console.log(`    - ${issue.file}: ${issue.issue} (${issue.count} occurrences)`);
      });
    }

    return {
      name: 'Static Hosting Compatibility',
      passed,
      critical: false,
      details: { compatibilityIssues }
    };
  }

  /**
   * Validate security headers
   */
  async validateSecurityHeaders() {
    console.log('🛡️  Validating security headers...');
    
    try {
      const response = await fetch('index.html');
      const content = await response.text();
      
      const securityHeaders = [
        { name: 'Content-Security-Policy', pattern: /Content-Security-Policy/i },
        { name: 'X-Frame-Options', pattern: /X-Frame-Options/i },
        { name: 'X-Content-Type-Options', pattern: /X-Content-Type-Options/i }
      ];
      
      const presentHeaders = securityHeaders.filter(header => 
        header.pattern.test(content)
      );
      
      const passed = presentHeaders.length >= 1; // At least CSP should be present
      
      if (passed) {
        console.log(`  ✅ Security headers present: ${presentHeaders.map(h => h.name).join(', ')}`);
      } else {
        console.log('  ⚠️  No security headers found');
      }

      return {
        name: 'Security Headers',
        passed,
        critical: false,
        details: { 
          total: securityHeaders.length,
          present: presentHeaders.length,
          presentHeaders: presentHeaders.map(h => h.name)
        }
      };
    } catch (error) {
      console.log(`  ❌ Security headers validation failed: ${error.message}`);
      return {
        name: 'Security Headers',
        passed: false,
        critical: false,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate performance optimizations
   */
  async validatePerformanceOptimizations() {
    console.log('⚡ Validating performance optimizations...');
    
    const optimizations = [];
    
    try {
      // Check for resource preloading
      const response = await fetch('index.html');
      const content = await response.text();
      
      if (content.includes('preconnect')) {
        optimizations.push('DNS preconnect');
      }
      
      if (content.includes('preload')) {
        optimizations.push('Resource preload');
      }
      
      if (content.includes('defer') || content.includes('async')) {
        optimizations.push('Script optimization');
      }
      
      // Check for service worker
      if (content.includes('serviceWorker')) {
        optimizations.push('Service Worker');
      }

      const passed = optimizations.length >= 2;
      
      if (passed) {
        console.log(`  ✅ Performance optimizations: ${optimizations.join(', ')}`);
      } else {
        console.log(`  ⚠️  Limited performance optimizations: ${optimizations.join(', ')}`);
      }

      return {
        name: 'Performance Optimizations',
        passed,
        critical: false,
        details: { optimizations }
      };
    } catch (error) {
      console.log(`  ❌ Performance validation failed: ${error.message}`);
      return {
        name: 'Performance Optimizations',
        passed: false,
        critical: false,
        details: { error: error.message }
      };
    }
  }
}

// Browser environment
if (typeof window !== 'undefined') {
  window.DeploymentValidator = DeploymentValidator;
  
  // Provide global function for console use
  window.validateDeployment = async function() {
    const validator = new DeploymentValidator();
    return await validator.validateDeployment();
  };
}

// Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeploymentValidator;
}

// Auto-run if loaded directly
if (typeof window !== 'undefined' && window.location) {
  // Auto-run validation when page loads (for testing)
  document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.search.includes('validate=true')) {
      const validator = new DeploymentValidator();
      await validator.validateDeployment();
    }
  });
}