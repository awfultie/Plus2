// /Users/tyler/repos/plus2BS/scripts/popout.js

// --- Global State & Element References ---
let settings = {};
let highlightedMessageContainer;
let pollState = {}; // To hold the current state of the poll
let messageTarget;
// Legacy gauge elements removed - unified polling handles display
// Legacy yes/no poll elements removed - unified polling handles all polls
// Legacy genericPollDisplayContainerElement removed - functionality replaced by unified polling
let unifiedPollDisplayContainerElement; // New unified container
let leaderboardContainerElement;
let activeMessageTimeouts = new Map(); // To manage timeouts for individual messages in append mode

// --- Component Instances ---
let unifiedPollingComponent;
let leaderboardComponent;

// --- Helper Functions ---

// Default settings functions moved to popout/config/defaults.js
// Use the global utility functions for backward compatibility
function getDefaultSettings() {
    return window.popoutUtils.getDefaultSettings();
}

function getDefaultPeakLabels() {
    return window.popoutUtils.getDefaultPeakLabels();
}

// Color utility function moved to popout/utils/colors.js
function hexToRgba(hex, alpha) {
    return window.popoutUtils.hexToRgba(hex, alpha);
}

// Animation styles function moved to popout/utils/animations.js
function injectAnimationStyles() {
    window.popoutUtils.injectAnimationStyles(settings);
}

// --- UI Building and Rendering ---

function buildHighlightContainerStructure() {
    // Clear body first
    document.body.innerHTML = '';

    // Set CSS variables on the root for easier styling from popout.css
    document.documentElement.style.setProperty('--plus2-paragraph-text-color', settings.styling?.paragraphTextColor || '#FFFFFF');
    // At this point, settings might be empty. Default to 'unset' to show native colors
    // until the full settings are loaded and applied by applyAllStyles.
    if (settings.styling?.enableUsernameColoring) {
        document.documentElement.style.setProperty('--plus2-username-color', settings.styling?.usernameDefaultColor || '#FFFFFF');
    } else {
        document.documentElement.style.setProperty('--plus2-username-color', 'unset');
    }
    document.documentElement.style.fontSize = `${settings.display?.popoutBaseFontSize || 14}px`;
    document.body.style.backgroundColor = settings.display?.chromaKeyColor;
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.fontFamily = 'Inter, Roobert, "Helvetica Neue", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Android Emoji", "EmojiOne"';

    // Main container
    highlightedMessageContainer = document.createElement('div');
    highlightedMessageContainer.id = 'highlightedMessageContainer';
    highlightedMessageContainer.className = 'plus2-in-popout'; // Add class for popout-specific styles
    Object.assign(highlightedMessageContainer.style, {
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: settings.display?.chromaKeyColor,
        padding: '10px',
        boxSizing: 'border-box',
        zIndex: '1000',
        overflow: 'hidden'
    });

    // Message Target Area - highest priority, anchored to top
    messageTarget = document.createElement('div');
    messageTarget.id = 'messageTarget';
    Object.assign(messageTarget.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        zIndex: '50', // Highest priority
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '10px',
        boxSizing: 'border-box',
        pointerEvents: 'none' // Allow clicks to pass through when empty
    });
    highlightedMessageContainer.appendChild(messageTarget);

    // Legacy gauge container removed - unified polling handles display

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

    // Legacy gauge fill, indicator, and label elements removed - unified polling handles display

    // Legacy yes/no poll container and elements removed - unified polling handles all polls

    // Legacy generic poll container creation removed - functionality replaced by unified polling

    // Unified Poll Container - positioned absolutely, can stack with messages
    unifiedPollDisplayContainerElement = document.createElement('div');
    unifiedPollDisplayContainerElement.id = 'unifiedPollDisplayContainer';
    Object.assign(unifiedPollDisplayContainerElement.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        zIndex: '40', // Below messages, but can be repositioned dynamically
        display: 'none',
        padding: '10px',
        boxSizing: 'border-box',
        backgroundColor: '#111111',
        textAlign: 'left',
        borderRadius: '8px',
        minWidth: '250px',
        width: 'calc(100% - 20px)',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'auto'
    });
    highlightedMessageContainer.appendChild(unifiedPollDisplayContainerElement);

    document.body.appendChild(highlightedMessageContainer);

    // Components will be initialized after settings are loaded
}

function initializeComponents() {
    // Legacy GaugeComponent removed - unified polling handles display
    
    // Initialize Unified Polling Display Component
    unifiedPollingComponent = new window.popoutUtils.UnifiedPollingDisplayComponent();
    unifiedPollingComponent.initialize(unifiedPollDisplayContainerElement, settings);
    
    // Initialize LeaderboardComponent
    leaderboardComponent = new window.popoutUtils.LeaderboardComponent(leaderboardContainerElement);
}

// Legacy updateGaugeDisplay removed - unified polling handles display

// Legacy updateRecentMaxIndicator removed - unified polling handles display

