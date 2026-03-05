const INSPECT_CLASS = 'htmx-inspector-highlight';
const TOOLTIP_CLASS = 'htmx-inspector-tooltip';

let isEnabled = false;
let config = {
  styles: true,
  boxmodel: true,
  layout: true
};

let tooltip = null;
let currentOverlay = null;
let svgLayer = null; // High-performance SVG layer for distances
let hideUITimer = null; // Timer for auto-hiding the UI

// Initialize
chrome.storage.local.get(['config'], (data) => {
  if (data.config) config = { ...config, ...data.config };
  
  // No longer auto-enable based on global storage
});

// Watch for storage changes (e.g. from background script toggle)
chrome.storage.onChanged.addListener((changes, namespace) => {
  // Only sync config if needed, ignore isEnabled for activation
});

// Messages - Keep legacy support just in case, but main control is now local
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TOGGLE_INSPECTOR') { 
    // If no specific state requested, toggle based on current state
    const targetState = (typeof msg.isEnabled !== 'undefined') ? msg.isEnabled : !isEnabled;
    if (targetState) { enable(); updatePanelUI(true); }
    else { disable(); updatePanelUI(false); }
  } else if (msg.type === 'UPDATE_CONFIG') { // Config sync across tabs
    if (msg.data.config) {
        config = { ...config, ...msg.data.config };
        updatePanelConfigUI(); // Sync checkboxes
    }
    // Allow popup to control enablement for the specific tab
    if (typeof msg.data.isEnabled !== 'undefined') {
        if (msg.data.isEnabled) { enable(); updatePanelUI(true); }
        else { disable(); updatePanelUI(false); }
    }
  }
});

