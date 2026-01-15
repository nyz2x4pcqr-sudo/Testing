/**
 * Background Service Worker
 * 
 * Security considerations:
 * - All communication with native host uses browser.runtime.connectNative()
 * - No credentials are stored in extension storage
 * - Credentials exist only in memory during transfer
 * - All sensitive data is cleared after use
 */

import { KeePassAdapter } from './adapters/keepass-adapter.js';
import { PasswordManagerFactory } from './adapters/password-manager-factory.js';

// Initialize the password manager adapter (currently KeePass)
let passwordManager = null;

// Store active connections (cleared after use)
const activeConnections = new Map();

/**
 * Initialize the password manager adapter on startup
 */
async function initialize() {
  try {
    passwordManager = PasswordManagerFactory.create('keepass');
    console.log('Password manager adapter initialized');
  } catch (error) {
    console.error('Failed to initialize password manager:', error);
  }
}

/**
 * Handle messages from content scripts and popup
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Use async handler pattern
  handleMessage(message, sender).then(sendResponse).catch(error => {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  });
  
  // Return true to indicate async response
  return true;
});

/**
 * Async message handler
 */
async function handleMessage(message, sender) {
  const { action, data } = message;

  switch (action) {
    case 'getCredentials':
      return await getCredentialsForUrl(data.url);
    
    case 'fillCredentials':
      return await fillCredentialsInTab(sender.tab.id, data.credentials);
    
    case 'testConnection':
      return await testPasswordManagerConnection();
    
    case 'getStatus':
      return await getPasswordManagerStatus();
    
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Get credentials for a given URL from the password manager
 * 
 * Security: Credentials are fetched on-demand and never persisted
 */
async function getCredentialsForUrl(url) {
  if (!passwordManager) {
    throw new Error('Password manager not initialized');
  }

  try {
    const domain = new URL(url).hostname;
    const credentials = await passwordManager.getCredentials(domain);
    
    // Return credentials (they will be cleared from memory after use)
    return {
      success: true,
      credentials: credentials,
      count: credentials.length
    };
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return {
      success: false,
      error: error.message,
      credentials: []
    };
  }
}

/**
 * Send credentials to content script for filling
 * 
 * Security: Credentials are sent directly to the tab without persistence
 */
async function fillCredentialsInTab(tabId, credentials) {
  try {
    await browser.tabs.sendMessage(tabId, {
      action: 'fillForm',
      credentials: credentials
    });
    
    // Clear credentials from memory after sending
    credentials = null;
    
    return { success: true };
  } catch (error) {
    console.error('Error filling credentials:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test connection to the password manager
 */
async function testPasswordManagerConnection() {
  if (!passwordManager) {
    return {
      success: false,
      connected: false,
      error: 'Password manager not initialized'
    };
  }

  try {
    const isConnected = await passwordManager.testConnection();
    return {
      success: true,
      connected: isConnected,
      manager: passwordManager.getName()
    };
  } catch (error) {
    return {
      success: false,
      connected: false,
      error: error.message
    };
  }
}

/**
 * Get password manager status
 */
async function getPasswordManagerStatus() {
  if (!passwordManager) {
    return {
      initialized: false,
      connected: false,
      name: 'None'
    };
  }

  try {
    const isConnected = await passwordManager.testConnection();
    return {
      initialized: true,
      connected: isConnected,
      name: passwordManager.getName()
    };
  } catch (error) {
    return {
      initialized: true,
      connected: false,
      name: passwordManager.getName(),
      error: error.message
    };
  }
}

/**
 * Handle browser action click (when user clicks the toolbar icon)
 */
browser.action.onClicked.addListener(async (tab) => {
  // The popup will handle the UI, this is just a fallback
  console.log('Extension icon clicked for tab:', tab.id);
});

/**
 * Clean up on extension unload
 */
self.addEventListener('unload', () => {
  // Clear any sensitive data from memory
  if (passwordManager) {
    passwordManager.disconnect();
  }
  activeConnections.clear();
});

// Initialize on startup
initialize();
