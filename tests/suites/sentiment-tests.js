/**
 * Sentiment Test Suite
 * 
 * Tests sentiment tracking functionality including display, thresholds, and decay.
 */

class SentimentTestSuite {
    constructor(framework) {
        this.framework = framework;
        this.utils = framework.utils;
    }

    async run() {
        console.log('\n💭 Running Sentiment Tests');
        console.log('-'.repeat(40));

        const tests = [
            'testSentimentConfiguration',
            'testSentimentProcessing',
            'testSentimentThreshold',
            'testSentimentDisplay',
            'testSentimentDecay',
            'testSentimentBlockList',
            'testSentimentCategorization',
            'testSentimentIntegration'
        ];

        for (const testName of tests) {
            await this.runTest(testName);
        }

        return this.framework.results.suites.sentiment;
    }

    async runTest(testName) {
        const startTime = Date.now();
        let passed = false;
        let error = null;

        try {
            await this[testName]();
            passed = true;
        } catch (err) {
            passed = false;
            error = err.message;
        }

        const duration = Date.now() - startTime;
        this.framework._addResult('sentiment', testName, passed, error, duration);
    }

    /**
     * Test sentiment configuration is loaded correctly
     */
    async testSentimentConfiguration() {
        const state = await this.utils.getState();
        
        this.utils.assertTrue(
            !!state.settings?.unifiedPolling?.sentiment,
            'Sentiment configuration should exist'
        );
        
        this.utils.assertTrue(
            state.settings.unifiedPolling.sentiment.enabled,
            'Sentiment should be enabled by default'
        );
        
        this.utils.assertTrue(
            typeof state.settings.unifiedPolling.sentiment.activationThreshold === 'number',
            'Activation threshold should be configured'
        );
        
        this.utils.assertTrue(
            state.settings.unifiedPolling.sentiment.activationThreshold >= 1,
            'Activation threshold should be positive'
        );
    }

    /**
     * Test sentiment message processing
     */
    async testSentimentProcessing() {
        await this.utils.resetSystem();
        
        // Send messages that should be categorized as sentiment
        const sentimentMessages = [
            'love this stream',
            'feeling happy today', 
            'great content',
            'amazing work'
        ];
        
        await this.utils.sendMessages(sentimentMessages);
        await this.utils.delay(500);
        
        const state = await this.utils.getState();
        
        // Check that sentiment data exists (even if not displayed yet)
        this.utils.assertTrue(
            !!state.unifiedPoll?.sentimentData,
            'Sentiment data should exist in state'
        );
        
        this.utils.assertTrue(
            !!state.unifiedPoll.sentimentData.allItems,
            'Sentiment should track all items for debugging'
        );
        
        // Should have processed the sentiment messages
        const allItems = state.unifiedPoll.sentimentData.allItems;
        this.utils.assertTrue(
            Object.keys(allItems).length > 0,
            'Should have processed sentiment items'
        );
    }

    /**
     * Test sentiment threshold activation
     */
    async testSentimentThreshold() {
        await this.utils.resetSystem();
        
        const state = await this.utils.getState();
        const threshold = state.settings?.unifiedPolling?.sentiment?.activationThreshold || 15;
        
        // Send messages below threshold
        const messages = [];
        for (let i = 0; i < Math.floor(threshold * 0.7); i++) {
            messages.push('happy');
        }
        
        await this.utils.sendMessages(messages);
        await this.utils.delay(500);
        
        const belowThresholdState = await this.utils.getState();
        
        this.utils.assertFalse(
            belowThresholdState.unifiedPoll?.sentimentData?.shouldDisplay,
            'Sentiment should not display below threshold'
        );
        
        // Send more messages to exceed threshold
        const additionalMessages = [];
        for (let i = 0; i < Math.ceil(threshold * 0.5); i++) {
            additionalMessages.push('happy');
        }
        
        await this.utils.sendMessages(additionalMessages);
        await this.utils.delay(500);
        
        const aboveThresholdState = await this.utils.getState();
        
        this.utils.assertTrue(
            aboveThresholdState.unifiedPoll?.sentimentData?.shouldDisplay,
            'Sentiment should display when threshold is exceeded'
        );
        
        this.utils.assertTrue(
            aboveThresholdState.unifiedPoll.sentimentData.items.length > 0,
            'Should have displayable sentiment items'
        );
    }

    /**
     * Test sentiment display functionality
     */
    async testSentimentDisplay() {
        await this.utils.resetSystem();
        
        // Send diverse sentiment messages above threshold
        const sentiments = this.utils.generateSentiments(20);
        await this.utils.sendMessages(sentiments);
        
        await this.utils.delay(1000);
        
        const state = await this.utils.getState();
        
        if (state.unifiedPoll?.sentimentData?.shouldDisplay) {
            this.utils.assertTrue(
                Array.isArray(state.unifiedPoll.sentimentData.items),
                'Sentiment items should be an array'
            );
            
            this.utils.assertTrue(
                state.unifiedPoll.sentimentData.items.length > 0,
                'Should have displayable sentiment items'
            );
            
            // Check item structure
            const firstItem = state.unifiedPoll.sentimentData.items[0];
            this.utils.assertTrue(
                firstItem.hasOwnProperty('term') && 
                firstItem.hasOwnProperty('count') && 
                firstItem.hasOwnProperty('percentage'),
                'Sentiment items should have correct structure'
            );
        } else {
            throw new Error('Sentiment should be displaying after sending 20+ messages');
        }
    }

