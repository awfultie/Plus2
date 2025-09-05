// /Users/tyler/repos/plus2BS/scripts/background.js

// Import modular polling system and settings manager for Chrome service worker
try {
    importScripts('config/settings-manager.js', 'polling/polling-utils.js', 'polling/generic-polling.js', 'polling/unified-polling.js');
} catch (e) {
    // Firefox or other environments that don't support importScripts will load via script tags
    console.log('[Background] ImportScripts not available, modules loaded via HTML');
}

// --- Service Worker State ---
let settings = {};
let webhookClient = null;
let streamviewClient = null;

// Gauge State
let occurrenceCount = 0;
let recentMaxValue = 0;
let lastIncrementTime = 0;
let decayTimerId = null;
let resetRecentMaxTimerId = null;

// Message deduplication - track processed messages to prevent double counting
let processedMessages = new Set();
const MESSAGE_DEDUP_EXPIRY = 30000; // 30 seconds
const MESSAGE_DEDUP_MAX_SIZE = 1000; // Maximum number of messages to track

// Poll State
let yesCount = 0;
let noCount = 0;
let pollStartTime = 0;
let isPollActive = false;
let isPollConcluded = false;
let isPollOnCooldown = false;
let lastTotalResponsesChecked = 0;
let pollActivityCheckTimerId = null;
let pollClearTimerId = null;
let pollCooldownTimerId = null;

// Leaderboard & Highlight Tracking State
let leaderboardDisplayMode = 'hidden'; // 'hidden' or 'shown'
let activeHighlightTrackers = new Map();
let nextTrackerId = 0;
let currentNonAppendTrackerId = null;
let popoutWindowId = null;
let isSavingLog = false; // Lock to prevent race conditions

// Promise to ensure initialization is complete before handling messages
let initializationPromise = null;

// SettingsManager instance will be initialized in loadSettings


function openPopout() {
    // If a popout window ID exists, try to focus it.
    if (popoutWindowId !== null) {
        browser.windows.get(popoutWindowId).then((existingWindow) => {
            // Window exists, just focus it.
            browser.windows.update(popoutWindowId, { focused: true });
        }).catch(() => {
            // The window doesn't exist anymore, so we can create a new one.
            popoutWindowId = null;
            createAndTrackPopout();
        });
    } else {
        // No known popout window, create one.
        createAndTrackPopout();
    }
}

function createAndTrackPopout() {
    const popoutUrl = browser.runtime.getURL('ui/popout.html');
    browser.storage.sync.get({
        popoutDefaultWidth: 600,
        popoutDefaultHeight: 300
    }).then((items) => {
        browser.windows.create({
            url: popoutUrl,
            type: 'popup',
            width: items.popoutDefaultWidth,
            height: items.popoutDefaultHeight
        }).then((window) => {
            if (window) {
                popoutWindowId = window.id;
            }
        });
    });
}

// --- Helper Functions ---

// Create a hash for message deduplication based on content and timestamp (within 5 seconds)
function createMessageHash(text, username, timestamp) {
    // Round timestamp to 5-second intervals to catch rapid duplicates
    const roundedTimestamp = Math.floor(timestamp / 5000) * 5000;
    return `${text}|${username}|${roundedTimestamp}`;
}

// Clean up old processed messages to prevent memory leaks
function cleanupProcessedMessages() {
    const now = Date.now();
    const messagesToDelete = [];
    
    for (const entry of processedMessages) {
        const [hash, timestamp] = entry.split('|TIMESTAMP|');
        if (timestamp && (now - parseInt(timestamp)) > MESSAGE_DEDUP_EXPIRY) {
            messagesToDelete.push(entry);
        }
    }
    
    messagesToDelete.forEach(entry => processedMessages.delete(entry));
    
    // Also limit size to prevent unbounded growth
    if (processedMessages.size > MESSAGE_DEDUP_MAX_SIZE) {
        const entries = Array.from(processedMessages);
        entries.slice(0, entries.length - MESSAGE_DEDUP_MAX_SIZE).forEach(entry => {
            processedMessages.delete(entry);
        });
    }
}
function getChannelNameFromUrl(url) {
    const match = url.match(/\/popout\/([^/]+)\/|\.tv\/([^/]+)/);
    if (match) {
        return match[1] || match[2];
    }
    return 'unknown';
}

// --- Broadcasting ---
function broadcastToPopouts(message) {
    // Send to extension pages (popout windows)
    browser.runtime.sendMessage(message).catch(error => {
        // Silently ignore expected errors when popout is not open
        if (error.message.includes("Receiving end does not exist") || 
            error.message.includes("message port closed")) {
            // Expected when no popout window is open - ignore silently
        }
    });

    // Also send to content scripts in all tabs (for docked iframe support)
    browser.tabs.query({}).then(tabs => {
        tabs.forEach(tab => {
            if (tab.url && (tab.url.includes('twitch.tv') || tab.url.includes('youtube.com'))) {
                browser.tabs.sendMessage(tab.id, message).catch(error => {
                    // Silently ignore errors for tabs that don't have our content script
                    if (!error.message.includes("Receiving end does not exist") && 
                        !error.message.includes("Could not establish connection")) {
                    }
                });
            }
        });
    }).catch(error => {
    });
}

