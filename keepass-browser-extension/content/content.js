/**
 * Content Script - Form Detection and Autofill
 * 
 * Security considerations:
 * - Runs in isolated world (cannot access page JavaScript)
 * - Only fills forms when user explicitly approves
 * - Credentials are cleared from memory immediately after filling
 * - Does not store any sensitive data
 * - Uses secure communication with background script
 */

// Track detected forms on the page
let detectedForms = [];
let pageUrl = window.location.href;

/**
 * Detect login forms on the page
 * 
 * Security: Only detects password fields and associated username fields
 * Does not interact with forms automatically
 */
function detectLoginForms() {
  const forms = [];
  
  // Find all password input fields
  const passwordFields = document.querySelectorAll('input[type="password"]');
  
  passwordFields.forEach((passwordField, index) => {
    // Find associated username field (common patterns)
    const usernameField = findUsernameField(passwordField);
    
    if (usernameField) {
      const form = {
        id: `form_${index}`,
        passwordField: getFieldSelector(passwordField),
        usernameField: getFieldSelector(usernameField),
        formElement: passwordField.form ? getFieldSelector(passwordField.form) : null,
        detected: true
      };
      
      forms.push(form);
      
      // Add visual indicator (optional, can be disabled for security)
      addFormIndicator(usernameField, passwordField);
    }
  });
  
  return forms;
}

/**
 * Find username field associated with a password field
 * 
 * Looks for common patterns:
 * - Email input before password
 * - Text input with username/email/user in name or id
 * - Previous text/email input in the same form
 */
function findUsernameField(passwordField) {
  const form = passwordField.form;
  
  // Strategy 1: Look for email input
  if (form) {
    const emailInput = form.querySelector('input[type="email"]');
    if (emailInput) return emailInput;
  }
  
  // Strategy 2: Look for input with username-related attributes
  const usernamePatterns = ['user', 'email', 'login', 'account'];
  const allInputs = form ? 
    Array.from(form.querySelectorAll('input[type="text"], input[type="email"], input:not([type])')) :
    Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input:not([type])'));
  
  for (const input of allInputs) {
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const autocomplete = (input.autocomplete || '').toLowerCase();
    
    if (usernamePatterns.some(pattern => 
      name.includes(pattern) || 
      id.includes(pattern) || 
      placeholder.includes(pattern) ||
      autocomplete.includes(pattern)
    )) {
      return input;
    }
  }
  
  // Strategy 3: Get previous text input before password field
  if (form) {
    const allFormInputs = Array.from(form.querySelectorAll('input'));
    const passwordIndex = allFormInputs.indexOf(passwordField);
    
    for (let i = passwordIndex - 1; i >= 0; i--) {
      const input = allFormInputs[i];
      const type = input.type.toLowerCase();
      if (type === 'text' || type === 'email' || !input.type) {
        return input;
      }
    }
  }
  
  return null;
}

/**
 * Get a unique selector for a field
 */
function getFieldSelector(element) {
  if (element.id) return `#${element.id}`;
  if (element.name) return `[name="${element.name}"]`;
  
  // Generate XPath-like selector
  let path = element.tagName.toLowerCase();
  let parent = element.parentElement;
  
  while (parent && parent !== document.body) {
    const index = Array.from(parent.children).indexOf(element) + 1;
    path = `${parent.tagName.toLowerCase()} > ${path}:nth-child(${index})`;
    element = parent;
    parent = element.parentElement;
  }
  
  return path;
}

/**
 * Add visual indicator that the extension can fill this form
 * 
 * Security: This is optional and can be disabled if visual indicators
 * pose a security concern
 */
function addFormIndicator(usernameField, passwordField) {
  // Only add indicator if not already present
  if (usernameField.dataset.keepassReady) return;
  
  usernameField.dataset.keepassReady = 'true';
  passwordField.dataset.keepassReady = 'true';
  
  // Add a small icon next to the username field
  const indicator = document.createElement('span');
  indicator.className = 'keepass-indicator';
  indicator.style.cssText = `
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-left: 4px;
    background: #4CAF50;
    border-radius: 50%;
    cursor: pointer;
    vertical-align: middle;
    position: relative;
  `;
  indicator.title = 'KeePass: Click to autofill credentials';
  
  // Add click handler to trigger autofill
  indicator.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await requestCredentials();
  });
  
  // Insert indicator after the field
  usernameField.parentElement.insertBefore(indicator, usernameField.nextSibling);
}

