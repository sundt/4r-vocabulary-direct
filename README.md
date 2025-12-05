# 4R Vocabulary Direct

A lightweight English vocabulary tool built with Manifest V3. Select text to translate instantly via online APIs and capture context sentences automatically.

## Features

- 🎯 **Lightweight Design**: Minimal resource usage with efficient Shadow DOM implementation
- 🔒 **Manifest V3**: Built with the latest Chrome extension standards
- 📝 **Context Capture**: Automatically captures surrounding sentence for better understanding
- 🚀 **Instant Lookup**: Fast word definitions using free Dictionary API
- 💾 **Smart Caching**: Reduces API calls with intelligent caching
- 🎨 **Shadow DOM UI**: Isolated styling that won't conflict with webpage styles
- 🌐 **Message Passing**: Efficient communication between content script and service worker

## Architecture

### Content Script (`content.js`)
- Captures user text selection
- Extracts context sentence automatically
- Displays results in a Shadow DOM popup
- Handles UI interactions

### Background Service Worker (`background.js`)
- Processes API requests for word definitions
- Manages translation cache
- Handles message passing from content scripts

### Shadow DOM
- Provides isolated styling for the popup
- Prevents CSS conflicts with host pages
- Ensures consistent appearance across all websites

## Installation

### For Development

1. Clone this repository:
   ```bash
   git clone https://github.com/sundt/4r-vocabulary-direct.git
   cd 4r-vocabulary-direct
   ```

2. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `4r-vocabulary-direct` directory

3. The extension icon should appear in your Chrome toolbar!

### For Production

(Package the extension as a `.crx` file or publish to Chrome Web Store)

## Usage

1. **Select Text**: Simply select any English word or phrase on any webpage
2. **View Definition**: A popup will automatically appear with the word's definition
3. **Context Awareness**: The surrounding sentence is captured for better learning
4. **Close Popup**: Click the × button or click anywhere outside the popup

## Configuration

Click the extension icon to access settings:
- **Enable/Disable**: Toggle the extension on/off
- **Status**: View current extension status

## Technical Details

### Manifest V3 Compliance
- Uses Service Worker instead of background pages
- Implements proper message passing
- Follows latest security guidelines
- Uses declarative permissions

### API Integration
- Currently uses the Free Dictionary API (https://dictionaryapi.dev/)
- Easy to integrate with other translation APIs
- Built-in fallback for API failures

### Performance
- Lightweight footprint (~20KB total)
- Lazy initialization of Shadow DOM
- Efficient caching mechanism
- No external dependencies

## File Structure

```
4r-vocabulary-direct/
├── manifest.json          # Manifest V3 configuration
├── content.js            # Content script with Shadow DOM
├── content.css           # Minimal CSS for shadow host
├── background.js         # Service worker for API calls
├── popup.html           # Extension popup UI
├── popup.css            # Popup styling
├── popup.js             # Popup functionality
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Any Chromium-based browser with Manifest V3 support

## Development

### Key Technologies
- Manifest V3
- Shadow DOM
- Chrome Extension APIs
- Service Workers
- Message Passing API

### Code Quality
- Strict mode enabled
- XSS prevention with HTML escaping
- Error handling throughout
- Clean separation of concerns

## License

MIT License - Feel free to use and modify

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have suggestions, please open an issue on GitHub.
