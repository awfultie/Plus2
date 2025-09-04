/**
 * Centralized Settings Manager
 * Single source of truth for all extension configuration
 */

// Default settings loaded from JSON file
let DEFAULT_SETTINGS = null;

/**
 * Load default settings from JSON file
 * This is called once when the module is loaded
 */
async function loadDefaultSettings() {
    if (DEFAULT_SETTINGS) return DEFAULT_SETTINGS;
    
    try {
        const response = await fetch(browser.runtime.getURL('config/default-settings.json'));
        if (!response.ok) {
            throw new Error(`Failed to load default settings: ${response.status}`);
        }
        DEFAULT_SETTINGS = await response.json();
        console.log('[SettingsManager] Default settings loaded from JSON');
        return DEFAULT_SETTINGS;
    } catch (error) {
        console.error('[SettingsManager] Error loading default settings:', error);
        // Fallback to empty object if JSON loading fails
        DEFAULT_SETTINGS = {};
        return DEFAULT_SETTINGS;
    }
}

/**
 * Legacy migration mapping (no longer used - options page now saves directly to nested structure)
 * Kept for reference in case migration is needed for very old stored settings
 */
const LEGACY_MIGRATION_MAP = {
    // Core settings
    'stringToCount': 'core.stringToCount',
    'exactMatchCounting': 'core.exactMatchCounting', 
    'enableCounting': 'core.enableCounting',
    
    // Display settings
    'chromaKeyColor': 'display.chromaKeyColor',
    'popoutBaseFontSize': 'display.popoutBaseFontSize',
    'popoutDefaultWidth': 'display.popoutDefaultWidth',
    'popoutDefaultHeight': 'display.popoutDefaultHeight',
    'displayTime': 'display.displayTime',
    
    // Feature toggles
    'enableHighlightTracking': 'features.enableHighlightTracking',
    'appendMessages': 'features.appendMessages',
    'enableYesNoPolling': 'features.enableYesNoPolling',
    'enableLeaderboard': 'features.enableLeaderboard',
    'enableWebhookIntegration': 'features.enableWebhookIntegration',
    'enableYouTube': 'features.enableYouTube',
    'enableSevenTVCompatibility': 'features.enableSevenTVCompatibility',
    'enableModPostReplyHighlight': 'features.enableModPostReplyHighlight',
    'enableGenericPolling': 'features.enableGenericPolling',
    'enableReplyTooltip': 'features.enableReplyTooltip',
    'enableFrankerFaceZCompat': 'features.enableFrankerFaceZCompatibility',
    'enableChannelIdOverride': 'features.enableChannelIdOverride',
    'enableStreamview': 'integrations.streamview.enabled',
    'streamviewGenerateApiKey': 'integrations.streamview.generateApiKey',
    
    // Styling
    'messageBGColor': 'styling.messageBGColor',
    'paragraphTextColor': 'styling.paragraphTextColor',
    'enableUsernameColoring': 'styling.enableUsernameColoring',
    'usernameDefaultColor': 'styling.usernameDefaultColor',
    
    // Gauge styling
    'gaugeMaxValue': 'styling.gauge.gaugeMaxValue',
    'gaugeMinDisplayThreshold': 'styling.gauge.gaugeMinDisplayThreshold',
    'gaugeTrackColor': 'styling.gauge.gaugeTrackColor',
    'gaugeTrackAlpha': 'styling.gauge.gaugeTrackAlpha',
    'gaugeTrackBorderAlpha': 'styling.gauge.gaugeTrackBorderAlpha',
    'gaugeTrackBorderColor': 'styling.gauge.gaugeTrackBorderColor',
    'gaugeFillGradientStartColor': 'styling.gauge.gaugeFillGradientStartColor',
    'gaugeFillGradientEndColor': 'styling.gauge.gaugeFillGradientEndColor',
    'recentMaxIndicatorColor': 'styling.gauge.recentMaxIndicatorColor',
    
    // Peak labels (special handling needed)
    'peakLabelLow': 'styling.gauge.peakLabels.low.text',
    'peakLabelLowColor': 'styling.gauge.peakLabels.low.color',
    'peakLabelMid': 'styling.gauge.peakLabels.mid.text', 
    'peakLabelMidColor': 'styling.gauge.peakLabels.mid.color',
    'peakLabelHigh': 'styling.gauge.peakLabels.high.text',
    'peakLabelHighColor': 'styling.gauge.peakLabels.high.color',
    'peakLabelMax': 'styling.gauge.peakLabels.max.text',
    'peakLabelMaxColor': 'styling.gauge.peakLabels.max.color',
    
    'enablePeakLabelAnimation': 'styling.gauge.enablePeakLabelAnimation',
    'peakLabelAnimationDuration': 'styling.gauge.peakLabelAnimationDuration',
    'peakLabelAnimationIntensity': 'styling.gauge.peakLabelAnimationIntensity',
    
    // Behavior
    'decayInterval': 'behavior.decayInterval',
    'decayAmount': 'behavior.decayAmount',
    'recentMaxResetDelay': 'behavior.recentMaxResetDelay',
    'dockingBehavior': 'behavior.dockingBehavior',
    'autoOpenPopout': 'behavior.autoOpenPopout',
    'requiredUrlSubstring': 'behavior.requiredUrlSubstring',
    'inactivityTimeoutDuration': 'behavior.inactivityTimeoutDuration',
    'maxPrunedCacheSize': 'behavior.maxPrunedCacheSize',
    
    // Yes/No Polling settings  
    'pollActivationThreshold': 'polling.yesNo.displayThreshold', // Legacy name
    'pollClearTime': 'polling.yesNo.resultDisplayTime',
    'pollCooldownDuration': 'polling.yesNo.cooldownDuration',
    'pollActivityThreshold': 'polling.yesNo.activityThreshold',
    'pollActivityCheckInterval': 'polling.yesNo.activityCheckInterval',
    'pollDisplayThreshold': 'polling.yesNo.displayThreshold',
    
    // Generic polling
    'genericPollLookbackWindow': 'polling.generic.lookbackWindow',
    'genericPollMaxLetterLength': 'polling.generic.maxLetterLength',
    'genericPollEndThreshold': 'polling.generic.endThreshold',
    'genericPollLetterIndividualThreshold': 'polling.generic.letterIndividualThreshold',
    'genericPollLetterTotalThreshold': 'polling.generic.letterTotalThreshold',
    'genericPollNumberThreshold': 'polling.generic.numberThreshold',
    'genericPollResultDisplayTime': 'polling.generic.resultDisplayTime',
    'genericPollMinWidth': 'styling.polling.genericPollMinWidth',
    
    // Generic polling sentiment
    'genericPollSentimentDecayAmount': 'polling.generic.sentiment.decayAmount',
    'genericPollSentimentMaxDisplayItems': 'polling.generic.sentiment.maxDisplayItems',
    'genericPollSentimentDisplayThreshold': 'polling.generic.sentiment.displayThreshold',
    'genericPollSentimentMaxGrowthWidth': 'polling.generic.sentiment.maxGrowthWidth',
    'genericPollSentimentMaxGaugeValue': 'polling.generic.sentiment.maxGaugeValue',
    'genericPollSentimentBlockList': 'polling.generic.sentiment.blockList',
    'genericPollSentimentGroups': 'polling.generic.sentiment.groups',
    
    // Poll styling
    'yesPollBarColor': 'styling.polling.yesPollBarColor',
    'noPollBarColor': 'styling.polling.noPollBarColor',
    'pollTextColor': 'styling.polling.pollTextColor',
    
    // Leaderboard
    'leaderboardHighlightValue': 'leaderboard.highlightValue',
    'leaderboardHeaderText': 'styling.leaderboard.leaderboardHeaderText',
    'leaderboardBackgroundColor': 'styling.leaderboard.leaderboardBackgroundColor',
    'leaderboardBackgroundAlpha': 'styling.leaderboard.leaderboardBackgroundAlpha',
    'leaderboardTextColor': 'styling.leaderboard.leaderboardTextColor',
    
    // StreamView
    'enableStreamview': 'integrations.streamview.enabled',
    'streamviewBaseUrl': 'integrations.streamview.baseUrl',
    'streamviewSecretKey': 'integrations.streamview.secretKey',
    'currentStreamview': 'integrations.streamview.current',
    'browserSourceStyle': 'integrations.streamview.browserSourceStyle',
    'streamviewBatchInterval': 'integrations.streamview.batchInterval',
    'streamviewRetryAttempts': 'integrations.streamview.retryAttempts',
    'streamviewTimeout': 'integrations.streamview.timeout',
    'activeViewUrl': 'integrations.streamview.activeViewUrl',
    
    // Webhook Integration
    'activeWebhookUrl': 'integrations.webhook.activeWebhookUrl',
    
    // Additional Features
    'enable7TVCompat': 'features.enableSevenTVCompatibility',
    'enableFrankerFaceZCompat': 'features.enableFrankerFaceZCompatibility',
    'enableChannelIdOverride': 'features.enableChannelIdOverride',
    'enableReplyTooltip': 'features.enableReplyTooltip',
    
    // Display Options
    'dockedViewHeight': 'display.dockedViewHeight',
    'dockingBehavior_none': 'display.dockingBehavior',
    'dockingBehavior_twitch': 'display.dockingBehavior',
    'dockingBehavior_youtube': 'display.dockingBehavior',
    'channelIdOverride': 'display.channelIdOverride',
    'templateName': 'display.templateName',
    
    // Animation Values
    'peakLabelAnimationDurationValue': 'styling.gauge.peakLabelAnimationDuration',
    'peakLabelAnimationIntensityValue': 'styling.gauge.peakLabelAnimationIntensity',
    
    // Alpha Value Fields (form input versions of alpha settings)
    'gaugeTrackAlphaValue': 'styling.gauge.gaugeTrackAlpha',
    'gaugeTrackBorderAlphaValue': 'styling.gauge.gaugeTrackBorderAlpha',
    'leaderboardBackgroundAlphaValue': 'styling.leaderboard.leaderboardBackgroundAlpha',
    
    // UI Container Fields (no storage needed)
    'streamviewGenerateApiKey': null, // UI-only button
    'usernameColoringOptionsContainer': null, // UI-only container
    
    // Leaderboard Additional
    'leaderboardTimeWindowDays': 'leaderboard.timeWindowDays',
    
    // Raw CSS
    'rawCssEditor': 'styling.rawCssEditor',
    
    // Unified Polling Settings
    'unifiedPollingYesNoEnabled': 'polling.unifiedPolling.yesno.enabled',
    'unifiedPollingYesNoThreshold': 'polling.unifiedPolling.yesno.activationThreshold',
    'unifiedPollingYesColor': 'polling.unifiedPolling.yesno.styling.yesColor',
    'unifiedPollingNoColor': 'polling.unifiedPolling.yesno.styling.noColor',
    'unifiedPollingNumbersEnabled': 'polling.unifiedPolling.numbers.enabled',
    'unifiedPollingNumbersThreshold': 'polling.unifiedPolling.numbers.activationThreshold',
    'unifiedPollingNumbersMaxDisplay': 'polling.unifiedPolling.numbers.maxDisplayItems',
    'unifiedPollingNumbersMaxBins': 'polling.unifiedPolling.numbers.maxBins',
    'unifiedPollingLettersEnabled': 'polling.unifiedPolling.letters.enabled',
    'unifiedPollingLettersThreshold': 'polling.unifiedPolling.letters.activationThreshold',
    'unifiedPollingLettersIndividualThreshold': 'polling.unifiedPolling.letters.individualThreshold',
    'unifiedPollingLettersMaxDisplay': 'polling.unifiedPolling.letters.maxDisplayItems',
    'unifiedPollingSentimentMaxDisplayItems': 'polling.unifiedPolling.sentiment.maxDisplayItems',
    'unifiedPollingSentimentMaxGrowthWidth': 'polling.unifiedPolling.sentiment.maxGrowthWidth',
    
    // Additional Unified Polling Settings  
    'enableUnifiedPolling': 'polling.unified.enabled',
    'unifiedPollingLookbackWindow': 'polling.unified.lookbackWindow',
    'unifiedPollingResultDisplayTime': 'polling.unified.resultDisplayTime', 
    'unifiedPollingCooldownDuration': 'polling.unified.cooldownDuration',
    'unifiedPollingMinimumDuration': 'polling.unified.minimumPollDuration',
    'unifiedPollingActivityCheckInterval': 'polling.unified.activityCheckInterval',
    'unifiedPollingSentimentEnabled': 'polling.unifiedPolling.sentiment.enabled',
    'unifiedPollingSentimentThreshold': 'polling.unifiedPolling.sentiment.activationThreshold',
    'unifiedPollingSentimentMaxGaugeValue': 'polling.unifiedPolling.sentiment.maxGaugeValue',
    'unifiedPollingSentimentBlockList': 'polling.unifiedPolling.sentiment.blockList',
    'unifiedPollingSentimentGroups': 'polling.unifiedPolling.sentiment.groups',
    'unifiedPollingHighlightGaugeEnabled': 'polling.highlightGauge.enabled',
    'unifiedPollingHighlightGaugeStringToCount': 'polling.highlightGauge.stringToCount',
    'unifiedPollingHighlightGaugeExactMatch': 'polling.highlightGauge.exactMatch',
    'unifiedPollingHighlightGaugeSentimentIntegration': 'polling.highlightGauge.sentimentIntegration'
};

