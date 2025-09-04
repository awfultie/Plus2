// Auto-resume scroll module for handling inactivity timeout
class AutoScroll {
    constructor(settings) {
        this.settings = settings;
        this.inactivityTimerId = null;
        this.CHAT_PAUSED_FOOTER_SELECTOR = 'div.chat-paused-footer';
        this.SEVENTV_BUFFER_NOTICE_SELECTOR = 'div.seventv-message-buffer-notice';
    }

    initialize() {
        if (this.settings.behavior?.inactivityTimeoutDuration > 0) {
            this.setupInactivityResumer();
        }
    }

    setupInactivityResumer() {
        window.addEventListener('mousemove', () => this.resetInactivityTimer(), { passive: true });
        window.addEventListener('mousedown', () => this.resetInactivityTimer(), { passive: true });
        window.addEventListener('keydown', () => this.resetInactivityTimer(), { passive: true });
        window.addEventListener('scroll', () => this.resetInactivityTimer(), { passive: true });
        this.resetInactivityTimer(); // Start the timer initially
    }

    resetInactivityTimer() {
        if (this.inactivityTimerId) {
            clearTimeout(this.inactivityTimerId);
        }
        
        this.inactivityTimerId = setTimeout(() => {
            const resumeButton = document.querySelector(this.CHAT_PAUSED_FOOTER_SELECTOR);
            const seventvNotice = document.querySelector(this.SEVENTV_BUFFER_NOTICE_SELECTOR);

            if (resumeButton) {
                resumeButton.querySelector('button')?.click();
            } else if (seventvNotice) {
                seventvNotice.click();
            }
        }, this.settings.behavior?.inactivityTimeoutDuration);
    }

    cleanup() {
        if (this.inactivityTimerId) {
            clearTimeout(this.inactivityTimerId);
            this.inactivityTimerId = null;
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AutoScroll = AutoScroll;
}