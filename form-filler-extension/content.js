// content.js - Handles form detection and filling on web pages

console.log('%c📝 Form Filler Extension Loaded', 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 14px; font-weight: bold; padding: 8px 16px; border-radius: 4px;');

// Field mapping - maps common field names/IDs to our data keys
const fieldMappings = {
  firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'givenname'],
  lastName: ['lastname', 'last-name', 'last_name', 'lname', 'surname', 'family-name', 'familyname'],
  email: ['email', 'e-mail', 'emailaddress', 'email-address', 'mail'],
  phone: ['phone', 'telephone', 'tel', 'mobile', 'phonenumber', 'phone-number', 'phone_number'],
  address: ['address', 'street', 'address1', 'address-1', 'street-address', 'streetaddress', 'addr'],
  city: ['city', 'town', 'locality'],
  state: ['state', 'province', 'region', 'county'],
  zipCode: ['zip', 'zipcode', 'zip-code', 'postal', 'postalcode', 'postal-code', 'postcode'],
  country: ['country', 'nation'],
  company: ['company', 'organization', 'organisation', 'org', 'employer'],
  website: ['website', 'url', 'site', 'homepage', 'web']
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    const result = fillFormFields(request.data);
    sendResponse(result);
  } else if (request.action === 'detectFields') {
    const fields = detectFormFields();
    sendResponse({ fields: fields });
  }
  return true; // Keep message channel open for async response
});

// Fill form fields with provided data
function fillFormFields(data) {
  let fieldsFound = 0;
  const filledFields = [];

  // Get all input, select, and textarea elements
  const formElements = document.querySelectorAll('input, select, textarea');

  formElements.forEach(element => {
    // Skip buttons, submit, hidden, etc.
    if (element.type === 'submit' || element.type === 'button' || 
        element.type === 'hidden' || element.type === 'reset') {
      return;
    }

    // Get element identifiers
    const name = (element.name || '').toLowerCase();
    const id = (element.id || '').toLowerCase();
    const placeholder = (element.placeholder || '').toLowerCase();
    const type = element.type;

    // Try to match field
    for (const [dataKey, patterns] of Object.entries(fieldMappings)) {
      if (data[dataKey]) {
        // Check if any pattern matches
        const matches = patterns.some(pattern => 
          name.includes(pattern) || 
          id.includes(pattern) || 
          placeholder.includes(pattern)
        );

        if (matches) {
          // Fill the field
          if (element.tagName === 'SELECT') {
            // For select elements, try to find matching option
            const options = Array.from(element.options);
            const matchingOption = options.find(opt => 
              opt.value.toLowerCase() === data[dataKey].toLowerCase() ||
              opt.text.toLowerCase() === data[dataKey].toLowerCase()
            );
            if (matchingOption) {
              element.value = matchingOption.value;
              fieldsFound++;
              filledFields.push(dataKey);
            }
          } else {
            // For input and textarea
            element.value = data[dataKey];
            
            // Trigger input events to ensure validation
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            
            fieldsFound++;
            filledFields.push(dataKey);
          }

          // Add visual feedback
          highlightField(element);
          break; // Move to next element
        }
      }
    }
  });

  console.log(`%c✅ Filled ${fieldsFound} fields`, 'color: green; font-weight: bold;', filledFields);

  return {
    success: fieldsFound > 0,
    fieldsFound: fieldsFound,
    fields: filledFields
  };
}

// Detect form fields on the page
function detectFormFields() {
  const detectedFields = new Set();
  const formElements = document.querySelectorAll('input, select, textarea');

  formElements.forEach(element => {
    // Skip buttons, submit, hidden, etc.
    if (element.type === 'submit' || element.type === 'button' || 
        element.type === 'hidden' || element.type === 'reset') {
      return;
    }

    const name = (element.name || '').toLowerCase();
    const id = (element.id || '').toLowerCase();
    const placeholder = (element.placeholder || '').toLowerCase();

    // Check against our mappings
    for (const [dataKey, patterns] of Object.entries(fieldMappings)) {
      const matches = patterns.some(pattern => 
        name.includes(pattern) || 
        id.includes(pattern) || 
        placeholder.includes(pattern)
      );

      if (matches) {
        detectedFields.add(dataKey);
      }
    }
  });

  const fieldsArray = Array.from(detectedFields);
  console.log('%c🔍 Detected fields:', 'color: #667eea; font-weight: bold;', fieldsArray);

  return fieldsArray;
}

// Highlight filled field with animation
function highlightField(element) {
  const originalBorder = element.style.border;
  const originalBackground = element.style.backgroundColor;

  // Add highlight
  element.style.border = '2px solid #667eea';
  element.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
  element.style.transition = 'all 0.3s ease';

  // Remove highlight after 2 seconds
  setTimeout(() => {
    element.style.border = originalBorder;
    element.style.backgroundColor = originalBackground;
  }, 2000);
}

// Auto-detect forms on page load
window.addEventListener('load', () => {
  const forms = document.querySelectorAll('form');
  if (forms.length > 0) {
    console.log(`%c📋 Found ${forms.length} form(s) on this page`, 'color: #764ba2; font-weight: bold;');
  }
});
