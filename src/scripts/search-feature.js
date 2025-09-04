// Search feature module for Twitch chat search functionality
class SearchFeature {
    constructor(platformAdapter, settings) {
        this.adapter = platformAdapter;
        this.settings = settings;
        this.searchBarContainer = null;
        this.searchInput = null;
        this.searchCloseButton = null;
        this.isSearchActive = false;
        this.prunedMessageCache = [];
        this.prunedMessageCacheData = [];
        this.searchDebounceTimer = null;
    }

    initialize() {
        // Only initialize search for Twitch
        if (this.adapter.platform === 'twitch') {
            this.createSearchBar();
        }
    }

    createSearchBar() {
        this.searchBarContainer = document.createElement('div');
        this.searchBarContainer.id = 'plus2SearchContainer';
        Object.assign(this.searchBarContainer.style, {
            display: 'none', position: 'fixed', top: '10px', right: '10px', zIndex: '9999',
            backgroundColor: '#2a2a2d', padding: '8px', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            alignItems: 'center'
        });

        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Search chat...';
        Object.assign(this.searchInput.style, {
            border: '1px solid #555', backgroundColor: '#1e1e21', color: '#efeff1',
            padding: '5px', borderRadius: '3px', marginRight: '5px'
        });

        this.searchCloseButton = document.createElement('button');
        this.searchCloseButton.textContent = '✕';
        Object.assign(this.searchCloseButton.style, {
            border: 'none', backgroundColor: 'transparent', color: '#efeff1',
            cursor: 'pointer', fontSize: '16px', padding: '0 5px'
        });

        this.searchBarContainer.append(this.searchInput, this.searchCloseButton);
        document.body.appendChild(this.searchBarContainer);

        this.setupSearchListeners();
    }

