(function() {
    "use strict";

    // Determine if we are on Twitch or YouTube
    const platform = {
        isTwitch: window.location.hostname.includes("twitch.tv"),
        isYouTube: window.location.hostname.includes("youtube.com"),
    };

    // Define the CSS selectors for each platform
    const selectors = {
        twitch: {
            chatContainer: '.chat-scrollable-area__message-container',
            chatMessage: '.chat-line__message',
            username: '.chat-author__display-name',
            messageBody: '.message', // This contains text and emotes
            badges: '.chat-line__message--badges',
            authorContainer: '.chat-line__username-container',
            reply: '.reply-line',
        },
        twitch7tv: {
            chatContainer: '.chat-scrollable-area__message-container',
            chatMessage: '.seventv-user-message',
            username: '.seventv-chat-user-username',
            messageBody: '.seventv-chat-message-body', // 7TV message body
            badges: '.seventv-chat-user-badge-list',
            authorContainer: '.seventv-chat-user',
            reply: '.reply-line',
        },
        youtube: {
            chatContainer: '#items.yt-live-chat-item-list-renderer',
            chatMessage: 'yt-live-chat-text-message-renderer',
            username: '#author-name',
            messageBody: '#message',
            badges: '#chat-badges',
            authorContainer: '#author-chip',
            reply: null, // YouTube doesn't have the same reply structure
        }
    };

    // Function to get current selectors (dynamically detect 7TV)
    function getCurrentSelectors() {
        if (!platform.isTwitch) return selectors.youtube;

        // Check if 7TV is active by looking for 7TV elements in the DOM
        const is7TVActive = document.querySelector('.seventv-message') !== null;
        return is7TVActive ? selectors.twitch7tv : selectors.twitch;
    }

    function sendToBackground(type, data) {
        try {
            browser.runtime.sendMessage({ type, data }).catch(error => {
                // Silently ignore message port errors - they're common in extensions
                if (!error.message?.includes('message port closed')) {
                    console.warn('[Content] Message send error:', error);
                }
            });
        } catch (e) {
            // Runtime not available or extension context invalid
            console.warn('[Content] Runtime send error:', e);
        }
    }

    function processChatMessage(node) {
        if (node.nodeType !== Node.ELEMENT_NODE || node.classList.contains('plus2-processed')) {
            return;
        }
        node.classList.add('plus2-processed');

        const currentSelectors = getCurrentSelectors();
        const messageBodyEl = node.querySelector(currentSelectors.messageBody);
        const usernameEl = node.querySelector(currentSelectors.username);

        if (messageBodyEl && usernameEl) {
            const text = messageBodyEl.textContent || '';
            const images = Array.from(messageBodyEl.querySelectorAll('img')).map(img => {
                let src = img.src || '';

                // Enhanced 7TV emote handling
                if (img.classList.contains('seventv-chat-emote') && img.srcset) {
                    // Extract the highest resolution URL from srcset for 7TV emotes
                    // srcset format: "//cdn.7tv.app/emote/ID/1x.avif 1x, //cdn.7tv.app/emote/ID/2x.avif 2x"
                    const srcsetEntries = img.srcset.split(',').map(entry => entry.trim());
                    const highestRes = srcsetEntries[srcsetEntries.length - 1]; // Get last (highest res)
                    if (highestRes) {
                        const url = highestRes.split(' ')[0]; // Extract URL part before resolution descriptor
                        if (url.startsWith('//')) {
                            src = 'https:' + url; // Add protocol to protocol-relative URLs
                        } else {
                            src = url;
                        }
                    }
                }

                // Detect wide emotes from 7TV
                const isWide = img.classList.contains('seventv-chat-emote') &&
                              (img.classList.contains('seventv-chat-emote--wide') ||
                               img.dataset.width === '2' ||
                               img.dataset.flags?.includes('WIDE'));

                return {
                    alt: img.alt || '',
                    src: src,
                    // Add 7TV-specific metadata for better emote handling
                    is7TV: img.classList.contains('seventv-chat-emote'),
                    isWide: isWide,
                    className: img.className || ''
                };
            });
            const username = usernameEl.textContent || '';

            sendToBackground('CHAT_MESSAGE_FOUND', { text, images, username });
        }

        // Add a highlight button to the message
        const highlightButton = document.createElement('button');
        highlightButton.textContent = 'H';
        highlightButton.title = 'Highlight this message in Plus2';
        highlightButton.style.cssText = `
            margin-left: 8px; padding: 2px 5px; font-size: 10px; cursor: pointer;
            border: 1px solid #888; background: #555; color: white; border-radius: 3px;
            vertical-align: middle; z-index: 100;
        `;
        highlightButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent other click listeners
            const selectors = getCurrentSelectors();
            const badgesHTML = node.querySelector(selectors.badges)?.innerHTML || '';
            const usernameHTML = node.querySelector(selectors.username)?.innerHTML || '';
            const messageBodyHTML = node.querySelector(selectors.messageBody)?.innerHTML || '';
            const username = usernameEl.textContent;
            const replyHTML = selectors.reply ? (node.querySelector(selectors.reply)?.innerHTML || '') : '';

            sendToBackground('HIGHLIGHT_MESSAGE_REQUEST', {
                badgesHTML, usernameHTML, messageBodyHTML, replyHTML, username,
                channelUrl: window.location.href
            });
        });

        const authorContainer = node.querySelector(currentSelectors.authorContainer);
        if (authorContainer) {
            authorContainer.appendChild(highlightButton);
        }
    }

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;
                    const selectors = getCurrentSelectors();
                    if (node.matches && node.matches(selectors.chatMessage)) {
                        processChatMessage(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll(selectors.chatMessage).forEach(processChatMessage);
                    }
                });
            }
        }
    });

    function startObserver() {
        const selectors = getCurrentSelectors();
        const targetNode = document.querySelector(selectors.chatContainer);
        if (targetNode) {
            // Add UI elements (highlight buttons) to existing messages without triggering polling/tracking
            targetNode.querySelectorAll(selectors.chatMessage).forEach(addUIOnlyToMessage);

            // Start the observer AFTER processing existing messages
            observer.observe(targetNode, { childList: true, subtree: platform.isTwitch });

            // Notify background that observer has started - from this point forward,
            // all messages are truly new and can be auto-queued for scrolling
            sendToBackground('CHAT_OBSERVER_STARTED', {});
        } else {
            setTimeout(startObserver, 2000);
        }
    }

    // Add only UI elements without sending messages to background
    function addUIOnlyToMessage(messageNode) {
        const selectors = getCurrentSelectors();
        const textEl = messageNode.querySelector(selectors.messageBody);
        const usernameEl = messageNode.querySelector(selectors.username);

        if (textEl && usernameEl && !messageNode.querySelector('#plus2-highlight-button')) {
            // Add highlight button without processing message content
            const highlightButton = document.createElement('button');
            highlightButton.id = 'plus2-highlight-button';
            highlightButton.textContent = 'H';
            highlightButton.title = 'Highlight this message in Plus2';
            highlightButton.style.cssText = `
                margin-left: 8px; padding: 2px 5px; font-size: 10px; cursor: pointer;
                border: 1px solid #888; background: #555; color: white; border-radius: 3px;
            `;

            highlightButton.addEventListener('click', () => {
                const text = textEl.textContent || '';
                const images = Array.from(textEl.querySelectorAll('img')).map(img => ({
                    alt: img.alt || '',
                    src: img.src || ''
                }));
                const username = usernameEl.textContent || '';

                sendToBackground('HIGHLIGHT_MESSAGE_REQUEST', { text, images, username });
            });

            messageNode.appendChild(highlightButton);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
    } else {
        startObserver();
    }
})();