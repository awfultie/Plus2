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

## Development Notes

- Extension requires `storage`, `tabs`, `alarms`, and `scripting` permissions
- Targets `*://*.twitch.tv/*` and `*://*.youtube.com/*` hosts
- Uses browser polyfill for cross-browser compatibility
- Content Security Policy restricts script execution for security