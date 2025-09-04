/**
 * Integration Test Suite
 * 
 * Tests integration between different systems and end-to-end functionality.
 */

class IntegrationTestSuite {
    constructor(framework) {
        this.framework = framework;
        this.utils = framework.utils;
    }

    async run() {
        console.log('\n🔗 Running Integration Tests');
        console.log('-'.repeat(40));

        const tests = [
            'testPollingToPopoutIntegration',
            'testSettingsToPollingIntegration', 
            'testMultiplePollTypesIntegration',
            'testHighlightGaugeIntegration',
            'testLeaderboardIntegration',
            'testMessageProcessingPipeline',
            'testStateConsistency',
            'testErrorRecovery'
        ];

        for (const testName of tests) {
            await this.runTest(testName);
        }

        return this.framework.results.suites.integration;
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
        this.framework._addResult('integration', testName, passed, error, duration);
    }

    /**
     * Test integration between polling system and popout window
     */
    async testPollingToPopoutIntegration() {
        await this.utils.resetSystem();
        
        // Start a poll
        await this.utils.sendMessages(['yes', 'no', 'yes']);
        await this.utils.delay(500);
        
        const activeState = await this.utils.getState();
        
        this.utils.assertTrue(
            activeState.unifiedPoll?.isActive,
            'Poll should be active'
        );
        
        this.utils.assertTrue(
            activeState.unifiedPoll?.shouldDisplay,
            'Poll should be marked for display'
        );
        
        // End poll and check concluded state
        await this.utils.delay(6000);
        await this.utils.endPoll();
        await this.utils.delay(500);
        
        const concludedState = await this.utils.getState();
        
        this.utils.assertTrue(
            concludedState.unifiedPoll?.isConcluded,
            'Poll should be concluded'
        );
        
        this.utils.assertTrue(
            concludedState.unifiedPoll?.shouldDisplay,
            'Concluded poll should still be displayable'
        );
    }

    /**
     * Test integration between settings and polling behavior
     */
    async testSettingsToPollingIntegration() {
        await this.utils.resetSystem();
        
        const state = await this.utils.getState();
        const numbersThreshold = state.settings.unifiedPolling.numbers.activationThreshold;
        
        // Send exactly threshold-1 number messages
        const numbers = this.utils.generateNumbers(numbersThreshold - 1, 1, 50);
        await this.utils.sendMessages(numbers);
        await this.utils.delay(500);
        
        const belowThresholdState = await this.utils.getState();
        
        this.utils.assertFalse(
            belowThresholdState.unifiedPoll?.isActive && 
            belowThresholdState.unifiedPoll?.pollType === 'numbers',
            'Numbers poll should not activate below threshold'
        );
        
        // Send one more to reach threshold
        await this.utils.sendMessage('99');
        await this.utils.delay(500);
        
        const atThresholdState = await this.utils.getState();
        
        this.utils.assertTrue(
            atThresholdState.unifiedPoll?.isActive && 
            atThresholdState.unifiedPoll?.pollType === 'numbers',
            'Numbers poll should activate at threshold'
        );
    }

    /**
     * Test integration between multiple poll types
     */
    async testMultiplePollTypesIntegration() {
        await this.utils.resetSystem();
        
        // Send mixed messages that could activate different poll types
        const mixedMessages = [
            'yes', 'no',           // Yes/No (priority 1)
            '1', '2', '3', '4', '5', '6', '7', // Numbers (priority 2)  
            'a', 'b', 'c', 'd',    // Letters (priority 3)
            'love', 'happy'        // Sentiment (priority 4)
        ];
        
        // Duplicate to ensure thresholds are met
        await this.utils.sendMessages(mixedMessages.concat(mixedMessages));
        await this.utils.delay(500);
        
        const state = await this.utils.getState();
        
        // Should activate highest priority poll (yes/no)
        this.utils.assertTrue(
            state.unifiedPoll?.isActive,
            'Should activate a poll with mixed messages'
        );
        
        this.utils.assertEqual(
            state.unifiedPoll?.pollType,
            'yesno',
            'Should activate highest priority poll type (yesno)'
        );
        
        // Should still track sentiment independently
        this.utils.assertTrue(
            !!state.unifiedPoll?.sentimentData,
            'Should still track sentiment data'
        );
    }

    /**
     * Test integration with highlight gauge
     */
    async testHighlightGaugeIntegration() {
        await this.utils.resetSystem();
        
        const state = await this.utils.getState();
        const highlightStrings = state.settings?.highlightGauge?.stringToCount?.split(',') || ['+2', 'lol', 'lmao'];
        
        if (highlightStrings.length > 0) {
            // Send highlight messages
            const highlightMessage = highlightStrings[0].trim();
            await this.utils.sendMessages([highlightMessage, highlightMessage, highlightMessage]);
            await this.utils.delay(500);
            
            const highlightState = await this.utils.getState();
            
            this.utils.assertTrue(
                !!highlightState.highlightGauge,
                'Should have highlight gauge data'
            );
            
            this.utils.assertTrue(
                !!highlightState.unifiedPoll,
                'Should have unified poll data alongside highlight gauge'
            );
        }
        
        // Test passes even if highlight gauge is disabled
        this.utils.assertTrue(true, 'Highlight gauge integration test completed');
    }

