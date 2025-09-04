/**
 * Settings Test Suite
 * 
 * Tests settings/options configuration, loading, and validation.
 */

class SettingsTestSuite {
    constructor(framework) {
        this.framework = framework;
        this.utils = framework.utils;
    }

    async run() {
        console.log('\n⚙️ Running Settings Tests');
        console.log('-'.repeat(40));

        const tests = [
            'testSettingsStructure',
            'testUnifiedPollingConfig',
            'testNumbersConfig',
            'testLettersConfig', 
            'testSentimentConfig',
            'testYesNoConfig',
            'testBehaviorConfig',
            'testDefaultValues',
            'testConfigValidation'
        ];

        for (const testName of tests) {
            await this.runTest(testName);
        }

        return this.framework.results.suites.settings;
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
        this.framework._addResult('settings', testName, passed, error, duration);
    }

    /**
     * Test overall settings structure
     */
    async testSettingsStructure() {
        const state = await this.utils.getState();
        
        this.utils.assertTrue(
            !!state.settings,
            'Settings should exist in state'
        );
        
        this.utils.assertTrue(
            !!state.settings.unifiedPolling,
            'unifiedPolling settings section should exist'
        );
        
        this.utils.assertTrue(
            typeof state.settings.unifiedPolling === 'object',
            'unifiedPolling should be an object'
        );
    }

    /**
     * Test unified polling configuration
     */
    async testUnifiedPollingConfig() {
        const state = await this.utils.getState();
        const config = state.settings.unifiedPolling;
        
        this.utils.assertTrue(
            !!config,
            'Unified polling config should exist'
        );
        
        // Test required sections exist
        const requiredSections = ['behavior', 'yesno', 'numbers', 'letters', 'sentiment'];
        
        for (const section of requiredSections) {
            this.utils.assertTrue(
                !!config[section],
                `${section} configuration should exist`
            );
            
            this.utils.assertTrue(
                typeof config[section] === 'object',
                `${section} configuration should be an object`
            );
        }
    }

    /**
     * Test numbers configuration
     */
    async testNumbersConfig() {
        const state = await this.utils.getState();
        const numbersConfig = state.settings.unifiedPolling.numbers;
        
        this.utils.assertTrue(
            !!numbersConfig,
            'Numbers config should exist'
        );
        
        // Test required properties
        this.utils.assertTrue(
            typeof numbersConfig.enabled === 'boolean',
            'Numbers enabled should be boolean'
        );
        
        this.utils.assertTrue(
            typeof numbersConfig.activationThreshold === 'number' && numbersConfig.activationThreshold > 0,
            'Numbers activation threshold should be positive number'
        );
        
        this.utils.assertTrue(
            typeof numbersConfig.priority === 'number' && numbersConfig.priority > 0,
            'Numbers priority should be positive number'
        );
        
        // Test new limit properties
        this.utils.assertTrue(
            typeof numbersConfig.maxDisplayItems === 'number' && numbersConfig.maxDisplayItems > 0,
            'Numbers maxDisplayItems should be positive number'
        );
        
        this.utils.assertTrue(
            typeof numbersConfig.maxBins === 'number' && numbersConfig.maxBins > 0,
            'Numbers maxBins should be positive number'
        );
        
        // Test reasonable defaults
        this.utils.assertTrue(
            numbersConfig.maxDisplayItems >= 5 && numbersConfig.maxDisplayItems <= 100,
            'maxDisplayItems should be reasonable (5-100)'
        );
        
        this.utils.assertTrue(
            numbersConfig.maxBins >= 3 && numbersConfig.maxBins <= 50,
            'maxBins should be reasonable (3-50)'
        );
    }

