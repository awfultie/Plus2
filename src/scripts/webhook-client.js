// Webhook client for sending events to external endpoints
class WebhookClient {
    constructor(settings) {
        this.settings = settings;
        this.retryQueue = new Map(); // Map of failed requests for retry
        this.retryTimers = new Map(); // Active retry timers
        this.eventBatch = []; // Queue of events waiting to be sent
        this.batchTimer = null; // Timer for batch sending
        this.isBatchSending = false; // Flag to prevent overlapping batch sends
    }

    updateSettings(newSettings) {
        const oldInterval = this.settings.integrations?.streamview?.batchInterval;
        this.settings = newSettings;
        // If batching settings change or webhooks are disabled, reset the batching mechanism
        if (oldInterval !== newSettings.streamviewBatchInterval || !this.isEnabled()) {
            this.clearBatch();
        }
    }

    isEnabled() {
        // The webhook client is used by both the legacy webhook feature and the new Streamview feature.
        const streamviewEnabled = this.settings.integrations?.streamview?.enabled && this.settings.integrations?.streamview?.current;
        const legacyWebhookEnabled = this.settings.features?.enableWebhookIntegration && this.settings.integrations?.webhook?.endpoint && this.settings.integrations?.webhook?.endpoint.trim() !== '';
        return streamviewEnabled || legacyWebhookEnabled;
    }

    async sendEvent(eventType, eventData, platform = 'twitch', channelUrl = '') {
        if (!this.isEnabled()) {
            return;
        }

        const isStreamviewActive = this.settings.integrations?.streamview?.enabled && this.settings.integrations?.streamview?.current;

        // Check if this event type is enabled
        const eventTypeMap = {
            'highlight_message': 'highlightMessages', 
            'gauge_update': 'gaugeUpdates',
            'poll_update': 'pollUpdates',
            'leaderboard_update': 'leaderboardUpdates',
            'leaderboard_toggle': 'leaderboardUpdates', // Toggle uses same setting as leaderboard updates
            // Unified polling events - map to pollUpdates for legacy webhook compatibility
            'unified_yesno_poll': 'pollUpdates',
            'unified_numbers_poll': 'pollUpdates',
            'unified_letters_poll': 'pollUpdates', 
            'unified_sentiment_update': 'pollUpdates',
            'unified_poll_activation': 'pollUpdates',
            'unified_poll_conclusion': 'pollUpdates'
        };

        // If only legacy webhook is active, check its event filters. 
        // Streamview always receives all events to decouple browser source from extension settings.
        if (!isStreamviewActive && this.settings.features?.enableWebhookIntegration) {
            const settingKey = eventTypeMap[eventType];
            if (settingKey && !this.settings.integrations?.webhook?.events[settingKey]) {
                return; // Event type disabled for legacy webhook
            }
        }
        // Note: When streamview is active, all events are sent regardless of extension event settings

        // Map unified polling events to legacy event types for StreamView compatibility
        let finalEventType = eventType;
        if (isStreamviewActive) {
            const streamviewEventMap = {
                'unified_yesno_poll': 'poll_update',
                'unified_numbers_poll': 'poll_update', 
                'unified_letters_poll': 'poll_update',
                'unified_sentiment_update': 'unified_sentiment_update', // Keep original to preserve enhanced data format
                'unified_poll_activation': 'poll_update',
                'unified_poll_conclusion': 'poll_update'
            };
            
            if (streamviewEventMap[eventType]) {
                finalEventType = streamviewEventMap[eventType];
            }
        }

        const payload = {
            type: 'message_event',
            event_type: finalEventType,
            timestamp: new Date().toISOString(),
            platform: platform,
            channel: this.extractChannelName(channelUrl),
            data: eventData
        };

        this.eventBatch.push(payload);
        this._ensureBatchTimer();
    }

    _ensureBatchTimer() {
        if (!this.batchTimer) {
            const interval = this.settings.integrations?.streamview?.batchInterval || 300;
            this.batchTimer = setTimeout(() => {
                this._sendBatch();
            }, interval);
        }
    }

