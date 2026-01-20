// content.js - Robust form filler for Sekaya project

console.log('🇸🇦 Sekaya Form Filler content script loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fillForm') {
    const fieldsFilled = fillSekayaForm(message.data, message.documents);
    sendResponse({ success: true, fieldsFilled: fieldsFilled });
  } else if (message.action === 'detectFields') {
    sendResponse({ success: true, fields: detectFormFields() });
  } else if (message.action === 'highlightInvalid') {
    const count = highlightInvalidFields();
    sendResponse({ success: true, count: count });
  }
  return true;
});

/**
 * Injects pulse animation CSS if not present and highlights invalid fields
 */
function highlightInvalidFields() {
  console.log('🛡️ Sekaya Assistant: Scanning for invalid fields...');
  
  const STYLE_ID = 'sekaya-assistance-pulse-styles';
  let styleEl = document.getElementById(STYLE_ID);
  
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.innerHTML = `
      @keyframes sekayaPulseError {
        0% { 
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6), 0 0 10px rgba(239, 68, 68, 0.3);
          border-color: #ef4444 !important;
        }
        50% { 
          box-shadow: 0 0 0 12px rgba(239, 68, 68, 0), 0 0 20px rgba(239, 68, 68, 0.5);
          border-color: #fca5a5 !important;
        }
        100% { 
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0), 0 0 10px rgba(239, 68, 68, 0.3);
          border-color: #ef4444 !important;
        }
      }
      .sekaya-pulse-error {
        animation: sekayaPulseError 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
        border-width: 2px !important;
        border-style: solid !important;
        border-radius: 8px !important;
        position: relative !important;
        z-index: 1000000 !important;
        transition: all 0.3s ease !important;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // Very broad selectors to catch almost any variant of invalid fields in NG/Prime
  const invalidSelectors = [
    '.ng-invalid:not(form)',
    '.p-invalid',
    '[aria-invalid="true"]',
    '.cfs-input-error',
    '.error-border',
    '.ng-touched.ng-invalid',
    'p-select.ng-invalid',
    'p-dropdown.ng-invalid',
    '.p-inputtext.ng-invalid'
  ];

  const invalidElements = document.querySelectorAll(invalidSelectors.join(','));
  
  // Clean up old highlights
  document.querySelectorAll('.sekaya-pulse-error').forEach(el => el.classList.remove('sekaya-pulse-error'));

  invalidElements.forEach(el => {
    // Ensure we don't pulse large container forms or wrappers that aren't inputs
    if (el.tagName === 'FORM' || el.tagName === 'NG-CONTAINER') return;
    
    el.classList.add('sekaya-pulse-error');
    
    // For PrimeNG/CFS components, we sometimes need to target the inner input/selector
    const inner = el.querySelector('.p-inputtext, .p-dropdown, .p-select, .cfs-file-input');
    if (inner) inner.classList.add('sekaya-pulse-error');

    console.log('🚩 Invalid element detected:', el);
  });

  return invalidElements.length;
}
function fillSekayaForm(data, documents = []) {
  const flatData = flattenObject(data);
  let filled = 0;

  // 1. Fill standard inputs
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="file"]), select, textarea');
  inputs.forEach(input => {
    const name = input.getAttribute('formcontrolname') || 
                 input.id || 
                 input.name || 
                 input.closest('[formcontrolname]')?.getAttribute('formcontrolname');
    
    if (!name && input.type !== 'tel') return;

    const nameLower = (name || '').toLowerCase();
    
    // Skip dates
    if (nameLower.includes('date') || nameLower.includes('dob') || nameLower.includes('hijri')) return;

    // Phone logic
    if (input.type === 'tel' || nameLower.includes('phone')) {
      const phoneValue = flatData['phoneNumber'] || flatData['association_phoneNumber'] || findValueFuzzy(flatData, 'phone');
      if (phoneValue && setElementValue(input, phoneValue)) {
        filled++;
        return;
      }
    }

    // Standard matching
    if (name) {
      const baseName = name.split('_').pop().toLowerCase();
      const entry = Object.entries(flatData).find(([k]) => k.toLowerCase().includes(baseName));
      if (entry && setElementValue(input, entry[1])) {
        filled++;
      }
    }
  });

  // 2. Handle File Uploads (Special focus on cfs-file-upload)
  if (documents && documents.length > 0) {
    filled += handleFileUploads(documents);
  }

  return filled;
}

/**
 * Handles file uploads for both native and custom cfs-file-upload components
 */
function handleFileUploads(documents) {
  let docFilled = 0;
  
  // Find all file upload targets (native inputs and custom wrappers)
  const targets = document.querySelectorAll('input[type="file"], cfs-file-upload, .cfs-file-input');
  
  targets.forEach(target => {
    // 1. Identify the field name/label
    const name = target.getAttribute('name') || 
                 target.getAttribute('formcontrolname') || 
                 target.id || 
                 target.querySelector('input')?.getAttribute('name');
                 
    const label = target.getAttribute('label') || 
                  findLabelFor(target)?.textContent?.trim() || 
                  target.closest('.form-group')?.querySelector('label')?.textContent?.trim();

    if (!name && !label) return;

    const searchKey = (name || label).toLowerCase();

    // 2. Find matching document from library
    const match = documents.find(doc => {
      const role = doc.role.toLowerCase();
      return searchKey.includes(role) || role.includes(searchKey);
    });

    if (match) {
      try {
        // 3. Find/Create actual file input to receive the data
        const actualInput = target.tagName === 'INPUT' ? target : target.querySelector('input[type="file"]');
        
        if (actualInput) {
          const file = base64ToFile(match.data, match.fileName, match.fileType);
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          actualInput.files = dataTransfer.files;
          
          actualInput.dispatchEvent(new Event('change', { bubbles: true }));
          actualInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          console.log(`✅ Filled file: ${match.role} into ${name || label}`);
          docFilled++;
        }
      } catch (err) {
        console.warn(`File fill failed for ${name}:`, err);
      }
    }
  });

  return docFilled;
}

/**
 * Converts Base64 string to a File object
 */
function base64ToFile(base64, fileName, mimeType) {
  const parts = base64.split(';base64,');
  const raw = window.atob(parts[1]);
  const uInt8Array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) uInt8Array[i] = raw.charCodeAt(i);
  return new File([new Blob([uInt8Array], { type: mimeType })], fileName, { type: mimeType });
}

/**
 * Standard utility to set values and trigger events
 */
function setElementValue(element, value) {
  if (!element || value == null) return false;
  try {
    element.value = value;
    ['input', 'change', 'blur'].forEach(ev => element.dispatchEvent(new Event(ev, { bubbles: true })));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Helper to find label
 */
function findLabelFor(el) {
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) return label;
  }
  return null;
}

/**
 * Flattens nested object
 */
function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, k) => {
    const newKey = prefix ? `${prefix}_${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !(obj[k] instanceof Date) && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], newKey));
    } else {
      acc[newKey] = obj[k];
    }
    return acc;
  }, {});
}

/**
 * Simple fuzzy finder
 */
function findValueFuzzy(data, searchKey) {
  const sk = searchKey.toLowerCase();
  const entry = Object.entries(data).find(([k]) => k.toLowerCase().includes(sk));
  return entry ? entry[1] : null;
}

/**
 * Field detection
 */
function detectFormFields() {
  const elements = document.querySelectorAll('[formcontrolname], input, select, cfs-file-upload');
  return [...new Set(Array.from(elements).map(el => {
    const name = el.getAttribute('formcontrolname') || el.getAttribute('name') || el.id;
    const type = el.tagName.includes('FILE') || el.type === 'file' ? '[FILE]' : '';
    return name ? `${name} ${type}` : null;
  }))].filter(Boolean);
}
