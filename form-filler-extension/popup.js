// popup.js - Handles popup interface and form filling

// DOM Elements
const fillFormBtn = document.getElementById('fillFormBtn');
const fillRandomBtn = document.getElementById('fillRandomBtn');
const detectFieldsBtn = document.getElementById('detectFieldsBtn');
const settingsForm = document.getElementById('settingsForm');
const rulesForm = document.getElementById('rulesForm');
const clearBtn = document.getElementById('clearBtn');
const resetRulesBtn = document.getElementById('resetRulesBtn');
const statusMessage = document.getElementById('statusMessage');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Form field IDs
const formFields = [
  'firstName', 'lastName', 'email', 'phone',
  'address', 'city', 'state', 'zipCode', 'country',
  'company', 'website'
];

// Rules field IDs
const rulesFields = [
  'phonePattern', 'phonePrefix', 'emailDomain', 'countryCode', 'zipCodeLength'
];

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  loadRules();
  loadApiPreference();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Fill form button
  fillFormBtn.addEventListener('click', fillCurrentForm);

  // Fill with random data button
  fillRandomBtn.addEventListener('click', fillWithRandomData);

  // Detect fields button
  detectFieldsBtn.addEventListener('click', detectFormFields);

  // Save settings
  settingsForm.addEventListener('submit', saveSettings);

  // Save rules
  rulesForm.addEventListener('submit', saveRules);

  // Clear all data
  clearBtn.addEventListener('click', clearAllData);

  // Reset rules
  resetRulesBtn.addEventListener('click', resetRules);

  // API checkbox
  const useApiCheckbox = document.getElementById('useApiData');
  if (useApiCheckbox) {
    useApiCheckbox.addEventListener('change', saveApiPreference);
  }
}

// Switch tabs
function switchTab(tabName) {
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

// Load saved settings
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(formFields);
    
    formFields.forEach(field => {
      const input = document.getElementById(field);
      if (input && result[field]) {
        input.value = result[field];
      }
    });
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings
async function saveSettings(e) {
  e.preventDefault();

  const data = {};
  formFields.forEach(field => {
    const input = document.getElementById(field);
    if (input) {
      data[field] = input.value;
    }
  });

  try {
    await chrome.storage.sync.set(data);
    showStatus('✅ Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('❌ Error saving settings', 'error');
  }
}

// Clear all data
async function clearAllData() {
  if (!confirm('Are you sure you want to clear all saved data?')) {
    return;
  }

  try {
    await chrome.storage.sync.clear();
    
    formFields.forEach(field => {
      const input = document.getElementById(field);
      if (input) {
        input.value = '';
      }
    });

    showStatus('🗑️ All data cleared', 'info');
  } catch (error) {
    console.error('Error clearing data:', error);
    showStatus('❌ Error clearing data', 'error');
  }
}

// Fill current form
async function fillCurrentForm() {
  try {
    // Get saved data
    const data = await chrome.storage.sync.get(formFields);

    if (Object.keys(data).length === 0) {
      showStatus('⚠️ No data saved. Please configure settings first.', 'error');
      return;
    }

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to content script to fill form
    chrome.tabs.sendMessage(tab.id, {
      action: 'fillForm',
      data: data
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('❌ Error: Please refresh the page and try again', 'error');
        return;
      }

      if (response && response.success) {
        showStatus(`✅ Form filled! ${response.fieldsFound} fields detected`, 'success');
      } else {
        showStatus('⚠️ No form fields found on this page', 'error');
      }
    });
  } catch (error) {
    console.error('Error filling form:', error);
    showStatus('❌ Error filling form', 'error');
  }
}

// Fill with random data
async function fillWithRandomData() {
  try {
    // Check if user wants to use API
    const useApiCheckbox = document.getElementById('useApiData');
    const useApi = useApiCheckbox && useApiCheckbox.checked;

    // Load and apply saved rules first
    const savedRules = await chrome.storage.sync.get(rulesFields);
    const rules = {};
    
    // Convert saved rules to generator format
    if (savedRules.phonePattern) rules.phonePattern = savedRules.phonePattern;
    if (savedRules.phonePrefix) rules.phonePrefix = savedRules.phonePrefix;
    if (savedRules.emailDomain) rules.emailDomain = savedRules.emailDomain;
    if (savedRules.countryCode) rules.countryCode = savedRules.countryCode;
    if (savedRules.zipCodeLength) rules.zipCodeLength = savedRules.zipCodeLength;
    
    let randomData;

    if (useApi) {
      // Use API data generator
      console.log('🌐 Using API data generator...');
      showStatus('🌐 Fetching data from API...', 'info');
      randomData = await APIDataGenerator.generateRandomData(rules);
    } else {
      // Use static data generator
      console.log('📦 Using static data generator...');
      applyRulesToGenerator(savedRules);
      randomData = RandomDataGenerator.generateRandomData();
    }
    
    console.log('Generated random data:', randomData);

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to content script to fill form
    chrome.tabs.sendMessage(tab.id, {
      action: 'fillForm',
      data: randomData
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('❌ Error: Please refresh the page and try again', 'error');
        return;
      }

      if (response && response.success) {
        showStatus(`🎲 Random data filled! ${response.fieldsFound} fields detected`, 'success');
        
        // Optionally show what was generated
        console.log('Filled with random data:', randomData);
      } else {
        showStatus('⚠️ No form fields found on this page', 'error');
      }
    });
  } catch (error) {
    console.error('Error filling with random data:', error);
    showStatus('❌ Error filling with random data', 'error');
  }
}

