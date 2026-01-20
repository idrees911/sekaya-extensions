// background.js - Service Worker for Manifest V3

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
  
  if (details.reason === 'install') {
    console.log('🎉 Extension installed for the first time!');
  } else if (details.reason === 'update') {
    console.log('🔄 Extension updated to version:', chrome.runtime.getManifest().version);
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message);
  console.log('Sender:', sender);
  
  // Handle different message types
  if (message.type === 'POPUP_BUTTON_CLICKED') {
    console.log('Popup button was clicked at:', message.timestamp);
    
    // Send response back to popup
    sendResponse({
      success: true,
      message: 'Background script received your message!'
    });
  } else if (message.type === 'CONTENT_SCRIPT_LOADED') {
    console.log('Content script loaded on:', message.url);
    
    // Send response back to content script
    sendResponse({
      success: true,
      message: 'Background script acknowledges content script load'
    });
  }
  
  // Return true to indicate we will send a response asynchronously
  return true;
});

// Listen for tab updates (optional example)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
  }
});

// Log when service worker starts
console.log('🚀 Background service worker started!');
