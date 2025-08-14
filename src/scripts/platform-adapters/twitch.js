// Twitch platform adapter
class TwitchAdapter extends BasePlatformAdapter {
    constructor(settings) {
        super(settings);
        this.platform = 'twitch';
        this.selectors = this.getSelectors();
    }

    shouldProcessOnThisPlatform() {
        if (this.settings.requiredUrlSubstring && 
            !window.location.href.includes(this.settings.requiredUrlSubstring)) {
            return false;
        }
        return true;
    }

    getSelectors() {
        if (this.settings.enable7TVCompat) {
            return {
                chatMessage: '.seventv-user-message',
                messageContent: '.seventv-chat-message-body',
                iconsContainer: '.seventv-chat-message-buttons',
                chatScrollableArea: '#seventv-message-container .seventv-chat-list',
                chatImage: 'img.seventv-chat-emote',
                username: '.seventv-chat-user-username',
                chatBadge: '.seventv-chat-badge',
                reply: 'div.seventv-reply-message-part'
            };
        } else if (this.settings.enableFrankerFaceZCompat) {
            return {
                chatMessage: '.chat-line__message',
                messageContent: 'span.message',
                iconsContainer: 'div.ffz--hover-actions',
                chatScrollableArea: '.chat-scrollable-area__message-container',
                chatImage: 'img.chat-image, img.ffz-emote',
                username: 'span.chat-line__username',
                chatBadge: '.ffz-badge',
                reply: 'p' // Will need text content check
            };
        } else {
            return {
                chatMessage: '.chat-line__message',
                messageContent: 'span[data-a-target="chat-line-message-body"]',
                iconsContainer: '.chat-line__icons',
                chatScrollableArea: '.chat-scrollable-area__message-container',
                chatImage: 'img.chat-image',
                username: '[data-a-target="chat-message-username"]',
                chatBadge: 'span.chat-badge, button[data-a-target="chat-badge"]',
                reply: 'p' // Will need text content check
            };
        }
    }

    extractMessageParts(chatLine) {
        if (this.settings.enable7TVCompat) {
            return this._extract7TVMessage(chatLine);
        } else if (this.settings.enableFrankerFaceZCompat) {
            return this._extractFFZMessage(chatLine);
        } else {
            return this._extractStandardMessage(chatLine);
        }
    }

    _extract7TVMessage(chatLine) {
        const messageDiv = chatLine.querySelector('.seventv-user-message');
        if (!messageDiv) return null;

        const usernameElement = messageDiv.querySelector('.seventv-chat-user-username');
        const username = usernameElement ? usernameElement.textContent.trim() : null;
        const usernameHTML = usernameElement ? usernameElement.outerHTML : '';

        const badgesHTML = Array.from(messageDiv.querySelectorAll('.seventv-chat-badge'))
            .map(badge => badge.outerHTML)
            .join('');

        const messageBodyElement = messageDiv.querySelector('.seventv-chat-message-body');
        
        // Pre-process 7TV emotes to handle protocol-relative URLs and lazy-loading
        if (messageBodyElement) {
            const emoteImages = messageBodyElement.querySelectorAll('img.seventv-chat-emote');
            emoteImages.forEach(img => {
                if (img.hasAttribute('srcset')) {
                    const updatedSrcset = img.getAttribute('srcset')
                        .split(',')
                        .map(s => s.trim().startsWith('//') ? 'https:' + s.trim() : s.trim())
                        .join(', ');
                    img.setAttribute('srcset', updatedSrcset);
                }

                if (img.src && img.src.startsWith('//')) {
                    img.src = 'https:' + img.src;
                }

                if (!img.src && img.hasAttribute('srcset')) {
                   const firstSrc = img.getAttribute('srcset').split(',')[0].trim().split(' ')[0];
                   if (firstSrc) {
                       img.setAttribute('src', firstSrc);
                   }
                }
            });
        }
        const messageBodyHTML = messageBodyElement ? messageBodyElement.innerHTML : '';

        let replyHTML = '';
        const replyElement = chatLine.querySelector('div.seventv-reply-message-part');
        if (replyElement) replyHTML = replyElement.outerHTML;

        return { badgesHTML, usernameHTML, messageBodyHTML, replyHTML, username, channelUrl: window.location.href };
    }

