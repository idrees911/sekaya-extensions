# Web Inspector Pro - AI Instructions

## Project Overview
A Chrome Extension (Manifest V3) for visual web inspection. Users hover over elements to inspect styles, box model, and layout details in real-time. Features a **Floating Control Panel** injected directly into the page for seamless toggling and configuration.

## Architecture

### Core Components
- **Manifest (`manifest.json`)**: Configures permissions (`activeTab`, `storage`) and injects assets.
- **Content Script (`content.js`)**:
  - **Primary Controller**: Handles both inspection logic and the injected UI.
  - **Injected UI**:
    - **Floating Button**: A persistent toggle button on the page.
    - **Control Panel**: An in-page dashboard to toggle inspection modes and configure settings.
    - **Toast Notifications**: Provides non-intrusive user feedback (e.g., "Copied to clipboard").
  - **Inspection Loop**: Handles `mouseover`, `click` (locking), and `scroll` events.
  - **Rendering**: Manages the Tooltip, Box Model overlays, and a high-performance SVG layer for measurements.
- **Popup (`popup.html`, `popup.js`)**:
  - Legacy entry point.
  - Can still be used to configure global preferences, but the in-page panel is the primary interface.
  - Broadcasts `UPDATE_CONFIG` to sync settings across tabs.

### State Management
- **Local State**: `content.js` maintains `isEnabled` locally for the specific tab to prevent global state conflicts.
- **Configuration**: User preferences (`styles`, `boxmodel`, `layout`) are stored in `chrome.storage.local` and synced.
- **Lifecycle**:
  - **Enable**: Injects/Shows UI -> Attaches Listeners -> Shows Status.
  - **Disable**: Detaches Listeners -> Shows Toast -> Starts Auto-hide Timer for UI.

## Development Workflow

### Setup (No Build Step)
1. Navigate to `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the project root directory.

### Debugging
- **Content Script & UI**: Open DevTools on the target web page. All logic now resides here.
- **UI Tweaks**: The Control Panel and Toasts are standard DOM elements injected into the page. Inspect them directly in the Elements panel.
- **Reloading**: After editing `content.js` or `content.css`, reload the extension AND refresh the target web page.

## Conventions & Patterns

### Code Style
- **Vanilla JS**: Use standard DOM APIs. No bundlers.
- **CSS Isolation**:
  - **Prefix everything**: `.htmx-*` (e.g., `.htmx-control-panel`, `.htmx-toast`, `.htmx-floating-btn`).
  - **z-index**: Use `2147483647` (Max Int) to ensure visibility over all page content.
  - **Reset**: Explicitly reset properties (box-sizing, font-family) on injected elements to avoid inheriting page styles.

### Component Architecture

#### 1. Floating Control Panel (`#htmx-control-panel`)
- **Purpose**: Main switchboard for the extension.
- **Behavior**: Draggable (optional), toggles visibility via Floating Button.
- **Features**: Master toggle, feature checkboxes (Styles, Layout, Box Model).

#### 2. Toast System (`.htmx-toast`)
- **Purpose**: Ephemeral feedback.
- **Styles**: Fixed position, dark mode aesthetic, auto-dismissing.

#### 3. Inspection Overlays
- **Tooltip**: Follows mouse (or locks on click). Displays computed styles.
- **SVG Layer**: Renders lines and guides for layout measurements.
- **Highlight**: Dashed outline on hovered elements.

### Key Logic
- **Locking**: Click an element to "lock" the inspector. Allows interacting with the tooltip (e.g., copying values). Click again to unlock.
- **Event Capture**: Uses `{ capture: true }` for `click` events to intercept interactions while inspecting.
- **Clean Up**: `disable()` MUST remove all injected DOM nodes and event listeners to leave the page exactly as found.
