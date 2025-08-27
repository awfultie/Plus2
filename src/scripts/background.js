// /Users/tyler/repos/plus2BS/scripts/background.js

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

// --- Default Settings (mirrors options.js for initialization) ---
const defaultOptions = {
    requiredUrlSubstring: "", displayTime: 10000, chromaKeyColor: '#b9e6b7', messageBGColor: '#111111', appendMessages: false,
    stringToCount: "+2, lol, lmao, lul, lmfao, dangLUL",
    decayInterval: 500, decayAmount: 1, exactMatchCounting: false, gaugeMaxValue: 30, enableCounting: false,
    peakLabelLow: "Heh", peakLabelMid: "Funny!", peakLabelHigh: "Hilarious!!", peakLabelMax: "OFF THE CHARTS!!!",
    recentMaxResetDelay: 2000, enable7TVCompat: false, enableYouTube: true, enableModPostReplyHighlight: true, enableYesNoPolling: false,
    pollClearTime: 12000, pollCooldownDuration: 5000, pollActivityThreshold: 1, pollActivityCheckInterval: 2000,
    pollDisplayThreshold: 15, inactivityTimeoutDuration: 5000, maxPrunedCacheSize: 500, gaugeTrackColor: '#e0e0e0',
    gaugeTrackAlpha: 0, gaugeTrackBorderAlpha: 1, gaugeTrackBorderColor: '#505050', gaugeFillGradientStartColor: '#ffd700',
    gaugeFillGradientEndColor: '#ff0000', recentMaxIndicatorColor: '#ff0000', peakLabelLowColor: '#ffffff',
    peakLabelMidColor: '#ffff00', peakLabelHighColor: '#ffa500', peakLabelMaxColor: '#ff0000', yesPollBarColor: '#ff0000', noPollBarColor: '#0000ff',
    pollTextColor: '#ffffff', enablePeakLabelAnimation: true, peakLabelAnimationDuration: 0.6, peakLabelAnimationIntensity: 2,
    enableUsernameColoring: true, usernameDefaultColor: '#FF0000', paragraphTextColor: '#FFFFFF',
    popoutDefaultWidth: 600, popoutDefaultHeight: 300, autoOpenPopout: false, popoutBaseFontSize: 18, enableReplyTooltip: true,
    enableHighlightTracking: false, enableLeaderboard: false, leaderboardHighlightValue: 10, leaderboardTimeWindowDays: 7,
    leaderboardHeaderText: 'Leaderboard', leaderboardBackgroundColor: '#000000', leaderboardBackgroundAlpha: 0, leaderboardTextColor: '#FFFFFF',
    gaugeMinDisplayThreshold: 3,
    // Webhook settings
    enableWebhookIntegration: false, webhookEndpoint: "", webhookApiKey: "", webhookTimeout: 5000, webhookRetryAttempts: 3,
    webhookEvents: { highlightMessages: true, gaugeUpdates: true, pollUpdates: true, leaderboardUpdates: true },
    // Streamview settings
    enableStreamview: false, streamviewBaseUrl: "https://studio--plus2-streamview.us-central1.hosted.app", streamviewApiKey: "", currentStreamview: null,
    // Streamview security options
    streamviewGenerateApiKey: false, streamviewGenerateViewToken: false, streamviewRequireViewToken: false,
    // StreamView template storage
    streamviewTemplates: {},
    // Browser Source Style settings
    browserSourceStyle: null
};


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
        // This callback is used to check for an error.
        // The "Receiving end does not exist" error is expected and harmless if the popout window is not open.
        // We can safely ignore it by checking for chrome.runtime.lastError.
        if (error.message.includes("Receiving end does not exist")) { /* Silently ignore */ }
        else { }
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
    
    console.log(`[Plus2 Gauge] Broadcasting update - Count: ${gaugeData.occurrenceCount}, RecentMax: ${gaugeData.recentMaxValue}, Threshold: ${settings.gaugeMinDisplayThreshold}`);
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

