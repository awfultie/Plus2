/**
 * Performance Test Suite
 * 
 * Tests performance characteristics and load handling of the extension.
 */

class PerformanceTestSuite {
    constructor(framework) {
        this.framework = framework;
        this.utils = framework.utils;
    }

    async run() {
        console.log('\n⚡ Running Performance Tests');
        console.log('-'.repeat(40));

        const tests = [
            'testMessageProcessingSpeed',
            'testHighVolumeMessages',
            'testMemoryUsage',
            'testStateUpdatePerformance',
            'testPollActivationSpeed',
            'testConcurrentOperations',
            'testLargeDatasetHandling',
            'testSystemLimits'
        ];

        for (const testName of tests) {
            await this.runTest(testName);
        }

        return this.framework.results.suites.performance;
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
        this.framework._addResult('performance', testName, passed, error, duration);
    }

    /**
     * Test message processing speed
     */
    async testMessageProcessingSpeed() {
        await this.utils.resetSystem();
        
        const messageCount = 50;
        const messages = this.utils.generateNumbers(messageCount, 1, 100);
        
        const startTime = Date.now();
        
        // Send messages with minimal delay
        for (const message of messages) {
            await this.utils.sendMessage(message, { delay: 5 });
        }
        
        const processingTime = Date.now() - startTime;
        const avgTimePerMessage = processingTime / messageCount;
        
        console.log(`    📊 Processed ${messageCount} messages in ${processingTime}ms (${avgTimePerMessage.toFixed(2)}ms/msg)`);
        
        this.utils.assertTrue(
            avgTimePerMessage < 50, // Less than 50ms per message
            `Message processing should be fast (${avgTimePerMessage.toFixed(2)}ms/msg)`
        );
        
        await this.utils.delay(500);
        
        const state = await this.utils.getState();
        this.utils.assertTrue(
            !!state.unifiedPoll,
            'System should be responsive after high-speed message processing'
        );
    }

    /**
     * Test handling high volume of messages
     */
    async testHighVolumeMessages() {
        await this.utils.resetSystem();
        
        const messageCount = 200;
        const messages = [];
        
        // Create diverse message types
        for (let i = 0; i < messageCount; i++) {
            if (i % 4 === 0) messages.push('yes');
            else if (i % 4 === 1) messages.push((i % 100).toString());
            else if (i % 4 === 2) messages.push(String.fromCharCode(65 + (i % 26)));
            else messages.push(`sentiment${i % 10}`);
        }
        
        const startTime = Date.now();
        
        try {
            await this.utils.sendMessages(messages, { delay: 10 });
            
            const processingTime = Date.now() - startTime;
            console.log(`    📊 Processed ${messageCount} high-volume messages in ${processingTime}ms`);
            
            await this.utils.delay(1000);
            
            const state = await this.utils.getState();
            
            this.utils.assertTrue(
                !!state.unifiedPoll,
                'System should handle high volume messages'
            );
            
            this.utils.assertTrue(
                processingTime < 30000, // Less than 30 seconds
                `High volume processing should complete in reasonable time (${processingTime}ms)`
            );
            
        } catch (error) {
            throw new Error(`High volume test failed: ${error.message}`);
        }
    }

    /**
     * Test memory usage patterns
     */
    async testMemoryUsage() {
        await this.utils.resetSystem();
        
        // Get initial state size
        const initialState = await this.utils.getState();
        const initialStateSize = JSON.stringify(initialState).length;
        
        // Send many messages to build up state
        const messages = this.utils.generateSentiments(100);
        await this.utils.sendMessages(messages, { delay: 5 });
        
        await this.utils.delay(1000);
        
        const loadedState = await this.utils.getState();
        const loadedStateSize = JSON.stringify(loadedState).length;
        
        console.log(`    📊 State size: Initial ${initialStateSize} -> Loaded ${loadedStateSize} bytes`);
        
        // Reset and check cleanup
        await this.utils.resetSystem();
        await this.utils.delay(500);
        
        const clearedState = await this.utils.getState();
        const clearedStateSize = JSON.stringify(clearedState).length;
        
        console.log(`    📊 State size after reset: ${clearedStateSize} bytes`);
        
        this.utils.assertTrue(
            clearedStateSize <= initialStateSize * 1.1, // Allow 10% variance
            'System should clean up memory on reset'
        );
        
        this.utils.assertTrue(
            loadedStateSize < 1000000, // Less than 1MB
            'State should not grow excessively large'
        );
    }

    /**
     * Test state update performance
     */
    async testStateUpdatePerformance() {
        await this.utils.resetSystem();
        
        const updateCount = 20;
        const updateTimes = [];
        
        for (let i = 0; i < updateCount; i++) {
            const startTime = Date.now();
            
            await this.utils.sendMessage(`test${i}`);
            const state = await this.utils.getState();
            
            const updateTime = Date.now() - startTime;
            updateTimes.push(updateTime);
            
            this.utils.assertTrue(
                !!state.unifiedPoll,
                `State update ${i} should be successful`
            );
            
            await this.utils.delay(50);
        }
        
        const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
        const maxUpdateTime = Math.max(...updateTimes);
        
        console.log(`    📊 State updates: Avg ${avgUpdateTime.toFixed(2)}ms, Max ${maxUpdateTime}ms`);
        
        this.utils.assertTrue(
            avgUpdateTime < 100, // Average less than 100ms
            `State updates should be fast (avg: ${avgUpdateTime.toFixed(2)}ms)`
        );
        
        this.utils.assertTrue(
            maxUpdateTime < 500, // Max less than 500ms
            `State updates should be consistent (max: ${maxUpdateTime}ms)`
        );
    }

