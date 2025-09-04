/**
 * Plus2 Extension Testing Framework
 * 
 * A comprehensive testing infrastructure for the Plus2 browser extension.
 * Provides test suites, utilities, and reporting for all extension functionality.
 * 
 * Usage:
 *   1. Load this file in browser console on Twitch/YouTube with Plus2 extension
 *   2. Run TestFramework.runAllTests() for complete suite
 *   3. Run specific test suites: TestFramework.suites.polling.run()
 *   4. Run individual tests: TestFramework.tests.testNumberPoll()
 */

class Plus2TestFramework {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            suites: {}
        };
        
        this.config = {
            defaultTimeout: 30000,
            messageDelay: 50,
            suiteDelay: 2000,
            resetDelay: 1000,
            verbose: true
        };

        this.utils = new TestUtils();
        this.suites = {};
        this.tests = {};
        
        this._initializeTests();
        
        console.log('🧪 Plus2 Testing Framework Initialized');
        console.log('📋 Available test suites:', Object.keys(this.suites));
        console.log('🎯 Run TestFramework.runAllTests() to start testing');
    }

    /**
     * Run all test suites
     */
    async runAllTests() {
        console.log('\n🚀 Starting Plus2 Extension Test Suite');
        console.log('=' .repeat(60));
        
        this._resetResults();
        const startTime = Date.now();
        
        // Run all suites in order
        const suiteNames = Object.keys(this.suites);
        for (const suiteName of suiteNames) {
            try {
                await this.suites[suiteName].run();
                await this._delay(this.config.suiteDelay);
            } catch (error) {
                console.error(`❌ Suite ${suiteName} failed:`, error);
            }
        }
        
        const duration = Date.now() - startTime;
        this._printFinalResults(duration);
        
        return this.results;
    }

    /**
     * Run a specific test suite
     */
    async runSuite(suiteName) {
        if (!this.suites[suiteName]) {
            throw new Error(`Test suite '${suiteName}' not found`);
        }
        
        console.log(`\n🧪 Running ${suiteName} test suite`);
        return await this.suites[suiteName].run();
    }

    /**
     * Add test result
     */
    _addResult(suiteName, testName, passed, error = null, duration = 0) {
        this.results.total++;
        
        if (passed) {
            this.results.passed++;
        } else {
            this.results.failed++;
        }
        
        if (!this.results.suites[suiteName]) {
            this.results.suites[suiteName] = { passed: 0, failed: 0, tests: {} };
        }
        
        this.results.suites[suiteName].tests[testName] = {
            passed,
            error,
            duration
        };
        
        if (passed) {
            this.results.suites[suiteName].passed++;
        } else {
            this.results.suites[suiteName].failed++;
        }
        
        // Log result
        const status = passed ? '✅' : '❌';
        const durationStr = duration > 0 ? ` (${duration}ms)` : '';
        console.log(`  ${status} ${testName}${durationStr}`);
        
        if (!passed && error) {
            console.error(`    Error: ${error}`);
        }
    }

    /**
     * Reset test results
     */
    _resetResults() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            suites: {}
        };
    }

    /**
     * Print final test results
     */
    _printFinalResults(duration) {
        console.log('\n' + '=' .repeat(60));
        console.log('📊 FINAL TEST RESULTS');
        console.log('=' .repeat(60));
        
        console.log(`⏱️  Total Duration: ${duration}ms`);
        console.log(`📈 Total Tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⏭️  Skipped: ${this.results.skipped}`);
        
        const passRate = this.results.total > 0 ? 
            Math.round((this.results.passed / this.results.total) * 100) : 0;
        console.log(`📊 Pass Rate: ${passRate}%`);
        
        // Suite breakdown
        console.log('\n📋 Suite Results:');
        Object.entries(this.results.suites).forEach(([suiteName, suite]) => {
            const total = suite.passed + suite.failed;
            const rate = total > 0 ? Math.round((suite.passed / total) * 100) : 0;
            console.log(`  ${suiteName}: ${suite.passed}/${total} (${rate}%)`);
        });
        
        // Overall status
        const overallStatus = this.results.failed === 0 ? 
            '🎉 ALL TESTS PASSED!' : 
            `⚠️  ${this.results.failed} TESTS FAILED`;
        console.log(`\n${overallStatus}`);
    }

    /**
     * Utility delay function
     */
    async _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Initialize all test suites
     */
    _initializeTests() {
        // Polling Tests
        this.suites.polling = new PollingTestSuite(this);
        
        // Settings/Options Tests
        this.suites.settings = new SettingsTestSuite(this);
        
        // Sentiment Tests
        this.suites.sentiment = new SentimentTestSuite(this);
        
        // Integration Tests
        this.suites.integration = new IntegrationTestSuite(this);
        
        // Performance Tests
        this.suites.performance = new PerformanceTestSuite(this);
        
        // Collect all individual test methods
        Object.values(this.suites).forEach(suite => {
            Object.getOwnPropertyNames(Object.getPrototypeOf(suite))
                .filter(name => name.startsWith('test') && typeof suite[name] === 'function')
                .forEach(testName => {
                    this.tests[testName] = suite[testName].bind(suite);
                });
        });
    }
}

