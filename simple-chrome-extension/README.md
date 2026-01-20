# 🚀 Simple Chrome Extension - Learning Project

A beginner-friendly Chrome extension built with Manifest V3 to help you learn extension development.

## 📁 Project Structure

```
simple-chrome-extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── popup.html            # Popup interface HTML
├── popup.css             # Popup styling
├── popup.js              # Popup logic
├── background.js         # Background service worker
├── content.js            # Content script (runs on web pages)
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

## ✨ Features

- **Popup Interface**: Click the extension icon to open a popup with a button
- **Alert Functionality**: Button triggers an alert message
- **Background Service Worker**: Handles background tasks and message passing
- **Content Script**: Runs on all web pages and logs to the console
- **Visual Indicator**: Shows a temporary notification when the extension is active on a page
- **Message Passing**: Demonstrates communication between popup, background, and content scripts

## 🔧 How to Load the Extension in Chrome

### Step 1: Open Chrome Extensions Page

1. Open Google Chrome
2. Type `chrome://extensions/` in the address bar and press Enter
3. Alternatively, click the three dots menu (⋮) → **More tools** → **Extensions**

### Step 2: Enable Developer Mode

1. In the top-right corner of the Extensions page, toggle **Developer mode** ON
2. You should see new buttons appear: "Load unpacked", "Pack extension", "Update"

### Step 3: Load Your Extension

1. Click the **Load unpacked** button
2. Navigate to the `simple-chrome-extension` folder on your computer
3. Select the folder and click **Select Folder**
4. Your extension should now appear in the list!

### Step 4: Pin the Extension (Optional)

1. Click the puzzle piece icon (🧩) in the Chrome toolbar
2. Find "Simple Learning Extension" in the list
3. Click the pin icon to keep it visible in your toolbar

## 🧪 How to Test the Extension

### Test 1: Popup Functionality

1. Click the extension icon in your Chrome toolbar
2. A popup should appear with a gradient purple background
3. Click the **Show Alert** button
4. You should see an alert message: "🎉 Hello from the Chrome Extension popup!"

### Test 2: Background Script Console

1. Go to `chrome://extensions/`
2. Find "Simple Learning Extension"
3. Click the **service worker** link (or "Inspect views: service worker")
4. The DevTools console will open showing background script logs
5. You should see messages like:
   - "🚀 Background service worker started!"
   - "Extension installed: ..."
   - Messages when you click the popup button

### Test 3: Content Script on Web Pages

1. Open any website (e.g., `https://www.google.com`)
2. Open the browser's DevTools (F12 or right-click → Inspect)
3. Go to the **Console** tab
4. You should see messages from the content script:
   - "🔌 Chrome Extension Content Script Loaded!"
   - "Current page URL: ..."
   - "Page title: ..."
5. You should also see a temporary "✓ Extension Active" indicator in the bottom-right corner

### Test 4: Message Passing

1. Open the popup and click the button
2. Check the background service worker console (see Test 2)
3. You should see a message: "Popup button was clicked at: [timestamp]"
4. This demonstrates communication between popup and background scripts

## 📚 Understanding the Code

### manifest.json
- **manifest_version**: Uses version 3 (latest standard)
- **action**: Defines the popup that appears when clicking the extension icon
- **background**: Registers the service worker (background.js)
- **content_scripts**: Injects content.js into all web pages
- **permissions**: Requests necessary permissions (activeTab, storage)

### popup.html & popup.js
- Simple HTML interface with a button
- JavaScript adds click event listener
- Sends messages to background script
- Shows alerts to demonstrate functionality

### background.js
- Runs as a service worker (always active in the background)
- Listens for installation events
- Receives messages from popup and content scripts
- Can perform background tasks

### content.js
- Runs in the context of web pages
- Has access to the DOM of the current page
- Logs messages to the page's console
- Adds a visual indicator to show the extension is active
- Can communicate with background script

## 🎓 Learning Exercises

Try these modifications to learn more:

1. **Change the popup design**: Edit `popup.css` to customize colors and styles
2. **Add more buttons**: Create additional buttons in `popup.html` with different actions
3. **Modify the content script**: Make it highlight all links on a page
4. **Use storage**: Save data using `chrome.storage.local` API
5. **Add context menus**: Use `chrome.contextMenus` API to add right-click options

## 🐛 Troubleshooting

### Extension doesn't appear after loading
- Make sure you selected the correct folder (the one containing manifest.json)
- Check for errors on the chrome://extensions/ page
- Ensure Developer mode is enabled

### Popup doesn't open
- Check the manifest.json for syntax errors
- Verify popup.html exists in the correct location
- Look for errors in the extension's console

### Content script not running
- Check the browser console on the web page (F12)
- Verify the content script has proper permissions
- Try refreshing the page after loading the extension

### Service worker errors
- Click "service worker" link on chrome://extensions/ to see errors
- Service workers may go inactive; they restart when needed

## 📖 Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Extension Samples](https://github.com/GoogleChrome/chrome-extensions-samples)

## 🎉 Next Steps

Once you're comfortable with this basic extension, try:
- Adding options page for user settings
- Implementing keyboard shortcuts
- Working with browser tabs
- Making HTTP requests
- Creating context menus
- Using Chrome's storage API

Happy learning! 🚀
