// Message processing module
class MessageProcessor {
    constructor(platformAdapter, settings) {
        this.adapter = platformAdapter;
        this.settings = settings;
        this.processedMessageIDs = new Set();
        this.processedMessageElements = new WeakSet();
    }

    clearProcessedMessages() {
        this.processedMessageIDs.clear();
        this.processedMessageElements = new WeakSet();
    }

    processExistingMessages(chatContainer) {
        if (!chatContainer) return;
    
        if (this.adapter.platform === 'twitch') {
            if (this.settings.features?.enableSevenTVCompatibility) {
                this._processSevenTVMessages(chatContainer);
            } else {
                this._processStandardTwitchMessages(chatContainer);
            }
        } else if (this.adapter.platform === 'youtube') {
            this._processYouTubeMessages(chatContainer);
        }
    }

    // Process existing messages for UI only (no webhook events)
    processExistingMessagesUIOnly(chatContainer) {
        if (!chatContainer) return;
    
        if (this.adapter.platform === 'twitch') {
            if (this.settings.features?.enableSevenTVCompatibility) {
                this._processSevenTVMessagesUIOnly(chatContainer);
            } else {
                this._processStandardTwitchMessagesUIOnly(chatContainer);
            }
        } else if (this.adapter.platform === 'youtube') {
            this._processYouTubeMessagesUIOnly(chatContainer);
        }
    }

    _processSevenTVMessages(chatContainer) {
        const seventvMessages = chatContainer.querySelectorAll('.seventv-message');
        seventvMessages.forEach(seventvMessageRoot => {
            const hoverTarget = seventvMessageRoot.querySelector('.seventv-chat-message-container');
            const chatMessageElement = seventvMessageRoot.querySelector(this.adapter.selectors.chatMessage);
            if (hoverTarget && chatMessageElement && !this.processedMessageElements.has(chatMessageElement)) {
                this._addUIToMessage(hoverTarget);
                const messageId = chatMessageElement.getAttribute('msg-id');
                if (messageId && !this.processedMessageIDs.has(messageId)) {
                    this.processNewMessage(hoverTarget, chatMessageElement, messageId, { skipBackgroundMessage: true });
                }
            }
        });
    }

    _processStandardTwitchMessages(chatContainer) {
        const twitchMessages = chatContainer.querySelectorAll(':scope > div');
        twitchMessages.forEach(twitchMessageLine => {
            const chatMessageElement = twitchMessageLine.querySelector(this.adapter.selectors.chatMessage);
            if (chatMessageElement && !this.processedMessageElements.has(chatMessageElement)) {
                this._addUIToMessage(twitchMessageLine);
                if (!this.processedMessageElements.has(chatMessageElement)) {
                    this.processNewMessage(twitchMessageLine, chatMessageElement, chatMessageElement, { skipBackgroundMessage: true });
                }
            }
        });
    }

    _processYouTubeMessages(chatContainer) {
        const ytMessages = chatContainer.querySelectorAll(this.adapter.selectors.chatMessage);
        ytMessages.forEach(messageNode => {
            this._addUIToMessage(messageNode);
            if (!this.processedMessageElements.has(messageNode)) {
                this.processNewMessage(messageNode, messageNode, messageNode, { skipBackgroundMessage: true });
            }
        });
    }

    // UI-only versions that don't trigger webhook events
    _processSevenTVMessagesUIOnly(chatContainer) {
        const seventvMessages = chatContainer.querySelectorAll('.seventv-message');
        seventvMessages.forEach(seventvMessageRoot => {
            const hoverTarget = seventvMessageRoot.querySelector('.seventv-chat-message-container');
            const chatMessageElement = seventvMessageRoot.querySelector(this.adapter.selectors.chatMessage);
            if (hoverTarget && chatMessageElement && !this.processedMessageElements.has(chatMessageElement)) {
                this._addUIToMessage(hoverTarget);
                this.processedMessageElements.add(chatMessageElement); // Mark as processed to avoid duplicates
            }
        });
    }

    _processStandardTwitchMessagesUIOnly(chatContainer) {
        const twitchMessages = chatContainer.querySelectorAll(':scope > div');
        twitchMessages.forEach(twitchMessageLine => {
            const chatMessageElement = twitchMessageLine.querySelector(this.adapter.selectors.chatMessage);
            if (chatMessageElement && !this.processedMessageElements.has(chatMessageElement)) {
                this._addUIToMessage(twitchMessageLine);
                this.processedMessageElements.add(chatMessageElement); // Mark as processed to avoid duplicates
            }
        });
    }

    _processYouTubeMessagesUIOnly(chatContainer) {
        const ytMessages = chatContainer.querySelectorAll(this.adapter.selectors.chatMessage);
        ytMessages.forEach(messageNode => {
            if (!this.processedMessageElements.has(messageNode)) {
                this._addUIToMessage(messageNode);
                this.processedMessageElements.add(messageNode); // Mark as processed to avoid duplicates
            }
        });
    }

    _addUIToMessage(messageElement) {
        // Add highlight button
        this.adapter.addHighlightButton(messageElement, (messageParts) => {
            this.adapter.sendHighlightMessage(messageParts);
        });

        // Add hover listeners for tooltips (if tooltip handler is available)
        if (typeof window !== 'undefined' && window.tooltipHandler) {
            window.tooltipHandler.addHoverListeners(messageElement);
        }
    }

