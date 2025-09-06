# Plus 2 - Options Reference

This document provides a comprehensive overview of all configuration options available in Plus 2. These settings can be accessed through the extension's Options page.

## General Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `requiredUrlSubstring` | String | `""` | Filter to restrict extension activity to Twitch URLs containing this text (leave blank to run on all pages) |
| `enableReplyTooltip` | Boolean | `true` | Show tooltip with original message text when hovering over replies in Twitch chat |
| `inactivityTimeoutDuration` | Number | `5000` | Time in milliseconds before auto-resuming scroll when inactive (Twitch only) |
| `maxPrunedCacheSize` | Number | `500` | Maximum number of old chat messages to keep in memory for searching |
| `enableYouTube` | Boolean | `true` | Master toggle to enable/disable all Plus 2 features on YouTube Live |

## Popout Window Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `displayTime` | Number | `10000` | Duration in milliseconds that highlighted messages remain visible in popout |
| `appendMessages` | Boolean | `false` | Whether to stack multiple highlighted messages or replace them |
| `autoOpenPopout` | Boolean | `false` | Automatically open popout window when chat pages load |
| `popoutDefaultWidth` | Number | `600` | Default width of popout window in pixels |
| `popoutDefaultHeight` | Number | `300` | Default height of popout window in pixels |
| `popoutBaseFontSize` | Number | `18` | Base font size for popout content in pixels |

## Visual Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `chromaKeyColor` | String | `#b9e6b7` | Background color for popout window (for chroma keying in OBS) |
| `messageBGColor` | String | `#111111` | Background color for highlighted message containers |
| `enableUsernameColoring` | Boolean | `true` | Apply custom color to usernames in popout |
| `usernameDefaultColor` | String | `#FF0000` | Color for usernames when uniform coloring is enabled |
| `paragraphTextColor` | String | `#FFFFFF` | Color for message text in popout |

## Message Counting (Activity Gauge)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableCounting` | Boolean | `false` | Enable the chat activity gauge feature |
| `stringToCount` | String | `"+2, lol, lmao, lul, lmfao, dangLUL"` | Comma-separated list of terms/emotes to count |
| `exactMatchCounting` | Boolean | `false` | Whether to match whole words only or allow partial matches |
| `gaugeMaxValue` | Number | `30` | Maximum value on the gauge scale |
| `gaugeMinDisplayThreshold` | Number | `3` | Minimum count before gauge becomes visible |
| `decayInterval` | Number | `500` | Time in milliseconds between gauge decay ticks |
| `decayAmount` | Number | `1` | Amount to decrease gauge by on each decay tick |
| `recentMaxResetDelay` | Number | `2000` | Delay before resetting peak indicator when gauge reaches zero |

## Gauge Visual Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gaugeTrackColor` | String | `#e0e0e0` | Color of the gauge background track |
| `gaugeTrackAlpha` | Number | `0` | Opacity of gauge background (0-1) |
| `gaugeTrackBorderAlpha` | Number | `1` | Opacity of gauge border (0-1) |
| `gaugeTrackBorderColor` | String | `#505050` | Color of gauge border |
| `gaugeFillGradientStartColor` | String | `#ffd700` | Starting color of gauge fill gradient |
| `gaugeFillGradientEndColor` | String | `#ff0000` | Ending color of gauge fill gradient |
| `recentMaxIndicatorColor` | String | `#ff0000` | Color of the peak value indicator |

## Gauge Labels

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `peakLabelLow` | String | `"Heh"` | Text displayed for low activity levels |
| `peakLabelMid` | String | `"Funny!"` | Text displayed for medium activity levels |
| `peakLabelHigh` | String | `"Hilarious!!"` | Text displayed for high activity levels |
| `peakLabelMax` | String | `"OFF THE CHARTS!!!"` | Text displayed for maximum activity levels |
| `peakLabelLowColor` | String | `#ffffff` | Color for low activity label |
| `peakLabelMidColor` | String | `#ffff00` | Color for medium activity label |
| `peakLabelHighColor` | String | `#ffa500` | Color for high activity label |
| `peakLabelMaxColor` | String | `#ff0000` | Color for maximum activity label |
| `enablePeakLabelAnimation` | Boolean | `true` | Enable animation effects for peak labels |
| `peakLabelAnimationDuration` | Number | `0.6` | Duration of label animations in seconds |
| `peakLabelAnimationIntensity` | Number | `2` | Intensity multiplier for label animations |

## Unified Polling System

The unified polling system automatically detects and displays yes/no polls, number polls, letter polls, and sentiment tracking.

### General Configuration
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `polling.unified.enabled` | Boolean | `true` | Enable the unified polling system |
| `polling.unified.lookbackWindow` | Number | `10000` | Time window in ms to analyze messages for polls |
| `polling.unified.resultDisplayTime` | Number | `15000` | How long to show poll results |
| `polling.unified.cooldownDuration` | Number | `8000` | Cooldown between polls |

