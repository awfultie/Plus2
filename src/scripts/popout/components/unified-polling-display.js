// Unified Polling Display Component
// Handles display for all poll types (yes/no, numbers, letters, sentiment) in a consistent manner

/**
 * UnifiedPollingDisplayComponent - Single component for all poll types
 * Replaces the separate yes/no and generic polling display logic
 */
class UnifiedPollingDisplayComponent {
    constructor() {
        this.container = null;
        this.settings = {};
        this.sentimentTimestamps = new Map(); // Track last update time for each sentiment item
        this.cleanupInterval = null; // Cleanup timer reference
    }

    /**
     * Initialize with DOM container and settings
     */
    initialize(container, settings) {
        this.container = container;
        this.settings = settings;
        this.startSentimentCleanupTimer();
    }

    /**
     * Update settings when they change
     */
    updateSettings(newSettings) {
        this.settings = newSettings;
    }

    /**
     * Main update method - handles all unified poll types
     */
    updateUnifiedPollDisplay(unifiedPollData) {
        if (!this.container) return;
        
        const { shouldDisplay, isActive, isConcluded, pollType } = unifiedPollData;

        // Debug logging
        console.log('[Debug] Unified poll data:', {
            shouldDisplay,
            isActive,
            isConcluded,
            pollType,
            hasSentimentData: !!unifiedPollData.sentimentData,
            sentimentShouldDisplay: unifiedPollData.sentimentData?.shouldDisplay
        });

        // Only update display style when it actually changes
        const currentDisplay = this.container.style.display;
        const expectedDisplay = shouldDisplay ? 'block' : 'none';
        
        if (currentDisplay !== expectedDisplay) {
            this.container.style.display = expectedDisplay;
        }
        
        if (!shouldDisplay) {
            this.container.innerHTML = '';
            this.container.dataset.pollType = '';
            // Update positions when poll is hidden
            if (typeof window.updateContainerPositions === 'function') {
                setTimeout(() => window.updateContainerPositions(), 10);
            }
            return;
        }
        
        // Set poll type for positioning logic
        this.container.dataset.pollType = pollType || '';

        // Setup main container - always fits content with 10px padding from popout edges
        this.container.style.maxWidth = '100%';
        this.container.style.boxSizing = 'border-box';
        this.container.style.position = 'relative'; // Always relative, let external positioning handle placement
        this.container.style.backgroundColor = 'transparent'; // Always transparent for main container
        this.container.style.padding = '0'; // No padding on main container

        // Get or create title element
        let titleElement = this.container.querySelector('.unified-poll-title');
        if (!titleElement) {
            titleElement = document.createElement('div');
            titleElement.className = 'unified-poll-title';
            titleElement.style.cssText = 'font-weight: bold; margin-bottom: 8px; color: #fff; text-align: center; font-size: 14px; max-width: 100%; box-sizing: border-box;';
            this.container.appendChild(titleElement);
        }
        
        // Get or create content element
        let contentElement = this.container.querySelector('.unified-poll-content');
        if (!contentElement) {
            contentElement = document.createElement('div');
            contentElement.className = 'unified-poll-content';
            contentElement.style.cssText = 'color: #fff; max-width: 100%; box-sizing: border-box; overflow: hidden;';
            this.container.appendChild(contentElement);
        }

        // Route to appropriate renderer based on poll type and state
        // Priority: concluded polls first, then active, then sentiment
        let hasRenderedMainContent = false;

        if (isConcluded) {
            this.renderConcludedPoll(unifiedPollData, titleElement, contentElement);
            hasRenderedMainContent = true;
        } else if (isActive) {
            this.renderActivePoll(unifiedPollData, titleElement, contentElement);
            hasRenderedMainContent = true;
        }

        // Sentiment tracking logic - show below yes/no polls, hide for other active poll types
        
        // Show sentiment gauges when:
        // 1. No active poll is running, OR
        // 2. Yes/no poll is active (sentiment appears below yes/no)
        // BUT NOT when number/letter polls are active (they hide sentiment)
        const shouldShowSentiment = unifiedPollData.sentimentData?.shouldDisplay && 
            (!hasRenderedMainContent || (isActive && pollType === 'yesno'));
            
        

        // Handle sentiment gauges - these can appear alongside yes/no polls or standalone
        if (shouldShowSentiment) {
            this.renderSentimentGauges(unifiedPollData.sentimentData, contentElement, isActive && pollType === 'yesno');
            
            // Mark that we have content to display
            if (!hasRenderedMainContent) {
                hasRenderedMainContent = true;
            }
        } else {
            // If sentiment shouldn't show, make sure to clean up any existing gauges
            this.hideAllSentimentGauges();
        }
        

        // Handle layout for specific poll types
        if (pollType === 'yesno') {
            // Yes/no polls: create their own container that doesn't take height when inactive
            this.setupYesNoPollContainer(titleElement, contentElement);
        } else if (pollType === 'numbers' || pollType === 'letters') {
            // Letter/number polls: dark background container that fits content (both active and concluded)
            // These polls hide sentiment gauges, so clean them up
            this.hideAllSentimentGauges();
            this.setupLetterNumberPollContainer(titleElement, contentElement);
        } else if (shouldShowSentiment && !isActive && !isConcluded) {
            // Sentiment-only: transparent container
            this.setupSentimentOnlyContainer(titleElement, contentElement);
        } else {
            // Default container setup
            this.container.style.display = 'block';
            this.container.style.minHeight = 'auto';
            titleElement.style.display = 'block';
        }
        
        // Update container positions after rendering
        if (typeof window.updateContainerPositions === 'function') {
            setTimeout(() => window.updateContainerPositions(), 10);
        }
    }

    /**
     * Render active poll - all types during voting
     */
    renderActivePoll(pollData, titleElement, contentElement) {
        const { pollType, counts } = pollData;
        
        // Remove titles for numbers and letters polls during live polling
        if (pollType === 'numbers' || pollType === 'letters') {
            titleElement.innerHTML = '';
        } else {
            // Add live indicator for other poll types
            titleElement.innerHTML = `
                <span style="font-size: 16px;">Live Polling... (${pollType.toUpperCase()})</span>
                <span style="display: inline-block; width: 8px; height: 8px; background: #00ff00; 
                           border-radius: 50%; margin-left: 8px; animation: pulse 1s infinite;">
                </span>
            `;
        }

        switch (pollType) {
            case 'yesno':
                this.renderActiveYesNo(counts, contentElement);
                break;
            case 'numbers':
                this.renderActiveNumbers(counts, contentElement);
                break;
            case 'letters':
                this.renderActiveLetters(counts, contentElement);
                break;
            case 'sentiment':
                this.renderActiveSentiment(counts, contentElement);
                break;
        }
    }

    /**
     * Render concluded poll - final results for all types
     */
    renderConcludedPoll(pollData, titleElement, contentElement) {
        const { pollType, counts, results } = pollData;
        
        switch (pollType) {
            case 'yesno':
                this.renderConcludedYesNo(counts, titleElement, contentElement);
                break;
            case 'numbers':
                this.renderConcludedNumbers(results || counts, titleElement, contentElement);
                break;
            case 'letters':
                this.renderConcludedLetters(counts, titleElement, contentElement);
                break;
            case 'sentiment':
                this.renderConcludedSentiment(counts, titleElement, contentElement);
                break;
        }
    }

