// Polling Component - Handles all polling display functionality
// Extracted from popout.js during Phase 2 refactoring

/**
 * PollingComponent handles both Yes/No and Generic polling displays
 */
class PollingComponent {
    constructor() {
        this.yesNoContainer = null;
        this.yesBarElement = null;
        this.noBarElement = null;
        this.yesPollLabelElement = null;
        this.noPollLabelElement = null;
        this.pollWinnerTextElement = null;
        this.genericContainer = null;
        this.settings = {};
    }

    /**
     * Initialize with DOM elements and settings
     */
    initialize(yesNoElements, genericContainer, settings) {
        this.yesNoContainer = yesNoElements.container;
        this.yesBarElement = yesNoElements.yesBar;
        this.noBarElement = yesNoElements.noBar;
        this.yesPollLabelElement = yesNoElements.yesLabel;
        this.noPollLabelElement = yesNoElements.noLabel;
        this.pollWinnerTextElement = yesNoElements.winnerText;
        this.genericContainer = genericContainer;
        this.settings = settings;
        console.log(`[Polling] Initialize - Full settings:`, settings);
        console.log(`[Polling] Initialize - genericPollMinWidth paths:`, {
            direct: settings.genericPollMinWidth,
            stylingPolling: settings.styling?.polling?.genericPollMinWidth,
            stylingRoot: settings.styling?.genericPollMinWidth
        });
    }

    /**
     * Update settings when they change
     */
    updateSettings(newSettings) {
        this.settings = newSettings;
        console.log('[Polling] Settings updated');
        console.log(`[Polling] New sentiment settings:`, {
            genericPollSentimentMaxGaugeValue: newSettings.genericPollSentimentMaxGaugeValue,
            genericPollSentimentMaxGrowthWidth: newSettings.genericPollSentimentMaxGrowthWidth
        });
    }

    /**
     * Update Yes/No poll display
     */
    updateYesNoDisplay(pollData) {
        if (!this.yesNoContainer) return;
        const { yesCount, noCount, total, isConcluded, shouldDisplay, winnerMessage } = pollData;

        this.yesNoContainer.style.display = shouldDisplay ? 'flex' : 'none';
        if (shouldDisplay) {
            const yesPct = total > 0 ? (yesCount / total) * 100 : 0;
            const noPct = total > 0 ? (noCount / total) * 100 : 0;
            this.yesBarElement.style.width = `${yesPct}%`;
            this.noBarElement.style.width = `${noPct}%`;
            this.yesPollLabelElement.textContent = `${yesPct.toFixed(0)}% Yes`;
            this.noPollLabelElement.textContent = `${noPct.toFixed(0)}% No`;
            this.pollWinnerTextElement.textContent = isConcluded ? winnerMessage : '';
            this.pollWinnerTextElement.style.display = isConcluded ? 'block' : 'none';
        }
    }

    /**
     * Apply lightweight outlier filtering for live display
     * Uses the same logic as the main applyIQRFilter but simplified for live view
     */
    filterOutliersForLiveDisplay(data) {
        const entries = Object.entries(data);
        if (entries.length <= 4) return data; // Need at least 5 points for IQR
        
        // Calculate weighted values for quartile calculation (same as main IQR filter)
        const values = [];
        entries.forEach(([num, count]) => {
            for (let i = 0; i < count; i++) {
                values.push(parseInt(num));
            }
        });
        
        values.sort((a, b) => a - b);
        
        // Calculate quartiles
        const q1Index = Math.floor(values.length * 0.25);
        const q3Index = Math.floor(values.length * 0.75);
        const q1 = values[q1Index];
        const q3 = values[q3Index];
        const iqr = q3 - q1;
        
        // Define outlier bounds (same as main filter)
        const lowerBound = q1 - (1.5 * iqr);
        const upperBound = q3 + (1.5 * iqr);
        
        // Filter out outliers
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
        
        // Only apply filter if we're removing less than 25% of the data (same safety as main filter)
        if (removedCount / values.length < 0.25) {
            filteredData._outliersRemoved = removedCount;
            return filteredData;
        }
        
        return data; // Return original data if too many outliers would be removed
    }

