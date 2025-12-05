# Installation Guide

## Installing the Extension in Chrome

### Method 1: Developer Mode (For Testing)

1. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension**
   - Click the "Load unpacked" button
   - Navigate to the `4r-vocabulary-direct` directory
   - Select the folder and click "Select Folder" or "Open"

4. **Verify Installation**
   - You should see the "4R Vocabulary Direct" extension card
   - The extension icon should appear in your Chrome toolbar
   - The status should show as "Enabled"

5. **Pin the Extension (Optional)**
   - Click the puzzle piece icon in the Chrome toolbar
   - Find "4R Vocabulary Direct"
   - Click the pin icon to keep it visible

### Method 2: Chrome Web Store (When Published)

1. Visit the Chrome Web Store
2. Search for "4R Vocabulary Direct"
3. Click "Add to Chrome"
4. Confirm by clicking "Add extension"

## Testing the Extension

1. **Open the Test Page**
   - Open `test.html` in Chrome
   - Or visit any webpage with English text

2. **Select a Word**
   - Use your mouse to select any English word
   - A popup should appear automatically with the definition

3. **View the Popup**
   - Click the extension icon in the toolbar
   - View the extension status and settings

4. **Toggle the Extension**
   - Use the checkbox in the popup to enable/disable the extension

## Troubleshooting

### Extension Not Working

1. **Check if Extension is Enabled**
   - Go to `chrome://extensions/`
   - Ensure "4R Vocabulary Direct" is enabled
   - Toggle it off and on if needed

2. **Reload the Extension**
   - Go to `chrome://extensions/`
   - Click the refresh icon on the extension card
   - Reload the webpage you're testing on

3. **Check Console for Errors**
   - Right-click on the extension icon → Inspect popup
   - Check the Console tab for any error messages
   - For content script errors, open DevTools on the webpage (F12)

4. **Verify Permissions**
   - The extension needs permission to access webpage content
   - Check that host permissions are granted

### Popup Not Appearing

1. **Verify Text Selection**
   - Make sure you're selecting English words/phrases
   - Try selecting different text
   - The selection should be between 1-50 characters

2. **Check Internet Connection**
   - The extension requires internet to fetch definitions
   - Ensure you have an active connection

3. **Wait for API Response**
   - The first lookup might take a moment
   - Subsequent lookups should be faster due to caching

### API Errors

1. **API Rate Limiting**
   - The free Dictionary API has rate limits
   - Wait a moment and try again
   - The extension caches results to minimize API calls

2. **Word Not Found**
   - Some words might not be in the dictionary
   - Try a different word or check spelling
   - Multi-word phrases might not always work

## Uninstalling

1. Go to `chrome://extensions/`
2. Find "4R Vocabulary Direct"
3. Click "Remove"
4. Confirm the removal

## Updating the Extension

### For Development Version

1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload any open webpages to see changes

### For Chrome Web Store Version

- Chrome will automatically update the extension
- Or manually update: More Tools → Extensions → Update

## Privacy and Permissions

### Required Permissions

- **Storage**: To save settings and cache translations
- **ActiveTab**: To access the current tab's content
- **Host Permissions**: To make API requests for translations

### What the Extension Does

- ✅ Reads selected text on webpages
- ✅ Makes API requests to dictionary services
- ✅ Stores settings and cached translations locally
- ❌ Does NOT collect personal information
- ❌ Does NOT track your browsing history
- ❌ Does NOT send data to third parties (except dictionary API)

## Support

For issues or questions:
- Check the [README.md](README.md) for features and usage
- Open an issue on GitHub
- Review the troubleshooting section above
