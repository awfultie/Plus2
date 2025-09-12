// Unified Polling System
// Consolidates all polling types (yes/no, numbers, letters, sentiment)
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
        
    };

    // Separate sentiment tracking state (always-on, independent of polls)
    let sentimentState = {
        items: {}, // { term: { count: number, lastSeen: timestamp } }
        displayTimes: {}, // { term: timestamp } - when item first met threshold
        lastDecayTime: Date.now(),
        decayInterval: null,
        shouldDisplay: false,
        lastItemCount: 0 // Track display item count to detect changes
    };


    // External dependencies (injected during initialization)
    let settings = {};
    let broadcastToPopouts = null;
    let broadcastPollUpdate = null;
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
        broadcastPollUpdate = deps.broadcastPollUpdate;
        webhookClient = deps.webhookClient;
        
        // Start sentiment decay process
        const config = getUnifiedPollConfig();
        startSentimentDecay(config);
        
        
    }

    // Update settings when they change
    function updateUnifiedPollingSettings(newSettings) {
        settings = newSettings;
        
        // Restart sentiment decay with new settings
        const config = getUnifiedPollConfig();
        startSentimentDecay(config);
        
        
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
                recentMaxResetDelay: settings.polling?.unified?.recentMaxResetDelay || settings.behavior?.recentMaxResetDelay || 2000,
                maxActivePollDuration: settings.polling?.unifiedPolling?.behavior?.maxActivePollDuration || 30000
            },
            
            // Poll type activation settings - corrected to use unifiedPolling paths
            yesnoActivation: {
                threshold: settings.polling?.unifiedPolling?.yesno?.activationThreshold || settings.polling?.types?.yesno?.activationThreshold || 3,
                enabled: settings.polling?.unifiedPolling?.yesno?.enabled !== false
            },
            numbersActivation: {
                threshold: settings.polling?.unifiedPolling?.numbers?.activationThreshold || settings.polling?.types?.numbers?.activationThreshold || 7,
                enabled: settings.polling?.unifiedPolling?.numbers?.enabled !== false,
                maxDigits: settings.polling?.unifiedPolling?.numbers?.maxDigits || 4
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
                minimumDisplayTime: settings.polling?.unifiedPolling?.sentiment?.minimumDisplayTime || 2000,
                decayInterval: settings.polling?.unifiedPolling?.sentiment?.decayInterval || 500,
                decayAmount: settings.polling?.unifiedPolling?.sentiment?.decayAmount || 1,
                groups: (() => {
                    try {
                        return JSON.parse(settings.polling?.unifiedPolling?.sentiment?.groups || '[]');
                    } catch (e) {
                        return [];
                    }
                })(),
                blockList: (settings.polling?.unifiedPolling?.sentiment?.blockList || '').split(',').map(w => w.trim()).filter(w => w.length > 0)
            },
            
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


        // Add to message buffer and clean old messages
        unifiedState.messageBuffer.push(unifiedMessage);
        cleanMessageBuffer(currentTime, config);


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

        // 2. Numbers (integers only, configurable max digits)
        const maxDigits = config.numbersActivation?.maxDigits || 4;
        const numberRegex = new RegExp(`^\\d{1,${maxDigits}}$`);
        if (numberRegex.test(trimmedText)) {
            categories.push({ type: 'number', value: parseInt(trimmedText, 10) });
        }

        // 3. Single letters
        if (/^[a-zA-Z]$/.test(trimmedText)) {
            categories.push({ type: 'letter', value: trimmedText.toLowerCase() });
        }

        // 4. Sentiment/words (longer text, not just numbers)
        if (trimmedText.length > 1 && !/^\d+$/.test(trimmedText)) {
            // Skip yes/no terms from sentiment categorization when yes/no poll is active
            const yesNoTerms = ['yes', 'y', 'no', 'n'];
            const isYesNoTerm = yesNoTerms.includes(trimmedText.toLowerCase());
            const yesNoPollActive = unifiedState.isActive && unifiedState.activePollType === 'yesno';
            
            if (!(isYesNoTerm && yesNoPollActive)) {
                categories.push({ type: 'sentiment', value: trimmedText.toLowerCase() });
            }
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

    // Yes/No detection logic - exact word boundary matching only
    function matchYesNo(text, images) {
        // Use regex with word boundaries to match only complete words
        // This prevents "nothing" from matching "no" or "yesterday" from matching "yes"
        const yesRegex = /\b(yes|y)\b/i;
        const noRegex = /\b(no|n)\b/i;
        
        let isYes = yesRegex.test(text);
        let isNo = noRegex.test(text);

        // Also check image alt text
        if (!isYes && !isNo) {
            const alts = images.map(img => img.alt || '').join(' ');
            if (alts) {
                isYes = yesRegex.test(alts);
                isNo = noRegex.test(alts);
            }
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


    // Check if any poll type should be activated
    function checkPollActivation(config) {
        // Get all categorized messages in buffer
        const categorizedMessages = unifiedState.messageBuffer.filter(msg => msg.categories.length > 0);
        

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
            const lettersAboveThreshold = Object.keys(letterCounts)
                .filter(letter => letterCounts[letter] >= individualThreshold);
            
            // If only 'y' and 'n' are above threshold, skip letter poll to allow yes/no poll
            // This prevents letter polls from activating when users are actually voting yes/no
            if (lettersAboveThreshold.length === 2 && 
                lettersAboveThreshold.includes('y') && 
                lettersAboveThreshold.includes('n')) {
                return false; // Don't activate letter poll, let yes/no poll potentially activate instead
            }
            
            if (lettersAboveThreshold.length >= 2) {
                activatePoll(pollType, relevantMessages);
                return true;
            } else {
                return false;
            }
        } else if (relevantMessages.length >= threshold) {
            activatePoll(pollType, relevantMessages);
            return true;
        }
        
        return false;
    }

    // Activate a specific poll type
    function activatePoll(pollType, messages) {
        unifiedState.isActive = true;
        unifiedState.activePollType = pollType.key;
        unifiedState.startTime = Date.now();
        unifiedState.isConcluded = false;
        
        // Clear yes/no terms from sentiment tracking when yes/no poll becomes active
        if (pollType.key === 'yesno') {
            const yesNoTerms = ['yes', 'y', 'no', 'n'];
            yesNoTerms.forEach(term => {
                if (sentimentState.items[term]) {
                    delete sentimentState.items[term];
                    delete sentimentState.displayTimes[term];
                }
            });
            // Update sentiment display after clearing terms
            const config = getUnifiedPollConfig();
            updateSentimentDisplay(config);
        }

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

        // Send poll activation webhook
        if (webhookClient) {
            webhookClient.sendEvent('unified_poll_activation', {
                pollType: pollType.key,
                activationThreshold: config[pollType.key]?.activationThreshold || 0,
                priority: pollType.priority,
                startTime: unifiedState.startTime
            });
        }

        internalBroadcastPollUpdate();
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
            internalBroadcastPollUpdate();
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

        // More flexible ending conditions:
        // 1. No recent activity AND poll has run for at least 5 seconds AND has at least 1 response
        // 2. Force end after configured maximum duration
        const minAge = 5000; // 5 seconds minimum
        const maxAge = config.behavior?.maxActivePollDuration || 30000; // Use configured value or default
        
        if (pollAge >= minAge && recentActivity === 0 && totalResponses >= 1) {
            endPoll(config);
        } else if (pollAge >= maxAge) {
            endPoll(config);
        }
    }

    // End the active poll
    function endPoll(config) {
        if (unifiedState.activityCheckTimerId) clearInterval(unifiedState.activityCheckTimerId);
        unifiedState.activityCheckTimerId = null;
        
        unifiedState.isConcluded = true;
        
        // Send poll conclusion webhook
        if (webhookClient) {
            const duration = Date.now() - unifiedState.startTime;
            const totalResponses = unifiedState.activeTracker?.totalResponses || 0;
            let winnerMessage = "";
            
            // Generate winner message for yes/no polls
            if (unifiedState.activePollType === 'yesno') {
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
            
            webhookClient.sendEvent('unified_poll_conclusion', {
                pollType: unifiedState.activePollType,
                duration,
                totalResponses,
                winnerMessage
            });
        }
        
        internalBroadcastPollUpdate();

        // Schedule poll cleanup (clear from display)
        unifiedState.clearTimerId = setTimeout(() => {
            clearPollData();
        }, config.resultDisplayTime);

        // Start cooldown period (prevents new polls from starting)
        unifiedState.isOnCooldown = true;
        const cooldownTime = config.cooldownDuration || 5000; // Default 5 second cooldown
        
        unifiedState.cooldownTimerId = setTimeout(() => {
            unifiedState.isOnCooldown = false;
        }, cooldownTime);
    }
    
    // Manual poll ending function (for testing or manual control)
    function endPollManually() {
        if (unifiedState.isActive && !unifiedState.isConcluded) {
            const config = getUnifiedPollConfig();
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
        sentimentState.displayTimes = {};
        sentimentState.shouldDisplay = false;
        
        
        if (unifiedState.clearTimerId) clearTimeout(unifiedState.clearTimerId);
        unifiedState.clearTimerId = null;
        
        if (unifiedState.activityCheckTimerId) clearInterval(unifiedState.activityCheckTimerId);
        unifiedState.activityCheckTimerId = null;
        
        if (unifiedState.cooldownTimerId) clearTimeout(unifiedState.cooldownTimerId);
        unifiedState.cooldownTimerId = null;
        
        internalBroadcastPollUpdate();
        
        // Broadcast sentiment clear
        broadcastSentimentUpdate([], getUnifiedPollConfig());
    }

    // Broadcast poll state update (internal function)
    function internalBroadcastPollUpdate() {
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
                // Include sentiment data (use the one we already got to avoid double computation)
                sentimentData: currentSentimentData
            }
        };

        broadcastToPopouts(pollData);

        // Send unified polling data to webhooks
        if (webhookClient) {
            sendUnifiedPollingWebhooks(pollData, currentSentimentData);
        }
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

    // Send unified polling data to webhooks
    function sendUnifiedPollingWebhooks(pollData, sentimentData) {
        if (!webhookClient) return;

        const currentTime = Date.now();
        const isActive = unifiedState.isActive;
        const isConcluded = unifiedState.isConcluded;
        const activePollType = unifiedState.activePollType;
        
        // Send poll-specific webhook events
        if (isActive || isConcluded) {
            const counts = unifiedState.activeTracker?.counts || {};
            const totalResponses = unifiedState.activeTracker?.totalResponses || 0;
            const startTime = unifiedState.startTime;
            const activeDuration = currentTime - startTime;

            if (activePollType === 'yesno') {
                const yesCount = counts.yes || 0;
                const noCount = counts.no || 0;
                const total = yesCount + noCount;
                
                let winnerMessage = "";
                if (isConcluded && total > 0) {
                    if (yesCount > noCount) {
                        winnerMessage = `YES ${Math.round((yesCount/total)*100)}%`;
                    } else if (noCount > yesCount) {
                        winnerMessage = `NO ${Math.round((noCount/total)*100)}%`;
                    } else {
                        winnerMessage = "Tie!";
                    }
                }

                webhookClient.sendEvent('unified_yesno_poll', {
                    yesCount,
                    noCount,
                    total,
                    isActive,
                    isConcluded,
                    startTime,
                    activeDuration: isConcluded ? activeDuration : undefined,
                    winnerMessage,
                    shouldDisplay: pollData.data.shouldDisplay
                });
            }

            if (activePollType === 'numbers') {
                const topNumbers = Object.entries(counts)
                    .map(([number, count]) => ({ number, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);

                webhookClient.sendEvent('unified_numbers_poll', {
                    counts,
                    totalResponses,
                    isActive,
                    isConcluded,
                    startTime,
                    activeDuration: isConcluded ? activeDuration : undefined,
                    topNumbers,
                    shouldDisplay: pollData.data.shouldDisplay
                });
            }

            if (activePollType === 'letters') {
                const topLetters = Object.entries(counts)
                    .map(([letter, count]) => ({ letter, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);

                webhookClient.sendEvent('unified_letters_poll', {
                    counts,
                    totalResponses,
                    isActive,
                    isConcluded,
                    startTime,
                    activeDuration: isConcluded ? activeDuration : undefined,
                    topLetters,
                    shouldDisplay: pollData.data.shouldDisplay
                });
            }
        }

        // Always send sentiment data if it should be displayed
        if (sentimentData && sentimentData.shouldDisplay) {
            webhookClient.sendEvent('unified_sentiment_update', {
                items: sentimentData.items,
                shouldDisplay: sentimentData.shouldDisplay,
                maxDisplayItems: sentimentData.maxDisplayItems,
                maxGrowthWidth: sentimentData.maxGrowthWidth
            });
        }
    }

    // Test function to verify categorization
    function testMessageCategorization() {
        const config = getUnifiedPollConfig();
        const testMessages = [
            // Basic yes/no matches (should match)
            { text: "yes", images: [], expected: ['yesno:yes'] },
            { text: "no", images: [], expected: ['yesno:no'] },
            { text: "y", images: [], expected: ['yesno:yes'] },
            { text: "n", images: [], expected: ['yesno:no'] },
            { text: "YES", images: [], expected: ['yesno:yes'] },
            { text: "NO", images: [], expected: ['yesno:no'] },
            { text: "Y", images: [], expected: ['yesno:yes'] },
            { text: "N", images: [], expected: ['yesno:no'] },
            { text: "Yes", images: [], expected: ['yesno:yes'] },
            { text: "No", images: [], expected: ['yesno:no'] },
            
            // Word boundary cases (should match)
            { text: "yes!", images: [], expected: ['yesno:yes'] },
            { text: "no?", images: [], expected: ['yesno:no'] },
            { text: "I vote yes", images: [], expected: ['yesno:yes'] },
            { text: "definitely no", images: [], expected: ['yesno:no'] },
            { text: "y.", images: [], expected: ['yesno:yes'] },
            { text: "n.", images: [], expected: ['yesno:no'] },
            
            // Partial word cases (should NOT match)
            { text: "nothing", images: [], expected: ['sentiment:nothing'] },
            { text: "yesterday", images: [], expected: ['sentiment:yesterday'] },
            { text: "I am no longer happy", images: [], expected: ['sentiment:I am no longer happy'] },
            { text: "noob", images: [], expected: ['sentiment:noob'] },
            { text: "yep", images: [], expected: ['sentiment:yep'] },
            { text: "nope", images: [], expected: ['sentiment:nope'] },
            
            // Other categories
            { text: "5", images: [], expected: ['number:5'] },
            { text: "a", images: [], expected: ['letter:a'] },
            { text: "hello world", images: [], expected: ['sentiment:hello world'] },
            { text: "+2", images: [], expected: ['sentiment:+2'] },
            { text: "lol", images: [], expected: ['sentiment:lol'] }
        ];
        
        console.log('[Unified Polling] Running yes/no matching tests...');
        let passCount = 0;
        let failCount = 0;
        
        testMessages.forEach(test => {
            const categories = categorizeMessage(test.text, test.images, config);
            const result = categories.map(c => `${c.type}:${c.value}`);
            const passed = JSON.stringify(result) === JSON.stringify(test.expected);
            
            if (passed) {
                passCount++;
            } else {
                failCount++;
                console.log(`[Test FAIL] Text: "${test.text}" | Expected: ${JSON.stringify(test.expected)} | Got: ${JSON.stringify(result)}`);
            }
        });
        
        console.log(`[Unified Polling] Tests complete: ${passCount} passed, ${failCount} failed`);
    }

    // Test function specifically for letter/yes-no poll conflict resolution
    function testLetterYesNoConflict() {
        console.log('[Unified Polling] Testing letter vs yes/no poll conflict resolution...');
        
        const config = getUnifiedPollConfig();
        
        // Simulate message buffer with y/n letters that should NOT trigger letter poll
        const messages = [
            { category: { type: 'letter', value: 'y' }, timestamp: Date.now() },
            { category: { type: 'letter', value: 'y' }, timestamp: Date.now() },
            { category: { type: 'letter', value: 'y' }, timestamp: Date.now() },
            { category: { type: 'letter', value: 'n' }, timestamp: Date.now() },
            { category: { type: 'letter', value: 'n' }, timestamp: Date.now() },
            { category: { type: 'letter', value: 'n' }, timestamp: Date.now() }
        ];
        
        // Get letter poll type
        const lettersPollType = Object.values(POLL_TYPES).find(type => type.key === 'letters');
        
        // Test the letter counts and threshold logic manually
        const letterCounts = {};
        messages.forEach(msg => {
            const letter = msg.category.value;
            letterCounts[letter] = (letterCounts[letter] || 0) + 1;
        });
        
        const individualThreshold = config.lettersActivation?.individualThreshold || 3;
        const lettersAboveThreshold = Object.keys(letterCounts)
            .filter(letter => letterCounts[letter] >= individualThreshold);
        
        const shouldSkipLetterPoll = lettersAboveThreshold.length === 2 && 
            lettersAboveThreshold.includes('y') && 
            lettersAboveThreshold.includes('n');
        
        console.log(`[Test] Letter counts:`, letterCounts);
        console.log(`[Test] Letters above threshold (${individualThreshold}):`, lettersAboveThreshold);
        console.log(`[Test] Should skip letter poll for y/n only scenario:`, shouldSkipLetterPoll);
        
        if (shouldSkipLetterPoll) {
            console.log('✅ [Test PASS] Letter poll correctly skipped when only y/n above threshold');
        } else {
            console.log('❌ [Test FAIL] Letter poll should be skipped when only y/n above threshold');
        }
        
        console.log('[Unified Polling] Letter vs yes/no conflict test complete');
    }

    // Sentiment tracking functions (always-on, independent of polls)
    function processSentimentTracking(message, config) {
        if (!config.sentiment?.enabled) {
            return;
        }

        const sentimentCategories = message.categories.filter(c => c.type === 'sentiment');
        const emoteCategories = message.categories.filter(c => c.type === 'emote');
        
        // Include letter categories when no letter poll is active
        let letterCategories = [];
        if (!unifiedState.isActive || unifiedState.activePollType !== 'letter') {
            letterCategories = message.categories.filter(c => c.type === 'letter');
        }
        
        // Combine sentiment, emote, and letter categories for processing
        const allSentimentItems = [
            ...sentimentCategories,
            ...emoteCategories.map(emote => ({
                type: 'sentiment',
                value: emote.value, // This is the alt text or src
                emoteData: emote.emoteData // Pass through emote data for display
            })),
            ...letterCategories.map(letter => ({
                type: 'sentiment',
                value: letter.value // Single letter as sentiment
            }))
        ];
        
        if (allSentimentItems.length === 0) return;

        // Deduplicate items - each unique term should only count once per message
        const uniqueItems = new Map();
        allSentimentItems.forEach(item => {
            if (!uniqueItems.has(item.value)) {
                uniqueItems.set(item.value, item);
            }
        });
        
        const deduplicatedItems = Array.from(uniqueItems.values());

        const currentTime = Date.now();
        
        deduplicatedItems.forEach(category => {
            const term = category.value;
            
            // Skip blocked terms
            if (config.sentiment.blockList?.includes(term.toLowerCase())) {
                return;
            }

            // Skip yes/no terms if a yes/no poll is active to avoid confusion
            if (unifiedState.isActive && unifiedState.activePollType === 'yesno') {
                const yesNoTerms = ['yes', 'y', 'no', 'n'];
                if (yesNoTerms.includes(term.toLowerCase())) {
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
        });

        // Check if we should display sentiment tracking
        updateSentimentDisplay(config);
    }

    function updateSentimentDisplay(config) {
        const threshold = config.sentiment?.activationThreshold || 15;
        const maxItems = config.sentiment?.maxDisplayItems || 5;
        const minimumDisplayTime = config.sentiment?.minimumDisplayTime || 2000;
        const now = Date.now();
        
        // Track when items first meet threshold
        Object.entries(sentimentState.items).forEach(([term, data]) => {
            if (data.count >= threshold && !sentimentState.displayTimes[term]) {
                sentimentState.displayTimes[term] = now;
            }
        });
        
        // Get items that should be displayed (meet threshold OR within minimum display time)
        const displayItems = Object.entries(sentimentState.items)
            .filter(([term, data]) => {
                const meetsThreshold = data.count >= threshold;
                const firstDisplayTime = sentimentState.displayTimes[term];
                const withinMinimumTime = firstDisplayTime && (now - firstDisplayTime) < minimumDisplayTime;
                
                return meetsThreshold || withinMinimumTime;
            })
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, maxItems);
            
        // Clean up displayTimes for items that are no longer needed
        Object.keys(sentimentState.displayTimes).forEach(term => {
            const data = sentimentState.items[term];
            const firstDisplayTime = sentimentState.displayTimes[term];
            if (!data || (data.count < threshold && (now - firstDisplayTime) >= minimumDisplayTime)) {
                delete sentimentState.displayTimes[term];
            }
        });

        const wasDisplaying = sentimentState.shouldDisplay;
        sentimentState.shouldDisplay = displayItems.length > 0;

        // Always broadcast when there are changes to ensure UI updates
        // This ensures gauges are removed when items decay to 0
        if (sentimentState.shouldDisplay || wasDisplaying !== sentimentState.shouldDisplay || displayItems.length !== sentimentState.lastItemCount) {
            sentimentState.lastItemCount = displayItems.length;
            internalBroadcastPollUpdate(); // Use unified broadcast instead of separate sentiment broadcast
        }
    }

    function startSentimentDecay(config) {
        if (sentimentState.decayInterval) {
            clearInterval(sentimentState.decayInterval);
        }

        const decayInterval = config.sentiment?.decayInterval || config.behavior?.decayInterval || 500;
        const decayAmount = config.sentiment?.decayAmount || 1;

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

    // Helper function to create enhanced sentiment item data
    function createEnhancedSentimentItem(term, data, config) {
        const item = {
            term,
            count: data.count,
            percentage: Math.min(100, (data.count / (config.sentiment?.maxGaugeValue || 30)) * 100)
        };

        // Debug logging for enhanced sentiment data creation
        // console.log(`[Plus2] Creating enhanced sentiment item for "${term}":`, { originalData: data, config: config.sentiment });

        // Add color information
        // Check if this term belongs to a group with a color
        if (config.sentiment.groups && config.sentiment.groups.length > 0) {
            const groupMatch = config.sentiment.groups.find(group => 
                group.words && group.words.some(groupWord => {
                    if (group.partialMatch) {
                        return term.toLowerCase().includes(groupWord.toLowerCase()) ||
                               groupWord.toLowerCase().includes(term.toLowerCase());
                    } else {
                        return groupWord.toLowerCase() === term.toLowerCase();
                    }
                })
            );
            
            if (groupMatch && groupMatch.color) {
                item.color = groupMatch.color;
            }
        }
        
        // If no group color, use base color from config
        if (!item.color) {
            item.color = config.sentiment?.baseColor || '#2196F3';
        }

        // Add enhanced emote information
        if (data.emoteData) {
            // Convert legacy emoteData to new emote format
            if (data.emoteData.src || data.emoteData.alt) {
                item.emote = {
                    name: data.emoteData.alt || term,
                    url: data.emoteData.src || data.emoteData.url || term
                };
                
                // Determine emote source from URL patterns
                const url = item.emote.url;
                if (url.includes('static-cdn.jtvnw.net')) {
                    item.emote.source = 'twitch';
                } else if (url.includes('cdn.7tv.app')) {
                    item.emote.source = '7tv';
                } else if (url.includes('cdn.frankerfacez.com')) {
                    item.emote.source = 'ffz';
                } else if (url.includes('cdn.betterttv.net')) {
                    item.emote.source = 'bttv';
                }
            }
            
            // Keep legacy emoteData for backward compatibility
            item.emoteData = data.emoteData;
        }

        // console.log(`[Plus2] Enhanced sentiment item result for "${term}":`, item);
        return item;
    }

    function broadcastSentimentUpdate(displayItems, config) {
        if (!broadcastToPopouts) return;

        const sentimentData = {
            type: 'sentiment',
            isActive: sentimentState.shouldDisplay,
            shouldDisplay: sentimentState.shouldDisplay,
            items: displayItems.map(([term, data]) => createEnhancedSentimentItem(term, data, config)),
            maxDisplayItems: config.sentiment?.maxDisplayItems || 5,
            maxGrowthWidth: config.sentiment?.maxGrowthWidth || 150
        };

        broadcastToPopouts({
            type: 'sentiment_update',
            data: sentimentData
        });
    }

    function getSentimentState() {
        const config = getUnifiedPollConfig();
        const threshold = config.sentiment?.activationThreshold || 15;
        const maxItems = config.sentiment?.maxDisplayItems || 5;
        const minimumDisplayTime = config.sentiment?.minimumDisplayTime || 2000;
        const now = Date.now();
        
        const displayItems = Object.entries(sentimentState.items)
            .filter(([term, data]) => {
                // Filter by threshold OR minimum display time
                const meetsThreshold = data.count >= threshold;
                const firstDisplayTime = sentimentState.displayTimes[term];
                const withinMinimumTime = firstDisplayTime && (now - firstDisplayTime) < minimumDisplayTime;
                
                if (!meetsThreshold && !withinMinimumTime) return false;
                
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
            items: displayItems.map(([term, data]) => createEnhancedSentimentItem(term, data, config)),
            allItems: sentimentState.items, // For debugging
            maxDisplayItems: config.sentiment?.maxDisplayItems || 5,
            maxGrowthWidth: config.sentiment?.maxGrowthWidth || 150
        };

        return sentimentStateData;
    }


    // Export functions for use by background script
    global.UnifiedPolling = {
        initializeUnifiedPolling,
        updateUnifiedPollingSettings,
        processUnifiedMessage,
        getUnifiedPollState,
        getSentimentState,
        clearPollData,
        endPollManually, // Manual poll ending
        
        // For testing/debugging
        getUnifiedPollConfig,
        categorizeMessage,
        testMessageCategorization,
        testLetterYesNoConflict,
        POLL_TYPES
    };

})(typeof globalThis !== 'undefined' ? globalThis : 
   typeof window !== 'undefined' ? window : global);