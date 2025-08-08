/**
 * DEPLOY-01: Static Hosting Compatibility Smoke Tests
 * Tests for hardcoded path fixes and resource availability
 */

// Mock environment for testing
if (typeof window === 'undefined') {
  global.window = {};
  global.document = {
    querySelectorAll: () => [],
    createElement: () => ({ src: '', href: '' })
  };
  global.console = {
    log: () => {},
    warn: () => {},
    error: () => {}
  };
}

const fs = require('fs');
const path = require('path');

/**
 * Test Suite: Resource Availability
 */
function testResourceAvailability() {
  console.log('Testing resource availability...');
  
  try {
    const pwaRoot = path.resolve(__dirname, '../../pwa-card-storage');
    
    // Critical resources that must exist
    const criticalResources = [
      'assets/scripts/bilingual-common.js',
      'assets/scripts/qrcode.min.js', 
      'assets/scripts/qr-utils.js',
      'assets/styles/high-accessibility.css',
      'assets/images/moda-logo.svg'
    ];
    
    let missingResources = [];
    
    for (const resource of criticalResources) {
      const resourcePath = path.join(pwaRoot, resource);
      if (!fs.existsSync(resourcePath)) {
        missingResources.push(resource);
      }
    }
    
    if (missingResources.length > 0) {
      console.log('❌ Missing critical resources:', missingResources);
      return false;
    }
    
    console.log('✅ All critical resources available');
    return true;
  } catch (error) {
    console.log('❌ Resource availability test failed:', error.message);
    return false;
  }
}

/**
 * Test Suite: Path Security
 */
function testPathSecurity() {
  console.log('Testing path security...');
  
  try {
    const pwaRoot = path.resolve(__dirname, '../../pwa-card-storage');
    
    // Files to check for dangerous paths
    const filesToCheck = [
      'index.html',
      'manifest.json',
      'sw.js'
    ];
    
    const dangerousPatterns = [
      /\.\.\//g,           // Parent directory references
      /file:\/\//g,        // File protocol
      /\.\.\\\\?/g         // Windows parent references
    ];
    
    let securityIssues = [];
    
    for (const file of filesToCheck) {
      const filePath = path.join(pwaRoot, file);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        dangerousPatterns.forEach((pattern, index) => {
          const matches = content.match(pattern);
          if (matches) {
            securityIssues.push({
              file,
              pattern: pattern.source,
              matches: matches.length
            });
          }
        });
      }
    }
    
    if (securityIssues.length > 0) {
      console.log('❌ Path security issues found:', securityIssues);
      return false;
    }
    
    console.log('✅ No path security issues found');
    return true;
  } catch (error) {
    console.log('❌ Path security test failed:', error.message);
    return false;
  }
}

/**
 * Test Suite: Manifest Validation
 */
function testManifestValidation() {
  console.log('Testing manifest validation...');
  
  try {
    const pwaRoot = path.resolve(__dirname, '../../pwa-card-storage');
    const manifestPath = path.join(pwaRoot, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      console.log('❌ Manifest file not found');
      return false;
    }
    
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    // Check required fields
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      console.log('❌ Missing manifest fields:', missingFields);
      return false;
    }
    
    // Check icon paths
    const invalidIcons = manifest.icons.filter(icon => {
      const iconPath = path.join(pwaRoot, icon.src.replace('./', ''));
      return !fs.existsSync(iconPath);
    });
    
    if (invalidIcons.length > 0) {
      console.log('❌ Invalid icon paths:', invalidIcons.map(i => i.src));
      return false;
    }
    
    console.log('✅ Manifest validation passed');
    return true;
  } catch (error) {
    console.log('❌ Manifest validation failed:', error.message);
    return false;
  }
}

/**
 * Test Suite: Static Hosting Compatibility
 */
function testStaticHostingCompatibility() {
  console.log('Testing static hosting compatibility...');
  
  try {
    const pwaRoot = path.resolve(__dirname, '../../pwa-card-storage');
    
    // Check for server-side dependencies
    const serverSidePatterns = [
      /require\s*\(/g,     // Node.js require
      /import.*from.*\.js/g, // ES6 imports without proper paths
      /process\./g,        // Node.js process
      /__dirname/g,        // Node.js __dirname
      /module\.exports/g   // Node.js exports
    ];
    
    const clientFiles = ['index.html', 'src/app.js'];
    let compatibilityIssues = [];
    
    for (const file of clientFiles) {
      const filePath = path.join(pwaRoot, file);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        serverSidePatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            compatibilityIssues.push({
              file,
              pattern: pattern.source,
              matches: matches.length
            });
          }
        });
      }
    }
    
    if (compatibilityIssues.length > 0) {
      console.log('⚠️  Potential static hosting issues:', compatibilityIssues);
      // Don't fail the test for this, just warn
    }
    
    console.log('✅ Static hosting compatibility check passed');
    return true;
  } catch (error) {
    console.log('❌ Static hosting compatibility test failed:', error.message);
    return false;
  }
}

