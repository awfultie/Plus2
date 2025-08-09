(function() {
    // --- Local State for Content Script ---
    let settings = {};
    let processedMessageIDs = new Set();
    let processedMessageElements = new WeakSet();
    let messageObserver = null; // Holds the observer for new messages in chat
    let isObserverActive = false; // Tracks if the messageObserver is running
    let siteObserver = null; // The main observer for the entire page
    let observedChatContainer = null; // Reference to the currently observed chat container

    // --- Custom Menu State ---
    let customPopupMenu = null;
    let replyTooltipElement = null;
    let isPoppedIn = false;
    let poppedInContainer = null;
    let dockedWrapperElement = null;

    // --- Search Feature State ---
    let searchBarContainer, searchInput, searchCloseButton;
    let isSearchActive = false;
    let prunedMessageCache = [];
    let prunedMessageCacheData = [];
    let searchDebounceTimer = null;

    // --- Auto-Resume Scroll State ---
    let inactivityTimerId = null;
    const CHAT_PAUSED_FOOTER_SELECTOR = 'div.chat-paused-footer';
    const SEVENTV_BUFFER_NOTICE_SELECTOR = 'div.seventv-message-buffer-notice';
    let stylesInjected = false;

    // --- Selectors (determined after loading settings) ---
    let PLATFORM = 'twitch'; // Default to twitch
    let CHAT_MESSAGE_SELECTOR;
    let MESSAGE_CONTENT_SELECTOR;
    let ICONS_CONTAINER_SELECTOR;
    let CHAT_SCROLLABLE_AREA_SELECTOR;
    let CHAT_IMAGE_SELECTOR;

    // YouTube Specific Selectors
    const YT_CHAT_MESSAGE_SELECTOR = 'yt-live-chat-text-message-renderer';
    const YT_MESSAGE_CONTAINER_ID = 'items'; // The direct parent of messages
    const YT_AUTHOR_NAME_SELECTOR = '#author-name';
    const YT_MESSAGE_CONTENT_SELECTOR = '#message';
    const YT_AUTHOR_PHOTO_SELECTOR = '#author-photo img';
    const YT_HIGHLIGHT_BUTTON_INJECTION_SELECTOR = '#menu';

    // --- Helper Functions ---

    // Extracts all necessary HTML parts from a chat line for the background script to rebuild.
    function extractMessageParts(chatLine) {
        if (PLATFORM === 'twitch') {
            if (settings.enable7TVCompat) { // 7TV takes precedence
                // --- 7TV Logic ---
                const messageDiv = chatLine.querySelector('.seventv-user-message');
                if (!messageDiv) return null;

                const usernameElement = messageDiv.querySelector('.seventv-chat-user-username');
                const username = usernameElement ? usernameElement.textContent.trim() : null;
                const usernameHTML = usernameElement ? usernameElement.outerHTML : '';

                const badgesHTML = Array.from(messageDiv.querySelectorAll('.seventv-chat-badge'))
                    .map(badge => badge.outerHTML)
                    .join('');

                const messageBodyElement = messageDiv.querySelector('.seventv-chat-message-body');
                
                // Pre-process 7TV emotes to handle protocol-relative URLs and lazy-loading.
                if (messageBodyElement) {
                    const emoteImages = messageBodyElement.querySelectorAll('img.seventv-chat-emote');
                    emoteImages.forEach(img => {
                        // 1. Fix protocol-relative URLs in srcset
                        if (img.hasAttribute('srcset')) {
                            const updatedSrcset = img.getAttribute('srcset')
                                .split(',')
                                .map(s => s.trim().startsWith('//') ? 'https:' + s.trim() : s.trim())
                                .join(', ');
                            img.setAttribute('srcset', updatedSrcset);
                        }

                        // 2. Fix protocol-relative URL in src
                        if (img.src && img.src.startsWith('//')) {
                            img.src = 'https:' + img.src;
                        }

                        // 3. Handle lazy-loading: if src is still missing, derive it from the now-fixed srcset.
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

            } else if (settings.enableFrankerFaceZCompat) { // FFZ is next
                // --- FFZ Logic ---
                const usernameElement = chatLine.querySelector('span.chat-line__username');
                // FFZ wraps the display name in another span
                const username = usernameElement ? usernameElement.querySelector('span.chat-author__display-name')?.textContent.trim() : null;
                const usernameHTML = usernameElement ? usernameElement.outerHTML : '';

                const badgesHTML = Array.from(chatLine.querySelectorAll('.ffz-badge'))
                    .map(badge => badge.outerHTML)
                    .join('');

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

            } else { // --- Standard Twitch Logic ---
                const usernameElement = chatLine.querySelector('[data-a-target="chat-message-username"]');
                const username = usernameElement ? usernameElement.textContent.trim() : null;
                const usernameHTML = usernameElement ? usernameElement.outerHTML : '';

                const badgesHTML = Array.from(chatLine.querySelectorAll('span.chat-badge, button[data-a-target="chat-badge"]'))
                    .map(badge => badge.outerHTML)
                    .join('');

                const messageBodyElement = chatLine.querySelector('span[data-a-target="chat-line-message-body"]');
                const messageBodyHTML = messageBodyElement ? messageBodyElement.innerHTML : '';

                let replyHTML = '';
                // The class 'chat-line__message-reply' can be unreliable.
                // Instead, find the reply paragraph by its text content.
                const allParagraphs = chatLine.querySelectorAll('p');
                let replyElement = null;
                for (const p of allParagraphs) {
                    if (p.textContent.trim().startsWith('Replying to ')) {
                        replyElement = p;
                        break; // Found it, no need to continue looping
                    }
                }
                if (replyElement) replyHTML = replyElement.outerHTML;

                return { badgesHTML, usernameHTML, messageBodyHTML, replyHTML, username, channelUrl: window.location.href };
            }
        } else { // YouTube Logic
            const usernameElement = chatLine.querySelector(YT_AUTHOR_NAME_SELECTOR);
            const messageBodyElement = chatLine.querySelector(YT_MESSAGE_CONTENT_SELECTOR);
            const authorPhotoElement = chatLine.querySelector(YT_AUTHOR_PHOTO_SELECTOR);

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
    }

    function injectHoverStyles() {
        if (stylesInjected) return;
        const style = document.createElement('style');
        style.id = 'plus2-hover-styles';
        style.textContent = `
            .plus2-highlight-button {
                visibility: hidden;
                opacity: 0;
                transition: opacity 0.1s ease-in-out, visibility 0.1s ease-in-out;
            }
            /* When hovering over the message line, make our button visible */
            .chat-line__message:hover .plus2-highlight-button,
            .seventv-chat-message-container:hover .plus2-highlight-button,
            yt-live-chat-text-message-renderer:hover .plus2-highlight-button {
                visibility: visible;
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
        stylesInjected = true;
    }

    // --- UI Interaction ---

    // Attach the button to each line
    function addHighlightButton(chatLine) {
        try {
            const iconsDiv = chatLine.querySelector(ICONS_CONTAINER_SELECTOR);
            if (!iconsDiv || iconsDiv.querySelector('#plus2-highlight-button')) return; // Already has a button

            if (PLATFORM === 'twitch') {
                const img = document.createElement('img');
                img.src = browser.runtime.getURL('icons/Plus2_128.png');
                img.style.width = '24px';
                img.style.height = '24px';
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
                    const messageParts = extractMessageParts(chatLine);
                    if (messageParts && browser.runtime?.id) {
                        browser.runtime.sendMessage({ type: 'HIGHLIGHT_MESSAGE_REQUEST', data: messageParts })
                            .catch(e => { /* Silently ignore "context invalidated" or "receiving end does not exist" errors */ });
                    }
                });
                iconsDiv.insertBefore(highlightButton, iconsDiv.firstChild);
            } else { // YouTube Logic - Clone native button
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
                const img = document.createElement('img');
                img.src = browser.runtime.getURL('icons/Plus2_128.png');
                img.style.width = '20px';
                img.style.height = '20px';

                // Add the icon to the button, and the button to the wrapper
                innerButton.appendChild(img);
                highlightButton.appendChild(innerButton);
                innerButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const messageParts = extractMessageParts(chatLine);
                    if (messageParts && browser.runtime?.id) {
                        browser.runtime.sendMessage({ type: 'HIGHLIGHT_MESSAGE_REQUEST', data: messageParts })
                            .catch(e => { /* Silently ignore "context invalidated" or "receiving end does not exist" errors */ });
                    }
                });
                iconsDiv.insertBefore(highlightButton, existingMenuButton);
            }
        } catch (error) {
            if (error.message.includes("Extension context invalidated")) {
                // This is an expected error during development, so we can ignore it.
            } else {
                // Log other unexpected errors.
                console.error("[Plus2] Error in addHighlightButton:", error);
            }
        }
    }

    // --- Reply Tooltip Logic ---

    function hideReplyTooltip() {
        if (replyTooltipElement) {
            replyTooltipElement.remove();
            replyTooltipElement = null;
        }
    }

    function showReplyTooltip(chatLineHoverTarget, event) {
        // Add a guard to ensure the target element still exists and the feature is enabled.
        if (!chatLineHoverTarget || !settings.enableReplyTooltip) return;

        hideReplyTooltip(); // Hide any existing tooltip first

        let replyElement = null;
        if (PLATFORM === 'twitch') {
            if (settings.enable7TVCompat) {
                replyElement = chatLineHoverTarget.querySelector('div.seventv-reply-message-part');
            } else {
                const allParagraphs = chatLineHoverTarget.querySelectorAll('p');
                for (const p of allParagraphs) {
                    if (p.textContent.trim().startsWith('Replying to ')) {
                        replyElement = p;
                        break;
                    }
                }
            }
        }
        // Note: YouTube reply tooltips are not yet supported.

        if (replyElement) {
            let replyText = '';
            if (settings.enable7TVCompat) {
                const replyBody = replyElement.querySelector('.seventv-chat-message-body');
                if (replyBody) replyText = replyBody.textContent.trim();
            } else {
                // For standard Twitch, the <p> contains "Replying to @user message text".
                // We extract the message part by removing the "Replying to @user" prefix.
                const userLink = replyElement.querySelector('a');
                if (userLink) {
                    const fullText = replyElement.textContent.trim();
                    const prefix = `Replying to ${userLink.textContent.trim()}`;
                    replyText = fullText.substring(prefix.length).trim();
                } else {
                    replyText = replyElement.textContent.trim(); // Fallback
                }
            }

            if (!replyText) return; // Don't show an empty tooltip

            replyTooltipElement = document.createElement('div');
            replyTooltipElement.id = 'plus2-reply-tooltip';
            replyTooltipElement.textContent = replyText;

            // Get the dimensions of the message being hovered
            const rect = chatLineHoverTarget.getBoundingClientRect();

            Object.assign(replyTooltipElement.style, {
                position: 'fixed',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '4px',
                zIndex: '10001', // Above other UI
                pointerEvents: 'none', // So it doesn't interfere with mouse events
                fontSize: '13px',
                lineHeight: '1.4',
                boxSizing: 'border-box',
                textAlign: 'center',
                transition: 'opacity 0.1s ease-in-out, transform 0.1s ease-in-out',
                opacity: '0', // Start transparent for fade-in effect

                // Set width to match the hovered message
                width: `${rect.width}px`,

                // Align horizontally with the hovered message
                left: `${rect.left}px`,

                // Position above the hovered message
                top: `${rect.top}px`,

                // Use transform to position vertically
                // This moves the tooltip up by its own height plus a 5px gap.
                transform: 'translateY(calc(-100% - 5px))'
            });

            document.body.appendChild(replyTooltipElement);

            // We use a small timeout to allow the browser to calculate the initial position.
            setTimeout(() => {
                const tooltipRect = replyTooltipElement.getBoundingClientRect();
                if (tooltipRect.top < 5) { // Check if it's too close to the top edge
                    // If so, reposition it below the message instead.
                    replyTooltipElement.style.top = `${rect.bottom}px`;
                    replyTooltipElement.style.transform = 'translateY(5px)'; // 5px gap below
                }
                // Fade the tooltip in
                replyTooltipElement.style.opacity = '1';
            }, 0);
        }
    }

    // Add listener so the button gets created as you mouse over a message.
    function addHoverListeners(chatLineHoverTarget) {
        // The mouseenter listener is now only for the tooltip.
        chatLineHoverTarget.addEventListener('mouseenter', (event) => showReplyTooltip(chatLineHoverTarget, event));
        chatLineHoverTarget.addEventListener('mouseleave', hideReplyTooltip);
    }

    // --- Search Feature Logic ---

    function createSearchBar() {
        searchBarContainer = document.createElement('div');
        searchBarContainer.id = 'plus2SearchContainer';
        Object.assign(searchBarContainer.style, {
            display: 'none', position: 'fixed', top: '10px', right: '10px', zIndex: '9999',
            backgroundColor: '#2a2a2d', padding: '8px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            alignItems: 'center'
        });

        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search chat...';
        Object.assign(searchInput.style, {
            border: '1px solid #555', backgroundColor: '#1e1e21', color: '#efeff1',
            padding: '5px', borderRadius: '3px', marginRight: '5px'
        });

        searchCloseButton = document.createElement('button');
        searchCloseButton.textContent = '✕';
        Object.assign(searchCloseButton.style, {
            border: 'none', backgroundColor: 'transparent', color: '#efeff1',
            cursor: 'pointer', fontSize: '16px', padding: '0 5px'
        });

        searchBarContainer.append(searchInput, searchCloseButton);
        document.body.appendChild(searchBarContainer);

        setupSearchListeners();
    }

    function setupSearchListeners() {
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                showSearchBar();
            }
            if (e.key === 'Escape' && isSearchActive) {
                hideSearchBar();
            }
        });

        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                filterChatMessages(searchInput.value);
            }, 300);
        });

        searchCloseButton.addEventListener('click', hideSearchBar);
    }

    function showSearchBar() {
        searchBarContainer.style.display = 'flex';
        searchInput.focus();
        isSearchActive = true;
    }

    function hideSearchBar() {
        searchBarContainer.style.display = 'none';
        searchInput.value = '';
        filterChatMessages(''); // Clear filter
        isSearchActive = false;
    }

    function cachePrunedMessage(node) {
        if (prunedMessageCache.length >= settings.maxPrunedCacheSize) {
            prunedMessageCache.shift();
            prunedMessageCacheData.shift();
        }
        prunedMessageCache.push(node);

        const usernameSelector = settings.enable7TVCompat ? '.seventv-chat-user-username' : '[data-a-target="chat-message-username"]';
        const usernameElement = node.querySelector(usernameSelector);
        const messageContentElement = node.querySelector(MESSAGE_CONTENT_SELECTOR);
        const usernameText = usernameElement ? usernameElement.textContent.toLowerCase() : '';
        const messageText = messageContentElement ? messageContentElement.textContent.toLowerCase() : '';

        prunedMessageCacheData.push({ username: usernameText, message: messageText });
    }

    function filterChatMessages(query) {
        const lowerCaseQuery = query.toLowerCase().trim();
        const chatContainer = document.querySelector(CHAT_SCROLLABLE_AREA_SELECTOR);
        if (!chatContainer) return;

        // Clean up previously re-added messages from the DOM
        chatContainer.querySelectorAll('[data-plus2-readded]').forEach(node => node.remove());

        // If search is cleared, just show all original messages
        if (!lowerCaseQuery) {
            chatContainer.querySelectorAll(`${CHAT_SCROLLABLE_AREA_SELECTOR} > div`).forEach(msg => {
                msg.style.display = '';
            });
            return;
        }

        // Filter live messages
        chatContainer.querySelectorAll(`${CHAT_SCROLLABLE_AREA_SELECTOR} > div`).forEach(wrapper => {
            const usernameSelector = settings.enable7TVCompat ? '.seventv-chat-user-username' : '[data-a-target="chat-message-username"]';
            const usernameElement = wrapper.querySelector(usernameSelector);
            const messageContentElement = wrapper.querySelector(MESSAGE_CONTENT_SELECTOR);
            const usernameText = usernameElement ? usernameElement.textContent.toLowerCase() : '';
            const messageText = messageContentElement ? messageContentElement.textContent.toLowerCase() : '';

            wrapper.style.display = (usernameText.includes(lowerCaseQuery) || messageText.includes(lowerCaseQuery)) ? '' : 'none';
        });

        // Search through the pruned cache and re-add matches
        const matchingCachedNodes = [];
        prunedMessageCacheData.forEach((data, index) => {
            if (data.username.includes(lowerCaseQuery) || data.message.includes(lowerCaseQuery)) {
                const originalNode = prunedMessageCache[index];
                if (originalNode) {
                    const clonedNode = originalNode.cloneNode(true);
                    clonedNode.setAttribute('data-plus2-readded', 'true');
                    clonedNode.style.display = '';
                    matchingCachedNodes.push(clonedNode);
                }
            }
        });

        // Insert matches at the top of the chat, oldest first
        matchingCachedNodes.forEach(node => {
            chatContainer.insertBefore(node, chatContainer.firstChild);
        });
    }

    // --- Auto-Resume Scroll Logic ---

    function setupResizeListeners(container, handle) {
        let initialHeight, initialMouseY;
        const iframe = container ? container.querySelector('iframe') : null;
    
        function handleDrag(e) {
            if (!container) return;
            // Prevent text selection and other default actions during drag
            e.preventDefault();
            const deltaY = e.clientY - initialMouseY;
            // Set a minimum height of 50px to prevent it from becoming unusable
            const newHeight = Math.max(50, initialHeight + deltaY);
            container.style.height = `${newHeight}px`;
        }
    
        function stopDrag() {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', stopDrag);
            document.body.style.userSelect = ''; // Re-enable text selection
            if (iframe) {
                iframe.style.pointerEvents = 'auto'; // Re-enable mouse events on the iframe
            }
    
            // Save the new height to settings for persistence
            if (container && browser.runtime?.id) {
                const finalHeight = parseInt(container.style.height, 10);
                browser.storage.sync.set({ dockedViewHeight: finalHeight });
            }
        }
    
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            initialHeight = container.offsetHeight;
            initialMouseY = e.clientY;
            document.body.style.userSelect = 'none'; // Prevent text selection during drag
            if (iframe) {
                iframe.style.pointerEvents = 'none'; // Disable mouse events on the iframe during drag
            }
    
            window.addEventListener('mousemove', handleDrag);
            window.addEventListener('mouseup', stopDrag);
        });
    }

    function setupInactivityResumer() {
        if (settings.inactivityTimeoutDuration > 0) {
            window.addEventListener('mousemove', resetInactivityTimer, { passive: true });
            window.addEventListener('mousedown', resetInactivityTimer, { passive: true });
            window.addEventListener('keydown', resetInactivityTimer, { passive: true });
            window.addEventListener('scroll', resetInactivityTimer, { passive: true });
            resetInactivityTimer(); // Start the timer initially
        }
    }

    function resetInactivityTimer() {
        if (inactivityTimerId) clearTimeout(inactivityTimerId);
        inactivityTimerId = setTimeout(() => {
            const resumeButton = document.querySelector(CHAT_PAUSED_FOOTER_SELECTOR);
            const seventvNotice = document.querySelector(SEVENTV_BUFFER_NOTICE_SELECTOR);

            if (resumeButton) {
                resumeButton.querySelector('button')?.click();
            } else if (seventvNotice) {
                seventvNotice.click();
            }
        }, settings.inactivityTimeoutDuration);
    }

    // --- Custom Popup Menu for In-Chat Button ---

function getPopInInjectionTarget() {
    if (PLATFORM === 'twitch') {
        // This is a stable element that contains the chat header, scrollable area, and input.
        return document.querySelector('.chat-room__content');
    } else { // YouTube
        // This element contains the header, message list, and input field.
        return document.querySelector('yt-live-chat-renderer');
    }
}

function popInView() {
    const injectionTarget = getPopInInjectionTarget();
    if (!injectionTarget || document.getElementById('plus2-docked-wrapper')) return;

    // Create a main wrapper for the docked view and its handle
    dockedWrapperElement = document.createElement('div');
    dockedWrapperElement.id = 'plus2-docked-wrapper';
    Object.assign(dockedWrapperElement.style, {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flexShrink: '0',
        marginBottom: '10px'
    });

    // This container holds the iframe and is the element that gets resized
    poppedInContainer = document.createElement('div');
    poppedInContainer.id = 'plus2-popped-in-container';
    Object.assign(poppedInContainer.style, {
        width: '100%',
        height: `${settings.dockedViewHeight || 250}px`,
        border: '1px solid #444',
        boxSizing: 'border-box',
        overflow: 'hidden'
    });

    const iframe = document.createElement('iframe');
    if (browser.runtime?.id) {
        iframe.src = browser.runtime.getURL('ui/popout.html');
    }
    Object.assign(iframe.style, {
        width: '100%',
        height: '100%',
        border: 'none'
    });

    // Create the resize handle as a sibling, outside the resizable container
    const resizeHandle = document.createElement('div');
    resizeHandle.id = 'plus2-resize-handle';
    Object.assign(resizeHandle.style, {
        width: '100%',
        height: '5px',
        marginTop: '2px', // Small gap between the container and the handle
        cursor: 'ns-resize',
        backgroundColor: '#555',
        opacity: '0',
        transition: 'opacity 0.2s ease-in-out'
    });

    poppedInContainer.appendChild(iframe);
    dockedWrapperElement.appendChild(poppedInContainer);
    dockedWrapperElement.appendChild(resizeHandle);

    // Show/hide handle on hover of the entire wrapper
    dockedWrapperElement.addEventListener('mouseenter', () => {
        resizeHandle.style.opacity = '1';
    });
    dockedWrapperElement.addEventListener('mouseleave', () => {
        resizeHandle.style.opacity = '0';
    });

    // Attach the drag-to-resize logic
    setupResizeListeners(poppedInContainer, resizeHandle);

    // Inject the wrapper at the very top of the chat container.
    injectionTarget.insertBefore(dockedWrapperElement, injectionTarget.firstChild);
    isPoppedIn = true;
}

function popOutView() {
    if (dockedWrapperElement) {
        dockedWrapperElement.remove();
        dockedWrapperElement = null;
        poppedInContainer = null;
    }
    isPoppedIn = false;
}

function togglePoppedInView() {
    if (isPoppedIn) {
        popOutView();
    } else {
        popInView();
    }
}

    function closeCustomMenu() {
        if (customPopupMenu) {
            customPopupMenu.remove();
            customPopupMenu = null;
            window.removeEventListener('click', closeCustomMenuOnClickOutside);
        }
    }

    function closeCustomMenuOnClickOutside(event) {
        // Close if the click is outside the menu and not on the button that opens it
        const popoutButton = document.getElementById('plus2-popout-button');
        if (customPopupMenu && !customPopupMenu.contains(event.target) && !popoutButton?.contains(event.target)) {
            closeCustomMenu();
        }
    }

    function toggleCustomMenu(buttonElement) {
        if (customPopupMenu) {
            closeCustomMenu();
        } else {
            createCustomMenu(buttonElement);
        }
    }

    function createCustomMenu(buttonElement) {
        closeCustomMenu(); // Ensure no old menu exists

        const menuWidth = 180; // Define menu width as a constant
        customPopupMenu = document.createElement('div');
        Object.assign(customPopupMenu.style, {
            position: 'absolute',
            backgroundColor: '#1e1e21',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '5px',
            zIndex: '10000',
            width: `${menuWidth}px`
        });

        const rect = buttonElement.getBoundingClientRect();

        // --- Vertical Positioning ---
        // If the button is in the top half of the screen, open the menu downwards. Otherwise, open upwards.
        if (rect.top < window.innerHeight / 2) {
            customPopupMenu.style.top = `${rect.bottom + 2}px`;
        } else {
            customPopupMenu.style.bottom = `${window.innerHeight - rect.top + 2}px`;
        }

        // --- Horizontal Positioning ---
        // Check if the menu would go off the right side of the screen and adjust if needed.
        const calculatedLeft = (rect.left + menuWidth > window.innerWidth) ? (rect.right - menuWidth) : rect.left;
        customPopupMenu.style.left = `${Math.max(0, calculatedLeft)}px`; // Use Math.max to ensure it never goes off the left edge.

        const menuItems = [
            { id: 'menu-open-popout', text: 'Open Popout', action: () => browser.runtime.sendMessage({ type: 'OPEN_POPOUT_WINDOW' }).catch(e => {}) },
        { id: 'menu-toggle-popin', text: isPoppedIn ? 'Undock View' : 'Dock View Here', action: togglePoppedInView },
            { id: 'menu-copy-url', text: 'Copy Popout URL', action: (btn) => {
                const popoutUrl = browser.runtime.getURL('ui/popout.html');
                navigator.clipboard.writeText(popoutUrl).then(() => {
                    const originalText = btn.textContent;
                    btn.textContent = 'Copied!';
                    setTimeout(() => { btn.textContent = originalText; }, 1500);
                });
            }},
            { id: 'menu-toggle-leaderboard', text: 'Toggle Leaderboard', action: () => browser.runtime.sendMessage({ type: 'TOGGLE_LEADERBOARD_MODE' }).catch(e => {}), requires: ['enableHighlightTracking', 'enableLeaderboard'] },
            { id: 'menu-open-options', text: 'Options', action: () => browser.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' }).catch(e => {}) }
        ];

        browser.storage.sync.get(['enableHighlightTracking', 'enableLeaderboard']).then((items) => {
            menuItems.forEach(itemData => {
                const shouldShow = !itemData.requires || itemData.requires.every(req => items[req]);

                if (shouldShow) {
                    const button = document.createElement('button');
                    button.textContent = itemData.text;
                    Object.assign(button.style, {
                        display: 'block', width: '100%', padding: '8px', border: 'none',
                        backgroundColor: 'transparent', color: '#efeff1', textAlign: 'left', cursor: 'pointer'
                    });
                    button.onmouseenter = () => button.style.backgroundColor = '#3a3a3d';
                    button.onmouseleave = () => button.style.backgroundColor = 'transparent';

                    button.addEventListener('click', () => {
                        if (browser.runtime?.id) itemData.action(button);
                        closeCustomMenu();
                    });
                    customPopupMenu.appendChild(button);
                }
            });
        });

        document.body.appendChild(customPopupMenu);
        setTimeout(() => window.addEventListener('click', closeCustomMenuOnClickOutside), 0);
    }

    // --- Popout Button Injection ---

    function injectPopoutButtonIntoYouTubeHeader() {
        // Find the main header component. The buttons are direct children (in the light DOM).
        const headerRenderer = document.querySelector('yt-live-chat-header-renderer');
        if (!headerRenderer) return;

        // The "More options" button is our reference point for injection.
        const moreOptionsMenuButton = headerRenderer.querySelector('#live-chat-header-context-menu');
        // The container is the header renderer itself.
        const container = headerRenderer;

        if (!container || container.querySelector('#plus2-header-menu-button')) {
            return; // Container not found or button already exists
        }

        // Create a new <yt-icon-button> wrapper, which is what YouTube uses for header buttons.
        const popoutButton = document.createElement('yt-icon-button');
        popoutButton.id = 'plus2-header-menu-button';
        popoutButton.className = 'style-scope yt-live-chat-header-renderer'; // Use a class from the header for consistency

        // Create the inner <button> that YouTube expects
        const innerButton = document.createElement('button');
        innerButton.id = 'button';
        innerButton.className = 'style-scope yt-icon-button';
        innerButton.setAttribute('aria-label', 'Plus 2 Menu');

        // Create our custom icon
        const img = document.createElement('img');
        if (browser.runtime?.id) img.src = browser.runtime.getURL('icons/Plus2_128.png');
        img.style.width = '24px';
        img.style.height = '24px';

        // Add the icon to the button, and the button to the wrapper
        innerButton.appendChild(img);
        popoutButton.appendChild(innerButton);

        // Add the click listener to toggle the custom menu
        popoutButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent any other listeners from firing
            toggleCustomMenu(popoutButton); // Pass the button element to position the menu
        });

        // Add the button to the header menu container
        // Insert our new button before the "More options" button.
        container.insertBefore(popoutButton, moreOptionsMenuButton);
    }

    function injectPopoutButtonIntoChatInput() {
        const container = document.querySelector('[data-test-selector="chat-input-buttons-container"]');
        if (!container || container.querySelector('#plus2-popout-button')) {
            return; // Container not found or button already exists
        }

        // Create the button element
        const popoutButton = document.createElement('button');
        popoutButton.id = 'plus2-popout-button';
        // Use Twitch's classes for styling consistency
        popoutButton.className = 'tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon tw-core-button tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative';
        popoutButton.setAttribute('aria-label', 'Open Plus 2 Popout');
        popoutButton.setAttribute('data-test-selector', 'plus2-popout-button');

        // Create the icon
        const iconWrapper = document.createElement('span');
        iconWrapper.className = 'tw-button-icon__icon';
        const icon = document.createElement('img');
        if (browser.runtime?.id) icon.src = browser.runtime.getURL('icons/Plus2_128.png');
        icon.style.width = '20px';
        icon.style.height = '20px';

        iconWrapper.appendChild(icon);
        popoutButton.appendChild(iconWrapper);

        popoutButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the window click listener from firing immediately
            toggleCustomMenu(popoutButton);
        });

        // Insert the button in the middle of the existing buttons
        const children = container.children;
        const middleIndex = Math.floor(children.length / 2);
        container.insertBefore(popoutButton, children[middleIndex]);
    }

    function setupPopoutButtonInjector() {
        const observer = new MutationObserver(() => {
            if (PLATFORM === 'twitch') {
                injectPopoutButtonIntoChatInput();
            } else {
                injectPopoutButtonIntoYouTubeHeader();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- Options Button Injection ---

    function injectOptionsButtonIntoMenu(injectionTarget) {
        // This function is generic enough to work for both platforms if the target is correct.
        // Check if our button is already there to prevent duplicates
        if (injectionTarget.querySelector('#plus2-options-button')) {
            return;
        }

        // Create a wrapper div that mimics Twitch's menu item structure
        const menuItem = document.createElement('div');
        menuItem.className = 'tw-pd-y-05'; // Standard vertical padding for menu items

        // Create the button itself
        const button = document.createElement('button');
        button.id = 'plus2-options-button';
        button.textContent = 'Plus 2 Options';
        // Use Twitch's classes to make it look native
        button.className = 'tw-interactive tw-full-width tw-pd-x-1 tw-pd-y-05 tw-relative tw-rounded';

        // Add the action to open the options page
        button.addEventListener('click', (e) => {
            e.preventDefault();
            // Content scripts cannot directly open the options page.
            // We must send a message to the background script to do it for us.
            if (browser.runtime?.id) {
                browser.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' }).catch(e => { /* Silently ignore */ });
            }
        });

        menuItem.appendChild(button);

        // Add a separator line above our button
        const separator = document.createElement('div');
        separator.className = 'tw-border-t tw-mg-y-05';

        // Append the separator and the new menu item to the settings menu
        injectionTarget.appendChild(separator);
        injectionTarget.appendChild(menuItem);
    }

    function setupOptionsButtonInjector() {
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (PLATFORM === 'twitch') {
                    // Find the scrollable area's content div inside the chat settings popover menu.
                    // This is the correct parent for the menu's buttons.
                    const injectionTarget = document.querySelector('.chat-settings__popover .scrollable-area .simplebar-content');
                    if (injectionTarget) {
                        injectOptionsButtonIntoMenu(injectionTarget);
                    }
                } else { // YouTube Logic
                    // TODO: Add logic to find YouTube's settings menu once selector is provided.
                    // const injectionTarget = document.querySelector(YT_SETTINGS_MENU_SELECTOR);
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- Core Logic: Observe and Send ---

    function processExistingMessages(chatContainer) {
        if (!chatContainer) return;
    
        if (PLATFORM === 'twitch') {
            if (settings.enable7TVCompat) {
                const seventvMessages = chatContainer.querySelectorAll('.seventv-message');
                seventvMessages.forEach(seventvMessageRoot => {
                    const hoverTarget = seventvMessageRoot.querySelector('.seventv-chat-message-container');
                    const chatMessageElement = seventvMessageRoot.querySelector(CHAT_MESSAGE_SELECTOR);
                    if (hoverTarget && chatMessageElement && !processedMessageElements.has(chatMessageElement)) {
                        addHighlightButton(hoverTarget); // Add button permanently
                        addHoverListeners(hoverTarget);
                        const messageId = chatMessageElement.getAttribute('msg-id');
                        if (messageId && !processedMessageIDs.has(messageId)) {
                            processNewMessage(hoverTarget, chatMessageElement, messageId);
                        }
                    }
                });
            } else {
                // Standard Twitch: .chat-scrollable-area__message-container contains message divs
                const twitchMessages = chatContainer.querySelectorAll(':scope > div');
                twitchMessages.forEach(twitchMessageLine => {
                    const chatMessageElement = twitchMessageLine.querySelector(CHAT_MESSAGE_SELECTOR);
                    if (chatMessageElement && !processedMessageElements.has(chatMessageElement)) {
                        addHighlightButton(twitchMessageLine); // Add button permanently
                        addHoverListeners(twitchMessageLine);
                        if (!processedMessageElements.has(chatMessageElement)) {
                            processNewMessage(twitchMessageLine, chatMessageElement, chatMessageElement);
                        }
                    }
                });
            }
        } else { // YouTube Logic
            // YouTube: #items container has yt-live-chat-text-message-renderer children
            const ytMessages = chatContainer.querySelectorAll(YT_CHAT_MESSAGE_SELECTOR);
            ytMessages.forEach(messageNode => {
                addHighlightButton(messageNode); // Add button permanently
                addHoverListeners(messageNode);
                if (!processedMessageElements.has(messageNode)) {
                    processNewMessage(messageNode, messageNode, messageNode);
                }
            });
        }
    }

    function processNewMessage(hoverTargetElement, chatMessageElementForContent, itemToMarkAsProcessed) {
        try {
            // 1. Send message data to background for counting/polling
            // This part is platform-agnostic as long as the selectors are right
            const messageContentContainer = chatMessageElementForContent.querySelector(MESSAGE_CONTENT_SELECTOR);
            if (messageContentContainer) {
                const text = (messageContentContainer.textContent || "").trim();
                const images = Array.from(messageContentContainer.querySelectorAll(CHAT_IMAGE_SELECTOR)).map(img => img.alt);
                if (browser.runtime?.id) {
                    // Check browser.runtime.id to ensure the context is still valid
                    browser.runtime.sendMessage({
                        type: 'CHAT_MESSAGE_FOUND',
                        data: { text, images }
                    }).catch(e => { /* Silently ignore */ });
                }
            }

            // 2. Handle Mod "post" command highlighting
            if (PLATFORM === 'twitch') {
                if (settings.enableModPostReplyHighlight) {
                    const modBadge = hoverTargetElement.querySelector('img.chat-badge[alt="Moderator"], img.chat-badge[alt="Broadcaster"], div.seventv-chat-badge img[alt="Moderator"], div.seventv-chat-badge img[alt="Broadcaster"]');
                    const messageBody = chatMessageElementForContent.querySelector(MESSAGE_CONTENT_SELECTOR);

                    if (modBadge && messageBody && /\bpost\b/i.test(messageBody.textContent)) {
                        let replyElement = null;
                        if (settings.enable7TVCompat) {
                            // For 7TV, the reply part is a sibling to the main message,
                            // so we must search from the shared parent container (hoverTargetElement).
                            replyElement = hoverTargetElement.querySelector('div.seventv-reply-message-part');
                        } else {
                            // For standard Twitch, the reply <p> is a sibling to the main message container,
                            // so we search from the top-level hover target using the text content.
                            const allParagraphs = hoverTargetElement.querySelectorAll('p');
                            for (const p of allParagraphs) {
                                if (p.textContent.trim().startsWith('Replying to ')) {
                                    replyElement = p;
                                    break;
                                }
                            }
                        }

                        if (replyElement) {
                            if (browser.runtime?.id) {
                                browser.runtime.sendMessage({
                                    type: 'CHAT_MESSAGE_FOUND',
                                    data: { isModPost: true, modReplyContent: replyElement.innerHTML }
                                }).catch(e => { /* Silently ignore */ });
                            }
                        }
                    }
                }
            }

            // 3. Mark as processed to prevent duplicates
            if (itemToMarkAsProcessed) {
                if (PLATFORM === 'twitch' && settings.enable7TVCompat && typeof itemToMarkAsProcessed === 'string') {
                    processedMessageIDs.add(itemToMarkAsProcessed);
                } else if (typeof itemToMarkAsProcessed === 'object') { // Covers non-7TV Twitch and YouTube
                    processedMessageElements.add(itemToMarkAsProcessed);
                }
            }
        } catch (error) {
            if (!error.message.includes("Extension context invalidated")) {
                console.error("[Plus2] Error in processNewMessage:", error);
            }
        }
    }

    function onChatContainerAdded(chatContainer) {
        if (isObserverActive) return;
        console.log("[Plus2] Chat container found. Initializing features.");
        isObserverActive = true;
        observedChatContainer = chatContainer; // Store a reference to the observed element

        // --- Auto-Docking Logic ---
        const isTwitchPopout = PLATFORM === 'twitch' && window.location.pathname.includes('/popout/');
        const isYouTubePopout = PLATFORM === 'youtube' && window.location.pathname.includes('/live_chat');

        if (settings.dockingBehavior === 'twitch' && isTwitchPopout) {
            popInView();
        } else if (settings.dockingBehavior === 'youtube' && isYouTubePopout) {
            popInView();
        }

        // Process any messages that are already there.
        processExistingMessages(chatContainer);

        // Create and start the observer for new messages.
        messageObserver = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type !== 'childList') continue;

                // Handle removed nodes for search cache
                if (PLATFORM === 'twitch') {
                    mutation.removedNodes.forEach(removedNode => {
                        if (removedNode.nodeType !== Node.ELEMENT_NODE) return;
                        const isChatMessage = removedNode.querySelector(CHAT_MESSAGE_SELECTOR) || removedNode.matches('.chat-line__message-container');
                        if (isChatMessage && !removedNode.hasAttribute('data-plus2-readded')) {
                            cachePrunedMessage(removedNode);
                        }
                    });
                }

                mutation.addedNodes.forEach(addedNode => {
                    if (addedNode.nodeType !== Node.ELEMENT_NODE) return;

                    // Check if this is a re-added message from search to prevent re-counting.
                    const isReAdded = addedNode.hasAttribute && addedNode.hasAttribute('data-plus2-readded');

                    let chatMessageElement = null;
                    let hoverTargetElement = null;

                    if (PLATFORM === 'twitch') {
                        if (settings.enable7TVCompat) {
                            let seventvMessageRoot = addedNode.matches('.seventv-message') ? addedNode : addedNode.querySelector('.seventv-message');
                            if (seventvMessageRoot) {
                                chatMessageElement = seventvMessageRoot.querySelector(CHAT_MESSAGE_SELECTOR);
                                hoverTargetElement = seventvMessageRoot.querySelector('.seventv-chat-message-container') || seventvMessageRoot;
                            }
                        } else {
                            chatMessageElement = addedNode.querySelector ? addedNode.querySelector(CHAT_MESSAGE_SELECTOR) : null;
                            if (chatMessageElement) hoverTargetElement = addedNode;
                        }
                    } else { // YouTube
                        if (addedNode.matches && addedNode.matches(YT_CHAT_MESSAGE_SELECTOR)) {
                            chatMessageElement = hoverTargetElement = addedNode;
                        }
                    }

                    if (hoverTargetElement && chatMessageElement) {
                        // Only process the message for counting/polling if it's not a re-added message from search.
                        if (!isReAdded) {
                            if (PLATFORM === 'twitch') {
                                if (settings.enable7TVCompat) {
                                    const messageId = chatMessageElement.getAttribute('msg-id');
                                    if (messageId && !processedMessageIDs.has(messageId)) {
                                        processNewMessage(hoverTargetElement, chatMessageElement, messageId);
                                    }
                                } else {
                                    if (!processedMessageElements.has(chatMessageElement)) {
                                        processNewMessage(hoverTargetElement, chatMessageElement, chatMessageElement);
                                    }
                                }
                            } else {
                                if (!processedMessageElements.has(chatMessageElement)) { // YouTube
                                    processNewMessage(hoverTargetElement, chatMessageElement, chatMessageElement);
                                }
                            }
                        }

                        addHighlightButton(hoverTargetElement);
                        addHoverListeners(hoverTargetElement);

                        // If search is active, filter the new message as it comes in.
                        if (isSearchActive && PLATFORM === 'twitch') {
                            const query = searchInput.value.toLowerCase().trim();
                            if (query) {
                                const usernameSelector = settings.enable7TVCompat ? '.seventv-chat-user-username' : '[data-a-target="chat-message-username"]';
                                const usernameElement = chatMessageElement.querySelector(usernameSelector);
                                const messageContentElement = chatMessageElement.querySelector(MESSAGE_CONTENT_SELECTOR);
                                const usernameText = usernameElement ? usernameElement.textContent.toLowerCase() : '';
                                const messageText = messageContentElement ? messageContentElement.textContent.toLowerCase() : '';

                                if (!(usernameText.includes(query) || messageText.includes(query))) {
                                    hoverTargetElement.style.display = 'none';
                                }
                            }
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

        // Reset state for the next channel
        processedMessageIDs.clear();
        processedMessageElements = new WeakSet(); // WeakSet doesn't have .clear(), so we re-initialize.
        isObserverActive = false;
        observedChatContainer = null; // Clear the reference
        popOutView(); // Also remove the docked view if it exists
    }

    // --- Initialization ---

    function initialize() {
        browser.storage.sync.get([
            'requiredUrlSubstring', 'enable7TVCompat', 'enableModPostReplyHighlight', 'enableReplyTooltip',
            'inactivityTimeoutDuration', 'maxPrunedCacheSize', 'enableYouTube', 'dockingBehavior', 'dockedViewHeight',
            'enableFrankerFaceZCompat'
        ]).then((items) => {
            settings = items;

            // Platform Detection
            if (window.location.hostname.includes('youtube.com')) {
                PLATFORM = 'youtube';
                // If we are on YouTube and it's disabled in settings, stop execution.
                if (!settings.enableYouTube) {
                    console.log('[Plus2] Script disabled on YouTube as per settings.');
                    return;
                }
            } else {
                PLATFORM = 'twitch';
            }

            // Inject the CSS for hover effects once.
            injectHoverStyles();

            // Set platform-specific selectors
            if (PLATFORM === 'youtube') {
                CHAT_MESSAGE_SELECTOR = YT_CHAT_MESSAGE_SELECTOR;
                MESSAGE_CONTENT_SELECTOR = YT_MESSAGE_CONTENT_SELECTOR;
                ICONS_CONTAINER_SELECTOR = YT_HIGHLIGHT_BUTTON_INJECTION_SELECTOR;
                CHAT_SCROLLABLE_AREA_SELECTOR = `#${YT_MESSAGE_CONTAINER_ID}`;
                CHAT_IMAGE_SELECTOR = 'img.yt-live-chat-emoji-renderer'; // Standard YT emoji
            } else { // Twitch
                if (settings.enable7TVCompat) { // 7TV takes precedence
                    CHAT_MESSAGE_SELECTOR = '.seventv-user-message';
                    MESSAGE_CONTENT_SELECTOR = '.seventv-chat-message-body';
                    ICONS_CONTAINER_SELECTOR = '.seventv-chat-message-buttons';
                    CHAT_SCROLLABLE_AREA_SELECTOR = '#seventv-message-container .seventv-chat-list';
                    CHAT_IMAGE_SELECTOR = 'img.seventv-chat-emote';
                } else if (settings.enableFrankerFaceZCompat) {
                    CHAT_MESSAGE_SELECTOR = '.chat-line__message';
                    MESSAGE_CONTENT_SELECTOR = 'span.message'; // FFZ uses a different selector for the message body
                    ICONS_CONTAINER_SELECTOR = 'div.ffz--hover-actions';
                    CHAT_SCROLLABLE_AREA_SELECTOR = '.chat-scrollable-area__message-container';
                    CHAT_IMAGE_SELECTOR = 'img.chat-image, img.ffz-emote'; // Include FFZ emotes
                }
                else { // Standard Twitch
                    CHAT_MESSAGE_SELECTOR = '.chat-line__message';
                    MESSAGE_CONTENT_SELECTOR = 'span[data-a-target="chat-line-message-body"]';
                    ICONS_CONTAINER_SELECTOR = '.chat-line__icons';
                    CHAT_SCROLLABLE_AREA_SELECTOR = '.chat-scrollable-area__message-container';
                    CHAT_IMAGE_SELECTOR = 'img.chat-image';
                }
            }

            // This is the main, persistent observer for the site. It handles SPA navigation.
            if (siteObserver) siteObserver.disconnect(); // Disconnect any old one from a previous run
            siteObserver = new MutationObserver(() => {
                // On any significant DOM change, check if the extension should be active.
                // This handles SPA navigation where the script isn't reloaded.
                if (PLATFORM === 'twitch' && settings.requiredUrlSubstring && !window.location.href.includes(settings.requiredUrlSubstring)) {
                    // If the URL doesn't match the filter, ensure the message observer is off.
                    if (isObserverActive) {
                        onChatContainerRemoved();
                    }
                    return; // Stop further processing.
                }

                // If the URL filter passes (or is not set), look for the chat container.
                const chatContainerSelector = PLATFORM === 'twitch' ? CHAT_SCROLLABLE_AREA_SELECTOR : `#${YT_MESSAGE_CONTAINER_ID}`;
                const currentChatContainer = document.querySelector(chatContainerSelector);

                // Case 1: A chat container exists on the page.
                if (currentChatContainer) {
                    // Subcase 1.1: We are not currently observing anything. This is a fresh start.
                    if (!isObserverActive) {
                        onChatContainerAdded(currentChatContainer);
                    }
                    // Subcase 1.2: We ARE observing, but the container on the page is DIFFERENT from the one we were observing. This is a navigation.
                    else if (isObserverActive && currentChatContainer !== observedChatContainer) {
                        console.log("[Plus2] New chat container detected. Re-initializing.");
                        onChatContainerRemoved(); // Clean up the old one
                        onChatContainerAdded(currentChatContainer); // Start with the new one
                    }
                }
                // Case 2: No chat container exists on the page, but we were observing one. This means we navigated away.
                else if (!currentChatContainer && isObserverActive) {
                    onChatContainerRemoved();
                }
            });
            siteObserver.observe(document.body, { childList: true, subtree: true });

            // Setup additional features
            if (PLATFORM === 'twitch') {
                createSearchBar();
            }
            setupInactivityResumer();
            setupPopoutButtonInjector();
            setupOptionsButtonInjector();
        });
    }

    // This listener acts as a bridge. When the popout is docked as an iframe,
    // it may not receive `runtime.onMessage` events reliably in Firefox.
    // This content script, which is always running on the page, listens for
    // all broadcasted messages and forwards them directly to the iframe it created.
    browser.runtime.onMessage.addListener((message) => {
        // Only forward if the view is actually docked.
        if (isPoppedIn && poppedInContainer) {
            const iframe = poppedInContainer.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
                // Forward the entire message object to the iframe.
                iframe.contentWindow.postMessage(message, '*');
            }
        }
    });

    initialize();

})();