function broadcastGaugeUpdate() {
    const gaugeData = getGaugeState(); // Full data for popouts (with peakLabels)
    const webhookGaugeData = getWebhookGaugeState(); // Webhook data without peakLabels
    
    broadcastToPopouts({ type: 'GAUGE_UPDATE', data: gaugeData });
    
    // Send to webhook - always send for streamview, check settings for legacy webhooks
    if (webhookClient) {
        webhookClient.sendEvent('gauge_update', webhookGaugeData);
    }
}

function broadcastPollUpdate() {
    const pollData = getPollState();
    broadcastToPopouts({ type: 'POLL_UPDATE', data: pollData, gaugeData: getGaugeState() });
    
    // Send to webhook - always send for streamview, check settings for legacy webhooks
    if (webhookClient) {
        webhookClient.sendEvent('poll_update', pollData);
    }
}

function broadcastLeaderboardUpdate() {
    getLeaderboardData().then(leaderboardData => {
        broadcastToPopouts({ type: 'LEADERBOARD_UPDATE', data: leaderboardData });
        
        // Send to webhook - always send for streamview, check settings for legacy webhooks
        if (webhookClient) {
            webhookClient.sendEvent('leaderboard_update', leaderboardData);
        }
    });
}

// buildNestedConfig function removed - settings are now stored in nested format directly

// --- State Packaging ---
function getGaugeState() {
    // Check if unified polling is active and get gauge data from it
    if (settings.polling?.unified?.enabled && unifiedPolling) {
        const unifiedGaugeState = unifiedPolling.getUnifiedGaugeState();
        return {
            occurrenceCount: unifiedGaugeState.occurrenceCount,
            gaugeMaxValue: settings.styling?.gauge?.gaugeMaxValue,
            recentMaxValue: unifiedGaugeState.recentMaxValue,
            isPollActive,
            peakLabels: {
                low: { text: settings.styling?.gauge?.peakLabels?.low?.text, color: settings.styling?.gauge?.peakLabels?.low?.color },
                mid: { text: settings.styling?.gauge?.peakLabels?.mid?.text, color: settings.styling?.gauge?.peakLabels?.mid?.color },
                high: { text: settings.styling?.gauge?.peakLabels?.high?.text, color: settings.styling?.gauge?.peakLabels?.high?.color },
                max: { text: settings.styling?.gauge?.peakLabels?.max?.text, color: settings.styling?.gauge?.peakLabels?.max?.color }
            }
        };
    } else {
        // Legacy gauge state
        return {
            occurrenceCount,
            gaugeMaxValue: settings.styling?.gauge?.gaugeMaxValue,
            recentMaxValue,
            isPollActive,
            peakLabels: {
                low: { text: settings.styling?.gauge?.peakLabels?.low?.text, color: settings.styling?.gauge?.peakLabels?.low?.color },
                mid: { text: settings.styling?.gauge?.peakLabels?.mid?.text, color: settings.styling?.gauge?.peakLabels?.mid?.color },
                high: { text: settings.styling?.gauge?.peakLabels?.high?.text, color: settings.styling?.gauge?.peakLabels?.high?.color },
                max: { text: settings.styling?.gauge?.peakLabels?.max?.text, color: settings.styling?.gauge?.peakLabels?.max?.color }
            }
        };
    }
}

// Webhook-specific gauge state without peakLabels (moved to StreamView visual config)
function getWebhookGaugeState() {
    return {
        occurrenceCount,
        gaugeMaxValue: settings.styling?.gauge?.gaugeMaxValue,
        recentMaxValue,
        isPollActive
    };
}

function getPollState() {
    const total = yesCount + noCount;
    let winnerMessage = "";
    if (isPollConcluded) {
        if (yesCount > noCount) winnerMessage = `YES ${((yesCount/total)*100).toFixed(0)}%`;
        else if (noCount > yesCount) winnerMessage = `NO ${((noCount/total)*100).toFixed(0)}%`;
        else winnerMessage = "Tie!";
    }
    return {
        yesCount,
        noCount,
        total,
        isConcluded: isPollConcluded, // Correctly reference the global state variable
        winnerMessage,
        shouldDisplay: isPollActive && (total >= settings.polling?.yesNo?.displayThreshold || isPollConcluded)
    };
}

