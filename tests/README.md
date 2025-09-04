# Plus2 Extension Testing Framework

A comprehensive testing infrastructure for the Plus2 browser extension, providing automated testing for polling systems, sentiment tracking, settings, integration, and performance.

## Quick Start

### Option 1: Quick Test (Recommended)
For immediate validation, copy and paste the contents of `quick-test.js` into browser console:

1. **Load the extension** on Twitch or YouTube  
2. **Open browser console** (F12 → Console)
3. **Copy and paste** the entire contents of `quick-test.js`
4. **Results appear automatically** - 8 essential tests in ~30 seconds

### Option 2: Full Test Framework
For comprehensive testing with all 42 tests:

1. **Load the extension** on Twitch or YouTube
2. **Open browser console** (F12 → Console)  
3. **Copy and paste** the entire contents of `load-tests.js`
4. **Wait for loading** to complete, then run:
   ```javascript
   // Run all tests (42 tests, ~2-3 minutes)
   TestFramework.runAllTests();
   
   // Run specific suite
   TestFramework.runSuite('polling');
   
   // Run individual test  
   TestFramework.tests.testYesNoPoll();
   ```

### Option 3: Manual File Loading
If you have the test files accessible via HTTP:
   ```javascript
   // Load from local server/file system
   const script = document.createElement('script');
   script.src = '/path/to/tests/runner.js'; 
   document.head.appendChild(script);
   ```

## Test Suites

### 📊 Polling Tests (`polling`)
Tests core polling functionality for all poll types:
- **Yes/No Polls**: Activation, vote counting, display
- **Number Polls**: Threshold activation, outlier handling, binning
- **Letter Polls**: Individual thresholds, display limits
- **Poll Lifecycle**: Activation → Active → Concluded → Cooldown
- **Poll Priority**: Correct priority ordering (yesno > numbers > letters)
- **Poll Limits**: Configurable display limits and binning

```javascript
TestFramework.runSuite('polling');
TestFramework.tests.testYesNoPoll();
TestFramework.tests.testNumberPollWithOutliers();
```

### 💭 Sentiment Tests (`sentiment`)
Tests sentiment tracking and display:
- **Configuration**: Settings loading and validation
- **Processing**: Message categorization and counting
- **Thresholds**: Display activation at configured limits
- **Display**: Gauge rendering and state management
- **Decay**: Sentiment decay over time
- **Integration**: Works alongside other poll types

```javascript
TestFramework.runSuite('sentiment');
TestFramework.tests.testSentimentThreshold();
TestFramework.tests.testSentimentDisplay();
```

### ⚙️ Settings Tests (`settings`)
Tests configuration and options system:
- **Structure**: Settings hierarchy and organization
- **Validation**: Type checking and range validation
- **Defaults**: Reasonable default values
- **Limits**: New configurable limits (maxDisplayItems, maxBins)
- **Integration**: Settings affect polling behavior

```javascript
TestFramework.runSuite('settings');
TestFramework.tests.testNumbersConfig();
TestFramework.tests.testConfigValidation();
```

### 🔗 Integration Tests (`integration`)
Tests system integration and end-to-end functionality:
- **Polling ↔ Popout**: State synchronization
- **Settings → Behavior**: Configuration effects
- **Multi-type Processing**: Priority handling
- **Message Pipeline**: End-to-end message flow
- **Error Recovery**: Graceful error handling

```javascript
TestFramework.runSuite('integration');
TestFramework.tests.testPollingToPopoutIntegration();
TestFramework.tests.testMultiplePollTypesIntegration();
```

### ⚡ Performance Tests (`performance`)
Tests performance characteristics and limits:
- **Processing Speed**: Message handling performance
- **High Volume**: Stress testing with many messages
- **Memory Usage**: State size and cleanup
- **Concurrent Operations**: Batch message processing
- **System Limits**: Buffer overflow handling

```javascript
TestFramework.runSuite('performance');
TestFramework.tests.testHighVolumeMessages();
TestFramework.tests.testSystemLimits();
```

## Test Results

The framework provides detailed results with timing, pass/fail status, and error details:

```
📊 FINAL TEST RESULTS
====================================
⏱️  Total Duration: 45231ms
📈 Total Tests: 42
✅ Passed: 38
❌ Failed: 4
📊 Pass Rate: 90%

📋 Suite Results:
  polling: 9/9 (100%)
  sentiment: 7/8 (88%)
  settings: 9/9 (100%)
  integration: 7/8 (88%)
  performance: 6/8 (75%)

⚠️  4 TESTS FAILED
```

