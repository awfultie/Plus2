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
    gaugeMinDisplayThreshold: 3
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

    // Enforce mutual exclusivity between compatibility modes
    handleCompatibilityToggles();

    // Update all visual previews
    updateAllPreviews(options);
  }

  function saveOptions() {
    const optionsToSave = {};
    Object.keys(defaultOptions).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        if (element.type === 'checkbox') {
          optionsToSave[key] = element.checked;
        } else if (element.type === 'number' || element.type === 'range') {
          optionsToSave[key] = parseFloat(element.value);
        } else {
          optionsToSave[key] = element.value;
        }
      }
    });
    
    const selectedDockingRadio = document.querySelector('input[name="dockingBehavior"]:checked');
    optionsToSave.dockingBehavior = selectedDockingRadio ? selectedDockingRadio.value : 'none';

    // Special handling for leaderboard dependency
    optionsToSave.enableLeaderboard = enableHighlightTrackingInput.checked && enableLeaderboardInput.checked;

    browser.storage.sync.set(optionsToSave).then(() => {
      showStatus('Options saved!');
      if (browser.runtime && browser.runtime.id) {
        browser.runtime.sendMessage({ type: 'SETTINGS_UPDATED' }).catch(error => {
          console.log("Could not message background script. Error: ", error.message);
        });
      }
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

  // Live preview listeners
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', () => {
      const currentOptions = {};
      Object.keys(defaultOptions).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
          if (element.type === 'checkbox') currentOptions[key] = element.checked;
          else if (element.type === 'number' || element.type === 'range') currentOptions[key] = parseFloat(element.value);
          else currentOptions[key] = element.value;
        }
      });
      // Correctly read the value of the selected radio button for live updates.
      const selectedDockingRadio = document.querySelector('input[name="dockingBehavior"]:checked');
      currentOptions.dockingBehavior = selectedDockingRadio ? selectedDockingRadio.value : defaultOptions.dockingBehavior;

      populateForm(currentOptions); // This re-populates and updates previews
    });
  });

  // --- Data Management Logic ---
  exportButton.addEventListener('click', () => {
    browser.storage.sync.get(Object.keys(defaultOptions)).then(settings => {
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
  browser.storage.sync.get(defaultOptions).then(populateForm);
});
