// Popup script
(function() {
  'use strict';

  const enabledToggle = document.getElementById('enabled-toggle');
  const statusValue = document.getElementById('status');

  // Load saved settings
  chrome.storage.local.get(['enabled'], (result) => {
    const enabled = result.enabled !== undefined ? result.enabled : true;
    enabledToggle.checked = enabled;
    updateStatus(enabled);
  });

  // Handle toggle change
  enabledToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ enabled }, () => {
      updateStatus(enabled);
      // Notify content scripts about the change
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'TOGGLE_EXTENSION',
            enabled: enabled
          }).catch(() => {
            // Ignore errors if content script is not loaded
          });
        }
      });
    });
  });

  // Update status display
  function updateStatus(enabled) {
    statusValue.textContent = enabled ? 'Active' : 'Disabled';
    statusValue.style.color = enabled ? '#0d652d' : '#d93025';
  }

})();
