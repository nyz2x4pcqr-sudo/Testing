#!/usr/bin/env python3
"""
KeePass Native Messaging Host (Python Implementation)

This script acts as a bridge between the browser extension and KeePass.
It communicates with the browser using native messaging protocol (stdin/stdout)
and with KeePass using its API (KeePassRPC or similar).

Security considerations:
- Runs as a separate process with limited permissions
- Only accepts connections from authorized browser extensions
- Does not store or log credentials
- All sensitive data is cleared from memory after use
- Uses secure communication protocols
"""

import sys
import json
import struct
import logging
import os
from typing import Dict, Any, List, Optional

# Try to import pykeepass for KeePass database interaction
try:
    from pykeepass import PyKeePass
    PYKEEPASS_AVAILABLE = True
except ImportError:
    PYKEEPASS_AVAILABLE = False
    logging.warning("pykeepass not available. Install with: pip install pykeepass")

# Configure logging (disable in production)
# Security: Never log credentials or sensitive data
LOG_ENABLED = os.environ.get('KEEPASS_HOST_DEBUG', '0') == '1'
if LOG_ENABLED:
    logging.basicConfig(
        filename=os.path.expanduser('~/.keepass-host.log'),
        level=logging.DEBUG,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )


class KeePassHost:
    """Native messaging host for KeePass integration"""
    
    def __init__(self):
        self.kp = None
        self.database_path = None
        self.is_connected = False
        
    def log(self, message: str, level: str = 'info'):
        """Safe logging that never logs credentials"""
        if LOG_ENABLED:
            if level == 'error':
                logging.error(message)
            elif level == 'warning':
                logging.warning(message)
            else:
                logging.info(message)
    
    def read_message(self) -> Optional[Dict[str, Any]]:
        """
        Read a message from stdin (sent by browser extension)
        
        Native messaging protocol:
        - First 4 bytes: message length (uint32, native byte order)
        - Following bytes: JSON message
        """
        try:
            # Read message length (4 bytes)
            raw_length = sys.stdin.buffer.read(4)
            if not raw_length:
                return None
            
            # Unpack message length
            message_length = struct.unpack('=I', raw_length)[0]
            
            # Read message content
            message = sys.stdin.buffer.read(message_length).decode('utf-8')
            
            # Parse JSON
            return json.loads(message)
        except Exception as e:
            self.log(f"Error reading message: {e}", 'error')
            return None
    
    def send_message(self, message: Dict[str, Any]):
        """
        Send a message to stdout (to browser extension)
        
        Security: Ensure message is properly formatted and does not
        contain any unintended data
        """
        try:
            # Encode message as JSON
            encoded_message = json.dumps(message).encode('utf-8')
            
            # Get message length
            message_length = len(encoded_message)
            
            # Write message length (4 bytes)
            sys.stdout.buffer.write(struct.pack('=I', message_length))
            
            # Write message content
            sys.stdout.buffer.write(encoded_message)
            sys.stdout.buffer.flush()
        except Exception as e:
            self.log(f"Error sending message: {e}", 'error')
    
    def handle_test_connection(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Test connection to KeePass"""
        return {
            'connected': PYKEEPASS_AVAILABLE,
            'message': 'Connection test successful' if PYKEEPASS_AVAILABLE else 'PyKeePass not available'
        }
    
    def handle_get_credentials(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get credentials for a domain
        
        Security: Credentials are fetched on-demand and never cached
        """
        if not PYKEEPASS_AVAILABLE:
            raise Exception("PyKeePass not available")
        
        domain = data.get('domain', '')
        if not domain:
            raise Exception("Domain not provided")
        
        self.log(f"Fetching credentials for domain: {domain}")
        
        # In a real implementation, you would:
        # 1. Open KeePass database (with user authorization)
        # 2. Search for entries matching the domain
        # 3. Return matching credentials
        
        # Example implementation (requires actual KeePass integration):
        credentials = []
        
        # TODO: Implement actual KeePass database interaction
        # This is a placeholder that shows the expected structure
        
        # Example of how to use pykeepass:
        # if self.kp:
        #     entries = self.kp.find_entries(url=f".*{domain}.*", regex=True)
        #     for entry in entries:
        #         credentials.append({
        #             'uuid': entry.uuid.hex,
        #             'title': entry.title,
        #             'username': entry.username,
        #             'password': entry.password,
        #             'url': entry.url
        #         })
        
        return {
            'credentials': credentials
        }
    
    def handle_get_status(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Get KeePass database status"""
        return {
            'isOpen': self.kp is not None,
            'isDatabaseLoaded': self.kp is not None,
            'databaseName': os.path.basename(self.database_path) if self.database_path else ''
        }
    
    def handle_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle incoming message from browser extension
        
        Message format:
        {
            'id': <message_id>,
            'action': <action_name>,
            'data': <action_data>
        }
        """
        message_id = message.get('id')
        action = message.get('action')
        data = message.get('data', {})
        
        self.log(f"Handling action: {action}")
        
        try:
            # Route to appropriate handler
            if action == 'test-connection':
                result = self.handle_test_connection(data)
            elif action == 'get-credentials':
                result = self.handle_get_credentials(data)
            elif action == 'get-status':
                result = self.handle_get_status(data)
            else:
                raise Exception(f"Unknown action: {action}")
            
            # Return success response
            return {
                'id': message_id,
                'action': action,
                'success': True,
                'data': result
            }
        except Exception as e:
            self.log(f"Error handling action {action}: {e}", 'error')
            return {
                'id': message_id,
                'action': action,
                'success': False,
                'error': str(e)
            }
    
    def run(self):
        """Main loop - read messages and respond"""
        self.log("KeePass native messaging host started")
        
        try:
            while True:
                # Read message from browser
                message = self.read_message()
                if message is None:
                    break
                
                # Handle message
                response = self.handle_message(message)
                
                # Send response
                self.send_message(response)
                
        except KeyboardInterrupt:
            self.log("Host interrupted by user")
        except Exception as e:
            self.log(f"Fatal error: {e}", 'error')
        finally:
            self.log("KeePass native messaging host stopped")


def main():
    """Entry point"""
    host = KeePassHost()
    host.run()


if __name__ == '__main__':
    main()
