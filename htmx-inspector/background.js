// Listen for the extension icon click
chrome.action.onClicked.addListener(async (tab) => {
    // Determine the new state
    const data = await chrome.storage.local.get(['isEnabled']);
    const newState = !data.isEnabled;

    // Save and send message
    await chrome.storage.local.set({ isEnabled: newState });
    
    // We can rely on storage listener in content.js if we set one up, 
    // OR we can explicitly message the tab like before.
    // Explicit messaging is often faster/more reliable for immediate feedback.
    chrome.tabs.sendMessage(tab.id, { 
        type: 'TOGGLE_INSPECTOR', 
        isEnabled: newState 
    });
});
