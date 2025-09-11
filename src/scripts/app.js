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
            if (!settings.features?.enableYouTube) {
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
        isObserverActive = true;
        observedChatContainer = chatContainer;

        // Handle auto-docking
        uiInjection.handleAutoDocking();

        // Process existing messages for UI only (no webhook events for old messages)
        messageProcessor.processExistingMessagesUIOnly(chatContainer);

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
    }

    function onChatContainerRemoved() {
        if (!isObserverActive) return;

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
        console.log('[App] extractMessageElements called with node:', addedNode);
        console.log('[App] 7TV compatibility enabled:', settings.features?.enableSevenTVCompatibility);
        let chatMessageElement = null;
        let hoverTargetElement = null;

        if (platformAdapter.platform === 'twitch') {
            if (settings.features?.enableSevenTVCompatibility) {
                let seventvMessageRoot = addedNode.matches('.seventv-message') ? addedNode : addedNode.querySelector('.seventv-message');
                console.log('[App] Found 7TV message root:', !!seventvMessageRoot, seventvMessageRoot);
                if (seventvMessageRoot) {
                    chatMessageElement = seventvMessageRoot.querySelector(platformAdapter.selectors.chatMessage);
                    hoverTargetElement = seventvMessageRoot.querySelector('.seventv-chat-message-container') || seventvMessageRoot;
                    console.log('[App] 7TV elements - chatMessage:', !!chatMessageElement, 'hoverTarget:', !!hoverTargetElement);
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
            if (settings.features?.enableSevenTVCompatibility) {
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
        // Set up message listener for settings updates
        setupMessageForwarding();
        
        // Get settings from background script (which uses SettingsManager)
        browser.runtime.sendMessage({ type: 'GET_SETTINGS' }).then((response) => {
            if (response && response.settings) {
                settings = response.settings;
                initializeWithSettings(settings);
            } else {
                console.error('[App] Failed to get settings from background script');
            }
        }).catch((error) => {
            console.error('[App] Error getting settings:', error);
        });
    }

    function initializeWithSettings(settingsData) {
        settings = settingsData;

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
                    onChatContainerRemoved();
                    onChatContainerAdded(currentChatContainer);
                }
            } else if (!currentChatContainer && isObserverActive) {
                onChatContainerRemoved();
            }
        });
        siteObserver.observe(document.body, { childList: true, subtree: true });
    }

    function setupMessageForwarding() {
        browser.runtime.onMessage.addListener((message) => {
            // Handle settings updates - just update the settings object for now
            if (message.type === 'SETTINGS_UPDATE') {
                settings = message.data;
            }
            
            // Handle leaderboard state updates
            if (message.type === 'LEADERBOARD_STATE_UPDATE' && uiInjection) {
                uiInjection.updateLeaderboardDisplayMode(message.mode);
            }
            
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