    _extractFFZMessage(chatLine) {
        const usernameElement = chatLine.querySelector('span.chat-line__username');
        const username = usernameElement ? usernameElement.querySelector('span.chat-author__display-name')?.textContent.trim() : null;
        const usernameHTML = usernameElement ? usernameElement.outerHTML : '';

        // FFZ badge reconstruction
        const badgesContainer = chatLine.querySelector('span.chat-line__message--badges');
        let badgesHTML = '';
        if (badgesContainer) {
            const badgeSpans = badgesContainer.querySelectorAll('.ffz-badge');
            badgesHTML = Array.from(badgeSpans).map(badgeSpan => {
                const badgeId = badgeSpan.dataset.badge;
                const badgeVersion = badgeSpan.dataset.version;
                const provider = badgeSpan.dataset.provider;

                if (provider === 'twitch' && badgeId && badgeVersion) {
                    const badgeUrl = `https://static-cdn.jtvnw.net/badges/v1/${badgeId}/${badgeVersion}/1`;
                    return `<span class="chat-badge" title="${badgeId}"><img src="${badgeUrl}" alt="${badgeId}" /></span>`;
                }
                return badgeSpan.outerHTML;
            }).join('');
        }

        const messageBodyElement = chatLine.querySelector('span.message');
        const messageBodyHTML = messageBodyElement ? messageBodyElement.innerHTML : '';

        let replyHTML = '';
        const allParagraphs = chatLine.querySelectorAll('p');
        for (const p of allParagraphs) {
            if (p.textContent.trim().startsWith('Replying to ')) {
                replyHTML = p.outerHTML;
                break;
            }
        }

        return { badgesHTML, usernameHTML, messageBodyHTML, replyHTML, username, channelUrl: window.location.href };
    }

    _extractStandardMessage(chatLine) {
        const usernameElement = chatLine.querySelector('[data-a-target="chat-message-username"]');
        const username = usernameElement ? usernameElement.textContent.trim() : null;
        const usernameHTML = usernameElement ? usernameElement.outerHTML : '';

        const badgesHTML = Array.from(chatLine.querySelectorAll('span.chat-badge, button[data-a-target="chat-badge"]'))
            .map(badge => badge.outerHTML)
            .join('');

        const messageBodyElement = chatLine.querySelector('span[data-a-target="chat-line-message-body"]');
        const messageBodyHTML = messageBodyElement ? messageBodyElement.innerHTML : '';

        let replyHTML = '';
        const allParagraphs = chatLine.querySelectorAll('p');
        for (const p of allParagraphs) {
            if (p.textContent.trim().startsWith('Replying to ')) {
                replyHTML = p.outerHTML;
                break;
            }
        }

        return { badgesHTML, usernameHTML, messageBodyHTML, replyHTML, username, channelUrl: window.location.href };
    }

    addHighlightButton(chatLine, onHighlight) {
        try {
            const iconsDiv = chatLine.querySelector(this.selectors.iconsContainer);
            if (!iconsDiv || iconsDiv.querySelector('#plus2-highlight-button')) return;

            const img = this.createIconElement('24px');
            img.style.verticalAlign = 'middle';

            const highlightButton = document.createElement('button');
            highlightButton.id = 'plus2-highlight-button';
            highlightButton.style.marginLeft = '5px';
            highlightButton.style.padding = '0';
            highlightButton.style.border = 'none';
            highlightButton.style.backgroundColor = 'transparent';
            highlightButton.classList.add('plus2-highlight-button');
            highlightButton.appendChild(img);

            highlightButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const messageParts = this.extractMessageParts(chatLine);
                if (messageParts) {
                    onHighlight(messageParts);
                }
            });

            iconsDiv.insertBefore(highlightButton, iconsDiv.firstChild);
        } catch (error) {
            if (!error.message.includes("Extension context invalidated")) {
                console.error("[Plus2] Error in addHighlightButton:", error);
            }
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TwitchAdapter = TwitchAdapter;
}