function injectControlPanel() {
    if (document.getElementById('htmx-control-panel')) return;

    // 1. Floating Button
    const btn = document.createElement('div');
    btn.className = 'htmx-floating-btn';
    btn.innerHTML = `<img src="${chrome.runtime.getURL('assets/target.png')}" alt="Inspect">`;
    btn.title = "Toggle Inspector Panel";
    btn.onclick = () => {
        const panel = document.getElementById('htmx-control-panel');
        panel.classList.toggle('visible');
    };
    document.body.appendChild(btn);

    // 2. Control Panel
    const panel = document.createElement('div');
    panel.id = 'htmx-control-panel';
    panel.className = 'htmx-panel-container htmx-inspector-root';
    panel.innerHTML = `
        <div class="htmx-panel-header">
            <img src="${chrome.runtime.getURL('assets/target.png')}" class="htmx-panel-logo">
            <div class="htmx-panel-title">
                <h1>HTML <span>Inspector</span></h1>
            </div>
        </div>
        <div class="htmx-panel-content">
            <!-- Master Toggle -->
            <div class="htmx-toggle-card">
                <div class="htmx-toggle-label">
                    Inspection Mode
                    <span class="htmx-status-text" id="htmx-status-text">OFFLINE</span>
                </div>
                <label class="htmx-switch">
                    <input type="checkbox" id="htmx-master-toggle">
                    <span class="htmx-slider"></span>
                </label>
            </div>

            <div style="font-size:10px; font-weight:800; color:#64748b; margin-top:12px; letter-spacing:0.05em">ACTIVE METRICS</div>

            <!-- Features -->
            <div class="htmx-features-list" id="htmx-features-list">
                <label class="htmx-feature-row">
                    <div class="htmx-feature-icon htmx-icon-s">S</div>
                    <div class="htmx-feature-info">
                        <span class="htmx-feature-name">Styles</span>
                        <span class="htmx-feature-desc">CSS tracing</span>
                    </div>
                    <input type="checkbox" id="htmx-opt-styles" checked>
                    <div class="htmx-checkbox"></div>
                </label>

                   <label class="htmx-feature-row">
                    <div class="htmx-feature-icon htmx-icon-l">L</div>
                    <div class="htmx-feature-info">
                        <span class="htmx-feature-name">Layout</span>
                        <span class="htmx-feature-desc">Flex/Grid</span>
                    </div>
                    <input type="checkbox" id="htmx-opt-layout" checked>
                    <div class="htmx-checkbox"></div>
                </label>
                
                <label class="htmx-feature-row">
                    <div class="htmx-feature-icon htmx-icon-b">B</div>
                    <div class="htmx-feature-info">
                        <span class="htmx-feature-name">Box Model</span>
                        <span class="htmx-feature-desc">Margins & pad</span>
                    </div>
                    <input type="checkbox" id="htmx-opt-boxmodel" checked>
                    <div class="htmx-checkbox"></div>
                </label>

             
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    // 3. Bind Events
    const masterToggle = document.getElementById('htmx-master-toggle');
    const featureList = document.getElementById('htmx-features-list');
    
    // Master Toggle Logic
    masterToggle.addEventListener('change', (e) => {
        const active = e.target.checked;
        if (active) enable(); else disable();
        
        // UI Updates
        updatePanelUI(active);
        
        // No longer persist isEnabled globally to avoid affecting other tabs
    });

    // Feature Toggles Logic
    ['styles', 'boxmodel', 'layout'].forEach(key => {
        const el = document.getElementById(`htmx-opt-${key}`);
        el.addEventListener('change', (e) => {
            config[key] = e.target.checked;
            // Update storage
            chrome.storage.local.set({ config });
        });
    });

    // Initialize UI state from config
    updatePanelConfigUI();
}

function updatePanelUI(active) {
    const statusText = document.getElementById('htmx-status-text');
    const masterToggle = document.getElementById('htmx-master-toggle');
    const featureList = document.getElementById('htmx-features-list');

    if (statusText) {
        statusText.textContent = active ? 'ONLINE' : 'OFFLINE';
        statusText.style.color = active ? '#10b981' : '#64748b';
    }
    if (masterToggle) masterToggle.checked = active;
    if (featureList) {
        if (active) featureList.classList.remove('disabled');
        else featureList.classList.add('disabled');
    }
}

function updatePanelConfigUI() {
    ['styles', 'boxmodel', 'layout'].forEach(key => {
        const el = document.getElementById(`htmx-opt-${key}`);
        if (el) el.checked = config[key];
    });
}

function enable() {
  if (hideUITimer) {
      clearTimeout(hideUITimer);
      hideUITimer = null;
  }

  // Restore visibility just in case we are in fade-out state
  const panel = document.getElementById('htmx-control-panel');
  const btn = document.querySelector('.htmx-floating-btn');
  if (panel) { panel.style.opacity = ''; panel.style.transform = ''; panel.style.transition = ''; }
  if (btn) { btn.style.opacity = ''; btn.style.transform = ''; btn.style.transition = ''; }
  
  injectControlPanel(); // Ensure UI exists before enabling
  
  if (isEnabled) return;
  isEnabled = true;
  document.documentElement.classList.add('htmx-inspector-active');
  tooltip = createTooltip();
  svgLayer = createSvgLayer();
  // Status badge is now redundant with the floating panel, but we can keep it or remove it.
  // The user asked for "Floating button... click to appear popup", so maybe we don't need the bottom badge anymore?
  // Let's keep it for now as a persistent indicator if the panel is closed.
  toggleStatusBadge(true);
  
  showToast('Inspection Mode Active', 'success');

  document.addEventListener('mouseover', onHover);
  document.addEventListener('mouseout', onOut);
  document.addEventListener('click', onClick, { capture: true }); // Capturing to prevent other clicks
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
}


function disable() {
  isEnabled = false;
  document.documentElement.classList.remove('htmx-inspector-active');
  document.removeEventListener('mouseover', onHover);
  document.removeEventListener('mouseout', onOut);
  document.removeEventListener('click', onClick, { capture: true });
  document.removeEventListener('scroll', onScroll);
  
  showToast('Inspector Deactivated (UI will hide in 3s)', 'info');

  // Start timer to hide UI
  if (hideUITimer) clearTimeout(hideUITimer);
  hideUITimer = setTimeout(() => {
      const panel = document.getElementById('htmx-control-panel');
      const btn = document.querySelector('.htmx-floating-btn');
      
      // Animate out
      if (panel) {
          panel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          panel.style.opacity = '0';
          panel.style.transform = 'translateX(20px)';
      }
      if (btn) {
          btn.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          btn.style.opacity = '0';
          btn.style.transform = 'scale(0.8)';
      }

      // Remove after animation
      setTimeout(() => {
          if (isEnabled) {
              // User re-enabled during fade out
              if (panel) { panel.style.opacity = ''; panel.style.transform = ''; }
              if (btn) { btn.style.opacity = ''; btn.style.transform = ''; }
              return;
          }
          if (panel) panel.remove();
          if (btn) btn.remove();
          hideUITimer = null;
      }, 300);
  }, 3000);

  // Cleanup Highlights
  document.querySelectorAll('.' + INSPECT_CLASS).forEach(el => el.classList.remove(INSPECT_CLASS));
  
  clearOverlays();
  if (tooltip) {
      tooltip.remove();
      tooltip = null;
  }
  if (svgLayer) {
      svgLayer.remove();
      svgLayer = null;
  }
  toggleStatusBadge(false);
  
  // Reset State
  hoveredElement = null;
  lockedElement = null;
}

function toggleStatusBadge(active) {
    let badge = document.querySelector('.htmx-inspector-status');
    if (active) {
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'htmx-inspector-status';
            badge.innerHTML = '<span class="htmx-status-dot"></span> Inspector Active <span style="margin-left:4px; opacity:0.6; font-size:10px; font-weight:normal">(Click to Stop)</span>';
            badge.title = "Click to Deactivate";
            
            // Add click listener to deactivate
            badge.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent locking logic
                e.preventDefault();
                disable();
                chrome.storage.local.set({ isEnabled: false });
            });
            
            document.body.appendChild(badge);
        }
    } else {
        if (badge) badge.remove();
    }
}

function createTooltip() {
  if (document.querySelector(`.${TOOLTIP_CLASS}`)) return document.querySelector(`.${TOOLTIP_CLASS}`);
  const t = document.createElement('div');
  t.className = TOOLTIP_CLASS;
  document.body.appendChild(t);
  return t;
}

function clearOverlays() {
  document.querySelectorAll('.htmx-box-overlay').forEach(el => el.remove());
  document.querySelectorAll('.htmx-layout-overlay').forEach(el => el.remove());
  if (svgLayer) svgLayer.innerHTML = ''; // Clear SVG distances
  if (currentOverlay) currentOverlay = null;
}

let hoveredElement = null;
let lockedElement = null; // New locking state

function onHover(e) {
  if (!isEnabled) return;
  
  // If we are locked onto an element, ignore all other hover events
  if (lockedElement) return;

  const target = e.target;
    // Ignore our own UI elements (Tooltip, Layout Overlay, Status Badge, AND Floating Panel/Button)
    if (!target || 
        target.closest('.htmx-inspector-tooltip') || 
        target.closest('.htmx-layout-overlay') || 
        target.closest('.htmx-inspector-status') ||
        target.closest('.htmx-floating-btn') ||
        target.closest('.htmx-panel-container')) {
        return;
    }
  if (hoveredElement === target) return;
  
  hoveredElement = target;
  renderInspection(target);
}


// Logic to render overlays/tooltip (extracted for reuse)
function renderInspection(target, mouseX, mouseY) {
  // Clear any existing highlights first
  document.querySelectorAll('.' + INSPECT_CLASS).forEach(el => {
      if (el !== target) el.classList.remove(INSPECT_CLASS);
  });

  clearOverlays();

  // 1. Box Model Overlay
  if (config.boxmodel) {
    drawBoxModel(target);
  }

  // 2. Layout Visualizer
  if (config.layout) {
    drawLayoutGuides(target);
    drawProDistances(target, lockedElement);
  }

  // 3. Tooltip Data Gather
  updateTooltip(target);
  
  // Highlight
  target.classList.add(INSPECT_CLASS);
}

function onClick(e) {
    if (!isEnabled) return;
    
    // Allow interacting with our own UI (Tooltip, Status Badge, Panel, Button)
    if (e.target.closest('.htmx-inspector-tooltip') || 
        e.target.closest('.htmx-inspector-status') ||
        e.target.closest('.htmx-floating-btn') || 
        e.target.closest('.htmx-panel-container')) {
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (lockedElement) {
        // Unlock if identifying a click outside or on the same element
        lockedElement = null;
        clearOverlays();
        hideTooltip();
    } else {
        // Lock onto the current target
        lockedElement = e.target;
        renderInspection(lockedElement);
    }
}

function onOut(e) {
    if (!isEnabled || lockedElement) return; // Don't clear if locked
    
    if (e.target) e.target.classList.remove(INSPECT_CLASS);
    if (!e.relatedTarget) {
       clearOverlays();
       hideTooltip();
       hoveredElement = null;
    }
}

function onScroll() {
    // Stick to the locked element during scroll
    if (lockedElement) {
        renderInspection(lockedElement);
    } else {
        clearOverlays();
        hideTooltip();
    }
}

function hideTooltip() {
    if (tooltip) tooltip.classList.remove('visible');
}

function drawBoxModel(el) {
  const rect = el.getBoundingClientRect();
  const style = globalThis.getComputedStyle(el);
  const scrollX = globalThis.scrollX;
  const scrollY = globalThis.scrollY;

  const getVal = (prop) => Number.parseFloat(style[prop]) || 0;

  const mt = getVal('marginTop');
  const mr = getVal('marginRight');
  const mb = getVal('marginBottom');
  const ml = getVal('marginLeft');

  const bt = getVal('borderTopWidth');
  const br = getVal('borderRightWidth');
  const bb = getVal('borderBottomWidth');
  const bl = getVal('borderLeftWidth');

  const pt = getVal('paddingTop');
  const pr = getVal('paddingRight');
  const pb = getVal('paddingBottom');
  const pl = getVal('paddingLeft');

  const createBox = (className, top, left, width, height, label) => {
    const box = document.createElement('div');
    box.className = `htmx-box-overlay ${className}`;
    box.style.top = `${top}px`;
    box.style.left = `${left}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
    
    if (label && width > 40 && height > 20) {
        const labelEl = document.createElement('span');
        labelEl.className = 'htmx-box-label';
        labelEl.textContent = label;
        box.appendChild(labelEl);
    }
    
    document.body.appendChild(box);
  };

  // 1. Margin Box
  createBox('htmx-box-margin', rect.top + scrollY - mt, rect.left + scrollX - ml, rect.width + ml + mr, rect.height + mt + mb, 'margin');

  // 2. Border Box
  createBox('htmx-box-border', rect.top + scrollY, rect.left + scrollX, rect.width, rect.height, 'border');

  // 3. Padding Box
  createBox('htmx-box-padding', rect.top + scrollY + bt, rect.left + scrollX + bl, rect.width - bl - br, rect.height - bt - bb, 'padding');
  
  // 4. Content Box
  createBox('htmx-box-content', rect.top + scrollY + bt + pt, rect.left + scrollX + bl + pl, rect.width - bl - br - pl - pr, rect.height - bt - bb - pt - pb, 'content');
}

