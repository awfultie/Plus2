/**
 * Quick Plus2 Test - Copy and paste this entire script into browser console
 * 
 * This is a self-contained test that doesn't require external files.
 * Perfect for quick validation that the extension is working.
 */

(async function quickPlus2Test() {
    console.log('🧪 Plus2 Quick Test');
    console.log('=' .repeat(40));
    
    let testsPassed = 0;
    let testsTotal = 0;
    
    function test(name, testFn) {
        return new Promise(async (resolve) => {
            testsTotal++;
            const startTime = Date.now();
            
            try {
                await testFn();
                testsPassed++;
                const duration = Date.now() - startTime;
                console.log(`✅ ${name} (${duration}ms)`);
                resolve(true);
            } catch (error) {
                const duration = Date.now() - startTime;
                console.log(`❌ ${name} (${duration}ms)`);
                console.log(`   Error: ${error.message}`);
                resolve(false);
            }
        });
    }
    
    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async function sendMessage(text, username = 'testuser') {
        await browser.runtime.sendMessage({ 
            type: 'CHAT_MESSAGE_FOUND', 
            data: { text, images: [], username, badges: [] }
        });
        await delay(50);
    }
    
    async function getState() {
        return await browser.runtime.sendMessage({ type: 'REQUEST_INITIAL_STATE' });
    }
    
    async function resetSystem() {
        await browser.runtime.sendMessage({ type: 'RESET_UNIFIED_POLLING' });
        await delay(1000);
    }
    
    // Test 1: Basic Extension Communication
    await test('Extension Communication', async () => {
        const state = await getState();
        if (!state) throw new Error('No response from extension');
        if (!state.settings) throw new Error('No settings in response');
    });
    
    // Test 2: Settings Structure
    await test('Settings Structure', async () => {
        const state = await getState();
        if (!state.settings.unifiedPolling) throw new Error('Missing unifiedPolling settings');
        if (!state.settings.unifiedPolling.numbers) throw new Error('Missing numbers config');
        if (!state.settings.unifiedPolling.sentiment) throw new Error('Missing sentiment config');
    });
    
    // Test 3: System Reset
    await test('System Reset', async () => {
        await resetSystem();
        const state = await getState();
        if (!state.unifiedPoll) throw new Error('Missing unifiedPoll state after reset');
    });
    
    // Test 4: Yes/No Poll Activation
    await test('Yes/No Poll Activation', async () => {
        await resetSystem();
        await sendMessage('yes');
        await sendMessage('no');
        await sendMessage('yes');
        
        await delay(500);
        const state = await getState();
        
        if (!state.unifiedPoll.isActive) throw new Error('Poll not active');
        if (state.unifiedPoll.pollType !== 'yesno') throw new Error('Wrong poll type');
        if (!state.unifiedPoll.counts.yes) throw new Error('Missing yes votes');
        if (!state.unifiedPoll.counts.no) throw new Error('Missing no votes');
    });
    
    // Test 5: Number Poll Activation
    await test('Number Poll Activation', async () => {
        await resetSystem();
        
        // Send enough numbers to activate (threshold is usually 7)
        for (let i = 1; i <= 8; i++) {
            await sendMessage(i.toString());
        }
        
        await delay(500);
        const state = await getState();
        
        if (!state.unifiedPoll.isActive) throw new Error('Number poll not active');
        if (state.unifiedPoll.pollType !== 'numbers') throw new Error('Wrong poll type');
        if (Object.keys(state.unifiedPoll.counts).length === 0) throw new Error('No number counts');
    });
    
    // Test 6: Sentiment Processing
    await test('Sentiment Processing', async () => {
        await resetSystem();
        
        // Send sentiment messages
        for (let i = 0; i < 20; i++) {
            await sendMessage('love this stream');
        }
        
        await delay(1000);
        const state = await getState();
        
        if (!state.unifiedPoll.sentimentData) throw new Error('No sentiment data');
        if (!state.unifiedPoll.sentimentData.allItems) throw new Error('No sentiment items tracked');
        
        const sentimentItems = Object.keys(state.unifiedPoll.sentimentData.allItems);
        if (sentimentItems.length === 0) throw new Error('No sentiment items processed');
    });
    
    // Test 7: Poll Conclusion
    await test('Poll Conclusion', async () => {
        await resetSystem();
        
        // Start a simple poll
        await sendMessage('yes');
        await sendMessage('no');  
        await sendMessage('yes');
        
        await delay(500);
        
        // Wait minimum duration then end
        await delay(6000);
        const endResult = await browser.runtime.sendMessage({ type: 'END_POLL_MANUALLY' });
        
        if (!endResult.success) throw new Error('Failed to end poll manually');
        
        await delay(500);
        const state = await getState();
        
        if (!state.unifiedPoll.isConcluded) throw new Error('Poll not concluded');
        if (!state.unifiedPoll.shouldDisplay) throw new Error('Concluded poll not displayable');
    });
    
    // Test 8: Settings Values
    await test('Settings Values Validation', async () => {
        const state = await getState();
        const config = state.settings.unifiedPolling;
        
        if (typeof config.numbers.maxDisplayItems !== 'number') throw new Error('maxDisplayItems not configured');
        if (typeof config.numbers.maxBins !== 'number') throw new Error('maxBins not configured');
        if (typeof config.letters.maxDisplayItems !== 'number') throw new Error('letters maxDisplayItems not configured');
        if (typeof config.sentiment.activationThreshold !== 'number') throw new Error('sentiment threshold not configured');
        
        if (config.numbers.maxDisplayItems <= 0) throw new Error('Invalid maxDisplayItems value');
        if (config.numbers.maxBins <= 0) throw new Error('Invalid maxBins value');
    });
    
    // Results
    console.log('\n' + '=' .repeat(40));
    console.log('📊 QUICK TEST RESULTS');
    console.log('=' .repeat(40));
    console.log(`📈 Tests Run: ${testsTotal}`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsTotal - testsPassed}`);
    
    const passRate = testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0;
    console.log(`📊 Pass Rate: ${passRate}%`);
    
    if (testsPassed === testsTotal) {
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('✅ Plus2 extension is working correctly');
    } else {
        console.log(`\n⚠️  ${testsTotal - testsPassed} TESTS FAILED`);
        console.log('🔍 Check the errors above for details');
    }
    
    console.log('\n💡 For more comprehensive testing, use the full test framework');
    
    return {
        total: testsTotal,
        passed: testsPassed,
        failed: testsTotal - testsPassed,
        passRate: passRate
    };
})();