/**
 * Set a nested property using dot notation
 */
function setNestedProperty(obj, path, value) {
    if (path === null || path === undefined) {
        // Skip UI-only fields that don't need storage
        return;
    }
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
}

/**
 * Migrate flat settings to nested structure
 */
async function migrateFlatToNested(flatSettings) {
    console.log('[SettingsManager] Migrating flat settings to nested structure');
    const nested = {};
    
    // Convert flat settings using migration map
    for (const [flatKey, nestedPath] of Object.entries(MIGRATION_MAP)) {
        if (flatSettings.hasOwnProperty(flatKey)) {
            setNestedProperty(nested, nestedPath, flatSettings[flatKey]);
        }
    }
    
    // Handle special cases like webhookEvents which is already nested
    if (flatSettings.webhookEvents) {
        if (!nested.integrations) nested.integrations = {};
        if (!nested.integrations.webhook) nested.integrations.webhook = {};
        nested.integrations.webhook.events = flatSettings.webhookEvents;
    }
    
    // Handle other complex properties that don't fit the simple mapping
    if (flatSettings.webhookEndpoint !== undefined) {
        if (!nested.integrations) nested.integrations = {};
        if (!nested.integrations.webhook) nested.integrations.webhook = {};
        nested.integrations.webhook.endpoint = flatSettings.webhookEndpoint;
    }
    
    if (flatSettings.webhookApiKey !== undefined) {
        if (!nested.integrations) nested.integrations = {};
        if (!nested.integrations.webhook) nested.integrations.webhook = {};
        nested.integrations.webhook.apiKey = flatSettings.webhookApiKey;
    }
    
    console.log('[SettingsManager] Migration completed:', Object.keys(nested));
    return nested;
}

