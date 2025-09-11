// Twitch platform adapter
class TwitchAdapter extends BasePlatformAdapter {
    constructor(settings) {
        super(settings);
        this.platform = 'twitch';
        this.selectors = this.getSelectors();
    }

    shouldProcessOnThisPlatform() {
        if (this.settings.behavior?.requiredUrlSubstring && 
            !window.location.href.includes(this.settings.behavior.requiredUrlSubstring)) {
            return false;
        }
        return true;
    }

    getSelectors() {
        console.log('[TwitchAdapter] getSelectors() called, 7TV enabled:', this.settings.features?.enableSevenTVCompatibility);
        if (this.settings.features?.enableSevenTVCompatibility) {
            console.log('[TwitchAdapter] Using 7TV selectors');
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
        } else if (this.settings.features?.enableFrankerFaceZCompatibility) {
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
        if (this.settings.features?.enableSevenTVCompatibility) {
            return this._extract7TVMessage(chatLine);
        } else if (this.settings.features?.enableFrankerFaceZCompatibility) {
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
            console.log('[FFZ] Found badge spans:', badgeSpans.length);
            badgesHTML = Array.from(badgeSpans).map(badgeSpan => {
                const badgeId = badgeSpan.dataset.badge;
                const badgeVersion = badgeSpan.dataset.version;
                const provider = badgeSpan.dataset.provider;
                
                console.log('[FFZ] Processing badge:', { provider, badgeId, badgeVersion });

                if (provider === 'twitch' && badgeId && badgeVersion) {
                    // Map FFZ badge names to Twitch badge UUIDs
                    const badgeUuidMap = {
                        'broadcaster': '5527c58c-fb7d-422d-b71b-f309dcb85cc1',
                        'moderator': '3267646d-33f0-4b17-b3df-f923a41db1d0',
                        'vip': 'b817aba4-fad8-49e2-b88a-7cc744dfa6ec',
                        'subscriber': '5d9f2208-5dd8-11e7-8513-2ff4adfae661',
                        'founder': '511b78a9-ab37-472f-8425-eb2b6fcc6a37',
                        'premium': 'bbbe0db0-a598-423e-86d0-f9fb98ca1933',
                        'turbo': 'bd444ec6-8f34-4bf9-91f4-af1e3428d80f',
                        'staff': 'd97c37bd-a6f5-4c38-8f57-4e4bef88af34',
                        'admin': '9ef7e029-4cdf-4d4d-a0d5-e2b3fb2583fe',
                        'global_mod': '9384c17e-aa14-4d94-ab69-3ea7103e5f54',
                        'elden-ring-recluse': '5afadc6c-933b-4ede-b318-3752bbf267a9',
                        // Add more mappings as needed
                    };
                    
                    // Only create badge if we have a UUID mapping for it
                    const badgeUuid = badgeUuidMap[badgeId];
                    if (badgeUuid) {
                        const badgeUrl = `https://static-cdn.jtvnw.net/badges/v1/${badgeUuid}/${badgeVersion}`;
                        const reconstructedBadge = `<span class="chat-badge" title="${badgeId}"><img src="${badgeUrl}" alt="${badgeId}" /></span>`;
                        console.log('[FFZ] Badge mapping:', badgeId, '->', badgeUuid, 'URL:', badgeUrl);
                        return reconstructedBadge;
                    } else {
                        console.log('[FFZ] Skipping unmapped badge:', badgeId);
                        return ''; // Skip badges we don't have mappings for
                    }
                }
                console.log('[FFZ] Using original badge HTML:', badgeSpan.outerHTML);
                return badgeSpan.outerHTML;
            }).join('');
            console.log('[FFZ] Final badges HTML:', badgesHTML);
        }

        const messageBodyElement = chatLine.querySelector('span.message');
        
        // Pre-process FFZ emotes to handle protocol-relative URLs and lazy-loading (similar to 7TV)
        if (messageBodyElement) {
            const emoteImages = messageBodyElement.querySelectorAll('img.chat-image, img.ffz-emote');
            console.log('[FFZ] Found emote images:', emoteImages.length);
            emoteImages.forEach(img => {
                console.log('[FFZ] Processing emote:', { src: img.src, alt: img.alt, classes: img.className });
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
        console.log('[TwitchAdapter] addHighlightButton called, 7TV mode:', this.settings.features?.enableSevenTVCompatibility);
        console.log('[TwitchAdapter] chatLine element:', chatLine);
        console.log('[TwitchAdapter] chatLine classes:', chatLine.className);
        console.log('[TwitchAdapter] looking for icons container:', this.selectors.iconsContainer);
        
        // Debug: check if this element or its children contain any seventv classes
        const seventvElements = chatLine.querySelectorAll('[class*="seventv"]');
        console.log('[TwitchAdapter] Found 7TV elements:', seventvElements.length, Array.from(seventvElements).map(el => el.className));
        
        try {
            const iconsDiv = chatLine.querySelector(this.selectors.iconsContainer);
            console.log('[TwitchAdapter] iconsDiv found:', !!iconsDiv, iconsDiv);
            if (!iconsDiv || iconsDiv.querySelector('#plus2-highlight-button')) {
                console.log('[TwitchAdapter] Skipping highlight button - iconsDiv missing or button already exists');
                return;
            }
            
            console.log('[TwitchAdapter] Creating highlight button...');

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
            console.log('[TwitchAdapter] Highlight button successfully added!');
        } catch (error) {
            console.error('[TwitchAdapter] Error adding highlight button:', error);
            if (!error.message.includes("Extension context invalidated")) {
            }
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TwitchAdapter = TwitchAdapter;
}