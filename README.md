# Plus 2 - Twitch Chat Enhancement Suite

**Version:** 3.0 | **Status:** Actively Developed

## Overview

Plus 2 is a browser extension designed to enhance the Twitch and YouTube Live chat experience with a variety of interactive and visual tools for streamers. Its core feature is a **dedicated popout window**. Because this is an extension popout and not a standard webpage, it must be captured using **Window Capture in OBS** (or similar software), not a Browser Source. This window can display highlighted messages, a dynamic chat activity gauge, live polls, and a commenter leaderboard.

This README provides an overview for developers interested in contributing to or experimenting with the project.

## Developer Setup

Follow these instructions to get a local development version of the extension running in your browser.

### Prerequisites
*   Node.js (v16 or later recommended)
*   npm (comes bundled with Node.js)

### Installation & Building

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/awfultie/Plus2.git
    ```

2.  **Install dependencies:**
    ```sh
    cd Plus2
    npm install
    ```

3.  **Build the extension:**
    The project uses a build script to create browser-specific packages from the `src` directory. The output is placed in the `dist/` folder.

    *   **To build for both Chrome and Firefox:**
        ```sh
        npm run build
        ```
    *   **To build for a specific browser:**
        ```sh
        npm run build:chrome
        npm run build:firefox
        ```

### Loading the Unpacked Extension

After building, you can load the extension directly into your browser for testing.

#### For Google Chrome (or other Chromium browsers):
1.  Open your browser and navigate to `chrome://extensions`.
2.  Enable the **Developer mode** toggle in the top-right corner.
3.  Click the **Load unpacked** button.
4.  In the file selection dialog, navigate to the project folder and select the `dist/chrome` directory.
5.  The "Plus 2" extension should now appear in your list of extensions and be active.

#### For Mozilla Firefox:
1.  Open your browser and navigate to `about:debugging#/runtime/this-firefox`.
2.  Click the **Load Temporary Add-on...** button.
3.  In the file selection dialog, navigate to the project's `dist` folder and select the generated `.zip` file (e.g., `plus2-firefox-v3.0.zip`).
4.  The extension will be loaded for the current browser session. It will be removed when you close Firefox, and you will need to reload it each time you restart the browser for development.

## Project Structure

*   `src/`: Contains all the source code for the extension, including JavaScript, HTML, CSS, and icons.
    *   `scripts/`: Core logic for the background service worker, content scripts, and UI pages.
    *   `ui/`: HTML and CSS files for the popup, options page, and OBS popout.
    *   `lib/`: Third-party libraries, like the browser polyfill.
*   `dist/`: The build output directory. This is where the browser-specific extension files are placed after running the build script. This directory is not tracked by Git.
*   `scripts/`: Contains the Node.js build script (`build.js`).
*   `manifest.json`: The base manifest file for the extension. The build script modifies it for each browser's specific requirements.

## Features

Here's a breakdown of the key features offered by Plus 2:

*   **Dedicated Popout for OBS:**
    *   All visual elements are rendered in a separate, clean popout window. This must be added to your scene using **Window Capture**, not a Browser Source.
    *   The background can be set to a chroma key color for easy keying in streaming software.
*   **Dockable View:**
    *   The popout view can be "docked" directly into the top of the chat column, either manually via the in-chat menu or automatically in popout chat windows.
*   **Message Highlighting:**
    *   In Twitch chat, hover over a message and click the Plus 2 icon to feature it in the popout window.
    *   Customize the display duration, message background color, and text colors.
    *   Option to append new highlighted messages or have them replace the current one.
*   **Highlight Tracking & Leaderboard:**
    *   When enabled, the extension logs every highlighted message.
    *   This data is stored locally and can be downloaded as a CSV file or cleared from the options page. The CSV contains `Timestamp`, `Channel`, `Username`, and `PlusTwoCount` columns.
    *   An optional leaderboard can be displayed in the popout, showing the top 3 commenters based on a configurable scoring system.
*   **Chat Message Counting Bar (Activity Gauge):**
    *   Tracks and visualizes the frequency of specified keywords or emotes in the popout window.
    *   Features a dynamic gauge bar, a "peak" indicator, and customizable text labels for different activity thresholds, with full color and animation control.
    *   Includes a decay mechanism and is highly configurable, from colors and text to sensitivity and decay rates.
