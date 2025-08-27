// UI injection module for popout buttons, options menus, and docking functionality
class UIInjection {
    constructor(platformAdapter, settings) {
        this.adapter = platformAdapter;
        this.settings = settings;
        this.customPopupMenu = null;
        this.isPoppedIn = false;
        this.poppedInContainer = null;
        this.dockedWrapperElement = null;
        this.stylesInjected = false;
        this.leaderboardDisplayMode = 'hidden'; // Track leaderboard state
    }

    initialize() {
        this.injectHoverStyles();
        this.setupPopoutButtonInjector();
        this.setupOptionsButtonInjector();
    }

    injectHoverStyles() {
        if (this.stylesInjected) return;
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
        this.stylesInjected = true;
    }

    // Popout button injection methods
    setupPopoutButtonInjector() {
        const observer = new MutationObserver(() => {
            if (this.adapter.platform === 'twitch') {
                this.injectPopoutButtonIntoChatInput();
            } else if (this.adapter.platform === 'youtube') {
                this.injectPopoutButtonIntoYouTubeHeader();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    injectPopoutButtonIntoChatInput() {
        const container = document.querySelector('[data-test-selector="chat-input-buttons-container"]');
        if (!container || container.querySelector('#plus2-popout-button')) {
            return;
        }

        const popoutButton = document.createElement('button');
        popoutButton.id = 'plus2-popout-button';
        popoutButton.className = 'tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon tw-core-button tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative';
        popoutButton.setAttribute('aria-label', 'Open Plus 2 Popout');
        popoutButton.setAttribute('data-test-selector', 'plus2-popout-button');

        const iconWrapper = document.createElement('span');
        iconWrapper.className = 'tw-button-icon__icon';
        const icon = this.adapter.createIconElement('20px');

        iconWrapper.appendChild(icon);
        popoutButton.appendChild(iconWrapper);

        popoutButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCustomMenu(popoutButton);
        });

        const children = container.children;
        const middleIndex = Math.floor(children.length / 2);
        container.insertBefore(popoutButton, children[middleIndex]);
    }

    injectPopoutButtonIntoYouTubeHeader() {
        const headerRenderer = document.querySelector('yt-live-chat-header-renderer');
        if (!headerRenderer) return;

        const moreOptionsMenuButton = headerRenderer.querySelector('#live-chat-header-context-menu');
        const container = headerRenderer;

        if (!container || container.querySelector('#plus2-header-menu-button')) {
            return;
        }

        const popoutButton = document.createElement('yt-icon-button');
        popoutButton.id = 'plus2-header-menu-button';
        popoutButton.className = 'style-scope yt-live-chat-header-renderer';

        const innerButton = document.createElement('button');
        innerButton.id = 'button';
        innerButton.className = 'style-scope yt-icon-button';
        innerButton.setAttribute('aria-label', 'Plus 2 Menu');

        const img = this.adapter.createIconElement('24px');

        innerButton.appendChild(img);
        popoutButton.appendChild(innerButton);

        popoutButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCustomMenu(popoutButton);
        });

        container.insertBefore(popoutButton, moreOptionsMenuButton);
    }

    // Custom menu methods
    toggleCustomMenu(buttonElement) {
        if (this.customPopupMenu) {
            this.closeCustomMenu();
        } else {
            this.createCustomMenu(buttonElement);
        }
    }

