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

    updateSettings(newSettings) {
        this.settings = newSettings;
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
            { id: 'menu-poll-toggles', text: 'Polls on/off >', action: () => {}, submenu: true, hover: true },
            { id: 'menu-open-options', text: 'Options', action: () => this._sendMessage({ type: 'OPEN_OPTIONS_PAGE' }) }
        ];

        // Use nested settings structure instead of flat storage access
        const settingsData = {
            enableHighlightTracking: this.settings.features?.enableHighlightTracking,
            enableLeaderboard: this.settings.features?.enableLeaderboard,
            enableStreamview: this.settings.integrations?.streamview?.enabled,
            currentStreamview: this.settings.integrations?.streamview?.current
        };
        this._renderMenuItems(menuItems, settingsData);

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
                // Handle hover for submenu items
                if (itemData.hover) {
                    button.onmouseenter = () => {
                        button.style.backgroundColor = '#3a3a3d';
                        this.createPollSubmenu(button);
                    };
                    button.onmouseleave = () => {
                        button.style.backgroundColor = 'transparent';
                        // Add delay before closing submenu to allow moving to it
                        this._submenuCloseTimer = setTimeout(() => {
                            this.closePollSubmenu();
                        }, 300);
                    };
                } else {
                    button.onmouseenter = () => {
                        button.style.backgroundColor = '#3a3a3d';
                        // Close any open submenu when hovering other items
                        this.closePollSubmenu();
                    };
                    button.onmouseleave = () => button.style.backgroundColor = 'transparent';
                }

                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!itemData.submenu || !itemData.hover) {
                        itemData.action(button);
                        this.closeCustomMenu();
                    }
                });
                this.customPopupMenu.appendChild(button);
            }
        });
    }

    _copyBrowserSourceUrl(btn) {
        const originalText = btn.textContent;
        const currentStreamview = this.settings.integrations?.streamview?.current;
        if (currentStreamview && currentStreamview.viewUrl) {
            navigator.clipboard.writeText(currentStreamview.viewUrl).then(() => {
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = originalText; }, 1500);
            }).catch(() => {
                btn.textContent = 'Copy failed';
                setTimeout(() => { btn.textContent = originalText; }, 1500);
            });
        } else {
            btn.textContent = 'No URL available';
            setTimeout(() => { btn.textContent = originalText; }, 1500);
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

    createPollSubmenu(hoverButton) {
        // Close existing submenu if any
        this.closePollSubmenu();
        
        // Clear any pending close timer
        if (this._submenuCloseTimer) {
            clearTimeout(this._submenuCloseTimer);
            this._submenuCloseTimer = null;
        }
        
        // Get position from hover button or main menu
        const rect = hoverButton ? hoverButton.getBoundingClientRect() : this.customPopupMenu.getBoundingClientRect();
        
        // Create submenu (separate from main menu)
        const menuWidth = 200;
        this.pollSubmenu = document.createElement('div');
        // Better positioning logic with full screen bounds checking
        let submenuTop = rect.top;
        let submenuLeft = rect.right + 5;
        
        // Check horizontal positioning
        if (submenuLeft + menuWidth > window.innerWidth) {
            // Try positioning to the left of main menu
            const leftPosition = rect.left - menuWidth - 5;
            if (leftPosition >= 0) {
                submenuLeft = leftPosition;
            } else {
                // If neither left nor right works, center it within viewport
                submenuLeft = Math.max(5, (window.innerWidth - menuWidth) / 2);
            }
        }
        
        // Check vertical positioning - ensure submenu doesn't go below viewport
        // More accurate height calculation: 4 buttons (40px each) + padding + margins
        const submenuHeight = (4 * 40) + 20; // 4 buttons at ~40px each + 20px padding/margins
        if (submenuTop + submenuHeight > window.innerHeight) {
            // Move submenu up to fit in viewport, with more generous bottom margin
            submenuTop = Math.max(5, window.innerHeight - submenuHeight - 10);
        }
        
        // Ensure submenu doesn't go above viewport
        submenuTop = Math.max(5, submenuTop);
        
        Object.assign(this.pollSubmenu.style, {
            position: 'absolute',
            backgroundColor: '#1e1e21',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '5px',
            zIndex: '10001', // Higher than main menu
            width: `${menuWidth}px`,
            top: `${submenuTop}px`,
            left: `${submenuLeft}px`
        });
        
        // Add hover handlers to prevent closing
        this.pollSubmenu.onmouseenter = () => {
            if (this._submenuCloseTimer) {
                clearTimeout(this._submenuCloseTimer);
                this._submenuCloseTimer = null;
            }
        };
        this.pollSubmenu.onmouseleave = () => {
            this._submenuCloseTimer = setTimeout(() => {
                this.closePollSubmenu();
            }, 300);
        };
        
        // No back button needed since main menu stays open
        
        // Poll toggle items
        const pollItems = [
            { 
                id: 'toggle-yesno', 
                text: `Yes/No Polls: ${this.settings.polling?.unifiedPolling?.yesno?.enabled ? 'ON' : 'OFF'}`,
                action: () => this.togglePollSetting('polling.unifiedPolling.yesno.enabled')
            },
            { 
                id: 'toggle-numbers', 
                text: `Number Polls: ${this.settings.polling?.unifiedPolling?.numbers?.enabled ? 'ON' : 'OFF'}`,
                action: () => this.togglePollSetting('polling.unifiedPolling.numbers.enabled')
            },
            { 
                id: 'toggle-letters', 
                text: `Letter Polls: ${this.settings.polling?.unifiedPolling?.letters?.enabled ? 'ON' : 'OFF'}`,
                action: () => this.togglePollSetting('polling.unifiedPolling.letters.enabled')
            },
            { 
                id: 'toggle-sentiment', 
                text: `Sentiment Tracking: ${this.settings.polling?.unifiedPolling?.sentiment?.enabled ? 'ON' : 'OFF'}`,
                action: () => this.togglePollSetting('polling.unifiedPolling.sentiment.enabled')
            }
        ];
        
        pollItems.forEach(item => {
            const button = document.createElement('button');
            button.textContent = item.text;
            Object.assign(button.style, {
                display: 'block', width: '100%', padding: '8px', border: 'none',
                backgroundColor: 'transparent', color: '#efeff1', textAlign: 'left', cursor: 'pointer'
            });
            button.onmouseenter = () => button.style.backgroundColor = '#3a3a3d';
            button.onmouseleave = () => button.style.backgroundColor = 'transparent';
            button.addEventListener('click', () => {
                item.action();
                // Recreate submenu with updated states
                setTimeout(() => this.createPollSubmenu(hoverButton), 100);
            });
            this.pollSubmenu.appendChild(button);
        });
        
        document.body.appendChild(this.pollSubmenu);
    }
    
    togglePollSetting(settingPath) {
        const pathParts = settingPath.split('.');
        let current = this.settings;
        
        // Navigate to the parent object
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (!current[pathParts[i]]) current[pathParts[i]] = {};
            current = current[pathParts[i]];
        }
        
        // Toggle the final property
        const finalKey = pathParts[pathParts.length - 1];
        const oldValue = current[finalKey];
        current[finalKey] = !current[finalKey];
        
        // If we're disabling a poll type, send message to hide its displays
        if (current[finalKey] === false) {
            const pollType = this.getPollTypeFromPath(settingPath);
            if (pollType) {
                this._sendMessage({
                    type: 'HIDE_POLL_DISPLAY',
                    pollType: pollType
                });
            }
        }
        
        // Send message to background script to save settings
        this._sendMessage({
            type: 'SAVE_SETTINGS',
            settings: this.settings
        });
    }
    
    getPollTypeFromPath(settingPath) {
        if (settingPath.includes('yesno')) return 'yesno';
        if (settingPath.includes('numbers')) return 'numbers';
        if (settingPath.includes('letters')) return 'letters';
        if (settingPath.includes('sentiment')) return 'sentiment';
        return null;
    }

    closePollSubmenu() {
        if (this.pollSubmenu) {
            this.pollSubmenu.remove();
            this.pollSubmenu = null;
        }
        if (this._submenuCloseTimer) {
            clearTimeout(this._submenuCloseTimer);
            this._submenuCloseTimer = null;
        }
    }

    closeCustomMenu() {
        this.closePollSubmenu(); // Also close submenu
        if (this.customPopupMenu) {
            this.customPopupMenu.remove();
            this.customPopupMenu = null;
            window.removeEventListener('click', this._closeCustomMenuOnClickOutside);
        }
    }

    _closeCustomMenuOnClickOutside(event) {
        const popoutButton = document.getElementById('plus2-popout-button');
        const headerMenuButton = document.getElementById('plus2-header-menu-button');
        
        const isClickInMainMenu = this.customPopupMenu && this.customPopupMenu.contains(event.target);
        const isClickInSubmenu = this.pollSubmenu && this.pollSubmenu.contains(event.target);
        const isClickOnMenuButton = popoutButton?.contains(event.target) || headerMenuButton?.contains(event.target);
        
        if (this.customPopupMenu && !isClickInMainMenu && !isClickInSubmenu && !isClickOnMenuButton) {
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
            height: `${this.settings.display?.dockedViewHeight || 250}px`,
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

        if (this.settings.behavior?.dockingBehavior === 'twitch' && isTwitchPopout) {
            this.popInView();
        } else if (this.settings.behavior?.dockingBehavior === 'youtube' && isYouTubePopout) {
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