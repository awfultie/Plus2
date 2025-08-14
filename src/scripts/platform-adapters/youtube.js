// YouTube platform adapter
class YouTubeAdapter extends BasePlatformAdapter {
    constructor(settings) {
        super(settings);
        this.platform = 'youtube';
        this.selectors = this.getSelectors();
    }

    shouldProcessOnThisPlatform() {
        return this.settings.enableYouTube;
    }

    getSelectors() {
        return {
            chatMessage: 'yt-live-chat-text-message-renderer',
            messageContent: '#message',
            iconsContainer: '#menu',
            chatScrollableArea: '#items',
            chatImage: 'img.yt-live-chat-emoji-renderer',
            username: '#author-name',
            authorPhoto: '#author-photo img',
            reply: null // TODO: Add YouTube reply selector when available
        };
    }

    extractMessageParts(chatLine) {
        const usernameElement = chatLine.querySelector(this.selectors.username);
        const messageBodyElement = chatLine.querySelector(this.selectors.messageContent);
        const authorPhotoElement = chatLine.querySelector(this.selectors.authorPhoto);

        const username = usernameElement ? usernameElement.textContent.trim() : null;
        const usernameHTML = usernameElement ? usernameElement.outerHTML : '';
        const messageBodyHTML = messageBodyElement ? messageBodyElement.innerHTML : '';

        // Use the author's photo as a "badge"
        let badgesHTML = '';
        if (authorPhotoElement) {
            badgesHTML = `<span class="chat-badge" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><img src="${authorPhotoElement.src}" style="width: 18px; height: 18px; border-radius: 50%;"></span>`;
        }

        // TODO: Add logic to extract YouTube reply context once HTML is provided
        const replyHTML = '';

        return { badgesHTML, usernameHTML, messageBodyHTML, replyHTML, username, channelUrl: window.location.href };
    }

    addHighlightButton(chatLine, onHighlight) {
        try {
            const iconsDiv = chatLine.querySelector(this.selectors.iconsContainer);
            if (!iconsDiv || iconsDiv.querySelector('#plus2-highlight-button')) return;

            const existingMenuButton = iconsDiv.querySelector('#menu-button');
            if (!existingMenuButton) return;

            const highlightButton = document.createElement('yt-icon-button');
            highlightButton.id = 'plus2-highlight-button';
            highlightButton.className = 'style-scope yt-live-chat-text-message-renderer';

            // Create the inner <button> that YouTube expects
            const innerButton = document.createElement('button');
            innerButton.id = 'button';
            innerButton.className = 'style-scope yt-icon-button';
            innerButton.setAttribute('aria-label', 'Highlight Message');

            // Create our custom icon
            const img = this.createIconElement('20px');

            // Add the icon to the button, and the button to the wrapper
            innerButton.appendChild(img);
            highlightButton.appendChild(innerButton);
            
            innerButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const messageParts = this.extractMessageParts(chatLine);
                if (messageParts) {
                    onHighlight(messageParts);
                }
            });

            iconsDiv.insertBefore(highlightButton, existingMenuButton);
        } catch (error) {
            if (!error.message.includes("Extension context invalidated")) {
                console.error("[Plus2] Error in addHighlightButton:", error);
            }
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.YouTubeAdapter = YouTubeAdapter;
}