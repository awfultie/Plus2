// /Users/tyler/repos/plus2BS/scripts/popout.js

// --- Global State & Element References ---
let settings = {};
let settingsLoaded = false; // Track when settings are fully loaded
let highlightedMessageContainer;
let pollState = {}; // To hold the current state of the poll
let messageTarget;
// Legacy gauge elements removed - unified polling handles display
// Legacy yes/no poll elements removed - unified polling handles all polls
// Legacy genericPollDisplayContainerElement removed - functionality replaced by unified polling
let unifiedPollDisplayContainerElement; // New unified container
let leaderboardContainerElement;
let activeMessageTimeouts = new Map(); // To manage timeouts for individual messages in append mode
let scrollingMessagesContainer; // Container for scrolling messages
let scrollingMessageQueue = []; // Queue of messages to scroll
let activeScrollingMessages = []; // Track currently scrolling messages
let isProcessingQueue = false; // Flag to prevent multiple queue processors
let pendingMessages = []; // Queue for messages that arrive before settings are loaded
let scrollingMessageDuplicates = new Map(); // Track duplicate messages: messageText -> {element, count, timeoutId}

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

    // Scrolling Messages Container - anchored to bottom, reserves space for other content
    scrollingMessagesContainer = document.createElement('div');
    scrollingMessagesContainer.id = 'scrollingMessagesContainer';
    Object.assign(scrollingMessagesContainer.style, {
        position: 'fixed', // Fixed to bottom of viewport
        bottom: '0',
        left: '0',
        right: '0',
        width: '100%',
        height: '0', // Start at 0 height when hidden
        overflow: 'hidden',
        transition: 'height 0.2s ease-in-out', // Smooth show/hide
        zIndex: '30',
        pointerEvents: 'none'
    });

    // Create the inner scrolling area with background
    const scrollingMessagesInner = document.createElement('div');
    scrollingMessagesInner.id = 'scrollingMessagesInner';
    Object.assign(scrollingMessagesInner.style, {
        position: 'absolute',
        bottom: '0', // Anchor to bottom of container
        left: '0',
        right: '0',
        width: '100%',
        minHeight: '0', // Allow container to collapse
        overflow: 'hidden',
        backgroundColor: 'transparent', // Will be set by settings
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end' // Push content to bottom when not full
    });

    scrollingMessagesContainer.appendChild(scrollingMessagesInner);

    // Append to body instead of highlightedMessageContainer so it's truly fixed to viewport bottom
    document.body.appendChild(scrollingMessagesContainer);

    // Create a spacer element in the highlightedMessageContainer that reserves space
    const scrollingMessagesSpacer = document.createElement('div');
    scrollingMessagesSpacer.id = 'scrollingMessagesSpacer';
    Object.assign(scrollingMessagesSpacer.style, {
        width: '100%',
        height: '0', // Matches scrollingMessagesContainer height
        transition: 'height 0.2s ease-in-out'
    });
    highlightedMessageContainer.appendChild(scrollingMessagesSpacer);

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

    // Unified Poll Container - uses flex layout to support positioning
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
        pointerEvents: 'auto',
        // Use flex layout to support child ordering
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start'
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

    // Make component globally accessible for positioning
    window.unifiedPollingComponent = unifiedPollingComponent;
    
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

