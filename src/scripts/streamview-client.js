// Streamview API client for creating and managing remote streamviews
class StreamviewClient {
    constructor(settings) {
        this.settings = settings;
        this.baseUrl = settings.integrations?.streamview?.baseUrl || 'https://streamview.channel';
    }

    updateSettings(newSettings) {
        this.settings = newSettings;
        this.baseUrl = newSettings.integrations?.streamview?.baseUrl || 'https://streamview.channel';
    }

    async createStreamview() {
        try {
            const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
            
            // Build configuration with security options
            const configuration = this.buildConfigurationFromSettings();
            
            // Add security configuration if any security options are enabled
            if (this.settings.integrations?.streamview?.generateApiKey || this.settings.integrations?.streamview?.secretKey) {
                configuration.security = {};
                
                if (this.settings.integrations?.streamview?.generateApiKey) {
                    configuration.security.generateApiKey = true;
                }
                
                // Include secret key if set
                if (this.settings.integrations?.streamview?.secretKey) {
                    configuration.security.secretKey = this.settings.integrations.streamview.secretKey;
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
                    ...(this.settings.integrations?.streamview?.apiKey ? { 'X-API-Key': this.settings.integrations.streamview.apiKey } : {})
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
                chromaKeyColor: this.settings.display?.chromaKeyColor || '#b9e6b7',
                popoutBaseFontSize: this.settings.display?.popoutBaseFontSize || 18,
                popoutDefaultWidth: this.settings.display?.popoutDefaultWidth || 600,
                popoutDefaultHeight: this.settings.display?.popoutDefaultHeight || 300,
                displayTime: this.settings.display?.displayTime || 10000
            },
            features: {
                enableCounting: this.settings.core?.enableCounting || false,
                enableYesNoPolling: this.settings.features?.enableYesNoPolling || false,
                enableLeaderboard: this.settings.features?.enableLeaderboard || false,
                enableHighlightTracking: this.settings.features?.enableHighlightTracking || false,
                appendMessages: this.settings.features?.appendMessages || false
            },
            styling: {
                messageBGColor: this.settings.styling?.messageBGColor || '#111111',
                paragraphTextColor: this.settings.styling?.paragraphTextColor || '#FFFFFF',
                enableUsernameColoring: this.settings.styling?.enableUsernameColoring || true,
                usernameDefaultColor: this.settings.styling?.usernameDefaultColor || '#FF0000',
                gauge: {
                    gaugeMaxValue: this.settings.styling?.gauge?.gaugeMaxValue || 30,
                    gaugeMinDisplayThreshold: this.settings.styling?.gauge?.gaugeMinDisplayThreshold || 3,
                    gaugeTrackColor: this.settings.styling?.gauge?.gaugeTrackColor || '#e0e0e0',
                    gaugeTrackAlpha: this.settings.styling?.gauge?.gaugeTrackAlpha || 0,
                    gaugeTrackBorderColor: this.settings.styling?.gauge?.gaugeTrackBorderColor || '#505050',
                    gaugeTrackBorderAlpha: this.settings.styling?.gauge?.gaugeTrackBorderAlpha || 1,
                    gaugeFillGradientStartColor: this.settings.styling?.gauge?.gaugeFillGradientStartColor || '#ffd700',
                    gaugeFillGradientEndColor: this.settings.styling?.gauge?.gaugeFillGradientEndColor || '#ff0000',
                    recentMaxIndicatorColor: this.settings.styling?.gauge?.recentMaxIndicatorColor || '#ff0000',
                    peakLabels: {
                        low: { 
                            text: this.settings.styling?.gauge?.peakLabels?.low?.text || 'Heh', 
                            color: this.settings.styling?.gauge?.peakLabels?.low?.color || '#ffffff' 
                        },
                        mid: { 
                            text: this.settings.styling?.gauge?.peakLabels?.mid?.text || 'Funny!', 
                            color: this.settings.styling?.gauge?.peakLabels?.mid?.color || '#ffff00' 
                        },
                        high: { 
                            text: this.settings.styling?.gauge?.peakLabels?.high?.text || 'Hilarious!!', 
                            color: this.settings.styling?.gauge?.peakLabels?.high?.color || '#ffa500' 
                        },
                        max: { 
                            text: this.settings.styling?.gauge?.peakLabels?.max?.text || 'OFF THE CHARTS!!!', 
                            color: this.settings.styling?.gauge?.peakLabels?.max?.color || '#ff0000' 
                        }
                    },
                    enablePeakLabelAnimation: this.settings.styling?.gauge?.enablePeakLabelAnimation || true,
                    peakLabelAnimationDuration: this.settings.styling?.gauge?.peakLabelAnimationDuration || 0.6,
                    peakLabelAnimationIntensity: this.settings.styling?.gauge?.peakLabelAnimationIntensity || 2
                },
                polling: {
                    yesPollBarColor: this.settings.styling?.polling?.yesPollBarColor || '#ff0000',
                    noPollBarColor: this.settings.styling?.polling?.noPollBarColor || '#0000ff',
                    pollTextColor: this.settings.styling?.polling?.pollTextColor || '#ffffff'
                },
                leaderboard: {
                    leaderboardHeaderText: this.settings.styling?.leaderboard?.leaderboardHeaderText || 'Leaderboard',
                    leaderboardBackgroundColor: this.settings.styling?.leaderboard?.leaderboardBackgroundColor || '#000000',
                    leaderboardBackgroundAlpha: this.settings.styling?.leaderboard?.leaderboardBackgroundAlpha || 0,
                    leaderboardTextColor: this.settings.styling?.leaderboard?.leaderboardTextColor || '#FFFFFF'
                }
            },
            behavior: {
                decayInterval: this.settings.behavior?.decayInterval || 500,
                decayAmount: this.settings.behavior?.decayAmount || 1,
                recentMaxResetDelay: this.settings.behavior?.recentMaxResetDelay || 2000,
                pollClearTime: this.settings.polling?.pollClearTime || 12000,
                pollCooldownDuration: this.settings.polling?.pollCooldownDuration || 5000,
                pollActivityThreshold: this.settings.polling?.pollActivityThreshold || 1,
                pollActivityCheckInterval: this.settings.polling?.pollActivityCheckInterval || 2000,
                pollDisplayThreshold: this.settings.polling?.pollDisplayThreshold || 15,
                leaderboardHighlightValue: this.settings.leaderboard?.highlightValue || 10,
                leaderboardTimeWindowDays: this.settings.leaderboard?.timeWindowDays || 7
            },
            browserSourceStyle: this.validateAndFixBrowserSourceStyle(this.settings.integrations?.streamview?.browserSourceStyle) || null
        };
    }

    // Streamview updates are no longer needed - browser source is configured independently via web UI

    async deleteStreamview(streamviewId) {
        try {
            const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
            
            // Use the API key from currentStreamview if available, otherwise fall back to settings
            let apiKey = this.settings.integrations?.streamview?.apiKey;
            if (this.settings.integrations?.streamview?.current && this.settings.integrations.streamview.current.apiKey) {
                apiKey = this.settings.integrations.streamview.current.apiKey;
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
            let apiKey = this.settings.integrations?.streamview?.apiKey;
            if (this.settings.integrations?.streamview?.current && this.settings.integrations.streamview.current.apiKey) {
                apiKey = this.settings.integrations.streamview.current.apiKey;
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