# 🚀 Quick Start Guide - Load Extension in Chrome

## Step-by-Step Installation Instructions

### 1️⃣ Open Chrome Extensions Page
- Open Google Chrome browser
- In the address bar, type: `chrome://extensions/`
- Press **Enter**

**Alternative method:**
- Click the three-dot menu (⋮) in the top-right corner
- Go to **More tools** → **Extensions**

---

### 2️⃣ Enable Developer Mode
- Look for the **Developer mode** toggle in the top-right corner
- Click to turn it **ON**
- You'll see new buttons appear: "Load unpacked", "Pack extension", "Update"

---

### 3️⃣ Load the Extension
- Click the **"Load unpacked"** button
- A file browser will open
- Navigate to: `C:\Users\new m\Documents\My Extensions\simple-chrome-extension`
- Click **"Select Folder"**
- ✅ Your extension is now loaded!

---

### 4️⃣ Pin the Extension (Optional but Recommended)
- Click the **puzzle piece icon** (🧩) in Chrome's toolbar
- Find **"Simple Learning Extension"** in the dropdown
- Click the **pin icon** next to it
- The extension icon will now appear in your toolbar

---

## 🧪 Testing Your Extension

### Test the Popup:
1. Click the extension icon (rocket) in your toolbar
2. A purple popup should appear
3. Click the **"Show Alert"** button
4. You should see an alert: "🎉 Hello from the Chrome Extension popup!"

### Test the Content Script:
1. Open any website (e.g., google.com)
2. Press **F12** to open DevTools
3. Go to the **Console** tab
4. Look for messages like:
   - "🔌 Chrome Extension Content Script Loaded!"
   - "Current page URL: ..."
5. You'll also see a "✓ Extension Active" badge in the bottom-right corner

### Test the Background Script:
1. Go back to `chrome://extensions/`
2. Find your extension
3. Click **"service worker"** (under "Inspect views")
4. A DevTools window opens showing background script logs
5. Look for: "🚀 Background service worker started!"

---

## 🔄 Making Changes

After editing any file:
1. Go to `chrome://extensions/`
2. Find your extension
3. Click the **refresh icon** (🔄) or **"Update"** button
4. Your changes will be applied

---

## ❌ Troubleshooting

**Extension doesn't load?**
- Make sure you selected the folder containing `manifest.json`
- Check for red error messages on the extensions page
- Verify Developer mode is ON

**Popup doesn't open?**
- Check for errors on `chrome://extensions/`
- Make sure all files are in the correct location
- Try removing and re-adding the extension

**Content script not working?**
- Refresh the webpage after loading the extension
- Check the browser console (F12) for errors
- Verify the manifest.json has correct permissions

---

## 📁 File Structure Reference

```
simple-chrome-extension/
├── manifest.json       ← Extension configuration
├── popup.html         ← Popup interface
├── popup.css          ← Popup styles
├── popup.js           ← Popup logic
├── background.js      ← Background service worker
├── content.js         ← Runs on web pages
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          ← Full documentation
```

---

## 🎓 What's Next?

Once your extension is working:
- Read the full `README.md` for detailed explanations
- Try modifying the code to learn how it works
- Experiment with different Chrome Extension APIs
- Build your own custom features!

**Happy coding! 🚀**