    /**
     * Helper function for live binning of number data
     */
    createLiveBins(data) {
        const numbers = Object.keys(data).map(Number);
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        const range = max - min;
        const numBins = Math.min(8, Object.keys(data).length);
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
        
        // Assign values to bins
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
     * Update generic poll display
     * Note: This is a simplified version - the full implementation is very large
     * and would need to be broken down further in Phase 3
     */
    updateGenericDisplay(genericPollData) {
        if (!this.genericContainer) return;
        
        const { shouldDisplay } = genericPollData;
        
        // Check if there are any highlighted messages visible
        const messageTarget = document.getElementById('messageTarget');
        const hasVisibleMessages = messageTarget && messageTarget.children.length > 0;
        
        // Only show if should display AND no messages are visible
        const actuallyDisplay = shouldDisplay && !hasVisibleMessages;
        this.genericContainer.style.display = actuallyDisplay ? 'block' : 'none';
        
        if (!shouldDisplay) {
            this.genericContainer.innerHTML = '';
            return;
        }


        // Set background based on poll type
        if (genericPollData.monitoringType === 'sentiment') {
            this.genericContainer.style.backgroundColor = 'transparent';
        } else {
            this.genericContainer.style.backgroundColor = '#111111';
        }

        // Create title and content elements
        const titleElement = document.createElement('div');
        titleElement.style.cssText = 'font-weight: bold; margin-bottom: 8px; color: #fff; text-align: center; font-size: 14px;';
        
        const contentElement = document.createElement('div');
        contentElement.style.cssText = 'color: #fff;';

        // Handle different poll states and types
        const { isActive, isConcluded, monitoringType, tracker } = genericPollData;

        if (isActive || isConcluded) {
            // Active or concluded polls
            this.renderActivePoll(genericPollData, titleElement, contentElement);
        } else if (monitoringType === 'sentiment' && tracker) {
            // Sentiment tracking
            this.renderSentimentTracker(tracker, titleElement, contentElement);
        } else {
        }

        // Add elements to container
        // For sentiment tracking, try to preserve existing contentElement to avoid recreating DOM elements
        if (monitoringType === 'sentiment' && !isActive && !isConcluded) {
            // Check if we already have the right structure
            const existingTitle = this.genericContainer.children[0];
            const existingContent = this.genericContainer.children[1];
            
            if (existingTitle && existingContent) {
                // Update existing title and content instead of replacing
                existingTitle.textContent = titleElement.textContent;
                existingTitle.innerHTML = titleElement.innerHTML;
                // Don't replace contentElement - let updateSentimentGauges handle it
            } else {
                // First time - create the structure
                this.genericContainer.innerHTML = '';
                this.genericContainer.appendChild(titleElement);
                this.genericContainer.appendChild(contentElement);
            }
        } else {
            // For other poll types, replace everything as before
            this.genericContainer.innerHTML = '';
            this.genericContainer.appendChild(titleElement);
            this.genericContainer.appendChild(contentElement);
        }
        
    }

    /**
     * Render active or concluded poll (simplified)
     */
    renderActivePoll(pollData, titleElement, contentElement) {
        const { isActive, isConcluded, tracker } = pollData;
        
        if (isConcluded && tracker && (tracker.results || tracker.data)) {
            // Display final poll results
            this.renderConcludedPoll(tracker, titleElement, contentElement);
        } else if (isActive && tracker) {
            if (tracker.type === 'numbers') {
                titleElement.innerHTML = `
                    <span style="font-size: 16px;">Live Polling...</span>
                    <span style="display: inline-block; width: 8px; height: 8px; background: #00ff00; 
                               border-radius: 50%; margin-left: 8px; animation: pulse 1s infinite;">
                    </span>
                `;
                
                // Filter outliers first for live display
                const filteredData = this.filterOutliersForLiveDisplay(tracker.data);
                const outliersRemoved = filteredData._outliersRemoved || 0;
                delete filteredData._outliersRemoved; // Remove metadata before processing
                
                // Show live data with bars (simplified version)
                const uniqueCount = Object.keys(filteredData).length;
                let displayData;
                
                if (uniqueCount > 12) {
                    displayData = this.createLiveBins(filteredData);
                } else {
                    displayData = Object.entries(filteredData)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .slice(0, 10)
                        .map(([key, count]) => ({ label: key, count }));
                }
                
                const maxCount = Math.max(...displayData.map(d => d.count));
                const dataHtml = displayData.map(({ label, count }) => {
                    const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return `
                        <div style="margin: 2px 0; display: flex; align-items: center;">
                            <div style="min-width: 40px; font-size: 12px; color: white; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8); text-align: right; margin-right: 8px;">${label}</div>
                            <div style="flex: 1; background: rgba(255,255,255,0.1); height: 16px; border-radius: 6px; overflow: hidden;">
                                <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(90deg, #2196F3, #64B5F6); transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    `;
                }).join('');
                
                // Add outlier notification if any were removed
                const outlierNotification = outliersRemoved > 0 ? 
                    `<div style="font-size: 10px; margin-top: 4px; opacity: 0.7; color: #ffa500;">
                        ${outliersRemoved} outlier${outliersRemoved > 1 ? 's' : ''} hidden
                    </div>` : '';
                
                contentElement.innerHTML = `<div style="font-size: 12px;">${dataHtml}</div>${outlierNotification}`;
            } else {
                // Handle letters and other poll types
                titleElement.innerHTML = `
                    <span style="font-size: 16px;">Live Polling...</span>
                    <span style="display: inline-block; width: 8px; height: 8px; background: #00ff00; 
                               border-radius: 50%; margin-left: 8px; animation: pulse 1s infinite;">
                    </span>
                `;
                
                // Sort alphabetically and show similar to non-binned number polling
                const displayData = Object.entries(tracker.data)
                    .sort(([a], [b]) => a.localeCompare(b))  // Alphabetical sorting
                    .slice(0, 10)
                    .map(([key, count]) => ({ label: key, count }));
                
                const total = displayData.reduce((sum, d) => sum + d.count, 0);
                const maxCount = Math.max(...displayData.map(d => d.count));
                
                const dataHtml = displayData.map(({ label, count }) => {
                    const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    const displayLabel = label.toUpperCase(); // Capitalize letters for display
                    return `
                        <div style="margin: 2px 0; display: flex; align-items: center;">
                            <div style="min-width: 40px; font-size: 12px; color: white; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8); text-align: right; margin-right: 8px;">${displayLabel}</div>
                            <div style="flex: 1; background: rgba(255,255,255,0.1); height: 16px; border-radius: 6px; overflow: hidden; position: relative;">
                                <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(90deg, #2196F3, #64B5F6); transition: width 0.3s ease;"></div>
                                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8); pointer-events: none;">${percentage}%</div>
                            </div>
                        </div>
                    `;
                }).join('');
                
                contentElement.innerHTML = `
                    <div style="font-size: 12px;">${dataHtml}</div>
                    <div style="font-size: 10px; margin-top: 4px; opacity: 0.7; color: #ccc;">Total: ${total} responses</div>
                `;
            }
        }
    }

    /**
     * Render concluded poll results
     */
    renderConcludedPoll(tracker, titleElement, contentElement) {
        const results = tracker.results;
        titleElement.textContent = `${tracker.type.toUpperCase()} POLL RESULTS`;
        
        switch (results.type) {
            case 'numbers':
                // Create title with average
                titleElement.textContent = `Average: ${results.average}`;
                
                // Create subtitle with modes
                const modeText = Array.isArray(results.mode) ? results.mode.join(', ') : results.mode;
                const subtitle = `Mode: ${modeText}`;
                
                // Create histogram with visual bars
                let histogramHtml = '';
                if (results.binned) {
                    histogramHtml = results.histogram.map(item => {
                        const percentage = Math.round(parseFloat(item.percentage));
                        const barWidth = Math.min(percentage, 100);
                        return `
                            <div style="margin: 3px 0; display: flex; align-items: center;">
                                <div style="min-width: 50px; font-size: 11px; margin-right: 8px; text-align: right;">${item.value}</div>
                                <div style="flex: 1; background: rgba(255,255,255,0.2); height: 16px; border-radius: 6px; overflow: hidden; position: relative;">
                                    <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(90deg, #2196F3, #64B5F6); transition: width 0.3s ease;"></div>
                                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8); pointer-events: none;">${percentage}%</div>
                                </div>
                            </div>
                        `;
                    }).join('');
                } else {
                    // Individual results - show with bars and percentages
                    histogramHtml = results.histogram.slice(0, 10).map(item => {
                        const percentage = Math.round(parseFloat(item.percentage));
                        const barWidth = Math.min(percentage, 100);
                        return `
                            <div style="margin: 3px 0; display: flex; align-items: center;">
                                <div style="min-width: 50px; font-size: 11px; margin-right: 8px; text-align: right;">${item.value}</div>
                                <div style="flex: 1; background: rgba(255,255,255,0.2); height: 16px; border-radius: 6px; overflow: hidden; position: relative;">
                                    <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(90deg, #2196F3, #64B5F6); transition: width 0.3s ease;"></div>
                                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8); pointer-events: none;">${percentage}%</div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
                
                // Add outlier information if available
                const outlierInfo = results.outliersRemoved > 0 ? ` | Outliers: ${results.outliersRemoved}` : '';
                
                contentElement.innerHTML = `
                    <div style="font-size: 12px; margin-bottom: 8px; color: #ccc; text-align: center;">${subtitle}</div>
                    <div style="font-size: 12px;">${histogramHtml}</div>
                    <div style="font-size: 10px; margin-top: 5px; color: #ccc; text-align: right;">Total: ${results.totalVotes} votes${outlierInfo}</div>
                `;
                break;
                
            case 'letters':
            case 'text':
                // Find the winning letter
                const sortedLetters = Object.entries(tracker.data)
                    .sort(([,a], [,b]) => b - a); // Sort by count for winner
                const winner = sortedLetters.length > 0 ? sortedLetters[0] : null;
                
                if (winner) {
                    titleElement.innerHTML = `<span style="font-size: 24px; font-weight: bold;">Winner: ${winner[0].toUpperCase()}</span>`;
                } else {
                    titleElement.textContent = `${tracker.type.toUpperCase()} POLL RESULTS`;
                }
                
                // Sort alphabetically for display (same as live view)
                const letterDisplayData = Object.entries(tracker.data)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .slice(0, 10);
                
                const letterTotal = letterDisplayData.reduce((sum, [,count]) => sum + count, 0);
                const letterMaxCount = Math.max(...letterDisplayData.map(([,count]) => count));
                
                const letterHistogramHtml = letterDisplayData.map(([letter, count]) => {
                    const percentage = letterTotal > 0 ? Math.round((count / letterTotal) * 100) : 0;
                    const barWidth = letterMaxCount > 0 ? (count / letterMaxCount) * 100 : 0;
                    const displayLetter = letter.toUpperCase(); // Capitalize letters for display
                    return `
                        <div style="margin: 3px 0; display: flex; align-items: center;">
                            <div style="min-width: 50px; font-size: 11px; margin-right: 8px; text-align: right;">${displayLetter}</div>
                            <div style="flex: 1; background: rgba(255,255,255,0.2); height: 16px; border-radius: 6px; overflow: hidden; position: relative;">
                                <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(90deg, #2196F3, #64B5F6); transition: width 0.3s ease;"></div>
                                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8); pointer-events: none;">${percentage}%</div>
                            </div>
                        </div>
                    `;
                }).join('');
                
                contentElement.innerHTML = `
                    <div style="font-size: 12px;">${letterHistogramHtml}</div>
                    <div style="font-size: 10px; margin-top: 5px; color: #ccc;">Total: ${letterTotal} votes</div>
                `;
                break;
                
            default:
                contentElement.innerHTML = `<div style="color: #ccc;">Results available</div>`;
                break;
        }
    }

    /**
     * Render sentiment tracker (simplified)
     */
    renderSentimentTracker(tracker, titleElement, contentElement) {
        titleElement.textContent = '';
        
        if (tracker.sortedData && tracker.sortedData.length > 0) {
            // Get base max value for gauge calculation - no global scaling needed since bars handle overflow individually
            const sentimentGaugeMax = this.settings.genericPollSentimentMaxGaugeValue || 30;
            const sentimentMaxGrowthWidth = this.settings.genericPollSentimentMaxGrowthWidth || 150;
            
            console.log(`[Sentiment] Settings check - Max Gauge Value: ${sentimentGaugeMax}, Max Growth Width: ${sentimentMaxGrowthWidth}`);
            console.log(`[Sentiment] Raw settings:`, {
                genericPollSentimentMaxGaugeValue: this.settings.genericPollSentimentMaxGaugeValue,
                genericPollSentimentMaxGrowthWidth: this.settings.genericPollSentimentMaxGrowthWidth
            });
            
            // Use existing contentElement from DOM if available, otherwise use the new one
            const existingContent = this.genericContainer.children[1];
            const targetContentElement = existingContent || contentElement;
            
            // Use smarter DOM updates for smooth transitions
            this.updateSentimentGauges(targetContentElement, tracker.sortedData, sentimentGaugeMax, sentimentMaxGrowthWidth);
        } else {
            // No sentiment data - clear existing content
            const existingContent = this.genericContainer.children[1];
            const targetContentElement = existingContent || contentElement;
            targetContentElement.innerHTML = '';
        }
    }

    updateSentimentGauges(contentElement, sortedData, sentimentGaugeMax, sentimentMaxGrowthWidth) {
        const existingItems = new Map();
        const existingElements = contentElement.querySelectorAll('[data-sentiment-key]');
        
        console.log(`[Sentiment] Found ${existingElements.length} existing elements`);
        
        // Store existing elements by their key
        existingElements.forEach(el => {
            const key = el.getAttribute('data-sentiment-key');
            console.log(`[Sentiment] Existing element key: "${key}"`);
            existingItems.set(key, el);
        });

        // Process each sentiment item
        const itemsToKeep = new Set();
        
        sortedData.forEach(({ value, count }, index) => {
            console.log(`[Sentiment] Processing item - value:`, value, `count: ${count}, type: ${typeof value}`);
            
            // Calculate fill width in pixels based on sentiment count
            const baseWidth = 100; // Base width in pixels for the gauge
            const countRatio = count / sentimentGaugeMax;
            
            // Calculate fill width - grows beyond base width based on sentiment count
            let fillWidthPx;
            if (countRatio <= 1) {
                // Normal range: scale within base width
                fillWidthPx = baseWidth * countRatio;
            } else {
                // Overflow range: grow beyond base width up to max growth width
                const overflowAmount = (countRatio - 1) * baseWidth;
                const cappedOverflow = Math.min(overflowAmount, sentimentMaxGrowthWidth - baseWidth);
                fillWidthPx = baseWidth + cappedOverflow;
            }
            
            console.log(`[Sentiment] Fill calculation - count: ${count}, max: ${sentimentGaugeMax}, ratio: ${countRatio}, fillWidth: ${fillWidthPx}px, maxGrowth: ${sentimentMaxGrowthWidth}px`);
            
            // Determine if gauge is at maximum width for color change
            const isAtMaxWidth = fillWidthPx >= sentimentMaxGrowthWidth;
            const gaugeColor = isAtMaxWidth ? 
                'linear-gradient(90deg, #FF4444, #CC0000)' : // Red gradient when at max width
                'linear-gradient(90deg, #2196F3, #64B5F6)';   // Default blue gradient
            
            // Create a unique key for this sentiment item
            const sentimentKey = typeof value === 'object' ? 
                (value.alt || value.src || value.name || JSON.stringify(value)) : 
                String(value);
            
            console.log(`[Sentiment] Looking for sentiment key: "${sentimentKey}"`);
            itemsToKeep.add(sentimentKey);
            
            let displayLabel;
            if (value && typeof value === 'object' && (value.src || value.url)) {
                // Handle emote/image objects
                const imgSrc = value.src || value.url;
                const imgAlt = value.alt || value.name || 'emote';
                displayLabel = `<img src="${imgSrc}" alt="${imgAlt}" style="height: 18px; width: auto; vertical-align: middle;" onerror="this.style.display='none';this.nextSibling.style.display='inline'"><span style="display:none">${imgAlt}</span>`;
                console.log(`[Sentiment] Generated emote HTML - src: ${imgSrc}, alt: ${imgAlt}`);
            } else {
                // Handle text values
                const textValue = typeof value === 'object' ? (value.alt || value.name || value.toString()) : String(value);
                displayLabel = textValue.charAt(0).toUpperCase() + textValue.slice(1);
                console.log(`[Sentiment] Generated text label: ${displayLabel}`);
            }
            
            // Container will size itself to fit its children (label or fill, whichever is wider)
            
            let existingElement = existingItems.get(sentimentKey);
            
            if (existingElement) {
                // Update existing element without recreating it
                console.log(`[Sentiment] Updating existing element: ${sentimentKey}`);
                const rowContainer = existingElement;
                const gaugeContainer = rowContainer.querySelector('.sentiment-gauge-container');
                const fillElement = rowContainer.querySelector('.sentiment-gauge-fill');
                const labelElement = rowContainer.querySelector('.sentiment-gauge-container > div:last-child');
                
                // Update gauge fill with pixel width and color
                if (fillElement) {
                    fillElement.style.width = `${fillWidthPx}px`;
                    fillElement.style.background = gaugeColor;
                }
                
                // Update gauge container to fit whichever is wider: label or fill
                if (gaugeContainer && labelElement) {
                    // Account for label's padding-left
                    const labelWidth = labelElement.offsetWidth + 8; // +8 for label's padding-left
                    const containerWidth = Math.max(fillWidthPx, labelWidth);
                    gaugeContainer.style.width = `${containerWidth}px`;
                    gaugeContainer.style.transition = 'width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    console.log(`[Sentiment] Container sizing - labelWidth: ${labelWidth}px, fillWidth: ${fillWidthPx}px, using: ${containerWidth}px`);
                }
                
                // Update the label 
                if (labelElement) {
                    labelElement.innerHTML = displayLabel;
                }
                
                // Ensure proper order (only move if necessary to avoid triggering reflows)
                const targetIndex = index;
                const currentIndex = Array.from(contentElement.children).indexOf(rowContainer);
                if (currentIndex !== targetIndex && currentIndex !== -1) {
                    console.log(`[Sentiment] Reordering ${sentimentKey} from ${currentIndex} to ${targetIndex}`);
                    if (targetIndex >= contentElement.children.length) {
                        contentElement.appendChild(rowContainer);
                    } else {
                        contentElement.insertBefore(rowContainer, contentElement.children[targetIndex]);
                    }
                }
            } else {
                console.log(`[Sentiment] Creating new element: ${sentimentKey}`);
                // Create new element
                const newElement = document.createElement('div');
                newElement.setAttribute('data-sentiment-key', sentimentKey);
                newElement.className = 'sentiment-row-container';
                newElement.style.cssText = `
                    margin: 4px 0; 
                    display: flex; 
                    align-items: center; 
                    background: rgba(0, 0, 0, 0.8); 
                    border-radius: 6px; 
                    padding: 6px 8px; 
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    width: max-content;
                `;
                
                // Create container HTML with initial sizing
                const tempLabelElement = document.createElement('span');
                tempLabelElement.style.cssText = 'position: absolute; visibility: hidden; white-space: nowrap; font-size: 12px; font-weight: 500;';
                tempLabelElement.innerHTML = displayLabel;
                document.body.appendChild(tempLabelElement);
                const labelWidth = tempLabelElement.offsetWidth + 8; // +8 for label's padding-left
                document.body.removeChild(tempLabelElement);
                
                // Container fits whichever is wider: fill or label with padding
                const containerWidth = Math.max(fillWidthPx, labelWidth);
                console.log(`[Sentiment] New element sizing - labelWidth: ${labelWidth}px, fillWidth: ${fillWidthPx}px, using: ${containerWidth}px`);

                newElement.innerHTML = `
                    <div class="sentiment-gauge-container" style="
                        width: ${containerWidth}px; 
                        height: 24px; 
                        background: rgba(255,255,255,0.1); 
                        border-radius: 6px; 
                        position: relative;
                        display: flex;
                        align-items: center;
                        transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    ">
                        <div class="sentiment-gauge-fill" style="
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: ${fillWidthPx}px; 
                            height: 100%; 
                            background: ${gaugeColor}; 
                            transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.3s ease;
                            border-radius: 6px;
                        "></div>
                        <div style="position: relative; z-index: 1; font-size: 12px; color: white; font-weight: 500; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8); white-space: nowrap; padding-left: 8px;">${displayLabel}</div>
                    </div>
                `;
                
                // Insert at correct position
                if (index >= contentElement.children.length) {
                    contentElement.appendChild(newElement);
                } else {
                    contentElement.insertBefore(newElement, contentElement.children[index]);
                }
            }
        });
        
        // Remove elements that are no longer needed
        existingElements.forEach(el => {
            const key = el.getAttribute('data-sentiment-key');
            if (!itemsToKeep.has(key)) {
                el.remove();
            }
        });
        
        // Use requestAnimationFrame to ensure smooth transitions
        requestAnimationFrame(() => {
            const rowContainerElements = contentElement.querySelectorAll('.sentiment-row-container');
            const gaugeContainerElements = contentElement.querySelectorAll('.sentiment-gauge-container');
            const fillElements = contentElement.querySelectorAll('.sentiment-gauge-fill');
            
            // Force reflow for smooth transitions
            rowContainerElements.forEach(el => el.offsetWidth);
            gaugeContainerElements.forEach(el => el.offsetWidth);
            fillElements.forEach(el => el.offsetWidth);
        });
    }
}

// Make the class available globally for backward compatibility
window.popoutUtils = window.popoutUtils || {};
window.popoutUtils.PollingComponent = PollingComponent;