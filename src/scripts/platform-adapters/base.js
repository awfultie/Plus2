// Base platform adapter class
class BasePlatformAdapter {
    constructor(settings) {
        this.settings = settings;
        this.platform = 'unknown';
        this.selectors = {};
    }

    // Abstract methods to be implemented by platform-specific adapters
    getSelectors() {
        throw new Error('getSelectors must be implemented by platform adapter');
    }

    extractMessageParts(chatLine) {
        throw new Error('extractMessageParts must be implemented by platform adapter');
    }

    addHighlightButton(chatLine, onHighlight) {
        throw new Error('addHighlightButton must be implemented by platform adapter');
    }

    shouldProcessOnThisPlatform() {
        return true; // Default implementation
    }

    // Common utility methods
    createIconElement(size = '24px') {
        const img = document.createElement('img');
        if (typeof browser !== 'undefined' && browser.runtime?.id) {
            img.src = browser.runtime.getURL('icons/Plus2_128.png');
        }
        img.style.width = size;
        img.style.height = size;
        return img;
    }

    sendHighlightMessage(messageParts) {
        if (typeof browser !== 'undefined' && browser.runtime?.id) {
            browser.runtime.sendMessage({
                type: 'HIGHLIGHT_MESSAGE_REQUEST',
                data: { ...messageParts, isManualHighlight: true }
            }).catch(e => {
                // Silently ignore "context invalidated" or "receiving end does not exist" errors
            });
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.BasePlatformAdapter = BasePlatformAdapter;
}