/**
 * Check if settings are in old flat format
 */
function isOldFlatFormat(settings) {
    // If we have nested structure keys, it's already migrated
    if (settings.display || settings.styling || settings.features) {
        return false;
    }
    
    // If we have old flat keys, it needs migration  
    return settings.hasOwnProperty('chromaKeyColor') || 
           settings.hasOwnProperty('enableCounting') ||
           settings.hasOwnProperty('gaugeMaxValue');
}

/**
 * Smart merge that prefers non-zero/non-empty values from defaults when stored values are problematic
 */
function smartMergeDefaults(defaults, stored) {
    const result = { ...defaults };
    
    function mergeRecursively(defaultObj, storedObj, currentResult) {
        for (const key in storedObj) {
            if (storedObj.hasOwnProperty(key)) {
                const storedValue = storedObj[key];
                const defaultValue = defaultObj[key];
                
                // Skip undefined stored values
                if (storedValue === undefined) {
                    continue;
                }
                
                // If both are objects (and not arrays), recursively merge
                if (storedValue && typeof storedValue === 'object' && !Array.isArray(storedValue) &&
                    defaultValue && typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
                    currentResult[key] = { ...defaultValue };
                    mergeRecursively(defaultValue, storedValue, currentResult[key]);
                } else {
                    // For primitive values, use stored value UNLESS it's problematic
                    // Problematic = stored is 0 or empty string but default is non-zero/non-empty
                    const isStoredProblematic = (
                        (typeof storedValue === 'number' && storedValue === 0 && typeof defaultValue === 'number' && defaultValue !== 0) ||
                        (typeof storedValue === 'string' && storedValue === '' && typeof defaultValue === 'string' && defaultValue !== '')
                    );
                    
                    if (isStoredProblematic) {
                        console.log(`[SettingsManager] Using default for problematic value: ${key} = ${storedValue} -> ${defaultValue}`);
                        currentResult[key] = defaultValue;
                    } else {
                        currentResult[key] = storedValue;
                    }
                }
            }
        }
    }
    
    mergeRecursively(defaults, stored, result);
    return result;
}

