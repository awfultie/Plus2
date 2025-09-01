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

    const currentSelectors = platform.isTwitch ? selectors.twitch : selectors.youtube;

    function sendToBackground(type, data) {
        try {
            browser.runtime.sendMessage({ type, data });
        } catch (e) {
        }
    }

    function processChatMessage(node) {
        if (node.nodeType !== Node.ELEMENT_NODE || node.classList.contains('plus2-processed')) {
            return;
        }
        node.classList.add('plus2-processed');

        const messageBodyEl = node.querySelector(currentSelectors.messageBody);
        const usernameEl = node.querySelector(currentSelectors.username);

        if (messageBodyEl && usernameEl) {
            const text = messageBodyEl.textContent || '';
            const images = Array.from(messageBodyEl.querySelectorAll('img')).map(img => ({
                alt: img.alt || '',
                src: img.src || ''
            }));
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
        highlightButton.onclick = (e) => {
            e.stopPropagation(); // Prevent other click listeners
            const badgesHTML = node.querySelector(currentSelectors.badges)?.innerHTML || '';
            const usernameHTML = node.querySelector(currentSelectors.username)?.innerHTML || '';
            const messageBodyHTML = node.querySelector(currentSelectors.messageBody)?.innerHTML || '';
            const username = usernameEl.textContent;
            const replyHTML = currentSelectors.reply ? (node.querySelector(currentSelectors.reply)?.innerHTML || '') : '';

            sendToBackground('HIGHLIGHT_MESSAGE_REQUEST', {
                badgesHTML, usernameHTML, messageBodyHTML, replyHTML, username,
                channelUrl: window.location.href
            });
        };

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
                    if (node.matches && node.matches(currentSelectors.chatMessage)) {
                        processChatMessage(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll(currentSelectors.chatMessage).forEach(processChatMessage);
                    }
                });
            }
        }
    });

    function startObserver() {
        const targetNode = document.querySelector(currentSelectors.chatContainer);
        if (targetNode) {
            observer.observe(targetNode, { childList: true, subtree: platform.isTwitch });
            targetNode.querySelectorAll(currentSelectors.chatMessage).forEach(processChatMessage);
        } else {
            setTimeout(startObserver, 2000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
    } else {
        startObserver();
    }
})();