## Test Utilities

The framework provides comprehensive utilities for test development:

### Message Sending
```javascript
// Send single message
await TestUtils.sendMessage('test message');

// Send with options
await TestUtils.sendMessage('yes', {
  username: 'testuser',
  delay: 100
});

// Send multiple messages
await TestUtils.sendMessages(['yes', 'no', 'maybe']);

// Generate test data
const numbers = TestUtils.generateNumbers(10, 1, 100);
const sentiments = TestUtils.generateSentiments(20);
```

### System Control
```javascript
// Reset polling system
await TestUtils.resetSystem();

// Get current state
const state = await TestUtils.getState();

// End active poll
await TestUtils.endPoll();

// Wait for conditions
await TestUtils.waitFor(async () => {
  const state = await TestUtils.getState();
  return state.unifiedPoll?.isActive;
}, 5000); // 5 second timeout
```

### Assertions
```javascript
// Basic assertions
TestUtils.assert(condition, 'Error message');
TestUtils.assertEqual(actual, expected, 'Values should match');
TestUtils.assertTrue(value, 'Should be true');
TestUtils.assertFalse(value, 'Should be false');
```

## Writing New Tests

### Adding Tests to Existing Suites

Add new test methods to existing suite classes:

```javascript
// In polling-tests.js
class PollingTestSuite {
  async testNewFeature() {
    await this.utils.resetSystem();
    
    // Your test logic here
    await this.utils.sendMessages(['test', 'data']);
    
    const state = await this.utils.getState();
    this.utils.assertTrue(
      state.someCondition,
      'Feature should work correctly'
    );
  }
}
```

### Creating New Test Suites

1. Create new suite file in `tests/suites/`:
```javascript
class MyTestSuite {
  constructor(framework) {
    this.framework = framework;
    this.utils = framework.utils;
  }

  async run() {
    console.log('\n🧪 Running My Tests');
    const tests = ['testFeatureA', 'testFeatureB'];
    
    for (const testName of tests) {
      await this.runTest(testName);
    }
    
    return this.framework.results.suites.my;
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
    this.framework._addResult('my', testName, passed, error, duration);
  }

  async testFeatureA() {
    // Test implementation
  }
}
```

2. Add to framework initialization:
```javascript
// In test-framework.js _initializeTests()
this.suites.my = new MyTestSuite(this);
```

3. Add to runner.js:
```javascript
const filesToLoad = [
  'suites/my-tests.js', // Add your new suite
  // ... other files
];
```

## Configuration

### Test Framework Configuration
```javascript
TestFramework.config = {
  defaultTimeout: 30000,  // Test timeout in ms
  messageDelay: 50,       // Delay between messages
  suiteDelay: 2000,       // Delay between test suites
  resetDelay: 1000,       // Delay after system reset
  verbose: true           // Detailed logging
};
```

### Environment Requirements
- Must be on Twitch or YouTube
- Plus2 extension must be installed and active
- Browser console access required
- Test files must be accessible via HTTP

## Troubleshooting

### Common Issues

**"Extension not responding"**
- Reload the page and ensure Plus2 is active
- Check extension is enabled in browser settings
- Verify you're on a supported site (Twitch/YouTube)

**"Test files not loading"**
- Ensure test files are accessible via HTTP
- Check browser console for 404 errors
- Verify file paths in runner.js

**"Tests failing unexpectedly"**
- Reset system between tests: `await TestUtils.resetSystem()`
- Check extension console logs for errors
- Verify test assumptions match current extension behavior

**"Performance tests timing out"**
- Increase timeout values for slower systems
- Run performance tests individually
- Check for browser throttling or background processes

### Debug Mode

Enable verbose logging for detailed test execution:
```javascript
TestFramework.config.verbose = true;
TestFramework.runSuite('polling');
```

## Contributing

When adding new tests:
1. Follow existing naming conventions (`testFeatureName`)
2. Include proper error handling and assertions
3. Reset system state before each test
4. Add appropriate timeouts and delays
5. Update this README with new test descriptions

## Legacy Test Cleanup

This framework consolidates and replaces these individual test files:
- `test-unified-polling.js` → Polling test suite
- `test-number-poll.js` → Specific polling tests
- `test-sentiment-and-limits.js` → Sentiment + settings tests
- `debug-sentiment.js` → Sentiment debugging features
- `test-options-and-sentiment.js` → Settings validation

The new framework provides all functionality from these scripts in an organized, maintainable structure with comprehensive reporting.