function drawLayoutGuides(el) {
    const style = globalThis.getComputedStyle(el);
    const display = style.display;
    
    if (display === 'flex' || display === 'grid' || display === 'inline-flex' || display === 'inline-grid') {
        const rect = el.getBoundingClientRect();
        const scrollX = globalThis.scrollX;
        const scrollY = globalThis.scrollY;

        drawInternalMetrics(el, rect, scrollX, scrollY);

        // Container Overlay
        const overlay = document.createElement('div');
        overlay.className = 'htmx-layout-overlay';
        overlay.style.top = `${rect.top + scrollY}px`;
        overlay.style.left = `${rect.left + scrollX}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        
        // Label with layout details
        const label = document.createElement('div');
        label.className = 'htmx-layout-label';
        
        let details = display.toUpperCase();
        if (display.includes('flex')) {
            const gap = style.gap === 'normal' ? '0px' : style.gap;
            details += ` ${style.flexDirection} ${style.justifyContent} ${gap}`;
        } else if (display.includes('grid')) {
            const cols = style.gridTemplateColumns.split(' ').length;
            const gap = style.gap === 'normal' ? '0px' : style.gap;
            details += ` ${cols}cols ${gap}`;
        }
        
        label.textContent = details;
        overlay.appendChild(label);
        document.body.appendChild(overlay);

        // Child Outlines (to visualize flow)
        Array.from(el.children).forEach(child => {
            const cRect = child.getBoundingClientRect();
            const childOutline = document.createElement('div');
            childOutline.className = 'htmx-layout-child-outline';
            childOutline.style.top = `${cRect.top + scrollY}px`;
            childOutline.style.left = `${cRect.left + scrollX}px`;
            childOutline.style.width = `${cRect.width}px`;
            childOutline.style.height = `${cRect.height}px`;
            document.body.appendChild(childOutline);
            // Mark children outlines to be cleared later
            childOutline.classList.add('htmx-layout-overlay'); 
        });
    }
}

function updateTooltip(el, x, y) {
   if (!tooltip) return;
   
   let content = '';
   
   // Styles Section
   if (config.styles) {
       const s = globalThis.getComputedStyle(el);
       // RGB to HEX helper
       const rgbToHex = (rgb) => {
           if (!rgb) return '';
           const sep = rgb.includes(",") ? "," : " ";
           const rgbVal = rgb.substring(4).split(")")[0].split(sep);
           if (rgbVal.length < 3) return rgb; // fallback
           let r = (+rgbVal[0]).toString(16), g = (+rgbVal[1]).toString(16), b = (+rgbVal[2]).toString(16);
           if (r.length === 1) r = "0" + r;
           if (g.length === 1) g = "0" + g;
           if (b.length === 1) b = "0" + b;
           return "#" + r + g + b;
       };
       
       // Heuristic: Is this a text element or a structural container?
       const textTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'A', 'LI', 'LABEL', 'BUTTON', 'I', 'B', 'STRONG', 'EM', 'INPUT', 'TEXTAREA'];
       // Also check if it has direct text node children violating a length threshold
       const hasDirectText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
       const isTextMode = textTags.includes(el.tagName) || hasDirectText;

       const fontName = s.fontFamily.split(',')[0].replace(/['"]/g, '');
       const fontSize = Math.round(Number.parseFloat(s.fontSize));
       const fontWeight = s.fontWeight;
       const color = rgbToHex(s.color);
       const bg = rgbToHex(s.backgroundColor);
       const dims = `${Math.round(Number.parseFloat(s.width))} × ${Math.round(Number.parseFloat(s.height))}`;

       // Build formatted ID/Class string
       let selector = '';
       if (el.id) selector += `<span class="htmx-id-token">#${el.id}</span>`;
       if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => !c.startsWith('htmx-') && c.trim());
          if (classes.length > 0) {
              selector += classes.map(c => `<span class="htmx-class-token">.${c}</span>`).join('');
          }
       }
       
       content += `
        <div class="htmx-tooltip-header">
            <div class="htmx-header-top">
                <span class="htmx-tag-name">&lt;${el.tagName.toLowerCase()}&gt;</span>
                <span class="htmx-dims">${dims}</span>
            </div>
        </div>
        
        <div class="htmx-tooltip-content">`;

        if (isTextMode) {
            content += `
            <!-- Typography Card -->
            <div class="htmx-card typography">
                <span class="htmx-font-name" style="font-family:${fontName}">${fontName}</span>
                <div class="htmx-font-metrics">
                    <div class="htmx-metric-item">
                        <span class="htmx-metric-label">Size</span>
                        <span class="htmx-metric-value">${fontSize}<span class='htmx-metric-unit'>px</span></span>
                    </div>
                    <span style="opacity:0.3; ">|</span>
                    <div class="htmx-metric-item">
                        <span class="htmx-metric-label">Weight</span>
                        <span class="htmx-metric-value" style="font-weight:${fontWeight}">${fontWeight}</span>
                    </div>
                    <span style="opacity:0.3">|</span>
                    <div class="htmx-metric-item">
                        <span class="htmx-metric-label">Line</span>
                        <span class="htmx-metric-value">${Math.round(Number.parseFloat(s.lineHeight)) || '—'}<span class='htmx-metric-unit'>px</span></span>
                    </div>
                </div>
            </div>`;
        } else {
            // Layout Mode for Structural Elements
            const display = s.display;
            const position = s.position;
            const zIndex = s.zIndex === 'auto' ? null : s.zIndex;
            
            // Background
            let bgInfo = null;
            if (bg && bg !== '#00000000' && bg !== 'transparent') {
                bgInfo = { color: bg, label: 'Background' };
            }

            // Border
            let borderInfo = null;
            if (s.borderWidth !== '0px' && s.borderStyle !== 'none') {
                 const borderColor = rgbToHex(s.borderColor);
                 borderInfo = `${s.borderWidth} ${s.borderStyle} <span style="display:inline-block; width:8px; height:8px; background:${borderColor}; border:1px solid #ccc; border-radius:50%; margin-left:4px;"></span>`;
            }

            // Box Shadow
            let shadowInfo = null;
            if (s.boxShadow !== 'none') {
                shadowInfo = s.boxShadow;
            }
            
            // Flex/Grid specific info
            let extraInfo = '';
            if (display.includes('flex')) {
                extraInfo = `
                 <div class="htmx-metric-item">
                    <span class="htmx-metric-label">Align</span>
                    <span class="htmx-metric-value">${s.justifyContent.replace('normal','start')} / ${s.alignItems.replace('normal','stretch')}</span>
                 </div>`;
                 if (s.gap !== 'normal' && s.gap !== '0px') {
                     extraInfo += `<div class="htmx-metric-item"><span class="htmx-metric-label">Gap</span><span class="htmx-metric-value">${s.gap}</span></div>`;
                 }
            } else if (display.includes('grid')) {
                const cols = s.gridTemplateColumns.split(' ').length;
                extraInfo = `
                 <div class="htmx-metric-item">
                    <span class="htmx-metric-label">Grid</span>
                    <span class="htmx-metric-value">${cols} cols</span>
                 </div>`;
            }

            content += `
             <div class="htmx-card layout">
                 <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px 12px; margin-bottom:12px;">
                     <!-- Display -->
                     <div class="htmx-metric-item">
                         <span class="htmx-metric-label">Display</span>
                         <span class="htmx-metric-value" style="text-transform:uppercase;">${display}</span>
                     </div>
                     
                     <!-- Position -->
                     ${position !== 'static' ? `
                     <div class="htmx-metric-item">
                         <span class="htmx-metric-label">Position</span>
                         <span class="htmx-metric-value">${position} ${zIndex ? `(z-${zIndex})` : ''}</span>
                     </div>` : ''}

                     <!-- Border -->
                     ${borderInfo ? `
                     <div class="htmx-metric-item">
                         <span class="htmx-metric-label">Border</span>
                         <span class="htmx-metric-value" style="display:flex; align-items:center;">${borderInfo}</span>
                     </div>` : ''}

                     <!-- Background Condensed -->
                     ${bgInfo ? `
                     <div class="htmx-metric-item">
                         <span class="htmx-metric-label">Background</span>
                         <div style="display:flex; align-items:center; gap:6px">
                            <div style="width:12px; height:12px; background:${bgInfo.color}; border:1px solid #cbd5e1; border-radius:3px;"></div>
                            <span class="htmx-metric-value" style="font-size:11px">${bgInfo.color.toUpperCase()}</span>
                         </div>
                     </div>` : ''}

                     <!-- Shadow (Full Row) -->
                     ${shadowInfo ? `
                     <div class="htmx-metric-item" style="grid-column: 1 / -1;">
                         <span class="htmx-metric-label">Shadow</span>
                         <span class="htmx-metric-value" style="font-size:10px; font-weight:400; color:#cbd5e1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; max-width:240px; font-family:monospace" title="${shadowInfo}">${shadowInfo}</span>
                     </div>` : ''}
                 </div>
                 
                 ${extraInfo ? `<div class="htmx-font-metrics" style="border-top:1px solid #f1f5f9; padding-top:8px; gap:16px">${extraInfo}</div>` : ''}
             </div>`;
        }

       content += `
            <!-- Colors Card (Only shown if text mode selected, or explicitly if it has interesting colors) -->
            ${isTextMode ? `
            <div class="htmx-card colors">
                 <div class="htmx-color-row">
                     <div class="htmx-color-preview-large" style="background:${color}; box-shadow: 0 0 0 1px rgba(0,0,0,0.05)"></div>
                     <div class="htmx-color-details">
                         <div class="htmx-color-value">${color.toUpperCase()}</div>
                         <span class="htmx-label-source">Text Color</span>
                     </div>
                 </div>
                 
                 ${(bg && bg !== '#00000000' && bg !== 'transparent') ? `
                 <div class="htmx-color-row" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #f1f5f9;">
                     <div class="htmx-color-preview-large" style="background:${bg}; box-shadow: 0 0 0 1px rgba(0,0,0,0.05)"></div>
                     <div class="htmx-color-details">
                         <div class="htmx-color-value">${bg.toUpperCase()}</div>
                         <span class="htmx-label-source">Background</span>
                     </div>
                 </div>` : ''}
            </div>` : ''}
        </div>
       `;
   }
   
   if (!content) {
       hideTooltip();
       return;
   }

   tooltip.innerHTML = content;
   tooltip.classList.add('visible');
   
   // Position Logic
   const rect = el.getBoundingClientRect();
   const tRect = tooltip.getBoundingClientRect();
   
   // Default: Right side of element, aligned top
   let top = rect.top;
   let left = rect.right + 12;
   
   // If no room on right, try left
   if (left + tRect.width > globalThis.innerWidth - 12) {
       left = rect.left - tRect.width - 12;
   }
   
   // If no room on left, go top
   if (left < 12) {
       left = rect.left;
       top = rect.top - tRect.height - 12;
       // If no room on top, go bottom
       if (top < 12) top = rect.bottom + 12;
   }
   
   // Clamp vertical
   if (top + tRect.height > globalThis.innerHeight - 12) {
       top = globalThis.innerHeight - tRect.height - 12;
   }
   if (top < 12) top = 12;
   
   tooltip.style.top = `${top}px`;
   tooltip.style.left = `${left}px`;
}

