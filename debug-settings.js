/**
 * Debug Settings Structure
 * Run this in browser console to see the actual settings structure
 */

(async function debugSettings() {
    console.log('🔍 Debugging Plus2 Settings Structure');
    console.log('=' .repeat(50));
    
    try {
        // Get raw storage
        const storage = await browser.storage.local.get();
        console.log('📦 Raw Storage Contents:');
        console.log(JSON.stringify(storage, null, 2));
        
        // Get state from extension
        const state = await browser.runtime.sendMessage({ type: 'REQUEST_INITIAL_STATE' });
        console.log('\n📊 Extension State Settings:');
        console.log(JSON.stringify(state.settings, null, 2));
        
        // Check specific paths that options page is looking for
        console.log('\n🔍 Checking Options Page Paths:');
        
        const pathsToCheck = [
            'unifiedPolling.yesno.enabled',
            'unifiedPolling.numbers.enabled', 
            'unifiedPolling.letters.enabled',
            'unifiedPolling.sentiment.enabled',
            'polling.types.yesno.enabled',
            'polling.types.numbers.enabled'
        ];
        
        function getNestedValue(obj, path) {
            return path.split('.').reduce((curr, prop) => curr && curr[prop], obj);
        }
        
        pathsToCheck.forEach(path => {
            const value = getNestedValue(state.settings, path);
            console.log(`  ${path}: ${value}`);
        });
        
        // Check what structure actually exists
        console.log('\n📋 Available Setting Sections:');
        if (state.settings) {
            Object.keys(state.settings).forEach(key => {
                console.log(`  • ${key}: ${typeof state.settings[key]}`);
                if (typeof state.settings[key] === 'object' && state.settings[key] !== null) {
                    Object.keys(state.settings[key]).forEach(subkey => {
                        console.log(`    - ${key}.${subkey}: ${typeof state.settings[key][subkey]}`);
                    });
                }
            });
        }
        
        // Test specific unified polling paths
        console.log('\n🎯 Unified Polling Structure:');
        if (state.settings?.unifiedPolling) {
            console.log('  ✅ unifiedPolling exists');
            Object.keys(state.settings.unifiedPolling).forEach(key => {
                console.log(`    • ${key}:`, state.settings.unifiedPolling[key]);
            });
        } else {
            console.log('  ❌ unifiedPolling missing');
        }
        
        console.log('\n📝 Recommendations:');
        if (!state.settings?.unifiedPolling) {
            console.log('  • unifiedPolling section missing from settings');
            console.log('  • Need to check default-settings.json is loaded correctly');
            console.log('  • May need to reset extension settings');
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
})();