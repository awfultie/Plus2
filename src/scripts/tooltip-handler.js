// Tooltip handler module for reply tooltips
class TooltipHandler {
    constructor(platformAdapter, settings) {
        this.adapter = platformAdapter;
        this.settings = settings;
        this.replyTooltipElement = null;
    }

    addHoverListeners(chatLineHoverTarget) {
        if (!this.settings.features?.enableReplyTooltip) return;
        
        chatLineHoverTarget.addEventListener('mouseenter', (event) => 
            this.showReplyTooltip(chatLineHoverTarget, event)
        );
        chatLineHoverTarget.addEventListener('mouseleave', () => 
            this.hideReplyTooltip()
        );
    }

    hideReplyTooltip() {
        if (this.replyTooltipElement) {
            this.replyTooltipElement.remove();
            this.replyTooltipElement = null;
        }
    }

    showReplyTooltip(chatLineHoverTarget, event) {
        // Guards for feature enabled and element still in DOM
        if (!this.settings.features?.enableReplyTooltip || !chatLineHoverTarget || !chatLineHoverTarget.isConnected) {
            return;
        }

        this.hideReplyTooltip(); // Hide any existing tooltip first

        let replyElement = null;
        if (this.adapter.platform === 'twitch') {
            replyElement = this._findTwitchReplyElement(chatLineHoverTarget);
        }
        // Note: YouTube reply tooltips are not yet supported

        if (replyElement) {
            const replyText = this._extractReplyText(replyElement);
            if (replyText) {
                this._createAndShowTooltip(chatLineHoverTarget, replyText);
            }
        }
    }

    _findTwitchReplyElement(chatLineHoverTarget) {
        if (this.settings.features?.enableSevenTVCompatibility) {
            return chatLineHoverTarget.querySelector('div.seventv-reply-message-part');
        } else {
            // Standard Twitch - find reply paragraph by text content
            const allParagraphs = chatLineHoverTarget.querySelectorAll('p');
            for (const p of allParagraphs) {
                if (p.textContent.trim().startsWith('Replying to ')) {
                    return p;
                }
            }
        }
        return null;
    }

    _extractReplyText(replyElement) {
        if (this.settings.features?.enableSevenTVCompatibility) {
            const replyBody = replyElement.querySelector('.seventv-chat-message-body');
            return replyBody ? replyBody.textContent.trim() : '';
        } else {
            // For standard Twitch, extract message part after "Replying to @user"
            const userLink = replyElement.querySelector('a');
            if (userLink) {
                const fullText = replyElement.textContent.trim();
                const prefix = `Replying to ${userLink.textContent.trim()}`;
                return fullText.substring(prefix.length).trim();
            } else {
                return replyElement.textContent.trim(); // Fallback
            }
        }
    }

    _createAndShowTooltip(chatLineHoverTarget, replyText) {
        this.replyTooltipElement = document.createElement('div');
        this.replyTooltipElement.id = 'plus2-reply-tooltip';
        this.replyTooltipElement.textContent = replyText;

        // Get the dimensions of the message being hovered
        const rect = chatLineHoverTarget.getBoundingClientRect();

        Object.assign(this.replyTooltipElement.style, {
            position: 'fixed',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            zIndex: '10001',
            pointerEvents: 'none',
            fontSize: '13px',
            lineHeight: '1.4',
            boxSizing: 'border-box',
            textAlign: 'center',
            transition: 'opacity 0.1s ease-in-out, transform 0.1s ease-in-out',
            opacity: '0',
            width: `${rect.width}px`,
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            transform: 'translateY(calc(-100% - 5px))'
        });

        document.body.appendChild(this.replyTooltipElement);

        // Use timeout to allow browser to calculate initial position
        setTimeout(() => {
            // Guard: tooltip might have been hidden by fast mouseleave
            if (!this.replyTooltipElement) {
                return;
            }
            
            const tooltipRect = this.replyTooltipElement.getBoundingClientRect();
            if (tooltipRect.top < 5) {
                // Reposition below the message if too close to top
                this.replyTooltipElement.style.top = `${rect.bottom}px`;
                this.replyTooltipElement.style.transform = 'translateY(5px)';
            }
            
            // Fade in
            this.replyTooltipElement.style.opacity = '1';
        }, 0);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TooltipHandler = TooltipHandler;
}