/**
 * Traces the source of a specific CSS property for an element.
 * Returns the selector (class, ID, etc.) that effectively applies the style.
 */
function getStyleOrigin(el, prop) {
    if (!el) return null;

    try {
        // 1. Check for inline styles first
        if (el.style[prop]) return 'inline';

        // 2. Iterate through all styling rules from highest specificity/last defined
        const matchedRules = [];
        const sheets = Array.from(document.styleSheets);

        for (const sheet of sheets) {
            try {
                const rules = Array.from(sheet.cssRules || sheet.rules || []);
                for (const rule of rules) {
                    if (rule instanceof CSSStyleRule && rule.style[prop] && el.matches(rule.selectorText)) {
                        matchedRules.push(rule);
                    }
                }
            } catch (e) {
                // Ignore cross-origin stylesheet errors
                continue;
            }
        }

        // Return the most specific/last matching rule's selector
        if (matchedRules.length > 0) {
            // Note: Simplistic approach. Ideally we should calculate specificity, 
            // but for a tooltip, the "last matched" in the DOM order is often the winner.
            const winner = matchedRules.at(-1);
            return winner.selectorText;
        }

        // 3. If not found, check parent (Inheritance)
        if (prop === 'color' && el.parentElement) {
            const parentOrigin = getStyleOrigin(el.parentElement, prop);
            return parentOrigin ? `Inherited (${parentOrigin})` : null;
        }
    } catch (err) {
        console.warn('HTMX Inspector Trace Error:', err);
    }

    return null;
}

