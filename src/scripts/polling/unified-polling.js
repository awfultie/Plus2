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
        shouldDisplay: false
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
                recentMaxResetDelay: settings.polling?.unified?.recentMaxResetDelay || settings.behavior?.recentMaxResetDelay || 2000
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
            const lettersAboveIndividualThreshold = Object.values(letterCounts)
                .filter(count => count >= individualThreshold).length;
            
            if (lettersAboveIndividualThreshold >= 2) {
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
        // 2. Force end after 30 seconds (reduced from 1 minute)
        const minAge = 5000; // 5 seconds minimum
        const maxAge = 30000; // 30 seconds maximum
        
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
        
        testMessages.forEach(test => {
            const categories = categorizeMessage(test.text, test.images, config);
            const result = categories.map(c => `${c.type}:${c.value}`);
            const passed = JSON.stringify(result) === JSON.stringify(test.expected);
        });
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

        // Only broadcast if display state changed or we have items to show
        if (sentimentState.shouldDisplay || wasDisplaying !== sentimentState.shouldDisplay) {
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
        POLL_TYPES
    };

})(typeof globalThis !== 'undefined' ? globalThis : 
   typeof window !== 'undefined' ? window : global);