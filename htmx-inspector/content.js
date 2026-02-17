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

// Initialize
chrome.storage.local.get(['isEnabled', 'config'], (data) => {
  if (data.config) config = { ...config, ...data.config };
  if (data.isEnabled) enable();
});

// Messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TOGGLE_INSPECTOR') { // Fallback legacy
    if (msg.isEnabled) enable();
    else disable();
  } else if (msg.type === 'UPDATE_CONFIG') {
    if (msg.data.config) config = { ...config, ...msg.data.config };
    if (msg.data.isEnabled) enable();
    else disable();
  }
});

function enable() {
  if (isEnabled) return;
  isEnabled = true;
  tooltip = createTooltip();
  toggleStatusBadge(true);
  
  document.addEventListener('mouseover', onHover);
  document.addEventListener('mouseout', onOut);
  document.addEventListener('click', onClick, { capture: true }); // Capturing to prevent other clicks
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
}

function disable() {
  isEnabled = false;
  document.removeEventListener('mouseover', onHover);
  document.removeEventListener('mouseout', onOut);
  document.removeEventListener('click', onClick, { capture: true });
  document.removeEventListener('scroll', onScroll);
  
  // Cleanup Highlights
  document.querySelectorAll('.' + INSPECT_CLASS).forEach(el => el.classList.remove(INSPECT_CLASS));
  
  clearOverlays();
  if (tooltip) {
      tooltip.remove();
      tooltip = null;
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
  if (currentOverlay) currentOverlay = null;
}

let hoveredElement = null;
let lockedElement = null; // New locking state

function onHover(e) {
  if (!isEnabled) return;
  
  // If we are locked onto an element, ignore all other hover events
  if (lockedElement) return;

  const target = e.target;
    // Ignore our own UI elements (Tooltip, Layout Overlay, Status Badge)
    if (!target || 
        target.closest('.htmx-inspector-tooltip') || 
        target.closest('.htmx-layout-overlay') || 
        target.closest('.htmx-inspector-status')) {
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
  }

  // 3. Tooltip Data Gather
  updateTooltip(target);
  
  // Highlight
  target.classList.add(INSPECT_CLASS);
}

function onClick(e) {
    if (!isEnabled) return;
    
    // Allow interacting with our own UI (Tooltip, Status Badge)
    if (e.target.closest('.htmx-inspector-tooltip') || 
        e.target.closest('.htmx-inspector-status')) {
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
  const style = window.getComputedStyle(el);
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  const getVal = (prop) => parseFloat(style[prop]) || 0;

  const mt = getVal('marginTop');
  const mr = getVal('marginRight');
  const mb = getVal('marginBottom');
  const ml = getVal('marginLeft');

  const pt = getVal('paddingTop');
  const pr = getVal('paddingRight');
  const pb = getVal('paddingBottom');
  const pl = getVal('paddingLeft');

  // Margin Box (Orange)
  const marginBox = document.createElement('div');
  marginBox.className = 'htmx-box-overlay htmx-box-margin';
  marginBox.style.top = `${rect.top + scrollY - mt}px`;
  marginBox.style.left = `${rect.left + scrollX - ml}px`;
  marginBox.style.width = `${rect.width + ml + mr}px`;
  marginBox.style.height = `${rect.height + mt + mb}px`;
  document.body.appendChild(marginBox);

  // Padding Box (Green) - roughly matches element rect
  const paddingBox = document.createElement('div');
  paddingBox.className = 'htmx-box-overlay htmx-box-padding';
  paddingBox.style.top = `${rect.top + scrollY}px`;
  paddingBox.style.left = `${rect.left + scrollX}px`;
  paddingBox.style.width = `${rect.width}px`;
  paddingBox.style.height = `${rect.height}px`;
  document.body.appendChild(paddingBox);
  
  // Content Box (Blue)
  const contentBox = document.createElement('div');
  contentBox.className = 'htmx-box-overlay htmx-box-content';
  contentBox.style.top = `${rect.top + scrollY + pt}px`;
  contentBox.style.left = `${rect.left + scrollX + pl}px`;
  contentBox.style.width = `${rect.width - pl - pr}px`;
  contentBox.style.height = `${rect.height - pt - pb}px`;
  document.body.appendChild(contentBox);
}

function drawLayoutGuides(el) {
    const style = window.getComputedStyle(el);
    const display = style.display;
    
    if (display === 'flex' || display === 'grid' || display === 'inline-flex' || display === 'inline-grid') {
        const rect = el.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

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
       const s = window.getComputedStyle(el);
       // RGB to HEX helper
       const rgbToHex = (rgb) => {
           if (!rgb) return '';
           const sep = rgb.indexOf(",") > -1 ? "," : " ";
           const rgbVal = rgb.substr(4).split(")")[0].split(sep);
           if (rgbVal.length < 3) return rgb; // fallback
           let r = (+rgbVal[0]).toString(16), g = (+rgbVal[1]).toString(16), b = (+rgbVal[2]).toString(16);
           if (r.length == 1) r = "0" + r;
           if (g.length == 1) g = "0" + g;
           if (b.length == 1) b = "0" + b;
           return "#" + r + g + b;
       };
       
       const fontName = s.fontFamily.split(',')[0].replace(/['"]/g, '');
       const fontSize = Math.round(parseFloat(s.fontSize));
       const fontWeight = s.fontWeight;
       const color = rgbToHex(s.color);
       const bg = rgbToHex(s.backgroundColor);
       const display = s.display;
       const position = s.position;
       const dims = `${Math.round(parseFloat(s.width))} × ${Math.round(parseFloat(s.height))}`;

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
                <span class="htmx-tag-name">${el.tagName.toLowerCase()}</span>
                <span class="htmx-dims">${dims}</span>
            </div>
           <!--  ${selector ? `<div class="htmx-selector-bar">${selector}</div>` : ''} -->
        </div>
        
        <div class="htmx-tooltip-grid">
            <!-- Typography Hero Section -->
            <div class="htmx-cell full-width typography">
                <span class="htmx-label-mini">TYPOGRAPHY</span>
                <span class="htmx-font-name" style="font-family:${fontName}">${fontName}</span>
                <div class="htmx-font-metrics">
                    <span title="Size">${fontSize}<span class="htmx-monospace">px</span></span>
                    <span style="color:#cbd5e1">|</span>
                    <span title="Weight" style="font-weight:${fontWeight}; ">${fontWeight}</span>
                    <span style="color:#cbd5e1">|</span>
                    <span title="Line Height">${Math.round(parseFloat(s.lineHeight)) || 'Normal'}<span class="htmx-monospace">px</span></span>
                </div>
            </div>

            <!-- Colors Section -->
            <div class="htmx-cell full-width colors">
                <div class="htmx-color-block">
                    <div class="htmx-color-preview-large" style="background:${color}"></div>
                    <div class="htmx-color-info">
                        <span class="htmx-label-mini">TEXT</span>
                        <span class="htmx-color-value">${color.toUpperCase()}</span>
                    </div>
                </div>
                
                ${(bg && bg !== '#00000000' && bg !== 'transparent') ? `
                <div class="htmx-color-block">
                    <div class="htmx-color-preview-large" style="background:${bg}"></div>
                    <div class="htmx-color-info">
                        <span class="htmx-label-mini">BACKGROUND</span>
                        <span class="htmx-color-value">${bg.toUpperCase()}</span>
                    </div>
                </div>` : ''}
            </div>

            <!-- Layout Details -->
          <!--   <div class="htmx-cell">
                <span class="htmx-label">Display</span>
                <span class="htmx-value">${display}</span>
            </div>
            <div class="htmx-cell">
                <span class="htmx-label">Position</span>
                <span class="htmx-value">${position}</span>
            </div> -->
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
   if (left + tRect.width > window.innerWidth - 12) {
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
   if (top + tRect.height > window.innerHeight - 12) {
       top = window.innerHeight - tRect.height - 12;
   }
   if (top < 12) top = 12;
   
   tooltip.style.top = `${top}px`;
   tooltip.style.left = `${left}px`;
}
