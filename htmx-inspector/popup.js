document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const toggle = document.getElementById('inspector-toggle');
  const statusText = document.getElementById('status-text');

  const options = {
    styles: document.getElementById('opt-styles'),
    boxmodel: document.getElementById('opt-boxmodel'),
    layout: document.getElementById('opt-layout')
  };

  // Load initial state but FORCE ENABLE on open
  const stored = await chrome.storage.local.get(['config']);
  
  // Always start as Active when popup opens
  toggle.checked = true;
  updateUI(true);
  
  // Save this active state and notify content immediately
  await chrome.storage.local.set({ isEnabled: true });
  notifyContent();
  
  if (stored.config) {
    Object.keys(options).forEach(key => {
      if (options[key]) {
        options[key].checked = stored.config[key] !== false; // Default true
      }
    });
  }

  // Event Listeners
  toggle.addEventListener('change', async () => {
    const isEnabled = toggle.checked;
    await saveState();
    updateUI(isEnabled);
    notifyContent();
  });

  Object.values(options).forEach(opt => {
    opt.addEventListener('change', async () => {
      await saveState();
      notifyContent();
    });
  });

  async function saveState() {
    const config = {};
    Object.keys(options).forEach(key => {
      config[key] = options[key].checked;
    });
    await chrome.storage.local.set({ 
      isEnabled: toggle.checked,
      config 
    });
  }

  function notifyContent() {
    chrome.storage.local.get(['isEnabled', 'config'], (data) => {
      sendMessage({ type: 'UPDATE_CONFIG', data });
    });
  }

  function updateUI(enabled) {
    statusText.textContent = enabled ? 'On' : 'Off';
    statusText.style.color = enabled ? 'var(--success-color)' : 'var(--text-secondary)';
  }

  async function sendMessage(msg, callback) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, msg, (response) => {
        if (!chrome.runtime.lastError && callback) {
          callback(response);
        }
      });
    }
  }
});