    /**
     * Render ongoing sentiment tracking (not an active poll)
     */
    renderSentimentTracking(sentimentData, titleElement, contentElement) {
        if (titleElement) {
            titleElement.textContent = '';
        }
        
        // Handle unified polling sentiment data format
        if (sentimentData && sentimentData.items && sentimentData.items.length > 0) {
            // Use the correct settings path for maxDisplayItems
            const maxDisplayItems = this.settings.polling?.unifiedPolling?.sentiment?.maxDisplayItems || 
                                   sentimentData.maxDisplayItems || 5;
            
            // sentimentData.items is already an array of {term, count, percentage, emoteData}
            const sortedData = sentimentData.items
                .filter(item => item.count > 0) // Filter out items with count <= 0
                .sort((a, b) => b.count - a.count)
                .slice(0, maxDisplayItems)
                .map(item => ({ 
                    value: item.emoteData || item.term, // Use emote data if available, otherwise use term
                    count: item.count 
                }));
                
            this.updateSentimentGauges(contentElement, sortedData);
        } else if (sentimentData && sentimentData.counts && Object.keys(sentimentData.counts).length > 0) {
            // Fallback for generic polling format (counts object)
            const sortedData = Object.entries(sentimentData.counts)
                .filter(([, count]) => count > 0) // Filter out items with count <= 0
                .sort(([,a], [,b]) => b - a)
                .slice(0, this.settings.polling?.generic?.sentiment?.maxDisplayItems || 5)
                .map(([value, count]) => ({ value, count }));
                
            this.updateSentimentGauges(contentElement, sortedData);
        } else {
            contentElement.innerHTML = '';
        }
    }

    /**
     * Render active Yes/No poll with sentiment-style gauges
     */
    renderActiveYesNo(counts, contentElement) {
        const yesCount = counts.yes || 0;
        const noCount = counts.no || 0;
        const total = yesCount + noCount;
        
        if (total === 0) {
            return;
        }

        this.renderCleanYesNoGauges(contentElement, yesCount, noCount, { isActive: true });
    }

    /**
     * Render active Numbers poll
     */
    renderActiveNumbers(counts, contentElement) {
        // Apply outlier filtering
        const filteredData = this.filterOutliersForDisplay(counts);
        const entries = Object.entries(filteredData);
        
        if (entries.length === 0) {
            contentElement.innerHTML = '<div style="text-align: center; opacity: 0.7;">Waiting for numbers...</div>';
            return;
        }

        // Get configurable display limit
        const maxDisplay = this.settings.polling?.unifiedPolling?.numbers?.maxDisplay || 10;

        // Determine if we need binning: show individual numbers when unique values <= maxDisplay, otherwise bin
        let displayData;
        if (entries.length <= maxDisplay) {
            // Show individual numbers
            displayData = entries
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([key, count]) => ({ label: key, count }));
        } else {
            // Bin the numbers using maxDisplay as the number of bins
            displayData = this.createBins(filteredData, maxDisplay);
        }