async function getLeaderboardData() {
    const storage = await browser.storage.local.get({ highlightLog: [] });
    const log = storage.highlightLog;
    const cutoffTime = new Date(Date.now() - (settings.leaderboard?.timeWindowDays || 30) * 24 * 60 * 60 * 1000);

    const userScores = log
        .filter(entry => new Date(entry.timestamp) >= cutoffTime)
        .reduce((acc, entry) => {
            const username = entry.username.trim();
            if (!acc[username]) acc[username] = { highlightCount: 0, plusTwoSum: 0 };
            acc[username].highlightCount++;
            acc[username].plusTwoSum += Number(entry.plusTwoCount) || 0;
            return acc;
        }, {});

    const topUsers = Object.entries(userScores).map(([username, data]) => ({
        username,
        score: (data.highlightCount * (settings.leaderboard?.highlightValue || 10)) + data.plusTwoSum
    })).sort((a, b) => b.score - a.score).slice(0, 3);

    const hasMessage = activeHighlightTrackers.size > 0 || currentNonAppendTrackerId !== null;

    return {
        topUsers,
        isVisible: settings.features?.enableLeaderboard && leaderboardDisplayMode === 'shown' && !hasMessage,
        mode: leaderboardDisplayMode,
        headerText: settings.styling?.leaderboard?.leaderboardHeaderText
    };
}

// --- Core Logic ---

async function loadSettings() {
    
    // Wait a bit for SettingsManager to initialize, then check again
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('[Background] SettingsManager available after wait:', typeof SettingsManager !== 'undefined');
    
    // Use SettingsManager for centralized configuration
    if (typeof SettingsManager !== 'undefined' && SettingsManager.getAllSettings) {
        try {
            settings = await SettingsManager.getAllSettings();
        } catch (error) {
            console.error('[Background] Error loading settings via SettingsManager:', error);
            // Fallback to direct storage
            settings = await browser.storage.sync.get();
        }
    } else {
        // Fallback for environments where SettingsManager is not available
        // Get stored settings and merge with basic defaults to ensure we have chromaKeyColor
        const storedSettings = await browser.storage.sync.get();
        const basicDefaults = {
            chromaKeyColor: '#00ff00',
            enableCounting: true,
            gaugeMaxValue: 30,
            displayTime: 10000,
            popoutBaseFontSize: 18
        };
        settings = { ...basicDefaults, ...storedSettings };
    }
    const oldSettings = { ...settings };

    // Initialize or update webhook client
    if (webhookClient) {
        webhookClient.updateSettings(settings);
    } else {
        webhookClient = new WebhookClient(settings);
    }

    // Initialize or update streamview client
    if (streamviewClient) {
        streamviewClient.updateSettings(settings);
    } else {
        streamviewClient = new StreamviewClient(settings);
    }
    
    // Send current leaderboard state to content scripts
    setTimeout(() => {
        broadcastToPopouts({ type: 'LEADERBOARD_STATE_UPDATE', mode: leaderboardDisplayMode });
    }, 100);

    // If webhook settings changed, clear any pending retries
    if (oldSettings.features?.enableWebhookIntegration !== settings.features?.enableWebhookIntegration ||
        oldSettings.integrations?.webhook?.endpoint !== settings.integrations?.webhook?.endpoint ||
        oldSettings.integrations?.webhook?.apiKey !== settings.integrations?.webhook?.apiKey) {
        webhookClient.clearRetries();
    }

    // If counting was just toggled, reset state and timers
    if (oldSettings.core?.enableCounting !== settings.core?.enableCounting) {
        occurrenceCount = 0;
        recentMaxValue = 0;
        processedMessages.clear(); // Clear processed message history when toggling counting
        if (decayTimerId) clearInterval(decayTimerId);
        decayTimerId = null;
        if (resetRecentMaxTimerId) clearTimeout(resetRecentMaxTimerId);
        resetRecentMaxTimerId = null;
        if (settings.core?.enableCounting) {
            setupDecayMechanism();
        }
        broadcastGaugeUpdate();
    }

    // If polling was just toggled
    if (oldSettings.features?.enableYesNoPolling !== settings.features?.enableYesNoPolling) {
        clearYesNoPollData(); // This also broadcasts an update
    }

    // If leaderboard was just toggled
    if (oldSettings.features?.enableLeaderboard !== settings.features?.enableLeaderboard) {
        broadcastLeaderboardUpdate();
    }
    
    // Update generic polling module settings
    if (genericPolling && genericPolling.updateSettings) {
        genericPolling.updateSettings(settings);
    }
    
    // Update unified polling system settings
    if (unifiedPolling && unifiedPolling.updateUnifiedPollingSettings) {
        unifiedPolling.updateUnifiedPollingSettings(settings);
    }

    broadcastToPopouts({ type: 'SETTINGS_UPDATE', data: settings });
}

