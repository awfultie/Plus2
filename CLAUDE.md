# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run build` - Build extension for both Chrome and Firefox
- `npm run build:chrome` - Build Chrome extension only
- `npm run build:firefox` - Build Firefox extension only

The build process:
1. Copies files from `src/` to `dist/{browser}/`
2. Modifies `manifest.json` for browser-specific requirements
3. Creates distributable ZIP files in `dist/`

## Architecture Overview

This is a browser extension (Manifest V3) that enhances Twitch and YouTube chat for streamers. The extension consists of several key components:

### Core Files Structure
- `src/scripts/app.js` - Main content script that handles chat interaction, message highlighting, and UI injection
- `src/scripts/background.js` - Service worker managing extension state, storage, and cross-tab communication
- `src/scripts/popout.js` - Controls the dedicated popout window for OBS streaming
- `src/scripts/options.js` - Manages the extension settings/options page
- `src/scripts/popup.js` - Handles the browser action popup interface

### Key Architecture Patterns

**Platform Detection**: The extension detects Twitch vs YouTube and uses different selectors/logic accordingly. Platform-specific code is organized around the `PLATFORM` variable.

**Message Processing**: Chat messages are processed through a pipeline:
1. Content script (`app.js`) extracts message data
2. Background script stores/processes the data
3. Popout window displays highlighted content

**Cross-Component Communication**: Uses Chrome extension messaging API for communication between:
- Content scripts ↔ Background script
- Background script ↔ Popout window
- Options page ↔ Background script

**State Management**: Background script maintains global state for:
- Gauge/counter functionality
- Polling system
- Highlight tracking and leaderboard
- Settings synchronization

### Browser Compatibility

The build system handles browser-specific differences:
- **Chrome**: Uses service worker (`background.service_worker`)
- **Firefox**: Uses background scripts with polyfill (`background.scripts`)

### Key Features Implementation

**7TV Compatibility Mode**: Special handling for 7TV browser extension integration, with different message selectors and emote processing.

**Popout Window System**: Creates a separate window (`ui/popout.html`) that streamers capture in OBS using Window Capture (not Browser Source).

**Settings Architecture**: Centralized settings system with default values in `background.js`, managed through `options.html`, and synchronized across all components.

### Options Page Architecture (CRITICAL)

**IMPORTANT**: The options page (`src/scripts/options.js`) uses a direct nested structure approach that MUST be followed for all new settings:

#### When Adding New Settings:

1. **Add to Default Settings**: First add the setting to `src/config/default-settings.json` in the appropriate nested location (e.g., `polling.unifiedPolling.newFeature.enabled`)

2. **Add to FORM_ELEMENT_PATHS**: Add the form element ID to nested path mapping in the `FORM_ELEMENT_PATHS` constant:
   ```javascript
   'newFeatureEnabled': 'polling.unifiedPolling.newFeature.enabled',
   ```

3. **Create HTML Form Element**: Add the form control in `src/ui/options.html` with the ID that matches your mapping

4. **NO FLAT MAPPINGS**: Do NOT add entries to any `nestedMap` objects or flat mapping approaches - these are legacy and being phased out

#### Architecture Benefits:
- **Direct SettingsManager Integration**: Settings save/load directly to/from nested structure
- **Single Source of Truth**: No conversion between flat and nested formats
- **Maintainable**: Easy to understand which form elements map to which settings
- **Performance**: No redundant mapping operations

#### Functions That Handle This:
- `populateForm()` - Reads nested values using `getNestedValue()`
- `saveOptions()` - Saves nested values using `setNestedValue()`
- `FORM_ELEMENT_PATHS` - Central mapping from form IDs to nested paths

**DO NOT** use the legacy `nestedMap` approach found in some older functions - this will be removed in future cleanup.

## Development Notes

- Extension requires `storage`, `tabs`, `alarms`, and `scripting` permissions
- Targets `*://*.twitch.tv/*` and `*://*.youtube.com/*` hosts
- Uses browser polyfill for cross-browser compatibility
- Content Security Policy restricts script execution for security

## Legacy System Removals (Migration Guide)

### Message Counter System Removal (2025-01)

The legacy message counter system has been completely removed and replaced by the unified sentiment tracking system, which provides superior functionality:

**What was removed:**
- `core.enableCounting` setting - No longer needed
- `core.stringToCount` setting - Replaced by `polling.highlightGauge.stringToCount` in unified polling
- Legacy gauge components and display elements - Replaced by unified polling display
- `broadcastGaugeUpdate()` function - Functionality absorbed by unified polling
- `GaugeComponent` class - Replaced by sentiment tracking gauges

**Migration path for users:**
1. Old "Enable Message Counting" setting removed - functionality replaced by unified sentiment tracking
2. Old "Words/emotes to count" setting moved to "Unified Polling > Highlight Gauge Integration > Terms to Count"
3. Gauge styling settings maintained for compatibility with unified polling system
4. All gauge display functionality now handled by unified polling's sentiment tracking

**Benefits of new system:**
- More sophisticated sentiment analysis
- Customizable sentiment groups
- Better performance with unified processing
- Real-time sentiment tracking without manual activation
- Priority-based poll system for better user experience