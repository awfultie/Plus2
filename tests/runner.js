/**
 * Plus2 Extension Test Runner
 * 
 * Main entry point for loading and running all tests.
 * Load this file in browser console on Twitch/YouTube with Plus2 extension.
 * 
 * Usage:
 *   // Load test runner (loads all test files)
 *   await loadScript('tests/runner.js');
 * 
 *   // Run all tests
 *   TestFramework.runAllTests();
 * 
 *   // Run specific suite
 *   TestFramework.runSuite('polling');
 * 
 *   // Run specific test
 *   TestFramework.tests.testYesNoPoll();
 */

class TestLoader {
    constructor() {
        this.baseUrl = '/tests/';
        this.loadedFiles = new Set();
        this.loadPromises = new Map();
    }

    /**
     * Load a JavaScript file dynamically
     */
    async loadScript(path) {
        if (this.loadedFiles.has(path)) {
            return;
        }

        if (this.loadPromises.has(path)) {
            return await this.loadPromises.get(path);
        }

        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = this.baseUrl + path;
            script.onload = () => {
                this.loadedFiles.add(path);
                console.log(`📚 Loaded: ${path}`);
                resolve();
            };
            script.onerror = (error) => {
                console.error(`❌ Failed to load: ${path}`, error);
                reject(error);
            };
            document.head.appendChild(script);
        });

        this.loadPromises.set(path, promise);
        return await promise;
    }

    /**
     * Load all test files
     */
    async loadAllTests() {
        console.log('🚀 Loading Plus2 Test Framework...');
        
        const filesToLoad = [
            'test-framework.js',
            'suites/polling-tests.js',
            'suites/sentiment-tests.js', 
            'suites/settings-tests.js',
            'suites/integration-tests.js',
            'suites/performance-tests.js'
        ];

        for (const file of filesToLoad) {
            await this.loadScript(file);
        }

        console.log('✅ All test files loaded successfully!');
        console.log('\n🎯 Test Framework Ready!');
        console.log('📋 Available commands:');
        console.log('  • TestFramework.runAllTests() - Run complete test suite');
        console.log('  • TestFramework.runSuite("polling") - Run specific suite');
        console.log('  • TestFramework.tests.testYesNoPoll() - Run specific test');
        console.log('\n📊 Available test suites:', Object.keys(window.TestFramework?.suites || {}));
    }

    /**
     * Check if browser environment is ready for testing
     */
    checkEnvironment() {
        const issues = [];

        // Check if we're on a supported site
        const hostname = window.location.hostname;
        if (!hostname.includes('twitch.tv') && !hostname.includes('youtube.com')) {
            issues.push('⚠️  Not on Twitch or YouTube - extension may not be active');
        }

        // Check if extension is loaded
        if (typeof browser === 'undefined' && typeof chrome === 'undefined') {
            issues.push('❌ Browser extension API not available');
        }

        // Check if Plus2 extension is responding
        // This is async, so we'll just warn
        if (typeof browser !== 'undefined') {
            browser.runtime.sendMessage({ type: 'REQUEST_INITIAL_STATE' })
                .catch(() => {
                    console.warn('⚠️  Plus2 extension may not be loaded or active');
                });
        }

        if (issues.length > 0) {
            console.log('\n🔍 Environment Check:');
            issues.forEach(issue => console.log(issue));
            console.log('');
        } else {
            console.log('✅ Environment ready for testing');
        }

        return issues.length === 0;
    }
}

// Auto-load when this file is loaded
(async () => {
    const loader = new TestLoader();
    
    console.log('🧪 Plus2 Extension Test Suite');
    console.log('=' .repeat(50));
    
    // Check environment
    loader.checkEnvironment();
    
    try {
        // Load all test files
        await loader.loadAllTests();
        
        // Make loader available globally for manual use
        window.TestLoader = loader;
        
        console.log('\n🎉 Ready to run tests!');
        console.log('💡 Quick start: TestFramework.runAllTests()');
        
    } catch (error) {
        console.error('❌ Failed to load test framework:', error);
        console.log('\n🔧 Troubleshooting:');
        console.log('  1. Make sure you\'re on Twitch or YouTube');
        console.log('  2. Ensure Plus2 extension is installed and active');
        console.log('  3. Check that test files are accessible');
    }
})();

// Export for manual loading
window.TestLoader = new TestLoader();