function buildNestedConfig(settings) {
    // This function builds the nested configuration object that is used by popout.js
    // and sent to the streamview server. It should be kept in sync with streamview-client.js.
    return {
        display: {
            chromaKeyColor: settings.chromaKeyColor,
            popoutBaseFontSize: settings.popoutBaseFontSize,
            popoutDefaultWidth: settings.popoutDefaultWidth,
            popoutDefaultHeight: settings.popoutDefaultHeight,
            displayTime: settings.displayTime
        },
        features: {
            enableCounting: settings.enableCounting,
            enableYesNoPolling: settings.enableYesNoPolling,
            enableLeaderboard: settings.enableLeaderboard,
            enableHighlightTracking: settings.enableHighlightTracking,
            appendMessages: settings.appendMessages
        },
        styling: {
            messageBGColor: settings.messageBGColor,
            paragraphTextColor: settings.paragraphTextColor,
            enableUsernameColoring: settings.enableUsernameColoring,
            usernameDefaultColor: settings.usernameDefaultColor,
            gauge: {
                gaugeMaxValue: settings.gaugeMaxValue,
                gaugeMinDisplayThreshold: settings.gaugeMinDisplayThreshold,
                gaugeTrackColor: settings.gaugeTrackColor,
                gaugeTrackAlpha: settings.gaugeTrackAlpha,
                gaugeTrackBorderColor: settings.gaugeTrackBorderColor,
                gaugeTrackBorderAlpha: settings.gaugeTrackBorderAlpha,
                gaugeFillGradientStartColor: settings.gaugeFillGradientStartColor,
                gaugeFillGradientEndColor: settings.gaugeFillGradientEndColor,
                recentMaxIndicatorColor: settings.recentMaxIndicatorColor,
                peakLabels: {
                    low: { text: settings.peakLabelLow, color: settings.peakLabelLowColor },
                    mid: { text: settings.peakLabelMid, color: settings.peakLabelMidColor },
                    high: { text: settings.peakLabelHigh, color: settings.peakLabelHighColor },
                    max: { text: settings.peakLabelMax, color: settings.peakLabelMaxColor }
                },
                enablePeakLabelAnimation: settings.enablePeakLabelAnimation,
                peakLabelAnimationDuration: settings.peakLabelAnimationDuration,
                peakLabelAnimationIntensity: settings.peakLabelAnimationIntensity
            },
            polling: {
                yesPollBarColor: settings.yesPollBarColor,
                noPollBarColor: settings.noPollBarColor,
                pollTextColor: settings.pollTextColor
            },
            leaderboard: {
                leaderboardHeaderText: settings.leaderboardHeaderText,
                leaderboardBackgroundColor: settings.leaderboardBackgroundColor,
                leaderboardBackgroundAlpha: settings.leaderboardBackgroundAlpha,
                leaderboardTextColor: settings.leaderboardTextColor
            }
        }
    };
}

// --- State Packaging ---
function getGaugeState() {
    return {
        occurrenceCount,
        gaugeMaxValue: settings.gaugeMaxValue,
        recentMaxValue,
        isPollActive,
        peakLabels: {
            low: { text: settings.peakLabelLow, color: settings.peakLabelLowColor },
            mid: { text: settings.peakLabelMid, color: settings.peakLabelMidColor },
            high: { text: settings.peakLabelHigh, color: settings.peakLabelHighColor },
            max: { text: settings.peakLabelMax, color: settings.peakLabelMaxColor }
        }
    };
}

// Webhook-specific gauge state without peakLabels (moved to StreamView visual config)
function getWebhookGaugeState() {
    return {
        occurrenceCount,
        gaugeMaxValue: settings.gaugeMaxValue,
        recentMaxValue,
        isPollActive
    };
}

function getPollState() {
    const total = yesCount + noCount;
    let winnerMessage = "";
    if (isPollConcluded) {
        if (yesCount > noCount) winnerMessage = `Yes! (${((yesCount/total)*100).toFixed(0)}%)`;
        else if (noCount > yesCount) winnerMessage = `No! (${((noCount/total)*100).toFixed(0)}%)`;
        else winnerMessage = "Tie!";
    }
    return {
        yesCount,
        noCount,
        total,
        isConcluded: isPollConcluded, // Correctly reference the global state variable
        winnerMessage,
        shouldDisplay: isPollActive && (total >= settings.pollDisplayThreshold || isPollConcluded)
    };
}

async function getLeaderboardData() {
    const storage = await browser.storage.local.get({ highlightLog: [] });
    const log = storage.highlightLog;
    const cutoffTime = new Date(Date.now() - settings.leaderboardTimeWindowDays * 24 * 60 * 60 * 1000);

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
        score: (data.highlightCount * settings.leaderboardHighlightValue) + data.plusTwoSum
    })).sort((a, b) => b.score - a.score).slice(0, 3);

    const hasMessage = activeHighlightTrackers.size > 0 || currentNonAppendTrackerId !== null;

    return {
        topUsers,
        isVisible: settings.enableLeaderboard && leaderboardDisplayMode === 'shown' && !hasMessage,
        mode: leaderboardDisplayMode,
        headerText: settings.leaderboardHeaderText
    };
}

