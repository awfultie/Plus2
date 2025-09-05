// Unified Polling System
// Consolidates all polling types (yes/no, numbers, letters, sentiment) and highlight gauge
// into a single message processing pipeline

(function(global) {
    'use strict';

    // Unified polling state
    let unifiedState = {
        isActive: false,
        activePollType: null, // 'yesno', 'numbers', 'letters', 'sentiment'
        isConcluded: false,
        isOnCooldown: false,
        startTime: 0,
        messageBuffer: [],
        activeTracker: null,
        
        // Timers
        activityCheckTimerId: null,
        clearTimerId: null,
        cooldownTimerId: null,
        
        // Highlight gauge integration
        highlightGauge: {
            count: 0,
            recentMax: 0,
            lastIncrementTime: 0
        }
    };

    // Separate sentiment tracking state (always-on, independent of polls)
    let sentimentState = {
        items: {}, // { term: { count: number, lastSeen: timestamp } }
        lastDecayTime: Date.now(),
        decayInterval: null,
        shouldDisplay: false
    };

    // Highlight gauge decay timer
    let highlightGaugeDecayInterval = null;

    // External dependencies (injected during initialization)
    let settings = {};
    let broadcastToPopouts = null;
    let broadcastGaugeUpdate = null;
    let webhookClient = null;

    // Poll type definitions with priorities and configurations
    const POLL_TYPES = {
        YES_NO: {
            key: 'yesno',
            priority: 1, // Highest priority
            categoryFilter: (categories) => categories.filter(c => c.type === 'yesno'),
            activationThreshold: (config) => config.yesnoActivation?.threshold || 3,
            displayComponent: 'YesNoPollDisplay'
        },
        
        NUMBERS: {
            key: 'numbers',
            priority: 2,
            categoryFilter: (categories) => categories.filter(c => c.type === 'number'),
            activationThreshold: (config) => config.numbersActivation?.threshold || 7,
            displayComponent: 'NumberPollDisplay'
        },
        
        LETTERS: {
            key: 'letters',
            priority: 3,
            categoryFilter: (categories) => categories.filter(c => c.type === 'letter'),
            activationThreshold: (config) => config.lettersActivation?.totalThreshold || 10,
            displayComponent: 'LetterPollDisplay'
        },
        
    };

    // Initialize the unified polling system
    function initializeUnifiedPolling(deps) {
        settings = deps.settings;
        broadcastToPopouts = deps.broadcastToPopouts;
        broadcastGaugeUpdate = deps.broadcastGaugeUpdate;
        webhookClient = deps.webhookClient;
        
        // Start sentiment decay process
        const config = getUnifiedPollConfig();
        startSentimentDecay(config);
        
        // Start highlight gauge decay process
        startHighlightGaugeDecay(config);
        
        console.log('[Unified Poll] Initialized with settings:', settings.polling?.unified);
    }

    // Update settings when they change
    function updateUnifiedPollingSettings(newSettings) {
        settings = newSettings;
        
        // Restart sentiment decay with new settings
        const config = getUnifiedPollConfig();
        startSentimentDecay(config);
        
        // Restart highlight gauge decay with new settings
        startHighlightGaugeDecay(config);
        
        console.log('[Unified Poll] Settings updated');
    }

    // Get unified polling configuration
    function getUnifiedPollConfig() {
        return {
            // Global settings
            lookbackWindowMs: settings.polling?.unified?.lookbackWindow || 10000,
            resultDisplayTime: settings.polling?.unified?.resultDisplayTime || 15000,
            cooldownDuration: settings.polling?.unified?.cooldownDuration || 8000,
            minimumPollDuration: settings.polling?.unified?.minimumPollDuration || 10000,
            activityCheckInterval: settings.polling?.unified?.activityCheckInterval || 3000,
            
            // Behavior settings (for decay) - should come from polling.unified
            behavior: {
                decayInterval: settings.polling?.unified?.decayInterval || settings.behavior?.decayInterval || 500,
                decayAmount: settings.polling?.unified?.decayAmount || settings.behavior?.decayAmount || 1,
                recentMaxResetDelay: settings.polling?.unified?.recentMaxResetDelay || settings.behavior?.recentMaxResetDelay || 2000
            },
            
            // Poll type activation settings - corrected to use unifiedPolling paths
            yesnoActivation: {
                threshold: settings.polling?.unifiedPolling?.yesno?.activationThreshold || settings.polling?.types?.yesno?.activationThreshold || 3,
                enabled: settings.polling?.unifiedPolling?.yesno?.enabled !== false
            },
            numbersActivation: {
                threshold: settings.polling?.unifiedPolling?.numbers?.activationThreshold || settings.polling?.types?.numbers?.activationThreshold || 7,
                enabled: settings.polling?.unifiedPolling?.numbers?.enabled !== false
            },
            lettersActivation: {
                totalThreshold: settings.polling?.unifiedPolling?.letters?.activationThreshold || settings.polling?.types?.letters?.activationThreshold || 10,
                individualThreshold: settings.polling?.unifiedPolling?.letters?.individualThreshold || settings.polling?.types?.letters?.individualThreshold || 3,
                enabled: settings.polling?.unifiedPolling?.letters?.enabled !== false
            },
            sentiment: {
                activationThreshold: settings.polling?.unifiedPolling?.sentiment?.activationThreshold || 15, // Display threshold
                enabled: settings.polling?.unifiedPolling?.sentiment?.enabled !== false,
                maxDisplayItems: settings.polling?.unifiedPolling?.sentiment?.maxDisplayItems || 5,
                maxGrowthWidth: settings.polling?.unifiedPolling?.sentiment?.maxGrowthWidth || 150,
                maxGaugeValue: settings.polling?.unifiedPolling?.sentiment?.maxGaugeValue || 30,
                groups: (() => {
                    try {
                        return JSON.parse(settings.polling?.unifiedPolling?.sentiment?.groups || '[]');
                    } catch (e) {
                        return [];
                    }
                })(),
                blockList: (settings.polling?.unifiedPolling?.sentiment?.blockList || '').split(',').map(w => w.trim()).filter(w => w.length > 0)
            },
            
            // Highlight gauge integration
            highlightGauge: {
                enabled: settings.polling?.highlightGauge?.enabled !== false,
                stringToCount: settings.polling?.highlightGauge?.stringToCount || settings.core?.stringToCount || '+2, lol, lmao',
                exactMatch: settings.polling?.highlightGauge?.exactMatch || settings.core?.exactMatchCounting || false,
                sentimentIntegration: settings.polling?.highlightGauge?.sentimentIntegration || false
            }
        };
    }

    // Main message processing function - replaces all individual processors
    function processUnifiedMessage(text, images, messageData = {}) {
        if (unifiedState.isOnCooldown) return;

        const currentTime = Date.now();
        const config = getUnifiedPollConfig();
        
        // Categorize the message into all possible types
        const categories = categorizeMessage(text, images, config);
        
        const unifiedMessage = {
            text: text.trim(),
            images,
            timestamp: currentTime,
            categories,
            username: messageData.username,
            badges: messageData.badges
        };

        console.log(`[Unified Poll] Processing message: "${text}" -> Categories: ${categories.map(c => `${c.type}:${c.value}`).join(', ')}`);

        // Add to message buffer and clean old messages
        unifiedState.messageBuffer.push(unifiedMessage);
        cleanMessageBuffer(currentTime, config);

        // Process highlight gauge if enabled
        if (config.highlightGauge.enabled) {
            processHighlightGauge(unifiedMessage, config);
        }

        // Process sentiment tracking (always-on, independent of polls)
        processSentimentTracking(unifiedMessage, config);

        // If already active, update tracking
        if (unifiedState.isActive) {
            updateActivePollTracking(unifiedMessage);
            return;
        }

        // If not active, check for poll activation
        if (categories.length > 0) {
            checkPollActivation(config);
        }
    }

    // Enhanced message categorization that handles all types
    function categorizeMessage(text, images, config) {
        const categories = [];
        const trimmedText = text.trim();

        // 1. Yes/No responses (highest priority for polls)
        const yesNoMatch = matchYesNo(trimmedText, images);
        if (yesNoMatch) {
            categories.push({ type: 'yesno', value: yesNoMatch });
        }

        // 2. Numbers (integers only)
        if (/^\d+$/.test(trimmedText)) {
            categories.push({ type: 'number', value: parseInt(trimmedText, 10) });
        }

        // 3. Single letters
        if (/^[a-zA-Z]$/.test(trimmedText)) {
            categories.push({ type: 'letter', value: trimmedText.toLowerCase() });
        }

        // 4. Sentiment/words (longer text, not just numbers)
        if (trimmedText.length > 1 && !/^\d+$/.test(trimmedText)) {
            categories.push({ type: 'sentiment', value: trimmedText.toLowerCase() });
        }

        // 5. Emotes from images
        images.forEach(img => {
            categories.push({ 
                type: 'emote', 
                value: img.alt || img.src,  // Keep alt text for matching
                emoteData: img  // Store full emote object for display
            });
        });

        return categories;
    }

    // Yes/No detection logic
    function matchYesNo(text, images) {
        const yesTerms = ['yes', 'y'];
        const noTerms = ['no', 'n'];
        const words = text.toLowerCase().split(/\s+/);

        let isYes = words.some(w => yesTerms.includes(w));
        let isNo = words.some(w => noTerms.includes(w));

        // Also check image alt text
        if (!isYes && !isNo) {
            const alts = images.map(img => (img.alt || '').toLowerCase());
            isYes = alts.some(alt => yesTerms.includes(alt));
            isNo = alts.some(alt => noTerms.includes(alt));
        }

        // Return specific value if only one type found
        if (isYes && !isNo) return 'yes';
        if (isNo && !isYes) return 'no';
        return null; // Ignore if both or neither
    }

    // Clean old messages from buffer
    function cleanMessageBuffer(currentTime, config) {
        const cutoffTime = currentTime - config.lookbackWindowMs;
        unifiedState.messageBuffer = unifiedState.messageBuffer.filter(
            msg => msg.timestamp > cutoffTime
        );
    }

    // Highlight gauge processing (integrated into unified system)
    function processHighlightGauge(message, config) {
        if (!config.highlightGauge.enabled) return;

        const terms = config.highlightGauge.stringToCount.split(',').map(s => s.trim());
        if (terms.length === 0 || (terms.length === 1 && terms[0] === '')) return;

        const check = config.highlightGauge.exactMatch ?
            (source, term) => source.split(/\s+/).includes(term) :
            (source, term) => source.toLowerCase().includes(term.toLowerCase());

        let matchFound = terms.some(term => term && check(message.text, term));
        if (!matchFound && message.images) {
            matchFound = message.images.some(img => 
                terms.some(term => term && check(img.alt || '', term))
            );
        }

        if (matchFound) {
            unifiedState.highlightGauge.count++;
            if (unifiedState.highlightGauge.count > unifiedState.highlightGauge.recentMax) {
                unifiedState.highlightGauge.recentMax = unifiedState.highlightGauge.count;
            }
            unifiedState.highlightGauge.lastIncrementTime = Date.now();
            
            if (broadcastGaugeUpdate) {
                broadcastGaugeUpdate();
            }

            console.log(`[Unified Poll] Highlight gauge match: "${message.text}" -> Count: ${unifiedState.highlightGauge.count} (matched terms: ${terms.filter(term => term && check(message.text, term)).join(', ')})`);
        }
    }

    // Check if any poll type should be activated
    function checkPollActivation(config) {
        // Get all categorized messages in buffer
        const categorizedMessages = unifiedState.messageBuffer.filter(msg => msg.categories.length > 0);
        
        console.log(`[Unified Poll] Checking activation - ${categorizedMessages.length} categorized messages`);
        
        // Debug: Show all messages in buffer
        if (categorizedMessages.length > 0) {
            const bufferTexts = categorizedMessages.map(msg => `"${msg.text}" (${msg.categories.join(', ')})`).join(', ');
            console.log(`[Unified Poll] Message buffer contents: ${bufferTexts}`);
        }

        // Check each poll type in priority order
        const pollTypes = Object.values(POLL_TYPES).sort((a, b) => a.priority - b.priority);
        
        for (const pollType of pollTypes) {
            if (checkPollTypeActivation(pollType, categorizedMessages, config)) {
                return; // Stop after first activation
            }
        }
    }

    // Check if specific poll type should activate
    function checkPollTypeActivation(pollType, messages, config) {
        const typeKey = pollType.key;
        const isEnabled = config[`${typeKey}Activation`]?.enabled !== false;
        
        if (!isEnabled) {
            console.log(`[Unified Poll] Poll type ${typeKey} is disabled`);
            return false;
        }

        const relevantMessages = [];
        messages.forEach(msg => {
            const matchingCategories = pollType.categoryFilter(msg.categories);
            matchingCategories.forEach(category => {
                relevantMessages.push({ ...msg, category });
            });
        });

        const threshold = pollType.activationThreshold(config);
        
        console.log(`[Unified Poll] Checking ${typeKey} poll: ${relevantMessages.length} relevant messages, threshold: ${threshold}, priority: ${pollType.priority}`);
        
        // Debug: Show the actual messages being counted
        if (relevantMessages.length > 0) {
            const messageTexts = relevantMessages.map(msg => `"${msg.text}"`).join(', ');
            console.log(`[Unified Poll] ${typeKey} relevant messages: ${messageTexts}`);
        }
        
        // Special handling for letter polls - need at least 2 letters above individual threshold
        if (typeKey === 'letters' && relevantMessages.length >= threshold) {
            // Count individual letter frequencies
            const letterCounts = {};
            relevantMessages.forEach(msg => {
                const letter = msg.category.value;
                letterCounts[letter] = (letterCounts[letter] || 0) + 1;
            });
            
            // Check how many letters exceed the individual threshold
            const individualThreshold = config.lettersActivation?.individualThreshold || 3;
            const lettersAboveIndividualThreshold = Object.values(letterCounts)
                .filter(count => count >= individualThreshold).length;
            
            console.log(`[Unified Poll] Letters individual threshold check: ${lettersAboveIndividualThreshold} letters above individual threshold (${individualThreshold})`);
            console.log(`[Unified Poll] Letter counts:`, letterCounts);
            
            if (lettersAboveIndividualThreshold >= 2) {
                console.log(`[Unified Poll] ✅ ${typeKey} poll threshold met! ${lettersAboveIndividualThreshold} letters above individual threshold. Activating...`);
                activatePoll(pollType, relevantMessages);
                return true;
            } else {
                console.log(`[Unified Poll] ❌ ${typeKey} poll individual threshold not met (${lettersAboveIndividualThreshold}/2 letters above ${individualThreshold})`);
                return false;
            }
        } else if (relevantMessages.length >= threshold) {
            console.log(`[Unified Poll] ✅ ${typeKey} poll threshold met! Activating...`);
            activatePoll(pollType, relevantMessages);
            return true;
        } else {
            console.log(`[Unified Poll] ❌ ${typeKey} poll threshold not met (${relevantMessages.length}/${threshold})`);
        }
        
        return false;
    }

    // Activate a specific poll type
    function activatePoll(pollType, messages) {
        console.log(`[Unified Poll] Activating ${pollType.key} poll with ${messages.length} messages`);
        
        unifiedState.isActive = true;
        unifiedState.activePollType = pollType.key;
        unifiedState.startTime = Date.now();
        unifiedState.isConcluded = false;

        // Count occurrences
        const counts = {};
        messages.forEach(msg => {
            const value = msg.category.value;
            counts[value] = (counts[value] || 0) + 1;
        });

        unifiedState.activeTracker = {
            type: pollType.key,
            counts,
            totalResponses: messages.length
        };

        // Start activity monitoring
        const config = getUnifiedPollConfig();
        if (unifiedState.activityCheckTimerId) clearInterval(unifiedState.activityCheckTimerId);
        unifiedState.activityCheckTimerId = setInterval(() => {
            checkPollActivity(config);
        }, config.activityCheckInterval);

        broadcastPollUpdate();
    }

    // Update active poll tracking with new message
    function updateActivePollTracking(message) {
        if (!unifiedState.isActive || unifiedState.isConcluded) return;

        const activePollType = Object.values(POLL_TYPES).find(pt => pt.key === unifiedState.activePollType);
        if (!activePollType) return;

        const matchingCategories = activePollType.categoryFilter(message.categories);
        
        matchingCategories.forEach(category => {
            const value = category.value;
            unifiedState.activeTracker.counts[value] = (unifiedState.activeTracker.counts[value] || 0) + 1;
            unifiedState.activeTracker.totalResponses++;
        });

        if (matchingCategories.length > 0) {
            broadcastPollUpdate();
        }
    }

    // Check poll activity for ending conditions
    function checkPollActivity(config) {
        if (!unifiedState.isActive || unifiedState.isConcluded) {
            if (unifiedState.activityCheckTimerId) clearInterval(unifiedState.activityCheckTimerId);
            unifiedState.activityCheckTimerId = null;
            return;
        }

        const pollAge = Date.now() - unifiedState.startTime;
        
        // Count recent activity (messages in last check interval)
        const recentCutoff = Date.now() - config.activityCheckInterval;
        const activePollType = Object.values(POLL_TYPES).find(pt => pt.key === unifiedState.activePollType);
        
        const recentMessages = unifiedState.messageBuffer.filter(msg => 
            msg.timestamp > recentCutoff && 
            activePollType.categoryFilter(msg.categories).length > 0
        );

        const recentActivity = recentMessages.length;
        const totalResponses = unifiedState.activeTracker.totalResponses;

        console.log(`[Unified Poll] Activity check: age=${Math.round(pollAge/1000)}s, recentActivity=${recentActivity}, totalResponses=${totalResponses}`);

        // More flexible ending conditions:
        // 1. No recent activity AND poll has run for at least 5 seconds AND has at least 1 response
        // 2. Force end after 30 seconds (reduced from 1 minute)
        const minAge = 5000; // 5 seconds minimum
        const maxAge = 30000; // 30 seconds maximum
        
        if (pollAge >= minAge && recentActivity === 0 && totalResponses >= 1) {
            console.log(`[Unified Poll] Ending poll: no recent activity with ${totalResponses} responses after ${Math.round(pollAge/1000)}s`);
            endPoll(config);
        } else if (pollAge >= maxAge) {
            console.log(`[Unified Poll] Force ending poll after ${Math.round(pollAge/1000)} seconds`);
            endPoll(config);
        }
    }

    // End the active poll
    function endPoll(config) {
        console.log(`[Unified Poll] 🏁 ENDING POLL: ${unifiedState.activePollType} poll with ${unifiedState.activeTracker?.totalResponses || 0} total responses`);
        console.log(`[Unified Poll] 📊 Final counts:`, unifiedState.activeTracker?.counts);
        
        if (unifiedState.activityCheckTimerId) clearInterval(unifiedState.activityCheckTimerId);
        unifiedState.activityCheckTimerId = null;
        
        unifiedState.isConcluded = true;
        console.log(`[Unified Poll] ✅ Poll marked as concluded, broadcasting update...`);
        broadcastPollUpdate();

        // Schedule poll cleanup (clear from display)
        unifiedState.clearTimerId = setTimeout(() => {
            console.log(`[Unified Poll] ⏰ CLEARING poll results after ${config.resultDisplayTime/1000}s display time`);
            clearPollData();
        }, config.resultDisplayTime);

        // Start cooldown period (prevents new polls from starting)
        unifiedState.isOnCooldown = true;
        const cooldownTime = config.cooldownDuration || 5000; // Default 5 second cooldown
        
        unifiedState.cooldownTimerId = setTimeout(() => {
            unifiedState.isOnCooldown = false;
            console.log(`[Unified Poll] Cooldown period ended, new polls can start`);
        }, cooldownTime);
        
        console.log(`[Unified Poll] Results will display for ${config.resultDisplayTime/1000}s, then ${cooldownTime/1000}s cooldown before new polls`);
    }
    
    // Manual poll ending function (for testing or manual control)
    function endPollManually() {
        if (unifiedState.isActive && !unifiedState.isConcluded) {
            const config = getUnifiedPollConfig();
            console.log(`[Unified Poll] Manually ending active poll`);
            endPoll(config);
            return true;
        }
        return false;
    }

    // Clear poll data and reset state
    function clearPollData() {
        unifiedState.isActive = false;
        unifiedState.activePollType = null;
        unifiedState.isConcluded = false;
        unifiedState.activeTracker = null;
        unifiedState.messageBuffer = []; // Clear message buffer
        unifiedState.isOnCooldown = false; // Clear cooldown for testing
        
        // Clear sentiment data as well
        sentimentState.items = {};
        sentimentState.shouldDisplay = false;
        
        // Reset highlight gauge
        unifiedState.highlightGauge.count = 0;
        unifiedState.highlightGauge.recentMax = 0;
        unifiedState.highlightGauge.lastIncrementTime = 0;
        
        if (unifiedState.clearTimerId) clearTimeout(unifiedState.clearTimerId);
        unifiedState.clearTimerId = null;
        
        if (unifiedState.activityCheckTimerId) clearInterval(unifiedState.activityCheckTimerId);
        unifiedState.activityCheckTimerId = null;
        
        if (unifiedState.cooldownTimerId) clearTimeout(unifiedState.cooldownTimerId);
        unifiedState.cooldownTimerId = null;
        
        broadcastPollUpdate();
        
        // Broadcast sentiment clear
        broadcastSentimentUpdate([], getUnifiedPollConfig());
        
        console.log('[Unified Poll] Poll data, sentiment data, message buffer, and cooldown cleared');
    }

    // Broadcast poll state update
    function broadcastPollUpdate() {
        if (!broadcastToPopouts) return;

        // Get sentiment data first to check if it should display
        const currentSentimentData = getSentimentState();
        
        // Determine if poll should be displayed
        const shouldDisplay = unifiedState.isActive || unifiedState.isConcluded || 
                             currentSentimentData.shouldDisplay;

        // Generate winner message for yes/no polls when concluded
        let winnerMessage = "";
        if (unifiedState.isConcluded && unifiedState.activePollType === 'yesno') {
            const counts = unifiedState.activeTracker?.counts || {};
            const yesCount = counts.yes || 0;
            const noCount = counts.no || 0;
            const total = yesCount + noCount;
            
            if (total > 0) {
                if (yesCount > noCount) {
                    winnerMessage = `YES ${Math.round((yesCount/total)*100)}%`;
                } else if (noCount > yesCount) {
                    winnerMessage = `NO ${Math.round((noCount/total)*100)}%`;
                } else {
                    winnerMessage = "Tie!";
                }
            }
        }

        const pollData = {
            type: 'UNIFIED_POLL_UPDATE',
            data: {
                isActive: unifiedState.isActive,
                pollType: unifiedState.activePollType,
                isConcluded: unifiedState.isConcluded,
                shouldDisplay: shouldDisplay,
                counts: unifiedState.activeTracker?.counts || {},
                totalResponses: unifiedState.activeTracker?.totalResponses || 0,
                startTime: unifiedState.startTime,
                winnerMessage: winnerMessage,
                // Include highlight gauge data for sentiment tracking
                highlightGauge: {
                    count: unifiedState.highlightGauge.count,
                    recentMax: unifiedState.highlightGauge.recentMax
                },
                // Include sentiment data (use the one we already got to avoid double computation)
                sentimentData: currentSentimentData
            }
        };

        console.log('[Unified Poll] 📡 Broadcasting poll update:');
        console.log('  - isActive:', pollData.data.isActive);
        console.log('  - isConcluded:', pollData.data.isConcluded);
        console.log('  - shouldDisplay:', pollData.data.shouldDisplay);
        console.log('  - pollType:', pollData.data.pollType);
        console.log('  - counts:', pollData.data.counts);
        console.log('  - totalResponses:', pollData.data.totalResponses);
        
        broadcastToPopouts(pollData);
    }

    // Get current unified poll state
    function getUnifiedPollState() {
        // Get sentiment data first to check if it should display
        const currentSentimentData = getSentimentState();
        
        // Determine if poll should be displayed (same logic as broadcastPollUpdate)
        const shouldDisplay = unifiedState.isActive || unifiedState.isConcluded || 
                             currentSentimentData.shouldDisplay;
        
        return {
            isActive: unifiedState.isActive,
            pollType: unifiedState.activePollType,
            isConcluded: unifiedState.isConcluded,
            shouldDisplay: shouldDisplay,
            counts: unifiedState.activeTracker?.counts || {},
            totalResponses: unifiedState.activeTracker?.totalResponses || 0,
            startTime: unifiedState.startTime,
            // Include sentiment data (use the one we already got)
            sentimentData: currentSentimentData
        };
    }

    // Get highlight gauge state
    function getUnifiedGaugeState() {
        return {
            occurrenceCount: unifiedState.highlightGauge.count,
            recentMaxValue: unifiedState.highlightGauge.recentMax,
            lastIncrementTime: unifiedState.highlightGauge.lastIncrementTime
        };
    }

    // Test function to verify categorization
    function testMessageCategorization() {
        const config = getUnifiedPollConfig();
        const testMessages = [
            { text: "yes", images: [], expected: ['yesno:yes'] },
            { text: "no", images: [], expected: ['yesno:no'] },
            { text: "5", images: [], expected: ['number:5'] },
            { text: "a", images: [], expected: ['letter:a'] },
            { text: "hello world", images: [], expected: ['sentiment:hello world'] },
            { text: "+2", images: [], expected: ['sentiment:+2'] },
            { text: "lol", images: [], expected: ['sentiment:lol'] }
        ];
        
        console.log('[Unified Poll] Testing message categorization:');
        testMessages.forEach(test => {
            const categories = categorizeMessage(test.text, test.images, config);
            const result = categories.map(c => `${c.type}:${c.value}`);
            const passed = JSON.stringify(result) === JSON.stringify(test.expected);
            console.log(`  "${test.text}" -> ${result.join(', ')} ${passed ? '✓' : '✗'}`);
        });
    }

    // Sentiment tracking functions (always-on, independent of polls)
    function processSentimentTracking(message, config) {
        if (!config.sentiment?.enabled) {
            console.log('[Unified Poll] 💭 Sentiment tracking disabled');
            return;
        }

        const sentimentCategories = message.categories.filter(c => c.type === 'sentiment');
        const emoteCategories = message.categories.filter(c => c.type === 'emote');
        
        // Combine sentiment and emote categories for processing
        const allSentimentItems = [
            ...sentimentCategories,
            ...emoteCategories.map(emote => ({
                type: 'sentiment',
                value: emote.value, // This is the alt text or src
                emoteData: emote.emoteData // Pass through emote data for display
            }))
        ];
        
        if (allSentimentItems.length === 0) return;

        console.log('[Unified Poll] 💭 Processing sentiment categories:', sentimentCategories.length, 'and emote categories:', emoteCategories.length);

        // Deduplicate items - each unique term should only count once per message
        const uniqueItems = new Map();
        allSentimentItems.forEach(item => {
            if (!uniqueItems.has(item.value)) {
                uniqueItems.set(item.value, item);
            }
        });
        
        const deduplicatedItems = Array.from(uniqueItems.values());
        console.log('[Unified Poll] 💭 Deduplicated from', allSentimentItems.length, 'to', deduplicatedItems.length, 'unique items');

        const currentTime = Date.now();
        
        deduplicatedItems.forEach(category => {
            const term = category.value;
            
            // Skip blocked terms
            if (config.sentiment.blockList?.includes(term.toLowerCase())) {
                console.log('[Unified Poll] 💭 Blocked sentiment term:', term);
                return;
            }

            // Skip yes/no terms if a yes/no poll is active to avoid confusion
            if (unifiedState.isActive && unifiedState.activePollType === 'yesno') {
                const yesNoTerms = ['yes', 'y', 'no', 'n'];
                if (yesNoTerms.includes(term.toLowerCase())) {
                    console.log('[Unified Poll] 💭 Skipping yes/no term during active yes/no poll:', term);
                    return;
                }
            }

            // Check if term belongs to a custom group
            let groupMatch = null;
            if (config.sentiment.groups && config.sentiment.groups.length > 0) {
                groupMatch = config.sentiment.groups.find(group => 
                    group.words && group.words.some(groupWord => {
                        if (group.partialMatch) {
                            // Partial matching - check if term contains the group word or vice versa
                            return term.toLowerCase().includes(groupWord.toLowerCase()) ||
                                   groupWord.toLowerCase().includes(term.toLowerCase());
                        } else {
                            // Exact matching
                            return groupWord.toLowerCase() === term.toLowerCase();
                        }
                    })
                );
            }

            // Use group label if term is in a group, otherwise use the term itself
            const trackingKey = groupMatch ? groupMatch.label : term;
            
            // Update or create sentiment item
            if (!sentimentState.items[trackingKey]) {
                sentimentState.items[trackingKey] = {
                    count: 0,
                    lastSeen: 0,
                    isGroup: !!groupMatch,
                    emoteData: category.emoteData // Store emote data if available
                };
            }

            sentimentState.items[trackingKey].count++;
            sentimentState.items[trackingKey].lastSeen = currentTime;
            console.log('[Unified Poll] 💭 Updated sentiment:', trackingKey, 'count:', sentimentState.items[trackingKey].count, groupMatch ? '(group)' : '(individual)');
        });

        // Check if we should display sentiment tracking
        updateSentimentDisplay(config);
    }

    function updateSentimentDisplay(config) {
        const threshold = config.sentiment?.activationThreshold || 15;
        const maxItems = config.sentiment?.maxDisplayItems || 5;
        
        console.log('[Unified Poll] 💭 Checking sentiment display - threshold:', threshold);
        console.log('[Unified Poll] 💭 Current sentiment items:', sentimentState.items);
        
        // Get items that meet the display threshold, sorted by count
        const displayItems = Object.entries(sentimentState.items)
            .filter(([term, data]) => data.count >= threshold)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, maxItems);

        console.log('[Unified Poll] 💭 Items meeting threshold:', displayItems);

        const wasDisplaying = sentimentState.shouldDisplay;
        sentimentState.shouldDisplay = displayItems.length > 0;

        console.log('[Unified Poll] 💭 Sentiment display state - was:', wasDisplaying, 'now:', sentimentState.shouldDisplay);

        // Only broadcast if display state changed or we have items to show
        if (sentimentState.shouldDisplay || wasDisplaying !== sentimentState.shouldDisplay) {
            console.log('[Unified Poll] 💭 Broadcasting sentiment update!');
            broadcastPollUpdate(); // Use unified broadcast instead of separate sentiment broadcast
        }
    }

    function startSentimentDecay(config) {
        if (sentimentState.decayInterval) {
            clearInterval(sentimentState.decayInterval);
        }

        const decayInterval = config.behavior?.decayInterval || 500;
        const decayAmount = 1; // Always decay by 1 per interval for sentiment

        sentimentState.decayInterval = setInterval(() => {
            const currentTime = Date.now();
            let hasChanges = false;

            Object.entries(sentimentState.items).forEach(([term, data]) => {
                if (data.count > 0) {
                    data.count = Math.max(0, data.count - decayAmount);
                    hasChanges = true;
                }
            });

            // Remove items that have decayed to 0
            Object.keys(sentimentState.items).forEach(term => {
                if (sentimentState.items[term].count === 0) {
                    delete sentimentState.items[term];
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                updateSentimentDisplay(config);
            }

            sentimentState.lastDecayTime = currentTime;
        }, decayInterval);
    }

    function broadcastSentimentUpdate(displayItems, config) {
        if (!broadcastToPopouts) return;

        const sentimentData = {
            type: 'sentiment',
            isActive: sentimentState.shouldDisplay,
            shouldDisplay: sentimentState.shouldDisplay,
            items: displayItems.map(([term, data]) => ({
                term,
                count: data.count,
                percentage: Math.min(100, (data.count / (config.sentiment?.maxGaugeValue || 30)) * 100),
                emoteData: data.emoteData // Pass through emote data for display
            })),
            maxDisplayItems: config.sentiment?.maxDisplayItems || 5,
            maxGrowthWidth: config.sentiment?.maxGrowthWidth || 150
        };

        broadcastToPopouts({
            type: 'sentiment_update',
            data: sentimentData
        });

        console.log('[Unified Poll] Broadcasted sentiment update:', sentimentData);
    }

    function getSentimentState() {
        const config = getUnifiedPollConfig();
        const threshold = config.sentiment?.activationThreshold || 15;
        const maxItems = config.sentiment?.maxDisplayItems || 5;
        
        const displayItems = Object.entries(sentimentState.items)
            .filter(([term, data]) => {
                // Filter by threshold
                if (data.count < threshold) return false;
                
                // Skip yes/no terms if a yes/no poll is active
                if (unifiedState.isActive && unifiedState.activePollType === 'yesno') {
                    const yesNoTerms = ['yes', 'y', 'no', 'n'];
                    if (yesNoTerms.includes(term.toLowerCase())) {
                        return false;
                    }
                }
                
                return true;
            })
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, maxItems);

        const sentimentStateData = {
            type: 'sentiment',
            isActive: sentimentState.shouldDisplay,
            shouldDisplay: sentimentState.shouldDisplay,
            items: displayItems.map(([term, data]) => ({
                term,
                count: data.count,
                percentage: Math.min(100, (data.count / (config.sentiment?.maxGaugeValue || 30)) * 100),
                emoteData: data.emoteData // Pass through emote data for display
            })),
            allItems: sentimentState.items, // For debugging
            maxDisplayItems: config.sentiment?.maxDisplayItems || 5,
            maxGrowthWidth: config.sentiment?.maxGrowthWidth || 150
        };

        console.log('[Unified Poll] 💭 getSentimentState returning:', sentimentStateData);
        return sentimentStateData;
    }

    // Highlight gauge decay functions
    function startHighlightGaugeDecay(config) {
        if (highlightGaugeDecayInterval) {
            clearInterval(highlightGaugeDecayInterval);
        }

        const decayInterval = config.behavior?.decayInterval || 500;
        const decayAmount = config.behavior?.decayAmount || 1;

        highlightGaugeDecayInterval = setInterval(() => {
            const currentTime = Date.now();
            
            // Only decay if gauge count is > 0 and enough time has passed since last increment
            if (unifiedState.highlightGauge.count > 0 && 
                (currentTime - unifiedState.highlightGauge.lastIncrementTime >= decayInterval)) {
                
                unifiedState.highlightGauge.count = Math.max(0, unifiedState.highlightGauge.count - decayAmount);
                
                // Reset recentMax if count reaches 0
                if (unifiedState.highlightGauge.count === 0) {
                    setTimeout(() => {
                        if (unifiedState.highlightGauge.count === 0) {
                            unifiedState.highlightGauge.recentMax = 0;
                            if (broadcastGaugeUpdate) {
                                broadcastGaugeUpdate();
                            }
                        }
                    }, config.behavior?.recentMaxResetDelay || 2000);
                }
                
                if (broadcastGaugeUpdate) {
                    broadcastGaugeUpdate();
                }
                
                console.log(`[Unified Poll] Highlight gauge decayed: count=${unifiedState.highlightGauge.count}, recentMax=${unifiedState.highlightGauge.recentMax}`);
            }
        }, decayInterval);
        
        console.log(`[Unified Poll] Started highlight gauge decay: interval=${decayInterval}ms, amount=${decayAmount}`);
    }

    // Export functions for use by background script
    global.UnifiedPolling = {
        initializeUnifiedPolling,
        updateUnifiedPollingSettings,
        processUnifiedMessage,
        getUnifiedPollState,
        getUnifiedGaugeState,
        getSentimentState,
        clearPollData,
        endPollManually, // Manual poll ending
        
        // For testing/debugging
        getUnifiedPollConfig,
        categorizeMessage,
        testMessageCategorization,
        POLL_TYPES
    };

})(typeof globalThis !== 'undefined' ? globalThis : 
   typeof window !== 'undefined' ? window : global);