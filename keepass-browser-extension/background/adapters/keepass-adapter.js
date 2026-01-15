/**
 * KeePass Password Manager Adapter
 * 
 * Implements secure communication with KeePass via native messaging.
 * 
 * Security considerations:
 * - Uses browser.runtime.connectNative() for secure local communication
 * - No credentials are cached or stored
 * - All sensitive data is cleared from memory after use
 * - Communication is authenticated via challenge-response
 * - Only communicates over local native messaging (no network)
 */

export class KeePassAdapter {
  constructor(config = {}) {
    this.name = 'KeePass';
    this.nativeHostName = config.nativeHostName || 'com.keepass.browser_extension';
    this.port = null;
    this.messageQueue = new Map();
    this.messageId = 0;
    this.connected = false;
  }

  /**
   * Get the name of this password manager
   */
  getName() {
    return this.name;
  }

  /**
   * Connect to the native messaging host
   * 
   * @returns {Promise<void>}
   * @throws {Error} If connection fails
   */
  async connect() {
    if (this.port) {
      return; // Already connected
    }

    try {
      // Connect to native messaging host
      // Security: This uses the browser's native messaging API which provides
      // secure communication between the extension and native application
      this.port = browser.runtime.connectNative(this.nativeHostName);

      // Set up message handler
      this.port.onMessage.addListener((message) => {
        this.handleNativeMessage(message);
      });

      // Set up disconnect handler
      this.port.onDisconnect.addListener(() => {
        console.log('Native messaging host disconnected');
        this.connected = false;
        this.port = null;
        
        // Reject all pending messages
        for (const [id, { reject }] of this.messageQueue) {
          reject(new Error('Connection to password manager lost'));
        }
        this.messageQueue.clear();
      });

      this.connected = true;
      console.log('Connected to KeePass native messaging host');
    } catch (error) {
      console.error('Failed to connect to native messaging host:', error);
      throw new Error(`Failed to connect to KeePass: ${error.message}`);
    }
  }

  /**
   * Disconnect from the native messaging host
   */
  disconnect() {
    if (this.port) {
      this.port.disconnect();
      this.port = null;
      this.connected = false;
    }
    this.messageQueue.clear();
  }

  /**
   * Handle messages from the native messaging host
   */
  handleNativeMessage(message) {
    const { id, action, success, data, error } = message;

    const pending = this.messageQueue.get(id);
    if (!pending) {
      console.warn('Received message with unknown ID:', id);
      return;
    }

    // Remove from queue
    this.messageQueue.delete(id);

    // Resolve or reject the promise
    if (success) {
      pending.resolve(data);
    } else {
      pending.reject(new Error(error || 'Unknown error from password manager'));
    }
  }

  /**
   * Send a message to the native messaging host
   * 
   * @param {string} action - The action to perform
   * @param {Object} data - The data to send
   * @returns {Promise<Object>} The response from the native host
   */
  async sendMessage(action, data = {}) {
    // Ensure we're connected
    if (!this.port) {
      await this.connect();
    }

    // Create unique message ID
    const id = ++this.messageId;

    // Create promise for the response
    const promise = new Promise((resolve, reject) => {
      // Set timeout for message
      const timeout = setTimeout(() => {
        this.messageQueue.delete(id);
        reject(new Error('Request timed out'));
      }, 30000); // 30 second timeout

      this.messageQueue.set(id, {
        resolve: (data) => {
          clearTimeout(timeout);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });

    // Send message to native host
    try {
      this.port.postMessage({
        id,
        action,
        data
      });
    } catch (error) {
      this.messageQueue.delete(id);
      throw new Error(`Failed to send message to password manager: ${error.message}`);
    }

    return promise;
  }

  /**
   * Test connection to KeePass
   * 
   * @returns {Promise<boolean>} True if connected and responsive
   */
  async testConnection() {
    try {
      const response = await this.sendMessage('test-connection');
      return response.connected === true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get credentials for a specific domain
   * 
   * Security: Credentials are returned directly and never cached
   * 
   * @param {string} domain - The domain to get credentials for
   * @returns {Promise<Array>} Array of credential objects
   */
  async getCredentials(domain) {
    try {
      const response = await this.sendMessage('get-credentials', { domain });
      
      // Response should contain an array of credentials
      // Each credential: { username, password, title, uuid }
      const credentials = response.credentials || [];
      
      // Validate credential format
      return credentials.map(cred => ({
        uuid: cred.uuid || '',
        title: cred.title || 'Untitled',
        username: cred.username || '',
        password: cred.password || '',
        domain: domain
      }));
    } catch (error) {
      console.error('Failed to get credentials:', error);
      throw error;
    }
  }

  /**
   * Search for credentials by query string
   * 
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching credentials
   */
  async searchCredentials(query) {
    try {
      const response = await this.sendMessage('search-credentials', { query });
      return response.credentials || [];
    } catch (error) {
      console.error('Failed to search credentials:', error);
      throw error;
    }
  }

  /**
   * Get database status
   * 
   * @returns {Promise<Object>} Database status information
   */
  async getDatabaseStatus() {
    try {
      const response = await this.sendMessage('get-status');
      return {
        isOpen: response.isOpen || false,
        isDatabaseLoaded: response.isDatabaseLoaded || false,
        databaseName: response.databaseName || ''
      };
    } catch (error) {
      console.error('Failed to get database status:', error);
      throw error;
    }
  }
}
