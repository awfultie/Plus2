// Animation utilities for popout display
// Extracted from popout.js during Phase 1 refactoring

/**
 * Inject animation styles for peak label animations
 * Creates or updates the animation stylesheet based on current settings
 * @param {Object} settings - Settings object containing animation configuration
 */
function injectAnimationStyles(settings) {
    const styleId = 'plus2AnimationStyles';
    let style = document.getElementById(styleId);
    if (style) style.remove(); // Remove to update with new settings if needed

    style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
    @keyframes plus2-vertical-shaking {
      0%, 50%, 100% { transform: translateY(-1px); }
      25%, 75% { transform: translateY(-${Math.max(1, settings.styling?.gauge?.peakLabelAnimationIntensity || 2)}px); }
    }
    .plus2-shake-animation {
      animation-name: plus2-vertical-shaking;
      animation-duration: ${settings.styling?.gauge?.peakLabelAnimationDuration || 0.6}s;
      animation-iteration-count: infinite;
      animation-timing-function: ease-in-out;
    }
  `;
    document.head.appendChild(style);
}

// Make function available globally for backward compatibility
window.popoutUtils = window.popoutUtils || {};
window.popoutUtils.injectAnimationStyles = injectAnimationStyles;