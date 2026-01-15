/**
 * Popup UI Logic
 * 
 * Security: No credentials are stored in the popup
 * All credential data is cleared after use
 */

let currentTab = null;
let currentCredentials = [];

/**
 * Initialize popup when opened
 */
async function initialize() {
  // Get current tab
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];
  
  // Check connection status
  await checkConnection();
  
  // Load credentials for current site
  await loadCredentials();
  
  // Set up event listeners
  setupEventListeners();
}

/**
 * Check connection to password manager
 */
async function checkConnection() {
  const statusBox = document.getElementById('connection-status');
  const statusText = document.getElementById('connection-text');
  const statusIndicator = document.getElementById('status-text');
  
  try {
    const response = await browser.runtime.sendMessage({
      action: 'getStatus'
    });
    
    if (response.connected) {
      statusBox.className = 'status-box connected';
      statusText.textContent = `Connected to ${response.name}`;
      statusIndicator.textContent = '✓ Connected';
      document.getElementById('error-section').style.display = 'none';
    } else {
      statusBox.className = 'status-box disconnected';
      statusText.textContent = 'Not connected to password manager';
      statusIndicator.textContent = '✗ Disconnected';
      showError('Password manager is not connected. Please ensure KeePass is running and the native messaging host is installed.');
    }
  } catch (error) {
    statusBox.className = 'status-box disconnected';
    statusText.textContent = 'Connection error';
    statusIndicator.textContent = '✗ Error';
    showError(`Failed to connect: ${error.message}`);
  }
}

/**
 * Load credentials for current site
 */
async function loadCredentials() {
  if (!currentTab || !currentTab.url) {
    showNoCredentials();
    return;
  }
  
  try {
    const response = await browser.runtime.sendMessage({
      action: 'getCredentials',
      data: { url: currentTab.url }
    });
    
    if (response.success && response.credentials.length > 0) {
      currentCredentials = response.credentials;
      displayCredentials(response.credentials);
    } else {
      showNoCredentials();
    }
  } catch (error) {
    console.error('Error loading credentials:', error);
    showError(`Failed to load credentials: ${error.message}`);
  }
}

/**
 * Display credentials in the UI
 */
function displayCredentials(credentials) {
  const credentialsSection = document.getElementById('credentials-section');
  const credentialsList = document.getElementById('credentials-list');
  const noCredentials = document.getElementById('no-credentials');
  
  // Clear existing list
  credentialsList.innerHTML = '';
  
  // Show credentials section
  credentialsSection.style.display = 'block';
  noCredentials.style.display = 'none';
  
  // Create credential items
  credentials.forEach((cred, index) => {
    const item = createCredentialItem(cred, index);
    credentialsList.appendChild(item);
  });
}

/**
 * Create a credential item element
 */
function createCredentialItem(credential, index) {
  const item = document.createElement('div');
  item.className = 'credential-item';
  item.dataset.index = index;
  
  const title = document.createElement('div');
  title.className = 'credential-title';
  title.textContent = credential.title || 'Untitled';
  
  const username = document.createElement('div');
  username.className = 'credential-username';
  username.textContent = credential.username || '(no username)';
  
  const domain = document.createElement('div');
  domain.className = 'credential-domain';
  domain.textContent = credential.domain || '';
  
  item.appendChild(title);
  item.appendChild(username);
  if (credential.domain) {
    item.appendChild(domain);
  }
  
  // Add click handler to fill credentials
  item.addEventListener('click', () => {
    fillCredential(credential);
  });
  
  return item;
}

/**
 * Fill credential into the page
 */
async function fillCredential(credential) {
  try {
    // Send credentials to content script
    await browser.tabs.sendMessage(currentTab.id, {
      action: 'fillForm',
      credentials: credential
    });
    
    // Clear credential from memory
    credential.username = null;
    credential.password = null;
    
    // Show success notification
    showSuccessNotification();
    
    // Close popup after short delay
    setTimeout(() => {
      window.close();
    }, 500);
  } catch (error) {
    console.error('Error filling credential:', error);
    alert(`Failed to fill credential: ${error.message}`);
  }
}

/**
 * Show success notification
 */
function showSuccessNotification() {
  const statusIndicator = document.getElementById('status-text');
  const originalText = statusIndicator.textContent;
  
  statusIndicator.textContent = '✓ Filled!';
  statusIndicator.style.background = 'rgba(255,255,255,0.4)';
  
  setTimeout(() => {
    statusIndicator.textContent = originalText;
    statusIndicator.style.background = 'rgba(255,255,255,0.2)';
  }, 1000);
}

/**
 * Show no credentials message
 */
function showNoCredentials() {
  const credentialsSection = document.getElementById('credentials-section');
  const noCredentials = document.getElementById('no-credentials');
  
  credentialsSection.style.display = 'block';
  noCredentials.style.display = 'block';
  
  const credentialsList = document.getElementById('credentials-list');
  credentialsList.innerHTML = '';
}

/**
 * Show error message
 */
function showError(message) {
  const errorSection = document.getElementById('error-section');
  const errorMessage = document.getElementById('error-message');
  
  errorSection.style.display = 'block';
  errorMessage.textContent = message;
  
  // Hide credentials section
  document.getElementById('credentials-section').style.display = 'none';
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Refresh button
  document.getElementById('refresh-button').addEventListener('click', async () => {
    await checkConnection();
    await loadCredentials();
  });
  
  // Retry button
  document.getElementById('retry-button').addEventListener('click', async () => {
    document.getElementById('error-section').style.display = 'none';
    await checkConnection();
    await loadCredentials();
  });
  
  // Help button
  document.getElementById('help-button').addEventListener('click', () => {
    browser.tabs.create({
      url: 'https://github.com/your-repo/keepass-browser-extension#troubleshooting'
    });
  });
  
  // Settings button
  document.getElementById('settings-button').addEventListener('click', () => {
    // TODO: Implement settings page
    alert('Settings page coming soon!');
  });
}

/**
 * Clean up when popup closes
 */
window.addEventListener('unload', () => {
  // Clear any sensitive data
  currentCredentials = [];
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