/**
 * Request credentials from background script
 */
async function requestCredentials() {
  try {
    const response = await browser.runtime.sendMessage({
      action: 'getCredentials',
      data: { url: pageUrl }
    });
    
    if (response.success && response.credentials.length > 0) {
      // If multiple credentials, let user choose (handled by popup)
      if (response.credentials.length > 1) {
        // Show selection UI
        showCredentialSelection(response.credentials);
      } else {
        // Auto-fill if only one credential
        await fillFormWithCredentials(response.credentials[0]);
      }
    } else {
      console.log('No credentials found for this site');
      showNotification('No credentials found for this site');
    }
  } catch (error) {
    console.error('Error requesting credentials:', error);
    showNotification('Error: ' + error.message);
  }
}

/**
 * Show credential selection UI when multiple credentials match
 */
function showCredentialSelection(credentials) {
  // Remove existing selection UI if present
  const existing = document.getElementById('keepass-credential-selector');
  if (existing) existing.remove();
  
  // Create selection UI
  const selector = document.createElement('div');
  selector.id = 'keepass-credential-selector';
  selector.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #4CAF50;
    border-radius: 8px;
    padding: 20px;
    z-index: 999999;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    min-width: 300px;
  `;
  
  const title = document.createElement('h3');
  title.textContent = 'Select Credential';
  title.style.cssText = 'margin: 0 0 15px 0; color: #333;';
  selector.appendChild(title);
  
  const list = document.createElement('ul');
  list.style.cssText = 'list-style: none; padding: 0; margin: 0 0 15px 0;';
  
  credentials.forEach((cred, index) => {
    const item = document.createElement('li');
    item.style.cssText = `
      padding: 10px;
      margin: 5px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    `;
    item.textContent = `${cred.title} (${cred.username})`;
    
    item.addEventListener('mouseenter', () => {
      item.style.background = '#f0f0f0';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'white';
    });
    
    item.addEventListener('click', async () => {
      selector.remove();
      await fillFormWithCredentials(cred);
    });
    
    list.appendChild(item);
  });
  
  selector.appendChild(list);
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = `
    padding: 8px 16px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  cancelButton.addEventListener('click', () => {
    selector.remove();
  });
  
  selector.appendChild(cancelButton);
  document.body.appendChild(selector);
}

/**
 * Fill form with provided credentials
 * 
 * Security: Credentials are used immediately and then cleared from memory
 */
async function fillFormWithCredentials(credentials) {
  if (detectedForms.length === 0) {
    console.error('No forms detected');
    return;
  }
  
  // Use the first detected form
  const form = detectedForms[0];
  
  try {
    // Find username and password fields
    const usernameField = document.querySelector(form.usernameField);
    const passwordField = document.querySelector(form.passwordField);
    
    if (usernameField && passwordField) {
      // Fill username
      usernameField.value = credentials.username;
      usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      usernameField.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Fill password
      passwordField.value = credentials.password;
      passwordField.dispatchEvent(new Event('input', { bubbles: true }));
      passwordField.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Clear credentials from memory
      credentials.username = null;
      credentials.password = null;
      
      showNotification('Credentials filled successfully');
    } else {
      console.error('Could not find form fields');
      showNotification('Error: Could not find form fields');
    }
  } catch (error) {
    console.error('Error filling form:', error);
    showNotification('Error filling form: ' + error.message);
  }
}

/**
 * Show a temporary notification to the user
 */
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 20px;
    border-radius: 4px;
    z-index: 999999;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    font-family: sans-serif;
    font-size: 14px;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Listen for messages from background script
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, credentials } = message;
  
  if (action === 'fillForm' && credentials) {
    fillFormWithCredentials(credentials);
    sendResponse({ success: true });
  }
  
  return true;
});

/**
 * Initialize content script
 */
function initialize() {
  // Detect forms on page load
  detectedForms = detectLoginForms();
  
  if (detectedForms.length > 0) {
    console.log(`KeePass: Detected ${detectedForms.length} login form(s)`);
  }
  
  // Re-detect forms if DOM changes (for SPAs)
  const observer = new MutationObserver((mutations) => {
    // Debounce form detection
    clearTimeout(observer.timeout);
    observer.timeout = setTimeout(() => {
      detectedForms = detectLoginForms();
    }, 500);
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