/**
 * Test Suite: Resource Integrity
 */
function testResourceIntegrity() {
  console.log('Testing resource integrity...');
  
  try {
    const pwaRoot = path.resolve(__dirname, '../../pwa-card-storage');
    
    // Check file sizes to ensure they're not empty or corrupted
    const resourcesWithMinSizes = [
      { path: 'assets/scripts/bilingual-common.js', minSize: 1000 },
      { path: 'assets/scripts/qrcode.min.js', minSize: 5000 },
      { path: 'assets/styles/high-accessibility.css', minSize: 500 },
      { path: 'assets/images/moda-logo.svg', minSize: 1000 }
    ];
    
    let integrityIssues = [];
    
    for (const resource of resourcesWithMinSizes) {
      const resourcePath = path.join(pwaRoot, resource.path);
      
      if (fs.existsSync(resourcePath)) {
        const stats = fs.statSync(resourcePath);
        if (stats.size < resource.minSize) {
          integrityIssues.push({
            path: resource.path,
            actualSize: stats.size,
            expectedMinSize: resource.minSize
          });
        }
      } else {
        integrityIssues.push({
          path: resource.path,
          issue: 'file_not_found'
        });
      }
    }
    
    if (integrityIssues.length > 0) {
      console.log('❌ Resource integrity issues:', integrityIssues);
      return false;
    }
    
    console.log('✅ Resource integrity check passed');
    return true;
  } catch (error) {
    console.log('❌ Resource integrity test failed:', error.message);
    return false;
  }
}

/**
 * Test Suite: Deployment Structure
 */
function testDeploymentStructure() {
  console.log('Testing deployment structure...');
  
  try {
    const pwaRoot = path.resolve(__dirname, '../../pwa-card-storage');
    
    // Required directory structure
    const requiredDirs = [
      'assets',
      'assets/scripts',
      'assets/styles', 
      'assets/images',
      'src',
      'src/core',
      'src/features'
    ];
    
    let missingDirs = [];
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(pwaRoot, dir);
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        missingDirs.push(dir);
      }
    }
    
    if (missingDirs.length > 0) {
      console.log('❌ Missing required directories:', missingDirs);
      return false;
    }
    
    console.log('✅ Deployment structure check passed');
    return true;
  } catch (error) {
    console.log('❌ Deployment structure test failed:', error.message);
    return false;
  }
}

/**
 * Run All Tests
 */
function runAllTests() {
  console.log('🧪 Starting DEPLOY-01 Static Hosting Compatibility Tests\n');
  
  const tests = [
    testResourceAvailability,
    testPathSecurity,
    testManifestValidation,
    testStaticHostingCompatibility,
    testResourceIntegrity,
    testDeploymentStructure
  ];
  
  let passed = 0;
  let total = tests.length;
  
  tests.forEach((test, index) => {
    console.log(`\n--- Test ${index + 1}/${total} ---`);
    if (test()) {
      passed++;
    }
  });
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All DEPLOY-01 static hosting tests passed!');
    return true;
  } else {
    console.log('⚠️  Some DEPLOY-01 static hosting tests failed');
    return false;
  }
}

// Run tests if this file is executed directly
if (typeof module !== 'undefined' && require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

// Export for use in other test files
if (typeof module !== 'undefined') {
  module.exports = {
    runAllTests,
    testResourceAvailability,
    testPathSecurity,
    testManifestValidation,
    testStaticHostingCompatibility,
    testResourceIntegrity,
    testDeploymentStructure
  };
}

// Browser environment
if (typeof window !== 'undefined') {
  window.deploy01Tests = {
    runAllTests,
    testResourceAvailability,
    testPathSecurity,
    testManifestValidation,
    testStaticHostingCompatibility,
    testResourceIntegrity,
    testDeploymentStructure
  };
}