    /**
     * Test letters configuration
     */
    async testLettersConfig() {
        const state = await this.utils.getState();
        const lettersConfig = state.settings.unifiedPolling.letters;
        
        this.utils.assertTrue(
            !!lettersConfig,
            'Letters config should exist'
        );
        
        // Test required properties
        this.utils.assertTrue(
            typeof lettersConfig.enabled === 'boolean',
            'Letters enabled should be boolean'
        );
        
        this.utils.assertTrue(
            typeof lettersConfig.activationThreshold === 'number' && lettersConfig.activationThreshold > 0,
            'Letters activation threshold should be positive number'
        );
        
        this.utils.assertTrue(
            typeof lettersConfig.individualThreshold === 'number' && lettersConfig.individualThreshold > 0,
            'Letters individual threshold should be positive number'
        );
        
        this.utils.assertTrue(
            typeof lettersConfig.priority === 'number' && lettersConfig.priority > 0,
            'Letters priority should be positive number'
        );
        
        // Test new limit property
        this.utils.assertTrue(
            typeof lettersConfig.maxDisplayItems === 'number' && lettersConfig.maxDisplayItems > 0,
            'Letters maxDisplayItems should be positive number'
        );
        
        // Test reasonable defaults
        this.utils.assertTrue(
            lettersConfig.maxDisplayItems >= 5 && lettersConfig.maxDisplayItems <= 26,
            'maxDisplayItems should be reasonable for letters (5-26)'
        );
    }

    /**
     * Test sentiment configuration
     */
    async testSentimentConfig() {
        const state = await this.utils.getState();
        const sentimentConfig = state.settings.unifiedPolling.sentiment;
        
        this.utils.assertTrue(
            !!sentimentConfig,
            'Sentiment config should exist'
        );
        
        // Test required properties
        this.utils.assertTrue(
            typeof sentimentConfig.enabled === 'boolean',
            'Sentiment enabled should be boolean'
        );
        
        this.utils.assertTrue(
            typeof sentimentConfig.activationThreshold === 'number' && sentimentConfig.activationThreshold > 0,
            'Sentiment activation threshold should be positive number'
        );
        
        this.utils.assertTrue(
            typeof sentimentConfig.priority === 'number' && sentimentConfig.priority > 0,
            'Sentiment priority should be positive number'
        );
        
        this.utils.assertTrue(
            typeof sentimentConfig.maxDisplayItems === 'number' && sentimentConfig.maxDisplayItems > 0,
            'Sentiment maxDisplayItems should be positive number'
        );
        
        this.utils.assertTrue(
            typeof sentimentConfig.maxGrowthWidth === 'number' && sentimentConfig.maxGrowthWidth > 0,
            'Sentiment maxGrowthWidth should be positive number'
        );
        
        this.utils.assertTrue(
            typeof sentimentConfig.maxGaugeValue === 'number' && sentimentConfig.maxGaugeValue > 0,
            'Sentiment maxGaugeValue should be positive number'
        );
        
        // Test optional properties
        this.utils.assertTrue(
            typeof sentimentConfig.blockList === 'string',
            'Sentiment blockList should be string'
        );
        
        this.utils.assertTrue(
            typeof sentimentConfig.groups === 'string',
            'Sentiment groups should be string'
        );
    }

    /**
     * Test yes/no configuration
     */
    async testYesNoConfig() {
        const state = await this.utils.getState();
        const yesnoConfig = state.settings.unifiedPolling.yesno;
        
        this.utils.assertTrue(
            !!yesnoConfig,
            'Yes/No config should exist'
        );
        
        // Test required properties
        this.utils.assertTrue(
            typeof yesnoConfig.enabled === 'boolean',
            'YesNo enabled should be boolean'
        );
        
        this.utils.assertTrue(
            typeof yesnoConfig.activationThreshold === 'number' && yesnoConfig.activationThreshold > 0,
            'YesNo activation threshold should be positive number'
        );
        
        this.utils.assertTrue(
            typeof yesnoConfig.priority === 'number' && yesnoConfig.priority > 0,
            'YesNo priority should be positive number'
        );
        
        // Test styling configuration
        this.utils.assertTrue(
            !!yesnoConfig.styling,
            'YesNo styling config should exist'
        );
        
        this.utils.assertTrue(
            typeof yesnoConfig.styling.yesColor === 'string',
            'Yes color should be string'
        );
        
        this.utils.assertTrue(
            typeof yesnoConfig.styling.noColor === 'string',
            'No color should be string'
        );
        
        // Test color format (should be hex)
        const colorRegex = /^#[0-9a-fA-F]{6}$/;
        this.utils.assertTrue(
            colorRegex.test(yesnoConfig.styling.yesColor),
            'Yes color should be valid hex color'
        );
        
        this.utils.assertTrue(
            colorRegex.test(yesnoConfig.styling.noColor),
            'No color should be valid hex color'
        );
    }

