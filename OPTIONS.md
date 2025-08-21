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

## Yes/No Polling

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableYesNoPolling` | Boolean | `false` | Enable automatic yes/no polls based on chat responses |
| `pollActivityThreshold` | Number | `1` | Minimum new responses per check to keep poll active |
| `pollActivityCheckInterval` | Number | `2000` | Time in milliseconds between poll activity checks |
| `pollDisplayThreshold` | Number | `15` | Minimum total responses before showing poll results |
| `pollClearTime` | Number | `12000` | Time in milliseconds before clearing concluded poll |
| `pollCooldownDuration` | Number | `5000` | Cooldown period in milliseconds between polls |
| `yesPollBarColor` | String | `#ff0000` | Color for "Yes" responses in poll bar |
| `noPollBarColor` | String | `#0000ff` | Color for "No" responses in poll bar |
| `pollTextColor` | String | `#ffffff` | Color for poll text labels |

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

## Notes

- All color values accept standard CSS color formats (hex, rgb, rgba, named colors)
- Time values are in milliseconds unless otherwise specified  
- Boolean options can be toggled on/off in the Options interface
- Changes to most settings take effect immediately, though some may require a page refresh
- Settings are automatically synchronized across browser sessions when logged into Chrome/Firefox