/**
 * Pro Re-implementation: Using SVG and Geometry Raycasting
 */
function createSvgLayer() {
    if (document.getElementById('htmx-svg-layer')) return document.getElementById('htmx-svg-layer');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'htmx-svg-layer';
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '2147483645';
    svg.style.overflow = 'visible';
    document.body.appendChild(svg);
    return svg;
}

function drawProDistances(target, reference) {
    if (!svgLayer) return;
    const scrollX = globalThis.scrollX;
    const scrollY = globalThis.scrollY;

    const tRect = target.getBoundingClientRect();
    const rRect = reference ? reference.getBoundingClientRect() : null;

    if (reference && reference !== target) {
        // Comparison Mode: Between two elements
        drawGapBetween(tRect, rRect, scrollX, scrollY);
    } else {
        // External distances removed per user request
        /*
        const directions = ['top', 'bottom', 'left', 'right'];
        directions.forEach(dir => {
            const gap = findNearestGap(tRect, dir, target);
            if (gap) {
                drawProLine(gap.x1 + scrollX, gap.y1 + scrollY, gap.x2 + scrollX, gap.y2 + scrollY, gap.value);
            }
        });
        */
    }
}

function findNearestGap(rect, dir, targetEl) {
    const viewport = { width: globalThis.innerWidth, height: globalThis.innerHeight };
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let nearest = getNearestElementEdge(rect, dir);
    
    // Container sensing: If the target is inside a parent, the parent's inner edge is a boundary
    let parent = targetEl?.parentElement;
    while (parent && parent !== document.body) {
        const pRect = parent.getBoundingClientRect();
        const pStyle = globalThis.getComputedStyle(parent);
        
        // Stop at the first parent that has padding or is a significant container
        const pt = Number.parseFloat(pStyle.paddingTop) || 0;
        const pl = Number.parseFloat(pStyle.paddingLeft) || 0;
        const pr = Number.parseFloat(pStyle.paddingRight) || 0;
        const pb = Number.parseFloat(pStyle.paddingBottom) || 0;

        const innerBoundary = {
            top: pRect.top + pt,
            left: pRect.left + pl,
            right: pRect.right - pr,
            bottom: pRect.bottom - pb
        };

        let hitBoundary = false;
        if (dir === 'top' && rect.top > innerBoundary.top + 1) {
            if (!nearest || innerBoundary.top > nearest.bottom - 1) {
                nearest = { bottom: innerBoundary.top, top: innerBoundary.top, left: innerBoundary.left, right: innerBoundary.right };
                hitBoundary = true;
            }
        } else if (dir === 'bottom' && rect.bottom < innerBoundary.bottom - 1) {
            if (!nearest || innerBoundary.bottom < nearest.top + 1) {
                nearest = { top: innerBoundary.bottom, bottom: innerBoundary.bottom, left: innerBoundary.left, right: innerBoundary.right };
                hitBoundary = true;
            }
        } else if (dir === 'left' && rect.left > innerBoundary.left + 1) {
            if (!nearest || innerBoundary.left > nearest.right - 1) {
                nearest = { right: innerBoundary.left, left: innerBoundary.left, top: innerBoundary.top, bottom: innerBoundary.bottom };
                hitBoundary = true;
            }
        } else if (dir === 'right' && rect.right < innerBoundary.right - 1) {
            if (!nearest || innerBoundary.right < nearest.left + 1) {
                nearest = { left: innerBoundary.right, right: innerBoundary.right, top: innerBoundary.top, bottom: innerBoundary.bottom };
                hitBoundary = true;
            }
        }
        
        if (hitBoundary) break; // We found the immediate containing boundary
        parent = parent.parentElement;
    }

    const { x1, y1, x2, y2, val } = calculateGapCoords(rect, dir, nearest, viewport, centerX, centerY);
    return val > 0 ? { x1, y1, x2, y2, value: val } : null;
}

