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
    // Legacy core settings removed - functionality deprecated
    
    // Display settings
    'chromaKeyColor': 'display.chromaKeyColor',
    'popoutBaseFontSize': 'display.popoutBaseFontSize',
    'popoutDefaultWidth': 'display.popoutDefaultWidth',
    'popoutDefaultHeight': 'display.popoutDefaultHeight',
    'displayTime': 'display.displayTime',
    
    // Feature toggles
    'enableHighlightTracking': 'features.enableHighlightTracking',
    'appendMessages': 'features.appendMessages',
    'enableLeaderboard': 'features.enableLeaderboard',
    'enableWebhookIntegration': 'features.enableWebhookIntegration',
    'enableYouTube': 'features.enableYouTube',
    'enableSevenTVCompatibility': 'features.enableSevenTVCompatibility',
    'enableModPostReplyHighlight': 'features.enableModPostReplyHighlight',
    'enableReplyTooltip': 'features.enableReplyTooltip',
    'enableFrankerFaceZCompat': 'features.enableFrankerFaceZCompatibility',
    
    // Legacy core settings - migrate to unified polling
    'enableCounting': 'polling.unifiedPolling.sentiment.enabled', // Migrate to unified sentiment
    'stringToCount': 'polling.unifiedPolling.sentiment.groups', // Migrate to sentiment groups (special handling needed)
    'exactMatchCounting': 'behavior.exactMatchCounting',
    'enableYesNoPolling': 'polling.unifiedPolling.yesno.enabled',
    
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
    
    // Legacy generic polling settings removed - functionality replaced by unified polling
    
    // Poll styling
    'yesPollBarColor': 'styling.polling.yesPollBarColor',
    'noPollBarColor': 'styling.polling.noPollBarColor',
    'pollTextColor': 'styling.polling.pollTextColor',
    
    // Leaderboard
    'leaderboardHighlightValue': 'leaderboard.highlightValue',
    'leaderboardTimeWindowDays': 'leaderboard.timeWindowDays',
    'leaderboardHeaderText': 'styling.leaderboard.leaderboardHeaderText',
    'leaderboardBackgroundColor': 'styling.leaderboard.leaderboardBackgroundColor',
    'leaderboardBackgroundAlpha': 'styling.leaderboard.leaderboardBackgroundAlpha',
    'leaderboardTextColor': 'styling.leaderboard.leaderboardTextColor',
    
    
    // Webhook Integration
    'activeWebhookUrl': 'integrations.streamview.current.webhookUrl',
    'activeViewUrl': 'integrations.streamview.current.viewUrl',
    
    // Additional Features
    'enable7TVCompat': 'features.enableSevenTVCompatibility',
    'enableFrankerFaceZCompat': 'features.enableFrankerFaceZCompatibility',
    'enableReplyTooltip': 'features.enableReplyTooltip',
    
    // Display Options
    'dockedViewHeight': 'display.dockedViewHeight',
    'dockingBehavior': 'display.dockingBehavior',
    'dockingBehavior_none': 'display.dockingBehavior',
    'dockingBehavior_twitch': 'display.dockingBehavior',
    'dockingBehavior_youtube': 'display.dockingBehavior',
    'templateName': 'display.templateName',
    'messageWidthCap': 'display.messageWidthCap',
    
    // Animation Values
    'peakLabelAnimationDurationValue': 'styling.gauge.peakLabelAnimationDuration',
    'peakLabelAnimationIntensityValue': 'styling.gauge.peakLabelAnimationIntensity',
    
    // Alpha Value Fields (form input versions of alpha settings)
    'gaugeTrackAlphaValue': 'styling.gauge.gaugeTrackAlpha',
    'gaugeTrackBorderAlphaValue': 'styling.gauge.gaugeTrackBorderAlpha',
    'leaderboardBackgroundAlphaValue': 'styling.leaderboard.leaderboardBackgroundAlpha',
    
    // UI Container Fields (no storage needed)
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
    'unifiedPollingSentimentAutoFitWidth': 'polling.unifiedPolling.sentiment.autoFitWidth',
    
    // Additional Unified Polling Settings  
    'enableUnifiedPolling': 'polling.unified.enabled',
    'unifiedPollingLookbackWindow': 'polling.unified.lookbackWindow',
    'unifiedPollingResultDisplayTime': 'polling.unified.resultDisplayTime', 
    'unifiedPollingCooldownDuration': 'polling.unified.cooldownDuration',
    'unifiedPollingMinimumDuration': 'polling.unified.minimumPollDuration',
    'unifiedPollingActivityCheckInterval': 'polling.unified.activityCheckInterval',
    'unifiedPollingMaxActiveDuration': 'polling.unifiedPolling.behavior.maxActivePollDuration',
    'unifiedPollingSentimentEnabled': 'polling.unifiedPolling.sentiment.enabled',
    'unifiedPollingSentimentThreshold': 'polling.unifiedPolling.sentiment.activationThreshold',
    'unifiedPollingSentimentMaxGaugeValue': 'polling.unifiedPolling.sentiment.maxGaugeValue',
    'unifiedPollingSentimentBlockList': 'polling.unifiedPolling.sentiment.blockList',
    'unifiedPollingSentimentGroups': 'polling.unifiedPolling.sentiment.groups',
};