    async _sendBatch() {
        if (this.isBatchSending || this.eventBatch.length === 0) {
            this.batchTimer = null; // Reset timer
            if (this.eventBatch.length > 0) this._ensureBatchTimer(); // Reschedule if items came in during send
            return;
        }

        this.isBatchSending = true;
        clearTimeout(this.batchTimer);
        this.batchTimer = null;

        const batchToSend = [...this.eventBatch];
        this.eventBatch = [];

        try {
            await this.makeRequest(batchToSend);
        } catch (error) {
            this.eventBatch.unshift(...batchToSend); // Add failed batch back to the front
            this.queueForRetry(batchToSend, 1);
        } finally {
            this.isBatchSending = false;
            if (this.eventBatch.length > 0) this._ensureBatchTimer();
        }
    }

    async makeRequest(payload, attempt = 1) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            let endpoint = '';
            let apiKey = '';

            // Determine which endpoint and key to use, prioritizing manual override, then Streamview
            if (this.settings.features?.enableManualWebhookOverride && this.settings.display?.manualWebhookUrl) {
                endpoint = this.settings.display.manualWebhookUrl;
            } else if (this.settings.integrations?.streamview?.enabled && this.settings.integrations?.streamview?.current) {
                endpoint = this.settings.integrations.streamview.current.webhookUrl;
                // Use the API key from the streamview if it was generated
                if (this.settings.integrations.streamview.current.apiKey) {
                    apiKey = this.settings.integrations.streamview.current.apiKey;
                }
            } else if (this.settings.features?.enableWebhookIntegration) {
                endpoint = this.settings.integrations?.webhook?.endpoint;
                apiKey = this.settings.integrations?.webhook?.apiKey;
            }

            if (!endpoint) {
                throw new Error("No webhook endpoint configured.");
            }

            if (apiKey && apiKey.trim() !== '') {
                headers['X-API-Key'] = apiKey.trim();
            }

            // Log payload details before sending
            let payloadString;
            try {
                payloadString = JSON.stringify(payload);
            } catch (jsonError) {
                throw new Error('Failed to serialize payload to JSON');
            }

            if (!payloadString || payloadString.length === 0) {
                throw new Error('Payload is empty after JSON serialization');
            }

            const fetchPromise = fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: payloadString
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), this.settings.integrations?.streamview?.timeout || 5000)
            );
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Try to parse response, but don't fail if it's not JSON
            try {
                const result = await response.json();
            } catch (parseError) {
            }

        } catch (error) {
            // Handle CORS errors specifically
            if (error.message.includes('CORS') || error.message.includes('cors')) {
                throw new Error('CORS error: Server needs Access-Control-Allow-Origin header');
            }
            
            if (error.message.includes('timeout')) {
                throw new Error('Request timeout');
            }
            
            throw error;
        }
    }

    queueForRetry(payload, attempt) {
        const maxAttempts = this.settings.integrations?.streamview?.retryAttempts || 3;
        
        if (attempt > maxAttempts) {
            const eventType = Array.isArray(payload) ? `batch of ${payload.length}` : payload.event_type;
            return;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        const retryKey = `${Array.isArray(payload) ? 'batch' : payload.event_type}_${new Date().toISOString()}_${attempt}`;


        const timerId = setTimeout(async () => {
            this.retryTimers.delete(retryKey);

            try {
                await this.makeRequest(payload, attempt);
            } catch (error) {
                this.queueForRetry(payload, attempt + 1);
            }
        }, delayMs);

        this.retryQueue.set(retryKey, payload);
        this.retryTimers.set(retryKey, timerId);
    }

    extractChannelName(url) {
        if (!url) return 'unknown';
        
        // Extract channel name from Twitch or YouTube URL
        const twitchMatch = url.match(/\/popout\/([^/]+)\/|\.tv\/([^/]+)/);
        if (twitchMatch) {
            return twitchMatch[1] || twitchMatch[2];
        }

        const youtubeMatch = url.match(/youtube\.com\/channel\/([^/]+)|youtube\.com\/c\/([^/]+)|youtube\.com\/user\/([^/]+)/);
        if (youtubeMatch) {
            return youtubeMatch[1] || youtubeMatch[2] || youtubeMatch[3];
        }

        return 'unknown';
    }

    clearRetries() {
        // Clear all pending retries (useful when settings change)
        this.retryTimers.forEach(timerId => clearTimeout(timerId));
        this.retryTimers.clear();
        this.retryQueue.clear();
        this.clearBatch();
    }

    clearBatch() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        this.eventBatch = [];
        this.isBatchSending = false;
    }
}

// Make available globally for background script
if (typeof window !== 'undefined') {
    window.WebhookClient = WebhookClient;
}