    createCustomMenu(buttonElement) {
        this.closeCustomMenu();

        const menuWidth = 180;
        this.customPopupMenu = document.createElement('div');
        Object.assign(this.customPopupMenu.style, {
            position: 'absolute',
            backgroundColor: '#1e1e21',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '5px',
            zIndex: '10000',
            width: `${menuWidth}px`
        });

        const rect = buttonElement.getBoundingClientRect();

        // Vertical positioning
        if (rect.top < window.innerHeight / 2) {
            this.customPopupMenu.style.top = `${rect.bottom + 2}px`;
        } else {
            this.customPopupMenu.style.bottom = `${window.innerHeight - rect.top + 2}px`;
        }

        // Horizontal positioning
        const calculatedLeft = (rect.left + menuWidth > window.innerWidth) ? (rect.right - menuWidth) : rect.left;
        this.customPopupMenu.style.left = `${Math.max(0, calculatedLeft)}px`;

        const menuItems = [
            { id: 'menu-open-popout', text: 'Open Popout', action: () => this._sendMessage({ type: 'OPEN_POPOUT_WINDOW' }) },
            { id: 'menu-toggle-popin', text: this.isPoppedIn ? 'Undock View' : 'Dock View Here', action: () => this.togglePoppedInView() },
            { id: 'menu-copy-url', text: 'Copy Browser Source', action: (btn) => this._copyBrowserSourceUrl(btn), requires: ['enableStreamview', 'currentStreamview'] },
            { id: 'menu-toggle-leaderboard', text: this.leaderboardDisplayMode === 'shown' ? 'Hide Leaderboard' : 'Show Leaderboard', action: () => this._sendMessage({ type: 'TOGGLE_LEADERBOARD_MODE' }), requires: ['enableHighlightTracking', 'enableLeaderboard'] },
            { id: 'menu-open-options', text: 'Options', action: () => this._sendMessage({ type: 'OPEN_OPTIONS_PAGE' }) }
        ];

        if (typeof browser !== 'undefined' && browser.storage) {
            browser.storage.sync.get(['enableHighlightTracking', 'enableLeaderboard', 'enableStreamview', 'currentStreamview']).then((items) => {
                this._renderMenuItems(menuItems, items);
            });
        } else {
            this._renderMenuItems(menuItems, {});
        }

        document.body.appendChild(this.customPopupMenu);
        setTimeout(() => window.addEventListener('click', (e) => this._closeCustomMenuOnClickOutside(e)), 0);
    }