function calculateGapCoords(rect, dir, nearest, viewport, centerX, centerY) {
    let x1, y1, x2, y2, val;
    switch(dir) {
        case 'top':
            y1 = nearest ? nearest.bottom : 0;
            y2 = rect.top;
            x1 = x2 = centerX;
            val = Math.round(y2 - y1);
            break;
        case 'bottom':
            y1 = rect.bottom;
            y2 = nearest ? nearest.top : viewport.height;
            x1 = x2 = centerX;
            val = Math.round(y2 - y1);
            break;
        case 'left':
            x1 = nearest ? nearest.right : 0;
            x2 = rect.left;
            y1 = y2 = centerY;
            val = Math.round(x2 - x1);
            break;
        case 'right':
            x1 = rect.right;
            x2 = nearest ? nearest.left : viewport.width;
            y1 = y2 = centerY;
            val = Math.round(x2 - x1);
            break;
    }
    return { x1, y1, x2, y2, val };
}

let cachedElements = null;
let lastCacheTime = 0;

function getNearestElementEdge(targetRect, dir) {
    const now = Date.now();
    if (!cachedElements || now - lastCacheTime > 100) {
        cachedElements = Array.from(document.querySelectorAll('body *:not(.htmx-box-overlay):not(.htmx-layout-overlay):not(.htmx-inspector-tooltip):not(#htmx-svg-layer):not(.htmx-inspector-status)'))
            .filter(el => {
                const style = globalThis.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            });
        lastCacheTime = now;
    }

    let nearestRect = null;
    let minDistance = Infinity;

    for (const el of cachedElements) {
        const rect = el.getBoundingClientRect();
        
        // Exact match check
        if (Math.abs(rect.top - targetRect.top) < 1 && Math.abs(rect.left - targetRect.left) < 1 && Math.abs(rect.width - targetRect.width) < 1) continue;

        let distance = Infinity;
        let overlapsProjection = false;

        switch(dir) {
            case 'top':
                if (rect.bottom <= targetRect.top + 1) {
                    distance = targetRect.top - rect.bottom;
                    overlapsProjection = (rect.right > targetRect.left && rect.left < targetRect.right);
                }
                break;
            case 'bottom':
                if (rect.top >= targetRect.bottom - 1) {
                    distance = rect.top - targetRect.bottom;
                    overlapsProjection = (rect.right > targetRect.left && rect.left < targetRect.right);
                }
                break;
            case 'left':
                if (rect.right <= targetRect.left + 1) {
                    distance = targetRect.left - rect.right;
                    overlapsProjection = (rect.bottom > targetRect.top && rect.top < targetRect.bottom);
                }
                break;
            case 'right':
                if (rect.left >= targetRect.right - 1) {
                    distance = rect.left - targetRect.right;
                    overlapsProjection = (rect.bottom > targetRect.top && rect.top < targetRect.bottom);
                }
                break;
        }

        // We only care about elements that actually overlap the projection of our element
        // or are extremely close and large (like a sidebar)
        if (overlapsProjection && distance < minDistance && distance >= -1) {
            minDistance = distance;
            nearestRect = rect;
        }
    }

    return nearestRect;
}