/**
 * Test utilities class
 */
class TestUtils {
    constructor() {
        this.messageIdCounter = 0;
    }

    /**
     * Reset the extension polling system
     */
    async resetSystem() {
        await browser.runtime.sendMessage({ type: 'RESET_UNIFIED_POLLING' });
        await this.delay(1000);
    }

    /**
     * Send a chat message to the extension
     */
    async sendMessage(text, options = {}) {
        const messageData = {
            text,
            images: options.images || [],
            username: options.username || `test_user_${++this.messageIdCounter}`,
            badges: options.badges || []
        };

        await browser.runtime.sendMessage({ 
            type: 'CHAT_MESSAGE_FOUND', 
            data: messageData
        });
        
        if (options.delay !== false) {
            await this.delay(options.delay || 50);
        }
    }

    /**
     * Send multiple messages
     */
    async sendMessages(messages, options = {}) {
        for (const message of messages) {
            if (typeof message === 'string') {
                await this.sendMessage(message, options);
            } else {
                await this.sendMessage(message.text, { ...options, ...message });
            }
        }
    }

    /**
     * Get extension state
     */
    async getState() {
        return await browser.runtime.sendMessage({ type: 'REQUEST_INITIAL_STATE' });
    }

    /**
     * End poll manually
     */
    async endPoll() {
        return await browser.runtime.sendMessage({ type: 'END_POLL_MANUALLY' });
    }

    /**
     * Wait for condition with timeout
     */
    async waitFor(condition, timeout = 10000, interval = 100) {
        const start = Date.now();
        
        while (Date.now() - start < timeout) {
            if (await condition()) {
                return true;
            }
            await this.delay(interval);
        }
        
        throw new Error(`Condition not met within ${timeout}ms`);
    }

    /**
     * Utility delay
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate test data
     */
    generateNumbers(count = 10, min = 1, max = 100) {
        return Array.from({ length: count }, () => 
            Math.floor(Math.random() * (max - min + 1)) + min
        ).map(String);
    }

    generateLetters(count = 10) {
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        return Array.from({ length: count }, () => 
            letters[Math.floor(Math.random() * letters.length)]
        );
    }

    generateSentiments(count = 20) {
        const sentiments = [
            'love this', 'so happy', 'feeling great', 'amazing', 'awesome',
            'fantastic', 'incredible', 'wonderful', 'brilliant', 'perfect',
            'excellent', 'outstanding', 'superb', 'magnificent', 'spectacular'
        ];
        
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(sentiments[i % sentiments.length]);
        }
        return result;
    }

    /**
     * Assert utilities
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message} - Expected: ${expected}, Actual: ${actual}`);
        }
    }

    assertTrue(value, message) {
        this.assert(value === true, message || 'Expected true');
    }

    assertFalse(value, message) {
        this.assert(value === false, message || 'Expected false');
    }
}

// Initialize framework when all dependencies are loaded
function initializeTestFramework() {
    if (typeof window.TestFramework === 'undefined') {
        window.TestFramework = new Plus2TestFramework();
        window.TestUtils = TestUtils;
        console.log('🎯 TestFramework initialized and ready!');
    }
}

// Try to initialize immediately if all classes are available
if (typeof PollingTestSuite !== 'undefined' && 
    typeof SentimentTestSuite !== 'undefined' && 
    typeof SettingsTestSuite !== 'undefined' && 
    typeof IntegrationTestSuite !== 'undefined' && 
    typeof PerformanceTestSuite !== 'undefined') {
    initializeTestFramework();
} else {
    // Wait for other files to load
    window.addEventListener('load', initializeTestFramework);
    // Also try after a short delay
    setTimeout(initializeTestFramework, 500);
}

// Make initialization function available for manual use
window.initializeTestFramework = initializeTestFramework;