// background.js - Service Worker for Form Filler Extension

console.log('🚀 Form Filler Extension - Background Service Worker Started');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
  
  if (details.reason === 'install') {
    console.log('✨ Form Filler Extension installed for the first time!');
    
    // Set default values (optional)
    chrome.storage.sync.set({
      // You can set default values here if needed
    });
  } else if (details.reason === 'update') {
    console.log('🔄 Extension updated to version:', chrome.runtime.getManifest().version);
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message);
  
  // Handle different message types
  if (message.type === 'FORM_FILLED') {
    console.log('✅ Form filled successfully:', message.data);
    sendResponse({ success: true });
  }
  
  return true;
});

// Optional: Add keyboard shortcut handler
chrome.commands?.onCommand.addListener((command) => {
  console.log('Command received:', command);
  
  if (command === 'fill-form') {
    // Trigger form filling
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'fillForm' });
      }
    });
  }
});

// Monitor storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes, 'in', namespace);
});