*   **In-Chat Search (Twitch):**
    *   Overrides the browser's default find (`Ctrl+F` or `Cmd+F`) with a custom search bar.
    *   Filters the chat in real-time, hiding messages that don't match the search query.
    *   Searches against both the username and the message text.
    *   Searches through recently pruned messages as well as live chat.
*   **Moderator "Post" Reply Highlighting:**
    *   When a moderator replies to a message with the word "post", the extension automatically highlights the message they replied to in the popout window.
*   **Yes/No Polling:**
    *   Allows for quick Yes/No polls based on chat responses ("y", "yes", "n", "no").
    *   Displays results in the popout as a two-part bar showing the percentage of "Yes" vs. "No" responses.
    *   Highly configurable, including colors, display thresholds, and activity detection.
*   **Auto-Resume Scroll on Inactivity:**
    *   When you scroll up in Twitch chat, it typically pauses auto-scrolling.
    *   This feature automatically clicks the "Resume Scrolling" button if there's no user activity on the page (mouse movement, clicks, typing, scrolling) for a configurable duration.
*   **Reply Tooltip (Twitch):**
    *   Hover over a reply in Twitch chat to see a tooltip with the full text of the original message being replied to.
*   **In-Chat Quick Menu:**
    *   A new Plus 2 icon in the chat input area (Twitch) or header (YouTube) opens a convenient menu.
    *   Quickly open the popout, copy its URL for OBS, toggle the leaderboard, or access the main options page.
*   **Expanded YouTube Live Support:**
    *   Most features, including the OBS popout, message highlighting, and the activity gauge, are now fully functional on YouTube Live chat pages.
    *   Can be toggled on or off from the options page.
*   **7TV Compatibility Mode:**
    *   Provides compatibility with the popular 7TV browser extension, ensuring that Plus 2's features correctly interact with chats modified by 7TV.
*   **URL Filtering (Twitch):**
    *   Option to restrict the extension to only run on Twitch pages that contain specific text in their URL (e.g., your channel name), or run on all pages if left blank.
*   **Settings Import/Export:**
    *   Easily backup your personalized settings to a JSON file.
    *   Import settings from a file to quickly restore your configuration or share it.

## Configuration (Options Page)

To configure Plus 2, click its icon in your browser's toolbar and select "Options", or use the in-chat menu. The options page allows for deep customization of every feature.

The page is organized with a sidebar for easy navigation and includes live previews for the Gauge and Leaderboard to help you style them perfectly.

### General Settings:
*   **URL Filtering (Twitch):** Limit where the extension is active on Twitch.
*   **Enable Reply Tooltip (Twitch):** Toggle the hover-to-see-reply feature.
*   **Auto-Resume Scroll Timeout (Twitch):** Configure the inactivity timer for auto-scrolling.
*   **Chat Search History Size (Twitch):** Set how many old messages are kept for searching.
*   **YouTube Support:** A master toggle to enable or disable all features on YouTube.

### Popout Window:
*   **Message Display Time:** How long a highlighted message stays visible in the popout.
*   **Append Messages:** Choose to stack highlighted messages or replace them.
*   **Auto-Open Popout:** Automatically launch the popout window when a chat page loads.
*   **Auto-Docking Behavior:** Configure the popout view to automatically dock inside Twitch or YouTube's popout chat windows.
*   **Popout Window Settings:** Set the default width, height, and font size for the popout window.
*   **Message Colors:** Configure the chroma key background, message background, and text colors.

### Moderator Posting:
*   Toggle the "post" command feature for moderators.

### Highlight Tracking
*   Enable tracking, manage the log data (download/clear), and configure the leaderboard display and scoring.

### Chat Message Counting Bar:
*   Enable the gauge and configure everything from the terms it counts to its visual appearance and behavior.

### Yes No Polling:
*   Enable polling and set up its timing, thresholds, and colors.

### Compatibility Mode:
*   Check this if you use the 7TV browser extension.

## Contributing

Contributions are welcome! If you have a feature request, bug report, or want to contribute code, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the GNU General Public License v3.0. See the [COPYING](COPYING) file for the full license text.
