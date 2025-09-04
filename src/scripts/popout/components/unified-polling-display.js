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
        console.log('[Unified Poll Display] Component initialized');
    }

    /**
     * Initialize with DOM container and settings
     */
    initialize(container, settings) {
        this.container = container;
        this.settings = settings;
        console.log('[Unified Poll Display] Initialized with container:', container);
    }

    /**
     * Update settings when they change
     */
    updateSettings(newSettings) {
        this.settings = newSettings;
        console.log('[Unified Poll Display] Settings updated');
    }

    /**
     * Main update method - handles all unified poll types
     */
    updateUnifiedPollDisplay(unifiedPollData) {
        if (!this.container) return;
        
        console.log('[Unified Poll Display] 🎨 UPDATING DISPLAY:');
        console.log('  - shouldDisplay:', unifiedPollData.shouldDisplay);
        console.log('  - isActive:', unifiedPollData.isActive);
        console.log('  - isConcluded:', unifiedPollData.isConcluded);
        console.log('  - pollType:', unifiedPollData.pollType);
        console.log('  - counts:', unifiedPollData.counts);
        
        const { shouldDisplay, isActive, isConcluded, pollType } = unifiedPollData;

        // Hide container if poll shouldn't be displayed
        this.container.style.display = shouldDisplay ? 'block' : 'none';
        if (!shouldDisplay) {
            this.container.innerHTML = '';
            return;
        }

        // Setup container styling based on poll type
        this.container.style.maxWidth = '100%';
        this.container.style.boxSizing = 'border-box';
        
        // Handle background and layout for different poll types
        if (pollType === 'yesno' || unifiedPollData.sentimentData?.shouldDisplay || !shouldDisplay) {
            // Yes/no polls, sentiment gauges, and empty state: transparent background
            this.container.style.backgroundColor = 'transparent';
            this.container.style.padding = '0';
            this.container.style.margin = '0';
        } else {
            // Other active polls: dark background container
            this.container.style.backgroundColor = '#111111';
            this.container.style.padding = '8px';
        }

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
        if (isConcluded) {
            console.log('[Unified Poll Display] 🏁 Rendering CONCLUDED poll - RESULTS should show here!');
            this.renderConcludedPoll(unifiedPollData, titleElement, contentElement);
        } else if (isActive) {
            console.log('[Unified Poll Display] 🟢 Rendering ACTIVE poll');
            this.renderActivePoll(unifiedPollData, titleElement, contentElement);
        } else if (unifiedPollData.sentimentData?.shouldDisplay) {
            console.log('[Unified Poll Display] 💭 Rendering sentiment tracking');
            // Handle ongoing sentiment tracking (not an active poll)
            this.renderSentimentTracking(unifiedPollData.sentimentData, titleElement, contentElement);
        } else {
            console.log('[Unified Poll Display] ❓ No rendering condition met - poll will be empty');
            // Log sentiment state for debugging
            console.log('[Debug] Sentiment data:', unifiedPollData.sentimentData);
        }

        // Handle layout for specific poll types
        if (pollType === 'yesno') {
            // Yes/no polls: clean centered layout
            this.container.style.display = 'flex';
            this.container.style.justifyContent = 'center';
            this.container.style.alignItems = 'center';
            this.container.style.minHeight = '60px';
            
            // Hide title for yes/no polls
            titleElement.style.display = 'none';
        } else if (unifiedPollData.sentimentData?.shouldDisplay) {
            // Sentiment: flexible layout for individual gauges
            this.container.style.display = 'block';
            this.container.style.minHeight = 'auto';
            
            // Hide title for sentiment
            titleElement.style.display = 'none';
        } else {
            // Other polls: normal layout with title
            this.container.style.display = 'block';
            this.container.style.minHeight = 'auto';
            titleElement.style.display = 'block';
        }
    }

    /**
     * Render active poll - all types during voting
     */
    renderActivePoll(pollData, titleElement, contentElement) {
        const { pollType, counts } = pollData;
        
        // Add live indicator
        titleElement.innerHTML = `
            <span style="font-size: 16px;">Live Polling... (${pollType.toUpperCase()})</span>
            <span style="display: inline-block; width: 8px; height: 8px; background: #00ff00; 
                       border-radius: 50%; margin-left: 8px; animation: pulse 1s infinite;">
            </span>
        `;

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
        titleElement.textContent = '';
        
        console.log('[Unified Poll Display] 💭 Rendering sentiment tracking with data:', sentimentData);
        
        // Handle unified polling sentiment data format
        if (sentimentData && sentimentData.items && sentimentData.items.length > 0) {
            // Use the correct settings path for maxDisplayItems
            const maxDisplayItems = this.settings.polling?.unifiedPolling?.sentiment?.maxDisplayItems || 
                                   sentimentData.maxDisplayItems || 5;
            
            // sentimentData.items is already an array of {term, count, percentage}
            const sortedData = sentimentData.items
                .sort((a, b) => b.count - a.count)
                .slice(0, maxDisplayItems)
                .map(item => ({ value: item.term, count: item.count }));
                
            console.log('[Unified Poll Display] 💭 Processed sortedData:', sortedData);
            this.updateSentimentGauges(contentElement, sortedData);
        } else if (sentimentData && sentimentData.counts && Object.keys(sentimentData.counts).length > 0) {
            // Fallback for generic polling format (counts object)
            const sortedData = Object.entries(sentimentData.counts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, this.settings.polling?.generic?.sentiment?.maxDisplayItems || 5)
                .map(([value, count]) => ({ value, count }));
                
            this.updateSentimentGauges(contentElement, sortedData);
        } else {
            console.log('[Unified Poll Display] 💭 No sentiment data to display');
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
            contentElement.innerHTML = '<div style="text-align: center; opacity: 0.7;">Waiting for votes...</div>';
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

        // Get configurable limits
        const maxDisplayItems = this.settings.unifiedPolling?.numbers?.maxDisplayItems || 15;
        const maxBins = this.settings.unifiedPolling?.numbers?.maxBins || 10;

        // Determine if we need binning
        let displayData;
        if (entries.length > maxDisplayItems) {
            displayData = this.createBins(filteredData, maxBins);
        } else {
            displayData = entries
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .slice(0, maxDisplayItems)
                .map(([key, count]) => ({ label: key, count }));
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

        // Get configurable limit
        const maxDisplayItems = this.settings.unifiedPolling?.letters?.maxDisplayItems || 15;

        const displayData = entries
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(0, maxDisplayItems)
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
        console.log('[Unified Poll Display] 🔢 Rendering concluded NUMBERS poll with results:', results);
        
        // Clear the content element to show only results
        contentElement.innerHTML = '';
        
        // If we got computed results (has average), use them
        if (results.average !== undefined) {
            console.log('[Unified Poll Display] 📊 Showing statistical results');
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
                <div style="font-size: 12px; margin-bottom: 8px; color: #ccc; text-align: center;">Top Response: ${modeText}</div>
                <div style="font-size: 12px;">${histogramHtml}</div>
                <div style="font-size: 10px; margin-top: 5px; color: #ccc; text-align: right;">Total: ${results.totalVotes} votes${outlierInfo}</div>
            `;
        } else {
            // We got raw counts, compute statistics on the fly
            console.log('[Unified Poll Display] 🧮 Computing statistics from raw counts:', results);
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
            
            titleElement.textContent = `Average: ${average.toFixed(1)}`;
            
            // Prepare data for bar chart
            const entries = Object.entries(filteredData);
            let displayData;
            
            // Get configurable limits (same as active numbers)
            const maxDisplayItems = this.settings.unifiedPolling?.numbers?.maxDisplayItems || 15;
            const maxBins = this.settings.unifiedPolling?.numbers?.maxBins || 10;
            
            // Determine if we need binning (same logic as active numbers)
            if (entries.length > maxDisplayItems) {
                displayData = this.createBins(filteredData, maxBins);
            } else {
                displayData = entries
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .slice(0, maxDisplayItems)
                    .map(([key, count]) => ({ label: key, count }));
            }
            
            // Create container for stats and bars
            const statsDiv = document.createElement('div');
            statsDiv.style.cssText = 'padding: 4px; max-width: 100%; box-sizing: border-box;';
            
            // Add statistics header
            const statsHeader = document.createElement('div');
            statsHeader.style.cssText = 'font-size: 11px; margin-bottom: 8px; color: #ccc; text-align: center; word-wrap: break-word;';
            statsHeader.innerHTML = `Most Common: ${modeText}<br>Median: ${median}`;
            
            // Add bars container
            const barsContainer = document.createElement('div');
            
            // Add totals footer
            const footerText = outliersRemoved > 0 
                ? `Total: ${filteredTotal} votes | Outliers removed: ${outliersRemoved}`
                : `Total: ${filteredTotal} votes`;
            const statsFooter = document.createElement('div');
            statsFooter.style.cssText = 'font-size: 10px; margin-top: 5px; color: #ccc; text-align: center;';
            statsFooter.textContent = footerText;
            
            // Assemble the display
            statsDiv.appendChild(statsHeader);
            statsDiv.appendChild(barsContainer);
            statsDiv.appendChild(statsFooter);
            contentElement.appendChild(statsDiv);
            
            // Render the bar chart
            this.renderBarChart(displayData, barsContainer, { showPercentages: true, total: filteredTotal });
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
            const barColor = isWinner ? 'linear-gradient(90deg, #4CAF50, #66BB6A)' : 'linear-gradient(90deg, #2196F3, #64B5F6)';
            
            return `
                <div style="margin: 2px 0; display: flex; align-items: center; min-width: 0;">
                    <div style="min-width: 30px; width: 30px; font-size: 11px; margin-right: 6px; text-align: right; flex-shrink: 0; ${isWinner ? 'color: #4CAF50; font-weight: bold;' : ''}">${letter.toUpperCase()}</div>
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
        const { showPercentages = false, total = 0 } = options;
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
                <div style="font-size: 10px; margin-top: 4px; opacity: 0.7; color: #ccc; text-align: center;">${totalText}</div>
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
        const configuredWidth = this.settings.polling?.unifiedPolling?.yesno?.width || 320;
        const availableWidth = window.innerWidth - 40; // Account for padding/margins
        const gaugeWidth = Math.min(configuredWidth, availableWidth);
        const gaugeHeight = 32;

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
            if (!contentElement.querySelector('.waiting-message')) {
                contentElement.innerHTML = '<div class="waiting-message" style="text-align: center; opacity: 0.7;">Waiting for votes...</div>';
            }
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
        
        console.log('[Yes/No Colors] Using colors from settings:', { yesColorFromSettings, noColorFromSettings });
        
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
        const configuredWidth = this.settings.polling?.unifiedPolling?.yesno?.width || 320;
        const availableWidth = window.innerWidth - 40; // Account for padding/margins
        const gaugeWidth = Math.min(configuredWidth, availableWidth);
        const gaugeHeight = 32;

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
        
        // Get existing gauge elements to reuse them for smooth animations
        const existingGauges = Array.from(contentElement.querySelectorAll('.sentiment-gauge'));
        const existingGaugeMap = new Map();
        
        // Create a map of existing gauges by their data value
        existingGauges.forEach(gauge => {
            const dataValue = gauge.getAttribute('data-value');
            if (dataValue) {
                existingGaugeMap.set(dataValue, gauge);
            }
        });
        
        // Track which gauges we're keeping
        const usedGauges = new Set();
        
        sortedData.forEach(({ value, count }, index) => {
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
            const gaugeColor = isAtMaxWidth ? 
                'linear-gradient(90deg, #FF4444, #CC0000)' : 
                'linear-gradient(90deg, #2196F3, #64B5F6)';
            
            // Create display label
            let displayLabel;
            if (value && typeof value === 'object' && (value.src || value.url)) {
                const imgSrc = value.src || value.url;
                const imgAlt = value.alt || value.name || 'emote';
                displayLabel = `<img src="${imgSrc}" alt="${imgAlt}" style="height: 18px; width: auto; vertical-align: middle;" onerror="this.style.display='none';this.nextSibling.style.display='inline'"><span style="display:none">${imgAlt}</span>`;
            } else {
                const textValue = typeof value === 'object' ? (value.alt || value.name || value.toString()) : String(value);
                displayLabel = textValue.charAt(0).toUpperCase() + textValue.slice(1);
            }
            
            // Calculate label width to ensure gauge-bar fits content
            let labelWidthPx = 0;
            if (displayLabel && !displayLabel.includes('<img')) {
                // Create temporary element to measure text width
                const tempElement = document.createElement('div');
                tempElement.style.cssText = 'position: absolute; visibility: hidden; font-size: 11px; font-weight: 500; white-space: nowrap; padding-left: 6px;';
                tempElement.textContent = displayLabel;
                document.body.appendChild(tempElement);
                labelWidthPx = tempElement.offsetWidth;
                document.body.removeChild(tempElement);
            } else if (displayLabel && displayLabel.includes('<img')) {
                // For emotes, estimate width (18px image + some padding)
                labelWidthPx = 30;
            }
            
            // Use the maximum of fill width and label width for gauge-bar
            const gaugeBarWidthPx = Math.max(fillWidthPx, labelWidthPx, 100);
            
            // Try to reuse existing gauge element for this value
            const valueKey = String(value);
            let gaugeElement = existingGaugeMap.get(valueKey);
            
            if (gaugeElement) {
                // Reuse existing element - just update the fill width and color
                usedGauges.add(gaugeElement);
                
                // Update the gauge bar width (the outer container)
                const gaugeBar = gaugeElement.querySelector('.gauge-bar');
                if (gaugeBar) {
                    gaugeBar.style.width = `${gaugeBarWidthPx}px`;
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
                if (contentElement.children[index] !== gaugeElement) {
                    if (index < contentElement.children.length) {
                        contentElement.insertBefore(gaugeElement, contentElement.children[index]);
                    } else {
                        contentElement.appendChild(gaugeElement);
                    }
                }
            } else {
                // Create new gauge element
                gaugeElement = document.createElement('div');
                gaugeElement.className = 'sentiment-gauge';
                gaugeElement.setAttribute('data-value', valueKey);
                gaugeElement.style.cssText = `
                    margin: 3px 0; 
                    display: block; 
                    background: black; 
                    border-radius: 4px; 
                    padding: 4px 6px; 
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
                    width: fit-content;
                `;
                
                gaugeElement.innerHTML = `
                    <div class="gauge-bar" style="
                        width: ${gaugeBarWidthPx}px; 
                        height: 20px; 
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
                        <div class="gauge-label" style="position: relative; z-index: 1; font-size: 11px; color: white; font-weight: 500; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8); white-space: nowrap; padding-left: 6px;">${displayLabel}</div>
                    </div>
                `;
                
                // Insert at correct position
                if (index < contentElement.children.length) {
                    contentElement.insertBefore(gaugeElement, contentElement.children[index]);
                } else {
                    contentElement.appendChild(gaugeElement);
                }
                usedGauges.add(gaugeElement);
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
}

// Make available globally
window.popoutUtils = window.popoutUtils || {};
window.popoutUtils.UnifiedPollingDisplayComponent = UnifiedPollingDisplayComponent;