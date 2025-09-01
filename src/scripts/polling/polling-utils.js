// Polling Utilities Module
// Shared utilities used across different polling systems

// Use globalThis for compatibility with both browsers and service workers
(function(global) {
    'use strict';

const PollingConstants = {
    MESSAGE_DEDUP_EXPIRY: 30000, // 30 seconds
    MESSAGE_DEDUP_MAX_SIZE: 1000, // Maximum number of messages to track
    DEFAULT_ACTIVITY_CHECK_INTERVAL: 2000, // 2 seconds
    DEFAULT_COOLDOWN_DURATION: 5000, // 5 seconds
};

// Utility function for creating message hashes for deduplication
function createMessageHash(text, username, timestamp) {
    // Create a hash based on content and timing to prevent duplicate processing
    const contentHash = text + '|' + username;
    const timeWindow = Math.floor(timestamp / 5000) * 5000; // 5-second windows
    return contentHash + '|' + timeWindow;
}

// Utility function for cleaning up old processed messages
function cleanupProcessedMessages(processedSet, maxSize = PollingConstants.MESSAGE_DEDUP_MAX_SIZE) {
    if (processedSet.size > maxSize) {
        const entries = Array.from(processedSet);
        const toRemove = entries.slice(0, Math.floor(maxSize * 0.2)); // Remove oldest 20%
        toRemove.forEach(entry => processedSet.delete(entry));
        console.log(`[Polling Utils] Cleaned up ${toRemove.length} old processed messages`);
    }
}

// Utility function for percentage calculations
function calculatePercentage(value, total, decimals = 1) {
    if (total === 0) return '0.0';
    return ((value / total) * 100).toFixed(decimals);
}

// Utility function for sorting poll results
function sortPollResults(data, sortBy = 'count', direction = 'desc') {
    const entries = Object.entries(data);
    
    return entries.sort((a, b) => {
        let valueA, valueB;
        
        switch (sortBy) {
            case 'count':
                valueA = a[1];
                valueB = b[1];
                break;
            case 'value':
                valueA = a[0];
                valueB = b[0];
                break;
            case 'numeric':
                valueA = parseInt(a[0]);
                valueB = parseInt(b[0]);
                break;
            default:
                valueA = a[1];
                valueB = b[1];
        }
        
        if (direction === 'desc') {
            return valueB - valueA;
        } else {
            return valueA - valueB;
        }
    });
}

// Utility function for validating poll activation thresholds
function checkActivationThreshold(data, config) {
    const entries = Object.entries(data);
    const totalCount = entries.reduce((sum, [key, count]) => sum + count, 0);
    const maxIndividual = Math.max(...entries.map(([key, count]) => count));
    
    return {
        totalCount,
        maxIndividual,
        uniqueItems: entries.length,
        meetsThreshold: totalCount >= (config.totalThreshold || 0) && 
                       maxIndividual >= (config.individualThreshold || 0)
    };
}

// Utility function for time-based window filtering
function filterMessagesByTimeWindow(messages, windowMs, currentTime = Date.now()) {
    const cutoffTime = currentTime - windowMs;
    return messages.filter(msg => msg.timestamp > cutoffTime);
}

// Utility function for creating poll result summaries
function createResultSummary(data, type, additionalData = {}) {
    const entries = Object.entries(data);
    const totalVotes = entries.reduce((sum, [key, count]) => sum + count, 0);
    const sortedEntries = sortPollResults(data, 'count', 'desc');
    const topEntry = sortedEntries[0];
    
    const baseSummary = {
        type,
        totalVotes,
        uniqueResponses: entries.length,
        topResponse: topEntry ? {
            value: topEntry[0],
            count: topEntry[1],
            percentage: calculatePercentage(topEntry[1], totalVotes)
        } : null,
        allResponses: sortedEntries.slice(0, 10).map(([value, count]) => ({
            value,
            count,
            percentage: calculatePercentage(count, totalVotes)
        }))
    };
    
    return { ...baseSummary, ...additionalData };
}

// Utility function for debouncing rapid updates
function createDebouncer(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Utility function for rate limiting
function createRateLimiter(maxCalls, timeWindowMs) {
    const calls = [];
    
    return function (func, ...args) {
        const now = Date.now();
        
        // Remove old calls outside the time window
        while (calls.length > 0 && calls[0] < now - timeWindowMs) {
            calls.shift();
        }
        
        // Check if we can make the call
        if (calls.length < maxCalls) {
            calls.push(now);
            return func.apply(this, args);
        }
        
        // Rate limited
        return false;
    };
}

// Utility function for validating message categorization
function validateMessageCategory(message, allowedCategories = ['numbers', 'letters', 'emotes', 'sentiment']) {
    if (!message || typeof message !== 'object') return false;
    if (!message.category || !allowedCategories.includes(message.category)) return false;
    if (message.value === null || message.value === undefined) return false;
    
    return true;
}

// Utility function for safe numeric operations
function safeParseInt(value, defaultValue = 0) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

function safeParseFloat(value, defaultValue = 0.0) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

// Utility function for array chunking (useful for batch processing)
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

    // Public API
    global.PollingUtils = {
        Constants: PollingConstants,
        createMessageHash,
        cleanupProcessedMessages,
        calculatePercentage,
        sortPollResults,
        checkActivationThreshold,
        filterMessagesByTimeWindow,
        createResultSummary,
        createDebouncer,
        createRateLimiter,
        validateMessageCategory,
        safeParseInt,
        safeParseFloat,
        chunkArray
    };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));