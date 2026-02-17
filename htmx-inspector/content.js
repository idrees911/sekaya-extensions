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
  svgLayer = createSvgLayer();
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
    drawProDistances(target, lockedElement);
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
  const style = globalThis.getComputedStyle(el);
  const scrollX = globalThis.scrollX;
  const scrollY = globalThis.scrollY;

  const getVal = (prop) => Number.parseFloat(style[prop]) || 0;

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
       
       const fontName = s.fontFamily.split(',')[0].replace(/['"]/g, '');
       const fontSize = Math.round(Number.parseFloat(s.fontSize));
       const fontWeight = s.fontWeight;
       const color = rgbToHex(s.color);
       const bg = rgbToHex(s.backgroundColor);
       const display = s.display;
       const position = s.position;
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
                    <span title="Line Height">${Math.round(Number.parseFloat(s.lineHeight)) || 'Normal'}<span class="htmx-monospace">px</span></span>
                </div>
            </div>

            <!-- Colors Section -->
            <div class="htmx-cell full-width colors">
                 <div class="htmx-color-block">
                     <div class="htmx-color-preview-large" style="background:${color}"></div>
                     <div class="htmx-color-info">
                         <div class="htmx-label-row">
                             <span class="htmx-label-mini">TEXT</span>
                             <span class="htmx-label-source">${getStyleOrigin(el, 'color') || 'unknown'}</span>
                         </div>
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
        // Standard Mode: nearest neighbors
        const directions = ['top', 'bottom', 'left', 'right'];
        directions.forEach(dir => {
            const gap = findNearestGap(tRect, dir);
            if (gap) {
                drawProLine(gap.x1 + scrollX, gap.y1 + scrollY, gap.x2 + scrollX, gap.y2 + scrollY, gap.value);
            }
        });
    }
}

function findNearestGap(rect, dir) {
    // Simplistic raycasting: measure to parent or viewport
    const viewport = { width: globalThis.innerWidth, height: globalThis.innerHeight };

    switch(dir) {
        case 'top': 
            return { x1: rect.left + rect.width/2, y1: 0, x2: rect.left + rect.width/2, y2: rect.top, value: Math.round(rect.top) };
        case 'bottom':
            return { x1: rect.left + rect.width/2, y1: rect.bottom, x2: rect.left + rect.width/2, y2: viewport.height, value: Math.round(viewport.height - rect.bottom) };
        case 'left':
            return { x1: 0, y1: rect.top + rect.height/2, x2: rect.left, y2: rect.top + rect.height/2, value: Math.round(rect.left) };
        case 'right':
            return { x1: rect.right, y1: rect.top + rect.height/2, x2: viewport.width, y2: rect.top + rect.height/2, value: Math.round(viewport.width - rect.right) };
    }
    return null;
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
    const first = children[0].getBoundingClientRect();
    const last = children[children.length - 1].getBoundingClientRect();
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
