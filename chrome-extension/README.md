# LinguaContext Chrome Extension

A lightweight Chrome extension for learning vocabulary in context. Look up any word on any webpage with definitions, synonyms, examples, and save words for later review.

## Features

✨ **Instant Word Lookup**
- Select any word on any webpage
- Get definitions, phonetics, and pronunciation
- See synonyms and antonyms
- View real-world usage examples

🎯 **Context Learning**
- Captures the sentence where you found the word
- Learn vocabulary in real context
- Better retention through contextual learning

🔊 **Audio Pronunciation**
- US and UK pronunciation available
- Click to hear how words are pronounced

💾 **Save & Review**
- Save words to your personal vocabulary list
- Export your word list as JSON
- Track your learning progress

🚀 **Lightweight & Fast**
- No local dictionary files
- Fetches definitions from online APIs
- Works on all websites

## Installation

### From Chrome Web Store
(Coming soon)

### Manual Installation (Development)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `chrome-extension` folder
6. The extension is now installed!

## Usage

### Basic Usage
1. Select any word on a webpage
2. A popup will appear with the word's definition
3. Click "Save Word" to add it to your vocabulary list
4. Click the extension icon to view saved words

### Right-Click Menu
1. Select any word or phrase
2. Right-click and choose "Look up with LinguaContext"
3. The definition popup will appear

### Keyboard Shortcuts
- `Escape` - Close the popup
- Click outside the popup to close it

## API Sources

This extension uses free, public APIs:
- **Primary**: [Free Dictionary API](https://dictionaryapi.dev/)
- **Fallback**: Youdao Dictionary API (for audio)

No API keys required!

## File Structure

```
chrome-extension/
├── manifest.json       # Extension configuration
├── background.js       # Service worker (API fetching)
├── content.js         # Content script (UI & word selection)
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic
└── icons/             # Extension icons
```

## Technical Details

### Architecture

**Background Script** (`background.js`)
- Handles all API requests (bypasses CORS)
- Manages Chrome storage
- Provides context menu integration

**Content Script** (`content.js`)
- Detects word selection on webpages
- Shows popup with word information
- Uses Shadow DOM for style isolation

**Popup** (`popup.html` + `popup.js`)
- Shows saved vocabulary list
- Export/import functionality
- Word statistics

### Data Flow

```
User selects word
    ↓
content.js captures selection
    ↓
Sends message to background.js
    ↓
background.js fetches from API
    ↓
Returns data to content.js
    ↓
content.js displays popup
```

## Privacy

- No data is sent to external servers except for dictionary API lookups
- All saved words are stored locally in Chrome storage
- No tracking or analytics
- No personal data collection

## Development

### Prerequisites
- Google Chrome or Chromium-based browser
- Basic knowledge of JavaScript and Chrome Extension APIs

### Making Changes

1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

### Adding New APIs

To add additional dictionary APIs, edit `background.js`:

```javascript
async function fetchFromNewAPI(word) {
  // Add your API logic here
  const response = await fetch(`https://api.example.com/word/${word}`);
  // Parse and return data
}
```

## Troubleshooting

**Popup doesn't appear**
- Check if the extension is enabled
- Try refreshing the page
- Check browser console for errors

**API requests failing**
- Check internet connection
- Verify host_permissions in manifest.json
- Some words may not be in the dictionary

**Words not saving**
- Check Chrome storage permissions
- Verify extension has storage access

## Roadmap

- [ ] Spaced repetition review system
- [ ] Word quizzes and tests
- [ ] Custom word lists/categories
- [ ] Cloud sync (optional)
- [ ] More language support
- [ ] Advanced search filters

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use and modify as needed.

## Credits

- Dictionary data from [Free Dictionary API](https://dictionaryapi.dev/)
- Audio pronunciation from Youdao Dictionary
- Icons: (Add your icon credits here)

## Support

If you encounter any issues or have suggestions:
- Open an issue on GitHub
- Or contact: (your contact info)

---

Made with ❤️ for language learners