function drawGapBetween(rectA, rectB, sx, sy) {
    // Calculate shortest vertical and horizontal gaps
    let vGap = 0;
    if (rectA.top > rectB.bottom) vGap = rectA.top - rectB.bottom;
    else if (rectB.top > rectA.bottom) vGap = rectB.top - rectA.bottom;

    let hGap = 0;
    if (rectA.left > rectB.right) hGap = rectA.left - rectB.right;
    else if (rectB.left > rectA.right) hGap = rectB.left - rectA.right;

    if (vGap > 0) {
        const x = Math.max(rectA.left, rectB.left) + Math.min(rectA.width, rectB.width)/2;
        const y1 = rectA.top > rectB.bottom ? rectB.bottom : rectA.bottom;
        drawProLine(x + sx, y1 + sy, x + sx, y1 + vGap + sy, Math.round(vGap));
    }
    if (hGap > 0) {
        const y = Math.max(rectA.top, rectB.top) + Math.min(rectA.height, rectB.height)/2;
        const x1 = rectA.left > rectB.right ? rectB.right : rectA.right;
        drawProLine(x1 + sx, y + sy, x1 + hGap + sx, y + sy, Math.round(hGap));
    }
}

function drawProLine(x1, y1, x2, y2, value, color = '#ff4785') {
    if (value <= 0) return;
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Main Line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-dasharray', '3,2');
    
    // T-Heads (Ticks)
    const tickLen = 4;
    const isVert = x1 === x2;
    
    const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    [t1, t2].forEach(t => { t.setAttribute('stroke', color); t.setAttribute('stroke-width', '1.5'); });

    if (isVert) {
        t1.setAttribute('x1', x1 - tickLen); t1.setAttribute('y1', y1); t1.setAttribute('x2', x1 + tickLen); t1.setAttribute('y2', y1);
        t2.setAttribute('x1', x2 - tickLen); t2.setAttribute('y1', y2); t2.setAttribute('x2', x2 + tickLen); t2.setAttribute('y2', y2);
    } else {
        t1.setAttribute('x1', x1); t1.setAttribute('y1', y1 - tickLen); t1.setAttribute('x2', x1); t1.setAttribute('y2', y1 + tickLen);
        t2.setAttribute('x1', x2); t2.setAttribute('y1', y2 - tickLen); t2.setAttribute('x2', x2); t2.setAttribute('y2', y2 + tickLen);
    }

    // Label Background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.textContent = value;
    text.setAttribute('fill', 'white');
    text.setAttribute('font-size', '10px');
    text.setAttribute('font-family', 'ui-monospace, monospace');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');

    const lx = (x1 + x2) / 2;
    const ly = (y1 + y2) / 2;
    text.setAttribute('x', lx);
    text.setAttribute('y', ly);

    // Dynamic rect sizing
    const labelPadH = 4;
    const estWidth = (value.toString().length * 6) + (labelPadH * 2);
    rect.setAttribute('x', lx - estWidth/2);
    rect.setAttribute('y', ly - 7);
    rect.setAttribute('width', estWidth);
    rect.setAttribute('height', 14);
    rect.setAttribute('rx', 4);
    rect.setAttribute('fill', color);

    g.appendChild(line);
    g.appendChild(t1);
    g.appendChild(t2);
    g.appendChild(rect);
    g.appendChild(text);
    svgLayer.appendChild(g);
}