function setupDecayMechanism() {
    if (decayTimerId) clearInterval(decayTimerId);
    if (!settings.core?.enableCounting || settings.behavior?.decayInterval <= 0 || settings.behavior?.decayAmount <= 0) return;

    lastIncrementTime = Date.now();
    decayTimerId = setInterval(() => {
        if (occurrenceCount > 0 && (Date.now() - lastIncrementTime >= settings.behavior?.decayInterval)) {
            if (resetRecentMaxTimerId) clearTimeout(resetRecentMaxTimerId);
            resetRecentMaxTimerId = null;

            occurrenceCount = Math.max(0, occurrenceCount - settings.behavior?.decayAmount);
            broadcastGaugeUpdate();
            lastIncrementTime = Date.now();

            if (occurrenceCount === 0) {
                resetRecentMaxTimerId = setTimeout(() => {
                    if (occurrenceCount === 0) {
                        recentMaxValue = 0;
                        broadcastGaugeUpdate();
                    }
                }, settings.behavior?.recentMaxResetDelay);
            }
        }
    }, 250); // Check frequently for responsiveness
}

function processChatMessage(data) {
    const { text, images, isModPost, modReplyContent, channelUrl, username, badges } = data;
    
    // Clean up old processed messages periodically
    if (Math.random() < 0.01) { // 1% chance to clean up on each message
        cleanupProcessedMessages();
    }
    
    // Create message hash for deduplication (skip for testing user)
    if (username !== 'awful_tie') {
        const timestamp = Date.now();
        const messageHash = createMessageHash(text, username || 'unknown', timestamp);
        const messageKey = `${messageHash}|TIMESTAMP|${timestamp}`;
        
        // Check if we've already processed this message recently
        const isDuplicate = processedMessages.has(messageKey) || 
            Array.from(processedMessages).some(entry => entry.startsWith(messageHash + '|TIMESTAMP|'));
        
        if (isDuplicate) {
            return;
        }
        
        // Mark this message as processed
        processedMessages.add(messageKey);
    } else {
    }

    if (isModPost && settings.features?.enableModPostReplyHighlight && modReplyContent) {
        processHighlightRequest({ isModPost: true, html: modReplyContent, channelUrl });
        // Don't return - let it continue to polling
    }

    // Check if unified polling is enabled
    if (settings.polling?.unified?.enabled && unifiedPolling) {
        console.log('[Background] Using UNIFIED polling system for message:', text);
        // Use new unified system (processes all: gauge, yes/no, generic polling)
        unifiedPolling.processUnifiedMessage(text, images, { username, badges });
    } else {
        console.log('[Background] Using LEGACY polling systems for message:', text);
        // Use legacy separate systems
        if (settings.core?.enableCounting) {
            const terms = settings.core?.stringToCount.split(',').map(s => s.trim());
            const check = settings.core?.exactMatchCounting ?
                (source, term) => source.split(/\s+/).includes(term) :
                (source, term) => source.toLowerCase().includes(term.toLowerCase());

            let matchFound = terms.some(term => check(text, term));
            if (!matchFound) {
                matchFound = images.some(imgAlt => terms.some(term => check(imgAlt, term)));
            }

            if (matchFound) {
                if (resetRecentMaxTimerId) clearTimeout(resetRecentMaxTimerId);
                resetRecentMaxTimerId = null;
                occurrenceCount++;
                if (occurrenceCount > recentMaxValue) recentMaxValue = occurrenceCount;
                lastIncrementTime = Date.now();
                broadcastGaugeUpdate();
            }
        }

        if (settings.features?.enableYesNoPolling) {
            processMessageForYesNoPoll(text, images);
        }

        if (settings.features?.enableGenericPolling) {
            processMessageForGenericPoll(text, images);
        }
    }

    if (activeHighlightTrackers.size > 0 && text.includes("+2")) {
        for (const tracker of activeHighlightTrackers.values()) {
            tracker.logEntry.plusTwoCount++;
        }
    }
}