/**
 * Check if settings need repair due to missing default values
 * This handles the case where migration happened but didn't properly merge defaults
 */
function needsDefaultsRepair(stored) {
    // Check for known problematic zero values that should have defaults
    const problematicPaths = [
        'polling.generic.sentiment.displayThreshold',
        'polling.generic.sentiment.maxDisplayItems', 
        'polling.generic.sentiment.maxGaugeValue',
        'polling.generic.sentiment.maxGrowthWidth'
    ];
    
    for (const path of problematicPaths) {
        const keys = path.split('.');
        let current = stored;
        
        for (const key of keys) {
            if (!current || typeof current !== 'object' || current[key] === undefined) {
                return true; // Missing path needs repair
            }
            current = current[key];
        }
        
        // If the value exists but is 0 when default is non-zero, needs repair
        if (current === 0) {
            // Check what the default should be
            let defaultCurrent = DEFAULT_SETTINGS;
            for (const key of keys) {
                defaultCurrent = defaultCurrent[key];
            }
            if (defaultCurrent && defaultCurrent !== 0) {
                console.log(`[SettingsManager] Found problematic zero value at ${path}: ${current}, should be ${defaultCurrent}`);
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Get all current settings with defaults merged in
 */
async function getAllSettings() {
    await loadDefaultSettings();
    const stored = await browser.storage.sync.get();  // Get ALL stored settings
    
    console.log('[SettingsManager] Stored settings keys:', Object.keys(stored));
    console.log('[SettingsManager] Stored settings sample:', {
        chromaKeyColor: stored.chromaKeyColor,
        enableCounting: stored.enableCounting,
        display: stored.display,
        styling: stored.styling,
        features: stored.features
    });
    
    // Check if we need to migrate from flat to nested
    const needsMigration = isOldFlatFormat(stored);
    console.log('[SettingsManager] Needs migration:', needsMigration);
    
    if (needsMigration) {
        console.log('[SettingsManager] Detected old flat format, migrating...');
        const migrated = await migrateFlatToNested(stored);
        
        // Save migrated settings with proper smart merge of defaults
        const mergedSettings = smartMergeDefaults(DEFAULT_SETTINGS, migrated);
        await browser.storage.sync.clear();  // Clear old flat settings
        await browser.storage.sync.set(mergedSettings);
        
        console.log('[SettingsManager] Migration complete, saved nested settings');
        return mergedSettings;
    }
    
    // Check if we need to repair missing defaults from previous migration
    const needsRepair = needsDefaultsRepair(stored);
    console.log('[SettingsManager] Needs defaults repair:', needsRepair);
    
    if (needsRepair) {
        console.log('[SettingsManager] Repairing settings with missing defaults...');
        const repairedSettings = smartMergeDefaults(DEFAULT_SETTINGS, stored);
        await browser.storage.sync.set(repairedSettings);
        console.log('[SettingsManager] Repair complete, updated stored settings');
        return repairedSettings;
    }
    
    console.log('[SettingsManager] Using stored settings with nested structure (no migration needed)');
    // Options page now saves directly to nested structure - no migration needed
    // Use smart merge to ensure all default values are present
    return smartMergeDefaults(DEFAULT_SETTINGS, stored);
}

/**
 * Get a specific setting value with default fallback
 */
async function getSetting(key) {
    const settings = await getAllSettings();
    return settings[key];
}

/**
 * Set one or more settings
 */
async function setSettings(settingsToUpdate) {
    await loadDefaultSettings();
    
    // Validate that we're only setting known settings
    const unknownKeys = Object.keys(settingsToUpdate).filter(key => !(key in DEFAULT_SETTINGS));
    if (unknownKeys.length > 0) {
        console.warn('[SettingsManager] Unknown setting keys:', unknownKeys);
    }
    
    return await browser.storage.sync.set(settingsToUpdate);
}

/**
 * Reset all settings to defaults
 */
async function resetAllSettings() {
    await loadDefaultSettings();
    await browser.storage.sync.clear();
    return await browser.storage.sync.set(DEFAULT_SETTINGS);
}

/**
 * Get default value for a specific setting
 */
async function getDefaultValue(key) {
    await loadDefaultSettings();
    return DEFAULT_SETTINGS[key];
}

/**
 * Get all default settings
 */
async function getDefaultSettings() {
    await loadDefaultSettings();
    return { ...DEFAULT_SETTINGS };
}

/**
 * Validate settings object against defaults
 */
async function validateSettings(settings) {
    await loadDefaultSettings();
    const validated = {};
    
    for (const [key, value] of Object.entries(settings)) {
        if (key in DEFAULT_SETTINGS) {
            validated[key] = value;
        } else {
            console.warn(`[SettingsManager] Unknown setting ignored: ${key}`);
        }
    }
    
    return validated;
}

/**
 * Build nested configuration object for components
 * This replaces the buildNestedConfig function from background.js
 */
async function buildNestedConfig() {
    const settings = await getAllSettings();
    
    return {
        display: {
            chromaKeyColor: settings.chromaKeyColor,
            popoutBaseFontSize: settings.popoutBaseFontSize,
            popoutDefaultWidth: settings.popoutDefaultWidth,
            popoutDefaultHeight: settings.popoutDefaultHeight,
            displayTime: settings.displayTime
        },
        features: {
            enableCounting: settings.enableCounting,
            enableYesNoPolling: settings.enableYesNoPolling,
            enableLeaderboard: settings.enableLeaderboard,
            enableHighlightTracking: settings.enableHighlightTracking,
            appendMessages: settings.appendMessages
        },
        styling: {
            messageBGColor: settings.messageBGColor,
            paragraphTextColor: settings.paragraphTextColor,
            enableUsernameColoring: settings.enableUsernameColoring,
            usernameDefaultColor: settings.usernameDefaultColor,
            gauge: {
                gaugeMaxValue: settings.gaugeMaxValue,
                gaugeMinDisplayThreshold: settings.gaugeMinDisplayThreshold,
                gaugeTrackColor: settings.gaugeTrackColor,
                gaugeTrackAlpha: settings.gaugeTrackAlpha,
                gaugeTrackBorderColor: settings.gaugeTrackBorderColor,
                gaugeTrackBorderAlpha: settings.gaugeTrackBorderAlpha,
                gaugeFillGradientStartColor: settings.gaugeFillGradientStartColor,
                gaugeFillGradientEndColor: settings.gaugeFillGradientEndColor,
                recentMaxIndicatorColor: settings.recentMaxIndicatorColor,
                peakLabels: {
                    low: { text: settings.peakLabelLow, color: settings.peakLabelLowColor },
                    mid: { text: settings.peakLabelMid, color: settings.peakLabelMidColor },
                    high: { text: settings.peakLabelHigh, color: settings.peakLabelHighColor },
                    max: { text: settings.peakLabelMax, color: settings.peakLabelMaxColor }
                },
                enablePeakLabelAnimation: settings.enablePeakLabelAnimation,
                peakLabelAnimationDuration: settings.peakLabelAnimationDuration,
                peakLabelAnimationIntensity: settings.peakLabelAnimationIntensity
            },
            polling: {
                yesPollBarColor: settings.yesPollBarColor,
                noPollBarColor: settings.noPollBarColor,
                pollTextColor: settings.pollTextColor,
                genericPollMinWidth: settings.genericPollMinWidth
            },
            leaderboard: {
                leaderboardHeaderText: settings.leaderboardHeaderText,
                leaderboardBackgroundColor: settings.leaderboardBackgroundColor,
                leaderboardBackgroundAlpha: settings.leaderboardBackgroundAlpha,
                leaderboardTextColor: settings.leaderboardTextColor
            }
        },
        // Add sentiment polling settings at root level for backward compatibility
        genericPollSentimentMaxGaugeValue: settings.genericPollSentimentMaxGaugeValue,
        genericPollSentimentMaxGrowthWidth: settings.genericPollSentimentMaxGrowthWidth,
        genericPollSentimentDecayAmount: settings.genericPollSentimentDecayAmount,
        genericPollSentimentMaxDisplayItems: settings.genericPollSentimentMaxDisplayItems,
        genericPollSentimentDisplayThreshold: settings.genericPollSentimentDisplayThreshold,
        genericPollSentimentBlockList: settings.genericPollSentimentBlockList,
        genericPollSentimentGroups: settings.genericPollSentimentGroups
    };
}

// Make the API available globally
if (typeof window !== 'undefined') {
    window.SettingsManager = {
        getAllSettings,
        getSetting,
        setSettings,
        resetAllSettings,
        getDefaultValue,
        getDefaultSettings,
        validateSettings,
        buildNestedConfig
    };
}

// Make SettingsManager available globally for service worker
if (typeof globalThis !== 'undefined') {
    globalThis.SettingsManager = {
        getAllSettings,
        getSetting,
        setSettings,
        resetAllSettings,
        getDefaultValue,
        getDefaultSettings,
        validateSettings,
        buildNestedConfig
    };
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAllSettings,
        getSetting,
        setSettings,
        resetAllSettings,
        getDefaultValue,
        getDefaultSettings,
        validateSettings,
        buildNestedConfig
    };
}