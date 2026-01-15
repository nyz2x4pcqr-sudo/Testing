# KeePass Browser Extension

A secure browser extension for Chrome and Firefox that integrates with KeePass password manager to autofill credentials on web forms.

## 🔐 Security Features

- **Native Messaging**: Secure local communication between extension and KeePass
- **No Storage**: Credentials never stored in browser extension storage
- **Memory Safety**: Sensitive data cleared from memory immediately after use
- **User Approval**: All autofill operations require explicit user consent
- **Minimal Permissions**: Extension follows least-privilege principle
- **Open Source**: Full transparency for security audit

## 📋 Requirements

- **Browser**: Chrome/Chromium 109+ or Firefox 109+
- **KeePass**: KeePass 2.x installed and running
- **Operating System**: Windows, macOS, or Linux
- **Python 3.7+** or **.NET 6.0+** (for native messaging host)

## 🚀 Installation

### Step 1: Install the Browser Extension

#### Chrome/Chromium

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `keepass-browser-extension` directory
6. Note the Extension ID (you'll need this for the native host setup)

#### Firefox

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to the `keepass-browser-extension` directory
5. Select the `manifest.json` file

### Step 2: Install the Native Messaging Host

The native messaging host acts as a bridge between the browser extension and KeePass. Choose either Python or C# implementation.

#### Option A: Python Host (Recommended for cross-platform)

1. **Install Python dependencies:**
   ```bash
   pip install pykeepass
   ```

2. **Make the script executable (Linux/macOS):**
   ```bash
   chmod +x native-host/python/keepass_host.py
   ```

3. **Install the native messaging host manifest:**

   **Chrome on Linux:**
   ```bash
   mkdir -p ~/.config/google-chrome/NativeMessagingHosts/
   cp native-host/python/com.keepass.browser_extension.json \
      ~/.config/google-chrome/NativeMessagingHosts/
   ```

   **Chrome on macOS:**
   ```bash
   mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
   cp native-host/python/com.keepass.browser_extension.json \
      ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
   ```

   **Chrome on Windows:**
   ```powershell
   # Create registry entry
   reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.keepass.browser_extension" ^
       /ve /t REG_SZ /d "C:\path\to\com.keepass.browser_extension.json" /f
   ```

   **Firefox on Linux:**
   ```bash
   mkdir -p ~/.mozilla/native-messaging-hosts/
   cp native-host/python/com.keepass.browser_extension.json \
      ~/.mozilla/native-messaging-hosts/
   ```

   **Firefox on macOS:**
   ```bash
   mkdir -p ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/
   cp native-host/python/com.keepass.browser_extension.json \
      ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/
   ```

   **Firefox on Windows:**
   ```powershell
   # Create registry entry
   reg add "HKCU\Software\Mozilla\NativeMessagingHosts\com.keepass.browser_extension" ^
       /ve /t REG_SZ /d "C:\path\to\com.keepass.browser_extension.json" /f
   ```

4. **Update the manifest JSON file:**

   Edit `com.keepass.browser_extension.json` and update:
   - `path`: Set to the full path of `keepass_host.py`
   - `allowed_origins` (Chrome): Replace `YOUR_EXTENSION_ID` with your actual extension ID
   - `allowed_extensions` (Firefox): Already configured for Firefox

   Example for Chrome:
   ```json
   {
     "name": "com.keepass.browser_extension",
     "description": "KeePass Browser Extension Native Messaging Host",
     "path": "/home/user/keepass-browser-extension/native-host/python/keepass_host.py",
     "type": "stdio",
     "allowed_origins": [
       "chrome-extension://abcdefghijklmnopqrstuvwxyz123456/"
     ]
   }
   ```

#### Option B: C# Host (Windows)

1. **Build the host application:**
   ```bash
   cd native-host/csharp
   dotnet build -c Release
   ```

2. **Install the native messaging host:**
   
   Follow the same steps as Python, but use the compiled `.exe` file path instead:
   ```json
   {
     "name": "com.keepass.browser_extension",
     "description": "KeePass Browser Extension Native Messaging Host",
     "path": "C:\\path\\to\\KeePassHost.exe",
     "type": "stdio",
     "allowed_origins": [
       "chrome-extension://YOUR_EXTENSION_ID/"
     ]
   }
   ```

### Step 3: Configure KeePass

The native messaging host needs access to your KeePass database. You have several options:

1. **Using KeePassRPC**: Install the KeePassRPC plugin for KeePass
2. **Direct Database Access**: Configure the host with your database path (requires master password handling)
3. **Custom Integration**: Implement your own adapter following the examples provided

## 📖 Usage

### Automatic Form Detection

1. Navigate to any website with a login form
2. The extension will automatically detect password fields
3. A green indicator will appear next to detected login forms

### Manual Autofill

1. Click the extension icon in the browser toolbar
2. The popup will show available credentials for the current site
3. Click on a credential to autofill the form

### Multiple Credentials

If multiple credentials match a domain:
1. The extension will present a selection dialog
2. Choose the credential you want to use
3. The selected credential will be filled into the form

## 🔧 Configuration

### Extension Settings

Click the settings button in the popup to configure:
- Native messaging host path
- Auto-fill behavior
- Security options

### Native Host Settings

Configure the native host by setting environment variables:

```bash
# Enable debug logging
export KEEPASS_HOST_DEBUG=1

# Set KeePass database path (optional)
export KEEPASS_DATABASE_PATH=/path/to/database.kdbx
```

## 🛡️ Security Considerations

### What This Extension Does

- ✅ Uses native messaging for secure local communication
- ✅ Never stores credentials in extension storage
- ✅ Clears sensitive data from memory after use
- ✅ Requires user approval before autofilling
- ✅ Uses minimal browser permissions
- ✅ Runs native host with limited privileges

### What This Extension Does NOT Do

- ❌ Store credentials in browser storage
- ❌ Send credentials over the network
- ❌ Log sensitive information
- ❌ Access credentials without user permission
- ❌ Modify form submissions

### Best Practices

1. **Keep KeePass Locked**: Always lock KeePass when not in use
2. **Use Strong Master Password**: Protect your KeePass database
3. **Review Permissions**: Audit the extension permissions regularly
4. **Update Regularly**: Keep the extension and native host updated
5. **Verify Sources**: Only install from trusted sources

## 🔌 Extending to Other Password Managers

The extension uses an adapter pattern to support multiple password managers. To add support for another password manager:

1. **Create a new adapter** in [`background/adapters/`](background/adapters/)

   ```javascript
   export class YourPasswordManagerAdapter {
     constructor(config = {}) {
       this.name = 'YourPasswordManager';
       // Initialize your adapter
     }

     async connect() {
       // Connect to your password manager
     }

     async getCredentials(domain) {
       // Fetch credentials for domain
       return [
         {
           uuid: 'unique-id',
           title: 'Site Name',
           username: 'user@example.com',
           password: 'secret',
           domain: domain
         }
       ];
     }

     async testConnection() {
       // Test connection
       return true;
     }

     getName() {
       return this.name;
     }
   }
   ```

2. **Register the adapter** in [`background/adapters/password-manager-factory.js`](background/adapters/password-manager-factory.js)

   ```javascript
   import { YourPasswordManagerAdapter } from './your-adapter.js';

   const ADAPTERS = {
     'keepass': KeePassAdapter,
     'your-manager': YourPasswordManagerAdapter,
   };
   ```

3. **Update the background script** to use your adapter:

   ```javascript
   passwordManager = PasswordManagerFactory.create('your-manager');
   ```

## 🐛 Troubleshooting

### Extension not connecting to KeePass

1. **Check native host installation:**
   ```bash
   # Test the native host manually
   echo '{"id":1,"action":"test-connection","data":{}}' | python3 keepass_host.py
   ```

2. **Verify manifest path**: Ensure the path in `com.keepass.browser_extension.json` is correct

3. **Check permissions**: Ensure the native host script is executable

4. **Review logs**: Enable debug logging with `KEEPASS_HOST_DEBUG=1`

### No credentials found

1. Verify KeePass database is open
2. Check that entry URLs match the current domain
3. Review native host logs for errors

### Autofill not working

1. Check that form fields are properly detected
2. Try manual autofill from the popup
3. Verify the content script is loaded (check browser console)

### Browser-specific issues

**Chrome:**
- Verify the extension ID in the manifest matches your installed extension
- Check `chrome://extensions/` for error messages

**Firefox:**
- Check `about:debugging` for error messages
- Verify the extension ID in manifest matches

## 📚 Development

### Project Structure

```
keepass-browser-extension/
├── manifest.json                 # Extension manifest (Chrome/Firefox)
├── background/
│   ├── background.js            # Background service worker
│   └── adapters/
│       ├── password-manager-factory.js  # Adapter factory
│       └── keepass-adapter.js          # KeePass adapter
├── content/
│   └── content.js               # Content script (form detection)
├── popup/
│   ├── popup.html              # Popup UI
│   ├── popup.css               # Popup styles
│   └── popup.js                # Popup logic
├── native-host/
│   ├── python/
│   │   ├── keepass_host.py                      # Python host
│   │   └── com.keepass.browser_extension.json   # Manifest
│   └── csharp/
│       ├── KeePassHost.cs                       # C# host
│       └── KeePassHost.csproj                   # Project file
└── README.md
```

### Building for Production

1. **Update version** in `manifest.json`
2. **Remove debug code** and console logs
3. **Test thoroughly** on both Chrome and Firefox
4. **Package the extension:**
   ```bash
   zip -r keepass-extension.zip keepass-browser-extension/ \
       -x "*.git*" -x "*node_modules*"
   ```

### Testing

1. **Unit tests**: Test individual components
2. **Integration tests**: Test extension-to-native-host communication
3. **Security audit**: Review for vulnerabilities
4. **Browser compatibility**: Test on Chrome and Firefox

## 📄 License

See LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## ⚠️ Disclaimer

This extension is provided as-is without warranty. Always review the code before use and ensure you understand the security implications. The developers are not responsible for any data loss or security breaches.

## 📞 Support

For issues and questions:
- GitHub Issues: [Report a bug](https://github.com/your-repo/keepass-browser-extension/issues)
- Documentation: [View docs](https://github.com/your-repo/keepass-browser-extension/wiki)
- Security: For security issues, please email security@example.com

## 🙏 Acknowledgments

- KeePass project for the excellent password manager
- Browser extension APIs for secure native messaging
- Community contributors and testers