function processHighlightRequest(data) {
    
    let { badgesHTML, usernameHTML, messageBodyHTML, replyHTML, username, channelUrl, isModPost, html } = data;
    
    // Ensure proper UTF-8 encoding for emoji support
    if (messageBodyHTML) {
        messageBodyHTML = decodeURIComponent(encodeURIComponent(messageBodyHTML));
    }
    if (usernameHTML) {
        usernameHTML = decodeURIComponent(encodeURIComponent(usernameHTML));
    }
    if (badgesHTML) {
        badgesHTML = decodeURIComponent(encodeURIComponent(badgesHTML));
    }
    if (replyHTML) {
        replyHTML = decodeURIComponent(encodeURIComponent(replyHTML));
    }
    if (html) {
        html = decodeURIComponent(encodeURIComponent(html));
    }
    const isYouTube = channelUrl && channelUrl.includes('youtube.com');

    // Extract original username color for remote streamview (always extract, let streamview decide whether to use it)
    let usernameColor = settings.styling?.usernameDefaultColor || '#FF0000'; // Fallback color
    if (usernameHTML) {
        const colorMatch = usernameHTML.match(/color:\s*(#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}|rgb\([^)]+\))/);
        if (colorMatch) {
            usernameColor = colorMatch[1]; // Use the original platform username color
        }
    }

    let finalHtmlString;
    if (isModPost) {
        // The `html` here is the innerHTML of the reply paragraph.
        // We want to remove the "Replying to " prefix.
        let processedHtml = html.trim();
        if (processedHtml.startsWith('Replying to ')) {
            processedHtml = processedHtml.substring('Replying to '.length);
        }
        // Wrap the mod-posted message in the same structure as a regular message for consistent styling.
        finalHtmlString = `
            <div class="plus2-popout-message-entry" style="background-color: ${settings.styling?.messageBGColor};">
                <div class="plus2-popout-message-line plus2-mod-post">${processedHtml}</div>
            </div>`;
    } else {
        // If uniform coloring is enabled OR it's a YouTube message, strip the inline style attribute.
        // This allows the CSS variable in the popout to take precedence for Twitch, and forces the custom color for YouTube.
        if ((settings.styling?.enableUsernameColoring || isYouTube) && usernameHTML) {
            usernameHTML = usernameHTML.replace(/ style=".*?"/i, '');
        }

        let replyBlock = '';
        if (replyHTML) {
            replyBlock = `<div class="plus2-popout-reply-block">${replyHTML}</div>`;
        }
        finalHtmlString = `
            <div class="plus2-popout-message-entry" style="background-color: ${settings.styling?.messageBGColor};">
                ${replyBlock}
                <div class="plus2-popout-message-line">
                    ${badgesHTML}
                    <span class="plus2-popout-username">${usernameHTML}:</span>
                    <span class="plus2-popout-message-body">${messageBodyHTML}</span>
                </div>
            </div>`;
    }

    let trackerId = null;
    if (settings.tracking?.enableHighlightTracking && username) {
        trackerId = nextTrackerId++;
        const logEntry = {
            username: username,
            timestamp: new Date().toISOString(),
            plusTwoCount: 0,
            channel: getChannelNameFromUrl(channelUrl)
        };
        activeHighlightTrackers.set(trackerId, { logEntry });
    }

    if (!settings.features?.appendMessages) {
        if (currentNonAppendTrackerId !== null && activeHighlightTrackers.has(currentNonAppendTrackerId)) {
            saveLogEntry(activeHighlightTrackers.get(currentNonAppendTrackerId).logEntry);
            activeHighlightTrackers.delete(currentNonAppendTrackerId);
            broadcastGenericPollUpdate(); // Update generic poll display when highlight is replaced
        }
        currentNonAppendTrackerId = trackerId;
    }

    const highlightData = {
        html: finalHtmlString,
        id: trackerId || 0,
        isAppend: settings.features?.appendMessages,
        displayTime: settings.display?.displayTime,
        platform: isYouTube ? 'youtube' : 'twitch',
        username: username || 'unknown',
        usernameColor: usernameColor, // Add username color
        badges: badgesHTML ? ['badge'] : [], // Simple badge detection
        messageBody: messageBodyHTML || '',
        reply: replyHTML || '',
        isModPost: isModPost || false
    };

    broadcastToPopouts({
        type: 'HIGHLIGHT_MESSAGE',
        data: highlightData
    });

    // Send highlight message to webhook - always send for streamview, check settings for legacy webhooks
    if (webhookClient) {
        webhookClient.sendEvent('highlight_message', highlightData, 
            isYouTube ? 'youtube' : 'twitch', channelUrl);
    }

    broadcastLeaderboardUpdate(); // Update leaderboard visibility

    // Set timeout to finalize log entry
    setTimeout(() => {
        if (trackerId !== null && activeHighlightTrackers.has(trackerId)) {
            saveLogEntry(activeHighlightTrackers.get(trackerId).logEntry);
            activeHighlightTrackers.delete(trackerId);
            if (currentNonAppendTrackerId === trackerId) {
                currentNonAppendTrackerId = null;
            }
            broadcastLeaderboardUpdate(); // Update after message expires
            broadcastGenericPollUpdate(); // Update generic poll display after message expires
        }
    }, settings.display?.displayTime);
}

async function saveLogEntry(logEntry) {
    if (!settings.tracking?.enableHighlightTracking || isSavingLog) return;

    isSavingLog = true; // Acquire lock
    try {
        logEntry.plusTwoCount = Math.ceil(logEntry.plusTwoCount / 2);
        const data = await browser.storage.local.get({ highlightLog: [] });
        const updatedLog = [...data.highlightLog, logEntry];
        await browser.storage.local.set({ highlightLog: updatedLog });
        broadcastLeaderboardUpdate();
    } catch (error)
        {
    } finally {
        isSavingLog = false; // Release lock
    }
}

// --- Polling Logic ---

function processMessageForYesNoPoll(text, images) {
    // Block new votes during cooldown OR when poll is concluded (results locked)
    if (isPollOnCooldown || isPollConcluded) return;

    const yesTerms = ['yes', 'y'];
    const noTerms = ['no', 'n'];
    const words = text.toLowerCase().split(/\s+/);

    let isYes = words.some(w => yesTerms.includes(w));
    let isNo = words.some(w => noTerms.includes(w));

    if (!isYes && !isNo) {
        const alts = images.map(alt => alt.toLowerCase());
        isYes = alts.some(alt => yesTerms.includes(alt));
        isNo = alts.some(alt => noTerms.includes(alt));
    }

    if (isYes === isNo) return; // Ignore if both or neither are present

    if (!isPollActive) {
        isPollActive = true;
        pollStartTime = Date.now();
        lastTotalResponsesChecked = 0;
        if (pollActivityCheckTimerId) clearInterval(pollActivityCheckTimerId);
        pollActivityCheckTimerId = setInterval(checkPollActivity, settings.polling?.yesNo?.activityCheckInterval);
    }

    if (isYes) yesCount++;
    else noCount++;

    broadcastPollUpdate();
}

function checkPollActivity() {
    if (!isPollActive || isPollConcluded) {
        if (pollActivityCheckTimerId) clearInterval(pollActivityCheckTimerId);
        pollActivityCheckTimerId = null;
        return;
    }

    const currentTotal = yesCount + noCount;
    const growth = currentTotal - lastTotalResponsesChecked;
    const pollAgeMs = Date.now() - pollStartTime;
    const minimumPollDuration = 10000; // Minimum 10 seconds before poll can end

    // Only check for ending if poll has been running for minimum duration
    if (pollAgeMs < minimumPollDuration) {
        lastTotalResponsesChecked = currentTotal;
        return;
    }

    if (currentTotal >= settings.polling?.yesNo?.displayThreshold) {
        // Poll has enough responses - check if activity has dropped significantly
        if (growth < settings.polling?.yesNo?.activityThreshold) {
            endYesNoPoll();
        } else {
            lastTotalResponsesChecked = currentTotal;
        }
    } else {
        // Poll doesn't have enough responses yet - be more lenient about ending
        if (growth === 0 && pollAgeMs > minimumPollDuration * 2) {
            // Only clear if no activity for extended time (20+ seconds)
            clearYesNoPollData();
        } else {
            lastTotalResponsesChecked = currentTotal;
        }
    }
}

function endYesNoPoll() {
    if (pollActivityCheckTimerId) clearInterval(pollActivityCheckTimerId);
    pollActivityCheckTimerId = null;
    isPollConcluded = true;
    broadcastPollUpdate();

    // Lock results for display duration
    if (pollClearTimerId) clearTimeout(pollClearTimerId);
    pollClearTimerId = setTimeout(clearYesNoPollData, settings.polling?.yesNo?.resultDisplayTime);

    // Start cooldown immediately (prevents new polls during result display + cooldown)
    const totalCooldownTime = settings.polling?.yesNo?.resultDisplayTime + (settings.polling?.yesNo?.cooldownDuration || 3000);
    
    isPollOnCooldown = true;
    if (pollCooldownTimerId) clearTimeout(pollCooldownTimerId);
    pollCooldownTimerId = setTimeout(() => {
        isPollOnCooldown = false;
    }, totalCooldownTime);
}

function clearYesNoPollData() {
    yesCount = 0; noCount = 0; pollStartTime = 0;
    isPollActive = false; isPollConcluded = false;
    lastTotalResponsesChecked = 0;

    if (pollClearTimerId) clearTimeout(pollClearTimerId);
    pollClearTimerId = null;
    if (pollActivityCheckTimerId) clearInterval(pollActivityCheckTimerId);
    pollActivityCheckTimerId = null;

    broadcastPollUpdate();
}


// --- Polling Systems (Modularized) ---
// Generic polling functionality has been moved to polling/generic-polling.js
// Unified polling system in polling/unified-polling.js (new)

let genericPolling = null;
let unifiedPolling = null;

function initializeGenericPolling() {
    if (typeof GenericPolling !== 'undefined' && !genericPolling) {
        genericPolling = GenericPolling;
        genericPolling.initialize({
            settings: settings,
            broadcastToPopouts: broadcastToPopouts,
            webhookClient: webhookClient
        });
        console.log('[Background] Generic Polling module initialized');
    }
}

function initializeUnifiedPolling() {
    
    if (typeof UnifiedPolling !== 'undefined' && !unifiedPolling) {
        unifiedPolling = UnifiedPolling;
        unifiedPolling.initializeUnifiedPolling({
            settings: settings,
            broadcastToPopouts: broadcastToPopouts,
            broadcastGaugeUpdate: broadcastGaugeUpdate,
            webhookClient: webhookClient
        });
        console.log('[Background] ✅ Unified Polling system initialized successfully');
        console.log('[Background] Unified polling enabled in settings:', settings.polling?.unified?.enabled);
        
        // Run a quick test if enabled
        if (settings.polling?.unified?.enabled) {
            console.log('[Background] 🧪 Running quick categorization test...');
            unifiedPolling.testMessageCategorization();
        }
    } else if (typeof UnifiedPolling === 'undefined') {
        console.warn('[Background] ⚠️ UnifiedPolling module not loaded');
    } else if (unifiedPolling) {
        console.log('[Background] ℹ️ Unified polling already initialized');
    }
}

// Wrapper functions to maintain backward compatibility
function processMessageForGenericPoll(text, images) {
    if (genericPolling) {
        genericPolling.processMessage(text, images);
    } else {
        console.log('[Background] Generic polling not initialized yet');
    }
}

function getGenericPollState() {
    return genericPolling ? genericPolling.getState() : {
        isActive: false,
        isConcluded: false,
        monitoringType: 'sentiment',
        shouldDisplay: false
    };
}

function broadcastGenericPollUpdate() {
    const pollData = getGenericPollState();
    broadcastToPopouts({ type: 'GENERIC_POLL_UPDATE', data: pollData });
    
    // Send to webhook if enabled
    if (webhookClient && settings.integrations?.webhook?.events?.pollUpdates) {
        webhookClient.sendEvent('generic_poll_update', pollData);
    }
}

// --- Event Listeners ---

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'CHAT_MESSAGE_FOUND':
            processChatMessage(message.data);
            sendResponse({ success: true });
            break;

        case 'HIGHLIGHT_MESSAGE_REQUEST':
            processHighlightRequest(message.data);
            sendResponse({ success: true }); // Send acknowledgment response
            break;

        case 'REQUEST_INITIAL_STATE':
            console.log('[Background] REQUEST_INITIAL_STATE received!');
            // Wait for the initial setup to complete before responding to prevent a race condition
            initializationPromise.then(() => {
                console.log('[Background] initializationPromise resolved, getting leaderboard data');
                getLeaderboardData().then(leaderboardData => {
                    console.log('[Background] About to send settings with keys:', typeof settings, Object.keys(settings).length);
                    console.log('[Background] Sending initial state to popout');
                    console.log('[Background] Settings keys:', Object.keys(settings));
                    console.log('[Background] Settings display:', settings.display);
                    const response = {
                        settings: settings,
                        gauge: getGaugeState(),
                        poll: getPollState(),
                        genericPoll: getGenericPollState(),
                        leaderboard: leaderboardData
                    };
                    
                    // Add unified poll state if unified system is enabled
                    if (settings.polling?.unified?.enabled && unifiedPolling) {
                        response.unifiedPoll = unifiedPolling.getUnifiedPollState();
                    }
                    
                    sendResponse(response);
                }).catch(error => {
                    console.error('[Background] Error getting leaderboard data:', error);
                    sendResponse({ error: error.message });
                });
            }).catch(error => {
                console.error('[Background] Error in initializationPromise:', error);
                sendResponse({ error: error.message });
            });
            return true; // Keep message channel open for the async response

        case 'TOGGLE_LEADERBOARD_MODE':
            leaderboardDisplayMode = leaderboardDisplayMode === 'hidden' ? 'shown' : 'hidden';
            if (leaderboardDisplayMode === 'shown') {
                // Clear any active highlighted messages to show the leaderboard
                broadcastToPopouts({ type: 'CLEAR_MESSAGES' });
                activeHighlightTrackers.forEach(tracker => saveLogEntry(tracker.logEntry));
                activeHighlightTrackers.clear();
                currentNonAppendTrackerId = null;
            }
            
            // Send leaderboard state update to content scripts
            broadcastToPopouts({ type: 'LEADERBOARD_STATE_UPDATE', mode: leaderboardDisplayMode });
            
            // Send leaderboard toggle to streamview via webhook
            if (webhookClient) {
                webhookClient.sendEvent('leaderboard_toggle', {
                    mode: leaderboardDisplayMode,
                    isVisible: leaderboardDisplayMode === 'shown'
                });
            }
            break;

        // SETTINGS_UPDATED removed - now using storage.onChanged listener only

        case 'REQUEST_SETTINGS': // Sent from content scripts requesting initial settings
            // Wait for initialization to complete before sending settings
            initializationPromise.then(() => {
                browser.tabs.sendMessage(sender.tab.id, {
                    type: 'SETTINGS_UPDATE',
                    data: settings
                }).catch(() => {
                    // Tab might not be ready to receive messages yet, ignore silently
                });
                // Send success response
                sendResponse({ success: true });
            }).catch(error => {
                console.error('[Background] Error in REQUEST_SETTINGS:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true; // Keep message channel open for async response

        case 'GET_SETTINGS': // Direct settings request
            initializationPromise.then(() => {
                sendResponse({ settings: settings });
            }).catch(error => {
                console.error('[Background] Error in GET_SETTINGS:', error);
                sendResponse({ error: error.message });
            });
            return true; // Keep message channel open for async response

        case 'OPEN_OPTIONS_PAGE': // Sent from content script
            browser.runtime.openOptionsPage();
            break;

        case 'OPEN_POPOUT_WINDOW': // Sent from new in-chat button
            openPopout();
            break;
            
        case 'TEST_UNIFIED_POLLING': // Test command
            console.log('[Background] Testing unified polling system...');
            if (unifiedPolling) {
                // Run categorization test
                unifiedPolling.testMessageCategorization();
                
                // Test some sample messages
                const testMessages = [
                    { text: "yes", images: [] },
                    { text: "no", images: [] },
                    { text: "5", images: [] },
                    { text: "a", images: [] },
                    { text: "+2", images: [] },
                    { text: "lol", images: [] }
                ];
                
                console.log('[Background] Testing message processing...');
                testMessages.forEach(msg => {
                    console.log(`[Background] Processing test message: "${msg.text}"`);
                    unifiedPolling.processUnifiedMessage(msg.text, msg.images, { username: 'test_user' });
                });
                
                // Get current state
                const pollState = unifiedPolling.getUnifiedPollState();
                const gaugeState = unifiedPolling.getUnifiedGaugeState();
                
                console.log('[Background] Current poll state:', pollState);
                console.log('[Background] Current gauge state:', gaugeState);
                
                sendResponse({ success: true, pollState, gaugeState });
            } else {
                console.log('[Background] Unified polling not available');
                sendResponse({ success: false, error: 'Unified polling not initialized' });
            }
            return true;
            
        case 'RESET_UNIFIED_POLLING': // Reset command
            console.log('[Background] Resetting unified polling system...');
            if (unifiedPolling) {
                unifiedPolling.clearPollData();
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'Unified polling not initialized' });
            }
            break;

        case 'CREATE_STREAMVIEW': // Sent from options page
            streamviewClient.createStreamview().then(result => {
                sendResponse({ success: true, data: result });
            }).catch(error => {
                const errorMessage = (error instanceof Error) ? error.message : String(error);
                sendResponse({ success: false, error: errorMessage });
            });
            return true; // Keep message channel open for async response

        // UPDATE_STREAMVIEW removed - browser source is now configured independently via web UI
    }
});

