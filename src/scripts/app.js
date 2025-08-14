// Main Plus2 content script - modular version
(function() {
    // --- Global State ---
    let settings = {};
    let platformAdapter = null;
    let messageProcessor = null;
    let uiInjection = null;
    let searchFeature = null;
    let tooltipHandler = null;
    let autoScroll = null;
    
    // Observer management
    let messageObserver = null;
    let isObserverActive = false;
    let siteObserver = null;
    let observedChatContainer = null;

    // --- Platform Detection and Adapter Creation ---
    function createPlatformAdapter() {
        const isYouTube = window.location.hostname.includes('youtube.com');
        
        if (isYouTube) {
            if (!settings.enableYouTube) {
                console.log('[Plus2] Script disabled on YouTube as per settings.');
                return null;
            }
            return new YouTubeAdapter(settings);
        } else {
            return new TwitchAdapter(settings);
        }
    }

    // --- Chat Container Management ---
    function onChatContainerAdded(chatContainer) {
        if (isObserverActive) return;
        console.log("[Plus2] Chat container found. Initializing features.");
        isObserverActive = true;
        observedChatContainer = chatContainer;

        // Handle auto-docking
        uiInjection.handleAutoDocking();

        // Process existing messages
        messageProcessor.processExistingMessages(chatContainer);

        // Create message observer for new messages
        messageObserver = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type !== 'childList') continue;

                // Handle removed nodes for search cache (Twitch only)
                if (platformAdapter.platform === 'twitch') {
                    mutation.removedNodes.forEach(removedNode => {
                        if (removedNode.nodeType !== Node.ELEMENT_NODE) return;
                        const isChatMessage = removedNode.querySelector(platformAdapter.selectors.chatMessage) || 
                                             removedNode.matches('.chat-line__message-container');
                        if (isChatMessage && !removedNode.hasAttribute('data-plus2-readded')) {
                            searchFeature.cachePrunedMessage(removedNode);
                        }
                    });
                }

                mutation.addedNodes.forEach(addedNode => {
                    if (addedNode.nodeType !== Node.ELEMENT_NODE) return;

                    const isReAdded = addedNode.hasAttribute && addedNode.hasAttribute('data-plus2-readded');
                    const messageElements = extractMessageElements(addedNode);

                    if (messageElements.hoverTarget && messageElements.chatMessage) {
                        // Process message for counting/polling if not re-added
                        if (!isReAdded) {
                            processNewChatMessage(messageElements);
                        }

                        // Always add UI elements
                        addUIToMessage(messageElements.hoverTarget);

                        // Filter for search if active
                        if (searchFeature.isSearchActive && platformAdapter.platform === 'twitch') {
                            searchFeature.filterNewMessage(messageElements.chatMessage, searchFeature.getCurrentQuery());
                        }
                    }
                });
            }
        });

        messageObserver.observe(chatContainer, { childList: true, subtree: true });
        console.log("[Plus2] Message observer attached.");
    }

    function onChatContainerRemoved() {
        if (!isObserverActive) return;
        console.log("[Plus2] Chat container removed. Cleaning up.");

        if (messageObserver) {
            messageObserver.disconnect();
            messageObserver = null;
        }

        // Reset state
        messageProcessor.clearProcessedMessages();
        isObserverActive = false;
        observedChatContainer = null;
        uiInjection.popOutView(); // Remove docked view if it exists
    }

    // --- Message Processing Helpers ---
    function extractMessageElements(addedNode) {
        let chatMessageElement = null;
        let hoverTargetElement = null;

        if (platformAdapter.platform === 'twitch') {
            if (settings.enable7TVCompat) {
                let seventvMessageRoot = addedNode.matches('.seventv-message') ? addedNode : addedNode.querySelector('.seventv-message');
                if (seventvMessageRoot) {
                    chatMessageElement = seventvMessageRoot.querySelector(platformAdapter.selectors.chatMessage);
                    hoverTargetElement = seventvMessageRoot.querySelector('.seventv-chat-message-container') || seventvMessageRoot;
                }
            } else {
                chatMessageElement = addedNode.querySelector ? addedNode.querySelector(platformAdapter.selectors.chatMessage) : null;
                if (chatMessageElement) hoverTargetElement = addedNode;
            }
        } else if (platformAdapter.platform === 'youtube') {
            if (addedNode.matches && addedNode.matches(platformAdapter.selectors.chatMessage)) {
                chatMessageElement = hoverTargetElement = addedNode;
            }
        }

        return { chatMessage: chatMessageElement, hoverTarget: hoverTargetElement };
    }

    function processNewChatMessage(messageElements) {
        if (platformAdapter.platform === 'twitch') {
            if (settings.enable7TVCompat) {
                const messageId = messageElements.chatMessage.getAttribute('msg-id');
                if (messageId && !messageProcessor.isProcessed(messageId)) {
                    messageProcessor.processNewMessage(messageElements.hoverTarget, messageElements.chatMessage, messageId);
                }
            } else {
                if (!messageProcessor.isProcessed(messageElements.chatMessage)) {
                    messageProcessor.processNewMessage(messageElements.hoverTarget, messageElements.chatMessage, messageElements.chatMessage);
                }
            }
        } else if (platformAdapter.platform === 'youtube') {
            if (!messageProcessor.isProcessed(messageElements.chatMessage)) {
                messageProcessor.processNewMessage(messageElements.hoverTarget, messageElements.chatMessage, messageElements.chatMessage);
            }
        }
    }

    function addUIToMessage(messageElement) {
        // Add highlight button
        platformAdapter.addHighlightButton(messageElement, (messageParts) => {
            platformAdapter.sendHighlightMessage(messageParts);
        });

        // Add tooltip hover listeners
        tooltipHandler.addHoverListeners(messageElement);
    }

    // --- Initialization ---
    function initialize() {
        browser.storage.sync.get([
            'requiredUrlSubstring', 'enable7TVCompat', 'enableModPostReplyHighlight', 'enableReplyTooltip',
            'inactivityTimeoutDuration', 'maxPrunedCacheSize', 'enableYouTube', 'dockingBehavior', 'dockedViewHeight',
            'enableFrankerFaceZCompat'
        ]).then((items) => {
            settings = items;

            // Create platform adapter
            platformAdapter = createPlatformAdapter();
            if (!platformAdapter) {
                return; // Platform not supported or disabled
            }

            // Initialize modules
            messageProcessor = new MessageProcessor(platformAdapter, settings);
            uiInjection = new UIInjection(platformAdapter, settings);
            searchFeature = new SearchFeature(platformAdapter, settings);
            tooltipHandler = new TooltipHandler(platformAdapter, settings);
            autoScroll = new AutoScroll(settings);

            // Make tooltip handler available globally for message processor
            window.tooltipHandler = tooltipHandler;

            // Initialize UI components
            uiInjection.initialize();
            searchFeature.initialize();
            autoScroll.initialize();

            // Set up site observer for SPA navigation
            if (siteObserver) siteObserver.disconnect();
            siteObserver = new MutationObserver(() => {
                // Check URL filter for Twitch
                if (platformAdapter.platform === 'twitch' && !platformAdapter.shouldProcessOnThisPlatform()) {
                    if (isObserverActive) {
                        onChatContainerRemoved();
                    }
                    return;
                }

                // Look for chat container
                const chatContainerSelector = platformAdapter.platform === 'twitch' 
                    ? platformAdapter.selectors.chatScrollableArea 
                    : `#${platformAdapter.selectors.chatScrollableArea.replace('#', '')}`;
                const currentChatContainer = document.querySelector(chatContainerSelector);

                if (currentChatContainer) {
                    if (!isObserverActive) {
                        onChatContainerAdded(currentChatContainer);
                    } else if (isObserverActive && currentChatContainer !== observedChatContainer) {
                        console.log("[Plus2] New chat container detected. Re-initializing.");
                        onChatContainerRemoved();
                        onChatContainerAdded(currentChatContainer);
                    }
                } else if (!currentChatContainer && isObserverActive) {
                    onChatContainerRemoved();
                }
            });
            siteObserver.observe(document.body, { childList: true, subtree: true });

            // Set up message forwarding for docked iframe (Firefox compatibility)
            setupMessageForwarding();
        });
    }

    function setupMessageForwarding() {
        browser.runtime.onMessage.addListener((message) => {
            if (uiInjection && uiInjection.isDocked && uiInjection.dockedContainer) {
                const iframe = uiInjection.dockedContainer.querySelector('iframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage(message, '*');
                }
            }
        });
    }

    // Start the application
    initialize();
})();