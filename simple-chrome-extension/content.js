// content.js - Runs in the context of web pages

// IMPORTANT: These logs appear in the WEBPAGE's console (F12), NOT the extension console!
// Styled console messages for better visibility
console.log('%c🔌 EXTENSION LOADED! 🔌', 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 16px; font-weight: bold; padding: 10px 20px; border-radius: 5px;');
console.log('%c📍 Extension: Simple Learning Extension', 'color: #667eea; font-weight: bold; font-size: 14px;');
console.log('%c🌐 Current URL:', 'color: #764ba2; font-weight: bold;', window.location.href);
console.log('%c📄 Page Title:', 'color: #764ba2; font-weight: bold;', document.title);
console.log('%c⏰ Loaded at:', 'color: #764ba2; font-weight: bold;', new Date().toLocaleTimeString());

// Send a message to the background script
try {
  chrome.runtime.sendMessage({
    type: 'CONTENT_SCRIPT_LOADED',
    url: window.location.href,
    title: document.title
  }, function(response) {
    if (chrome.runtime.lastError) {
      console.log('%c⚠️ Background script not responding (this is normal)', 'color: orange; font-weight: bold;');
    } else if (response && response.success) {
      console.log('%c✅ Background script response:', 'color: green; font-weight: bold;', response.message);
    }
  });
} catch (error) {
  console.error('Error sending message to background:', error);
}

// Add a visual indicator that the extension is active
function addExtensionIndicator() {
  try {
    if (!document.body) {
      console.log('%c⚠️ Document body not ready yet, skipping visual indicator', 'color: orange;');
      return;
    }
    
    const indicator = document.createElement('div');
    indicator.id = 'extension-indicator';
    indicator.textContent = '✓ Extension Active';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 16px;
      border-radius: 8px;
      font-family: 'Segoe UI', sans-serif;
      font-size: 12px;
      font-weight: 600;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    
    document.body.appendChild(indicator);
    console.log('%c👁️ Visual indicator added to page', 'color: #667eea; font-weight: bold;');
    
    // Fade in
    setTimeout(() => {
      indicator.style.opacity = '1';
    }, 100);
    
    // Fade out and remove after 3 seconds
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => {
        indicator.remove();
      }, 300);
    }, 3000);
  } catch (error) {
    console.error('Error adding visual indicator:', error);
  }
}

// Add indicator when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addExtensionIndicator);
} else {
  addExtensionIndicator();
}

// Example: Listen for messages from the background script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  // You can add custom message handlers here
  sendResponse({ received: true });
  return true;
});

// Log when content script finishes initialization
console.log('%c✅ CONTENT SCRIPT READY!', 'background: #4CAF50; color: white; font-size: 14px; font-weight: bold; padding: 8px 16px; border-radius: 4px;');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #667eea;');