browser.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        loadSettings();
    }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url) {
        return;
    }

    const isTwitch = tab.url.includes("twitch.tv");
    const isYouTube = tab.url.includes("youtube.com") && settings.features?.enableYouTube;

    // When a supported chat page loads, reset the state to keep it clean between streams.
    if (isTwitch || isYouTube) {
        occurrenceCount = 0;
        recentMaxValue = 0;
        clearYesNoPollData();
        activeHighlightTrackers.clear();
        currentNonAppendTrackerId = null;
        processedMessages.clear(); // Clear processed message history for new stream
        broadcastGaugeUpdate();
        broadcastLeaderboardUpdate();

        // Auto-open logic for popout chat windows
        if (settings.behavior?.autoOpenPopout) {
            const isTwitchPopout = isTwitch && tab.url.includes("/popout/");
            const isYouTubePopout = isYouTube && tab.url.includes("/live_chat");

            // For Twitch, only auto-open if the URL substring matches (or is not set).
            // For YouTube, always auto-open if the setting is enabled, as the substring check doesn't apply.
            const shouldOpenForTwitch = isTwitchPopout && (!settings.behavior?.requiredUrlSubstring || tab.url.includes(settings.behavior?.requiredUrlSubstring));
            const shouldOpenForYouTube = isYouTubePopout;

            if (shouldOpenForTwitch || shouldOpenForYouTube) {
                openPopout();
            }
        }
    }
});

browser.windows.onRemoved.addListener((windowId) => {
    if (windowId === popoutWindowId) {
        popoutWindowId = null;
    }
});

// --- Initialization ---

async function initialize() {
    await loadSettings();
    if (settings.core?.enableCounting) {
        setupDecayMechanism();
    }
    
    // Initialize modular components
    initializeGenericPolling();
    initializeUnifiedPolling();
}

initializationPromise = initialize();