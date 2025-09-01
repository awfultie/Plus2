// Leaderboard Component - Handles leaderboard display functionality
// Extracted from popout.js during Phase 2 refactoring

/**
 * LeaderboardComponent handles the leaderboard display with user rankings and scores
 */
class LeaderboardComponent {
    constructor(containerElement) {
        this.containerElement = containerElement;
        this.settings = {};
    }

    /**
     * Update settings when they change
     */
    updateSettings(newSettings) {
        this.settings = newSettings;
        console.log('[Leaderboard] Settings updated');
    }

    /**
     * Update the leaderboard display with new data
     */
    updateDisplay(leaderboardData) {
        if (!this.containerElement) return;
        
        const { topUsers, isVisible, headerText } = leaderboardData;
        this.containerElement.style.display = isVisible ? 'block' : 'none';
        
        if (isVisible) {
            // Update header text
            const headerElement = this.containerElement.querySelector('h4');
            if (headerElement) {
                headerElement.textContent = headerText;
            }
            
            // Update the list content
            const listElement = this.containerElement.querySelector('#plus2LeaderboardList');
            if (listElement) {
                listElement.innerHTML = '';
                
                if (topUsers.length === 0) {
                    // Show placeholder when no data
                    const li = document.createElement('li');
                    li.style.fontStyle = 'italic';
                    li.textContent = 'No data yet.';
                    listElement.appendChild(li);
                } else {
                    // Display user rankings
                    topUsers.forEach(user => {
                        const li = document.createElement('li');
                        li.style.cssText = 'display: flex; justify-content: space-between; width: 90%; margin-bottom: 3px;';
                        
                        const userSpan = document.createElement('span');
                        userSpan.style.cssText = 'margin-right: 1em; font-weight: bold; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;';
                        userSpan.textContent = user.username;
                        
                        const scoreSpan = document.createElement('span');
                        scoreSpan.style.cssText = 'font-weight: bold; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;';
                        scoreSpan.textContent = user.score;
                        
                        li.append(userSpan, scoreSpan);
                        listElement.appendChild(li);
                    });
                }
            }
        }
    }
}

// Make the class available globally for backward compatibility
window.popoutUtils = window.popoutUtils || {};
window.popoutUtils.LeaderboardComponent = LeaderboardComponent;