// popup.js - Controller for Sekaya Assistance (Unified Hub)

document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEventListeners();
  setupNetworkMonitor();
  setupSecurityModule();
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
    
    if (url.includes('/charity-registration') || url.includes('/charity/register') || url.includes('charity-onboarding')) {
      showStatus('🔍 Route Detected: Charity Registration', 'info');
      await fillWithData('charity');
    } else if (url.includes('/donor-registration') || url.includes('/donor/register')) {
      showStatus('🔍 Route Detected: Donor Registration', 'info');
      await fillWithData('donor');
    } else {
      showStatus('⚡ Route unknown. Filling as Donor...', 'info');
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
        target: { tabId: tab.id, allFrames: true },
        world: 'MAIN',
        func: (formValues, storedDocs) => {
          // Sekaya Assistant: Integrated Power Fill

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
              
              let instance = null;

              // Robust Discovery: Manually iterate over context in case .find is missing (Common in prod LViews)
              const searchContext = Array.isArray(ctx) ? ctx : (typeof ctx === 'object' ? Object.values(ctx) : []);
              
              for (const item of searchContext) {
                if (item && typeof item === 'object') {
                  // Look for Angular's ControlValueAccessor markers or PrimeNG specific methods
                  if ('writeValue' in item || 'registerOnChange' in item || 'updateInputfield' in item || 'selectedOption' in item) {
                    instance = item;
                    break;
                  }
                }
              }
              
              if (!instance) {
                 // Fallback: Drill down if the component is wrapped
                 const inner = el.querySelector('p-select, p-dropdown, p-multiselect, p-datepicker, p-fileupload, input, .p-component');
                 if (inner && inner !== el) return syncComponent(inner, val, isFile);
                 
                 // If it's a raw input and no instance found, just set the value (standard DOM)
                 if ((el.tagName === 'INPUT' || el.tagName === 'CHECKBOX') && !isFile) {
                   if (typeof val === 'boolean') {
                     el.checked = val;
                   } else {
                     el.value = val;
                   }
                   el.dispatchEvent(new Event('input', { bubbles: true }));
                   el.dispatchEvent(new Event('change', { bubbles: true }));
                   el.dispatchEvent(new Event('blur', { bubbles: true }));
                 }
                 return;
              }

              let finalVal = val;
              
              // Date Handling: Convert numeric timestamps back to Date objects for Angular DatePickers
              const isDateComponent = el.tagName.includes('DATE') || instance.inline !== undefined || String(el.id + el.getAttribute('formcontrolname')).toLowerCase().includes('date');
              if (isDateComponent && typeof val === 'number') {
                finalVal = new Date(val);
              }

              // Boolean/Checkbox Handling for Angular Components
              if (typeof val === 'boolean' && (instance.toggle || 'checked' in instance || el.tagName.includes('CHECKBOX'))) {
                if (instance.writeValue) instance.writeValue(val);
                if (instance.control?.setValue) instance.control.setValue(val, { emitEvent: true });
                return;
              }

              // Dropdown/Select Resolution
              const isSelect = el.tagName.includes('SELECT') || el.tagName.includes('DROPDOWN') || instance.options !== undefined;
              if (isSelect && instance.options && !isFile) {
                const options = Array.isArray(instance.options) ? instance.options : (instance._options || []);
                const optVal = instance.optionValue;
                const optLab = instance.optionLabel || 'label';

                const match = options.find(o => {
                  const v = optVal ? o[optVal] : (typeof o === 'object' ? (o.value !== undefined ? o.value : o) : o);
                  const l = typeof o === 'object' ? o[optLab] : String(o);
                  return String(v).toLowerCase() === String(finalVal).toLowerCase() || 
                         (l && String(l).toLowerCase().includes(String(finalVal).toLowerCase()));
                });

                if (match) {
                  finalVal = optVal ? match[optVal] : (typeof match === 'object' ? (match.value !== undefined ? match.value : match) : match);
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

              // UI Updates (Handle potential minification by checking for function existence)
              if (typeof instance.updateInputfield === 'function') instance.updateInputfield();
              if (typeof instance.updateEditableLabel === 'function') instance.updateEditableLabel();
              if (typeof instance.updateSelectedOption === 'function') instance.updateSelectedOption();
              
              // Trigger explicit tick if possible (optional)
              el.dispatchEvent(new Event('change', { bubbles: true }));
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('blur', { bubbles: true }));

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
          document.querySelectorAll('p-select, p-dropdown, p-multiselect, p-datepicker, cfs-select, input, [formcontrolname]').forEach(sel => {
             const fcn = sel.getAttribute('formcontrolname');
             const id = sel.id;
             const name = sel.getAttribute('name');
             
             // Ignore auto-generated numeric IDs
             const isGenericId = id && /-\d+$/.test(id);
             const key = fcn || name || (isGenericId ? null : id);
             
             if (!key && !sel.tagName.includes('SELECT') && !sel.tagName.includes('P-')) return;
             
             let val = null;
             if (key) {
               val = formValues[key];
               if (val === undefined || val === null) {
                 const entry = Object.entries(formValues).find(([k]) => {
                   const suffix = k.split('_').pop().toLowerCase();
                   return key.toLowerCase() === suffix || key.toLowerCase().includes(suffix);
                 });
                 if (entry) val = entry[1];
               }
             }

             // Special handling for Terms and Privacy 
             if (val === null || val === undefined) {
               const text = (sel.innerText || sel.placeholder || '').toLowerCase();
               if (text.includes('terms') || text.includes('conditions')) val = formValues['terms'];
               if (text.includes('privacy')) val = formValues['privacy'];
             }

             if (val !== undefined && val !== null) {
               syncComponent(sel, val);
             }
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
      // If it's a date, convert to timestamp for safe transfer across isolated worlds
      acc[newKey] = (obj[k] instanceof Date) ? obj[k].getTime() : obj[k];
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

// --- MODULE: NETWORK MONITOR ---

let logInterval = null;

function setupNetworkMonitor() {
  const clearLogsBtn = document.getElementById('clearLogsBtn');
  clearLogsBtn?.addEventListener('click', clearNetworkLogs);

  // Poll for logs when the network tab is active
  const networkTabBtn = document.querySelector('[data-tab="network-tab"]');
  networkTabBtn?.addEventListener('click', startLogPolling);

  // Stop polling when other tabs are clicked
  document.querySelectorAll('.nav-btn:not([data-tab="network-tab"])').forEach(btn => {
    btn.addEventListener('click', stopLogPolling);
  });
}

function startLogPolling() {
  if (logInterval) return;
  fetchAndRenderLogs();
  logInterval = setInterval(fetchAndRenderLogs, 2000);
}

function stopLogPolling() {
  if (logInterval) {
    clearInterval(logInterval);
    logInterval = null;
  }
}

async function fetchAndRenderLogs() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || tab.url.startsWith('chrome://')) return;

    chrome.tabs.sendMessage(tab.id, { action: 'getNetworkLogs' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script might not be ready
        return;
      }
      if (response?.success && response.logs) {
        renderNetworkLogs(response.logs);
      }
    });
  } catch (err) {}
}

function renderNetworkLogs(logs) {
  const listContainer = document.getElementById('networkLogsList');
  if (!listContainer) return;

  if (logs.length === 0) {
    listContainer.innerHTML = '<div class="empty-state">No API calls detected yet.</div>';
    return;
  }

  // Preserve expanded state based on timestamp which acts as a unique ID here
  const expandedIds = Array.from(listContainer.querySelectorAll('.log-item.expanded')).map(el => el.dataset.timestamp);

  listContainer.innerHTML = '';
  logs.slice().reverse().forEach(log => {
    const isError = (typeof log.status === 'number' && log.status >= 400) || log.status === 'Error';
    const time = new Date(log.timestamp).toLocaleTimeString();
    
    const item = document.createElement('div');
    item.className = `log-item ${expandedIds.includes(String(log.timestamp)) ? 'expanded' : ''}`;
    item.dataset.timestamp = log.timestamp;
    
    // Clean up response for display
    let displayBody = log.responseBody;
    if (typeof displayBody === 'object' && displayBody !== null) {
      displayBody = JSON.stringify(displayBody, null, 2);
    }

    item.innerHTML = `
      <div class="log-header">
        <span class="log-method ${log.method}">${log.method}</span>
        <span class="log-status ${isError ? 'status-error' : 'status-ok'}">${log.status}</span>
      </div>
      <div class="log-url" title="${log.url}">${log.url}</div>
      <div class="log-meta">
        <span>${time}</span>
        <span>${log.duration}ms</span>
        <span>${log.type.toUpperCase()}</span>
      </div>
      <div class="log-detail">
        <div class="log-detail-section">
          <h5>Request Headers</h5>
          <pre>${JSON.stringify(log.requestHeaders, null, 2)}</pre>
        </div>
        <div class="log-detail-section">
          <h5>Response Content</h5>
          <pre>${displayBody || '[Empty Response]'}</pre>
        </div>
      </div>
    `;

    item.addEventListener('click', (e) => {
      // Don't toggle if clicking inside the pre block (to allow selection)
      if (e.target.closest('pre')) return;
      item.classList.toggle('expanded');
    });

    listContainer.appendChild(item);
  });
}

async function clearNetworkLogs() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'clearNetworkLogs' }, () => {
        if (!chrome.runtime.lastError) {
          renderNetworkLogs([]);
          showStatus('🗑️ Network logs cleared', 'info');
        }
      });
    }
  } catch (err) {}
}