    /**
     * Test poll activation speed
     */
    async testPollActivationSpeed() {
        await this.utils.resetSystem();
        
        const testCases = [
            { type: 'yesno', messages: ['yes', 'no', 'yes'] },
            { type: 'numbers', messages: ['1', '2', '3', '4', '5', '6', '7'] },
            { type: 'letters', messages: ['a', 'a', 'a', 'b', 'b', 'b', 'c', 'c', 'c', 'd', 'd', 'd'] }
        ];
        
        for (const testCase of testCases) {
            await this.utils.resetSystem();
            await this.utils.delay(500);
            
            const startTime = Date.now();
            
            await this.utils.sendMessages(testCase.messages, { delay: 20 });
            
            // Wait for activation
            await this.utils.waitFor(async () => {
                const state = await this.utils.getState();
                return state.unifiedPoll?.isActive && state.unifiedPoll.pollType === testCase.type;
            }, 5000);
            
            const activationTime = Date.now() - startTime;
            
            console.log(`    📊 ${testCase.type} poll activated in ${activationTime}ms`);
            
            this.utils.assertTrue(
                activationTime < 3000, // Less than 3 seconds
                `${testCase.type} poll should activate quickly (${activationTime}ms)`
            );
        }
    }

    /**
     * Test concurrent operations
     */
    async testConcurrentOperations() {
        await this.utils.resetSystem();
        
        // Simulate concurrent message sending (as much as possible in single-threaded JS)
        const batchSize = 10;
        const batches = 5;
        
        const startTime = Date.now();
        
        for (let batch = 0; batch < batches; batch++) {
            const batchPromises = [];
            
            for (let i = 0; i < batchSize; i++) {
                batchPromises.push(
                    this.utils.sendMessage(`batch${batch}_msg${i}`, { delay: false })
                );
            }
            
            await Promise.all(batchPromises);
            await this.utils.delay(100); // Small delay between batches
        }
        
        const totalTime = Date.now() - startTime;
        const totalMessages = batchSize * batches;
        
        console.log(`    📊 Processed ${totalMessages} concurrent messages in ${totalTime}ms`);
        
        await this.utils.delay(1000);
        
        const state = await this.utils.getState();
        
        this.utils.assertTrue(
            !!state.unifiedPoll,
            'System should handle concurrent operations'
        );
        
        this.utils.assertTrue(
            totalTime < 10000, // Less than 10 seconds
            `Concurrent processing should be efficient (${totalTime}ms)`
        );
    }

    /**
     * Test handling of large datasets
     */
    async testLargeDatasetHandling() {
        await this.utils.resetSystem();
        
        // Create large number dataset
        const largeNumbers = this.utils.generateNumbers(100, 1, 1000);
        
        const startTime = Date.now();
        
        await this.utils.sendMessages(largeNumbers, { delay: 5 });
        await this.utils.delay(1000);
        
        const processingTime = Date.now() - startTime;
        
        const state = await this.utils.getState();
        
        this.utils.assertTrue(
            state.unifiedPoll?.isActive || state.unifiedPoll?.isConcluded,
            'System should handle large datasets'
        );
        
        console.log(`    📊 Large dataset (${largeNumbers.length} numbers) processed in ${processingTime}ms`);
        
        this.utils.assertTrue(
            processingTime < 30000, // Less than 30 seconds
            `Large dataset processing should complete in reasonable time (${processingTime}ms)`
        );
        
        // Test that display limits are respected
        if (state.unifiedPoll?.counts) {
            const displayedItems = Object.keys(state.unifiedPoll.counts).length;
            const maxItems = state.settings?.unifiedPolling?.numbers?.maxDisplayItems || 15;
            
            this.utils.assertTrue(
                displayedItems <= maxItems * 2, // Allow some flexibility for binning
                `Displayed items should respect limits (${displayedItems} items, limit: ${maxItems})`
            );
        }
    }

    /**
     * Test system limits and boundaries
     */
    async testSystemLimits() {
        await this.utils.resetSystem();
        
        // Test message buffer limits
        const state = await this.utils.getState();
        const bufferSize = state.settings?.unifiedPolling?.behavior?.messageBufferSize || 50;
        
        // Send more messages than buffer size
        const excessMessages = this.utils.generateNumbers(bufferSize + 20, 1, 100);
        
        const startTime = Date.now();
        
        try {
            await this.utils.sendMessages(excessMessages, { delay: 10 });
            
            const processingTime = Date.now() - startTime;
            
            console.log(`    📊 Buffer overflow test: ${excessMessages.length} messages in ${processingTime}ms`);
            
            await this.utils.delay(1000);
            
            const finalState = await this.utils.getState();
            
            this.utils.assertTrue(
                !!finalState.unifiedPoll,
                'System should handle buffer overflow gracefully'
            );
            
            this.utils.assertTrue(
                processingTime < 60000, // Less than 1 minute
                `Buffer overflow should not cause excessive delay (${processingTime}ms)`
            );
            
        } catch (error) {
            // System should not crash on buffer overflow
            const recoveryState = await this.utils.getState();
            
            this.utils.assertTrue(
                !!recoveryState,
                'System should not crash on buffer overflow'
            );
        }
        
        // Test very long message
        try {
            const longMessage = 'a'.repeat(10000);
            await this.utils.sendMessage(longMessage);
            
            await this.utils.delay(500);
            
            const longMessageState = await this.utils.getState();
            
            this.utils.assertTrue(
                !!longMessageState.unifiedPoll,
                'System should handle very long messages'
            );
            
        } catch (error) {
            // Should not crash on long messages
            const recoveryState = await this.utils.getState();
            
            this.utils.assertTrue(
                !!recoveryState,
                'System should not crash on very long messages'
            );
        }
    }
}