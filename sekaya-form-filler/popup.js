// popup.js - Controller for Sekaya Assistance (Unified Hub)

document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEventListeners();
  await loadAndApplyRules();
  await loadStoredDocuments();
});

/**
 * Handle navigation between different assistance modules
 */
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      // Update navigation buttons
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show targeted tab content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId) {
          content.classList.add('active');
        }
      });
    });
  });
}

/**
 * Wire up all buttons and form submits
 */
function setupEventListeners() {
  // Dashboard
  const fastFillBtn = document.getElementById('fastFillBtn');
  const highlightBtnDash = document.getElementById('highlightBtnDash');
  
  // Form Filler Module
  const fillDonorBtn = document.getElementById('fillDonorBtn');
  const fillCharityBtn = document.getElementById('fillCharityBtn');
  const highlightBtn = document.getElementById('highlightBtn');
  const detectBtn = document.getElementById('detectBtn');
  
  // Document Library Module
  const addDocBtn = document.getElementById('addDocBtn');
  const docFileInput = document.getElementById('docFileInput');
  
  // Rules Module
  const rulesForm = document.getElementById('rulesForm');
  const resetRulesBtn = document.getElementById('resetRulesBtn');

  fastFillBtn?.addEventListener('click', autoFillCurrentForm);
  highlightBtnDash?.addEventListener('click', highlightInvalidFields);
  fillDonorBtn?.addEventListener('click', () => fillWithData('donor'));
  fillCharityBtn?.addEventListener('click', () => fillWithData('charity'));
  highlightBtn?.addEventListener('click', highlightInvalidFields);
  detectBtn?.addEventListener('click', detectFields);
  
  addDocBtn?.addEventListener('click', () => docFileInput.click());
  docFileInput?.addEventListener('change', handleFileUpload);
  
  rulesForm?.addEventListener('submit', saveRules);
  resetRulesBtn?.addEventListener('click', resetRules);
}

// --- MODULE: DOCUMENT LIBRARY ---

async function handleFileUpload(e) {
  const file = e.target.files[0];
  const roleInput = document.getElementById('docName');
  const role = roleInput.value.trim() || 'unnamed_document';
  if (!file) return;

  try {
    showStatus('⏳ Processing file...', 'info');
    const base64Data = await fileToBase64(file);
    const doc = {
      id: Date.now(),
      role: role,
      fileName: file.name,
      fileType: file.type,
      data: base64Data,
      size: file.size
    };

    chrome.storage.local.get(['storedDocs'], (result) => {
      const docs = result.storedDocs || [];
      docs.push(doc);
      chrome.storage.local.set({ storedDocs: docs }, () => {
        loadStoredDocuments();
        roleInput.value = '';
        e.target.value = '';
        showStatus('✅ Document saved to Assistance library', 'success');
      });
    });
  } catch (err) {
    showStatus('❌ Failed to process file', 'error');
  }
}