// Legacy updateGaugeContainerVisibility removed - unified polling handles display

// Legacy updateYesNoPollDisplay removed - functionality replaced by unified polling

// Helper function moved to PollingComponent

// Legacy updateGenericPollDisplay removed - functionality replaced by unified polling

// Unified polling display update function
function updateUnifiedPollDisplay(unifiedPollData) {
    if (unifiedPollingComponent) {
        unifiedPollingComponent.updateUnifiedPollDisplay(unifiedPollData);
    }
}

function updateLeaderboardDisplay(leaderboardData) {
    if (leaderboardComponent) {
        leaderboardComponent.updateDisplay(leaderboardData);
    }
}

function adjustFontSizeToFit(messageElement) {
    // This feature only makes sense in non-append mode where one message fills the screen.
    if (settings.features?.appendMessages || !messageElement || !messageTarget) return;

    const content = messageElement.querySelector('.plus2-popout-message-entry');
    if (!content) return;

    // Use a timeout of 0 to allow the browser to render the element with the new base font size
    // before we start checking its dimensions. This avoids race conditions.
    setTimeout(() => {
        const containerWidth = messageTarget.clientWidth - 10; // -10 for padding
        let availableHeight = messageTarget.clientHeight;

        // Legacy gauge space reservation removed - unified polling handles sizing

        if (containerWidth <= 0 || availableHeight <= 0) return;

        let maxFontSize = settings.display?.popoutBaseFontSize || 18;
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

// Legacy checkAndUpdateGenericPollVisibility removed - functionality replaced by unified polling

// Function to calculate and update container positions
function updateContainerPositions() {
    const messageHasContent = messageTarget && messageTarget.children.length > 0;
    const pollContainer = unifiedPollDisplayContainerElement;
    const pollIsVisible = pollContainer && pollContainer.style.display !== 'none';
    
    // Check if poll is yes/no type
    const isYesNoPoll = pollContainer && pollContainer.querySelector('.unified-poll-content') &&
        pollContainer.dataset.pollType === 'yesno';
    
    let currentTop = 10; // Start at top with padding
    
    // Position messages (always at top when present)
    if (messageTarget) {
        messageTarget.style.top = messageHasContent ? `${currentTop}px` : '0px';
        messageTarget.style.pointerEvents = messageHasContent ? 'auto' : 'none';
        if (messageHasContent) {
            currentTop += messageTarget.offsetHeight + 10; // Add height + gap
        }
    }
    
    // Position poll container
    if (pollContainer && pollIsVisible) {
        // Always maintain centering
        pollContainer.style.left = '50%';
        pollContainer.style.transform = 'translateX(-50%)';
        
        if (isYesNoPoll) {
            // Yes/no polls always get highest priority and stay centered at top
            pollContainer.style.zIndex = '70'; // Higher than messages (50) and sentiment gauges
            pollContainer.style.top = '10px';
            
            if (messageHasContent) {
                // Push messages down when yes/no poll is present
                if (messageTarget) {
                    messageTarget.style.top = `${pollContainer.offsetHeight + 20}px`;
                }
            }
        } else {
            // Other polls (sentiment, numbers, letters) go below messages
            pollContainer.style.zIndex = '40';
            pollContainer.style.top = `${currentTop}px`;
        }
    }
}

// Make positioning function globally available
window.updateContainerPositions = updateContainerPositions;

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

    // Apply width cap if configured (0 = no cap, use full popout width)
    if (settings.display?.messageWidthCap && settings.display.messageWidthCap > 0) {
        Object.assign(messageElement.style, {
            maxWidth: `${settings.display.messageWidthCap}px`,
            width: 'fit-content',
            margin: '0 auto' // Center the capped message
        });
    }

    // If the message is from YouTube, we always apply the custom color directly,
    // overriding any global CSS variables. This ensures uniform color for YouTube
    // regardless of the "Use Uniform Username Color" setting.
    if (platform === 'youtube') {
        // The username is inside a wrapper span, so we need to select the inner span
        // which actually contains the color style.
        const usernameSpan = messageElement.querySelector('.plus2-popout-username > span');
        if (usernameSpan) {
            usernameSpan.style.color = settings.styling?.usernameDefaultColor;
        }
    }

    if (isAppend) {
        messageTarget.insertBefore(messageElement, messageTarget.firstChild);
        const timeoutId = setTimeout(() => {
            if (messageElement.parentNode === messageTarget) {
                messageTarget.removeChild(messageElement);
                // Legacy generic poll visibility check removed - unified polling handles visibility
            }
            activeMessageTimeouts.delete(id);
        }, displayTime);
        activeMessageTimeouts.set(id, timeoutId);
        
        // Update positions after adding message
        setTimeout(() => updateContainerPositions(), 10);
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
                // Legacy generic poll visibility check removed - unified polling handles visibility
            }
            activeMessageTimeouts.delete(id);
        }, displayTime);
        activeMessageTimeouts.set(id, timeoutId);
        
        // Update positions after adding message
        setTimeout(() => updateContainerPositions(), 10);
    }
}

