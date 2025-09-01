// Gauge Component - Handles gauge/counter display functionality
// Extracted from popout.js during Phase 2 refactoring

/**
 * GaugeComponent handles the gauge display, fill percentage, and peak indicators
 */
class GaugeComponent {
    constructor(containerElement, fillElement, indicatorElement, labelElement) {
        this.containerElement = containerElement;
        this.fillElement = fillElement;
        this.indicatorElement = indicatorElement;
        this.labelElement = labelElement;
        this.settings = {};
        this.pollState = { shouldDisplay: false };
    }

    /**
     * Update settings and poll state references
     */
    updateReferences(settings, pollState) {
        this.settings = settings;
        this.pollState = pollState;
    }

    /**
     * Update the gauge display based on gauge data
     */
    updateDisplay(gaugeData) {
        if (!this.fillElement) return;
        const { occurrenceCount, gaugeMaxValue } = gaugeData;

        // Only hide the gauge fill if the poll is actually being displayed
        if (this.pollState.shouldDisplay) {
            this.fillElement.style.width = '0%';
        } else {
            const fillPercentage = Math.min(100, Math.max(0, (occurrenceCount / gaugeMaxValue) * 100));
            this.fillElement.style.width = `${fillPercentage}%`;
        }
        this.updateVisibility(gaugeData);
    }

    /**
     * Update the recent max indicator and peak labels
     */
    updateRecentMaxIndicator(gaugeData) {
        if (!this.indicatorElement || !this.labelElement) return;
        const { recentMaxValue, gaugeMaxValue, peakLabels } = gaugeData;

        // Only hide the gauge indicators if the poll is actually being displayed
        if (this.pollState.shouldDisplay) {
            this.indicatorElement.style.display = 'none';
            this.labelElement.style.display = 'none';
            this.labelElement.classList.remove('plus2-shake-animation');
            return;
        }

        const indicatorPos = (recentMaxValue / gaugeMaxValue) * 100;
        let newLabelText = "";
        let labelInfo = {};

        if (recentMaxValue > 0) {
            if (indicatorPos >= 100) { 
                newLabelText = peakLabels.max.text; 
                labelInfo = { color: peakLabels.max.color, size: '20px', weight: 'bold' }; 
            } else if (indicatorPos >= 75) { 
                newLabelText = peakLabels.high.text; 
                labelInfo = { color: peakLabels.high.color, size: '20px', weight: 'bold' }; 
            } else if (indicatorPos >= 45) { 
                newLabelText = peakLabels.mid.text; 
                labelInfo = { color: peakLabels.mid.color, size: '18px', weight: 'bold' }; 
            } else if (indicatorPos >= 15) { 
                newLabelText = peakLabels.low.text; 
                labelInfo = { color: peakLabels.low.color, size: '16px', weight: 'bold' }; 
            }
        }

        if (newLabelText) {
            this.labelElement.textContent = newLabelText;
            this.labelElement.style.color = labelInfo.color;
            this.labelElement.style.fontSize = labelInfo.size;
            this.labelElement.style.fontWeight = labelInfo.weight;
            this.labelElement.style.textShadow = '-1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black';
            this.labelElement.style.display = 'flex';
            
            if (newLabelText === peakLabels.max.text && this.settings.enablePeakLabelAnimation) {
                this.labelElement.classList.add('plus2-shake-animation');
            } else if (this.settings.styling?.gauge?.enablePeakLabelAnimation) {
                this.labelElement.classList.remove('plus2-shake-animation');
            }
        } else {
            this.labelElement.style.display = 'none';
            this.labelElement.classList.remove('plus2-shake-animation');
        }

        if (recentMaxValue > 0) {
            this.indicatorElement.style.left = `calc(${Math.min(100, indicatorPos)}% - 1px)`;
            this.indicatorElement.style.display = 'block';
        } else {
            this.indicatorElement.style.display = 'none';
        }
        
        this.updateVisibility(gaugeData);
    }

    /**
     * Update gauge container visibility based on thresholds
     */
    updateVisibility(gaugeData) {
        if (!this.containerElement) return;
        const { occurrenceCount, recentMaxValue } = gaugeData;
        const threshold = this.settings.styling?.gauge?.gaugeMinDisplayThreshold || 3;
        const isGaugeVisible = (occurrenceCount >= threshold || recentMaxValue >= threshold);
        const isPollVisible = this.pollState.shouldDisplay;

        console.log(`[Popout Gauge] Visibility check - Count: ${occurrenceCount}, RecentMax: ${recentMaxValue}, Threshold: ${threshold}, Visible: ${isGaugeVisible}, Poll: ${isPollVisible}`);

        if (isGaugeVisible || isPollVisible) {
            this.containerElement.style.display = 'block';
            console.log(`[Popout Gauge] Gauge container SHOWN`);
        } else {
            this.containerElement.style.display = 'none';
            console.log(`[Popout Gauge] Gauge container HIDDEN`);
        }
    }
}

// Make the class available globally for backward compatibility
window.popoutUtils = window.popoutUtils || {};
window.popoutUtils.GaugeComponent = GaugeComponent;