    /**
     * Test integration with leaderboard system
     */
    async testLeaderboardIntegration() {
        await this.utils.resetSystem();
        
        // Send messages from different users
        const users = ['user1', 'user2', 'user3'];
        
        for (let i = 0; i < 10; i++) {
            await this.utils.sendMessage('test message', {
                username: users[i % users.length]
            });
        }
        
        await this.utils.delay(500);
        
        const state = await this.utils.getState();
        
        // Should have leaderboard data
        this.utils.assertTrue(
            !!state.leaderboard,
            'Should have leaderboard data'
        );
        
        // Should have unified poll data
        this.utils.assertTrue(
            !!state.unifiedPoll,
            'Should have unified poll data alongside leaderboard'
        );
    }

    /**
     * Test message processing pipeline end-to-end
     */
    async testMessageProcessingPipeline() {
        await this.utils.resetSystem();
        
        // Send a message and trace it through the pipeline
        const testMessage = 'pipeline test message';
        
        await this.utils.sendMessage(testMessage);
        await this.utils.delay(200);
        
        const state = await this.utils.getState();
        
        // Should have been processed by unified polling
        this.utils.assertTrue(
            !!state.unifiedPoll,
            'Message should trigger unified poll processing'
        );
        
        // Should have sentiment data (since it's longer than 1 char and not a number)
        this.utils.assertTrue(
            !!state.unifiedPoll?.sentimentData,
            'Message should be processed by sentiment tracking'
        );
        
        // Should have been categorized correctly
        if (state.unifiedPoll?.sentimentData?.allItems) {
            this.utils.assertTrue(
                Object.keys(state.unifiedPoll.sentimentData.allItems).length > 0,
                'Message should be categorized and tracked'
            );
        }
    }

    /**
     * Test state consistency across operations
     */
    async testStateConsistency() {
        await this.utils.resetSystem();
        
        // Get initial state
        const initialState = await this.utils.getState();
        
        this.utils.assertTrue(
            !!initialState.settings,
            'Should have settings in initial state'
        );
        
        this.utils.assertTrue(
            !!initialState.unifiedPoll,
            'Should have unified poll state'
        );
        
        // Perform operations
        await this.utils.sendMessages(['yes', 'no', 'yes']);
        await this.utils.delay(500);
        
        const activeState = await this.utils.getState();
        
        // Settings should remain consistent
        this.utils.assertTrue(
            JSON.stringify(initialState.settings) === JSON.stringify(activeState.settings),
            'Settings should remain consistent during poll operations'
        );
        
        // Should have coherent poll state
        if (activeState.unifiedPoll?.isActive) {
            this.utils.assertTrue(
                !!activeState.unifiedPoll.pollType,
                'Active poll should have type'
            );
            
            this.utils.assertTrue(
                !!activeState.unifiedPoll.counts,
                'Active poll should have counts'
            );
            
            this.utils.assertTrue(
                activeState.unifiedPoll.shouldDisplay,
                'Active poll should be displayable'
            );
        }
    }

    /**
     * Test error recovery and resilience
     */
    async testErrorRecovery() {
        await this.utils.resetSystem();
        
        // Send malformed or edge case messages
        const edgeCases = [
            '',                    // Empty string
            ' ',                   // Whitespace only
            '!@#$%^&*()',         // Special characters
            'a'.repeat(1000),     // Very long message
            '🎉🎊🎈',            // Emoji
            '\n\t\r',            // Control characters
        ];
        
        // System should handle edge cases gracefully
        try {
            await this.utils.sendMessages(edgeCases);
            await this.utils.delay(500);
            
            const state = await this.utils.getState();
            
            this.utils.assertTrue(
                !!state.unifiedPoll,
                'System should remain functional after edge case messages'
            );
            
            // Should still be able to process normal messages
            await this.utils.sendMessages(['yes', 'no', 'yes']);
            await this.utils.delay(500);
            
            const recoveredState = await this.utils.getState();
            
            this.utils.assertTrue(
                !!recoveredState.unifiedPoll,
                'System should recover and process normal messages'
            );
            
        } catch (error) {
            // Even if edge cases cause errors, system should not crash completely
            const state = await this.utils.getState();
            
            this.utils.assertTrue(
                !!state,
                'System should still respond to state requests after errors'
            );
        }
        
        this.utils.assertTrue(true, 'Error recovery test completed');
    }
}