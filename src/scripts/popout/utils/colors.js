// Color utility functions for popout display
// Extracted from popout.js during Phase 1 refactoring

/**
 * Convert hex color to RGBA with specified alpha
 * @param {string} hex - Hex color code (with or without #)
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} RGBA color string
 */
function hexToRgba(hex, alpha) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// Make function available globally for backward compatibility
window.popoutUtils = window.popoutUtils || {};
window.popoutUtils.hexToRgba = hexToRgba;