/**
 * Get a nested property using dot notation
 */
function getNestedProperty(obj, path) {
    if (!path || !obj) return undefined;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return undefined;
        }
    }

    return current;
}

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
    const nested = {};
    
    // Convert flat settings using migration map
    for (const [flatKey, nestedPath] of Object.entries(LEGACY_MIGRATION_MAP)) {
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
    
    // Special handling for stringToCount -> sentiment groups conversion
    if (flatSettings.stringToCount) {
        if (!nested.polling) nested.polling = {};
        if (!nested.polling.unifiedPolling) nested.polling.unifiedPolling = {};
        if (!nested.polling.unifiedPolling.sentiment) nested.polling.unifiedPolling.sentiment = {};
        
        // Convert comma-separated string to sentiment groups array
        const terms = flatSettings.stringToCount.split(',').map(term => term.trim()).filter(term => term.length > 0);
        const sentimentGroups = terms.map(term => ({
            name: term,
            terms: [term],
            color: '#2196F3' // Default color
        }));
        nested.polling.unifiedPolling.sentiment.groups = JSON.stringify(sentimentGroups);
    }
    
    // Handle browserSourceStyle if present (already nested structure)
    if (flatSettings.browserSourceStyle) {
        if (!nested.integrations) nested.integrations = {};
        if (!nested.integrations.streamview) nested.integrations.streamview = {};
        nested.integrations.streamview.browserSourceStyle = flatSettings.browserSourceStyle;
    }
    
    // Handle currentStreamview if present (already nested structure)  
    if (flatSettings.currentStreamview) {
        if (!nested.integrations) nested.integrations = {};
        if (!nested.integrations.streamview) nested.integrations.streamview = {};
        nested.integrations.streamview.current = flatSettings.currentStreamview;
    }
    
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
           settings.hasOwnProperty('gaugeMaxValue');
}

/**
 * Smart merge that prefers non-zero/non-empty values from defaults when stored values are problematic
 */