// --- Core Logic ---

async function loadSettings() {
    const items = await browser.storage.sync.get(defaultOptions);
    const oldSettings = { ...settings };
    settings = items;

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
    if (oldSettings.enableWebhookIntegration !== settings.enableWebhookIntegration ||
        oldSettings.webhookEndpoint !== settings.webhookEndpoint ||
        oldSettings.webhookApiKey !== settings.webhookApiKey) {
        webhookClient.clearRetries();
    }

    // If counting was just toggled, reset state and timers
    if (oldSettings.enableCounting !== settings.enableCounting) {
        occurrenceCount = 0;
        recentMaxValue = 0;
        processedMessages.clear(); // Clear processed message history when toggling counting
        if (decayTimerId) clearInterval(decayTimerId);
        decayTimerId = null;
        if (resetRecentMaxTimerId) clearTimeout(resetRecentMaxTimerId);
        resetRecentMaxTimerId = null;
        if (settings.enableCounting) {
            setupDecayMechanism();
        }
        broadcastGaugeUpdate();
    }

    // If polling was just toggled
    if (oldSettings.enableYesNoPolling !== settings.enableYesNoPolling) {
        clearYesNoPollData(); // This also broadcasts an update
    }

    // If leaderboard was just toggled
    if (oldSettings.enableLeaderboard !== settings.enableLeaderboard) {
        broadcastLeaderboardUpdate();
    }

    broadcastToPopouts({ type: 'SETTINGS_UPDATE', data: buildNestedConfig(settings) });
}