async function loadStoredDocuments() {
  const listContainer = document.getElementById('storedFilesList');
  if (!listContainer) return;
  chrome.storage.local.get(['storedDocs'], (result) => {
    const docs = result.storedDocs || [];
    
    // Update count badge if it exists
    const countBadge = document.getElementById('fileCountBadge');
    if (countBadge) countBadge.textContent = docs.length;

    listContainer.innerHTML = docs.length ? '' : '<p style="text-align: center; color: #64748b; font-size: 13px; margin: 2rem 0;">No assets in local library.</p>';
    docs.forEach(doc => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <div class="file-info"><span class="file-label">${doc.role}</span><div class="file-meta"><span>${doc.fileName}</span> • <span>${formatFileSize(doc.size)}</span></div></div>
        <button class="btn-delete" data-id="${doc.id}">🗑️</button>
      `;
      item.querySelector('.btn-delete').addEventListener('click', () => deleteDocument(doc.id));
      listContainer.appendChild(item);
    });
  });
}

function deleteDocument(id) {
  if (!confirm('Permanently delete this document from library?')) return;
  chrome.storage.local.get(['storedDocs'], (result) => {
    const docs = result.storedDocs || [];
    chrome.storage.local.set({ storedDocs: docs.filter(d => d.id !== id) }, () => {
      loadStoredDocuments();
      showStatus('🗑️ Document removed', 'info');
    });
  });
}

// --- MODULE: GENERATION RULES ---

async function loadAndApplyRules() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['sekayaRules'], (result) => {
      if (result.sekayaRules) {
        SekayaDataGenerator.setRules(result.sekayaRules);
        populateRulesForm(result.sekayaRules);
      }
      resolve();
    });
  });
}

function populateRulesForm(rules) {
  const fields = ['phonePattern', 'zipCodeLength', 'registrationNumberPattern', 'ibanPrefix', 'accountNumberLength'];
  fields.forEach(field => {
    const input = document.getElementById(field);
    if (input && rules[field] !== undefined) input.value = rules[field];
  });
}

function saveRules(e) {
  e.preventDefault();
  const rules = {
    phonePattern: document.getElementById('phonePattern').value,
    zipCodeLength: Number.parseInt(document.getElementById('zipCodeLength').value),
    registrationNumberPattern: document.getElementById('registrationNumberPattern').value,
    ibanPrefix: document.getElementById('ibanPrefix').value,
    accountNumberLength: Number.parseInt(document.getElementById('accountNumberLength').value)
  };
  chrome.storage.sync.set({ sekayaRules: rules }, () => {
    SekayaDataGenerator.setRules(rules);
    showStatus('✅ Assistant rules updated', 'success');
  });
}

function resetRules() {
  if (confirm('Reset generation rules to Sekaya defaults?')) {
    chrome.storage.sync.remove('sekayaRules', () => {
      SekayaDataGenerator.resetRules();
      document.getElementById('rulesForm').reset();
      showStatus('🔄 Assistant rules reset', 'info');
    });
  }
}

// --- MODULE: SMART FORM FILLER ---

/**
 * Automatically detects the current form based on URL and fills it
 */
async function autoFillCurrentForm() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;

    const url = tab.url.toLowerCase();
    
    if (url.includes('/charity-registration')) {
      showStatus('🔍 Route Detected: Charity Registration', 'info');
      await fillWithData('charity');
    } else if (url.includes('/donor-registration')) {
      showStatus('🔍 Route Detected: Donor Registration', 'info');
      await fillWithData('donor');
    } else {
      // Fallback: If no specific route, default to donor but inform user
      showStatus('⚡ Auto-detecting context... Filling as Donor', 'info');
      await fillWithData('donor');
    }
  } catch (error) {
    showStatus('❌ Detection failed', 'error');
  }
}

async function fillWithData(type) {
  try {
    showStatus('⏳ Filling form...', 'info');
    await loadAndApplyRules();
    let data = (type === 'donor') ? SekayaDataGenerator.generateDonorData() : SekayaDataGenerator.generateCharityRegistrationData();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    chrome.storage.local.get(['storedDocs'], (result) => {
      const docs = result.storedDocs || [];
      
      // 1. Content Script (Standard DOM)
      chrome.tabs.sendMessage(tab.id, { action: 'fillForm', data: data, documents: docs });

      // 2. Power Fill (Angular/PrimeNG Framework Sync)
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: (formValues, storedDocs) => {
          console.log('🚀 Assistant Power Fill Started');

          function base64ToFile(base64, fileName, mimeType) {
            const parts = base64.split(';base64,');
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while(n--) u8arr[n] = bstr.charCodeAt(n);
            return new File([u8arr], fileName, { type: mimeType });
          }

          function syncComponent(el, val, isFile = false) {
            try {
              const ctx = el.__ngContext__;
              if (!ctx) return;
              
              const instance = ctx.find(i => i && typeof i === 'object' && 
                ('writeValue' in i || 'updateInputfield' in i || 'options' in i || 'selectedOption' in i));
              
              if (!instance) {
                 const inner = el.querySelector('p-select, p-dropdown, p-multiselect, p-datepicker, p-fileupload, input');
                 if (inner && inner !== el) return syncComponent(inner, val, isFile);
                 return;
              }

              let finalVal = val;

              // Dropdown/Select Resolution
              const isSelect = el.tagName.includes('SELECT') || el.tagName.includes('DROPDOWN') || instance.options !== undefined;
              if (isSelect && instance.options && !isFile) {
                const options = Array.isArray(instance.options) ? instance.options : (instance._options || []);
                const optVal = instance.optionValue;
                const optLab = instance.optionLabel || 'label';

                const match = options.find(o => {
                  const v = optVal ? o[optVal] : (typeof o === 'object' ? (o.value !== undefined ? o.value : o) : o);
                  const l = typeof o === 'object' ? o[optLab] : String(o);
                  return String(v).toLowerCase() === String(val).toLowerCase() || 
                         (l && String(l).toLowerCase().includes(String(val).toLowerCase()));
                });

                if (match) {
                  finalVal = optVal ? match[optVal] : (typeof match === 'object' ? (match.value !== undefined ? match.value : match) : match);
                } else if (options.length > 0) {
                  const first = options[0];
                  finalVal = optVal ? first[optVal] : (typeof first === 'object' ? (first.value !== undefined ? first.value : first) : first);
                }
              }

              if (isFile && Array.isArray(val)) {
                if (instance.writeValue) instance.writeValue(val);
                if (instance.onModelChange) instance.onModelChange(val);
              } else {
                if (instance.writeValue) instance.writeValue(finalVal);
                instance.value = finalVal;
                if (instance.onModelChange) instance.onModelChange(finalVal);
                if (instance.onChange) instance.onChange({ value: finalVal });
                if (instance.control?.setValue) {
                  instance.control.setValue(finalVal, { emitEvent: true });
                  instance.control.markAsDirty();
                }
              }

              // UI Updates
              if (typeof instance.updateInputfield === 'function') instance.updateInputfield();
              if (typeof instance.updateEditableLabel === 'function') instance.updateEditableLabel();
              if (typeof instance.updateSelectedOption === 'function') instance.updateSelectedOption();
              
              el.dispatchEvent(new Event('change', { bubbles: true }));

            } catch(e) {}
          }

          // Process Files
          document.querySelectorAll('cfs-file-upload, p-fileupload, input[type="file"]').forEach(target => {
            const iden = target.getAttribute('name') || target.getAttribute('formcontrolname') || target.id;
            const label = target.getAttribute('label') || target.innerText;
            if (!iden && !label) return;
            const match = storedDocs.find(d => (iden && iden.toLowerCase().includes(d.role.toLowerCase())) || (label && label.toLowerCase().includes(d.role.toLowerCase())));
            if (match) {
              const file = base64ToFile(match.data, match.fileName, match.fileType);
              syncComponent(target, [file], true);
            }
          });

          // Process Components
          document.querySelectorAll('p-select, p-dropdown, p-multiselect, cfs-select, [formcontrolname]').forEach(sel => {
             const key = sel.getAttribute('formcontrolname') || sel.id;
             if (!key && !sel.tagName.includes('SELECT')) return;
             let val = key ? (formValues[key] || Object.entries(formValues).find(([k]) => key.toLowerCase().includes(k.split('_').pop().toLowerCase()))?.[1]) : null;
             if (val !== undefined && val !== null) syncComponent(sel, val);
          });
          
          setTimeout(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), 300);
        },
        args: [flattenObject(data), docs]
      });

      showStatus(`✅ ${type} Form Filled!`, 'success');
    });
  } catch (error) {
    showStatus('❌ Error', 'error');
  }
}

// --- UTILITIES ---

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + ['B', 'KB', 'MB'][i];
}

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

async function detectFields() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab?.id, { action: 'detectFields' }, (res) => {
    if (res?.fields) showStatus(`🔍 Discovered ${res.fields.length} reactive fields`, 'info');
  });
}

function highlightInvalidFields() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: 'highlightInvalid' }, (res) => {
        if (res?.count !== undefined) {
          showStatus(`🛡️ Highlighted ${res.count} invalid fields`, res.count > 0 ? 'error' : 'success');
        }
      });
    }
  });
}

function showStatus(message, type) {
  const el = document.getElementById('statusMessage');
  if (!el) return;
  el.textContent = message;
  el.className = `status-toast show ${type}`;
  setTimeout(() => el.classList.remove('show'), 4000);
}