// Detect form fields
async function detectFormFields() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, {
      action: 'detectFields'
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('❌ Error: Please refresh the page and try again', 'error');
        return;
      }

      if (response && response.fields && response.fields.length > 0) {
        showStatus(`🔍 Found ${response.fields.length} form fields: ${response.fields.join(', ')}`, 'info');
      } else {
        showStatus('⚠️ No form fields detected on this page', 'error');
      }
    });
  } catch (error) {
    console.error('Error detecting fields:', error);
    showStatus('❌ Error detecting fields', 'error');
  }
}

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;

  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 5000);
}

// Load saved rules
async function loadRules() {
  try {
    const result = await chrome.storage.sync.get(rulesFields);
    
    rulesFields.forEach(field => {
      const input = document.getElementById(field);
      if (input && result[field]) {
        input.value = result[field];
      }
    });
  } catch (error) {
    console.error('Error loading rules:', error);
  }
}

// Save rules
async function saveRules(e) {
  e.preventDefault();

  const rules = {};
  rulesFields.forEach(field => {
    const input = document.getElementById(field);
    if (input && input.value) {
      // Convert zipCodeLength to number
      rules[field] = field === 'zipCodeLength' ? parseInt(input.value) : input.value;
    }
  });

  try {
    await chrome.storage.sync.set(rules);
    
    // Apply rules to RandomDataGenerator
    applyRulesToGenerator(rules);
    
    showStatus('✅ Rules saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving rules:', error);
    showStatus('❌ Error saving rules', 'error');
  }
}

// Reset rules to defaults
async function resetRules() {
  if (!confirm('Are you sure you want to reset all rules to defaults?')) {
    return;
  }

  try {
    // Clear rules from storage
    await chrome.storage.sync.remove(rulesFields);
    
    // Clear form inputs
    rulesFields.forEach(field => {
      const input = document.getElementById(field);
      if (input) {
        input.value = '';
      }
    });

    // Reset RandomDataGenerator rules
    RandomDataGenerator.resetRules();
    
    showStatus('🔄 Rules reset to defaults', 'info');
  } catch (error) {
    console.error('Error resetting rules:', error);
    showStatus('❌ Error resetting rules', 'error');
  }
}

// Apply rules to RandomDataGenerator
function applyRulesToGenerator(rules) {
  const generatorRules = {};
  
  if (rules.phonePattern) generatorRules.phonePattern = rules.phonePattern;
  if (rules.phonePrefix) generatorRules.phonePrefix = rules.phonePrefix;
  if (rules.emailDomain) generatorRules.emailDomain = rules.emailDomain;
  if (rules.countryCode) generatorRules.countryCode = rules.countryCode;
  if (rules.zipCodeLength) generatorRules.zipCodeLength = rules.zipCodeLength;
  
  RandomDataGenerator.setRules(generatorRules);
  console.log('Applied rules to generator:', generatorRules);
}

// Load API preference
async function loadApiPreference() {
  try {
    const result = await chrome.storage.sync.get(['useApiData']);
    const useApiCheckbox = document.getElementById('useApiData');
    
    if (useApiCheckbox && result.useApiData !== undefined) {
      useApiCheckbox.checked = result.useApiData;
    }
  } catch (error) {
    console.error('Error loading API preference:', error);
  }
}

// Save API preference
async function saveApiPreference() {
  try {
    const useApiCheckbox = document.getElementById('useApiData');
    const useApiData = useApiCheckbox ? useApiCheckbox.checked : false;
    
    await chrome.storage.sync.set({ useApiData });
    console.log('API preference saved:', useApiData);
  } catch (error) {
    console.error('Error saving API preference:', error);
  }
}

