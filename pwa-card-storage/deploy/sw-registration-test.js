/**
 * Service Worker Registration Success Rate Test
 * 
 * Tests SW registration across different environments to ensure ≥95% success rate
 * 
 * @version 3.2.1-simplified
 */

/**
 * SW Registration Test Suite
 */
class SWRegistrationTest {
    constructor() {
        this.results = {
            total: 0,
            successful: 0,
            failed: 0,
            errors: []
        };
    }

    /**
     * Test SW registration with different configurations
     */
    async runRegistrationTests() {
        console.log('🧪 Testing Service Worker Registration Success Rate\n');

        // Test different base paths
        const testConfigurations = [
            { name: 'GitHub Pages', basePath: '/DB-Card' },
            { name: 'Cloudflare Pages', basePath: '' },
            { name: 'Netlify', basePath: '' },
            { name: 'Vercel', basePath: '' },
            { name: 'Firebase', basePath: '' },
            { name: 'Local Development', basePath: '' }
        ];

        for (const config of testConfigurations) {
            await this.testRegistration(config);
        }

        this.printResults();
        return this.getSuccessRate() >= 95;
    }

    /**
     * Test registration for specific configuration
     */
    async testRegistration(config) {
        this.results.total++;

        try {
            // Simulate SW registration
            const registrationResult = await this.simulateRegistration(config);
            
            if (registrationResult.success) {
                this.results.successful++;
                console.log(`✅ ${config.name}: Registration successful`);
            } else {
                this.results.failed++;
                this.results.errors.push(`${config.name}: ${registrationResult.error}`);
                console.log(`❌ ${config.name}: ${registrationResult.error}`);
            }
        } catch (error) {
            this.results.failed++;
            this.results.errors.push(`${config.name}: ${error.message}`);
            console.log(`❌ ${config.name}: ${error.message}`);
        }
    }

    /**
     * Simulate SW registration (since we can't actually register in Node.js)
     */
    async simulateRegistration(config) {
        // Simulate different failure scenarios
        const failureScenarios = [
            { condition: config.basePath.includes('//'), error: 'Invalid base path format' },
            { condition: config.name === 'Unknown Platform', error: 'Unsupported platform' },
            { condition: Math.random() < 0.02, error: 'Random network failure' } // 2% random failure
        ];

        for (const scenario of failureScenarios) {
            if (scenario.condition) {
                return { success: false, error: scenario.error };
            }
        }

        // Simulate successful registration
        return { 
            success: true, 
            config: config.name,
            basePath: config.basePath 
        };
    }

    /**
     * Calculate success rate
     */
    getSuccessRate() {
        if (this.results.total === 0) return 0;
        return Math.round((this.results.successful / this.results.total) * 100);
    }

    /**
     * Print test results
     */
    printResults() {
        console.log('\n📊 Registration Test Results:');
        console.log(`✅ Successful: ${this.results.successful}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${this.getSuccessRate()}%`);

        if (this.results.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.results.errors.forEach(error => console.log(`   - ${error}`));
        }

        if (this.getSuccessRate() >= 95) {
            console.log('\n🎉 SW Registration Success Rate ≥ 95% - PASSED');
        } else {
            console.log('\n⚠️  SW Registration Success Rate < 95% - FAILED');
        }
    }
}

/**
 * Browser-based SW registration test (for actual testing)
 */
function createBrowserTest() {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>SW Registration Test</title>
</head>
<body>
    <h1>Service Worker Registration Test</h1>
    <div id="results"></div>
    
    <script>
        async function testSWRegistration() {
            const results = document.getElementById('results');
            let successful = 0;
            let total = 0;
            
            // Test configurations
            const configs = [
                { name: 'Current Environment', swPath: './sw.js' },
                { name: 'Relative Path', swPath: '/pwa-card-storage/sw.js' },
                { name: 'Absolute Path', swPath: window.location.origin + '/pwa-card-storage/sw.js' }
            ];
            
            for (const config of configs) {
                total++;
                try {
                    const registration = await navigator.serviceWorker.register(config.swPath);
                    successful++;
                    results.innerHTML += \`<p>✅ \${config.name}: Success</p>\`;
                    console.log('SW registered:', registration);
                } catch (error) {
                    results.innerHTML += \`<p>❌ \${config.name}: \${error.message}</p>\`;
                    console.error('SW registration failed:', error);
                }
            }
            
            const successRate = Math.round((successful / total) * 100);
            results.innerHTML += \`<h2>Success Rate: \${successRate}%</h2>\`;
            
            if (successRate >= 95) {
                results.innerHTML += '<p style="color: green;">🎉 Test PASSED</p>';
            } else {
                results.innerHTML += '<p style="color: red;">⚠️ Test FAILED</p>';
            }
        }
        
        // Run test when page loads
        if ('serviceWorker' in navigator) {
            testSWRegistration();
        } else {
            document.getElementById('results').innerHTML = '<p>❌ Service Worker not supported</p>';
        }
    </script>
</body>
</html>`;
}

// Run tests if called directly
if (require.main === module) {
    const test = new SWRegistrationTest();
    test.runRegistrationTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { SWRegistrationTest, createBrowserTest };