    _renderMenuItems(menuItems, items) {
        menuItems.forEach(itemData => {
            const shouldShow = !itemData.requires || itemData.requires.every(req => {
                if (req === 'currentStreamview') {
                    // Special check for currentStreamview - must exist and have a viewUrl
                    return items.currentStreamview && items.currentStreamview.viewUrl;
                }
                return items[req];
            });

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
                    itemData.action(button);
                    this.closeCustomMenu();
                });
                this.customPopupMenu.appendChild(button);
            }
        });
    }

    _copyBrowserSourceUrl(btn) {
        if (typeof browser !== 'undefined' && browser.storage) {
            const originalText = btn.textContent;
            browser.storage.sync.get(['currentStreamview']).then((items) => {
                if (items.currentStreamview && items.currentStreamview.viewUrl) {
                    navigator.clipboard.writeText(items.currentStreamview.viewUrl).then(() => {
                        btn.textContent = 'Copied!';
                        setTimeout(() => { btn.textContent = originalText; }, 1500);
                    }).catch(() => {
                        btn.textContent = 'Copy failed';
                        setTimeout(() => { btn.textContent = originalText; }, 1500);
                    });
                }
            });
        }
    }

    _sendMessage(message) {
        if (typeof browser !== 'undefined' && browser.runtime?.id) {
            browser.runtime.sendMessage(message).catch(e => {});
        }
    }

    updateLeaderboardDisplayMode(mode) {
        this.leaderboardDisplayMode = mode;
    }

    closeCustomMenu() {
        if (this.customPopupMenu) {
            this.customPopupMenu.remove();
            this.customPopupMenu = null;
            window.removeEventListener('click', this._closeCustomMenuOnClickOutside);
        }
    }

    _closeCustomMenuOnClickOutside(event) {
        const popoutButton = document.getElementById('plus2-popout-button');
        if (this.customPopupMenu && !this.customPopupMenu.contains(event.target) && !popoutButton?.contains(event.target)) {
            this.closeCustomMenu();
        }
    }

    // Docking functionality
    getPopInInjectionTarget() {
        if (this.adapter.platform === 'twitch') {
            return document.querySelector('.chat-room__content');
        } else if (this.adapter.platform === 'youtube') {
            return document.querySelector('yt-live-chat-renderer');
        }
        return null;
    }

    togglePoppedInView() {
        if (this.isPoppedIn) {
            this.popOutView();
        } else {
            this.popInView();
        }
    }

    popInView() {
        const injectionTarget = this.getPopInInjectionTarget();
        if (!injectionTarget || document.getElementById('plus2-docked-wrapper')) return;

        this.dockedWrapperElement = document.createElement('div');
        this.dockedWrapperElement.id = 'plus2-docked-wrapper';
        Object.assign(this.dockedWrapperElement.style, {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            flexShrink: '0',
            marginBottom: '10px'
        });

        this.poppedInContainer = document.createElement('div');
        this.poppedInContainer.id = 'plus2-popped-in-container';
        Object.assign(this.poppedInContainer.style, {
            width: '100%',
            height: `${this.settings.dockedViewHeight || 250}px`,
            border: '1px solid #444',
            boxSizing: 'border-box',
            overflow: 'hidden'
        });

        const iframe = document.createElement('iframe');
        if (typeof browser !== 'undefined' && browser.runtime?.id) {
            iframe.src = browser.runtime.getURL('ui/popout.html');
        }
        Object.assign(iframe.style, {
            width: '100%',
            height: '100%',
            border: 'none'
        });


        const resizeHandle = document.createElement('div');
        resizeHandle.id = 'plus2-resize-handle';
        Object.assign(resizeHandle.style, {
            width: '100%',
            height: '5px',
            marginTop: '2px',
            cursor: 'ns-resize',
            backgroundColor: '#555',
            opacity: '0',
            transition: 'opacity 0.2s ease-in-out'
        });

        this.poppedInContainer.appendChild(iframe);
        this.dockedWrapperElement.appendChild(this.poppedInContainer);
        this.dockedWrapperElement.appendChild(resizeHandle);

        this.dockedWrapperElement.addEventListener('mouseenter', () => {
            resizeHandle.style.opacity = '1';
        });
        this.dockedWrapperElement.addEventListener('mouseleave', () => {
            resizeHandle.style.opacity = '0';
        });

        this._setupResizeListeners(this.poppedInContainer, resizeHandle);

        injectionTarget.insertBefore(this.dockedWrapperElement, injectionTarget.firstChild);
        this.isPoppedIn = true;
    }

    popOutView() {
        if (this.dockedWrapperElement) {
            this.dockedWrapperElement.remove();
            this.dockedWrapperElement = null;
            this.poppedInContainer = null;
        }
        this.isPoppedIn = false;
    }

    _setupResizeListeners(container, handle) {
        let initialHeight, initialMouseY;
        const iframe = container ? container.querySelector('iframe') : null;
    
        const handleDrag = (e) => {
            if (!container) return;
            e.preventDefault();
            const deltaY = e.clientY - initialMouseY;
            const newHeight = Math.max(50, initialHeight + deltaY);
            container.style.height = `${newHeight}px`;
        };
    
        const stopDrag = () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', stopDrag);
            document.body.style.userSelect = '';
            if (iframe) {
                iframe.style.pointerEvents = 'auto';
            }
    
            if (container && typeof browser !== 'undefined' && browser.storage) {
                const finalHeight = parseInt(container.style.height, 10);
                browser.storage.sync.set({ dockedViewHeight: finalHeight });
            }
        };
    
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            initialHeight = container.offsetHeight;
            initialMouseY = e.clientY;
            document.body.style.userSelect = 'none';
            if (iframe) {
                iframe.style.pointerEvents = 'none';
            }
    
            window.addEventListener('mousemove', handleDrag);
            window.addEventListener('mouseup', stopDrag);
        });
    }

    // Options button injection
    setupOptionsButtonInjector() {
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (this.adapter.platform === 'twitch') {
                    const injectionTarget = document.querySelector('.chat-settings__popover .scrollable-area .simplebar-content');
                    if (injectionTarget) {
                        this.injectOptionsButtonIntoMenu(injectionTarget);
                    }
                }
                // TODO: Add YouTube options injection
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    injectOptionsButtonIntoMenu(injectionTarget) {
        if (injectionTarget.querySelector('#plus2-options-button')) {
            return;
        }

        const menuItem = document.createElement('div');
        menuItem.className = 'tw-pd-y-05';

        const button = document.createElement('button');
        button.id = 'plus2-options-button';
        button.textContent = 'Plus 2 Options';
        button.className = 'tw-interactive tw-full-width tw-pd-x-1 tw-pd-y-05 tw-relative tw-rounded';

        button.addEventListener('click', (e) => {
            e.preventDefault();
            this._sendMessage({ type: 'OPEN_OPTIONS_PAGE' });
        });

        menuItem.appendChild(button);

        const separator = document.createElement('div');
        separator.className = 'tw-border-t tw-mg-y-05';

        injectionTarget.appendChild(separator);
        injectionTarget.appendChild(menuItem);
    }

    // Auto-docking logic
    handleAutoDocking() {
        const isTwitchPopout = this.adapter.platform === 'twitch' && window.location.pathname.includes('/popout/');
        const isYouTubePopout = this.adapter.platform === 'youtube' && window.location.pathname.includes('/live_chat');

        if (this.settings.dockingBehavior === 'twitch' && isTwitchPopout) {
            this.popInView();
        } else if (this.settings.dockingBehavior === 'youtube' && isYouTubePopout) {
            this.popInView();
        }
    }

    // Public getters for accessing private state
    get isDocked() {
        return this.isPoppedIn;
    }

    get dockedContainer() {
        return this.poppedInContainer;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UIInjection = UIInjection;
}