function setupDecayMechanism() {
    if (decayTimerId) clearInterval(decayTimerId);
    if (!settings.enableCounting || settings.decayInterval <= 0 || settings.decayAmount <= 0) return;

    lastIncrementTime = Date.now();
    decayTimerId = setInterval(() => {
        if (occurrenceCount > 0 && (Date.now() - lastIncrementTime >= settings.decayInterval)) {
            if (resetRecentMaxTimerId) clearTimeout(resetRecentMaxTimerId);
            resetRecentMaxTimerId = null;

            occurrenceCount = Math.max(0, occurrenceCount - settings.decayAmount);
            broadcastGaugeUpdate();
            lastIncrementTime = Date.now();

            if (occurrenceCount === 0) {
                resetRecentMaxTimerId = setTimeout(() => {
                    if (occurrenceCount === 0) {
                        recentMaxValue = 0;
                        broadcastGaugeUpdate();
                    }
                }, settings.recentMaxResetDelay);
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
            console.log(`[Plus2 Dedup] DUPLICATE message blocked: "${text}" (User: ${username})`);
            return;
        }
        
        // Mark this message as processed
        processedMessages.add(messageKey);
        console.log(`[Plus2 Dedup] Message processed: "${text}" (User: ${username}, Hash: ${messageHash})`);
    } else {
        console.log(`[Plus2 Dedup] Testing user message (no dedup): "${text}"`);
    }

    if (isModPost && settings.enableModPostReplyHighlight) {
        processHighlightRequest({ isModPost: true, html: modReplyContent, channelUrl });
        return;
    }

    if (settings.enableCounting) {
        const terms = settings.stringToCount.split(',').map(s => s.trim());
        const check = settings.exactMatchCounting ?
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
            console.log(`[Plus2 Gauge] Match found! Count: ${occurrenceCount}, RecentMax: ${recentMaxValue}, User: ${username}, Text: "${text}"`);
            broadcastGaugeUpdate();
        } else {
            console.log(`[Plus2 Gauge] No match found for: "${text}" (User: ${username})`);
        }
    }

    if (settings.enableYesNoPolling) {
        processMessageForYesNoPoll(text, images);
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
    let usernameColor = settings.usernameDefaultColor || '#FF0000'; // Fallback color
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
            <div class="plus2-popout-message-entry" style="background-color: ${settings.messageBGColor};">
                <div class="plus2-popout-message-line plus2-mod-post">${processedHtml}</div>
            </div>`;
    } else {
        // If uniform coloring is enabled OR it's a YouTube message, strip the inline style attribute.
        // This allows the CSS variable in the popout to take precedence for Twitch, and forces the custom color for YouTube.
        if ((settings.enableUsernameColoring || isYouTube) && usernameHTML) {
            usernameHTML = usernameHTML.replace(/ style=".*?"/i, '');
        }

        let replyBlock = '';
        if (replyHTML) {
            replyBlock = `<div class="plus2-popout-reply-block">${replyHTML}</div>`;
        }
        finalHtmlString = `
            <div class="plus2-popout-message-entry" style="background-color: ${settings.messageBGColor};">
                ${replyBlock}
                <div class="plus2-popout-message-line">
                    ${badgesHTML}
                    <span class="plus2-popout-username">${usernameHTML}:</span>
                    <span class="plus2-popout-message-body">${messageBodyHTML}</span>
                </div>
            </div>`;
    }

    let trackerId = null;
    if (settings.enableHighlightTracking && username) {
        trackerId = nextTrackerId++;
        const logEntry = {
            username: username,
            timestamp: new Date().toISOString(),
            plusTwoCount: 0,
            channel: getChannelNameFromUrl(channelUrl)
        };
        activeHighlightTrackers.set(trackerId, { logEntry });
    }

    if (!settings.appendMessages) {
        if (currentNonAppendTrackerId !== null && activeHighlightTrackers.has(currentNonAppendTrackerId)) {
            saveLogEntry(activeHighlightTrackers.get(currentNonAppendTrackerId).logEntry);
            activeHighlightTrackers.delete(currentNonAppendTrackerId);
        }
        currentNonAppendTrackerId = trackerId;
    }

    const highlightData = {
        html: finalHtmlString,
        id: trackerId || 0,
        isAppend: settings.appendMessages,
        displayTime: settings.displayTime,
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
        }
    }, settings.displayTime);
}

async function saveLogEntry(logEntry) {
    if (!settings.enableHighlightTracking || isSavingLog) return;

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
        pollActivityCheckTimerId = setInterval(checkPollActivity, settings.pollActivityCheckInterval);
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

    if (currentTotal >= settings.pollDisplayThreshold) {
        if (growth < settings.pollActivityThreshold) {
            endYesNoPoll();
        } else {
            lastTotalResponsesChecked = currentTotal;
        }
    } else {
        if (growth < settings.pollActivityThreshold && pollStartTime > 0) {
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

    if (pollClearTimerId) clearTimeout(pollClearTimerId);
    pollClearTimerId = setTimeout(clearYesNoPollData, settings.pollClearTime);

    if (settings.pollCooldownDuration > 0) {
        isPollOnCooldown = true;
        if (pollCooldownTimerId) clearTimeout(pollCooldownTimerId);
        pollCooldownTimerId = setTimeout(() => {
            isPollOnCooldown = false;
        }, settings.pollCooldownDuration);
    }
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

// --- Event Listeners ---

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'CHAT_MESSAGE_FOUND':
            processChatMessage(message.data);
            break;

        case 'HIGHLIGHT_MESSAGE_REQUEST':
            processHighlightRequest(message.data);
            break;

        case 'REQUEST_INITIAL_STATE':
            // Wait for the initial setup to complete before responding to prevent a race condition
            initializationPromise.then(() => {
                getLeaderboardData().then(leaderboardData => {
                    sendResponse({
                        settings: buildNestedConfig(settings),
                        gauge: getGaugeState(),
                        poll: getPollState(),
                        leaderboard: leaderboardData
                    });
                }).catch(error => {
                    sendResponse({ error: error.message });
                });
            }).catch(error => {
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

        case 'SETTINGS_UPDATED': // Sent from options page on save
            loadSettings();
            break;

        case 'OPEN_OPTIONS_PAGE': // Sent from content script
            browser.runtime.openOptionsPage();
            break;

        case 'OPEN_POPOUT_WINDOW': // Sent from new in-chat button
            openPopout();
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
    const isYouTube = tab.url.includes("youtube.com") && settings.enableYouTube;

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
        if (settings.autoOpenPopout) {
            const isTwitchPopout = isTwitch && tab.url.includes("/popout/");
            const isYouTubePopout = isYouTube && tab.url.includes("/live_chat");

            // For Twitch, only auto-open if the URL substring matches (or is not set).
            // For YouTube, always auto-open if the setting is enabled, as the substring check doesn't apply.
            const shouldOpenForTwitch = isTwitchPopout && (!settings.requiredUrlSubstring || tab.url.includes(settings.requiredUrlSubstring));
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
    if (settings.enableCounting) {
        setupDecayMechanism();
    }
}

initializationPromise = initialize();