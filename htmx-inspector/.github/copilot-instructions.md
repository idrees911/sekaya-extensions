# Web Inspector Pro - AI Instructions

## Project Overview
A Chrome Extension (Manifest V3) for visual web inspection. Users hover over elements to inspect styles, box model, and layout details in real-time.

## Architecture

### Core Components
- **Manifest (`manifest.json`)**: Configures permissions (`activeTab`, `storage`) and injects assets.
- **Content Script (`content.js`)**:
  - Injected into all pages (`<all_urls>`).
  - Handles the core inspection loop: `mouseover` detection, overlay rendering, and tooltip generation.
  - Manages global state via `enable()` and `disable()` functions.
- **Popup (`popup.html`, `popup.js`)**:
  - Example of "No Build" UI.
  - Manages user preferences (`styles`, `boxmodel`, `layout`).
  - **Forced Activation**: Automatically enables the inspector when opened.

### State Management
- **Source of Truth**: `chrome.storage.local` stores `isEnabled` and configuration objects.
- **Messaging**: `popup.js` broadcasts `UPDATE_CONFIG` messages to active tabs to trigger immediate updates without page reloads.

## Development Workflow

### Setup (No Build Step)
1. Navigate to `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the project root directory.

### Debugging
- **Popup Logic**: Right-click the extension icon -> "Inspect Popup".
- **Content Script**: Open DevTools on the target web page. Logs from `content.js` appear in the page's console.
- **Reloading**: After editing any file, click the reload icon on the extension card in `chrome://extensions/`.

## Conventions & Patterns

### Code Style
- **Vanilla JS**: Use standard DOM APIs. No bundlers or frameworks.
- **CSS Isolation**:
  - Prefix all classes with `htmx-` (e.g., `.htmx-inspector-tooltip`, `.htmx-inspector-highlight`) to prevent style collisions.
  - Use specific selectors in `content.css`.

### Implementation Details
- **Event Handling**:
  - Uses capturing listeners (`{ capture: true }`) for `click` and `scroll` to override page behavior during inspection.
  - Explicit cleanup in `disable()`: must remove all event listeners and injected DOM elements (tooltips, badges, SVGs).
- **DOM Interaction**:
  - Toggles global class `.htmx-inspector-active` on `<html>` to scope CSS rules.
  - Creates and manages a persistent status badge (`.htmx-inspector-status`) when active.

### Key Logic
- **Locking**: The inspector supports "locking" on an element via click, preventing the tooltip from moving until unlocked or dismissed.
- **Overlays**: separate layers for Box Model (CSS) and precise measurements (SVG layer).
