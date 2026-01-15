# Quick Installation Guide

This guide provides step-by-step instructions for installing and setting up the KeePass Browser Extension.

## Prerequisites

- [ ] Chrome/Chromium 109+ or Firefox 109+ installed
- [ ] KeePass 2.x installed and configured
- [ ] Python 3.7+ OR .NET 6.0+ installed
- [ ] Git (to clone the repository)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/keepass-browser-extension.git
cd keepass-browser-extension
```

### 2. Generate Extension Icons

```bash
cd keepass-browser-extension/icons
./generate-icons.sh
cd ..
```

If you don't have ImageMagick or Inkscape, you can skip this and use placeholder PNG images.

### 3. Install Browser Extension

#### For Chrome/Chromium:

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `keepass-browser-extension` folder
5. **Important**: Copy the Extension ID (you'll need it in step 4)
   - Example: `abcdefghijklmnopqrstuvwxyz123456`

#### For Firefox:

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Navigate to `keepass-browser-extension` folder
4. Select `manifest.json`
5. The extension is now loaded (note: temporary in Firefox)

### 4. Set Up Native Messaging Host

Choose **Python** (recommended) or **C#** implementation:

#### Option A: Python Host (Cross-Platform)

**Step 1: Install Dependencies**
```bash
pip install pykeepass
```

**Step 2: Make Script Executable** (Linux/macOS)
```bash
chmod +x native-host/python/keepass_host.py
```

**Step 3: Edit Manifest File**

Edit `native-host/python/com.keepass.browser_extension.json`:

- Update `path` to absolute path of `keepass_host.py`
- Update `allowed_origins` with your extension ID (Chrome only)

Example for Chrome:
```json
{
  "name": "com.keepass.browser_extension",
  "description": "KeePass Browser Extension Native Messaging Host",
  "path": "/home/user/keepass-browser-extension/native-host/python/keepass_host.py",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://YOUR_EXTENSION_ID/"
  ]
}
```

Example for Firefox:
```json
{
  "name": "com.keepass.browser_extension",
  "description": "KeePass Browser Extension Native Messaging Host",
  "path": "/home/user/keepass-browser-extension/native-host/python/keepass_host.py",
  "type": "stdio",
  "allowed_extensions": [
    "keepass-extension@example.com"
  ]
}
```

**Step 4: Install Manifest**

**Linux (Chrome):**
```bash
mkdir -p ~/.config/google-chrome/NativeMessagingHosts/
cp native-host/python/com.keepass.browser_extension.json \
   ~/.config/google-chrome/NativeMessagingHosts/
```

**Linux (Firefox):**
```bash
mkdir -p ~/.mozilla/native-messaging-hosts/
cp native-host/python/com.keepass.browser_extension.json \
   ~/.mozilla/native-messaging-hosts/
```

**macOS (Chrome):**
```bash
mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
cp native-host/python/com.keepass.browser_extension.json \
   ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
```

**macOS (Firefox):**
```bash
mkdir -p ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/
cp native-host/python/com.keepass.browser_extension.json \
   ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/
```

**Windows (Chrome):**
```powershell
# Create registry entry
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.keepass.browser_extension" /ve /t REG_SZ /d "C:\path\to\com.keepass.browser_extension.json" /f
```

**Windows (Firefox):**
```powershell
# Create registry entry
reg add "HKCU\Software\Mozilla\NativeMessagingHosts\com.keepass.browser_extension" /ve /t REG_SZ /d "C:\path\to\com.keepass.browser_extension.json" /f
```

#### Option B: C# Host (Windows Only)

**Step 1: Build the Host**
```bash
cd native-host/csharp
dotnet build -c Release
cd ../..
```

**Step 2: Follow same manifest installation steps as Python**, but use the path to the compiled `.exe`:
```json
{
  "name": "com.keepass.browser_extension",
  "path": "C:\\path\\to\\KeePassHost.exe",
  ...
}
```

### 5. Configure KeePass Integration

**Note:** The current implementation requires additional integration with KeePass. You can:

1. **Install KeePassRPC plugin** for KeePass
2. **Modify the native host** to work with your KeePass setup
3. **Use the provided adapters** as templates for custom integration

### 6. Test the Installation

1. Click the extension icon in your browser toolbar
2. The popup should show connection status
3. If connected, you should see "Connected to KeePass"
4. If not connected, see troubleshooting below

## Troubleshooting

### Extension shows "Not connected"

**Check 1: Verify native host is accessible**
```bash
echo '{"id":1,"action":"test-connection","data":{}}' | python3 /full/path/to/keepass_host.py
```
Expected output: A JSON response with connection status

**Check 2: Verify manifest path**
- Ensure the `path` in the manifest JSON points to the correct location
- Use absolute paths (not relative)

**Check 3: Verify permissions**
```bash
ls -la /path/to/keepass_host.py
# Should show executable permissions: -rwxr-xr-x
```

**Check 4: Check browser console**
- Open `chrome://extensions/` (Chrome) or `about:debugging` (Firefox)
- Click "Inspect" on the extension
- Check console for errors

### Python dependencies missing

```bash
pip install pykeepass
# or for specific user
pip install --user pykeepass
```

### Extension not loading

- Check that all required files are present
- Verify manifest.json is valid JSON
- Check browser developer console for errors
- Try reloading the extension

### Icons not displaying

Generate PNG icons from SVG:
```bash
cd keepass-browser-extension/icons
./generate-icons.sh
```

Or create placeholder PNG files (16x16, 32x32, 48x48, 128x128)

## Verification Checklist

After installation, verify:

- [ ] Extension icon appears in browser toolbar
- [ ] Clicking icon opens popup UI
- [ ] Popup shows "Connected to KeePass" status
- [ ] No errors in browser console
- [ ] Form detection works on login pages
- [ ] Can retrieve credentials from KeePass

## Next Steps

Once installed:

1. Open a website with a login form
2. Click the extension icon
3. Select credentials to autofill
4. Test the autofill functionality

## Uninstallation

### Remove Browser Extension
- Chrome: Go to `chrome://extensions/`, click Remove
- Firefox: Go to `about:addons`, click Remove

### Remove Native Host
```bash
# Linux/macOS Chrome
rm ~/.config/google-chrome/NativeMessagingHosts/com.keepass.browser_extension.json

# Linux/macOS Firefox
rm ~/.mozilla/native-messaging-hosts/com.keepass.browser_extension.json

# Windows (run in command prompt)
reg delete "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.keepass.browser_extension" /f
reg delete "HKCU\Software\Mozilla\NativeMessagingHosts\com.keepass.browser_extension" /f
```

## Support

For issues:
- Check the [README.md](README.md) for detailed documentation
- Review [SECURITY.md](SECURITY.md) for security considerations  
- Open an issue on GitHub
- See troubleshooting section above

## Security Note

This extension is designed with security as the top priority:
- No credentials stored in browser
- Local-only communication
- User approval required for autofill
- Open source for transparency

Always review the code before installation and ensure you trust the source.