    setupSearchListeners() {
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                this.showSearchBar();
            }
            if (e.key === 'Escape' && this.isSearchActive) {
                this.hideSearchBar();
            }
        });

        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = setTimeout(() => {
                this.filterChatMessages(this.searchInput.value);
            }, 300);
        });

        this.searchCloseButton.addEventListener('click', () => this.hideSearchBar());
    }

    showSearchBar() {
        this.searchBarContainer.style.display = 'flex';
        this.searchInput.focus();
        this.isSearchActive = true;
    }

    hideSearchBar() {
        this.searchBarContainer.style.display = 'none';
        this.searchInput.value = '';
        this.filterChatMessages(''); // Clear filter
        this.isSearchActive = false;
    }

    cachePrunedMessage(node) {
        if (this.prunedMessageCache.length >= this.settings.behavior?.maxPrunedCacheSize) {
            this.prunedMessageCache.shift();
            this.prunedMessageCacheData.shift();
        }
        this.prunedMessageCache.push(node);

        const usernameSelector = this.settings.features?.enableSevenTVCompatibility ? '.seventv-chat-user-username' : '[data-a-target="chat-message-username"]';
        const usernameElement = node.querySelector(usernameSelector);
        const messageContentElement = node.querySelector(this.adapter.selectors.messageContent);
        const usernameText = usernameElement ? usernameElement.textContent.toLowerCase() : '';
        const messageText = messageContentElement ? messageContentElement.textContent.toLowerCase() : '';

        this.prunedMessageCacheData.push({ username: usernameText, message: messageText });

        // If filtering is active and this message matches the current filter,
        // immediately re-add it to maintain visibility
        if (this.isSearchActive && this.searchInput) {
            const currentQuery = this.searchInput.value.toLowerCase().trim();
            if (currentQuery && (usernameText.includes(currentQuery) || messageText.includes(currentQuery))) {
                this._reAddMatchingMessage(node, currentQuery);
            }
        }
    }

    _reAddMatchingMessage(originalNode, query) {
        const chatContainer = document.querySelector(this.adapter.selectors.chatScrollableArea);
        if (!chatContainer) return;

        // Clone the node and mark it as re-added
        const clonedNode = originalNode.cloneNode(true);
        clonedNode.setAttribute('data-plus2-readded', 'true');
        clonedNode.style.display = '';

        // Find the correct insertion point (after existing re-added messages but before live messages)
        let insertionPoint = chatContainer.firstChild;
        
        // Skip past any existing re-added messages to maintain chronological order
        while (insertionPoint && insertionPoint.hasAttribute && insertionPoint.hasAttribute('data-plus2-readded')) {
            insertionPoint = insertionPoint.nextSibling;
        }

        chatContainer.insertBefore(clonedNode, insertionPoint);
    }

    filterChatMessages(query) {
        const lowerCaseQuery = query.toLowerCase().trim();
        const chatContainer = document.querySelector(this.adapter.selectors.chatScrollableArea);
        if (!chatContainer) return;

        // Clean up previously re-added messages from the DOM
        chatContainer.querySelectorAll('[data-plus2-readded]').forEach(node => node.remove());

        // If search is cleared, just show all original messages
        if (!lowerCaseQuery) {
            chatContainer.querySelectorAll(`${this.adapter.selectors.chatScrollableArea} > div`).forEach(msg => {
                msg.style.display = '';
            });
            return;
        }

        // Filter live messages
        chatContainer.querySelectorAll(`${this.adapter.selectors.chatScrollableArea} > div`).forEach(wrapper => {
            const usernameSelector = this.settings.features?.enableSevenTVCompatibility ? '.seventv-chat-user-username' : '[data-a-target="chat-message-username"]';
            const usernameElement = wrapper.querySelector(usernameSelector);
            const messageContentElement = wrapper.querySelector(this.adapter.selectors.messageContent);
            const usernameText = usernameElement ? usernameElement.textContent.toLowerCase() : '';
            const messageText = messageContentElement ? messageContentElement.textContent.toLowerCase() : '';

            wrapper.style.display = (usernameText.includes(lowerCaseQuery) || messageText.includes(lowerCaseQuery)) ? '' : 'none';
        });

        // Search through the pruned cache and re-add matches
        const matchingCachedNodes = [];
        this.prunedMessageCacheData.forEach((data, index) => {
            if (data.username.includes(lowerCaseQuery) || data.message.includes(lowerCaseQuery)) {
                const originalNode = this.prunedMessageCache[index];
                if (originalNode) {
                    const clonedNode = originalNode.cloneNode(true);
                    clonedNode.setAttribute('data-plus2-readded', 'true');
                    clonedNode.style.display = '';
                    matchingCachedNodes.push(clonedNode);
                }
            }
        });

        // Insert matches at the top of the chat, oldest first
        let insertionPoint = chatContainer.firstChild;
        matchingCachedNodes.forEach(node => {
            chatContainer.insertBefore(node, insertionPoint);
            insertionPoint = node.nextSibling; // Move insertion point down for next message
        });
    }

    filterNewMessage(messageElement, query) {
        if (!this.isSearchActive || this.adapter.platform !== 'twitch') return;

        const lowerCaseQuery = query.toLowerCase().trim();
        if (!lowerCaseQuery) return;

        const usernameSelector = this.settings.features?.enableSevenTVCompatibility ? '.seventv-chat-user-username' : '[data-a-target="chat-message-username"]';
        const usernameElement = messageElement.querySelector(usernameSelector);
        const messageContentElement = messageElement.querySelector(this.adapter.selectors.messageContent);
        const usernameText = usernameElement ? usernameElement.textContent.toLowerCase() : '';
        const messageText = messageContentElement ? messageContentElement.textContent.toLowerCase() : '';

        if (!(usernameText.includes(lowerCaseQuery) || messageText.includes(lowerCaseQuery))) {
            messageElement.style.display = 'none';
        }
    }

    getCurrentQuery() {
        return this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
    }

    clearCache() {
        this.prunedMessageCache = [];
        this.prunedMessageCacheData = [];
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SearchFeature = SearchFeature;
}