function updateLurkerOverrideDisplay(lurkerData) {
    const { isActive, lurkerUsernames, animationDuration } = lurkerData;

    // Get or create lurker override container
    let lurkerContainer = document.getElementById('lurker-override-container');
    if (!lurkerContainer) {
        lurkerContainer = document.createElement('div');
        lurkerContainer.id = 'lurker-override-container';
        lurkerContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            text-align: center;
            pointer-events: none;
        `;
        document.body.appendChild(lurkerContainer);
    }

    if (!isActive) {
        lurkerContainer.innerHTML = '';
        lurkerContainer.style.display = 'none';
        return;
    }

    lurkerContainer.style.display = 'block';

    // Show "Thank You Lurkers!" message
    const thankYouMessage = document.createElement('div');
    thankYouMessage.className = 'lurker-thank-you';
    thankYouMessage.textContent = 'Thank You Lurkers!';
    thankYouMessage.style.cssText = `
        font-size: 48px;
        font-weight: bold;
        color: #fff;
        text-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
        margin-bottom: 20px;
        animation: lurker-pulse 2s ease-in-out infinite;
    `;

    lurkerContainer.innerHTML = '';
    lurkerContainer.appendChild(thankYouMessage);

    // Create username display area
    const usernamesContainer = document.createElement('div');
    usernamesContainer.className = 'lurker-usernames';
    usernamesContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 15px;
        max-width: 80vw;
    `;
    lurkerContainer.appendChild(usernamesContainer);

    // Display each username with flash animation
    lurkerUsernames.forEach((lurker, index) => {
        const usernameEl = document.createElement('div');
        usernameEl.className = 'lurker-username';
        usernameEl.textContent = lurker.username;
        usernameEl.style.cssText = `
            font-size: 32px;
            font-weight: bold;
            color: #ffdd00;
            text-shadow: 0 0 10px rgba(255, 221, 0, 0.8);
            animation: lurker-flash ${animationDuration}ms ease-in-out ${index * 100}ms;
            animation-fill-mode: both;
        `;
        usernamesContainer.appendChild(usernameEl);
    });
}

function updateLeaderboardDisplay(leaderboardData) {
    if (leaderboardComponent) {
        leaderboardComponent.updateDisplay(leaderboardData);
    }
}

// --- Scrolling Messages Functions ---

function addScrollingMessage(messageData) {
    const scrollingMode = settings.features?.scrollingMessages?.mode || 'disabled';

    // Check if scrolling messages feature is enabled AND mode is not disabled
    // Note: The 'enabled' field in settings is currently unused in favor of mode check
    // If mode is 'disabled', scrolling is off regardless of other settings
    const isEnabled = scrollingMode !== 'disabled';

    if (!isEnabled || !scrollingMessagesContainer) {
        console.log('[Scrolling Messages] Not adding message - enabled:', isEnabled, 'mode:', scrollingMode, 'hasContainer:', !!scrollingMessagesContainer);
        return;
    }

    // Get the inner container with the background
    const scrollingMessagesInner = scrollingMessagesContainer.querySelector('#scrollingMessagesInner');
    if (!scrollingMessagesInner) {
        console.error('[Scrolling Messages] Inner container not found');
        return;
    }

    // Background will be applied per-message for vertical, or to container for horizontal
    // This is handled in processScrollingMessageQueue based on direction

    // Add message to queue
    scrollingMessageQueue.push(messageData);

    console.log('[Scrolling Messages] Message added to queue', {
        queueLength: scrollingMessageQueue.length,
        activeMessages: activeScrollingMessages.length
    });

    // Start processing queue (will process immediately or wait for slot)
    processScrollingMessageQueue();
}

function processScrollingMessageQueue() {
    // If queue is empty or already processing, nothing to do
    if (scrollingMessageQueue.length === 0 || isProcessingQueue) {
        return;
    }

    isProcessingQueue = true;

    try {
        // Get next message from queue
        const messageData = scrollingMessageQueue.shift();
        const { html, platform } = messageData;

    // Get scroll direction setting
    const scrollDirection = settings.features?.scrollingMessages?.direction || 'horizontal';

    console.log('[Scrolling Messages] Processing message from queue', {
        remainingInQueue: scrollingMessageQueue.length,
        direction: scrollDirection
    });

    // Extract message text BEFORE creating any DOM elements for duplicate detection
    const tempParser = new DOMParser();
    const tempDoc = tempParser.parseFromString(html, 'text/html');
    const tempMessageBody = tempDoc.querySelector('.plus2-popout-message-body');
    const messageText = tempMessageBody ? tempMessageBody.textContent.trim() : '';

    // Check for duplicates BEFORE creating any elements
    if (messageText && scrollingMessageDuplicates.has(messageText)) {
        // Duplicate found! Increment counter and reset timeout
        const duplicateInfo = scrollingMessageDuplicates.get(messageText);
        duplicateInfo.count++;

        // Update counter badge
        let counterBadge = duplicateInfo.element.querySelector('.duplicate-counter');
        if (!counterBadge) {
            // Create counter badge if it doesn't exist
            counterBadge = document.createElement('span');
            counterBadge.className = 'duplicate-counter';
            counterBadge.style.cssText = `
                display: inline-block;
                background: #ff4444;
                color: white;
                border-radius: 10px;
                padding: 2px 6px;
                font-size: 11px;
                font-weight: bold;
                margin-left: 6px;
                vertical-align: middle;
            `;
            duplicateInfo.element.querySelector('.plus2-popout-message-body').appendChild(counterBadge);
        }
        counterBadge.textContent = `×${duplicateInfo.count}`;

        // Clear existing timeout and reset it
        if (duplicateInfo.timeoutId) {
            clearTimeout(duplicateInfo.timeoutId);
        }

        // Set new timeout for removal
        const baseSpeed = settings.features?.scrollingMessages?.speed || 50;
        const displayTime = baseSpeed * 100;
        const fadeOutEnabled = settings.features?.scrollingMessages?.fadeOutEnabled ?? true;
        const fadeOutDuration = settings.features?.scrollingMessages?.fadeOutDuration || 500;

        duplicateInfo.timeoutId = setTimeout(() => {
            if (fadeOutEnabled) {
                duplicateInfo.element.style.transition = `opacity ${fadeOutDuration}ms ease-out`;
                duplicateInfo.element.style.opacity = '0';
                setTimeout(() => {
                    removeScrollingMessage(duplicateInfo.element);
                }, fadeOutDuration);
            } else {
                removeScrollingMessage(duplicateInfo.element);
            }
        }, displayTime);

        // Move element to front (for vertical) or reset animation (for horizontal)
        if (scrollDirection === 'vertical') {
            const scrollingMessagesInner = scrollingMessagesContainer.querySelector('#scrollingMessagesInner');
            if (scrollingMessagesInner && duplicateInfo.element.parentNode === scrollingMessagesInner) {
                scrollingMessagesInner.removeChild(duplicateInfo.element);
                scrollingMessagesInner.appendChild(duplicateInfo.element);
            }
        }

        // Don't create new element, just update the existing one
        console.log('[Scrolling Messages] Duplicate detected, count:', duplicateInfo.count);
        isProcessingQueue = false;
        processScrollingMessageQueue(); // Process next message
        return;
    }

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'scrolling-message-item';

    // Parse HTML safely
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    while (doc.body.firstChild) {
        messageElement.appendChild(doc.body.firstChild);
    }

    // Flatten reply blocks into inline text for scrolling
    const replyBlock = messageElement.querySelector('.plus2-popout-reply-block');
    if (replyBlock) {
        // Convert reply block to inline text with separator
        const replyText = replyBlock.textContent || '';
        const replySpan = document.createElement('span');
        replySpan.textContent = `[Reply: ${replyText}] `;
        replySpan.style.color = '#cccccc'; // Light grey color
        replySpan.style.fontStyle = 'italic';
        replySpan.style.marginRight = '0.5em';

        // Find the message line and prepend the reply
        const messageLine = messageElement.querySelector('.plus2-popout-message-line');
        if (messageLine) {
            messageLine.insertBefore(replySpan, messageLine.firstChild);
        }

        // Remove the original reply block
        replyBlock.remove();
    }

    // Get background and font settings
    const bgColor = settings.features.scrollingMessages.backgroundColor || '#000000';
    const bgAlpha = settings.features.scrollingMessages.backgroundAlpha ?? 0.7;
    const fontSize = settings.features?.scrollingMessages?.fontSize || 16;

    // Apply font size to message
    messageElement.style.fontSize = `${fontSize}px`;

    // Remove background from nested message entry
    const messageEntry = messageElement.querySelector('.plus2-popout-message-entry');
    if (messageEntry) {
        messageEntry.style.backgroundColor = 'transparent';
        messageEntry.style.padding = '0';
    }

    // Handle YouTube username coloring
    if (platform === 'youtube') {
        const usernameSpan = messageElement.querySelector('.plus2-popout-username > span');
        if (usernameSpan) {
            usernameSpan.style.color = settings.styling?.usernameDefaultColor;
        }
    }

    // Apply direction-specific styling
    if (scrollDirection === 'vertical') {
        // Vertical: allow wrapping, stack messages with background on each message
        const maxWidth = settings.features?.scrollingMessages?.verticalMaxWidth || 600;

        messageElement.style.display = 'block';
        messageElement.style.whiteSpace = 'normal';
        messageElement.style.width = 'fit-content';
        messageElement.style.maxWidth = maxWidth > 0 ? `${maxWidth}px` : '100%';
        messageElement.style.boxSizing = 'border-box';
        messageElement.style.position = 'relative';
        messageElement.style.marginBottom = '2px'; // Compact spacing
        messageElement.style.padding = '4px 8px'; // Reduced from 8px 16px
        messageElement.style.opacity = '1';
        messageElement.style.backgroundColor = hexToRgba(bgColor, bgAlpha);
        messageElement.style.borderRadius = '4px';

        // Remove container background for vertical mode
        const scrollingMessagesInner = scrollingMessagesContainer.querySelector('#scrollingMessagesInner');
        if (scrollingMessagesInner) {
            scrollingMessagesInner.style.backgroundColor = 'transparent';
        }

        // Force message line content to wrap
        const messageLineElements = messageElement.querySelectorAll('.plus2-popout-message-line');
        messageLineElements.forEach(line => {
            line.style.display = 'block';
            line.style.whiteSpace = 'normal';
        });
    } else {
        // Horizontal: single line, no wrapping, background on container
        messageElement.style.display = 'inline-block';
        messageElement.style.whiteSpace = 'nowrap';
        messageElement.style.marginRight = '20px';
        messageElement.style.position = 'absolute';
        messageElement.style.left = '100%';
        messageElement.style.bottom = '0';
        messageElement.style.top = 'auto';
        messageElement.style.backgroundColor = 'transparent';
        messageElement.style.padding = '8px 16px';

        // Apply container background for horizontal mode
        const scrollingMessagesInner = scrollingMessagesContainer.querySelector('#scrollingMessagesInner');
        if (scrollingMessagesInner) {
            scrollingMessagesInner.style.backgroundColor = hexToRgba(bgColor, bgAlpha);
        }

        // Force all content to single line
        const messageLineElements = messageElement.querySelectorAll('.plus2-popout-message-line');
        messageLineElements.forEach(line => {
            line.style.display = 'inline';
            line.style.whiteSpace = 'nowrap';
        });
    }

    // Get inner container and append message to it
    const scrollingMessagesInner = scrollingMessagesContainer.querySelector('#scrollingMessagesInner');
    if (!scrollingMessagesInner) {
        console.error('[Scrolling Messages] Inner container not found during message processing');
        isProcessingQueue = false;
        return;
    }

    scrollingMessagesInner.appendChild(messageElement);

    // Track this message
    const messageInfo = { element: messageElement };
    activeScrollingMessages.push(messageInfo);

    // Register this message in duplicate tracking immediately after appending
    // This ensures the next duplicate will be detected
    if (messageText) {
        scrollingMessageDuplicates.set(messageText, {
            element: messageElement,
            count: 1,
            timeoutId: null // Will be set when animation completes
        });
    }

    // For vertical mode, enforce max message limit and adjust container size
    if (scrollDirection === 'vertical') {
        const maxMessages = settings.features?.scrollingMessages?.verticalMaxMessages || 5;
        const maxHeight = settings.features?.scrollingMessages?.verticalMaxHeight || 200;

        // Remove oldest messages if we exceed the limit
        while (activeScrollingMessages.length > maxMessages) {
            const oldestMessage = activeScrollingMessages.shift();
            if (oldestMessage.element && oldestMessage.element.parentNode === scrollingMessagesInner) {
                scrollingMessagesInner.removeChild(oldestMessage.element);
            }
        }

        // Set max height for vertical scrolling
        scrollingMessagesInner.style.maxHeight = `${maxHeight}px`;

        // Container height adjusts based on content, but respects max
        const actualHeight = Math.min(scrollingMessagesInner.scrollHeight, maxHeight);
        scrollingMessagesContainer.style.height = `${actualHeight}px`;

        // Update spacer
        const spacer = document.getElementById('scrollingMessagesSpacer');
        if (spacer) {
            spacer.style.height = `${actualHeight}px`;
        }
    } else {
        // Horizontal mode uses fixed height
        const containerHeight = '50px';
        scrollingMessagesContainer.style.height = containerHeight;

        const spacer = document.getElementById('scrollingMessagesSpacer');
        if (spacer) {
            spacer.style.height = containerHeight;
        }
    }

    console.log('[Scrolling Messages] Message element added to container', {
        messageElement,
        activeMessages: activeScrollingMessages.length,
        containerChildren: scrollingMessagesContainer.children.length,
        containerDisplay: scrollingMessagesContainer.style.display,
        containerBounds: scrollingMessagesContainer.getBoundingClientRect(),
        messageBounds: messageElement.getBoundingClientRect(),
        messageStyles: {
            position: messageElement.style.position,
            left: messageElement.style.left,
            bottom: messageElement.style.bottom,
            backgroundColor: messageElement.style.backgroundColor,
            direction: scrollDirection
        }
    });

    // Start animation
    animateScrollingMessage(messageElement, messageInfo);

    // Calculate timing for next message
    const baseSpeed = settings.features?.scrollingMessages?.speed || 50;
    let speed = baseSpeed;
    if (settings.features?.scrollingMessages?.speedMultiplierEnabled) {
        const multiplier = settings.features?.scrollingMessages?.speedMultiplierPerMessage || 1.15;
        const queueLength = scrollingMessageQueue.length;
        speed = baseSpeed * Math.pow(multiplier, queueLength);
    }

    let timeUntilVisible;
    if (scrollDirection === 'vertical') {
        // For vertical, messages appear immediately, just delay between messages
        // Use a shorter delay for faster transitions (300ms instead of 1000ms)
        timeUntilVisible = 300;
    } else {
        // For horizontal, calculate when next message should start
        // Wait for current message to fully enter the screen before starting next one
        const messageWidth = messageElement.offsetWidth || 200;
        // Use full message width + margin to ensure messages don't overlap
        const distanceToTravel = messageWidth + 20; // Message width + some spacing
        timeUntilVisible = Math.max((distanceToTravel / speed) * 1000, 500); // Minimum 500ms between messages
    }

    console.log('[Scrolling Messages] Scheduling next message', {
        speed,
        timeUntilVisible,
        direction: scrollDirection
    });

    setTimeout(() => {
        isProcessingQueue = false;
        processScrollingMessageQueue();
    }, timeUntilVisible);
    } catch (error) {
        console.error('[Scrolling Messages] Error processing message queue:', error);
        isProcessingQueue = false;
        // Try to continue processing queue after error
        setTimeout(() => processScrollingMessageQueue(), 1000);
    }
}

function animateScrollingMessage(messageElement, messageInfo) {
    const scrollDirection = settings.features?.scrollingMessages?.direction || 'horizontal';
    const fadeOutEnabled = settings.features?.scrollingMessages?.fadeOutEnabled ?? true;
    const fadeOutDuration = settings.features?.scrollingMessages?.fadeOutDuration || 500;

    if (scrollDirection === 'vertical') {
        // Vertical scrolling animation
        animateVerticalScrollingMessage(messageElement, messageInfo, fadeOutEnabled, fadeOutDuration);
    } else {
        // Horizontal scrolling animation
        animateHorizontalScrollingMessage(messageElement, messageInfo, fadeOutEnabled, fadeOutDuration);
    }
}

function animateVerticalScrollingMessage(messageElement, messageInfo, fadeOutEnabled, fadeOutDuration) {
    // Get display time from settings - reuse speed setting as "display time in seconds"
    const baseSpeed = settings.features?.scrollingMessages?.speed || 50;
    const displayTime = baseSpeed * 100; // Convert speed (pixels/sec) to milliseconds

    console.log('[Scrolling Messages] Vertical animation started', {
        displayTime,
        fadeOutEnabled,
        fadeOutDuration
    });

    // Wait for display time, then fade out and remove
    const timeoutId = setTimeout(() => {
        if (fadeOutEnabled) {
            // Start fade out
            messageElement.style.transition = `opacity ${fadeOutDuration}ms ease-out`;
            messageElement.style.opacity = '0';

            // Remove after fade completes
            setTimeout(() => {
                removeScrollingMessage(messageElement);
            }, fadeOutDuration);
        } else {
            // Remove immediately
            removeScrollingMessage(messageElement);
        }
    }, displayTime);

    // Store timeout ID in duplicate tracking map
    const messageBody = messageElement.querySelector('.plus2-popout-message-body');
    const messageText = messageBody ? messageBody.textContent.trim() : '';
    if (messageText && scrollingMessageDuplicates.has(messageText)) {
        scrollingMessageDuplicates.get(messageText).timeoutId = timeoutId;
    }
}

function animateHorizontalScrollingMessage(messageElement, messageInfo, fadeOutEnabled, fadeOutDuration) {
    const containerWidth = window.innerWidth;
    const messageWidth = messageElement.offsetWidth;

    // Calculate total distance to travel (start off-screen right, end off-screen left)
    const totalDistance = containerWidth + messageWidth;

    // Track distance traveled instead of time elapsed
    // This allows speed changes to take effect immediately
    messageInfo.distanceTraveled = 0;
    messageInfo.lastTimestamp = null;
    messageInfo.fadingOut = false;

    console.log('[Scrolling Messages] Horizontal animation started', {
        containerWidth,
        messageWidth,
        totalDistance,
        fadeOutEnabled,
        fadeOutDuration
    });

    function step(timestamp) {
        if (!messageInfo.lastTimestamp) {
            messageInfo.lastTimestamp = timestamp;
        }

        const deltaTime = (timestamp - messageInfo.lastTimestamp) / 1000; // Convert to seconds
        messageInfo.lastTimestamp = timestamp;

        // Calculate current speed dynamically based on queue length
        const baseSpeed = settings.features?.scrollingMessages?.speed || 50;
        let currentSpeed = baseSpeed;
        if (settings.features?.scrollingMessages?.speedMultiplierEnabled) {
            const multiplier = settings.features?.scrollingMessages?.speedMultiplierPerMessage || 1.15;
            const queueLength = scrollingMessageQueue.length;
            // Apply exponential speed increase based on queue size
            currentSpeed = baseSpeed * Math.pow(multiplier, queueLength);
        }

        // Update distance based on current speed
        messageInfo.distanceTraveled += currentSpeed * deltaTime;

        // Calculate position percentage
        const percentage = messageInfo.distanceTraveled / totalDistance;

        // Calculate position (start at 100%, move to negative message width)
        const currentPos = 100 - (percentage * ((100 + (messageWidth / containerWidth * 100))));
        messageElement.style.left = `${currentPos}%`;

        // Start fade out when message is almost done (90% complete)
        if (fadeOutEnabled && !messageInfo.fadingOut && percentage >= 0.9) {
            messageInfo.fadingOut = true;
            messageElement.style.transition = `opacity ${fadeOutDuration}ms ease-out`;
            messageElement.style.opacity = '0';
        }

        // Continue animation if not complete
        if (percentage < 1) {
            requestAnimationFrame(step);
        } else {
            // Remove message when animation is complete
            removeScrollingMessage(messageElement);
        }
    }

    requestAnimationFrame(step);
}

function removeScrollingMessage(messageElement) {
    const scrollingMessagesInner = scrollingMessagesContainer?.querySelector('#scrollingMessagesInner');
    if (scrollingMessagesInner && messageElement.parentNode === scrollingMessagesInner) {
        // Clean up duplicate tracking
        const messageBody = messageElement.querySelector('.plus2-popout-message-body');
        const messageText = messageBody ? messageBody.textContent.replace(/×\d+$/, '').trim() : ''; // Remove counter from text
        if (messageText && scrollingMessageDuplicates.has(messageText)) {
            const duplicateInfo = scrollingMessageDuplicates.get(messageText);
            if (duplicateInfo.timeoutId) {
                clearTimeout(duplicateInfo.timeoutId);
            }
            scrollingMessageDuplicates.delete(messageText);
        }

        scrollingMessagesInner.removeChild(messageElement);

        // Remove from active messages
        const index = activeScrollingMessages.findIndex(m => m.element === messageElement);
        if (index !== -1) {
            activeScrollingMessages.splice(index, 1);
        }

        // Adjust container height based on remaining messages
        if (activeScrollingMessages.length === 0) {
            // Collapse completely if no messages
            scrollingMessagesContainer.style.height = '0';

            const spacer = document.getElementById('scrollingMessagesSpacer');
            if (spacer) {
                spacer.style.height = '0';
            }
        } else {
            // For vertical mode, recalculate height based on remaining content
            const scrollDirection = settings.features?.scrollingMessages?.direction || 'horizontal';
            if (scrollDirection === 'vertical') {
                const maxHeight = settings.features?.scrollingMessages?.verticalMaxHeight || 200;
                const actualHeight = Math.min(scrollingMessagesInner.scrollHeight, maxHeight);
                scrollingMessagesContainer.style.height = `${actualHeight}px`;

                const spacer = document.getElementById('scrollingMessagesSpacer');
                if (spacer) {
                    spacer.style.height = `${actualHeight}px`;
                }
            }
        }
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
        // Calculate available width based on message width cap setting
        let containerWidth;
        if (settings.display?.messageWidthCap && settings.display.messageWidthCap > 0) {
            // Use the configured width cap
            containerWidth = settings.display.messageWidthCap;
        } else {
            // Use full container width with padding
            containerWidth = messageTarget.clientWidth - 20; // -20 for padding (10px on each side)
        }

        // Calculate available height - use the full viewport height minus padding and margins
        // messageTarget.clientHeight might be 0 or very small if no explicit height is set
        let availableHeight = window.innerHeight - 40; // Account for container padding and margins

        // Legacy gauge space reservation removed - unified polling handles sizing

        if (containerWidth <= 0 || availableHeight <= 0) return;

        let maxFontSize = settings.display?.popoutBaseFontSize || 18;
        let minFontSize = 8; // Don't shrink smaller than this
        const precision = 0.5; // How close we need to be
        let safety = 20; // Prevent potential infinite loops

        // Store original constraints but set width to target for proper measurement
        const originalMaxWidth = messageElement.style.maxWidth;
        const originalWidth = messageElement.style.width;

        // Set the element to the target width for measurement
        messageElement.style.maxWidth = `${containerWidth}px`;
        messageElement.style.width = `${containerWidth}px`;

        // Apply max size first to get initial dimensions
        content.style.fontSize = `${maxFontSize}px`;

        // Force a reflow to get accurate measurements
        content.offsetHeight;

        // If it already fits at the max size, we're done.
        if (content.scrollHeight <= availableHeight) {
            // Restore original constraints
            messageElement.style.maxWidth = originalMaxWidth;
            messageElement.style.width = originalWidth;
            return;
        }

        // --- Binary search for the optimal font size ---
        // This is much more performant than decrementing in a loop, as it avoids
        // "layout thrashing" by minimizing synchronous reflows.
        while ((maxFontSize - minFontSize > precision) && safety > 0) {
            let midFontSize = (minFontSize + maxFontSize) / 2;
            content.style.fontSize = `${midFontSize}px`;

            // Force reflow for accurate measurement
            content.offsetHeight;

            // Only check height since width is constrained by container
            if (content.scrollHeight > availableHeight) {
                maxFontSize = midFontSize;
            } else {
                // It fits, so we can try a larger size. The new minimum is our midpoint.
                minFontSize = midFontSize;
            }
            safety--;
        }

        // Apply the final calculated size (the largest that was found to fit).
        content.style.fontSize = `${minFontSize}px`;

        // Restore original width constraints
        messageElement.style.maxWidth = originalMaxWidth;
        messageElement.style.width = originalWidth;
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
        // Set poll container to use flex display to support child ordering
        pollContainer.style.display = 'flex';

        if (isYesNoPoll) {
            // Yes/no polls get higher priority and position based on settings
            pollContainer.style.zIndex = '70'; // Higher than messages (50) and sentiment gauges
            pollContainer.style.left = '50%';
            pollContainer.style.transform = 'translateX(-50%)';

            // Get position setting from component settings
            const unifiedComponent = window.unifiedPollingComponent;
            const position = unifiedComponent?.yesNoPosition || 'top';

            // Position based on setting
            switch (position) {
                case 'top':
                    pollContainer.style.top = '10px';
                    pollContainer.style.bottom = 'auto';
                    break;
                case 'middle':
                    pollContainer.style.top = '50%';
                    pollContainer.style.transform = 'translate(-50%, -50%)';
                    pollContainer.style.bottom = 'auto';
                    break;
                case 'bottom':
                    pollContainer.style.top = 'auto';
                    pollContainer.style.bottom = '10px';
                    pollContainer.style.transform = 'translateX(-50%)';
                    break;
                default:
                    pollContainer.style.top = '10px';
                    pollContainer.style.bottom = 'auto';
                    break;
            }

            if (messageHasContent && position === 'top') {
                // Only push messages down when yes/no poll is at the top
                if (messageTarget) {
                    messageTarget.style.top = `${pollContainer.offsetHeight + 20}px`;
                }
            }
        } else {
            // Other polls (sentiment, numbers, letters) go below messages
            pollContainer.style.zIndex = '40';
            pollContainer.style.top = `${currentTop}px`;
            pollContainer.style.left = '50%';
            pollContainer.style.transform = 'translateX(-50%)';
        }
    }
}

// Make positioning function globally available
window.updateContainerPositions = updateContainerPositions;

function renderHighlightedMessage(messageData) {
    if (!messageTarget) return;

    // If settings haven't loaded yet, queue the message and wait
    if (!settingsLoaded) {
        console.log('[Popout] Settings not loaded yet, queuing message');
        pendingMessages.push(messageData);
        return;
    }

    const { html, id, isAppend, displayTime, platform, isManualHighlight } = messageData;

    // Get scrolling mode from settings
    const scrollingMode = settings.features?.scrollingMessages?.mode || 'disabled';
    const minLength = settings.features?.scrollingMessages?.autoQueueMinLength || 100;

    // Get text length from HTML (strip tags for accurate character count)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    const messageLength = textContent.length;


    // Debug: Log scrolling mode decision
    console.log('[Popout] renderHighlightedMessage - scrolling decision', {
        scrollingMode,
        messageLength,
        minLength,
        isManualHighlight,
        settingsLoaded,
        hasPendingMessages: pendingMessages.length
    });

    // Determine scrolling behavior based on mode
    if (scrollingMode === 'highlightWithScroll') {
        // Mode 1: All highlights scroll (no normal display)
        console.log('[Popout] highlightWithScroll mode - scrolling only');
        addScrollingMessage(messageData);
        return; // Don't display in normal message area
    } else if (scrollingMode === 'autoQueue') {
        // Mode 2: Auto-queue long messages, but manual highlights always display normally
        if (isManualHighlight) {
            // Manual highlights always display normally (never scroll)
            console.log('[Popout] autoQueue mode - manual highlight, displaying normally');
            // Continue to display normally below
        } else if (messageLength > minLength) {
            // Long automatic messages scroll only
            console.log('[Popout] autoQueue mode - long message, scrolling only');
            addScrollingMessage(messageData);
            return; // Don't display in normal message area
        } else {
            // Short automatic messages display normally
            console.log('[Popout] autoQueue mode - short message, displaying normally');
            // Continue to display normally below
        }
    }
    // Mode 0 (disabled): Just display normally (no scrolling)

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

    console.log('[Popout] applyAllStyles called', {
        hasScrollingMessages: !!settings.features?.scrollingMessages,
        scrollingMessages: settings.features?.scrollingMessages
    });

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

    // Mark settings as loaded and process any pending messages
    if (!settingsLoaded) {
        settingsLoaded = true;
        console.log('[Popout] Settings loaded, processing', pendingMessages.length, 'pending messages');
        // Process all pending messages now that settings are loaded
        while (pendingMessages.length > 0) {
            const pendingMessage = pendingMessages.shift();
            renderHighlightedMessage(pendingMessage);
        }
    }
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
    case 'LURKER_OVERRIDE_UPDATE':
      updateLurkerOverrideDisplay(message.data);
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
// Only listen to runtime messages when running as a standalone popout window (not docked)
browser.runtime.onMessage.addListener((message) => {
    // Check if we're running in a docked iframe by checking if we have a parent window
    const isDocked = window.parent !== window;
    if (!isDocked) {
        handleIncomingMessage(message);
    }
});

// Fallback listener for messages forwarded by the content script (app.js) when docked.
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
            console.log('[Popout] Initial state received', {
                hasSettings: !!response?.settings,
                hasScrollingMessages: !!response?.settings?.features?.scrollingMessages,
                scrollingMessages: response?.settings?.features?.scrollingMessages,
                fullResponse: response
            });

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