function smartMergeDefaults(defaults, stored) {
    const result = { ...defaults };
    
    function mergeRecursively(defaultObj, storedObj, currentResult) {
        // Process ALL keys from both default and stored objects
        const allKeys = new Set([...Object.keys(defaultObj), ...Object.keys(storedObj)]);
        
        for (const key of allKeys) {
            const storedValue = storedObj[key];
            const defaultValue = defaultObj[key];
            
            // If key exists in stored, use stored value (with problematic value check)
            if (storedObj.hasOwnProperty(key)) {
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
                        currentResult[key] = defaultValue;
                    } else {
                        // 🔥 CRITICAL FIX: Always preserve user values, including secret keys!
                        currentResult[key] = storedValue;
                    }
                }
            }
            // If key only exists in defaults but not stored, keep the default value (already set above)
            // This handles new settings that weren't in user's old configuration
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
        'polling.unifiedPolling.sentiment.activationThreshold',
        'polling.unifiedPolling.sentiment.maxDisplayItems', 
        'polling.unifiedPolling.sentiment.maxGaugeValue',
        'polling.unifiedPolling.sentiment.maxGrowthWidth'
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
    let stored = await browser.storage.sync.get();  // Get ALL stored settings
    
    
    // Check if we need to migrate from flat to nested
    const needsMigration = isOldFlatFormat(stored);
    
    if (needsMigration) {
        const migrated = await migrateFlatToNested(stored);
        
        // Save migrated settings with proper smart merge of defaults
        const mergedSettings = smartMergeDefaults(DEFAULT_SETTINGS, migrated);
        await browser.storage.sync.clear();  // Clear old flat settings
        await browser.storage.sync.set(mergedSettings);
        
        return mergedSettings;
    }
    
    // Check if we need to repair missing defaults from previous migration
    const needsRepair = needsDefaultsRepair(stored);
    
    if (needsRepair) {
        const repairedSettings = smartMergeDefaults(DEFAULT_SETTINGS, stored);
        
        // Apply specific mappings for standalone keys like currentStreamview
        if (stored.currentStreamview !== undefined) {
            setNestedProperty(repairedSettings, 'integrations.streamview.current', stored.currentStreamview);
        }
        
        
        // Clean up legacy keys after repair to prevent repeated processing
        const cleanedRepaired = await cleanupLegacySettings(repairedSettings);
        await browser.storage.sync.set(cleanedRepaired);
        return cleanedRepaired;
    }
    
    // Clean up any legacy settings that might still exist
    const cleanedSettings = await cleanupLegacySettings(stored);
    if (Object.keys(cleanedSettings).length !== Object.keys(stored).length) {
        await browser.storage.sync.set(cleanedSettings);
        stored = cleanedSettings;
    }
    
    
    // Check for one-time upgrade needs
    const upgradeNeeded = await checkForUpgrades(stored);
    if (upgradeNeeded) {
        stored = await performUpgrades(stored);
        await browser.storage.sync.set(stored);
    }

    // Use smart merge to combine defaults with stored settings
    let finalSettings = smartMergeDefaults(DEFAULT_SETTINGS, stored);


    return finalSettings;
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
 * Update a specific nested setting without affecting other values
 * @param {string} path - Dot notation path (e.g., 'integrations.streamview.current')
 * @param {*} value - The value to set
 */
async function updateNestedSetting(path, value) {
    await loadDefaultSettings();
    
    const currentSettings = await getAllSettings();
    
    // Create a deep clone to avoid mutations
    const updatedSettings = JSON.parse(JSON.stringify(currentSettings));
    
    // Set the nested value using existing helper
    setNestedProperty(updatedSettings, path, value);
    
    console.log(`[SettingsManager] Updating nested setting: ${path}`, value);
    
    await browser.storage.sync.set(updatedSettings);
    console.log('[SettingsManager] Nested setting updated without overwriting other values');
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
 * Check if settings need one-time upgrades
 * @param {Object} storedSettings - Current stored settings
 * @returns {boolean} - True if upgrades are needed
 */
async function checkForUpgrades(storedSettings) {
    // Check if sentiment upgrade has already been applied
    const sentimentUpgradeApplied = storedSettings.upgradeFlags?.sentimentConfigUpgrade;

    // If upgrade hasn't been applied yet, we need to upgrade
    return !sentimentUpgradeApplied;
}

/**
 * Perform one-time upgrades to settings
 * @param {Object} storedSettings - Current stored settings
 * @returns {Object} - Updated settings with upgrades applied
 */
async function performUpgrades(storedSettings) {
    console.log('[SettingsManager] Performing one-time upgrades...');

    const upgradedSettings = JSON.parse(JSON.stringify(storedSettings));

    // Initialize upgrade flags if they don't exist
    if (!upgradedSettings.upgradeFlags) {
        upgradedSettings.upgradeFlags = {};
    }

    // Sentiment Configuration Upgrade
    if (!upgradedSettings.upgradeFlags.sentimentConfigUpgrade) {
        console.log('[SettingsManager] Applying sentiment configuration upgrade...');

        // Set new sentiment configuration with specified values
        const sentimentConfig = {
            "enabled": true,
            "activationThreshold": 15,
            "priority": 4,
            "maxDisplayItems": 2,
            "maxGrowthWidth": 500,
            "autoFitWidth": true,
            "maxGaugeValue": 50,
            "labelHeight": 20,
            "baseColor": "#8956fb",
            "blockList": "",
            "allowListMode": false,
            "groups": "[{\"label\":\"+2\",\"words\":[\"+2\"],\"partialMatch\":false,\"color\":\"#f41f1f\"},{\"label\":\"I WAS HERE!\",\"words\":[\"I WAS HERE!\",\"I WAS HERE\",\"i was here\",\"i was here!\"],\"partialMatch\":false,\"color\":\"#f4d11f\"},{\"label\":\"-2\",\"words\":[\"-2\"],\"partialMatch\":false,\"color\":\"#535455\"}]",
            "minimumDisplayTime": 1000,
            "decayInterval": 1100,
            "decayAmount": 1,
            "escalatedDecayEnabled": true,
            "escalatedDecayThresholdTime": 4000,
            "escalatedDecayMultiplier": 5,
            "escalatedDecayMaxMultiplier": 50,
            "anchorPoint": "bottom"
        };

        // Apply the configuration to the nested structure
        if (!upgradedSettings.polling) upgradedSettings.polling = {};
        if (!upgradedSettings.polling.unifiedPolling) upgradedSettings.polling.unifiedPolling = {};
        upgradedSettings.polling.unifiedPolling.sentiment = sentimentConfig;

        // Mark upgrade as completed
        upgradedSettings.upgradeFlags.sentimentConfigUpgrade = true;

        console.log('[SettingsManager] Sentiment configuration upgrade completed');
    }

    return upgradedSettings;
}

/**
 * Clean up legacy and duplicate settings from stored data
 */
async function cleanupLegacySettings(storedSettings) {
    console.log('[SettingsManager] Cleaning up legacy and duplicate settings...');
    const cleaned = { ...storedSettings };
    
    // Legacy keys to remove
    const legacyKeys = [
        'core',                    // Entire core section removed
        'currentStreamview',       // Duplicate of integrations.streamview.current
        'unifiedPolling',         // Flat structure, use polling.unifiedPolling
        'genericPollSentimentGroups' // Legacy flat key
    ];
    
    legacyKeys.forEach(key => {
        if (key in cleaned) {
            console.log(`[SettingsManager] Removed legacy key: ${key}`);
            delete cleaned[key];
        }
    });
    
    return cleaned;
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
                // Legacy genericPollMinWidth removed - unified polling handles styling
            },
            leaderboard: {
                leaderboardHeaderText: settings.leaderboardHeaderText,
                leaderboardBackgroundColor: settings.leaderboardBackgroundColor,
                leaderboardBackgroundAlpha: settings.leaderboardBackgroundAlpha,
                leaderboardTextColor: settings.leaderboardTextColor
            }
        },
        // Add sentiment polling settings at root level for backward compatibility
        // Legacy generic poll sentiment settings removed - unified polling handles sentiment
    };
}

