/**
 * Plus2 Test Framework Loader
 * 
 * Simple loader that handles async loading properly and works from any location.
 * Copy and paste this entire script into browser console.
 */

(async function loadPlus2Tests() {
    console.log('🧪 Loading Plus2 Test Framework...');
    
    // Determine base path - try common locations
    const possiblePaths = [
        '', // Same directory
        'tests/',
        '/tests/',
        '/Users/tyler/repos/Plus2/tests/',
        './tests/',
        '../tests/'
    ];
    
    let basePath = '';
    
    // Helper to load script with promise
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // Helper to check if file exists
    async function checkPath(path) {
        try {
            await fetch(path + 'test-framework.js', { method: 'HEAD' });
            return true;
        } catch {
            return false;
        }
    }
    
    // Find working path
    console.log('🔍 Finding test files...');
    for (const path of possiblePaths) {
        if (await checkPath(path)) {
            basePath = path;
            console.log(`✅ Found tests at: ${basePath || 'current directory'}`);
            break;
        }
    }
    
    if (!basePath && !await checkPath('')) {
        console.error('❌ Could not find test files. Make sure you are in the Plus2 directory.');
        console.log('💡 Try running this from the Plus2 repository root, or place test files in accessible location.');
        return;
    }
    
    // Load test framework and suites in order
    const filesToLoad = [
        'test-framework.js',
        'suites/polling-tests.js',
        'suites/sentiment-tests.js', 
        'suites/settings-tests.js',
        'suites/integration-tests.js',
        'suites/performance-tests.js'
    ];
    
    try {
        console.log('📚 Loading test files...');
        
        for (const file of filesToLoad) {
            const src = basePath + file;
            console.log(`  Loading ${file}...`);
            await loadScript(src);
        }
        
        console.log('✅ All test files loaded!');
        
        // Wait a moment for everything to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (typeof TestFramework !== 'undefined') {
            console.log('\n🎉 Test Framework Ready!');
            console.log('📋 Available commands:');
            console.log('  • TestFramework.runAllTests()');
            console.log('  • TestFramework.runSuite("polling")');  
            console.log('  • TestFramework.tests.testYesNoPoll()');
            console.log('\n📊 Available suites:', Object.keys(TestFramework.suites));
            
            // Show quick start example
            console.log('\n💡 Quick start:');
            console.log('TestFramework.runAllTests().then(results => {');
            console.log('  console.log("Tests completed!", results);');
            console.log('});');
            
        } else {
            console.error('❌ TestFramework not available after loading');
        }
        
    } catch (error) {
        console.error('❌ Failed to load test framework:', error);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure you are on Twitch or YouTube');
        console.log('2. Ensure Plus2 extension is installed and active'); 
        console.log('3. Check that test files exist and are accessible');
        console.log('4. Try loading individual files manually');
    }
})();

// Also provide manual loading functions
window.loadPlus2TestsManual = async function() {
    console.log('🔧 Manual loading mode...');
    
    // Define all the classes inline for environments where file loading fails
    console.log('⚠️  Loading embedded test framework (limited functionality)');
    
    // Basic framework for when files can't be loaded
    window.TestFramework = {
        async runAllTests() {
            console.log('🧪 Running embedded tests...');
            
            await this.testBasicFunctionality();
            
            console.log('✅ Basic tests completed');
            return { embedded: true, status: 'completed' };
        },
        
        async testBasicFunctionality() {
            console.log('Testing basic Plus2 functionality...');
            
            try {
                // Test extension communication
                const state = await browser.runtime.sendMessage({ type: 'REQUEST_INITIAL_STATE' });
                console.log('✅ Extension communication working');
                
                if (state.settings?.unifiedPolling) {
                    console.log('✅ Unified polling settings loaded');
                } else {
                    console.log('⚠️  Unified polling settings not found');
                }
                
                // Test message sending
                await browser.runtime.sendMessage({ 
                    type: 'CHAT_MESSAGE_FOUND', 
                    data: { text: 'test', images: [], username: 'testuser', badges: [] }
                });
                console.log('✅ Message sending working');
                
                return true;
                
            } catch (error) {
                console.log('❌ Basic functionality test failed:', error);
                return false;
            }
        }
    };
    
    console.log('🎯 Embedded TestFramework ready! Run TestFramework.runAllTests()');
};