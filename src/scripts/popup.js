document.addEventListener('DOMContentLoaded', () => {
  const openPopoutButton = document.getElementById('openPopout');
  const openOptionsButton = document.getElementById('openOptions');

  if (openPopoutButton) {
    openPopoutButton.addEventListener('click', () => {
      // Send a message to the background script to open the main popout window
      browser.runtime.sendMessage({ type: 'OPEN_POPOUT_WINDOW' });
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