/**
 * Comprehensive form element to settings path mapping
 * Single source of truth for all UI form elements
 */
const FORM_ELEMENT_PATHS = {
    // Legacy core settings removed - functionality replaced by unified polling
    
    // Display
    'chromaKeyColor': 'display.chromaKeyColor',
    'popoutBaseFontSize': 'display.popoutBaseFontSize',
    'popoutDefaultWidth': 'display.popoutDefaultWidth',
    'popoutDefaultHeight': 'display.popoutDefaultHeight',
    'dockedViewHeight': 'display.dockedViewHeight',
    'dockingBehavior': 'display.dockingBehavior',
    'templateName': 'display.templateName',
    'messageWidthCap': 'display.messageWidthCap',
    'displayTime': 'display.displayTime',
    
    // Features
    'enableHighlightTracking': 'features.enableHighlightTracking',
    'appendMessages': 'features.appendMessages',
    'enableLeaderboard': 'features.enableLeaderboard',
    'enableWebhookIntegration': 'features.enableWebhookIntegration',
    'enableYouTube': 'features.enableYouTube',
    'enableSevenTVCompatibility': 'features.enableSevenTVCompatibility',
    'enable7TVCompat': 'features.enableSevenTVCompatibility', // Legacy key name
    'enableFrankerFaceZCompatibility': 'features.enableFrankerFaceZCompatibility',
    'enableFrankerFaceZCompat': 'features.enableFrankerFaceZCompatibility', // Legacy key name
    'enableModPostReplyHighlight': 'features.enableModPostReplyHighlight',
    'modPostApprovedUsers': 'features.modPostApprovedUsers',
    'enableReplyTooltip': 'features.enableReplyTooltip',
    
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
    'enablePeakLabelAnimation': 'styling.gauge.enablePeakLabelAnimation',
    'peakLabelAnimationDuration': 'styling.gauge.peakLabelAnimationDuration',
    'peakLabelAnimationIntensity': 'styling.gauge.peakLabelAnimationIntensity',
    
    // Peak labels
    'peakLabelLowText': 'styling.gauge.peakLabels.low.text',
    'peakLabelLow': 'styling.gauge.peakLabels.low.text', // Legacy key name
    'peakLabelLowColor': 'styling.gauge.peakLabels.low.color',
    'peakLabelMidText': 'styling.gauge.peakLabels.mid.text',
    'peakLabelMid': 'styling.gauge.peakLabels.mid.text', // Legacy key name
    'peakLabelMidColor': 'styling.gauge.peakLabels.mid.color',
    'peakLabelHighText': 'styling.gauge.peakLabels.high.text',
    'peakLabelHigh': 'styling.gauge.peakLabels.high.text', // Legacy key name
    'peakLabelHighColor': 'styling.gauge.peakLabels.high.color',
    'peakLabelMaxText': 'styling.gauge.peakLabels.max.text',
    'peakLabelMax': 'styling.gauge.peakLabels.max.text', // Legacy key name
    'peakLabelMaxColor': 'styling.gauge.peakLabels.max.color',
    
    // Polling styling
    'yesPollBarColor': 'styling.polling.yesPollBarColor',
    'noPollBarColor': 'styling.polling.noPollBarColor',
    'pollTextColor': 'styling.polling.pollTextColor',
    'genericPollMinWidth': 'styling.polling.genericPollMinWidth',
    
    // Leaderboard styling
    'leaderboardHeaderText': 'styling.leaderboard.leaderboardHeaderText',
    'leaderboardBackgroundColor': 'styling.leaderboard.leaderboardBackgroundColor',
    'leaderboardBackgroundAlpha': 'styling.leaderboard.leaderboardBackgroundAlpha',
    'leaderboardTextColor': 'styling.leaderboard.leaderboardTextColor',
    
    // Raw CSS
    'rawCssEditor': 'styling.rawCssEditor',
    
    // Behavior
    'decayInterval': 'behavior.decayInterval',
    'decayAmount': 'behavior.decayAmount',
    'recentMaxResetDelay': 'behavior.recentMaxResetDelay',
    'autoOpenPopout': 'behavior.autoOpenPopout',
    'requiredUrlSubstring': 'behavior.requiredUrlSubstring',
    'inactivityTimeoutDuration': 'behavior.inactivityTimeoutDuration',
    'maxPrunedCacheSize': 'behavior.maxPrunedCacheSize',
    
    // Unified Polling - Global Settings
    'enableUnifiedPolling': 'polling.unified.enabled',
    'unifiedPollingLookbackWindow': 'polling.unified.lookbackWindow',
    'unifiedPollingResultDisplayTime': 'polling.unified.resultDisplayTime',
    'unifiedPollingCooldownDuration': 'polling.unified.cooldownDuration',
    'unifiedPollingMinimumDuration': 'polling.unified.minimumPollDuration',
    'unifiedPollingActivityCheckInterval': 'polling.unified.activityCheckInterval',
    'unifiedPollingMaxActiveDuration': 'polling.unifiedPolling.behavior.maxActivePollDuration',
    
    // Yes/No Polling
    'unifiedPollingYesNoEnabled': 'polling.unifiedPolling.yesno.enabled',
    'unifiedPollingYesNoThreshold': 'polling.unifiedPolling.yesno.activationThreshold',
    'unifiedPollingYesColor': 'polling.unifiedPolling.yesno.styling.yesColor',
    'unifiedPollingNoColor': 'polling.unifiedPolling.yesno.styling.noColor',
    'unifiedPollingYesNoWidth': 'polling.unifiedPolling.yesno.width',
    'unifiedPollingYesNoHeight': 'polling.unifiedPolling.yesno.height',
    'unifiedPollingYesNoAutoFitWidth': 'polling.unifiedPolling.yesno.autoFitWidth',
    
    // Numbers Polling
    'unifiedPollingNumbersEnabled': 'polling.unifiedPolling.numbers.enabled',
    'unifiedPollingNumbersThreshold': 'polling.unifiedPolling.numbers.activationThreshold',
    'unifiedPollingNumbersMaxDisplay': 'polling.unifiedPolling.numbers.maxDisplay',
    'unifiedPollingNumbersMaxDigits': 'polling.unifiedPolling.numbers.maxDigits',
    'unifiedPollingNumbersMaxBins': 'polling.unifiedPolling.numbers.maxBins',
    'unifiedPollingNumbersMinWidth': 'polling.unifiedPolling.numbers.minWidth',
    
    // Letters Polling
    'unifiedPollingLettersEnabled': 'polling.unifiedPolling.letters.enabled',
    'unifiedPollingLettersThreshold': 'polling.unifiedPolling.letters.activationThreshold',
    'unifiedPollingLettersIndividualThreshold': 'polling.unifiedPolling.letters.individualThreshold',
    'unifiedPollingLettersMaxDisplayItems': 'polling.unifiedPolling.letters.maxDisplayItems',
    'unifiedPollingLettersMaxDisplay': 'polling.unifiedPolling.letters.maxDisplayItems', // Legacy key name
    'unifiedPollingLettersMinWidth': 'polling.unifiedPolling.letters.minWidth',
    
    // Sentiment Polling
    'unifiedPollingSentimentEnabled': 'polling.unifiedPolling.sentiment.enabled',
    'unifiedPollingSentimentThreshold': 'polling.unifiedPolling.sentiment.activationThreshold',
    'unifiedPollingSentimentMaxDisplayItems': 'polling.unifiedPolling.sentiment.maxDisplayItems',
    'unifiedPollingSentimentMaxGrowthWidth': 'polling.unifiedPolling.sentiment.maxGrowthWidth',
    'unifiedPollingSentimentAutoFitWidth': 'polling.unifiedPolling.sentiment.autoFitWidth',
    'unifiedPollingSentimentLabelHeight': 'polling.unifiedPolling.sentiment.labelHeight',
    'unifiedPollingSentimentMaxGaugeValue': 'polling.unifiedPolling.sentiment.maxGaugeValue',
    'unifiedPollingSentimentMinimumDisplayTime': 'polling.unifiedPolling.sentiment.minimumDisplayTime',
    'unifiedPollingSentimentDecayInterval': 'polling.unifiedPolling.sentiment.decayInterval',
    'unifiedPollingSentimentDecayAmount': 'polling.unifiedPolling.sentiment.decayAmount',
    'unifiedPollingSentimentEscalatedDecayEnabled': 'polling.unifiedPolling.sentiment.escalatedDecayEnabled',
    'unifiedPollingSentimentEscalatedDecayThresholdTime': 'polling.unifiedPolling.sentiment.escalatedDecayThresholdTime',
    'unifiedPollingSentimentEscalatedDecayMultiplier': 'polling.unifiedPolling.sentiment.escalatedDecayMultiplier',
    'unifiedPollingSentimentEscalatedDecayMaxMultiplier': 'polling.unifiedPolling.sentiment.escalatedDecayMaxMultiplier',
    'unifiedPollingSentimentBaseColor': 'polling.unifiedPolling.sentiment.baseColor',
    'unifiedPollingSentimentBlockList': 'polling.unifiedPolling.sentiment.blockList',
    'unifiedPollingSentimentAllowListMode': 'polling.unifiedPolling.sentiment.allowListMode',
    'unifiedPollingSentimentGroups': 'polling.unifiedPolling.sentiment.groups',
    'unifiedPollingSentimentAnchorPoint': 'polling.unifiedPolling.sentiment.anchorPoint',
    
    // Leaderboard
    'leaderboardHighlightValue': 'leaderboard.highlightValue',
    'leaderboardTimeWindowDays': 'leaderboard.timeWindowDays',
    
    // Webhook Integration
    'webhookEndpoint': 'integrations.webhook.endpoint',
    'webhookApiKey': 'integrations.webhook.apiKey',
    'webhookEvents': 'integrations.webhook.events', // Legacy key for all events
    'webhookChatMessages': 'integrations.webhook.events.chatMessages',
    'webhookHighlightMessages': 'integrations.webhook.events.highlightMessages',
    'webhookGaugeUpdates': 'integrations.webhook.events.gaugeUpdates',
    'webhookPollUpdates': 'integrations.webhook.events.pollUpdates',
    'webhookLeaderboardUpdates': 'integrations.webhook.events.leaderboardUpdates',
    
    // StreamView Integration
    'streamviewEnabled': 'integrations.streamview.enabled',
    'enableStreamview': 'integrations.streamview.enabled', // Legacy key name
    'streamviewGenerateApiKey': 'integrations.streamview.generateApiKey',
    'streamviewBaseUrl': 'integrations.streamview.baseUrl',
    'streamviewSecretKey': 'integrations.streamview.secretKey',
    // 'currentStreamview' removed - individual URL fields now mapped directly
    'browserSourceStyle': 'integrations.streamview.browserSourceStyle',
    'streamviewBatchInterval': 'integrations.streamview.batchInterval',
    'streamviewRetryAttempts': 'integrations.streamview.retryAttempts',
    'streamviewTimeout': 'integrations.streamview.timeout',
    'enableChannelIdOverride': 'integrations.streamview.channelIdOverride.enabled',
    'channelIdOverride': 'integrations.streamview.channelIdOverride.channelId',
    'enableManualWebhookOverride': 'integrations.streamview.manualWebhookOverride.enabled',
    'manualWebhookUrl': 'integrations.streamview.manualWebhookOverride.webhookUrl'
};