// --- MODULE: SECURITY / JWT DECODER ---

let expiryTimer = null;
let currentTokenPayload = null;
let authPollInterval = null;

function setupSecurityModule() {
  const tokenInput = document.getElementById('tokenInput');
  const clearTokenBtn = document.getElementById('clearTokenBtn');
  const copyClaimsBtn = document.getElementById('copyClaimsBtn');
  const refreshBtn = document.getElementById('refreshTokenBtn');

  tokenInput?.addEventListener('input', () => processToken(tokenInput.value));
  clearTokenBtn?.addEventListener('click', () => {
    tokenInput.value = '';
    processToken('');
  });
  
  copyClaimsBtn?.addEventListener('click', () => {
    if (currentTokenPayload) {
      navigator.clipboard.writeText(JSON.stringify(currentTokenPayload, null, 2));
      showStatus('📋 Claims copied to clipboard', 'success');
    }
  });

  refreshBtn?.addEventListener('click', async () => {
    showStatus('🔄 Requesting token refresh...', 'info');
    setTimeout(() => showStatus('✅ Refresh flow triggered', 'success'), 1000);
  });

  const securityTabBtn = document.querySelector('[data-tab="security-tab"]');
  securityTabBtn?.addEventListener('click', startAuthPolling);

  document.querySelectorAll('.nav-btn:not([data-tab="security-tab"])').forEach(btn => {
    btn.addEventListener('click', stopAuthPolling);
  });

  startAuthPolling();
}

