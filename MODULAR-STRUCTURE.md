# Plus2 Modular Architecture

This document describes the new modular structure of the Plus2 browser extension.

## Structure Overview

The original monolithic `app.js` (3000+ lines) has been split into focused modules:

```
src/scripts/
├── app.js                     # Main entry point (200 lines)
├── app-original.js           # Backup of original file
├── platform-adapters/       # Platform-specific logic
│   ├── base.js              # Abstract base class
│   ├── twitch.js            # Twitch implementation
│   └── youtube.js           # YouTube implementation
├── message-processing.js     # Chat message processing
├── ui-injection.js          # Button/menu injection & docking
├── search-feature.js        # Twitch chat search
├── tooltip-handler.js       # Reply tooltips
└── auto-scroll.js           # Auto-resume scroll functionality
```

## Module Responsibilities

### Platform Adapters (`platform-adapters/`)
- **Base Adapter**: Abstract class defining common interface
- **Twitch Adapter**: Handles 7TV, FFZ, and standard Twitch selectors/extraction
- **YouTube Adapter**: YouTube-specific chat processing

**Key Methods:**
- `getSelectors()` - Platform-specific CSS selectors
- `extractMessageParts()` - Extract message data for highlighting
- `addHighlightButton()` - Add platform-appropriate UI button
- `shouldProcessOnThisPlatform()` - URL filtering logic

### Message Processing (`message-processing.js`)
- Processes existing and new chat messages
- Handles mod "post" command highlighting
- Manages processed message tracking (Set/WeakSet)
- Sends data to background script for counting/polling

### UI Injection (`ui-injection.js`)
- Popout button injection (Twitch chat input, YouTube header)
- Custom dropdown menu creation
- Docking/undocking functionality
- Options button injection
- Resize handles for docked view

### Search Feature (`search-feature.js`)
- Twitch-only chat search with Ctrl+F override
- Real-time filtering with debounced input
- Pruned message cache management
- Search result highlighting

### Tooltip Handler (`tooltip-handler.js`)
- Reply message tooltips on hover
- Smart positioning (above/below based on screen space)
- Platform-aware reply extraction (7TV vs standard)

### Auto Scroll (`auto-scroll.js`)
- Inactivity timer management
- Auto-resume scroll when chat pauses
- Handles both standard Twitch and 7TV buffer notices

## Benefits of Modular Structure

1. **Maintainability**: Each module has a single responsibility
2. **Testability**: Individual modules can be unit tested
3. **Platform Extensibility**: Easy to add new platforms
4. **Code Reuse**: Platform adapters share common interface
5. **Debugging**: Easier to isolate issues to specific modules

## Dependency Flow

```
app.js (main)
├── Creates platform adapter (Twitch/YouTube)
├── Initializes MessageProcessor(adapter, settings)
├── Initializes UIInjection(adapter, settings)
├── Initializes SearchFeature(adapter, settings)
├── Initializes TooltipHandler(adapter, settings)
└── Initializes AutoScroll(settings)
```

## Loading Order (manifest.json)

1. `browser-polyfill.min.js` - Cross-browser compatibility
2. `platform-adapters/base.js` - Base adapter class
3. `platform-adapters/twitch.js` - Twitch implementation
4. `platform-adapters/youtube.js` - YouTube implementation
5. `message-processing.js` - Message processing logic
6. `ui-injection.js` - UI components
7. `search-feature.js` - Search functionality
8. `tooltip-handler.js` - Tooltip system
9. `auto-scroll.js` - Scroll management
10. `app.js` - Main coordinator (loads last)

## Migration Notes

- Original `app.js` saved as `app-original.js`
- All functionality preserved in modular form
- Build system updated to include all modules
- No breaking changes to extension API
- Chrome build tested successfully

This modular architecture makes the codebase much more maintainable while preserving all existing functionality.