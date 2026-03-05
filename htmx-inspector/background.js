// Listen for the extension icon click
chrome.action.onClicked.addListener(async (tab) => {
    // Send message to toggle state
    // We don't need to know the state here, the content script handles it
    chrome.tabs.sendMessage(tab.id, { 
        type: 'TOGGLE_INSPECTOR'
        // undefined isEnabled property will trigger toggle in content.js
    });
});
