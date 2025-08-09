// /Users/tyler/repos/plus2BS/scripts/background.js

// --- Service Worker State ---
let settings = {};

// Gauge State
let occurrenceCount = 0;
let recentMaxValue = 0;
let lastIncrementTime = 0;
let decayTimerId = null;
let resetRecentMaxTimerId = null;

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
    leaderboardHeaderText: 'Leaderboard', leaderboardBackgroundColor: '#000000', leaderboardBackgroundAlpha: 0, leaderboardTextColor: '#FFFFFF'
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
function getChannelNameFromUrl(url) {
    const match = url.match(/\/popout\/([^/]+)\/|\.tv\/([^/]+)/);
    if (match) {
        return match[1] || match[2];
    }
    return 'unknown';
}

// --- Broadcasting ---
function broadcastToPopouts(message) {
    browser.runtime.sendMessage(message).catch(error => {
        // This callback is used to check for an error.
        // The "Receiving end does not exist" error is expected and harmless if the popout window is not open.
        // We can safely ignore it by checking for chrome.runtime.lastError.
        if (error.message.includes("Receiving end does not exist")) { /* Silently ignore */ }
        else { console.error("Broadcast failed:", error); }
    });
}

function broadcastGaugeUpdate() {
    broadcastToPopouts({ type: 'GAUGE_UPDATE', data: getGaugeState() });
}

function broadcastPollUpdate() {
    broadcastToPopouts({ type: 'POLL_UPDATE', data: getPollState(), gaugeData: getGaugeState() });
}

function broadcastLeaderboardUpdate() {
    getLeaderboardData().then(leaderboardData => {
        broadcastToPopouts({ type: 'LEADERBOARD_UPDATE', data: leaderboardData });
    });
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

    // If counting was just toggled, reset state and timers
    if (oldSettings.enableCounting !== settings.enableCounting) {
        occurrenceCount = 0;
        recentMaxValue = 0;
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

    console.log('[Plus2] Settings loaded/reloaded in background.');
    broadcastToPopouts({ type: 'SETTINGS_UPDATE', data: settings });
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
    const { text, images, isModPost, modReplyContent } = data;

    if (isModPost && settings.enableModPostReplyHighlight) {
        processHighlightRequest({ isModPost: true, html: modReplyContent });
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
            broadcastGaugeUpdate();
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
    const isYouTube = channelUrl && channelUrl.includes('youtube.com');

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

    broadcastToPopouts({
        type: 'HIGHLIGHT_MESSAGE',
        data: {
            html: finalHtmlString,
            id: trackerId,
            isAppend: settings.appendMessages,
            displayTime: settings.displayTime,
            platform: isYouTube ? 'youtube' : 'twitch'
        }
    });

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
        {console.error("[Plus2] Error saving log entry:", error);
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
                        settings,
                        gauge: getGaugeState(),
                        poll: getPollState(),
                        leaderboard: leaderboardData
                    });
                });
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
            broadcastLeaderboardUpdate();
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
    }
});

browser.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        console.log('[Plus2] Detected settings change in browser.storage.sync, reloading.');
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
        console.log(`[Plus2] ${isTwitch ? 'Twitch' : 'YouTube'} tab loaded. Resetting state.`);
        occurrenceCount = 0;
        recentMaxValue = 0;
        clearYesNoPollData();
        activeHighlightTrackers.clear();
        currentNonAppendTrackerId = null;
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
                console.log(`[Plus2] ${isTwitchPopout ? 'Twitch' : 'YouTube'} popout chat detected, auto-opening popout window.`);
                openPopout();
            }
        }
    }
});

browser.windows.onRemoved.addListener((windowId) => {
    if (windowId === popoutWindowId) {
        console.log('[Plus2] Popout window closed.');
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