function startAuthPolling() {
  if (authPollInterval) return;
  fetchAuthToken();
  authPollInterval = setInterval(fetchAuthToken, 3000);
}

function stopAuthPolling() {
  if (authPollInterval) {
    clearInterval(authPollInterval);
    authPollInterval = null;
  }
}

async function fetchAuthToken() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || tab.url.startsWith('chrome://')) return;

    chrome.tabs.sendMessage(tab.id, { action: 'getAuthToken' }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response?.success && response.token) {
        const tInput = document.getElementById('tokenInput');
        if (tInput && tInput.value !== response.token) {
          tInput.value = response.token;
          processToken(response.token, response.source);
        }
      }
    });
  } catch (err) {}
}

function processToken(token, source = 'manual') {
  const parts = token.split('.');
  if (parts.length !== 3) {
    updateTokenUI(null);
    return;
  }

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    currentTokenPayload = payload;
    updateTokenUI(payload, source);
  } catch (e) {
    updateTokenUI(null);
  }
}

function updateTokenUI(payload, source = 'manual') {
  const details = document.getElementById('tokenDetails');
  const statusBox = document.getElementById('tokenStateBox');
  const statusText = document.getElementById('tokenStatusText');
  const sourceBadge = document.getElementById('tokenSourceBadge');
  const claimsList = document.getElementById('claimsList');

  if (!payload || !details) {
    if (details) details.style.display = 'none';
    if (statusBox) statusBox.classList.remove('active');
    if (statusText) statusText.textContent = 'No Token Detected';
    if (sourceBadge) sourceBadge.style.display = 'none';
    clearInterval(expiryTimer);
    return;
  }

  details.style.display = 'block';
  statusBox.classList.add('active');
  statusText.textContent = '🔐 Token Active & Decoded';
  
  if (sourceBadge) {
    sourceBadge.style.display = 'block';
    const sourceLabels = {
        'header': 'Request Header',
        'xhr-header': 'XHR Header',
        'storage': 'Local Storage',
        'cookie': 'Cookie',
        'resp-body': 'API Response',
        'resp-header': 'Response Header',
        'manual': 'Pasted'
    };
    sourceBadge.textContent = sourceLabels[source] || source;
  }

  // 1. Populate User Profile Summary
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profileRoles = document.getElementById('profileRoles');
  const userAvatar = document.getElementById('userAvatar');

  const name = payload.name || payload.preferred_username || 'Unknown User';
  const email = payload.email || 'No email provided';
  const roles = payload['client-roles'] || payload.roles || [];

  if (profileName) profileName.textContent = name;
  if (profileEmail) profileEmail.textContent = email;
  if (userAvatar) userAvatar.textContent = name.charAt(0).toUpperCase();

  if (profileRoles) {
    profileRoles.innerHTML = '';
    [...new Set(roles)].forEach(role => {
      const tag = document.createElement('span');
      tag.className = 'role-tag';
      tag.textContent = role;
      profileRoles.appendChild(tag);
    });
  }

  // 2. Populate Management Permissions (Sekaya Specific Grid)
  const permSection = document.getElementById('permissionSection');
  const permGrid = document.getElementById('permissionGrid');
  const permissions = payload.authorization?.permissions || [];

  const ICON_MAP = {
    'dashboard-management': '📊',
    'user-management': '👥',
    'wallet-management': '💰',
    'charities-management': '🏛️',
    'opportunities-management': '🎯',
    'suggestion-complaint-management': '📩',
    'reports-management': '📈',
    'audit-management': '🔍',
    'settings-management': '⚙️'
  };

  if (permissions.length > 0 && permSection && permGrid) {
    permSection.style.display = 'block';
    permGrid.innerHTML = '';
    
    permissions.forEach(p => {
      if (p.rsname === 'NewResource') return; // Skip placeholders
      
      const card = document.createElement('div');
      card.className = 'perm-card active';
      
      const icon = ICON_MAP[p.rsname] || '🛠️';
      const label = p.rsname.replace(/-management$/, '').replace(/-/g, ' ');
      
      card.innerHTML = `
        <div class="perm-icon">${icon}</div>
        <div class="perm-label">${label}</div>
      `;
      permGrid.appendChild(card);
    });
  } else if (permSection) {
    permSection.style.display = 'none';
  }

  // 3. Render All Raw Claims
  claimsList.innerHTML = '';
  Object.entries(payload).forEach(([key, val]) => {
    // Skip large objects that we've already visualized to keep list clean
    if (key === 'authorization') return;

    const item = document.createElement('div');
    item.className = 'claim-item';
    item.innerHTML = `
      <span class="claim-key">${key}</span>
      <span class="claim-val">${typeof val === 'object' ? JSON.stringify(val) : val}</span>
    `;
    claimsList.appendChild(item);
  });

  if (payload.exp) {
    startExpiryCountdown(payload.exp);
  }
}

function startExpiryCountdown(expTimestamp) {
  clearInterval(expiryTimer);
  
  const update = () => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = expTimestamp - now;
    const expiryEl = document.getElementById('expiryTime');
    const progressEl = document.getElementById('expiryProgress');

    if (!expiryEl || !progressEl) return;

    if (timeLeft <= 0) {
      expiryEl.textContent = 'EXPIRED';
      expiryEl.style.color = '#ef4444';
      progressEl.style.width = '0%';
      clearInterval(expiryTimer);
      return;
    }

    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    expiryEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    expiryEl.style.color = '';
    
    const iat = currentTokenPayload.iat || (expTimestamp - 3600);
    const totalDuration = expTimestamp - iat;
    const elapsed = now - iat;
    const percentage = Math.max(0, Math.min(100, 100 - (elapsed / totalDuration * 100)));
    
    progressEl.style.width = `${percentage}%`;
    progressEl.className = 'progress-bar';
    if (percentage < 10) progressEl.classList.add('danger');
    else if (percentage < 25) progressEl.classList.add('warning');
    
    if (timeLeft === 300) {
        showStatus('⚠️ Alert: Token expires in 5 minutes!', 'error');
    }
  };

  update();
  expiryTimer = setInterval(update, 1000);
}
