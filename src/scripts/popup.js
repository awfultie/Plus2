document.addEventListener('DOMContentLoaded', () => {
  const openPopoutButton = document.getElementById('openPopout');
  const openOptionsButton = document.getElementById('openOptions');
  const flushPollsButton = document.getElementById('flushPolls');

  if (openPopoutButton) {
    openPopoutButton.addEventListener('click', () => {
      // Send a message to the background script to open the main popout window
      browser.runtime.sendMessage({ type: 'OPEN_POPOUT_WINDOW' });
      window.close(); // Close the small popup menu
    });
  }

  if (flushPollsButton) {
    flushPollsButton.addEventListener('click', () => {
      // Send a message to the background script to flush polls
      browser.runtime.sendMessage({ type: 'FLUSH_POLLS' }).then((response) => {
        if (response && response.success) {
          console.log('Polls flushed successfully');
        }
      }).catch((error) => {
        console.error('Error flushing polls:', error);
      });
      window.close(); // Close the small popup menu
    });
  }

  if (openOptionsButton) {
    openOptionsButton.addEventListener('click', () => {
      // Use the dedicated API to open the options page
      browser.runtime.openOptionsPage();
      window.close(); // Close the small popup menu
    });
  }
});
