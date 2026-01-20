# 🚀 Quick Reference Card

## 📍 Where to Find Console Messages

### Content Script Messages (content.js)
**Location:** Webpage Console  
**How:** Open any website → Press `F12` → Click `Console` tab  
**Expected:** Colorful styled messages with purple/green backgrounds

### Background Script Messages (background.js)
**Location:** Extension Service Worker Console  
**How:** `chrome://extensions/` → Click `service worker` link  
**Expected:** "Background service worker started!" message

### Popup Script Messages (popup.js)
**Location:** Popup Console  
**How:** Right-click extension icon → `Inspect popup`  
**Expected:** Popup-related logs when button is clicked

---

## ✅ Quick Test Checklist

1. **Load Extension**
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select `simple-chrome-extension` folder

2. **Test Content Script**
   - Open `test-page.html` in Chrome (or any website)
   - Press `F12`
   - Look for: 🔌 **EXTENSION LOADED!**
   - Look for: ✅ **CONTENT SCRIPT READY!**

3. **Test Popup**
   - Click extension icon
   - Click "Show Alert" button
   - Should see alert message

4. **Test Background**
   - Go to `chrome://extensions/`
   - Click "service worker"
   - Should see startup messages

---

## 🎯 Expected Console Output

```
🔌 EXTENSION LOADED! 🔌
📍 Extension: Simple Learning Extension
🌐 Current URL: [current page]
📄 Page Title: [page title]
⏰ Loaded at: [time]
👁️ Visual indicator added to page
✅ CONTENT SCRIPT READY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔧 Common Issues

| Issue | Solution |
|-------|----------|
| No messages in console | Refresh the page after loading extension |
| Extension not in toolbar | Click puzzle icon 🧩 and pin it |
| Service worker inactive | Click "service worker" to activate |
| Content script not running | Check you're not on `chrome://` pages |
| Icons not showing | Extension still works, icons are optional |

---

## 📁 File Structure

```
simple-chrome-extension/
├── manifest.json       # Extension config
├── popup.html         # Popup UI
├── popup.css          # Popup styles
├── popup.js           # Popup logic
├── background.js      # Service worker
├── content.js         # Runs on web pages
├── icons/             # Extension icons
├── test-page.html     # Test page
├── README.md          # Full docs
├── INSTALLATION.md    # Setup guide
└── TROUBLESHOOTING.md # Debug help
```

---

## 🎓 Key Concepts

**Manifest V3:** Latest Chrome extension standard  
**Service Worker:** Replaces background pages  
**Content Script:** Runs in webpage context  
**Message Passing:** Communication between scripts  
**Permissions:** `activeTab`, `storage`

---

## 🔗 Quick Links

- Load extensions: `chrome://extensions/`
- Test page: Open `test-page.html` in browser
- Full docs: See `README.md`
- Troubleshooting: See `TROUBLESHOOTING.md`

---

## 💡 Pro Tips

1. **Always refresh the page** after loading/updating the extension
2. **Check the correct console** (webpage vs extension vs popup)
3. **Content scripts don't work** on `chrome://` pages
4. **Service workers go inactive** when not in use (this is normal)
5. **Use test-page.html** for consistent testing

---

**Need Help?** Read `TROUBLESHOOTING.md` for detailed solutions!