    /**
     * Test behavior configuration
     */
    async testBehaviorConfig() {
        const state = await this.utils.getState();
        const behaviorConfig = state.settings.unifiedPolling.behavior;
        
        this.utils.assertTrue(
            !!behaviorConfig,
            'Behavior config should exist'
        );
        
        // Test timing properties
        const timingProperties = [
            'minActivePollDuration',
            'cooldownDuration', 
            'maxActivePollDuration',
            'lookbackWindow',
            'activityCheckInterval',
            'decayInterval'
        ];
        
        for (const prop of timingProperties) {
            this.utils.assertTrue(
                typeof behaviorConfig[prop] === 'number' && behaviorConfig[prop] > 0,
                `${prop} should be positive number`
            );
        }
        
        // Test buffer size
        this.utils.assertTrue(
            typeof behaviorConfig.messageBufferSize === 'number' && behaviorConfig.messageBufferSize > 0,
            'messageBufferSize should be positive number'
        );
        
        // Test reasonable ranges
        this.utils.assertTrue(
            behaviorConfig.minActivePollDuration <= behaviorConfig.maxActivePollDuration,
            'Min poll duration should not exceed max poll duration'
        );
        
        this.utils.assertTrue(
            behaviorConfig.messageBufferSize >= 10,
            'Message buffer should be at least 10'
        );
    }

    /**
     * Test default values are reasonable
     */
    async testDefaultValues() {
        const state = await this.utils.getState();
        const config = state.settings.unifiedPolling;
        
        // Test priority ordering
        const priorities = {
            yesno: config.yesno.priority,
            numbers: config.numbers.priority,
            letters: config.letters.priority,
            sentiment: config.sentiment.priority
        };
        
        this.utils.assertTrue(
            priorities.yesno < priorities.numbers,
            'YesNo should have higher priority (lower number) than numbers'
        );
        
        this.utils.assertTrue(
            priorities.numbers < priorities.letters,
            'Numbers should have higher priority than letters'
        );
        
        this.utils.assertTrue(
            priorities.letters < priorities.sentiment,
            'Letters should have higher priority than sentiment'
        );
        
        // Test threshold reasonableness
        this.utils.assertTrue(
            config.yesno.activationThreshold <= config.numbers.activationThreshold,
            'YesNo threshold should be lower than or equal to numbers'
        );
        
        this.utils.assertTrue(
            config.sentiment.activationThreshold >= config.numbers.activationThreshold,
            'Sentiment threshold should be higher than numbers'
        );
    }

    /**
     * Test configuration validation
     */
    async testConfigValidation() {
        const state = await this.utils.getState();
        const config = state.settings.unifiedPolling;
        
        // Test that all poll types have unique priorities
        const priorities = [
            config.yesno.priority,
            config.numbers.priority,
            config.letters.priority,
            config.sentiment.priority
        ];
        
        const uniquePriorities = new Set(priorities);
        this.utils.assertEqual(
            priorities.length,
            uniquePriorities.size,
            'All poll types should have unique priorities'
        );
        
        // Test that thresholds are within reasonable ranges
        const thresholds = [
            { name: 'yesno', value: config.yesno.activationThreshold },
            { name: 'numbers', value: config.numbers.activationThreshold },
            { name: 'letters', value: config.letters.activationThreshold },
            { name: 'sentiment', value: config.sentiment.activationThreshold }
        ];
        
        for (const threshold of thresholds) {
            this.utils.assertTrue(
                threshold.value >= 1 && threshold.value <= 100,
                `${threshold.name} threshold should be between 1-100`
            );
        }
        
        // Test that display limits are reasonable
        this.utils.assertTrue(
            config.numbers.maxDisplayItems <= 100,
            'Numbers max display items should be reasonable'
        );
        
        this.utils.assertTrue(
            config.letters.maxDisplayItems <= 26,
            'Letters max display items should not exceed alphabet size'
        );
        
        this.utils.assertTrue(
            config.sentiment.maxDisplayItems <= 50,
            'Sentiment max display items should be reasonable'
        );
    }
}