    processNewMessage(hoverTargetElement, chatMessageElementForContent, itemToMarkAsProcessed, options = {}) {
        try {
            // 1. Send message data to background for counting/polling (skip for existing messages to prevent reload spikes)
            const messageContentContainer = chatMessageElementForContent.querySelector(this.adapter.selectors.messageContent);
            const usernameContainer = chatMessageElementForContent.querySelector(this.adapter.selectors.username);
            if (messageContentContainer && !options.skipBackgroundMessage) {
                const text = (messageContentContainer.textContent || "").trim();
                const images = Array.from(messageContentContainer.querySelectorAll(this.adapter.selectors.chatImage)).map(img => {
                    let src = img.src;

                    // Handle 7TV emotes that use srcset instead of src
                    if ((!src || src === '') && img.hasAttribute('srcset')) {
                        const srcset = img.getAttribute('srcset');
                        const firstSrc = srcset.split(',')[0].trim().split(' ')[0];
                        if (firstSrc) {
                            // Add https: protocol if it's protocol-relative
                            src = firstSrc.startsWith('//') ? 'https:' + firstSrc : firstSrc;
                        }
                    }

                    // Handle protocol-relative URLs
                    if (src && src.startsWith('//')) {
                        src = 'https:' + src;
                    }

                    return {
                        alt: img.alt,
                        src: src
                    };
                });
                const username = usernameContainer ? (usernameContainer.textContent || "").trim() : '';

                // Debug logging for 7TV mode
                if (this.settings.features?.enableSevenTVCompatibility && images.length > 0) {
                    console.log('[MessageProcessor] 7TV emotes extracted:', images.map(img => ({ name: img.alt, url: img.src })));
                }

                if (typeof browser !== 'undefined' && browser.runtime?.id) {
                    browser.runtime.sendMessage({
                        type: 'CHAT_MESSAGE_FOUND',
                        data: { text, images, username }
                    }).catch(e => { /* Silently ignore */ });
                }
            }

            // 2. Handle Mod "post" command highlighting (Twitch only)
            if (this.adapter.platform === 'twitch') {
                this._handleModPostHighlight(hoverTargetElement, chatMessageElementForContent);
            }

            // 3. Mark as processed to prevent duplicates
            this._markAsProcessed(itemToMarkAsProcessed);
        } catch (error) {
            if (!error.message.includes("Extension context invalidated")) {
            }
        }
    }

    _handleModPostHighlight(hoverTargetElement, chatMessageElementForContent) {
        if (!this.settings.features?.enableModPostReplyHighlight) return;

        const modBadge = hoverTargetElement.querySelector('img.chat-badge[alt="Moderator"], img.chat-badge[alt="Broadcaster"], div.seventv-chat-badge img[alt="Moderator"], div.seventv-chat-badge img[alt="Broadcaster"]');
        const messageBody = chatMessageElementForContent.querySelector(this.adapter.selectors.messageContent);
        const usernameContainer = chatMessageElementForContent.querySelector(this.adapter.selectors.username);
        const username = usernameContainer ? (usernameContainer.textContent || "").trim() : '';
        
        // Check if user is approved either by badge or username list
        const hasModBadge = !!modBadge;
        const isApprovedUser = this.isUserInApprovedList(username);
        const isAuthorized = hasModBadge || isApprovedUser;

        if (isAuthorized && messageBody && messageBody.textContent.trim().toLowerCase() === 'post') {
            let replyElement = null;
            if (this.settings.features?.enableSevenTVCompatibility) {
                replyElement = hoverTargetElement.querySelector('div.seventv-reply-message-part');
            } else {
                const allParagraphs = hoverTargetElement.querySelectorAll('p');
                for (const p of allParagraphs) {
                    if (p.textContent.trim().startsWith('Replying to ')) {
                        replyElement = p;
                        break;
                    }
                }
            }

            if (replyElement && typeof browser !== 'undefined' && browser.runtime?.id) {
                browser.runtime.sendMessage({
                    type: 'CHAT_MESSAGE_FOUND',
                    data: { isModPost: true, modReplyContent: replyElement.innerHTML }
                }).catch(e => { /* Silently ignore */ });
            }
        }
    }
    
    isUserInApprovedList(username) {
        if (!username) return false;
        
        const approvedUsers = this.settings.features?.modPostApprovedUsers || '';
        const userList = approvedUsers.split(',').map(user => user.trim().toLowerCase()).filter(user => user.length > 0);
        
        return userList.includes(username.toLowerCase());
    }

    _markAsProcessed(itemToMarkAsProcessed) {
        if (!itemToMarkAsProcessed) return;

        if (this.adapter.platform === 'twitch' && this.settings.features?.enableSevenTVCompatibility && typeof itemToMarkAsProcessed === 'string') {
            this.processedMessageIDs.add(itemToMarkAsProcessed);
        } else if (typeof itemToMarkAsProcessed === 'object') {
            this.processedMessageElements.add(itemToMarkAsProcessed);
        }
    }

    isProcessed(item) {
        if (typeof item === 'string') {
            return this.processedMessageIDs.has(item);
        } else if (typeof item === 'object') {
            return this.processedMessageElements.has(item);
        }
        return false;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MessageProcessor = MessageProcessor;
}