/**
 * Get the settings path for a form element ID
 * @param {string} elementId - The form element ID
 * @returns {string|null} - The nested settings path or null if not found
 */
function getFormElementPath(elementId) {
    return FORM_ELEMENT_PATHS[elementId] || null;
}

/**
 * Get all form element mappings
 * @returns {Object} - Complete form element to path mappings
 */
function getAllFormMappings() {
    return { ...FORM_ELEMENT_PATHS };
}

/**
 * Validate if a form element ID is recognized
 * @param {string} elementId - The form element ID to validate
 * @returns {boolean} - True if the element ID has a mapping
 */
function isValidFormElement(elementId) {
    return elementId in FORM_ELEMENT_PATHS;
}

/**
 * Get nested value using a form element ID
 * @param {Object} settings - Settings object
 * @param {string} elementId - Form element ID
 * @returns {*} - The nested value or undefined if not found
 */
function getSettingByFormElement(settings, elementId) {
    const path = getFormElementPath(elementId);
    if (!path) return undefined;
    
    return getNestedProperty(settings, path);
}

/**
 * Set nested value using a form element ID
 * @param {Object} settings - Settings object to modify
 * @param {string} elementId - Form element ID
 * @param {*} value - Value to set
 * @returns {boolean} - True if successfully set, false if element ID not found
 */
