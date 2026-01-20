// popup.js - Handles the popup interface logic

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Get the button element
  const alertButton = document.getElementById('alertButton');
  
  // Add click event listener to the button
  alertButton.addEventListener('click', function() {
    // Show an alert when the button is clicked
    alert('🎉 Hello from the Chrome Extension popup!');
    
    // Optional: Log to the extension's console (visible in popup inspection)
    console.log('Alert button was clicked!');
    
    // Optional: Send a message to the background script
    chrome.runtime.sendMessage({
      type: 'POPUP_BUTTON_CLICKED',
      timestamp: new Date().toISOString()
    }, function(response) {
      if (response && response.success) {
        console.log('Message received by background script:', response.message);
      }
    });
  });
  
  // Log when popup is opened
  console.log('Popup opened at:', new Date().toLocaleString());
});