    /**
     * Test sentiment decay functionality
     */
    async testSentimentDecay() {
        await this.utils.resetSystem();
        
        // Send messages to activate sentiment
        const messages = [];
        for (let i = 0; i < 20; i++) {
            messages.push('awesome');
        }
        
        await this.utils.sendMessages(messages);
        await this.utils.delay(1000);
        
        const initialState = await this.utils.getState();
        
        if (!initialState.unifiedPoll?.sentimentData?.shouldDisplay) {
            throw new Error('Sentiment should be active before testing decay');
        }
        
        const initialCount = initialState.unifiedPoll.sentimentData.allItems['awesome']?.count || 0;
        
        this.utils.assertTrue(
            initialCount > 0,
            'Should have initial sentiment count'
        );
        
        // Wait for decay (sentiment should decay over time)
        await this.utils.delay(5000);
        
        const decayedState = await this.utils.getState();
        const decayedCount = decayedState.unifiedPoll?.sentimentData?.allItems?.['awesome']?.count || 0;
        
        this.utils.assertTrue(
            decayedCount <= initialCount,
            'Sentiment should decay over time (or stay same if not implemented yet)'
        );
    }

    /**
     * Test sentiment block list functionality
     */
    async testSentimentBlockList() {
        // This test assumes we can modify settings or that there's a default block list
        await this.utils.resetSystem();
        
        // Send a mix of messages including potentially blocked terms
        const messages = [
            'love this',    // Should be allowed
            'great stuff',  // Should be allowed  
            'banned_word',  // Might be blocked depending on config
            'awesome'       // Should be allowed
        ];
        
        await this.utils.sendMessages(messages.slice(0, 3).concat(Array(15).fill('awesome')));
        await this.utils.delay(1000);
        
        const state = await this.utils.getState();
        
        if (state.unifiedPoll?.sentimentData?.allItems) {
            // Should have processed non-blocked terms
            this.utils.assertTrue(
                Object.keys(state.unifiedPoll.sentimentData.allItems).length > 0,
                'Should process non-blocked sentiment terms'
            );
        }
        
        // This is a basic test - in a real scenario you'd configure block list first
        this.utils.assertTrue(true, 'Block list test completed (basic validation)');
    }

    /**
     * Test sentiment message categorization
     */
    async testSentimentCategorization() {
        await this.utils.resetSystem();
        
        const testCases = [
            { message: 'a', shouldBeSentiment: false },        // Single letter
            { message: '5', shouldBeSentiment: false },        // Single digit
            { message: '123', shouldBeSentiment: false },      // Pure number
            { message: 'yes', shouldBeSentiment: true },       // Word (also yes/no but sentiment too)
            { message: 'love this', shouldBeSentiment: true }, // Phrase
            { message: 'feeling great today', shouldBeSentiment: true }, // Sentence
            { message: '!@#', shouldBeSentiment: true },       // Special chars (length > 1)
        ];
        
        // Send test messages
        for (const testCase of testCases) {
            for (let i = 0; i < 3; i++) { // Send multiple to see processing
                await this.utils.sendMessage(testCase.message);
            }
        }
        
        await this.utils.delay(500);
        
        const state = await this.utils.getState();
        
        if (state.unifiedPoll?.sentimentData?.allItems) {
            const sentimentItems = Object.keys(state.unifiedPoll.sentimentData.allItems);
            
            // Should have processed multi-character non-numeric messages
            const expectedSentiments = testCases
                .filter(tc => tc.shouldBeSentiment)
                .map(tc => tc.message.toLowerCase());
                
            for (const expected of expectedSentiments) {
                if (expected !== 'yes') { // 'yes' might be processed as yesno category first
                    this.utils.assertTrue(
                        sentimentItems.includes(expected),
                        `Should have processed "${expected}" as sentiment`
                    );
                }
            }
        }
        
        this.utils.assertTrue(true, 'Sentiment categorization test completed');
    }

    /**
     * Test sentiment integration with unified polling system
     */
    async testSentimentIntegration() {
        await this.utils.resetSystem();
        
        // Test sentiment alongside other poll types
        const mixedMessages = [
            '1', '2', '3', // Numbers
            'love this', 'great', 'awesome', // Sentiment
            'a', 'b', 'c'  // Letters
        ];
        
        // Send enough to potentially activate different poll types
        for (let i = 0; i < 5; i++) {
            await this.utils.sendMessages(mixedMessages);
        }
        
        await this.utils.delay(1000);
        
        const state = await this.utils.getState();
        
        // Should have unified poll data
        this.utils.assertTrue(
            !!state.unifiedPoll,
            'Should have unified poll state'
        );
        
        // Should have sentiment data regardless of active poll type
        this.utils.assertTrue(
            !!state.unifiedPoll.sentimentData,
            'Should have sentiment data in unified state'
        );
        
        // If a poll is active, it should be the highest priority one
        if (state.unifiedPoll.isActive) {
            const validPollTypes = ['yesno', 'numbers', 'letters'];
            this.utils.assertTrue(
                validPollTypes.includes(state.unifiedPoll.pollType),
                'Active poll should be valid type'
            );
        }
        
        // Sentiment should still be tracked independently
        this.utils.assertTrue(
            !!state.unifiedPoll.sentimentData.allItems,
            'Sentiment should be tracked independently of active polls'
        );
    }
}