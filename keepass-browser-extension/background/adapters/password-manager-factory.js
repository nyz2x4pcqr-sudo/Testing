/**
 * Password Manager Factory
 * 
 * This factory implements the Strategy pattern to support multiple password managers.
 * New password managers can be added by creating a new adapter and registering it here.
 * 
 * Security: Each adapter is responsible for implementing secure communication
 * with its respective password manager.
 */

import { KeePassAdapter } from './keepass-adapter.js';

// Registry of available password manager adapters
const ADAPTERS = {
  'keepass': KeePassAdapter,
  // Add more adapters here as needed:
  // 'bitwarden': BitwardenAdapter,
  // '1password': OnePasswordAdapter,
  // 'lastpass': LastPassAdapter,
};

export class PasswordManagerFactory {
  /**
   * Create a password manager adapter instance
   * 
   * @param {string} type - The type of password manager ('keepass', 'bitwarden', etc.)
   * @param {Object} config - Optional configuration for the adapter
   * @returns {PasswordManagerAdapter} An instance of the requested adapter
   * @throws {Error} If the adapter type is not supported
   */
  static create(type, config = {}) {
    const AdapterClass = ADAPTERS[type.toLowerCase()];
    
    if (!AdapterClass) {
      throw new Error(`Unsupported password manager type: ${type}. Available types: ${Object.keys(ADAPTERS).join(', ')}`);
    }
    
    return new AdapterClass(config);
  }

  /**
   * Get list of supported password managers
   * 
   * @returns {string[]} Array of supported password manager types
   */
  static getSupportedManagers() {
    return Object.keys(ADAPTERS);
  }

  /**
   * Register a new password manager adapter
   * 
   * @param {string} type - The type identifier for the password manager
   * @param {class} AdapterClass - The adapter class to register
   */
  static registerAdapter(type, AdapterClass) {
    ADAPTERS[type.toLowerCase()] = AdapterClass;
  }
}
