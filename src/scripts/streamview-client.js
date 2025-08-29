// Streamview API client for creating and managing remote streamviews
class StreamviewClient {
    constructor(settings) {
        this.settings = settings;
        this.baseUrl = settings.streamviewBaseUrl || 'https://streamview.channel';
    }

    updateSettings(newSettings) {
        this.settings = newSettings;
        this.baseUrl = newSettings.streamviewBaseUrl || 'https://streamview.channel';
    }

    async createStreamview() {
        try {
            const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
            
            // Build configuration with security options
            const configuration = this.buildConfigurationFromSettings();
            
            // Add security configuration if any security options are enabled
            if (this.settings.streamviewGenerateApiKey || this.settings.streamviewSecretKey) {
                configuration.security = {};
                
                if (this.settings.streamviewGenerateApiKey) {
                    configuration.security.generateApiKey = true;
                }
                
                // Include secret key if set
                if (this.settings.streamviewSecretKey) {
                    configuration.security.secretKey = this.settings.streamviewSecretKey;
                    // Enable protection by default when secret key is provided
                    configuration.security.requireSecretForEditing = true;
                    // Hide from public listings when secret key is used
                    configuration.security.hideFromPublicListings = true;
                }
            }
            
            const response = await fetch(`${baseUrl}/api/streamview/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.settings.streamviewApiKey ? { 'X-API-Key': this.settings.streamviewApiKey } : {})
                },
                body: JSON.stringify({ configuration })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            throw error;
        }
    }

    validateAndFixBrowserSourceStyle(browserSourceStyle) {
        if (!browserSourceStyle || !browserSourceStyle.elements) {
            return null;
        }
        
        // Create a deep copy to avoid mutating the original
        const fixed = JSON.parse(JSON.stringify(browserSourceStyle));
        
        // Ensure minimum height requirements (backend requires min 30px)
        Object.keys(fixed.elements).forEach(elementKey => {
            const element = fixed.elements[elementKey];
            if (element && typeof element.height === 'number' && element.height < 30) {
                element.height = 50; // Set to a reasonable default that meets requirements
            }
        });
        
        return fixed;
    }

    buildConfigurationFromSettings() {
        if (!this.settings) {
            return null;
        }
        
        
        return {
            display: {
                chromaKeyColor: this.settings.chromaKeyColor || '#b9e6b7',
                popoutBaseFontSize: this.settings.popoutBaseFontSize || 18,
                popoutDefaultWidth: this.settings.popoutDefaultWidth || 600,
                popoutDefaultHeight: this.settings.popoutDefaultHeight || 300,
                displayTime: this.settings.displayTime || 10000
            },
            features: {
                enableCounting: this.settings.enableCounting || false,
                enableYesNoPolling: this.settings.enableYesNoPolling || false,
                enableLeaderboard: this.settings.enableLeaderboard || false,
                enableHighlightTracking: this.settings.enableHighlightTracking || false,
                appendMessages: this.settings.appendMessages || false
            },
            styling: {
                messageBGColor: this.settings.messageBGColor || '#111111',
                paragraphTextColor: this.settings.paragraphTextColor || '#FFFFFF',
                enableUsernameColoring: this.settings.enableUsernameColoring || true,
                usernameDefaultColor: this.settings.usernameDefaultColor || '#FF0000',
                gauge: {
                    gaugeMaxValue: this.settings.gaugeMaxValue || 30,
                    gaugeMinDisplayThreshold: this.settings.gaugeMinDisplayThreshold || 3,
                    gaugeTrackColor: this.settings.gaugeTrackColor || '#e0e0e0',
                    gaugeTrackAlpha: this.settings.gaugeTrackAlpha || 0,
                    gaugeTrackBorderColor: this.settings.gaugeTrackBorderColor || '#505050',
                    gaugeTrackBorderAlpha: this.settings.gaugeTrackBorderAlpha || 1,
                    gaugeFillGradientStartColor: this.settings.gaugeFillGradientStartColor || '#ffd700',
                    gaugeFillGradientEndColor: this.settings.gaugeFillGradientEndColor || '#ff0000',
                    recentMaxIndicatorColor: this.settings.recentMaxIndicatorColor || '#ff0000',
                    peakLabels: {
                        low: { 
                            text: this.settings.peakLabelLow || 'Heh', 
                            color: this.settings.peakLabelLowColor || '#ffffff' 
                        },
                        mid: { 
                            text: this.settings.peakLabelMid || 'Funny!', 
                            color: this.settings.peakLabelMidColor || '#ffff00' 
                        },
                        high: { 
                            text: this.settings.peakLabelHigh || 'Hilarious!!', 
                            color: this.settings.peakLabelHighColor || '#ffa500' 
                        },
                        max: { 
                            text: this.settings.peakLabelMax || 'OFF THE CHARTS!!!', 
                            color: this.settings.peakLabelMaxColor || '#ff0000' 
                        }
                    },
                    enablePeakLabelAnimation: this.settings.enablePeakLabelAnimation || true,
                    peakLabelAnimationDuration: this.settings.peakLabelAnimationDuration || 0.6,
                    peakLabelAnimationIntensity: this.settings.peakLabelAnimationIntensity || 2
                },
                polling: {
                    yesPollBarColor: this.settings.yesPollBarColor || '#ff0000',
                    noPollBarColor: this.settings.noPollBarColor || '#0000ff',
                    pollTextColor: this.settings.pollTextColor || '#ffffff'
                },
                leaderboard: {
                    leaderboardHeaderText: this.settings.leaderboardHeaderText || 'Leaderboard',
                    leaderboardBackgroundColor: this.settings.leaderboardBackgroundColor || '#000000',
                    leaderboardBackgroundAlpha: this.settings.leaderboardBackgroundAlpha || 0,
                    leaderboardTextColor: this.settings.leaderboardTextColor || '#FFFFFF'
                }
            },
            behavior: {
                stringToCount: this.settings.stringToCount || '+2, lol, lmao, lul, lmfao, dangLUL',
                exactMatchCounting: this.settings.exactMatchCounting || false,
                decayInterval: this.settings.decayInterval || 500,
                decayAmount: this.settings.decayAmount || 1,
                recentMaxResetDelay: this.settings.recentMaxResetDelay || 2000,
                pollClearTime: this.settings.pollClearTime || 12000,
                pollCooldownDuration: this.settings.pollCooldownDuration || 5000,
                pollActivityThreshold: this.settings.pollActivityThreshold || 1,
                pollActivityCheckInterval: this.settings.pollActivityCheckInterval || 2000,
                pollDisplayThreshold: this.settings.pollDisplayThreshold || 15,
                leaderboardHighlightValue: this.settings.leaderboardHighlightValue || 10,
                leaderboardTimeWindowDays: this.settings.leaderboardTimeWindowDays || 7
            },
            browserSourceStyle: this.validateAndFixBrowserSourceStyle(this.settings.browserSourceStyle) || null
        };
    }

    // Streamview updates are no longer needed - browser source is configured independently via web UI

    async deleteStreamview(streamviewId) {
        try {
            const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
            
            // Use the API key from currentStreamview if available, otherwise fall back to settings
            let apiKey = this.settings.streamviewApiKey;
            if (this.settings.currentStreamview && this.settings.currentStreamview.apiKey) {
                apiKey = this.settings.currentStreamview.apiKey;
            }
            
            const response = await fetch(`${baseUrl}/api/streamview/${streamviewId}`, {
                method: 'DELETE',
                headers: {
                    ...(apiKey ? { 'X-API-Key': apiKey } : {})
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    async listStreamviews() {
        try {
            const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
            
            // Use the API key from currentStreamview if available, otherwise fall back to settings
            let apiKey = this.settings.streamviewApiKey;
            if (this.settings.currentStreamview && this.settings.currentStreamview.apiKey) {
                apiKey = this.settings.currentStreamview.apiKey;
            }
            
            const response = await fetch(`${baseUrl}/api/streamview`, {
                method: 'GET',
                headers: {
                    ...(apiKey ? { 'X-API-Key': apiKey } : {})
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }
}

// Make available globally for background script
if (typeof window !== 'undefined') {
    window.StreamviewClient = StreamviewClient;
}