// /Users/tyler/repos/plus2BS/scripts/popout.js

// --- Global State & Element References ---
let settings = {};
let highlightedMessageContainer;
let pollState = {}; // To hold the current state of the poll
let messageTarget;
let gaugeContainerElement, gaugeFillElement, recentMaxIndicatorElement, maxLevelReachedLabelElement;
let yesNoPollDisplayContainerElement, yesBarElement, noBarElement, yesPollLabelElement, noPollLabelElement, pollWinnerTextElement;
let leaderboardContainerElement;
let activeMessageTimeouts = new Map(); // To manage timeouts for individual messages in append mode

// --- Helper Functions ---

function hexToRgba(hex, alpha) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function injectAnimationStyles() {
    const styleId = 'plus2AnimationStyles';
    let style = document.getElementById(styleId);
    if (style) style.remove(); // Remove to update with new settings if needed

    style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
    @keyframes plus2-vertical-shaking {
      0% { transform: translateY(-1px); }
      25% { transform: translateY(-${Math.max(1, settings.peakLabelAnimationIntensity || 2)}px); }
      50% { transform: translateY(-1px); }
      75% { transform: translateY(-${Math.max(1, settings.peakLabelAnimationIntensity || 2)}px); }
      100% { transform: translateY(-1px); }
    }
    .plus2-shake-animation {
      animation-name: plus2-vertical-shaking;
      animation-duration: ${settings.peakLabelAnimationDuration || 0.6}s;
      animation-iteration-count: infinite;
      animation-timing-function: ease-in-out;
    }
  `;
    document.head.appendChild(style);
}

// --- UI Building and Rendering ---

function buildHighlightContainerStructure() {
    // Clear body first
    document.body.innerHTML = '';

    // Set CSS variables on the root for easier styling from popout.css
    document.documentElement.style.setProperty('--plus2-paragraph-text-color', settings.paragraphTextColor || '#FFFFFF');
    // At this point, settings might be empty. Default to 'unset' to show native colors
    // until the full settings are loaded and applied by applyAllStyles.
    if (settings.enableUsernameColoring) {
        document.documentElement.style.setProperty('--plus2-username-color', settings.usernameDefaultColor || '#FFFFFF');
    } else {
        document.documentElement.style.setProperty('--plus2-username-color', 'unset');
    }
    document.documentElement.style.fontSize = `${settings.popoutBaseFontSize || 14}px`;
    document.body.style.backgroundColor = settings.chromaKeyColor;
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    // Main container
    highlightedMessageContainer = document.createElement('div');
    highlightedMessageContainer.id = 'highlightedMessageContainer';
    highlightedMessageContainer.className = 'plus2-in-popout'; // Add class for popout-specific styles
    Object.assign(highlightedMessageContainer.style, {
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: settings.chromaKeyColor,
        padding: '10px',
        boxSizing: 'border-box',
        zIndex: '1000',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
    });

    // Message Target Area
    messageTarget = document.createElement('div');
    messageTarget.id = 'messageTarget';
    Object.assign(messageTarget.style, {
        flexGrow: '1',
        overflowY: 'hidden', // Prevent scrollbars from appearing
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '5px',
        boxSizing: 'border-box'
    });
    highlightedMessageContainer.appendChild(messageTarget);

    // Gauge Container
    gaugeContainerElement = document.createElement('div');
    gaugeContainerElement.id = 'occurrenceGaugeContainer';
    Object.assign(gaugeContainerElement.style, {
        position: 'relative',
        width: 'calc(100% - 20px)',
        margin: '0 10px',
        height: '20px',
        boxSizing: 'border-box',
        flexShrink: '0' // Prevent it from shrinking
    });
    highlightedMessageContainer.appendChild(gaugeContainerElement);

    // Leaderboard Container
    leaderboardContainerElement = document.createElement('div');
    leaderboardContainerElement.id = 'plus2LeaderboardContainer';
    Object.assign(leaderboardContainerElement.style, {
        display: 'none',
        position: 'absolute',
        width: 'auto',
        minWidth: '150px',
        height: 'auto',
        bottom: '65px',
        left: '10px',
        padding: '5px 8px',
        boxSizing: 'border-box',
        zIndex: '1011',
        borderRadius: '3px'
    });
    leaderboardContainerElement.innerHTML = `<h4 style="margin: 0 0 4px 0; padding: 0; font-size: 13px; text-align: left; font-weight: bold; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;"></h4><ol id="plus2LeaderboardList" style="margin: 0; padding: 0; list-style-type: none; display: flex; flex-direction: column; align-items: center;"></ol>`;
    highlightedMessageContainer.appendChild(leaderboardContainerElement);

    // Gauge Fill
    gaugeFillElement = document.createElement('div');
    gaugeFillElement.id = 'occurrenceGaugeFill';
    Object.assign(gaugeFillElement.style, {
        height: '100%',
        width: '0%',
        borderRadius: '0px',
        transition: 'width 0.7s ease-out'
    });
    gaugeContainerElement.appendChild(gaugeFillElement);

    // Recent Max Indicator
    recentMaxIndicatorElement = document.createElement('div');
    recentMaxIndicatorElement.id = 'recentMaxIndicator';
    Object.assign(recentMaxIndicatorElement.style, {
        position: 'absolute', top: '0', bottom: '0', width: '2px',
        zIndex: '1003', left: '0%', display: 'none', transition: 'left 0.7s ease-out'
    });
    gaugeContainerElement.appendChild(recentMaxIndicatorElement);

    // Max Level Label
    maxLevelReachedLabelElement = document.createElement('div');
    maxLevelReachedLabelElement.id = 'maxLevelReachedLabel';
    Object.assign(maxLevelReachedLabelElement.style, {
        position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
        display: 'none', justifyContent: 'center', alignItems: 'center', zIndex: '1005'
    });
    gaugeContainerElement.appendChild(maxLevelReachedLabelElement);

    // Yes/No Poll Container
    yesNoPollDisplayContainerElement = document.createElement('div');
    yesNoPollDisplayContainerElement.id = 'yesNoPollDisplayContainer';
    Object.assign(yesNoPollDisplayContainerElement.style, {
        position: 'absolute', bottom: '0px', left: '0', width: '100%', height: '100%',
        display: 'none', zIndex: '1010', flexDirection: 'row'
    });
    gaugeContainerElement.appendChild(yesNoPollDisplayContainerElement);

    // Poll Elements
    yesBarElement = document.createElement('div'); yesBarElement.id = 'yesBar';
    noBarElement = document.createElement('div'); noBarElement.id = 'noBar';
    yesPollLabelElement = document.createElement('div'); yesPollLabelElement.id = 'yesPollLabel';
    noPollLabelElement = document.createElement('div'); noPollLabelElement.id = 'noPollLabel';
    pollWinnerTextElement = document.createElement('div'); pollWinnerTextElement.id = 'pollWinnerText';

    Object.assign(yesBarElement.style, { height: '100%', width: '0%', transition: 'width 0.5s ease-out' });
    Object.assign(noBarElement.style, { height: '100%', width: '0%', transition: 'width 0.5s ease-out' });
    Object.assign(yesPollLabelElement.style, { position: 'absolute', left: '5px', top: '50%', transform: 'translateY(-50%)', textShadow: '-1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black', fontSize: '12px', whiteSpace: 'nowrap', zIndex: '1' });
    Object.assign(noPollLabelElement.style, { position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', textShadow: '-1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black', fontSize: '12px', whiteSpace: 'nowrap', zIndex: '1' });
    Object.assign(pollWinnerTextElement.style, { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textShadow: '-1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black', fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', zIndex: '2', display: 'none' });

    yesNoPollDisplayContainerElement.append(yesBarElement, noBarElement, yesPollLabelElement, noPollLabelElement, pollWinnerTextElement);

    document.body.appendChild(highlightedMessageContainer);
}

function updateGaugeDisplay(gaugeData) {
    if (!gaugeFillElement) return;
    const { occurrenceCount, gaugeMaxValue } = gaugeData;

    // Only hide the gauge fill if the poll is actually being displayed.
    if (pollState.shouldDisplay) {
        gaugeFillElement.style.width = '0%';
    } else {
        const fillPercentage = Math.min(100, Math.max(0, (occurrenceCount / gaugeMaxValue) * 100));
        gaugeFillElement.style.width = `${fillPercentage}%`;
    }
    updateGaugeContainerVisibility(gaugeData);
}

function updateRecentMaxIndicator(gaugeData) {
    if (!recentMaxIndicatorElement || !maxLevelReachedLabelElement) return;
    const { recentMaxValue, gaugeMaxValue, peakLabels } = gaugeData;

    // Only hide the gauge indicators if the poll is actually being displayed.
    if (pollState.shouldDisplay) {
        recentMaxIndicatorElement.style.display = 'none';
        maxLevelReachedLabelElement.style.display = 'none';
        maxLevelReachedLabelElement.classList.remove('plus2-shake-animation');
        return;
    }

    const indicatorPos = (recentMaxValue / gaugeMaxValue) * 100;
    let newLabelText = "";
    let labelInfo = {};

    if (recentMaxValue > 0) {
        if (indicatorPos >= 100) { newLabelText = peakLabels.max.text; labelInfo = { color: peakLabels.max.color, size: '20px', weight: 'bold' }; }
        else if (indicatorPos >= 75) { newLabelText = peakLabels.high.text; labelInfo = { color: peakLabels.high.color, size: '20px', weight: 'bold' }; }
        else if (indicatorPos >= 45) { newLabelText = peakLabels.mid.text; labelInfo = { color: peakLabels.mid.color, size: '18px', weight: 'bold' }; }
        else if (indicatorPos >= 15) { newLabelText = peakLabels.low.text; labelInfo = { color: peakLabels.low.color, size: '16px', weight: 'bold' }; }
    }

    if (newLabelText) {
        maxLevelReachedLabelElement.textContent = newLabelText;
        maxLevelReachedLabelElement.style.color = labelInfo.color;
        maxLevelReachedLabelElement.style.fontSize = labelInfo.size;
        maxLevelReachedLabelElement.style.fontWeight = labelInfo.weight;
        maxLevelReachedLabelElement.style.textShadow = '-1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black';
        maxLevelReachedLabelElement.style.display = 'flex';
        if (newLabelText === peakLabels.max.text && settings.enablePeakLabelAnimation) {
            maxLevelReachedLabelElement.classList.add('plus2-shake-animation');
        } else {
            maxLevelReachedLabelElement.classList.remove('plus2-shake-animation');
        }
    } else {
        maxLevelReachedLabelElement.style.display = 'none';
        maxLevelReachedLabelElement.classList.remove('plus2-shake-animation');
    }

    if (recentMaxValue > 0) {
        recentMaxIndicatorElement.style.left = `calc(${Math.min(100, indicatorPos)}% - 1px)`;
        recentMaxIndicatorElement.style.display = 'block';
    } else {
        recentMaxIndicatorElement.style.display = 'none';
    }
    updateGaugeContainerVisibility(gaugeData);
}

function updateGaugeContainerVisibility(gaugeData) {
    if (!gaugeContainerElement) return;
    const { occurrenceCount, recentMaxValue } = gaugeData;
    const isGaugeVisible = occurrenceCount > 0 || recentMaxValue > 0;
    const isPollVisible = pollState.shouldDisplay; // Check if the poll should be displayed

    if (isGaugeVisible || isPollVisible) {
        gaugeContainerElement.style.display = 'block';
    } else {
        gaugeContainerElement.style.display = 'none';
    }
}

function updateYesNoPollDisplay(pollData) {
    if (!yesNoPollDisplayContainerElement) return;
    const { yesCount, noCount, total, isConcluded, shouldDisplay, winnerMessage } = pollData;

    yesNoPollDisplayContainerElement.style.display = shouldDisplay ? 'flex' : 'none';
    if (shouldDisplay) {
        const yesPct = total > 0 ? (yesCount / total) * 100 : 0;
        const noPct = total > 0 ? (noCount / total) * 100 : 0;
        yesBarElement.style.width = `${yesPct}%`;
        noBarElement.style.width = `${noPct}%`;
        yesPollLabelElement.textContent = `${yesPct.toFixed(0)}% Yes`;
        noPollLabelElement.textContent = `${noPct.toFixed(0)}% No`;
        pollWinnerTextElement.textContent = isConcluded ? winnerMessage : '';
        pollWinnerTextElement.style.display = isConcluded ? 'block' : 'none';
    }
}

function updateLeaderboardDisplay(leaderboardData) {
    if (!leaderboardContainerElement) return;
    const { topUsers, isVisible, mode, headerText } = leaderboardData;

    leaderboardContainerElement.style.display = isVisible ? 'block' : 'none';

    if (isVisible) {
        leaderboardContainerElement.querySelector('h4').textContent = headerText;
        const listElement = leaderboardContainerElement.querySelector('#plus2LeaderboardList');
        listElement.innerHTML = '';
        if (topUsers.length === 0) {
            const li = document.createElement('li');
            li.style.fontStyle = 'italic';
            li.textContent = 'No data yet.';
            listElement.appendChild(li);
        } else {
            topUsers.forEach(user => {
                const li = document.createElement('li');
                li.style.cssText = 'display: flex; justify-content: space-between; width: 90%; margin-bottom: 3px;';

                const userSpan = document.createElement('span');
                userSpan.style.cssText = 'margin-right: 1em; font-weight: bold; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;';
                userSpan.textContent = user.username;

                const scoreSpan = document.createElement('span');
                scoreSpan.style.cssText = 'font-weight: bold; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;';
                scoreSpan.textContent = user.score;

                li.append(userSpan, scoreSpan);
                listElement.appendChild(li);
            });
        }
    }
}

function adjustFontSizeToFit(messageElement) {
    // This feature only makes sense in non-append mode where one message fills the screen.
    if (settings.appendMessages || !messageElement || !messageTarget) return;

    const content = messageElement.querySelector('.plus2-popout-message-entry');
    if (!content) return;

    // Use a timeout of 0 to allow the browser to render the element with the new base font size
    // before we start checking its dimensions. This avoids race conditions.
    setTimeout(() => {
        const containerWidth = messageTarget.clientWidth;
        let availableHeight = messageTarget.clientHeight;

        // If either the counter or poll features are enabled, the gauge might appear.
        // We need to reserve space for it if it's not currently visible.
        if (settings.enableCounting || settings.enableYesNoPolling) {
            // If the gauge is currently hidden, its space is being occupied by messageTarget.
            // We must manually subtract its height to get the true available space for the message.
            if (gaugeContainerElement && gaugeContainerElement.style.display === 'none') {
                const gaugeHeight = 20; // The fixed height of the gauge container
                availableHeight -= gaugeHeight;
            }
        }

        if (containerWidth <= 0 || availableHeight <= 0) return;

        let maxFontSize = settings.popoutBaseFontSize || 18;
        let minFontSize = 8; // Don't shrink smaller than this
        const precision = 0.5; // How close we need to be
        let safety = 20; // Prevent potential infinite loops

        // Apply max size first to get initial dimensions
        content.style.fontSize = `${maxFontSize}px`;

        // If it already fits at the max size, we're done.
        if (content.scrollWidth <= containerWidth && content.scrollHeight <= availableHeight) {
            return;
        }

        // --- Binary search for the optimal font size ---
        // This is much more performant than decrementing in a loop, as it avoids
        // "layout thrashing" by minimizing synchronous reflows.
        while ((maxFontSize - minFontSize > precision) && safety > 0) {
            let midFontSize = (minFontSize + maxFontSize) / 2;
            content.style.fontSize = `${midFontSize}px`;

            // If it overflows, the new maximum is our midpoint.
            if (content.scrollWidth > containerWidth || content.scrollHeight > availableHeight) {
                maxFontSize = midFontSize;
            } else {
                // It fits, so we can try a larger size. The new minimum is our midpoint.
                minFontSize = midFontSize;
            }
            safety--;
        }

        // Apply the final calculated size (the largest that was found to fit).
        content.style.fontSize = `${minFontSize}px`;
    }, 0);
}

function renderHighlightedMessage(messageData) {
    if (!messageTarget) return;
    const { html, id, isAppend, displayTime, platform } = messageData;

    const messageElement = document.createElement('div');
    // Use DOMParser to safely parse the HTML string. This prevents script execution.
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Move the parsed nodes from the temporary document into our message element.
    while (doc.body.firstChild) {
        messageElement.appendChild(doc.body.firstChild);
    }
    messageElement.dataset.messageId = id;

    // If the message is from YouTube, we always apply the custom color directly,
    // overriding any global CSS variables. This ensures uniform color for YouTube
    // regardless of the "Use Uniform Username Color" setting.
    if (platform === 'youtube') {
        // The username is inside a wrapper span, so we need to select the inner span
        // which actually contains the color style.
        const usernameSpan = messageElement.querySelector('.plus2-popout-username > span');
        if (usernameSpan) {
            usernameSpan.style.color = settings.usernameDefaultColor;
        }
    }

    if (isAppend) {
        messageTarget.insertBefore(messageElement, messageTarget.firstChild);
        const timeoutId = setTimeout(() => {
            if (messageElement.parentNode === messageTarget) {
                messageTarget.removeChild(messageElement);
            }
            activeMessageTimeouts.delete(id);
        }, displayTime);
        activeMessageTimeouts.set(id, timeoutId);
    } else {
        // Clear all existing timeouts and messages for non-append mode
        activeMessageTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        activeMessageTimeouts.clear();
        messageTarget.innerHTML = '';
        messageTarget.appendChild(messageElement);
        adjustFontSizeToFit(messageElement); // Dynamically resize font if needed
        const timeoutId = setTimeout(() => {
            if (messageElement.parentNode === messageTarget) {
                messageTarget.removeChild(messageElement);
            }
            activeMessageTimeouts.delete(id);
        }, displayTime);
        activeMessageTimeouts.set(id, timeoutId);
    }
}

function applyAllStyles(newSettings) {
    settings = newSettings;
    document.documentElement.style.setProperty('--plus2-paragraph-text-color', settings.paragraphTextColor);
    // If uniform username coloring is enabled, apply the user's chosen color.
    // Otherwise, 'unset' the variable so that the original color from Twitch (via inline style) can be used.
    if (settings.enableUsernameColoring) {
        document.documentElement.style.setProperty('--plus2-username-color', settings.usernameDefaultColor);
    } else {
        document.documentElement.style.setProperty('--plus2-username-color', 'unset');
    }

    document.documentElement.style.fontSize = `${settings.popoutBaseFontSize}px`;
    document.body.style.backgroundColor = settings.chromaKeyColor;
    if (gaugeContainerElement) {
        gaugeContainerElement.style.backgroundColor = hexToRgba(settings.gaugeTrackColor, settings.gaugeTrackAlpha);
        gaugeContainerElement.style.border = `2px solid ${hexToRgba(settings.gaugeTrackBorderColor, settings.gaugeTrackBorderAlpha)}`;
    }
    if (gaugeFillElement) gaugeFillElement.style.background = `linear-gradient(to right, ${settings.gaugeFillGradientStartColor}, ${settings.gaugeFillGradientEndColor})`;
    if (recentMaxIndicatorElement) recentMaxIndicatorElement.style.backgroundColor = settings.recentMaxIndicatorColor;
    if (yesBarElement) yesBarElement.style.backgroundColor = settings.yesPollBarColor;
    if (noBarElement) noBarElement.style.backgroundColor = settings.noPollBarColor;
    if (yesPollLabelElement) yesPollLabelElement.style.color = settings.pollTextColor;
    if (noPollLabelElement) noPollLabelElement.style.color = settings.pollTextColor;
    if (pollWinnerTextElement) pollWinnerTextElement.style.color = settings.pollTextColor;
    if (leaderboardContainerElement) {
        leaderboardContainerElement.style.backgroundColor = hexToRgba(settings.leaderboardBackgroundColor, settings.leaderboardBackgroundAlpha);
        leaderboardContainerElement.style.color = settings.leaderboardTextColor;
    }
    injectAnimationStyles();
}

// --- Main Logic ---

function handleIncomingMessage(message) {
  // This function is the central handler for all messages,
  // regardless of whether they come from the runtime or a postMessage bridge.
  switch (message.type) {
    case 'FULL_STATE_UPDATE':
      pollState = message.data.poll; // Store poll state
      applyAllStyles(message.data.settings);
      updateGaugeDisplay(message.data.gauge);
      updateRecentMaxIndicator(message.data.gauge);
      updateYesNoPollDisplay(message.data.poll);
      updateLeaderboardDisplay(message.data.leaderboard);
      break;
    case 'SETTINGS_UPDATE':
      applyAllStyles(message.data);
      break;
    case 'GAUGE_UPDATE':
      updateGaugeDisplay(message.data);
      updateRecentMaxIndicator(message.data);
      break;
    case 'POLL_UPDATE':
      pollState = message.data; // Store poll state
      updateYesNoPollDisplay(message.data);
      // A poll update can affect gauge visibility
      updateGaugeDisplay(message.gaugeData);
      updateRecentMaxIndicator(message.gaugeData);
      break;
    case 'LEADERBOARD_UPDATE':
      updateLeaderboardDisplay(message.data);
      break;
    case 'HIGHLIGHT_MESSAGE':
      renderHighlightedMessage(message.data);
      break;
    case 'CLEAR_MESSAGES':
      messageTarget.innerHTML = '';
      activeMessageTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      activeMessageTimeouts.clear();
      break;
  }
}

// Primary listener for messages from the background script.
browser.runtime.onMessage.addListener((message) => handleIncomingMessage(message));

// Fallback listener for messages forwarded by the content script (app.js).
window.addEventListener('message', (event) => {
  if (event.data && event.data.type) handleIncomingMessage(event.data);
});

// Initial setup when the popout is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Build the skeleton of the UI immediately. This ensures that elements like
    // `messageTarget` exist and are ready to receive messages, preventing a race condition.
    buildHighlightContainerStructure();

    // --- Keep-Alive Audio Workaround ---
    // This plays a tiny, silent audio clip on a loop. This signals to the browser
    // that the page is "active" and can help prevent it from aggressively
    // throttling JavaScript timers and rendering updates when the window is not visible
    // (e.g., when it's a backgrounded OBS browser source).
    const keepAliveAudio = document.createElement('audio');
    // A tiny, silent WAV file encoded as a Data URI.
    keepAliveAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    keepAliveAudio.loop = true;
    keepAliveAudio.setAttribute('playsinline', ''); // Good practice for mobile, no harm here.
    document.body.appendChild(keepAliveAudio);

    // Attempt to play the audio. We'll wrap it in a try-catch block
    // and handle the promise to avoid unhandled rejection errors if autoplay fails.
    try {
        const playPromise = keepAliveAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("[Plus2] Keep-alive audio failed to play. This can happen if the browser blocks autoplay. The popout may need to be interacted with once to enable it.", error);
                // For an OBS source, it's better to just let it fail silently if the browser blocks it.
                // The user might need to interact with the popout once to enable it.
            });
        }
    } catch (error) {
        console.error("[Plus2] Error attempting to play keep-alive audio:", error);
    }

    // Request the initial full state from the background script
    browser.runtime.sendMessage({ type: 'REQUEST_INITIAL_STATE' }).then(response => {
        if (response && response.settings) {
            settings = response.settings;
            pollState = response.poll; // Store initial poll state
            // The UI structure is already built, now apply all the styles and data.
            applyAllStyles(response.settings);
            updateGaugeDisplay(response.gauge);
            updateRecentMaxIndicator(response.gauge);
            updateYesNoPollDisplay(response.poll);
            updateLeaderboardDisplay(response.leaderboard);
        } else {
             console.error("Received invalid initial state from background script.");
             if (messageTarget) messageTarget.innerHTML = `<div style="color: red; padding: 20px;">Received invalid data from the extension. Please try reloading.</div>`;
        }
    }).catch(error => {
        console.error("Error requesting initial state:", error.message);
            // Maybe display an error message in the popout
            if (messageTarget) messageTarget.innerHTML = `<div style="color: red; padding: 20px;">Could not connect to the extension's background service. Please try reloading the extension.</div>`;
    });
});