/**
 * Visualizes internal gaps and paddings within a container.
 */
function drawInternalMetrics(container, cRect, sx, sy) {
    if (!svgLayer) return;
    const children = Array.from(container.children).filter(el => {
        const style = globalThis.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (children.length === 0) return;

    const METRIC_COLOR = '#a855f7'; // Purple/Orchid for internal metrics

    // 1. Padding visualization (Start/End)
    const style = globalThis.getComputedStyle(container);
    const pt = Number.parseFloat(style.paddingTop) || 0;
    const pl = Number.parseFloat(style.paddingLeft) || 0;

    // To prevent clutter, only show if padding > 0
    if (pt > 0) {
        drawProLine(cRect.left + cRect.width/2 + sx, cRect.top + sy, cRect.left + cRect.width/2 + sx, cRect.top + pt + sy, Math.round(pt), METRIC_COLOR);
    }
    if (pl > 0) {
        drawProLine(cRect.left + sx, cRect.top + cRect.height/2 + sy, cRect.left + pl + sx, cRect.top + cRect.height/2 + sy, Math.round(pl), METRIC_COLOR);
    }

    // 2. Internal Gaps between children
    for (let i = 0; i < children.length - 1; i++) {
        const rectA = children[i].getBoundingClientRect();
        const rectB = children[i+1].getBoundingClientRect();

        // Detect if they are stacked vertically or side-by-side
        const vGap = rectB.top - rectA.bottom;
        const hGap = rectB.left - rectA.right;

        if (vGap > 1 && vGap < 500) {
            const x = Math.max(rectA.left, rectB.left) + Math.min(rectA.width, rectB.width)/2;
            drawProLine(x + sx, rectA.bottom + sy, x + sx, rectB.top + sy, Math.round(vGap), METRIC_COLOR);
        } else if (hGap > 1 && hGap < 500) {
            const y = Math.max(rectA.top, rectB.top) + Math.min(rectA.height, rectB.height)/2;
            drawProLine(rectA.right + sx, y + sy, rectB.left + sx, y + sy, Math.round(hGap), METRIC_COLOR);
        }
    }
}

function showToast(message, type = 'info') {
    let toast = document.getElementById('htmx-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'htmx-toast';
        toast.className = 'htmx-toast';
        toast.innerHTML = '<div class="htmx-toast-icon"></div><span class="htmx-toast-msg"></span>';
        document.body.appendChild(toast);
    }

    toast.className = 'htmx-toast ' + type;
    toast.querySelector('.htmx-toast-icon').textContent = type === 'success' ? '✓' : 'i';
    toast.querySelector('.htmx-toast-msg').textContent = message;

    // Trigger reflow
    void toast.offsetWidth;

    toast.classList.add('visible');

    // Hide after 3s
    if (toast.timeout) clearTimeout(toast.timeout);
    toast.timeout = setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

