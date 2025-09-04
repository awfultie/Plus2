/**
 * Polling Test Suite
 * 
 * Tests all polling functionality including yes/no, numbers, letters, and poll lifecycle.
 */

class PollingTestSuite {
    constructor(framework) {
        this.framework = framework;
        this.utils = framework.utils;
    }

    async run() {
        console.log('\n📊 Running Polling Tests');
        console.log('-'.repeat(40));

        const tests = [
            'testYesNoPoll',
            'testNumberPoll',
            'testNumberPollWithOutliers', 
            'testLetterPoll',
            'testPollPriority',
            'testPollLifecycle',
            'testPollCooldown',
            'testPollLimits',
            'testConcludedResults'
        ];

        for (const testName of tests) {
            await this.runTest(testName);
        }

        return this.framework.results.suites.polling;
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
        this.framework._addResult('polling', testName, passed, error, duration);
    }

    /**
     * Test Yes/No polling functionality
     */
    async testYesNoPoll() {
        await this.utils.resetSystem();
        
        // Send yes/no responses
        const responses = ['yes', 'no', 'y', 'n', 'yes', 'yes', 'no'];
        await this.utils.sendMessages(responses);
        
        await this.utils.delay(500);
        
        const state = await this.utils.getState();
        
        this.utils.assertTrue(
            state.unifiedPoll?.isActive && state.unifiedPoll.pollType === 'yesno',
            'Yes/No poll should be active'
        );
        
        this.utils.assertTrue(
            state.unifiedPoll.counts.yes > 0 && state.unifiedPoll.counts.no > 0,
            'Should have both yes and no votes'
        );
    }

    /**
     * Test number polling functionality
     */
    async testNumberPoll() {
        await this.utils.resetSystem();
        
        // Send number responses - need 7+ for activation
        const numbers = this.utils.generateNumbers(10, 1, 50);
        await this.utils.sendMessages(numbers);
        
        await this.utils.delay(500);
        
        const state = await this.utils.getState();
        
        this.utils.assertTrue(
            state.unifiedPoll?.isActive && state.unifiedPoll.pollType === 'numbers',
            'Number poll should be active'
        );
        
        this.utils.assertTrue(
            Object.keys(state.unifiedPoll.counts).length > 0,
            'Should have number counts'
        );
    }

    /**
     * Test number polling with outliers
     */
    async testNumberPollWithOutliers() {
        await this.utils.resetSystem();
        
        // Send numbers with clear outliers
        const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '1000', '999'];
        await this.utils.sendMessages(numbers);
        
        await this.utils.delay(500);
        
        const state = await this.utils.getState();
        
        this.utils.assertTrue(
            state.unifiedPoll?.isActive,
            'Poll should be active with outliers'
        );
        
        // End poll to see concluded results
        await this.utils.delay(6000);
        await this.utils.endPoll();
        
