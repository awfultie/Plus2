# Unified Polling System Testing Guide

## Quick Start Testing

### 1. **Enable Unified Polling**
First, enable the unified system in your extension settings:
- Go to extension options 
- Set `polling.unified.enabled = true` (this should be the default)

### 2. **Run Tests in Browser Console**

#### Option A: Copy the test script
1. Open a Twitch or YouTube page
2. Open browser console (F12)
3. Copy and paste the contents of `/test-unified-polling.js`
4. Run `testUnifiedPolling.runAll()`

#### Option B: Manual testing via console commands
```javascript
// Test system status
browser.runtime.sendMessage({ type: 'GET_SETTINGS' }).then(r => console.log('Settings:', r.settings.polling));

// Run categorization test
browser.runtime.sendMessage({ type: 'TEST_UNIFIED_POLLING' });

// Reset system
browser.runtime.sendMessage({ type: 'RESET_UNIFIED_POLLING' });

// Send test chat messages
browser.runtime.sendMessage({ 
    type: 'CHAT_MESSAGE_FOUND', 
    data: { text: 'yes', images: [], username: 'test_user', badges: [] }
});
```

## Expected Test Results

### ✅ **System Status Test**
- Console should show unified polling is enabled
- Configuration should be loaded correctly
- No initialization errors

### ✅ **Message Categorization Test**  
Console output should show:
```
[Unified Poll] Testing message categorization:
  "yes" -> yesno:yes ✓
  "no" -> yesno:no ✓  
  "5" -> number:5 ✓
  "a" -> letter:a ✓
  "hello world" -> sentiment:hello world ✓
  "+2" -> sentiment:+2 ✓
  "lol" -> sentiment:lol ✓
```

### ✅ **Yes/No Poll Activation** 
- Should activate after 3+ yes/no messages
- Poll state should show `isActive: true, pollType: 'yesno'`
- Vote counts should be tracked correctly
- **NEW**: Display uses sentiment-style vertical gauges instead of horizontal bars
- **NEW**: Each option (Yes/No) gets its own expanding gauge with percentage labels

### ✅ **Highlight Gauge Integration**
- Messages with "+2", "lol", "lmao" should increment gauge
- Gauge count should increase with each match
- Should work alongside polling

### ✅ **Number Poll Activation** 
- Should activate after 7+ number messages
- Poll state should show `pollType: 'numbers'`
- Number counts should be tracked

## Debugging Console Messages

When testing, you should see these console messages:

### Initialization:
```
[Background] Attempting to initialize unified polling...
[Background] ✅ Unified Polling system initialized successfully
[Background] 🧪 Running quick categorization test...
[Unified Poll] Testing message categorization:...
```

### Message Processing:
```
[Background] Using UNIFIED polling system for message: yes
[Unified Poll] Processing message: "yes" -> Categories: yesno:yes
[Unified Poll] Checking activation - 1 categorized messages
```

### Poll Activation:
```
[Unified Poll] Activating yesno poll with 3 messages
[Background] Poll state: { isActive: true, pollType: 'yesno', ... }
```

## Common Issues & Solutions

### ❌ "UnifiedPolling module not loaded"
**Solution**: The script import failed. Check browser console for script loading errors.

### ❌ "Using LEGACY polling systems"  
**Solution**: Unified polling is disabled. Check `settings.polling.unified.enabled`.

### ❌ Polls not activating
**Solution**: 
- Check activation thresholds in settings
- Make sure messages are different (deduplication may block identical messages)
- Check console for categorization results

### ❌ Highlight gauge not working
**Solution**:
- Check `settings.polling.highlightGauge.enabled` 
- Verify `stringToCount` contains the test terms
- Check console for highlight gauge matches

## Test Scenarios

### Manual Chat Testing
1. Go to a live Twitch stream
2. Open browser console and enable unified polling
3. Type in chat: "yes", "no", "yes" (should activate yes/no poll)
4. Type "+2" several times (should increment gauge)
5. Type "1", "2", "3", "4", "5", "6", "7" (should activate number poll)

### Settings Testing
1. Change poll activation thresholds in settings
2. Disable/enable different poll types
3. Modify highlight gauge terms
4. Check that changes are reflected in behavior

## Success Criteria

- ✅ All 5 automated tests pass
- ✅ Manual chat messages trigger appropriate polls
- ✅ Gauge counts highlight terms correctly  
- ✅ Settings changes affect behavior immediately
- ✅ No console errors during normal operation
- ✅ Legacy and unified systems can coexist (when unified disabled)

## Next Steps After Testing

Once testing passes:
1. Implement unified display components
2. Migrate yes/no poll styling to unified system  
3. Add sentiment group integration
4. Remove legacy polling code
5. Update popout UI to handle unified poll types