function setSettingByFormElement(settings, elementId, value) {
    const path = getFormElementPath(elementId);
    if (!path) return false;
    
    setNestedProperty(settings, path, value);
    return true;
}

// Make the API available globally
if (typeof window !== 'undefined') {
    window.SettingsManager = {
        getAllSettings,
        getSetting,
        setSettings,
        updateNestedSetting,
        resetAllSettings,
        getDefaultValue,
        getDefaultSettings,
        validateSettings,
        buildNestedConfig,
        // Form element mapping methods
        getFormElementPath,
        getAllFormMappings,
        isValidFormElement,
        getSettingByFormElement,
        setSettingByFormElement
    };
}

// Make SettingsManager available globally for service worker
if (typeof globalThis !== 'undefined') {
    globalThis.SettingsManager = {
        getAllSettings,
        getSetting,
        setSettings,
        updateNestedSetting,
        resetAllSettings,
        getDefaultValue,
        getDefaultSettings,
        validateSettings,
        buildNestedConfig,
        // Form element mapping methods
        getFormElementPath,
        getAllFormMappings,
        isValidFormElement,
        getSettingByFormElement,
        setSettingByFormElement
    };
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAllSettings,
        getSetting,
        setSettings,
        updateNestedSetting,
        resetAllSettings,
        getDefaultValue,
        getDefaultSettings,
        validateSettings,
        buildNestedConfig,
        // Form element mapping methods
        getFormElementPath,
        getAllFormMappings,
        isValidFormElement,
        getSettingByFormElement,
        setSettingByFormElement
    };
}