function applyAllStyles(newSettings) {
    settings = newSettings;
    if (!settings) return;

    document.documentElement.style.setProperty('--plus2-paragraph-text-color', settings.styling?.paragraphTextColor);
    // If uniform username coloring is enabled, apply the user's chosen color.
    // Otherwise, 'unset' the variable so that the original color from Twitch (via inline style) can be used.
    if (settings.styling?.enableUsernameColoring) {
        document.documentElement.style.setProperty('--plus2-username-color', settings.styling?.usernameDefaultColor);
    } else {
        document.documentElement.style.setProperty('--plus2-username-color', 'unset');
    }

    document.documentElement.style.fontSize = `${settings.display?.popoutBaseFontSize}px`;
    document.body.style.backgroundColor = settings.display?.chromaKeyColor;
    
    // Legacy gauge and yes/no poll styling removed - unified polling handles all styling
    if (leaderboardContainerElement) {
        leaderboardContainerElement.style.backgroundColor = hexToRgba(settings.styling?.leaderboard?.leaderboardBackgroundColor, settings.styling?.leaderboard?.leaderboardBackgroundAlpha);
        leaderboardContainerElement.style.color = settings.styling?.leaderboard?.leaderboardTextColor;
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
      // Legacy gauge updates removed - unified polling handles display
      updateLeaderboardDisplay(message.data.leaderboard);
      break;
    case 'SETTINGS_UPDATE':
      applyAllStyles(message.data);
      // Update all components with new settings
      if (unifiedPollingComponent) {
        unifiedPollingComponent.updateSettings(message.data);
      }
      if (leaderboardComponent) {
        leaderboardComponent.updateSettings(message.data);
      }
      // Legacy gaugeComponent removed - unified polling handles gauge display
      break;
    case 'GAUGE_UPDATE':
      // Legacy gauge updates removed - unified polling handles display
      break;
    case 'POLL_UPDATE':
      pollState = message.data; // Store poll state
      // Legacy gauge and poll updates removed - unified polling handles all displays
      break;
    // Legacy GENERIC_POLL_UPDATE handler removed - functionality replaced by unified polling
    case 'UNIFIED_POLL_UPDATE':
      updateUnifiedPollDisplay(message.data);
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
      // Legacy generic poll visibility check removed - unified polling handles visibility
      break;
    case 'HIDE_POLL_TYPE_DISPLAY':
      hidePollTypeDisplay(message.pollType);
      break;
  }
}

function hidePollTypeDisplay(pollType) {
  const unifiedPollDisplayContainerElement = document.getElementById('unified-poll-display-container');
  if (unifiedPollDisplayContainerElement) {
    // Clear the unified poll display container to hide the current poll
    unifiedPollDisplayContainerElement.innerHTML = '';
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


    // Check if we're running in a browser extension context or standalone (streamview)
    const isExtensionContext = typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendMessage;
    
    if (isExtensionContext) {
        // Request the initial full state from the background script
        browser.runtime.sendMessage({ type: 'REQUEST_INITIAL_STATE' }).then(response => {
            if (response && response.settings) {
                settings = response.settings;
                pollState = response.poll; // Store initial poll state
                
                // Initialize components now that we have settings
                initializeComponents();
                
                // The UI structure is already built, now apply all the styles and data.
                applyAllStyles(response.settings);
                // Legacy gauge updates removed - unified polling handles display
                updateLeaderboardDisplay(response.leaderboard);
                
                // Update unified poll display if enabled
                if (response.unifiedPoll) {
                    updateUnifiedPollDisplay(response.unifiedPoll);
                }
            } else {
                 if (messageTarget) messageTarget.innerHTML = `<div style="color: red; padding: 20px;">Received invalid data from the extension. Please try reloading.</div>`;
            }
        }).catch(error => {
                // Maybe display an error message in the popout
                if (messageTarget) messageTarget.innerHTML = `<div style="color: red; padding: 20px;">Could not connect to the extension's background service. Please try reloading the extension.</div>`;
        });
    } else {
        // Running in standalone mode (streamview) - use default settings
        settings = getDefaultSettings();
        pollState = { shouldDisplay: false, yesCount: 0, noCount: 0, total: 0, isConcluded: false, winnerMessage: '' };
        // Legacy genericPollState removed - unified polling handles all state
        
        // Initialize components for standalone mode
        initializeComponents();
        
        // Add CSS to remove background colors for streamview
        const streamviewStyle = document.createElement('style');
        streamviewStyle.textContent = `
            .plus2-popout-message-entry {
                background-color: transparent !important;
            }
        `;
        document.head.appendChild(streamviewStyle);
        
        applyAllStyles(settings);
        // Legacy gauge updates removed - unified polling handles display
        updateLeaderboardDisplay({ topUsers: [], isVisible: false, mode: 'hidden', headerText: settings.styling.leaderboard.leaderboardHeaderText || 'Leaderboard' });
    }
});