        const concludedState = await this.utils.getState();
        this.utils.assertTrue(
            concludedState.unifiedPoll?.isConcluded,
            'Poll should be concluded'
        );
    }

    /**
     * Test letter polling functionality
     */
    async testLetterPoll() {
        await this.utils.resetSystem();
        
        // Send letters - need 10+ total with 3+ individual
        const letters = [];
        ['a', 'b', 'c', 'd'].forEach(letter => {
            for (let i = 0; i < 4; i++) {
                letters.push(letter);
            }
        });
        
        await this.utils.sendMessages(letters);
        
        await this.utils.delay(500);
        
        const state = await this.utils.getState();
        
        this.utils.assertTrue(
            state.unifiedPoll?.isActive && state.unifiedPoll.pollType === 'letters',
            'Letter poll should be active'
        );
        
        this.utils.assertTrue(
            Object.keys(state.unifiedPoll.counts).length >= 4,
            'Should have multiple letter counts'
        );
    }

    /**
     * Test poll priority system
     */
    async testPollPriority() {
        await this.utils.resetSystem();
        
        // Send mixed messages - yes/no should win (priority 1)
        const mixed = ['yes', 'no', '5', '6', 'a', 'b', 'yes'];
        await this.utils.sendMessages(mixed);
        
        await this.utils.delay(500);
        
        const state = await this.utils.getState();
        
        this.utils.assertEqual(
            state.unifiedPoll?.pollType,
            'yesno',
            'Yes/No should have highest priority'
        );
    }

    /**
     * Test poll lifecycle
     */
    async testPollLifecycle() {
        await this.utils.resetSystem();
        
        // Start a poll
        await this.utils.sendMessages(['yes', 'no', 'yes']);
        await this.utils.delay(500);
        
        const activeState = await this.utils.getState();
        this.utils.assertTrue(activeState.unifiedPoll?.isActive, 'Poll should be active');
        
        // Wait for minimum duration then end
        await this.utils.delay(6000);
        await this.utils.endPoll();
        await this.utils.delay(500);
        
        const concludedState = await this.utils.getState();
        this.utils.assertTrue(concludedState.unifiedPoll?.isConcluded, 'Poll should be concluded');
        
        // Wait for cooldown
        await this.utils.delay(3000);
        
        // Try to start new poll
        await this.utils.sendMessages(['1', '2', '3', '4', '5', '6', '7']);
        await this.utils.delay(500);
        
        const newPollState = await this.utils.getState();
        
        // Should either be in cooldown or new poll started
        this.utils.assert(
            newPollState.unifiedPoll?.isActive || newPollState.unifiedPoll?.cooldownActive,
            'Should be in new poll or cooldown'
        );
    }

    /**
     * Test poll cooldown system
     */
    async testPollCooldown() {
        await this.utils.resetSystem();
        
        // Start and quickly end a poll
        await this.utils.sendMessages(['yes', 'no', 'yes']);
        await this.utils.delay(6000);
        await this.utils.endPoll();
        
        // Immediately try to start another
        await this.utils.sendMessages(['1', '2', '3', '4', '5', '6', '7']);
        await this.utils.delay(500);
        
        const state = await this.utils.getState();
        
        // Should be in cooldown or the new poll should be delayed
        this.utils.assert(
            !state.unifiedPoll?.isActive || state.unifiedPoll?.cooldownActive,
            'Should respect cooldown period'
        );
    }

    /**
     * Test configurable limits
     */
    async testPollLimits() {
        await this.utils.resetSystem();
        
        // Send many numbers to test display limits
        const manyNumbers = this.utils.generateNumbers(30, 1, 100);
        await this.utils.sendMessages(manyNumbers);
        
        await this.utils.delay(500);
        
        const state = await this.utils.getState();
        
        this.utils.assertTrue(
            state.unifiedPoll?.isActive,
            'Poll should handle many numbers'
        );
        
        // End poll to check concluded display limits
        await this.utils.delay(6000);
        await this.utils.endPoll();
        
        const concludedState = await this.utils.getState();
        this.utils.assertTrue(
            concludedState.unifiedPoll?.isConcluded,
            'Poll should conclude with limits applied'
        );
    }

    /**
     * Test concluded poll results display
     */
    async testConcludedResults() {
        await this.utils.resetSystem();
        
        // Create a poll with clear results
        const votes = ['1', '1', '1', '2', '2', '3'];
        await this.utils.sendMessages(votes);
        
        await this.utils.delay(500);
        
        // End poll
        await this.utils.delay(6000);
        const endResult = await this.utils.endPoll();
        
        this.utils.assertTrue(
            endResult?.success,
            'Poll should end successfully'
        );
        
        await this.utils.delay(500);
        
        const state = await this.utils.getState();
        
        this.utils.assertTrue(
            state.unifiedPoll?.isConcluded,
            'Poll should be in concluded state'
        );
        
        this.utils.assertTrue(
            state.unifiedPoll?.shouldDisplay,
            'Concluded poll should be displayable'
        );
    }
}