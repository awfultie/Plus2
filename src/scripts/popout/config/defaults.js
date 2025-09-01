// Default settings configuration for popout display
// Extracted from popout.js during Phase 1 refactoring

/**
 * Get default peak labels configuration
 * @returns {Object} Peak labels object with text and color properties
 */
function getDefaultPeakLabels() {
    return {
        low: { text: 'Heh', color: '#ffffff' },
        mid: { text: 'Funny!', color: '#ffff00' },
        high: { text: 'Hilarious!!', color: '#ffa500' },
        max: { text: 'OFF THE CHARTS!!!', color: '#ff0000' }
    };
}

/**
 * Get default settings configuration that matches the nested structure
 * expected by the streamview and popout display
 * @returns {Object} Complete default settings object
 */
function getDefaultSettings() {
    return {
        display: {
            chromaKeyColor: '#b9e6b7',
            popoutBaseFontSize: 18,
            popoutDefaultWidth: 600,
            popoutDefaultHeight: 300,
            displayTime: 10000
        },
        features: {
            enableCounting: true,
            enableYesNoPolling: true,
            enableLeaderboard: true,
            enableHighlightTracking: true,
            appendMessages: false
        },
        styling: {
            messageBGColor: '#111111',
            paragraphTextColor: '#FFFFFF',
            enableUsernameColoring: true,
            usernameDefaultColor: '#FF0000',
            gauge: {
                gaugeMaxValue: 30,
                gaugeMinDisplayThreshold: 3,
                gaugeTrackColor: '#e0e0e0',
                gaugeTrackAlpha: 0,
                gaugeTrackBorderColor: '#505050',
                gaugeTrackBorderAlpha: 1,
                gaugeFillGradientStartColor: '#ffd700',
                gaugeFillGradientEndColor: '#ff0000',
                recentMaxIndicatorColor: '#ff0000',
                peakLabels: getDefaultPeakLabels(),
                enablePeakLabelAnimation: true,
                peakLabelAnimationDuration: 0.6,
                peakLabelAnimationIntensity: 2
            },
            polling: {
                yesPollBarColor: '#ff0000',
                noPollBarColor: '#0000ff',
                pollTextColor: '#ffffff'
            },
            leaderboard: {
                leaderboardHeaderText: 'Leaderboard',
                leaderboardBackgroundColor: '#000000',
                leaderboardBackgroundAlpha: 0,
                leaderboardTextColor: '#FFFFFF'
            }
        },
        behavior: {
            // Behavior settings are primarily used by the background script
        }
    };
}

// Make functions available globally for backward compatibility
window.popoutUtils = window.popoutUtils || {};
window.popoutUtils.getDefaultSettings = getDefaultSettings;
window.popoutUtils.getDefaultPeakLabels = getDefaultPeakLabels;