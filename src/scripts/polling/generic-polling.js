// Generic Polling System Module
// Handles numbers, letters, and sentiment tracking

// Create a namespace to avoid global pollution
// Use globalThis for compatibility with both browsers and service workers
(function(global) {
    'use strict';

// Generic Poll State - now supports three modes: numbers, letters, sentiment
let genericPollState = {
    isActive: false,
    isConcluded: false,
    isOnCooldown: false,
    startTime: 0,
    monitoringType: null, // 'numbers', 'letters', 'sentiment'
    windowDurationMs: 6000, // configurable lookback window
    messageBuffer: [], // stores messages within the window
    activeTracker: null, // current tracking data for active polls
    sentimentTracker: {}, // running sentiment counts for default mode
    sentimentDecayTimerId: null, // 1-second decay timer
    activityCheckTimerId: null,
    clearTimerId: null,
    cooldownTimerId: null,
};

// External dependencies that will be injected
let settings = {};
let broadcastToPopouts = null;
let webhookClient = null;

// Initialize the module with dependencies
function initializeGenericPolling(deps) {
    settings = deps.settings;
    broadcastToPopouts = deps.broadcastToPopouts;
    webhookClient = deps.webhookClient;
}

// Update settings when they change
function updateGenericPollingSettings(newSettings) {
    settings = newSettings;
    console.log('[Generic Poll] Settings updated');
    
    // Restart sentiment decay timer with new settings if it's running
    if (genericPollState.sentimentDecayTimerId) {
        console.log('[Generic Poll] Restarting sentiment decay timer with new settings');
        clearInterval(genericPollState.sentimentDecayTimerId);
        genericPollState.sentimentDecayTimerId = null;
        startSentimentDecayTimer();
    }
}

// Generic Poll Configuration (dynamically updated from settings)
function getGenericPollConfig() {
    console.log(`[Generic Poll] Loading config - raw genericPollSentimentDecayAmount:`, settings.genericPollSentimentDecayAmount);
    
    return {
        lookbackWindowMs: settings.genericPollLookbackWindow || 6000,
        maxLetterLength: settings.genericPollMaxLetterLength || 5,
        endThreshold: settings.genericPollEndThreshold || 2,
        resultDisplayTime: (settings.genericPollResultDisplayTime || 12) * 1000,
        
        // Activation thresholds for active polling
        letterActivation: {
            individualThreshold: settings.genericPollLetterIndividualThreshold || 3,
            totalThreshold: settings.genericPollLetterTotalThreshold || 10,
        },
        numberActivation: {
            threshold: settings.genericPollNumberThreshold || 7,
        },
        
        // Sentiment tracker configuration
        sentimentDisplayThreshold: settings.genericPollSentimentDisplayThreshold || 10,
        sentimentIndividualThreshold: settings.genericPollLetterIndividualThreshold || 3, // Reuse existing setting
        sentimentMaxDisplayItems: settings.genericPollSentimentMaxDisplayItems || 5,
        sentimentDecayAmount: settings.genericPollSentimentDecayAmount || 1,
        sentimentMaxGrowthWidth: settings.genericPollSentimentMaxGrowthWidth || 150,
    };
}

function processMessageForGenericPoll(text, images) {
    if (genericPollState.isOnCooldown) return;

    const currentTime = Date.now();
    const message = {
        text: text.trim(),
        images,
        timestamp: currentTime,
        categorized: false
    };
    

    // Add message to buffer and clean old messages
    genericPollState.messageBuffer.push(message);
    cleanGenericPollBuffer(currentTime);

    // Categorize the message first
    const categorizedMessage = categorizeMessage(message);
    if (categorizedMessage.category) {
        message.category = categorizedMessage.category;
        message.value = categorizedMessage.value;
        message.categorized = true;
        console.log(`[Generic Poll] Message categorized: "${text}" -> ${categorizedMessage.category}:${categorizedMessage.value}`);
    } else {
        console.log(`[Generic Poll] Message not categorized: "${text}" (images: ${images.length})`);
    }

    // If already active, update tracking
    if (genericPollState.isActive) {
        updateActiveGenericPollTracking(message);
        return;
    }

    // If not active and message is categorized, check if we should activate polling
    if (message.categorized) {
        checkGenericPollActivation();
    }
}

function cleanGenericPollBuffer(currentTime) {
    const config = getGenericPollConfig();
    const cutoffTime = currentTime - config.lookbackWindowMs;
    genericPollState.messageBuffer = genericPollState.messageBuffer.filter(
        msg => msg.timestamp > cutoffTime
    );
}

function categorizeMessage(message) {
    const { text, images } = message;
    const config = getGenericPollConfig();
    const trimmedText = text.trim();
    
    // Priority 1: Numbers (integers only)
    if (/^\d+$/.test(trimmedText)) {
        return { category: 'numbers', value: parseInt(trimmedText, 10) };
    }
    
    // Priority 2: Single letters only (exactly 1 character, letter only)
    if (/^[a-zA-Z]$/.test(trimmedText)) {
        return { category: 'letters', value: trimmedText.toLowerCase() };
    }
    
    // Priority 3: Sentiment tracking (phrases, words, single emotes - not letters or numbers)
    // Single emote (only images, no text or minimal text)
    if (images.length === 1 && (!text || text.length <= 2)) {
        return { category: 'sentiment', value: images[0].alt || images[0].src };
    }
    
    // Words or phrases (longer than 1 character, not just numbers)
    if (trimmedText.length > 1 && !/^\d+$/.test(trimmedText)) {
        return { category: 'sentiment', value: trimmedText.toLowerCase() };
    }
    
    return { category: null, value: null };
}

function checkGenericPollActivation() {
    const categorizedMessages = genericPollState.messageBuffer.filter(msg => msg.categorized);
    const config = getGenericPollConfig();
    
    console.log(`[Generic Poll] Checking activation - ${categorizedMessages.length} categorized messages in buffer`);
    
    // Group by category
    const letterMessages = categorizedMessages.filter(msg => msg.category === 'letters');
    const numberMessages = categorizedMessages.filter(msg => msg.category === 'numbers');
    const sentimentMessages = categorizedMessages.filter(msg => msg.category === 'sentiment');
    
    console.log(`[Generic Poll] Message counts - Letters: ${letterMessages.length}, Numbers: ${numberMessages.length}, Sentiment: ${sentimentMessages.length}`);
    
    // Priority 1: Check number activation
    if (numberMessages.length >= config.numberActivation.threshold) {
        const numberCounts = {};
        numberMessages.forEach(msg => {
            numberCounts[msg.value] = (numberCounts[msg.value] || 0) + 1;
        });
        
        activateGenericPoll('numbers', numberCounts);
        return;
    }
    
    // Priority 2: Check single letter activation
    if (letterMessages.length > 0) {
        const letterCounts = {};
        letterMessages.forEach(msg => {
            letterCounts[msg.value] = (letterCounts[msg.value] || 0) + 1;
        });
        
        const maxIndividualCount = Math.max(...Object.values(letterCounts));
        const totalLetterCount = letterMessages.length;
        
        if (maxIndividualCount >= config.letterActivation.individualThreshold && 
            totalLetterCount >= config.letterActivation.totalThreshold) {
            
            // Special case: If only one letter meets the individual threshold, treat as sentiment instead of poll
            const lettersAboveThreshold = Object.values(letterCounts).filter(count => count >= config.letterActivation.individualThreshold);
            
            if (lettersAboveThreshold.length === 1) {
                console.log(`[Generic Poll] Only one letter meets threshold - treating as sentiment instead of starting poll`);
                // Don't start a poll, let it fall through to sentiment tracking
            } else {
                console.log(`[Generic Poll] Multiple letters meet threshold (${lettersAboveThreshold.length}) - starting letter poll`);
                activateGenericPoll('letters', letterCounts);
                return;
            }
        }
    }
    
    // Priority 3: Update sentiment tracker (always runs when no active poll)
    // Always update sentiment tracker to handle decay, even without new messages
    updateSentimentTracker();
}

// Sentiment Tracker Functions
function updateSentimentTracker() {
    const config = getGenericPollConfig();
    const currentTime = Date.now();
    const lookbackCutoff = currentTime - config.lookbackWindowMs;
    
    // Get new sentiment messages that meet selection criteria
    const newSentimentMessages = genericPollState.messageBuffer.filter(msg => {
        if (!msg.categorized || msg.timestamp <= lookbackCutoff) return false;
        
        // Check if this is a new message we haven't processed yet
        if (msg.sentimentProcessed) return false;
        
        // Selection criteria: message length <= maxLetterLength OR has emotes
        const text = msg.text?.trim() || '';
        const hasEmotes = msg.images && msg.images.length > 0;
        const isShortText = text.length > 0 && text.length <= config.maxLetterLength;
        
        
        if (hasEmotes || isShortText) {
            // Extract sentiment values - for emotes, each distinct emote counts separately
            msg.sentimentValues = [];
            
            if (hasEmotes) {
                console.log(`[Generic Poll] Processing ${msg.images.length} emotes in message:`, msg.images);
                
                // Count each distinct emote in the message and store emote metadata
                const emoteCounts = {};
                msg.images.forEach(img => {
                    const emoteKey = img.alt || img.src;
                    emoteCounts[emoteKey] = (emoteCounts[emoteKey] || 0) + 1;
                    
                    // Store emote metadata for later reconstruction
                    if (!genericPollState.emoteMetadata) genericPollState.emoteMetadata = {};
                    genericPollState.emoteMetadata[emoteKey] = {
                        src: img.src,
                        alt: img.alt,
                        name: img.alt || 'emote'
                    };
                });
                
                console.log(`[Generic Poll] Emote counts:`, emoteCounts);
                
                // Add each distinct emote with its count in this message
                Object.entries(emoteCounts).forEach(([emote, count]) => {
                    for (let i = 0; i < count; i++) {
                        msg.sentimentValues.push(emote);
                    }
                });
            }
            
            if (isShortText && !hasEmotes) {
                // For text-only short messages
                msg.sentimentValues.push(text.toLowerCase());
            }
            
            msg.sentimentProcessed = true;
            return msg.sentimentValues.length > 0;
        }
        return false;
    });
    
    console.log(`[Sentiment] Processing ${newSentimentMessages.length} new messages`);
    
    // Process new messages - check for addition to tracking or increment existing
    newSentimentMessages.forEach(msg => {
        msg.sentimentValues.forEach(value => {
            if (genericPollState.sentimentTracker[value]) {
                // Increment existing tracked item
                genericPollState.sentimentTracker[value]++;
                console.log(`[Sentiment] Incremented ${value} to ${genericPollState.sentimentTracker[value]}`);
            } else {
                // Check if this item should be added to tracking
                // Count total occurrences of this value across all messages in the window
                let currentWindowCount = 0;
                genericPollState.messageBuffer.forEach(m => {
                    if (m.sentimentProcessed && m.timestamp > lookbackCutoff && m.sentimentValues) {
                        currentWindowCount += m.sentimentValues.filter(v => v === value).length;
                    }
                });
                
                if (currentWindowCount >= config.sentimentIndividualThreshold) {
                    genericPollState.sentimentTracker[value] = currentWindowCount;
                    console.log(`[Sentiment] Added ${value} to tracking with count ${currentWindowCount}`);
                }
            }
        });
    });
    
    // Start decay timer if not already running
    if (!genericPollState.sentimentDecayTimerId) {
        startSentimentDecayTimer();
    }
    
    broadcastGenericPollUpdate();
}

function startSentimentDecayTimer() {
    console.log(`[Sentiment] Starting decay timer`);
    
    genericPollState.sentimentDecayTimerId = setInterval(() => {
        // Get fresh config on each execution to pick up setting changes
        const config = getGenericPollConfig();
        console.log(`[Sentiment] Decay tick with config:`, {
            sentimentDecayAmount: config.sentimentDecayAmount,
            lookbackWindowMs: config.lookbackWindowMs
        });
        
        const currentTime = Date.now();
        const lookbackCutoff = currentTime - config.lookbackWindowMs;
        let itemsModified = false;
        
        // Check each tracked item for presence in lookback window
        Object.keys(genericPollState.sentimentTracker).forEach(value => {
            const existsInWindow = genericPollState.messageBuffer.some(msg => 
                msg.sentimentProcessed && 
                msg.sentimentValues &&
                msg.sentimentValues.includes(value) &&
                msg.timestamp > lookbackCutoff
            );
            
            if (!existsInWindow) {
                // Decrement by configurable decay amount
                genericPollState.sentimentTracker[value] -= config.sentimentDecayAmount;
                console.log(`[Sentiment] Decayed ${value} by ${config.sentimentDecayAmount} to ${genericPollState.sentimentTracker[value]}`);
                itemsModified = true;
                
                // Remove if count drops below 1
                if (genericPollState.sentimentTracker[value] < 1) {
                    delete genericPollState.sentimentTracker[value];
                    console.log(`[Sentiment] Removed ${value} from tracking`);
                }
            }
        });
        
        // If no items left to track, stop the timer
        if (Object.keys(genericPollState.sentimentTracker).length === 0) {
            clearInterval(genericPollState.sentimentDecayTimerId);
            genericPollState.sentimentDecayTimerId = null;
            console.log(`[Sentiment] Stopped decay timer - no items to track`);
        }
        
        // Broadcast updates if anything changed
        if (itemsModified || Object.keys(genericPollState.sentimentTracker).length === 0) {
            broadcastGenericPollUpdate();
        }
    }, 1000); // Every 1 second
    
    console.log(`[Sentiment] Started decay timer`);
}

function shouldDisplaySentimentTracker() {
    const config = getGenericPollConfig();
    const maxCount = Math.max(0, ...Object.values(genericPollState.sentimentTracker));
    const shouldShow = maxCount > config.sentimentDisplayThreshold;
    console.log(`[Sentiment] shouldDisplaySentimentTracker - maxCount: ${maxCount}, threshold: ${config.sentimentDisplayThreshold}, shouldShow: ${shouldShow}, tracker:`, genericPollState.sentimentTracker);
    return shouldShow;
}


function activateGenericPoll(type, initialData) {
    console.log(`[Generic Poll] Activating poll for type: ${type}`, initialData);
    
    genericPollState.isActive = true;
    genericPollState.monitoringType = type;
    genericPollState.startTime = Date.now();
    genericPollState.activeTracker = {
        type,
        data: { ...initialData },
        lastTotal: Object.values(initialData).reduce((sum, count) => sum + count, 0)
    };
    
    // Reset lastTotal to current after a short delay to start tracking new growth
    setTimeout(() => {
        if (genericPollState.isActive && genericPollState.activeTracker) {
            genericPollState.activeTracker.lastTotal = Object.values(genericPollState.activeTracker.data).reduce((sum, count) => sum + count, 0);
            console.log(`[Generic Poll] Reset tracking baseline to: ${genericPollState.activeTracker.lastTotal}`);
        }
    }, 1000);
    
    // Set up activity monitoring
    const config = getGenericPollConfig();
    if (genericPollState.activityCheckTimerId) clearInterval(genericPollState.activityCheckTimerId);
    genericPollState.activityCheckTimerId = setInterval(checkGenericPollActivity, 2000);
    
    broadcastGenericPollUpdate();
}

function updateActiveGenericPollTracking(message) {
    if (!genericPollState.isActive || !genericPollState.activeTracker || !message.categorized) return;
    
    const tracker = genericPollState.activeTracker;
    if (message.category !== tracker.type) return;
    
    // Update tracking data
    tracker.data[message.value] = (tracker.data[message.value] || 0) + 1;
    
    broadcastGenericPollUpdate();
}

function checkGenericPollActivity() {
    if (!genericPollState.isActive || !genericPollState.activeTracker) return;
    
    const config = getGenericPollConfig();
    const tracker = genericPollState.activeTracker;
    const currentTotal = Object.values(tracker.data).reduce((sum, count) => sum + count, 0);
    const growth = currentTotal - tracker.lastTotal;
    
    console.log(`[Generic Poll] Activity check - Current: ${currentTotal}, Last: ${tracker.lastTotal}, Growth: ${growth}`);
    
    if (growth < config.endThreshold) {
        console.log('[Generic Poll] Activity below threshold, ending poll');
        endGenericPoll();
    } else {
        tracker.lastTotal = currentTotal;
    }
}

function endGenericPoll() {
    console.log('[Generic Poll] Ending generic poll');
    
    if (genericPollState.activityCheckTimerId) clearInterval(genericPollState.activityCheckTimerId);
    genericPollState.activityCheckTimerId = null;
    genericPollState.isConcluded = true;
    
    // Process results
    const results = processGenericPollResults();
    if (genericPollState.activeTracker) {
        genericPollState.activeTracker.results = results;
    }
    
    broadcastGenericPollUpdate();
    
    // Clear after delay
    if (genericPollState.clearTimerId) clearTimeout(genericPollState.clearTimerId);
    const config = getGenericPollConfig();
    genericPollState.clearTimerId = setTimeout(clearGenericPollData, config.resultDisplayTime);
    
    // Start cooldown
    genericPollState.isOnCooldown = true;
    if (genericPollState.cooldownTimerId) clearTimeout(genericPollState.cooldownTimerId);
    genericPollState.cooldownTimerId = setTimeout(() => {
        genericPollState.isOnCooldown = false;
        genericPollState.cooldownTimerId = null;
        console.log('[Generic Poll] Cooldown ended');
    }, 5000);
}

function processGenericPollResults() {
    if (!genericPollState.activeTracker) return null;
    
    const tracker = genericPollState.activeTracker;
    const { type, data } = tracker;
    
    switch (type) {
        case 'emotes':
            return processEmoteResults(data);
        case 'numbers':
            return processNumberResults(data);
        case 'letters':
            return processLetterResults(data);
        default:
            return null;
    }
}

function processEmoteResults(data) {
    const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const topEntry = sortedEntries[0];
    const totalVotes = Object.values(data).reduce((sum, count) => sum + count, 0);
    
    return {
        type: 'emote',
        topEmote: topEntry[0],
        count: topEntry[1],
        totalVotes,
        allResults: sortedEntries
    };
}

function processNumberResults(data) {
    // Apply IQR filtering first
    const filterResult = applyIQRFilter(data);
    const filteredData = filterResult.data;
    const outliersRemoved = filterResult.outliersRemoved;
    
    // Calculate statistics for all numbers
    const stats = calculateNumberStatistics(filteredData);
    
    // Check if we need binning (more than 10 unique values)
    const uniqueCount = Object.keys(filteredData).length;
    if (uniqueCount > 10) {
        const binningResult = applyNumberBinning(filteredData);
        return {
            type: 'numbers',
            histogram: binningResult.bins,
            totalVotes: Object.values(filteredData).reduce((sum, count) => sum + count, 0),
            binned: true,
            average: stats.average,
            mode: stats.mode,
            outliersRemoved: outliersRemoved,
            binningInfo: {
                originalCount: uniqueCount,
                binnedCount: binningResult.bins.length,
                binWidth: binningResult.binWidth
            }
        };
    } else {
        // Show individual numbers, sorted numerically
        const sortedEntries = Object.entries(filteredData)
            .sort(([a], [b]) => parseInt(a) - parseInt(b));
        
        const totalVotes = Object.values(filteredData).reduce((sum, count) => sum + count, 0);
        const histogram = sortedEntries.map(([value, count]) => ({
            value: value,
            count: count,
            percentage: ((count / totalVotes) * 100).toFixed(1)
        }));
        
        return {
            type: 'numbers',
            histogram,
            totalVotes,
            binned: false,
            average: stats.average,
            mode: stats.mode,
            outliersRemoved: outliersRemoved
        };
    }
}

function calculateNumberStatistics(data) {
    // Create array of all numbers based on their counts
    const allNumbers = [];
    Object.entries(data).forEach(([num, count]) => {
        const value = parseInt(num);
        for (let i = 0; i < count; i++) {
            allNumbers.push(value);
        }
    });
    
    // Calculate average
    const sum = allNumbers.reduce((acc, num) => acc + num, 0);
    const average = Math.round(sum / allNumbers.length);
    
    // Calculate mode (most frequent value(s))
    const maxCount = Math.max(...Object.values(data));
    const modes = Object.entries(data)
        .filter(([num, count]) => count === maxCount)
        .map(([num]) => parseInt(num))
        .sort((a, b) => a - b);
    
    return {
        average,
        mode: modes.length === 1 ? modes[0] : modes
    };
}

function applyNumberBinning(data) {
    const numbers = Object.keys(data).map(Number);
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const range = max - min;
    
    // Determine number of bins (between 5 and 10, based on data size)
    const idealBins = Math.min(10, Math.max(5, Math.ceil(Math.sqrt(numbers.length))));
    const numBins = Math.min(idealBins, Object.keys(data).length);
    const binWidth = range / numBins;
    
    // Create bins
    const bins = [];
    for (let i = 0; i < numBins; i++) {
        const binStart = min + (i * binWidth);
        const binEnd = i === numBins - 1 ? max + 1 : min + ((i + 1) * binWidth); // +1 for inclusive upper bound on last bin
        bins.push({
            start: Math.round(binStart), // Round to integers
            end: Math.round(binEnd),
            count: 0,
            values: []
        });
    }
    
    // Assign values to bins
    Object.entries(data).forEach(([num, count]) => {
        const numValue = parseInt(num);
        let binIndex = Math.floor((numValue - min) / binWidth);
        
        // Ensure last value goes to last bin (handle floating point precision)
        if (binIndex >= numBins) binIndex = numBins - 1;
        
        bins[binIndex].count += count;
        bins[binIndex].values.push(numValue);
    });
    
    // Convert bins to histogram format and filter empty bins
    const histogram = bins
        .filter(bin => bin.count > 0)
        .map(bin => {
            const totalVotes = Object.values(data).reduce((sum, count) => sum + count, 0);
            const binLabel = bin.start === bin.end ? 
                `${bin.start}` : 
                `${bin.start}-${bin.end - 1}`;
            
            return {
                value: binLabel,
                range: { start: bin.start, end: bin.end - 1 },
                count: bin.count,
                percentage: ((bin.count / totalVotes) * 100).toFixed(1)
            };
        });
    
    return { bins: histogram, binWidth, numBins };
}

function applyIQRFilter(data) {
    const entries = Object.entries(data);
    if (entries.length <= 4) return { data: data, outliersRemoved: 0 }; // Need at least 5 points for IQR
    
    // Calculate weighted values for quartile calculation
    const values = [];
    entries.forEach(([num, count]) => {
        for (let i = 0; i < count; i++) {
            values.push(parseInt(num));
        }
    });
    
    values.sort((a, b) => a - b);
    
    // Calculate quartiles
    const q1Index = Math.floor(values.length * 0.25);
    const q3Index = Math.floor(values.length * 0.75);
    const q1 = values[q1Index];
    const q3 = values[q3Index];
    const iqr = q3 - q1;
    
    // Define outlier bounds
    const lowerBound = q1 - (1.5 * iqr);
    const upperBound = q3 + (1.5 * iqr);
    
    // Filter out outliers
    const filteredData = {};
    let removedCount = 0;
    
    entries.forEach(([num, count]) => {
        const numValue = parseInt(num);
        if (numValue >= lowerBound && numValue <= upperBound) {
            filteredData[num] = count;
        } else {
            removedCount += count;
        }
    });
    
    // Only apply filter if we're removing less than 25% of the data
    if (removedCount / values.length < 0.25) {
        console.log(`[Generic Poll] IQR filter removed ${removedCount} outlier votes`);
        return { data: filteredData, outliersRemoved: removedCount };
    }
    
    return { data: data, outliersRemoved: 0 };
}

function processLetterResults(data) {
    // Filter out responses with less than 2 counts and responses longer than 1 letter
    const filteredData = {};
    Object.entries(data).forEach(([response, count]) => {
        if (count >= 2 && response.length === 1) {
            filteredData[response] = count;
        }
    });
    
    const totalVotes = Object.values(filteredData).reduce((sum, count) => sum + count, 0);
    
    if (totalVotes === 0) {
        return {
            type: 'text',
            responses: [],
            totalVotes: 0,
            topResponse: null
        };
    }
    
    // Check for yes/no pattern (only with single letters)
    const yesTerms = ['y'];
    const noTerms = ['n'];
    
    let yesCount = 0;
    let noCount = 0;
    let otherResponses = {};
    
    Object.entries(filteredData).forEach(([response, count]) => {
        if (yesTerms.includes(response)) {
            yesCount += count;
        } else if (noTerms.includes(response)) {
            noCount += count;
        } else {
            otherResponses[response] = count;
        }
    });
    
    // If it's primarily y/n responses
    if ((yesCount + noCount) / totalVotes > 0.7) {
        return {
            type: 'yes_no',
            yesCount,
            noCount,
            totalVotes,
            yesPercentage: ((yesCount / totalVotes) * 100).toFixed(1),
            noPercentage: ((noCount / totalVotes) * 100).toFixed(1),
            winner: yesCount > noCount ? 'Y' : noCount > yesCount ? 'N' : 'Tie',
            otherResponses
        };
    }
    
    // General single letter responses
    const sortedResponses = Object.entries(filteredData)
        .map(([response, count]) => ({
            text: response.toUpperCase(),
            count,
            percentage: ((count / totalVotes) * 100).toFixed(1)
        }))
        .sort((a, b) => b.count - a.count);
    
    return {
        type: 'text',
        responses: sortedResponses,
        totalVotes,
        topResponse: sortedResponses[0]
    };
}

function clearGenericPollData() {
    console.log('[Generic Poll] Clearing poll data');
    
    genericPollState.isActive = false;
    genericPollState.isConcluded = false;
    genericPollState.startTime = 0;
    genericPollState.monitoringType = null;
    genericPollState.activeTracker = null;
    genericPollState.messageBuffer = [];
    
    if (genericPollState.clearTimerId) clearTimeout(genericPollState.clearTimerId);
    genericPollState.clearTimerId = null;
    if (genericPollState.activityCheckTimerId) clearInterval(genericPollState.activityCheckTimerId);
    genericPollState.activityCheckTimerId = null;
    if (genericPollState.sentimentDecayTimerId) clearInterval(genericPollState.sentimentDecayTimerId);
    genericPollState.sentimentDecayTimerId = null;
    
    broadcastGenericPollUpdate();
}

function getGenericPollState() {
    const state = {
        isActive: genericPollState.isActive,
        isConcluded: genericPollState.isConcluded,
        monitoringType: genericPollState.monitoringType || 'sentiment'
    };
    
    // Determine display logic based on mode
    if (genericPollState.isActive || genericPollState.isConcluded) {
        // Active polling modes (numbers or letters) - always show when active/concluded
        state.shouldDisplay = true;
        if (genericPollState.activeTracker) {
            state.tracker = { ...genericPollState.activeTracker };
        }
    } else {
        // Sentiment tracking mode - show only if above threshold
        state.shouldDisplay = shouldDisplaySentimentTracker();
        state.monitoringType = 'sentiment';
        
        if (state.shouldDisplay) {
            // Create a tracker-like structure for sentiment data - only show values above threshold
            const config = getGenericPollConfig();
            const sortedSentiment = Object.entries(genericPollState.sentimentTracker)
                .filter(([value, count]) => count > config.sentimentDisplayThreshold)
                .map(([value, count]) => {
                    // Check if this is an emote key and reconstruct the emote object
                    if (genericPollState.emoteMetadata && genericPollState.emoteMetadata[value]) {
                        return { 
                            value: genericPollState.emoteMetadata[value], 
                            count 
                        };
                    } else {
                        // Regular text value
                        return { value, count };
                    }
                })
                .sort((a, b) => b.count - a.count)
                .slice(0, config.sentimentMaxDisplayItems);
                
            state.tracker = {
                type: 'sentiment',
                data: genericPollState.sentimentTracker,
                sortedData: sortedSentiment,
                totalCount: Object.values(genericPollState.sentimentTracker).reduce((sum, count) => sum + count, 0)
            };
        }
    }
    
    return state;
}

function broadcastGenericPollUpdate() {
    const pollData = getGenericPollState();
    broadcastToPopouts({ type: 'GENERIC_POLL_UPDATE', data: pollData });
    
    // Send to webhook if enabled
    if (webhookClient && settings.webhookEvents?.genericPollUpdates) {
        webhookClient.sendEvent('generic_poll_update', pollData);
    }
}

    // Public API
    global.GenericPolling = {
        initialize: initializeGenericPolling,
        updateSettings: updateGenericPollingSettings,
        processMessage: processMessageForGenericPoll,
        getState: getGenericPollState,
        
        // For testing and debugging
        _getInternalState: () => genericPollState,
        _clearState: clearGenericPollData
    };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));