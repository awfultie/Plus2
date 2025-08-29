document.addEventListener('DOMContentLoaded', () => {
  // --- Sidebar Navigation Logic ---
  const navLinks = document.querySelectorAll('.options-nav .nav-link');
  const panels = document.querySelectorAll('.options-panel');
  const optionsNavMenu = document.getElementById('options-nav-menu');

  function showPanel(targetId) {
    panels.forEach(panel => panel.classList.remove('active'));
    navLinks.forEach(link => link.classList.remove('active'));

    const targetPanel = document.getElementById(targetId);
    const targetLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);

    if (targetPanel) targetPanel.classList.add('active');
    if (targetLink) targetLink.classList.add('active');
    
    // Use session storage to remember the active tab during the session
    sessionStorage.setItem('activeOptionsPanel', targetId);
  }

  if (optionsNavMenu) {
    optionsNavMenu.addEventListener('click', (e) => {
      e.preventDefault();
      const target = e.target.closest('.nav-link');
      if (target && target.dataset.target) {
        showPanel(target.dataset.target);
      }
    });
  }

  // Restore the last active panel on page load, or default to the first one
  const lastActivePanel = sessionStorage.getItem('activeOptionsPanel') || (navLinks.length > 0 ? navLinks[0].dataset.target : 'panel-general');
  showPanel(lastActivePanel);

  // --- Element References ---
  const statusEl = document.getElementById('status');
  const displayTimeInput = document.getElementById('displayTime');
  const requiredUrlSubstringInput = document.getElementById('requiredUrlSubstring');
  const chromaKeyColorInput = document.getElementById('chromaKeyColor');
  const messageBGColorInput = document.getElementById('messageBGColor');
  const appendMessagesInput = document.getElementById('appendMessages');
  const stringToCountInput = document.getElementById('stringToCount');
  const decayIntervalInput = document.getElementById('decayInterval');
  const decayAmountInput = document.getElementById('decayAmount');
  const gaugeMaxValueInput = document.getElementById('gaugeMaxValue');
  const gaugeMinDisplayThresholdInput = document.getElementById('gaugeMinDisplayThreshold');
  const exactMatchCountingInput = document.getElementById('exactMatchCounting');
  const enableCountingInput = document.getElementById('enableCounting');
  const peakLabelLowInput = document.getElementById('peakLabelLow');
  const peakLabelMidInput = document.getElementById('peakLabelMid');
  const peakLabelHighInput = document.getElementById('peakLabelHigh');
  const peakLabelMaxInput = document.getElementById('peakLabelMax');
  const recentMaxResetDelayInput = document.getElementById('recentMaxResetDelay');
  const enable7TVCompatInput = document.getElementById('enable7TVCompat');
  const enableFrankerFaceZCompatInput = document.getElementById('enableFrankerFaceZCompat');
  const enableYouTubeInput = document.getElementById('enableYouTube');
  const ffzDisabledNote = document.getElementById('ffzDisabledNote');
  const enableModPostReplyHighlightInput = document.getElementById('enableModPostReplyHighlight');
  const enableUsernameColoringInput = document.getElementById('enableUsernameColoring');
  const usernameDefaultColorInput = document.getElementById('usernameDefaultColor');
  const paragraphTextColorInput = document.getElementById('paragraphTextColor');
  const enableReplyTooltipInput = document.getElementById('enableReplyTooltip');
  const popoutDefaultWidthInput = document.getElementById('popoutDefaultWidth');
  const popoutDefaultHeightInput = document.getElementById('popoutDefaultHeight');
  const autoOpenPopoutInput = document.getElementById('autoOpenPopout');
  const popoutBaseFontSizeInput = document.getElementById('popoutBaseFontSize');
  const enableHighlightTrackingInput = document.getElementById('enableHighlightTracking');
  const enableLeaderboardInput = document.getElementById('enableLeaderboard');
  const leaderboardOptionsContainer = document.getElementById('leaderboardOptionsContainer');
  const leaderboardHighlightValueInput = document.getElementById('leaderboardHighlightValue');
  const leaderboardTimeWindowDaysInput = document.getElementById('leaderboardTimeWindowDays');
  const leaderboardHeaderText = document.getElementById('leaderboardHeaderText');
  const downloadHighlightLogButton = document.getElementById('downloadHighlightLog');
  const clearHighlightLogButton = document.getElementById('clearHighlightLog');
  const leaderboardBackgroundColorInput = document.getElementById('leaderboardBackgroundColor');
  const leaderboardBackgroundAlphaInput = document.getElementById('leaderboardBackgroundAlpha');
  const leaderboardBackgroundAlphaValue = document.getElementById('leaderboardBackgroundAlphaValue');
  const leaderboardTextColorInput = document.getElementById('leaderboardTextColor');
  const previewLeaderboardContainer = document.getElementById('previewLeaderboardContainer');
  const previewLeaderboardHeader = document.getElementById('previewLeaderboardHeader');
  const previewLeaderboardList = document.getElementById('previewLeaderboardList');
  const usernameColoringOptionsContainer = document.getElementById('usernameColoringOptionsContainer');
  const highlightTrackingOptionsContainer = document.getElementById('highlightTrackingOptionsContainer');
  const saveButton = document.getElementById('save');
  const resetButton = document.getElementById('resetToDefaults');
  const exportButton = document.getElementById('exportSettings');
  const importFileElement = document.getElementById('importSettingsFile');
  const countingOptionsContainer = document.getElementById('countingOptionsContainer');
  const enableYesNoPollingInput = document.getElementById('enableYesNoPolling');
  const pollClearTimeInput = document.getElementById('pollClearTime');
  const pollDisplayThresholdInput = document.getElementById('pollDisplayThreshold');
  const pollActivityThresholdInput = document.getElementById('pollActivityThreshold');
  const pollCooldownDurationInput = document.getElementById('pollCooldownDuration');
  const pollActivityCheckIntervalInput = document.getElementById('pollActivityCheckInterval');
  const maxPrunedCacheSizeInput = document.getElementById('maxPrunedCacheSize');
  const inactivityTimeoutDurationInput = document.getElementById('inactivityTimeoutDuration');
  const gaugeTrackColorInput = document.getElementById('gaugeTrackColor');
  const gaugeTrackAlphaInput = document.getElementById('gaugeTrackAlpha');
  const gaugeTrackAlphaValueDisplay = document.getElementById('gaugeTrackAlphaValue');
  const gaugeTrackBorderColorInput = document.getElementById('gaugeTrackBorderColor');
  const gaugeTrackBorderAlphaInput = document.getElementById('gaugeTrackBorderAlpha');
  const gaugeTrackBorderAlphaValueDisplay = document.getElementById('gaugeTrackBorderAlphaValue');
  const gaugeFillGradientStartColorInput = document.getElementById('gaugeFillGradientStartColor');
  const gaugeFillGradientEndColorInput = document.getElementById('gaugeFillGradientEndColor');
  const recentMaxIndicatorColorInput = document.getElementById('recentMaxIndicatorColor');
  const peakLabelLowColorInput = document.getElementById('peakLabelLowColor');
  const peakLabelMidColorInput = document.getElementById('peakLabelMidColor');
  const peakLabelHighColorInput = document.getElementById('peakLabelHighColor');
  const peakLabelMaxColorInput = document.getElementById('peakLabelMaxColor');
  const enablePeakLabelAnimationInput = document.getElementById('enablePeakLabelAnimation');
  const peakLabelAnimationDurationInput = document.getElementById('peakLabelAnimationDuration');
  const peakLabelAnimationDurationValueDisplay = document.getElementById('peakLabelAnimationDurationValue');
  const peakLabelAnimationIntensityInput = document.getElementById('peakLabelAnimationIntensity');
  const peakLabelAnimationIntensityValueDisplay = document.getElementById('peakLabelAnimationIntensityValue');
  const previewGaugeContainer = document.getElementById('previewGaugeContainer');
  const previewGaugeFill = document.getElementById('previewGaugeFill');
  const previewRecentMaxIndicator = document.getElementById('previewRecentMaxIndicator');
  const previewPeakLabelLow = document.getElementById('previewPeakLabelLow');
  const previewPeakLabelMid = document.getElementById('previewPeakLabelMid');
  const previewPeakLabelHigh = document.getElementById('previewPeakLabelHigh');
  const previewPeakLabelMax = document.getElementById('previewPeakLabelMax');
  const yesPollBarColorInput = document.getElementById('yesPollBarColor');
  const noPollBarColorInput = document.getElementById('noPollBarColor');
  const previewYesPollSegment = document.getElementById('previewYesPollSegment');
  const previewNoPollSegment = document.getElementById('previewNoPollSegment');
  const pollTextColorInput = document.getElementById('pollTextColor');
  const previewPollTextColor = document.getElementById('previewPollTextColor');
  const leaderboardPreviewSectionBackground = document.getElementById('leaderboardPreviewSectionBackground');
  const gaugePreviewSectionBackground = document.getElementById('gaugePreviewSectionBackground');
  const yesNoPollingOptionsContainer = document.getElementById('yesNoPollingOptionsContainer');
  const actionsMenuButton = document.getElementById('actionsMenuButton');
  const actionsMenu = document.getElementById('actionsMenu');
  // Webhook elements
  const enableWebhookIntegrationInput = document.getElementById('enableWebhookIntegration');
  const webhookEndpointInput = document.getElementById('webhookEndpoint');
  const webhookApiKeyInput = document.getElementById('webhookApiKey');
  const webhookTimeoutInput = document.getElementById('webhookTimeout');
  const webhookRetryAttemptsInput = document.getElementById('webhookRetryAttempts');
  const webhookChatMessagesInput = document.getElementById('webhookChatMessages');
  const webhookHighlightMessagesInput = document.getElementById('webhookHighlightMessages');
  const webhookGaugeUpdatesInput = document.getElementById('webhookGaugeUpdates');
  const webhookPollUpdatesInput = document.getElementById('webhookPollUpdates');
  const webhookLeaderboardUpdatesInput = document.getElementById('webhookLeaderboardUpdates');
  const webhookOptionsContainer = document.getElementById('webhookOptionsContainer');
  const testWebhookButton = document.getElementById('testWebhook');
  const testWebhookFormat = document.getElementById('testWebhookFormat');
  // Streamview elements
  const enableStreamviewInput = document.getElementById('enableStreamview');
  const streamviewBaseUrlInput = document.getElementById('streamviewBaseUrl');
  const streamviewApiKeyInput = document.getElementById('streamviewApiKey');
  const createStreamviewButton = document.getElementById('createStreamview');
  const streamviewOptionsContainer = document.getElementById('streamviewOptionsContainer');
  const copyViewUrlButton = document.getElementById('copyViewUrlButton');
  // Secret key management elements
  const streamviewSecretKeyInput = document.getElementById('streamviewSecretKey');
  const generateSecretKeyButton = document.getElementById('generateSecretKey');
  const showSecretKeyButton = document.getElementById('showSecretKey');
  const clearSecretKeyButton = document.getElementById('clearSecretKey');
  // Channel ID Override elements
  const enableChannelIdOverrideInput = document.getElementById('enableChannelIdOverride');
  const channelIdOverrideContainer = document.getElementById('channelIdOverrideContainer');
  const channelIdOverrideInput = document.getElementById('channelIdOverride');
  const applyChannelIdOverrideButton = document.getElementById('applyChannelIdOverride');

  const defaultOptions = {
    requiredUrlSubstring: "", displayTime: 10000, chromaKeyColor: '#b9e6b7', messageBGColor: '#111111', appendMessages: false,
    stringToCount: "+2, lol, lmao, lul, lmfao, dangLUL", decayInterval: 500, decayAmount: 1, exactMatchCounting: false,
    gaugeMaxValue: 30, enableCounting: false, dockingBehavior: 'none', dockedViewHeight: 250, peakLabelLow: "Heh", peakLabelMid: "Funny!", peakLabelHigh: "Hilarious!!",
    peakLabelMax: "OFF THE CHARTS!!!", recentMaxResetDelay: 2000, enable7TVCompat: false, enableFrankerFaceZCompat: false, enableYouTube: true,
    enableModPostReplyHighlight: true, enableYesNoPolling: false, pollClearTime: 12000, pollCooldownDuration: 5000,
    pollActivityThreshold: 1, pollActivityCheckInterval: 2000, pollDisplayThreshold: 15, inactivityTimeoutDuration: 5000,
    maxPrunedCacheSize: 500, gaugeTrackColor: '#e0e0e0', gaugeTrackAlpha: 0, gaugeTrackBorderAlpha: 1,
    gaugeTrackBorderColor: '#505050', gaugeFillGradientStartColor: '#ffd700', gaugeFillGradientEndColor: '#ff0000',
    recentMaxIndicatorColor: '#ff0000', peakLabelLowColor: '#ffffff', peakLabelMidColor: '#ffff00', peakLabelHighColor: '#ffa500',
    peakLabelMaxColor: '#ff0000', yesPollBarColor: '#ff0000', noPollBarColor: '#0000ff', pollTextColor: '#ffffff',
    enablePeakLabelAnimation: true, peakLabelAnimationDuration: 0.6, peakLabelAnimationIntensity: 2, enableUsernameColoring: true,
    usernameDefaultColor: '#FF0000', enableReplyTooltip: true, paragraphTextColor: '#FFFFFF', popoutDefaultWidth: 600,
    popoutDefaultHeight: 300, autoOpenPopout: false, popoutBaseFontSize: 18, enableHighlightTracking: false,
    enableLeaderboard: false, leaderboardHighlightValue: 10, leaderboardTimeWindowDays: 7, leaderboardHeaderText: 'Leaderboard',
    leaderboardBackgroundColor: '#000000', leaderboardBackgroundAlpha: 0, leaderboardTextColor: '#FFFFFF',
    gaugeMinDisplayThreshold: 3,
    // Webhook settings
    enableWebhookIntegration: false, webhookEndpoint: "", webhookApiKey: "", webhookTimeout: 5000, webhookRetryAttempts: 3,
    webhookEvents: { highlightMessages: true, gaugeUpdates: true, pollUpdates: true, leaderboardUpdates: true },
    // Streamview settings
    enableStreamview: false, streamviewBaseUrl: "https://streamview.channel", streamviewApiKey: "", currentStreamview: null,
    // Streamview security options
    streamviewGenerateApiKey: false,
    streamviewSecretKey: '',
    // StreamView template storage
    streamviewTemplates: {},
    // Browser Source Style settings
    browserSourceStyle: null
  };

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
  }

  function injectPreviewAnimationStyles(options) {
    const styleId = 'plus2PreviewAnimationStyles';
    let style = document.getElementById(styleId);
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
    }

    const intensity = options.peakLabelAnimationIntensity || 2;
    const duration = options.peakLabelAnimationDuration || 0.6;

    // Use a different class name to avoid any potential conflict with popout styles.
    style.textContent = `
    @keyframes plus2-options-vertical-shaking {
      0% { transform: translateY(-1px); }
      25% { transform: translateY(-${intensity}px); }
      50% { transform: translateY(-1px); }
      75% { transform: translateY(-${intensity}px); }
      100% { transform: translateY(-1px); }
    }
    .plus2-options-shake-animation {
      animation-name: plus2-options-vertical-shaking;
      animation-duration: ${duration}s;
      animation-iteration-count: infinite;
      animation-timing-function: ease-in-out;
    }
  `;
  }

  function showStatus(message, duration = 2000) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.opacity = 1;
    setTimeout(() => {
      statusEl.style.opacity = 0;
    }, duration);
  }

  // Ensures that FFZ compatibility is disabled if 7TV compatibility is enabled, as they are mutually exclusive.
  function handleCompatibilityToggles() {
    if (enableFrankerFaceZCompatInput) { // Check if the element exists
      if (enable7TVCompatInput.checked) {
        enableFrankerFaceZCompatInput.checked = false;
        enableFrankerFaceZCompatInput.disabled = true;
        if (ffzDisabledNote) ffzDisabledNote.style.display = 'block';
      } else {
        enableFrankerFaceZCompatInput.disabled = false;
        if (ffzDisabledNote) ffzDisabledNote.style.display = 'none';
      }
    }
  }

  function toggleSection(checkbox, container) {
    if (container) container.style.display = checkbox.checked ? 'block' : 'none';
  }

  function updateAllPreviews(options) {
    // Gauge Previews
    if (previewGaugeContainer) {
      const trackRgb = hexToRgb(options.gaugeTrackColor);
      if (trackRgb) previewGaugeContainer.style.backgroundColor = `rgba(${trackRgb.r}, ${trackRgb.g}, ${trackRgb.b}, ${options.gaugeTrackAlpha})`;
      const borderRgb = hexToRgb(options.gaugeTrackBorderColor);
      if (borderRgb) previewGaugeContainer.style.borderColor = `rgba(${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b}, ${options.gaugeTrackBorderAlpha})`;
    }
    if (previewGaugeFill) previewGaugeFill.style.background = `linear-gradient(to right, ${options.gaugeFillGradientStartColor}, ${options.gaugeFillGradientEndColor})`;
    if (previewRecentMaxIndicator) previewRecentMaxIndicator.style.backgroundColor = options.recentMaxIndicatorColor;
    if (previewPeakLabelLow) { previewPeakLabelLow.style.color = options.peakLabelLowColor; previewPeakLabelLow.textContent = options.peakLabelLow; }
    if (previewPeakLabelMid) { previewPeakLabelMid.style.color = options.peakLabelMidColor; previewPeakLabelMid.textContent = options.peakLabelMid; }
    if (previewPeakLabelHigh) { previewPeakLabelHigh.style.color = options.peakLabelHighColor; previewPeakLabelHigh.textContent = options.peakLabelHigh; }
    if (previewPeakLabelMax) {
      previewPeakLabelMax.style.color = options.peakLabelMaxColor;
      previewPeakLabelMax.textContent = options.peakLabelMax;
      if (options.enablePeakLabelAnimation) {
        injectPreviewAnimationStyles(options);
        previewPeakLabelMax.classList.add('plus2-options-shake-animation');
      } else {
        previewPeakLabelMax.classList.remove('plus2-options-shake-animation');
      }
    }
    if (gaugePreviewSectionBackground) gaugePreviewSectionBackground.style.backgroundColor = options.chromaKeyColor;

    // Polling Previews
    if (previewYesPollSegment) previewYesPollSegment.style.backgroundColor = options.yesPollBarColor;
    if (previewNoPollSegment) previewNoPollSegment.style.backgroundColor = options.noPollBarColor;
    if (previewPollTextColor) previewPollTextColor.style.color = options.pollTextColor;

    // Leaderboard Previews
    if (previewLeaderboardContainer) {
      const leaderRgb = hexToRgb(options.leaderboardBackgroundColor);
      if (leaderRgb) previewLeaderboardContainer.style.backgroundColor = `rgba(${leaderRgb.r}, ${leaderRgb.g}, ${leaderRgb.b}, ${options.leaderboardBackgroundAlpha})`;
    }
    if (previewLeaderboardHeader) {
      previewLeaderboardHeader.style.color = options.leaderboardTextColor;
      previewLeaderboardHeader.textContent = options.leaderboardHeaderText;
    }
    if (previewLeaderboardList) previewLeaderboardList.style.color = options.leaderboardTextColor;
    if (leaderboardPreviewSectionBackground) leaderboardPreviewSectionBackground.style.backgroundColor = options.chromaKeyColor;
  }

  function populateForm(options) {
    Object.keys(defaultOptions).forEach(key => {
      if (key === 'webhookEvents') return; // Handle webhookEvents separately
      
      const element = document.getElementById(key);
      if (!element) return;

      const value = options[key] !== undefined ? options[key] : defaultOptions[key];
      if (element.type === 'checkbox') {
        element.checked = value;
      } else if (element.type === 'range') {
        element.value = value;
        const valueDisplay = document.getElementById(`${key}Value`);
        if (valueDisplay) {
            if (key.includes('Duration')) valueDisplay.textContent = `${parseFloat(value).toFixed(1)}s`;
            else if (key.includes('Intensity')) valueDisplay.textContent = `-${parseInt(value, 10)}px`;
            else valueDisplay.textContent = parseFloat(value).toFixed(2);
        }
      } else {
        element.value = value;
      }
    });

    // Handle webhookEvents object separately
    const webhookEvents = options.webhookEvents || defaultOptions.webhookEvents;
    if (webhookChatMessagesInput) webhookChatMessagesInput.checked = webhookEvents.chatMessages;
    if (webhookHighlightMessagesInput) webhookHighlightMessagesInput.checked = webhookEvents.highlightMessages;
    if (webhookGaugeUpdatesInput) webhookGaugeUpdatesInput.checked = webhookEvents.gaugeUpdates;
    if (webhookPollUpdatesInput) webhookPollUpdatesInput.checked = webhookEvents.pollUpdates;
    if (webhookLeaderboardUpdatesInput) webhookLeaderboardUpdatesInput.checked = webhookEvents.leaderboardUpdates;

    // Handle radio buttons for dockingBehavior separately
    const dockingValue = options.dockingBehavior || defaultOptions.dockingBehavior;
    const radioToCheck = document.querySelector(`input[name="dockingBehavior"][value="${dockingValue}"]`);
    if (radioToCheck) {
        radioToCheck.checked = true;
    }

    // Toggle visibility of conditional sections
    toggleSection(enableCountingInput, countingOptionsContainer);
    toggleSection(enableYesNoPollingInput, yesNoPollingOptionsContainer);
    toggleSection(enableHighlightTrackingInput, highlightTrackingOptionsContainer);
    toggleSection(enableLeaderboardInput, leaderboardOptionsContainer);
    if (enableWebhookIntegrationInput && webhookOptionsContainer) {
      toggleSection(enableWebhookIntegrationInput, webhookOptionsContainer);
    }
    if (enableStreamviewInput && streamviewOptionsContainer) {
      toggleSection(enableStreamviewInput, streamviewOptionsContainer);
    }

    // Enforce mutual exclusivity between compatibility modes
    handleCompatibilityToggles();

    // Update all visual previews
    updateAllPreviews(options);
  }

  function saveOptions() {
    const optionsToSave = {};
    Object.keys(defaultOptions).forEach(key => {
      if (key === 'webhookEvents') return; // Handle webhookEvents separately
      
      const element = document.getElementById(key);
      if (element) {
        if (element.type === 'checkbox') {
          optionsToSave[key] = element.checked;
        } else if (typeof defaultOptions[key] === 'number') {
          const num = parseFloat(element.value);
          optionsToSave[key] = !isNaN(num) ? num : defaultOptions[key];
        } else {
          optionsToSave[key] = element.value;
        }
      }
    });
    
    // Handle webhookEvents object separately
    optionsToSave.webhookEvents = {
      chatMessages: webhookChatMessagesInput ? webhookChatMessagesInput.checked : defaultOptions.webhookEvents.chatMessages,
      highlightMessages: webhookHighlightMessagesInput ? webhookHighlightMessagesInput.checked : defaultOptions.webhookEvents.highlightMessages,
      gaugeUpdates: webhookGaugeUpdatesInput ? webhookGaugeUpdatesInput.checked : defaultOptions.webhookEvents.gaugeUpdates,
      pollUpdates: webhookPollUpdatesInput ? webhookPollUpdatesInput.checked : defaultOptions.webhookEvents.pollUpdates,
      leaderboardUpdates: webhookLeaderboardUpdatesInput ? webhookLeaderboardUpdatesInput.checked : defaultOptions.webhookEvents.leaderboardUpdates
    };
    
    const selectedDockingRadio = document.querySelector('input[name="dockingBehavior"]:checked');
    optionsToSave.dockingBehavior = selectedDockingRadio ? selectedDockingRadio.value : 'none';

    // Special handling for leaderboard dependency
    optionsToSave.enableLeaderboard = enableHighlightTrackingInput.checked && enableLeaderboardInput.checked;
    
    // Include browser source styling options
    if (window.browserSourceOptions) {
      // Validate and fix any invalid heights before saving
      const validatedBrowserSourceOptions = validateBrowserSourceOptions(window.browserSourceOptions);
      optionsToSave.browserSourceStyle = validatedBrowserSourceOptions;
    }

    // Preserve currentStreamview when saving options
    return browser.storage.sync.get(['currentStreamview']).then(({ currentStreamview }) => {
      if (currentStreamview) {
        optionsToSave.currentStreamview = currentStreamview;
      }
      return browser.storage.sync.set(optionsToSave);
    }).then(async () => {
      showStatus('Options saved!');
      if (browser.runtime && browser.runtime.id) {
        browser.runtime.sendMessage({ type: 'SETTINGS_UPDATED' }).catch(error => {
        });
      }

      // Auto-sync to streamview removed - browser source is now configured independently via web UI
    });
  }

  function resetToDefaults() {
    if (confirm("Are you sure you want to reset all options to their default values?")) {
      populateForm(defaultOptions);
      saveOptions();
      showStatus('Options have been reset to defaults!');
    }
  }

  // --- Event Listeners ---
  saveButton.addEventListener('click', saveOptions);
  resetButton.addEventListener('click', resetToDefaults);

  actionsMenuButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent the window click listener from closing it immediately
    actionsMenu.classList.toggle('show');
  });

  // Close the menu if the user clicks outside of it
  window.addEventListener('click', (e) => {
      if (!actionsMenu.contains(e.target) && !actionsMenuButton.contains(e.target)) {
          actionsMenu.classList.remove('show');
      }
  });

  enable7TVCompatInput.addEventListener('change', handleCompatibilityToggles);
  enableCountingInput.addEventListener('change', () => toggleSection(enableCountingInput, countingOptionsContainer));
  enableYesNoPollingInput.addEventListener('change', () => toggleSection(enableYesNoPollingInput, yesNoPollingOptionsContainer));
  enableHighlightTrackingInput.addEventListener('change', () => {
      toggleSection(enableHighlightTrackingInput, highlightTrackingOptionsContainer);
      // If tracking is disabled, leaderboard must also be disabled
      if (!enableHighlightTrackingInput.checked) {
          enableLeaderboardInput.checked = false;
          toggleSection(enableLeaderboardInput, leaderboardOptionsContainer);
      }
  });
  enableLeaderboardInput.addEventListener('change', () => toggleSection(enableLeaderboardInput, leaderboardOptionsContainer));
  if (enableWebhookIntegrationInput && webhookOptionsContainer) {
    enableWebhookIntegrationInput.addEventListener('change', () => toggleSection(enableWebhookIntegrationInput, webhookOptionsContainer));
  }
  if (enableStreamviewInput && streamviewOptionsContainer) {
    enableStreamviewInput.addEventListener('change', () => {
      toggleSection(enableStreamviewInput, streamviewOptionsContainer);
      if (enableStreamviewInput.checked) {
        loadActiveStreamview();
      }
    });
  }

  // Test webhook functionality
  if (testWebhookButton) {
    testWebhookButton.addEventListener('click', async () => {
      const endpoint = webhookEndpointInput.value.trim();
      const apiKey = webhookApiKeyInput.value.trim();
      const timeout = parseInt(webhookTimeoutInput.value, 10) || 5000;

      if (!endpoint) {
        alert('Please enter a webhook endpoint URL');
        return;
      }

      testWebhookButton.disabled = true;
      testWebhookButton.textContent = 'Testing...';

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;

        // Generate different payload formats based on selection
        const format = testWebhookFormat ? testWebhookFormat.value : 'plus2';
        let testPayload;

        switch (format) {
          case 'simple':
            // Test with a valid chat_message format
            testPayload = {
              type: 'message_event',
              event_type: 'chat_message',
              timestamp: new Date().toISOString(),
              platform: 'twitch',
              channel: 'test_channel',
              data: {
                text: 'Test message from Plus2 extension',
                images: [],
                isModPost: false,
                modReplyContent: null,
                username: 'plus2_test_user',
                badges: ['test'],
                platform_data: { test: true }
              }
            };
            break;
          case 'custom':
            // Test with a valid highlight_message format  
            testPayload = {
              type: 'message_event',
              event_type: 'highlight_message',
              timestamp: new Date().toISOString(),
              platform: 'youtube',
              channel: 'test_channel',
              data: {
                html: '<div class="test-message">Test highlight message</div>',
                id: 999999,
                isAppend: false,
                displayTime: 10000,
                username: 'plus2_test_user',
                badges: ['test'],
                messageBody: 'Test highlight message from Plus2',
                reply: '',
                isModPost: false
              }
            };
            break;
          case 'plus2':
          default:
            // Test with a valid gauge_update format
            testPayload = {
              type: 'message_event',
              event_type: 'gauge_update',
              timestamp: new Date().toISOString(),
              platform: 'twitch',
              channel: 'test_channel',
              data: {
                occurrenceCount: 5,
                gaugeMaxValue: 30,
                recentMaxValue: 8,
                isPollActive: false,
                peakLabels: {
                  low: { text: 'Heh', color: '#ffffff' },
                  mid: { text: 'Funny!', color: '#ffff00' },
                  high: { text: 'Hilarious!!', color: '#ffa500' },
                  max: { text: 'OFF THE CHARTS!!!', color: '#ff0000' }
                }
              }
            };
            break;
        }


        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(testPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          showStatus('✅ Webhook test successful!', 3000);
        } else {
          // Try to get the error message from the response
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorBody = await response.text();
            if (errorBody) {
              errorMessage += `: ${errorBody}`;
            }
          } catch (parseError) {
            // Ignore parsing errors for error responses
          }
          showStatus(`❌ Webhook test failed: ${errorMessage}`, 5000);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          showStatus('❌ Webhook test timed out', 3000);
        } else {
          showStatus(`❌ Webhook test failed: ${error.message}`, 3000);
        }
      } finally {
        testWebhookButton.disabled = false;
        testWebhookButton.textContent = 'Test Webhook';
      }
    });
  }

  // Streamview functionality
  async function createOrUpdateStreamview() {
    createStreamviewButton.disabled = true;
    createStreamviewButton.textContent = 'Creating...';

    try {
      // Save options first to ensure the background script has the latest settings.
      await saveOptions();

      // Check if we have an existing streamview to update
      const { currentStreamview } = await browser.storage.sync.get(['currentStreamview']);
      
      if (currentStreamview && currentStreamview.id) {
        // Show confirmation dialog for existing connection
        const confirmReplace = confirm(
          'Warning: You have an active browser source connection.\n\n' +
          'Creating a new browser source will replace your current connection and may break existing OBS scenes.\n\n' +
          'Do you want to continue?'
        );
        
        if (!confirmReplace) {
          createStreamviewButton.disabled = false;
          createStreamviewButton.textContent = 'Create Browser Source';
          return;
        }
      }
      
      // Always create new streamview (no updates needed since browser source is configured independently)
      {
        // Create new streamview
        const response = await browser.runtime.sendMessage({
          type: 'CREATE_STREAMVIEW'
        });

        if (response && response.success) {
          showStatus('✅ Browser source created successfully!', 3000);
          
          // Auto-uncheck the Generate API Key checkbox to prevent accidental regeneration
          const generateApiKeyCheckbox = document.getElementById('streamviewGenerateApiKey');
          if (generateApiKeyCheckbox && generateApiKeyCheckbox.checked) {
            generateApiKeyCheckbox.checked = false;
            // Save the updated setting
            await saveOptions();
          }
          
          // The actual API response is wrapped in response.data
          const apiData = response.data;
          
          if (!apiData || !apiData.id || !apiData.viewUrl || !apiData.webhookUrl) {
            showStatus('❌ Invalid response from server - missing URLs', 5000);
            return;
          }
          
          // Store the current streamview with all the URL information
          const streamviewData = {
            id: apiData.id,
            name: 'Browser Source', // Default name
            viewUrl: apiData.viewUrl,
            webhookUrl: apiData.webhookUrl,
            configUrl: apiData.configUrl
          };
          
          // Handle security data if present
          if (apiData.security) {
            // Store API key securely if generated
            if (apiData.security.apiKey) {
              streamviewData.apiKey = apiData.security.apiKey;
            }
            
            
            // Use protected view URL if available
            if (apiData.security.protectedViewUrl) {
              streamviewData.viewUrl = apiData.security.protectedViewUrl;
            }
            
            // Update webhook URL with authentication if API key was generated
            if (apiData.security.apiKey && apiData.webhookUrl) {
              streamviewData.webhookUrl = apiData.webhookUrl;
            }
          }
          
          await browser.storage.sync.set({
            currentStreamview: streamviewData
          });
          
          // Verify storage immediately after setting
          const verification = await browser.storage.sync.get(['currentStreamview']);
          
          // Force background script to reload settings with the new currentStreamview
          await browser.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
          
          await updateActiveStreamviewDisplay();
        } else {
          const errorMessage = response ? response.error : 'No response from background script';
          showStatus(`❌ Failed to create streamview: ${errorMessage || 'An unknown error occurred.'}`, 5000);
        }
      }
    } catch (error) {
      showStatus(`❌ Error: ${error.message}`, 5000);
    } finally {
      createStreamviewButton.disabled = false;
      createStreamviewButton.textContent = 'Create Browser Source';
    }
  }

  // Simplified - we only need to update the active streamview display
  async function loadActiveStreamview() {
    await updateActiveStreamviewDisplay();
  }

  async function updateActiveStreamviewDisplay() {
    const activeContainer = document.getElementById('activeStreamviewContainer');
    const noStreamviewMessage = document.getElementById('noStreamviewMessage');
    const { currentStreamview, webhookEvents } = await browser.storage.sync.get(['currentStreamview', 'webhookEvents']);
    

    if (currentStreamview && currentStreamview.id) {
        activeContainer.style.display = 'block';
        noStreamviewMessage.style.display = 'none';

        // Note: activeStreamviewName element doesn't exist in HTML - name is shown in the section header
        
        // Set URL values and log for debugging
        const viewUrlInput = document.getElementById('activeViewUrl');
        const webhookUrlInput = document.getElementById('activeWebhookUrl');
        
        if (viewUrlInput) {
            viewUrlInput.value = currentStreamview.viewUrl || '';
        } else {
        }
        
        if (webhookUrlInput) {
            webhookUrlInput.value = currentStreamview.webhookUrl || '';
        } else {
        }
        
        // Always show the copy button when there's an active streamview
        if (copyViewUrlButton) copyViewUrlButton.style.display = 'inline-block';
        
        const enabledFeatures = [];
        if (webhookEvents) {
            if (webhookEvents.highlightMessages) enabledFeatures.push('Highlights');
            if (webhookEvents.gaugeUpdates) enabledFeatures.push('Gauge');
            if (webhookEvents.pollUpdates) enabledFeatures.push('Polls');
            if (webhookEvents.leaderboardUpdates) enabledFeatures.push('Leaderboard');
        }
        const featuresListEl = document.getElementById('activeFeaturesList');
        featuresListEl.textContent = enabledFeatures.length > 0 ? enabledFeatures.join(', ') : 'None (check webhook settings)';
        
        // Update security status display
        const apiKeyStatusEl = document.getElementById('apiKeyStatus');
        const noSecurityStatusEl = document.getElementById('noSecurityStatus');
        
        const hasApiKey = currentStreamview.apiKey ? true : false;
        
        if (hasApiKey) {
            if (noSecurityStatusEl) noSecurityStatusEl.style.display = 'none';
            if (apiKeyStatusEl) apiKeyStatusEl.style.display = 'block';
        } else {
            if (noSecurityStatusEl) noSecurityStatusEl.style.display = 'block';
            if (apiKeyStatusEl) apiKeyStatusEl.style.display = 'none';
        }
    } else {
        activeContainer.style.display = 'none';
        noStreamviewMessage.style.display = 'block';
    }
  }

  function copyToClipboard(inputId) {
    const input = document.getElementById(inputId);
    input.select();
    document.execCommand('copy');
    showStatus('✅ URL copied to clipboard!', 2000);
  }

  // Helper functions for browser source configuration
  function getActiveStreamviewId() {
    return new Promise((resolve) => {
      browser.storage.sync.get(['currentStreamview']).then((result) => {
        const { currentStreamview } = result;
        resolve(currentStreamview && currentStreamview.id ? currentStreamview.id : null);
      });
    });
  }

  function getStreamviewBaseUrl() {
    const baseUrlInput = document.getElementById('streamviewBaseUrl');
    return baseUrlInput ? baseUrlInput.value : 'https://streamview.channel';
  }

  // Make functions available globally for inline event handlers
  window.copyToClipboard = copyToClipboard;

  if (createStreamviewButton) {
    createStreamviewButton.addEventListener('click', createOrUpdateStreamview);
  }

  if (copyViewUrlButton) {
    copyViewUrlButton.addEventListener('click', async () => {
        const input = document.getElementById('activeViewUrl');
        const urlToCopy = input.value;
        
        if (!urlToCopy) {
            showStatus('❌ No URL to copy. Please create a browser source first.', 3000);
            return;
        }
        
        try {
            // Use modern Clipboard API if available
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(urlToCopy);
            } else {
                // Fallback: temporarily show input, select, copy, then hide again
                const wasHidden = input.style.display === 'none';
                if (wasHidden) input.style.display = 'block';
                input.select();
                document.execCommand('copy');
                if (wasHidden) input.style.display = 'none';
            }
            showStatus('✅ View URL copied to clipboard!', 2000);
        } catch (error) {
            showStatus('❌ Failed to copy URL to clipboard', 3000);
        }
    });
  }

  // Secret key management event listeners
  if (generateSecretKeyButton) {
    generateSecretKeyButton.addEventListener('click', () => {
      const newSecret = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      streamviewSecretKeyInput.value = newSecret;
      streamviewSecretKeyInput.type = 'text'; // Show the generated key
      showStatus('✅ New secret key generated!', 2000);
      // Auto-save the new secret key
      saveOptions({ streamviewSecretKey: newSecret });
    });
  }

  if (showSecretKeyButton) {
    showSecretKeyButton.addEventListener('click', () => {
      if (streamviewSecretKeyInput.type === 'password') {
        streamviewSecretKeyInput.type = 'text';
        showSecretKeyButton.textContent = 'Hide Key';
      } else {
        streamviewSecretKeyInput.type = 'password';
        showSecretKeyButton.textContent = 'Show Key';
      }
    });
  }

  if (clearSecretKeyButton) {
    clearSecretKeyButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your secret key? You will lose access to any protected StreamViews.')) {
        streamviewSecretKeyInput.value = '';
        showStatus('🗑️ Secret key cleared', 2000);
        // Auto-save the cleared secret key
        saveOptions({ streamviewSecretKey: '' });
      }
    });
  }

  if (streamviewSecretKeyInput) {
    streamviewSecretKeyInput.addEventListener('input', () => {
      // Auto-save secret key changes
      saveOptions({ streamviewSecretKey: streamviewSecretKeyInput.value });
    });
  }

  // Template Manager Functions
  async function saveCurrentConfigAsTemplate() {
    const templateNameInput = document.getElementById('templateName');
    const templateName = templateNameInput?.value?.trim();
    
    if (!templateName) {
      showStatus('❌ Please enter a template name', 3000);
      return;
    }
    
    // Prevent duplicate execution
    if (saveCurrentConfigAsTemplate.isRunning) {
      return;
    }
    saveCurrentConfigAsTemplate.isRunning = true;
    
    try {
      // Get current streamview configuration
      const { currentStreamview } = await browser.storage.sync.get(['currentStreamview']);
      if (!currentStreamview || !currentStreamview.id) {
        showStatus('❌ No active StreamView to save as template', 3000);
        saveCurrentConfigAsTemplate.isRunning = false;
        return;
      }
      
      // Fetch current StreamView configuration
      const streamviewBaseUrl = getStreamviewBaseUrl();
      
      // Build headers - include secret key if available
      const headers = {};
      const { streamviewSecretKey } = await browser.storage.sync.get(['streamviewSecretKey']);
      if (streamviewSecretKey) {
        headers['x-secret-key'] = streamviewSecretKey;
      }
      
      const response = await fetch(`${streamviewBaseUrl}/api/streamview/${currentStreamview.id}`, { headers });
      const data = await response.json();
      
      if (data.status !== 'success') {
        showStatus('❌ Failed to fetch current StreamView configuration', 3000);
        saveCurrentConfigAsTemplate.isRunning = false;
        return;
      }
      
      // Check if template already exists
      const { streamviewTemplateIndex = [] } = await browser.storage.sync.get(['streamviewTemplateIndex']);
      const templateKey = `streamview_template_${templateName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      if (streamviewTemplateIndex.includes(templateName)) {
        const overwrite = confirm(`Template "${templateName}" already exists. Do you want to overwrite it?`);
        if (!overwrite) {
          saveCurrentConfigAsTemplate.isRunning = false;
          return;
        }
      }
      
      // Store individual template with a unique key to avoid quota limits
      const templateData = {
        name: templateName,
        configuration: data.configuration,
        createdAt: new Date().toISOString(),
        createdFrom: currentStreamview.id
      };
      
      // Save individual template
      await browser.storage.sync.set({ [templateKey]: templateData });
      
      // Update template index (list of template names) only if it's a new template
      if (!streamviewTemplateIndex.includes(templateName)) {
        streamviewTemplateIndex.push(templateName);
        await browser.storage.sync.set({ streamviewTemplateIndex });
      }
      
      // Clear the input (list will refresh automatically via storage change listener)
      if (templateNameInput) templateNameInput.value = '';
      
      showStatus(`✅ Template "${templateName}" saved successfully!`, 3000);
      
    } catch (error) {
      console.error('Error saving template:', error);
      showStatus(`❌ Error saving template: ${error.message}`, 5000);
    } finally {
      // Reset the running flag
      saveCurrentConfigAsTemplate.isRunning = false;
    }
  }
  
  async function refreshTemplatesList() {
    const templatesListEl = document.getElementById('templatesList');
    
    if (!templatesListEl) return;
    
    try {
      // Get template index (list of template names)
      const { streamviewTemplateIndex = [] } = await browser.storage.sync.get(['streamviewTemplateIndex']);
      const templateNames = streamviewTemplateIndex;
      
      if (templateNames.length === 0) {
        templatesListEl.innerHTML = '<div style="color: #666; font-style: italic;">No templates saved yet</div>';
        return;
      }
      
      // Build templates list
      templatesListEl.innerHTML = ''; // Clear existing content
      
      // Fetch all templates
      const templateKeys = templateNames.map(name => `streamview_template_${name.replace(/[^a-zA-Z0-9]/g, '_')}`);
      const templatesData = await browser.storage.sync.get(templateKeys);
      
      templateNames.forEach(templateName => {
        const templateKey = `streamview_template_${templateName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const template = templatesData[templateKey];
        
        if (!template) return; // Skip if template not found
        
        const createdDate = new Date(template.createdAt).toLocaleDateString();
        
        // Create template item element
        const templateItem = document.createElement('div');
        templateItem.className = 'template-item';
        templateItem.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #ddd;';
        
        // Create template info section
        const templateInfo = document.createElement('div');
        templateInfo.innerHTML = `
          <strong>${templateName}</strong>
          <div style="font-size: 0.8em; color: #666;">Created: ${createdDate}</div>
        `;
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = 'display: flex; gap: 5px;';
        
        // Create load button
        const loadButton = document.createElement('button');
        loadButton.textContent = 'Load to Current View';
        loadButton.style.cssText = 'background-color: #4CAF50; padding: 4px 8px; font-size: 0.8em; color: white; border: none; border-radius: 3px; cursor: pointer;';
        loadButton.addEventListener('click', () => loadTemplateToCurrentView(templateName));
        
        // Create delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.style.cssText = 'background-color: #f44336; padding: 4px 8px; font-size: 0.8em; color: white; border: none; border-radius: 3px; cursor: pointer;';
        deleteButton.addEventListener('click', () => deleteTemplate(templateName));
        
        // Assemble the template item
        buttonsContainer.appendChild(loadButton);
        buttonsContainer.appendChild(deleteButton);
        templateItem.appendChild(templateInfo);
        templateItem.appendChild(buttonsContainer);
        templatesListEl.appendChild(templateItem);
      });
      
    } catch (error) {
      console.error('Error refreshing templates list:', error);
      templatesListEl.innerHTML = '<div style="color: #f44336;">Error loading templates</div>';
    }
  }
  
  async function loadTemplateToCurrentView(templateName) {
    try {
      const { currentStreamview } = await browser.storage.sync.get(['currentStreamview']);
      if (!currentStreamview || !currentStreamview.id) {
        showStatus('❌ No active StreamView to load template into', 3000);
        return;
      }
      
      // Load individual template
      const templateKey = `streamview_template_${templateName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const { [templateKey]: template } = await browser.storage.sync.get([templateKey]);
      
      if (!template) {
        showStatus(`❌ Template "${templateName}" not found`, 3000);
        return;
      }
      
      const confirmLoad = confirm(
        `Load Template Confirmation\n\n` +
        `This will replace the current configuration of StreamView "${currentStreamview.id}" with the template "${templateName}".\n\n` +
        `This action cannot be undone. Continue?`
      );
      
      if (!confirmLoad) return;
      
      // Apply template via StreamView Plus2 API endpoint
      const streamviewBaseUrl = getStreamviewBaseUrl();
      
      // Build headers - include secret key if available
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add secret key header if stored in localStorage
      const { streamviewSecretKey } = await browser.storage.sync.get(['streamviewSecretKey']);
      if (streamviewSecretKey) {
        headers['x-secret-key'] = streamviewSecretKey;
      }
      
      const response = await fetch(`${streamviewBaseUrl}/api/templates/plus2`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          streamviewId: currentStreamview.id,
          templateName: templateName,
          configuration: template.configuration,
          apiKey: currentStreamview.apiKey || undefined,
          templateMetadata: {
            name: template.name,
            createdAt: template.createdAt,
            createdFrom: template.createdFrom
          }
        })
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        showStatus(`✅ Template "${templateName}" loaded successfully!`, 3000);
      } else {
        showStatus(`❌ Failed to load template: ${result.message}`, 5000);
      }
      
    } catch (error) {
      console.error('Error loading template:', error);
      showStatus(`❌ Error loading template: ${error.message}`, 5000);
    }
  }
  
  async function deleteTemplate(templateName) {
    // Enhanced confirmation dialog
    const confirmDelete = confirm(
      `⚠️ Delete Template Confirmation\n\n` +
      `Template: "${templateName}"\n\n` +
      `This will permanently delete this template from your Plus2 extension.\n` +
      `This action cannot be undone.\n\n` +
      `Are you sure you want to continue?`
    );
    
    if (!confirmDelete) return;
    
    try {
      // Find the delete button for this specific template
      const templateItems = document.querySelectorAll('.template-item');
      let deleteButton = null;
      let templateItem = null;
      
      for (const item of templateItems) {
        const nameElement = item.querySelector('strong');
        if (nameElement && nameElement.textContent === templateName) {
          templateItem = item;
          deleteButton = item.querySelector('button[style*="background-color: #f44336"]');
          break;
        }
      }
      
      // Show loading state on the delete button
      if (deleteButton) {
        deleteButton.textContent = 'Deleting...';
        deleteButton.disabled = true;
        deleteButton.style.opacity = '0.6';
      }
      
      // Remove individual template
      const templateKey = `streamview_template_${templateName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await browser.storage.sync.remove([templateKey]);
      
      // Update template index
      const { streamviewTemplateIndex = [] } = await browser.storage.sync.get(['streamviewTemplateIndex']);
      const updatedIndex = streamviewTemplateIndex.filter(name => name !== templateName);
      await browser.storage.sync.set({ streamviewTemplateIndex: updatedIndex });
      
      // Remove the template item from the DOM immediately (real-time update)
      if (templateItem) {
        // Fade out animation before removal
        templateItem.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        templateItem.style.opacity = '0';
        templateItem.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
          templateItem.remove();
          
          // Check if this was the last template and show "no templates" message
          const remainingItems = document.querySelectorAll('.template-item');
          if (remainingItems.length === 0) {
            const templatesListEl = document.getElementById('templatesList');
            if (templatesListEl) {
              templatesListEl.innerHTML = '<div style="color: #666; font-style: italic;">No templates saved yet</div>';
            }
          }
        }, 300);
      }
      
      showStatus(`✅ Template "${templateName}" deleted successfully`, 3000);
      
    } catch (error) {
      console.error('Error deleting template:', error);
      showStatus(`❌ Error deleting template: ${error.message}`, 5000);
      
      // Restore button state on error (find button again in case DOM changed)
      const templateItems = document.querySelectorAll('.template-item');
      for (const item of templateItems) {
        const nameElement = item.querySelector('strong');
        if (nameElement && nameElement.textContent === templateName) {
          const deleteButton = item.querySelector('button[style*="background-color: #f44336"]');
          if (deleteButton) {
            deleteButton.textContent = 'Delete';
            deleteButton.disabled = false;
            deleteButton.style.opacity = '1';
          }
          break;
        }
      }
    }
  }
  
  // Functions are now properly scoped and attached via addEventListener
  // No need for global window assignments

  // Browser Source Configuration button
  const openBrowserSourceConfigButton = document.getElementById('openBrowserSourceConfig');
  if (openBrowserSourceConfigButton) {
    openBrowserSourceConfigButton.addEventListener('click', async () => {
      const streamviewBaseUrl = getStreamviewBaseUrl();
      const activeStreamviewId = await getActiveStreamviewId();
      
      if (activeStreamviewId) {
        const configUrl = `${streamviewBaseUrl}/config/${activeStreamviewId}`;
        
        // Create tab and inject secret key into localStorage if available
        chrome.tabs.create({ url: configUrl }, (tab) => {
          // Get the current settings to check for secret key
          browser.storage.sync.get(['streamviewSecretKey']).then(({ streamviewSecretKey }) => {
            if (streamviewSecretKey && tab.id) {
              // Wait a moment for the tab to load, then inject the secret key
              setTimeout(() => {
                chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  func: (secretKey) => {
                    localStorage.setItem('streamviewSecretKey', secretKey);
                  },
                  args: [streamviewSecretKey]
                }).catch(error => {
                  console.log('Could not inject secret key:', error);
                });
              }, 1000);
            }
          });
        });
      } else {
        showStatus('❌ No active streamview found. Please create a streamview first.', 3000);
      }
    });
  }

  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('reveal-button')) {
        const targetId = e.target.dataset.target;
        const targetInput = document.getElementById(targetId);
        if (targetInput) {
            const isHidden = targetInput.style.display === 'none';
            targetInput.style.display = isHidden ? 'block' : 'none';
            e.target.textContent = isHidden ? 'Hide URL' : 'Show URL';
            // Always show the copy button regardless of URL visibility
            if (targetId === 'activeViewUrl') copyViewUrlButton.style.display = 'inline-block';
        }
    }
  });

  // Channel ID Override functionality
  if (enableChannelIdOverrideInput && channelIdOverrideContainer) {
    enableChannelIdOverrideInput.addEventListener('change', () => {
      channelIdOverrideContainer.style.display = enableChannelIdOverrideInput.checked ? 'block' : 'none';
    });
  }

  if (applyChannelIdOverrideButton) {
    applyChannelIdOverrideButton.addEventListener('click', () => {
      const channelId = channelIdOverrideInput ? channelIdOverrideInput.value.trim() : '';
      
      if (!channelId) {
        alert('Please enter a Channel ID');
        return;
      }
      
      const confirmApply = confirm(
        `Channel ID Override Confirmation\n\n` +
        `This will automatically populate the following URLs:\n` +
        `• Webhook URL: Will be set to send events for channel "${channelId}"\n` +
        `• View URL: Will be set to display overlay for channel "${channelId}"\n` +
        `• Config URL: Will be set to configure settings for channel "${channelId}"\n\n` +
        `This will override your current server settings. Do you want to continue?`
      );
      
      if (!confirmApply) {
        return;
      }
      
      // Apply the channel ID override by updating the base URL inputs
      const baseUrl = streamviewBaseUrlInput ? streamviewBaseUrlInput.value : 'https://streamview.channel';
      const webhookUrl = `${baseUrl}/api/webhook/plus2?channel=${channelId}`;
      const viewUrl = `${baseUrl}/view/${channelId}`;
      const configUrl = `${baseUrl}/config/${channelId}`;
      
      // Update the display elements
      if (document.getElementById('activeWebhookUrl')) {
        document.getElementById('activeWebhookUrl').value = webhookUrl;
      }
      if (document.getElementById('activeViewUrl')) {
        document.getElementById('activeViewUrl').value = viewUrl;
      }
      
      // Save the updated URLs to currentStreamview in storage
      browser.storage.sync.get(['currentStreamview']).then(({ currentStreamview }) => {
        if (currentStreamview) {
          currentStreamview.webhookUrl = webhookUrl;
          currentStreamview.viewUrl = viewUrl;
          currentStreamview.id = channelId; // Also update the ID to match the channel
          return browser.storage.sync.set({ currentStreamview });
        }
      }).then(() => {
        // Notify background script of settings update
        return browser.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
      }).catch(error => {
        console.error('Error applying channel ID override:', error);
        showStatus(`❌ Error applying override: ${error.message}`, 5000);
      });
      
      showStatus(`✅ Channel ID override applied for channel: ${channelId}`, 3000);
    });
  }

  // Template Manager Event Listeners
  const saveAsTemplateButton = document.getElementById('saveAsTemplate');
  if (saveAsTemplateButton) {
    saveAsTemplateButton.addEventListener('click', saveCurrentConfigAsTemplate);
  }

  
  // Also refresh when streamview settings might have changed
  if (typeof browser !== 'undefined' && browser.storage) {
    browser.storage.onChanged.addListener((changes) => {
      if (changes.streamviewTemplateIndex || changes.streamviewBaseUrl || Object.keys(changes).some(key => key.startsWith('streamview_template_'))) {
        refreshTemplatesList();
      }
    });
  }

  // Live preview listeners - use both 'input' and 'change' events
  document.querySelectorAll('input, select, textarea').forEach(el => {
    const handler = () => {
      const currentOptions = {};
      Object.keys(defaultOptions).forEach(key => {
        if (key === 'webhookEvents') return; // Handle webhookEvents separately
        
        const element = document.getElementById(key);
        if (element) {
          if (element.type === 'checkbox') currentOptions[key] = element.checked;
          else if (typeof defaultOptions[key] === 'number') {
            const num = parseFloat(element.value);
            currentOptions[key] = !isNaN(num) ? num : defaultOptions[key];
          } else currentOptions[key] = element.value;
        }
      });

      // Handle webhookEvents object separately for live preview
      currentOptions.webhookEvents = {
        chatMessages: webhookChatMessagesInput ? webhookChatMessagesInput.checked : defaultOptions.webhookEvents.chatMessages,
        highlightMessages: webhookHighlightMessagesInput ? webhookHighlightMessagesInput.checked : defaultOptions.webhookEvents.highlightMessages,
        gaugeUpdates: webhookGaugeUpdatesInput ? webhookGaugeUpdatesInput.checked : defaultOptions.webhookEvents.gaugeUpdates,
        pollUpdates: webhookPollUpdatesInput ? webhookPollUpdatesInput.checked : defaultOptions.webhookEvents.pollUpdates,
        leaderboardUpdates: webhookLeaderboardUpdatesInput ? webhookLeaderboardUpdatesInput.checked : defaultOptions.webhookEvents.leaderboardUpdates
      };

      // Correctly read the value of the selected radio button for live updates.
      const selectedDockingRadio = document.querySelector('input[name="dockingBehavior"]:checked');
      currentOptions.dockingBehavior = selectedDockingRadio ? selectedDockingRadio.value : defaultOptions.dockingBehavior;

      populateForm(currentOptions); // This re-populates and updates previews
    };
    
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  });

  // --- Data Management Logic ---
  exportButton.addEventListener('click', () => {
    const keysToExport = [...Object.keys(defaultOptions)];
    browser.storage.sync.get(keysToExport).then(settings => {
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plus2-settings.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  importFileElement.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target.result);
        if (typeof importedSettings === 'object' && importedSettings !== null) {
          populateForm(importedSettings);
          saveOptions();
          showStatus('Settings imported successfully!');
        } else {
          alert('Error: Invalid settings file format.');
        }
      } catch (error) {
        alert('Error: Could not parse settings file.');
      } finally {
        event.target.value = null;
      }
    };
    reader.readAsText(file);
  });

  downloadHighlightLogButton.addEventListener('click', () => {
    browser.storage.local.get({ highlightLog: [] }).then(data => {
      if (!data || !data.highlightLog || data.highlightLog.length === 0) {
        alert('Highlight log is empty.');
        return;
      }
      const header = 'Timestamp,Channel,Username,PlusTwoCount\n';
      const csvRows = data.highlightLog.map(entry => {
        const username = `"${(entry.username || 'unknown').replace(/"/g, '""')}"`;
        return `${entry.timestamp},${entry.channel || 'unknown'},${username},${entry.plusTwoCount !== undefined ? entry.plusTwoCount : 0}`;
      });
      const csvContent = header + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plus2-highlight-log.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  clearHighlightLogButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to permanently delete the entire highlight log? This cannot be undone.')) {
      browser.storage.local.set({ highlightLog: [] }).then(() => {
        alert('Highlight log has been cleared.');
      });
    }
  });

  // Initial load
  browser.storage.sync.get(defaultOptions).then(options => {
    populateForm(options);
    loadActiveStreamview(); // Always load streamview display regardless of enableStreamview setting
    initializeBrowserSourceStyle(options);
    
    // Initialize templates list on page load
    refreshTemplatesList();
  });

  // --- Browser Source Style Functionality ---
  let isDragging = false;
  let dragElement = null;
  let dragOffset = { x: 0, y: 0 };
  let currentAnchorPoint = null;

  function initializeBrowserSourceStyle(options) {
    const browserSourceOptions = options.browserSourceStyle || getDefaultBrowserSourceStyle();
    
    // Initialize UI elements
    setupAnchorPoints();
    loadBrowserSourceSettings(browserSourceOptions);
    setupBrowserSourceEventListeners();
    updatePreviewWindow();
    setBrowserSourceOptions(browserSourceOptions);
  }

  function getDefaultBrowserSourceStyle() {
    return {
      canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#00FF00',
        transparentBackground: true
      },
      elements: {
        messages: {
          x: 20, y: 20, width: 400, height: 100, zIndex: 30,
          anchor: 'top-left', visible: true,
          styles: {
            padding: '10px',
            backgroundColor: '#1D1D1F',
            color: '#FFFFFF',
            borderRadius: '4px',
            fontSize: '16px',
            lineHeight: '1.5',
            marginBottom: '5px'
          }
        },
        gauge: {
          x: 20, y: 500, width: 200, height: 50, zIndex: 20,
          anchor: 'bottom-left', visible: true,
          styles: {
            padding: '16px',
            boxSizing: 'border-box'
          }
        },
        poll: {
          x: 250, y: 500, width: 200, height: 60, zIndex: 20,
          anchor: 'bottom-left', visible: true,
          styles: {
            padding: '16px',
            margin: '16px 0',
            borderRadius: '8px',
            color: '#FFFFFF'
          }
        },
        leaderboard: {
          x: 550, y: 20, width: 200, height: 200, zIndex: 10,
          anchor: 'top-right', visible: true,
          styles: {
            padding: '16px',
            backgroundColor: 'rgba(29, 29, 31, 0.8)',
            borderRadius: '8px',
            color: '#FFFFFF',
            margin: '16px 0'
          }
        }
      }
    };
  }

  function setupAnchorPoints() {
    const anchorPoints = document.getElementById('anchorPoints');
    if (!anchorPoints) return;

    const positions = [
      { x: 0, y: 0, anchor: 'top-left' },
      { x: 50, y: 0, anchor: 'top-center' },
      { x: 100, y: 0, anchor: 'top-right' },
      { x: 0, y: 50, anchor: 'center-left' },
      { x: 50, y: 50, anchor: 'center-center' },
      { x: 100, y: 50, anchor: 'center-right' },
      { x: 0, y: 100, anchor: 'bottom-left' },
      { x: 50, y: 100, anchor: 'bottom-center' },
      { x: 100, y: 100, anchor: 'bottom-right' }
    ];

    anchorPoints.innerHTML = positions.map(pos => `
      <div class="anchor-point" 
           data-anchor="${pos.anchor}"
           style="left: ${pos.x}%; top: ${pos.y}%;">
      </div>
    `).join('');
  }

  function loadBrowserSourceSettings(browserSourceOptions) {
    // Load canvas settings
    const widthInput = document.getElementById('browserSourceWidth');
    const heightInput = document.getElementById('browserSourceHeight');
    const backgroundColorInput = document.getElementById('browserSourceBackgroundColor');
    const transparentBgInput = document.getElementById('browserSourceTransparentBg');

    if (widthInput) widthInput.value = browserSourceOptions.canvas.width;
    if (heightInput) heightInput.value = browserSourceOptions.canvas.height;
    if (backgroundColorInput) backgroundColorInput.value = browserSourceOptions.canvas.backgroundColor;
    if (transparentBgInput) transparentBgInput.checked = browserSourceOptions.canvas.transparentBackground;

    // Load element settings
    Object.entries(browserSourceOptions.elements).forEach(([elementId, elementConfig]) => {
      const visibleCheckbox = document.getElementById(`element-${elementId}-visible`);
      if (visibleCheckbox) visibleCheckbox.checked = elementConfig.visible;
    });
  }

  function setupBrowserSourceEventListeners() {
    // Canvas controls with auto-save
    ['browserSourceWidth', 'browserSourceHeight', 'browserSourceBackgroundColor', 'browserSourceTransparentBg'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('input', () => {
          updateCanvasSettings();
          updatePreviewWindow();
          autoSaveBrowserSourceStyles();
        });
      }
    });

    // Element selector dropdown
    const elementSelect = document.getElementById('elementSelect');
    if (elementSelect) {
      elementSelect.addEventListener('change', handleElementSelection);
    }

    // Position and style controls with auto-save
    ['elementX', 'elementY', 'elementWidth', 'elementHeight', 'elementZIndex', 'elementAnchor', 'elementVisible'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('input', () => {
          updateSelectedElementFromControls();
          autoSaveBrowserSourceStyles();
        });
      }
    });

    // Drag and drop functionality
    setupDragAndDrop();

    // Style controls with auto-save
    const formTab = document.getElementById('formTab');
    if (formTab) {
      formTab.addEventListener('input', () => {
        updateElementStylesFromForm();
        autoSaveBrowserSourceStyles();
      });
    }

    const rawCssEditor = document.getElementById('rawCssEditor');
    if (rawCssEditor) {
      rawCssEditor.addEventListener('input', debounce(() => {
        updateElementStylesFromRaw();
        autoSaveBrowserSourceStyles();
      }, 500));
    }

    // Style tabs
    const styleTabs = document.querySelectorAll('.style-tab');
    styleTabs.forEach(tab => {
      tab.addEventListener('click', () => switchStyleTab(tab.dataset.tab));
    });

    // Reset buttons
    const resetPositionsBtn = document.getElementById('resetElementPositions');
    if (resetPositionsBtn) {
      resetPositionsBtn.addEventListener('click', resetElementPositions);
    }

    const resetStyleBtn = document.getElementById('resetElementStyle');
    if (resetStyleBtn) {
      resetStyleBtn.addEventListener('click', resetCurrentElementStyles);
    }
  }

  // New functions for redesigned interface
  function updateCanvasSettings() {
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    const width = parseInt(document.getElementById('browserSourceWidth').value);
    const height = parseInt(document.getElementById('browserSourceHeight').value);
    const backgroundColor = document.getElementById('browserSourceBackgroundColor').value;
    const transparentBg = document.getElementById('browserSourceTransparentBg').checked;

    browserSourceOptions.canvas = {
      width,
      height,
      backgroundColor,
      transparentBackground: transparentBg
    };

    setBrowserSourceOptions(browserSourceOptions);
  }

  function handleElementSelection(event) {
    const elementId = event.target.value;
    const configPanel = document.getElementById('elementConfigurationPanel');
    
    if (elementId) {
      selectedElement = elementId;
      configPanel.style.display = 'block';
      loadElementConfiguration(elementId);
      selectPreviewElement(elementId);
    } else {
      selectedElement = null;
      configPanel.style.display = 'none';
      deselectAllElements();
    }
  }

  function loadElementConfiguration(elementId) {
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    const elementConfig = browserSourceOptions.elements[elementId];
    
    if (!elementConfig) return;

    // Update title
    document.getElementById('selectedElementTitle').textContent = `${capitalizeFirst(elementId)} Configuration`;
    
    // Load position and size values
    document.getElementById('elementX').value = elementConfig.x;
    document.getElementById('elementY').value = elementConfig.y;
    document.getElementById('elementWidth').value = elementConfig.width;
    document.getElementById('elementHeight').value = elementConfig.height;
    document.getElementById('elementZIndex').value = elementConfig.zIndex;
    document.getElementById('elementAnchor').value = elementConfig.anchor;
    document.getElementById('elementVisible').checked = elementConfig.visible;

    // Load style controls
    populateStyleFormControls(elementId, elementConfig.styles || {});
    
    // Load raw CSS
    const rawCssEditor = document.getElementById('rawCssEditor');
    if (rawCssEditor) {
      rawCssEditor.value = formatStylesAsCSS(elementConfig.styles || {});
    }
  }

  function setupDragAndDrop() {
    const previewWindow = document.getElementById('previewWindow');
    const previewElements = document.querySelectorAll('.preview-element');

    // Make elements draggable
    previewElements.forEach(element => {
      element.addEventListener('mousedown', startDrag);
    });

    // Global mouse handlers
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
  }

  function startDrag(event) {
    event.preventDefault();
    isDragging = true;
    dragElement = event.currentTarget;
    dragElement.classList.add('dragging');

    const elementId = dragElement.dataset.element;
    
    // Auto-select the element being dragged
    document.getElementById('elementSelect').value = elementId;
    handleElementSelection({ target: { value: elementId } });

    // Calculate offset from mouse to element top-left corner
    const rect = dragElement.getBoundingClientRect();
    const previewRect = document.getElementById('previewWindow').getBoundingClientRect();
    
    dragOffset.x = event.clientX - rect.left;
    dragOffset.y = event.clientY - rect.top;

    // Show anchor points
    showAnchorPoints();
  }

  function handleDrag(event) {
    if (!isDragging || !dragElement) return;

    const previewWindow = document.getElementById('previewWindow');
    const previewRect = previewWindow.getBoundingClientRect();
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    const canvas = browserSourceOptions.canvas;

    // Calculate new position relative to preview window
    const mouseX = event.clientX - previewRect.left - dragOffset.x;
    const mouseY = event.clientY - previewRect.top - dragOffset.y;

    // Convert to canvas coordinates
    const scaleX = canvas.width / previewRect.width;
    const scaleY = canvas.height / previewRect.height;
    
    const canvasX = mouseX * scaleX;
    const canvasY = mouseY * scaleY;

    // Check for anchor point snapping
    const anchorPoint = getClosestAnchorPoint(event.clientX, event.clientY);
    if (anchorPoint) {
      highlightAnchorPoint(anchorPoint);
      currentAnchorPoint = anchorPoint;
    } else {
      clearAnchorPointHighlights();
      currentAnchorPoint = null;
    }

    // Update element position in real-time
    const elementId = dragElement.dataset.element;
    updateElementPositionFromDrag(elementId, canvasX, canvasY);
  }

  function stopDrag(event) {
    if (!isDragging) return;

    isDragging = false;
    
    if (dragElement) {
      dragElement.classList.remove('dragging');
      
      // Apply anchor point if snapped
      if (currentAnchorPoint) {
        const elementId = dragElement.dataset.element;
        applyAnchorPointToElement(elementId, currentAnchorPoint);
      }
      
      dragElement = null;
    }

    currentAnchorPoint = null;
    hideAnchorPoints();
    clearAnchorPointHighlights();
    
    // Auto-save changes
    autoSaveBrowserSourceStyles();
  }

  // Anchor point helper functions
  function showAnchorPoints() {
    const anchorPoints = document.querySelectorAll('.anchor-point');
    anchorPoints.forEach(point => {
      point.style.opacity = '1';
    });
  }

  function hideAnchorPoints() {
    const anchorPoints = document.querySelectorAll('.anchor-point');
    anchorPoints.forEach(point => {
      point.style.opacity = '0';
    });
  }

  function highlightAnchorPoint(anchorPoint) {
    clearAnchorPointHighlights();
    anchorPoint.classList.add('active');
  }

  function clearAnchorPointHighlights() {
    const anchorPoints = document.querySelectorAll('.anchor-point');
    anchorPoints.forEach(point => {
      point.classList.remove('active');
    });
  }

  function getClosestAnchorPoint(mouseX, mouseY) {
    const anchorPoints = document.querySelectorAll('.anchor-point');
    let closest = null;
    let minDistance = 30; // Snap distance in pixels

    anchorPoints.forEach(point => {
      const rect = point.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distance = Math.sqrt(
        Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closest = point;
      }
    });

    return closest;
  }

  function applyAnchorPointToElement(elementId, anchorPoint) {
    const anchorType = anchorPoint.dataset.anchor;
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    const elementConfig = browserSourceOptions.elements[elementId];
    const canvas = browserSourceOptions.canvas;

    // Calculate anchor position in canvas coordinates
    let anchorX, anchorY;
    
    switch (anchorType) {
      case 'top-left': anchorX = 0; anchorY = 0; break;
      case 'top-center': anchorX = canvas.width / 2; anchorY = 0; break;
      case 'top-right': anchorX = canvas.width; anchorY = 0; break;
      case 'center-left': anchorX = 0; anchorY = canvas.height / 2; break;
      case 'center-center': anchorX = canvas.width / 2; anchorY = canvas.height / 2; break;
      case 'center-right': anchorX = canvas.width; anchorY = canvas.height / 2; break;
      case 'bottom-left': anchorX = 0; anchorY = canvas.height; break;
      case 'bottom-center': anchorX = canvas.width / 2; anchorY = canvas.height; break;
      case 'bottom-right': anchorX = canvas.width; anchorY = canvas.height; break;
    }

    // Update element configuration
    elementConfig.anchor = anchorType;
    elementConfig.x = anchorX;
    elementConfig.y = anchorY;

    setBrowserSourceOptions(browserSourceOptions);
    
    // Update form controls
    if (selectedElement === elementId) {
      document.getElementById('elementAnchor').value = anchorType;
      document.getElementById('elementX').value = anchorX;
      document.getElementById('elementY').value = anchorY;
    }

    updatePreviewWindow();
  }

  function updateElementPositionFromDrag(elementId, x, y) {
    // Update the visual position immediately for smooth dragging
    const previewElement = document.getElementById(`preview-${elementId}`);
    if (previewElement) {
      const browserSourceOptions = getCurrentBrowserSourceOptions();
      const canvas = browserSourceOptions.canvas;
      const previewWindow = document.getElementById('previewWindow');
      const previewRect = previewWindow.getBoundingClientRect();
      
      // Convert canvas coordinates to preview percentages
      const leftPercent = (x / canvas.width) * 100;
      const topPercent = (y / canvas.height) * 100;
      
      previewElement.style.left = `${leftPercent}%`;
      previewElement.style.top = `${topPercent}%`;
    }

    // Update the configuration (will be saved on drag end)
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    browserSourceOptions.elements[elementId].x = Math.max(0, x);
    browserSourceOptions.elements[elementId].y = Math.max(0, y);
    setBrowserSourceOptions(browserSourceOptions);

    // Update form fields if this element is selected
    if (selectedElement === elementId) {
      document.getElementById('elementX').value = Math.round(Math.max(0, x));
      document.getElementById('elementY').value = Math.round(Math.max(0, y));
    }
  }

  function selectPreviewElement(elementId) {
    selectedElement = elementId;
    
    // Update preview element selections
    document.querySelectorAll('.preview-element').forEach(element => {
      element.classList.toggle('selected', element.dataset.element === elementId);
    });
  }

  function deselectAllElements() {
    document.querySelectorAll('.preview-element').forEach(element => {
      element.classList.remove('selected');
    });
  }

  function loadElementPositionControls(elementId) {
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    const elementConfig = browserSourceOptions.elements[elementId];
    
    if (!elementConfig) return;

    document.getElementById('selectedElementName').textContent = capitalizeFirst(elementId);
    document.getElementById('elementX').value = elementConfig.x;
    document.getElementById('elementY').value = elementConfig.y;
    document.getElementById('elementWidth').value = elementConfig.width;
    document.getElementById('elementHeight').value = elementConfig.height;
    document.getElementById('elementZIndex').value = elementConfig.zIndex;
    document.getElementById('elementAnchor').value = elementConfig.anchor;
    document.getElementById('elementVisible').checked = elementConfig.visible;
  }

  function updateSelectedElementFromControls() {
    if (!selectedElement) return;

    const x = parseInt(document.getElementById('elementX').value);
    const y = parseInt(document.getElementById('elementY').value);
    const width = parseInt(document.getElementById('elementWidth').value);
    const height = parseInt(document.getElementById('elementHeight').value);
    const zIndex = parseInt(document.getElementById('elementZIndex').value);
    const anchor = document.getElementById('elementAnchor').value;
    const visible = document.getElementById('elementVisible').checked;

    updateElementPosition(selectedElement, { x, y, width, height, zIndex, anchor, visible });
    updatePreviewWindow();
  }

  function updateElementPosition(elementId, position) {
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    browserSourceOptions.elements[elementId] = {
      ...browserSourceOptions.elements[elementId],
      ...position
    };
    
    // Update temporary storage (will be saved when user clicks save)
    setBrowserSourceOptions(browserSourceOptions);
  }

  // Style updating functions
  function updateElementStylesFromForm() {
    if (!selectedElement) return;

    const formInputs = document.querySelectorAll('#cssPropertyGroups input[data-property]');
    const styles = {};
    
    formInputs.forEach(input => {
      if (input.value) {
        styles[input.dataset.property] = input.value;
      }
    });

    // Update element configuration
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    browserSourceOptions.elements[selectedElement].styles = styles;
    setBrowserSourceOptions(browserSourceOptions);

    // Update raw CSS editor
    const rawCssEditor = document.getElementById('rawCssEditor');
    if (rawCssEditor) {
      rawCssEditor.value = formatStylesAsCSS(styles);
    }

    updatePreviewWindow();
  }

  function updateElementStylesFromRaw() {
    if (!selectedElement) return;

    const rawCssEditor = document.getElementById('rawCssEditor');
    if (!rawCssEditor || !rawCssEditor.value.trim()) return;

    try {
      const styles = parseCSS(rawCssEditor.value);
      
      // Update element configuration
      const browserSourceOptions = getCurrentBrowserSourceOptions();
      browserSourceOptions.elements[selectedElement].styles = styles;
      setBrowserSourceOptions(browserSourceOptions);

      // Update form controls
      populateStyleFormControls(selectedElement, styles);
      
      updatePreviewWindow();
    } catch (e) {
    }
  }

  function resetCurrentElementStyles() {
    if (!selectedElement) return;

    const defaultStyles = getDefaultBrowserSourceStyle().elements[selectedElement]?.styles || {};
    
    // Update element configuration
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    browserSourceOptions.elements[selectedElement].styles = defaultStyles;
    setBrowserSourceOptions(browserSourceOptions);

    // Update UI
    populateStyleFormControls(selectedElement, defaultStyles);
    const rawCssEditor = document.getElementById('rawCssEditor');
    if (rawCssEditor) {
      rawCssEditor.value = formatStylesAsCSS(defaultStyles);
    }
    
    updatePreviewWindow();
    autoSaveBrowserSourceStyles();
  }

  // Auto-save function
  function autoSaveBrowserSourceStyles() {
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    
    // Save to browser storage
    browser.storage.sync.get(defaultOptions).then(currentOptions => {
      const updatedOptions = {
        ...currentOptions,
        browserSourceStyle: browserSourceOptions
      };
      
      return browser.storage.sync.set(updatedOptions);
    }).then(() => {
      // Optionally show a subtle save indicator
    }).catch(error => {
    });
  }

  // Debounce function for performance
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function updatePreviewWindow() {
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    const previewWindow = document.getElementById('previewWindow');
    
    if (!previewWindow) return;

    const canvas = browserSourceOptions.canvas;
    
    // Update preview window size to maintain aspect ratio
    const aspectRatio = canvas.width / canvas.height;
    const maxWidth = 800; // Maximum preview width
    const maxHeight = 600; // Maximum preview height
    
    let previewWidth, previewHeight;
    
    if (aspectRatio > maxWidth / maxHeight) {
      // Width is constraining factor
      previewWidth = Math.min(maxWidth, canvas.width);
      previewHeight = previewWidth / aspectRatio;
    } else {
      // Height is constraining factor
      previewHeight = Math.min(maxHeight, canvas.height);
      previewWidth = previewHeight * aspectRatio;
    }
    
    previewWindow.style.width = `${previewWidth}px`;
    previewWindow.style.height = `${previewHeight}px`;

    // Update background
    previewWindow.style.background = canvas.transparentBackground ? 
      `repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px` : 
      canvas.backgroundColor;

    // Update element positions and styles
    Object.entries(browserSourceOptions.elements).forEach(([elementId, config]) => {
      const previewElement = document.getElementById(`preview-${elementId}`);
      if (!previewElement) return;

      // Calculate position based on anchor
      const { x: finalX, y: finalY } = calculateAnchoredPosition(
        config.x, config.y, config.width, config.height, 
        config.anchor, canvas.width, canvas.height
      );

      previewElement.style.left = `${(finalX / canvas.width) * 100}%`;
      previewElement.style.top = `${(finalY / canvas.height) * 100}%`;
      previewElement.style.width = `${(config.width / canvas.width) * 100}%`;
      previewElement.style.height = `${(config.height / canvas.height) * 100}%`;
      previewElement.style.zIndex = config.zIndex;
      previewElement.style.display = config.visible ? 'block' : 'none';

      // Apply custom styles if they exist
      if (config.styles) {
        const childElement = previewElement.firstElementChild;
        if (childElement) {
          Object.entries(config.styles).forEach(([prop, value]) => {
            childElement.style[prop] = value;
          });
        }
      }
    });
  }

  function calculateAnchoredPosition(x, y, width, height, anchor, canvasWidth, canvasHeight) {
    let finalX = x;
    let finalY = y;

    // Adjust X position based on anchor
    if (anchor.includes('center')) {
      finalX = x - (width / 2);
    } else if (anchor.includes('right')) {
      finalX = canvasWidth - x - width;
    }

    // Adjust Y position based on anchor
    if (anchor.includes('center')) {
      finalY = y - (height / 2);
    } else if (anchor.includes('bottom')) {
      finalY = canvasHeight - y - height;
    }

    return { x: Math.max(0, finalX), y: Math.max(0, finalY) };
  }

  function setupStyleModalEventListeners() {
    const styleModal = document.getElementById('styleModal');
    const openStyleModalBtn = document.getElementById('openStyleModal');
    const closeStyleModalBtn = document.getElementById('closeStyleModal');
    const applyStyleBtn = document.getElementById('applyElementStyle');
    const resetStyleBtn = document.getElementById('resetElementStyle');

    if (openStyleModalBtn) {
      openStyleModalBtn.addEventListener('click', openStyleModal);
    }

    if (closeStyleModalBtn) {
      closeStyleModalBtn.addEventListener('click', closeStyleModal);
    }

    if (styleModal) {
      styleModal.addEventListener('click', (e) => {
        if (e.target === styleModal) closeStyleModal();
      });
    }

    if (applyStyleBtn) {
      applyStyleBtn.addEventListener('click', applyElementStyles);
    }

    if (resetStyleBtn) {
      resetStyleBtn.addEventListener('click', resetElementStyles);
    }

    // Tab switching
    const styleTabs = document.querySelectorAll('.style-tab');
    styleTabs.forEach(tab => {
      tab.addEventListener('click', () => switchStyleTab(tab.dataset.tab));
    });
  }

  function openStyleModal() {
    if (!selectedElement) return;

    const modal = document.getElementById('styleModal');
    const modalTitle = document.getElementById('modalElementTitle');
    
    if (modalTitle) {
      modalTitle.textContent = `${capitalizeFirst(selectedElement)} Styling`;
    }

    populateStyleModal(selectedElement);
    modal.classList.add('show');
  }

  function closeStyleModal() {
    const modal = document.getElementById('styleModal');
    modal.classList.remove('show');
  }

  function switchStyleTab(tabName) {
    document.querySelectorAll('.style-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.style-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}Tab`);
    });
  }

  function populateStyleModal(elementId) {
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    const elementConfig = browserSourceOptions.elements[elementId];
    
    // Update preview
    updateModalElementPreview(elementId, elementConfig);
    
    // Populate form controls
    populateStyleFormControls(elementId, elementConfig.styles || {});
    
    // Populate raw CSS
    const rawCssEditor = document.getElementById('rawCssEditor');
    if (rawCssEditor) {
      rawCssEditor.value = formatStylesAsCSS(elementConfig.styles || {});
    }
  }

  function updateModalElementPreview(elementId, elementConfig) {
    const preview = document.getElementById('modalElementPreview');
    if (!preview) return;

    // Create a preview based on element type
    let previewHTML = '';
    switch (elementId) {
      case 'messages':
        previewHTML = `<div style="padding: 8px; background: rgba(17, 17, 17, 0.8); color: white; border-radius: 4px; font-size: 14px;">Sample message from viewer</div>`;
        break;
      case 'gauge':
        previewHTML = `
          <div style="width: 200px; height: 20px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden;">
            <div style="width: 60%; height: 100%; background: linear-gradient(to right, #70CBC0, #B19CD9);"></div>
          </div>`;
        break;
      case 'poll':
        previewHTML = `
          <div style="width: 180px; height: 25px; display: flex; border-radius: 4px; overflow: hidden;">
            <div style="width: 65%; background: #70CBC0; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white;">Yes 65%</div>
            <div style="width: 35%; background: #B19CD9; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white;">No 35%</div>
          </div>`;
        break;
      case 'leaderboard':
        previewHTML = `
          <div style="padding: 10px; background: rgba(29, 29, 31, 0.8); border-radius: 4px; color: white; font-size: 12px; min-width: 150px;">
            <div style="font-weight: bold; margin-bottom: 5px;">Top Plus2'ers</div>
            <div>1. ViewerOne - 150</div>
            <div>2. AnotherUser - 95</div>
          </div>`;
        break;
    }
    
    preview.innerHTML = previewHTML;
    
    // Apply custom styles
    if (elementConfig.styles) {
      const previewElement = preview.firstElementChild;
      if (previewElement) {
        Object.entries(elementConfig.styles).forEach(([prop, value]) => {
          previewElement.style[prop] = value;
        });
      }
    }
  }

  function populateStyleFormControls(elementId, styles) {
    const cssPropertyGroups = document.getElementById('cssPropertyGroups');
    if (!cssPropertyGroups) return;

    // Define common CSS properties grouped by category
    const propertyGroups = {
      'Layout & Positioning': ['width', 'height', 'padding', 'margin'],
      'Background & Border': ['backgroundColor', 'borderRadius', 'border', 'boxShadow'],
      'Typography': ['fontSize', 'fontWeight', 'color', 'textAlign', 'lineHeight'],
      'Effects': ['opacity', 'transform', 'filter', 'backdropFilter']
    };

    cssPropertyGroups.innerHTML = Object.entries(propertyGroups).map(([groupName, properties]) => `
      <div class="css-property-group">
        <h4>${groupName}</h4>
        ${properties.map(prop => createPropertyInput(prop, styles[prop] || '')).join('')}
      </div>
    `).join('');

    // Add event listeners to form inputs
    cssPropertyGroups.addEventListener('input', updateStylePreview);
  }

  function createPropertyInput(property, value) {
    const inputType = getInputTypeForProperty(property);
    const label = property.replace(/([A-Z])/g, ' $1').toLowerCase();
    
    return `
      <div class="css-input-row">
        <label>${label}:</label>
        <input type="${inputType}" data-property="${property}" value="${value}" />
      </div>
    `;
  }

  function getInputTypeForProperty(property) {
    if (property.includes('color') || property.includes('Color')) return 'color';
    if (property.includes('opacity')) return 'range';
    return 'text';
  }

  function updateStylePreview() {
    if (!selectedElement) return;

    const formInputs = document.querySelectorAll('#cssPropertyGroups input[data-property]');
    const styles = {};
    
    formInputs.forEach(input => {
      if (input.value) {
        styles[input.dataset.property] = input.value;
      }
    });

    // Update modal preview
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    const elementConfig = browserSourceOptions.elements[selectedElement];
    updateModalElementPreview(selectedElement, { ...elementConfig, styles });
  }

  function applyElementStyles() {
    if (!selectedElement) return;

    const formInputs = document.querySelectorAll('#cssPropertyGroups input[data-property]');
    const rawCssEditor = document.getElementById('rawCssEditor');
    
    let styles = {};

    // Get styles from form controls
    formInputs.forEach(input => {
      if (input.value) {
        styles[input.dataset.property] = input.value;
      }
    });

    // Parse raw CSS if present (overrides form controls)
    if (rawCssEditor && rawCssEditor.value.trim()) {
      try {
        const parsedStyles = parseCSS(rawCssEditor.value);
        styles = { ...styles, ...parsedStyles };
      } catch (e) {
        alert('Invalid CSS syntax in raw editor. Please fix and try again.');
        return;
      }
    }

    // Update element configuration
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    browserSourceOptions.elements[selectedElement].styles = styles;
    setBrowserSourceOptions(browserSourceOptions);

    // Update preview window
    updatePreviewWindow();
    
    // Close modal
    closeStyleModal();
  }

  function resetElementStyles() {
    if (!selectedElement) return;

    const defaultStyles = getDefaultBrowserSourceStyle().elements[selectedElement]?.styles || {};
    
    // Update element configuration
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    browserSourceOptions.elements[selectedElement].styles = defaultStyles;
    setBrowserSourceOptions(browserSourceOptions);

    // Refresh modal
    populateStyleModal(selectedElement);
    
    // Update preview window
    updatePreviewWindow();
  }

  function formatStylesAsCSS(styles) {
    return Object.entries(styles)
      .map(([prop, value]) => `${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
      .join('\n');
  }

  function parseCSS(cssText) {
    const styles = {};
    const rules = cssText.split(';').filter(rule => rule.trim());
    
    rules.forEach(rule => {
      const [prop, value] = rule.split(':').map(s => s.trim());
      if (prop && value) {
        // Convert kebab-case to camelCase
        const camelProp = prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styles[camelProp] = value;
      }
    });
    
    return styles;
  }

  function resetElementPositions() {
    if (!confirm('Reset all element positions to default? This will not affect custom styling.')) {
      return;
    }

    const defaultPositions = getDefaultBrowserSourceStyle();
    setBrowserSourceOptions(defaultPositions);
    loadBrowserSourceSettings(defaultPositions);
    updatePreviewWindow();
    
    if (selectedElement) {
      loadElementPositionControls(selectedElement);
    }
  }

  function saveBrowserSourceStyles() {
    const browserSourceOptions = getCurrentBrowserSourceOptions();
    
    // Save to browser storage
    browser.storage.sync.get(defaultOptions).then(currentOptions => {
      const updatedOptions = {
        ...currentOptions,
        browserSourceStyle: browserSourceOptions
      };
      
      return browser.storage.sync.set(updatedOptions);
    }).then(() => {
      showStatus('Browser Source styles saved successfully!');
    }).catch(error => {
      showStatus('Error saving styles. Please try again.');
    });
  }

  // Utility functions
  function getCurrentBrowserSourceOptions() {
    return window.browserSourceOptions || getDefaultBrowserSourceStyle();
  }

  function setBrowserSourceOptions(options) {
    window.browserSourceOptions = options;
  }

  function validateBrowserSourceOptions(browserSourceOptions) {
    if (!browserSourceOptions || !browserSourceOptions.elements) {
      return browserSourceOptions;
    }
    
    // Create a deep copy to avoid mutating the original
    const validated = JSON.parse(JSON.stringify(browserSourceOptions));
    
    // Ensure minimum height requirements (backend requires min 30px)
    Object.keys(validated.elements).forEach(elementKey => {
      const element = validated.elements[elementKey];
      if (element && typeof element.height === 'number' && element.height < 30) {
        element.height = 50; // Set to a reasonable default that meets requirements
      }
    });
    
    return validated;
  }

  function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function showStatus(message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.opacity = '1';
      setTimeout(() => {
        statusEl.style.opacity = '0';
      }, 3000);
    }
  }
});