### Poll Type Configuration
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `polling.unifiedPolling.yesno.enabled` | Boolean | `true` | Enable yes/no polls |
| `polling.unifiedPolling.yesno.activationThreshold` | Number | `3` | Minimum responses to start yes/no poll |
| `polling.unifiedPolling.numbers.enabled` | Boolean | `true` | Enable number polls |
| `polling.unifiedPolling.numbers.activationThreshold` | Number | `7` | Minimum responses to start number poll |
| `polling.unifiedPolling.letters.enabled` | Boolean | `true` | Enable letter polls |
| `polling.unifiedPolling.letters.activationThreshold` | Number | `10` | Minimum total responses to start letter poll |
| `polling.unifiedPolling.letters.individualThreshold` | Number | `3` | Minimum responses per letter (2+ letters must meet this) |
| `polling.unifiedPolling.sentiment.enabled` | Boolean | `true` | Enable sentiment tracking |
| `polling.unifiedPolling.sentiment.activationThreshold` | Number | `15` | Minimum responses to display sentiment |

## Highlight Tracking & Leaderboard

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableHighlightTracking` | Boolean | `false` | Track highlighted messages for leaderboard and data export |
| `enableLeaderboard` | Boolean | `false` | Show leaderboard in popout when no messages are displayed |
| `leaderboardHighlightValue` | Number | `10` | Point value assigned to each message highlight |
| `leaderboardTimeWindowDays` | Number | `7` | Number of days to include in leaderboard calculations |
| `leaderboardHeaderText` | String | `"Leaderboard"` | Header text displayed above the leaderboard |
| `leaderboardBackgroundColor` | String | `#000000` | Background color for leaderboard display |
| `leaderboardBackgroundAlpha` | Number | `0` | Opacity of leaderboard background (0-1) |
| `leaderboardTextColor` | String | `#FFFFFF` | Text color for leaderboard entries |

## Moderation Features

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableModPostReplyHighlight` | Boolean | `true` | Automatically highlight messages when moderators reply with "post" |

## Compatibility

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enable7TVCompat` | Boolean | `false` | Enable compatibility mode for 7TV browser extension |

## StreamView Integration

StreamView provides an advanced web-based interface for creating and managing sophisticated browser source configurations. This integration extends Plus 2's capabilities significantly.

### Browser Source Configuration
- **Advanced Element Positioning**: Drag-and-drop interface for precise element placement
- **Live Preview**: Real-time preview of all elements with visual feedback
- **Zoom Controls**: 25%-300% zoom with precise positioning (zoom controls are UI-only and don't save configuration)
- **Canvas Outline**: Visual boundary indicators for accurate element positioning
- **Individual Element Control**: Configure messages, gauge, polls, and leaderboard independently

### Template System
Templates allow you to save, load, and share complete StreamView configurations:

**Storage Architecture:**
- Templates are stored individually (not as a single large object) to avoid browser extension storage quota limits
- Each template uses a unique storage key: `streamview_template_[sanitized_name]`
- Template index maintained separately for efficient listing
- Automatic cleanup and synchronization across browser sessions

**Template Operations:**
- **Save**: `saveCurrentConfigAsTemplate()` - Creates new template from current StreamView configuration
- **Load**: `loadTemplateToCurrentView()` - Applies template to active StreamView
- **Delete**: `deleteTemplate()` - Removes template with confirmation dialog
- **Automatic Refresh**: UI updates automatically when templates change (no manual refresh needed)

**Security Features:**
- Duplicate template name protection with overwrite confirmation
- Execution guards prevent race conditions during save operations
- Proper error handling and cleanup for all operations

### Preview Features
- **Drag Functionality**: Elements can be repositioned by dragging in the live preview
- **Zoom-Aware Dragging**: Drag calculations account for zoom level and scroll position
- **Element Selection**: Click elements to automatically switch to their configuration tab
- **Visual Feedback**: Selected elements are highlighted with primary color borders
- **Leaderboard Preview**: Shows 3 items instead of 5 for cleaner preview display

### Technical Implementation
- **Quota Management**: Individual template storage prevents browser extension storage limits (102,400 bytes per item)
- **Race Condition Prevention**: Function execution guards prevent duplicate saves
- **Storage Change Listeners**: Automatic UI updates when templates are modified
- **Error Handling**: Comprehensive error handling with user feedback via toast notifications

## Notes

- All color values accept standard CSS color formats (hex, rgb, rgba, named colors)
- Time values are in milliseconds unless otherwise specified  
- Boolean options can be toggled on/off in the Options interface
- Changes to most settings take effect immediately, though some may require a page refresh
- Settings are automatically synchronized across browser sessions when logged into Chrome/Firefox