        this.renderBarChart(displayData, contentElement);
    }

    /**
     * Render active Letters poll
     */
    renderActiveLetters(counts, contentElement) {
        const entries = Object.entries(counts);
        
        if (entries.length === 0) {
            contentElement.innerHTML = '<div style="text-align: center; opacity: 0.7;">Waiting for letters...</div>';
            return;
        }

        // Get configurable limits and thresholds
        const maxDisplayItems = this.settings.polling?.unifiedPolling?.letters?.maxDisplayItems || 15;
        const individualThreshold = this.settings.polling?.unifiedPolling?.letters?.individualThreshold || 3;

        // Filter, sort, and limit responses
        const displayData = entries
            .filter(([, count]) => count >= individualThreshold) // Only show responses meeting individual threshold
            .sort(([,a], [,b]) => b - a) // Sort by count (highest first)
            .slice(0, maxDisplayItems) // Take only top N responses
            .sort(([a], [b]) => a.localeCompare(b)) // Then sort alphabetically
            .map(([key, count]) => ({ label: key.toUpperCase(), count }));

        const total = displayData.reduce((sum, d) => sum + d.count, 0);
        this.renderBarChart(displayData, contentElement, { showPercentages: true, total });
    }

    /**
     * Render active Sentiment poll
     */
    renderActiveSentiment(counts, contentElement) {
        const sortedData = Object.entries(counts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, this.settings.polling?.generic?.sentiment?.maxDisplayItems || 5)
            .map(([value, count]) => ({ value, count }));
            
        if (sortedData.length === 0) {
            contentElement.innerHTML = '<div style="text-align: center; opacity: 0.7;">Waiting for sentiment...</div>';
            return;
        }

        this.updateSentimentGauges(contentElement, sortedData);
    }

    /**
     * Render concluded Yes/No poll with winner using sentiment-style gauges
     */
    renderConcludedYesNo(counts, titleElement, contentElement) {
        const yesCount = counts.yes || 0;
        const noCount = counts.no || 0;
        const total = yesCount + noCount;
        
        if (total === 0) {
            titleElement.style.display = 'none'; // Hide title
            contentElement.innerHTML = '<div style="text-align: center; opacity: 0.7;">No votes received</div>';
            return;
        }

        titleElement.style.display = 'none'; // Hide title for clean display

        this.renderCleanYesNoGauges(contentElement, yesCount, noCount, { isActive: false, showWinner: true });
    }

    /**
     * Render concluded Numbers poll with statistics
     */
    renderConcludedNumbers(results, titleElement, contentElement) {
        
        // Clear the content element to show only results
        contentElement.innerHTML = '';
        
        // If we got computed results (has average), use them
        if (results.average !== undefined) {
            titleElement.textContent = `Average: ${results.average}`;
            
            const modeText = Array.isArray(results.mode) ? results.mode.join(', ') : results.mode;
            
            // Create histogram from results
            let histogramHtml = '';
            if (results.histogram && results.histogram.length > 0) {
                histogramHtml = results.histogram.map(item => {
                    const percentage = Math.round(parseFloat(item.percentage));
                    const barWidth = Math.min(percentage, 100);
                    return `
                        <div style="margin: 3px 0; display: flex; align-items: center;">
                            <div style="min-width: 50px; font-size: 11px; margin-right: 8px; text-align: right;">${item.value}</div>
                            <div style="flex: 1; background: rgba(255,255,255,0.2); height: 16px; border-radius: 6px; overflow: hidden; position: relative;">
                                <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(90deg, #2196F3, #64B5F6); transition: width 0.3s ease;"></div>
                                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${percentage}%</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            const outlierInfo = results.outliersRemoved > 0 ? ` | Outliers: ${results.outliersRemoved}` : '';
            
            contentElement.innerHTML = `
                <div style="font-size: 12px; margin-bottom: 8px; color: #ccc; text-align: center;">Average: ${results.average} Top: ${modeText}</div>
                <div style="font-size: 12px;">${histogramHtml}</div>
                <div style="font-size: 10px; margin-top: 5px; color: #ccc; text-align: right;">Total: ${results.totalVotes} votes${outlierInfo}</div>
            `;
        } else {
            // We got raw counts, compute statistics on the fly
            const numbers = [];
            let total = 0;
            
            Object.entries(results).forEach(([key, count]) => {
                const num = parseInt(key, 10);
                if (!isNaN(num)) {
                    for (let i = 0; i < count; i++) {
                        numbers.push(num);
                        total++;
                    }
                }
            });
            
            if (numbers.length === 0) {
                contentElement.innerHTML = '<div style="text-align: center; opacity: 0.7;">No valid numbers</div>';
                return;
            }
            
            // Apply outlier filtering (similar to active numbers)
            const filteredData = this.filterOutliersForDisplay(results);
            const originalTotal = total;
            const outliersRemoved = originalTotal - Object.values(filteredData).reduce((sum, count) => sum + count, 0);
            
            // Calculate statistics from filtered data
            const filteredNumbers = [];
            let filteredTotal = 0;
            Object.entries(filteredData).forEach(([key, count]) => {
                const num = parseInt(key, 10);
                if (!isNaN(num)) {
                    for (let i = 0; i < count; i++) {
                        filteredNumbers.push(num);
                        filteredTotal++;
                    }
                }
            });
            
            const average = filteredNumbers.reduce((a, b) => a + b, 0) / filteredNumbers.length;
            const sorted = [...filteredNumbers].sort((a, b) => a - b);
            const median = sorted.length % 2 === 0 
                ? (sorted[Math.floor(sorted.length / 2) - 1] + sorted[Math.floor(sorted.length / 2)]) / 2
                : sorted[Math.floor(sorted.length / 2)];
                
            // Find mode (most common number)
            const frequency = {};
            filteredNumbers.forEach(num => frequency[num] = (frequency[num] || 0) + 1);
            const maxFreq = Math.max(...Object.values(frequency));
            const mode = Object.keys(frequency).filter(num => frequency[num] === maxFreq).map(Number);
            
            const modeText = mode.join(', ');
            
            // Consolidate title to show "Average: x Top: y" format
            titleElement.textContent = `Average: ${average.toFixed(1)} Top: ${modeText}`;
            
            // Prepare data for bar chart
            const entries = Object.entries(filteredData);
            let displayData;
            
            // Get configurable display limit (same as active numbers)
            const maxDisplay = this.settings.polling?.unifiedPolling?.numbers?.maxDisplay || 10;
            
            // Determine if we need binning: show individual numbers when unique values <= maxDisplay, otherwise bin
            if (entries.length <= maxDisplay) {
                // Show individual numbers
                displayData = entries
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([key, count]) => ({ label: key, count }));
            } else {
                // Bin the numbers using maxDisplay as the number of bins
                displayData = this.createBins(filteredData, maxDisplay);
            }
            
            // Create container for stats and bars
            const statsDiv = document.createElement('div');
            statsDiv.style.cssText = 'padding: 4px; max-width: 100%; box-sizing: border-box;';
            
            // Add bars container
            const barsContainer = document.createElement('div');
            
            // Add single totals footer (keep only the one with outlier info)
            const footerText = outliersRemoved > 0 
                ? `Total: ${filteredTotal} votes | Outliers removed: ${outliersRemoved}`
                : `Total: ${filteredTotal} votes`;
            const statsFooter = document.createElement('div');
            statsFooter.style.cssText = 'font-size: 10px; margin-top: 5px; color: #ccc; text-align: center;';
            statsFooter.textContent = footerText;
            
            // Assemble the display (removed statsHeader with duplicate stats)
            statsDiv.appendChild(barsContainer);
            statsDiv.appendChild(statsFooter);
            contentElement.appendChild(statsDiv);
            
            // Render the bar chart
            this.renderBarChart(displayData, barsContainer, { showPercentages: true, total: filteredTotal, hideTotal: true });
        }
    }

    /**
     * Render concluded Letters poll with winner
     */
    renderConcludedLetters(counts, titleElement, contentElement) {
        const entries = Object.entries(counts);
        if (entries.length === 0) {
            titleElement.textContent = 'NO LETTERS RECEIVED';
            return;
        }

        // Find winner
        const sortedByCount = entries.sort(([,a], [,b]) => b - a);
        const winner = sortedByCount[0];
        
        titleElement.innerHTML = `<span style="font-size: 24px; font-weight: bold;">Winner: ${winner[0].toUpperCase()}</span>`;

        // Display results sorted alphabetically
        const displayData = entries
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(0, 10);
            
        const total = displayData.reduce((sum, [,count]) => sum + count, 0);
        const maxCount = Math.max(...displayData.map(([,count]) => count));
        
        const histogramHtml = displayData.map(([letter, count]) => {
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const isWinner = letter === winner[0];
            const barColor = isWinner ? 'linear-gradient(90deg, #F44336, #EF5350)' : 'linear-gradient(90deg, #2196F3, #64B5F6)';
            
            return `
                <div style="margin: 2px 0; display: flex; align-items: center; min-width: 0;">
                    <div style="min-width: 30px; width: 30px; font-size: 11px; margin-right: 6px; text-align: right; flex-shrink: 0; ${isWinner ? 'color: #F44336; font-weight: bold;' : ''}">${letter.toUpperCase()}</div>
                    <div style="flex: 1; min-width: 0; background: rgba(255,255,255,0.1); height: 14px; border-radius: 4px; overflow: hidden; position: relative;">
                        <div style="width: ${barWidth}%; height: 100%; background: ${barColor}; transition: width 0.3s ease;"></div>
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; color: white; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${percentage}%</div>
                    </div>
                    <div style="min-width: 20px; width: 20px; font-size: 9px; color: #ccc; text-align: left; margin-left: 4px; flex-shrink: 0;">${count}</div>
                </div>
            `;
        }).join('');
        
        contentElement.innerHTML = `
            <div style="padding: 4px; max-width: 100%; box-sizing: border-box;">
                <div style="font-size: 12px; min-width: 0;">${histogramHtml}</div>
                <div style="font-size: 10px; margin-top: 4px; color: #ccc; text-align: center;">Total: ${total} votes</div>
            </div>
        `;
    }

    /**
     * Render concluded Sentiment poll - top sentiment wins
     */
    renderConcludedSentiment(counts, titleElement, contentElement) {
        const entries = Object.entries(counts);
        if (entries.length === 0) {
            titleElement.textContent = 'NO SENTIMENT DATA';
            return;
        }

        const sortedByCount = entries.sort(([,a], [,b]) => b - a);
        const winner = sortedByCount[0];
        
        // Handle winner display for different value types
        let winnerDisplay;
        if (winner[0] && typeof winner[0] === 'object' && (winner[0].src || winner[0].url)) {
            const imgSrc = winner[0].src || winner[0].url;
            const imgAlt = winner[0].alt || winner[0].name || 'emote';
            winnerDisplay = `<img src="${imgSrc}" alt="${imgAlt}" style="height: 24px; width: auto; vertical-align: middle;">`;
        } else {
            const textValue = typeof winner[0] === 'object' ? (winner[0].alt || winner[0].name || winner[0].toString()) : String(winner[0]);
            winnerDisplay = textValue.charAt(0).toUpperCase() + textValue.slice(1);
        }
        
        titleElement.innerHTML = `<span style="font-size: 20px; font-weight: bold;">Top Sentiment: ${winnerDisplay}</span>`;

        // Show top sentiments
        const topSentiments = sortedByCount.slice(0, 5).map(([value, count]) => ({ value, count }));
        this.updateSentimentGauges(contentElement, topSentiments);
    }

    /**
     * Render bar chart for numbers/letters
     */
    renderBarChart(displayData, contentElement, options = {}) {
        const { showPercentages = false, total = 0, hideTotal = false } = options;
        const maxCount = Math.max(...displayData.map(d => d.count));
        
        const barsHtml = displayData.map(({ label, count }) => {
            const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const percentage = showPercentages && total > 0 ? Math.round((count / total) * 100) : null;
            
            return `
                <div style="margin: 2px 0; display: flex; align-items: center; min-width: 0;">
                    <div style="min-width: 30px; width: 30px; font-size: 11px; color: white; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8); text-align: right; margin-right: 6px; flex-shrink: 0;">${label}</div>
                    <div style="flex: 1; min-width: 0; background: rgba(255,255,255,0.1); height: 14px; border-radius: 4px; overflow: hidden; position: relative;">
                        <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(90deg, #2196F3, #64B5F6); transition: width 0.3s ease;"></div>
                        ${percentage ? `<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; color: white; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${percentage}%</div>` : ''}
                    </div>
                    <div style="min-width: 20px; width: 20px; font-size: 9px; color: #ccc; text-align: left; margin-left: 4px; flex-shrink: 0;">${count}</div>
                </div>
            `;
        }).join('');
        
        const totalText = showPercentages ? `Total: ${total} responses` : `Showing ${displayData.length} entries`;
        
        contentElement.innerHTML = `
            <div style="padding: 4px; max-width: 100%; box-sizing: border-box;">
                <div style="font-size: 12px; min-width: 0;">${barsHtml}</div>
                ${!hideTotal ? `<div style="font-size: 10px; margin-top: 4px; opacity: 0.7; color: #ccc; text-align: center;">${totalText}</div>` : ''}
            </div>
        `;
    }

    /**
     * Render two-item gauges using sentiment-style single container
     * Used for yes/no polls and other binary polls
     */
    renderTwoItemGauges(contentElement, items, options = {}) {
        const { total = 0, showPercentages = false, isActive = false, finalResults = false } = options;
        
        // Clear existing content
        contentElement.innerHTML = '';
        
        if (items.length !== 2) {
            contentElement.innerHTML = '<div style="color: red;">Error: Two-item gauge requires exactly 2 items</div>';
            return;
        }

        const [leftItem, rightItem] = items;
        const leftPercentage = total > 0 ? Math.round((leftItem.count / total) * 100) : 0;
        const rightPercentage = total > 0 ? Math.round((rightItem.count / total) * 100) : 0;

        // Create main container with sentiment-style styling
        const gaugeContainer = document.createElement('div');
        gaugeContainer.style.cssText = `
            margin: 8px 0; 
            display: flex; 
            flex-direction: column;
            align-items: center; 
            background: rgba(0, 0, 0, 0.8); 
            border-radius: 6px; 
            padding: 8px; 
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 400px;
            transition: all 0.5s ease;
        `;

        // Configurable width gauge container, bounded by window width
        const autoFitWidth = this.settings.polling?.unifiedPolling?.yesno?.autoFitWidth || false;
        const configuredWidth = this.settings.polling?.unifiedPolling?.yesno?.width || 320;
        const availableWidth = window.innerWidth - 40; // Account for padding/margins
        const gaugeWidth = autoFitWidth ? availableWidth : Math.min(configuredWidth, availableWidth);
        const gaugeHeight = this.settings.polling?.unifiedPolling?.yesno?.height || 24;

        // Calculate fill widths based on percentages
        const leftFillWidth = total > 0 ? (leftPercentage / 100) * gaugeWidth : 0;
        const rightFillWidth = total > 0 ? (rightPercentage / 100) * gaugeWidth : 0;

        // Create the gauge bar
        gaugeContainer.innerHTML = `
            <div style="
                width: ${gaugeWidth}px; 
                height: ${gaugeHeight}px; 
                background: rgba(255,255,255,0.1); 
                border-radius: 6px; 
                position: relative;
                overflow: hidden;
                margin-bottom: 8px;
            ">
                <!-- Left fill (Yes) - anchored to left -->
                <div style="
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: ${leftFillWidth}px; 
                    height: 100%; 
                    background: ${leftItem.color}; 
                    transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.3s ease;
                    border-radius: 6px 0 0 6px;
                    z-index: 2;
                "></div>
                
                <!-- Right fill (No) - anchored to right -->
                <div style="
                    position: absolute;
                    right: 0;
                    top: 0;
                    width: ${rightFillWidth}px; 
                    height: 100%; 
                    background: ${rightItem.color}; 
                    transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.3s ease;
                    border-radius: 0 6px 6px 0;
                    z-index: 2;
                "></div>
                
                <!-- Left label -->
                <div style="
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 3;
                    font-size: 14px;
                    color: white;
                    font-weight: ${leftItem.isWinner && finalResults ? 'bold' : '500'};
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
                    white-space: nowrap;
                    ${leftItem.isWinner && finalResults ? 'text-shadow: 0 0 8px rgba(255,255,255,0.8);' : ''}
                ">${showPercentages ? `${leftItem.label} ${leftPercentage}%` : leftItem.label}</div>
                
                <!-- Right label -->
                <div style="
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 3;
                    font-size: 14px;
                    color: white;
                    font-weight: ${rightItem.isWinner && finalResults ? 'bold' : '500'};
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
                    white-space: nowrap;
                    ${rightItem.isWinner && finalResults ? 'text-shadow: 0 0 8px rgba(255,255,255,0.8);' : ''}
                ">${showPercentages ? `${rightItem.label} ${rightPercentage}%` : rightItem.label}</div>
            </div>
            
            <!-- Summary text -->
            ${total > 0 ? `<div style="font-size: 11px; opacity: 0.8; text-align: center; color: white;">
                ${finalResults ? `Final: ${total} votes` : `Total: ${total} votes`}
            </div>` : ''}
        `;

        contentElement.appendChild(gaugeContainer);

        // Add pulsing animation for active polls
        if (isActive && total > 0) {
            const fillElements = gaugeContainer.querySelectorAll('[style*="width:"]');
            fillElements.forEach(el => {
                if (el.style.width && parseInt(el.style.width) > 0) {
                    el.style.animation = 'pulse 2s infinite';
                }
            });
        }

        // Add winner glow effect for concluded polls
        if (finalResults) {
            const leftFill = gaugeContainer.querySelector('div > div:nth-child(1)');
            const rightFill = gaugeContainer.querySelector('div > div:nth-child(2)');
            
            if (leftItem.isWinner && leftFill) {
                leftFill.style.boxShadow = '0 0 12px rgba(76, 175, 80, 0.6)';
            }
            if (rightItem.isWinner && rightFill) {
                rightFill.style.boxShadow = '0 0 12px rgba(244, 67, 54, 0.6)';
            }
        }
    }

    /**
     * Render clean yes/no gauges without background container
     * Just the gauge bar with labels and optional winner overlay
     */
    renderCleanYesNoGauges(contentElement, yesCount, noCount, options = {}) {
        const { isActive = false, showWinner = false } = options;
        const total = yesCount + noCount;
        
        // Handle empty state
        if (total === 0) {
            return;
        }
        
        // Remove waiting message if it exists
        const waitingMessage = contentElement.querySelector('.waiting-message');
        if (waitingMessage) {
            waitingMessage.remove();
        }

        const yesPercentage = Math.round((yesCount / total) * 100);
        const noPercentage = Math.round((noCount / total) * 100);
        
        // Determine winner for concluded polls
        const winner = yesCount > noCount ? 'YES' : (noCount > yesCount ? 'NO' : 'TIE');
        const yesIsWinner = winner === 'YES';
        const noIsWinner = winner === 'NO';
        const isTie = winner === 'TIE';

        // Get colors from settings - should now be properly mapped
        const yesColorFromSettings = this.settings.polling?.unifiedPolling?.yesno?.styling?.yesColor || '#4CAF50';
        const noColorFromSettings = this.settings.polling?.unifiedPolling?.yesno?.styling?.noColor || '#F44336';
        
        // Create gradient colors based on settings and winner status
        const yesColor = yesIsWinner ? 
            `linear-gradient(90deg, ${yesColorFromSettings}, ${yesColorFromSettings}dd)` : 
            (showWinner ? 
                `linear-gradient(90deg, ${yesColorFromSettings}66, ${yesColorFromSettings}66)` : 
                `linear-gradient(90deg, ${yesColorFromSettings}, ${yesColorFromSettings}dd)`);
        const noColor = noIsWinner ? 
            `linear-gradient(90deg, ${noColorFromSettings}, ${noColorFromSettings}dd)` : 
            (showWinner ? 
                `linear-gradient(90deg, ${noColorFromSettings}66, ${noColorFromSettings}66)` : 
                `linear-gradient(90deg, ${noColorFromSettings}, ${noColorFromSettings}dd)`);

        // Configurable width gauge container, bounded by window width
        const autoFitWidth = this.settings.polling?.unifiedPolling?.yesno?.autoFitWidth || false;
        const configuredWidth = this.settings.polling?.unifiedPolling?.yesno?.width || 320;
        const availableWidth = window.innerWidth - 40; // Account for padding/margins
        const gaugeWidth = autoFitWidth ? availableWidth : Math.min(configuredWidth, availableWidth);
        const gaugeHeight = this.settings.polling?.unifiedPolling?.yesno?.height || 24;

        // Calculate fill widths based on percentages
        const leftFillWidth = (yesPercentage / 100) * gaugeWidth;
        const rightFillWidth = (noPercentage / 100) * gaugeWidth;

        // Try to reuse existing gauge bar for smooth transitions
        let gaugeBar = contentElement.querySelector('.yesno-gauge-bar');
        
        if (!gaugeBar) {
            // Create new gauge bar if it doesn't exist
            gaugeBar = document.createElement('div');
            gaugeBar.className = 'yesno-gauge-bar';
            gaugeBar.style.cssText = `
                width: ${gaugeWidth}px; 
                height: ${gaugeHeight}px; 
                background: rgba(255,255,255,0.1); 
                border-radius: 6px; 
                position: relative;
                overflow: hidden;
            `;

            gaugeBar.innerHTML = `
                <div class="yes-fill" style="
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: ${leftFillWidth}px; 
                    height: 100%; 
                    background: ${yesColor}; 
                    transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.3s ease;
                    border-radius: 6px 0 0 6px;
                    z-index: 2;
                "></div>
                
                <div class="no-fill" style="
                    position: absolute;
                    right: 0;
                    top: 0;
                    width: ${rightFillWidth}px; 
                    height: 100%; 
                    background: ${noColor}; 
                    transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.3s ease;
                    border-radius: 0 6px 6px 0;
                    z-index: 2;
                "></div>
                
                <div class="yes-label" style="
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 3;
                    font-size: 14px;
                    color: white;
                    font-weight: ${yesIsWinner && showWinner ? 'bold' : '500'};
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
                    white-space: nowrap;
                ">Yes ${yesPercentage}%</div>
                
                <div class="no-label" style="
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 3;
                    font-size: 14px;
                    color: white;
                    font-weight: ${noIsWinner && showWinner ? 'bold' : '500'};
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
                    white-space: nowrap;
                ">${noPercentage}% No</div>
                
                ${showWinner ? `<div class="winner-overlay" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 4;
                    font-size: 16px;
                    color: ${isTie ? '#FF9800' : (yesIsWinner ? yesColorFromSettings : noColorFromSettings)};
                    font-weight: bold;
                    text-shadow: 0 0 8px rgba(0, 0, 0, 1);
                    background: rgba(0, 0, 0, 0.8);
                    padding: 4px 8px;
                    border-radius: 4px;
                    white-space: nowrap;
                ">${isTie ? 'TIE!' : (yesIsWinner ? `YES ${yesPercentage}%` : `NO ${noPercentage}%`)}</div>` : ''}
            `;
            
            // Center the gauge bar within the content element and ensure it stays above sentiment
            Object.assign(gaugeBar.style, {
                margin: '0 auto',
                display: 'block',
                position: 'relative',
                zIndex: '20' // Higher than sentiment gauges (10)
            });
            
            contentElement.appendChild(gaugeBar);
        } else {
            // Update existing gauge bar elements
            const yesFill = gaugeBar.querySelector('.yes-fill');
            const noFill = gaugeBar.querySelector('.no-fill');
            const yesLabel = gaugeBar.querySelector('.yes-label');
            const noLabel = gaugeBar.querySelector('.no-label');
            const winnerOverlay = gaugeBar.querySelector('.winner-overlay');
            
            // Update fill widths and colors with smooth transitions
            if (yesFill) {
                yesFill.style.width = `${leftFillWidth}px`;
                yesFill.style.background = yesColor;
            }
            if (noFill) {
                noFill.style.width = `${rightFillWidth}px`;
                noFill.style.background = noColor;
            }
            
            // Update labels
            if (yesLabel) {
                yesLabel.textContent = `Yes ${yesPercentage}%`;
                yesLabel.style.fontWeight = yesIsWinner && showWinner ? 'bold' : '500';
            }
            if (noLabel) {
                noLabel.textContent = `${noPercentage}% No`;
                noLabel.style.fontWeight = noIsWinner && showWinner ? 'bold' : '500';
            }
            
            // Handle winner overlay
            if (showWinner && !winnerOverlay) {
                // Add winner overlay if needed
                const overlay = document.createElement('div');
                overlay.className = 'winner-overlay';
                overlay.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 4;
                    font-size: 16px;
                    color: ${isTie ? '#FF9800' : (yesIsWinner ? yesColorFromSettings : noColorFromSettings)};
                    font-weight: bold;
                    text-shadow: 0 0 8px rgba(0, 0, 0, 1);
                    background: rgba(0, 0, 0, 0.8);
                    padding: 4px 8px;
                    border-radius: 4px;
                    white-space: nowrap;
                `;
                overlay.textContent = isTie ? 'TIE!' : (yesIsWinner ? `YES ${yesPercentage}%` : `NO ${noPercentage}%`);
                gaugeBar.appendChild(overlay);
            } else if (showWinner && winnerOverlay) {
                // Update existing winner overlay
                winnerOverlay.textContent = isTie ? 'TIE!' : (yesIsWinner ? `YES ${yesPercentage}%` : `NO ${noPercentage}%`);
                winnerOverlay.style.color = isTie ? '#FF9800' : (yesIsWinner ? yesColorFromSettings : noColorFromSettings);
            } else if (!showWinner && winnerOverlay) {
                // Remove winner overlay if not needed
                winnerOverlay.remove();
            }
        }

        // Add pulsing animation for active polls
        if (isActive && total > 0) {
            const fillElements = gaugeBar.querySelectorAll('div[style*="width:"]');
            fillElements.forEach(el => {
                if (el.style.width && parseInt(el.style.width) > 0) {
                    el.style.animation = 'pulse 2s infinite';
                }
            });
        }
    }

    /**
     * Update sentiment gauges with smooth animations
     */
    updateSentimentGauges(contentElement, sortedData) {
        // Support both unified and generic polling settings paths
        const sentimentGaugeMax = this.settings.polling?.unifiedPolling?.sentiment?.maxGaugeValue || 
                                 this.settings.polling?.generic?.sentiment?.maxGaugeValue || 30;
        const sentimentMaxGrowthWidth = this.settings.polling?.unifiedPolling?.sentiment?.maxGrowthWidth || 
                                       this.settings.polling?.generic?.sentiment?.maxGrowthWidth || 150;
        const sentimentBaseColor = this.settings.polling?.unifiedPolling?.sentiment?.baseColor || '#2196F3';
        const anchorPoint = this.settings.polling?.unifiedPolling?.sentiment?.anchorPoint || 'top';
        
        // Get existing gauge elements to reuse them for smooth animations
        // Refresh the gauge list each time to account for any DOM changes
        const existingGauges = Array.from(contentElement.querySelectorAll('.sentiment-gauge'));
        const existingGaugeMap = new Map();
        
        // Create a map of existing gauges by their data value
        // Also remove any gauges that might be duplicates during this process
        const seenValues = new Set();
        existingGauges.forEach(gauge => {
            const dataValue = gauge.getAttribute('data-value');
            if (dataValue) {
                if (seenValues.has(dataValue)) {
                    // Remove duplicate gauge
                    gauge.remove();
                } else {
                    seenValues.add(dataValue);
                    existingGaugeMap.set(dataValue, gauge);
                }
            }
        });
        
        // Track which gauges we're keeping
        const usedGauges = new Set();
        
        if (sortedData.length === 0) {
            // Remove all existing gauges when no sentiment data
            existingGauges.forEach(gauge => {
                gauge.remove();
            });
            return;
        }
        
        sortedData.forEach(({ value, count }, index) => {
            try {
                // Create unique key for tracking timestamps
                let valueKey;
                if (value && typeof value === 'object' && (value.src || value.url)) {
                    // For emotes, use src/url as unique identifier
                    valueKey = value.src || value.url || value.alt || value.name || String(value);
                } else {
                    // For text values, use string representation
                    valueKey = String(value);
                }
                
                // Update timestamp for this item
                this.sentimentTimestamps.set(valueKey, Date.now());
                
                // Calculate fill width
            const baseWidth = 100;
            const countRatio = count / sentimentGaugeMax;
            
            let fillWidthPx;
            if (countRatio <= 1) {
                fillWidthPx = baseWidth * countRatio;
            } else {
                const overflowAmount = (countRatio - 1) * baseWidth;
                const cappedOverflow = Math.min(overflowAmount, sentimentMaxGrowthWidth - baseWidth);
                fillWidthPx = baseWidth + cappedOverflow;
            }
            
            const isAtMaxWidth = fillWidthPx >= sentimentMaxGrowthWidth;
            const isAtMaxValue = count >= sentimentGaugeMax;
            
            // Check if this sentiment item belongs to a custom group with a specific color
            let itemBaseColor = sentimentBaseColor;
            let sentimentGroups = this.settings.polling?.unifiedPolling?.sentiment?.groups;
            
            // Parse groups if it's a JSON string
            if (typeof sentimentGroups === 'string') {
                try {
                    sentimentGroups = JSON.parse(sentimentGroups);
                } catch (e) {
                    console.warn('[Unified Poll Display] Invalid sentiment groups JSON:', sentimentGroups);
                    sentimentGroups = [];
                }
            }
            
            if (Array.isArray(sentimentGroups) && sentimentGroups.length > 0) {
                const valueStr = String(value).toLowerCase();
                const matchingGroup = sentimentGroups.find(group => {
                    if (!group.words || !Array.isArray(group.words)) return false;
                    return group.words.some(groupWord => {
                        const groupWordLower = String(groupWord).toLowerCase();
                        if (group.partialMatch) {
                            return valueStr.includes(groupWordLower) || groupWordLower.includes(valueStr);
                        } else {
                            return valueStr === groupWordLower;
                        }
                    });
                });
                
                if (matchingGroup && matchingGroup.color) {
                    itemBaseColor = matchingGroup.color;
                }
            }
            
            // Create lighter shade for gradient end
            const hex = itemBaseColor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            const lighterColor = `#${Math.min(255, r + 40).toString(16).padStart(2, '0')}${Math.min(255, g + 40).toString(16).padStart(2, '0')}${Math.min(255, b + 40).toString(16).padStart(2, '0')}`;
            
            const gaugeColor = isAtMaxWidth ? 
                'linear-gradient(90deg, #FF4444, #CC0000)' : 
                `linear-gradient(90deg, ${itemBaseColor}, ${lighterColor})`;
            
            // Create display label
            let displayLabel;
            if (value && typeof value === 'object' && (value.src || value.url)) {
                const imgSrc = value.src || value.url;
                const imgAlt = value.alt || value.name || 'emote';
                const labelHeight = this.settings.polling?.unifiedPolling?.sentiment?.labelHeight || 18;
                displayLabel = `<img src="${imgSrc}" alt="${imgAlt}" style="height: ${labelHeight}px; width: auto; vertical-align: middle;" onerror="this.style.display='none';this.nextSibling.style.display='inline'"><span style="display:none">${imgAlt}</span>`;
            } else {
                const textValue = typeof value === 'object' ? (value.alt || value.name || value.toString()) : String(value);
                displayLabel = textValue.charAt(0).toUpperCase() + textValue.slice(1);
            }
            
            // Calculate label width to ensure gauge-bar fits content
            let labelWidthPx = 0;
            const labelHeight = this.settings.polling?.unifiedPolling?.sentiment?.labelHeight || 18;
            const gaugeHeight = Math.max(20, labelHeight + 2);
            const fontSize = Math.max(9, Math.floor(gaugeHeight * 0.55));
            
            if (displayLabel && !displayLabel.includes('<img')) {
                // Create temporary element to measure text width
                const tempElement = document.createElement('div');
                tempElement.style.cssText = `position: absolute; visibility: hidden; font-size: ${fontSize}px; font-weight: 500; white-space: nowrap; padding-left: 6px;`;
                tempElement.textContent = displayLabel;
                document.body.appendChild(tempElement);
                labelWidthPx = tempElement.offsetWidth;
                document.body.removeChild(tempElement);
            } else if (displayLabel && displayLabel.includes('<img')) {
                // For emotes, estimate width based on height + some padding
                labelWidthPx = labelHeight + 12; // Height + padding
            }
            
            // Use the maximum of fill width and label width for gauge-bar
            const gaugeBarWidthPx = Math.max(fillWidthPx, labelWidthPx);
            
            // Try to reuse existing gauge element for this value
            // Use the valueKey we created earlier for timestamp tracking
            
            let gaugeElement = existingGaugeMap.get(valueKey);
            
            if (gaugeElement) {
                // Reuse existing element - just update the fill width and color
                usedGauges.add(gaugeElement);
                
                // Update the gauge background color based on max value
                const gaugeBackgroundColor = isAtMaxValue ? 'gold' : 'black';
                gaugeElement.style.background = gaugeBackgroundColor;
                // Ensure transition is set for existing elements
                if (!gaugeElement.style.transition.includes('background')) {
                    gaugeElement.style.transition = gaugeElement.style.transition ? 
                        gaugeElement.style.transition + ', background 0.5s ease' : 
                        'background 0.5s ease';
                }
                
                // Update the gauge bar width and height (the outer container)
                const gaugeBar = gaugeElement.querySelector('.gauge-bar');
                if (gaugeBar) {
                    const labelHeight = this.settings.polling?.unifiedPolling?.sentiment?.labelHeight || 18;
                    const gaugeHeight = Math.max(20, labelHeight + 2); // At least 20px, or label height + padding
                    gaugeBar.style.width = `${gaugeBarWidthPx}px`;
                    gaugeBar.style.height = `${gaugeHeight}px`;
                }
                
                // Update the fill element with smooth transition
                const fillElement = gaugeElement.querySelector('.gauge-fill');
                if (fillElement) {
                    fillElement.style.width = `${fillWidthPx}px`;
                    fillElement.style.background = gaugeColor;
                }
                
                // Update the label if needed
                const labelElement = gaugeElement.querySelector('.gauge-label');
                if (labelElement) {
                    labelElement.innerHTML = displayLabel;
                }
                
                // Ensure proper order by moving to correct position
                // Only move if the element is not already in the correct position
                const currentPosition = Array.from(contentElement.children).indexOf(gaugeElement);
                const targetPosition = anchorPoint === 'bottom' ? (sortedData.length - 1 - index) : index;
                
                if (currentPosition !== targetPosition) {
                    // Remove element first to avoid any potential duplication issues
                    if (gaugeElement.parentNode === contentElement) {
                        gaugeElement.remove();
                    }
                    // Insert at correct position based on anchor point
                    if (anchorPoint === 'bottom') {
                        // For bottom anchoring: highest count (index 0) goes to bottom (last position)
                        // Lower counts (higher index) go above (earlier positions)
                        if (targetPosition < contentElement.children.length) {
                            contentElement.insertBefore(gaugeElement, contentElement.children[targetPosition]);
                        } else {
                            contentElement.appendChild(gaugeElement);
                        }
                    } else {
                        // Top anchoring: normal insertion order
                        if (targetPosition < contentElement.children.length) {
                            contentElement.insertBefore(gaugeElement, contentElement.children[targetPosition]);
                        } else {
                            contentElement.appendChild(gaugeElement);
                        }
                    }
                }
            } else {
                // Before creating new gauge element, ensure no duplicates exist
                const duplicateElements = contentElement.querySelectorAll(`[data-value="${valueKey}"]`);
                duplicateElements.forEach(dup => dup.remove());
                
                // Create new gauge element
                gaugeElement = document.createElement('div');
                gaugeElement.className = 'sentiment-gauge';
                gaugeElement.setAttribute('data-value', valueKey);
                
                // Determine background color based on max value
                const gaugeBackgroundColor = isAtMaxValue ? 'gold' : 'black';
                
                // Use consistent margins to prevent jumping - set them individually to prevent overrides
                gaugeElement.style.cssText = `
                    display: block; 
                    background: ${gaugeBackgroundColor}; 
                    border-radius: 4px; 
                    padding: 4px 6px; 
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
                    width: fit-content;
                    transition: background 0.5s ease;
                `;
                // Set margins individually to prevent CSS shorthand conflicts
                gaugeElement.style.marginTop = '3px';
                gaugeElement.style.marginRight = '0px';
                gaugeElement.style.marginBottom = '3px';
                gaugeElement.style.marginLeft = '0px';
                
                gaugeElement.innerHTML = `
                    <div class="gauge-bar" style="
                        width: ${gaugeBarWidthPx}px; 
                        height: ${gaugeHeight}px; 
                        background: shadow; 
                        border-radius: 3px; 
                        position: relative;
                        display: flex;
                        align-items: center;
                        transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    ">
                        <div class="gauge-fill" style="
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: ${fillWidthPx}px; 
                            height: 100%; 
                            background: ${gaugeColor}; 
                            transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.3s ease;
                            border-radius: 3px;
                        "></div>
                        <div class="gauge-label" style="position: relative; z-index: 1; font-size: ${fontSize}px; color: white; font-weight: 500; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8); white-space: nowrap; padding-left: 6px;">${displayLabel}</div>
                    </div>
                `;
                
                // Insert at correct position based on anchor point
                const targetPosition = anchorPoint === 'bottom' ? (sortedData.length - 1 - index) : index;
                
                if (anchorPoint === 'bottom') {
                    // For bottom anchoring: highest count (index 0) goes to bottom (last position)
                    // Lower counts (higher index) go above (earlier positions)
                    if (targetPosition < contentElement.children.length) {
                        contentElement.insertBefore(gaugeElement, contentElement.children[targetPosition]);
                    } else {
                        contentElement.appendChild(gaugeElement);
                    }
                } else {
                    // Top anchoring: normal insertion order
                    if (targetPosition < contentElement.children.length) {
                        contentElement.insertBefore(gaugeElement, contentElement.children[targetPosition]);
                    } else {
                        contentElement.appendChild(gaugeElement);
                    }
                }
                
                usedGauges.add(gaugeElement);
            }
            } catch (error) {
                console.error(`[Unified Poll Display] Error processing item ${index + 1}:`, error);
            }
        });
        
        // Remove unused gauges
        existingGauges.forEach(gauge => {
            if (!usedGauges.has(gauge)) {
                gauge.remove();
            }
        });
    }

    /**
     * Filter outliers for cleaner display
     */
    filterOutliersForDisplay(data) {
        const entries = Object.entries(data);
        if (entries.length <= 4) return data;
        
        const values = [];
        entries.forEach(([num, count]) => {
            for (let i = 0; i < count; i++) {
                values.push(parseInt(num));
            }
        });
        
        values.sort((a, b) => a - b);
        
        const q1Index = Math.floor(values.length * 0.25);
        const q3Index = Math.floor(values.length * 0.75);
        const q1 = values[q1Index];
        const q3 = values[q3Index];
        const iqr = q3 - q1;
        
        const lowerBound = q1 - (1.5 * iqr);
        const upperBound = q3 + (1.5 * iqr);
        
        const filteredData = {};
        let removedCount = 0;
        
        entries.forEach(([num, count]) => {
            const numValue = parseInt(num);
            if (numValue >= lowerBound && numValue <= upperBound) {
                filteredData[num] = count;
            } else {
                removedCount += count;
            }
        });
        
        if (removedCount / values.length < 0.25) {
            return filteredData;
        }
        
        return data;
    }

    /**
     * Create bins for large number datasets
     */
    createBins(data, maxBins = 8) {
        const numbers = Object.keys(data).map(Number);
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        const range = max - min;
        const numBins = Math.min(maxBins, Object.keys(data).length);
        const binWidth = range / numBins;
        
        const bins = [];
        for (let i = 0; i < numBins; i++) {
            const binStart = min + (i * binWidth);
            const binEnd = i === numBins - 1 ? max + 1 : min + ((i + 1) * binWidth);
            bins.push({
                start: Math.round(binStart),
                end: Math.round(binEnd),
                count: 0
            });
        }
        
        Object.entries(data).forEach(([num, count]) => {
            const numValue = parseInt(num);
            let binIndex = Math.floor((numValue - min) / binWidth);
            if (binIndex >= numBins) binIndex = numBins - 1;
            bins[binIndex].count += count;
        });
        
        return bins
            .filter(bin => bin.count > 0)
            .map(bin => ({
                label: bin.start === bin.end - 1 ? `${bin.start}` : `${bin.start}-${bin.end - 1}`,
                count: bin.count
            }));
    }

    /**
     * Setup container for yes/no polls - should not take height when inactive
     */
    setupYesNoPollContainer(titleElement, contentElement) {
        titleElement.style.display = 'none'; // Always hide title for yes/no polls
        
        // Set container to flex layout for yes/no + sentiment stacking
        Object.assign(contentElement.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start', // Start from top
            textAlign: 'center'
        });
    }

    /**
     * Setup container for letter/number polls - dark background, fits content
     */
    setupLetterNumberPollContainer(titleElement, contentElement) {
        // Get minimum widths from settings
        const numbersMinWidth = this.settings?.polling?.unifiedPolling?.numbers?.minWidth || 200;
        const lettersMinWidth = this.settings?.polling?.unifiedPolling?.letters?.minWidth || 200;
        
        // Determine which poll type we're dealing with based on container dataset
        const pollType = this.container.dataset.pollType;
        const minWidth = pollType === 'numbers' ? numbersMinWidth : lettersMinWidth;
        
        // Set up content element for centering
        contentElement.style.display = 'flex';
        contentElement.style.justifyContent = 'center';
        contentElement.style.alignItems = 'flex-start';
        
        // Check if background container already exists
        let pollContainer = contentElement.querySelector('.poll-background-container');
        if (!pollContainer) {
            // Create dark background container for letter/number polls
            pollContainer = document.createElement('div');
            pollContainer.className = 'poll-background-container';
            pollContainer.style.cssText = `
                background-color: #111111;
                padding: 8px;
                border-radius: 8px;
                margin: 0;
                width: fit-content;
                min-width: ${minWidth}px;
                max-width: 100%;
                box-sizing: border-box;
            `;
            
            // Move existing content into the background container
            const existingContent = contentElement.innerHTML;
            contentElement.innerHTML = '';
            
            // Create a wrapper inside pollContainer to hold both title and content
            const pollInnerWrapper = document.createElement('div');
            pollInnerWrapper.innerHTML = existingContent;
            
            pollContainer.appendChild(pollInnerWrapper);
            contentElement.appendChild(pollContainer);
        } else {
            // Update existing container with current minWidth
            pollContainer.style.minWidth = `${minWidth}px`;
        }
        
        // Move title inside the poll container if it's not already there
        if (titleElement.parentNode !== pollContainer && titleElement.textContent.trim()) {
            // Remove title from its current location and add it to the top of poll container
            titleElement.remove();
            pollContainer.insertBefore(titleElement, pollContainer.firstChild);
        }
        
        titleElement.style.display = 'block';
    }

    /**
     * Setup container for sentiment-only display
     */
    setupSentimentOnlyContainer(titleElement, contentElement) {
        titleElement.style.display = 'none';
        contentElement.style.display = 'block';
    }

    /**
     * Render sentiment gauges with proper anchoring
     */
    renderSentimentGauges(sentimentData, contentElement, hasYesNoPoll = false) {
        // Get anchor point setting
        const anchorPoint = this.settings?.polling?.unifiedPolling?.sentiment?.anchorPoint || 'top';
        
        // Check for existing sentiment container in different possible locations
        let sentimentContainer = contentElement.querySelector('.sentiment-container') || 
                                 document.body.querySelector('.sentiment-container');
        
        // If container exists but anchor point changed, remove and recreate
        if (sentimentContainer) {
            const isCurrentlyFixed = sentimentContainer.style.position === 'fixed';
            const shouldBeFixed = anchorPoint === 'bottom';
            
            if (isCurrentlyFixed !== shouldBeFixed) {
                sentimentContainer.remove();
                sentimentContainer = null;
            }
        }
        
        if (!sentimentContainer) {
            sentimentContainer = document.createElement('div');
            sentimentContainer.className = 'sentiment-container';
            
            // Position sentiment container based on anchor point
            if (anchorPoint === 'bottom') {
                // For bottom anchoring, create a fixed positioned container
                sentimentContainer.style.cssText = `
                    position: fixed;
                    bottom: 10px;
                    left: 10px;
                    right: 10px;
                    z-index: 100;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    max-height: calc(100vh - 20px);
                    overflow: hidden;
                    pointer-events: none;
                `;
                // Append to body for fixed positioning
                document.body.appendChild(sentimentContainer);
            } else {
                // For top anchoring, normal flow within content element
                sentimentContainer.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    margin-top: ${hasYesNoPoll ? '10px' : '0px'};
                `;
                contentElement.appendChild(sentimentContainer);
            }
        } else if (anchorPoint === 'top') {
            // Update margin for existing top-anchored container
            sentimentContainer.style.marginTop = hasYesNoPoll ? '10px' : '0px';
        }
        
        // Check if sentiment data is empty or all items filtered out
        const hasValidSentimentData = (sentimentData && sentimentData.items && sentimentData.items.filter(item => item.count > 0).length > 0) ||
                                     (sentimentData && sentimentData.counts && Object.entries(sentimentData.counts).filter(([, count]) => count > 0).length > 0);
        
        if (!hasValidSentimentData) {
            // Remove the container if no valid sentiment data
            if (sentimentContainer) {
                sentimentContainer.remove();
            }
            return;
        }
        
        // Render sentiment gauges in the container
        this.renderSentimentTracking(sentimentData, null, sentimentContainer);
    }

    /**
     * Hide/remove all sentiment gauges from all possible locations
     */
    hideAllSentimentGauges() {
        // Remove sentiment containers from content elements
        const contentContainers = document.querySelectorAll('.unified-poll-content .sentiment-container');
        contentContainers.forEach(container => container.remove());
        
        // Remove fixed-positioned sentiment containers from body
        const bodyContainers = document.body.querySelectorAll('.sentiment-container');
        bodyContainers.forEach(container => {
            if (container.style.position === 'fixed') {
                container.remove();
            }
        });
        
        // Clear timestamp tracking
        this.sentimentTimestamps.clear();
    }

    /**
     * Start the sentiment gauge cleanup timer
     */
    startSentimentCleanupTimer() {
        // Clear existing timer
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        // Start cleanup timer that runs every 2 seconds
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSentimentGauges();
        }, 2000);
    }

    /**
     * Stop the sentiment gauge cleanup timer
     */
    stopSentimentCleanupTimer() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * Remove sentiment gauges that haven't been updated within the cooldown duration
     */
    cleanupExpiredSentimentGauges() {
        // Get cooldown duration from settings (default 10000ms)
        const cooldownDuration = this.settings?.polling?.unifiedPolling?.behavior?.cooldownDuration || 10000;
        const currentTime = Date.now();
        
        // Find expired items
        const expiredKeys = [];
        this.sentimentTimestamps.forEach((timestamp, key) => {
            if (currentTime - timestamp > cooldownDuration) {
                expiredKeys.push(key);
            }
        });
        
        if (expiredKeys.length === 0) {
            return; // No expired items
        }
        
        // Remove expired sentiment gauges from DOM
        expiredKeys.forEach(key => {
            // Remove from all possible locations
            const allContainers = [
                ...document.querySelectorAll('.unified-poll-content .sentiment-container'),
                ...document.body.querySelectorAll('.sentiment-container')
            ];
            
            allContainers.forEach(container => {
                const gauge = container.querySelector(`[data-value="${key}"]`);
                if (gauge) {
                    gauge.remove();
                }
            });
            
            // Remove from timestamp tracking
            this.sentimentTimestamps.delete(key);
        });
        
        // If no sentiment gauges remain, clean up empty containers
        const allContainers = [
            ...document.querySelectorAll('.unified-poll-content .sentiment-container'),
            ...document.body.querySelectorAll('.sentiment-container')
        ];
        
        allContainers.forEach(container => {
            const remainingGauges = container.querySelectorAll('.sentiment-gauge');
            if (remainingGauges.length === 0) {
                container.remove();
            }
        });
        
        console.log(`[Sentiment Cleanup] Removed ${expiredKeys.length} expired sentiment gauges`);
    }
}

// Make available globally
window.popoutUtils = window.popoutUtils || {};
window.popoutUtils.UnifiedPollingDisplayComponent = UnifiedPollingDisplayComponent;